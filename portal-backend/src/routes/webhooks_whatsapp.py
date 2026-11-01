"""Webhooks e robô do WhatsApp.

Extraído de order.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
"""
import logging
import uuid
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from src.models.portal_models import (
    Address,
    Customer,
    Order,
    OrderStatus,
    PaymentMethod,
    Restaurant,
    db,
)
from src.routes.webhooks import (
    require_webhook_auth,
)
from src.utils.geo import haversine_distance

logger = logging.getLogger(__name__)


webhooks_whatsapp_bp = Blueprint('webhooks_whatsapp', __name__)


@webhooks_whatsapp_bp.route('/whatsapp', methods=['GET'])
def whatsapp_verify():
    """Verificacao do webhook WhatsApp (Meta Business)"""
    mode = request.args.get('hub.mode')
    token = request.args.get('hub.verify_token')
    challenge = request.args.get('hub.challenge')

    from src.models.portal_models import SystemConfig
    config = SystemConfig.query.filter_by(config_key='whatsapp_verify_token').first()
    expected_token = config.config_value if config else 'muvlog-whatsapp-verify'

    if mode == 'subscribe' and token == expected_token:
        return challenge, 200
    return 'Forbidden', 403


@webhooks_whatsapp_bp.route('/whatsapp', methods=['POST'])
def whatsapp_webhook():
    """Recebe mensagens do WhatsApp e processa pedidos. Exige autenticação."""
    try:
        auth_err = require_webhook_auth('WHATSAPP')
        if auth_err:
            return auth_err

        data = request.get_json()

        if not data or 'entry' not in data:
            return jsonify({'status': 'ignored'}), 200

        for entry in data['entry']:
            for change in entry.get('changes', []):
                value = change.get('value', {})
                messages = value.get('messages', [])

                for message in messages:
                    process_whatsapp_message(message)

        return jsonify({'status': 'ok'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def process_whatsapp_message(message):
    """Processa uma mensagem recebida via WhatsApp"""
    try:
        from src.services.whatsapp import whatsapp_service

        phone = message.get('from', '')
        msg_type = message.get('type', '')
        text = message.get('text', {}).get('body', '') if msg_type == 'text' else ''

        if not text:
            return

        text_lower = text.lower().strip()

        # Comando: aceitar/recusar pedido via WhatsApp
        if text_lower in ['sim', 's', 'aceito', 'aceitar']:
            process_driver_response_whatsapp(phone, 'ACCEPT')
        elif text_lower in ['nao', 'não', 'n', 'recuso', 'recusar']:
            process_driver_response_whatsapp(phone, 'REJECT')

        # Comando: criar pedido
        # Formato: "pedido [restaurante] [cliente] [endereco] [valor]"
        # Ex: "pedido Padaria Central Joao Rua Principal 100 25.90"
        if text_lower.startswith('pedido '):
            parts = text.split(' ', 1)[1].split(' | ')
            if len(parts) >= 3:
                create_order_from_whatsapp(phone, parts)

        # Comando: status
        elif text_lower.startswith('status '):
            order_number = text.split(' ', 1)[1].strip()
            send_order_status_whatsapp(phone, order_number)

        # Comando: ajuda
        elif text_lower in ['ajuda', 'help', 'menu']:
            whatsapp_service.send_message(phone,
                "📋 *Comandos disponíveis:*\n\n"
                "• *pedido [restaurante] | [cliente] | [endereco] | [valor]*\n"
                "  Criar um novo pedido\n\n"
                "• *status [numero do pedido]*\n"
                "  Verificar status de um pedido\n\n"
                "• *ajuda*\n"
                "  Mostrar esta mensagem"
            )

    except Exception as e:
        logger.error(f"Erro ao processar mensagem WhatsApp: {e}")


def create_order_from_whatsapp(phone, parts):
    """Cria um pedido a partir de mensagem WhatsApp"""
    try:
        from src.services.whatsapp import whatsapp_service

        restaurant_name = parts[0].strip() if len(parts) > 0 else ''
        customer_name = parts[1].strip() if len(parts) > 1 else ''
        address = parts[2].strip() if len(parts) > 2 else ''
        amount_str = parts[3].strip() if len(parts) > 3 else '0'

        try:
            total_amount = float(amount_str.replace('R$', '').replace(',', '.').strip())
        except (ValueError, TypeError):
            total_amount = 0

        # Busca restaurante
        restaurant = Restaurant.query.filter_by(name=restaurant_name).first()
        if not restaurant:
            restaurant = Restaurant(
                name=restaurant_name,
                address='Endereço não informado',
                latitude=-29.95,
                longitude=-50.45
            )
            db.session.add(restaurant)
            db.session.flush()

        # Verificar se estabelecimento está ativo
        if not restaurant.is_active:
            from src.services.whatsapp import whatsapp_service
            whatsapp_service.send_message(phone, "Este estabelecimento está inativo no momento. Não é possível fazer pedidos.")
            return

        # Cria cliente
        customer = Customer(
            name=customer_name,
            phone=phone,
        )
        db.session.add(customer)
        db.session.flush()

        # Cria endereco
        addr = Address(
            customer_id=customer.id,
            street=address,
            neighborhood='',
            city='Porto Alegre',
            state='RS',
            zip_code='90000-000'
        )
        db.session.add(addr)
        db.session.flush()

        # Cria pedido
        order = Order(
            restaurant_id=restaurant.id,
            customer_id=customer.id,
            delivery_address_id=addr.id,
            order_number=f"WHATS{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}",
            items=[{'name': 'Pedido WhatsApp', 'quantity': 1, 'price': total_amount}],
            subtotal=total_amount,
            delivery_fee=total_amount * 0.1,  # 10% de frete
            total_amount=total_amount * 1.1,
            payment_method=PaymentMethod.CASH,
            special_instructions=f"Pedido via WhatsApp de {phone}",
            status=OrderStatus.PENDING
        )

        db.session.add(order)
        db.session.commit()

        # Notifica
        whatsapp_service.send_message(phone,
            f"✅ *Pedido Criado!*\n\n"
            f"Pedido: #{order.order_number}\n"
            f"Restaurante: {restaurant.name}\n"
            f"Total: R$ {order.total_amount:.2f}\n\n"
            f"Aguardando entregador..."
        )

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao criar pedido WhatsApp: {e}")


def send_order_status_whatsapp(phone, order_number):
    """Envia status de um pedido via WhatsApp"""
    try:
        from src.services.whatsapp import whatsapp_service

        order = Order.query.filter_by(order_number=order_number).first()
        if not order:
            whatsapp_service.send_message(phone, f"❌ Pedido #{order_number} não encontrado.")
            return

        status_texts = {
            OrderStatus.PENDING: "⏳ Pendente",
            OrderStatus.ACCEPTED: "✅ Aceito",
            OrderStatus.PREPARING: "👨‍🍳 Preparando",
            OrderStatus.READY: "📦 Pronto",
            OrderStatus.PICKED_UP: "🚚 A caminho",
            OrderStatus.DELIVERED: "✅ Entregue",
            OrderStatus.CANCELLED: "❌ Cancelado"
        }

        status_text = status_texts.get(order.status, order.status.value)

        whatsapp_service.send_message(phone,
            f"📋 *Status do Pedido*\n\n"
            f"Pedido: #{order.order_number}\n"
            f"Status: {status_text}\n"
            f"Total: R$ {order.total_amount:.2f}"
        )

    except Exception as e:
        logger.error(f"Erro ao enviar status WhatsApp: {e}")


# ============================================
# WEBHOOK 99FOOD
# ============================================

def process_driver_response_whatsapp(phone, action):
    """Processa resposta do entregador via WhatsApp (SIM/NAO)"""
    try:
        from src.models.portal_models import Driver, Order, OrderStatus, User
        from src.services.whatsapp import whatsapp_service

        # Busca o entregador pelo telefone
        user = User.query.filter_by(phone=phone).first()
        if not user or user.user_type.value != 'DRIVER':
            return

        driver = Driver.query.filter_by(user_id=user.id).first()
        if not driver:
            return

        # Busca o pedido pendente mais recente DO MESMO TENANT do entregador
        pending_order = Order.query.filter(
            Order.status == OrderStatus.PENDING,
            Order.tenant_id == driver.tenant_id
        ).order_by(Order.created_at.desc()).first()

        if not pending_order:
            whatsapp_service.send_message(phone, "❌ Nenhum pedido disponível no momento.")
            return

        if action == 'ACCEPT':
            # Aceita o pedido
            pending_order.driver_id = driver.id
            pending_order.status = OrderStatus.ACCEPTED
            pending_order.updated_at = datetime.now(timezone.utc)

            # Cria registro de entrega
            from src.models.portal_models import Delivery
            delivery = Delivery(
                order_id=pending_order.id,
                driver_id=driver.id,
                pickup_latitude=pending_order.restaurant.latitude,
                pickup_longitude=pending_order.restaurant.longitude,
                delivery_latitude=pending_order.delivery_address.latitude,
                delivery_longitude=pending_order.delivery_address.longitude
            )

            # Calcula ganhos usando Haversine (% configurável)
            driver_pct = 0.70
            if pending_order.restaurant and pending_order.restaurant.pricing_table_id:
                from src.models.portal_models import PricingTable
                pt = PricingTable.query.get(pending_order.restaurant.pricing_table_id)
                if pt and pt.driver_percentage:
                    driver_pct = float(pt.driver_percentage) / 100.0
            elif pending_order.restaurant and pending_order.restaurant.square_id:
                from src.models.portal_models import Square
                sq = Square.query.get(pending_order.restaurant.square_id)
                if sq and sq.driver_percentage:
                    driver_pct = float(sq.driver_percentage) / 100.0
            base_earning = float(pending_order.delivery_fee) * driver_pct
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
            db.session.commit()

            # Notifica o entregador
            whatsapp_service.send_order_accepted_by_whatsapp(phone, pending_order.order_number)

            # Notifica o estabelecimento
            if pending_order.restaurant and pending_order.restaurant.phone:
                whatsapp_service.send_message(
                    pending_order.restaurant.phone,
                    f"✅ Pedido #{pending_order.order_number} foi aceito por {user.first_name} {user.last_name}"
                )

            logger.info(f"Pedido #{pending_order.order_number} aceito via WhatsApp por {user.first_name}")

        elif action == 'REJECT':
            # Busca proximo entregador
            from src.services.order_helpers import find_nearest_available_driver
            next_driver = find_nearest_available_driver(pending_order, exclude_driver_ids=[driver.id])

            if next_driver and next_driver.user.phone:
                # Calcula distancia usando Haversine
                km_total = 0
                driver_pct = 0.70
                if pending_order.restaurant and pending_order.restaurant.pricing_table_id:
                    from src.models.portal_models import PricingTable
                    pt = PricingTable.query.get(pending_order.restaurant.pricing_table_id)
                    if pt and pt.driver_percentage:
                        driver_pct = float(pt.driver_percentage) / 100.0
                elif pending_order.restaurant and pending_order.restaurant.square_id:
                    from src.models.portal_models import Square
                    sq = Square.query.get(pending_order.restaurant.square_id)
                    if sq and sq.driver_percentage:
                        driver_pct = float(sq.driver_percentage) / 100.0
                driver_earnings = float(pending_order.delivery_fee) * driver_pct
                if pending_order.delivery_address and pending_order.delivery_address.latitude and pending_order.restaurant and pending_order.restaurant.latitude:
                    km_total = haversine_distance(
                        pending_order.restaurant.latitude, pending_order.restaurant.longitude,
                        pending_order.delivery_address.latitude, pending_order.delivery_address.longitude
                    )
                    driver_earnings = float(pending_order.delivery_fee) * driver_pct + (km_total * 0.5)

                whatsapp_service.send_new_order_to_driver(
                    next_driver.user.phone,
                    {
                        'order_number': pending_order.order_number,
                        'restaurant': pending_order.restaurant.name if pending_order.restaurant else 'N/A',
                        'restaurant_address': pending_order.restaurant.address if pending_order.restaurant else 'N/A',
                        'customer_name': pending_order.customer.name if pending_order.customer else 'N/A',
                        'delivery_address': f"{pending_order.delivery_address.street}, {pending_order.delivery_address.neighborhood}" if pending_order.delivery_address else 'N/A',
                        'total_amount': float(pending_order.total_amount),
                        'delivery_fee': float(pending_order.delivery_fee),
                        'distance_km': km_total,
                        'driver_earnings': driver_earnings
                    }
                )

            whatsapp_service.send_order_rejected_by_whatsapp(phone, pending_order.order_number)
            logger.info(f"Pedido #{pending_order.order_number} recusado via WhatsApp por {user.first_name}")

    except Exception as e:
        logger.error(f"Erro ao processar resposta WhatsApp do entregador: {e}")


# ============================================
# WEBHOOK ASAAS (Pagamentos)
# ============================================


