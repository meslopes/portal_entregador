from flask import Blueprint, jsonify, request
from src.models.portal_models import (
    Order, Restaurant, Customer, Address, Driver, User, UserType,
    OrderStatus, PaymentMethod, Delivery, Notification, NotificationType, db
)
from datetime import datetime
import uuid
import hashlib
import hmac
import math


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calcula distância entre dois pontos usando fórmula de Haversine (em km)"""
    if not all([lat1, lon1, lat2, lon2]):
        return 0
    lat1, lon1, lat2, lon2 = map(math.radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return 6371 * c  # Raio da Terra em km

webhook_bp = Blueprint('webhook', __name__)

def get_webhook_secret():
    """Obtem a chave secreta do webhook do SystemConfig (sempre le do banco)"""
    from src.models.portal_models import SystemConfig
    config = SystemConfig.query.filter_by(config_key='webhook_secret').first()
    return config.config_value if config else 'muvlog-webhook-default-secret'


def verify_webhook_signature(payload, signature):
    """Verifica a assinatura do webhook"""
    secret = get_webhook_secret()
    expected = hmac.HMAC(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@webhook_bp.route('/ifood', methods=['POST'])
def ifood_webhook():
    """
    Webhook para receber pedidos do iFood.
    Suporta formato real do iFood (Open Delivery) e formato adaptado.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400

        # Detectar formato: real (Open Delivery) ou adaptado
        # Formato real: tem 'id' e 'merchant' no nível raiz
        # Formato adaptado: tem 'event' e 'data'
        if 'event' in data:
            # Formato adaptado (legado)
            event = data.get('event')
            order_data = data.get('data', {})
            if event == 'order_placed':
                return process_ifood_order(order_data)
            elif event == 'order_cancelled':
                return process_ifood_cancellation(order_data)
            else:
                return jsonify({'message': f'Evento {event} ignorado'}), 200
        elif 'id' in data and 'merchant' in data:
            # Formato real do iFood (Open Delivery)
            return process_ifood_order_real(data)
        else:
            # Tentar como array de eventos (formato real do iFood)
            if isinstance(data, list):
                for event in data:
                    process_ifood_event(event)
                return jsonify({'status': 'ok'}), 200
            return jsonify({'error': 'Formato não reconhecido'}), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def process_ifood_event(event_data):
    """Processa um evento individual do iFood (formato Open Delivery)"""
    try:
        event_type = event_data.get('type', '').upper()
        order_data = event_data.get('order', event_data)
        
        if event_type in ['PLACED', 'ORDER_PLACED']:
            process_ifood_order_real(order_data)
        elif event_type in ['CANCELLED', 'ORDER_CANCELLED']:
            if order_data.get('id'):
                process_ifood_cancellation_real(order_data)
        elif event_type in ['CONFIRMED', 'DISPATCHED', 'DELIVERED']:
            # Atualizar status do pedido existente
            update_order_from_ifood_status(order_data, event_type)
    except Exception as e:
        logger.error(f"Erro ao processar evento iFood: {e}")


