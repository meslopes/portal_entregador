"""Módulo driver_payments — extraído de src/routes/admin_payments.py no refactor de arquivos grandes.
Movimento puro de código — comportamento idêntico ao original.
"""
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from src.models.portal_models import (
    Driver,
    Payment,
    PaymentStatus,
    User,
    db,
)
from src.routes.admin_payments import get_square_filter
from src.utils.auth import admin_required
from src.utils.tenant import get_current_tenant_id

admin_driver_payments_bp = Blueprint('admin_driver_payments', __name__)


@admin_driver_payments_bp.route('/driver-payments', methods=['GET'])

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





@admin_driver_payments_bp.route('/driver-payments/<int:driver_id>/pay', methods=['POST'])

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



@admin_driver_payments_bp.route('/withdrawals', methods=['GET'])

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





@admin_driver_payments_bp.route('/withdrawals/<int:withdrawal_id>/process', methods=['POST'])

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



@admin_driver_payments_bp.route('/withdrawals/<int:withdrawal_id>/process-auto', methods=['POST'])

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
