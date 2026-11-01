"""Usuários removidos, retenção de dados e integração Asaas.

Extraído de admin_finance.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
"""
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.models.portal_models import (
    SystemConfig,
    User,
    db,
)
from src.utils.auth import admin_required
from src.utils.tenant import get_current_tenant_id

admin_users_softdelete_bp = Blueprint('users_softdelete', __name__)


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
        for user_id in user_ids:
            user = User.query.get(user_id)
            if user and user.deleted_at:
                # Verificar tenant
                if tenant_id and user.tenant_id != tenant_id:
                    continue
                db.session.delete(user)
                deleted_count += 1

        db.session.commit()

        return jsonify({
            'message': f'{deleted_count} usuário(s) excluído(s) permanentemente',
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