def process_ifood_order_real(order_data):
    """Processa um pedido no formato real do iFood (Open Delivery)"""
    try:
        from src.services.ifood_service import parse_ifood_order
        
        parsed = parse_ifood_order(order_data)
        if not parsed:
            return jsonify({'error': 'Erro ao processar pedido'}), 400
        
        # Buscar restaurante por nome
        restaurant = None
        if parsed.get('restaurant_name'):
            restaurant = Restaurant.query.filter_by(name=parsed['restaurant_name']).first()
        if not restaurant:
            restaurant = Restaurant(
                name=parsed['restaurant_name'],
                address=parsed['delivery_address'].get('street', 'Endereço não informado'),
                latitude=parsed['delivery_address'].get('latitude', -29.95),
                longitude=parsed['delivery_address'].get('longitude', -50.45)
            )
            db.session.add(restaurant)
            db.session.flush()
        
        # Buscar ou criar cliente
        customer = None
        if parsed['customer'].get('phone'):
            customer = Customer.query.filter_by(phone=parsed['customer']['phone']).first()
        if not customer:
            customer = Customer(
                name=parsed['customer']['name'],
                phone=parsed['customer']['phone']
            )
            db.session.add(customer)
            db.session.flush()
        
        # Criar endereço
        addr = Address(
            customer_id=customer.id,
            street=parsed['delivery_address'].get('street', ''),
            neighborhood=parsed['delivery_address'].get('neighborhood', ''),
            city=parsed['delivery_address'].get('city', ''),
            state=parsed['delivery_address'].get('state', ''),
            zip_code=parsed['delivery_address'].get('zip_code', ''),
            latitude=parsed['delivery_address'].get('latitude'),
            longitude=parsed['delivery_address'].get('longitude')
        )
        db.session.add(addr)
        db.session.flush()
        
        # Mapear pagamento
        payment_methods = {'CASH': PaymentMethod.CASH, 'CARD': PaymentMethod.CARD, 'PIX': PaymentMethod.PIX}
        payment_method = payment_methods.get(parsed['payment_method'], PaymentMethod.CASH)
        
        # Criar pedido
        order = Order(
            restaurant_id=restaurant.id,
            customer_id=customer.id,
            delivery_address_id=addr.id,
            order_number=parsed['order_number'],
            external_id=parsed['external_id'],
            platform_source='IFOOD',
            items=parsed['items'],
            subtotal=parsed['subtotal'],
            delivery_fee=parsed['delivery_fee'],
            total_amount=parsed['total_amount'],
            payment_method=payment_method,
            special_instructions=parsed.get('special_instructions'),
            status=OrderStatus.PENDING
        )
        db.session.add(order)
        db.session.commit()
        
        logger.info(f"Pedido iFood {order.order_number} criado (ID externo: {order.external_id})")
        return jsonify({
            'message': 'Pedido iFood processado com sucesso',
            'order_id': order.id,
            'order_number': order.order_number,
            'external_id': order.external_id,
            'status': 'PENDING'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao processar pedido iFood real: {e}")
        return jsonify({'error': str(e)}), 500


def process_ifood_cancellation_real(order_data):
    """Processa cancelamento no formato real do iFood"""
    try:
        external_id = order_data.get('id')
        if not external_id:
            return
        
        order = Order.query.filter_by(external_id=external_id, platform_source='IFOOD').first()
        if not order:
            order = Order.query.filter(Order.order_number.like(f'%{external_id}%')).first()
        
        if order and order.status not in [OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
            order.status = OrderStatus.CANCELLED
            order.updated_at = datetime.utcnow()
            if order.delivery:
                db.session.delete(order.delivery)
            db.session.commit()
            logger.info(f"Pedido iFood {order.order_number} cancelado via webhook")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao cancelar pedido iFood: {e}")


def update_order_from_ifood_status(order_data, ifood_status):
    """Atualiza status de um pedido baseado em callback do iFood"""
    try:
        from src.services.ifood_service import IFOOD_STATUS_MAP
        
        external_id = order_data.get('id')
        if not external_id:
            return
        
        order = Order.query.filter_by(external_id=external_id, platform_source='IFOOD').first()
        if not order:
            return
        
        new_status = IFOOD_STATUS_MAP.get(ifood_status)
        if new_status and hasattr(OrderStatus, new_status):
            order.status = OrderStatus[new_status]
            order.updated_at = datetime.utcnow()
            db.session.commit()
            logger.info(f"Status do pedido iFood {order.order_number} atualizado para {new_status}")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao atualizar status do pedido iFood: {e}")


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


def process_driver_response_whatsapp(phone, action):
    """Processa resposta do entregador via WhatsApp (SIM/NAO)"""
    try:
        from src.services.whatsapp import whatsapp_service
        from src.models.portal_models import User, Driver, Order, OrderStatus, Notification, NotificationType

        # Busca o entregador pelo telefone
        user = User.query.filter_by(phone=phone).first()
        if not user or user.user_type.value != 'DRIVER':
            return

        driver = Driver.query.filter_by(user_id=user.id).first()
        if not driver:
            return

        # Busca o pedido pendente mais recente
        pending_order = Order.query.filter(
            Order.status == OrderStatus.PENDING
        ).order_by(Order.created_at.desc()).first()

        if not pending_order:
            whatsapp_service.send_message(phone, "❌ Nenhum pedido disponível no momento.")
            return

        if action == 'ACCEPT':
            # Aceita o pedido
            pending_order.driver_id = driver.id
            pending_order.status = OrderStatus.ACCEPTED
            pending_order.updated_at = datetime.utcnow()

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

            print(f"Pedido #{pending_order.order_number} aceito via WhatsApp por {user.first_name}")

        elif action == 'REJECT':
            # Busca proximo entregador
            from src.routes.order import find_nearest_available_driver
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
            print(f"Pedido #{pending_order.order_number} recusado via WhatsApp por {user.first_name}")

    except Exception as e:
        print(f"Erro ao processar resposta WhatsApp do entregador: {e}")


# ============================================
# WEBHOOK ASAAS (Pagamentos)
# ============================================

@webhook_bp.route('/asaas', methods=['POST'])
def asaas_webhook():
    """
    Webhook para receber notificações do Asaas.
    Eventos: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE, etc.
    """
    try:
        from src.services.asaas_service import verify_webhook_token

        # Verificar token do webhook
        token = request.headers.get('asaas-access-token', '')
        if not verify_webhook_token(token):
            return jsonify({'error': 'Token inválido'}), 401

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400

        event = data.get('event')
        payment = data.get('payment', {})

        if not event or not payment:
            return jsonify({'status': 'ignored'}), 200

        payment_id = payment.get('id')
        external_ref = payment.get('externalReference', '')
        status = payment.get('status')

        logger.info(f"Asaas webhook: event={event}, payment={payment_id}, status={status}")

        # Processar conforme o evento
        if event in ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED']:
            process_asaas_payment_received(payment_id, external_ref, payment)
        elif event == 'PAYMENT_OVERDUE':
            process_asaas_payment_overdue(payment_id, external_ref)
        elif event == 'PAYMENT_REFUNDED':
            process_asaas_payment_refunded(payment_id, external_ref)

        return jsonify({'status': 'ok'}), 200

    except Exception as e:
        logger.error(f"Erro no webhook Asaas: {e}")
        return jsonify({'error': str(e)}), 500


def process_asaas_payment_received(payment_id, external_ref, payment_data):
    """Processa pagamento recebido via Asaas"""
    try:
        from src.models.portal_models import Invoice, Payment, PaymentStatus, Driver, Delivery, Order, OrderStatus
        from decimal import Decimal

        # Verificar se é pagamento de fatura (invoice)
        if external_ref and external_ref.startswith('INV-'):
            invoice_id = external_ref.replace('INV-', '')
            invoice = Invoice.query.get(int(invoice_id))
            if invoice and invoice.status != 'PAID':
                invoice.status = 'PAID'
                invoice.paid_at = datetime.utcnow()

                # Desbloquear saldo dos entregadores
                deliveries = Delivery.query.join(Order).filter(
                    Order.restaurant_id == invoice.restaurant_id,
                    Order.status == OrderStatus.DELIVERED,
                    Order.delivery_time >= invoice.week_start,
                    Order.delivery_time < invoice.week_end
                ).all()

                for delivery in deliveries:
                    driver = Driver.query.get(delivery.driver_id)
                    if driver:
                        earnings = Decimal(str(float(delivery.driver_earnings or 0)))
                        driver.locked_balance = (driver.locked_balance or Decimal('0')) - earnings
                        driver.balance = (driver.balance or Decimal('0')) + earnings
                        driver.updated_at = datetime.utcnow()

                db.session.commit()
                logger.info(f"Fatura #{invoice.id} marcada como paga via Asaas - saldos desbloqueados")
                return

        # Verificar se é pagamento de saque (withdrawal)
        if external_ref and external_ref.startswith('WDR-'):
            withdrawal_id = external_ref.replace('WDR-', '')
            withdrawal = Payment.query.get(int(withdrawal_id))
            if withdrawal:
                withdrawal.status = PaymentStatus.PROCESSED
                db.session.commit()
                logger.info(f"Saque #{withdrawal.id} processado via Asaas")
                return

    except Exception as e:
        logger.error(f"Erro ao processar pagamento Asaas: {e}")


def process_asaas_payment_overdue(payment_id, external_ref):
    """Processa pagamento vencido"""
    try:
        from src.models.portal_models import Invoice
        if external_ref and external_ref.startswith('INV-'):
            invoice_id = external_ref.replace('INV-', '')
            invoice = Invoice.query.get(int(invoice_id))
            if invoice:
                invoice.status = 'OVERDUE'
                db.session.commit()
                logger.info(f"Fatura #{invoice.id} marcada como vencida")
    except Exception as e:
        logger.error(f"Erro ao processar vencimento Asaas: {e}")


def process_asaas_payment_refunded(payment_id, external_ref):
    """Processa estorno de pagamento"""
    try:
        from src.models.portal_models import Invoice
        if external_ref and external_ref.startswith('INV-'):
            invoice_id = external_ref.replace('INV-', '')
            invoice = Invoice.query.get(int(invoice_id))
            if invoice:
                invoice.status = 'REFUNDED'
                db.session.commit()
                logger.info(f"Fatura #{invoice.id} estornada")
    except Exception as e:
        logger.error(f"Erro ao processar estorno Asaas: {e}")


import logging
logger = logging.getLogger(__name__)
