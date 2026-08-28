from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.portal_models import (
    Order, Restaurant, Customer, Address, Driver, EstablishmentDriver, OwnDriverEarning, User, UserType,
    OrderStatus, PaymentMethod, Delivery, Notification, NotificationType, db
)
from src.utils.tenant import get_current_user, get_current_tenant_id, filter_by_tenant, add_tenant_to_data
from src.utils.geo import haversine_distance
from sqlalchemy import func
from datetime import datetime, timedelta
import uuid
import os
import base64
import re
import random
import logging

logger = logging.getLogger(__name__)


from src.utils.restaurant import find_restaurant_by_name


def get_driver_percentage(order):
    """Retorna o percentual do entregador (0.0 a 1.0) baseado na configuração do restaurante"""
    from src.models.portal_models import PricingTable, Square
    if order.restaurant and order.restaurant.pricing_table_id:
        pt = PricingTable.query.get(order.restaurant.pricing_table_id)
        if pt and pt.driver_percentage:
            return float(pt.driver_percentage) / 100.0
    if order.restaurant and order.restaurant.square_id:
        sq = Square.query.get(order.restaurant.square_id)
        if sq and sq.driver_percentage:
            return float(sq.driver_percentage) / 100.0
    return 0.70


def send_platform_callback(order, new_status):
    """Envia callback para plataforma externa quando status do pedido muda"""
    if not order.platform_source or not order.external_id:
        return
    
    try:
        if order.platform_source == 'IFOOD':
            from src.services.ifood_service import update_status as ifood_update_status
            from src.models.portal_models import PlatformCredential
            
            ifood_status = INTERNAL_TO_IFOOD_MAP.get(new_status)
            if not ifood_status:
                return
            
            # Buscar credenciais do restaurante
            cred = PlatformCredential.query.filter_by(
                restaurant_id=order.restaurant_id,
                platform='IFOOD',
                is_active=True
            ).first()
            
            if cred and cred.access_token:
                result = ifood_update_status(cred.access_token, order.external_id, ifood_status)
                if not result.get('success'):
                    logger.warning(f"Callback iFood falhou para pedido {order.order_number}: {result.get('error')}")
    except Exception as e:
        logger.warning(f"Erro ao enviar callback para plataforma: {e}")


# Mapeamento de status interno → iFood para callbacks
INTERNAL_TO_IFOOD_MAP = {
    'ACCEPTED': 'CONFIRMED',
    'PREPARING': 'PREPARING',
    'READY': 'READY_TO_DELIVER',
    'PICKED_UP': 'DISPATCHED',
    'DELIVERED': 'DELIVERED',
    'CANCELLED': 'CANCELLED'
}


def find_nearest_own_driver(order, exclude_driver_id=None):
    """Encontra o entregador próprio online mais próximo do restaurante"""
    restaurant = order.restaurant
    if not restaurant or not restaurant.has_own_drivers:
        return None

    online_drivers = EstablishmentDriver.query.filter(
        EstablishmentDriver.restaurant_id == restaurant.id,
        EstablishmentDriver.is_online == True,
        EstablishmentDriver.is_active == True
    ).all()

    # Excluir entregador que rejeitou
    if exclude_driver_id:
        online_drivers = [d for d in online_drivers if d.id != exclude_driver_id]

    if not online_drivers:
        return None

    # Se o restaurante tem coordenadas, encontra o mais próximo
    if restaurant.latitude and restaurant.longitude and order.delivery_address and order.delivery_address.latitude:
        # Ordena por distância até o restaurante (para pegada rápida)
        # Se o entregador tem localização, usa distância real; senão, pega o primeiro disponível
        drivers_with_location = [d for d in online_drivers if d.current_latitude and d.current_longitude]
        if drivers_with_location:
            def driver_distance(d):
                return haversine_distance(
                    float(restaurant.latitude), float(restaurant.longitude),
                    float(d.current_latitude), float(d.current_longitude)
                )
            drivers_with_location.sort(key=driver_distance)
            return drivers_with_location[0]

    # Fallback: retorna o primeiro online disponível
    return online_drivers[0]


def process_scheduled_orders():
    """Converte pedidos SCHEDULED para PENDING quando o tempo de preparo expirou"""
    try:
        now = datetime.utcnow()
        scheduled_orders = Order.query.filter(
            Order.status == OrderStatus.SCHEDULED,
            Order.scheduled_at <= now
        ).all()
        
        for order in scheduled_orders:
            order.status = OrderStatus.PENDING
            order.updated_at = now
            
            # Calcula distância e ganhos
            km_total = 0
            driver_pct = get_driver_percentage(order)
            delivery_fee = float(order.delivery_fee or 0)
            driver_earnings = delivery_fee * driver_pct
            if order.delivery_address and order.restaurant and order.delivery_address.latitude and order.restaurant.latitude:
                km_total = haversine_distance(
                    order.restaurant.latitude, order.restaurant.longitude,
                    order.delivery_address.latitude, order.delivery_address.longitude
                )
                driver_earnings = delivery_fee * driver_pct + (km_total * 0.5)
            
            order_info = {
                'order_number': order.order_number,
                'restaurant': order.restaurant.name if order.restaurant else 'N/A',
                'restaurant_address': order.restaurant.address if order.restaurant else 'N/A',
                'customer_name': order.customer.name if order.customer else 'N/A',
                'delivery_address': f"{order.delivery_address.street}, {order.delivery_address.neighborhood}" if order.delivery_address else 'N/A',
                'total_amount': float(order.total_amount or 0),
                'delivery_fee': delivery_fee,
                'distance_km': km_total,
                'driver_earnings': driver_earnings
            }
            
            # === HÍBRIDO: Tenta entregadores próprios primeiro ===
            own_driver = find_nearest_own_driver(order)
            if own_driver:
                # Oferece ao entregador próprio (não aceita automaticamente)
                order.assigned_to_own_driver = True
                order.establishment_driver_id = own_driver.id
                order.status = OrderStatus.OFFERED  # Aguardando aceite
                order.offered_at = now
                order.offer_attempts = 1
                
                logger.info(f"[HYBRID] Pedido {order.order_number} oferecido ao entregador próprio {own_driver.name}")
                
                # Cálculo de ganhos do entregador próprio
                restaurant = order.restaurant
                payment_type = restaurant.own_driver_payment_type or 'PER_DELIVERY'
                own_driver_earning_value = float(restaurant.own_driver_fixed_value or 5.00)
                
                if payment_type == 'PER_KM':
                    own_driver_earning_value = km_total * float(restaurant.own_driver_km_value or 1.50)
                elif payment_type == 'PERCENTAGE':
                    own_driver_earning_value = float(order.delivery_fee) * (float(restaurant.own_driver_percentage or 70) / 100.0)
                elif payment_type == 'FIXED_PLUS_DELIVERY':
                    # Valor fixo + valor por entrega
                    delivery_value = float(restaurant.own_driver_delivery_value or 3.00)
                    own_driver_earning_value = float(restaurant.own_driver_fixed_value or 5.00) + delivery_value
                elif payment_type == 'FIXED_UP_TO_PLUS_DELIVERY':
                    # Valor fixo (até X entregas) + valor por entrega extra
                    # O cálculo do "excedente" é feito no pagamento, não por pedido
                    # Aqui registramos apenas o valor por entrega extra
                    delivery_value = float(restaurant.own_driver_delivery_value or 3.00)
                    max_deliveries = restaurant.own_driver_max_deliveries or 10
                    # Contar entregas do dia para saber se excedeu
                    from datetime import datetime as dt
                    today_start = dt.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                    deliveries_today = OwnDriverEarning.query.filter(
                        OwnDriverEarning.establishment_driver_id == own_driver.id,
                        OwnDriverEarning.created_at >= today_start
                    ).count()
                    if deliveries_today >= max_deliveries:
                        own_driver_earning_value = delivery_value
                    else:
                        own_driver_earning_value = 0  # Dentro do pacote fixo
                
                earning = OwnDriverEarning(
                    restaurant_id=restaurant.id,
                    establishment_driver_id=own_driver.id,
                    order_id=order.id,
                    delivery_fee=order.delivery_fee,
                    driver_earning=own_driver_earning_value,
                    payment_type=restaurant.own_driver_payment_type or 'PER_DELIVERY',
                    distance_km=km_total
                )
                db.session.add(earning)
                continue  # Próximo pedido
            
            # === FALLBACK: Sem entregadores próprios online, distribui para plataforma ===
            if order.distribution_method == 'broadcast':
                # Broadcast: notifica TODOS os drivers online
                notify_all_drivers(order, order_info)
            elif order.distribution_method == 'queue':
                # Fila ordenada: próximo da fila
                next_driver = find_next_in_queue(order)
                if next_driver:
                    try:
                        from src.services.whatsapp import whatsapp_service
                        if whatsapp_service.is_configured() and next_driver.user.phone:
                            whatsapp_service.send_new_order_to_driver(
                                next_driver.user.phone, order_info
                            )
                    except Exception:
                        pass
            else:
                # Padrão: notifica o mais próximo e oferta somente a ele
                notified_driver = find_nearest_available_driver(order)
                if notified_driver:
                    # Oferta ao entregador mais próximo (via special_instructions)
                    offer_ts = int(datetime.utcnow().timestamp())
                    offer_tag = f"|OFFERED_TO_{notified_driver.id}_{offer_ts}|"
                    current_si = order.special_instructions or ''
                    # Remove ofertas antigas antes de adicionar nova
                    current_si = re.sub(r'\|?OFFERED_TO_\d+(?:_\d+)?\|?', '', current_si).strip('|')
                    order.special_instructions = f"|{current_si}{offer_tag}" if current_si else offer_tag
                    try:
                        from src.services.whatsapp import whatsapp_service
                        if whatsapp_service.is_configured() and notified_driver.user.phone:
                            whatsapp_service.send_new_order_to_driver(
                                notified_driver.user.phone, order_info
                            )
                    except Exception:
                        pass
        
        if scheduled_orders:
            db.session.commit()
            
    except Exception as e:
        logger.error(f"Erro ao processar pedidos agendados: {e}")
        db.session.rollback()


