"""
Configurações WhatsApp Business API por estabelecimento (Fase 1 — 2026-11-25).
CRUD de credenciais + configurações operacionais. Tudo configurável pelo EST.
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from src.models.portal_models import (
    User, UserType, Restaurant, Customer,
    WhatsAppCredential, WhatsAppMessage, db,
)
from src.utils.auth import client_or_admin_required
from src.utils.restaurant import find_restaurant_by_name

whatsapp_config_bp = Blueprint('whatsapp_config', __name__)


def _meu_restaurante(user):
    """Resolve o restaurante do usuário logado (CLIENT → via Customer.name)."""
    if user.user_type == UserType.CLIENT:
        customer = Customer.query.filter_by(user_id=user.id).first()
        if customer:
            return find_restaurant_by_name(customer.name)
    return None


@whatsapp_config_bp.route('/whatsapp/config', methods=['GET'])
@jwt_required()
@client_or_admin_required
def get_config():
    """Retorna a configuração WhatsApp do estabelecimento."""
    try:
        user = User.query.get(int(get_jwt_identity()))
        restaurant = _meu_restaurante(user)
        if not restaurant:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        cred = WhatsAppCredential.query.filter_by(restaurant_id=restaurant.id).first()
        if not cred:
            # Cria configuração padrão (tudo configurável — defaults seguros)
            cred = WhatsAppCredential(
                restaurant_id=restaurant.id,
                enabled=False,
                notify_customer=True,
                notify_establishment=True,
                accept_orders=True,
                auto_confirm=False,
            )
            db.session.add(cred)
            db.session.commit()

        return jsonify({'config': cred.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@whatsapp_config_bp.route('/whatsapp/config', methods=['PUT'])
@jwt_required()
@client_or_admin_required
def update_config():
    """Atualiza configuração WhatsApp do estabelecimento (tudo configurável)."""
    try:
        user = User.query.get(int(get_jwt_identity()))
        restaurant = _meu_restaurante(user)
        if not restaurant:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        cred = WhatsAppCredential.query.filter_by(restaurant_id=restaurant.id).first()
        if not cred:
            cred = WhatsAppCredential(restaurant_id=restaurant.id)
            db.session.add(cred)

        data = request.get_json() or {}

        # Credenciais da Meta
        if 'phone_number_id' in data:
            cred.phone_number_id = data['phone_number_id']
        if 'access_token' in data:
            cred.access_token = data['access_token']
        if 'business_account_id' in data:
            cred.business_account_id = data['business_account_id']
        if 'verify_token' in data:
            cred.verify_token = data['verify_token']

        # Configurações operacionais (tudo configurável)
        bool_fields = [
            'enabled', 'notify_customer', 'notify_establishment',
            'accept_orders', 'auto_confirm', 'is_active',
        ]
        for field in bool_fields:
            if field in data:
                setattr(cred, field, bool(data[field]))

        text_fields = [
            'welcome_message', 'off_hours_message',
        ]
        for field in text_fields:
            if field in data:
                setattr(cred, field, data[field] or None)

        time_fields = [
            'business_hours_start', 'business_hours_end',
            'quiet_hours_start', 'quiet_hours_end',
        ]
        for field in time_fields:
            if field in data:
                setattr(cred, field, data[field] or None)

        db.session.commit()
        return jsonify({'message': 'Configuração atualizada', 'config': cred.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@whatsapp_config_bp.route('/whatsapp/test-connection', methods=['POST'])
@jwt_required()
@client_or_admin_required
def test_connection():
    """Testa a conexão com a API do WhatsApp Business (Meta)."""
    try:
        user = User.query.get(int(get_jwt_identity()))
        restaurant = _meu_restaurante(user)
        if not restaurant:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        cred = WhatsAppCredential.query.filter_by(restaurant_id=restaurant.id).first()
        if not cred or not cred.access_token or not cred.phone_number_id:
            return jsonify({'error': 'Credenciais não configuradas'}), 400

        import requests
        url = f'https://graph.facebook.com/v18.0/{cred.phone_number_id}'
        headers = {'Authorization': f'Bearer {cred.access_token}'}
        resp = requests.get(url, headers=headers, timeout=10)
        data = resp.json()

        if resp.status_code == 200 and data.get('id'):
            return jsonify({
                'status': 'ok',
                'phone_number': data.get('display_phone_number'),
                'verified_name': data.get('verified_name'),
                'message': 'Conexão bem-sucedida',
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': data.get('error', {}).get('message', 'Erro desconhecido'),
            }), 400
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@whatsapp_config_bp.route('/whatsapp/messages', methods=['GET'])
@jwt_required()
@client_or_admin_required
def list_messages():
    """Lista mensagens WhatsApp do estabelecimento (auditoria)."""
    try:
        user = User.query.get(int(get_jwt_identity()))
        restaurant = _meu_restaurante(user)
        if not restaurant:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        limit = min(int(request.args.get('limit', 50)), 200)
        direction = request.args.get('direction')

        q = WhatsAppMessage.query.filter_by(restaurant_id=restaurant.id)
        if direction:
            q = q.filter_by(direction=direction)
        msgs = q.order_by(WhatsAppMessage.created_at.desc()).limit(limit).all()

        return jsonify({'messages': [m.to_dict() for m in msgs]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
