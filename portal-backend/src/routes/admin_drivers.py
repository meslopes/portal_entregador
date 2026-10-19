"""
Rotas administrativas - Entregadores.
Extraído de admin.py para melhor organização.
Inclui: CRUD de entregadores, atribuição, entregadores de estabelecimento, métricas.
"""
import logging
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func, or_

from src.models.portal_models import (
    Delivery,
    Driver,
    EstablishmentDriver,
    Order,
    OrderStatus,
    Payment,
    Restaurant,
    User,
    UserStatus,
    UserType,
    VehicleType,
    db,
)
from src.utils.auth import admin_required
from src.utils.driver_type import (
    find_own_driver_by_phone,
    find_phone_conflict,
    is_platform_driver_excluded,
    mark_driver_converted_by_phone,
    normalize_phone,
)
from src.utils.tenant import get_current_tenant_id, get_current_user

admin_drivers_bp = Blueprint('admin_drivers', __name__)
logger = logging.getLogger(__name__)


def get_square_filter():
    """Retorna o square_id do query param se fornecido."""
    return request.args.get('square_id', type=int)


@admin_drivers_bp.route('/drivers', methods=['GET'])

@jwt_required()

@admin_required

def get_drivers():

    """Lista todos os entregadores"""

    try:

        page = request.args.get('page', 1, type=int)

        per_page = request.args.get('per_page', 20, type=int)

        search = request.args.get('search', '')

        status_filter = request.args.get('status')  # online, offline, all

        square_id = request.args.get('square_id', type=int)

        tenant_id = get_current_tenant_id()



        query = Driver.query.join(User)

        # Excluir entregadores PRÓPRIOS da lista de plataforma:
        # 1) convertidos via flag converted_to_own
        # 2) quem já tem EstablishmentDriver ativo com o mesmo telefone (NÃO usar nome)
        # NOT coluna em SQLAlchemy não funciona — usar .is_(False)
        query = query.filter(
            db.or_(Driver.converted_to_own.is_(False), Driver.converted_to_own.is_(None))
        )
        # Telefones de own drivers ativos → esconder Users/Drivers do mesmo telefone
        own_phones = {
            normalize_phone(od.phone)
            for od in EstablishmentDriver.query.filter(EstablishmentDriver.is_active.is_(True)).all()
            if normalize_phone(od.phone)
        }
        if own_phones:
            user_ids_own = [
                u.id for u in User.query.filter(User.deleted_at.is_(None)).all()
                if normalize_phone(u.phone) in own_phones
            ]
            if user_ids_own:
                query = query.filter(~Driver.user_id.in_(user_ids_own))

        # Filtrar usuários excluídos (soft delete)
        query = query.filter(User.deleted_at.is_(None))



        # Filtrar por tenant

        if tenant_id:

            query = query.filter(Driver.tenant_id == tenant_id)

        # Filtrar por praca (incluir drivers sem praca definida)
        if square_id:
            query = query.filter((Driver.square_id == square_id) | (Driver.square_id.is_(None)))



        # Filtro de busca (escapar caracteres especiais do LIKE)
        if search:
            # Escapar % e _ que são especiais no LIKE
            search_escaped = search.replace('%', '\\%').replace('_', '\\_')
            query = query.filter(or_(
                User.first_name.ilike(f'%{search_escaped}%'),
                User.last_name.ilike(f'%{search_escaped}%'),
                User.email.ilike(f'%{search_escaped}%'),
                User.phone.ilike(f'%{search_escaped}%')
            ))



        # Filtro de status

        if status_filter == 'online':

            query = query.filter(Driver.is_online)

        elif status_filter == 'offline':

            query = query.filter(not Driver.is_online)



        drivers = query.order_by(User.first_name).paginate(

            page=page, per_page=per_page, error_out=False

        )



        drivers_data = []

        for driver in drivers.items:

            driver_dict = driver.to_admin_dict()

            driver_dict['user'] = driver.user.to_dict(include_sensitive=True)



            # Estatísticas do entregador

            total_earnings = db.session.query(func.sum(Payment.amount)).filter_by(

                driver_id=driver.id

            ).scalar() or 0



            driver_dict['total_earnings'] = float(total_earnings)

            drivers_data.append(driver_dict)



        return jsonify({

            'drivers': drivers_data,

            'total': drivers.total,

            'pages': drivers.pages,

            'current_page': page,

            'per_page': per_page

        }), 200



    except Exception as e:

        return jsonify({'error': str(e)}), 500



