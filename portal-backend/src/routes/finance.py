"""
Endpoints de relatórios financeiros para entregadores próprios.
Agrupamento por frequência de pagamento e quitação por período.
Cobrança de assinatura para estabelecimentos com entregadores próprios.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.portal_models import (
    db, EstablishmentDriver, OwnDriverEarning, Restaurant,
    User, UserType, Customer, EstablishmentSubscription, SubscriptionInvoice
)
from src.utils.tenant import get_current_tenant_id, get_current_user
from datetime import datetime, timedelta
from sqlalchemy import func
import logging

logger = logging.getLogger(__name__)

finance_bp = Blueprint('finance', __name__, url_prefix='/api/finance')


def get_period_start(date, frequency):
    """Retorna o início do período baseado na frequência"""
    if frequency == 'DAILY':
        return date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif frequency == 'WEEKLY':
        # Início da semana (segunda-feira)
        days_since_monday = date.weekday()
        return (date - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif frequency == 'MONTHLY':
        return date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:  # ON_DEMAND
        return date.replace(hour=0, minute=0, second=0, microsecond=0)


def get_period_end(date, frequency):
    """Retorna o fim do período baseado na frequência"""
    if frequency == 'DAILY':
        return date.replace(hour=23, minute=59, second=59, microsecond=999999)
    elif frequency == 'WEEKLY':
        days_until_sunday = 6 - date.weekday()
        return (date + timedelta(days=days_until_sunday)).replace(hour=23, minute=59, second=59, microsecond=999999)
    elif frequency == 'MONTHLY':
        if date.month == 12:
            return date.replace(year=date.year + 1, month=1, day=1) - timedelta(microseconds=1)
        return date.replace(month=date.month + 1, day=1) - timedelta(microseconds=1)
    else:  # ON_DEMAND
        return date.replace(hour=23, minute=59, second=59, microsecond=999999)


@finance_bp.route('/payment-reports', methods=['GET'])
@jwt_required()
def get_payment_reports():
    """Relatório de pagamentos agrupados por frequência"""
    try:
        user = get_current_user()
        tenant_id = get_current_tenant_id()
        
        # Filtros
        restaurant_id = request.args.get('restaurant_id', type=int)
        driver_id = request.args.get('driver_id', type=int)
        frequency = request.args.get('frequency')  # DAILY, WEEKLY, MONTHLY, ON_DEMAND
        period = request.args.get('period', 'month')  # week, month, all
        
        # Determinar escopo baseado no tipo de usuário
        if user.user_type == UserType.CLIENT:
            # Estabelecimento: ver apenas seus próprios entregadores
            customer = Customer.query.filter_by(user_id=user.id).first()
            if not customer:
                return jsonify({'error': 'Perfil não encontrado'}), 404
            restaurant = Restaurant.query.filter_by(name=customer.name).first()
            if not restaurant:
                return jsonify({'error': 'Restaurante não encontrado'}), 404
            restaurant_id = restaurant.id
        elif user.user_type == UserType.ADMIN:
            # Admin: ver todos do tenant ou restaurante específico
            if restaurant_id:
                pass  # Filtrar por restaurante específico
            elif tenant_id:
                # Filtrar por tenant
                restaurant_ids = [r.id for r in Restaurant.query.filter_by(tenant_id=tenant_id).all()]
            else:
                # Super admin: ver todos
                restaurant_ids = [r.id for r in Restaurant.query.all()]
        
        # Buscar entregadores
        query = EstablishmentDriver.query
        if restaurant_id:
            query = query.filter_by(restaurant_id=restaurant_id)
        elif user.user_type == UserType.ADMIN and not restaurant_id:
            if tenant_id:
                query = query.filter(EstablishmentDriver.restaurant_id.in_(restaurant_ids))
        
        if driver_id:
            query = query.filter_by(id=driver_id)
        
        if frequency:
            query = query.filter_by(payment_frequency=frequency)
        
        drivers = query.all()
        
        # Período de busca
        now = datetime.utcnow()
        if period == 'week':
            start_date = now - timedelta(days=7)
        elif period == 'month':
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=365)
        
        # Gerar relatório por entregador
        reports = []
        for driver in drivers:
            freq = driver.payment_frequency or 'WEEKLY'
            
            # Buscar ganhos no período
            earnings = OwnDriverEarning.query.filter(
                OwnDriverEarning.establishment_driver_id == driver.id,
                OwnDriverEarning.created_at >= start_date
            ).order_by(OwnDriverEarning.created_at).all()
            
            if not earnings:
                continue
            
            # Agrupar por período
            periods = {}
            for earning in earnings:
                period_start = get_period_start(earning.created_at, freq)
                period_key = period_start.isoformat()
                
                if period_key not in periods:
                    periods[period_key] = {
                        'period_start': period_start.isoformat(),
                        'period_end': get_period_end(period_start, freq).isoformat(),
                        'total_earning': 0,
                        'total_paid': 0,
                        'delivery_count': 0,
                        'earnings': [],
                        'is_paid': True  # Assume pago até encontrar um não pago
                    }
                
                periods[period_key]['total_earning'] += float(earning.driver_earning or 0)
                if earning.is_paid:
                    periods[period_key]['total_paid'] += float(earning.driver_earning or 0)
                else:
                    periods[period_key]['is_paid'] = False
                periods[period_key]['delivery_count'] += 1
                periods[period_key]['earnings'].append({
                    'id': earning.id,
                    'order_id': earning.order_id,
                    'delivery_fee': float(earning.delivery_fee or 0),
                    'driver_earning': float(earning.driver_earning or 0),
                    'payment_type': earning.payment_type,
                    'is_paid': earning.is_paid,
                    'created_at': earning.created_at.isoformat()
                })
            
            # Calcular totais
            total_earning = sum(p['total_earning'] for p in periods.values())
            total_paid = sum(p['total_paid'] for p in periods.values())
            total_pending = total_earning - total_paid
            
            reports.append({
                'driver_id': driver.id,
                'driver_name': driver.name,
                'driver_phone': driver.phone,
                'restaurant_id': driver.restaurant_id,
                'restaurant_name': driver.restaurant.name if driver.restaurant else 'N/A',
                'payment_frequency': freq,
                'total_earning': total_earning,
                'total_paid': total_paid,
                'total_pending': total_pending,
                'periods': list(periods.values())
            })
        
        # Ordenar por nome do entregador
        reports.sort(key=lambda x: x['driver_name'])
        
        return jsonify({
            'reports': reports,
            'summary': {
                'total_drivers': len(reports),
                'total_earning': sum(r['total_earning'] for r in reports),
                'total_paid': sum(r['total_paid'] for r in reports),
                'total_pending': sum(r['total_pending'] for r in reports)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Erro ao gerar relatório: {e}")
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/pay-period', methods=['POST'])
@jwt_required()
def pay_period():
    """Marca ganhos de um período como pagos"""
    try:
        data = request.get_json()
        driver_id = data.get('driver_id')
        period_start = data.get('period_start')
        payment_method = data.get('payment_method', 'PIX')
        
        if not driver_id or not period_start:
            return jsonify({'error': 'Entregador e período são obrigatórios'}), 400
        
        # Buscar entregador
        driver = EstablishmentDriver.query.get(driver_id)
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404
        
        # Determinar frequência e período
        freq = driver.payment_frequency or 'WEEKLY'
        start = datetime.fromisoformat(period_start)
        end = get_period_end(start, freq)
        
        # Buscar ganhos não pagos no período
        earnings = OwnDriverEarning.query.filter(
            OwnDriverEarning.establishment_driver_id == driver_id,
            OwnDriverEarning.created_at >= start,
            OwnDriverEarning.created_at <= end,
            OwnDriverEarning.is_paid == False
        ).all()
        
        if not earnings:
            return jsonify({'message': 'Nenhum ganho pendente neste período'}), 200
        
        # Marcar como pagos
        total_paid = 0
        for earning in earnings:
            earning.is_paid = True
            earning.paid_at = datetime.utcnow()
            earning.payment_method = payment_method
            total_paid += float(earning.driver_earning or 0)
        
        db.session.commit()
        
        return jsonify({
            'message': f'{len(earnings)} pagamento(s) quitado(s)',
            'total_paid': total_paid,
            'payment_method': payment_method
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao pagar período: {e}")
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/pay-all', methods=['POST'])
@jwt_required()
def pay_all():
    """Marca todos os ganhos pendentes de um entregador como pagos"""
    try:
        data = request.get_json()
        driver_id = data.get('driver_id')
        payment_method = data.get('payment_method', 'PIX')
        
        if not driver_id:
            return jsonify({'error': 'Entregador é obrigatório'}), 400
        
        # Buscar ganhos não pagos
        earnings = OwnDriverEarning.query.filter(
            OwnDriverEarning.establishment_driver_id == driver_id,
            OwnDriverEarning.is_paid == False
        ).all()
        
        if not earnings:
            return jsonify({'message': 'Nenhum ganho pendente'}), 200
        
        # Marcar como pagos
        total_paid = 0
        for earning in earnings:
            earning.is_paid = True
            earning.paid_at = datetime.utcnow()
            earning.payment_method = payment_method
            total_paid += float(earning.driver_earning or 0)
        
        db.session.commit()
        
        return jsonify({
            'message': f'{len(earnings)} pagamento(s) quitado(s)',
            'total_paid': total_paid,
            'payment_method': payment_method
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao pagar todos: {e}")
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/establishment-subscription', methods=['GET'])
@jwt_required()
def get_establishment_subscription():
    """Obtém informações de assinatura/cobrança do estabelecimento"""
    try:
        user = get_current_user()
        
        if user.user_type == UserType.CLIENT:
            customer = Customer.query.filter_by(user_id=user.id).first()
            if not customer:
                return jsonify({'error': 'Perfil não encontrado'}), 404
            restaurant = Restaurant.query.filter_by(name=customer.name).first()
            if not restaurant:
                return jsonify({'error': 'Restaurante não encontrado'}), 404
        else:
            restaurant_id = request.args.get('restaurant_id', type=int)
            if not restaurant_id:
                return jsonify({'error': 'restaurant_id é obrigatório para admin'}), 400
            restaurant = Restaurant.query.get(restaurant_id)
            if not restaurant:
                return jsonify({'error': 'Restaurante não encontrado'}), 404
        
        # Contar entregadores próprios
        own_drivers_count = EstablishmentDriver.query.filter_by(
            restaurant_id=restaurant.id,
            is_active=True
        ).count()
        
        # Calcular valor da assinatura (exemplo: R$50/mês por entregador próprio)
        # Isso pode ser configurável por tenant/pracinha
        base_price_per_driver = 50.00
        monthly_total = own_drivers_count * base_price_per_driver
        
        return jsonify({
            'restaurant_id': restaurant.id,
            'restaurant_name': restaurant.name,
            'has_own_drivers': restaurant.has_own_drivers,
            'own_drivers_count': own_drivers_count,
            'base_price_per_driver': base_price_per_driver,
            'monthly_total': monthly_total,
            'subscription_type': restaurant.subscription_type or 'NONE',
            'subscription_expires_at': restaurant.subscription_expires_at.isoformat() if restaurant.subscription_expires_at else None
        }), 200
        
    except Exception as e:
        logger.error(f"Erro ao buscar assinatura: {e}")
        return jsonify({'error': str(e)}), 500


# ==================== ASSINATURA ====================

@finance_bp.route('/subscriptions', methods=['GET'])
@jwt_required()
def get_subscriptions():
    """Lista todas as assinaturas"""
    try:
        user = get_current_user()
        tenant_id = get_current_tenant_id()
        
        query = EstablishmentSubscription.query
        
        if user.user_type == UserType.CLIENT:
            customer = Customer.query.filter_by(user_id=user.id).first()
            if customer:
                restaurant = Restaurant.query.filter_by(name=customer.name).first()
                if restaurant:
                    query = query.filter_by(restaurant_id=restaurant.id)
        elif user.user_type == UserType.ADMIN and tenant_id:
            query = query.filter_by(tenant_id=tenant_id)
        
        subscriptions = query.order_by(EstablishmentSubscription.created_at.desc()).all()
        
        return jsonify({
            'subscriptions': [s.to_dict() for s in subscriptions]
        }), 200
        
    except Exception as e:
        logger.error(f"Erro ao listar assinaturas: {e}")
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/subscriptions', methods=['POST'])
@jwt_required()
def create_subscription():
    """Cria uma nova assinatura para um estabelecimento"""
    try:
        data = request.get_json()
        restaurant_id = data.get('restaurant_id')
        billing_cycle = data.get('billing_cycle', 'WEEKLY')
        price_per_driver = data.get('price_per_driver', 50.00)
        
        if not restaurant_id:
            return jsonify({'error': 'restaurant_id é obrigatório'}), 400
        
        # Verificar se já existe assinatura
        existing = EstablishmentSubscription.query.filter_by(
            restaurant_id=restaurant_id,
            is_active=True
        ).first()
        
        if existing:
            return jsonify({'error': 'Estabelecimento já possui assinatura ativa'}), 400
        
        # Buscar restaurante
        restaurant = Restaurant.query.get(restaurant_id)
        if not restaurant:
            return jsonify({'error': 'Restaurante não encontrado'}), 404
        
        # Calcular próxima data de cobrança
        now = datetime.utcnow()
        if billing_cycle == 'WEEKLY':
            next_billing = now + timedelta(days=7)
        else:  # MONTHLY
            if now.month == 12:
                next_billing = now.replace(year=now.year + 1, month=1, day=1)
            else:
                next_billing = now.replace(month=now.month + 1, day=1)
        
        # Criar assinatura
        subscription = EstablishmentSubscription(
            restaurant_id=restaurant_id,
            tenant_id=restaurant.tenant_id,
            billing_cycle=billing_cycle,
            price_per_driver=price_per_driver,
            is_active=True,
            next_billing_at=next_billing
        )
        db.session.add(subscription)
        
        # Atualizar restaurante
        restaurant.subscription_type = 'ACTIVE'
        restaurant.subscription_expires_at = next_billing
        
        db.session.commit()
        
        return jsonify({
            'message': 'Assinatura criada com sucesso',
            'subscription': subscription.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao criar assinatura: {e}")
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/subscriptions/<int:subscription_id>', methods=['PUT'])
@jwt_required()
def update_subscription(subscription_id):
    """Atualiza configuração da assinatura"""
    try:
        subscription = EstablishmentSubscription.query.get(subscription_id)
        if not subscription:
            return jsonify({'error': 'Assinatura não encontrada'}), 404
        
        data = request.get_json()
        
        if 'billing_cycle' in data:
            subscription.billing_cycle = data['billing_cycle']
        if 'price_per_driver' in data:
            subscription.price_per_driver = data['price_per_driver']
        if 'is_active' in data:
            subscription.is_active = data['is_active']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Assinatura atualizada',
            'subscription': subscription.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao atualizar assinatura: {e}")
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/subscriptions/<int:subscription_id>/generate-invoice', methods=['POST'])
@jwt_required()
def generate_invoice(subscription_id):
    """Gera fatura manual para uma assinatura"""
    try:
        subscription = EstablishmentSubscription.query.get(subscription_id)
        if not subscription:
            return jsonify({'error': 'Assinatura não encontrada'}), 404
        
        # Contar entregadores ativos no período
        now = datetime.utcnow()
        if subscription.billing_cycle == 'WEEKLY':
            period_start = now - timedelta(days=7)
        else:
            period_start = now - timedelta(days=30)
        
        drivers_count = EstablishmentDriver.query.filter(
            EstablishmentDriver.restaurant_id == subscription.restaurant_id,
            EstablishmentDriver.is_active == True
        ).count()
        
        if drivers_count == 0:
            return jsonify({'error': 'Nenhum entregador ativo encontrado'}), 400
        
        # Calcular valor
        total_amount = drivers_count * float(subscription.price_per_driver)
        
        # Gerar número da fatura
        invoice_count = SubscriptionInvoice.query.filter_by(subscription_id=subscription_id).count()
        invoice_number = f"SUB-{subscription.restaurant_id:04d}-{invoice_count + 1:04d}"
        
        # Calcular data de vencimento
        if subscription.billing_cycle == 'WEEKLY':
            due_date = now + timedelta(days=7)
        else:
            due_date = now + timedelta(days=30)
        
        # Criar fatura
        invoice = SubscriptionInvoice(
            subscription_id=subscription_id,
            restaurant_id=subscription.restaurant_id,
            invoice_number=invoice_number,
            period_start=period_start,
            period_end=now,
            drivers_count=drivers_count,
            price_per_driver=subscription.price_per_driver,
            total_amount=total_amount,
            status='PENDING',
            due_date=due_date
        )
        db.session.add(invoice)
        
        # Atualizar assinatura
        subscription.last_billed_at = now
        subscription.total_billed = float(subscription.total_billed or 0) + total_amount
        
        if subscription.billing_cycle == 'WEEKLY':
            subscription.next_billing_at = now + timedelta(days=7)
        else:
            if now.month == 12:
                subscription.next_billing_at = now.replace(year=now.year + 1, month=1, day=1)
            else:
                subscription.next_billing_at = now.replace(month=now.month + 1, day=1)
        
        db.session.commit()
        
        return jsonify({
            'message': f'Fatura {invoice_number} gerada com sucesso',
            'invoice': invoice.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao gerar fatura: {e}")
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/invoices', methods=['GET'])
@jwt_required()
def get_invoices():
    """Lista faturas de assinatura"""
    try:
        user = get_current_user()
        tenant_id = get_current_tenant_id()
        
        query = SubscriptionInvoice.query
        
        if user.user_type == UserType.CLIENT:
            customer = Customer.query.filter_by(user_id=user.id).first()
            if customer:
                restaurant = Restaurant.query.filter_by(name=customer.name).first()
                if restaurant:
                    query = query.filter_by(restaurant_id=restaurant.id)
        elif user.user_type == UserType.ADMIN and tenant_id:
            restaurant_ids = [r.id for r in Restaurant.query.filter_by(tenant_id=tenant_id).all()]
            query = query.filter(SubscriptionInvoice.restaurant_id.in_(restaurant_ids))
        
        # Filtros
        status = request.args.get('status')
        if status:
            query = query.filter_by(status=status)
        
        invoices = query.order_by(SubscriptionInvoice.created_at.desc()).all()
        
        return jsonify({
            'invoices': [i.to_dict() for i in invoices]
        }), 200
        
    except Exception as e:
        logger.error(f"Erro ao listar faturas: {e}")
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/invoices/<int:invoice_id>/pay', methods=['POST'])
@jwt_required()
def pay_invoice(invoice_id):
    """Marca uma fatura como paga"""
    try:
        invoice = SubscriptionInvoice.query.get(invoice_id)
        if not invoice:
            return jsonify({'error': 'Fatura não encontrada'}), 404
        
        data = request.get_json() or {}
        payment_method = data.get('payment_method', 'PIX')
        
        invoice.status = 'PAID'
        invoice.paid_at = datetime.utcnow()
        invoice.payment_method = payment_method
        
        # Atualizar assinatura
        subscription = EstablishmentSubscription.query.get(invoice.subscription_id)
        if subscription:
            subscription.total_paid = float(subscription.total_paid or 0) + float(invoice.total_amount)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Fatura quitada com sucesso',
            'invoice': invoice.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao pagar fatura: {e}")
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/generate-all-invoices', methods=['POST'])
@jwt_required()
def generate_all_invoices():
    """Gera faturas para todas as assinaturas com cobrança pendente"""
    try:
        user = get_current_user()
        if user.user_type != UserType.ADMIN:
            return jsonify({'error': 'Apenas administradores podem gerar faturas em lote'}), 403
        
        now = datetime.utcnow()
        
        # Buscar assinaturas com cobrança pendente
        subscriptions = EstablishmentSubscription.query.filter(
            EstablishmentSubscription.is_active == True,
            EstablishmentSubscription.next_billing_at <= now
        ).all()
        
        generated = []
        for subscription in subscriptions:
            # Contar entregadores
            drivers_count = EstablishmentDriver.query.filter(
                EstablishmentDriver.restaurant_id == subscription.restaurant_id,
                EstablishmentDriver.is_active == True
            ).count()
            
            if drivers_count == 0:
                continue
            
            # Calcular período
            if subscription.billing_cycle == 'WEEKLY':
                period_start = now - timedelta(days=7)
            else:
                period_start = now - timedelta(days=30)
            
            # Calcular valor
            total_amount = drivers_count * float(subscription.price_per_driver)
            
            # Gerar número da fatura
            invoice_count = SubscriptionInvoice.query.filter_by(subscription_id=subscription.id).count()
            invoice_number = f"SUB-{subscription.restaurant_id:04d}-{invoice_count + 1:04d}"
            
            # Calcular vencimento
            if subscription.billing_cycle == 'WEEKLY':
                due_date = now + timedelta(days=7)
            else:
                due_date = now + timedelta(days=30)
            
            # Criar fatura
            invoice = SubscriptionInvoice(
                subscription_id=subscription.id,
                restaurant_id=subscription.restaurant_id,
                invoice_number=invoice_number,
                period_start=period_start,
                period_end=now,
                drivers_count=drivers_count,
                price_per_driver=subscription.price_per_driver,
                total_amount=total_amount,
                status='PENDING',
                due_date=due_date
            )
            db.session.add(invoice)
            
            # Atualizar assinatura
            subscription.last_billed_at = now
            subscription.total_billed = float(subscription.total_billed or 0) + total_amount
            
            if subscription.billing_cycle == 'WEEKLY':
                subscription.next_billing_at = now + timedelta(days=7)
            else:
                if now.month == 12:
                    subscription.next_billing_at = now.replace(year=now.year + 1, month=1, day=1)
                else:
                    subscription.next_billing_at = now.replace(month=now.month + 1, day=1)
            
            generated.append(invoice_number)
        
        db.session.commit()
        
        return jsonify({
            'message': f'{len(generated)} fatura(s) gerada(s)',
            'invoices': generated
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao gerar faturas em lote: {e}")
        return jsonify({'error': str(e)}), 500
