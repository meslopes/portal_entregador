"""Rotas de pedido: área do usuário (meus pedidos, rastreio e avaliação).

Extraído de order.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
"""
import logging
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func

from src.models.portal_models import (
    Customer,
    Delivery,
    Notification,
    NotificationType,
    Order,
    OrderStatus,
    Restaurant,
    User,
    UserType,
    db,
)

logger = logging.getLogger(__name__)

order_my_bp = Blueprint('order_my', __name__)


@order_my_bp.route('/track/<string:tracking_token>', methods=['GET'])
def track_order(tracking_token):
    """Endpoint público para rastreamento de pedido (sem autenticação)"""
    try:
        order = Order.query.filter_by(tracking_token=tracking_token).first()
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404

        # Dados básicos do pedido (sem informações sensíveis)
        tracking_data = {
            'order_number': order.order_number,
            'status': order.status.value,
            'created_at': order.created_at.isoformat(),
            'restaurant_name': order.restaurant.name if order.restaurant else 'N/A',
            'neighborhood': order.delivery_address.neighborhood if order.delivery_address else 'N/A',
        }

        # Status timeline
        status_timeline = []
        if order.created_at:
            status_timeline.append({'status': 'SCHEDULED', 'time': order.created_at.isoformat(), 'label': 'Pedido criado'})
        if order.status in [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.PICKED_UP, OrderStatus.DELIVERED]:
            status_timeline.append({'status': 'PENDING', 'time': order.updated_at.isoformat(), 'label': 'Aguardando entregador'})
        if order.status in [OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.PICKED_UP, OrderStatus.DELIVERED]:
            status_timeline.append({'status': 'ACCEPTED', 'time': order.updated_at.isoformat(), 'label': 'Aceito por entregador'})
        if order.status in [OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.PICKED_UP, OrderStatus.DELIVERED]:
            status_timeline.append({'status': 'PREPARING', 'time': order.updated_at.isoformat(), 'label': 'Em preparo'})
        if order.status in [OrderStatus.READY, OrderStatus.PICKED_UP, OrderStatus.DELIVERED]:
            status_timeline.append({'status': 'READY', 'time': order.updated_at.isoformat(), 'label': 'Pronto para coleta'})
        if order.status in [OrderStatus.PICKED_UP, OrderStatus.DELIVERED]:
            status_timeline.append({'status': 'PICKED_UP', 'time': order.pickup_time.isoformat() if order.pickup_time else order.updated_at.isoformat(), 'label': 'Coletado'})
        if order.status == OrderStatus.DELIVERED:
            status_timeline.append({'status': 'DELIVERED', 'time': order.delivery_time.isoformat() if order.delivery_time else order.updated_at.isoformat(), 'label': 'Entregue'})

        tracking_data['timeline'] = status_timeline

        # Localização do entregador (se disponível e pedido foi aceito)
        if order.driver and order.driver.current_latitude and order.driver.current_longitude:
            if order.status in [OrderStatus.PICKED_UP, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY]:
                driver_name = 'Entregador'
                if order.driver.user:
                    first = order.driver.user.first_name or ''
                    last = order.driver.user.last_name or ''
                    driver_name = f"{first} {last[0]}." if last else first
                tracking_data['driver_location'] = {
                    'latitude': float(order.driver.current_latitude),
                    'longitude': float(order.driver.current_longitude),
                    'name': driver_name,
                    'vehicle_type': order.driver.vehicle_type.value if order.driver.vehicle_type else None
                }

        # Endereço de entrega (sem coordenadas exatas por privacidade)
        if order.delivery_address:
            tracking_data['delivery_neighborhood'] = order.delivery_address.neighborhood

        # Estimativa de tempo (se disponível)
        if order.estimated_delivery_time:
            tracking_data['estimated_delivery_time'] = order.estimated_delivery_time.isoformat()

        return jsonify(tracking_data), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# ROTAS DO ESTABELECIMENTO
# ============================================

