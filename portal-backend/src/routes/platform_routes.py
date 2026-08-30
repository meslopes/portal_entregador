"""
Endpoints para rotas de entregadores da plataforma.
Permite criar, gerenciar e concluir rotas com múltiplos pedidos.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.portal_models import (
    db, Order, OrderStatus, Driver, Restaurant,
    PlatformDriverRoute, PlatformDriverStop, User, UserType
)
from src.utils.tenant import get_current_user, get_current_tenant_id
from src.utils.geo import haversine_distance
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

platform_routes_bp = Blueprint('platform_routes', __name__, url_prefix='/api/platform-routes')


def optimize_platform_route_order(stops, driver_pos=None):
    """
    Otimiza ordem das paradas usando algoritmo direção-aware.
    Considera pickups e deliveries com precedência.
    """
    if not stops:
        return []
    
    if len(stops) <= 2:
        for i, stop in enumerate(stops):
            stop['stop_order'] = i + 1
        return stops
    
    # Algoritmo direção-aware
    optimized = []
    remaining = list(stops)
    current_pos = driver_pos or (stops[0]['latitude'], stops[0]['longitude'])
    picked_up_orders = set()
    
    while remaining:
        # Filtrar paradas válidas
        valid_stops = []
        for stop in remaining:
            if stop['stop_type'] == 'PICKUP':
                valid_stops.append(stop)
            elif stop['stop_type'] == 'DELIVERY' and stop['order_id'] in picked_up_orders:
                valid_stops.append(stop)
        
        if not valid_stops:
            valid_stops = [s for s in remaining if s['stop_type'] == 'PICKUP']
        
        if not valid_stops:
            break
        
        # Calcular centroid das paradas restantes
        centroid_lat = sum(s['latitude'] for s in valid_stops) / len(valid_stops)
        centroid_lng = sum(s['longitude'] for s in valid_stops) / len(valid_stops)
        
        # Encontrar melhor parada
        best_stop = None
        best_score = float('inf')
        
        for stop in valid_stops:
            if not stop['latitude'] or not stop['longitude'] or not current_pos[0] or not current_pos[1]:
                score = 0
            else:
                distance = haversine_distance(
                    current_pos[0], current_pos[1],
                    stop['latitude'], stop['longitude']
                )
                
                # Calcular direção
                to_stop = (stop['latitude'] - current_pos[0], stop['longitude'] - current_pos[1])
                to_centroid = (centroid_lat - current_pos[0], centroid_lng - current_pos[1])
                
                dot_product = to_stop[0] * to_centroid[0] + to_stop[1] * to_centroid[1]
                mag_stop = (to_stop[0]**2 + to_stop[1]**2)**0.5
                mag_centroid = (to_centroid[0]**2 + to_centroid[1]**2)**0.5
                
                if mag_stop > 0 and mag_centroid > 0:
                    direction_similarity = dot_product / (mag_stop * mag_centroid)
                else:
                    direction_similarity = 0
                
                direction_factor = 2 - max(0, direction_similarity)
                score = distance * direction_factor
            
            if score < best_score:
                best_score = score
                best_stop = stop
        
        if best_stop:
            optimized.append(best_stop)
            remaining.remove(best_stop)
            current_pos = (best_stop['latitude'], best_stop['longitude'])
            
            if best_stop['stop_type'] == 'PICKUP':
                picked_up_orders.add(best_stop['order_id'])
    
    # Atribuir ordem
    for i, stop in enumerate(optimized):
        stop['stop_order'] = i + 1
    
    return optimized


@platform_routes_bp.route('/create', methods=['POST'])
@jwt_required()
def create_platform_route():
    """Cria uma rota para entregador da plataforma"""
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
        
        if not driver.is_active:
            return jsonify({'error': 'Entregador está inativo'}), 400
        
        if not driver.is_online:
            return jsonify({'error': 'Entregador está offline'}), 400

        # Verificar pedidos
        orders = Order.query.filter(Order.id.in_(order_ids)).all()
        if len(orders) != len(order_ids):
            return jsonify({'error': 'Alguns pedidos não foram encontrados'}), 400
        
        # Verificar limite de pedidos
        from src.models.portal_models import RouteSettings
        settings = RouteSettings.query.first()
        max_orders = settings.max_orders_manual if settings else 10
        if len(orders) > max_orders:
            return jsonify({'error': f'Máximo de {max_orders} pedidos por rota'}), 400

        # Verificar se pedidos já estão em rotas ativas
        for order in orders:
            if order.route_id:
                existing_route = PlatformDriverRoute.query.get(order.route_id)
                if existing_route and existing_route.status in ['PENDING', 'ACTIVE']:
                    return jsonify({'error': f'Pedido {order.order_number} já está na rota #{existing_route.id}'}), 400
            
            # Verificar se pedido tem dados de entrega
            if not order.delivery_address or not order.delivery_address.latitude:
                return jsonify({'error': f'Pedido {order.order_number} não tem endereço de entrega com coordenadas'}), 400

        # Criar rota
        route = PlatformDriverRoute(
            driver_id=driver_id,
            status='PENDING'
        )
        db.session.add(route)
        db.session.flush()

        # Criar paradas (pickup + delivery para cada pedido)
        stops_data = []
        for order in orders:
            # Pickup no restaurante
            if order.restaurant and order.restaurant.latitude:
                stops_data.append({
                    'order_id': order.id,
                    'stop_type': 'PICKUP',
                    'latitude': float(order.restaurant.latitude),
                    'longitude': float(order.restaurant.longitude),
                    'address': order.restaurant.address,
                    'restaurant_id': order.restaurant_id
                })
            
            # Delivery no cliente
            if order.delivery_address and order.delivery_address.latitude:
                stops_data.append({
                    'order_id': order.id,
                    'stop_type': 'DELIVERY',
                    'latitude': float(order.delivery_address.latitude),
                    'longitude': float(order.delivery_address.longitude),
                    'address': order.delivery_address.street,
                    'restaurant_id': None
                })

        # Otimizar ordem
        driver_pos = None
        if driver.current_latitude and driver.current_longitude:
            driver_pos = (float(driver.current_latitude), float(driver.current_longitude))
        
        optimized_stops = optimize_platform_route_order(stops_data, driver_pos)

        # Criar paradas no banco
        for stop_data in optimized_stops:
            stop = PlatformDriverStop(
                route_id=route.id,
                order_id=stop_data['order_id'],
                stop_order=stop_data['stop_order'],
                stop_type=stop_data['stop_type'],
                latitude=stop_data['latitude'],
                longitude=stop_data['longitude'],
                address=stop_data['address'],
                restaurant_id=stop_data.get('restaurant_id')
            )
            db.session.add(stop)

        # Atualizar pedidos
        for order in orders:
            order.route_id = route.id
            order.driver_id = driver_id
            order.status = OrderStatus.OFFERED
            order.offered_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'message': f'Rota criada com {len(orders)} pedidos',
            'route': route.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao criar rota plataforma: {e}")
        return jsonify({'error': str(e)}), 500


@platform_routes_bp.route('/driver/active', methods=['GET'])
@jwt_required()
def get_driver_active_routes():
    """Obtém rotas ativas do entregador da plataforma"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403

        driver = user.driver
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404

        routes = PlatformDriverRoute.query.filter(
            PlatformDriverRoute.driver_id == driver.id,
            PlatformDriverRoute.status.in_(['PENDING', 'ACTIVE'])
        ).order_by(PlatformDriverRoute.created_at.desc()).all()

        return jsonify({'routes': [r.to_dict() for r in routes]}), 200

    except Exception as e:
        logger.error(f"Erro ao listar rotas: {e}")
        return jsonify({'error': str(e)}), 500


