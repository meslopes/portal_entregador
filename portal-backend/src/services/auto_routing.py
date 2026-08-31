"""
Serviço de auto-roteirização inteligente.
Analisa pedidos pendentes e cria rotas automaticamente quando vantajoso.
"""
from src.models.portal_models import (
    db, Order, OrderStatus, Driver, Restaurant, User, UserStatus,
    PlatformDriverRoute, PlatformDriverStop, RouteSettings
)
from src.utils.geo import haversine_distance
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


def get_route_settings(tenant_id=None):
    """Obtém configurações de roteirização"""
    settings = RouteSettings.query.filter_by(tenant_id=tenant_id).first()
    if not settings:
        settings = RouteSettings(tenant_id=tenant_id)
        db.session.add(settings)
        db.session.commit()
    return settings


def get_pending_orders(tenant_id=None, settings=None):
    """Obtém pedidos pendentes prontos para entrega baseado nas configurações"""
    if not settings:
        settings = get_route_settings(tenant_id)
    
    # Determinar quais status incluir
    statuses = []
    if settings.include_ready:
        statuses.append(OrderStatus.READY)
    if settings.include_preparing:
        statuses.append(OrderStatus.PREPARING)
    if settings.include_accepted:
        statuses.append(OrderStatus.ACCEPTED)
    if settings.include_pending:
        statuses.append(OrderStatus.PENDING)
    
    # Incluir agendados se configurado
    if settings.include_scheduled:
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        advance_time = now + timedelta(minutes=settings.scheduled_advance_min)
        
        # Buscar agendados que devem ser preparados em breve
        scheduled_orders = Order.query.filter(
            Order.status == OrderStatus.SCHEDULED,
            Order.scheduled_at <= advance_time,
            Order.driver_id.is_(None),
            Order.assigned_to_own_driver == False
        )
        if tenant_id:
            scheduled_orders = scheduled_orders.filter(Order.tenant_id == tenant_id)
        
        scheduled_list = scheduled_orders.all()
    else:
        scheduled_list = []
    
    if not statuses:
        return scheduled_list
    
    query = Order.query.filter(
        Order.status.in_(statuses),
        Order.driver_id.is_(None),  # Sem entregador da plataforma
        Order.assigned_to_own_driver == False  # Sem entregador próprio
    )
    
    if tenant_id:
        query = query.filter(Order.tenant_id == tenant_id)
    
    return query.all() + scheduled_list


def get_available_drivers(tenant_id=None):
    """Obtém entregadores da plataforma disponíveis"""
    query = Driver.query.join(User).filter(
        Driver.is_online == True,
        User.status == UserStatus.ACTIVE
    )
    
    if tenant_id:
        query = query.filter(Driver.tenant_id == tenant_id)
    
    return query.all()


def calculate_driver_load(driver):
    """Calcula carga atual do entregador (pedidos ativos)"""
    active_orders = Order.query.filter(
        Order.driver_id == driver.id,
        Order.status.in_([
            OrderStatus.OFFERED, OrderStatus.ACCEPTED,
            OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.PICKED_UP
        ])
    ).count()
    return active_orders


def calculate_driver_position(driver):
    """Obtém posição atual do entregador"""
    if driver.current_latitude and driver.current_longitude:
        return (float(driver.current_latitude), float(driver.current_longitude))
    return None


def estimate_delivery_time(order, driver_pos=None):
    """Estima tempo de entrega para um pedido"""
    if not order.restaurant or not order.delivery_address:
        return 30  # Default 30 minutos
    
    rest_lat = float(order.restaurant.latitude)
    rest_lng = float(order.restaurant.longitude)
    del_lat = float(order.delivery_address.latitude) if order.delivery_address.latitude else None
    del_lng = float(order.delivery_address.longitude) if order.delivery_address.longitude else None
    
    if not del_lat or not del_lng:
        return 30
    
    # Distância restaurante → entrega
    distance = haversine_distance(rest_lat, rest_lng, del_lat, del_lng)
    
    # Tempo estimado: 2 min/km + 5 min de preparo
    time_min = distance * 2 + 5
    
    # Se tem posição do entregador, adicionar distância até restaurante
    if driver_pos:
        dist_to_rest = haversine_distance(
            driver_pos[0], driver_pos[1], rest_lat, rest_lng
        )
        time_min += dist_to_rest * 2
    
    return max(10, min(60, time_min))


