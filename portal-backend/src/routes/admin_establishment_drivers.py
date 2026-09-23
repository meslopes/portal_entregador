"""
Rotas administrativas - Entregadores de Estabelecimento.
Extraído de admin.py para melhor organização.
Inclui: CRUD de entregadores próprios, configuração de pagamento, métricas.
"""
import contextlib
import logging
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import or_

from src.models.portal_models import (
    Customer,
    Delivery,
    Driver,
    EstablishmentDriver,
    Order,
    OrderStatus,
    OwnDriverEarning,
    OwnDriverRoute,
    Restaurant,
    User,
    UserType,
    db,
)
from src.utils.restaurant import find_restaurant_by_name
from src.utils.tenant import get_current_user

admin_est_drivers_bp = Blueprint('admin_est_drivers', __name__)
logger = logging.getLogger(__name__)


def admin_required(f):
    from functools import wraps

    from flask_jwt_extended import get_jwt_identity
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type != UserType.ADMIN:
            return jsonify({'error': 'Acesso restrito a administradores'}), 403
        return f(*args, **kwargs)
    return decorated_function


def client_or_admin_required(f):
    from functools import wraps

    from flask_jwt_extended import get_jwt_identity
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Acesso restrito'}), 403
        return f(*args, **kwargs)
    return decorated_function


def get_square_filter():
    return request.args.get('square_id', type=int)


@admin_est_drivers_bp.route('/establishment-drivers', methods=['GET'])

@jwt_required()

@client_or_admin_required

