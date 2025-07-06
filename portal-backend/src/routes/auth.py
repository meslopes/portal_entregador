

from flask import request, jsonify
from src.models.portal_models import db, User, UserType, UserStatus
from werkzeug.security import generate_password_hash
from flask import Blueprint
auth_bp = Blueprint('auth', __name__)

# Endpoint para criar admin
@auth_bp.route('/create-admin', methods=['POST'])
def create_admin():
    data = request.get_json() or {}
    email = data.get('email', 'admin@muv.log.br')
    password = data.get('password', 'admin123')
    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Usuário já existe'}), 400
    user = User(
        email=email,
        password_hash=generate_password_hash(password),
        first_name='Admin',
        last_name='MUV',
        phone='11999999999',
        cpf='00000000000',
        user_type=UserType.ADMIN,
        status=UserStatus.ACTIVE
    )