@admin_drivers_bp.route('/drivers/<int:driver_id>', methods=['GET'])

@jwt_required()

@admin_required

def get_driver_details(driver_id):

    """Obtém detalhes de um entregador específico"""

    try:

        driver = Driver.query.get(driver_id)

        if not driver:

            return jsonify({'error': 'Entregador não encontrado'}), 404



        driver_dict = driver.to_dict()

        driver_dict['user'] = driver.user.to_dict(include_sensitive=True)



        # Estatísticas detalhadas

        total_earnings = db.session.query(func.sum(Payment.amount)).filter_by(

            driver_id=driver.id

        ).scalar() or 0



        avg_rating = db.session.query(func.avg(Delivery.customer_rating)).filter_by(

            driver_id=driver.id

        ).scalar() or 5.0



        # Entregas dos últimos 30 dias

        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

        recent_deliveries = Order.query.filter(

            Order.driver_id == driver.id,

            Order.status == OrderStatus.DELIVERED,

            Order.delivery_time >= thirty_days_ago

        ).count()



        driver_dict['statistics'] = {

            'total_earnings': float(total_earnings),

            'average_rating': float(avg_rating),

            'recent_deliveries': recent_deliveries

        }



        return jsonify(driver_dict), 200



    except Exception as e:

        return jsonify({'error': str(e)}), 500



@admin_drivers_bp.route('/drivers', methods=['POST'])

@jwt_required()

@admin_required

def create_driver():

    """Cria um novo entregador"""

    try:

        data = request.get_json()



        email = data.get('email')

        password = data.get('password')

        first_name = data.get('first_name')

        last_name = data.get('last_name')



        if not email or not first_name or not last_name:

            return jsonify({'error': 'Email, nome e sobrenome são obrigatórios'}), 400

        if not password:

            return jsonify({'error': 'Senha é obrigatória'}), 400

        # Telefone é OBRIGATÓRIO (login de próprios + identidade entre listas)
        phone_raw = (data.get('phone') or '').strip()
        if not normalize_phone(phone_raw):
            return jsonify({'error': 'Telefone é obrigatório'}), 400

        if User.query.filter_by(email=email).first():

            return jsonify({'error': 'Email já cadastrado'}), 400

        # Telefone não pode se repetir entre cadastros (pessoas diferentes)
        conflict = find_phone_conflict(phone_raw)
        if conflict:
            return jsonify({
                'error': f"Telefone já cadastrado para: {conflict['label']}. "
                         'Cada pessoa deve ter um telefone único.'
            }), 400



        # Obter tenant_id do admin atual

        tenant_id = get_current_tenant_id()



        # Cria usuario

        user = User(

            email=email,

            first_name=first_name,

            last_name=last_name,

            phone=data.get('phone'),

            cpf=data.get('cpf'),

            user_type=UserType.DRIVER,

            status=UserStatus.ACTIVE,

            tenant_id=tenant_id

        )

        user.set_password(password)

        db.session.add(user)

        db.session.flush()



        # Cria perfil de entregador

        vehicle_type_str = data.get('vehicle_type', 'MOTORCYCLE')

        try:

            vehicle_type = VehicleType(vehicle_type_str)

        except ValueError:

            vehicle_type = VehicleType.MOTORCYCLE



        driver = Driver(

            user_id=user.id,

            driver_license=data.get('driver_license') or None,

            vehicle_type=vehicle_type,

            vehicle_plate=data.get('vehicle_plate') or None,

            vehicle_model=data.get('vehicle_model') or None,

            vehicle_year=data.get('vehicle_year') or None,

            bank_account=data.get('bank_account') or None,

            pix_key=data.get('pix_key') or None,

            square_id=data.get('square_id') or None,

            max_concurrent_orders=int(data.get('max_concurrent_orders', 3)),

            tenant_id=tenant_id

        )



        db.session.add(driver)

        db.session.commit()



        return jsonify({

            'message': 'Entregador criado com sucesso',

            'driver': {

                'id': driver.id,

                'user_id': user.id,

                'email': email,

                'name': f"{first_name} {last_name}"

            }

        }), 201



    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500



