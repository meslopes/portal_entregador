from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.portal_models import (
    User, Driver, Order, Restaurant, Customer, Address, Payment, Delivery,
    UserType, OrderStatus, PaymentStatus, db
)
from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_

admin_bp = Blueprint('admin', __name__)

def admin_required(f):
    """Decorator para verificar se o usuário é admin"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type != UserType.ADMIN:
            return jsonify({'error': 'Acesso restrito a administradores'}), 403
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@admin_required
def get_dashboard():
    """Obtém dados do dashboard administrativo"""
    try:
        # Estatísticas gerais
        total_drivers = Driver.query.count()
        online_drivers = Driver.query.filter_by(is_online=True).count()
        total_orders = Order.query.count()
        
        # Pedidos por status
        orders_by_status = db.session.query(
            Order.status, func.count(Order.id)
        ).group_by(Order.status).all()
        
        # Estatísticas do dia atual
        today = datetime.utcnow().date()
        today_orders = Order.query.filter(func.date(Order.created_at) == today).count()
        today_deliveries = Order.query.filter(
            func.date(Order.delivery_time) == today,
            Order.status == OrderStatus.DELIVERED
        ).count()
        
        # Receita do dia
        today_revenue = db.session.query(func.sum(Order.total_amount)).filter(
            func.date(Order.created_at) == today,
            Order.status == OrderStatus.DELIVERED
        ).scalar() or 0
        
        # Entregadores mais ativos (últimos 7 dias)
        week_ago = datetime.utcnow() - timedelta(days=7)
        top_drivers = db.session.query(
            Driver.id,
            User.first_name,
            User.last_name,
            func.count(Order.id).label('deliveries')
        ).join(User).join(Order).filter(
            Order.created_at >= week_ago,
            Order.status == OrderStatus.DELIVERED
        ).group_by(Driver.id, User.first_name, User.last_name).order_by(
            func.count(Order.id).desc()
        ).limit(5).all()
        
        return jsonify({
            'total_drivers': total_drivers,
            'online_drivers': online_drivers,
            'total_orders': total_orders,
            'today_orders': today_orders,
            'today_deliveries': today_deliveries,
            'today_revenue': float(today_revenue),
            'orders_by_status': {status.value: count for status, count in orders_by_status},
            'top_drivers': [
                {
                    'id': driver_id,
                    'name': f"{first_name} {last_name}",
                    'deliveries': deliveries
                }
                for driver_id, first_name, last_name, deliveries in top_drivers
            ]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/drivers', methods=['GET'])
@jwt_required()
@admin_required
def get_drivers():
    """Lista todos os entregadores"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        status_filter = request.args.get('status')  # online, offline, all
        
        query = Driver.query.join(User)
        
        # Filtro de busca
        if search:
            query = query.filter(or_(
                User.first_name.ilike(f'%{search}%'),
                User.last_name.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%'),
                User.phone.ilike(f'%{search}%')
            ))
        
        # Filtro de status
        if status_filter == 'online':
            query = query.filter(Driver.is_online == True)
        elif status_filter == 'offline':
            query = query.filter(Driver.is_online == False)
        
        drivers = query.order_by(User.first_name).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        drivers_data = []
        for driver in drivers.items:
            driver_dict = driver.to_dict()
            driver_dict['user'] = driver.user.to_dict()
            
            # Estatísticas do entregador
            total_earnings = db.session.query(func.sum(Payment.amount)).filter_by(
                driver_id=driver.id
            ).scalar() or 0
            
            driver_dict['total_earnings'] = float(total_earnings)
            drivers_data.append(driver_dict)
        
        return jsonify({
            'drivers': drivers_data,
            'total': drivers.total,
            'pages': drivers.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/drivers/<int:driver_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_driver_details(driver_id):
    """Obtém detalhes de um entregador específico"""
    try:
        driver = Driver.query.get(driver_id)
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404
        
        driver_dict = driver.to_dict()
        driver_dict['user'] = driver.user.to_dict()
        
        # Estatísticas detalhadas
        total_earnings = db.session.query(func.sum(Payment.amount)).filter_by(
            driver_id=driver.id
        ).scalar() or 0
        
        avg_rating = db.session.query(func.avg(Delivery.customer_rating)).filter_by(
            driver_id=driver.id
        ).scalar() or 5.0
        
        # Entregas dos últimos 30 dias
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_deliveries = Order.query.filter(
            Order.driver_id == driver.id,
            Order.status == OrderStatus.DELIVERED,
            Order.delivery_time >= thirty_days_ago
        ).count()
        
        driver_dict['statistics'] = {
            'total_earnings': float(total_earnings),
            'average_rating': float(avg_rating),
            'recent_deliveries': recent_deliveries
        }
        
        return jsonify(driver_dict), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/drivers/<int:driver_id>/status', methods=['PUT'])
@jwt_required()
@admin_required
def update_driver_status(driver_id):
    """Atualiza o status de um entregador (ativar/desativar)"""
    try:
        driver = Driver.query.get(driver_id)
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404
        
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['ACTIVE', 'INACTIVE', 'SUSPENDED']:
            return jsonify({'error': 'Status inválido'}), 400
        
        from src.models.portal_models import UserStatus
        driver.user.status = UserStatus(new_status)
        driver.user.updated_at = datetime.utcnow()
        
        # Se suspender, colocar offline
        if new_status in ['INACTIVE', 'SUSPENDED']:
            driver.is_online = False
            driver.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': f'Status do entregador atualizado para {new_status}',
            'driver': driver.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/orders', methods=['GET'])
@jwt_required()
@admin_required
def get_all_orders():
    """Lista todos os pedidos"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status_filter = request.args.get('status')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        query = Order.query
        
        # Filtros
        if status_filter:
            try:
                status_enum = OrderStatus(status_filter)
                query = query.filter(Order.status == status_enum)
            except ValueError:
                pass
        
        if date_from:
            query = query.filter(Order.created_at >= datetime.strptime(date_from, '%Y-%m-%d'))
        
        if date_to:
            query = query.filter(Order.created_at <= datetime.strptime(date_to, '%Y-%m-%d'))
        
        orders = query.order_by(Order.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        orders_data = []
        for order in orders.items:
            order_dict = order.to_dict()
            order_dict['restaurant'] = order.restaurant.to_dict()
            order_dict['customer'] = order.customer.to_dict()
            order_dict['delivery_address'] = order.delivery_address.to_dict()
            
            if order.driver:
                order_dict['driver'] = {
                    'id': order.driver.id,
                    'name': f"{order.driver.user.first_name} {order.driver.user.last_name}",
                    'phone': order.driver.user.phone
                }
            
            orders_data.append(order_dict)
        
        return jsonify({
            'orders': orders_data,
            'total': orders.total,
            'pages': orders.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/orders/<int:order_id>/assign', methods=['POST'])
@jwt_required()
@admin_required
def assign_order_to_driver(order_id):
    """Atribui um pedido manualmente a um entregador"""
    try:
        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404
        
        if order.status != OrderStatus.PENDING:
            return jsonify({'error': 'Pedido não está pendente'}), 400
        
        data = request.get_json()
        driver_id = data.get('driver_id')
        
        driver = Driver.query.get(driver_id)
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404
        
        if not driver.is_online:
            return jsonify({'error': 'Entregador não está online'}), 400
        
        # Atribui o pedido
        order.driver_id = driver.id
        order.status = OrderStatus.ACCEPTED
        order.updated_at = datetime.utcnow()
        
        # Cria registro de entrega
        delivery = Delivery(
            order_id=order.id,
            driver_id=driver.id,
            pickup_latitude=order.restaurant.latitude,
            pickup_longitude=order.restaurant.longitude,
            delivery_latitude=order.delivery_address.latitude,
            delivery_longitude=order.delivery_address.longitude
        )
        
        # Calcula ganhos
        base_earning = float(order.delivery_fee) * 0.7
        delivery.driver_earnings = base_earning
        
        db.session.add(delivery)
        db.session.commit()
        
        return jsonify({
            'message': 'Pedido atribuído com sucesso',
            'order': order.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/reports/earnings', methods=['GET'])
@jwt_required()
@admin_required
def get_earnings_report():
    """Relatório de ganhos"""
    try:
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        query = db.session.query(
            func.date(Payment.created_at).label('date'),
            func.sum(Payment.amount).label('total_amount'),
            func.count(Payment.id).label('payment_count')
        ).filter(Payment.status == PaymentStatus.PROCESSED)
        
        if date_from:
            query = query.filter(Payment.created_at >= datetime.strptime(date_from, '%Y-%m-%d'))
        
        if date_to:
            query = query.filter(Payment.created_at <= datetime.strptime(date_to, '%Y-%m-%d'))
        
        results = query.group_by(func.date(Payment.created_at)).order_by(
            func.date(Payment.created_at).desc()
        ).all()
        
        report_data = [
            {
                'date': result.date.isoformat(),
                'total_amount': float(result.total_amount),
                'payment_count': result.payment_count
            }
            for result in results
        ]
        
        # Total geral
        total_amount = sum(item['total_amount'] for item in report_data)
        total_payments = sum(item['payment_count'] for item in report_data)
        
        return jsonify({
            'daily_earnings': report_data,
            'summary': {
                'total_amount': total_amount,
                'total_payments': total_payments,
                'average_per_day': total_amount / len(report_data) if report_data else 0
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/live-tracking', methods=['GET'])
@jwt_required()
@admin_required
def get_live_tracking():
    """Obtém localização em tempo real de todos os entregadores online"""
    try:
        online_drivers = Driver.query.filter(
            Driver.is_online == True,
            Driver.current_latitude.isnot(None),
            Driver.current_longitude.isnot(None)
        ).join(User).all()
        
        tracking_data = []
        for driver in online_drivers:
            # Busca pedido atual
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
                'driver_id': driver.id,
                'name': f"{driver.user.first_name} {driver.user.last_name}",
                'latitude': float(driver.current_latitude),
                'longitude': float(driver.current_longitude),
                'last_update': driver.last_location_update.isoformat() if driver.last_location_update else None,
                'vehicle_type': driver.vehicle_type.value,
                'current_order': current_order.to_dict() if current_order else None
            }
            
            tracking_data.append(driver_data)
        
        return jsonify({
            'drivers': tracking_data,
            'count': len(tracking_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# GESTÃO DE CLIENTES
# ============================================

@admin_bp.route('/customers', methods=['GET'])
@jwt_required()
@admin_required
def get_customers():
    """Lista todos os clientes"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')

        query = Customer.query

        if search:
            query = query.filter(or_(
                Customer.name.ilike(f'%{search}%'),
                Customer.email.ilike(f'%{search}%'),
                Customer.phone.ilike(f'%{search}%')
            ))

        customers = query.order_by(Customer.name).paginate(
            page=page, per_page=per_page, error_out=False
        )

        customers_data = []
        for customer in customers.items:
            customer_dict = customer.to_dict()

            # Contagem de pedidos
            total_orders = Order.query.filter_by(customer_id=customer.id).count()
            total_spent = db.session.query(func.sum(Order.total_amount)).filter_by(
                customer_id=customer.id
            ).scalar() or 0

            customer_dict['total_orders'] = total_orders
            customer_dict['total_spent'] = float(total_spent)
            customer_dict['addresses_count'] = len(customer.addresses)
            customers_data.append(customer_dict)

        return jsonify({
            'customers': customers_data,
            'total': customers.total,
            'pages': customers.pages,
            'current_page': page,
            'per_page': per_page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/customers/<int:customer_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_customer_details(customer_id):
    """Obtém detalhes de um cliente específico"""
    try:
        customer = Customer.query.get(customer_id)
        if not customer:
            return jsonify({'error': 'Cliente não encontrado'}), 404

        customer_dict = customer.to_dict()

        # Estatísticas
        total_orders = Order.query.filter_by(customer_id=customer.id).count()
        total_spent = db.session.query(func.sum(Order.total_amount)).filter_by(
            customer_id=customer.id
        ).scalar() or 0

        # Últimos pedidos
        recent_orders = Order.query.filter_by(customer_id=customer.id).order_by(
            Order.created_at.desc()
        ).limit(10).all()

        customer_dict['total_orders'] = total_orders
        customer_dict['total_spent'] = float(total_spent)
        customer_dict['addresses'] = [addr.to_dict() for addr in customer.addresses]
        customer_dict['recent_orders'] = [order.to_dict() for order in recent_orders]

        return jsonify(customer_dict), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/customers', methods=['POST'])
@jwt_required()
@admin_required
def create_customer():
    """Cria um novo cliente"""
    try:
        data = request.get_json()

        if not data.get('name') or not data.get('phone'):
            return jsonify({'error': 'Nome e telefone são obrigatórios'}), 400

        # Verificar se telefone já existe
        existing = Customer.query.filter_by(phone=data['phone']).first()
        if existing:
            return jsonify({'error': 'Telefone já cadastrado'}), 400

        customer = Customer(
            name=data['name'],
            phone=data['phone'],
            email=data.get('email', ''),
        )

        db.session.add(customer)

        # Criar endereço se fornecido
        if data.get('address'):
            addr = data['address']
            address = Address(
                customer=customer,
                street=addr.get('street', ''),
                complement=addr.get('complement', ''),
                neighborhood=addr.get('neighborhood', ''),
                city=addr.get('city', ''),
                state=addr.get('state', ''),
                zip_code=addr.get('zip_code', ''),
                latitude=addr.get('latitude'),
                longitude=addr.get('longitude'),
                is_default=True
            )
            db.session.add(address)

        db.session.commit()

        return jsonify({
            'message': 'Cliente criado com sucesso',
            'customer': customer.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/customers/<int:customer_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_customer(customer_id):
    """Atualiza um cliente"""
    try:
        customer = Customer.query.get(customer_id)
        if not customer:
            return jsonify({'error': 'Cliente não encontrado'}), 404

        data = request.get_json()

        if data.get('name'):
            customer.name = data['name']
        if data.get('phone'):
            # Verificar se telefone já existe em outro cliente
            existing = Customer.query.filter(
                Customer.phone == data['phone'],
                Customer.id != customer_id
            ).first()
            if existing:
                return jsonify({'error': 'Telefone já cadastrado'}), 400
            customer.phone = data['phone']
        if 'email' in data:
            customer.email = data['email']

        customer.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Cliente atualizado com sucesso',
            'customer': customer.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/customers/<int:customer_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_customer(customer_id):
    """Exclui um cliente"""
    try:
        customer = Customer.query.get(customer_id)
        if not customer:
            return jsonify({'error': 'Cliente não encontrado'}), 404

        # Verificar se tem pedidos
        has_orders = Order.query.filter_by(customer_id=customer_id).first()
        if has_orders:
            return jsonify({'error': 'Não é possível excluir cliente com pedidos vinculados'}), 400

        db.session.delete(customer)
        db.session.commit()

        return jsonify({'message': 'Cliente excluído com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

