"""Helpers de pedidos: despacho a entregadores, filas e notificações.

Extraído de order.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
Sem blueprint: são funções de negócio usadas pelas rotas e tarefas de fundo.
"""
import logging
import re
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func

from src.models.portal_models import (
    Driver,
    EstablishmentDriver,
    Notification,
    NotificationType,
    Order,
    OrderStatus,
    User,
    UserType,
    db,
)
from src.utils.geo import haversine_distance

logger = logging.getLogger(__name__)


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
            from src.models.portal_models import PlatformCredential
            from src.services.ifood_service import update_status as ifood_update_status

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
        EstablishmentDriver.is_online,
        EstablishmentDriver.is_active
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
        now = datetime.now(timezone.utc)
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

            # === FLUXO PRÓPRIO: Entregadores próprios recebem pedidos via rotas ===
            # NÃO oferece automaticamente - estabelecimento cria rotas manualmente
            # O pedido fica como PENDING para o estabelecimento distribuir

            # Verificar se o restaurante tem entregadores próprios
            restaurant = order.restaurant
            if restaurant and restaurant.has_own_drivers:
                logger.info(f"[OWN-DRIVER] Pedido {order.order_number} - restaurante tem entregadores próprios, aguardando rota do estabelecimento")
                # Não faz nada - o estabelecimento vai criar rotas manualmente
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
                    offer_ts = int(datetime.now(timezone.utc).timestamp())
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

        now = datetime.now(timezone.utc)
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
                        offer_ts = int(datetime.now(timezone.utc).timestamp())
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
            Driver.is_online,
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
            Driver.is_online,
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
            driver.last_order_at = datetime.now(timezone.utc)
            driver.total_orders_today = (driver.total_orders_today or 0) + 1
        elif action == 'reject':
            # Driver rejeitou - vai para o final, mas com penalização
            max_position = db.session.query(func.max(Driver.queue_position)).filter(
                Driver.tenant_id == driver.tenant_id
            ).scalar() or 0
            driver.queue_position = max_position + 2  # Penalização: vai 2 posições atrás
            driver.last_order_at = datetime.now(timezone.utc)

        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao atualizar fila: {e}")

def notify_admin_no_drivers(order):
    """Notifica admin quando timeout atingido (nenhum entregador aceita)"""
    try:
        from src.models.portal_models import SystemConfig

        # Conta quantas vezes o pedido foi recusado
        reject_count = 0
        if order.special_instructions:
            reject_count = order.special_instructions.count('REJECTED_BY_')

        # Calcula tempo desde criacao do pedido
        time_elapsed = (datetime.now(timezone.utc) - order.created_at).total_seconds()

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
            Driver.is_online,
            Driver.current_latitude.isnot(None),
            Driver.current_longitude.isnot(None),
            not Driver.is_blocked  # Excluir bloqueados
        )
        if order.tenant_id:
            driver_query = driver_query.filter(Driver.tenant_id == order.tenant_id)
        online_drivers = driver_query.all()

        # Filtrar entregadores com nota abaixo do mínimo configurado
        min_rating_config = SystemConfig.query.filter_by(config_key='min_driver_rating').first()
        min_rating = float(min_rating_config.config_value) if min_rating_config else 2.0
        online_drivers = [d for d in online_drivers if float(d.rating or 5.0) >= min_rating]

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

        # Ordena por distância, mas com prioridade para níveis MuvScore mais altos
        # Bônus de prioridade: Diamante=30%, Ouro=20%, Prata=10%, Bronze=0%
        level_priority = {'diamante': 0.7, 'ouro': 0.8, 'prata': 0.9, 'bronze': 1.0}

        def sort_key(item):
            driver = item['driver']
            distance = item['distance']
            # Buscar nível do entregador na semana atual
            try:
                from src.models.portal_models import DriverWeeklyScore
                week_start = date.today() - timedelta(days=date.today().weekday())
                score = DriverWeeklyScore.query.filter_by(
                    driver_id=driver.id, week_start=week_start
                ).first()
                level = score.level if score else 'bronze'
            except Exception:
                level = 'bronze'
            multiplier = level_priority.get(level, 1.0)
            return distance * multiplier  # Menor distância × prioridade = melhor posição

        available_drivers.sort(key=sort_key)

        return available_drivers[0]['driver']

    except Exception as e:
        logger.error(f"Erro na atribuicao inteligente: {e}")
        return None


