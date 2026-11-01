import logging
import random
import re
import uuid
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from src.models.portal_models import (
    Address,
    Customer,
    Delivery,
    Driver,
    Notification,
    NotificationType,
    Order,
    OrderStatus,
    PaymentMethod,
    Restaurant,
    User,
    UserType,
    db,
)
from src.utils.geo import haversine_distance
from src.utils.order_tags import sanitize_customer_instructions
from src.utils.tenant import get_current_tenant_id

logger = logging.getLogger(__name__)


from src.services.order_helpers import (
    find_nearest_available_driver,
    send_platform_callback,
)
from src.utils.restaurant import find_restaurant_by_name

order_bp = Blueprint('order', __name__)

@order_bp.route('/<int:order_id>/status', methods=['PUT'])
@jwt_required()
def update_order_status(order_id):
    """Atualiza o status do pedido (entregador, admin ou estabelecimento)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        is_admin = user.user_type == UserType.ADMIN
        is_client = user.user_type == UserType.CLIENT
        driver = None

        if not is_admin and not is_client:
            if user.user_type != UserType.DRIVER:
                return jsonify({'error': 'Usuário não autorizado'}), 403
            driver = user.driver

        order = Order.query.get(order_id)

        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404

        # Verificar permissão
        if is_admin:
            from src.utils.tenant import get_current_tenant_id
            tenant_id = get_current_tenant_id()
            if tenant_id and order.tenant_id != tenant_id:
                return jsonify({'error': 'Pedido não encontrado'}), 404
        elif is_client:
            # Verificar se o pedido pertence ao restaurante do estabelecimento
            from src.models.portal_models import Customer
            customer = Customer.query.filter_by(user_id=user.id).first()
            if not customer:
                return jsonify({'error': 'Perfil de estabelecimento não encontrado'}), 403
            restaurant = Restaurant.query.filter_by(name=customer.name).first()
            if not restaurant or order.restaurant_id != restaurant.id:
                return jsonify({'error': 'Pedido não pertence a este estabelecimento'}), 403
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

        # Validar transição usando máquina de estados central
        from src.utils.order_state_machine import can_transition, get_user_role

        user_role = get_user_role(user)
        # Entregadores próprios têm papel próprio
        if user.user_type == UserType.DRIVER:
            from src.models.portal_models import EstablishmentDriver
            own_driver = EstablishmentDriver.query.filter_by(phone=user.phone).first()
            if own_driver:
                user_role = 'own_driver'

        can_change, error_msg = can_transition(order.status, new_status_enum, user_role)
        if not can_change:
            return jsonify({'error': error_msg}), 400

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
        order.updated_at = datetime.now(timezone.utc)

        # Registra timestamps específicos
        if new_status_enum == OrderStatus.ACCEPTED:
            order.accepted_at = datetime.now(timezone.utc)
        elif new_status_enum == OrderStatus.PREPARING:
            order.preparing_at = datetime.now(timezone.utc)
        elif new_status_enum == OrderStatus.READY:
            order.ready_at = datetime.now(timezone.utc)
        elif new_status_enum == OrderStatus.PICKED_UP:
            order.pickup_time = datetime.now(timezone.utc)
            order.picked_up_at = datetime.now(timezone.utc)
        elif new_status_enum == OrderStatus.DELIVERED:
            order.delivery_time = datetime.now(timezone.utc)

            # Marcar parada como concluída na rota (se aplicável)
            if order.own_driver_route_id:
                from src.models.portal_models import OwnDriverRoute, OwnDriverStop
                stop = OwnDriverStop.query.filter_by(
                    route_id=order.own_driver_route_id,
                    order_id=order.id
                ).first()
                if stop and stop.status != 'COMPLETED':
                    stop.status = 'COMPLETED'
                    stop.completed_at = datetime.now(timezone.utc)
                    # Verificar se todas as paradas foram concluídas
                    route = OwnDriverRoute.query.get(order.own_driver_route_id)
                    if route:
                        all_completed = all(s.status == 'COMPLETED' for s in route.stops)
                        if all_completed:
                            route.status = 'COMPLETED'
                            route.completed_at = datetime.now(timezone.utc)

            # Lógica específica do entregador (só quando entregador muda status)
            if driver:
                driver.total_deliveries = (driver.total_deliveries or 0) + 1

                # MuvScore: pontos por entrega concluída
                try:
                    from src.utils.muvscore import award_delivery_points
                    award_delivery_points(driver, order)
                except Exception as e:
                    logger.error(f"Erro ao registrar pontos MuvScore: {e}")

                # Salva prova de entrega (foto) - upload para Supabase Storage
                proof_url = None
                proof_data = data.get('proof_of_delivery')
                if proof_data and order.delivery:
                    try:
                        from src.utils.supabase_storage import upload_proof
                        proof_url = upload_proof(proof_data, order.id)
                        if proof_url:
                            order.delivery.proof_of_delivery_url = proof_url
                    except Exception as e:
                        logger.error(f"Erro ao salvar prova de entrega: {e}")

                # Cria pagamento para o entregador
                if order.delivery:
                    from src.models.portal_models import Payment, PaymentStatus, PaymentType
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
                    driver.updated_at = datetime.now(timezone.utc)

            # Incrementar total_deliveries do entregador próprio
            if order.assigned_to_own_driver and order.establishment_driver_id:
                from src.models.portal_models import EstablishmentDriver
                est_driver = EstablishmentDriver.query.get(order.establishment_driver_id)
                if est_driver:
                    est_driver.total_deliveries = (est_driver.total_deliveries or 0) + 1
                    est_driver.updated_at = datetime.now(timezone.utc)

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
                # Estornar locked_balance do entregador antes de desvincular
                from decimal import Decimal
                driver_obj = Driver.query.get(order.driver_id)
                if driver_obj and order.delivery and order.delivery.driver_earnings:
                    earnings = Decimal(str(order.delivery.driver_earnings))
                    driver_obj.locked_balance = max(Decimal('0'), (driver_obj.locked_balance or Decimal('0')) - earnings)
                    # Creditar de volta no balance (estorno completo)
                    if earnings > 0:
                        driver_obj.balance = (driver_obj.balance or Decimal('0')) + earnings
                    driver_obj.updated_at = datetime.now(timezone.utc)
                order.driver_id = None
            if order.delivery:
                # Salva ganhos anteriores para remover depois
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
                    offer_ts = int(datetime.now(timezone.utc).timestamp())
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
            restaurant = Restaurant.query.filter_by(name=customer.name).first()
            if not customer or not restaurant or order.restaurant_id != restaurant.id:
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
        if 'customer_name' in data and order.customer:
            order.customer.name = data['customer_name']

        if 'customer_phone' in data and order.customer:
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
                    order.delivery_address.city = data['delivery_city']
                if 'delivery_state' in data:
                    order.delivery_address.state = data['delivery_state']
                if 'delivery_zip_code' in data:
                    order.delivery_address.zip_code = data['delivery_zip_code']

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
            from src.utils.order_tags import sanitize_customer_instructions
            order.special_instructions = sanitize_customer_instructions(data['special_instructions'])

        if 'delivery_fee' in data:
            order.delivery_fee = float(data['delivery_fee'])
            order.total_amount = float(order.subtotal or 0) + float(data['delivery_fee'])

        order.updated_at = datetime.now(timezone.utc)
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
                    driver.updated_at = datetime.now(timezone.utc)

        # Cancela
        order.status = OrderStatus.CANCELLED
        order.updated_at = datetime.now(timezone.utc)
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
        # Verificar se entregador foi convertido para próprio
        from src.routes.driver import _check_driver_conversion
        conv = _check_driver_conversion(user_id)
        if conv:
            return conv
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
        fixed_fee = 0
        min_km = 4.0

        logger.info(f"[FRETE] Distancia OSRM: {distance_km} km")

        if restaurant.pricing_table_id:
            from src.models.portal_models import PricingTable
            pt = PricingTable.query.get(restaurant.pricing_table_id)
            if pt:
                fixed_fee = float(pt.fixed_fee or 0)
                if fixed_fee > 0:
                    # Tarifa fixa: valor independente da distância
                    delivery_fee = fixed_fee
                    logger.info(f"[FRETE] Tarifa fixa (pricing table): R${fixed_fee}")
                elif pt.price_per_km:
                    price_per_km = float(pt.price_per_km)
                    min_km = float(pt.min_distance_km or 4.0)
                    km_total = max(distance_km, min_km)
                    delivery_fee = round(km_total * price_per_km, 2)
                    logger.info(f"[FRETE] Pricing table: price_per_km={price_per_km}, min_km={min_km}, km_total={km_total}, fee={delivery_fee}")
                    if pt.min_delivery_fee:
                        delivery_fee = max(delivery_fee, float(pt.min_delivery_fee))
                    if pt.max_delivery_fee:
                        delivery_fee = min(delivery_fee, float(pt.max_delivery_fee))
        elif restaurant.square_id:
            from src.models.portal_models import Square
            sq = Square.query.get(restaurant.square_id)
            if sq:
                fixed_fee = float(sq.fixed_fee or 0)
                if fixed_fee > 0:
                    delivery_fee = fixed_fee
                    logger.info(f"[FRETE] Tarifa fixa (square): R${fixed_fee}")
                elif sq.price_per_km:
                    price_per_km = float(sq.price_per_km)
                    min_km = float(sq.min_distance_km or 4.0)
                    km_total = max(distance_km, min_km)
                    delivery_fee = round(km_total * price_per_km, 2)
                    logger.info(f"[FRETE] Square: price_per_km={price_per_km}, min_km={min_km}, km_total={km_total}, fee={delivery_fee}")
        else:
            logger.info(f"[FRETE] Usando padrao: price_per_km={price_per_km}, min_km={min_km}")
            km_total = max(distance_km, min_km)
            delivery_fee = round(km_total * price_per_km, 2)

        # Aplicar taxas dinâmicas (chuva, demanda alta, feriado)
        if restaurant.square_id:
            from src.models.portal_models import DynamicPricing
            dp = DynamicPricing.query.filter_by(square_id=restaurant.square_id).first()
            if dp:
                extras = []
                if dp.rainy_day_active:
                    delivery_fee += float(dp.rainy_day_bonus or 0)
                    extras.append(f"chuva +R${dp.rainy_day_bonus}")
                if dp.high_demand_active:
                    delivery_fee += float(dp.high_demand_bonus or 0)
                    extras.append(f"alta demanda +R${dp.high_demand_bonus}")
                if dp.holiday_active:
                    delivery_fee += float(dp.holiday_bonus or 0)
                    extras.append(f"feriado +R${dp.holiday_bonus}")
                if extras:
                    logger.info(f"[FRETE] Taxas dinâmicas: {', '.join(extras)}")

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

        # Verificar status do usuário e do tenant
        from src.utils.tenant import check_user_and_tenant_status
        block = check_user_and_tenant_status(user)
        if block:
            return block

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
            if restaurant and not restaurant.is_active:
                return jsonify({'error': 'Seu estabelecimento está inativo. Entre em contato com o administrador.'}), 403
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

            # Verificar se estabelecimento está ativo
            if not restaurant.is_active:
                return jsonify({'error': 'Este estabelecimento está inativo e não pode receber pedidos.'}), 403

        # Busca ou cria cliente final (filtrando por tenant do restaurante)
        customer = Customer.query.filter_by(phone=data['customer_phone'], tenant_id=restaurant.tenant_id).first()
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
        scheduled_at = datetime.now(timezone.utc) + timedelta(minutes=preparation_minutes)

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
            special_instructions=sanitize_customer_instructions(data.get('special_instructions'))
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
        if user.user_type == UserType.DRIVER and (not user.driver or order.driver_id != user.driver.id):
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