@platform_routes_bp.route('/<int:route_id>/accept', methods=['POST'])
@jwt_required()
def accept_route(route_id):
    """Entregador aceita uma rota"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403

        driver = user.driver
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404
        
        if not driver.is_active:
            return jsonify({'error': 'Entregador está inativo'}), 400

        route = PlatformDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        if route.driver_id != driver.id:
            return jsonify({'error': 'Esta rota não foi atribuída a você'}), 403

        if route.status != 'PENDING':
            return jsonify({'error': 'Rota já foi aceita ou rejeitada'}), 400

        route.status = 'ACTIVE'
        route.started_at = datetime.utcnow()

        # Atualizar status dos pedidos
        for stop in route.stops:
            order = Order.query.get(stop.order_id)
            if order and order.status in [OrderStatus.OFFERED, OrderStatus.PENDING]:
                order.status = OrderStatus.ACCEPTED
                order.accepted_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'message': 'Rota aceita com sucesso',
            'route': route.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao aceitar rota: {e}")
        return jsonify({'error': str(e)}), 500


@platform_routes_bp.route('/<int:route_id>/reject', methods=['POST'])
@jwt_required()
def reject_route(route_id):
    """Entregador rejeita uma rota"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403

        driver = user.driver
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404

        route = PlatformDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        if route.driver_id != driver.id:
            return jsonify({'error': 'Esta rota não foi atribuída a você'}), 403

        if route.status != 'PENDING':
            return jsonify({'error': 'Rota já foi aceita ou rejeitada'}), 400

        route.status = 'REJECTED'

        # Desvincular pedidos da rota
        for stop in route.stops:
            order = Order.query.get(stop.order_id)
            if order:
                order.route_id = None
                order.driver_id = None
                order.status = OrderStatus.READY

        db.session.commit()

        return jsonify({
            'message': 'Rota rejeitada',
            'route': route.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao rejeitar rota: {e}")
        return jsonify({'error': str(e)}), 500


@platform_routes_bp.route('/<int:route_id>/complete-stop', methods=['POST'])
@jwt_required()
def complete_stop(route_id):
    """Marca uma parada como concluída"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403

        driver = user.driver
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404

        route = PlatformDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        if route.driver_id != driver.id:
            return jsonify({'error': 'Sem permissão'}), 403

        data = request.get_json()
        stop_id = data.get('stop_id')
        
        if not stop_id:
            return jsonify({'error': 'ID da parada é obrigatório'}), 400

        stop = PlatformDriverStop.query.get(stop_id)
        if not stop or stop.route_id != route_id:
            return jsonify({'error': 'Parada não encontrada'}), 404

        stop.status = 'COMPLETED'
        stop.completed_at = datetime.utcnow()

        # Verificar se todas as paradas foram concluídas
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
        logger.error(f"Erro ao concluir parada: {e}")
        return jsonify({'error': str(e)}), 500


@platform_routes_bp.route('/<int:route_id>/remove-order', methods=['POST'])
@jwt_required()
def remove_order_from_route(route_id):
    """Remove um pedido de uma rota"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        data = request.get_json()
        order_id = data.get('order_id')
        if not order_id:
            return jsonify({'error': 'order_id é obrigatório'}), 400

        route = PlatformDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        # Encontrar paradas do pedido nesta rota
        stops = PlatformDriverStop.query.filter_by(route_id=route_id, order_id=order_id).all()
        if not stops:
            return jsonify({'error': 'Pedido não encontrado nesta rota'}), 404

        # Verificar se alguma parada já foi concluída
        for stop in stops:
            if stop.status == 'COMPLETED':
                return jsonify({'error': 'Não é possível remover pedido com parada concluída'}), 400

        # Remover paradas
        for stop in stops:
            db.session.delete(stop)

        # Desvincular pedido
        order = Order.query.get(order_id)
        if order:
            order.route_id = None
            order.driver_id = None
            order.status = OrderStatus.READY

        # Reordenar paradas restantes
        remaining_stops = PlatformDriverStop.query.filter_by(route_id=route_id).order_by(PlatformDriverStop.stop_order).all()
        for i, s in enumerate(remaining_stops):
            s.stop_order = i + 1

        # Se rota ficou sem paradas, excluir
        if not remaining_stops:
            db.session.delete(route)

        db.session.commit()

        return jsonify({
            'message': 'Pedido removido da rota',
            'route': route.to_dict() if remaining_stops else None
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao remover pedido: {e}")
        return jsonify({'error': str(e)}), 500


@platform_routes_bp.route('/<int:route_id>/move-order', methods=['POST'])
@jwt_required()
def move_order_between_routes(route_id):
    """Move um pedido de uma rota para outra"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        data = request.get_json()
        order_id = data.get('order_id')
        target_route_id = data.get('target_route_id')

        if not order_id or not target_route_id:
            return jsonify({'error': 'order_id e target_route_id são obrigatórios'}), 400

        if route_id == target_route_id:
            return jsonify({'error': 'Rota de origem e destino são iguais'}), 400

        source_route = PlatformDriverRoute.query.get(route_id)
        if not source_route:
            return jsonify({'error': 'Rota de origem não encontrada'}), 404

        target_route = PlatformDriverRoute.query.get(target_route_id)
        if not target_route:
            return jsonify({'error': 'Rota de destino não encontrada'}), 404

        # Encontrar paradas na rota de origem
        stops = PlatformDriverStop.query.filter_by(route_id=route_id, order_id=order_id).all()
        if not stops:
            return jsonify({'error': 'Pedido não encontrado na rota de origem'}), 404

        # Verificar se alguma parada já foi concluída
        for stop in stops:
            if stop.status == 'COMPLETED':
                return jsonify({'error': 'Não é possível mover pedido com parada concluída'}), 400

        # Verificar se pedido já está na rota de destino
        existing = PlatformDriverStop.query.filter_by(route_id=target_route_id, order_id=order_id).first()
        if existing:
            return jsonify({'error': 'Pedido já está na rota de destino'}), 400

        # Mover paradas
        for stop in stops:
            stop.route_id = target_route_id

        # Atualizar pedido
        order = Order.query.get(order_id)
        if order:
            order.route_id = target_route_id
            order.driver_id = target_route.driver_id

        # Reordenar paradas da rota de origem
        remaining_stops = PlatformDriverStop.query.filter_by(route_id=route_id).order_by(PlatformDriverStop.stop_order).all()
        for i, s in enumerate(remaining_stops):
            s.stop_order = i + 1

        if not remaining_stops:
            db.session.delete(source_route)

        # Re-otimizar paradas da rota de destino
        target_stops = PlatformDriverStop.query.filter_by(route_id=target_route_id).order_by(PlatformDriverStop.stop_order).all()
        target_stops_data = []
        for s in target_stops:
            target_stops_data.append({
                'order_id': s.order_id,
                'stop_type': s.stop_type,
                'latitude': float(s.latitude) if s.latitude else None,
                'longitude': float(s.longitude) if s.longitude else None,
                'address': s.address
            })

        optimized = optimize_platform_route_order(target_stops_data)
        for stop_data in optimized:
            for s in target_stops:
                if s.order_id == stop_data['order_id'] and s.stop_type == stop_data['stop_type']:
                    s.stop_order = stop_data['stop_order']
                    break

        db.session.commit()

        return jsonify({
            'message': f'Pedido movido para Rota #{target_route.id}',
            'source_route': source_route.to_dict() if remaining_stops else None,
            'target_route': target_route.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao mover pedido: {e}")
        return jsonify({'error': str(e)}), 500


@platform_routes_bp.route('/list', methods=['GET'])
@jwt_required()
def list_platform_routes():
    """Lista todas as rotas da plataforma (admin)"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        tenant_id = get_current_tenant_id()
        status_filter = request.args.get('status', '')

        query = PlatformDriverRoute.query

        if status_filter:
            query = query.filter_by(status=status_filter)
        else:
            query = query.filter(PlatformDriverRoute.status.in_(['PENDING', 'ACTIVE']))

        routes = query.order_by(PlatformDriverRoute.created_at.desc()).limit(50).all()

        return jsonify({'routes': [r.to_dict() for r in routes]}), 200

    except Exception as e:
        logger.error(f"Erro ao listar rotas: {e}")
        return jsonify({'error': str(e)}), 500