def process_expired_offers():
    """Processa ofertas expiradas - ciclo automático de atribuição de pedidos"""
    try:
        from src.models.portal_models import SystemConfig
        
        # Busca configuração de timeout (default 60 segundos)
        timeout_config = SystemConfig.query.filter_by(config_key='driver_offer_timeout_seconds').first()
        timeout_seconds = int(timeout_config.config_value) if timeout_config else 60
        
        # Busca TODOS os pedidos PENDING sem driver (não apenas os com oferta)
        pending_orders = Order.query.filter(
            Order.status == OrderStatus.PENDING,
            Order.driver_id.is_(None)
        ).all()
        
        now = datetime.utcnow()
        now_ts = int(now.timestamp())
        
        logger.debug(f"[PROCESS_EXPIRED] Checking {len(pending_orders)} pending orders, timeout={timeout_seconds}s")
        
        for order in pending_orders:
            si = order.special_instructions or ''
            
            # Extrai timestamp da oferta (formato: OFFERED_TO_{driver_id}_{timestamp})
            offer_match = re.search(r'OFFERED_TO_(\d+)(?:_(\d+))?', si)
            
            # Se não tem oferta, precisa oferecer a alguém
            if not offer_match:
                logger.debug(f"[PROCESS_EXPIRED] Order #{order.order_number} has no offer, finding driver")
                # Busca próximo entregador
                next_driver = find_nearest_available_driver(order)
                if next_driver:
                    offer_ts = int(now.timestamp())
                    offer_tag = f"OFFERED_TO_{next_driver.id}_{offer_ts}"
                    order.special_instructions = f"{si}|{offer_tag}" if si else offer_tag
                    
                    # Notifica no app
                    try:
                        notification = Notification(
                            user_id=next_driver.user_id,
                            title="Novo pedido disponível",
                            message=f"Pedido #{order.order_number} está disponível para entrega",
                            type=NotificationType.NEW_ORDER,
                            related_id=order.id
                        )
                        db.session.add(notification)
                    except Exception:
                        pass
                    
                    logger.info(f"[PROCESS_EXPIRED] Order #{order.order_number} offered to {next_driver.user.first_name}")
                continue
            
            expired_driver_id = int(offer_match.group(1))
            offer_ts = int(offer_match.group(2)) if offer_match.group(2) else None
            
            # Se não tem timestamp, usa updated_at como fallback
            if offer_ts is None:
                if order.updated_at:
                    offer_ts = int(order.updated_at.timestamp())
                else:
                    continue
            
            elapsed = now_ts - offer_ts
            
            logger.info(f"[PROCESS_EXPIRED] Order #{order.order_number}: offered to driver {expired_driver_id}, elapsed={elapsed}s, timeout={timeout_seconds}s")
            
            if elapsed >= timeout_seconds:
                logger.info(f"[PROCESS_EXPIRED] Order #{order.order_number}: TIMEOUT! elapsed={elapsed}s >= {timeout_seconds}s")
                # Oferta expirou - marca como timeout e move para próximo
                offer_match = re.search(r'OFFERED_TO_(\d+)', order.special_instructions or '')
                if offer_match:
                    expired_driver_id = int(offer_match.group(1))
                    
                    # Adiciona TIMEOUT como recusa para ranking
                    timeout_tag = f"TIMEOUT_BY_{expired_driver_id}"
                    current_si = order.special_instructions or ''
                    if timeout_tag not in current_si:
                        order.special_instructions = f"{current_si}|{timeout_tag}" if current_si else timeout_tag
                    
                    # Coleta todos os IDs que já recusaram/timeout
                    rejected_ids = []
                    if order.special_instructions:
                        for match in re.finditer(r'REJECTED_BY_(\d+)', order.special_instructions):
                            rejected_ids.append(int(match.group(1)))
                        for match in re.finditer(r'TIMEOUT_BY_(\d+)', order.special_instructions):
                            rid = int(match.group(1))
                            if rid not in rejected_ids:
                                rejected_ids.append(rid)
                    
                    # Remove ofertas antigas
                    si = order.special_instructions or ''
                    si = re.sub(r'\|?OFFERED_TO_\d+(?:_\d+)?', '', si).strip('|')
                    order.special_instructions = si
                    
                    # Busca próximo entregador
                    next_driver = find_nearest_available_driver(order, exclude_driver_ids=rejected_ids)
                    
                    if next_driver:
                        # Oferece ao próximo
                        offer_ts = int(datetime.utcnow().timestamp())
                        offer_tag = f"OFFERED_TO_{next_driver.id}_{offer_ts}"
                        current_si = order.special_instructions or ''
                        # Remove ofertas antigas antes de adicionar nova
                        current_si = re.sub(r'\|?OFFERED_TO_\d+(?:_\d+)?', '', current_si).strip('|')
                        order.special_instructions = f"{current_si}|{offer_tag}" if current_si else offer_tag
                        
                        # Notifica no app
                        try:
                            notification = Notification(
                                user_id=next_driver.user_id,
                                title="Novo pedido disponível",
                                message=f"Pedido #{order.order_number} está disponível para entrega",
                                type=NotificationType.NEW_ORDER,
                                related_id=order.id
                            )
                            db.session.add(notification)
                        except Exception:
                            pass
                        
                        # WhatsApp
                        try:
                            from src.services.whatsapp import whatsapp_service
                            if whatsapp_service.is_configured() and next_driver.user.phone:
                                restaurant = order.restaurant
                                km_total = 0
                                driver_pct = get_driver_percentage(order)
                                driver_earnings = float(order.delivery_fee) * driver_pct
                                if order.delivery_address and order.delivery_address.latitude and restaurant and restaurant.latitude:
                                    km_total = haversine_distance(
                                        restaurant.latitude, restaurant.longitude,
                                        order.delivery_address.latitude, order.delivery_address.longitude
                                    )
                                    driver_earnings = float(order.delivery_fee) * driver_pct + (km_total * 0.5)
                                
                                whatsapp_service.send_new_order_to_driver(
                                    next_driver.user.phone,
                                    {
                                        'order_number': order.order_number,
                                        'restaurant': restaurant.name if restaurant else 'N/A',
                                        'restaurant_address': restaurant.address if restaurant else 'N/A',
                                        'customer_name': order.customer.name if order.customer else 'N/A',
                                        'delivery_address': f"{order.delivery_address.street}, {order.delivery_address.neighborhood}" if order.delivery_address else 'N/A',
                                        'total_amount': float(order.total_amount),
                                        'delivery_fee': float(order.delivery_fee),
                                        'distance_km': km_total,
                                        'driver_earnings': driver_earnings
                                    }
                                )
                        except Exception:
                            pass
                        
                        # Conta falhas para notificação admin
                        rejection_count = len(re.findall(r'REJECTED_BY_(\d+)', order.special_instructions or ''))
                        timeout_count = len(re.findall(r'TIMEOUT_BY_(\d+)', order.special_instructions or ''))
                        total_failures = rejection_count + timeout_count
                        
                        # Notifica admin se muitas falhas (mesmo com próximo entregador disponível)
                        if total_failures >= 2:
                            _notify_admin_pending_order(order, total_failures, now)
                        
                        logger.info(f"[AUTO] Pedido #{order.order_number} oferecido a {next_driver.user.first_name} (tentativa {total_failures + 1})")
                    else:
                        # Nenhum entregador disponível - notifica admin
                        rejection_count = len(re.findall(r'REJECTED_BY_(\d+)', order.special_instructions or ''))
                        timeout_count = len(re.findall(r'TIMEOUT_BY_(\d+)', order.special_instructions or ''))
                        total_failures = rejection_count + timeout_count
                        _notify_admin_pending_order(order, total_failures, now)
                    
                    # Reseta timestamp para nova oferta
                    order.updated_at = now
        
        db.session.commit()
        
    except Exception as e:
        logger.error(f"Erro ao processar ofertas expiradas: {e}")
        db.session.rollback()


def _notify_admin_pending_order(order, failure_count, now):
    """Notifica admin sobre pedido pendente há muito tempo"""
    try:
        # Evita notificar repetidamente (máximo a cada 120 segundos)
        last_notify_match = re.search(r'ADMIN_NOTIFIED_AT_(\d+)', order.special_instructions or '')
        if last_notify_match:
            last_notify_ts = int(last_notify_match.group(1))
            if (int(now.timestamp()) - last_notify_ts) < 120:
                return
        
        # Marca notificação
        si = order.special_instructions or ''
        si = re.sub(r'\|?ADMIN_NOTIFIED_AT_\d+', '', si).strip('|')
        si = f"{si}|ADMIN_NOTIFIED_AT_{int(now.timestamp())}" if si else f"ADMIN_NOTIFIED_AT_{int(now.timestamp())}"
        order.special_instructions = si
        
        # Notifica admin no app
        from src.models.portal_models import User, UserType
        admin_users = User.query.filter_by(
            user_type=UserType.ADMIN,
            tenant_id=order.tenant_id
        ).all()
        
        for admin in admin_users:
            try:
                notification = Notification(
                    user_id=admin.id,
                    title="⚠️ Pedido pendente",
                    message=f"Pedido #{order.order_number} - {failure_count} tentativas sem sucesso. Verifique o painel.",
                    type=NotificationType.NEW_ORDER,
                    related_id=order.id
                )
                db.session.add(notification)
            except Exception:
                pass
        
        logger.info(f"[ADMIN NOTIFY] Pedido #{order.order_number} - {failure_count} falhas, admin notificado")
        
    except Exception as e:
        logger.error(f"Erro ao notificar admin: {e}")


def notify_all_drivers(order, order_info):
    """Notifica todos os drivers online sobre um novo pedido (broadcast)"""
    try:
        from src.services.whatsapp import whatsapp_service
        
        # Busca todos os drivers online do tenant
        query = Driver.query.filter(
            Driver.is_online == True,
            Driver.current_latitude.isnot(None)
        )
        if order.tenant_id:
            query = query.filter(Driver.tenant_id == order.tenant_id)
        
        online_drivers = query.join(User).all()
        
        for driver in online_drivers:
            try:
                if whatsapp_service.is_configured() and driver.user.phone:
                    whatsapp_service.send_new_order_to_driver(
                        driver.user.phone, order_info
                    )
            except Exception:
                continue
    except Exception as e:
        logger.error(f"Erro ao notificar drivers (broadcast): {e}")


def find_next_in_queue(order):
    """Encontra o próximo driver na fila ordenada (global ou por estabelecimento)"""
    try:
        # Busca drivers online do tenant
        query = Driver.query.filter(
            Driver.is_online == True,
            Driver.current_latitude.isnot(None)
        )
        if order.tenant_id:
            query = query.filter(Driver.tenant_id == order.tenant_id)
        
        # Filtra por capacidade (não excedeu max_concurrent_orders)
        all_drivers = query.join(User).all()
        available_drivers = []
        
        for driver in all_drivers:
            # Conta pedidos ativos
            active_orders = Order.query.filter(
                Order.driver_id == driver.id,
                Order.status.in_([
                    OrderStatus.ACCEPTED,
                    OrderStatus.PREPARING,
                    OrderStatus.READY,
                    OrderStatus.PICKED_UP
                ])
            ).count()
            
            max_concurrent = driver.max_concurrent_orders or 3
            if active_orders < max_concurrent:
                # Verificar se entregador está vinculado a este estabelecimento
                is_priority = False
                if order.restaurant_id:
                    from src.models.portal_models import DriverRestaurant
                    priority = DriverRestaurant.query.filter_by(
                        driver_id=driver.id,
                        restaurant_id=order.restaurant_id,
                        is_priority=True
                    ).first()
                    is_priority = priority is not None
                
                available_drivers.append({
                    'driver': driver,
                    'queue_position': driver.queue_position or 0,
                    'last_order_at': driver.last_order_at,
                    'total_orders_today': driver.total_orders_today or 0,
                    'is_priority': is_priority
                })
        
        if not available_drivers:
            return None
        
        # Ordena: prioridade primeiro, depois queue_position, depois last_order_at
        available_drivers.sort(key=lambda x: (
            not x['is_priority'],  # True primeiro (prioridade)
            x['queue_position'],
            x['last_order_at'] or datetime.min
        ))
        
        return available_drivers[0]['driver']
        
    except Exception as e:
        logger.error(f"Erro na fila ordenada: {e}")
        return None


def update_driver_queue(driver, action):
    """Atualiza a posição do driver na fila após aceitar/rejeitar"""
    try:
        if action == 'accept':
            # Driver aceitou - vai para o final da fila
            max_position = db.session.query(func.max(Driver.queue_position)).filter(
                Driver.tenant_id == driver.tenant_id
            ).scalar() or 0
            driver.queue_position = max_position + 1
            driver.last_order_at = datetime.utcnow()
            driver.total_orders_today = (driver.total_orders_today or 0) + 1
        elif action == 'reject':
            # Driver rejeitou - vai para o final, mas com penalização
            max_position = db.session.query(func.max(Driver.queue_position)).filter(
                Driver.tenant_id == driver.tenant_id
            ).scalar() or 0
            driver.queue_position = max_position + 2  # Penalização: vai 2 posições atrás
            driver.last_order_at = datetime.utcnow()
        
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao atualizar fila: {e}")


order_bp = Blueprint('order', __name__)

