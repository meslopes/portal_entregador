from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from src.models.portal_models import (
    db, EstablishmentDriver, Order, OrderStatus, Delivery,
    OwnDriverEarning, Restaurant, Customer, User, UserType, UserStatus
)
from datetime import datetime, timedelta
from functools import wraps
import jwt
import os
import logging

logger = logging.getLogger(__name__)

own_driver_bp = Blueprint('own_driver', __name__, url_prefix='/api/own-driver')

# Secret key for own driver tokens (separate from main JWT)
OWN_DRIVER_SECRET = os.environ.get('OWN_DRIVER_SECRET', 'own-driver-secret-key-2024')


def create_own_driver_token(driver_id, restaurant_id):
    """Cria token JWT para entregador próprio"""
    payload = {
        'driver_id': driver_id,
        'restaurant_id': restaurant_id,
        'type': 'own_driver',
        'exp': datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, OWN_DRIVER_SECRET, algorithm='HS256')


def own_driver_required(f):
    """Decorator para proteger rotas do entregador próprio"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Token não fornecido'}), 401
        try:
            payload = jwt.decode(token, OWN_DRIVER_SECRET, algorithms=['HS256'])
            if payload.get('type') != 'own_driver':
                return jsonify({'error': 'Token inválido'}), 401
            driver = EstablishmentDriver.query.get(payload['driver_id'])
            if not driver or not driver.is_active:
                return jsonify({'error': 'Entregador não encontrado ou inativo'}), 401
            request.own_driver = driver
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expirado'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token inválido'}), 401
        return f(*args, **kwargs)
    return decorated


# ==================== AUTH ====================

@own_driver_bp.route('/login', methods=['POST'])
def login():
    """Login do entregador próprio com telefone + PIN"""
    data = request.get_json()
    phone = data.get('phone', '').strip()
    pin = data.get('pin', '').strip()

    if not phone or not pin:
        return jsonify({'error': 'Telefone e PIN são obrigatórios'}), 400

    # Normalizar telefone (remover caracteres especiais)
    phone_normalized = ''.join(filter(str.isdigit, phone))

    # Buscar entregador por telefone (normalização via Python para compatibilidade)
    all_drivers = EstablishmentDriver.query.filter_by(is_active=True).all()
    driver = None
    for d in all_drivers:
        if d.phone:
            d_phone_normalized = ''.join(filter(str.isdigit, d.phone))
            if d_phone_normalized == phone_normalized:
                driver = d
                break

    if not driver:
        return jsonify({'error': 'Telefone não cadastrado como entregador próprio'}), 404

    if not driver.is_active:
        return jsonify({'error': 'Entregador inativo. Entre em contato com o estabelecimento.'}), 403

    if not driver.check_pin(pin):
        return jsonify({'error': 'PIN incorreto'}), 401

    # Criar token
    token = create_own_driver_token(driver.id, driver.restaurant_id)

    return jsonify({
        'token': token,
        'driver': driver.to_dict(),
        'restaurant': {
            'id': driver.restaurant.id,
            'name': driver.restaurant.name
        }
    }), 200


@own_driver_bp.route('/register-pin', methods=['POST'])
@jwt_required()
def register_pin():
    """Registra ou atualiza PIN do entregador próprio (apenas admin/client)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Apenas administradores ou estabelecimentos podem definir PIN'}), 403

        data = request.get_json()
        phone = data.get('phone', '').strip()
        pin = data.get('pin', '').strip()
        restaurant_id = data.get('restaurant_id')

        if not phone or not pin or not restaurant_id:
            return jsonify({'error': 'Telefone, PIN e restaurante são obrigatórios'}), 400

        if len(pin) != 4 or not pin.isdigit():
            return jsonify({'error': 'PIN deve ter 4 dígitos numéricos'}), 400

        phone_normalized = ''.join(filter(str.isdigit, phone))
        restaurant_id = int(restaurant_id)

        # Buscar por phone normalizado (compatível com SQLite e PostgreSQL)
        drivers = EstablishmentDriver.query.filter_by(
            restaurant_id=restaurant_id
        ).all()

        driver = None
        for d in drivers:
            if d.phone:
                d_phone_normalized = ''.join(filter(str.isdigit, d.phone))
                if d_phone_normalized == phone_normalized:
                    driver = d
                    break

        if not driver:
            return jsonify({'error': 'Entregador não encontrado neste estabelecimento'}), 404

        driver.set_pin(pin)
        db.session.commit()

        return jsonify({'message': 'PIN registrado com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao registrar PIN: {str(e)}'}), 500


