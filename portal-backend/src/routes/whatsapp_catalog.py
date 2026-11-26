"""
WhatsApp — Cardápio de produtos por estabelecimento (Fase 3 — 2026-11-25).
CRUD de produtos + gerenciamento de sessão de pedido. Tudo configurável pelo EST.
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from src.models.portal_models import (
    User, UserType, Restaurant, Customer,
    WhatsAppProduct, WhatsAppOrderSession, db,
)
from src.utils.auth import client_or_admin_required
from src.utils.restaurant import find_restaurant_by_name

whatsapp_catalog_bp = Blueprint('whatsapp_catalog', __name__)


def _meu_restaurante(user):
    if user.user_type == UserType.CLIENT:
        customer = Customer.query.filter_by(user_id=user.id).first()
        if customer:
            return find_restaurant_by_name(customer.name)
    return None


# ── CRUD de produtos ──────────────────────────────────────────────

@whatsapp_catalog_bp.route('/whatsapp/products', methods=['GET'])
@jwt_required()
@client_or_admin_required
def list_products():
    """Lista produtos do cardápio WhatsApp do estabelecimento."""
    try:
        user = User.query.get(int(get_jwt_identity()))
        restaurant = _meu_restaurante(user)
        if not restaurant:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        products = WhatsAppProduct.query.filter_by(
            restaurant_id=restaurant.id
        ).order_by(WhatsAppProduct.category, WhatsAppProduct.sort_order).all()

        return jsonify({'products': [p.to_dict() for p in products]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@whatsapp_catalog_bp.route('/whatsapp/products', methods=['POST'])
@jwt_required()
@client_or_admin_required
def create_product():
    """Cria um produto no cardápio WhatsApp."""
    try:
        user = User.query.get(int(get_jwt_identity()))
        restaurant = _meu_restaurante(user)
        if not restaurant:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        data = request.get_json() or {}
        if not data.get('name') or not data.get('price'):
            return jsonify({'error': 'name e price são obrigatórios'}), 400

        product = WhatsAppProduct(
            restaurant_id=restaurant.id,
            category=data.get('category', 'Geral'),
            name=data['name'],
            description=data.get('description'),
            price=float(data['price']),
            image_url=data.get('image_url'),
            is_active=bool(data.get('is_active', True)),
            sort_order=int(data.get('sort_order', 0)),
        )
        db.session.add(product)
        db.session.commit()
        return jsonify({'message': 'Produto criado', 'product': product.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@whatsapp_catalog_bp.route('/whatsapp/products/<int:product_id>', methods=['PUT'])
@jwt_required()
@client_or_admin_required
def update_product(product_id):
    """Atualiza um produto do cardápio WhatsApp."""
    try:
        user = User.query.get(int(get_jwt_identity()))
        restaurant = _meu_restaurante(user)
        if not restaurant:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        product = WhatsAppProduct.query.filter_by(
            id=product_id, restaurant_id=restaurant.id
        ).first()
        if not product:
            return jsonify({'error': 'Produto não encontrado'}), 404

        data = request.get_json() or {}
        for field in ['category', 'name', 'description', 'image_url']:
            if field in data:
                setattr(product, field, data[field] or None)
        if 'price' in data:
            product.price = float(data['price'])
        if 'is_active' in data:
            product.is_active = bool(data['is_active'])
        if 'sort_order' in data:
            product.sort_order = int(data['sort_order'])

        db.session.commit()
        return jsonify({'message': 'Produto atualizado', 'product': product.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@whatsapp_catalog_bp.route('/whatsapp/products/<int:product_id>', methods=['DELETE'])
@jwt_required()
@client_or_admin_required
def delete_product(product_id):
    """Remove um produto do cardápio WhatsApp."""
    try:
        user = User.query.get(int(get_jwt_identity()))
        restaurant = _meu_restaurante(user)
        if not restaurant:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        product = WhatsAppProduct.query.filter_by(
            id=product_id, restaurant_id=restaurant.id
        ).first()
        if not product:
            return jsonify({'error': 'Produto não encontrado'}), 404

        db.session.delete(product)
        db.session.commit()
        return jsonify({'message': 'Produto removido'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ── Cardálogo público (para o bot WhatsApp) ──────────────────────

@whatsapp_catalog_bp.route('/whatsapp/catalog/<int:restaurant_id>', methods=['GET'])
def get_catalog(restaurant_id):
    """Retorna o cardálogo público do EST (para o bot WhatsApp)."""
    try:
        products = WhatsAppProduct.query.filter_by(
            restaurant_id=restaurant_id, is_active=True
        ).order_by(WhatsAppProduct.category, WhatsAppProduct.sort_order).all()

        # Agrupar por categoria
        categories = {}
        for p in products:
            cat = p.category or 'Geral'
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(p.to_dict())

        return jsonify({'categories': categories}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Sessão de pedido (carrinho) ──────────────────────────────────

@whatsapp_catalog_bp.route('/whatsapp/sessions', methods=['GET'])
@jwt_required()
@client_or_admin_required
def list_sessions():
    """Lista sessões de pedido ativas do estabelecimento."""
    try:
        user = User.query.get(int(get_jwt_identity()))
        restaurant = _meu_restaurante(user)
        if not restaurant:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        sessions = WhatsAppOrderSession.query.filter_by(
            restaurant_id=restaurant.id, is_active=True
        ).order_by(WhatsAppOrderSession.updated_at.desc()).limit(50).all()

        return jsonify({'sessions': [s.to_dict() for s in sessions]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Meta Catalog sync (opção configurável) ───────────────────────

@whatsapp_catalog_bp.route('/whatsapp/sync-catalog', methods=['POST'])
@jwt_required()
@client_or_admin_required
def sync_catalog():
    """Sincroniza cardápio com Meta Catalog (habilita carrinho nativo WhatsApp)."""
    try:
        user = User.query.get(int(get_jwt_identity()))
        restaurant = _meu_restaurante(user)
        if not restaurant:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        from src.services.whatsapp_meta_catalog import sync_catalog as do_sync
        success, message = do_sync(restaurant.id)

        return jsonify({
            'status': 'ok' if success else 'error',
            'message': message,
        }), 200 if success else 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@whatsapp_catalog_bp.route('/whatsapp/meta-catalog', methods=['GET'])
@jwt_required()
@client_or_admin_required
def get_meta_catalog():
    """Lista produtos do Meta Catalog (para conferência)."""
    try:
        user = User.query.get(int(get_jwt_identity()))
        restaurant = _meu_restaurante(user)
        if not restaurant:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        from src.services.whatsapp_meta_catalog import get_catalog_products
        products = get_catalog_products(restaurant.id)
        return jsonify({'products': products}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
