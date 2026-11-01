"""Webhooks de pagamento (Asaas).

Extraído de order.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
"""
import logging
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from src.models.portal_models import (
    db,
)

logger = logging.getLogger(__name__)


webhooks_payments_bp = Blueprint('webhooks_payments', __name__)


@webhooks_payments_bp.route('/asaas', methods=['POST'])
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