def list_establishment_drivers():

    """Lista entregadores próprios de um estabelecimento"""

    try:

        restaurant_id = request.args.get('restaurant_id')

        if not restaurant_id:

            return jsonify({'error': 'restaurant_id é obrigatório'}), 400

        # Verificação de ownership: CLIENT só pode ver drivers do seu próprio restaurante
        current_user = get_current_user()
        if current_user and current_user.user_type == UserType.CLIENT:

            customer = Customer.query.filter_by(user_id=current_user.id).first()
            if customer:
                user_restaurant = find_restaurant_by_name(customer.name)
                if user_restaurant and int(restaurant_id) != user_restaurant.id:
                    return jsonify({'error': 'Acesso negado: você só pode ver entregadores do seu próprio estabelecimento'}), 403

        drivers = EstablishmentDriver.query.filter_by(

            restaurant_id=int(restaurant_id),

            is_active=True

        ).all()



        return jsonify({'drivers': [d.to_dict() for d in drivers]}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500


@admin_est_drivers_bp.route('/establishment/orders', methods=['GET'])
@jwt_required()
@client_or_admin_required
def get_establishment_orders():
    """Lista pedidos do estabelecimento (para CLIENT e ADMIN)"""
    try:
        restaurant_id = request.args.get('restaurant_id')
        status_filter = request.args.get('status', '')

        if not restaurant_id:
            return jsonify({'error': 'restaurant_id é obrigatório'}), 400

        query = Order.query.filter_by(restaurant_id=int(restaurant_id))

        # Filtrar por status se fornecido
        if status_filter:
            statuses = [s.strip().upper() for s in status_filter.split(',')]
            status_enums = []
            for s in statuses:
                with contextlib.suppress(KeyError):
                    status_enums.append(OrderStatus[s])
            if status_enums:
                query = query.filter(Order.status.in_(status_enums))

        # Excluir pedidos que já estão em rotas ativas (CREATED, PENDING, ACTIVE)
        # Incluir pedidos sem rota (NULL) OU com rota não ativa
        active_route_ids = db.session.query(OwnDriverRoute.id).filter(
            OwnDriverRoute.status.in_(['CREATED', 'PENDING', 'ACTIVE'])
        )
        query = query.filter(
            or_(
                Order.own_driver_route_id.is_(None),
                ~Order.own_driver_route_id.in_(active_route_ids)
            )
        )

        orders = query.order_by(Order.created_at.desc()).limit(100).all()

        # Carregar relacionamentos
        result = []
        for order in orders:
            order_dict = order.to_dict()
            # Adicionar informações do cliente
            if order.customer:
                order_dict['customer'] = {
                    'id': order.customer.id,
                    'name': order.customer.name,
                    'phone': order.customer.phone
                }
            # Adicionar endereço de entrega
            if order.delivery_address:
                order_dict['delivery_address'] = {
                    'street': order.delivery_address.street,
                    'neighborhood': order.delivery_address.neighborhood,
                    'city': order.delivery_address.city,
                    'state': order.delivery_address.state,
                    'latitude': float(order.delivery_address.latitude) if order.delivery_address.latitude else None,
                    'longitude': float(order.delivery_address.longitude) if order.delivery_address.longitude else None
                }
            # Adicionar informações do entregador da plataforma
            if order.driver_id:
                driver = Driver.query.get(order.driver_id)
                if driver:
                    order_dict['driver'] = {
                        'id': driver.id,
                        'name': f"{driver.user.first_name} {driver.user.last_name}" if driver.user else 'N/A',
                        'phone': driver.user.phone if driver.user else None
                    }
            result.append(order_dict)

        return jsonify({
            'orders': result,
            'total': len(result)
        }), 200

    except Exception as e:
        logger.error(f"Erro ao listar pedidos do estabelecimento: {e}")
        return jsonify({'error': str(e)}), 500


@admin_est_drivers_bp.route('/establishment-drivers', methods=['POST'])

@jwt_required()

@client_or_admin_required

def create_establishment_driver():

    """Cadastra entregador próprio para um estabelecimento"""

    try:

        data = request.get_json()

        if not data or not data.get('restaurant_id') or not data.get('name'):

            return jsonify({'error': 'Estabelecimento e nome são obrigatórios'}), 400

        # Verificação de ownership: CLIENT só pode criar drivers no seu próprio restaurante
        current_user = get_current_user()
        if current_user and current_user.user_type == UserType.CLIENT:

            customer = Customer.query.filter_by(user_id=current_user.id).first()
            if customer:
                user_restaurant = find_restaurant_by_name(customer.name)
                if user_restaurant and int(data['restaurant_id']) != user_restaurant.id:
                    return jsonify({'error': 'Acesso negado: você só pode cadastrar entregadores no seu próprio estabelecimento'}), 403

        driver = EstablishmentDriver(

            restaurant_id=data['restaurant_id'],

            name=data['name'],

            phone=data.get('phone'),

            vehicle_type=data.get('vehicle_type', 'MOTO'),

            vehicle_plate=data.get('vehicle_plate'),

            vehicle_model=data.get('vehicle_model'),

            payment_frequency=data.get('payment_frequency', 'WEEKLY'),

            is_active=True

        )

        db.session.add(driver)



        # Marcar estabelecimento como tendo entregadores próprios

        restaurant = Restaurant.query.get(data['restaurant_id'])

        if restaurant:

            restaurant.has_own_drivers = True



        db.session.commit()



        return jsonify({

            'message': 'Entregador cadastrado com sucesso',

            'driver': driver.to_dict()

        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_est_drivers_bp.route('/establishment-drivers/<int:driver_id>', methods=['PUT'])

@jwt_required()

@client_or_admin_required

def update_establishment_driver(driver_id):

    """Atualiza entregador próprio"""

    try:

        driver = EstablishmentDriver.query.get(driver_id)

        if not driver:

            return jsonify({'error': 'Entregador não encontrado'}), 404

        # Verificação de ownership: CLIENT só pode editar drivers do seu próprio restaurante
        current_user = get_current_user()
        if current_user and current_user.user_type == UserType.CLIENT:

            customer = Customer.query.filter_by(user_id=current_user.id).first()
            if customer:
                user_restaurant = find_restaurant_by_name(customer.name)
                if user_restaurant and driver.restaurant_id != user_restaurant.id:
                    return jsonify({'error': 'Acesso negado: você só pode editar entregadores do seu próprio estabelecimento'}), 403

        data = request.get_json()

        if 'name' in data:

            driver.name = data['name']

        if 'phone' in data:

            driver.phone = data['phone']

        if 'vehicle_type' in data:

            # Mapear valores legados e normalizar
            vt = data['vehicle_type'].upper().strip()
            vehicle_map = {'MOTO': 'MOTORCYCLE', 'MOTORCYCLE': 'MOTORCYCLE', 'CAR': 'CAR', 'BICYCLE': 'BICYCLE', 'BIKE': 'BICYCLE', 'FOOT': 'FOOT'}
            vt = vehicle_map.get(vt, vt)
            if vt not in ('CAR', 'MOTORCYCLE', 'BICYCLE', 'FOOT'):
                return jsonify({'error': 'Tipo de veículo inválido'}), 400
            driver.vehicle_type = vt

        if 'vehicle_plate' in data:

            driver.vehicle_plate = data['vehicle_plate']

        if 'vehicle_model' in data:

            driver.vehicle_model = data['vehicle_model']

        if 'payment_frequency' in data:

            driver.payment_frequency = data['payment_frequency']

        if 'is_active' in data:

            driver.is_active = data['is_active']



        db.session.commit()



        return jsonify({

            'message': 'Entregador atualizado',

            'driver': driver.to_dict()

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_est_drivers_bp.route('/establishment-drivers/<int:driver_id>', methods=['DELETE'])

@jwt_required()

@client_or_admin_required

def delete_establishment_driver(driver_id):

    """Remove entregador próprio"""

    try:

        driver = EstablishmentDriver.query.get(driver_id)

        if not driver:

            return jsonify({'error': 'Entregador não encontrado'}), 404

        # Verificação de ownership: CLIENT só pode deletar drivers do seu próprio restaurante
        current_user = get_current_user()
        if current_user and current_user.user_type == UserType.CLIENT:

            customer = Customer.query.filter_by(user_id=current_user.id).first()
            if customer:
                user_restaurant = find_restaurant_by_name(customer.name)
                if user_restaurant and driver.restaurant_id != user_restaurant.id:
                    return jsonify({'error': 'Acesso negado: você só pode remover entregadores do seu próprio estabelecimento'}), 403

        driver.is_active = False

        db.session.commit()



        return jsonify({'message': 'Entregador removido'}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_est_drivers_bp.route('/establishment-drivers/<int:driver_id>/toggle-online', methods=['PUT'])

@jwt_required()

@client_or_admin_required

def toggle_establishment_driver_online(driver_id):

    """Ativa/desativa status online do entregador próprio"""

    try:

        driver = EstablishmentDriver.query.get(driver_id)

        if not driver:

            return jsonify({'error': 'Entregador não encontrado'}), 404



        data = request.get_json() or {}

        driver.is_online = data.get('is_online', not driver.is_online)



        if 'latitude' in data:

            driver.current_latitude = data['latitude']

        if 'longitude' in data:

            driver.current_longitude = data['longitude']



        db.session.commit()



        return jsonify({

            'message': f'Entregador {"online" if driver.is_online else "offline"}',

            'driver': driver.to_dict()

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500
@admin_est_drivers_bp.route('/establishment-drivers/payment-config', methods=['GET'])

@jwt_required()

@client_or_admin_required

def get_payment_config():

    """Obtém configuração de pagamento do estabelecimento"""

    try:

        user_id = int(get_jwt_identity())

        user = User.query.get(user_id)



        # Buscar restaurante

        if user.user_type == UserType.CLIENT:

            customer = Customer.query.filter_by(user_id=user.id).first()

            if not customer:

                return jsonify({'error': 'Cliente não encontrado'}), 404

            restaurant = find_restaurant_by_name(customer.name)

        else:

            restaurant_id = request.args.get('restaurant_id')

            restaurant = Restaurant.query.get(restaurant_id) if restaurant_id else None



        if not restaurant:

            return jsonify({'error': 'Restaurante não encontrado'}), 404



        return jsonify({

            'payment_type': restaurant.own_driver_payment_type or 'PER_DELIVERY',

            'fixed_value': float(restaurant.own_driver_fixed_value) if restaurant.own_driver_fixed_value else 5.00,

            'km_value': float(restaurant.own_driver_km_value) if restaurant.own_driver_km_value else 1.50,

            'percentage': float(restaurant.own_driver_percentage) if restaurant.own_driver_percentage else 70.0,

            'delivery_value': float(restaurant.own_driver_delivery_value) if restaurant.own_driver_delivery_value else 3.00,

            'max_deliveries': restaurant.own_driver_max_deliveries or 10

        }), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_est_drivers_bp.route('/establishment-drivers/payment-config', methods=['PUT'])

@jwt_required()

@client_or_admin_required

def update_payment_config():

    """Atualiza configuração de pagamento do estabelecimento"""

    try:

        user_id = int(get_jwt_identity())

        user = User.query.get(user_id)



        # Buscar restaurante

        if user.user_type == UserType.CLIENT:

            customer = Customer.query.filter_by(user_id=user.id).first()

            if not customer:

                return jsonify({'error': 'Cliente não encontrado'}), 404

            restaurant = find_restaurant_by_name(customer.name)

        else:

            data = request.get_json()

            restaurant_id = data.get('restaurant_id')

            restaurant = Restaurant.query.get(restaurant_id) if restaurant_id else None



        if not restaurant:

            return jsonify({'error': 'Restaurante não encontrado'}), 404



        data = request.get_json()

        if 'payment_type' in data:

            restaurant.own_driver_payment_type = data['payment_type']

        if 'fixed_value' in data:

            restaurant.own_driver_fixed_value = data['fixed_value']

        if 'km_value' in data:

            restaurant.own_driver_km_value = data['km_value']

        if 'percentage' in data:

            restaurant.own_driver_percentage = data['percentage']

        if 'delivery_value' in data:

            restaurant.own_driver_delivery_value = data['delivery_value']

        if 'max_deliveries' in data:

            restaurant.own_driver_max_deliveries = data['max_deliveries']



        db.session.commit()



        return jsonify({

            'message': 'Configuração atualizada',

            'payment_type': restaurant.own_driver_payment_type,

            'fixed_value': float(restaurant.own_driver_fixed_value) if restaurant.own_driver_fixed_value else 5.00,

            'km_value': float(restaurant.own_driver_km_value) if restaurant.own_driver_km_value else 1.50,

            'percentage': float(restaurant.own_driver_percentage) if restaurant.own_driver_percentage else 70.0,

            'delivery_value': float(restaurant.own_driver_delivery_value) if restaurant.own_driver_delivery_value else 3.00,

            'max_deliveries': restaurant.own_driver_max_deliveries or 10

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





# ============================================

# GANHOS DE ENTREGADORES PRÓPRIOS

# ============================================



@admin_est_drivers_bp.route('/establishment-drivers/earnings', methods=['GET'])

@jwt_required()

@client_or_admin_required

def get_own_driver_earnings():

    """Obtém ganhos dos entregadores próprios"""

    try:

        user_id = int(get_jwt_identity())

        user = User.query.get(user_id)



        # Buscar restaurante

        if user.user_type == UserType.CLIENT:

            customer = Customer.query.filter_by(user_id=user.id).first()

            if not customer:

                return jsonify({'error': 'Cliente não encontrado'}), 404

            restaurant = find_restaurant_by_name(customer.name)

        else:

            restaurant_id = request.args.get('restaurant_id')

            restaurant = Restaurant.query.get(restaurant_id) if restaurant_id else None



        if not restaurant:

            return jsonify({'error': 'Restaurante não encontrado'}), 404



        # Parâmetros de filtro

        period = request.args.get('period', 'week')  # week, month, all

        driver_id = request.args.get('driver_id')

        is_paid = request.args.get('is_paid')



        query = OwnDriverEarning.query.filter_by(restaurant_id=restaurant.id)



        # Filtro por período

        if period == 'week':

            from datetime import timedelta

            week_ago = datetime.now(timezone.utc) - timedelta(days=7)

            query = query.filter(OwnDriverEarning.created_at >= week_ago)

        elif period == 'month':

            from datetime import timedelta

            month_ago = datetime.now(timezone.utc) - timedelta(days=30)

            query = query.filter(OwnDriverEarning.created_at >= month_ago)



        # Filtro por entregador

        if driver_id:

            query = query.filter_by(establishment_driver_id=int(driver_id))



        # Filtro por status de pagamento

        if is_paid is not None:

            query = query.filter_by(is_paid=is_paid.lower() == 'true')



        earnings = query.order_by(OwnDriverEarning.created_at.desc()).all()



        # Calcular totais

        total_earning = sum(float(e.driver_earning) for e in earnings)

        total_delivery_fee = sum(float(e.delivery_fee) for e in earnings)

        total_paid = sum(float(e.driver_earning) for e in earnings if e.is_paid)

        total_pending = total_earning - total_paid



        return jsonify({

            'earnings': [e.to_dict() for e in earnings],

            'summary': {

                'total_earning': total_earning,

                'total_delivery_fee': total_delivery_fee,

                'total_paid': total_paid,

                'total_pending': total_pending,

                'count': len(earnings)

            }

        }), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_est_drivers_bp.route('/establishment-drivers/earnings/<int:earning_id>/pay', methods=['POST'])

@jwt_required()

@client_or_admin_required

def mark_earning_paid(earning_id):

    """Marca um ganho como pago"""

    try:

        earning = OwnDriverEarning.query.get(earning_id)

        if not earning:

            return jsonify({'error': 'Ganho não encontrado'}), 404



        data = request.get_json() or {}

        earning.is_paid = True

        earning.paid_at = datetime.now(timezone.utc)

        earning.payment_method = data.get('payment_method', 'PIX')



        db.session.commit()



        return jsonify({

            'message': 'Pagamento registrado',

            'earning': earning.to_dict()

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_est_drivers_bp.route('/establishment-drivers/earnings/pay-all', methods=['POST'])

@jwt_required()

@client_or_admin_required

def pay_all_earnings():

    """Marca todos os ganhos pendentes de um entregador como pagos"""

    try:

        data = request.get_json()

        driver_id = data.get('driver_id')

        if not driver_id:

            return jsonify({'error': 'ID do entregador é obrigatório'}), 400



        user_id = int(get_jwt_identity())

        user = User.query.get(user_id)



        # Buscar restaurante

        if user.user_type == UserType.CLIENT:

            customer = Customer.query.filter_by(user_id=user.id).first()

            if not customer:

                return jsonify({'error': 'Cliente não encontrado'}), 404

            restaurant = find_restaurant_by_name(customer.name)

        else:

            restaurant_id = data.get('restaurant_id')

            restaurant = Restaurant.query.get(restaurant_id) if restaurant_id else None



        if not restaurant:

            return jsonify({'error': 'Restaurante não encontrado'}), 404



        # Buscar ganhos pendentes

        pending_earnings = OwnDriverEarning.query.filter_by(

            restaurant_id=restaurant.id,

            establishment_driver_id=int(driver_id),

            is_paid=False

        ).all()



        for earning in pending_earnings:

            earning.is_paid = True

            earning.paid_at = datetime.now(timezone.utc)

            earning.payment_method = data.get('payment_method', 'PIX')



        db.session.commit()



        total_paid = sum(float(e.driver_earning) for e in pending_earnings)



        return jsonify({

            'message': f'{len(pending_earnings)} pagamentos registrados',

            'total_paid': total_paid,

            'count': len(pending_earnings)

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_est_drivers_bp.route('/establishment-drivers/earnings/comparison', methods=['GET'])

@jwt_required()

@client_or_admin_required

def get_cost_comparison():

    """Compara custo de entregadores próprios vs plataforma"""

    try:

        user_id = int(get_jwt_identity())

        user = User.query.get(user_id)



        # Buscar restaurante

        if user.user_type == UserType.CLIENT:

            customer = Customer.query.filter_by(user_id=user.id).first()

            if not customer:

                return jsonify({'error': 'Cliente não encontrado'}), 404

            restaurant = find_restaurant_by_name(customer.name)

        else:

            restaurant_id = request.args.get('restaurant_id')

            restaurant = Restaurant.query.get(restaurant_id) if restaurant_id else None



        if not restaurant:

            return jsonify({'error': 'Restaurante não encontrado'}), 404



        # Parâmetros

        period = request.args.get('period', 'month')  # week, month

        from datetime import timedelta



        if period == 'week':

            start_date = datetime.now(timezone.utc) - timedelta(days=7)

        else:

            start_date = datetime.now(timezone.utc) - timedelta(days=30)



        # Entregas próprias

        own_orders = Order.query.filter(

            Order.restaurant_id == restaurant.id,

            Order.assigned_to_own_driver,

            Order.status == OrderStatus.DELIVERED,

            Order.created_at >= start_date

        ).all()



        # Entregas da plataforma

        platform_orders = Order.query.filter(

            Order.restaurant_id == restaurant.id,

            not Order.assigned_to_own_driver,

            Order.called_platform,

            Order.status == OrderStatus.DELIVERED,

            Order.created_at >= start_date

        ).all()



        # Cálculos

        own_count = len(own_orders)

        own_total_fee = sum(float(o.delivery_fee or 0) for o in own_orders)

        own_total_earning = sum(float(e.driver_earning) for e in

            OwnDriverEarning.query.filter(

                OwnDriverEarning.restaurant_id == restaurant.id,

                OwnDriverEarning.created_at >= start_date

            ).all())



        platform_count = len(platform_orders)

        platform_total_fee = sum(float(o.delivery_fee or 0) for o in platform_orders)



        # Economia (se tivesse usado plataforma para as próprias)

        platform_avg_fee = platform_total_fee / platform_count if platform_count > 0 else 0

        estimated_platform_cost = own_count * platform_avg_fee

        savings = estimated_platform_cost - own_total_earning if estimated_platform_cost > 0 else 0



        return jsonify({

            'period': period,

            'own_drivers': {

                'deliveries': own_count,

                'total_delivery_fee': own_total_fee,

                'total_earning': own_total_earning,

                'avg_cost_per_delivery': own_total_earning / own_count if own_count > 0 else 0

            },

            'platform': {

                'deliveries': platform_count,

                'total_delivery_fee': platform_total_fee,

                'avg_cost_per_delivery': platform_avg_fee

            },

            'savings': {

                'estimated_savings': savings,

                'savings_percentage': (savings / estimated_platform_cost * 100) if estimated_platform_cost > 0 else 0

            }

        }), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_est_drivers_bp.route('/establishment-drivers/metrics', methods=['GET'])

@client_or_admin_required

def get_own_driver_metrics():

    """Retorna métricas de desempenho dos entregadores próprios"""

    try:

        user_id = int(get_jwt_identity())

        user = User.query.get(user_id)



        # Buscar restaurante

        if user.user_type == UserType.CLIENT:

            customer = Customer.query.filter_by(user_id=user.id).first()

            if not customer:

                return jsonify({'error': 'Cliente não encontrado'}), 404

            restaurant = find_restaurant_by_name(customer.name)

        else:

            restaurant_id = request.args.get('restaurant_id')

            restaurant = Restaurant.query.get(restaurant_id) if restaurant_id else None



        if not restaurant:

            return jsonify({'error': 'Restaurante não encontrado'}), 404



        # Parâmetros

        period = request.args.get('period', 'month')

        driver_id = request.args.get('driver_id')

        from datetime import timedelta



        if period == 'week':

            start_date = datetime.now(timezone.utc) - timedelta(days=7)

        else:

            start_date = datetime.now(timezone.utc) - timedelta(days=30)



        # Buscar entregadores próprios

        drivers_query = EstablishmentDriver.query.filter_by(

            restaurant_id=restaurant.id, is_active=True

        )

        if driver_id:

            drivers_query = drivers_query.filter_by(id=int(driver_id))

        drivers = drivers_query.all()



        metrics = []

        for driver in drivers:

            # Pedidos atribuídos no período

            orders = Order.query.filter(

                Order.establishment_driver_id == driver.id,

                Order.created_at >= start_date

            ).all()



            delivered = [o for o in orders if o.status == OrderStatus.DELIVERED]

            cancelled = [o for o in orders if o.status == OrderStatus.CANCELLED]

            total = len(orders)



            # Tempos de entrega (accepted -> delivered)

            delivery_times = []

            for o in delivered:

                if o.accepted_at and o.delivery_time:

                    diff = (o.delivery_time - o.accepted_at).total_seconds() / 60

                    delivery_times.append(diff)



            avg_delivery_time = sum(delivery_times) / len(delivery_times) if delivery_times else 0



            # Ganhos no período

            earnings = OwnDriverEarning.query.filter(

                OwnDriverEarning.establishment_driver_id == driver.id,

                OwnDriverEarning.created_at >= start_date

            ).all()

            total_earning = sum(float(e.driver_earning) for e in earnings)

            total_paid = sum(float(e.driver_earning) for e in earnings if e.is_paid)

            total_pending = total_earning - total_paid



            # Avaliações

            Delivery.customer_rating.join(Order).filter(

                Order.establishment_driver_id == driver.id,

                Delivery.customer_rating.isnot(None),

                Order.created_at >= start_date

            ).all() if False else []  # Fallback simples



            metrics.append({

                'driver': driver.to_dict(),

                'period': period,

                'orders': {

                    'total': total,

                    'delivered': len(delivered),

                    'cancelled': len(cancelled),

                    'acceptance_rate': round((len(delivered) / total * 100) if total > 0 else 0, 1)

                },

                'delivery_time': {

                    'avg_minutes': round(avg_delivery_time, 1),

                    'min_minutes': round(min(delivery_times), 1) if delivery_times else 0,

                    'max_minutes': round(max(delivery_times), 1) if delivery_times else 0

                },

                'financial': {

                    'total_earning': total_earning,

                    'total_paid': total_paid,

                    'total_pending': total_pending,

                    'avg_per_delivery': round(total_earning / len(delivered), 2) if delivered else 0

                },

                'rating': {

                    'average': float(driver.rating) if driver.rating else 5.0,

                    'total_ratings': driver.total_ratings or 0

                }

            })



        # Resumo geral

        total_deliveries = sum(m['orders']['delivered'] for m in metrics)

        total_earning_all = sum(m['financial']['total_earning'] for m in metrics)

        avg_time_all = sum(m['delivery_time']['avg_minutes'] for m in metrics) / len(metrics) if metrics else 0



        return jsonify({

            'drivers': metrics,

            'summary': {

                'total_drivers': len(drivers),

                'total_deliveries': total_deliveries,

                'total_earning': total_earning_all,

                'avg_delivery_time': round(avg_time_all, 1)

            }

        }), 200



    except Exception as e:

        return jsonify({'error': str(e)}), 500


# ============================================
# ENDPOINT TEMPORARIO: LIMPEZA DE CLIENTS/DRIVERS
# ============================================
