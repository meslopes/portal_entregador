"""
Rotas administrativas - Financeiro.
Extraído de admin.py para melhor organização.
Inclui: dashboard financeiro, faturas, saques, preços, praças, pagamentos, Asaas.
"""
import logging
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from src.models.portal_models import (
    Driver,
    Order,
    OrderStatus,
    Payment,
    PaymentStatus,
    Restaurant,
    db,
)
from src.utils.auth import admin_required
from src.utils.tenant import get_current_tenant_id

logger = logging.getLogger(__name__)

admin_finance_bp = Blueprint('admin_finance', __name__)


def get_square_filter():
    """Retorna o square_id do query param se fornecido."""
    return request.args.get('square_id', type=int)


# DASHBOARD FINANCEIRO

# ============================================



@admin_finance_bp.route('/finance', methods=['GET'])

@jwt_required()

@admin_required

def get_finance_dashboard():

    """Dashboard financeiro completo"""

    try:

        period = request.args.get('period', 'month')  # today, week, month, year

        tenant_id = get_current_tenant_id()
        square_id = get_square_filter()



        # Define data de inicio baseado no periodo

        now = datetime.now(timezone.utc)

        if period == 'today':

            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)

        elif period == 'week':

            start_date = now - timedelta(days=7)

        elif period == 'month':

            start_date = now - timedelta(days=30)

        elif period == 'year':

            start_date = now - timedelta(days=365)

        else:

            start_date = now - timedelta(days=30)



        # Receita total (pedidos entregues no periodo)

        revenue_query = db.session.query(

            func.sum(Order.total_amount)

        ).filter(

            Order.status == OrderStatus.DELIVERED,

            Order.created_at >= start_date

        )

        if tenant_id:

            revenue_query = revenue_query.filter(Order.tenant_id == tenant_id)
        if square_id:
            revenue_query = revenue_query.filter(Order.square_id == square_id)

        revenue_result = revenue_query.scalar() or 0



        # Total de pedidos no periodo

        orders_query = Order.query.filter(Order.created_at >= start_date)

        if tenant_id:

            orders_query = orders_query.filter(Order.tenant_id == tenant_id)
        if square_id:
            orders_query = orders_query.filter(Order.square_id == square_id)

        total_orders = orders_query.count()



        # Pedidos entregues no periodo

        delivered_query = Order.query.filter(

            Order.status == OrderStatus.DELIVERED,

            Order.created_at >= start_date

        )

        if tenant_id:

            delivered_query = delivered_query.filter(Order.tenant_id == tenant_id)
        if square_id:
            delivered_query = delivered_query.filter(Order.square_id == square_id)

        delivered_orders = delivered_query.count()



        # Pedidos pendentes

        pending_query = Order.query.filter(Order.status == OrderStatus.PENDING)

        if tenant_id:

            pending_query = pending_query.filter(Order.tenant_id == tenant_id)
        if square_id:
            pending_query = pending_query.filter(Order.square_id == square_id)

        pending_orders = pending_query.count()



        # Ganhos dos entregadores no periodo (pagamentos processados)

        payments_query = db.session.query(

            func.sum(Payment.amount)

        ).filter(

            Payment.status == PaymentStatus.PROCESSED,

            Payment.created_at >= start_date

        )

        if tenant_id:

            payments_query = payments_query.join(Driver).filter(Driver.tenant_id == tenant_id)
        elif square_id:
            payments_query = payments_query.join(Driver)

        if square_id:
            payments_query = payments_query.filter(Driver.square_id == square_id)

        driver_payments = payments_query.scalar() or 0



        # Ganhos pendentes de processamento

        pending_pay_query = db.session.query(

            func.sum(Payment.amount)

        ).filter(

            Payment.status == PaymentStatus.PENDING

        )

        if tenant_id:

            pending_pay_query = pending_pay_query.join(Driver).filter(Driver.tenant_id == tenant_id)
        elif square_id:
            pending_pay_query = pending_pay_query.join(Driver)

        if square_id:
            pending_pay_query = pending_pay_query.filter(Driver.square_id == square_id)

        pending_payments = pending_pay_query.scalar() or 0



        # Ticket medio

        avg_order_value = float(revenue_result) / delivered_orders if delivered_orders > 0 else 0



        # Frete total cobrado

        total_delivery_fees_query = db.session.query(

            func.sum(Order.delivery_fee)

        ).filter(

            Order.status == OrderStatus.DELIVERED,

            Order.created_at >= start_date

        )
        if square_id:
            total_delivery_fees_query = total_delivery_fees_query.filter(Order.square_id == square_id)

        total_delivery_fees = total_delivery_fees_query.scalar() or 0



        # Receita por estabelecimento (top 10)

        revenue_by_est_query = db.session.query(

            Restaurant.name,

            func.sum(Order.delivery_fee).label('revenue'),

            func.count(Order.id).label('order_count')

        ).join(Order).filter(

            Order.status == OrderStatus.DELIVERED,

            Order.created_at >= start_date

        )
        if square_id:
            revenue_by_est_query = revenue_by_est_query.filter(Order.square_id == square_id)

        revenue_by_establishment = revenue_by_est_query.group_by(Restaurant.name).order_by(

            func.sum(Order.delivery_fee).desc()

        ).limit(10).all()



        # Receita diária (últimos 30 dias para gráfico)

        daily_revenue_query = db.session.query(

            func.date(Order.created_at).label('date'),

            func.sum(Order.delivery_fee).label('revenue'),

            func.count(Order.id).label('orders')

        ).filter(

            Order.status == OrderStatus.DELIVERED,

            Order.created_at >= now - timedelta(days=30)

        )
        if square_id:
            daily_revenue_query = daily_revenue_query.filter(Order.square_id == square_id)

        daily_revenue = daily_revenue_query.group_by(func.date(Order.created_at)).order_by(

            func.date(Order.created_at)

        ).all()



        return jsonify({

            'period': period,

            'revenue': float(revenue_result),

            'total_orders': total_orders,

            'delivered_orders': delivered_orders,

            'pending_orders': pending_orders,

            'driver_payments': float(driver_payments),

            'pending_payments': float(pending_payments),

            'avg_order_value': round(avg_order_value, 2),

            'total_delivery_fees': float(total_delivery_fees),

            'revenue_by_establishment': [

                {'name': name, 'revenue': float(revenue), 'orders': orders}

                for name, revenue, orders in revenue_by_establishment

            ],

            'daily_revenue': [

                {'date': date.isoformat(), 'revenue': float(revenue), 'orders': orders}

                for date, revenue, orders in daily_revenue

            ]

        }), 200



    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_finance_bp.route('/finance/establishments', methods=['GET'])

