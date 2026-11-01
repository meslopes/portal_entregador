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
    SystemConfig,
    Tenant,
    User,
    db,
)
from src.utils.auth import admin_required
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





