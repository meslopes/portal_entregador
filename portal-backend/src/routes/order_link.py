"""Link de Pedido Rápido (§7.2 do backlog EE): pedido por link/WhatsApp.

O estabelecimento compartilha o link; o cliente abre e faz o pedido sem
instalar nada. Gestão (gerar/copiar) é do portal; o uso é público.
"""
import logging
import secrets
import uuid
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.models.portal_models import (
    Address,
    Customer,
    Order,
    OrderStatus,
    PaymentMethod,
    Restaurant,
    db,
)
from src.utils.auth import client_or_admin_required
from src.utils.restaurant import find_restaurant_by_name
from src.utils.tenant import get_current_user

logger = logging.getLogger(__name__)

order_link_bp = Blueprint('order_link', __name__)


def _meu_restaurante():
    """Restaurante do usuário logado (CLIENT via Customer por nome; ADMIN via query)."""
    user = get_current_user()
    if not user:
        return None
    if user.user_type.value == 'CLIENT':
        customer = Customer.query.filter_by(user_id=user.id).first()
        if customer:
            return find_restaurant_by_name(customer.name)
    rid = request.args.get('restaurant_id', type=int) or (request.get_json(silent=True) or {}).get('restaurant_id')
    if rid:
        return Restaurant.query.get(rid)
    return None


# ==================== GESTÃO (portal) ====================


@order_link_bp.route('/order-link', methods=['GET', 'POST'])
@jwt_required()
@client_or_admin_required
def manage_order_link():
    """Consulta ou (re)gera o token do Link de Pedido Rápido do estabelecimento."""
    try:
        restaurant = _meu_restaurante()
        if not restaurant:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        if request.method == 'POST':
            restaurant.order_link_token = secrets.token_urlsafe(24)
            db.session.commit()

        if not restaurant.order_link_token:
            return jsonify({
                'restaurant_name': restaurant.name,
                'order_link_path': None,
                'message': 'Nenhum link gerado ainda — clique em "Gerar link".',
            }), 200

        return jsonify({
            'restaurant_name': restaurant.name,
            'order_link_path': f'/order/{restaurant.order_link_token}',
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro no link de pedido: {e}")
        return jsonify({'error': str(e)}), 500


# ==================== USO (público) ====================


@order_link_bp.route('/order-link/<token>', methods=['GET'])
def get_order_link(token):
    """Consulta pública: para qual estabelecimento é o link (sem dados sensíveis)."""
    try:
        restaurant = Restaurant.query.filter_by(order_link_token=token).first()
        if not restaurant:
            return jsonify({'error': 'Link não encontrado'}), 404
        return jsonify({
            'valid': bool(restaurant.is_active),
            'restaurant_name': restaurant.name,
            'city': restaurant.square.city if restaurant.square else None,
        }), 200
    except Exception as e:
        logger.error(f"Erro ao consultar link de pedido: {e}")
        return jsonify({'error': str(e)}), 500


@order_link_bp.route('/order-link/<token>', methods=['POST'])
def create_order_from_link(token):
    """Cria o pedido pelo link (público). Body: nome, telefone, endereço, itens."""
    try:
        restaurant = Restaurant.query.filter_by(order_link_token=token).first()
        if not restaurant:
            return jsonify({'error': 'Link não encontrado'}), 404
        if not restaurant.is_active:
            return jsonify({'error': 'Este estabelecimento está inativo no momento.'}), 400

        data = request.get_json() or {}
        customer_name = (data.get('customer_name') or '').strip()
        phone = (data.get('phone') or '').strip()
        street = (data.get('street') or '').strip()
        number = (data.get('number') or '').strip()
        neighborhood = (data.get('neighborhood') or '').strip()
        city = (data.get('city') or '').strip()
        notes = (data.get('notes') or '').strip()
        items_text = (data.get('items') or '').strip()

        if not customer_name or not phone or not street:
            return jsonify({'error': 'Nome, telefone e endereço são obrigatórios'}), 400

        phone_digits = ''.join(filter(str.isdigit, phone))
        if not (10 <= len(phone_digits) <= 11):
            return jsonify({'error': 'Telefone deve ter 10 ou 11 dígitos'}), 400

        # Cliente (mesmo padrão do pedido via WhatsApp)
        customer = Customer(name=customer_name, phone=phone)
        db.session.add(customer)
        db.session.flush()

        addr = Address(
            customer_id=customer.id,
            street=f"{street}, {number}" if number else street,
            neighborhood=neighborhood,
            city=city or (restaurant.square.city if restaurant.square else ''),
            state=restaurant.square.state if restaurant.square else 'RS',
            zip_code='00000-000',
        )
        db.session.add(addr)
        db.session.flush()

        order = Order(
            restaurant_id=restaurant.id,
            customer_id=customer.id,
            delivery_address_id=addr.id,
            order_number=f"LINK{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}",
            items=[{'name': items_text or 'Pedido pelo link', 'quantity': 1, 'price': 0}],
            subtotal=0,
            delivery_fee=0,
            total_amount=0,
            payment_method=PaymentMethod.CASH,
            special_instructions=f"Pedido via Link Rápido{(' — ' + notes) if notes else ''}",
            status=OrderStatus.PENDING,
        )
        db.session.add(order)
        # N1 — numeração curta (#37) também no pedido pelo link rápido
        from src.services.order_helpers import atribuir_numero_curto
        atribuir_numero_curto(order, restaurant)
        db.session.commit()

        # Reanálise por evento: pedido entrou na fila → agenda roteirização
        from src.services.auto_routing import agendar_analise_roteirizacao
        agendar_analise_roteirizacao(order)

        return jsonify({
            'message': 'Pedido criado com sucesso',
            'order_number': order.order_number,
            'seq_number': order.seq_number,
            'restaurant_name': restaurant.name,
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao criar pedido pelo link: {e}")
        return jsonify({'error': str(e)}), 500
