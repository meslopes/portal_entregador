"""Módulo admin_users — extraído de src/routes/admin_orders.py no refactor de arquivos grandes.
Movimento puro de código — comportamento idêntico ao original.
"""
import contextlib
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import or_

from src.models.portal_models import (
    Customer,
    Driver,
    Restaurant,
    User,
    UserStatus,
    UserType,
    VehicleType,
    db,
)
from src.utils.auth import admin_required
from src.utils.tenant import get_current_tenant_id

admin_users_bp = Blueprint('admin_users', __name__)


@admin_users_bp.route('/pending-users', methods=['GET'])

@jwt_required()

@admin_required

def get_pending_users():

    """Lista usuarios pendentes de aprovacao"""

    try:

        tenant_id = get_current_tenant_id()



        # Mostrar usuarios do mesmo tenant OU sem tenant (cadastros publicos)
        if tenant_id:
            query = User.query.filter(
                User.status == UserStatus.INACTIVE,
                (User.tenant_id == tenant_id) | (User.tenant_id.is_(None))
            )
        else:
            query = User.query.filter_by(status=UserStatus.INACTIVE)



        pending = query.all()

        users_data = []

        for user in pending:

            user_dict = user.to_dict(include_sensitive=True)

            if user.user_type == UserType.DRIVER:

                driver = Driver.query.filter_by(user_id=user.id).first()

                if driver:

                    user_dict['driver'] = driver.to_dict()

            elif user.user_type == UserType.CLIENT:

                customer = Customer.query.filter_by(user_id=user.id).first()

                if customer:

                    user_dict['customer'] = customer.to_dict()

            users_data.append(user_dict)



        return jsonify({'users': users_data, 'count': len(users_data)}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_users_bp.route('/users/<int:user_id>/approve', methods=['POST'])

@jwt_required()

@admin_required

def approve_user(user_id):

    """Aprova o cadastro de um usuario"""

    try:

        user = User.query.get(user_id)

        if not user:

            return jsonify({'error': 'Usuário não encontrado'}), 404



        if user.status != UserStatus.INACTIVE:

            return jsonify({'error': 'Usuário não está pendente'}), 400

        # Verificar tenant - admin só aprova usuários do seu tenant ou sem tenant
        tenant_id = get_current_tenant_id()
        if tenant_id and user.tenant_id and user.tenant_id != tenant_id:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        data = request.get_json(silent=True) or {}

        # Determinar tenant_id: usar do request ou do admin atual
        tenant_id = data.get('tenant_id') or get_current_tenant_id()

        # Atribuir tenant se usuario nao tiver
        if tenant_id and not user.tenant_id:
            user.tenant_id = tenant_id

        user.status = UserStatus.ACTIVE

        user.updated_at = datetime.now(timezone.utc)

        # Atribuir praca se fornecida
        square_id = data.get('square_id')
        if square_id and user.user_type == UserType.DRIVER:
            driver = Driver.query.filter_by(user_id=user.id).first()
            if driver:
                driver.square_id = square_id
                if tenant_id:
                    driver.tenant_id = tenant_id

        # Se for CLIENT, atualizar tenant do customer
        if user.user_type == UserType.CLIENT and tenant_id:
            customer = Customer.query.filter_by(user_id=user.id).first()
            if customer:
                customer.tenant_id = tenant_id

        db.session.commit()

        # Notifica o usuario via Push Notification
        try:
            from src.services.push_notification import send_approval_notification
            send_approval_notification(user.id, user.first_name)
        except Exception:
            pass

        return jsonify({'message': 'Usuário aprovado com sucesso'}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_users_bp.route('/users/<int:user_id>/reject', methods=['POST'])

@jwt_required()

@admin_required

def reject_user(user_id):

    """Rejeita o cadastro de um usuario"""

    try:

        user = User.query.get(user_id)

        if not user:

            return jsonify({'error': 'Usuário não encontrado'}), 404



        if user.status != UserStatus.INACTIVE:
            return jsonify({'error': 'Usuário não está pendente'}), 400

        # Notifica o usuario via Push Notification antes de excluir
        try:
            from src.services.push_notification import send_rejection_notification
            send_rejection_notification(user.id, user.first_name)
        except Exception:
            pass

        # Rejeição = soft delete (auditoria/LGPD). Hard delete só via lixeira com confirmação.
        user_type = user.user_type

        if user_type == UserType.DRIVER:

            driver = Driver.query.filter_by(user_id=user.id).first()

            if driver:

                db.session.delete(driver)

        elif user_type == UserType.CLIENT:

            customer = Customer.query.filter_by(user_id=user.id).first()

            if customer:

                db.session.delete(customer)

        from datetime import datetime, timezone

        from flask_jwt_extended import get_jwt_identity
        try:
            current_uid = int(get_jwt_identity())
        except Exception:
            current_uid = None
        user.deleted_at = datetime.now(timezone.utc)
        user.deleted_by = current_uid
        user.status = UserStatus.INACTIVE

        db.session.commit()



        return jsonify({'message': 'Usuário rejeitado e excluído'}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





# ============================================

# GESTAO DE USUARIOS (ADMIN/ENTREGADOR/ESTABELECIMENTO)

# ============================================



@admin_users_bp.route('/users', methods=['GET'])

@jwt_required()

@admin_required

def get_all_users():

    """Lista todos os usuarios do sistema"""

    try:

        page = request.args.get('page', 1, type=int)

        per_page = request.args.get('per_page', 20, type=int)

        user_type = request.args.get('type')

        search = request.args.get('search', '')



        query = User.query

        # Filtrar usuários excluídos (soft delete)
        query = query.filter(User.deleted_at.is_(None))



        if user_type:

            with contextlib.suppress(ValueError):

                query = query.filter_by(user_type=UserType(user_type))




        if search:

            search_escaped = search.replace('%', '\\%').replace('_', '\\_')
            query = query.filter(or_(
                User.first_name.ilike(f'%{search_escaped}%'),
                User.last_name.ilike(f'%{search_escaped}%'),
                User.email.ilike(f'%{search_escaped}%'),
                User.phone.ilike(f'%{search_escaped}%')
            ))



        users = query.order_by(User.created_at.desc()).paginate(

            page=page, per_page=per_page, error_out=False

        )



        users_data = []

        for user in users.items:

            user_dict = user.to_dict(include_sensitive=True)

            if user.user_type == UserType.DRIVER:

                driver = Driver.query.filter_by(user_id=user.id).first()

                if driver:

                    user_dict['driver'] = driver.to_dict()

                # Classificação Próprio vs Plataforma (telefone, não nome)
                from src.utils.driver_type import get_driver_subtype_for_user
                user_dict['driver_subtype'] = get_driver_subtype_for_user(user)

            elif user.user_type == UserType.CLIENT:

                customer = Customer.query.filter_by(user_id=user.id).first()

                if customer:

                    user_dict['customer'] = customer.to_dict()

                    # Incluir dados do restaurante vinculado (square_id, etc.)
                    from src.utils.restaurant import find_restaurant_by_name
                    restaurant = find_restaurant_by_name(customer.name)
                    if restaurant:
                        user_dict['restaurant'] = {
                            'id': restaurant.id,
                            'name': restaurant.name,
                            'square_id': restaurant.square_id,
                            'tenant_id': restaurant.tenant_id
                        }
                        user_dict['square_id'] = restaurant.square_id

            users_data.append(user_dict)



        return jsonify({

            'users': users_data,

            'total': users.total,

            'pages': users.pages,

            'current_page': page

        }), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_users_bp.route('/users/<int:user_id>', methods=['GET'])

@jwt_required()

@admin_required

def get_user_details(user_id):

    """Obtem detalhes de um usuario"""

    try:

        user = User.query.get(user_id)

        if not user:

            return jsonify({'error': 'Usuário não encontrado'}), 404



        user_dict = user.to_dict(include_sensitive=True)

        if user.user_type == UserType.DRIVER:

            driver = Driver.query.filter_by(user_id=user.id).first()

            if driver:

                user_dict['driver'] = driver.to_dict()

        elif user.user_type == UserType.CLIENT:

            customer = Customer.query.filter_by(user_id=user.id).first()

            if customer:

                user_dict['customer'] = customer.to_dict()



        return jsonify(user_dict), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_users_bp.route('/users/<int:user_id>', methods=['PUT'])

@jwt_required()

@admin_required

def update_user(user_id):

    """Atualiza dados de um usuario"""

    try:

        user = User.query.get(user_id)

        if not user:

            return jsonify({'error': 'Usuário não encontrado'}), 404



        # Verificar tenant

        tenant_id = get_current_tenant_id()

        if tenant_id and user.tenant_id != tenant_id:

            return jsonify({'error': 'Usuário não encontrado'}), 404



        data = request.get_json()



        if data.get('first_name'):

            user.first_name = data['first_name']

        if data.get('last_name'):

            user.last_name = data['last_name']

        if data.get('phone'):

            user.phone = data['phone']

        if data.get('email'):

            # Verifica se email ja existe

            existing = User.query.filter(User.email == data['email'], User.id != user_id).first()

            if existing:

                return jsonify({'error': 'Email já cadastrado'}), 400

            user.email = data['email']

        if data.get('status'):

            try:

                user.status = UserStatus(data['status'])

            except ValueError:

                return jsonify({'error': 'Status inválido'}), 400

        if data.get('user_type'):

            try:

                new_type = UserType(data['user_type'])

                # Se mudando para CLIENT, garantir que Customer e Restaurant existam
                if new_type == UserType.CLIENT and user.user_type != UserType.CLIENT:
                    customer = Customer.query.filter_by(user_id=user.id).first()
                    if not customer:
                        customer = Customer(
                            user_id=user.id,
                            name=f"{user.first_name} {user.last_name}",
                            phone=user.phone or '',
                            email=user.email,
                            tenant_id=user.tenant_id
                        )
                        db.session.add(customer)

                    restaurant = Restaurant.query.filter_by(email=user.email).first()
                    if not restaurant:
                        restaurant = Restaurant(
                            name=f"{user.first_name} {user.last_name}",
                            email=user.email,
                            address='',
                            latitude=-29.95,
                            longitude=-50.45,
                            is_active=True,
                            tenant_id=user.tenant_id,
                            pickup_confirmation_type='code',
                            delivery_confirmation_type='code'
                        )
                        db.session.add(restaurant)

                # Se mudando para DRIVER, garantir que Driver exista
                if new_type == UserType.DRIVER and user.user_type != UserType.DRIVER:
                    driver = Driver.query.filter_by(user_id=user.id).first()
                    if not driver:
                        driver = Driver(
                            user_id=user.id,
                            vehicle_type=VehicleType.MOTORCYCLE,  # noqa: F823 — imported at module level
                            tenant_id=user.tenant_id
                        )
                        db.session.add(driver)

                user.user_type = new_type

            except ValueError:

                return jsonify({'error': 'Tipo de usuário inválido'}), 400

        # tenant_id (permite alterar para redistribuir)
        if 'tenant_id' in data:
            user.tenant_id = data['tenant_id'] if data['tenant_id'] else None

        # cpf
        if 'cpf' in data:
            user.cpf = data['cpf'] if data['cpf'] else None

        # Atualiza dados especificos do tipo

        if user.user_type == UserType.DRIVER:

            driver = Driver.query.filter_by(user_id=user.id).first()

            if driver:

                if data.get('vehicle_type'):

                    try:

                        from src.models.portal_models import VehicleType

                        driver.vehicle_type = VehicleType(data['vehicle_type'])

                    except ValueError:

                        pass

                if data.get('vehicle_plate'):

                    driver.vehicle_plate = data['vehicle_plate']

                if data.get('vehicle_model'):

                    driver.vehicle_model = data['vehicle_model']

                if data.get('vehicle_year'):

                    driver.vehicle_year = data['vehicle_year']

                if data.get('pix_key'):

                    driver.pix_key = data['pix_key']

                if data.get('max_concurrent_orders'):

                    driver.max_concurrent_orders = data['max_concurrent_orders']

                # square_id do entregador
                if 'square_id' in data:
                    driver.square_id = data['square_id'] if data['square_id'] else None



        # Atualiza Customer se for CLIENT

        if user.user_type == UserType.CLIENT:

            customer = Customer.query.filter_by(user_id=user.id).first()

            if customer:

                if data.get('customer_name'):

                    customer.name = data['customer_name']

                if data.get('phone'):

                    customer.phone = data['phone']

                # Atualizar tenant_id do customer tambem
                if 'tenant_id' in data:
                    customer.tenant_id = data['tenant_id'] if data['tenant_id'] else None

                # Atualizar restaurante vinculado (praça, tenant)
                # Encontrar restaurante via Customer se não fornecido restaurant_id
                from src.utils.restaurant import find_restaurant_by_name
                restaurant = None
                if 'restaurant_id' in data and data['restaurant_id']:
                    restaurant = Restaurant.query.get(int(data['restaurant_id']))
                else:
                    restaurant = find_restaurant_by_name(customer.name)

                if restaurant:
                    if 'square_id' in data:
                        restaurant.square_id = data['square_id'] if data['square_id'] else None
                    if 'tenant_id' in data:
                        restaurant.tenant_id = data['tenant_id'] if data['tenant_id'] else None



        user.updated_at = datetime.now(timezone.utc)

        db.session.commit()



        return jsonify({'message': 'Usuario atualizado com sucesso'}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_users_bp.route('/users/<int:user_id>/reset-password', methods=['POST'])

@jwt_required()

@admin_required

def admin_reset_password(user_id):

    """Admin reseta a senha de um usuario"""

    try:

        user = User.query.get(user_id)

        if not user:

            return jsonify({'error': 'Usuario nao encontrado'}), 404



        data = request.get_json() or {}

        new_password = data.get('new_password')

        if not new_password:

            return jsonify({'error': 'Nova senha é obrigatória'}), 400

        from src.utils.auth import validate_password
        pwd_err = validate_password(new_password)
        if pwd_err:
            return jsonify({'error': f'Nova {pwd_err[0].lower()}{pwd_err[1:]}'}), 400



        user.set_password(new_password)

        db.session.flush()



        # Verifica se a senha foi salva corretamente

        from werkzeug.security import check_password_hash

        if not check_password_hash(user.password_hash, new_password):

            db.session.rollback()

            return jsonify({'error': 'Erro ao salvar nova senha'}), 500



        db.session.commit()



        return jsonify({'message': 'Senha resetada com sucesso', 'email': user.email}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_users_bp.route('/users/<int:user_id>', methods=['DELETE'])

@jwt_required()

@admin_required

def delete_user(user_id):
    """Exclui um usuario (soft delete)."""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Verificar tenant
        tenant_id = get_current_tenant_id()
        if tenant_id and user.tenant_id != tenant_id:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Nao permite excluir a si mesmo
        current_user_id = int(get_jwt_identity())
        if user_id == current_user_id:
            return jsonify({'error': 'Não é possível excluir sua própria conta'}), 400

        # Soft delete - marcar como excluído, manter dados
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        user.deleted_at = datetime.now(timezone.utc)
        user.deleted_by = current_user_id
        db.session.commit()
        success = True

        if success:
            return jsonify({'message': 'Usuário movido para a lixeira'}), 200
        else:
            return jsonify({'error': 'Erro ao excluir usuário'}), 500

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_users_bp.route('/create-admin', methods=['POST'])

@jwt_required()

@admin_required

def create_admin_user():

    """Cria um novo admin (pelo admin existente)"""

    try:

        data = request.get_json()

        email = data.get('email')

        password = data.get('password')

        if not password:

            return jsonify({'error': 'Senha é obrigatória'}), 400

        first_name = data.get('first_name', 'Admin')

        last_name = data.get('last_name', '')



        if not email:

            return jsonify({'error': 'Email é obrigatório'}), 400



        if User.query.filter_by(email=email).first():

            return jsonify({'error': 'Email já cadastrado'}), 400



        import uuid

        unique_cpf = f"ADMIN{uuid.uuid4().hex[:8].upper()}"

        unique_phone = f"119{uuid.uuid4().hex[:8]}"

        # Herdar tenant_id do admin atual
        tenant_id = get_current_tenant_id()

        user = User(

            email=email,

            first_name=first_name,

            last_name=last_name,

            phone=unique_phone,

            cpf=unique_cpf,

            user_type=UserType.ADMIN,

            status=UserStatus.ACTIVE,

            tenant_id=tenant_id

        )

        user.set_password(password)

        db.session.add(user)

        db.session.commit()



        return jsonify({

            'message': 'Admin criado com sucesso',

            'user': {

                'id': user.id,

                'email': email,

                'name': f"{first_name} {last_name}"

            }

        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500







