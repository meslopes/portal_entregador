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
    Customer,
    Delivery,
    Driver,
    DynamicPricing,
    EstablishmentDriver,
    Invoice,
    Notification,
    NotificationType,
    Order,
    OrderStatus,
    Payment,
    PaymentStatus,
    PricingTable,
    Restaurant,
    SystemConfig,
    Tenant,
    User,
    db,
)
from src.utils.auth import admin_required, client_or_admin_required
from src.utils.tenant import get_current_tenant_id, get_current_user

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



@admin_finance_bp.route('/settings', methods=['GET'])

@jwt_required()

@client_or_admin_required

def get_settings():

    """Obtém configurações do admin/cliente"""

    try:

        from src.models.portal_models import SystemConfig

        tenant_id = get_current_tenant_id()



        query = SystemConfig.query

        if tenant_id:

            query = query.filter(

                (SystemConfig.tenant_id == tenant_id) | (SystemConfig.tenant_id.is_(None))

            )

        else:

            query = query.filter(SystemConfig.tenant_id.is_(None))



        configs = query.all()

        settings = {c.config_key: c.config_value for c in configs}

        return jsonify(settings), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_finance_bp.route('/settings', methods=['PUT'])

@jwt_required()

@client_or_admin_required

def update_settings():

    """Atualiza configurações do admin/cliente"""

    try:

        from src.models.portal_models import SystemConfig

        tenant_id = get_current_tenant_id()

        data = request.get_json()



        for key, value in data.items():

            # Busca config existente para este tenant

            config = SystemConfig.query.filter_by(config_key=key, tenant_id=tenant_id).first()

            if not config:

                # Se não existe para este tenant, cria

                config = SystemConfig(config_key=key, config_value=str(value), tenant_id=tenant_id)

                db.session.add(config)

            else:

                config.config_value = str(value)

                config.updated_at = datetime.now(timezone.utc)



        db.session.commit()

        return jsonify({'message': 'Configurações salvas com sucesso'}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





# ============================================

# CONFIGURAÇÕES DE WHITE-LABEL (TENANT)

# ============================================



@admin_finance_bp.route('/tenant/settings', methods=['GET'])

@jwt_required()

@admin_required

def get_tenant_settings():

    """Obtém configurações de white-label do tenant atual"""

    try:

        user = get_current_user()

        if not user or not user.tenant_id:

            # Retornar tenant padrão se usuário não tem tenant

            return jsonify({'tenant': {

                'id': None,

                'name': 'muvy.log',

                'slug': 'muvylog',

                'logo_url': None,

                'primary_color': '#6366f1',

                'secondary_color': '#ffffff',

                'plan': 'premium',

                'is_active': True

            }}), 200



        tenant = Tenant.query.get(user.tenant_id)

        if not tenant:

            return jsonify({'error': 'Organização não encontrada'}), 404



        return jsonify({'tenant': tenant.to_dict()}), 200

    except Exception:

        # Se tabela tenants não existir, retornar dados padrão

        return jsonify({'tenant': {

            'id': None,

            'name': 'muvy.log',

            'slug': 'muvylog',

            'logo_url': None,

            'primary_color': '#6366f1',

            'secondary_color': '#ffffff',

            'plan': 'premium',

            'is_active': True

        }}), 200





@admin_finance_bp.route('/tenant/settings', methods=['PUT'])

@jwt_required()

@admin_required

def update_tenant_settings():

    """Atualiza configurações de white-label do tenant atual"""

    try:



        user = get_current_user()

        if not user or not user.tenant_id:

            return jsonify({'error': 'Usuário não pertence a nenhuma organização'}), 400



        tenant = Tenant.query.get(user.tenant_id)

        if not tenant:

            return jsonify({'error': 'Organização não encontrada'}), 404



        data = request.get_json()



        # Atualizar campos permitidos

        if 'name' in data:

            tenant.name = data['name']

        if 'logo_url' in data:

            tenant.logo_url = data['logo_url']

        if 'primary_color' in data:

            tenant.primary_color = data['primary_color']

        if 'secondary_color' in data:

            tenant.secondary_color = data['secondary_color']

        if 'phone' in data:

            tenant.phone = data['phone']

        if 'email' in data:

            tenant.email = data['email']

        if 'address' in data:

            tenant.address = data['address']

        if 'cnpj' in data:

            tenant.cnpj = data['cnpj']

        if 'terms_url' in data:

            tenant.terms_url = data['terms_url']

        if 'privacy_url' in data:

            tenant.privacy_url = data['privacy_url']

        if 'custom_domain' in data:

            tenant.custom_domain = data['custom_domain']



        tenant.updated_at = datetime.now(timezone.utc)

        db.session.commit()



        return jsonify({

            'message': 'Configurações atualizadas com sucesso',

            'tenant': tenant.to_dict()

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





# ============================================

# TABELAS DE PREÇOS (PRICING TABLES)

# ============================================



@admin_finance_bp.route('/pricing-tables', methods=['GET'])

@jwt_required()

@admin_required

def list_pricing_tables():

    """Lista tabelas de preços do tenant"""

    try:

        tenant_id = get_current_tenant_id()

        square_id = request.args.get('square_id', type=int)



        query = PricingTable.query

        if tenant_id:

            query = query.filter(PricingTable.tenant_id == tenant_id)

        if square_id:

            query = query.filter(PricingTable.square_id == square_id)



        tables = query.order_by(PricingTable.name).all()

        return jsonify({'pricing_tables': [t.to_dict() for t in tables]}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_finance_bp.route('/pricing-tables', methods=['POST'])

@jwt_required()

@admin_required

def create_pricing_table():

    """Cria uma nova tabela de preços"""

    try:

        tenant_id = get_current_tenant_id()

        data = request.get_json()



        if not data.get('name') or not data.get('square_id'):

            return jsonify({'error': 'Nome e praca sao obrigatorios'}), 400



        def safe_float(value, default):

            if value is None or value == '':

                return default

            try:

                return float(value)

            except (ValueError, TypeError):

                return default



        price_per_km = safe_float(data.get('price_per_km'), 2.95)

        min_distance_km = safe_float(data.get('min_distance_km'), 4.0)

        min_delivery_fee = safe_float(data.get('min_delivery_fee'), price_per_km * min_distance_km)



        table = PricingTable(

            tenant_id=tenant_id,

            square_id=data['square_id'],

            name=data['name'],

            description=data.get('description'),

            price_per_km=price_per_km,

            min_distance_km=min_distance_km,

            min_delivery_fee=min_delivery_fee,

            max_delivery_fee=safe_float(data.get('max_delivery_fee'), 50.0),

            driver_percentage=safe_float(data.get('driver_percentage'), 65.0),

            gamification_percentage=safe_float(data.get('gamification_percentage'), 5.0),

            is_active=data.get('is_active', True)

        )

        db.session.add(table)

        db.session.commit()



        return jsonify({

            'message': 'Tabela de precos criada com sucesso',

            'pricing_table': table.to_dict()

        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_finance_bp.route('/pricing-tables/<int:table_id>', methods=['GET'])

@jwt_required()

@admin_required

def get_pricing_table(table_id):

    """Obtém detalhes de uma tabela de preços"""

    try:

        table = PricingTable.query.get(table_id)

        if not table:

            return jsonify({'error': 'Tabela não encontrada'}), 404



        tenant_id = get_current_tenant_id()

        if tenant_id and table.tenant_id != tenant_id:

            return jsonify({'error': 'Tabela não encontrada'}), 404



        return jsonify({'pricing_table': table.to_dict()}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_finance_bp.route('/pricing-tables/<int:table_id>', methods=['PUT'])

@jwt_required()

@admin_required

def update_pricing_table(table_id):

    """Atualiza uma tabela de preços"""

    try:

        table = PricingTable.query.get(table_id)

        if not table:

            return jsonify({'error': 'Tabela não encontrada'}), 404



        tenant_id = get_current_tenant_id()

        if tenant_id and table.tenant_id != tenant_id:

            return jsonify({'error': 'Tabela não encontrada'}), 404



        data = request.get_json()



        def safe_float(value, default=None):

            if value is None or value == '':

                return default

            try:

                return float(value)

            except (ValueError, TypeError):

                return default



        if 'name' in data:

            table.name = data['name']

        if 'description' in data:

            table.description = data['description']

        if 'price_per_km' in data:

            val = safe_float(data['price_per_km'])

            if val is not None:

                table.price_per_km = val

        if 'min_distance_km' in data:

            val = safe_float(data['min_distance_km'])

            if val is not None:

                table.min_distance_km = val

        if 'min_delivery_fee' in data:

            val = safe_float(data['min_delivery_fee'])

            if val is not None:

                table.min_delivery_fee = val

        if 'max_delivery_fee' in data:

            val = safe_float(data['max_delivery_fee'])

            if val is not None:

                table.max_delivery_fee = val

        if 'driver_percentage' in data:

            val = safe_float(data['driver_percentage'])

            if val is not None:

                table.driver_percentage = val

        if 'gamification_percentage' in data:

            val = safe_float(data['gamification_percentage'])

            if val is not None:

                table.gamification_percentage = val

        if 'is_active' in data:

            table.is_active = data['is_active']



        table.updated_at = datetime.now(timezone.utc)

        db.session.commit()



        return jsonify({

            'message': 'Tabela atualizada com sucesso',

            'pricing_table': table.to_dict()

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_finance_bp.route('/pricing-tables/<int:table_id>', methods=['DELETE'])

@jwt_required()

@admin_required

def delete_pricing_table(table_id):

    """Exclui uma tabela de preços"""

    try:

        table = PricingTable.query.get(table_id)

        if not table:

            return jsonify({'error': 'Tabela não encontrada'}), 404



        tenant_id = get_current_tenant_id()

        if tenant_id and table.tenant_id != tenant_id:

            return jsonify({'error': 'Tabela não encontrada'}), 404



        # Verificar se há estabelecimentos usando esta tabela

        restaurants_using = Restaurant.query.filter_by(pricing_table_id=table_id).count()

        if restaurants_using > 0:

            return jsonify({'error': f'Tabela em uso por {restaurants_using} estabelecimento(s)'}), 400



        db.session.delete(table)

        db.session.commit()



        return jsonify({'message': 'Tabela excluída com sucesso'}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





# ============================================

# DYNAMIC PRICING (Taxas Adicionais)

# ============================================



@admin_finance_bp.route('/dynamic-pricing', methods=['GET'])

@jwt_required()

@admin_required

def get_dynamic_pricing():

    """Lista configurações de taxas adicionais por praça"""

    try:

        tenant_id = get_current_tenant_id()
        square_id = get_square_filter()

        query = DynamicPricing.query

        if tenant_id:

            query = query.join(DynamicPricing.square).filter(

                db.or_(DynamicPricing.square.has(tenant_id=tenant_id), DynamicPricing.square.has(tenant_id=None))

            )

        if square_id:
            query = query.filter(DynamicPricing.square_id == square_id)

        configs = query.all()

        return jsonify({'dynamic_pricing': [d.to_dict() for d in configs]}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_finance_bp.route('/dynamic-pricing', methods=['POST'])

@jwt_required()

@admin_required

def create_dynamic_pricing():

    """Cria configuração de taxas adicionais para uma praça"""

    try:

        data = request.get_json()

        if not data or not data.get('square_id'):

            return jsonify({'error': 'Praça é obrigatória'}), 400



        square_id = data['square_id']

        existing = DynamicPricing.query.filter_by(square_id=square_id).first()

        if existing:

            return jsonify({'error': 'Já existe configuração para esta praça. Edite a existente.'}), 400



        config = DynamicPricing(

            square_id=square_id,

            rainy_day_active=data.get('rainy_day_active', False),

            rainy_day_bonus=data.get('rainy_day_bonus', 3.00),

            high_demand_active=data.get('high_demand_active', False),

            high_demand_threshold=data.get('high_demand_threshold', 5),

            high_demand_bonus=data.get('high_demand_bonus', 2.00),

            holiday_active=data.get('holiday_active', False),

            holiday_bonus=data.get('holiday_bonus', 5.00),

            cancellation_fee_active=data.get('cancellation_fee_active', False),

            cancellation_fee=data.get('cancellation_fee', 5.00)

        )

        db.session.add(config)

        db.session.commit()



        return jsonify({

            'message': 'Configuração criada com sucesso',

            'dynamic_pricing': config.to_dict()

        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_finance_bp.route('/dynamic-pricing/<int:config_id>', methods=['PUT'])

@jwt_required()

@admin_required

def update_dynamic_pricing(config_id):

    """Atualiza configuração de taxas adicionais"""

    try:

        config = DynamicPricing.query.get(config_id)

        if not config:

            return jsonify({'error': 'Configuração não encontrada'}), 404



        data = request.get_json()

        if not data:

            return jsonify({'error': 'Dados não fornecidos'}), 400



        if 'rainy_day_active' in data:

            config.rainy_day_active = data['rainy_day_active']

        if 'rainy_day_bonus' in data:

            config.rainy_day_bonus = data['rainy_day_bonus']

        if 'high_demand_active' in data:

            config.high_demand_active = data['high_demand_active']

        if 'high_demand_threshold' in data:

            config.high_demand_threshold = data['high_demand_threshold']

        if 'high_demand_bonus' in data:

            config.high_demand_bonus = data['high_demand_bonus']

        if 'holiday_active' in data:

            config.holiday_active = data['holiday_active']

        if 'holiday_bonus' in data:

            config.holiday_bonus = data['holiday_bonus']

        if 'cancellation_fee_active' in data:

            config.cancellation_fee_active = data['cancellation_fee_active']

        if 'cancellation_fee' in data:

            config.cancellation_fee = data['cancellation_fee']



        config.updated_at = datetime.now(timezone.utc)

        db.session.commit()



        return jsonify({

            'message': 'Configuração atualizada com sucesso',

            'dynamic_pricing': config.to_dict()

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_finance_bp.route('/dynamic-pricing/<int:config_id>', methods=['DELETE'])

@jwt_required()

@admin_required

def delete_dynamic_pricing(config_id):

    """Exclui configuração de taxas adicionais"""

    try:

        config = DynamicPricing.query.get(config_id)

        if not config:

            return jsonify({'error': 'Configuração não encontrada'}), 404



        db.session.delete(config)

        db.session.commit()



        return jsonify({'message': 'Configuração excluída com sucesso'}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_finance_bp.route('/tenant/logo', methods=['POST'])

@jwt_required()

@admin_required

def upload_tenant_logo():

    """Faz upload do logo do tenant"""

    try:



        import base64
        import os



        user = get_current_user()

        if not user or not user.tenant_id:

            return jsonify({'error': 'Usuário não pertence a nenhuma organização'}), 400



        tenant = Tenant.query.get(user.tenant_id)

        if not tenant:

            return jsonify({'error': 'Organização não encontrada'}), 404



        data = request.get_json()

        logo_data = data.get('logo_data')  # Base64 encoded image

        filename = data.get('filename', 'logo.png')



        if not logo_data:

            return jsonify({'error': 'Dados do logo são obrigatórios'}), 400



        # Criar diretório de uploads se não existir

        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'logos')

        os.makedirs(uploads_dir, exist_ok=True)



        # Salvar arquivo

        if ',' in logo_data:

            logo_data = logo_data.split(',')[1]



        filepath = os.path.join(uploads_dir, f"tenant_{tenant.id}_{filename}")

        with open(filepath, 'wb') as f:

            f.write(base64.b64decode(logo_data))



        # Atualizar URL do logo no tenant

        logo_url = f"/uploads/logos/tenant_{tenant.id}_{filename}"

        tenant.logo_url = logo_url

        tenant.updated_at = datetime.now(timezone.utc)

        db.session.commit()



        return jsonify({

            'message': 'Logo atualizado com sucesso',

            'logo_url': logo_url

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_finance_bp.route('/tenants', methods=['POST'])

@jwt_required()

@admin_required

def create_tenant():

    """Cria um novo tenant (organização)"""

    try:

        data = request.get_json()



        name = data.get('name')

        slug = data.get('slug')



        if not name or not slug:

            return jsonify({'error': 'Nome e slug são obrigatórios'}), 400



        # Verificar se slug já existe

        existing = Tenant.query.filter_by(slug=slug).first()

        if existing:

            return jsonify({'error': 'Slug já existe'}), 400



        tenant = Tenant(

            name=name,

            slug=slug,

            primary_color=data.get('primary_color', '#6366f1'),

            secondary_color=data.get('secondary_color', '#ffffff'),

            phone=data.get('phone'),

            email=data.get('email'),

            address=data.get('address'),

            cnpj=data.get('cnpj'),

            plan=data.get('plan', 'free'),

            max_deliveries_month=data.get('max_deliveries_month', 100),

            max_drivers=data.get('max_drivers', 2),

            max_clients=data.get('max_clients', 20),

            is_active=True

        )



        db.session.add(tenant)

        db.session.commit()



        return jsonify({

            'message': 'Tenant criado com sucesso',

            'tenant': tenant.to_dict()

        }), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_finance_bp.route('/tenants', methods=['GET'])

@jwt_required()

@admin_required

def list_tenants():

    """Lista todos os tenants"""

    try:

        tenants = Tenant.query.order_by(Tenant.name).all()

        return jsonify({'tenants': [t.to_dict() for t in tenants]}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





# ============================================

# GESTAO DE PRACAS (MULTI-CIDADE)

# ============================================



@admin_finance_bp.route('/squares', methods=['GET'])

@jwt_required()

@admin_required

def get_squares():

    """Lista todas as praças"""

    try:

        from src.models.portal_models import Square

        tenant_id = get_current_tenant_id()



        query = Square.query

        if tenant_id:

            query = query.filter(Square.tenant_id == tenant_id)

        squares = query.order_by(Square.name).all()



        squares_data = []

        for sq in squares:

            try:

                sq_dict = sq.to_dict()

                sq_dict['restaurants_count'] = Restaurant.query.filter_by(square_id=sq.id).count()

                sq_dict['drivers_count'] = Driver.query.filter_by(square_id=sq.id).count()

                sq_dict['orders_count'] = Order.query.join(Restaurant).filter(Restaurant.square_id == sq.id).count()

                squares_data.append(sq_dict)

            except Exception as e:

                # Se falhar ao processar uma praça, pula

                logger.error(f"Erro ao processar praça {sq.id}: {e}")

                continue



        return jsonify({'squares': squares_data}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





@admin_finance_bp.route('/squares', methods=['POST'])

@jwt_required()

@admin_required

def create_square():

    """Cria uma nova praça"""

    try:

        from src.models.portal_models import Square

        data = request.get_json()



        if not data.get('name') or not data.get('city') or not data.get('state'):

            return jsonify({'error': 'Nome, cidade e estado são obrigatórios'}), 400



        # Obter tenant_id do admin atual

        tenant_id = get_current_tenant_id()



        square = Square(

            name=data['name'],

            city=data['city'],

            state=data['state'],

            is_active=data.get('is_active', True),

            price_per_km=data.get('price_per_km', 2.95),

            min_distance_km=data.get('min_distance_km', 4.0),

            max_delivery_fee=data.get('max_delivery_fee', 50.00),

            driver_percentage=data.get('driver_percentage', 65.0),

            gamification_percentage=data.get('gamification_percentage', 5.0),

            tenant_id=tenant_id

        )

        db.session.add(square)

        db.session.commit()



        return jsonify({'message': 'Praça criada com sucesso', 'square': square.to_dict()}), 201

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_finance_bp.route('/squares/<int:square_id>', methods=['PUT'])

@jwt_required()

@admin_required

def update_square(square_id):

    """Atualiza uma praça"""

    try:

        from src.models.portal_models import Square

        square = Square.query.get(square_id)

        if not square:

            return jsonify({'error': 'Praça não encontrada'}), 404



        data = request.get_json()

        if data.get('name'):

            square.name = data['name']

        if data.get('city'):

            square.city = data['city']

        if data.get('state'):

            square.state = data['state']

        if 'is_active' in data:

            square.is_active = data['is_active']

        if data.get('price_per_km') is not None:

            square.price_per_km = data['price_per_km']

        if data.get('min_distance_km') is not None:

            square.min_distance_km = data['min_distance_km']

        if data.get('max_delivery_fee') is not None:

            square.max_delivery_fee = data['max_delivery_fee']

        if data.get('driver_percentage') is not None:

            square.driver_percentage = data['driver_percentage']

        if data.get('gamification_percentage') is not None:

            square.gamification_percentage = data['gamification_percentage']



        square.updated_at = datetime.now(timezone.utc)

        db.session.commit()



        return jsonify({'message': 'Praça atualizada com sucesso', 'square': square.to_dict()}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_finance_bp.route('/squares/<int:square_id>', methods=['DELETE'])

@jwt_required()

@admin_required

def delete_square(square_id):

    """Exclui uma praça"""

    try:

        from src.models.portal_models import Square

        square = Square.query.get(square_id)

        if not square:

            return jsonify({'error': 'Praça não encontrada'}), 404

        force = request.args.get('force', 'false').lower() == 'true'

        has_restaurants = Restaurant.query.filter_by(square_id=square_id).first()
        has_drivers = Driver.query.filter_by(square_id=square_id).first()

        if (has_restaurants or has_drivers) and not force:
            return jsonify({'error': 'Praça tem restaurantes/entregadores vinculados. Use ?force=true para desvincular e excluir'}), 400

        if force:
            Restaurant.query.filter_by(square_id=square_id).update({'square_id': None})
            Driver.query.filter_by(square_id=square_id).update({'square_id': None})

        db.session.delete(square)

        db.session.commit()



        return jsonify({'message': 'Praça excluída com sucesso'}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500


@admin_finance_bp.route('/squares/<int:square_id>/toggle-active', methods=['PUT'])

@jwt_required()

@admin_required

def toggle_square_active(square_id):

    """Ativa/desativa uma praça"""

    try:

        from src.models.portal_models import Square

        square = Square.query.get(square_id)

        if not square:

            return jsonify({'error': 'Praça não encontrada'}), 404

        data = request.get_json() or {}

        new_status = data.get('is_active')

        if new_status is None:

            new_status = not square.is_active

        square.is_active = bool(new_status)

        db.session.commit()

        return jsonify({

            'message': f'Praça {square.name} agora esta {"ativa" if square.is_active else "inativa"}',

            'is_active': square.is_active

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





# ============================================

# CONTROLE DE PAGAMENTOS AOS ENTREGADORES

# ============================================



@admin_finance_bp.route('/driver-payments', methods=['GET'])

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





@admin_finance_bp.route('/driver-payments/<int:driver_id>/pay', methods=['POST'])

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



@admin_finance_bp.route('/invoices/<int:restaurant_id>/generate', methods=['POST'])

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



@admin_finance_bp.route('/withdrawals', methods=['GET'])

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





@admin_finance_bp.route('/withdrawals/<int:withdrawal_id>/process', methods=['POST'])

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



@admin_finance_bp.route('/invoices', methods=['GET'])

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





@admin_finance_bp.route('/invoices/generate', methods=['POST'])

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





@admin_finance_bp.route('/invoices/<int:invoice_id>/pay', methods=['POST'])

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



@admin_finance_bp.route('/deleted-users', methods=['GET'])
@jwt_required()
@admin_required
def get_deleted_users():
    """Lista usuários excluídos (lixeira)"""
    try:
        tenant_id = get_current_tenant_id()
        user_type = request.args.get('user_type')
        days = request.args.get('days', type=int)

        # Buscar usuários excluídos (soft delete)
        query = User.query.filter(User.deleted_at.isnot(None))
        if tenant_id:
            query = query.filter(User.tenant_id == tenant_id)
        if user_type:
            # user_type é Enum — comparar com UserType
            from src.models.portal_models import UserType
            try:
                query = query.filter(User.user_type == UserType(user_type))
            except ValueError:
                query = query.filter(User.user_type == user_type)
        if days:
            cutoff = datetime.now(timezone.utc) - timedelta(days=days)
            query = query.filter(User.deleted_at >= cutoff)

        users = query.all()

        # Buscar nome de quem excluiu
        users_data = []
        for user in users:
            user_dict = user.to_dict(include_sensitive=True)
            if user.deleted_by:
                deleter = User.query.get(user.deleted_by)
                user_dict['deleted_by_name'] = f"{deleter.first_name} {deleter.last_name}" if deleter else 'Desconhecido'
            else:
                user_dict['deleted_by_name'] = 'Sistema'

            # Calcular dias desde exclusão (deleted_at pode ser naive)
            if user.deleted_at:
                deleted_at = user.deleted_at
                if deleted_at.tzinfo is None:
                    deleted_at = deleted_at.replace(tzinfo=timezone.utc)
                delta = datetime.now(timezone.utc) - deleted_at
                user_dict['days_deleted'] = delta.days

            users_data.append(user_dict)

        # Buscar configuração de retenção
        retention_config = SystemConfig.query.filter_by(config_key='retention_days').first()
        retention_days = int(retention_config.config_value) if retention_config else 90

        return jsonify({
            'users': users_data,
            'total': len(users_data),
            'config': {
                'retention_days': retention_days
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_finance_bp.route('/users/<int:user_id>/restore', methods=['POST'])
@jwt_required()
@admin_required
def restore_user(user_id):
    """Restaura um usuário excluído"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        if not user.deleted_at:
            return jsonify({'error': 'Usuário não está excluído'}), 400

        # Verificar tenant
        tenant_id = get_current_tenant_id()
        if tenant_id and user.tenant_id != tenant_id:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Restaurar
        user.deleted_at = None
        user.deleted_by = None
        db.session.commit()

        return jsonify({
            'message': 'Usuário restaurado com sucesso',
            'user': user.to_dict(include_sensitive=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_finance_bp.route('/users/<int:user_id>/permanent', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user_permanent(user_id):
    """Exclui um usuário permanentemente (ação irreversível)"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Verificar tenant
        tenant_id = get_current_tenant_id()
        if tenant_id and user.tenant_id != tenant_id:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Só permite excluir permanentemente se já estiver na lixeira
        if not user.deleted_at:
            return jsonify({'error': 'Usuário deve estar na lixeira antes de ser excluído permanentemente'}), 400

        # Excluir permanentemente
        db.session.delete(user)
        db.session.commit()

        return jsonify({'message': 'Usuário excluído permanentemente'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_finance_bp.route('/cleanup-deleted', methods=['POST'])
@jwt_required()
@admin_required
def cleanup_deleted_users():
    """Exclui permanentemente usuários selecionados da lixeira"""
    try:
        data = request.get_json()
        user_ids = data.get('user_ids', [])

        if not user_ids:
            return jsonify({'error': 'Nenhum usuário selecionado'}), 400

        # Verificar tenant
        tenant_id = get_current_tenant_id()

        deleted_count = 0
        for user_id in user_ids:
            user = User.query.get(user_id)
            if user and user.deleted_at:
                # Verificar tenant
                if tenant_id and user.tenant_id != tenant_id:
                    continue
                db.session.delete(user)
                deleted_count += 1

        db.session.commit()

        return jsonify({
            'message': f'{deleted_count} usuário(s) excluído(s) permanentemente',
            'deleted_count': deleted_count
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_finance_bp.route('/retention-config', methods=['GET'])
@jwt_required()
@admin_required
def get_retention_config():
    """Retorna configuração de retenção da lixeira"""
    try:
        config = SystemConfig.query.filter_by(config_key='retention_days').first()
        days = int(config.config_value) if config else 90

        return jsonify({'retention_days': days}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_finance_bp.route('/retention-config', methods=['PUT'])
@jwt_required()
@admin_required
def update_retention_config():
    """Atualiza configuração de retenção da lixeira"""
    try:
        data = request.get_json()
        days = data.get('retention_days', 90)

        if days not in [30, 60, 90]:
            return jsonify({'error': 'Valor inválido. Use 30, 60 ou 90'}), 400

        config = SystemConfig.query.filter_by(config_key='retention_days').first()
        if config:
            config.config_value = str(days)
        else:
            config = SystemConfig(config_key='retention_days', config_value=str(days))
            db.session.add(config)

        db.session.commit()

        return jsonify({'message': f'Retenção configurada para {days} dias'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================

# INTEGRAÇÃO ASAAS (Gateway de Pagamento)

# ============================================



@admin_finance_bp.route('/asaas/config', methods=['GET'])

@jwt_required()

@admin_required

def get_asaas_config():

    """Retorna configuração do Asaas (sem expor a API key)"""

    from src.models.portal_models import SystemConfig

    configs = SystemConfig.query.filter(

        SystemConfig.config_key.in_(['asaas_environment', 'asaas_webhook_token'])

    ).all()

    config = {c.config_key: c.config_value for c in configs}

    return jsonify({

        'configured': bool(config.get('asaas_environment')),

        'environment': config.get('asaas_environment', 'sandbox'),

        'webhook_token': config.get('asaas_webhook_token', ''),

    }), 200





@admin_finance_bp.route('/asaas/config', methods=['PUT'])

@jwt_required()

@admin_required

def update_asaas_config():

    """Atualiza configuração do Asaas"""

    from src.models.portal_models import SystemConfig

    data = request.get_json()

    if not data:

        return jsonify({'error': 'Dados não fornecidos'}), 400



    fields = ['asaas_api_key', 'asaas_environment', 'asaas_webhook_token']

    for field in fields:

        if field in data:

            config = SystemConfig.query.filter_by(config_key=field).first()

            if config:

                config.config_value = data[field]

                config.updated_at = datetime.now(timezone.utc)

            else:

                config = SystemConfig(config_key=field, config_value=data[field])

                db.session.add(config)



    db.session.commit()

    return jsonify({'message': 'Configuração Asaas atualizada'}), 200





@admin_finance_bp.route('/asaas/test', methods=['POST'])

@jwt_required()

@admin_required

def test_asaas_connection():

    """Testa a conexão com o Asaas"""

    import requests as req

    from src.services.asaas_service import get_base_url, get_headers, is_configured



    if not is_configured():

        return jsonify({'success': False, 'error': 'Asaas não configurado'}), 400



    try:

        response = req.get(f"{get_base_url()}/customers?limit=1", headers=get_headers(), timeout=10)

        if response.status_code == 200:

            return jsonify({'success': True, 'message': 'Conexão com Asaas OK'}), 200

        return jsonify({'success': False, 'error': f'Erro HTTP {response.status_code}'}), 400

    except Exception as e:

        return jsonify({'success': False, 'error': str(e)}), 400





@admin_finance_bp.route('/invoices/generate-auto', methods=['POST'])

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





@admin_finance_bp.route('/invoices/<int:invoice_id>/charge', methods=['POST'])

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





@admin_finance_bp.route('/invoices/<int:invoice_id>/send-link', methods=['POST'])

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





@admin_finance_bp.route('/withdrawals/<int:withdrawal_id>/process-auto', methods=['POST'])

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
