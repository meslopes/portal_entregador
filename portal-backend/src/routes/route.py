"""
Endpoints de roteirização para entregadores próprios.
Permite criar rotas com múltiplos pedidos e otimizar a ordem de entrega.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.portal_models import (
    db, Order, OrderStatus, EstablishmentDriver, Restaurant,
    OwnDriverRoute, OwnDriverStop, OwnDriverEarning, User, UserType
)
from src.routes.own_driver import own_driver_required
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

route_bp = Blueprint('routes', __name__, url_prefix='/api/routes')


def optimize_stop_order(stops):
    """
    Otimiza a ordem das paradas usando algoritmo do vizinho mais próximo.
    Retorna a lista de paradas reordenadas.
    """
    if len(stops) <= 2:
        return stops
    
    # Separar pickups e deliveries
    pickups = [s for s in stops if s['stop_type'] == 'PICKUP']
    deliveries = [s for s in stops if s['stop_type'] == 'DELIVERY']
    
    # Ordenar pickups por distância do restaurante (mais próximo primeiro)
    # Ordenar deliveries por distância do último pickup (mais próximo primeiro)
    
    # Por simplicidade, manter ordem: todos pickups primeiro, depois deliveries
    # Em uma implementação futura, usar OSRM para otimização real
    optimized = pickups + deliveries
    
    # Reatribuir ordem
    for i, stop in enumerate(optimized):
        stop['stop_order'] = i + 1
    
    return optimized


@route_bp.route('/create', methods=['POST'])
@jwt_required()
def create_route():
    """Cria uma rota com múltiplos pedidos para um entregador próprio"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400

        driver_id = data.get('establishment_driver_id')
        order_ids = data.get('order_ids', [])
        
        if not driver_id or not order_ids:
            return jsonify({'error': 'Entregador e pedidos são obrigatórios'}), 400

        # Verificar entregador
        driver = EstablishmentDriver.query.get(driver_id)
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

        # Criar rota
        route = OwnDriverRoute(
            establishment_driver_id=driver_id,
            restaurant_id=restaurant_id,
            status='ACTIVE',
            started_at=datetime.utcnow()
        )
        db.session.add(route)
        db.session.flush()

        # Criar paradas (pickups no restaurante, deliveries nos clientes)
        stops = []
        stop_order = 1

        # Parada de pickup no restaurante
        restaurant = Restaurant.query.get(restaurant_id)
        if restaurant:
            for order in orders:
                pickup_stop = OwnDriverStop(
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
                delivery_stop = OwnDriverStop(
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
            stop = OwnDriverStop.query.filter_by(
                route_id=route.id,
                order_id=stop_data['order_id'],
                stop_type=stop_data['stop_type']
            ).first()
            if stop:
                stop.stop_order = i + 1

        # Atualizar pedidos com referência à rota
        for order in orders:
            order.route_id = route.id
            order.assigned_to_own_driver = True
            order.establishment_driver_id = driver_id
            if order.status == OrderStatus.PENDING:
                order.status = OrderStatus.OFFERED
                order.offered_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'message': f'Rota criada com {len(orders)} pedidos',
            'route': route.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao criar rota: {e}")
        return jsonify({'error': str(e)}), 500


@route_bp.route('/<int:route_id>/complete-stop', methods=['POST'])
@jwt_required()
def complete_stop(route_id):
    """Marca uma parada como concluída"""
    try:
        data = request.get_json()
        stop_id = data.get('stop_id')
        
        if not stop_id:
            return jsonify({'error': 'ID da parada é obrigatório'}), 400

        stop = OwnDriverStop.query.get(stop_id)
        if not stop or stop.route_id != route_id:
            return jsonify({'error': 'Parada não encontrada'}), 404

        stop.status = 'COMPLETED'
        stop.completed_at = datetime.utcnow()

        # Verificar se todas as paradas foram concluídas
        route = OwnDriverRoute.query.get(route_id)
        all_completed = all(s.status == 'COMPLETED' for s in route.stops)
        
        if all_completed:
            route.status = 'COMPLETED'
            route.completed_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'message': 'Parada concluída',
            'stop': stop.to_dict(),
            'route_completed': all_completed
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@route_bp.route('/<int:route_id>', methods=['GET'])
@jwt_required()
def get_route(route_id):
    """Obtém detalhes de uma rota"""
    try:
        route = OwnDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        return jsonify({'route': route.to_dict()}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@route_bp.route('/active', methods=['GET'])
@jwt_required()
def get_active_routes():
    """Obtém rotas ativas do entregador"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Buscar entregador próprio
        driver = EstablishmentDriver.query.filter_by(user_id=user_id).first()
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404

        routes = OwnDriverRoute.query.filter(
            OwnDriverRoute.establishment_driver_id == driver.id,
            OwnDriverRoute.status == 'ACTIVE'
        ).all()

        return jsonify({'routes': [r.to_dict() for r in routes]}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
