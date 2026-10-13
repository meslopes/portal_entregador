"""
Decorators de autenticação compartilhados.
Centraliza admin_required e client_or_admin_required para evitar duplicação.
"""
import re
from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity

from src.models.portal_models import User, UserType


def validate_password(password):
    """
    Valida força da senha. Retorna None se válida, ou mensagem de erro.
    Regras: mínimo 8 caracteres, ao menos 1 letra e 1 número.
    """
    if not password or len(password) < 8:
        return 'Senha deve ter pelo menos 8 caracteres'
    if not re.search(r'[A-Za-z]', password):
        return 'Senha deve conter ao menos 1 letra'
    if not re.search(r'\d', password):
        return 'Senha deve conter ao menos 1 número'
    return None


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