# ==================== STATUS ====================

@own_driver_bp.route('/status', methods=['PUT'])
@own_driver_required
def toggle_status():
    """Toggle online/offline do entregador próprio"""
    try:
        driver = request.own_driver
        data = request.get_json() or {}

        driver.is_online = not driver.is_online
        if 'latitude' in data:
            driver.current_latitude = data['latitude']
        if 'longitude' in data:
            driver.current_longitude = data['longitude']
        driver.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'is_online': driver.is_online,
            'message': 'Online' if driver.is_online else 'Offline'
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao alterar status: {e}")
        return jsonify({'error': f'Erro ao alterar status: {str(e)}'}), 500


@own_driver_bp.route('/location', methods=['POST'])
@own_driver_required
def update_location():
    """Atualiza localização do entregador"""
    driver = request.own_driver
    data = request.get_json()

    if not data or 'latitude' not in data or 'longitude' not in data:
        return jsonify({'error': 'Latitude e longitude são obrigatórios'}), 400

    driver.current_latitude = data['latitude']
    driver.current_longitude = data['longitude']
    driver.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify({'message': 'Localização atualizada'}), 200


# ==================== ORDERS ====================

@own_driver_bp.route('/orders', methods=['GET'])
@own_driver_required
def get_orders():
    """Lista pedidos do entregador próprio (ativos e recentes)"""
    driver = request.own_driver
    status = request.args.get('status', 'active')  # active, completed, all

    query = Order.query.filter(
        Order.establishment_driver_id == driver.id,
        Order.assigned_to_own_driver == True
    )

    if status == 'active':
        query = query.filter(Order.status.in_([
            OrderStatus.OFFERED, OrderStatus.ACCEPTED, OrderStatus.PREPARING,
            OrderStatus.READY, OrderStatus.PICKED_UP
        ]))
    elif status == 'completed':
        query = query.filter(Order.status == OrderStatus.DELIVERED)
        query = query.order_by(Order.delivery_time.desc())
    else:  # all
        query = query.filter(Order.status != OrderStatus.CANCELLED)

    orders = query.order_by(Order.created_at.desc()).limit(50).all()

    return jsonify({
        'orders': [_format_order_for_driver(o) for o in orders]
    }), 200


