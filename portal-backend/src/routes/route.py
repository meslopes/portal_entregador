"""
Endpoints de roteirização para entregadores próprios e da plataforma.
Permite criar rotas com múltiplos pedidos e otimizar a ordem de entrega.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.portal_models import (
    db, Order, OrderStatus, EstablishmentDriver, Restaurant, Driver,
    OwnDriverRoute, OwnDriverStop, OwnDriverEarning,
    PlatformDriverRoute, PlatformDriverStop,
    User, UserType
)
from src.routes.own_driver import own_driver_required
from src.utils.tenant import get_current_tenant_id, get_current_user
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

route_bp = Blueprint('routes', __name__, url_prefix='/api/routes')


def optimize_stop_order(stops):
    """
    Otimiza a ordem das paradas usando algoritmo do vizinho mais próximo.
    Retorna a lista de paradas reordenadas.
    
    Lógica:
    1. Todas as coletas primeiro (no restaurante)
    2. Entregas ordenadas por proximidade (vizinho mais próximo)
    """
    if len(stops) <= 2:
        for i, stop in enumerate(stops):
            stop['stop_order'] = i + 1
        return stops
    
    # Separar pickups e deliveries
    pickups = [s for s in stops if s['stop_type'] == 'PICKUP']
    deliveries = [s for s in stops if s['stop_type'] == 'DELIVERY']
    
    if len(deliveries) <= 1:
        # Se tem 0 ou 1 entrega, não precisa otimizar
        optimized = pickups + deliveries
        for i, stop in enumerate(optimized):
            stop['stop_order'] = i + 1
        return optimized
    
    # Otimizar ordem das entregas usando vizinho mais próximo
    # Começar do restaurante (último pickup ou primeiro ponto)
    start_lat = pickups[0]['latitude'] if pickups else None
    start_lng = pickups[0]['longitude'] if pickups else None
    
    # Se não tem coordenadas do restaurante, usar primeira entrega como ponto de partida
    if not start_lat or not start_lng:
        if deliveries:
            start_lat = deliveries[0]['latitude']
            start_lng = deliveries[0]['longitude']
    
    # Algoritmo do vizinho mais próximo
    optimized_deliveries = []
    remaining = list(deliveries)
    current_lat = start_lat
    current_lng = start_lng
    
    while remaining:
        # Encontrar a entrega mais próxima do ponto atual
        nearest_idx = 0
        nearest_dist = float('inf')
        
        for i, stop in enumerate(remaining):
            if stop['latitude'] and stop['longitude'] and current_lat and current_lng:
                dist = haversine_distance(
                    float(current_lat), float(current_lng),
                    float(stop['latitude']), float(stop['longitude'])
                )
            else:
                dist = 0  # Se não tem coordenadas, manter ordem original
            
            if dist < nearest_dist:
                nearest_dist = dist
                nearest_idx = i
        
        # Adicionar a mais próxima à lista otimizada
        nearest_stop = remaining.pop(nearest_idx)
        optimized_deliveries.append(nearest_stop)
        current_lat = nearest_stop['latitude']
        current_lng = nearest_stop['longitude']
    
    # Combinar: pickups primeiro, depois deliveries otimizadas
    optimized = pickups + optimized_deliveries
    
    # Reatribuir ordem
    for i, stop in enumerate(optimized):
        stop['stop_order'] = i + 1
    
    return optimized


def haversine_distance(lat1, lng1, lat2, lng2):
    """Calcula distância em km entre dois pontos usando Haversine"""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371  # Raio da Terra em km
    lat1_r, lat2_r = radians(lat1), radians(lat2)
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    
    a = sin(dlat/2)**2 + cos(lat1_r) * cos(lat2_r) * sin(dlng/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c


def auto_create_or_update_route(establishment_driver_id, restaurant_id):
    """
    DESABILITADO - Rotas agora são criadas manualmente pelo estabelecimento.
    Mantido para compatibilidade mas não faz nada.
    """
    logger.info(f"[ROUTE-AUTO] Criação automática desabilitada - rotas são manuais")
    return None


def _update_route_stats(route):
    """Atualiza distância e tempo estimado da rota"""
    try:
        from src.services.geocoding import get_route_distance_with_fallback
        
        stops = sorted(route.stops, key=lambda s: s.stop_order)
        total_distance = 0
        total_duration = 0
        
        for i in range(len(stops) - 1):
            if stops[i].latitude and stops[i].longitude and stops[i+1].latitude and stops[i+1].longitude:
                route_info = get_route_distance_with_fallback(
                    float(stops[i].latitude), float(stops[i].longitude),
                    float(stops[i+1].latitude), float(stops[i+1].longitude)
                )
                total_distance += route_info['distance_km']
                total_duration += route_info['duration_min']
        
        route.total_distance_km = round(total_distance, 2)
        route.total_duration_min = round(total_duration, 1)
        
    except Exception as e:
        logger.error(f"[ROUTE-AUTO] Erro ao calcular stats da rota: {e}")


@route_bp.route('/create', methods=['POST'])
@jwt_required()
def create_route():
    """Cria uma rota com pedidos (sem entregador - será atribuído depois)"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400

        order_ids = data.get('order_ids', [])
        
        if not order_ids:
            return jsonify({'error': 'Pedidos são obrigatórios'}), 400

        # Verificar pedidos
        orders = Order.query.filter(Order.id.in_(order_ids)).all()
        if len(orders) != len(order_ids):
            return jsonify({'error': 'Alguns pedidos não foram encontrados'}), 400

        # Verificar se todos os pedidos são do mesmo restaurante
        restaurant_ids = set(o.restaurant_id for o in orders)
        if len(restaurant_ids) > 1:
            return jsonify({'error': 'Todos os pedidos devem ser do mesmo restaurante'}), 400

        # Verificar se algum pedido já está em outra rota ativa
        for order in orders:
            if order.own_driver_route_id:
                existing_route = OwnDriverRoute.query.get(order.own_driver_route_id)
                if existing_route and existing_route.status in ['CREATED', 'PENDING', 'ACTIVE']:
                    return jsonify({'error': f'Pedido {order.order_number} já está na rota #{existing_route.id}'}), 400

        restaurant_id = restaurant_ids.pop()

        # Criar rota SEM entregador (status CREATED - aguardando atribuição)
        route = OwnDriverRoute(
            establishment_driver_id=None,  # Sem entregador ainda
            restaurant_id=restaurant_id,
            status='CREATED'
        )
        db.session.add(route)
        db.session.flush()

        # Criar APENAS paradas de delivery (sem pickup - coleta é no restaurante)
        stops_data = []
        for order in orders:
            if order.delivery_address:
                delivery_stop = OwnDriverStop(
                    route_id=route.id,
                    order_id=order.id,
                    stop_order=0,  # Será otimizado depois
                    stop_type='DELIVERY',
                    latitude=order.delivery_address.latitude,
                    longitude=order.delivery_address.longitude,
                    address=order.delivery_address.street
                )
                db.session.add(delivery_stop)
                stops_data.append({
                    'order_id': order.id,
                    'stop_type': 'DELIVERY',
                    'latitude': float(order.delivery_address.latitude) if order.delivery_address.latitude else None,
                    'longitude': float(order.delivery_address.longitude) if order.delivery_address.longitude else None,
                    'address': order.delivery_address.street
                })

        # Otimizar ordem das paradas
        optimized_stops = optimize_stop_order(stops_data)
        
        # Atualizar ordem no banco
        for i, stop_data in enumerate(optimized_stops):
            stop = OwnDriverStop.query.filter_by(
                route_id=route.id,
                order_id=stop_data['order_id']
            ).first()
            if stop:
                stop.stop_order = i + 1

        # Vincular pedidos à rota (sem atribuir entregador)
        for order in orders:
            order.own_driver_route_id = route.id

        db.session.commit()

        return jsonify({
            'message': f'Rota criada com {len(orders)} entregas',
            'route': route.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao criar rota: {e}")
        return jsonify({'error': str(e)}), 500


@route_bp.route('/<int:route_id>/assign-driver', methods=['POST'])
@jwt_required()
def assign_driver_to_route(route_id):
    """Atribui entregador a uma rota (calcula ganhos para cada pedido)"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        data = request.get_json()
        driver_id = data.get('driver_id')
        
        if not driver_id:
            return jsonify({'error': 'ID do entregador é obrigatório'}), 400

        route = OwnDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        driver = EstablishmentDriver.query.get(driver_id)
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404

        # Atribuir entregador à rota
        route.establishment_driver_id = driver_id
        route.status = 'PENDING'  # Aguardando entregador aceitar
        
        # Atribuir entregador a todos os pedidos da rota e calcular ganhos
        restaurant = Restaurant.query.get(route.restaurant_id)
        
        for stop in route.stops:
            order = Order.query.get(stop.order_id)
            if order:
                order.assigned_to_own_driver = True
                order.establishment_driver_id = driver_id
                order.own_driver_route_id = route.id
                
                # Calcular ganho do entregador para este pedido
                if restaurant:
                    payment_type = restaurant.own_driver_payment_type or 'PER_DELIVERY'
                    delivery_fee = float(order.delivery_fee or 0)
                    distance_km = 0
                    
                    if order.delivery_address and order.delivery_address.latitude and restaurant.latitude:
                        distance_km = haversine_distance(
                            float(restaurant.latitude), float(restaurant.longitude),
                            float(order.delivery_address.latitude), float(order.delivery_address.longitude)
                        )
                    
                    # Calcular valor baseado no tipo de pagamento
                    if payment_type == 'PER_DELIVERY':
                        driver_earning = float(restaurant.own_driver_fixed_value or 5.00)
                    elif payment_type == 'PER_KM':
                        driver_earning = distance_km * float(restaurant.own_driver_km_value or 1.50)
                    elif payment_type == 'PERCENTAGE':
                        driver_earning = delivery_fee * (float(restaurant.own_driver_percentage or 70.0) / 100)
                    elif payment_type == 'FIXED_PLUS_DELIVERY':
                        delivery_value = float(restaurant.own_driver_delivery_value or 3.00)
                        driver_earning = float(restaurant.own_driver_fixed_value or 5.00) + delivery_value
                    elif payment_type == 'FIXED_UP_TO_PLUS_DELIVERY':
                        delivery_value = float(restaurant.own_driver_delivery_value or 3.00)
                        max_deliveries = restaurant.own_driver_max_deliveries or 10
                        from datetime import datetime as dt
                        today_start = dt.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                        deliveries_today = OwnDriverEarning.query.filter(
                            OwnDriverEarning.establishment_driver_id == driver_id,
                            OwnDriverEarning.created_at >= today_start
                        ).count()
                        if deliveries_today >= max_deliveries:
                            driver_earning = delivery_value
                        else:
                            driver_earning = 0
                    else:
                        driver_earning = float(restaurant.own_driver_fixed_value or 5.00)
                    
                    # Criar registro de ganho
                    earning = OwnDriverEarning(
                        restaurant_id=restaurant.id,
                        establishment_driver_id=driver_id,
                        order_id=order.id,
                        delivery_fee=delivery_fee,
                        driver_earning=driver_earning,
                        payment_type=payment_type,
                        distance_km=distance_km
                    )
                    db.session.add(earning)
        
        db.session.commit()
        
        return jsonify({
            'message': f'Entregador {driver.name} atribuído à rota',
            'route': route.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao atribuir entregador à rota: {e}")
        return jsonify({'error': str(e)}), 500


@route_bp.route('/<int:route_id>/add-orders', methods=['POST'])
@jwt_required()
def add_orders_to_route(route_id):
    """Adiciona pedidos a uma rota existente"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        data = request.get_json()
        order_ids = data.get('order_ids', [])
        
        if not order_ids:
            return jsonify({'error': 'Pedidos são obrigatórios'}), 400

        route = OwnDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        # Verificar pedidos
        orders = Order.query.filter(Order.id.in_(order_ids)).all()
        if len(orders) != len(order_ids):
            return jsonify({'error': 'Alguns pedidos não foram encontrados'}), 400

        # Verificar se pedidos são do mesmo restaurante da rota
        for order in orders:
            if order.restaurant_id != route.restaurant_id:
                return jsonify({'error': f'Pedido {order.order_number} não é do mesmo restaurante da rota'}), 400
            
            # Verificar se já está em outra rota ativa
            if order.own_driver_route_id and order.own_driver_route_id != route_id:
                existing_route = OwnDriverRoute.query.get(order.own_driver_route_id)
                if existing_route and existing_route.status in ['CREATED', 'PENDING', 'ACTIVE']:
                    return jsonify({'error': f'Pedido {order.order_number} já está na rota #{existing_route.id}'}), 400

        # Adicionar pedidos à rota
        stops_data = []
        for stop in route.stops:
            stops_data.append({
                'order_id': stop.order_id,
                'stop_type': stop.stop_type,
                'latitude': float(stop.latitude) if stop.latitude else None,
                'longitude': float(stop.longitude) if stop.longitude else None,
                'address': stop.address
            })
        
        for order in orders:
            # Verificar se já está na rota
            existing = OwnDriverStop.query.filter_by(route_id=route_id, order_id=order.id).first()
            if existing:
                continue
            
            if order.delivery_address:
                delivery_stop = OwnDriverStop(
                    route_id=route.id,
                    order_id=order.id,
                    stop_order=0,
                    stop_type='DELIVERY',
                    latitude=order.delivery_address.latitude,
                    longitude=order.delivery_address.longitude,
                    address=order.delivery_address.street
                )
                db.session.add(delivery_stop)
                stops_data.append({
                    'order_id': order.id,
                    'stop_type': 'DELIVERY',
                    'latitude': float(order.delivery_address.latitude) if order.delivery_address.latitude else None,
                    'longitude': float(order.delivery_address.longitude) if order.delivery_address.longitude else None,
                    'address': order.delivery_address.street
                })
                
                # Vincular pedido à rota
                order.own_driver_route_id = route.id
                
                # Se a rota já tem entregador, atribuir e calcular ganhos
                if route.establishment_driver_id:
                    order.assigned_to_own_driver = True
                    order.establishment_driver_id = route.establishment_driver_id
                    
                    restaurant = Restaurant.query.get(route.restaurant_id)
                    if restaurant:
                        # Calcular ganho (mesmo cálculo acima)
                        payment_type = restaurant.own_driver_payment_type or 'PER_DELIVERY'
                        delivery_fee = float(order.delivery_fee or 0)
                        distance_km = 0
                        
                        if order.delivery_address and order.delivery_address.latitude and restaurant.latitude:
                            distance_km = haversine_distance(
                                float(restaurant.latitude), float(restaurant.longitude),
                                float(order.delivery_address.latitude), float(order.delivery_address.longitude)
                            )
                        
                        if payment_type == 'PER_DELIVERY':
                            driver_earning = float(restaurant.own_driver_fixed_value or 5.00)
                        elif payment_type == 'PER_KM':
                            driver_earning = distance_km * float(restaurant.own_driver_km_value or 1.50)
                        elif payment_type == 'PERCENTAGE':
                            driver_earning = delivery_fee * (float(restaurant.own_driver_percentage or 70.0) / 100)
                        else:
                            driver_earning = float(restaurant.own_driver_fixed_value or 5.00)
                        
                        earning = OwnDriverEarning(
                            restaurant_id=restaurant.id,
                            establishment_driver_id=route.establishment_driver_id,
                            order_id=order.id,
                            delivery_fee=delivery_fee,
                            driver_earning=driver_earning,
                            payment_type=payment_type,
                            distance_km=distance_km
                        )
                        db.session.add(earning)

        # Re-otimizar paradas
        optimized_stops = optimize_stop_order(stops_data)
        
        for i, stop_data in enumerate(optimized_stops):
            stop = OwnDriverStop.query.filter_by(
                route_id=route.id,
                order_id=stop_data['order_id']
            ).first()
            if stop:
                stop.stop_order = i + 1
        
        # Atualizar distância e tempo
        _update_route_stats(route)
        
        db.session.commit()
        
        return jsonify({
            'message': f'{len(orders)} pedido(s) adicionado(s) à rota',
            'route': route.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao adicionar pedidos à rota: {e}")
        return jsonify({'error': str(e)}), 500


@route_bp.route('/<int:route_id>', methods=['DELETE'])
@jwt_required()
def delete_route(route_id):
    """Exclui uma rota"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        route = OwnDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        # Não permitir excluir rotas ativas
        if route.status == 'ACTIVE':
            return jsonify({'error': 'Não é possível excluir uma rota ativa'}), 400

        # Desvincular pedidos da rota
        for stop in route.stops:
            order = Order.query.get(stop.order_id)
            if order:
                order.own_driver_route_id = None
                # Se o pedido foi atribuído apenas por esta rota, desvincular entregador
                if order.assigned_to_own_driver and order.establishment_driver_id == route.establishment_driver_id:
                    order.assigned_to_own_driver = False
                    order.establishment_driver_id = None

        # Excluir paradas e rota
        for stop in route.stops:
            db.session.delete(stop)
        
        db.session.delete(route)
        db.session.commit()

        return jsonify({'message': 'Rota excluída com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao excluir rota: {e}")
        return jsonify({'error': str(e)}), 500


@route_bp.route('/<int:route_id>/remove-order', methods=['POST'])
@jwt_required()
def remove_order_from_route(route_id):
    """Remove um pedido de uma rota (torna disponível novamente)"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        data = request.get_json()
        order_id = data.get('order_id')
        if not order_id:
            return jsonify({'error': 'order_id é obrigatório'}), 400

        route = OwnDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        # Não permitir remover de rotas ativas
        if route.status == 'ACTIVE':
            return jsonify({'error': 'Não é possível remover pedidos de uma rota ativa'}), 400

        # Encontrar a parada do pedido nesta rota
        stop = OwnDriverStop.query.filter_by(route_id=route_id, order_id=order_id).first()
        if not stop:
            return jsonify({'error': 'Pedido não encontrado nesta rota'}), 404

        # Desvincular pedido da rota
        order = Order.query.get(order_id)
        if order:
            order.own_driver_route_id = None
            # Se foi atribuído apenas por esta rota, desvincular entregador
            if order.assigned_to_own_driver and order.establishment_driver_id == route.establishment_driver_id:
                order.assigned_to_own_driver = False
                order.establishment_driver_id = None

        # Remover parada
        db.session.delete(stop)

        # Reordenar paradas restantes
        remaining_stops = OwnDriverStop.query.filter_by(route_id=route_id).order_by(OwnDriverStop.stop_order).all()
        for i, s in enumerate(remaining_stops):
            s.stop_order = i + 1

        # Se rota ficou sem paradas, excluir rota
        if not remaining_stops:
            db.session.delete(route)

        db.session.commit()

        return jsonify({
            'message': f'Pedido removido da rota',
            'route': route.to_dict() if remaining_stops else None
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao remover pedido da rota: {e}")
        return jsonify({'error': str(e)}), 500


@route_bp.route('/<int:route_id>/move-order', methods=['POST'])
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

        if not order_id:
            return jsonify({'error': 'order_id é obrigatório'}), 400
        if not target_route_id:
            return jsonify({'error': 'target_route_id é obrigatório'}), 400
        if route_id == target_route_id:
            return jsonify({'error': 'Rota de origem e destino são iguais'}), 400

        source_route = OwnDriverRoute.query.get(route_id)
        if not source_route:
            return jsonify({'error': 'Rota de origem não encontrada'}), 404

        target_route = OwnDriverRoute.query.get(target_route_id)
        if not target_route:
            return jsonify({'error': 'Rota de destino não encontrada'}), 404

        # Não permitir mover de rotas ativas
        if source_route.status == 'ACTIVE':
            return jsonify({'error': 'Não é possível mover pedidos de uma rota ativa'}), 400

        # Encontrar a parada na rota de origem
        stop = OwnDriverStop.query.filter_by(route_id=route_id, order_id=order_id).first()
        if not stop:
            return jsonify({'error': 'Pedido não encontrado na rota de origem'}), 404

        # Verificar se o pedido já está na rota de destino
        existing = OwnDriverStop.query.filter_by(route_id=target_route_id, order_id=order_id).first()
        if existing:
            return jsonify({'error': 'Pedido já está na rota de destino'}), 400

        # Verificar se o pedido é do mesmo restaurante da rota de destino
        order = Order.query.get(order_id)
        if order and order.restaurant_id != target_route.restaurant_id:
            return jsonify({'error': 'Pedido não é do mesmo restaurante da rota de destino'}), 400

        # Mover parada para a rota de destino
        stop.route_id = target_route_id
        # Colocar como última parada da rota de destino
        max_order = db.session.query(db.func.max(OwnDriverStop.stop_order)).filter_by(route_id=target_route_id).scalar() or 0
        stop.stop_order = max_order + 1

        # Atualizar vínculo do pedido
        if order:
            order.own_driver_route_id = target_route_id
            # Se a rota de destino tem entregador, atribuir
            if target_route.establishment_driver_id:
                order.assigned_to_own_driver = True
                order.establishment_driver_id = target_route.establishment_driver_id

        # Reordenar paradas da rota de origem
        remaining_stops = OwnDriverStop.query.filter_by(route_id=route_id).order_by(OwnDriverStop.stop_order).all()
        for i, s in enumerate(remaining_stops):
            s.stop_order = i + 1

        # Se rota de origem ficou sem paradas, excluir
        if not remaining_stops:
            db.session.delete(source_route)

        db.session.commit()

        return jsonify({
            'message': f'Pedido movido para {target_route.name}',
            'source_route': source_route.to_dict() if remaining_stops else None,
            'target_route': target_route.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao mover pedido entre rotas: {e}")
        return jsonify({'error': str(e)}), 500


@route_bp.route('/establishment/list', methods=['GET'])
@jwt_required()
def list_establishment_routes():
    """Lista todas as rotas do estabelecimento"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        # Buscar restaurante do usuário
        from src.models.portal_models import Customer
        customer = Customer.query.filter_by(user_id=user.id).first()
        if not customer:
            return jsonify({'routes': []}), 200

        restaurant = Restaurant.query.filter_by(name=customer.name).first()
        if not restaurant:
            return jsonify({'routes': []}), 200

        # Filtrar por status se fornecido, senão mostrar todas não concluídas/canceladas
        status_filter = request.args.get('status', '')
        if status_filter:
            routes = OwnDriverRoute.query.filter_by(
                restaurant_id=restaurant.id,
                status=status_filter
            ).order_by(OwnDriverRoute.created_at.desc()).all()
        else:
            routes = OwnDriverRoute.query.filter(
                OwnDriverRoute.restaurant_id == restaurant.id,
                OwnDriverRoute.status.in_(['CREATED', 'PENDING', 'ACTIVE'])
            ).order_by(OwnDriverRoute.created_at.desc()).all()

        return jsonify({'routes': [r.to_dict() for r in routes]}), 200

    except Exception as e:
        logger.error(f"Erro ao listar rotas: {e}")
        return jsonify({'error': str(e)}), 500


@route_bp.route('/<int:route_id>/activate', methods=['POST'])
@jwt_required()
def activate_route(route_id):
    """Entregador ativa uma rota (quando vai sair para entregar)"""
    try:
        route = OwnDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        if route.status != 'PENDING':
            return jsonify({'error': 'Rota já foi ativada ou concluída'}), 400

        route.status = 'ACTIVE'
        route.started_at = datetime.utcnow()

        # Re-otimizar paradas (garantir ordem correta)
        stops_data = []
        for stop in route.stops:
            stops_data.append({
                'stop_id': stop.id,
                'order_id': stop.order_id,
                'stop_type': stop.stop_type,
                'latitude': float(stop.latitude) if stop.latitude else None,
                'longitude': float(stop.longitude) if stop.longitude else None,
                'address': stop.address
            })

        optimized_stops = optimize_stop_order(stops_data)
        
        for stop_data in optimized_stops:
            if 'stop_id' in stop_data:
                stop = OwnDriverStop.query.get(stop_data['stop_id'])
                if stop:
                    stop.stop_order = stop_data['stop_order']

        # Atualizar status dos pedidos
        for stop in route.stops:
            order = Order.query.get(stop.order_id)
            if order and order.status in [OrderStatus.PENDING, OrderStatus.SCHEDULED]:
                order.status = OrderStatus.ACCEPTED
                order.accepted_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'message': f'Rota ativada',
            'route': route.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao ativar rota: {e}")
        return jsonify({'error': str(e)}), 500


@route_bp.route('/<int:route_id>/accept', methods=['POST'])
def accept_route(route_id):
    """Entregador aceita uma rota"""
    try:
        from src.routes.own_driver import get_own_driver_from_token
        
        own_driver = get_own_driver_from_token()
        if not own_driver:
            return jsonify({'error': 'Autenticação necessária'}), 401
        
        route = OwnDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404
        
        # Verificar se a rota tem entregador atribuído
        if not route.establishment_driver_id:
            return jsonify({'error': 'Esta rota ainda não tem entregador atribuído'}), 400
        
        if route.establishment_driver_id != own_driver.id:
            return jsonify({'error': 'Esta rota não foi atribuída a você'}), 403
        
        if route.status != 'PENDING':
            return jsonify({'error': 'Rota já foi aceita ou rejeitada'}), 400
        
        route.status = 'ACTIVE'
        route.started_at = datetime.utcnow()
        
        # Re-otimizar paradas
        stops_data = []
        for stop in route.stops:
            stops_data.append({
                'stop_id': stop.id,
                'order_id': stop.order_id,
                'stop_type': stop.stop_type,
                'latitude': float(stop.latitude) if stop.latitude else None,
                'longitude': float(stop.longitude) if stop.longitude else None,
                'address': stop.address
            })
        
        optimized_stops = optimize_stop_order(stops_data)
        
        for stop_data in optimized_stops:
            if 'stop_id' in stop_data:
                stop = OwnDriverStop.query.get(stop_data['stop_id'])
                if stop:
                    stop.stop_order = stop_data['stop_order']
        
        # Atualizar status dos pedidos
        for stop in route.stops:
            order = Order.query.get(stop.order_id)
            if order and order.status in [OrderStatus.PENDING, OrderStatus.SCHEDULED]:
                order.status = OrderStatus.ACCEPTED
                order.accepted_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Rota aceita com sucesso',
            'route': route.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao aceitar rota {route_id}: {e}", exc_info=True)
        return jsonify({'error': f'Erro ao aceitar rota: {str(e)}'}), 500


@route_bp.route('/<int:route_id>/reject', methods=['POST'])
def reject_route(route_id):
    """Entregador rejeita uma rota"""
    try:
        from src.routes.own_driver import get_own_driver_from_token
        
        own_driver = get_own_driver_from_token()
        if not own_driver:
            return jsonify({'error': 'Autenticação necessária'}), 401
        
        route = OwnDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404
        
        if route.establishment_driver_id != own_driver.id:
            return jsonify({'error': 'Esta rota não foi atribuída a você'}), 403
        
        if route.status != 'PENDING':
            return jsonify({'error': 'Rota já foi aceita ou rejeitada'}), 400
        
        # Marcar rota como rejeitada
        route.status = 'REJECTED'
        
        # Desvincular pedidos da rota
        for stop in route.stops:
            order = Order.query.get(stop.order_id)
            if order:
                order.own_driver_route_id = None
                # Não desvincular o entregador - estabelecimento pode reatribuir
        
        db.session.commit()
        
        return jsonify({
            'message': 'Rota rejeitada. O estabelecimento será notificado.',
            'route': route.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao rejeitar rota: {e}")
        return jsonify({'error': str(e)}), 500


@route_bp.route('/<int:route_id>/complete-stop', methods=['POST'])
def complete_stop(route_id):
    """Marca uma parada como concluída (aceita JWT regular ou own_driver_token)"""
    try:
        # Verificar autenticação - aceitar JWT regular ou own_driver_token
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        from src.routes.own_driver import get_own_driver_from_token
        
        # Tentar JWT regular primeiro
        user = None
        own_driver = None
        
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
            if user_id:
                user = User.query.get(int(user_id))
        except:
            pass
        
        # Se não tem JWT regular, tentar own_driver_token
        if not user:
            own_driver = get_own_driver_from_token()
            if not own_driver:
                return jsonify({'error': 'Autenticação necessária'}), 401
        
        data = request.get_json()
        stop_id = data.get('stop_id')
        
        if not stop_id:
            return jsonify({'error': 'ID da parada é obrigatório'}), 400

        stop = OwnDriverStop.query.get(stop_id)
        if not stop or stop.route_id != route_id:
            return jsonify({'error': 'Parada não encontrada'}), 404

        # Verificar permissão: se for own_driver, verificar se a rota é dele
        if own_driver:
            route = OwnDriverRoute.query.get(route_id)
            if route.establishment_driver_id != own_driver.id:
                return jsonify({'error': 'Sem permissão'}), 403

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


@route_bp.route('/own-driver/active', methods=['GET'])
@own_driver_required
def get_own_driver_active_routes():
    """Obtém rotas do entregador próprio (pendentes e ativas)"""
    try:
        driver = request.own_driver

        routes = OwnDriverRoute.query.filter(
            OwnDriverRoute.establishment_driver_id == driver.id,
            OwnDriverRoute.status.in_(['PENDING', 'ACTIVE'])
        ).order_by(OwnDriverRoute.created_at.desc()).all()

        return jsonify({'routes': [r.to_dict() for r in routes]}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== ROTEIRIZAÇÃO PARA PLATAFORMA ====================

@route_bp.route('/platform/create', methods=['POST'])
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
            started_at=datetime.utcnow()
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


@route_bp.route('/platform/<int:route_id>/complete-stop', methods=['POST'])
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
        stop.completed_at = datetime.utcnow()

        # Verificar se todas as paradas foram concluídas
        route = PlatformDriverRoute.query.get(route_id)
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


@route_bp.route('/platform/active', methods=['GET'])
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
