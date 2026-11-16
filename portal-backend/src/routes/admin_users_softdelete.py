"""Usuários removidos, retenção de dados e integração Asaas.

Extraído de admin_finance.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
"""
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from src.models.portal_models import (
    AdminInvite,
    Customer,
    Driver,
    Notification,
    PushToken,
    SystemConfig,
    User,
    db,
)
from src.utils.auth import admin_required
from src.utils.tenant import get_current_tenant_id

admin_users_softdelete_bp = Blueprint('users_softdelete', __name__)


def _descobrir_fks_para(tabela_alvo):
    """Lista (tabela, coluna) com FKs que apontam para tabela_alvo.id.

    Descoberta dinâmica via information_schema — tabela nova no futuro entra
    automaticamente. JOIN com constraint_column_usage feito SÓ por
    constraint_name (juntar por table_name retorna 0 linhas — a ccu é a tabela PAI).
    """
    sql = """
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = :tabela AND ccu.column_name = 'id'
    """
    return db.session.execute(db.text(sql), {'tabela': tabela_alvo}).fetchall()


def _limpar_perfil_driver(driver_id):
    """
    Apaga o perfil de entregador e tudo que só existe por causa dele.
    Recusa se houver histórico de negócio (pedidos/pagamentos/entregas) —
    esses registros são contábeis e não podem sumir junto com a conta.

    Retorna None quando liberado, ou mensagem de erro (str).
    """
    tabelas_historico = {'orders', 'payments', 'deliveries'}
    for tabela, coluna in _descobrir_fks_para('drivers'):
        if tabela in tabelas_historico:
            n = db.session.execute(
                db.text(f'SELECT count(*) FROM "{tabela}" WHERE "{coluna}" = :id'),
                {'id': driver_id},
            ).scalar()
            if n:
                return (
                    f'Não foi possível excluir: o entregador tem {n} registro(s) '
                    f'em "{tabela}" (histórico de pedidos/pagamentos/entregas). '
                    'Mantenha o usuário na lixeira para preservar o histórico.'
                )
    # Sem histórico de negócio: apaga filhos (gamificação, vínculos, rotas...) e o perfil
    for tabela, coluna in _descobrir_fks_para('drivers'):
        db.session.execute(
            db.text(f'DELETE FROM "{tabela}" WHERE "{coluna}" = :id'),
            {'id': driver_id},
        )
    db.session.delete(db.session.get(Driver, driver_id))
    return None


def _excluir_referencias_do_usuario(user, ator_id=None):
    """
    Remove/desvincula SÓ o que é pessoal do usuário e trava a exclusão
    definitiva (FKs apontando para users.id).

    REGRAS DE OURO (2026-11-16, pedido do Mauro):
    - Dados COMPARTILHADOS do tenant (estabelecimentos, pedidos, praças,
      tabelas de preço, convites, outros admins) NUNCA são apagados junto —
      num tenant com 2 admins, excluir um não pode afetar o que é do outro.
    - Só dados 100% PESSOAIS do usuário saem (notificações dele, tokens de
      dispositivo dele, perfil de cliente/entregador DELE).

    Semântica por tabela:
    - notifications / push_tokens: apaga (endereçados só a este usuário)
    - admin_invites.used_by_user_id: desvincula (convite do tenant preservado)
    - admin_invites.created_by: TRANSFERE para OUTRO admin ativo do MESMO
      tenant (quem fica é o dono natural do convite). Só se o tenant não tiver
      outro admin, transfere para quem está executando a exclusão. Sem nenhuma
      dessas opções, apaga (created_by é NOT NULL e não pode apontar para o
      usuário que está sendo excluído)
    - customers.user_id: desvincula (pedidos/endereços do histórico preservados)
    - drivers.user_id: apaga o perfil SÓ sem histórico de negócio (ver acima)

    Retorna None quando liberado, ou mensagem de erro (str).
    """
    from src.models.portal_models import UserStatus, UserType

    Notification.query.filter_by(user_id=user.id).delete()
    PushToken.query.filter_by(user_id=user.id).delete()
    AdminInvite.query.filter_by(used_by_user_id=user.id).update({'used_by_user_id': None})

    # Convites criados pelo usuário pertencem ao TENANT. A autoria vai para o
    # outro admin do mesmo tenant (o que fica) — NÃO para o super admin que
    # eventualmente está executando a exclusão no painel da plataforma
    substituto = None
    if user.tenant_id:
        substituto = (
            User.query
            .filter(
                User.user_type == UserType.ADMIN,
                User.tenant_id == user.tenant_id,
                User.id != user.id,
                User.deleted_at.is_(None),
                User.status == UserStatus.ACTIVE,
            )
            .order_by(User.id)
            .first()
        )
    novo_created_by = substituto.id if substituto else ator_id
    if novo_created_by:
        AdminInvite.query.filter_by(created_by=user.id).update({'created_by': novo_created_by})
    else:
        AdminInvite.query.filter_by(created_by=user.id).delete(synchronize_session=False)

    Customer.query.filter_by(user_id=user.id).update({'user_id': None})

    driver = Driver.query.filter_by(user_id=user.id).first()
    if driver:
        return _limpar_perfil_driver(driver.id)
    return None


