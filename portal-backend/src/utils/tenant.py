"""
Utilitários para isolamento de dados por tenant.
Fornece funções para obter o tenant atual e filtrar consultas.
"""
from functools import wraps

from flask import g, jsonify
from flask_jwt_extended import get_jwt_identity

from src.models.portal_models import Tenant, User, db


def get_current_user():
    """Obtém o usuário atual a partir do JWT token (cached per request).

    Segurança: usuário soft-deleted, INACTIVE (pendente de aprovação) ou
    SUSPENDED retorna None — a conta fica inoperante até ser liberada.
    (O portão principal é o register_status_jwt_gate; aqui é a 2ª camada.)
    """
    if hasattr(g, '_current_user'):
        return g._current_user
    try:
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)
        # Usuário soft-deleted não deve autenticar
        if user and getattr(user, 'deleted_at', None):
            g._current_user = None
            return None
        # Conta pendente de aprovação ou suspensa não deve operar
        if user is not None and getattr(user, 'status', None) is not None:
            from src.models.portal_models import UserStatus
            if user.status in (UserStatus.INACTIVE, UserStatus.SUSPENDED):
                g._current_user = None
                return None
        g._current_user = user
        return g._current_user
    except (ValueError, TypeError):
        return None


def get_current_tenant():
    """Obtém o tenant do usuário atual."""
    user = get_current_user()
    if user and user.tenant_id:
        return Tenant.query.get(user.tenant_id)
    return None


def get_current_tenant_id():
    """Obtém o ID do tenant do usuário atual."""
    user = get_current_user()
    return user.tenant_id if user else None


def check_user_and_tenant_status(user):
    """
    Verificação centralizada de status do usuário e do tenant.
    Retorna None se tudo OK, ou uma tupla (jsonify_response, status_code) se bloqueado.
    Super admins (is_super_admin=True, sem tenant) são isentos da verificação de tenant.
    """
    if not user:
        return jsonify({'error': 'Usuário não autenticado'}), 401

    # Verificar status do usuário
    from src.models.portal_models import UserStatus
    if user.status == UserStatus.INACTIVE:
        return jsonify({'error': 'Sua conta está pendente de aprovação. Aguarde o administrador liberar seu acesso.'}), 403
    if user.status == UserStatus.SUSPENDED:
        return jsonify({'error': 'Sua conta foi suspensa. Entre em contato com o administrador.'}), 403

    # Super admin sem tenant é isento de verificação de tenant
    if user.is_super_admin and not user.tenant_id:
        return None

    # Verificar se o tenant está ativo (se o usuário pertence a um)
    if user.tenant_id:
        tenant = Tenant.query.get(user.tenant_id)
        if not tenant:
            return jsonify({'error': 'Organização não encontrada'}), 403
        if not tenant.is_active:
            return jsonify({'error': 'Esta organização está desativada. Entre em contato com o suporte.'}), 403

    return None


def register_status_jwt_gate(jwt):
    """
    Portão CENTRAL de status do usuário para toda requisição autenticada.

    Usa o hook token_in_blocklist_loader do Flask-JWT-Extended, executado em
    TODAS as rotas com @jwt_required() — inclusive as que não chamam
    check_user_and_tenant_status. Assim, um usuário INACTIVE/SUSPENDED (ou
    soft-deleted) perde acesso imediatamente, mesmo que o token tenha sido
    emitido ANTES da mudança de status (tokens vivem 8h).

    Deve ser chamado uma única vez, logo após JWTManager(app).
    """

    @jwt.token_in_blocklist_loader
    def _token_de_usuario_bloqueado(jwt_header, jwt_payload):
        # Retorna True = token tratado como revogado (a resposta vem no revoked_token_loader)
        from src.models.portal_models import UserStatus
        # Tokens de propósito especial (ex.: status de cadastro) não servem de sessão
        if jwt_payload.get('purpose'):
            return True
        try:
            user = db.session.get(User, int(jwt_payload['sub']))
        except (ValueError, TypeError, KeyError):
            return True
        if not user:
            return True  # usuário não existe mais (ex.: banco recriado)
        if getattr(user, 'deleted_at', None):
            return True  # soft delete
        return user.status in (UserStatus.INACTIVE, UserStatus.SUSPENDED)

    @jwt.revoked_token_loader
    def _resposta_usuario_bloqueado(jwt_header, jwt_payload):
        # Mensagem clara do motivo real (não "token revogado")
        from src.models.portal_models import UserStatus
        try:
            user = db.session.get(User, int(jwt_payload['sub']))
        except (ValueError, TypeError, KeyError):
            user = None
        if user and user.status == UserStatus.INACTIVE:
            return jsonify({'error': 'Sua conta está pendente de aprovação. Aguarde o administrador liberar seu acesso.'}), 403
        if user and user.status == UserStatus.SUSPENDED:
            return jsonify({'error': 'Sua conta foi suspensa. Entre em contato com o administrador.'}), 403
        return jsonify({'error': 'Token inválido ou usuário não encontrado. Faça login novamente.'}), 401


def tenant_required(f):
    """Decorator que exige que o usuário pertença a um tenant ativo."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Usuário não autenticado'}), 401
        if not user.tenant_id:
            return jsonify({'error': 'Usuário não pertence a nenhuma organização'}), 403

        # Verificar status do usuário e do tenant
        block = check_user_and_tenant_status(user)
        if block:
            return block

        return f(*args, **kwargs)
    return decorated_function


def filter_by_tenant(query, model):
    """Filtra uma consulta pelo tenant_id do usuário atual."""
    tenant_id = get_current_tenant_id()
    user = get_current_user()
    # Super admin (is_super_admin=True, sem tenant) vê tudo
    if user and user.is_super_admin and not tenant_id:
        return query
    if tenant_id:
        return query.filter(model.tenant_id == tenant_id)
    # Sem tenant e não é super admin - não deveria ver nada
    return query.filter(False)


def add_tenant_to_data(data):
    """Adiciona tenant_id aos dados antes de salvar."""
    tenant_id = get_current_tenant_id()
    if tenant_id and isinstance(data, dict):
        data['tenant_id'] = tenant_id
    return data


def filter_by_square(query, model, square_id=None):
    """Filtra uma consulta pelo square_id se fornecido."""
    if square_id:
        return query.filter(model.square_id == square_id)
    return query
