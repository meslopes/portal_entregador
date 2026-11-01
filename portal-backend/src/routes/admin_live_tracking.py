"""Rastreio ao vivo de entregadores no painel admin.

Extraído de admin_finance.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.models.portal_models import (
    Address,
    Driver,
    EstablishmentDriver,
    Order,
    OrderStatus,
    Restaurant,
    User,
    db,
)
from src.utils.auth import admin_required
from src.utils.tenant import get_current_tenant_id

admin_live_tracking_bp = Blueprint('live_tracking', __name__)


@admin_live_tracking_bp.route('/live-tracking', methods=['GET'])

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



