"""Pagamentos a entregadores, faturas e saques.

Extraído de admin_finance.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
"""
import logging
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from src.models.portal_models import (
    Customer,
    Delivery,
    Driver,
    Invoice,
    Notification,
    NotificationType,
    Order,
    OrderStatus,
    Payment,
    PaymentStatus,
    Restaurant,
    User,
    db,
)
from src.routes.admin_finance import get_square_filter
from src.utils.auth import admin_required
from src.utils.tenant import get_current_tenant_id

logger = logging.getLogger(__name__)


admin_payments_bp = Blueprint('payments', __name__)


@admin_payments_bp.route('/driver-payments', methods=['GET'])

@jwt_required()

@admin_required

def get_driver_payments():

    """Lista o que cada entregador deve receber"""

    try:

        tenant_id = get_current_tenant_id()
        square_id = get_square_filter()



        query = db.session.query(

            Driver.id,

            User.first_name,

            User.last_name,

            User.email,

            func.sum(Payment.amount).label('total_earnings'),

            func.count(Payment.id).label('payment_count')

        ).join(User).outerjoin(

            Payment, db.and_(Payment.driver_id == Driver.id, Payment.status == PaymentStatus.PENDING)

        )



        # Filtrar por tenant

        if tenant_id:

            query = query.filter(Driver.tenant_id == tenant_id)

        # Filtrar por square
        if square_id:
            query = query.filter(Driver.square_id == square_id)



        drivers = query.group_by(Driver.id, User.first_name, User.last_name, User.email).all()



        drivers_data = []

        for d in drivers:

            driver = Driver.query.get(d.id)

            drivers_data.append({

                'id': d.id,

                'name': f"{d.first_name} {d.last_name}",

                'email': d.email,

                'pix_key': driver.pix_key if driver else None,

                'bank_account': driver.bank_account if driver else None,

                'pending_amount': float(d.total_earnings or 0),

                'pending_payments': d.payment_count or 0,

                'rating': float(driver.rating) if driver and driver.rating else None,

                'total_deliveries': driver.total_deliveries if driver else 0

            })



        # Ordena por valor pendente (maior primeiro)

        drivers_data.sort(key=lambda x: x['pending_amount'], reverse=True)



        total_pending = sum(d['pending_amount'] for d in drivers_data)



        return jsonify({

            'drivers': drivers_data,

            'total_pending': total_pending,

            'total_drivers': len(drivers_data)

        }), 200



    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_payments_bp.route('/driver-payments/<int:driver_id>/pay', methods=['POST'])

@jwt_required()

@admin_required

def pay_driver(driver_id):

    """Registra pagamento ao entregador"""

    try:

        driver = Driver.query.get(driver_id)

        if not driver:

            return jsonify({'error': 'Entregador não encontrado'}), 404



        # Marca pagamentos pendentes como processados

        pending_payments = Payment.query.filter_by(

            driver_id=driver_id,

            status=PaymentStatus.PENDING

        ).all()



        if not pending_payments:

            return jsonify({'error': 'Nenhum pagamento pendente'}), 400



        total = sum(float(p.amount) for p in pending_payments)



        for payment in pending_payments:

            payment.status = PaymentStatus.PROCESSED

            payment.processed_at = datetime.now(timezone.utc)



        db.session.commit()



        return jsonify({

            'message': f'Pagamento de {total:.2f} registrado com sucesso',

            'total_paid': total,

            'payments_processed': len(pending_payments)

        }), 200



    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





# ============================================

# FATURAS COM QR CODE

# ============================================



@admin_payments_bp.route('/invoices/<int:restaurant_id>/generate', methods=['POST'])

@jwt_required()

@admin_required

