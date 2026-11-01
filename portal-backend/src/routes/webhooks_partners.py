"""Webhooks de parceiros (99Food, InstaDelivery, Saipos).

Extraído de order.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
"""
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

webhooks_partners_bp = Blueprint('webhooks_partners', __name__)


@webhooks_partners_bp.route('/99food', methods=['POST'])
def food99_webhook():
    """
    Webhook para receber pedidos do 99Food.
    Formato similar ao iFood. Exige autenticação (HMAC ou token).
    """
    try:
        auth_err = require_webhook_auth('99FOOD')
        if auth_err:
            return auth_err

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

@webhooks_partners_bp.route('/instadelivery', methods=['POST'])
def instadelivery_webhook():
    """
    Webhook para receber pedidos do InstaDelivery.
    Formato similar ao iFood. Exige autenticação (HMAC ou token).
    """
    try:
        auth_err = require_webhook_auth('INSTADELIVERY')
        if auth_err:
            return auth_err

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

@webhooks_partners_bp.route('/saipos', methods=['POST'])
def saipos_webhook():
    """
    Webhook para receber pedidos do SaiPos.
    Formato similar ao iFood. Exige autenticação (HMAC ou token).
    """
    try:
        auth_err = require_webhook_auth('SAIPOS')
        if auth_err:
            return auth_err

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
        order.updated_at = datetime.now(timezone.utc)
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