def calculate_clusterization(orders):
    """Calcula quão agrupados estão os pedidos (0-1)"""
    if len(orders) <= 1:
        return 1.0
    
    # Coletar pontos de entrega
    points = []
    for order in orders:
        if order.delivery_address and order.delivery_address.latitude:
            points.append((
                float(order.delivery_address.latitude),
                float(order.delivery_address.longitude)
            ))
    
    if len(points) <= 1:
        return 1.0
    
    # Calcular centroide
    centroid_lat = sum(p[0] for p in points) / len(points)
    centroid_lng = sum(p[1] for p in points) / len(points)
    
    # Calcular distância média ao centroide
    avg_distance = sum(
        haversine_distance(p[0], p[1], centroid_lat, centroid_lng)
        for p in points
    ) / len(points)
    
    # Normalizar: 0km = 1.0, 10km = 0.0
    clusterization = max(0, 1 - (avg_distance / 10))
    
    return clusterization


def find_best_driver(orders, available_drivers, settings):
    """Encontra o melhor entregador para uma rota"""
    if not available_drivers:
        return None
    
    best_driver = None
    best_score = float('inf')
    
    # Calcular centroid dos pedidos
    points = []
    for order in orders:
        if order.delivery_address and order.delivery_address.latitude:
            points.append((
                float(order.delivery_address.latitude),
                float(order.delivery_address.longitude)
            ))
    
    if not points:
        return available_drivers[0] if available_drivers else None
    
    centroid_lat = sum(p[0] for p in points) / len(points)
    centroid_lng = sum(p[1] for p in points) / len(points)
    
    for driver in available_drivers:
        driver_pos = calculate_driver_position(driver)
        if not driver_pos:
            continue
        
        # Fator 1: Carga atual (menor é melhor)
        load = calculate_driver_load(driver)
        load_score = load * 10  # 10 pontos por pedido ativo
        
        # Fator 2: Distância até o centroid (menor é melhor)
        distance_to_centroid = haversine_distance(
            driver_pos[0], driver_pos[1], centroid_lat, centroid_lng
        )
        distance_score = distance_to_centroid * 2
        
        # Fator 3: Se já está indo na direção (bônus)
        # Verificar se tem pedido ativo na mesma direção
        direction_bonus = 0
        active_orders = Order.query.filter(
            Order.driver_id == driver.id,
            Order.status.in_([OrderStatus.PICKED_UP, OrderStatus.ACCEPTED])
        ).all()
        
        for active_order in active_orders:
            if active_order.delivery_address and active_order.delivery_address.latitude:
                active_lat = float(active_order.delivery_address.latitude)
                active_lng = float(active_order.delivery_address.longitude)
                
                # Calcular se centroid está na mesma direção
                # Simplificação: se a distância do entregador ao centroid é menor
                # que a distância do entregador à entrega ativa + distância da entrega ativa ao centroid
                dist_to_active = haversine_distance(
                    driver_pos[0], driver_pos[1], active_lat, active_lng
                )
                dist_active_to_centroid = haversine_distance(
                    active_lat, active_lng, centroid_lat, centroid_lng
                )
                
                if distance_to_centroid < dist_to_active + dist_active_to_centroid:
                    direction_bonus = -5  # Bônus por estar na direção
        
        # Score total (menor é melhor)
        total_score = load_score + distance_score + direction_bonus
        
        if total_score < best_score:
            best_score = total_score
            best_driver = driver
    
    return best_driver