def generate_invoice(restaurant_id):

    """Gera fatura semanal para um estabelecimento com QR Code"""

    try:

        import base64
        import io

        import qrcode

        from src.models.portal_models import SystemConfig



        restaurant = Restaurant.query.get(restaurant_id)

        if not restaurant:

            return jsonify({'error': 'Estabelecimento não encontrado'}), 404



        data = request.get_json() or {}

        week_start = data.get('week_start')

        week_end = data.get('week_end')



        if not week_start or not week_end:

            # Semana atual

            now = datetime.now(timezone.utc)

            days_since_monday = now.weekday()

            week_start = (now - timedelta(days=days_since_monday)).strftime('%Y-%m-%d')

            week_end = (now - timedelta(days=days_since_monday) + timedelta(days=6)).strftime('%Y-%m-%d')



        start_date = datetime.strptime(week_start, '%Y-%m-%d')

        end_date = datetime.strptime(week_end, '%Y-%m-%d') + timedelta(days=1)



        # Busca pedidos entregues no periodo

        orders = Order.query.filter(

            Order.restaurant_id == restaurant_id,

            Order.status == OrderStatus.DELIVERED,

            Order.created_at >= start_date,

            Order.created_at < end_date

        ).all()



        if not orders:

            return jsonify({'error': 'Nenhum pedido entregue no período'}), 400



        # Calcula totais

        total_fees = sum(float(o.delivery_fee or 0) for o in orders)

        total_amount = sum(float(o.total_amount or 0) for o in orders)

        total_orders = len(orders)



        # Busca dados bancarios do admin

        admin_bank = {}

        for key in ['admin_bank_name', 'admin_bank_agency', 'admin_bank_account', 'admin_bank_pix_key', 'admin_cnpj', 'admin_company_name']:

            config = SystemConfig.query.filter_by(config_key=key).first()

            if config:

                admin_bank[key] = config.config_value



        # Gera payload PIX

        pix_key = admin_bank.get('admin_bank_pix_key', '')

        company_name = admin_bank.get('admin_company_name', 'Muv.log')

        pix_payload = f"00020126580014BR.GOV.BCB.PIX0136{pix_key}5204000053039865404{total_fees:.2f}5802BR5913{company_name[:13]}6009SAO PAULO62070503***6304"



        # Gera QR Code

        qr = qrcode.QRCode(version=1, box_size=10, border=5)

        qr.add_data(pix_payload)

        qr.make(fit=True)

        qr_img = qr.make_image(fill_color="black", back_color="white")

        qr_buffer = io.BytesIO()

        qr_img.save(qr_buffer, format='PNG')

        qr_base64 = base64.b64encode(qr_buffer.getvalue()).decode()



        # Gera numero da fatura

        invoice_number = f"FAT{datetime.now().strftime('%Y%m%d')}{restaurant_id:04d}"



        return jsonify({

            'invoice_number': invoice_number,

            'restaurant': {

                'id': restaurant.id,

                'name': restaurant.name,

                'cnpj': restaurant.cnpj,

                'phone': restaurant.phone,

                'address': restaurant.address

            },

            'period': {

                'start': week_start,

                'end': week_end

            },

            'summary': {

                'total_orders': total_orders,

                'total_amount': total_amount,

                'total_delivery_fees': total_fees,

                'avg_per_order': round(total_fees / total_orders, 2) if total_orders > 0 else 0

            },

            'payment': {

                'pix_key': pix_key,

                'bank_name': admin_bank.get('admin_bank_name', ''),

                'bank_agency': admin_bank.get('admin_bank_agency', ''),

                'bank_account': admin_bank.get('admin_bank_account', ''),

                'amount': total_fees,

                'description': f"Fatura semanal {week_start} a {week_end}"

            },

            'qr_code_base64': qr_base64,

            'orders': [

                {

                    'order_number': o.order_number,

                    'date': o.created_at.strftime('%d/%m/%Y'),

                    'amount': float(o.total_amount),

                    'delivery_fee': float(o.delivery_fee or 0),

                    'status': o.status.value

                }

                for o in orders

            ]

        }), 200



    except Exception as e:

        return jsonify({'error': str(e)}), 500





