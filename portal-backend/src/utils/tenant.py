"""
Utilitários para isolamento de dados por tenant.
Fornece funções para obter o tenant atual e filtrar consultas.
"""
from functools import wraps
from flask import jsonify, g
from flask_jwt_extended import get_jwt_identity
from src.models.portal_models import User, Tenant, db


def get_current_user():
    """Obtém o usuário atual a partir do JWT token (cached per request)."""
    if hasattr(g, '_current_user'):
        return g._current_user
    try:
        user_id = int(get_jwt_identity())
        g._current_user = db.session.get(User, user_id)
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


def tenant_required(f):
    """Decorator que exige que o usuário pertença a um tenant."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Usuário não autenticado'}), 401
        if not user.tenant_id:
            return jsonify({'error': 'Usuário não pertence a nenhuma organização'}), 403
        return f(*args, **kwargs)
    return decorated_function


def filter_by_tenant(query, model):
    """Filtra uma consulta pelo tenant_id do usuário atual."""
    tenant_id = get_current_tenant_id()
    user = get_current_user()
    # Super admin (ADMIN sem tenant) vê tudo
    if user and user.user_type and user.user_type.value == 'ADMIN' and not tenant_id:
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
