"""Módulo route_platform — extraído de src/routes/route.py no refactor de arquivos grandes.
Movimento puro de código — comportamento idêntico ao original.
"""
import logging
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.models.portal_models import (
    Driver,
    Order,
    OrderStatus,
    PlatformDriverRoute,
    PlatformDriverStop,
    Restaurant,
    UserType,
    db,
)
from src.routes.route_helpers import optimize_stop_order
from src.utils.tenant import get_current_tenant_id, get_current_user

logger = logging.getLogger(__name__)


route_platform_bp = Blueprint('route_platform', __name__, url_prefix='/api/routes')


@route_platform_bp.route('/platform/create', methods=['POST'])
@jwt_required()
def create_platform_route():
    """Cria uma rota com múltiplos pedidos para um entregador da plataforma"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400

        driver_id = data.get('driver_id')
        order_ids = data.get('order_ids', [])

        if not driver_id or not order_ids:
            return jsonify({'error': 'Entregador e pedidos são obrigatórios'}), 400

        # Verificar entregador
        driver = Driver.query.get(driver_id)
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404

        # Verificar pedidos
        orders = Order.query.filter(Order.id.in_(order_ids)).all()
        if len(orders) != len(order_ids):
            return jsonify({'error': 'Alguns pedidos não foram encontrados'}), 400

        # Verificar se todos os pedidos são do mesmo restaurante
        restaurant_ids = set(o.restaurant_id for o in orders)
        if len(restaurant_ids) > 1:
            return jsonify({'error': 'Todos os pedidos devem ser do mesmo restaurante'}), 400

        restaurant_id = restaurant_ids.pop()

        # Verificar se restaurante tem roteirização habilitada
        restaurant = Restaurant.query.get(restaurant_id)
        if restaurant and not restaurant.enable_platform_routing:
            return jsonify({'error': 'Roteirização não habilitada para este restaurante'}), 400

        # Criar rota
        route = PlatformDriverRoute(
            driver_id=driver_id,
            restaurant_id=restaurant_id,
            status='ACTIVE',
            started_at=datetime.now(timezone.utc)
        )
        db.session.add(route)
        db.session.flush()

        # Criar paradas
        stops = []
        stop_order = 1

        # Parada de pickup no restaurante
        if restaurant:
            for order in orders:
                pickup_stop = PlatformDriverStop(
                    route_id=route.id,
                    order_id=order.id,
                    stop_order=stop_order,
                    stop_type='PICKUP',
                    latitude=restaurant.latitude,
                    longitude=restaurant.longitude,
                    address=restaurant.address
                )
                db.session.add(pickup_stop)
                stops.append({
                    'order_id': order.id,
                    'stop_type': 'PICKUP',
                    'latitude': float(restaurant.latitude) if restaurant.latitude else None,
                    'longitude': float(restaurant.longitude) if restaurant.longitude else None,
                    'address': restaurant.address
                })
                stop_order += 1

        # Paradas de delivery
        for order in orders:
            if order.delivery_address:
                delivery_stop = PlatformDriverStop(
                    route_id=route.id,
                    order_id=order.id,
                    stop_order=stop_order,
                    stop_type='DELIVERY',
                    latitude=order.delivery_address.latitude,
                    longitude=order.delivery_address.longitude,
                    address=f"{order.delivery_address.street}, {order.delivery_address.neighborhood}"
                )
                db.session.add(delivery_stop)
                stops.append({
                    'order_id': order.id,
                    'stop_type': 'DELIVERY',
                    'latitude': float(order.delivery_address.latitude) if order.delivery_address.latitude else None,
                    'longitude': float(order.delivery_address.longitude) if order.delivery_address.longitude else None,
                    'address': f"{order.delivery_address.street}, {order.delivery_address.neighborhood}"
                })
                stop_order += 1

        # Otimizar ordem das paradas
        optimized_stops = optimize_stop_order(stops)

        # Atualizar ordem no banco
        for i, stop_data in enumerate(optimized_stops):
            stop = PlatformDriverStop.query.filter_by(
                route_id=route.id,
                order_id=stop_data['order_id'],
                stop_type=stop_data['stop_type']
            ).first()
            if stop:
                stop.stop_order = i + 1

        # Atualizar pedidos
        for order in orders:
            order.route_id = route.id
            if order.status == OrderStatus.PENDING:
                order.status = OrderStatus.OFFERED
                order.driver_id = driver_id
                order.offered_at = datetime.now(timezone.utc)

        db.session.commit()

        return jsonify({
            'message': f'Rota criada com {len(orders)} pedidos',
            'route': route.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao criar rota plataforma: {e}")
        return jsonify({'error': str(e)}), 500


@route_platform_bp.route('/platform/<int:route_id>/complete-stop', methods=['POST'])
@jwt_required()
def complete_platform_stop(route_id):
    """Marca uma parada de rota de plataforma como concluída"""
    try:
        data = request.get_json()
        stop_id = data.get('stop_id')

        if not stop_id:
            return jsonify({'error': 'ID da parada é obrigatório'}), 400

        stop = PlatformDriverStop.query.get(stop_id)
        if not stop or stop.route_id != route_id:
            return jsonify({'error': 'Parada não encontrada'}), 404

        stop.status = 'COMPLETED'
        stop.completed_at = datetime.now(timezone.utc)

        # Verificar se todas as paradas foram concluídas
        route = PlatformDriverRoute.query.get(route_id)
        all_completed = all(s.status == 'COMPLETED' for s in route.stops)

        if all_completed:
            route.status = 'COMPLETED'
            route.completed_at = datetime.now(timezone.utc)

        db.session.commit()

        return jsonify({
            'message': 'Parada concluída',
            'stop': stop.to_dict(),
            'route_completed': all_completed
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@route_platform_bp.route('/platform/active', methods=['GET'])
@jwt_required()
def get_active_platform_routes():
    """Obtém rotas ativas de entregadores da plataforma"""
    try:
        user = get_current_user()
        tenant_id = get_current_tenant_id()

        query = PlatformDriverRoute.query.filter(
            PlatformDriverRoute.status == 'ACTIVE'
        )

        # Filtrar por tenant se admin
        if user.user_type == UserType.ADMIN and tenant_id:
            restaurant_ids = [r.id for r in Restaurant.query.filter_by(tenant_id=tenant_id).all()]
            query = query.filter(PlatformDriverRoute.restaurant_id.in_(restaurant_ids))

        routes = query.all()

        return jsonify({'routes': [r.to_dict() for r in routes]}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

