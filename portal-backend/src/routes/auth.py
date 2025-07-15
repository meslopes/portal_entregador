
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash
from flask import request, jsonify
from src.models.portal_models import db, User, UserType, UserStatus
from werkzeug.security import generate_password_hash
from flask import Blueprint
auth_bp = Blueprint('auth', __name__)

# Endpoint para criar admin
@auth_bp.route('/create-admin', methods=['POST'])
def create_admin():
    try:
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
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': 'Usuário admin criado com sucesso', 'email': email, 'password': password}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Endpoint para login
@auth_bp.route('/login', methods=['POST'])
def login():
    email = request.json.get('email', None)
    password = request.json.get('password', None)

    user = User.query.filter_by(email=email).first()

    if user and check_password_hash(user.password_hash, password):
        access_token = create_access_token(identity=user.id)
        return jsonify(access_token=access_token), 200
    else:
        return jsonify({'message': 'Credenciais inválidas'}), 401
    
    # Exemplo de rota protegida (para teste)
@auth_bp.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    current_user_id = get_jwt_identity()
    return jsonify(logged_in_as=current_user_id), 200
