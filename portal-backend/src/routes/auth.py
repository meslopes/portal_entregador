
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
from flask import request, jsonify
from src.models.portal_models import db, User, Driver, Customer, UserType, UserStatus, VehicleType
from flask import Blueprint
from datetime import datetime

auth_bp = Blueprint('auth', __name__)


def _build_user_response(user):
    """Monta a resposta completa do usuário com dados do driver/customer se aplicável."""
    user_data = user.to_dict()
    if user.driver:
        user_data['driver'] = user.driver.to_dict()
    customer = Customer.query.filter_by(user_id=user.id).first()
    if customer:
        user_data['customer'] = customer.to_dict()
    return user_data


# Endpoint para criar admin
@auth_bp.route('/create-admin', methods=['POST'])
def create_admin():
    try:
        data = request.get_json() or {}
        email = data.get('email', 'admin@muv.log.br')
        password = data.get('password', 'admin123')
        if User.query.filter_by(email=email).first():
            return jsonify({'message': 'Usuário já existe'}), 400

        # Gera CPF e telefone únicos para o admin
        import uuid
        unique_cpf = f"ADMIN{uuid.uuid4().hex[:8].upper()}"
        unique_phone = f"119{uuid.uuid4().hex[:8]}"

        user = User(
            email=email,
            password_hash=generate_password_hash(password),
            first_name='Admin',
            last_name='MUV',
            phone=unique_phone,
            cpf=unique_cpf,
            user_type=UserType.ADMIN,
            status=UserStatus.ACTIVE
        )
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': 'Usuário admin criado com sucesso', 'email': email, 'password': password}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# Endpoint para registro de entregador
@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json() or {}

        email = data.get('email')
        password = data.get('password')
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        phone = data.get('phone')

        if not email or not password or not first_name or not last_name:
            return jsonify({'error': 'Email, senha, nome e sobrenome são obrigatórios'}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email já cadastrado'}), 400

        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            cpf=data.get('cpf'),
            birth_date=None,
            user_type=UserType.DRIVER,
            status=UserStatus.INACTIVE  # Pendente de aprovacao
        )
        user.set_password(password)

        if data.get('birth_date'):
            from datetime import datetime as dt
            try:
                user.birth_date = dt.strptime(data['birth_date'], '%Y-%m-%d').date()
            except (ValueError, TypeError):
                pass

        db.session.add(user)
        db.session.flush()

        vehicle_type_str = data.get('vehicle_type', 'MOTORCYCLE')
        try:
            vehicle_type = VehicleType(vehicle_type_str)
        except ValueError:
            vehicle_type = VehicleType.MOTORCYCLE

        vehicle_year = data.get('vehicle_year')
        if vehicle_year:
            try:
                vehicle_year = int(vehicle_year)
            except (ValueError, TypeError):
                vehicle_year = None

        driver = Driver(
            user_id=user.id,
            driver_license=data.get('driver_license'),
            vehicle_type=vehicle_type,
            vehicle_plate=data.get('vehicle_plate'),
            vehicle_model=data.get('vehicle_model'),
            vehicle_year=vehicle_year,
            pix_key=data.get('pix_key'),
            bank_account=data.get('bank_account')
        )

        if data.get('license_expiry_date'):
            from datetime import datetime as dt
            try:
                driver.license_expiry_date = dt.strptime(data['license_expiry_date'], '%Y-%m-%d').date()
            except (ValueError, TypeError):
                pass

        db.session.add(driver)
        db.session.commit()

        access_token = create_access_token(identity=str(user.id))
        user_data = _build_user_response(user)

        return jsonify({
            'access_token': access_token,
            'user': user_data
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# Endpoint para registro de cliente
@auth_bp.route('/register-client', methods=['POST'])
def register_client():
    try:
        data = request.get_json() or {}

        email = data.get('email')
        password = data.get('password')
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        phone = data.get('phone')
        address = data.get('address')

        if not email or not password or not first_name or not last_name or not phone:
            return jsonify({'error': 'Email, senha, nome, sobrenome e telefone são obrigatórios'}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email já cadastrado'}), 400

        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            user_type=UserType.CLIENT,
            status=UserStatus.INACTIVE  # Pendente de aprovacao
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        customer = Customer(
            user_id=user.id,
            name=f"{first_name} {last_name}",
            phone=phone,
            email=email
        )
        db.session.add(customer)

        # Cria restaurante/estabelecimento se endereco fornecido
        if address:
            latitude = None
            longitude = None
            try:
                from src.services.geocoding import geocode_address
                geo = geocode_address(address)
                if geo:
                    latitude = geo['latitude']
                    longitude = geo['longitude']
            except Exception:
                pass

            restaurant = Restaurant(
                name=f"{first_name} {last_name}",
                address=address,
                latitude=latitude or -29.95,
                longitude=longitude or -50.45,
                phone=phone,
                email=email
            )
            db.session.add(restaurant)

        db.session.commit()

        access_token = create_access_token(identity=str(user.id))
        user_data = _build_user_response(user)

        return jsonify({
            'access_token': access_token,
            'user': user_data
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# Endpoint para confirmar email
@auth_bp.route('/confirm-email', methods=['POST'])
def confirm_email():
    """Confirma o email do usuario e ativa a conta"""
    try:
        data = request.get_json() or {}
        token = data.get('token')

        if not token:
            return jsonify({'error': 'Token é obrigatório'}), 400

        try:
            user_id = int(token)
        except ValueError:
            return jsonify({'error': 'Token inválido'}), 400

        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        if user.status != UserStatus.INACTIVE:
            return jsonify({'error': 'Conta já foi confirmada ou está ativa'}), 400

        user.status = UserStatus.ACTIVE
        user.updated_at = datetime.utcnow()
        db.session.commit()

        try:
            from src.services.email import email_service
            if email_service.is_configured():
                email_service.send_welcome_email(
                    user.email,
                    f"{user.first_name} {user.last_name}"
                )
        except Exception:
            pass

        return jsonify({'message': 'Conta confirmada com sucesso! Você já pode fazer login.'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Endpoint para login
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email e senha são obrigatórios'}), 400

    user = User.query.filter_by(email=email).first()

    if user and check_password_hash(user.password_hash, password):
        # Verifica se o usuario esta ativo
        if user.status == UserStatus.INACTIVE:
            return jsonify({'error': 'Sua conta está pendente de aprovação. Aguarde o administrador liberar seu acesso.'}), 403
        if user.status == UserStatus.SUSPENDED:
            return jsonify({'error': 'Sua conta foi suspensa. Entre em contato com o administrador.'}), 403

        access_token = create_access_token(identity=str(user.id))
        user_data = _build_user_response(user)
        return jsonify(access_token=access_token, user=user_data), 200
    else:
        return jsonify({'error': 'Credenciais inválidas'}), 401


# Endpoint para obter perfil do usuário autenticado
@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        user_data = _build_user_response(user)
        return jsonify(user_data), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Endpoint para atualizar perfil
@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        data = request.get_json() or {}

        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'phone' in data:
            user.phone = data['phone']
        if 'profile_picture_url' in data:
            user.profile_picture_url = data['profile_picture_url']

        db.session.commit()

        user_data = _build_user_response(user)
        return jsonify(user_data), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# Endpoint para alterar senha
@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        data = request.get_json() or {}
        current_password = data.get('current_password')
        new_password = data.get('new_password')

        if not current_password or not new_password:
            return jsonify({'error': 'Senha atual e nova senha são obrigatórias'}), 400

        if not check_password_hash(user.password_hash, current_password):
            return jsonify({'error': 'Senha atual incorreta'}), 401

        if len(new_password) < 6:
            return jsonify({'error': 'Nova senha deve ter pelo menos 6 caracteres'}), 400

        # Altera a senha e força a escrita no banco
        user.set_password(new_password)
        db.session.flush()

        # Verifica se a senha foi salva corretamente
        if not check_password_hash(user.password_hash, new_password):
            db.session.rollback()
            return jsonify({'error': 'Erro ao salvar nova senha'}), 500

        db.session.commit()

        return jsonify({'message': 'Senha alterada com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# Endpoint de teste (rota protegida)
@auth_bp.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    current_user_id = get_jwt_identity()
    return jsonify(logged_in_as=int(current_user_id)), 200
