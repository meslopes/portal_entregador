from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.portal_models import (
    User, Driver, Order, Restaurant, Customer, Payment, Delivery,
    UserType, UserStatus, OrderStatus, PaymentStatus, db
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


# ============================================
# APROVACAO DE CADASTROS
# ============================================

@admin_bp.route('/pending-users', methods=['GET'])
@jwt_required()
@admin_required
def get_pending_users():
    """Lista usuarios pendentes de aprovacao"""
    try:
        pending = User.query.filter_by(status=UserStatus.INACTIVE).all()
        users_data = []
        for user in pending:
            user_dict = user.to_dict()
            if user.user_type == UserType.DRIVER:
                driver = Driver.query.filter_by(user_id=user.id).first()
                if driver:
                    user_dict['driver'] = driver.to_dict()
            elif user.user_type == UserType.CLIENT:
                customer = Customer.query.filter_by(user_id=user.id).first()
                if customer:
                    user_dict['customer'] = customer.to_dict()
            users_data.append(user_dict)

        return jsonify({'users': users_data, 'count': len(users_data)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/users/<int:user_id>/approve', methods=['POST'])
@jwt_required()
@admin_required
def approve_user(user_id):
    """Aprova o cadastro de um usuario"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        if user.status != UserStatus.INACTIVE:
            return jsonify({'error': 'Usuário não está pendente'}), 400

        user.status = UserStatus.ACTIVE
        user.updated_at = datetime.utcnow()
        db.session.commit()

        # Notifica o usuario
        try:
            from src.services.whatsapp import whatsapp_service
            if whatsapp_service.is_configured() and user.phone:
                whatsapp_service.send_message(
                    user.phone,
                    f"✅ *Conta Aprovada!*\n\n"
                    f"Olá {user.first_name}, sua conta no muv.log foi aprovada!\n"
                    f"Agora você pode fazer login e acessar o sistema."
                )
        except Exception:
            pass

        return jsonify({'message': 'Usuário aprovado com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/users/<int:user_id>/reject', methods=['POST'])
@jwt_required()
@admin_required
def reject_user(user_id):
    """Rejeita o cadastro de um usuario"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        if user.status != UserStatus.INACTIVE:
            return jsonify({'error': 'Usuário não está pendente'}), 400

        # Notifica o usuario antes de excluir
        try:
            from src.services.whatsapp import whatsapp_service
            if whatsapp_service.is_configured() and user.phone:
                whatsapp_service.send_message(
                    user.phone,
                    f"❌ *Cadastro Rejeitado*\n\n"
                    f"Olá {user.first_name}, seu cadastro no muv.log não foi aprovado.\n"
                    f"Entre em contato com o suporte para mais informações."
                )
        except Exception:
            pass

        # Exclui o usuario
        user_type = user.user_type
        if user_type == UserType.DRIVER:
            driver = Driver.query.filter_by(user_id=user.id).first()
            if driver:
                db.session.delete(driver)
        elif user_type == UserType.CLIENT:
            customer = Customer.query.filter_by(user_id=user.id).first()
            if customer:
                db.session.delete(customer)

        db.session.delete(user)
        db.session.commit()

        return jsonify({'message': 'Usuário rejeitado e excluído'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# GESTAO DE USUARIOS (ADMIN/ENTREGADOR/ESTABELECIMENTO)
# ============================================

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@admin_required
def get_all_users():
    """Lista todos os usuarios do sistema"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        user_type = request.args.get('type')
        search = request.args.get('search', '')

        query = User.query

        if user_type:
            try:
                query = query.filter_by(user_type=UserType(user_type))
            except ValueError:
                pass

        if search:
            query = query.filter(or_(
                User.first_name.ilike(f'%{search}%'),
                User.last_name.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%'),
                User.phone.ilike(f'%{search}%')
            ))

        users = query.order_by(User.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        users_data = []
        for user in users.items:
            user_dict = user.to_dict()
            if user.user_type == UserType.DRIVER:
                driver = Driver.query.filter_by(user_id=user.id).first()
                if driver:
                    user_dict['driver'] = driver.to_dict()
            elif user.user_type == UserType.CLIENT:
                customer = Customer.query.filter_by(user_id=user.id).first()
                if customer:
                    user_dict['customer'] = customer.to_dict()
            users_data.append(user_dict)

        return jsonify({
            'users': users_data,
            'total': users.total,
            'pages': users.pages,
            'current_page': page
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_user_details(user_id):
    """Obtem detalhes de um usuario"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        user_dict = user.to_dict()
        if user.user_type == UserType.DRIVER:
            driver = Driver.query.filter_by(user_id=user.id).first()
            if driver:
                user_dict['driver'] = driver.to_dict()
        elif user.user_type == UserType.CLIENT:
            customer = Customer.query.filter_by(user_id=user.id).first()
            if customer:
                user_dict['customer'] = customer.to_dict()

        return jsonify(user_dict), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_user(user_id):
    """Atualiza dados de um usuario"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        data = request.get_json()

        if data.get('first_name'):
            user.first_name = data['first_name']
        if data.get('last_name'):
            user.last_name = data['last_name']
        if data.get('phone'):
            user.phone = data['phone']
        if data.get('email'):
            # Verifica se email ja existe
            existing = User.query.filter(User.email == data['email'], User.id != user_id).first()
            if existing:
                return jsonify({'error': 'Email já cadastrado'}), 400
            user.email = data['email']
        if data.get('status'):
            try:
                user.status = UserStatus(data['status'])
            except ValueError:
                return jsonify({'error': 'Status inválido'}), 400

        # Atualiza dados especificos do tipo
        if user.user_type == UserType.DRIVER:
            driver = Driver.query.filter_by(user_id=user.id).first()
            if driver:
                if data.get('vehicle_type'):
                    try:
                        from src.models.portal_models import VehicleType
                        driver.vehicle_type = VehicleType(data['vehicle_type'])
                    except ValueError:
                        pass
                if data.get('vehicle_plate'):
                    driver.vehicle_plate = data['vehicle_plate']
                if data.get('vehicle_model'):
                    driver.vehicle_model = data['vehicle_model']
                if data.get('vehicle_year'):
                    driver.vehicle_year = data['vehicle_year']
                if data.get('pix_key'):
                    driver.pix_key = data['pix_key']
                if data.get('max_concurrent_orders'):
                    driver.max_concurrent_orders = data['max_concurrent_orders']

        user.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'message': 'Usuário atualizado com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user(user_id):
    """Exclui um usuario"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Nao permite excluir a si mesmo
        current_user_id = int(get_jwt_identity())
        if user_id == current_user_id:
            return jsonify({'error': 'Não é possível excluir sua própria conta'}), 400

        # Nao permite excluir o admin padrao
        if user.user_type == UserType.ADMIN:
            admin_count = User.query.filter_by(user_type=UserType.ADMIN).count()
            if admin_count <= 1:
                return jsonify({'error': 'Não é possível excluir o último admin'}), 400

        # Exclui dados especificos do tipo
        if user.user_type == UserType.DRIVER:
            driver = Driver.query.filter_by(user_id=user.id).first()
            if driver:
                # Verifica se tem pedidos
                has_orders = Order.query.filter_by(driver_id=driver.id).first()
                if has_orders:
                    return jsonify({'error': 'Não é possível excluir entregador com pedidos vinculados'}), 400
                db.session.delete(driver)
        elif user.user_type == UserType.CLIENT:
            customer = Customer.query.filter_by(user_id=user.id).first()
            if customer:
                has_orders = Order.query.filter_by(customer_id=customer.id).first()
                if has_orders:
                    return jsonify({'error': 'Não é possível excluir estabelecimento com pedidos vinculados'}), 400
                db.session.delete(customer)

        # Exclui notificacoes
        Notification.query.filter_by(user_id=user.id).delete()

        db.session.delete(user)
        db.session.commit()

        return jsonify({'message': 'Usuário excluído com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/create-admin', methods=['POST'])
@jwt_required()
@admin_required
def create_admin_user():
    """Cria um novo admin (pelo admin existente)"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password', 'admin123')
        first_name = data.get('first_name', 'Admin')
        last_name = data.get('last_name', '')

        if not email:
            return jsonify({'error': 'Email é obrigatório'}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email já cadastrado'}), 400

        import uuid
        unique_cpf = f"ADMIN{uuid.uuid4().hex[:8].upper()}"
        unique_phone = f"119{uuid.uuid4().hex[:8]}"

        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=unique_phone,
            cpf=unique_cpf,
            user_type=UserType.ADMIN,
            status=UserStatus.ACTIVE
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        return jsonify({
            'message': 'Admin criado com sucesso',
            'user': {
                'id': user.id,
                'email': email,
                'password': password,
                'name': f"{first_name} {last_name}"
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


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

@admin_bp.route('/drivers', methods=['POST'])
@jwt_required()
@admin_required
def create_driver():
    """Cria um novo entregador"""
    try:
        data = request.get_json()

        email = data.get('email')
        password = data.get('password', '123456')
        first_name = data.get('first_name')
        last_name = data.get('last_name')

        if not email or not first_name or not last_name:
            return jsonify({'error': 'Email, nome e sobrenome são obrigatórios'}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email já cadastrado'}), 400

        # Cria usuario
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=data.get('phone'),
            cpf=data.get('cpf'),
            user_type=UserType.DRIVER,
            status=UserStatus.ACTIVE
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        # Cria perfil de entregador
        vehicle_type_str = data.get('vehicle_type', 'MOTORCYCLE')
        try:
            vehicle_type = VehicleType(vehicle_type_str)
        except ValueError:
            vehicle_type = VehicleType.MOTORCYCLE

        driver = Driver(
            user_id=user.id,
            driver_license=data.get('driver_license'),
            vehicle_type=vehicle_type,
            vehicle_plate=data.get('vehicle_plate'),
            vehicle_model=data.get('vehicle_model'),
            vehicle_year=data.get('vehicle_year'),
            bank_account=data.get('bank_account'),
            pix_key=data.get('pix_key'),
            square_id=data.get('square_id'),
            max_concurrent_orders=data.get('max_concurrent_orders', 3)
        )

        db.session.add(driver)
        db.session.commit()

        return jsonify({
            'message': 'Entregador criado com sucesso',
            'driver': {
                'id': driver.id,
                'user_id': user.id,
                'email': email,
                'password': password,
                'name': f"{first_name} {last_name}"
            }
        }), 201

    except Exception as e:
        db.session.rollback()
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


# ============================================
# DASHBOARD FINANCEIRO
# ============================================

@admin_bp.route('/finance', methods=['GET'])
@jwt_required()
@admin_required
def get_finance_dashboard():
    """Dashboard financeiro completo"""
    try:
        period = request.args.get('period', 'month')  # today, week, month, year

        # Define data de inicio baseado no periodo
        now = datetime.utcnow()
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
        revenue_result = db.session.query(
            func.sum(Order.total_amount)
        ).filter(
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= start_date
        ).scalar() or 0

        # Total de pedidos no periodo
        total_orders = Order.query.filter(
            Order.created_at >= start_date
        ).count()

        # Pedidos entregues no periodo
        delivered_orders = Order.query.filter(
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= start_date
        ).count()

        # Pedidos pendentes
        pending_orders = Order.query.filter(
            Order.status == OrderStatus.PENDING
        ).count()

        # Ganhos dos entregadores no periodo (pagamentos processados)
        driver_payments = db.session.query(
            func.sum(Payment.amount)
        ).filter(
            Payment.status == PaymentStatus.PROCESSED,
            Payment.created_at >= start_date
        ).scalar() or 0

        # Ganhos pendentes de processamento
        pending_payments = db.session.query(
            func.sum(Payment.amount)
        ).filter(
            Payment.status == PaymentStatus.PENDING
        ).scalar() or 0

        # Ticket medio
        avg_order_value = float(revenue_result) / delivered_orders if delivered_orders > 0 else 0

        # Frete total cobrado
        total_delivery_fees = db.session.query(
            func.sum(Order.delivery_fee)
        ).filter(
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= start_date
        ).scalar() or 0

        # Receita por estabelecimento (top 10)
        revenue_by_establishment = db.session.query(
            Restaurant.name,
            func.sum(Order.total_amount).label('revenue'),
            func.count(Order.id).label('order_count')
        ).join(Order).filter(
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= start_date
        ).group_by(Restaurant.name).order_by(
            func.sum(Order.total_amount).desc()
        ).limit(10).all()

        # Receita diária (últimos 30 dias para gráfico)
        daily_revenue = db.session.query(
            func.date(Order.created_at).label('date'),
            func.sum(Order.total_amount).label('revenue'),
            func.count(Order.id).label('orders')
        ).filter(
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= now - timedelta(days=30)
        ).group_by(func.date(Order.created_at)).order_by(
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


@admin_bp.route('/finance/establishments', methods=['GET'])
@jwt_required()
@admin_required
def get_finance_by_establishment():
    """Financeiro por estabelecimento"""
    try:
        period = request.args.get('period', 'month')
        now = datetime.utcnow()

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

        establishments = db.session.query(
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
        )).group_by(Restaurant.id, Restaurant.name, Restaurant.phone).order_by(
            func.sum(Order.total_amount).desc()
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
# GESTÃO DE ESTABELECIMENTOS
# ============================================

@admin_bp.route('/establishments', methods=['GET'])
@jwt_required()
@admin_required
def get_establishments():
    """Lista todos os estabelecimentos"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')

        query = Restaurant.query

        if search:
            query = query.filter(or_(
                Restaurant.name.ilike(f'%{search}%'),
                Restaurant.address.ilike(f'%{search}%'),
                Restaurant.cnpj.ilike(f'%{search}%'),
                Restaurant.phone.ilike(f'%{search}%')
            ))

        establishments = query.order_by(Restaurant.name).paginate(
            page=page, per_page=per_page, error_out=False
        )

        establishments_data = []
        for est in establishments.items:
            est_dict = est.to_dict()

            # Estatísticas do estabelecimento
            total_orders = Order.query.filter_by(restaurant_id=est.id).count()
            total_revenue = db.session.query(func.sum(Order.total_amount)).filter_by(
                restaurant_id=est.id
            ).scalar() or 0

            # Pedidos esta semana
            week_ago = datetime.utcnow() - timedelta(days=7)
            week_orders = Order.query.filter(
                Order.restaurant_id == est.id,
                Order.created_at >= week_ago
            ).count()

            # Pedidos hoje
            today = datetime.utcnow().date()
            today_orders = Order.query.filter(
                Order.restaurant_id == est.id,
                func.date(Order.created_at) == today
            ).count()

            # Ranking (baseado em total de pedidos)
            est_dict['total_orders'] = total_orders
            est_dict['total_revenue'] = float(total_revenue)
            est_dict['week_orders'] = week_orders
            est_dict['today_orders'] = today_orders
            establishments_data.append(est_dict)

        return jsonify({
            'establishments': establishments_data,
            'total': establishments.total,
            'pages': establishments.pages,
            'current_page': page,
            'per_page': per_page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/establishments/<int:establishment_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_establishment_details(establishment_id):
    """Obtém detalhes de um estabelecimento"""
    try:
        est = Restaurant.query.get(establishment_id)
        if not est:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        est_dict = est.to_dict()

        # Estatísticas
        total_orders = Order.query.filter_by(restaurant_id=est.id).count()
        total_revenue = db.session.query(func.sum(Order.total_amount)).filter_by(
            restaurant_id=est.id
        ).scalar() or 0

        # Pedidos por status
        orders_by_status = db.session.query(
            Order.status, func.count(Order.id)
        ).filter_by(restaurant_id=est.id).group_by(Order.status).all()

        # Últimos pedidos
        recent_orders = Order.query.filter_by(restaurant_id=est.id).order_by(
            Order.created_at.desc()
        ).limit(10).all()

        est_dict['total_orders'] = total_orders
        est_dict['total_revenue'] = float(total_revenue)
        est_dict['orders_by_status'] = {status.value: count for status, count in orders_by_status}
        est_dict['recent_orders'] = [order.to_dict() for order in recent_orders]

        return jsonify(est_dict), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/establishments', methods=['POST'])
@jwt_required()
@admin_required
def create_establishment():
    """Cria um novo estabelecimento com usuario de login"""
    try:
        data = request.get_json()

        if not data.get('name') or not data.get('address'):
            return jsonify({'error': 'Nome e endereço são obrigatórios'}), 400

        # Verificar CNPJ se fornecido
        if data.get('cnpj'):
            existing = Restaurant.query.filter_by(cnpj=data['cnpj']).first()
            if existing:
                return jsonify({'error': 'CNPJ já cadastrado'}), 400

        # Cria usuario CLIENT para login
        user = None
        email = data.get('email')
        password = data.get('password', '123456')  # Senha padrao

        if email:
            if User.query.filter_by(email=email).first():
                return jsonify({'error': 'Email já cadastrado'}), 400

            user = User(
                email=email,
                first_name=data.get('first_name', data['name']),
                last_name=data.get('last_name', ''),
                phone=data.get('phone'),
                user_type=UserType.CLIENT,
                status=UserStatus.ACTIVE
            )
            user.set_password(password)
            db.session.add(user)
            db.session.flush()

        establishment = Restaurant(
            name=data['name'],
            cnpj=data.get('cnpj'),
            phone=data.get('phone'),
            email=email,
            address=data['address'],
            latitude=data.get('latitude', -29.95),
            longitude=data.get('longitude', -50.45),
            opening_hours=data.get('opening_hours'),
            is_active=data.get('is_active', True),
            square_id=data.get('square_id'),
            bank_name=data.get('bank_name'),
            bank_agency=data.get('bank_agency'),
            bank_account=data.get('bank_account'),
            bank_pix_key=data.get('bank_pix_key')
        )

        db.session.add(establishment)
        db.session.commit()

        result = establishment.to_dict()
        if user:
            result['login_email'] = email
            result['login_password'] = password

        return jsonify({
            'message': 'Estabelecimento criado com sucesso',
            'establishment': result
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/establishments/<int:establishment_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_establishment(establishment_id):
    """Atualiza um estabelecimento"""
    try:
        est = Restaurant.query.get(establishment_id)
        if not est:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        data = request.get_json()

        if data.get('name'):
            est.name = data['name']
        if data.get('cnpj'):
            existing = Restaurant.query.filter(
                Restaurant.cnpj == data['cnpj'],
                Restaurant.id != establishment_id
            ).first()
            if existing:
                return jsonify({'error': 'CNPJ já cadastrado'}), 400
            est.cnpj = data['cnpj']
        if 'phone' in data:
            est.phone = data['phone']
        if 'email' in data:
            est.email = data['email']
        if data.get('address'):
            est.address = data['address']
        if data.get('latitude') is not None:
            est.latitude = data['latitude']
        if data.get('longitude') is not None:
            est.longitude = data['longitude']
        if 'opening_hours' in data:
            est.opening_hours = data['opening_hours']
        if 'is_active' in data:
            est.is_active = data['is_active']

        est.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Estabelecimento atualizado com sucesso',
            'establishment': est.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/establishments/<int:establishment_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_establishment(establishment_id):
    """Exclui um estabelecimento"""
    try:
        est = Restaurant.query.get(establishment_id)
        if not est:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        # Verificar se tem pedidos
        has_orders = Order.query.filter_by(restaurant_id=establishment_id).first()
        if has_orders:
            return jsonify({'error': 'Não é possível excluir estabelecimento com pedidos vinculados'}), 400

        db.session.delete(est)
        db.session.commit()

        return jsonify({'message': 'Estabelecimento excluído com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# RELATÓRIOS
# ============================================

@admin_bp.route('/reports/orders-by-date', methods=['GET'])
@jwt_required()
@admin_required
def report_orders_by_date():
    """Relatório de pedidos por data"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)

        results = db.session.query(
            func.date(Order.created_at).label('date'),
            func.count(Order.id).label('total'),
            func.sum(Order.total_amount).label('revenue'),
            func.sum(Order.delivery_fee).label('delivery_fees')
        ).filter(
            Order.created_at >= start_date
        ).group_by(func.date(Order.created_at)).order_by(
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


@admin_bp.route('/reports/drivers-performance', methods=['GET'])
@jwt_required()
@admin_required
def report_drivers_performance():
    """Relatório de desempenho dos entregadores"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)

        drivers = db.session.query(
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
        ).group_by(Driver.id, User.first_name, User.last_name).order_by(
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


@admin_bp.route('/reports/establishments-ranking', methods=['GET'])
@jwt_required()
@admin_required
def report_establishments_ranking():
    """Relatório de ranking dos estabelecimentos"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)

        results = db.session.query(
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
        )).group_by(Restaurant.id, Restaurant.name).order_by(
            func.sum(Order.total_amount).desc()
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


@admin_bp.route('/reports/financial-summary', methods=['GET'])
@jwt_required()
@admin_required
def report_financial_summary():
    """Resumo financeiro geral"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)

        # Receita total
        total_revenue = db.session.query(func.sum(Order.total_amount)).filter(
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= start_date
        ).scalar() or 0

        # Frete total
        total_fees = db.session.query(func.sum(Order.delivery_fee)).filter(
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= start_date
        ).scalar() or 0

        # Pagamentos processados aos entregadores
        driver_payments = db.session.query(func.sum(Payment.amount)).filter(
            Payment.status == PaymentStatus.PROCESSED,
            Payment.created_at >= start_date
        ).scalar() or 0

        # Total de pedidos
        total_orders = Order.query.filter(Order.created_at >= start_date).count()
        delivered_orders = Order.query.filter(
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= start_date
        ).count()

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


@admin_bp.route('/reports/cancellations', methods=['GET'])
@jwt_required()
@admin_required
def report_cancellations():
    """Relatório de cancelamentos"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)

        # Cancelamentos por dia
        daily_cancellations = db.session.query(
            func.date(Order.updated_at).label('date'),
            func.count(Order.id).label('count')
        ).filter(
            Order.status == OrderStatus.CANCELLED,
            Order.updated_at >= start_date
        ).group_by(func.date(Order.updated_at)).order_by(
            func.date(Order.updated_at)
        ).all()

        total_cancellations = sum(c.count for c in daily_cancellations)
        total_orders = Order.query.filter(Order.created_at >= start_date).count()
        cancel_rate = round(total_cancellations / total_orders * 100, 1) if total_orders > 0 else 0

        return jsonify({
            'daily': [{'date': c.date.isoformat(), 'count': c.count} for c in daily_cancellations],
            'total_cancellations': total_cancellations,
            'total_orders': total_orders,
            'cancel_rate': cancel_rate
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/reports/ratings', methods=['GET'])
@jwt_required()
@admin_required
def report_ratings():
    """Relatório de avaliações dos entregadores"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)

        # Avaliacoes por entregador
        ratings = db.session.query(
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
        ).group_by(Driver.id, User.first_name, User.last_name).order_by(
            func.avg(Delivery.customer_rating).desc()
        ).all()

        # Distribuicao geral
        dist = db.session.query(
            Delivery.customer_rating,
            func.count(Delivery.id).label('count')
        ).filter(
            Delivery.customer_rating.isnot(None),
            Delivery.created_at >= start_date
        ).group_by(Delivery.customer_rating).all()

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


@admin_bp.route('/reports/peak-hours', methods=['GET'])
@jwt_required()
@admin_required
def report_peak_hours():
    """Relatório de horários de pico"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)

        # Pedidos por hora do dia
        hourly = db.session.query(
            func.extract('hour', Order.created_at).label('hour'),
            func.count(Order.id).label('count')
        ).filter(
            Order.created_at >= start_date
        ).group_by(func.extract('hour', Order.created_at)).order_by(
            func.extract('hour', Order.created_at)
        ).all()

        # Pedidos por dia da semana
        daily = db.session.query(
            func.extract('dow', Order.created_at).label('day'),
            func.count(Order.id).label('count')
        ).filter(
            Order.created_at >= start_date
        ).group_by(func.extract('dow', Order.created_at)).order_by(
            func.extract('dow', Order.created_at)
        ).all()

        day_names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

        return jsonify({
            'hourly': [{'hour': int(h.hour), 'count': h.count} for h in hourly],
            'daily': [{'day': day_names[int(d.day)], 'count': d.count} for d in daily]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/reports/deliveries-by-driver', methods=['GET'])
@jwt_required()
@admin_required
def report_deliveries_by_driver():
    """Relatório detalhado de entregas por entregador"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)

        drivers = db.session.query(
            Driver.id,
            User.first_name,
            User.last_name,
            Driver.vehicle_type,
            func.count(Order.id).label('deliveries'),
            func.sum(Order.delivery_fee).label('total_fees'),
            func.avg(Order.total_amount).label('avg_order'),
            func.avg(Delivery.distance_km).label('avg_distance'),
            func.avg(Delivery.customer_rating).label('avg_rating')
        ).join(User).outerjoin(Order, db.and_(
            Order.driver_id == Driver.id,
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= start_date
        )).outerjoin(Delivery, Delivery.order_id == Order.id).group_by(
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

@admin_bp.route('/settings', methods=['GET'])
@jwt_required()
@admin_required
def get_settings():
    """Obtém configurações do admin"""
    try:
        from src.models.portal_models import SystemConfig
        configs = SystemConfig.query.all()
        settings = {c.config_key: c.config_value for c in configs}
        return jsonify(settings), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/settings', methods=['PUT'])
@jwt_required()
@admin_required
def update_settings():
    """Atualiza configurações do admin"""
    try:
        from src.models.portal_models import SystemConfig
        data = request.get_json()

        for key, value in data.items():
            config = SystemConfig.query.filter_by(config_key=key).first()
            if config:
                config.config_value = str(value)
                config.updated_at = datetime.utcnow()
            else:
                config = SystemConfig(config_key=key, config_value=str(value))
                db.session.add(config)

        db.session.commit()
        return jsonify({'message': 'Configurações salvas com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# GESTAO DE PRACAS (MULTI-CIDADE)
# ============================================

@admin_bp.route('/squares', methods=['GET'])
@jwt_required()
@admin_required
def get_squares():
    """Lista todas as praças"""
    try:
        from src.models.portal_models import Square
        squares = Square.query.order_by(Square.name).all()

        squares_data = []
        for sq in squares:
            sq_dict = sq.to_dict()
            sq_dict['restaurants_count'] = Restaurant.query.filter_by(square_id=sq.id).count()
            sq_dict['drivers_count'] = Driver.query.filter_by(square_id=sq.id).count()
            sq_dict['orders_count'] = Order.query.join(Restaurant).filter(Restaurant.square_id == sq.id).count()
            squares_data.append(sq_dict)

        return jsonify({'squares': squares_data}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/squares', methods=['POST'])
@jwt_required()
@admin_required
def create_square():
    """Cria uma nova praça"""
    try:
        from src.models.portal_models import Square
        data = request.get_json()

        if not data.get('name') or not data.get('city') or not data.get('state'):
            return jsonify({'error': 'Nome, cidade e estado são obrigatórios'}), 400

        square = Square(
            name=data['name'],
            city=data['city'],
            state=data['state'],
            is_active=data.get('is_active', True)
        )
        db.session.add(square)
        db.session.commit()

        return jsonify({'message': 'Praça criada com sucesso', 'square': square.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/squares/<int:square_id>', methods=['PUT'])
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

        square.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'message': 'Praça atualizada com sucesso', 'square': square.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/squares/<int:square_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_square(square_id):
    """Exclui uma praça"""
    try:
        from src.models.portal_models import Square
        square = Square.query.get(square_id)
        if not square:
            return jsonify({'error': 'Praça não encontrada'}), 404

        # Verificar se tem estabelecimentos ou entregadores
        has_restaurants = Restaurant.query.filter_by(square_id=square_id).first()
        has_drivers = Driver.query.filter_by(square_id=square_id).first()
        if has_restaurants or has_drivers:
            return jsonify({'error': 'Não é possível excluir praça com estabelecimentos ou entregadores'}), 400

        db.session.delete(square)
        db.session.commit()

        return jsonify({'message': 'Praça excluída com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# CONTROLE DE PAGAMENTOS AOS ENTREGADORES
# ============================================

@admin_bp.route('/driver-payments', methods=['GET'])
@jwt_required()
@admin_required
def get_driver_payments():
    """Lista o que cada entregador deve receber"""
    try:
        drivers = db.session.query(
            Driver.id,
            User.first_name,
            User.last_name,
            User.email,
            func.sum(Payment.amount).label('total_earnings'),
            func.count(Payment.id).label('payment_count')
        ).join(User).outerjoin(
            Payment, db.and_(Payment.driver_id == Driver.id, Payment.status == PaymentStatus.PENDING)
        ).group_by(Driver.id, User.first_name, User.last_name, User.email).all()

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


@admin_bp.route('/driver-payments/<int:driver_id>/pay', methods=['POST'])
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
            payment.processed_at = datetime.utcnow()

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

@admin_bp.route('/invoices/<int:restaurant_id>/generate', methods=['POST'])
@jwt_required()
@admin_required
def generate_invoice(restaurant_id):
    """Gera fatura semanal para um estabelecimento com QR Code"""
    try:
        from src.models.portal_models import SystemConfig
        import qrcode
        import io
        import base64
        from fpdf import FPDF

        restaurant = Restaurant.query.get(restaurant_id)
        if not restaurant:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        data = request.get_json() or {}
        week_start = data.get('week_start')
        week_end = data.get('week_end')

        if not week_start or not week_end:
            # Semana atual
            now = datetime.utcnow()
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