@admin_users_softdelete_bp.route('/deleted-users', methods=['GET'])
@jwt_required()
@admin_required
def get_deleted_users():
    """Lista usuários excluídos (lixeira)"""
    try:
        tenant_id = get_current_tenant_id()
        user_type = request.args.get('user_type')
        days = request.args.get('days', type=int)

        # Buscar usuários excluídos (soft delete)
        query = User.query.filter(User.deleted_at.isnot(None))
        if tenant_id:
            query = query.filter(User.tenant_id == tenant_id)
        if user_type:
            # user_type é Enum — comparar com UserType
            from src.models.portal_models import UserType
            try:
                query = query.filter(User.user_type == UserType(user_type))
            except ValueError:
                query = query.filter(User.user_type == user_type)
        if days:
            cutoff = datetime.now(timezone.utc) - timedelta(days=days)
            query = query.filter(User.deleted_at >= cutoff)

        users = query.all()

        # Buscar nome de quem excluiu
        users_data = []
        for user in users:
            user_dict = user.to_dict(include_sensitive=True)
            if user.deleted_by:
                deleter = User.query.get(user.deleted_by)
                user_dict['deleted_by_name'] = f"{deleter.first_name} {deleter.last_name}" if deleter else 'Desconhecido'
            else:
                user_dict['deleted_by_name'] = 'Sistema'

            # Calcular dias desde exclusão (deleted_at pode ser naive)
            if user.deleted_at:
                deleted_at = user.deleted_at
                if deleted_at.tzinfo is None:
                    deleted_at = deleted_at.replace(tzinfo=timezone.utc)
                delta = datetime.now(timezone.utc) - deleted_at
                user_dict['days_deleted'] = delta.days

            users_data.append(user_dict)

        # Buscar configuração de retenção
        retention_config = SystemConfig.query.filter_by(config_key='retention_days').first()
        retention_days = int(retention_config.config_value) if retention_config else 90

        return jsonify({
            'users': users_data,
            'total': len(users_data),
            'config': {
                'retention_days': retention_days
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_users_softdelete_bp.route('/users/<int:user_id>/restore', methods=['POST'])
@jwt_required()
@admin_required
def restore_user(user_id):
    """Restaura um usuário excluído"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        if not user.deleted_at:
            return jsonify({'error': 'Usuário não está excluído'}), 400

        # Verificar tenant
        tenant_id = get_current_tenant_id()
        if tenant_id and user.tenant_id != tenant_id:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Restaurar
        user.deleted_at = None
        user.deleted_by = None
        db.session.commit()

        return jsonify({
            'message': 'Usuário restaurado com sucesso',
            'user': user.to_dict(include_sensitive=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_users_softdelete_bp.route('/users/<int:user_id>/permanent', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user_permanent(user_id):
    """Exclui um usuário permanentemente (ação irreversível)"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Verificar tenant
        tenant_id = get_current_tenant_id()
        if tenant_id and user.tenant_id != tenant_id:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Só permite excluir permanentemente se já estiver na lixeira
        if not user.deleted_at:
            return jsonify({'error': 'Usuário deve estar na lixeira antes de ser excluído permanentemente'}), 400

        # Desvincular/apagar SÓ o que é pessoal do usuário (FKs para users.id).
        # Dados do tenant (estabelecimentos, pedidos, convites...) são preservados
        try:
            ator_id = int(get_jwt_identity())
        except (ValueError, TypeError):
            ator_id = None
        erro = _excluir_referencias_do_usuario(user, ator_id=ator_id)
        if erro:
            return jsonify({'error': erro}), 400

        # Excluir permanentemente
        db.session.delete(user)
        db.session.commit()

        return jsonify({'message': 'Usuário excluído permanentemente'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_users_softdelete_bp.route('/cleanup-deleted', methods=['POST'])
@jwt_required()
@admin_required
def cleanup_deleted_users():
    """Exclui permanentemente usuários selecionados da lixeira"""
    try:
        data = request.get_json()
        user_ids = data.get('user_ids', [])

        if not user_ids:
            return jsonify({'error': 'Nenhum usuário selecionado'}), 400

        # Verificar tenant
        tenant_id = get_current_tenant_id()

        deleted_count = 0
        recusados = []
        try:
            ator_id = int(get_jwt_identity())
        except (ValueError, TypeError):
            ator_id = None
        for user_id in user_ids:
            user = User.query.get(user_id)
            if user and user.deleted_at:
                # Verificar tenant
                if tenant_id and user.tenant_id != tenant_id:
                    continue
                # Savepoint por usuário: se recusado, nada parcial fica para trás
                savepoint = db.session.begin_nested()
                erro = _excluir_referencias_do_usuario(user, ator_id=ator_id)
                if erro:
                    savepoint.rollback()
                    recusados.append(f'{user.email}: {erro}')
                    continue
                db.session.delete(user)
                deleted_count += 1
                savepoint.commit()

        db.session.commit()

        mensagem = f'{deleted_count} usuário(s) excluído(s) permanentemente'
        if recusados:
            mensagem += f' — {len(recusados)} recusado(s): ' + '; '.join(recusados)
        return jsonify({
            'message': mensagem,
            'deleted_count': deleted_count
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_users_softdelete_bp.route('/retention-config', methods=['GET'])
@jwt_required()
@admin_required
def get_retention_config():
    """Retorna configuração de retenção da lixeira"""
    try:
        config = SystemConfig.query.filter_by(config_key='retention_days').first()
        days = int(config.config_value) if config else 90

        return jsonify({'retention_days': days}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_users_softdelete_bp.route('/retention-config', methods=['PUT'])
@jwt_required()
@admin_required
def update_retention_config():
    """Atualiza configuração de retenção da lixeira"""
    try:
        data = request.get_json()
        days = data.get('retention_days', 90)

        if days not in [30, 60, 90]:
            return jsonify({'error': 'Valor inválido. Use 30, 60 ou 90'}), 400

        config = SystemConfig.query.filter_by(config_key='retention_days').first()
        if config:
            config.config_value = str(days)
        else:
            config = SystemConfig(config_key='retention_days', config_value=str(days))
            db.session.add(config)

        db.session.commit()

        return jsonify({'message': f'Retenção configurada para {days} dias'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================

# INTEGRAÇÃO ASAAS (Gateway de Pagamento)

# ============================================



@admin_users_softdelete_bp.route('/asaas/config', methods=['GET'])

@jwt_required()

@admin_required

def get_asaas_config():

    """Retorna configuração do Asaas (sem expor a API key)"""

    from src.models.portal_models import SystemConfig

    configs = SystemConfig.query.filter(

        SystemConfig.config_key.in_(['asaas_environment', 'asaas_webhook_token'])

    ).all()

    config = {c.config_key: c.config_value for c in configs}

    return jsonify({

        'configured': bool(config.get('asaas_environment')),

        'environment': config.get('asaas_environment', 'sandbox'),

        'webhook_token': config.get('asaas_webhook_token', ''),

    }), 200





@admin_users_softdelete_bp.route('/asaas/config', methods=['PUT'])

@jwt_required()

@admin_required

def update_asaas_config():

    """Atualiza configuração do Asaas"""

    from src.models.portal_models import SystemConfig

    data = request.get_json()

    if not data:

        return jsonify({'error': 'Dados não fornecidos'}), 400



    fields = ['asaas_api_key', 'asaas_environment', 'asaas_webhook_token']

    for field in fields:

        if field in data:

            config = SystemConfig.query.filter_by(config_key=field).first()

            if config:

                config.config_value = data[field]

                config.updated_at = datetime.now(timezone.utc)

            else:

                config = SystemConfig(config_key=field, config_value=data[field])

                db.session.add(config)



    db.session.commit()

    return jsonify({'message': 'Configuração Asaas atualizada'}), 200





@admin_users_softdelete_bp.route('/asaas/test', methods=['POST'])

@jwt_required()

@admin_required

def test_asaas_connection():

    """Testa a conexão com o Asaas"""

    import requests as req

    from src.services.asaas_service import get_base_url, get_headers, is_configured



    if not is_configured():

        return jsonify({'success': False, 'error': 'Asaas não configurado'}), 400



    try:

        response = req.get(f"{get_base_url()}/customers?limit=1", headers=get_headers(), timeout=10)

        if response.status_code == 200:

            return jsonify({'success': True, 'message': 'Conexão com Asaas OK'}), 200

        return jsonify({'success': False, 'error': f'Erro HTTP {response.status_code}'}), 400

    except Exception as e:

        return jsonify({'success': False, 'error': str(e)}), 400