@order_bp.route('/available', methods=['GET'])
@jwt_required()
def get_available_orders():
    """Obtém pedidos disponíveis para o entregador"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403

        driver = user.driver
        if not driver or not driver.is_online:
            return jsonify({'orders': []}), 200

        # Busca pedidos pendentes próximos ao entregador (filtrados por tenant)
        query = Order.query.filter(
            Order.status == OrderStatus.PENDING,
            Order.driver_id.is_(None)
        )
        if driver.tenant_id:
            query = query.filter(Order.tenant_id == driver.tenant_id)

        # Exclui pedidos que este entregador já recusou
        reject_log = f"|REJECTED_BY_{user_id}|"
        query = query.filter(
            ~Order.special_instructions.contains(reject_log)
        )

        # Para distribuição 'nearest': só mostra pedidos oferecidos a este entregador
        # Usa LIKE com % para匹配 OFFERED_TO_{id} ou OFFERED_TO_{id}_{timestamp}
        offer_pattern = f"OFFERED_TO_{driver.id}"
        query = query.filter(
            (Order.distribution_method != 'nearest') | 
            (Order.special_instructions.like(f'%{offer_pattern}%'))
        )

        available_orders = query.join(Restaurant).all()
        
        orders_data = []
        for order in available_orders:
            # Calcula distância aproximada do entregador ao restaurante
            distance_to_restaurant = 0
            if driver.current_latitude and driver.current_longitude and order.restaurant and order.restaurant.latitude and order.restaurant.longitude:
                distance_to_restaurant = haversine_distance(
                    driver.current_latitude, driver.current_longitude,
                    order.restaurant.latitude, order.restaurant.longitude
                )
                
                # Só mostra pedidos dentro de um raio de 200km
                if distance_to_restaurant > 200:
                    continue
            
            order_dict = order.to_dict()
            order_dict['restaurant'] = order.restaurant.to_dict()
            order_dict['customer'] = order.customer.to_dict()
            order_dict['delivery_address'] = order.delivery_address.to_dict()
            order_dict['distance_to_restaurant_km'] = round(distance_to_restaurant, 2)
            
            # Calcula distância do restaurante ao cliente
            if order.restaurant.latitude and order.delivery_address.latitude:
                delivery_distance = haversine_distance(
                    order.restaurant.latitude, order.restaurant.longitude,
                    order.delivery_address.latitude, order.delivery_address.longitude
                )
                order_dict['delivery_distance_km'] = round(delivery_distance, 2)
                
                # Estima tempo de entrega (assumindo 30 km/h de velocidade média)
                estimated_time = (delivery_distance / 30) * 60  # em minutos
                order_dict['estimated_delivery_time_minutes'] = round(estimated_time, 0)
            
            orders_data.append(order_dict)
        
        # Ordena por proximidade
        orders_data.sort(key=lambda x: x.get('distance_to_restaurant_km', 999))
        
        return jsonify({
            'orders': orders_data,
            'count': len(orders_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@order_bp.route('/<int:order_id>/accept', methods=['POST'])
@jwt_required()
def accept_order(order_id):
    """Aceita um pedido"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403
        
        driver = user.driver
        if not driver or not driver.is_online:
            return jsonify({'error': 'Entregador deve estar online'}), 400
        
        # Verificar se entregador está bloqueado
        if driver.is_blocked:
            if driver.blocked_until and driver.blocked_until > datetime.utcnow():
                remaining = (driver.blocked_until - datetime.utcnow()).seconds // 60
                return jsonify({'error': f'Entregador bloqueado por rejeições. Tente novamente em {remaining} minutos.'}), 403
            else:
                # Desbloquear automaticamente
                driver.is_blocked = False
                driver.blocked_until = None
                driver.rejection_count = 0
        
        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404
        
        if order.status != OrderStatus.PENDING or order.driver_id:
            return jsonify({'error': 'Pedido não está disponível'}), 400
        
        # Atribui o pedido ao entregador
        order.driver_id = driver.id
        order.status = OrderStatus.ACCEPTED
        order.updated_at = datetime.utcnow()
        
        # Resetar contagem de rejeições ao aceitar pedido
        driver.rejection_count = 0
        driver.is_blocked = False
        driver.blocked_until = None
        
        # Cria registro de entrega
        delivery = Delivery(
            order_id=order.id,
            driver_id=driver.id,
            pickup_latitude=order.restaurant.latitude if order.restaurant else None,
            pickup_longitude=order.restaurant.longitude if order.restaurant else None,
            delivery_latitude=order.delivery_address.latitude if order.delivery_address else None,
            delivery_longitude=order.delivery_address.longitude if order.delivery_address else None
        )
        
        # Calcula ganhos estimados do entregador (% configurável + bônus por distância)
        driver_pct = 0.70  # fallback
        if order.restaurant and order.restaurant.pricing_table_id:
            from src.models.portal_models import PricingTable
            pt = PricingTable.query.get(order.restaurant.pricing_table_id)
            if pt and pt.driver_percentage:
                driver_pct = float(pt.driver_percentage) / 100.0
        elif order.restaurant and order.restaurant.square_id:
            from src.models.portal_models import Square
            sq = Square.query.get(order.restaurant.square_id)
            if sq and sq.driver_percentage:
                driver_pct = float(sq.driver_percentage) / 100.0

        base_earning = float(order.delivery_fee) * driver_pct
        if delivery.delivery_latitude and delivery.pickup_latitude:
            distance = haversine_distance(
                delivery.pickup_latitude, delivery.pickup_longitude,
                delivery.delivery_latitude, delivery.delivery_longitude
            )
            delivery.distance_km = distance
            delivery.driver_earnings = base_earning + (distance * 0.5)
        else:
            delivery.driver_earnings = base_earning
        
        db.session.add(delivery)

        # Cria notificação para o cliente (usa user_id do customer, não o customer_id)
        customer_user_id = order.customer.user_id if order.customer and order.customer.user_id else None
        if customer_user_id:
            notification = Notification(
                user_id=customer_user_id,
                title="Pedido aceito",
                message=f"Seu pedido #{order.order_number} foi aceito por um entregador",
                type=NotificationType.ORDER_UPDATE,
                related_id=order.id
            )
            db.session.add(notification)

        # Atualiza posição na fila (se modo fila)
        if order.distribution_method == 'queue':
            update_driver_queue(driver, 'accept')

        db.session.commit()
        
        # Callback para plataforma externa (iFood, etc.)
        send_platform_callback(order, 'ACCEPTED')
        
        order_dict = order.to_dict()
        order_dict['restaurant'] = order.restaurant.to_dict()
        order_dict['customer'] = order.customer.to_dict()
        order_dict['delivery_address'] = order.delivery_address.to_dict()
        order_dict['delivery'] = delivery.to_dict()
        
        return jsonify({
            'message': 'Pedido aceito com sucesso',
            'order': order_dict
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@order_bp.route('/<int:order_id>/reject', methods=['POST'])
@jwt_required()
def reject_order(order_id):
    """Recusa um pedido - envia para o proximo entregador"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403

        driver = user.driver
        if not driver:
            return jsonify({'error': 'Perfil de entregador não encontrado'}), 404

        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404

        if order.status != OrderStatus.PENDING:
            return jsonify({'error': 'Pedido não está pendente'}), 400

        # Busca proximo entregador disponivel (excluindo o que recusou)
        from src.models.portal_models import SystemConfig

        # Registra que este entregador recusou (usa special_instructions como flag)
        reject_log = f"|REJECTED_BY_{user_id}|"
        current_log = order.special_instructions or ''
        if f"REJECTED_BY_{user_id}" not in current_log:
            # Adicionar delimitadores para busca precisa
            if current_log:
                # Limpar pipes extras no início/fim
                current_log = current_log.strip('|')
                order.special_instructions = f"|{current_log}{reject_log}"
            else:
                order.special_instructions = reject_log

        # Aplicar penalidade por rejeição
        from src.models.portal_models import DriverPenalty, SystemConfig
        driver.rejection_count = (driver.rejection_count or 0) + 1
        
        # Buscar limite de rejeições configurável (padrão: 3)
        max_rejections_config = SystemConfig.query.filter_by(config_key='max_rejections_before_block').first()
        max_rejections = int(max_rejections_config.config_value) if max_rejections_config else 3
        
        if driver.rejection_count >= max_rejections:
            # Bloquear entregador temporariamente (padrão: 30 minutos)
            block_minutes_config = SystemConfig.query.filter_by(config_key='block_duration_minutes').first()
            block_minutes = int(block_minutes_config.config_value) if block_minutes_config else 30
            
            driver.is_blocked = True
            driver.blocked_until = datetime.utcnow() + timedelta(minutes=block_minutes)
            
            # Registrar penalidade
            penalty = DriverPenalty(
                driver_id=driver.id,
                order_id=order.id,
                penalty_type='REJECTION',
                reason=f'Bloqueado por {driver.rejection_count} rejeições consecutivas',
                is_active=True
            )
            db.session.add(penalty)

        # Limpa ofertas anteriores antes de buscar próximo
        si = order.special_instructions or ''
        # Remove todas as tags OFFERED_TO_ antigas (com timestamp)
        import re
        si = re.sub(r'\|?OFFERED_TO_\d+(?:_\d+)?', '', si).strip('|')
        order.special_instructions = si

        # Coleta todos os IDs que já recusaram
        rejected_ids = [user_id]
        if order.special_instructions:
            for match in re.finditer(r'REJECTED_BY_(\d+)', order.special_instructions):
                rid = int(match.group(1))
                if rid not in rejected_ids:
                    rejected_ids.append(rid)

        # Busca proximo entregador (excluindo todos que recusaram)
        next_driver = find_nearest_available_driver(order, exclude_driver_ids=rejected_ids)
        
        # Se nenhum entregador disponível, limpa rejeições e tenta novamente
        if not next_driver and len(rejected_ids) > 1:
            # Notifica admin antes de reciclar
            rejection_count = len(re.findall(r'REJECTED_BY_(\d+)', order.special_instructions or ''))
            timeout_count = len(re.findall(r'TIMEOUT_BY_(\d+)', order.special_instructions or ''))
            total_failures = rejection_count + timeout_count
            if total_failures >= 2:
                _notify_admin_pending_order(order, total_failures, datetime.utcnow())
            
            # Limpa rejeições e recomeça ciclo
            order.special_instructions = re.sub(r'\|?(REJECTED_BY|TIMEOUT_BY)_\d+', '', order.special_instructions or '').strip('|')
            next_driver = find_nearest_available_driver(order)
        
        if next_driver:
            # Atualiza oferta para o próximo entregador (via special_instructions)
            offer_ts = int(datetime.utcnow().timestamp())
            offer_tag = f"OFFERED_TO_{next_driver.id}_{offer_ts}"
            current_si = order.special_instructions or ''
            # Remove ofertas antigas antes de adicionar nova
            current_si = re.sub(r'\|?OFFERED_TO_\d+(?:_\d+)?', '', current_si).strip('|')
            order.special_instructions = f"{current_si}|{offer_tag}" if current_si else offer_tag
            
            # Notifica o proximo entregador no app
            try:
                notification = Notification(
                    user_id=next_driver.user_id,
                    title="Novo pedido disponível",
                    message=f"Pedido #{order.order_number} está disponível para entrega",
                    type=NotificationType.NEW_ORDER,
                    related_id=order.id
                )
                db.session.add(notification)
            except Exception:
                pass
            
            # Envia WhatsApp se configurado
            try:
                from src.services.whatsapp import whatsapp_service
                if whatsapp_service.is_configured() and next_driver.user.phone:
                    restaurant = order.restaurant
                    # Calcula distancia usando Haversine
                    km_total = 0
                    driver_pct = get_driver_percentage(order)
                    driver_earnings = float(order.delivery_fee) * driver_pct
                    if order.delivery_address and order.delivery_address.latitude and restaurant and restaurant.latitude:
                        km_total = haversine_distance(
                            restaurant.latitude, restaurant.longitude,
                            order.delivery_address.latitude, order.delivery_address.longitude
                        )
                        driver_earnings = float(order.delivery_fee) * driver_pct + (km_total * 0.5)

                    whatsapp_service.send_new_order_to_driver(
                        next_driver.user.phone,
                        {
                            'order_number': order.order_number,
                            'restaurant': restaurant.name if restaurant else 'N/A',
                            'restaurant_address': restaurant.address if restaurant else 'N/A',
                            'customer_name': order.customer.name if order.customer else 'N/A',
                            'delivery_address': f"{order.delivery_address.street}, {order.delivery_address.neighborhood}" if order.delivery_address else 'N/A',
                            'total_amount': float(order.total_amount),
                            'delivery_fee': float(order.delivery_fee),
                            'distance_km': km_total,
                            'driver_earnings': driver_earnings
                        }
                    )
            except Exception:
                pass
            
            # Atualiza posição na fila (se modo fila)
            if order.distribution_method == 'queue':
                update_driver_queue(driver, 'reject')
            
            db.session.commit()
            return jsonify({
                'message': 'Pedido recusado. Enviado para o próximo entregador.',
                'next_driver': next_driver.user.first_name
            }), 200
        else:
            # Nenhum entregador disponivel - verifica timeout
            time_elapsed = (datetime.utcnow() - order.created_at).total_seconds()
            timeout_config = SystemConfig.query.filter_by(config_key='order_timeout_seconds').first()
            timeout_seconds = int(timeout_config.config_value) if timeout_config else 120

            if time_elapsed >= timeout_seconds:
                # Timeout atingido - notifica admin
                db.session.commit()
                notify_admin_no_drivers(order)
                return jsonify({
                    'message': 'Pedido recusado. Timeout atingido, admin notificado.',
                    'notify_admin': True,
                    'time_elapsed': int(time_elapsed)
                }), 200
            else:
                # Ainda tem tempo - apenas registra recusa
                db.session.commit()
                return jsonify({
                    'message': f'Pedido recusado. Nenhum entregador disponível. Timeout em {int(timeout_seconds - time_elapsed)}s.',
                    'notify_admin': False,
                    'time_remaining': int(timeout_seconds - time_elapsed)
                }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def notify_admin_no_drivers(order):
    """Notifica admin quando timeout atingido (nenhum entregador aceita)"""
    try:
        from src.models.portal_models import SystemConfig
        
        # Conta quantas vezes o pedido foi recusado
        reject_count = 0
        if order.special_instructions:
            reject_count = order.special_instructions.count('REJECTED_BY_')
        
        # Calcula tempo desde criacao do pedido
        time_elapsed = (datetime.utcnow() - order.created_at).total_seconds()
        
        # Busca timeout configuravel
        timeout_config = SystemConfig.query.filter_by(config_key='order_timeout_seconds').first()
        timeout_seconds = int(timeout_config.config_value) if timeout_config else 120

        # Notifica via WhatsApp se configurado
        try:
            from src.services.whatsapp import whatsapp_service
            if whatsapp_service.is_configured():
                admin_phone_config = SystemConfig.query.filter_by(config_key='admin_phone').first()
                if admin_phone_config:
                    whatsapp_service.send_message(
                        admin_phone_config.config_value,
                        f"🚨 *ALERTA: Pedido sem entregador!*\n\n"
                        f"Pedido: #{order.order_number}\n"
                        f"Restaurante: {order.restaurant.name if order.restaurant else 'N/A'}\n"
                        f"Recusado por: {reject_count} entregador(es)\n"
                        f"Tempo sem atendimento: {int(time_elapsed)}s\n"
                        f"Timeout configurado: {timeout_seconds}s\n\n"
                        f"⚡ Ação urgente: Atribuir entregador manualmente!"
                    )
        except Exception:
            pass

        # Notifica via sistema (apenas admins do mesmo tenant)
        admin_query = User.query.filter_by(user_type=UserType.ADMIN)
        if order.tenant_id:
            admin_query = admin_query.filter(User.tenant_id == order.tenant_id)
        admin_users = admin_query.all()
        for admin in admin_users:
            notification = Notification(
                user_id=admin.id,
                title="🚨 Pedido sem entregador!",
                message=f"Pedido #{order.order_number} sem atendimento há {int(time_elapsed)}s. {reject_count} recusas. Ação urgente!",
                type=NotificationType.SYSTEM,
                related_id=order.id
            )
            db.session.add(notification)
        
        db.session.commit()
    except Exception as e:
        logger.error(f"Erro ao notificar admin: {e}")

@order_bp.route('/<int:order_id>/status', methods=['PUT'])
@jwt_required()
def update_order_status(order_id):
    """Atualiza o status do pedido (entregador ou admin)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        is_admin = user.user_type == UserType.ADMIN
        driver = None
        
        if not is_admin:
            if user.user_type != UserType.DRIVER:
                return jsonify({'error': 'Usuário não é um entregador'}), 403
            driver = user.driver
        
        order = Order.query.get(order_id)
        
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404
        
        # Verificar tenant para admin
        if is_admin:
            from src.utils.tenant import get_current_tenant_id
            tenant_id = get_current_tenant_id()
            if tenant_id and order.tenant_id != tenant_id:
                return jsonify({'error': 'Pedido não encontrado'}), 404
        else:
            if order.driver_id != driver.id:
                return jsonify({'error': 'Pedido não pertence a este entregador'}), 403
        
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'error': 'Status é obrigatório'}), 400
        
        try:
            new_status_enum = OrderStatus(new_status)
        except ValueError:
            return jsonify({'error': 'Status inválido'}), 400
        
        # Admin pode mudar de qualquer status para qualquer status
        # Entregador segue transições válidas
        if not is_admin:
            valid_transitions = {
                OrderStatus.SCHEDULED: [OrderStatus.PENDING, OrderStatus.CANCELLED],
                OrderStatus.PENDING: [OrderStatus.CANCELLED],
                OrderStatus.ACCEPTED: [OrderStatus.PICKED_UP, OrderStatus.PREPARING, OrderStatus.CANCELLED],
                OrderStatus.PREPARING: [OrderStatus.READY, OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
                OrderStatus.READY: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
                OrderStatus.PICKED_UP: [OrderStatus.DELIVERED]
            }
            
            if order.status not in valid_transitions or new_status_enum not in valid_transitions[order.status]:
                return jsonify({'error': 'Transição de status inválida'}), 400
        
        # Validação de raio GPS para coleta e entrega
        if new_status_enum in [OrderStatus.PICKED_UP, OrderStatus.DELIVERED]:
            driver_lat = data.get('latitude')
            driver_lng = data.get('longitude')
            
            if driver_lat and driver_lng:
                # Determinar local alvo (restaurante para coleta, endereço entrega para entrega)
                if new_status_enum == OrderStatus.PICKED_UP:
                    target_lat = float(order.restaurant.latitude) if order.restaurant else None
                    target_lng = float(order.restaurant.longitude) if order.restaurant else None
                    location_name = 'restaurante'
                else:
                    target_lat = float(order.delivery_address.latitude) if order.delivery_address else None
                    target_lng = float(order.delivery_address.longitude) if order.delivery_address else None
                    location_name = 'endereço de entrega'
                
                if target_lat and target_lng:
                    distance = haversine_distance(
                        float(driver_lat), float(driver_lng),
                        target_lat, target_lng
                    )
                    distance_meters = distance * 1000
                    
                    # Raio configurável (padrão 500 metros)
                    from src.models.portal_models import SystemConfig
                    radius_config = SystemConfig.query.filter_by(config_key='gps_radius_meters').first()
                    max_radius = int(radius_config.config_value) if radius_config else 500
                    
                    if distance_meters > max_radius:
                        return jsonify({
                            'error': f'Você está a {distance_meters:.0f}m do {location_name}. O máximo permitido é {max_radius}m.',
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

        # Atualiza o status
        order.status = new_status_enum
        order.updated_at = datetime.utcnow()
        
        # Registra timestamps específicos
        if new_status_enum == OrderStatus.ACCEPTED:
            order.accepted_at = datetime.utcnow()
        elif new_status_enum == OrderStatus.PREPARING:
            order.preparing_at = datetime.utcnow()
        elif new_status_enum == OrderStatus.READY:
            order.ready_at = datetime.utcnow()
        elif new_status_enum == OrderStatus.PICKED_UP:
            order.pickup_time = datetime.utcnow()
            order.picked_up_at = datetime.utcnow()
        elif new_status_enum == OrderStatus.DELIVERED:
            order.delivery_time = datetime.utcnow()
            
            # Lógica específica do entregador (só quando entregador muda status)
            if driver:
                driver.total_deliveries = (driver.total_deliveries or 0) + 1
                
                # Salva prova de entrega (foto) se fornecida
                proof_url = None
                proof_data = data.get('proof_of_delivery')
                if proof_data and order.delivery:
                    try:
                        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'proofs')
                        os.makedirs(uploads_dir, exist_ok=True)
                        
                        if ',' in proof_data:
                            proof_data = proof_data.split(',')[1]
                        
                        filename = f"proof_{order.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
                        filepath = os.path.join(uploads_dir, filename)
                        
                        with open(filepath, 'wb') as f:
                            f.write(base64.b64decode(proof_data))
                        
                        proof_url = f"/uploads/proofs/{filename}"
                        order.delivery.proof_of_delivery_url = proof_url
                    except Exception as e:
                        logger.error(f"Erro ao salvar prova de entrega: {e}")
                
                # Cria pagamento para o entregador
                if order.delivery:
                    from src.models.portal_models import Payment, PaymentType, PaymentStatus
                    payment = Payment(
                        driver_id=driver.id,
                        amount=order.delivery.driver_earnings,
                        payment_type=PaymentType.DELIVERY_EARNING,
                        reference_id=order.delivery.id,
                        payment_method=PaymentMethod.PIX,
                        status=PaymentStatus.PENDING
                    )
                    db.session.add(payment)
                    
                    # Creditar na carteira do entregador (vai para saldo bloqueado)
                    from decimal import Decimal
                    driver.locked_balance = (driver.locked_balance or Decimal('0')) + Decimal(str(order.delivery.driver_earnings))
                    driver.updated_at = datetime.utcnow()

            # Incrementar total_deliveries do entregador próprio
            if order.assigned_to_own_driver and order.establishment_driver_id:
                from src.models.portal_models import EstablishmentDriver
                est_driver = EstablishmentDriver.query.get(order.establishment_driver_id)
                if est_driver:
                    est_driver.total_deliveries = (est_driver.total_deliveries or 0) + 1
                    est_driver.updated_at = datetime.utcnow()

        # Cria notificação
        status_messages = {
            OrderStatus.PREPARING: "Seu pedido está sendo preparado",
            OrderStatus.READY: "Seu pedido está pronto para retirada",
            OrderStatus.PICKED_UP: "Seu pedido foi coletado e está a caminho",
            OrderStatus.DELIVERED: "Seu pedido foi entregue",
            OrderStatus.CANCELLED: "Seu pedido foi cancelado"
        }

        if new_status_enum in status_messages:
            # Busca o user_id do customer (não o customer_id)
            customer_user_id = None
            if order.customer and hasattr(order.customer, 'user_id'):
                customer_user_id = order.customer.user_id

            if customer_user_id:
                notification = Notification(
                    user_id=customer_user_id,
                    title="Atualização do pedido",
                    message=status_messages[new_status_enum],
                    type=NotificationType.ORDER_UPDATE,
                    related_id=order.id
                )
                db.session.add(notification)

        # Logica de cancelamento
        if new_status_enum == OrderStatus.CANCELLED:
            old_driver_id = order.driver_id
            if order.driver_id:
                order.driver_id = None
            if order.delivery:
                # Salva ganhos anteriores para remover depois
                old_earnings = order.delivery.driver_earnings
                db.session.delete(order.delivery)
            
            # Notifica entregador mais proximo para relancar
            try:
                new_driver = find_nearest_available_driver(order, exclude_driver_ids=[old_driver_id] if old_driver_id else [])
                if new_driver:
                    notification = Notification(
                        user_id=new_driver.user_id,
                        title="Novo pedido disponível",
                        message=f"Pedido #{order.order_number} está disponível para entrega",
                        type=NotificationType.NEW_ORDER,
                        related_id=order.id
                    )
                    db.session.add(notification)
            except Exception:
                pass

        # Logica de volta para PENDING - notifica entregador mais proximo
        if new_status_enum == OrderStatus.PENDING:
            old_driver_id = order.driver_id
            if order.driver_id:
                order.driver_id = None
            if order.delivery:
                db.session.delete(order.delivery)
            
            # Notifica entregador mais proximo
            try:
                new_driver = find_nearest_available_driver(order, exclude_driver_ids=[old_driver_id] if old_driver_id else [])
                if new_driver:
                    # Oferta ao próximo entregador (via special_instructions)
                    offer_ts = int(datetime.utcnow().timestamp())
                    offer_tag = f"OFFERED_TO_{new_driver.id}_{offer_ts}"
                    current_si = order.special_instructions or ''
                    # Remove ofertas antigas antes de adicionar nova
                    current_si = re.sub(r'\|?OFFERED_TO_\d+(?:_\d+)?', '', current_si).strip('|')
                    order.special_instructions = f"{current_si}|{offer_tag}" if current_si else offer_tag
                    notification = Notification(
                        user_id=new_driver.user_id,
                        title="Pedido disponível (reenviado)",
                        message=f"Pedido #{order.order_number} foi disponibilizado novamente",
                        type=NotificationType.NEW_ORDER,
                        related_id=order.id
                    )
                    db.session.add(notification)

                    # Envia WhatsApp se configurado
                    try:
                        from src.services.whatsapp import whatsapp_service
                        if whatsapp_service.is_configured() and new_driver.user.phone:
                            whatsapp_service.send_new_order_to_driver(
                                new_driver.user.phone,
                                {
                                    'order_number': order.order_number,
                                    'restaurant': order.restaurant.name if order.restaurant else 'N/A',
                                    'restaurant_address': order.restaurant.address if order.restaurant else 'N/A',
                                    'customer_name': order.customer.name if order.customer else 'N/A',
                                    'delivery_address': f"{order.delivery_address.street}, {order.delivery_address.neighborhood}" if order.delivery_address else 'N/A',
                                    'total_amount': float(order.total_amount),
                                    'delivery_fee': float(order.delivery_fee),
                                    'distance_km': 0,
                                    'driver_earnings': float(order.delivery_fee) * 0.65
                                }
                            )
                    except Exception:
                        pass
            except Exception:
                pass

        db.session.commit()
        
        # Callback para plataforma externa (iFood, etc.)
        send_platform_callback(order, new_status_enum.value)
        
        # Envia notificacao WhatsApp (se configurado)
        try:
            from src.services.whatsapp import whatsapp_service
            if whatsapp_service.is_configured() and order.customer and order.customer.phone:
                whatsapp_service.send_order_notification(
                    order.customer.phone, order.order_number, new_status_enum.value
                )
        except Exception:
            pass

        return jsonify({
            'message': 'Status atualizado com sucesso',
            'order': order.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@order_bp.route('/<int:order_id>/edit', methods=['PUT'])
@jwt_required()
def edit_order(order_id):
    """Edita um pedido (apenas campos permitidos antes da coleta)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404
        
        # Verificar permissão: admin ou dono do estabelecimento
        if user.user_type == UserType.CLIENT:
            customer = Customer.query.filter_by(user_id=user.id).first()
            if not customer or order.restaurant_id != customer.restaurant_id:
                return jsonify({'error': 'Sem permissão para editar este pedido'}), 403
        elif user.user_type != UserType.ADMIN:
            return jsonify({'error': 'Sem permissão para editar pedidos'}), 403
        
        # Só permite editar pedidos que ainda não foram coletados
        editable_statuses = [OrderStatus.SCHEDULED, OrderStatus.PENDING, OrderStatus.OFFERED, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY]
        if order.status not in editable_statuses:
            return jsonify({'error': f'Não é possível editar pedido com status {order.status.value}'}), 400
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400
        
        # Campos editáveis
        if 'customer_name' in data:
            if order.customer:
                order.customer.name = data['customer_name']
        
        if 'customer_phone' in data:
            if order.customer:
                order.customer.phone = data['customer_phone']
        
        if 'delivery_address' in data or 'delivery_number' in data or 'delivery_neighborhood' in data:
            if order.delivery_address:
                if 'delivery_address' in data:
                    order.delivery_address.street = data['delivery_address']
                if 'delivery_number' in data:
                    # Concatenar número ao endereço se fornecido separadamente
                    pass
                if 'delivery_neighborhood' in data:
                    order.delivery_address.neighborhood = data['delivery_neighborhood']
                if 'delivery_city' in data:
                    order.delivery_city = data['delivery_city']
                if 'delivery_state' in data:
                    order.delivery_state = data['delivery_state']
                if 'delivery_zip_code' in data:
                    order.delivery_zip_code = data['delivery_zip_code']
                
                # Re-geocodificar se endereço mudou
                if 'delivery_address' in data:
                    try:
                        from src.services.geocoding import geocode_address
                        full_addr = f"{data['delivery_address']}, {data.get('delivery_neighborhood', order.delivery_address.neighborhood)}, {data.get('delivery_city', order.delivery_address.city)}, {data.get('delivery_state', order.delivery_address.state)}"
                        geo = geocode_address(full_addr)
                        if geo:
                            order.delivery_address.latitude = geo['latitude']
                            order.delivery_address.longitude = geo['longitude']
                    except Exception as e:
                        logger.warning(f"Falha ao re-geocodificar: {e}")
        
        if 'special_instructions' in data:
            order.special_instructions = data['special_instructions']
        
        if 'delivery_fee' in data:
            order.delivery_fee = float(data['delivery_fee'])
            order.total_amount = float(order.subtotal or 0) + float(data['delivery_fee'])
        
        order.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Pedido atualizado com sucesso',
            'order': order.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@order_bp.route('/<int:order_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_order(order_id):
    """Cancela um pedido (pelo estabelecimento ou admin)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        data = request.get_json() or {}
        refund_driver = data.get('refund_driver', False)
        cancellation_reason = data.get('reason', '')

        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404

        # Verifica permissao
        if user.user_type == UserType.CLIENT:
            # Estabelecimento: verifica se cancelamento esta permitido
            from src.models.portal_models import SystemConfig
            allow_config = SystemConfig.query.filter_by(config_key='allow_establishment_cancel').first()
            allow_cancel = allow_config.config_value if allow_config else 'true'
            
            if allow_cancel != 'true':
                return jsonify({'error': 'Cancelamento não permitido pelo administrador'}), 403
            
            customer_profile = Customer.query.filter_by(user_id=user.id).first()
            if not customer_profile:
                return jsonify({'error': 'Perfil não encontrado'}), 404
            restaurant = find_restaurant_by_name(customer_profile.name)
            if not restaurant or order.restaurant_id != restaurant.id:
                return jsonify({'error': 'Pedido não pertence a este estabelecimento'}), 403
        elif user.user_type != UserType.ADMIN:
            return jsonify({'error': 'Sem permissão para cancelar'}), 403

        # Verifica se pode cancelar
        cancelable_statuses = [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY]
        if order.status not in cancelable_statuses:
            return jsonify({'error': f'Não é possível cancelar pedido com status {order.status.value}'}), 400

        # Verificar se tem entregador atribuído e se deve estornar
        driver_refund = 0
        if refund_driver and order.driver_id:
            from decimal import Decimal
            driver = Driver.query.get(order.driver_id)
            if driver:
                # Calcular valor a estornar (ganhos do entregador)
                delivery = Delivery.query.filter_by(order_id=order.id).first()
                if delivery and delivery.driver_earnings:
                    driver_refund = float(delivery.driver_earnings)
                    driver.balance = (driver.balance or Decimal('0')) + Decimal(str(driver_refund))
                    driver.locked_balance = max(Decimal('0'), (driver.locked_balance or Decimal('0')) - Decimal(str(driver_refund)))
                    driver.updated_at = datetime.utcnow()

        # Cancela
        order.status = OrderStatus.CANCELLED
        order.updated_at = datetime.utcnow()
        order.driver_id = None

        if order.delivery:
            db.session.delete(order.delivery)

        # Aplicar taxa de cancelamento (se configurada e se foi o estabelecimento que cancelou)
        cancellation_fee = 0
        if user.user_type == UserType.CLIENT and order.restaurant and order.restaurant.square_id:
            from src.models.portal_models import DynamicPricing
            dp = DynamicPricing.query.filter_by(square_id=order.restaurant.square_id).first()
            if dp and dp.cancellation_fee_active and dp.cancellation_fee:
                cancellation_fee = float(dp.cancellation_fee)

        # Notifica
        if order.customer and order.customer.user_id:
            notification = Notification(
                user_id=order.customer.user_id,
                title="Pedido cancelado",
                message=f"O pedido #{order.order_number} foi cancelado" + (f". Motivo: {cancellation_reason}" if cancellation_reason else ""),
                type=NotificationType.ORDER_UPDATE,
                related_id=order.id
            )
            db.session.add(notification)

        db.session.commit()

        # Callback para plataforma externa (iFood, etc.)
        send_platform_callback(order, 'CANCELLED')

        response_data = {
            'message': 'Pedido cancelado com sucesso',
            'order': order.to_dict()
        }
        if cancellation_fee > 0:
            response_data['cancellation_fee'] = cancellation_fee
            response_data['message'] = f'Pedido cancelado. Taxa de cancelamento: R$ {cancellation_fee:.2f}'
        if driver_refund > 0:
            response_data['driver_refund'] = driver_refund
            response_data['message'] += f' | Estorno ao entregador: R$ {driver_refund:.2f}'

        return jsonify(response_data), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@order_bp.route('/current', methods=['GET'])
@jwt_required()
def get_current_order():
    """Obtém o pedido atual do entregador"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403
        
        driver = user.driver
        
        # Busca pedido em andamento
        current_order = Order.query.filter(
            Order.driver_id == driver.id,
            Order.status.in_([
                OrderStatus.ACCEPTED, 
                OrderStatus.PREPARING, 
                OrderStatus.READY, 
                OrderStatus.PICKED_UP
            ])
        ).first()
        
        if not current_order:
            return jsonify({'message': 'Nenhum pedido em andamento'}), 200
        
        order_dict = current_order.to_dict()
        order_dict['restaurant'] = current_order.restaurant.to_dict() if current_order.restaurant else None
        order_dict['customer'] = current_order.customer.to_dict() if current_order.customer else None
        order_dict['delivery_address'] = current_order.delivery_address.to_dict() if current_order.delivery_address else None
        
        if current_order.delivery:
            order_dict['delivery'] = current_order.delivery.to_dict()
        
        return jsonify({
            'order': order_dict
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@order_bp.route('/active', methods=['GET'])
@jwt_required()
def get_active_orders():
    """Obtém todos os pedidos ativos do entregador (aceitos, preparando, pronto, coletado)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403
        
        driver = user.driver
        
        # Busca todos os pedidos ativos
        active_orders = Order.query.filter(
            Order.driver_id == driver.id,
            Order.status.in_([
                OrderStatus.ACCEPTED, 
                OrderStatus.PREPARING, 
                OrderStatus.READY, 
                OrderStatus.PICKED_UP
            ])
        ).order_by(Order.created_at.desc()).all()
        
        orders_data = []
        for order in active_orders:
            order_dict = order.to_dict()
            order_dict['restaurant'] = order.restaurant.to_dict() if order.restaurant else None
            order_dict['customer'] = order.customer.to_dict() if order.customer else None
            order_dict['delivery_address'] = order.delivery_address.to_dict() if order.delivery_address else None
            if order.delivery:
                order_dict['delivery'] = order.delivery.to_dict()
            orders_data.append(order_dict)
        
        return jsonify({
            'orders': orders_data,
            'count': len(orders_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@order_bp.route('/test-geocode', methods=['POST'])
def test_geocode():
    """Endpoint para testar geocodificação diretamente"""
    try:
        data = request.get_json()
        address = data.get('address', '')
        city = data.get('city', '')
        
        from src.services.geocoding import geocode_address, geocode_with_photon
        
        # Testar Photon diretamente
        photon_result = geocode_with_photon(address, city)
        
        # Testar geocode_address completo
        full_result = geocode_address(address, city)
        
        return jsonify({
            'input': {'address': address, 'city': city},
            'photon_result': photon_result,
            'full_result': full_result,
            'photon_success': photon_result is not None,
            'full_success': full_result is not None,
            'is_approximate': full_result.get('is_approximate', False) if full_result else None
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@order_bp.route('/estimate-fee', methods=['POST'])
@jwt_required()
def estimate_fee():
    """Estima o frete de entrega sem criar o pedido"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400

        delivery_address = data.get('delivery_address')
        if not delivery_address:
            return jsonify({'error': 'Endereço de entrega é obrigatório'}), 400

        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        # Buscar restaurante
        restaurant = None
        if data.get('restaurant_id'):
            restaurant = Restaurant.query.get(data['restaurant_id'])
        elif user and user.user_type == UserType.CLIENT:
            customer_profile = Customer.query.filter_by(user_id=user.id).first()
            if customer_profile:
                restaurant = find_restaurant_by_name(customer_profile.name)

        if not restaurant:
            return jsonify({'error': 'Restaurante não encontrado'}), 400

        # Geocodificar endereço de entrega
        from src.services.geocoding import geocode_address, get_route_distance_with_fallback
        city_hint = None
        if restaurant.square_id:
            from src.models.portal_models import Square
            square = Square.query.get(restaurant.square_id)
            if square:
                city_hint = square.city
        
        # Se não tem city_hint do restaurante, usar cidade do endereço
        if not city_hint:
            city_hint = data.get('delivery_city')

        # Permitir coordenadas manuais (quando usuário ajusta pino no mapa)
        manual_lat = data.get('latitude')
        manual_lng = data.get('longitude')
        
        if manual_lat and manual_lng:
            # Usuário forneceu coordenadas do pino no mapa
            del_lat = float(manual_lat)
            del_lng = float(manual_lng)
            is_approximate = False
        else:
            # Tentar geocodificar o endereço
            geo_del = geocode_address(delivery_address, city_hint=city_hint)
            del_lat = geo_del['latitude'] if geo_del else None
            del_lng = geo_del['longitude'] if geo_del else None
            is_approximate = geo_del.get('is_approximate', False) if geo_del else False

        # Calcular distância REAL (rota) com fallback para Haversine
        distance_km = 0
        duration_min = 0
        distance_source = 'none'
        
        if del_lat and del_lng and restaurant.latitude and restaurant.longitude:
            route_info = get_route_distance_with_fallback(
                float(restaurant.latitude), float(restaurant.longitude),
                float(del_lat), float(del_lng)
            )
            distance_km = route_info['distance_km']
            duration_min = route_info['duration_min']
            distance_source = route_info['source']

        # Calcular frete
        delivery_fee = 0
        price_per_km = 2.95
        min_km = 4.0

        if restaurant.pricing_table_id:
            from src.models.portal_models import PricingTable
            pt = PricingTable.query.get(restaurant.pricing_table_id)
            if pt and pt.price_per_km:
                price_per_km = float(pt.price_per_km)
                min_km = float(pt.min_distance_km or 4.0)
                km_total = max(distance_km, min_km)
                delivery_fee = round(km_total * price_per_km, 2)
                if pt.min_delivery_fee:
                    delivery_fee = max(delivery_fee, float(pt.min_delivery_fee))
                if pt.max_delivery_fee:
                    delivery_fee = min(delivery_fee, float(pt.max_delivery_fee))
        elif restaurant.square_id:
            from src.models.portal_models import Square
            sq = Square.query.get(restaurant.square_id)
            if sq and sq.price_per_km:
                price_per_km = float(sq.price_per_km)
                min_km = float(sq.min_distance_km or 4.0)
                km_total = max(distance_km, min_km)
                delivery_fee = round(km_total * price_per_km, 2)

        response_data = {
            'distance_km': round(distance_km, 2),
            'duration_min': round(duration_min, 1),
            'delivery_fee': delivery_fee,
            'price_per_km': price_per_km,
            'min_distance_km': min_km,
            'distance_source': distance_source,
            'is_approximate': is_approximate,
            'latitude': del_lat,
            'longitude': del_lng
        }
        
        if is_approximate:
            response_data['needs_pin_adjustment'] = True
            response_data['warning'] = 'Endereço não encontrado com precisão. Ajuste o pino no mapa para o local exato da entrega.'
        
        return jsonify(response_data), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@order_bp.route('/', methods=['POST'])
@jwt_required()
def create_order():
    """Cria um novo pedido"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400

        # Validar campos obrigatórios
        required_fields = ['customer_phone', 'customer_name', 'delivery_address', 'delivery_neighborhood', 'items']
        missing_fields = [f for f in required_fields if not data.get(f)]
        if missing_fields:
            return jsonify({'error': f'Campos obrigatórios ausentes: {", ".join(missing_fields)}'}), 400

        # Validar comprimento dos campos
        if len(str(data.get('customer_name', ''))) > 200:
            return jsonify({'error': 'Nome do cliente muito longo'}), 400
        if len(str(data.get('delivery_address', ''))) > 500:
            return jsonify({'error': 'Endereço muito longo'}), 400
        if len(str(data.get('special_instructions', ''))) > 1000:
            return jsonify({'error': 'Instruções muito longas'}), 400

        # Validar payment_method se fornecido
        payment_method = data.get('payment_method', 'CASH')
        try:
            payment_enum = PaymentMethod(payment_method)
        except (ValueError, KeyError):
            return jsonify({'error': f'Método de pagamento inválido: {payment_method}'}), 400

        # Se for estabelecimento (CLIENT), usa o restaurante vinculado ao seu customer profile
        if user and user.user_type == UserType.CLIENT:
            customer_profile = Customer.query.filter_by(user_id=user.id).first()
            if not customer_profile:
                return jsonify({'error': 'Perfil de estabelecimento não encontrado'}), 400

            # Busca ou cria restaurante para este estabelecimento
            restaurant = find_restaurant_by_name(customer_profile.name)
            if not restaurant:
                # Geocodifica o endereco do estabelecimento
                est_address = data.get('establishment_address', 'Endereço não informado')
                lat = data.get('establishment_latitude')
                lng = data.get('establishment_longitude')

                # Se nao tem coordenadas, tenta geocodificar
                if not lat or not lng:
                    from src.services.geocoding import geocode_address
                    geo = geocode_address(est_address)
                    if geo:
                        lat = geo['latitude']
                        lng = geo['longitude']
                    else:
                        lat = -29.95
                        lng = -50.45

                restaurant = Restaurant(
                    name=customer_profile.name,
                    address=est_address,
                    latitude=lat,
                    longitude=lng,
                    phone=customer_profile.phone
                )
                db.session.add(restaurant)
                db.session.flush()
        else:
            # Admin criando pedido - busca restaurante por ID ou nome
            restaurant = None
            if data.get('restaurant_id'):
                restaurant = Restaurant.query.get(data['restaurant_id'])
            elif data.get('restaurant_name'):
                restaurant = Restaurant.query.filter_by(name=data['restaurant_name']).first()
            
            if not restaurant:
                return jsonify({'error': 'Estabelecimento não encontrado. Envie restaurant_id ou restaurant_name.'}), 400

        # Busca ou cria cliente final
        customer = Customer.query.filter_by(phone=data['customer_phone']).first()
        if not customer:
            customer = Customer(
                name=data['customer_name'],
                phone=data['customer_phone'],
                email=data.get('customer_email')
            )
            db.session.add(customer)
            db.session.flush()

        # Cria endereço de entrega
        del_lat = data.get('delivery_latitude')
        del_lng = data.get('delivery_longitude')

        # Geocodifica endereco de entrega se nao tem coordenadas
        if not del_lat or not del_lng:
            # Tenta obter cidade da praça do restaurante
            city_hint = data.get('delivery_city')
            if not city_hint and restaurant and restaurant.square_id:
                from src.models.portal_models import Square
                square = Square.query.get(restaurant.square_id)
                if square:
                    city_hint = square.city
            
            del_address_full = f"{data['delivery_address']}, {data.get('delivery_neighborhood', '')}, {data.get('delivery_city', '')}, {data.get('delivery_state', 'RS')}"
            from src.services.geocoding import geocode_address
            geo_del = geocode_address(del_address_full, city_hint=city_hint)
            if geo_del:
                del_lat = geo_del['latitude']
                del_lng = geo_del['longitude']

        address = Address(
            customer_id=customer.id,
            street=data['delivery_address'],
            neighborhood=data['delivery_neighborhood'],
            city=data.get('delivery_city', 'Porto Alegre'),
            state=data.get('delivery_state', 'RS'),
            zip_code=data.get('delivery_zip_code', '90000-000'),
            latitude=del_lat,
            longitude=del_lng
        )
        db.session.add(address)
        db.session.flush()

        # Cria o pedido com status SCHEDULED (agendado)
        preparation_minutes = restaurant.preparation_minutes or 10
        scheduled_at = datetime.utcnow() + timedelta(minutes=preparation_minutes)

        # Obter tenant_id do usuário atual
        tenant_id = get_current_tenant_id()

        # Usar frete calculado pelo frontend (que usa OSRM para distância real)
        # O frontend já calculou com a distância real via rota
        delivery_fee = float(data.get('delivery_fee', 0))
        
        # Se o frontend não enviou frete, calcular com haversine como fallback
        if delivery_fee <= 0:
            if restaurant.pricing_table_id:
                from src.models.portal_models import PricingTable
                pt = PricingTable.query.get(restaurant.pricing_table_id)
                if pt and pt.price_per_km:
                    price_per_km = float(pt.price_per_km)
                    min_km = float(pt.min_distance_km or 4.0)
                    
                    km_total = min_km
                    if address.latitude and address.longitude and restaurant.latitude and restaurant.longitude:
                        km_total = haversine_distance(
                            float(restaurant.latitude), float(restaurant.longitude),
                            float(address.latitude), float(address.longitude)
                        )
                        km_total = max(km_total, min_km)
                    
                    delivery_fee = round(km_total * price_per_km, 2)
                    
                    if pt.min_delivery_fee:
                        delivery_fee = max(delivery_fee, float(pt.min_delivery_fee))
                    if pt.max_delivery_fee:
                        delivery_fee = min(delivery_fee, float(pt.max_delivery_fee))
            elif restaurant.square_id:
                from src.models.portal_models import Square
                sq = Square.query.get(restaurant.square_id)
                if sq and sq.price_per_km:
                    price_per_km = float(sq.price_per_km)
                    min_km = float(sq.min_distance_km or 4.0)
                    km_total = min_km
                    if address.latitude and address.longitude and restaurant.latitude and restaurant.longitude:
                        km_total = haversine_distance(
                            float(restaurant.latitude), float(restaurant.longitude),
                            float(address.latitude), float(address.longitude)
                        )
                        km_total = max(km_total, min_km)
                    delivery_fee = round(km_total * price_per_km, 2)

        # Aplicar taxas dinâmicas (chuva, alta demanda, feriado)
        square_id = restaurant.square_id
        if square_id:
            from src.models.portal_models import DynamicPricing
            dp = DynamicPricing.query.filter_by(square_id=square_id).first()
            if dp:
                if dp.rainy_day_active and dp.rainy_day_bonus:
                    delivery_fee = round(delivery_fee + float(dp.rainy_day_bonus), 2)
                if dp.high_demand_active and dp.high_demand_bonus:
                    delivery_fee = round(delivery_fee + float(dp.high_demand_bonus), 2)
                if dp.holiday_active and dp.holiday_bonus:
                    delivery_fee = round(delivery_fee + float(dp.holiday_bonus), 2)

        # Gerar tracking_token único e códigos anti-fraude
        tracking_token = str(uuid.uuid4())
        
        # Gerar codigos apenas se o estabelecimento usar confirmacao por codigo
        pickup_confirmation = restaurant.pickup_confirmation_type or 'code'
        delivery_confirmation = restaurant.delivery_confirmation_type or 'code'
        
        pickup_code = str(random.randint(100000, 999999)) if pickup_confirmation in ['code', 'code_and_photo'] else None
        delivery_code = str(random.randint(100000, 999999)) if delivery_confirmation in ['code', 'code_and_photo'] else None

        # Calcular subtotal dos itens
        items = data.get('items', [])
        if not isinstance(items, list):
            return jsonify({'error': 'items deve ser uma lista'}), 400
        for i, item in enumerate(items):
            if not isinstance(item, dict):
                return jsonify({'error': f'Item {i} deve ser um objeto'}), 400
            if 'name' not in item:
                return jsonify({'error': f'Item {i} deve ter o campo name'}), 400
        subtotal = sum(float(item.get('price', 0)) * int(item.get('quantity', 1)) for item in items) if items else 0
        total_amount = subtotal + delivery_fee

        order = Order(
            tenant_id=tenant_id,
            restaurant_id=restaurant.id,
            customer_id=customer.id,
            delivery_address_id=address.id,
            square_id=restaurant.square_id,  # Herdar praça do restaurante
            order_number=f"PED{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}",
            tracking_token=tracking_token,
            pickup_code=pickup_code,
            delivery_code=delivery_code,
            items=items,
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            total_amount=total_amount,
            payment_method=payment_enum,
            status=OrderStatus.SCHEDULED,
            distribution_method=data.get('distribution_method', 'nearest'),
            scheduled_at=scheduled_at,
            special_instructions=data.get('special_instructions')
        )

        db.session.add(order)
        db.session.flush()

        # Pedido agendado - não notifica entregador ainda
        # Será convertido para PENDING automaticamente quando scheduled_at chegar
        
        db.session.commit()

        # Envia notificacao WhatsApp ao cliente (se configurado)
        try:
            from src.services.whatsapp import whatsapp_service
            if whatsapp_service.is_configured() and customer.phone:
                whatsapp_service.send_order_notification(
                    customer.phone, order.order_number, order.status.value
                )
        except Exception:
            pass  # Nao falha o pedido se WhatsApp falhar

        return jsonify({
            'message': 'Pedido criado com sucesso',
            'order': order.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@order_bp.route('/<int:order_id>/call-platform', methods=['POST'])
@jwt_required()
def call_platform_drivers(order_id):
    """Chama entregadores da plataforma para um pedido (usado pelo estabelecimento)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404
        
        # Verificar se o usuário é o dono do estabelecimento
        if user.user_type == UserType.CLIENT:
            customer = Customer.query.filter_by(user_id=user.id).first()
            if not customer or not order.restaurant or order.restaurant.name != customer.name:
                return jsonify({'error': 'Não autorizado'}), 403
        elif user.user_type != UserType.ADMIN:
            return jsonify({'error': 'Não autorizado'}), 403
        
        # Marcar que chamou a plataforma
        order.called_platform = True
        order.distribution_method = 'nearest'  # Usar distribuição padrão da plataforma
        
        # Buscar próximo entregador da plataforma
        next_driver = find_nearest_available_driver(order)
        
        if next_driver:
            # Notificar entregador
            try:
                notification = Notification(
                    user_id=next_driver.user_id,
                    title="Novo pedido disponível",
                    message=f"Pedido #{order.order_number} está disponível para entrega",
                    type=NotificationType.NEW_ORDER,
                    related_id=order.id
                )
                db.session.add(notification)
            except Exception:
                pass
            
            # Envia WhatsApp se configurado
            try:
                from src.services.whatsapp import whatsapp_service
                if whatsapp_service.is_configured() and next_driver.user.phone:
                    restaurant = order.restaurant
                    km_total = 0
                    driver_pct = get_driver_percentage(order)
                    driver_earnings = float(order.delivery_fee) * driver_pct
                    if order.delivery_address and order.delivery_address.latitude and restaurant and restaurant.latitude:
                        km_total = haversine_distance(
                            restaurant.latitude, restaurant.longitude,
                            order.delivery_address.latitude, order.delivery_address.longitude
                        )
                        driver_earnings = float(order.delivery_fee) * driver_pct + (km_total * 0.5)
                    
                    whatsapp_service.send_new_order_to_driver(
                        next_driver.user.phone,
                        {
                            'order_number': order.order_number,
                            'restaurant': restaurant.name if restaurant else 'N/A',
                            'restaurant_address': restaurant.address if restaurant else 'N/A',
                            'customer_name': order.customer.name if order.customer else 'N/A',
                            'delivery_address': f"{order.delivery_address.street}, {order.delivery_address.neighborhood}" if order.delivery_address else 'N/A',
                            'total_amount': float(order.total_amount),
                            'delivery_fee': float(order.delivery_fee),
                            'distance_km': km_total,
                            'driver_earnings': driver_earnings
                        }
                    )
            except Exception:
                pass
            
            db.session.commit()
            return jsonify({
                'message': f'Pedido enviado para {next_driver.user.first_name}',
                'driver_name': next_driver.user.first_name
            }), 200
        else:
            db.session.commit()
            return jsonify({
                'message': 'Nenhum entregador da plataforma disponível no momento',
                'notify_admin': True
            }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@order_bp.route('/<int:order_id>/assign-own', methods=['POST'])
@jwt_required()
def assign_own_driver(order_id):
    """Atribui pedido a entregador próprio do estabelecimento"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404
        
        data = request.get_json()
        establishment_driver_id = data.get('establishment_driver_id')
        if not establishment_driver_id:
            return jsonify({'error': 'ID do entregador é obrigatório'}), 400
        
        from src.models.portal_models import EstablishmentDriver
        est_driver = EstablishmentDriver.query.get(establishment_driver_id)
        if not est_driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404
        
        # Atribuir pedido ao entregador próprio
        order.assigned_to_own_driver = True
        order.establishment_driver_id = est_driver.id
        order.status = OrderStatus.ACCEPTED
        order.accepted_at = datetime.utcnow()
        order.updated_at = datetime.utcnow()
        
        # Criar registro de entrega
        delivery = Delivery(
            order_id=order.id,
            driver_id=None,  # Entregador próprio não tem driver_id da plataforma
            pickup_latitude=order.restaurant.latitude if order.restaurant else None,
            pickup_longitude=order.restaurant.longitude if order.restaurant else None,
            delivery_latitude=order.delivery_address.latitude if order.delivery_address else None,
            delivery_longitude=order.delivery_address.longitude if order.delivery_address else None
        )
        db.session.add(delivery)
        
        # Calcular ganho do entregador baseado na configuração do restaurante
        restaurant = order.restaurant
        distance_km = 0
        if (order.delivery_address and order.delivery_address.latitude and 
            restaurant and restaurant.latitude):
            distance_km = haversine_distance(
                float(restaurant.latitude), float(restaurant.longitude),
                float(order.delivery_address.latitude), float(order.delivery_address.longitude)
            )
        
        # Calcular ganho baseado no tipo de pagamento
        payment_type = restaurant.own_driver_payment_type if restaurant else 'PER_DELIVERY'
        delivery_fee = float(order.delivery_fee or 0)
        
        if not restaurant:
            driver_earning = 5.00  # Fallback
        elif payment_type == 'PER_DELIVERY':
            driver_earning = float(restaurant.own_driver_fixed_value or 5.00)
        elif payment_type == 'PER_KM':
            driver_earning = distance_km * float(restaurant.own_driver_km_value or 1.50)
        elif payment_type == 'PERCENTAGE':
            driver_earning = delivery_fee * (float(restaurant.own_driver_percentage or 70.0) / 100)
        elif payment_type == 'DAILY':
            driver_earning = float(restaurant.own_driver_fixed_value or 50.00)
        else:  # FIXED
            driver_earning = float(restaurant.own_driver_fixed_value or 5.00)
        
        # Criar registro de ganho
        from src.models.portal_models import OwnDriverEarning
        earning = OwnDriverEarning(
            restaurant_id=restaurant.id if restaurant else None,
            establishment_driver_id=est_driver.id,
            order_id=order.id,
            delivery_fee=delivery_fee,
            driver_earning=driver_earning,
            payment_type=payment_type,
            distance_km=distance_km
        )
        db.session.add(earning)
        
        db.session.commit()
        
        # Envia WhatsApp para o entregador próprio
        try:
            from src.services.whatsapp import whatsapp_service
            if whatsapp_service.is_configured() and est_driver.phone:
                restaurant = order.restaurant
                whatsapp_service.send_message(
                    est_driver.phone,
                    f"🏍️ *Novo Pedido Atribuído!*\n\n"
                    f"Pedido: #{order.order_number}\n"
                    f"Restaurante: {restaurant.name if restaurant else 'N/A'}\n"
                    f"Cliente: {order.customer.name if order.customer else 'N/A'}\n"
                    f"Endereço: {order.delivery_address.street}, {order.delivery_address.neighborhood if order.delivery_address else 'N/A'}\n"
                    f"Valor: R$ {float(order.total_amount):.2f}\n\n"
                    f"Acesse o painel para mais detalhes."
                )
        except Exception:
            pass  # Não falha a atribuição se WhatsApp falhar
        
        return jsonify({
            'message': f'Pedido atribuído a {est_driver.name}',
            'order': order.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@order_bp.route('/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order_details(order_id):
    """Obtém detalhes de um pedido específico"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404
        
        # Verifica permissão
        if user.user_type == UserType.DRIVER:
            if not user.driver or order.driver_id != user.driver.id:
                return jsonify({'error': 'Acesso negado'}), 403
        
        order_dict = order.to_dict()
        order_dict['restaurant'] = order.restaurant.to_dict() if order.restaurant else None
        order_dict['customer'] = order.customer.to_dict() if order.customer else None
        order_dict['delivery_address'] = order.delivery_address.to_dict() if order.delivery_address else None
        
        if order.delivery:
            order_dict['delivery'] = order.delivery.to_dict()
        
        if order.driver:
            order_dict['driver'] = {
                'id': order.driver.id,
                'name': f"{order.driver.user.first_name} {order.driver.user.last_name}" if order.driver.user else 'N/A',
                'phone': order.driver.user.phone if order.driver.user else None,
                'vehicle_type': order.driver.vehicle_type.value if order.driver.vehicle_type else None,
                'vehicle_plate': order.driver.vehicle_plate,
                'rating': float(order.driver.rating)
            }
        
        return jsonify(order_dict), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@order_bp.route('/track/<string:tracking_token>', methods=['GET'])
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

@order_bp.route('/my', methods=['GET'])
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
            order_dict['customer'] = order.customer.to_dict()
            order_dict['delivery_address'] = order.delivery_address.to_dict()
            if order.driver:
                order_dict['driver'] = {
                    'id': order.driver.id,
                    'name': f"{order.driver.user.first_name} {order.driver.user.last_name}",
                    'phone': order.driver.user.phone
                }
            if order.delivery:
                order_dict['delivery'] = order.delivery.to_dict()
            orders_data.append(order_dict)

        return jsonify({
            'orders': orders_data,
            'total': orders.total,
            'pages': orders.pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@order_bp.route('/my/stats', methods=['GET'])
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

        today = datetime.utcnow().date()
        week_ago = datetime.utcnow() - timedelta(days=7)

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

@order_bp.route('/my/tracking', methods=['GET'])
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

        # Entregadores próprios com pedidos ativos
        own_active_orders = Order.query.filter(
            Order.restaurant_id == restaurant.id,
            Order.status.in_([
                OrderStatus.ACCEPTED,
                OrderStatus.PREPARING,
                OrderStatus.READY,
                OrderStatus.PICKED_UP
            ]),
            Order.assigned_to_own_driver == True,
            Order.establishment_driver_id.isnot(None)
        ).all()

        seen_own_drivers = set()
        for order in own_active_orders:
            try:
                est_driver = order.establishment_driver
                if not est_driver or est_driver.id in seen_own_drivers:
                    continue
                seen_own_drivers.add(est_driver.id)

                if est_driver.current_latitude and est_driver.current_longitude:
                    drivers_data.append({
                        'driver_id': f"own_{est_driver.id}",
                        'name': est_driver.name,
                        'phone': est_driver.phone,
                        'vehicle_type': est_driver.vehicle_type,
                        'latitude': float(est_driver.current_latitude),
                        'longitude': float(est_driver.current_longitude),
                        'order_id': order.id,
                        'order_number': order.order_number,
                        'order_status': order.status.value,
                        'last_update': est_driver.updated_at.isoformat() if est_driver.updated_at else None,
                        'is_own': True
                    })
            except Exception as e:
                print(f"Erro ao processar own driver do pedido {order.id}: {e}")
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

@order_bp.route('/my/financial', methods=['GET'])
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

        now = datetime.utcnow()

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

@order_bp.route('/<int:order_id>/rate', methods=['POST'])
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
            order.delivery.updated_at = datetime.utcnow()

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
                    est_driver.updated_at = datetime.utcnow()
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
                    driver.updated_at = datetime.utcnow()

                    # Alerta ao admin se avaliacao for baixa (menor que 3.0)
                    if driver.rating and float(driver.rating) < 3.0:
                        notify_admin_low_rating(driver, rating, feedback, order)

        db.session.commit()

        return jsonify({
            'message': 'Avaliação registrada com sucesso',
            'rating': rating,
            'feedback': feedback
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@order_bp.route('/<int:order_id>/rate-restaurant', methods=['POST'])
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
        if not order.delivery or order.delivery.driver_id != user.driver.id:
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
        order.delivery.updated_at = datetime.utcnow()

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


# ============================================
# ATRIBUICAO INTELIGENTE DE PEDIDOS
# ============================================

def find_nearest_available_driver(order, exclude_driver_ids=None):
    """
    Busca o entregador mais proximo que esteja disponivel.
    
    Logica:
    1. Busca todos os entregadores online
    2. Filtra por: distancia maxima e pedidos ativos < max_concurrent_orders
    3. Exclui entregadores que ja recusaram (exclude_driver_ids)
    4. Ordena por distancia ate o restaurante
    5. Retorna o mais proximo
    """
    try:
        from src.models.portal_models import SystemConfig

        if exclude_driver_ids is None:
            exclude_driver_ids = []

        # Busca configuracao de raio maximo
        config = SystemConfig.query.filter_by(config_key='delivery_radius').first()
        max_radius = float(config.config_value) if config else 200.0

        # Coordenadas do restaurante
        if not order.restaurant:
            return None
        
        rest_lat = float(order.restaurant.latitude) if order.restaurant.latitude else None
        rest_lng = float(order.restaurant.longitude) if order.restaurant.longitude else None

        if not rest_lat or not rest_lng:
            return None

        # Busca entregadores online (filtrados por tenant do pedido)
        driver_query = Driver.query.filter(
            Driver.is_online == True,
            Driver.current_latitude.isnot(None),
            Driver.current_longitude.isnot(None),
            Driver.is_blocked == False  # Excluir bloqueados
        )
        if order.tenant_id:
            driver_query = driver_query.filter(Driver.tenant_id == order.tenant_id)
        online_drivers = driver_query.all()

        # Busca contagem de pedidos ativos por entregador em uma única query
        driver_ids = [d.id for d in online_drivers if d.id not in exclude_driver_ids]
        active_counts = {}
        if driver_ids:
            active_orders_query = db.session.query(
                Order.driver_id, func.count(Order.id)
            ).filter(
                Order.driver_id.in_(driver_ids),
                Order.status.in_([
                    OrderStatus.ACCEPTED,
                    OrderStatus.PREPARING,
                    OrderStatus.READY,
                    OrderStatus.PICKED_UP
                ])
            ).group_by(Order.driver_id).all()
            active_counts = {driver_id: count for driver_id, count in active_orders_query}

        available_drivers = []

        for driver in online_drivers:
            # Pula entregadores que ja recusaram
            if driver.id in exclude_driver_ids:
                continue

            # Calcula distancia ate o restaurante usando Haversine
            driver_lat = float(driver.current_latitude)
            driver_lng = float(driver.current_longitude)

            distance = haversine_distance(driver_lat, driver_lng, rest_lat, rest_lng)

            if distance > max_radius:
                continue

            # Usa contagem pré-buscada
            active_orders = active_counts.get(driver.id, 0)

            # Verifica se tem capacidade
            max_concurrent = driver.max_concurrent_orders or 3
            if active_orders >= max_concurrent:
                continue

            available_drivers.append({
                'driver': driver,
                'distance': distance,
                'active_orders': active_orders
            })

        if not available_drivers:
            return None

        # Ordena por distancia (mais proximo primeiro)
        available_drivers.sort(key=lambda x: x['distance'])

        return available_drivers[0]['driver']

    except Exception as e:
        logger.error(f"Erro na atribuicao inteligente: {e}")
        return None


# ============================================
# ROTAS MULTI-PARADA
# ============================================

@order_bp.route('/routes', methods=['POST'])
@jwt_required()
def create_route():
    """Cria uma nova rota com múltiplas paradas"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Acesso negado'}), 403

        data = request.get_json()
        order_ids = data.get('order_ids', [])

        if len(order_ids) < 2:
            return jsonify({'error': 'Uma rota precisa ter pelo menos 2 pedidos'}), 400

        # Verifica se todos os pedidos existem e estão pendentes
        orders = []
        for order_id in order_ids:
            order = Order.query.get(order_id)
            if not order:
                return jsonify({'error': f'Pedido {order_id} não encontrado'}), 404
            if order.status != OrderStatus.PENDING:
                return jsonify({'error': f'Pedido {order_id} não está pendente'}), 400
            if order.route_id:
                return jsonify({'error': f'Pedido {order_id} já pertence a uma rota'}), 400
            orders.append(order)

        # Verifica se todos são do mesmo tenant
        tenant_id = orders[0].tenant_id
        if any(o.tenant_id != tenant_id for o in orders):
            return jsonify({'error': 'Pedidos de tenants diferentes não podem ser agrupados'}), 400

        # Cria a rota
        from src.models.portal_models import DeliveryRoute
        route = DeliveryRoute(
            tenant_id=tenant_id,
            route_number=f"ROT{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}",
            status='pending',
            total_stops=len(orders)
        )
        db.session.add(route)
        db.session.flush()

        # Associa pedidos à rota com número de parada
        for i, order in enumerate(orders, 1):
            order.route_id = route.id
            order.stop_number = i

        db.session.commit()

        return jsonify({
            'message': f'Rota criada com {len(orders)} paradas',
            'route': route.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@order_bp.route('/routes/<int:route_id>', methods=['GET'])
@jwt_required()
def get_route_details(route_id):
    """Obtém detalhes de uma rota"""
    try:
        from src.models.portal_models import DeliveryRoute
        route = DeliveryRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        route_dict = route.to_dict()

        # Busca pedidos da rota ordenados por stop_number
        orders = Order.query.filter_by(route_id=route_id).order_by(Order.stop_number).all()
        route_dict['orders'] = []
        for order in orders:
            order_dict = order.to_dict()
            order_dict['restaurant'] = order.restaurant.to_dict()
            order_dict['delivery_address'] = order.delivery_address.to_dict()
            route_dict['orders'].append(order_dict)

        return jsonify(route_dict), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@order_bp.route('/routes/<int:route_id>/reorder', methods=['PUT'])
@jwt_required()
def reorder_route(route_id):
    """Reordena as paradas de uma rota"""
    try:
        from src.models.portal_models import DeliveryRoute
        route = DeliveryRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        data = request.get_json()
        new_order = data.get('order', [])  # Lista de order_ids na nova ordem

        if not new_order:
            return jsonify({'error': 'Nova ordem é obrigatória'}), 400

        # Atualiza stop_number de cada pedido
        for i, order_id in enumerate(new_order, 1):
            order = Order.query.get(order_id)
            if order and order.route_id == route_id:
                order.stop_number = i

        db.session.commit()

        return jsonify({'message': 'Rota reordenada com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@order_bp.route('/group-pending', methods=['POST'])
@jwt_required()
def group_pending_orders():
    """Agrupa pedidos pendentes próximos automaticamente"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.ADMIN:
            return jsonify({'error': 'Acesso restrito a administradores'}), 403

        data = request.get_json() or {}
        radius_km = data.get('radius_km', 1.0)  # Raio de agrupamento em km (padrão 1km)
        tenant_id = get_current_tenant_id()

        # Busca pedidos pendentes sem rota
        query = Order.query.filter(
            Order.status == OrderStatus.PENDING,
            Order.route_id.is_(None),
            Order.driver_id.is_(None)
        )
        if tenant_id:
            query = query.filter(Order.tenant_id == tenant_id)

        pending_orders = query.all()

        if len(pending_orders) < 2:
            return jsonify({
                'message': 'Menos de 2 pedidos pendentes disponíveis',
                'groups': 0
            }), 200

        # Agrupa pedidos por proximidade
        groups = []
        used_orders = set()

        for order in pending_orders:
            if order.id in used_orders:
                continue

            # Inicia um grupo com este pedido
            group = [order]
            used_orders.add(order.id)

            if not order.restaurant.latitude or not order.restaurant.longitude:
                continue

            # Busca outros pedidos próximos
            for other_order in pending_orders:
                if other_order.id in used_orders:
                    continue
                if not other_order.restaurant.latitude or not other_order.restaurant.longitude:
                    continue

                # Calcula distância entre restaurantes
                distance = haversine_distance(
                    order.restaurant.latitude, order.restaurant.longitude,
                    other_order.restaurant.latitude, other_order.restaurant.longitude
                )

                if distance <= radius_km:
                    group.append(other_order)
                    used_orders.add(other_order.id)

            if len(group) >= 2:
                groups.append(group)

        # Cria rotas para cada grupo
        routes_created = []
        from src.models.portal_models import DeliveryRoute

        for group in groups:
            route = DeliveryRoute(
                tenant_id=tenant_id,
                route_number=f"ROT{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}",
                status='pending',
                total_stops=len(group)
            )
            db.session.add(route)
            db.session.flush()

            # Associa pedidos à rota
            for i, order in enumerate(group, 1):
                order.route_id = route.id
                order.stop_number = i

            routes_created.append(route.to_dict())

        db.session.commit()

        return jsonify({
            'message': f'{len(routes_created)} rotas criadas com {sum(len(g) for g in groups)} pedidos',
            'routes': routes_created
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

