"""Pagamentos a entregadores, faturas e saques.

Extraído de admin_finance.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
"""
import logging
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.models.portal_models import (
    Customer,
    Driver,
    Invoice,
    Notification,
    NotificationType,
    Order,
    OrderStatus,
    User,
    db,
)
from src.utils.auth import admin_required

logger = logging.getLogger(__name__)


admin_payments_bp = Blueprint('payments', __name__)


@admin_payments_bp.route('/invoices/<int:invoice_id>/pay', methods=['POST'])

@jwt_required()

@admin_required

def pay_invoice(invoice_id):

    """Marca fatura como paga e desbloqueia saldo dos entregadores"""

    try:

        from decimal import Decimal



        invoice = Invoice.query.get(invoice_id)

        if not invoice:

            return jsonify({'error': 'Fatura não encontrada'}), 404



        if invoice.status != 'PENDING':

            return jsonify({'error': 'Fatura já processada'}), 400



        # Buscar entregas da semana para este restaurante

        # Buscar entregas da semana

        delivered_orders = db.session.query(Order).filter(

            Order.restaurant_id == invoice.restaurant_id,

            Order.status == OrderStatus.DELIVERED,

            Order.updated_at >= invoice.week_start,

            Order.updated_at < invoice.week_end

        ).all()



        # Desbloquear saldo de cada entregador

        drivers_unlocked = {}

        for order in delivered_orders:

            if order.delivery and order.delivery.driver_id and order.delivery.driver_earnings:

                driver = Driver.query.get(order.delivery.driver_id)

                if driver:

                    earnings = Decimal(str(float(order.delivery.driver_earnings)))

                    driver.locked_balance = (driver.locked_balance or Decimal('0')) - earnings

                    driver.balance = (driver.balance or Decimal('0')) + earnings

                    driver.updated_at = datetime.now(timezone.utc)

                    drivers_unlocked[driver.id] = drivers_unlocked.get(driver.id, 0) + float(earnings)



        # Marcar fatura como paga

        invoice.status = 'PAID'

        invoice.paid_at = datetime.now(timezone.utc)

        invoice.updated_at = datetime.now(timezone.utc)



        db.session.commit()



        return jsonify({

            'message': 'Fatura paga e saldos desbloqueados',

            'drivers_unlocked': len(drivers_unlocked),

            'total_unlocked': sum(drivers_unlocked.values())

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





# ============================================

# SOFT DELETE - LIXEIRA

# ============================================



@admin_payments_bp.route('/invoices/<int:invoice_id>/charge', methods=['POST'])

@jwt_required()

@admin_required

def create_invoice_charge(invoice_id):

    """Cria cobrança no Asaas para uma fatura específica"""

    from src.services.asaas_service import create_charge, create_customer, is_configured



    try:

        invoice = Invoice.query.get(invoice_id)

        if not invoice:

            return jsonify({'error': 'Fatura não encontrada'}), 404



        if invoice.status == 'PAID':

            return jsonify({'error': 'Fatura já está paga'}), 400



        restaurant = invoice.restaurant

        if not restaurant:

            return jsonify({'error': 'Estabelecimento não encontrado'}), 404



        if not is_configured():

            return jsonify({'error': 'Asaas não configurado'}), 400



        # Criar cliente no Asaas se não tiver

        if not restaurant.asaas_customer_id:

            customer = create_customer(

                name=restaurant.name,

                cpf_cnpj=restaurant.cnpj or '00000000000',

                email=restaurant.email,

                phone=restaurant.phone

            )

            if customer.get('success'):

                restaurant.asaas_customer_id = customer.get('customer_id')

                db.session.flush()

            else:

                return jsonify({'error': f'Erro ao criar cliente Asaas: {customer.get("error")}'}), 400



        charge = create_charge(

            customer_id=restaurant.asaas_customer_id,

            value=float(invoice.total_amount),

            billing_type='PIX',

            due_date=(datetime.now(timezone.utc).date() + timedelta(days=3)).isoformat(),

            description=f'Fatura muv.log - Semana {invoice.week_start.date()} a {invoice.week_end.date()} - {invoice.deliveries_count} entregas',

            external_reference=f'INV-{invoice.id}'

        )



        if charge.get('success'):

            payment_url = charge.get('invoice_url')



            # Commit do asaas_customer_id se foi criado agora

            db.session.commit()



            # Notificar estabelecimento no app com o link de pagamento

            try:

                restaurant_user = None

                if restaurant.phone:

                    customer = Customer.query.filter_by(phone=restaurant.phone).first()

                    if customer and customer.user_id:

                        restaurant_user = User.query.get(customer.user_id)

                if not restaurant_user and restaurant.email:

                    customer = Customer.query.filter_by(email=restaurant.email).first()

                    if customer and customer.user_id:

                        restaurant_user = User.query.get(customer.user_id)



                if restaurant_user:

                    notification = Notification(

                        user_id=restaurant_user.id,

                        title='Nova fatura disponível',

                        message=f'Sua fatura da semana {invoice.week_start.date()} a {invoice.week_end.date()} no valor de R$ {float(invoice.total_amount):.2f} ({invoice.deliveries_count} entregas) está disponível. Pague via PIX: {payment_url}',

                        type=NotificationType.PAYMENT,

                        related_id=invoice.id

                    )

                    db.session.add(notification)

                    db.session.commit()

            except Exception as notif_err:

                logger.warning(f"Erro ao notificar estabelecimento: {notif_err}")



            return jsonify({

                'message': 'Cobrança criada com sucesso',

                'payment_url': payment_url,

                'payment_id': charge.get('payment_id')

            }), 200

        else:

            return jsonify({'error': charge.get('error')}), 400



    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_payments_bp.route('/invoices/<int:invoice_id>/send-link', methods=['POST'])

@jwt_required()

@admin_required

def send_invoice_payment_link(invoice_id):

    """Envia notificação com link de pagamento para o estabelecimento"""

    try:

        invoice = Invoice.query.get(invoice_id)

        if not invoice:

            return jsonify({'error': 'Fatura não encontrada'}), 404



        restaurant = invoice.restaurant

        if not restaurant:

            return jsonify({'error': 'Estabelecimento não encontrado'}), 404



        data = request.get_json() or {}

        payment_url = data.get('payment_url', '')



        if not payment_url:

            return jsonify({'error': 'URL de pagamento não informada'}), 400



        # Buscar owner do estabelecimento via Customer (mesmo telefone/email)

        restaurant_user = None

        if restaurant.phone:

            customer = Customer.query.filter_by(phone=restaurant.phone).first()

            if customer and customer.user_id:

                restaurant_user = User.query.get(customer.user_id)

        if not restaurant_user and restaurant.email:

            customer = Customer.query.filter_by(email=restaurant.email).first()

            if customer and customer.user_id:

                restaurant_user = User.query.get(customer.user_id)



        if not restaurant_user:

            return jsonify({'error': 'Usuário do estabelecimento não encontrado'}), 404



        notification = Notification(

            user_id=restaurant_user.id,

            title='Link de pagamento da fatura',

            message=f'Sua fatura da semana {invoice.week_start.date()} a {invoice.week_end.date()} - R$ {float(invoice.platform_fee):.2f}. Acesse: {payment_url}',

            type=NotificationType.PAYMENT,

            related_id=invoice.id

        )

        db.session.add(notification)

        db.session.commit()



        return jsonify({'message': 'Link enviado com sucesso'}), 200



    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





