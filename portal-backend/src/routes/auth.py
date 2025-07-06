
from flask import request, jsonify, current_app
from src.models.portal_models import db, User, UserType, UserStatus
from werkzeug.security import generate_password_hash

# Import do Blueprint
from flask import Blueprint
auth_bp = Blueprint('auth', __name__)

# Endpoint temporário para listar todas as rotas do app Flask
@auth_bp.route('/rotas', methods=['GET'])
def rotas():
    """Endpoint temporário para listar todas as rotas do app Flask."""
    app = current_app._get_current_object()
    rotas = []
    for rule in app.url_map.iter_rules():
        rotas.append({
            'endpoint': rule.endpoint,
            'methods': list(rule.methods),
            'rule': str(rule)
        })
    return jsonify(rotas=rotas)

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
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'Usuário admin criado com sucesso', 'email': email, 'password': password}), 201
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity
from src.models.portal_models import User, Driver, UserType, UserStatus, VehicleType, db
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Registra um novo usuário (entregador ou admin)"""
    try:
        data = request.get_json()
        
        # Validações básicas
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        
        # Verifica se o usuário já existe
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email já cadastrado'}), 400
        
        # Cria o usuário
        user = User(
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            phone=data.get('phone'),
            cpf=data.get('cpf'),
            birth_date=datetime.strptime(data['birth_date'], '%Y-%m-%d').date() if data.get('birth_date') else None,
            user_type=UserType(data.get('user_type', 'DRIVER')),
            status=UserStatus.ACTIVE
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.flush()  # Para obter o ID do usuário
        
        # Se for um entregador, cria o perfil de driver
        if user.user_type == UserType.DRIVER:
            driver = Driver(
                user_id=user.id,
                vehicle_type=VehicleType(data.get('vehicle_type', 'CAR')),
                driver_license=data.get('driver_license'),
                license_expiry_date=datetime.strptime(data['license_expiry_date'], '%Y-%m-%d').date() if data.get('license_expiry_date') else None,
                vehicle_plate=data.get('vehicle_plate'),
                vehicle_model=data.get('vehicle_model'),
                vehicle_year=data.get('vehicle_year'),
                bank_account=data.get('bank_account'),
                pix_key=data.get('pix_key')
            )
            db.session.add(driver)
        
        db.session.commit()
        
        # Cria o token de acesso
        access_token = create_access_token(
            identity=user.id,
            expires_delta=timedelta(days=7)
        )
        
        response_data = user.to_dict()
        if user.driver:
            response_data['driver'] = user.driver.to_dict()
        
        return jsonify({
            'message': 'Usuário registrado com sucesso',
            'user': response_data,
            'access_token': access_token
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Autentica um usuário"""
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        
        user = User.query.filter_by(email=data['email']).first()
        
        if not user or not user.check_password(data['password']):
            return jsonify({'error': 'Credenciais inválidas'}), 401
        
        if user.status != UserStatus.ACTIVE:
            return jsonify({'error': 'Conta inativa ou suspensa'}), 401
        
        # Cria o token de acesso
        access_token = create_access_token(
            identity=user.id,
            expires_delta=timedelta(days=7)
        )
        
        response_data = user.to_dict()
        if user.driver:
            response_data['driver'] = user.driver.to_dict()
        
        return jsonify({
            'message': 'Login realizado com sucesso',
            'user': response_data,
            'access_token': access_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Obtém o perfil do usuário autenticado"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        response_data = user.to_dict()
        if user.driver:
            response_data['driver'] = user.driver.to_dict()
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Atualiza o perfil do usuário autenticado"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        data = request.get_json()
        
        # Atualiza dados do usuário
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'phone' in data:
            user.phone = data['phone']
        if 'birth_date' in data:
            user.birth_date = datetime.strptime(data['birth_date'], '%Y-%m-%d').date()
        if 'profile_picture_url' in data:
            user.profile_picture_url = data['profile_picture_url']
        
        user.updated_at = datetime.utcnow()
        
        # Se for um entregador, atualiza dados do driver
        if user.driver and 'driver' in data:
            driver_data = data['driver']
            if 'vehicle_type' in driver_data:
                user.driver.vehicle_type = VehicleType(driver_data['vehicle_type'])
            if 'vehicle_plate' in driver_data:
                user.driver.vehicle_plate = driver_data['vehicle_plate']
            if 'vehicle_model' in driver_data:
                user.driver.vehicle_model = driver_data['vehicle_model']
            if 'vehicle_year' in driver_data:
                user.driver.vehicle_year = driver_data['vehicle_year']
            if 'bank_account' in driver_data:
                user.driver.bank_account = driver_data['bank_account']
            if 'pix_key' in driver_data:
                user.driver.pix_key = driver_data['pix_key']
            
            user.driver.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        response_data = user.to_dict()
        if user.driver:
            response_data['driver'] = user.driver.to_dict()
        
        return jsonify({
            'message': 'Perfil atualizado com sucesso',
            'user': response_data
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Altera a senha do usuário"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        data = request.get_json()
        
        if not data.get('current_password') or not data.get('new_password'):
            return jsonify({'error': 'Senha atual e nova senha são obrigatórias'}), 400
        
        if not user.check_password(data['current_password']):
            return jsonify({'error': 'Senha atual incorreta'}), 400
        
        user.set_password(data['new_password'])
        user.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': 'Senha alterada com sucesso'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