def optimize_route_order(orders, driver_pos=None):
    """
    Otimiza ordem das paradas usando algoritmo direção-aware.
    Considera pickups e deliveries com precedência.
    """
    if not orders:
        return []
    
    # Criar lista de paradas (pickup + delivery para cada pedido)
    stops = []
    for order in orders:
        if order.restaurant and order.restaurant.latitude:
            stops.append({
                'type': 'PICKUP',
                'order_id': order.id,
                'lat': float(order.restaurant.latitude),
                'lng': float(order.restaurant.longitude),
                'address': order.restaurant.address,
                'restaurant_id': order.restaurant_id
            })
        
        if order.delivery_address and order.delivery_address.latitude:
            stops.append({
                'type': 'DELIVERY',
                'order_id': order.id,
                'lat': float(order.delivery_address.latitude),
                'lng': float(order.delivery_address.longitude),
                'address': order.delivery_address.street,
                'restaurant_id': None
            })
    
    if not stops:
        return []
    
    # Algoritmo direção-aware
    optimized = []
    remaining = list(stops)
    current_pos = driver_pos or (stops[0]['lat'], stops[0]['lng'])
    picked_up_orders = set()
    
    while remaining:
        # Filtrar paradas válidas
        valid_stops = []
        for stop in remaining:
            if stop['type'] == 'PICKUP':
                valid_stops.append(stop)
            elif stop['type'] == 'DELIVERY' and stop['order_id'] in picked_up_orders:
                valid_stops.append(stop)
        
        if not valid_stops:
            # Se não há paradas válidas, adicionar pickups restantes
            valid_stops = [s for s in remaining if s['type'] == 'PICKUP']
        
        if not valid_stops:
            break
        
        # Calcular centroid das paradas restantes
        centroid_lat = sum(s['lat'] for s in valid_stops) / len(valid_stops)
        centroid_lng = sum(s['lng'] for s in valid_stops) / len(valid_stops)
        
        # Encontrar melhor parada
        best_stop = None
        best_score = float('inf')
        
        for stop in valid_stops:
            distance = haversine_distance(
                current_pos[0], current_pos[1],
                stop['lat'], stop['lng']
            )
            
            # Calcular direção
            to_stop = (stop['lat'] - current_pos[0], stop['lng'] - current_pos[1])
            to_centroid = (centroid_lat - current_pos[0], centroid_lng - current_pos[1])
            
            # Produto escalar para similaridade de direção
            dot_product = to_stop[0] * to_centroid[0] + to_stop[1] * to_centroid[1]
            mag_stop = (to_stop[0]**2 + to_stop[1]**2)**0.5
            mag_centroid = (to_centroid[0]**2 + to_centroid[1]**2)**0.5
            
            if mag_stop > 0 and mag_centroid > 0:
                direction_similarity = dot_product / (mag_stop * mag_centroid)
            else:
                direction_similarity = 0
            
            # Score: distância * fator_direção
            direction_factor = 2 - max(0, direction_similarity)
            score = distance * direction_factor
            
            if score < best_score:
                best_score = score
                best_stop = stop
        
        if best_stop:
            optimized.append(best_stop)
            remaining.remove(best_stop)
            current_pos = (best_stop['lat'], best_stop['lng'])
            
            if best_stop['type'] == 'PICKUP':
                picked_up_orders.add(best_stop['order_id'])
    
    return optimized


def should_create_route(orders, available_drivers, settings):
    """Decide se deve criar uma rota automática"""
    if len(orders) <= 1:
        return False, "Poucos pedidos"
    
    if not available_drivers:
        return False, "Sem entregadores disponíveis"
    
    # Verificar clusterização
    clusterization = calculate_clusterization(orders)
    if clusterization < float(settings.min_clusterization):
        return False, f"Pedidos muito dispersos ({clusterization:.0%})"
    
    # Verificar distância máxima entre pedidos
    max_distance = 0
    for i, order1 in enumerate(orders):
        for order2 in orders[i+1:]:
            if (order1.delivery_address and order1.delivery_address.latitude and
                order2.delivery_address and order2.delivery_address.latitude):
                dist = haversine_distance(
                    float(order1.delivery_address.latitude),
                    float(order1.delivery_address.longitude),
                    float(order2.delivery_address.latitude),
                    float(order2.delivery_address.longitude)
                )
                max_distance = max(max_distance, dist)
    
    if max_distance > float(settings.max_distance_km):
        return False, f"Distância máxima excedida ({max_distance:.1f}km)"
    
    # Estimar tempo individual vs roteirizado
    total_individual_time = sum(
        estimate_delivery_time(order) for order in orders
    )
    
    # Estimar tempo roteirizado (simplificado)
    # Considerando 1.5x o tempo da distância total
    total_route_distance = 0
    for i, order in enumerate(orders):
        if i < len(orders) - 1:
            next_order = orders[i + 1]
            if (order.delivery_address and order.delivery_address.latitude and
                next_order.delivery_address and next_order.delivery_address.latitude):
                total_route_distance += haversine_distance(
                    float(order.delivery_address.latitude),
                    float(order.delivery_address.longitude),
                    float(next_order.delivery_address.latitude),
                    float(next_order.delivery_address.longitude)
                )
    
    routed_time = total_route_distance * 3 + len(orders) * 5  # 3 min/km + 5 min por parada
    
    time_saved = total_individual_time - routed_time
    
    if time_saved < settings.min_time_savings_min:
        return False, f"Economia insuficiente ({time_saved:.0f}min)"
    
    return True, f"Rota vantajosa: {time_saved:.0f}min economizados"


