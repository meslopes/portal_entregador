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
