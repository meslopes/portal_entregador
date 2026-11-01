import hashlib
import hmac
import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.models.portal_models import (
    db,
)

logger = logging.getLogger(__name__)

webhook_bp = Blueprint('webhook', __name__)

def get_webhook_secret():
    """Obtem a chave secreta do webhook do SystemConfig.
    Em produção, exige que o secret esteja configurado (sem fallback previsível).
    Em desenvolvimento, gera um secret aleatório se não existir.
    """
    import os

    from src.models.portal_models import SystemConfig

    config = SystemConfig.query.filter_by(config_key='webhook_secret').first()

    if config and config.config_value:
        return config.config_value

    # Em produção, não permitir fallback
    if os.getenv('FLASK_ENV') == 'production':
        raise RuntimeError("FATAL: webhook_secret não configurado em produção. Configure via SystemConfig no banco de dados.")

    # Em desenvolvimento, gerar secret aleatório e salvar
    import secrets
    dev_secret = secrets.token_hex(32)
    try:
        new_config = SystemConfig(config_key='webhook_secret', config_value=dev_secret)
        db.session.add(new_config)
        db.session.commit()
        logger.warning("Webhook secret gerado automaticamente para desenvolvimento")
    except Exception:
        db.session.rollback()

    return dev_secret


def verify_webhook_signature(payload, signature):
    """Verifica a assinatura do webhook"""
    secret = get_webhook_secret()
    expected = hmac.HMAC(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def require_webhook_auth(platform_name):
    """
    Autentica webhooks de plataformas externas via assinatura HMAC
    (header X-Webhook-Signature) ou token simples (X-Webhook-Token).
    Sem autenticação em produção, a requisição é rejeitada (fail closed).
    """
    import os

    raw_body = request.get_data(as_text=True)
    signature = request.headers.get('X-Webhook-Signature', '')
    token = request.headers.get('X-Webhook-Token', '') or request.headers.get('Authorization', '').replace('Bearer ', '')

    # 1) Assinatura HMAC do corpo
    if signature:
        if verify_webhook_signature(raw_body, signature):
            return None
        logger.warning(f"{platform_name} webhook: assinatura HMAC inválida")
        return jsonify({'error': 'Assinatura inválida'}), 401

    # 2) Token simples compartilhado por plataforma
    if token:
        from src.models.portal_models import SystemConfig
        expected = SystemConfig.query.filter_by(config_key=f'{platform_name.lower()}_webhook_token').first()
        if expected and expected.config_value and hmac.compare_digest(expected.config_value, token):
            return None
        # Token genérico de webhook como fallback
        try:
            generic = get_webhook_secret()
            if hmac.compare_digest(generic, token):
                return None
        except Exception:
            pass
        logger.warning(f"{platform_name} webhook: token inválido")
        return jsonify({'error': 'Token inválido'}), 401

    # 3) Sem credencial: liberado só em desenvolvimento
    if os.getenv('FLASK_ENV') != 'production':
        logger.warning(f"{platform_name} webhook: sem autenticação (modo dev)")
        return None

    logger.warning(f"{platform_name} webhook: requisição sem autenticação rejeitada")
    return jsonify({'error': 'Não autorizado'}), 401


@webhook_bp.route('/generic', methods=['POST'])
def generic_webhook():
    """
    Webhook generico para integracao com outras plataformas.
    Aceita o mesmo formato padrao do iFood.
    """
    # Import local para evitar import circular com webhooks_ifood
    from src.routes.webhooks_ifood import ifood_webhook

    return ifood_webhook()


# ============================================
# ENDPOINT DE TESTE
# ============================================

@webhook_bp.route('/test', methods=['POST'])
@jwt_required()
def test_webhook():
    """Endpoint de teste para simular um pedido iFood. Protegido por autenticação."""
    import os

    # Import local para evitar import circular com webhooks_ifood
    from src.routes.webhooks_ifood import process_ifood_order
    if os.getenv('FLASK_ENV') == 'production':
        return jsonify({'error': 'Endpoint desabilitado em produção'}), 404
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

