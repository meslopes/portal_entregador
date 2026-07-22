from flask import Blueprint, jsonify, request
from src.models.portal_models import (
    Order, Restaurant, Customer, Address, Driver, User, UserType,
    OrderStatus, PaymentMethod, Delivery, Notification, NotificationType, db
)
from datetime import datetime
import uuid
import hashlib
import hmac

webhook_bp = Blueprint('webhook', __name__)

# Chave de seguranca para webhooks (configuravel via SystemConfig)
WEBHOOK_SECRET = None

def get_webhook_secret():
    """Obtem a chave secreta do webhook do SystemConfig"""
    global WEBHOOK_SECRET
    if WEBHOOK_SECRET is None:
        from src.models.portal_models import SystemConfig
        config = SystemConfig.query.filter_by(config_key='webhook_secret').first()
        WEBHOOK_SECRET = config.config_value if config else 'muvlog-webhook-default-secret'
    return WEBHOOK_SECRET


def verify_webhook_signature(payload, signature):
    """Verifica a assinatura do webhook"""
    secret = get_webhook_secret()
    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@webhook_bp.route('/ifood', methods=['POST'])
def ifood_webhook():
    """
    Webhook para receber pedidos do iFood.
    
    Formato esperado do iFood (adaptado):
    {
        "event": "order_placed" | "order_cancelled",
        "data": {
            "order_id": "ifood-123456",
            "restaurant_id": "rest-789",
            "restaurant_name": "Farmácia da Esquina",
            "customer": {
                "name": "João Silva",
                "phone": "(51) 99999-0000"
            },
            "delivery_address": {
                "street": "Rua Principal, 100",
                "neighborhood": "Centro",
                "city": "Porto Alegre",
                "state": "RS",
                "zip_code": "90000-000",
                "latitude": -29.95,
                "longitude": -50.45
            },
            "items": [
                {"name": "Produto X", "quantity": 1, "price": 25.00}
            ],
            "subtotal": 25.00,
            "delivery_fee": 10.00,
            "total_amount": 35.00,
            "payment_method": "CASH" | "CARD" | "PIX",
            "special_instructions": "Troco para R$ 50"
        }
    }
    """
    try:
        # Verifica assinatura (se configurada)
        signature = request.headers.get('X-Webhook-Signature', '')
        if signature and not verify_webhook_signature(request.data.decode(), signature):
            return jsonify({'error': 'Assinatura inválida'}), 401

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400

        event = data.get('event')
        order_data = data.get('data', {})

        if not event or not order_data:
            return jsonify({'error': 'Evento ou dados ausentes'}), 400

        # Processa根据不同event
        if event == 'order_placed':
            return process_ifood_order(order_data)
        elif event == 'order_cancelled':
            return process_ifood_cancellation(order_data)
        else:
            return jsonify({'message': f'Evento {event} ignorado'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def process_ifood_order(order_data):
    """Processa um pedido recebido do iFood"""
    try:
        # Busca o restaurante pelo nome ou ID externo
        restaurant_name = order_data.get('restaurant_name')
        restaurant = None

        if restaurant_name:
            restaurant = Restaurant.query.filter_by(name=restaurant_name).first()

        if not restaurant:
            # Cria restaurante automaticamente se nao existir
            restaurant = Restaurant(
                name=restaurant_name or 'Estabelecimento iFood',
                address=order_data.get('delivery_address', {}).get('street', 'Endereço não informado'),
                latitude=order_data.get('delivery_address', {}).get('latitude', -29.95),
                longitude=order_data.get('delivery_address', {}).get('longitude', -50.45),
                phone=order_data.get('restaurant_phone')
            )
            db.session.add(restaurant)
            db.session.flush()

        # Busca ou cria cliente final
        customer_data = order_data.get('customer', {})
        customer = None
        if customer_data.get('phone'):
            customer = Customer.query.filter_by(phone=customer_data['phone']).first()

        if not customer:
            customer = Customer(
                name=customer_data.get('name', 'Cliente iFood'),
                phone=customer_data.get('phone', ''),
                email=customer_data.get('email')
            )
            db.session.add(customer)
            db.session.flush()

        # Cria endereco de entrega
        addr_data = order_data.get('delivery_address', {})
        address = Address(
            customer_id=customer.id,
            street=addr_data.get('street', ''),
            complement=addr_data.get('complement', ''),
            neighborhood=addr_data.get('neighborhood', ''),
            city=addr_data.get('city', ''),
            state=addr_data.get('state', ''),
            zip_code=addr_data.get('zip_code', ''),
            latitude=addr_data.get('latitude'),
            longitude=addr_data.get('longitude')
        )
        db.session.add(address)
        db.session.flush()

        # Mapeia metodo de pagamento
        payment_methods = {
            'CASH': PaymentMethod.CASH,
            'CARD': PaymentMethod.CARD,
            'PIX': PaymentMethod.PIX
        }
        payment_method = payment_methods.get(
            order_data.get('payment_method', 'CASH'),
            PaymentMethod.CASH
        )

        # Cria o pedido
        order = Order(
            restaurant_id=restaurant.id,
            customer_id=customer.id,
            delivery_address_id=address.id,
            order_number=f"IFOOD{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}",
            items=order_data.get('items', []),
            subtotal=order_data.get('subtotal', 0),
            delivery_fee=order_data.get('delivery_fee', 0),
            total_amount=order_data.get('total_amount', 0),
            payment_method=payment_method,
            special_instructions=order_data.get('special_instructions'),
            status=OrderStatus.PENDING
        )

        db.session.add(order)
        db.session.commit()

        # Notifica o estabelecimento
        # (o polling do frontend ja vai pegar o novo pedido)

        return jsonify({
            'message': 'Pedido iFood processado com sucesso',
            'order_id': order.id,
            'order_number': order.order_number,
            'status': 'PENDING'
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


def process_ifood_cancellation(order_data):
    """Processa cancelamento de pedido iFood"""
    try:
        external_id = order_data.get('order_id')
        if not external_id:
            return jsonify({'error': 'ID do pedido ausente'}), 400

        # Busca pedido pelo numero (iFood prefix)
        order = Order.query.filter(
            Order.order_number.like(f'IFOOD%{external_id}%')
        ).first()

        if not order:
            # Tenta buscar por restaurante
            restaurant_name = order_data.get('restaurant_name')
            if restaurant_name:
                restaurant = Restaurant.query.filter_by(name=restaurant_name).first()
                if restaurant:
                    order = Order.query.filter(
                        Order.restaurant_id == restaurant.id,
                        Order.status.in_([OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING])
                    ).order_by(Order.created_at.desc()).first()

        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404

        if order.status in [OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
            return jsonify({'error': 'Pedido já finalizado'}), 400

        # Cancela
        order.status = OrderStatus.CANCELLED
        order.updated_at = datetime.utcnow()
        order.driver_id = None

        if order.delivery:
            db.session.delete(order.delivery)

        db.session.commit()

        return jsonify({
            'message': 'Pedido cancelado via iFood',
            'order_number': order.order_number
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# WEBHOOK GENERICo (para outras plataformas)
# ============================================

@webhook_bp.route('/generic', methods=['POST'])
def generic_webhook():
    """
    Webhook generico para integracao com outras plataformas.
    Aceita o mesmo formato padrao do iFood.
    """
    return ifood_webhook()


# ============================================
# ENDPOINT DE TESTE
# ============================================

@webhook_bp.route('/test', methods=['POST'])
def test_webhook():
    """Endpoint de teste para simular um pedido iFood"""
    try:
        test_data = {
            'event': 'order_placed',
            'data': {
                'restaurant_name': 'Maria Cliente',
                'customer': {
                    'name': 'Cliente Teste iFood',
                    'phone': '(51) 98888-7777'
                },
                'delivery_address': {
                    'street': 'Rua Teste iFood, 123',
                    'neighborhood': 'Centro',
                    'city': 'Porto Alegre',
                    'state': 'RS',
                    'zip_code': '90000-000',
                    'latitude': -29.95,
                    'longitude': -50.45
                },
                'items': [
                    {'name': 'Produto Teste iFood', 'quantity': 1, 'price': 35.00}
                ],
                'subtotal': 35.00,
                'delivery_fee': 15.00,
                'total_amount': 50.00,
                'payment_method': 'CASH',
                'special_instructions': 'Pedido de teste via iFood'
            }
        }

        result = process_ifood_order(test_data['data'])
        return result

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# WEBHOOK WHATSAPP
# ============================================

@webhook_bp.route('/whatsapp', methods=['GET'])
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


@webhook_bp.route('/whatsapp', methods=['POST'])
def whatsapp_webhook():
    """Recebe mensagens do WhatsApp e processa pedidos"""
    try:
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
        print(f"Erro ao processar mensagem WhatsApp: {e}")


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
        except:
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
        print(f"Erro ao criar pedido WhatsApp: {e}")


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
        print(f"Erro ao enviar status WhatsApp: {e}")


# ============================================
# WEBHOOK 99FOOD
# ============================================

@webhook_bp.route('/99food', methods=['POST'])
def food99_webhook():
    """
    Webhook para receber pedidos do 99Food.
    Formato similar ao iFood.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400

        event = data.get('event')
        order_data = data.get('data', {})

        if event == 'order_placed':
            return process_platform_order(order_data, '99FOOD')
        elif event == 'order_cancelled':
            return process_platform_cancellation(order_data, '99FOOD')
        else:
            return jsonify({'message': f'Evento {event} ignorado'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# WEBHOOK INSTADELIVERY
# ============================================

@webhook_bp.route('/instadelivery', methods=['POST'])
def instadelivery_webhook():
    """
    Webhook para receber pedidos do InstaDelivery.
    Formato similar ao iFood.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400

        event = data.get('event')
        order_data = data.get('data', {})

        if event == 'order_placed':
            return process_platform_order(order_data, 'INSTADELIVERY')
        elif event == 'order_cancelled':
            return process_platform_cancellation(order_data, 'INSTADELIVERY')
        else:
            return jsonify({'message': f'Evento {event} ignorado'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# WEBHOOK SAIPOS
# ============================================

@webhook_bp.route('/saipos', methods=['POST'])
def saipos_webhook():
    """
    Webhook para receber pedidos do SaiPos.
    Formato similar ao iFood.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400

        event = data.get('event')
        order_data = data.get('data', {})

        if event == 'order_placed':
            return process_platform_order(order_data, 'SAIPOS')
        elif event == 'order_cancelled':
            return process_platform_cancellation(order_data, 'SAIPOS')
        else:
            return jsonify({'message': f'Evento {event} ignorado'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# PROCESSADOR GENERICO DE PLATAFORMAS
# ============================================

def process_platform_order(order_data, platform):
    """Processa pedido de qualquer plataforma (99Food, InstaDelivery, SaiPos)"""
    try:
        # Busca o restaurante pelo nome ou ID externo
        restaurant_name = order_data.get('restaurant_name')
        restaurant = None

        if restaurant_name:
            restaurant = Restaurant.query.filter_by(name=restaurant_name).first()

        if not restaurant:
            restaurant = Restaurant(
                name=restaurant_name or f'Estabelecimento {platform}',
                address=order_data.get('delivery_address', {}).get('street', 'Endereço não informado'),
                latitude=order_data.get('delivery_address', {}).get('latitude', -29.95),
                longitude=order_data.get('delivery_address', {}).get('longitude', -50.45),
                phone=order_data.get('restaurant_phone')
            )
            db.session.add(restaurant)
            db.session.flush()

        # Busca ou cria cliente final
        customer_data = order_data.get('customer', {})
        customer = None
        if customer_data.get('phone'):
            customer = Customer.query.filter_by(phone=customer_data['phone']).first()

        if not customer:
            customer = Customer(
                name=customer_data.get('name', f'Cliente {platform}'),
                phone=customer_data.get('phone', ''),
                email=customer_data.get('email')
            )
            db.session.add(customer)
            db.session.flush()

        # Cria endereco de entrega
        addr_data = order_data.get('delivery_address', {})
        address = Address(
            customer_id=customer.id,
            street=addr_data.get('street', ''),
            complement=addr_data.get('complement', ''),
            neighborhood=addr_data.get('neighborhood', ''),
            city=addr_data.get('city', ''),
            state=addr_data.get('state', ''),
            zip_code=addr_data.get('zip_code', ''),
            latitude=addr_data.get('latitude'),
            longitude=addr_data.get('longitude')
        )
        db.session.add(address)
        db.session.flush()

        # Mapeia metodo de pagamento
        payment_methods = {
            'CASH': PaymentMethod.CASH,
            'CARD': PaymentMethod.CARD,
            'PIX': PaymentMethod.PIX
        }
        payment_method = payment_methods.get(
            order_data.get('payment_method', 'CASH'),
            PaymentMethod.CASH
        )

        # Cria o pedido
        order = Order(
            restaurant_id=restaurant.id,
            customer_id=customer.id,
            delivery_address_id=address.id,
            order_number=f"{platform}{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}",
            items=order_data.get('items', []),
            subtotal=order_data.get('subtotal', 0),
            delivery_fee=order_data.get('delivery_fee', 0),
            total_amount=order_data.get('total_amount', 0),
            payment_method=payment_method,
            special_instructions=order_data.get('special_instructions'),
            status=OrderStatus.PENDING
        )

        db.session.add(order)
        db.session.commit()

        return jsonify({
            'message': f'Pedido {platform} processado com sucesso',
            'order_id': order.id,
            'order_number': order.order_number,
            'status': 'PENDING'
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


def process_platform_cancellation(order_data, platform):
    """Processa cancelamento de qualquer plataforma"""
    try:
        external_id = order_data.get('order_id')
        if not external_id:
            return jsonify({'error': 'ID do pedido ausente'}), 400

        # Busca pedido pelo numero (prefixo da plataforma)
        order = Order.query.filter(
            Order.order_number.like(f'{platform}%')
        ).order_by(Order.created_at.desc()).first()

        if not order:
            restaurant_name = order_data.get('restaurant_name')
            if restaurant_name:
                restaurant = Restaurant.query.filter_by(name=restaurant_name).first()
                if restaurant:
                    order = Order.query.filter(
                        Order.restaurant_id == restaurant.id,
                        Order.status.in_([OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING])
                    ).order_by(Order.created_at.desc()).first()

        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404

        if order.status in [OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
            return jsonify({'error': 'Pedido já finalizado'}), 400

        # Cancela
        order.status = OrderStatus.CANCELLED
        order.updated_at = datetime.utcnow()
        order.driver_id = None

        if order.delivery:
            db.session.delete(order.delivery)

        db.session.commit()

        return jsonify({
            'message': f'Pedido cancelado via {platform}',
            'order_number': order.order_number
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
