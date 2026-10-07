"""
Decorators de autenticação compartilhados.
Centraliza admin_required e client_or_admin_required para evitar duplicação.
"""
from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity

from src.models.portal_models import User, UserType


def admin_required(f):
    """Decorator que exige admin E verifica status do usuário/tenant."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type != UserType.ADMIN:
            return jsonify({'error': 'Acesso restrito a administradores'}), 403
        from src.utils.tenant import check_user_and_tenant_status
        block = check_user_and_tenant_status(user)
        if block:
            return block
        return f(*args, **kwargs)
    return decorated_function


def client_or_admin_required(f):
    """Decorator que exige admin ou cliente E verifica status do usuário/tenant."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type not in (UserType.ADMIN, UserType.CLIENT):
            return jsonify({'error': 'Acesso restrito'}), 403
        from src.utils.tenant import check_user_and_tenant_status
        block = check_user_and_tenant_status(user)
        if block:
            return block
        return f(*args, **kwargs)
    return decorated_function