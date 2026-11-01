"""Ofertas, aceite e atribuição de pedidos.

Extraído de order.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
"""
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.orm import joinedload

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
from src.services.order_helpers import (
    _notify_admin_pending_order,
    find_nearest_available_driver,
    get_driver_percentage,
    notify_admin_no_drivers,
    send_platform_callback,
    update_driver_queue,
)
from src.utils.geo import haversine_distance

order_acceptance_bp = Blueprint('order_acceptance', __name__)


@order_acceptance_bp.route('/available', methods=['GET'])
@jwt_required()
def get_available_orders():
    """Obtém pedidos disponíveis para o entregador"""
    try:
        user_id = int(get_jwt_identity())
        # Verificar se entregador foi convertido para próprio
        from src.routes.driver import _check_driver_conversion
        conv = _check_driver_conversion(user_id)
        if conv:
            return conv
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
        else:
            # Entregador sem tenant não deve ver pedidos de ninguém
            return jsonify({'orders': []}), 200

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

        available_orders = query.options(
            joinedload(Order.restaurant),
            joinedload(Order.customer),
            joinedload(Order.delivery_address),
        ).join(Restaurant).all()

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
            order_dict['customer'] = order.customer.to_dict() if order.customer else None
            order_dict['delivery_address'] = order.delivery_address.to_dict() if order.delivery_address else None
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

            # Calcula ganhos estimados do entregador usando % configurável
            driver_pct = get_driver_percentage(order)
            driver_earnings = float(order.delivery_fee or 0) * driver_pct
            order_dict['estimated_driver_earnings'] = round(driver_earnings, 2)
            order_dict['driver_percentage'] = round(driver_pct * 100, 0)

            orders_data.append(order_dict)

        # Ordena por proximidade
        orders_data.sort(key=lambda x: x.get('distance_to_restaurant_km', 999))

        return jsonify({
            'orders': orders_data,
            'count': len(orders_data)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@order_acceptance_bp.route('/<int:order_id>/accept', methods=['POST'])
@jwt_required()
def accept_order(order_id):
    """Aceita um pedido de forma atômica (impede dois aceites simultâneos)"""
    try:
        user_id = int(get_jwt_identity())
        # Verificar se entregador foi convertido para próprio
        from src.routes.driver import _check_driver_conversion
        conv = _check_driver_conversion(user_id)
        if conv:
            return conv
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403

        # Verificar status do usuário e do tenant
        from src.utils.tenant import check_user_and_tenant_status
        block = check_user_and_tenant_status(user)
        if block:
            return block

        driver = user.driver
        if not driver or not driver.is_online:
            return jsonify({'error': 'Entregador deve estar online'}), 400

        # Verificar se entregador está bloqueado
        if driver.is_blocked:
            if driver.blocked_until and driver.blocked_until > datetime.now(timezone.utc):
                remaining = (driver.blocked_until - datetime.now(timezone.utc)).seconds // 60
                return jsonify({'error': f'Entregador bloqueado por rejeições. Tente novamente em {remaining} minutos.'}), 403
            else:
                # Desbloquear automaticamente
                driver.is_blocked = False
                driver.blocked_until = None
                driver.rejection_count = 0

        # ACEITE ATÔMICO: UPDATE condicional que só funciona se o pedido ainda estiver disponível
        now = datetime.now(timezone.utc)
        result = db.session.execute(
            db.text("""
                UPDATE orders
                SET driver_id = :driver_id,
                    status = 'ACCEPTED',
                    updated_at = :now
                WHERE id = :order_id
                  AND status = 'PENDING'
                  AND driver_id IS NULL
            """),
            {'driver_id': driver.id, 'now': now, 'order_id': order_id}
        )

        # Se nenhuma linha foi afetada, o pedido não está mais disponível
        if result.rowcount == 0:
            db.session.rollback()
            return jsonify({'error': 'Pedido não está mais disponível (já foi aceito por outro entregador)'}), 409

        # Recarregar o pedido atualizado
        order = db.session.get(Order, order_id)

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
        order_dict['customer'] = order.customer.to_dict() if order.customer else None
        order_dict['delivery_address'] = order.delivery_address.to_dict() if order.delivery_address else None
        order_dict['delivery'] = delivery.to_dict()

        return jsonify({
            'message': 'Pedido aceito com sucesso',
            'order': order_dict
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@order_acceptance_bp.route('/<int:order_id>/reject', methods=['POST'])
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
        from src.models.portal_models import DriverPenalty
        driver.rejection_count = (driver.rejection_count or 0) + 1

        # Buscar limite de rejeições configurável (padrão: 3)
        max_rejections_config = SystemConfig.query.filter_by(config_key='max_rejections_before_block').first()
        max_rejections = int(max_rejections_config.config_value) if max_rejections_config else 3

        if driver.rejection_count >= max_rejections:
            # Bloquear entregador temporariamente (padrão: 30 minutos)
            block_minutes_config = SystemConfig.query.filter_by(config_key='block_duration_minutes').first()
            block_minutes = int(block_minutes_config.config_value) if block_minutes_config else 30

            driver.is_blocked = True
            driver.blocked_until = datetime.now(timezone.utc) + timedelta(minutes=block_minutes)

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
                _notify_admin_pending_order(order, total_failures, datetime.now(timezone.utc))

            # Limpa rejeições e recomeça ciclo
            order.special_instructions = re.sub(r'\|?(REJECTED_BY|TIMEOUT_BY)_\d+', '', order.special_instructions or '').strip('|')
            next_driver = find_nearest_available_driver(order)

        if next_driver:
            # Atualiza oferta para o próximo entregador (via special_instructions)
            offer_ts = int(datetime.now(timezone.utc).timestamp())
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
            time_elapsed = (datetime.now(timezone.utc) - order.created_at).total_seconds()
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

@order_acceptance_bp.route('/<int:order_id>/call-platform', methods=['POST'])
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


@order_acceptance_bp.route('/<int:order_id>/assign-own', methods=['POST'])
@jwt_required()
def assign_own_driver(order_id):
    """Atribui pedido a entregador próprio do estabelecimento"""
    try:
        user_id = int(get_jwt_identity())
        User.query.get(user_id)

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

        # Remover pedido da rota anterior (se existir)
        if order.own_driver_route_id:
            from src.models.portal_models import OwnDriverRoute, OwnDriverStop
            old_route = OwnDriverRoute.query.get(order.own_driver_route_id)
            if old_route:
                # Remover parada da rota antiga
                old_stop = OwnDriverStop.query.filter_by(
                    route_id=old_route.id,
                    order_id=order.id
                ).first()
                if old_stop:
                    db.session.delete(old_stop)

                # Se a rota antiga fica sem paradas, excluí-la
                remaining_stops = OwnDriverStop.query.filter_by(route_id=old_route.id).count()
                if remaining_stops <= 1:  # <=1 porque ainda não deletamos o stop acima
                    db.session.delete(old_route)

            order.own_driver_route_id = None

        # Atribuir pedido ao entregador próprio
        order.assigned_to_own_driver = True
        order.establishment_driver_id = est_driver.id
        order.status = OrderStatus.ACCEPTED
        order.accepted_at = datetime.now(timezone.utc)
        order.updated_at = datetime.now(timezone.utc)

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

        # NÃO criar rota automaticamente - estabelecimento cria rotas manualmente

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