@admin_drivers_bp.route('/drivers/<int:driver_id>', methods=['PUT'])

@jwt_required()

@admin_required

def update_driver(driver_id):

    """Atualiza dados de um entregador"""

    try:

        driver = Driver.query.get(driver_id)

        if not driver:

            return jsonify({'error': 'Entregador não encontrado'}), 404

        data = request.get_json() or {}

        user = User.query.get(driver.user_id)

        if not user:

            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Atualizar dados do usuário

        if 'first_name' in data:

            user.first_name = data['first_name']

        if 'last_name' in data:

            user.last_name = data['last_name']

        if 'phone' in data:

            new_phone = (data.get('phone') or '').strip()
            old_phone = user.phone
            # Telefone não pode ficar vazio nem duplicar
            if not normalize_phone(new_phone):
                return jsonify({'error': 'Telefone é obrigatório e não pode ficar vazio'}), 400
            conflict = find_phone_conflict(new_phone, exclude_user_id=user.id)
            if conflict:
                return jsonify({
                    'error': f"Telefone já cadastrado para: {conflict['label']}. "
                             'Cada pessoa deve ter um telefone único.'
                }), 400
            user.phone = new_phone
            # Manter cadastro próprio (EstablishmentDriver) com o MESMO telefone
            from src.utils.driver_type import sync_user_phone_to_own_driver
            sync_user_phone_to_own_driver(user, old_phone=old_phone, new_phone=new_phone)

        if 'email' in data:

            # Verificar se o novo email já existe

            existing = User.query.filter(User.email == data['email'], User.id != user.id).first()

            if existing:

                return jsonify({'error': 'Email já cadastrado'}), 400

            user.email = data['email']

        # Atualizar dados do driver

        if 'cpf' in data:

            user.cpf = data['cpf'] or None

        if 'vehicle_type' in data:

            try:
                from src.models.portal_models import VehicleType
                driver.vehicle_type = VehicleType(data['vehicle_type'])
            except (ValueError, KeyError):
                return jsonify({'error': 'Tipo de veículo inválido'}), 400

        if 'vehicle_plate' in data:

            driver.vehicle_plate = data['vehicle_plate'] or None

        if 'vehicle_model' in data:

            driver.vehicle_model = data['vehicle_model'] or None

        if 'vehicle_year' in data:

            driver.vehicle_year = data['vehicle_year'] or None

        if 'driver_license' in data:

            driver.driver_license = data['driver_license'] or None

        if 'pix_key' in data:

            driver.pix_key = data['pix_key'] or None

        if 'bank_account' in data:

            driver.bank_account = data['bank_account'] or None

        if 'square_id' in data:

            new_square_id = data['square_id'] or None
            # Validar que a praça pertence ao mesmo tenant do admin
            if new_square_id:
                from src.models.portal_models import Square
                target_square = Square.query.get(int(new_square_id))
                if not target_square:
                    return jsonify({'error': 'Praça não encontrada'}), 404
                tenant_id = get_current_tenant_id()
                if tenant_id and target_square.tenant_id != tenant_id:
                    return jsonify({'error': 'Só é possível transferir para praças da sua organização'}), 403
            driver.square_id = new_square_id
            # Resetar posição na fila (fila é por praça)
            driver.queue_position = 0

        # Super admin pode alterar tenant do entregador
        current_user = get_current_user()
        is_super_admin = current_user and current_user.user_type and current_user.user_type.value == 'ADMIN' and current_user.is_super_admin
        if is_super_admin and 'tenant_id' in data:
            driver.tenant_id = data['tenant_id'] if data['tenant_id'] else None
            user.tenant_id = data['tenant_id'] if data['tenant_id'] else None

        if 'max_concurrent_orders' in data:

            driver.max_concurrent_orders = int(data['max_concurrent_orders'])

        if 'password' in data and data['password']:

            user.set_password(data['password'])

        db.session.commit()

        return jsonify({'message': 'Entregador atualizado com sucesso'}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500


@admin_drivers_bp.route('/drivers/<int:driver_id>/convert-to-own', methods=['POST'])

@jwt_required()

@admin_required

def convert_driver_to_own(driver_id):

    """Converte um entregador da plataforma em entregador próprio de um estabelecimento.

    Identidade por TELEFONE (não por nome). O admin define o PIN de 4 dígitos
    no ato da conversão para o entregador logar no app de próprios.
    """

    try:

        driver = Driver.query.get(driver_id)

        if not driver:

            return jsonify({'error': 'Entregador não encontrado'}), 404

        data = request.get_json() or {}

        restaurant_id = data.get('restaurant_id')

        if not restaurant_id:

            return jsonify({'error': 'restaurant_id é obrigatório'}), 400

        pin = (data.get('pin') or '').strip()

        if not pin or len(pin) != 4 or not pin.isdigit():

            return jsonify({'error': 'PIN de 4 dígitos é obrigatório para converter em entregador próprio'}), 400

        restaurant = Restaurant.query.get(int(restaurant_id))

        if not restaurant:

            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        user = db.session.get(User, driver.user_id)

        if not user:

            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Telefone pode ser preenchido no ato da conversão (se o cadastro original não tinha)
        phone_override = (data.get('phone') or '').strip()
        if phone_override:
            conflict = find_phone_conflict(phone_override, exclude_user_id=user.id)
            if conflict:
                return jsonify({
                    'error': f"Telefone já cadastrado para: {conflict['label']}. "
                             'Use um telefone único para este entregador.'
                }), 400
            user.phone = phone_override

        # Identidade: telefone do User (NÃO usar nome — nomes podem mentir)
        phone_norm = normalize_phone(user.phone)

        if not phone_norm:

            return jsonify({'error': 'Telefone é obrigatório para converter em entregador próprio. '
                                     'Informe o telefone no formulário de conversão.'}), 400

        # Desativar EstablishmentDriver ativos do MESMO telefone em OUTROS restaurantes
        for old in EstablishmentDriver.query.filter(
            EstablishmentDriver.is_active.is_(True),
            EstablishmentDriver.restaurant_id != restaurant.id
        ).all():
            if normalize_phone(old.phone) == phone_norm:
                old.is_active = False

        # Reutilizar EstablishmentDriver do mesmo telefone neste restaurante (ou criar)
        existing_od = find_own_driver_by_phone(user.phone, restaurant_id=restaurant.id)
        if existing_od:
            own_driver = existing_od
            own_driver.is_active = True
            own_driver.name = own_driver.name or f"{user.first_name} {user.last_name}"
            own_driver.phone = user.phone or own_driver.phone or ''
            own_driver.vehicle_type = driver.vehicle_type.value if driver.vehicle_type else own_driver.vehicle_type or 'MOTO'
            own_driver.vehicle_plate = driver.vehicle_plate or own_driver.vehicle_plate or ''
            own_driver.vehicle_model = driver.vehicle_model or own_driver.vehicle_model or ''
        else:
            own_driver = EstablishmentDriver(
                restaurant_id=restaurant.id,
                name=f"{user.first_name} {user.last_name}",
                phone=user.phone or '',
                vehicle_type=driver.vehicle_type.value if driver.vehicle_type else 'MOTO',
                vehicle_plate=driver.vehicle_plate or '',
                vehicle_model=driver.vehicle_model or '',
                is_active=True
            )
            db.session.add(own_driver)

        # PIN definido pelo admin na conversão
        own_driver.set_pin(pin)

        # Desativar o Driver da plataforma (soft delete)
        driver.is_online = False
        driver.converted_to_own = True

        # Marcar restaurante como tendo entregadores próprios
        restaurant.has_own_drivers = True

        db.session.commit()

        return jsonify({
            'message': f'Entregador convertido com sucesso para {restaurant.name}. PIN definido — entregador já pode logar no app de próprios.',
            'own_driver': own_driver.to_dict()
        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500


@admin_drivers_bp.route('/drivers/<int:driver_id>/convert-from-own', methods=['POST'])
@jwt_required()
@admin_required
def convert_own_to_platform(driver_id):
    """Converte um entregador próprio de volta para a plataforma"""
    try:
        driver = Driver.query.get(driver_id)
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404

        if not driver.converted_to_own:
            return jsonify({'error': 'Entregador já está na plataforma'}), 400

        data = request.get_json() or {}
        restaurant_id = data.get('restaurant_id')

        user = db.session.get(User, driver.user_id) if driver.user_id else None

        # Desativar EstablishmentDriver correspondente por TELEFONE (não por nome)
        phone_norm = normalize_phone(user.phone) if user else ''
        if restaurant_id and phone_norm:
            for est_driver in EstablishmentDriver.query.filter_by(
                restaurant_id=restaurant_id, is_active=True
            ).all():
                if normalize_phone(est_driver.phone) == phone_norm:
                    est_driver.is_active = False

            # Verificar se restaurante ainda tem outros entregadores próprios ativos
            remaining = EstablishmentDriver.query.filter_by(
                restaurant_id=restaurant_id, is_active=True
            ).count()
            if remaining == 0:
                restaurant = Restaurant.query.get(restaurant_id)
                if restaurant:
                    restaurant.has_own_drivers = False

        # Reativar na plataforma
        driver.converted_to_own = False

        db.session.commit()

        return jsonify({
            'message': 'Entregador reativado na plataforma com sucesso',
            'driver': driver.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_drivers_bp.route('/drivers/<int:driver_id>/status', methods=['PUT'])

@jwt_required()

@admin_required

def update_driver_status(driver_id):

    """Atualiza o status de um entregador (ativar/desativar/suspender)"""

    try:

        driver = Driver.query.get(driver_id)

        if not driver:

            return jsonify({'error': 'Entregador não encontrado'}), 404



        # Verificar tenant

        tenant_id = get_current_tenant_id()

        if tenant_id and driver.tenant_id and driver.tenant_id != tenant_id:

            return jsonify({'error': 'Entregador não encontrado'}), 404



        data = request.get_json()

        new_status = data.get('status')



        if new_status not in ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ONLINE', 'OFFLINE']:

            return jsonify({'error': 'Status inválido'}), 400



        from src.models.portal_models import UserStatus



        # Se for ONLINE/OFFLINE, altera o status online do entregador

        if new_status in ['ONLINE', 'OFFLINE']:

            driver.is_online = (new_status == 'ONLINE')

            driver.updated_at = datetime.now(timezone.utc)

            # Se ficar online, atualiza localização se fornecida

            if driver.is_online and data.get('latitude') and data.get('longitude'):

                driver.current_latitude = data['latitude']

                driver.current_longitude = data['longitude']

                driver.last_location_update = datetime.now(timezone.utc)

        else:

            # Se for ACTIVE/INACTIVE/SUSPENDED, altera o status da conta

            driver.user.status = UserStatus(new_status)

            driver.user.updated_at = datetime.now(timezone.utc)

            # Se suspender ou desativar, colocar offline

            if new_status in ['INACTIVE', 'SUSPENDED']:

                driver.is_online = False

                driver.updated_at = datetime.now(timezone.utc)



        # Atualizar tenant_id se fornecido

        if 'tenant_id' in data:

            driver.tenant_id = data['tenant_id'] if data['tenant_id'] else None

            driver.user.tenant_id = data['tenant_id'] if data['tenant_id'] else None



        db.session.commit()



        return jsonify({

            'message': f'Status do entregador atualizado para {new_status}',

            'driver': driver.to_dict()

        }), 200



    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500