# ============================================

# PROCESSAMENTO DE SAQUES

# ============================================



@admin_payments_bp.route('/withdrawals', methods=['GET'])

@jwt_required()

@admin_required

def list_withdrawals():

    """Lista solicitações de saque pendentes"""

    try:

        tenant_id = get_current_tenant_id()
        square_id = get_square_filter()



        from src.models.portal_models import PaymentStatus, PaymentType

        query = Payment.query.filter_by(

            payment_type=PaymentType.WITHDRAWAL,

            status=PaymentStatus.PENDING

        ).join(Driver).join(User)



        if tenant_id:

            query = query.filter(Driver.tenant_id == tenant_id)

        # Filtrar por square
        if square_id:
            query = query.filter(Driver.square_id == square_id)



        withdrawals = query.order_by(Payment.created_at.desc()).all()



        result = []

        for w in withdrawals:

            driver = Driver.query.get(w.driver_id)

            result.append({

                'id': w.id,

                'driver_id': w.driver_id,

                'driver_name': f"{driver.user.first_name} {driver.user.last_name}" if driver and driver.user else 'N/A',

                'driver_email': driver.user.email if driver and driver.user else 'N/A',

                'amount': abs(float(w.amount)),

                'pix_key': driver.pix_key if driver else None,

                'status': w.status.value if w.status else 'PENDING',

                'created_at': w.created_at.isoformat() if w.created_at else None

            })



        return jsonify({'withdrawals': result}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_payments_bp.route('/withdrawals/<int:withdrawal_id>/process', methods=['POST'])

@jwt_required()

@admin_required

def process_withdrawal(withdrawal_id):

    """Processa (aprova/rejeita) uma solicitação de saque"""

    try:

        from decimal import Decimal



        withdrawal = Payment.query.get(withdrawal_id)

        if not withdrawal:

            return jsonify({'error': 'Solicitação não encontrada'}), 404



        if withdrawal.status != PaymentStatus.PENDING:

            return jsonify({'error': 'Solicitação já processada'}), 400



        data = request.get_json()

        action = data.get('action')  # 'approve' or 'reject'



        if action not in ['approve', 'reject']:

            return jsonify({'error': 'Ação inválida'}), 400



        driver = Driver.query.get(withdrawal.driver_id)

        if not driver:

            return jsonify({'error': 'Entregador não encontrado'}), 404



        amount = abs(float(withdrawal.amount))



        if action == 'approve':

            # Aprovar saque - descontar do locked_balance

            withdrawal.status = PaymentStatus.PROCESSED

            driver.locked_balance = Decimal(str(float(driver.locked_balance or 0))) - Decimal(str(amount))

        else:

            # Rejeitar saque - devolver ao balance

            withdrawal.status = PaymentStatus.CANCELLED

            driver.locked_balance = Decimal(str(float(driver.locked_balance or 0))) - Decimal(str(amount))

            driver.balance = Decimal(str(float(driver.balance or 0))) + Decimal(str(amount))



        driver.updated_at = datetime.now(timezone.utc)

        db.session.commit()



        return jsonify({'message': f'Saque {"aprovado" if action == "approve" else "rejeitado"} com sucesso'}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





# ============================================

# FATURAS SEMANAIS

# ============================================



@admin_payments_bp.route('/invoices', methods=['GET'])

@jwt_required()

@admin_required

def list_invoices():

    """Lista faturas com filtros"""

    try:

        tenant_id = get_current_tenant_id()
        square_id = get_square_filter()

        status = request.args.get('status')

        date_from = request.args.get('date_from')

        date_to = request.args.get('date_to')



        query = Invoice.query.join(Restaurant)

        if tenant_id:

            query = query.filter(Invoice.tenant_id == tenant_id)

        # Filtrar por square (através do Restaurant)
        if square_id:
            query = query.filter(Restaurant.square_id == square_id)

        if status:

            query = query.filter(Invoice.status == status)

        if date_from:

            query = query.filter(Invoice.week_start >= datetime.fromisoformat(date_from))

        if date_to:

            query = query.filter(Invoice.week_end <= datetime.fromisoformat(date_to) + timedelta(days=1))



        invoices = query.order_by(Invoice.created_at.desc()).all()

        return jsonify({'invoices': [i.to_dict() for i in invoices]}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_payments_bp.route('/invoices/generate', methods=['POST'])

@jwt_required()

@admin_required

def generate_invoices():

    """Gera faturas para estabelecimentos. Aceita período customizado e cliente específico via body."""

    try:

        from decimal import Decimal

        tenant_id = get_current_tenant_id()



        data = request.get_json() if request.is_json else {}



        # Calcular período: usa body se fornecido, senão semana anterior

        if data.get('week_start') and data.get('week_end'):

            week_start = datetime.fromisoformat(data['week_start'])

            week_end = datetime.fromisoformat(data['week_end'])

        else:

            today = datetime.now(timezone.utc).date()

            days_since_monday = today.weekday()

            week_end = datetime.combine(today - timedelta(days=days_since_monday), datetime.min.time())

            week_start = week_end - timedelta(days=7)



        # Buscar restaurantes (todos ou um específico)

        restaurant_query = Restaurant.query

        if tenant_id:

            restaurant_query = restaurant_query.filter(Restaurant.tenant_id == tenant_id)

        if data.get('restaurant_id'):

            restaurant_query = restaurant_query.filter(Restaurant.id == data['restaurant_id'])

        restaurants = restaurant_query.all()



        generated = []

        skipped = []

        for restaurant in restaurants:

            # Verificar se já existe fatura PENDENTE para este período

            existing = Invoice.query.filter_by(

                restaurant_id=restaurant.id,

                week_start=week_start,

                week_end=week_end

            ).filter(Invoice.status == 'PENDING').first()

            if existing:

                skipped.append(restaurant.name)

                continue



            # Buscar entregas do período

            delivered_orders = db.session.query(Order).filter(

                Order.restaurant_id == restaurant.id,

                Order.status == OrderStatus.DELIVERED,

                Order.updated_at >= week_start,

                Order.updated_at < week_end

            ).all()



            if not delivered_orders:

                continue



            total_amount = sum(float(o.delivery_fee or 0) for o in delivered_orders)

            driver_earnings = sum(float(o.delivery.driver_earnings or 0) for o in delivered_orders if o.delivery)

            platform_fee = total_amount - driver_earnings



            invoice = Invoice(

                tenant_id=tenant_id or restaurant.tenant_id,

                restaurant_id=restaurant.id,

                week_start=week_start,

                week_end=week_end,

                total_amount=Decimal(str(total_amount)),

                driver_earnings=Decimal(str(driver_earnings)),

                platform_fee=Decimal(str(platform_fee)),

                deliveries_count=len(delivered_orders),

                status='PENDING'

            )

            db.session.add(invoice)

            generated.append(restaurant.name)



        db.session.commit()

        return jsonify({

            'message': f'{len(generated)} faturas geradas',

            'restaurants': generated,

            'skipped': skipped,

            'period': {'start': week_start.isoformat(), 'end': week_end.isoformat()}

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





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



@admin_payments_bp.route('/invoices/generate-auto', methods=['POST'])

@jwt_required()

@admin_required

def generate_auto_invoices():

    """

    Gera faturas automaticamente para todos os estabelecimentos com entregas na semana.

    """




    try:

        tenant_id = get_current_tenant_id()



        # Calcular período da semana anterior

        today = datetime.now(timezone.utc).date()

        week_end = today - timedelta(days=today.weekday() + 1)

        week_start = week_end - timedelta(days=6)



        restaurants = Restaurant.query.filter(Restaurant.is_active).all()

        if tenant_id:

            restaurants = [r for r in restaurants if r.tenant_id == tenant_id]



        generated = []



        for restaurant in restaurants:

            existing = Invoice.query.filter_by(

                restaurant_id=restaurant.id,

                week_start=datetime.combine(week_start, datetime.min.time()),

                week_end=datetime.combine(week_end, datetime.min.time())

            ).first()

            if existing:

                continue



            deliveries = Delivery.query.join(Order).filter(

                Order.restaurant_id == restaurant.id,

                Order.status == OrderStatus.DELIVERED,

                Order.delivery_time >= datetime.combine(week_start, datetime.min.time()),

                Order.delivery_time <= datetime.combine(week_end, datetime.max.time())

            ).all()



            if not deliveries:

                continue



            total_amount = sum(float(d.order.delivery_fee) for d in deliveries)

            driver_earnings = sum(float(d.driver_earnings or 0) for d in deliveries)

            platform_fee = total_amount - driver_earnings



            invoice = Invoice(

                tenant_id=tenant_id,

                restaurant_id=restaurant.id,

                week_start=datetime.combine(week_start, datetime.min.time()),

                week_end=datetime.combine(week_end, datetime.min.time()),

                total_amount=total_amount,

                driver_earnings=driver_earnings,

                platform_fee=platform_fee,

                deliveries_count=len(deliveries),

                status='PENDING'

            )

            db.session.add(invoice)

            db.session.flush()



            generated.append({

                'invoice_id': invoice.id,

                'restaurant': restaurant.name,

                'total': total_amount,

                'platform_fee': platform_fee,

                'deliveries': len(deliveries)

            })



        db.session.commit()



        return jsonify({

            'message': f'{len(generated)} faturas geradas',

            'invoices': generated,

            'period': {'start': week_start.isoformat(), 'end': week_end.isoformat()}

        }), 200



    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





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





@admin_payments_bp.route('/withdrawals/<int:withdrawal_id>/process-auto', methods=['POST'])

@jwt_required()

@admin_required

def process_withdrawal_auto(withdrawal_id):

    """Processa saque automaticamente via Asaas PIX"""

    from src.services.asaas_service import detect_pix_key_type, is_configured, transfer_pix



    try:

        withdrawal = Payment.query.get(withdrawal_id)

        if not withdrawal:

            return jsonify({'error': 'Saque não encontrado'}), 404



        if withdrawal.status != PaymentStatus.PENDING:

            return jsonify({'error': 'Saque não está pendente'}), 400



        driver = Driver.query.get(withdrawal.driver_id)

        if not driver or not driver.user:

            return jsonify({'error': 'Entregador não encontrado'}), 404



        if not driver.pix_key:

            return jsonify({'error': 'Entregador não possui chave PIX configurada'}), 400



        if not is_configured():

            return jsonify({'error': 'Asaas não configurado'}), 400



        amount = abs(float(withdrawal.amount))

        pix_key_type = detect_pix_key_type(driver.pix_key)
        if not pix_key_type:
            return jsonify({'error': 'Tipo de chave PIX não reconhecido'}), 400



        result = transfer_pix(

            value=amount,

            pix_key=driver.pix_key,

            pix_key_type=pix_key_type,

            description=f'Saque muv.log - {driver.user.first_name}'

        )



        if result.get('success'):

            withdrawal.status = PaymentStatus.PROCESSED

            withdrawal.updated_at = datetime.now(timezone.utc)

            driver.locked_balance = (driver.locked_balance or 0) - amount

            db.session.commit()



            return jsonify({

                'message': f'Saque de R$ {amount:.2f} processado via PIX',

                'transfer_id': result.get('transfer_id')

            }), 200

        else:

            return jsonify({'error': f'Erro na transferência PIX: {result.get("error")}'}), 400



    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





# ============================================