@own_driver_bp.route('/orders/<int:order_id>/accept', methods=['POST'])
@own_driver_required
def accept_order(order_id):
    """Entregador próprio aceita pedido oferecido"""
    try:
        driver = request.own_driver

        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404

        if order.establishment_driver_id != driver.id:
            return jsonify({'error': 'Este pedido não foi atribuído a você'}), 403

        if order.status != OrderStatus.OFFERED:
            return jsonify({'error': 'Pedido não está aguardando aceite'}), 400

        # Aceitar o pedido
        order.status = OrderStatus.ACCEPTED
        order.accepted_at = datetime.utcnow()
        order.updated_at = datetime.utcnow()

        # Criar registro de ganhos
        restaurant = order.restaurant
        if restaurant:
            payment_type = restaurant.own_driver_payment_type or 'PER_DELIVERY'
            delivery_fee = float(order.delivery_fee or 0)
            
            # Calcular distância
            km_total = 0
            if order.delivery_address and restaurant.latitude and order.delivery_address.latitude:
                from src.utils.geo import haversine_distance
                km_total = haversine_distance(
                    float(restaurant.latitude), float(restaurant.longitude),
                    float(order.delivery_address.latitude), float(order.delivery_address.longitude)
                )
            
            # Calcular ganhos baseado no tipo de pagamento
            earning_value = float(restaurant.own_driver_fixed_value or 5.00)
            if payment_type == 'PER_KM':
                earning_value = km_total * float(restaurant.own_driver_km_value or 1.50)
            elif payment_type == 'PERCENTAGE':
                earning_value = delivery_fee * (float(restaurant.own_driver_percentage or 70) / 100.0)
            elif payment_type == 'FIXED_PLUS_DELIVERY':
                earning_value = float(restaurant.own_driver_fixed_value or 5.00) + float(restaurant.own_driver_delivery_value or 3.00)
            elif payment_type == 'FIXED_UP_TO_PLUS_DELIVERY':
                from datetime import datetime as dt
                today_start = dt.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                deliveries_today = OwnDriverEarning.query.filter(
                    OwnDriverEarning.establishment_driver_id == driver.id,
                    OwnDriverEarning.created_at >= today_start
                ).count()
                max_deliveries = restaurant.own_driver_max_deliveries or 10
                if deliveries_today >= max_deliveries:
                    earning_value = float(restaurant.own_driver_delivery_value or 3.00)
                else:
                    earning_value = 0

            earning = OwnDriverEarning(
                restaurant_id=restaurant.id,
                establishment_driver_id=driver.id,
                order_id=order.id,
                delivery_fee=delivery_fee,
                driver_earning=earning_value,
                payment_type=payment_type,
                distance_km=km_total
            )
            db.session.add(earning)

        db.session.commit()

        return jsonify({
            'message': 'Pedido aceito',
            'order': _format_order_for_driver(order)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@own_driver_bp.route('/orders/<int:order_id>/reject', methods=['POST'])
@own_driver_required
def reject_order(order_id):
    """Entregador próprio rejeita pedido oferecido"""
    try:
        driver = request.own_driver

        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404

        if order.establishment_driver_id != driver.id:
            return jsonify({'error': 'Este pedido não foi atribuído a você'}), 403

        if order.status != OrderStatus.OFFERED:
            return jsonify({'error': 'Pedido não está aguardando aceite'}), 400

        # Limpar atribuição
        order.assigned_to_own_driver = False
        order.establishment_driver_id = None
        order.status = OrderStatus.PENDING
        order.updated_at = datetime.utcnow()

        db.session.commit()

        # Tentar próximo entregador próprio (em background)
        try:
            next_driver = find_nearest_own_driver(order, exclude_driver_id=driver.id)
            if next_driver:
                order.assigned_to_own_driver = True
                order.establishment_driver_id = next_driver.id
                order.status = OrderStatus.OFFERED
                order.offered_at = datetime.utcnow()
                order.offer_attempts = (order.offer_attempts or 0) + 1
                db.session.commit()
        except Exception as e:
            logger.error(f"Erro ao tentar próximo entregador: {e}")

        return jsonify({'message': 'Pedido rejeitado'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@own_driver_bp.route('/orders/<int:order_id>/status', methods=['PUT'])
@own_driver_required
def update_order_status(order_id):
    """Atualiza status do pedido (entregador próprio)"""
    driver = request.own_driver
    data = request.get_json() or {}

    order = Order.query.get(order_id)
    if not order:
        return jsonify({'error': 'Pedido não encontrado'}), 404

    if order.establishment_driver_id != driver.id:
        return jsonify({'error': 'Este pedido não foi atribuído a você'}), 403

    new_status = data.get('status')
    if not new_status:
        return jsonify({'error': 'Status é obrigatório'}), 400

    try:
        new_status_enum = OrderStatus(new_status)
    except ValueError:
        return jsonify({'error': 'Status inválido'}), 400

    # Transições válidas para entregador próprio
    valid_transitions = {
        OrderStatus.ACCEPTED: [OrderStatus.PICKED_UP, OrderStatus.PREPARING],
        OrderStatus.PREPARING: [OrderStatus.READY, OrderStatus.PICKED_UP],
        OrderStatus.READY: [OrderStatus.PICKED_UP],
        OrderStatus.PICKED_UP: [OrderStatus.DELIVERED]
    }

    if order.status not in valid_transitions or new_status_enum not in valid_transitions.get(order.status, []):
        return jsonify({'error': f'Transição inválida: {order.status.value} → {new_status}. Status atual: {order.status.value}'}), 400

    # Validação GPS para PICKED_UP e DELIVERED
    if new_status_enum in [OrderStatus.PICKED_UP, OrderStatus.DELIVERED]:
        lat = data.get('latitude')
        lng = data.get('longitude')

        if lat and lng:
            from src.utils.geo import haversine_distance
            from src.models.portal_models import SystemConfig

            if new_status_enum == OrderStatus.PICKED_UP:
                target_lat = float(order.restaurant.latitude) if order.restaurant else None
                target_lng = float(order.restaurant.longitude) if order.restaurant else None
                location_name = 'restaurante'
            else:
                target_lat = float(order.delivery_address.latitude) if order.delivery_address else None
                target_lng = float(order.delivery_address.longitude) if order.delivery_address else None
                location_name = 'endereço de entrega'

            if target_lat and target_lng:
                distance = haversine_distance(float(lat), float(lng), target_lat, target_lng)
                distance_meters = distance * 1000

                radius_config = SystemConfig.query.filter_by(config_key='gps_radius_meters').first()
                max_radius = int(radius_config.config_value) if radius_config else 500

                if distance_meters > max_radius:
                    return jsonify({
                        'error': f'Você está a {distance_meters:.0f}m do {location_name}. O máximo é {max_radius}m.',
                        'distance_meters': round(distance_meters),
                        'max_radius': max_radius
                    }), 400

    # Validação de código anti-fraude
    if new_status_enum == OrderStatus.PICKED_UP and order.pickup_code:
        provided_code = data.get('pickup_code')
        if not provided_code:
            return jsonify({'error': 'Código de coleta é obrigatório', 'code_required': 'pickup_code'}), 400
        if provided_code != order.pickup_code:
            return jsonify({'error': 'Código de coleta inválido'}), 400

    if new_status_enum == OrderStatus.DELIVERED and order.delivery_code:
        provided_code = data.get('delivery_code')
        if not provided_code:
            return jsonify({'error': 'Código de entrega é obrigatório', 'code_required': 'delivery_code'}), 400
        if provided_code != order.delivery_code:
            return jsonify({'error': 'Código de entrega inválido'}), 400

    # Atualizar status
    order.status = new_status_enum
    order.updated_at = datetime.utcnow()

    if new_status_enum == OrderStatus.PICKED_UP:
        order.pickup_time = datetime.utcnow()
        order.picked_up_at = datetime.utcnow()
    elif new_status_enum == OrderStatus.DELIVERED:
        order.delivery_time = datetime.utcnow()

        # Salvar prova de entrega se fornecida
        proof_data = data.get('proof_of_delivery')
        if proof_data and order.delivery:
            try:
                import base64
                uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'proofs')
                os.makedirs(uploads_dir, exist_ok=True)

                if ',' in proof_data:
                    proof_data = proof_data.split(',')[1]

                filename = f"proof_{order.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
                filepath = os.path.join(uploads_dir, filename)

                with open(filepath, 'wb') as f:
                    f.write(base64.b64decode(proof_data))

                order.delivery.proof_of_delivery_url = f"/uploads/proofs/{filename}"
            except Exception as e:
                logger.error(f"Erro ao salvar prova de entrega: {e}")

        # Incrementar entregas do entregador
        driver.total_deliveries = (driver.total_deliveries or 0) + 1
        driver.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify({
        'message': f'Status atualizado para {new_status_enum.value}',
        'order': _format_order_for_driver(order)
    }), 200


# ==================== STATS ====================

@own_driver_bp.route('/stats', methods=['GET'])
@own_driver_required
def get_stats():
    """Estatísticas do entregador próprio"""
    driver = request.own_driver
    period = request.args.get('period', 'month')

    from datetime import timedelta
    if period == 'week':
        start_date = datetime.utcnow() - timedelta(days=7)
    else:
        start_date = datetime.utcnow() - timedelta(days=30)

    # Pedidos no período
    orders = Order.query.filter(
        Order.establishment_driver_id == driver.id,
        Order.assigned_to_own_driver == True,
        Order.created_at >= start_date
    ).all()

    delivered = [o for o in orders if o.status == OrderStatus.DELIVERED]
    active = [o for o in orders if o.status in [
        OrderStatus.ACCEPTED, OrderStatus.PREPARING,
        OrderStatus.READY, OrderStatus.PICKED_UP
    ]]

    # Ganhos no período
    earnings = OwnDriverEarning.query.filter(
        OwnDriverEarning.establishment_driver_id == driver.id,
        OwnDriverEarning.created_at >= start_date
    ).all()
    total_earning = sum(float(e.driver_earning) for e in earnings)
    total_paid = sum(float(e.driver_earning) for e in earnings if e.is_paid)

    # Tempo médio de entrega
    delivery_times = []
    for o in delivered:
        if o.accepted_at and o.delivery_time:
            diff = (o.delivery_time - o.accepted_at).total_seconds() / 60
            delivery_times.append(diff)

    avg_time = sum(delivery_times) / len(delivery_times) if delivery_times else 0

    return jsonify({
        'driver': driver.to_dict(),
        'period': period,
        'stats': {
            'total_deliveries': len(delivered),
            'active_orders': len(active),
            'total_earning': total_earning,
            'total_paid': total_paid,
            'pending_payment': total_earning - total_paid,
            'avg_delivery_time': round(avg_time, 1),
            'rating': float(driver.rating) if driver.rating else 5.0
        }
    }), 200


@own_driver_bp.route('/earnings', methods=['GET'])
@own_driver_required
def get_earnings():
    """Histórico de ganhos do entregador próprio"""
    driver = request.own_driver
    period = request.args.get('period', 'month')

    from datetime import timedelta
    if period == 'day':
        start_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == 'week':
        start_date = datetime.utcnow() - timedelta(days=7)
    else:
        start_date = datetime.utcnow() - timedelta(days=30)

    earnings = OwnDriverEarning.query.filter(
        OwnDriverEarning.establishment_driver_id == driver.id,
        OwnDriverEarning.created_at >= start_date
    ).order_by(OwnDriverEarning.created_at.desc()).all()

    total = sum(float(e.driver_earning) for e in earnings)
    total_paid = sum(float(e.driver_earning) for e in earnings if e.is_paid)

    return jsonify({
        'earnings': [e.to_dict() for e in earnings],
        'summary': {
            'total': total,
            'total_paid': total_paid,
            'pending': total - total_paid,
            'count': len(earnings)
        }
    }), 200


# ==================== HELPERS ====================

def _format_order_for_driver(order):
    """Formata dados do pedido para o entregador"""
    from src.models.portal_models import Address

    result = {
        'id': order.id,
        'order_number': order.order_number,
        'status': order.status.value,
        'pickup_code': order.pickup_code,
        'delivery_code': order.delivery_code,
        'delivery_fee': float(order.delivery_fee or 0),
        'created_at': order.created_at.isoformat() if order.created_at else None,
        'accepted_at': order.accepted_at.isoformat() if order.accepted_at else None,
        'pickup_time': order.pickup_time.isoformat() if order.pickup_time else None,
        'delivery_time': order.delivery_time.isoformat() if order.delivery_time else None,
        'special_instructions': order.special_instructions,
    }

    # Restaurante (coleta)
    if order.restaurant:
        result['restaurant'] = {
            'name': order.restaurant.name,
            'address': order.restaurant.address,
            'latitude': float(order.restaurant.latitude) if order.restaurant.latitude else None,
            'longitude': float(order.restaurant.longitude) if order.restaurant.longitude else None,
            'phone': order.restaurant.phone
        }

    # Endereço de entrega
    if order.delivery_address:
        result['delivery_address'] = {
            'street': order.delivery_address.street,
            'neighborhood': order.delivery_address.neighborhood,
            'city': order.delivery_address.city,
            'state': order.delivery_address.state,
            'latitude': float(order.delivery_address.latitude) if order.delivery_address.latitude else None,
            'longitude': float(order.delivery_address.longitude) if order.delivery_address.longitude else None,
        }

    # Cliente
    if order.customer:
        result['customer'] = {
            'name': order.customer.name,
            'phone': order.customer.phone
        }

    # Itens
    result['items'] = order.items

    # Prova de entrega
    if order.delivery and order.delivery.proof_of_delivery_url:
        result['proof_of_delivery_url'] = order.delivery.proof_of_delivery_url

    return result
