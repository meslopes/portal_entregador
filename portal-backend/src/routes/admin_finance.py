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
    Address,
    Driver,
    EstablishmentDriver,
    Order,
    OrderStatus,
    Payment,
    PaymentStatus,
    Restaurant,
    User,
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



@admin_finance_bp.route('/live-tracking', methods=['GET'])

@jwt_required()

@admin_required

def get_live_tracking():

    """Obtém localização em tempo real de entregadores, estabelecimentos e locais de entrega"""

    try:

        square_id = request.args.get('square_id', type=int)

        tenant_id = get_current_tenant_id()



        # Entregadores online (filtrados por tenant)

        driver_query = Driver.query.filter(

            Driver.is_online,

            Driver.current_latitude.isnot(None),

            Driver.current_longitude.isnot(None)

        )

        if tenant_id:

            driver_query = driver_query.filter(Driver.tenant_id == tenant_id)

        if square_id:

            driver_query = driver_query.filter(Driver.square_id == square_id)

        online_drivers = driver_query.join(User).all()



        tracking_data = []

        for driver in online_drivers:

            current_order = Order.query.filter(

                Order.driver_id == driver.id,

                Order.status.in_([

                    OrderStatus.ACCEPTED,

                    OrderStatus.PREPARING,

                    OrderStatus.READY,

                    OrderStatus.PICKED_UP

                ])

            ).first()



            driver_data = {

                'type': 'driver',

                'driver_id': driver.id,

                'name': f"{driver.user.first_name} {driver.user.last_name}",

                'latitude': float(driver.current_latitude),

                'longitude': float(driver.current_longitude),

                'last_update': driver.last_location_update.isoformat() if driver.last_location_update else None,

                'vehicle_type': driver.vehicle_type.value,

                'current_order': current_order.to_dict() if current_order else None

            }



            tracking_data.append(driver_data)



        # Entregadores próprios online

        own_driver_query = EstablishmentDriver.query.join(Restaurant).filter(
            EstablishmentDriver.is_online,
            EstablishmentDriver.is_active,
            EstablishmentDriver.current_latitude.isnot(None),
            EstablishmentDriver.current_longitude.isnot(None)
        )

        if tenant_id:
            own_driver_query = own_driver_query.filter(Restaurant.tenant_id == tenant_id)

        if square_id:
            own_driver_query = own_driver_query.filter(Restaurant.square_id == square_id)

        online_own_drivers = own_driver_query.all()

        for est_driver in online_own_drivers:
            current_order = Order.query.filter(
                Order.establishment_driver_id == est_driver.id,
                Order.assigned_to_own_driver,
                Order.status.in_([
                    OrderStatus.ACCEPTED,
                    OrderStatus.PREPARING,
                    OrderStatus.READY,
                    OrderStatus.PICKED_UP
                ])
            ).first()

            own_driver_data = {
                'type': 'driver',
                'driver_id': f"own_{est_driver.id}",
                'name': est_driver.name,
                'latitude': float(est_driver.current_latitude),
                'longitude': float(est_driver.current_longitude),
                'last_update': est_driver.updated_at.isoformat() if est_driver.updated_at else None,
                'vehicle_type': est_driver.vehicle_type,
                'is_own': True,
                'restaurant_name': est_driver.restaurant.name if est_driver.restaurant else None,
                'current_order': current_order.to_dict() if current_order else None
            }

            tracking_data.append(own_driver_data)



        # Pedidos ativos (filtrados por tenant)

        order_query = Order.query.filter(

            Order.status.in_([

                OrderStatus.PENDING,

                OrderStatus.ACCEPTED,

                OrderStatus.PREPARING,

                OrderStatus.READY,

                OrderStatus.PICKED_UP

            ])

        )

        if tenant_id:

            order_query = order_query.filter(Order.tenant_id == tenant_id)

        if square_id:

            order_query = order_query.join(Restaurant).filter(Restaurant.square_id == square_id)

        active_orders = order_query.all()



        restaurant_ids_with_active = set()

        delivery_ids_added = set()



        for order in active_orders:

            # Estabelecimentos com pedidos ativos

            if order.restaurant_id and order.restaurant_id not in restaurant_ids_with_active:

                restaurant_ids_with_active.add(order.restaurant_id)

                restaurant = Restaurant.query.get(order.restaurant_id)

                if restaurant:

                    if restaurant.latitude and restaurant.longitude:

                        # Buscar pedidos ativos deste estabelecimento

                        restaurant_active_orders = Order.query.filter(

                            Order.restaurant_id == restaurant.id,

                            Order.status.in_([

                                OrderStatus.PENDING,

                                OrderStatus.ACCEPTED,

                                OrderStatus.PREPARING,

                                OrderStatus.READY,

                                OrderStatus.PICKED_UP

                            ])

                        ).all()



                        est_data = {

                            'type': 'establishment',

                            'restaurant_id': restaurant.id,

                            'name': restaurant.name,

                            'latitude': float(restaurant.latitude),

                            'longitude': float(restaurant.longitude),

                            'address': restaurant.address,

                            'active_orders': len(restaurant_active_orders),

                            'orders': [{

                                'id': o.id,

                                'order_number': o.order_number,

                            'status': o.status.value,

                            'customer_name': o.customer.name if o.customer else '',

                            'delivery_fee': float(o.delivery_fee) if o.delivery_fee else 0,

                            'total_amount': float(o.total_amount) if o.total_amount else 0,

                            'driver_name': f"{o.driver.user.first_name} {o.driver.user.last_name}" if o.driver and o.driver.user else None,

                            'created_at': o.created_at.isoformat() if o.created_at else None

                        } for o in restaurant_active_orders]

                    }

                    tracking_data.append(est_data)



            # Locais de entrega

            if order.delivery_address_id and order.delivery_address_id not in delivery_ids_added:

                delivery_ids_added.add(order.delivery_address_id)

                delivery_addr = Address.query.get(order.delivery_address_id)

                if delivery_addr and delivery_addr.latitude and delivery_addr.longitude:

                    del_data = {

                        'type': 'delivery',

                        'order_id': order.id,

                        'order_number': order.order_number,

                        'latitude': float(delivery_addr.latitude),

                        'longitude': float(delivery_addr.longitude),

                        'street': delivery_addr.street,

                        'neighborhood': delivery_addr.neighborhood,

                        'customer_name': order.customer.name if order.customer else '',

                        'status': order.status.value

                    }

                    tracking_data.append(del_data)



        # Limpar estado pendente (endpoint é GET/read-only)

        db.session.expire_all()

        return jsonify({

            'drivers': [d for d in tracking_data if d['type'] == 'driver'],

            'establishments': [d for d in tracking_data if d['type'] == 'establishment'],

            'deliveries': [d for d in tracking_data if d['type'] == 'delivery'],

            'count': len([d for d in tracking_data if d['type'] == 'driver'])

        }), 200



    except Exception as e:

        return jsonify({'error': str(e)}), 500





# ============================================

# GESTÃO DE ESTABELECIMENTOS

# ============================================



