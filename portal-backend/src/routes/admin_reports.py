"""Relatórios do painel admin.

Extraído de admin_finance.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
"""
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from src.models.portal_models import (
    Delivery,
    Driver,
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

admin_reports_bp = Blueprint('reports', __name__)


@admin_reports_bp.route('/reports/orders-by-date', methods=['GET'])

@jwt_required()

@admin_required

def report_orders_by_date():

    """Relatório de pedidos por data"""

    try:

        days = request.args.get('days', 30, type=int)

        start_date = datetime.now(timezone.utc) - timedelta(days=days)

        tenant_id = get_current_tenant_id()

        square_id = get_square_filter()



        query = db.session.query(

            func.date(Order.created_at).label('date'),

            func.count(Order.id).label('total'),

            func.sum(Order.total_amount).label('revenue'),

            func.sum(Order.delivery_fee).label('delivery_fees')

        ).filter(

            Order.created_at >= start_date

        )



        if tenant_id:

            query = query.filter(Order.tenant_id == tenant_id)

        if square_id:

            query = query.filter(Order.square_id == square_id)



        results = query.group_by(func.date(Order.created_at)).order_by(

            func.date(Order.created_at)

        ).all()



        return jsonify({

            'data': [

                {

                    'date': r.date.isoformat(),

                    'orders': r.total,

                    'revenue': float(r.revenue or 0),

                    'delivery_fees': float(r.delivery_fees or 0)

                }

                for r in results

            ]

        }), 200



    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_reports_bp.route('/reports/drivers-performance', methods=['GET'])

@jwt_required()

@admin_required

def report_drivers_performance():

    """Relatório de desempenho dos entregadores"""

    try:

        days = request.args.get('days', 30, type=int)

        start_date = datetime.now(timezone.utc) - timedelta(days=days)

        tenant_id = get_current_tenant_id()

        square_id = get_square_filter()



        query = db.session.query(

            Driver.id,

            User.first_name,

            User.last_name,

            func.count(Order.id).label('deliveries'),

            func.avg(Delivery.customer_rating).label('avg_rating'),

            func.sum(Payment.amount).label('total_earnings')

        ).join(User).outerjoin(Order, db.and_(

            Order.driver_id == Driver.id,

            Order.status == OrderStatus.DELIVERED,

            Order.created_at >= start_date

        )).outerjoin(Delivery, Delivery.order_id == Order.id).outerjoin(

            Payment, db.and_(Payment.driver_id == Driver.id, Payment.status == PaymentStatus.PROCESSED)

        )



        if tenant_id:

            query = query.filter(Driver.tenant_id == tenant_id)

        if square_id:

            query = query.filter(Driver.square_id == square_id)



        drivers = query.group_by(Driver.id, User.first_name, User.last_name).order_by(

            func.count(Order.id).desc()

        ).all()



        return jsonify({

            'drivers': [

                {

                    'id': d.id,

                    'name': f"{d.first_name} {d.last_name}",

                    'deliveries': d.deliveries or 0,

                    'avg_rating': round(float(d.avg_rating), 2) if d.avg_rating else None,

                    'total_earnings': float(d.total_earnings or 0)

                }

                for d in drivers

            ]

        }), 200



    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_reports_bp.route('/reports/establishments-ranking', methods=['GET'])

@jwt_required()

@admin_required

def report_establishments_ranking():

    """Relatório de ranking dos estabelecimentos"""

    try:

        days = request.args.get('days', 30, type=int)

        start_date = datetime.now(timezone.utc) - timedelta(days=days)

        tenant_id = get_current_tenant_id()

        square_id = get_square_filter()



        query = db.session.query(

            Restaurant.id,

            Restaurant.name,

            func.count(Order.id).label('orders'),

            func.sum(Order.total_amount).label('revenue'),

            func.sum(Order.delivery_fee).label('delivery_fees'),

            func.avg(Order.total_amount).label('avg_order')

        ).outerjoin(Order, db.and_(

            Order.restaurant_id == Restaurant.id,

            Order.status == OrderStatus.DELIVERED,

            Order.created_at >= start_date

        ))



        # Filtrar por tenant

        if tenant_id:

            query = query.filter(Restaurant.tenant_id == tenant_id)

        if square_id:

            query = query.filter(Restaurant.square_id == square_id)



        results = query.group_by(Restaurant.id, Restaurant.name).order_by(

            func.sum(Order.delivery_fee).desc()

        ).all()



        return jsonify({

            'establishments': [

                {

                    'id': r.id,

                    'name': r.name,

                    'orders': r.orders or 0,

                    'revenue': float(r.revenue or 0),

                    'delivery_fees': float(r.delivery_fees or 0),

                    'avg_order': round(float(r.avg_order or 0), 2)

                }

                for r in results

            ]

        }), 200



    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_reports_bp.route('/reports/financial-summary', methods=['GET'])

@jwt_required()

@admin_required

def report_financial_summary():

    """Resumo financeiro geral"""

    try:

        days = request.args.get('days', 30, type=int)

        start_date = datetime.now(timezone.utc) - timedelta(days=days)

        tenant_id = get_current_tenant_id()

        square_id = get_square_filter()



        # Receita total

        revenue_query = db.session.query(func.sum(Order.delivery_fee)).filter(

            Order.status == OrderStatus.DELIVERED,

            Order.created_at >= start_date

        )

        if tenant_id:

            revenue_query = revenue_query.filter(Order.tenant_id == tenant_id)

        if square_id:

            revenue_query = revenue_query.filter(Order.square_id == square_id)

        total_revenue = revenue_query.scalar() or 0



        # Frete total

        fees_query = db.session.query(func.sum(Order.delivery_fee)).filter(

            Order.status == OrderStatus.DELIVERED,

            Order.created_at >= start_date

        )

        if tenant_id:

            fees_query = fees_query.filter(Order.tenant_id == tenant_id)

        if square_id:

            fees_query = fees_query.filter(Order.square_id == square_id)

        total_fees = fees_query.scalar() or 0



        # Pagamentos processados aos entregadores

        payments_query = db.session.query(func.sum(Payment.amount)).filter(

            Payment.status == PaymentStatus.PROCESSED,

            Payment.created_at >= start_date

        )

        if tenant_id:

            payments_query = payments_query.join(Driver).filter(Driver.tenant_id == tenant_id)

        if square_id:

            if not tenant_id:

                payments_query = payments_query.join(Driver)

            payments_query = payments_query.filter(Driver.square_id == square_id)

        driver_payments = payments_query.scalar() or 0



        # Total de pedidos

        orders_query = Order.query.filter(Order.created_at >= start_date)

        if tenant_id:

            orders_query = orders_query.filter(Order.tenant_id == tenant_id)

        if square_id:

            orders_query = orders_query.filter(Order.square_id == square_id)

        total_orders = orders_query.count()



        delivered_query = Order.query.filter(

            Order.status == OrderStatus.DELIVERED,

            Order.created_at >= start_date

        )

        if tenant_id:

            delivered_query = delivered_query.filter(Order.tenant_id == tenant_id)

        if square_id:

            delivered_query = delivered_query.filter(Order.square_id == square_id)

        delivered_orders = delivered_query.count()



        # Lucro do admin (receita - pagamentos aos entregadores)

        admin_profit = float(total_revenue) - float(driver_payments)



        return jsonify({

            'period_days': days,

            'total_revenue': float(total_revenue),

            'total_delivery_fees': float(total_fees),

            'driver_payments': float(driver_payments),

            'admin_profit': admin_profit,

            'total_orders': total_orders,

            'delivered_orders': delivered_orders,

            'conversion_rate': round(delivered_orders / total_orders * 100, 1) if total_orders > 0 else 0,

            'avg_order_value': round(float(total_revenue) / delivered_orders, 2) if delivered_orders > 0 else 0

        }), 200



    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_reports_bp.route('/reports/cancellations', methods=['GET'])

@jwt_required()

@admin_required

def report_cancellations():

    """Relatório de cancelamentos"""

    try:

        days = request.args.get('days', 30, type=int)

        start_date = datetime.now(timezone.utc) - timedelta(days=days)

        tenant_id = get_current_tenant_id()

        square_id = get_square_filter()



        # Cancelamentos por dia

        cancel_query = db.session.query(

            func.date(Order.updated_at).label('date'),

            func.count(Order.id).label('count')

        ).filter(

            Order.status == OrderStatus.CANCELLED,

            Order.updated_at >= start_date

        )

        if tenant_id:

            cancel_query = cancel_query.filter(Order.tenant_id == tenant_id)

        if square_id:

            cancel_query = cancel_query.filter(Order.square_id == square_id)



        daily_cancellations = cancel_query.group_by(func.date(Order.updated_at)).order_by(

            func.date(Order.updated_at)

        ).all()



        total_cancellations = sum(c.count for c in daily_cancellations)



        orders_query = Order.query.filter(Order.created_at >= start_date)

        if tenant_id:

            orders_query = orders_query.filter(Order.tenant_id == tenant_id)

        if square_id:

            orders_query = orders_query.filter(Order.square_id == square_id)

        total_orders = orders_query.count()



        cancel_rate = round(total_cancellations / total_orders * 100, 1) if total_orders > 0 else 0



        return jsonify({

            'daily': [{'date': c.date.isoformat(), 'count': c.count} for c in daily_cancellations],

            'total_cancellations': total_cancellations,

            'total_orders': total_orders,

            'cancel_rate': cancel_rate

        }), 200



    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_reports_bp.route('/reports/ratings', methods=['GET'])

@jwt_required()

@admin_required

def report_ratings():

    """Relatório de avaliações dos entregadores"""

    try:

        days = request.args.get('days', 30, type=int)

        start_date = datetime.now(timezone.utc) - timedelta(days=days)

        tenant_id = get_current_tenant_id()

        square_id = get_square_filter()



        # Avaliacoes por entregador

        ratings_query = db.session.query(

            Driver.id,

            User.first_name,

            User.last_name,

            func.avg(Delivery.customer_rating).label('avg_rating'),

            func.count(Delivery.id).label('total_ratings'),

            func.sum(func.cast(Delivery.customer_rating > 3, db.Integer)).label('positive'),

            func.sum(func.cast(Delivery.customer_rating <= 2, db.Integer)).label('negative')

        ).join(User).join(Delivery).filter(

            Delivery.customer_rating.isnot(None),

            Delivery.created_at >= start_date

        )

        if tenant_id:

            ratings_query = ratings_query.filter(Driver.tenant_id == tenant_id)

        if square_id:

            ratings_query = ratings_query.filter(Driver.square_id == square_id)



        ratings = ratings_query.group_by(Driver.id, User.first_name, User.last_name).order_by(

            func.avg(Delivery.customer_rating).desc()

        ).all()



        # Distribuicao geral

        dist_query = db.session.query(

            Delivery.customer_rating,

            func.count(Delivery.id).label('count')

        ).filter(

            Delivery.customer_rating.isnot(None),

            Delivery.created_at >= start_date

        )

        if tenant_id:

            dist_query = dist_query.join(Order).filter(Order.tenant_id == tenant_id)

        if square_id:

            dist_query = dist_query.join(Driver, Delivery.driver_id == Driver.id).filter(Driver.square_id == square_id)



        dist = dist_query.group_by(Delivery.customer_rating).all()



        return jsonify({

            'drivers': [

                {

                    'id': r.id,

                    'name': f"{r.first_name} {r.last_name}",

                    'avg_rating': round(float(r.avg_rating), 2),

                    'total_ratings': r.total_ratings,

                    'positive': r.positive or 0,

                    'negative': r.negative or 0

                }

                for r in ratings

            ],

            'distribution': {str(d.customer_rating): d.count for d in dist}

        }), 200



    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_reports_bp.route('/reports/peak-hours', methods=['GET'])

@jwt_required()

@admin_required

def report_peak_hours():

    """Relatório de horários de pico"""

    try:

        days = request.args.get('days', 30, type=int)

        start_date = datetime.now(timezone.utc) - timedelta(days=days)

        tenant_id = get_current_tenant_id()

        square_id = get_square_filter()



        # Pedidos por hora do dia

        hourly_query = db.session.query(

            func.extract('hour', Order.created_at).label('hour'),

            func.count(Order.id).label('count')

        ).filter(

            Order.created_at >= start_date

        )

        if tenant_id:

            hourly_query = hourly_query.filter(Order.tenant_id == tenant_id)

        if square_id:

            hourly_query = hourly_query.filter(Order.square_id == square_id)



        hourly = hourly_query.group_by(func.extract('hour', Order.created_at)).order_by(

            func.extract('hour', Order.created_at)

        ).all()



        # Pedidos por dia da semana

        daily_query = db.session.query(

            func.extract('dow', Order.created_at).label('day'),

            func.count(Order.id).label('count')

        ).filter(

            Order.created_at >= start_date

        )

        if tenant_id:

            daily_query = daily_query.filter(Order.tenant_id == tenant_id)

        if square_id:

            daily_query = daily_query.filter(Order.square_id == square_id)



        daily = daily_query.group_by(func.extract('dow', Order.created_at)).order_by(

            func.extract('dow', Order.created_at)

        ).all()



        day_names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']



        return jsonify({

            'hourly': [{'hour': int(h.hour), 'count': h.count} for h in hourly],

            'daily': [{'day': day_names[int(d.day)], 'count': d.count} for d in daily]

        }), 200



    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_reports_bp.route('/reports/deliveries-by-driver', methods=['GET'])

@jwt_required()

@admin_required

def report_deliveries_by_driver():

    """Relatório detalhado de entregas por entregador"""

    try:

        days = request.args.get('days', 30, type=int)

        start_date = datetime.now(timezone.utc) - timedelta(days=days)

        tenant_id = get_current_tenant_id()

        square_id = get_square_filter()



        query = db.session.query(

            Driver.id,

            User.first_name,

            User.last_name,

            Driver.vehicle_type,

            func.count(Order.id).label('deliveries'),

            func.sum(Order.delivery_fee).label('total_fees'),

            func.avg(Order.delivery_fee).label('avg_order'),

            func.avg(Delivery.distance_km).label('avg_distance'),

            func.avg(Delivery.customer_rating).label('avg_rating')

        ).join(User).outerjoin(Order, db.and_(

            Order.driver_id == Driver.id,

            Order.status == OrderStatus.DELIVERED,

            Order.created_at >= start_date

        )).outerjoin(Delivery, Delivery.order_id == Order.id)



        if tenant_id:

            query = query.filter(Driver.tenant_id == tenant_id)

        if square_id:

            query = query.filter(Driver.square_id == square_id)



        drivers = query.group_by(

            Driver.id, User.first_name, User.last_name, Driver.vehicle_type

        ).order_by(func.count(Order.id).desc()).all()



        return jsonify({

            'drivers': [

                {

                    'id': d.id,

                    'name': f"{d.first_name} {d.last_name}",

                    'vehicle': d.vehicle_type.value if d.vehicle_type else '-',

                    'deliveries': d.deliveries or 0,

                    'total_fees': float(d.total_fees or 0),

                    'avg_order': round(float(d.avg_order or 0), 2),

                    'avg_distance': round(float(d.avg_distance or 0), 2),

                    'avg_rating': round(float(d.avg_rating), 2) if d.avg_rating else None

                }

                for d in drivers

            ]

        }), 200



    except Exception as e:

        return jsonify({'error': str(e)}), 500





# ============================================

# CONFIGURACOES DO ADMIN

# ============================================