@jwt_required()

@admin_required

def get_finance_by_establishment():

    """Financeiro por estabelecimento"""

    try:

        period = request.args.get('period', 'month')

        tenant_id = get_current_tenant_id()

        now = datetime.now(timezone.utc)



        if period == 'today':

            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)

        elif period == 'week':

            start_date = now - timedelta(days=7)

        elif period == 'month':

            start_date = now - timedelta(days=30)

        elif period == 'year':

            start_date = now - timedelta(days=365)

        else:

            start_date = now - timedelta(days=30)



        query = db.session.query(

            Restaurant.id,

            Restaurant.name,

            Restaurant.phone,

            func.sum(Order.total_amount).label('revenue'),

            func.count(Order.id).label('total_orders'),

            func.sum(Order.delivery_fee).label('delivery_fees')

        ).outerjoin(Order, db.and_(

            Order.restaurant_id == Restaurant.id,

            Order.status == OrderStatus.DELIVERED,

            Order.created_at >= start_date

        ))



        # Filtrar por tenant

        if tenant_id:

            query = query.filter(Restaurant.tenant_id == tenant_id)



        establishments = query.group_by(Restaurant.id, Restaurant.name, Restaurant.phone).order_by(

            func.sum(Order.delivery_fee).desc()

        ).all()



        data = []

        for est in establishments:

            data.append({

                'id': est.id,

                'name': est.name,

                'phone': est.phone,

                'revenue': float(est.revenue or 0),

                'total_orders': est.total_orders or 0,

                'delivery_fees': float(est.delivery_fees or 0),

                'avg_order': round(float(est.revenue or 0) / est.total_orders, 2) if est.total_orders else 0

            })



        return jsonify({'establishments': data}), 200



    except Exception as e:

        return jsonify({'error': str(e)}), 500