def create_auto_route(orders, driver, settings):
    """Cria uma rota automática"""
    try:
        # Otimizar ordem das paradas
        driver_pos = calculate_driver_position(driver)
        optimized_stops = optimize_route_order(orders, driver_pos)
        
        # Criar rota
        route = PlatformDriverRoute(
            driver_id=driver.id,
            status='PENDING'
        )
        db.session.add(route)
        db.session.flush()
        
        # Criar paradas
        for i, stop_data in enumerate(optimized_stops):
            stop = PlatformDriverStop(
                route_id=route.id,
                order_id=stop_data['order_id'],
                stop_order=i + 1,
                stop_type=stop_data['type'],
                latitude=stop_data['lat'],
                longitude=stop_data['lng'],
                address=stop_data['address'],
                restaurant_id=stop_data.get('restaurant_id')
            )
            db.session.add(stop)
        
        # Atualizar pedidos
        for order in orders:
            order.platform_route_id = route.id
            order.driver_id = driver.id
            order.status = OrderStatus.OFFERED
            order.offered_at = datetime.utcnow()
        
        # Enviar notificações
        if settings.notify_driver_auto_route:
            from src.models.portal_models import Notification, NotificationType
            notification = Notification(
                user_id=driver.user_id,
                title='Nova Rota Automática',
                message=f'Você recebeu uma rota com {len(orders)} pedidos',
                type=NotificationType.NEW_ORDER,
                related_id=route.id
            )
            db.session.add(notification)
        
        if settings.notify_admin_auto_route:
            from src.models.portal_models import Notification, NotificationType, User, UserType
            # Notificar admins do tenant
            tenant_id = orders[0].tenant_id if orders[0].tenant_id else None
            admins = User.query.filter_by(
                user_type=UserType.ADMIN,
                tenant_id=tenant_id
            ).all()
            
            for admin in admins:
                notification = Notification(
                    user_id=admin.id,
                    title='Rota Automática Criada',
                    message=f'Rota #{route.id} criada para {driver.user.first_name} com {len(orders)} pedidos',
                    type=NotificationType.SYSTEM,
                    related_id=route.id
                )
                db.session.add(notification)
        
        db.session.commit()
        
        logger.info(f"[AUTO-ROUTE] Rota #{route.id} criada para {driver.user.first_name} com {len(orders)} pedidos")
        
        return route
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"[AUTO-ROUTE] Erro ao criar rota: {e}")
        return None


def run_auto_routing(tenant_id=None):
    """Executa análise de auto-roteirização"""
    try:
        settings = get_route_settings(tenant_id)
        
        if not settings.auto_routing_enabled:
            return {'status': 'disabled', 'message': 'Auto-roteirização desabilitada'}
        
        # Obter pedidos pendentes (usando configurações de status)
        orders = get_pending_orders(tenant_id, settings)
        
        if not orders:
            return {'status': 'no_orders', 'message': 'Nenhum pedido pendente'}
        
        # Obter entregadores disponíveis
        drivers = get_available_drivers(tenant_id)
        
        if not drivers:
            return {'status': 'no_drivers', 'message': 'Nenhum entregador disponível'}
        
        # Limitar ao máximo de pedidos por rota
        max_orders = settings.max_orders_auto
        orders = orders[:max_orders]
        
        # Verificar se deve criar rota
        should_create, reason = should_create_route(orders, drivers, settings)
        
        if not should_create:
            return {'status': 'skip', 'message': reason}
        
        # Encontrar melhor entregador
        best_driver = find_best_driver(orders, drivers, settings)
        
        if not best_driver:
            return {'status': 'no_driver', 'message': 'Nenhum entregador adequado'}
        
        # Criar rota
        route = create_auto_route(orders, best_driver, settings)
        
        if route:
            return {
                'status': 'created',
                'message': f'Rota #{route.id} criada para {best_driver.user.first_name}',
                'route_id': route.id,
                'driver_name': best_driver.user.first_name,
                'orders_count': len(orders)
            }
        else:
            return {'status': 'error', 'message': 'Erro ao criar rota'}
            
    except Exception as e:
        logger.error(f"[AUTO-ROUTE] Erro na análise: {e}")
        return {'status': 'error', 'message': str(e)}
