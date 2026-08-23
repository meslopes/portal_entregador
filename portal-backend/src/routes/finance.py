"""
Endpoints de relatórios financeiros para entregadores próprios.
Agrupamento por frequência de pagamento e quitação por período.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.portal_models import (
    db, EstablishmentDriver, OwnDriverEarning, Restaurant,
    User, UserType, Customer
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