@order_my_bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_orders():
    """Obtém pedidos do estabelecimento logado"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.CLIENT:
            return jsonify({'error': 'Usuário não é um estabelecimento'}), 403

        # Busca o customer profile vinculado ao user
        customer_profile = Customer.query.filter_by(user_id=user.id).first()
        if not customer_profile:
            return jsonify({'orders': [], 'total': 0}), 200

        # Busca o restaurante vinculado ao estabelecimento (case-insensitive)
        restaurant = Restaurant.query.filter_by(name=customer_profile.name).first()
        if not restaurant:
            restaurant = Restaurant.query.filter(
                Restaurant.name.ilike(customer_profile.name)
            ).first()
        if not restaurant:
            return jsonify({'orders': [], 'total': 0}), 200

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status_filter = request.args.get('status')
        status_group = request.args.get('status_group')

        query = Order.query.filter_by(restaurant_id=restaurant.id)

        if status_group == 'active':
            # Grupo "Em Andamento": ACCEPTED, PREPARING, READY, PICKED_UP
            query = query.filter(Order.status.in_([
                OrderStatus.ACCEPTED, OrderStatus.PREPARING,
                OrderStatus.READY, OrderStatus.PICKED_UP
            ]))
        elif status_group == 'pending':
            # Grupo "Pendentes": PENDING, SCHEDULED
            query = query.filter(Order.status.in_([
                OrderStatus.PENDING, OrderStatus.SCHEDULED
            ]))
        elif status_filter:
            try:
                status_enum = OrderStatus(status_filter)
                query = query.filter(Order.status == status_enum)
            except ValueError:
                pass

        orders = query.order_by(Order.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        orders_data = []
        for order in orders.items:
            order_dict = order.to_dict()
            order_dict['customer'] = order.customer.to_dict() if order.customer else None
            order_dict['delivery_address'] = order.delivery_address.to_dict() if order.delivery_address else None
            if order.driver:
                order_dict['driver'] = {
                    'id': order.driver.id,
                    'name': f"{order.driver.user.first_name} {order.driver.user.last_name}",
                    'phone': order.driver.user.phone
                }
            if order.delivery:
                order_dict['delivery'] = order.delivery.to_dict()
            # Incluir informações da rota se o pedido estiver em uma rota
            if order.own_driver_route_id:
                from src.models.portal_models import OwnDriverRoute
                own_route = OwnDriverRoute.query.get(order.own_driver_route_id)
                if own_route:
                    order_dict['own_driver_route'] = {
                        'id': own_route.id,
                        'name': f'Rota #{own_route.id}',
                        'status': own_route.status
                    }
            orders_data.append(order_dict)

        return jsonify({
            'orders': orders_data,
            'total': orders.total,
            'pages': orders.pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@order_my_bp.route('/my/stats', methods=['GET'])
@jwt_required()
def get_my_stats():
    """Obtém estatísticas do estabelecimento"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.CLIENT:
            return jsonify({'error': 'Usuário não é um estabelecimento'}), 403

        customer_profile = Customer.query.filter_by(user_id=user.id).first()
        if not customer_profile:
            return jsonify({'today_orders': 0, 'week_orders': 0, 'total_orders': 0, 'total_revenue': 0}), 200

        restaurant = Restaurant.query.filter_by(name=customer_profile.name).first()
        if not restaurant:
            return jsonify({'today_orders': 0, 'week_orders': 0, 'total_orders': 0, 'total_revenue': 0}), 200

        today = datetime.now(timezone.utc).date()
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)

        today_orders = Order.query.filter(
            Order.restaurant_id == restaurant.id,
            func.date(Order.created_at) == today
        ).count()

        week_orders = Order.query.filter(
            Order.restaurant_id == restaurant.id,
            Order.created_at >= week_ago
        ).count()

        total_orders = Order.query.filter_by(restaurant_id=restaurant.id).count()

        total_revenue = db.session.query(func.sum(Order.delivery_fee)).filter_by(
            restaurant_id=restaurant.id
        ).scalar() or 0

        # Pedidos em andamento
        active_orders = Order.query.filter(
            Order.restaurant_id == restaurant.id,
            Order.status.in_([
                OrderStatus.PENDING,
                OrderStatus.ACCEPTED,
                OrderStatus.PREPARING,
                OrderStatus.READY,
                OrderStatus.PICKED_UP
            ])
        ).count()

        return jsonify({
            'today_orders': today_orders,
            'week_orders': week_orders,
            'total_orders': total_orders,
            'total_revenue': float(total_revenue),
            'active_orders': active_orders
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# RASTREAMENTO DE ENTREGADORES (ESTABELECIMENTO)
# ============================================

@order_my_bp.route('/my/tracking', methods=['GET'])
@jwt_required()
def get_my_tracking():
    """Obtém localização dos entregadores com pedidos ativos do estabelecimento"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.CLIENT:
            return jsonify({'error': 'Usuário não é um estabelecimento'}), 403

        customer_profile = Customer.query.filter_by(user_id=user.id).first()
        if not customer_profile:
            return jsonify({'drivers': []}), 200

        restaurant = Restaurant.query.filter_by(name=customer_profile.name).first()
        if not restaurant:
            return jsonify({'drivers': []}), 200

        # Busca pedidos ativos (ACCEPTED ate PICKED_UP)
        active_orders = Order.query.filter(
            Order.restaurant_id == restaurant.id,
            Order.status.in_([
                OrderStatus.ACCEPTED,
                OrderStatus.PREPARING,
                OrderStatus.READY,
                OrderStatus.PICKED_UP
            ]),
            Order.driver_id.isnot(None)
        ).all()

        drivers_data = []
        seen_drivers = set()

        # Entregadores da plataforma
        for order in active_orders:
            try:
                driver = order.driver
                if not driver or driver.id in seen_drivers:
                    continue
                seen_drivers.add(driver.id)

                if driver.current_latitude and driver.current_longitude:
                    drivers_data.append({
                        'driver_id': driver.id,
                        'name': f"{driver.user.first_name} {driver.user.last_name}" if driver.user else 'Entregador',
                        'phone': driver.user.phone if driver.user else None,
                        'vehicle_type': driver.vehicle_type.value if driver.vehicle_type else 'MOTORCYCLE',
                        'latitude': float(driver.current_latitude),
                        'longitude': float(driver.current_longitude),
                        'order_id': order.id,
                        'order_number': order.order_number,
                        'order_status': order.status.value,
                        'last_update': driver.last_location_update.isoformat() if driver.last_location_update else None,
                        'is_own': False
                    })
            except Exception as e:
                print(f"Erro ao processar driver do pedido {order.id}: {e}")
                continue

        # Entregadores próprios online (com ou sem pedidos ativos)
        # Primeiro: buscar pedidos ativos com own drivers
        own_active_orders = Order.query.filter(
            Order.restaurant_id == restaurant.id,
            Order.status.in_([
                OrderStatus.ACCEPTED,
                OrderStatus.PREPARING,
                OrderStatus.READY,
                OrderStatus.PICKED_UP
            ]),
            Order.assigned_to_own_driver,
            Order.establishment_driver_id.isnot(None)
        ).all()

        own_active_order_driver_ids = set()
        seen_own_drivers = set()
        for order in own_active_orders:
            if order.establishment_driver_id:
                own_active_order_driver_ids.add(order.establishment_driver_id)

        # Buscar TODOS os own drivers online e ativos do restaurante
        from src.models.portal_models import EstablishmentDriver
        all_own_drivers = EstablishmentDriver.query.filter(
            EstablishmentDriver.restaurant_id == restaurant.id,
            EstablishmentDriver.is_online,
            EstablishmentDriver.is_active,
            EstablishmentDriver.current_latitude.isnot(None),
            EstablishmentDriver.current_longitude.isnot(None)
        ).all()

        for est_driver in all_own_drivers:
            try:
                if est_driver.id in seen_own_drivers:
                    continue
                seen_own_drivers.add(est_driver.id)

                has_active_order = est_driver.id in own_active_order_driver_ids
                order_info = None
                if has_active_order:
                    # Encontrar o pedido ativo deste entregador
                    for o in own_active_orders:
                        if o.establishment_driver_id == est_driver.id:
                            order_info = o
                            break

                drivers_data.append({
                    'driver_id': f"own_{est_driver.id}",
                    'name': est_driver.name,
                    'phone': est_driver.phone,
                    'vehicle_type': est_driver.vehicle_type,
                    'latitude': float(est_driver.current_latitude),
                    'longitude': float(est_driver.current_longitude),
                    'order_id': order_info.id if order_info else None,
                    'order_number': order_info.order_number if order_info else None,
                    'order_status': order_info.status.value if order_info else 'AVAILABLE',
                    'last_update': est_driver.updated_at.isoformat() if est_driver.updated_at else None,
                    'is_own': True
                })
            except Exception as e:
                print(f"Erro ao processar own driver {est_driver.id}: {e}")
                continue

        # Dados do estabelecimento para o mapa
        restaurant_data = {
            'id': restaurant.id,
            'name': restaurant.name,
            'latitude': float(restaurant.latitude) if restaurant.latitude else None,
            'longitude': float(restaurant.longitude) if restaurant.longitude else None,
            'address': restaurant.address
        } if restaurant else None

        # Enderecos de entrega dos pedidos ativos (plataforma + próprios)
        delivery_addresses = []
        seen_order_ids = set()

        # Pedidos com entregadores da plataforma
        for order in active_orders:
            try:
                if order.id in seen_order_ids:
                    continue
                seen_order_ids.add(order.id)
                if order.delivery_address:
                    addr = order.delivery_address
                    if addr.latitude and addr.longitude:
                        delivery_addresses.append({
                            'order_id': order.id,
                            'order_number': order.order_number,
                            'order_status': order.status.value,
                            'latitude': float(addr.latitude),
                            'longitude': float(addr.longitude),
                            'street': addr.street,
                            'neighborhood': addr.neighborhood,
                            'customer_name': order.customer.name if order.customer else 'Cliente'
                        })
            except Exception as e:
                print(f"Erro ao processar endereço do pedido {order.id}: {e}")
                continue

        # Pedidos com entregadores próprios
        for order in own_active_orders:
            try:
                if order.id in seen_order_ids:
                    continue
                seen_order_ids.add(order.id)
                if order.delivery_address:
                    addr = order.delivery_address
                    if addr.latitude and addr.longitude:
                        delivery_addresses.append({
                            'order_id': order.id,
                            'order_number': order.order_number,
                            'order_status': order.status.value,
                            'latitude': float(addr.latitude),
                            'longitude': float(addr.longitude),
                            'street': addr.street,
                            'neighborhood': addr.neighborhood,
                            'customer_name': order.customer.name if order.customer else 'Cliente'
                        })
            except Exception as e:
                print(f"Erro ao processar endereço own do pedido {order.id}: {e}")
                continue

        return jsonify({
            'drivers': drivers_data,
            'restaurant': restaurant_data,
            'delivery_addresses': delivery_addresses
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# FINANCEIRO DO ESTABELECIMENTO
# ============================================

@order_my_bp.route('/my/financial', methods=['GET'])
@jwt_required()
def get_my_financial():
    """Financeiro do estabelecimento: o que deve ao admin"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.CLIENT:
            return jsonify({'error': 'Usuário não é um estabelecimento'}), 403

        customer_profile = Customer.query.filter_by(user_id=user.id).first()
        if not customer_profile:
            return jsonify({'error': 'Perfil não encontrado'}), 404

        restaurant = Restaurant.query.filter_by(name=customer_profile.name).first()
        if not restaurant:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        now = datetime.now(timezone.utc)

        # Total de frete acumulado (o que deve ao admin)
        total_owed = db.session.query(func.sum(Order.delivery_fee)).filter(
            Order.restaurant_id == restaurant.id,
            Order.status == OrderStatus.DELIVERED
        ).scalar() or 0

        # Frete desta semana (segunda a domingo)
        days_since_monday = now.weekday()
        week_start = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
        week_owed = db.session.query(func.sum(Order.delivery_fee)).filter(
            Order.restaurant_id == restaurant.id,
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= week_start
        ).scalar() or 0

        # Frete do mes
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_owed = db.session.query(func.sum(Order.delivery_fee)).filter(
            Order.restaurant_id == restaurant.id,
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= month_start
        ).scalar() or 0

        # Total de entregas
        total_deliveries = Order.query.filter(
            Order.restaurant_id == restaurant.id,
            Order.status == OrderStatus.DELIVERED
        ).count()

        # Entregas esta semana
        week_deliveries = Order.query.filter(
            Order.restaurant_id == restaurant.id,
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= week_start
        ).count()

        # Historico semanal (ultimas 4 semanas)
        weekly_history = []
        for i in range(4):
            w_start = week_start - timedelta(weeks=i)
            w_end = w_start + timedelta(days=7)
            w_fee = db.session.query(func.sum(Order.delivery_fee)).filter(
                Order.restaurant_id == restaurant.id,
                Order.status == OrderStatus.DELIVERED,
                Order.created_at >= w_start,
                Order.created_at < w_end
            ).scalar() or 0
            w_orders = Order.query.filter(
                Order.restaurant_id == restaurant.id,
                Order.status == OrderStatus.DELIVERED,
                Order.created_at >= w_start,
                Order.created_at < w_end
            ).count()
            weekly_history.append({
                'week_start': w_start.date().isoformat(),
                'week_end': w_end.date().isoformat(),
                'delivery_fees': float(w_fee),
                'orders': w_orders
            })

        return jsonify({
            'total_owed': float(total_owed),
            'week_owed': float(week_owed),
            'month_owed': float(month_owed),
            'total_deliveries': total_deliveries,
            'week_deliveries': week_deliveries,
            'weekly_history': weekly_history
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# AVALIACAO DE ENTREGA
# ============================================

@order_my_bp.route('/<int:order_id>/rate', methods=['POST'])
@jwt_required()
def rate_delivery(order_id):
    """Avalia a entrega de um pedido (pelo estabelecimento)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.CLIENT:
            return jsonify({'error': 'Apenas estabelecimentos podem avaliar'}), 403

        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404

        # Verifica se o pedido pertence ao estabelecimento
        customer_profile = Customer.query.filter_by(user_id=user.id).first()
        if not customer_profile:
            return jsonify({'error': 'Perfil não encontrado'}), 404

        restaurant = Restaurant.query.filter_by(name=customer_profile.name).first()
        if not restaurant or order.restaurant_id != restaurant.id:
            return jsonify({'error': 'Pedido não pertence a este estabelecimento'}), 403

        # Verifica se ja foi avaliado
        if order.delivery and order.delivery.customer_rating:
            return jsonify({'error': 'Pedido já foi avaliado'}), 400

        # Verifica se esta entregue
        if order.status != OrderStatus.DELIVERED:
            return jsonify({'error': 'Apenas pedidos entregues podem ser avaliados'}), 400

        data = request.get_json()
        rating = data.get('rating')
        feedback = data.get('feedback', '')

        if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
            return jsonify({'error': 'Avaliação deve ser um número de 1 a 5'}), 400

        # Atualiza a avaliacao na entrega
        if order.delivery:
            order.delivery.customer_rating = rating
            order.delivery.customer_feedback = feedback
            order.delivery.updated_at = datetime.now(timezone.utc)

            if order.assigned_to_own_driver and order.establishment_driver_id:
                # Entregador próprio - atualiza EstablishmentDriver
                from src.models.portal_models import EstablishmentDriver
                est_driver = EstablishmentDriver.query.get(order.establishment_driver_id)
                if est_driver:
                    est_driver.total_ratings = (est_driver.total_ratings or 0) + 1
                    # Calcula nova média
                    avg_rating = db.session.query(func.avg(Delivery.customer_rating)).join(
                        Order, Delivery.order_id == Order.id
                    ).filter(
                        Order.establishment_driver_id == est_driver.id,
                        Delivery.customer_rating.isnot(None)
                    ).scalar()
                    if avg_rating:
                        est_driver.rating = round(float(avg_rating), 2)
                    est_driver.updated_at = datetime.now(timezone.utc)
            else:
                # Entregador da plataforma - atualiza Driver
                driver = order.delivery.driver
                if driver:
                    avg_rating = db.session.query(func.avg(Delivery.customer_rating)).filter(
                        Delivery.driver_id == driver.id,
                        Delivery.customer_rating.isnot(None)
                    ).scalar()
                    if avg_rating:
                        driver.rating = round(float(avg_rating), 2)
                    driver.updated_at = datetime.now(timezone.utc)

                    # Alerta ao admin se avaliacao for baixa (menor que 3.0)
                    if driver.rating and float(driver.rating) < 3.0:
                        notify_admin_low_rating(driver, rating, feedback, order)

                    # MuvScore: pontos por avaliação recebida
                    try:
                        from src.utils.muvscore import award_rating_points
                        award_rating_points(driver, rating, order)
                    except Exception as e:
                        logger.error(f"Erro ao registrar pontos MuvScore por avaliação: {e}")

        db.session.commit()

        return jsonify({
            'message': 'Avaliação registrada com sucesso',
            'rating': rating,
            'feedback': feedback
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@order_my_bp.route('/<int:order_id>/rate-restaurant', methods=['POST'])
@jwt_required()
def rate_restaurant(order_id):
    """Entregador avalia o estabelecimento após a entrega"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Apenas entregadores podem avaliar'}), 403

        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404

        # Verifica se o pedido pertence ao entregador
        if not order.delivery or not user.driver or order.delivery.driver_id != user.driver.id:
            return jsonify({'error': 'Pedido não pertence a este entregador'}), 403

        # Verifica se ja foi avaliado
        if order.delivery.driver_rating:
            return jsonify({'error': 'Pedido já foi avaliado'}), 400

        # Verifica se esta entregue
        if order.status != OrderStatus.DELIVERED:
            return jsonify({'error': 'Apenas pedidos entregues podem ser avaliados'}), 400

        data = request.get_json()
        rating = data.get('rating')
        feedback = data.get('feedback', '')

        if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
            return jsonify({'error': 'Avaliação deve ser um número de 1 a 5'}), 400

        # Atualiza a avaliacao na entrega
        order.delivery.driver_rating = rating
        order.delivery.driver_feedback = feedback
        order.delivery.updated_at = datetime.now(timezone.utc)

        db.session.commit()

        return jsonify({
            'message': 'Avaliação registrada com sucesso',
            'rating': rating,
            'feedback': feedback
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


def notify_admin_low_rating(driver, rating, feedback, order):
    """Notifica admin quando entregador recebe avaliacao baixa"""
    try:
        from src.models.portal_models import SystemConfig

        # Notifica via WhatsApp
        try:
            from src.services.whatsapp import whatsapp_service
            if whatsapp_service.is_configured():
                admin_phone_config = SystemConfig.query.filter_by(config_key='admin_phone').first()
                if admin_phone_config:
                    whatsapp_service.send_message(
                        admin_phone_config.config_value,
                        f"⚠️ *ALERTA: Avaliação Baixa!*\n\n"
                        f"Entregador: {driver.user.first_name} {driver.user.last_name}\n"
                        f"Nota recebida: {rating}/5\n"
                        f"Média atual: {driver.rating}/5\n"
                        f"Feedback: {feedback or 'Sem comentário'}\n"
                        f"Pedido: #{order.order_number}\n\n"
                        f"Verifique a situação deste entregador."
                    )
        except Exception:
            pass

        # Notifica via sistema
        admin_users = User.query.filter_by(user_type=UserType.ADMIN).all()
        for admin in admin_users:
            notification = Notification(
                user_id=admin.id,
                title="⚠️ Avaliação Baixa",
                message=f"Entregador {driver.user.first_name} {driver.user.last_name} recebeu nota {rating}/5 (média: {driver.rating}). Feedback: {feedback or 'Sem comentário'}",
                type=NotificationType.SYSTEM,
                related_id=order.id
            )
            db.session.add(notification)

        db.session.commit()
    except Exception as e:
        logger.error(f"Erro ao notificar admin sobre avaliacao baixa: {e}")


