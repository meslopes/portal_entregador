import hashlib
import hmac
import logging
from datetime import datetime, timezone

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
        from decimal import Decimal

        from src.models.portal_models import (
            Delivery,
            Driver,
            EstablishmentSubscription,
            Invoice,
            Order,
            OrderStatus,
            Payment,
            PaymentStatus,
            SubscriptionInvoice,
        )

        # Verificar se é pagamento de fatura de assinatura
        if external_ref and external_ref.startswith('subscription_invoice_'):
            invoice_id = external_ref.replace('subscription_invoice_', '')
            invoice = SubscriptionInvoice.query.get(int(invoice_id))
            if invoice and invoice.status != 'PAID':
                invoice.status = 'PAID'
                invoice.paid_at = datetime.now(timezone.utc)
                invoice.payment_method = 'PIX'

                # Atualizar assinatura
                subscription = EstablishmentSubscription.query.get(invoice.subscription_id)
                if subscription:
                    subscription.total_paid = float(subscription.total_paid or 0) + float(invoice.total_amount)

                db.session.commit()
                logger.info(f"Fatura de assinatura #{invoice.id} marcada como paga via Asaas")
                return

        # Verificar se é pagamento de fatura (invoice)
        if external_ref and external_ref.startswith('INV-'):
            invoice_id = external_ref.replace('INV-', '')
            invoice = Invoice.query.get(int(invoice_id))
            if invoice and invoice.status != 'PAID':
                invoice.status = 'PAID'
                invoice.paid_at = datetime.now(timezone.utc)

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
                        driver.updated_at = datetime.now(timezone.utc)

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
        from src.models.portal_models import Invoice, SubscriptionInvoice

        # Fatura de assinatura
        if external_ref and external_ref.startswith('subscription_invoice_'):
            invoice_id = external_ref.replace('subscription_invoice_', '')
            invoice = SubscriptionInvoice.query.get(int(invoice_id))
            if invoice:
                invoice.status = 'OVERDUE'
                db.session.commit()
                logger.info(f"Fatura de assinatura #{invoice.id} marcada como vencida")
                return

        # Fatura regular
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
        from src.models.portal_models import EstablishmentSubscription, Invoice, SubscriptionInvoice

        # Fatura de assinatura
        if external_ref and external_ref.startswith('subscription_invoice_'):
            invoice_id = external_ref.replace('subscription_invoice_', '')
            invoice = SubscriptionInvoice.query.get(int(invoice_id))
            if invoice:
                invoice.status = 'CANCELLED'

                # Reverter valor na assinatura
                subscription = EstablishmentSubscription.query.get(invoice.subscription_id)
                if subscription:
                    subscription.total_paid = max(0, float(subscription.total_paid or 0) - float(invoice.total_amount))

                db.session.commit()
                logger.info(f"Fatura de assinatura #{invoice.id} estornada")
                return

        # Fatura regular
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
