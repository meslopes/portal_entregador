from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.portal_models import (
    User, Driver, Order, Restaurant, Customer, Address, Payment, Delivery,
    Notification, Tenant, PricingTable, UserType, UserStatus, VehicleType, OrderStatus, PaymentMethod, PaymentStatus, db
)
from src.utils.tenant import get_current_user, get_current_tenant_id, filter_by_tenant, add_tenant_to_data
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


@admin_bp.route('/process-scheduled', methods=['POST'])
@jwt_required()
@admin_required
def process_scheduled_orders():
    """Processa pedidos agendados que expiraram (converte SCHEDULED para PENDING)"""
    try:
        from src.routes.order import process_scheduled_orders as process_orders
        process_orders()
        return jsonify({'message': 'Pedidos agendados processados com sucesso'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# APROVACAO DE CADASTROS
# ============================================

@admin_bp.route('/pending-users', methods=['GET'])
@jwt_required()
@admin_required
def get_pending_users():
    """Lista usuarios pendentes de aprovacao"""
    try:
        tenant_id = get_current_tenant_id()
        
        query = User.query.filter_by(status=UserStatus.INACTIVE)
        
        # Filtrar por tenant
        if tenant_id:
            query = query.filter(User.tenant_id == tenant_id)
        
        pending = query.all()
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
            return jsonify({'error': 'UsuÃƒÂ¡rio nÃƒÂ£o encontrado'}), 404

        if user.status != UserStatus.INACTIVE:
            return jsonify({'error': 'UsuÃƒÂ¡rio nÃƒÂ£o estÃƒÂ¡ pendente'}), 400

        user.status = UserStatus.ACTIVE
        user.updated_at = datetime.utcnow()
        db.session.commit()

        # Notifica o usuario via WhatsApp
        try:
            from src.services.whatsapp import whatsapp_service
            if whatsapp_service.is_configured() and user.phone:
                whatsapp_service.send_message(
                    user.phone,
                    f"Ã¢Å“â€¦ *Conta Aprovada!*\n\n"
                    f"OlÃƒÂ¡ {user.first_name}, sua conta no muv.log foi aprovada!\n"
                    f"Agora vocÃƒÂª pode fazer login e acessar o sistema."
                )
        except Exception:
            pass

        return jsonify({'message': 'UsuÃƒÂ¡rio aprovado com sucesso'}), 200
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
            return jsonify({'error': 'UsuÃƒÂ¡rio nÃƒÂ£o encontrado'}), 404

        if user.status != UserStatus.INACTIVE:
            return jsonify({'error': 'UsuÃƒÂ¡rio nÃƒÂ£o estÃƒÂ¡ pendente'}), 400

        # Notifica o usuario via WhatsApp antes de excluir
        try:
            from src.services.whatsapp import whatsapp_service
            if whatsapp_service.is_configured() and user.phone:
                whatsapp_service.send_message(
                    user.phone,
                    f"Ã¢ÂÅ’ *Cadastro Rejeitado*\n\n"
                    f"OlÃƒÂ¡ {user.first_name}, seu cadastro no muv.log nÃƒÂ£o foi aprovado.\n"
                    f"Entre em contato com o suporte para mais informaÃƒÂ§ÃƒÂµes."
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

        return jsonify({'message': 'UsuÃƒÂ¡rio rejeitado e excluÃƒÂ­do'}), 200
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
            return jsonify({'error': 'UsuÃƒÂ¡rio nÃƒÂ£o encontrado'}), 404

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

        # Verificar tenant
        tenant_id = get_current_tenant_id()
        if tenant_id and user.tenant_id != tenant_id:
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
                return jsonify({'error': 'Email jÃƒÂ¡ cadastrado'}), 400
            user.email = data['email']
        if data.get('status'):
            try:
                user.status = UserStatus(data['status'])
            except ValueError:
                return jsonify({'error': 'Status invÃƒÂ¡lido'}), 400
        if data.get('user_type'):
            try:
                user.user_type = UserType(data['user_type'])
            except ValueError:
                return jsonify({'error': 'Tipo de usuÃƒÂ¡rio invÃƒÂ¡lido'}), 400

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

        return jsonify({'message': 'Usuario atualizado com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/users/<int:user_id>/reset-password', methods=['POST'])
@jwt_required()
@admin_required
def admin_reset_password(user_id):
    """Admin reseta a senha de um usuario"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuario nao encontrado'}), 404

        data = request.get_json() or {}
        new_password = data.get('new_password', 'admin123')

        if len(new_password) < 6:
            return jsonify({'error': 'Nova senha deve ter pelo menos 6 caracteres'}), 400

        user.set_password(new_password)
        db.session.flush()

        # Verifica se a senha foi salva corretamente
        from werkzeug.security import check_password_hash
        if not check_password_hash(user.password_hash, new_password):
            db.session.rollback()
            return jsonify({'error': 'Erro ao salvar nova senha'}), 500

        db.session.commit()

        return jsonify({'message': 'Senha resetada com sucesso', 'email': user.email}), 200
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

        # Verificar tenant
        tenant_id = get_current_tenant_id()
        if tenant_id and user.tenant_id != tenant_id:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Nao permite excluir a si mesmo
        current_user_id = int(get_jwt_identity())
        if user_id == current_user_id:
            return jsonify({'error': 'NÃƒÂ£o ÃƒÂ© possÃƒÂ­vel excluir sua prÃƒÂ³pria conta'}), 400

        # Nao permite excluir o admin padrao
        if user.user_type == UserType.ADMIN:
            admin_count = User.query.filter_by(user_type=UserType.ADMIN).count()
            if admin_count <= 1:
                return jsonify({'error': 'NÃƒÂ£o ÃƒÂ© possÃƒÂ­vel excluir o ÃƒÂºltimo admin'}), 400

        # Exclui dados especificos do tipo
        if user.user_type == UserType.DRIVER:
            driver = Driver.query.filter_by(user_id=user.id).first()
            if driver:
                # Verifica se tem pedidos
                has_orders = Order.query.filter_by(driver_id=driver.id).first()
                if has_orders:
                    return jsonify({'error': 'NÃƒÂ£o ÃƒÂ© possÃƒÂ­vel excluir entregador com pedidos vinculados'}), 400
                db.session.delete(driver)
        elif user.user_type == UserType.CLIENT:
            customer = Customer.query.filter_by(user_id=user.id).first()
            if customer:
                has_orders = Order.query.filter_by(customer_id=customer.id).first()
                if has_orders:
                    return jsonify({'error': 'NÃƒÂ£o ÃƒÂ© possÃƒÂ­vel excluir estabelecimento com pedidos vinculados'}), 400
                db.session.delete(customer)

        # Exclui notificacoes
        Notification.query.filter_by(user_id=user.id).delete()

        db.session.delete(user)
        db.session.commit()

        return jsonify({'message': 'UsuÃƒÂ¡rio excluÃƒÂ­do com sucesso'}), 200
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
            return jsonify({'error': 'Email ÃƒÂ© obrigatÃƒÂ³rio'}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email jÃƒÂ¡ cadastrado'}), 400

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
        # Processa pedidos agendados e ofertas expiradas
        from src.routes.order import process_scheduled_orders, process_expired_offers
        process_scheduled_orders()
        process_expired_offers()
        
        tenant_id = get_current_tenant_id()

        # Estatísticas gerais (filtradas por tenant)
        total_drivers = Driver.query.filter_by(tenant_id=tenant_id).count() if tenant_id else Driver.query.count()
        online_drivers = Driver.query.filter_by(is_online=True, tenant_id=tenant_id).count() if tenant_id else Driver.query.filter_by(is_online=True).count()
        total_orders = Order.query.filter_by(tenant_id=tenant_id).count() if tenant_id else Order.query.count()

        # Pedidos por status (filtrados por tenant)
        orders_by_status_query = db.session.query(
            Order.status, func.count(Order.id)
        )
        if tenant_id:
            orders_by_status_query = orders_by_status_query.filter(Order.tenant_id == tenant_id)
        orders_by_status = orders_by_status_query.group_by(Order.status).all()

        # Estatísticas do dia atual (filtradas por tenant)
        today = datetime.utcnow().date()
        today_orders_query = Order.query.filter(func.date(Order.created_at) == today)
        if tenant_id:
            today_orders_query = today_orders_query.filter(Order.tenant_id == tenant_id)
        today_orders = today_orders_query.count()

        today_deliveries_query = Order.query.filter(
            func.date(Order.delivery_time) == today,
            Order.status == OrderStatus.DELIVERED
        )
        if tenant_id:
            today_deliveries_query = today_deliveries_query.filter(Order.tenant_id == tenant_id)
        today_deliveries = today_deliveries_query.count()

        # Receita do dia (filtrada por tenant)
        today_revenue_query = db.session.query(func.sum(Order.delivery_fee)).filter(
            func.date(Order.created_at) == today,
            Order.status == OrderStatus.DELIVERED
        )
        if tenant_id:
            today_revenue_query = today_revenue_query.filter(Order.tenant_id == tenant_id)
        today_revenue = today_revenue_query.scalar() or 0

        # Entregadores mais ativos (últimos 7 dias, filtrados por tenant)
        week_ago = datetime.utcnow() - timedelta(days=7)
        top_drivers_query = db.session.query(
            Driver.id,
            User.first_name,
            User.last_name,
            func.count(Order.id).label('deliveries')
        ).join(User).outerjoin(Order, and_(
            Order.driver_id == Driver.id,
            Order.created_at >= week_ago,
            Order.status == OrderStatus.DELIVERED
        ))
        if tenant_id:
            top_drivers_query = top_drivers_query.filter(Driver.tenant_id == tenant_id)
        top_drivers = top_drivers_query.group_by(Driver.id, User.first_name, User.last_name).order_by(
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


# ============================================
# ADMIN - EDITAR/EXCLUIR PEDIDOS
# ============================================

@admin_bp.route('/orders/<int:order_id>', methods=['PUT'])
@jwt_required()
@admin_required
def admin_update_order(order_id):
    """Admin atualiza qualquer pedido (status, valores, etc)"""
    try:
        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404

        data = request.get_json()

        # Atualiza status se fornecido
        if data.get('status'):
            try:
                new_status = OrderStatus(data['status'])
                order.status = new_status
                if new_status == OrderStatus.DELIVERED:
                    order.delivery_time = datetime.utcnow()
                elif new_status == OrderStatus.PICKED_UP:
                    order.pickup_time = datetime.utcnow()
            except ValueError:
                return jsonify({'error': 'Status inválido'}), 400

        # Atualiza valores se fornecidos
        if data.get('subtotal') is not None:
            order.subtotal = data['subtotal']
        if data.get('delivery_fee') is not None:
            order.delivery_fee = data['delivery_fee']
        if data.get('total_amount') is not None:
            order.total_amount = data['total_amount']
        if data.get('payment_method'):
            try:
                order.payment_method = PaymentMethod(data['payment_method'])
            except ValueError:
                pass
        if data.get('special_instructions') is not None:
            order.special_instructions = data['special_instructions']
        if data.get('distribution_method'):
            order.distribution_method = data['distribution_method']

        # Atualiza dados do cliente se fornecidos
        if data.get('customer_name') or data.get('customer_phone'):
            customer = order.customer
            if customer:
                if data.get('customer_name'):
                    customer.name = data['customer_name']
                if data.get('customer_phone'):
                    customer.phone = data['customer_phone']
                customer.updated_at = datetime.utcnow()

        # Atualiza endereço de entrega se fornecido
        if data.get('delivery_address') or data.get('delivery_neighborhood'):
            address = order.delivery_address
            if address:
                if data.get('delivery_address'):
                    address.street = data['delivery_address']
                if data.get('delivery_neighborhood'):
                    address.neighborhood = data['delivery_neighborhood']
                if data.get('delivery_city'):
                    address.city = data['delivery_city']
                if data.get('delivery_state'):
                    address.state = data['delivery_state']
                if data.get('delivery_zip_code'):
                    address.zip_code = data['delivery_zip_code']
                if data.get('delivery_complement'):
                    address.complement = data['delivery_complement']
                # Geocodifica se endereço mudou
                if data.get('delivery_address'):
                    from src.services.geocoding import geocode_address
                    full_addr = f"{address.street}, {address.neighborhood}, {address.city}, {address.state}"
                    geo = geocode_address(full_addr)
                    if geo:
                        address.latitude = geo['latitude']
                        longitude = geo['longitude']
                address.updated_at = datetime.utcnow()

        order.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'message': 'Pedido atualizado com sucesso', 'order': order.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/orders/<int:order_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def admin_delete_order(order_id):
    """Admin exclui um pedido"""
    try:
        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Pedido não encontrado'}), 404

        # Verificar tenant
        tenant_id = get_current_tenant_id()
        if tenant_id and order.tenant_id != tenant_id:
            return jsonify({'error': 'Pedido não encontrado'}), 404

        # Remove delivery se existir
        if order.delivery:
            db.session.delete(order.delivery)

        db.session.delete(order)
        db.session.commit()

        return jsonify({'message': 'Pedido excluído com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
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
        tenant_id = get_current_tenant_id()

        query = Driver.query.join(User)

        # Filtrar por tenant
        if tenant_id:
            query = query.filter(Driver.tenant_id == tenant_id)

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
            
            # EstatÃƒÂ­sticas do entregador
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
    """ObtÃƒÂ©m detalhes de um entregador especÃƒÂ­fico"""
    try:
        driver = Driver.query.get(driver_id)
        if not driver:
            return jsonify({'error': 'Entregador nÃƒÂ£o encontrado'}), 404
        
        driver_dict = driver.to_dict()
        driver_dict['user'] = driver.user.to_dict()
        
        # EstatÃƒÂ­sticas detalhadas
        total_earnings = db.session.query(func.sum(Payment.amount)).filter_by(
            driver_id=driver.id
        ).scalar() or 0
        
        avg_rating = db.session.query(func.avg(Delivery.customer_rating)).filter_by(
            driver_id=driver.id
        ).scalar() or 5.0
        
        # Entregas dos ÃƒÂºltimos 30 dias
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

        # Obter tenant_id do admin atual
        tenant_id = get_current_tenant_id()

        # Cria usuario
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=data.get('phone'),
            cpf=data.get('cpf'),
            user_type=UserType.DRIVER,
            status=UserStatus.ACTIVE,
            tenant_id=tenant_id
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
            driver_license=data.get('driver_license') or None,
            vehicle_type=vehicle_type,
            vehicle_plate=data.get('vehicle_plate') or None,
            vehicle_model=data.get('vehicle_model') or None,
            vehicle_year=data.get('vehicle_year') or None,
            bank_account=data.get('bank_account') or None,
            pix_key=data.get('pix_key') or None,
            square_id=data.get('square_id') or None,
            max_concurrent_orders=int(data.get('max_concurrent_orders', 3)),
            tenant_id=tenant_id
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
    """Atualiza o status de um entregador (ativar/desativar/suspender)"""
    try:
        driver = Driver.query.get(driver_id)
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404
        
        # Verificar tenant
        tenant_id = get_current_tenant_id()
        if tenant_id and driver.tenant_id != tenant_id:
            return jsonify({'error': 'Entregador não encontrado'}), 404
        
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ONLINE', 'OFFLINE']:
            return jsonify({'error': 'Status inválido'}), 400
        
        from src.models.portal_models import UserStatus
        
        # Se for ONLINE/OFFLINE, altera o status online do entregador
        if new_status in ['ONLINE', 'OFFLINE']:
            driver.is_online = (new_status == 'ONLINE')
            driver.updated_at = datetime.utcnow()
            # Se ficar online, atualiza localização se fornecida
            if driver.is_online and data.get('latitude') and data.get('longitude'):
                driver.current_latitude = data['latitude']
                driver.current_longitude = data['longitude']
                driver.last_location_update = datetime.utcnow()
        else:
            # Se for ACTIVE/INACTIVE/SUSPENDED, altera o status da conta
            driver.user.status = UserStatus(new_status)
            driver.user.updated_at = datetime.utcnow()
            # Se suspender ou desativar, colocar offline
            if new_status in ['INACTIVE', 'SUSPENDED']:
                driver.is_online = False
                driver.updated_at = datetime.utcnow()
        
        # Atualizar tenant_id se fornecido
        if 'tenant_id' in data:
            driver.tenant_id = data['tenant_id'] if data['tenant_id'] else None
            driver.user.tenant_id = data['tenant_id'] if data['tenant_id'] else None
        
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
        # Processa pedidos agendados e ofertas expiradas
        from src.routes.order import process_scheduled_orders, process_expired_offers
        process_expired_offers()

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status_filter = request.args.get('status')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        tenant_id = get_current_tenant_id()

        query = Order.query

        # Filtrar por tenant
        if tenant_id:
            query = query.filter(Order.tenant_id == tenant_id)

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
        
        if order.status not in [OrderStatus.SCHEDULED, OrderStatus.PENDING, OrderStatus.PREPARING]:
            return jsonify({'error': 'Pedido não está agendado, pendente ou em preparação'}), 400
        
        data = request.get_json()
        driver_id = data.get('driver_id')
        
        driver = Driver.query.get(driver_id)
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404
        
        # Atribui o pedido (permite offline para atribuição manual)
        order.driver_id = driver.id
        order.status = OrderStatus.ACCEPTED
        order.updated_at = datetime.utcnow()
        
        # Limpa tags de oferta/rejeição anteriores
        if order.special_instructions:
            import re
            order.special_instructions = re.sub(r'\|?(?:OFFERED_TO|REJECTED_BY|TIMEOUT_BY)_\d+(?:_\d+)?', '', order.special_instructions).strip('|')
        
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
        
        # Notifica o entregador no app
        try:
            notification = Notification(
                user_id=driver.user_id,
                title="Novo pedido atribuído",
                message=f"Pedido #{order.order_number} foi atribuído a você pelo administrador",
                type=NotificationType.NEW_ORDER,
                related_id=order.id
            )
            db.session.add(notification)
        except Exception:
            pass
        
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
    """RelatÃƒÂ³rio de ganhos"""
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
        tenant_id = get_current_tenant_id()

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
        revenue_query = db.session.query(
            func.sum(Order.total_amount)
        ).filter(
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= start_date
        )
        if tenant_id:
            revenue_query = revenue_query.filter(Order.tenant_id == tenant_id)
        revenue_result = revenue_query.scalar() or 0

        # Total de pedidos no periodo
        orders_query = Order.query.filter(Order.created_at >= start_date)
        if tenant_id:
            orders_query = orders_query.filter(Order.tenant_id == tenant_id)
        total_orders = orders_query.count()

        # Pedidos entregues no periodo
        delivered_query = Order.query.filter(
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= start_date
        )
        if tenant_id:
            delivered_query = delivered_query.filter(Order.tenant_id == tenant_id)
        delivered_orders = delivered_query.count()

        # Pedidos pendentes
        pending_query = Order.query.filter(Order.status == OrderStatus.PENDING)
        if tenant_id:
            pending_query = pending_query.filter(Order.tenant_id == tenant_id)
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
        driver_payments = payments_query.scalar() or 0

        # Ganhos pendentes de processamento
        pending_pay_query = db.session.query(
            func.sum(Payment.amount)
        ).filter(
            Payment.status == PaymentStatus.PENDING
        )
        if tenant_id:
            pending_pay_query = pending_pay_query.join(Driver).filter(Driver.tenant_id == tenant_id)
        pending_payments = pending_pay_query.scalar() or 0

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
            func.sum(Order.delivery_fee).label('revenue'),
            func.count(Order.id).label('order_count')
        ).join(Order).filter(
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= start_date
        ).group_by(Restaurant.name).order_by(
            func.sum(Order.delivery_fee).desc()
        ).limit(10).all()

        # Receita diÃƒÂ¡ria (ÃƒÂºltimos 30 dias para grÃƒÂ¡fico)
        daily_revenue = db.session.query(
            func.date(Order.created_at).label('date'),
            func.sum(Order.delivery_fee).label('revenue'),
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
        tenant_id = get_current_tenant_id()
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

        query = db.session.query(
            Restaurant.id,
            Restaurant.name,
            Restaurant.phone,
            func.sum(Order.delivery_fee).label('revenue'),
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

@admin_bp.route('/live-tracking', methods=['GET'])
@jwt_required()
@admin_required
def get_live_tracking():
    """Obtém localização em tempo real de entregadores, estabelecimentos e locais de entrega"""
    try:
        # Processa pedidos agendados e ofertas expiradas
        from src.routes.order import process_scheduled_orders, process_expired_offers
        process_scheduled_orders()
        process_expired_offers()
        
        square_id = request.args.get('square_id', type=int)
        tenant_id = get_current_tenant_id()

        # Entregadores online (filtrados por tenant)
        driver_query = Driver.query.filter(
            Driver.is_online == True,
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
                    # Geocodifica se não tem coordenadas OU se coordenadas são fallback
                    needs_geocode = False
                    if not restaurant.latitude or not restaurant.longitude:
                        needs_geocode = True
                    else:
                        lat = float(restaurant.latitude)
                        lng = float(restaurant.longitude)
                        # Coordenadas de Capão da Canoa (-29.7447, -50.0111)
                        if abs(lat - (-29.7447)) < 0.1 and abs(lng - (-50.0111)) < 0.1:
                            if restaurant.address and 'capão' not in restaurant.address.lower() and 'capao' not in restaurant.address.lower():
                                needs_geocode = True
                        # Coordenadas de fallback (-29.95, -50.45)
                        elif abs(lat - (-29.95)) < 0.01 and abs(lng - (-50.45)) < 0.01:
                            needs_geocode = True
                    
                    if needs_geocode:
                        try:
                            from src.services.geocoding import geocode_address
                            # Extrai cidade do endereço
                            city_hint = None
                            if restaurant.address:
                                parts = restaurant.address.split(',')
                                if len(parts) >= 3:
                                    city_hint = parts[-2].strip()
                            geo = geocode_address(restaurant.address, city_hint=city_hint)
                            if geo:
                                restaurant.latitude = geo['latitude']
                                restaurant.longitude = geo['longitude']
                                db.session.commit()
                        except Exception:
                            pass
                    
                    if restaurant.latitude and restaurant.longitude:
                        # Buscar pedidos ativos deste estabelecimento
                        active_orders = Order.query.filter(
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
                            'active_orders': len(active_orders),
                            'orders': [{
                                'id': o.id,
                                'order_number': o.order_number,
                            'status': o.status.value,
                            'customer_name': o.customer.name if o.customer else '',
                            'delivery_fee': float(o.delivery_fee) if o.delivery_fee else 0,
                            'total_amount': float(o.total_amount) if o.total_amount else 0,
                            'driver_name': f"{o.driver.user.first_name} {o.driver.user.last_name}" if o.driver and o.driver.user else None,
                            'created_at': o.created_at.isoformat() if o.created_at else None
                        } for o in active_orders]
                    }
                    tracking_data.append(est_data)
            
            # Locais de entrega
            if order.delivery_address_id and order.delivery_address_id not in delivery_ids_added:
                delivery_ids_added.add(order.delivery_address_id)
                delivery_addr = Address.query.get(order.delivery_address_id)
                if delivery_addr:
                    # Geocodifica se não tem coordenadas OU se coordenadas são fallback
                    needs_geocode = False
                    if not delivery_addr.latitude or not delivery_addr.longitude:
                        needs_geocode = True
                    else:
                        lat = float(delivery_addr.latitude)
                        lng = float(delivery_addr.longitude)
                        # Coordenadas de Capão da Canoa (-29.7447, -50.0111)
                        if abs(lat - (-29.7447)) < 0.1 and abs(lng - (-50.0111)) < 0.1:
                            if delivery_addr.city and 'capão' not in delivery_addr.city.lower() and 'capao' not in delivery_addr.city.lower():
                                needs_geocode = True
                        # Coordenadas de fallback (-29.95, -50.45)
                        elif abs(lat - (-29.95)) < 0.01 and abs(lng - (-50.45)) < 0.01:
                            needs_geocode = True
                    
                    if needs_geocode:
                        try:
                            from src.services.geocoding import geocode_address
                            # Tenta obter cidade da praça do restaurante
                            city_hint = delivery_addr.city
                            if not city_hint and order.restaurant and order.restaurant.square_id:
                                from src.models.portal_models import Square
                                square = Square.query.get(order.restaurant.square_id)
                                if square:
                                    city_hint = square.city
                            
                            full_addr = f"{delivery_addr.street}, {delivery_addr.neighborhood or ''}, {delivery_addr.city or ''}, {delivery_addr.state or 'RS'}"
                            geo = geocode_address(full_addr, city_hint=city_hint)
                            if geo:
                                delivery_addr.latitude = geo['latitude']
                                delivery_addr.longitude = geo['longitude']
                                db.session.commit()
                        except Exception:
                            pass
                    
                    if delivery_addr.latitude and delivery_addr.longitude:
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
        
        return jsonify({
            'drivers': [d for d in tracking_data if d['type'] == 'driver'],
            'establishments': [d for d in tracking_data if d['type'] == 'establishment'],
            'deliveries': [d for d in tracking_data if d['type'] == 'delivery'],
            'count': len([d for d in tracking_data if d['type'] == 'driver'])
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# GESTÃƒÆ’O DE ESTABELECIMENTOS
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
        tenant_id = get_current_tenant_id()

        query = Restaurant.query

        # Filtrar por tenant
        if tenant_id:
            query = query.filter(Restaurant.tenant_id == tenant_id)

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

            # EstatÃƒÂ­sticas do estabelecimento
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
    """ObtÃƒÂ©m detalhes de um estabelecimento"""
    try:
        est = Restaurant.query.get(establishment_id)
        if not est:
            return jsonify({'error': 'Estabelecimento nÃƒÂ£o encontrado'}), 404

        est_dict = est.to_dict()

        # EstatÃƒÂ­sticas
        total_orders = Order.query.filter_by(restaurant_id=est.id).count()
        total_revenue = db.session.query(func.sum(Order.total_amount)).filter_by(
            restaurant_id=est.id
        ).scalar() or 0

        # Pedidos por status
        orders_by_status = db.session.query(
            Order.status, func.count(Order.id)
        ).filter_by(restaurant_id=est.id).group_by(Order.status).all()

        # ÃƒÅ¡ltimos pedidos
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

        # Obter tenant_id do admin atual
        tenant_id = get_current_tenant_id()

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
                status=UserStatus.ACTIVE,
                tenant_id=tenant_id
            )
            user.set_password(password)
            db.session.add(user)
            db.session.flush()

            # Cria Customer record (necessario para criar pedidos)
            customer = Customer(
                user_id=user.id,
                name=data['name'],
                phone=data.get('phone', ''),
                email=email,
                tenant_id=tenant_id
            )
            db.session.add(customer)
            db.session.flush()

        establishment = Restaurant(
            name=data['name'],
            cnpj=data.get('cnpj'),
            phone=data.get('phone'),
            email=email,
            address=data['address'],
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
            opening_hours=data.get('opening_hours'),
            is_active=data.get('is_active', True),
            square_id=data.get('square_id') or None,
            bank_name=data.get('bank_name') or None,
            bank_agency=data.get('bank_agency') or None,
            bank_account=data.get('bank_account') or None,
            bank_pix_key=data.get('bank_pix_key') or None,
            tenant_id=tenant_id
        )

        # Geocodifica endereco se nao tem coordenadas
        if not establishment.latitude or not establishment.longitude:
            from src.services.geocoding import geocode_address
            # Usa cidade do endereço se disponível
            city_hint = None
            if establishment.address:
                # Tenta extrair cidade do endereço (formato: "Rua, Bairro, Cidade, Estado")
                parts = establishment.address.split(',')
                if len(parts) >= 3:
                    city_hint = parts[-2].strip()
            geo = geocode_address(establishment.address, city_hint=city_hint)
            if geo:
                establishment.latitude = geo['latitude']
                establishment.longitude = geo['longitude']
            else:
                establishment.latitude = -29.95
                establishment.longitude = -50.45

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
            return jsonify({'error': 'Estabelecimento nÃƒÂ£o encontrado'}), 404

        data = request.get_json()

        if data.get('name'):
            est.name = data['name']
        if data.get('cnpj'):
            existing = Restaurant.query.filter(
                Restaurant.cnpj == data['cnpj'],
                Restaurant.id != establishment_id
            ).first()
            if existing:
                return jsonify({'error': 'CNPJ jÃƒÂ¡ cadastrado'}), 400
            est.cnpj = data['cnpj']
        if 'phone' in data:
            est.phone = data['phone']
        if 'email' in data:
            est.email = data['email']
        if data.get('address'):
            est.address = data['address']
            # Geocodifica endereco se mudou
            try:
                from src.services.geocoding import geocode_address
                geo = geocode_address(est.address)
                if geo:
                    est.latitude = geo['latitude']
                    est.longitude = geo['longitude']
            except Exception:
                pass
        if data.get('latitude') is not None:
            est.latitude = data['latitude']
        if data.get('longitude') is not None:
            est.longitude = data['longitude']
        if 'opening_hours' in data:
            est.opening_hours = data['opening_hours']
        if 'is_active' in data:
            est.is_active = data['is_active']
        if 'square_id' in data:
            est.square_id = data['square_id']
        if 'pricing_table_id' in data:
            est.pricing_table_id = data['pricing_table_id'] if data['pricing_table_id'] else None
        if 'preparation_minutes' in data:
            est.preparation_minutes = int(data['preparation_minutes']) if data['preparation_minutes'] else 10

        est.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Estabelecimento atualizado com sucesso',
            'establishment': est.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/establishments/geocode', methods=['POST'])
@jwt_required()
@admin_required
def geocode_address_only():
    """Geocodifica um endereco sem salvar"""
    try:
        data = request.get_json()
        address = data.get('address')
        if not address:
            return jsonify({'error': 'Endereco obrigatorio'}), 400

        from src.services.geocoding import geocode_address
        geo = geocode_address(address)

        if geo:
            return jsonify({
                'latitude': geo['latitude'],
                'longitude': geo['longitude']
            }), 200
        else:
            return jsonify({'error': 'Nao foi possivel geocodificar o endereco'}), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/establishments/<int:establishment_id>/geocode', methods=['POST'])
@jwt_required()
@admin_required
def re_geocode_establishment(establishment_id):
    """Re-geocodifica o endereco de um estabelecimento"""
    try:
        est = Restaurant.query.get(establishment_id)
        if not est:
            return jsonify({'error': 'Estabelecimento nao encontrado'}), 404

        from src.services.geocoding import geocode_address
        geo = geocode_address(est.address)

        if geo:
            est.latitude = geo['latitude']
            est.longitude = geo['longitude']
            est.updated_at = datetime.utcnow()
            db.session.commit()
            return jsonify({
                'message': 'Geocodificacao realizada com sucesso',
                'latitude': est.latitude,
                'longitude': est.longitude
            }), 200
        else:
            return jsonify({'error': 'Nao foi possivel geocodificar o endereco. Verifique se o endereco esta correto.'}), 400

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
            return jsonify({'error': 'Estabelecimento nÃƒÂ£o encontrado'}), 404

        # Verificar se tem pedidos
        has_orders = Order.query.filter_by(restaurant_id=establishment_id).first()
        if has_orders:
            return jsonify({'error': 'NÃƒÂ£o ÃƒÂ© possÃƒÂ­vel excluir estabelecimento com pedidos vinculados'}), 400

        db.session.delete(est)
        db.session.commit()

        return jsonify({'message': 'Estabelecimento excluÃƒÂ­do com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# RELATÃƒâ€œRIOS
# ============================================

@admin_bp.route('/reports/orders-by-date', methods=['GET'])
@jwt_required()
@admin_required
def report_orders_by_date():
    """Relatório de pedidos por data"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        tenant_id = get_current_tenant_id()

        query = db.session.query(
            func.date(Order.created_at).label('date'),
            func.count(Order.id).label('total'),
            func.sum(Order.delivery_fee).label('revenue'),
            func.sum(Order.delivery_fee).label('delivery_fees')
        ).filter(
            Order.created_at >= start_date
        )
        
        if tenant_id:
            query = query.filter(Order.tenant_id == tenant_id)
        
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


@admin_bp.route('/reports/drivers-performance', methods=['GET'])
@jwt_required()
@admin_required
def report_drivers_performance():
    """Relatório de desempenho dos entregadores"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        tenant_id = get_current_tenant_id()

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


@admin_bp.route('/reports/establishments-ranking', methods=['GET'])
@jwt_required()
@admin_required
def report_establishments_ranking():
    """Relatório de ranking dos estabelecimentos"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        tenant_id = get_current_tenant_id()

        query = db.session.query(
            Restaurant.id,
            Restaurant.name,
            func.count(Order.id).label('orders'),
            func.sum(Order.delivery_fee).label('revenue'),
            func.sum(Order.delivery_fee).label('delivery_fees'),
            func.avg(Order.delivery_fee).label('avg_order')
        ).outerjoin(Order, db.and_(
            Order.restaurant_id == Restaurant.id,
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= start_date
        ))
        
        # Filtrar por tenant
        if tenant_id:
            query = query.filter(Restaurant.tenant_id == tenant_id)
        
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


@admin_bp.route('/reports/financial-summary', methods=['GET'])
@jwt_required()
@admin_required
def report_financial_summary():
    """Resumo financeiro geral"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        tenant_id = get_current_tenant_id()

        # Receita total
        revenue_query = db.session.query(func.sum(Order.delivery_fee)).filter(
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= start_date
        )
        if tenant_id:
            revenue_query = revenue_query.filter(Order.tenant_id == tenant_id)
        total_revenue = revenue_query.scalar() or 0

        # Frete total
        fees_query = db.session.query(func.sum(Order.delivery_fee)).filter(
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= start_date
        )
        if tenant_id:
            fees_query = fees_query.filter(Order.tenant_id == tenant_id)
        total_fees = fees_query.scalar() or 0

        # Pagamentos processados aos entregadores
        payments_query = db.session.query(func.sum(Payment.amount)).filter(
            Payment.status == PaymentStatus.PROCESSED,
            Payment.created_at >= start_date
        )
        if tenant_id:
            payments_query = payments_query.join(Driver).filter(Driver.tenant_id == tenant_id)
        driver_payments = payments_query.scalar() or 0

        # Total de pedidos
        orders_query = Order.query.filter(Order.created_at >= start_date)
        if tenant_id:
            orders_query = orders_query.filter(Order.tenant_id == tenant_id)
        total_orders = orders_query.count()
        
        delivered_query = Order.query.filter(
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= start_date
        )
        if tenant_id:
            delivered_query = delivered_query.filter(Order.tenant_id == tenant_id)
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


@admin_bp.route('/reports/cancellations', methods=['GET'])
@jwt_required()
@admin_required
def report_cancellations():
    """Relatório de cancelamentos"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        tenant_id = get_current_tenant_id()

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
        
        daily_cancellations = cancel_query.group_by(func.date(Order.updated_at)).order_by(
            func.date(Order.updated_at)
        ).all()

        total_cancellations = sum(c.count for c in daily_cancellations)
        
        orders_query = Order.query.filter(Order.created_at >= start_date)
        if tenant_id:
            orders_query = orders_query.filter(Order.tenant_id == tenant_id)
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


@admin_bp.route('/reports/ratings', methods=['GET'])
@jwt_required()
@admin_required
def report_ratings():
    """Relatório de avaliações dos entregadores"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        tenant_id = get_current_tenant_id()

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


@admin_bp.route('/reports/peak-hours', methods=['GET'])
@jwt_required()
@admin_required
def report_peak_hours():
    """Relatório de horários de pico"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        tenant_id = get_current_tenant_id()

        # Pedidos por hora do dia
        hourly_query = db.session.query(
            func.extract('hour', Order.created_at).label('hour'),
            func.count(Order.id).label('count')
        ).filter(
            Order.created_at >= start_date
        )
        if tenant_id:
            hourly_query = hourly_query.filter(Order.tenant_id == tenant_id)
        
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


@admin_bp.route('/reports/deliveries-by-driver', methods=['GET'])
@jwt_required()
@admin_required
def report_deliveries_by_driver():
    """Relatório detalhado de entregas por entregador"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        tenant_id = get_current_tenant_id()

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

@admin_bp.route('/settings', methods=['GET'])
@jwt_required()
@admin_required
def get_settings():
    """Obtém configurações do admin"""
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


@admin_bp.route('/settings', methods=['PUT'])
@jwt_required()
@admin_required
def update_settings():
    """Atualiza configurações do admin"""
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
                config.updated_at = datetime.utcnow()

        db.session.commit()
        return jsonify({'message': 'Configurações salvas com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# CONFIGURAÇÕES DE WHITE-LABEL (TENANT)
# ============================================

@admin_bp.route('/tenant/settings', methods=['GET'])
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
    except Exception as e:
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


@admin_bp.route('/tenant/settings', methods=['PUT'])
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

        tenant.updated_at = datetime.utcnow()
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

@admin_bp.route('/pricing-tables', methods=['GET'])
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


@admin_bp.route('/pricing-tables', methods=['POST'])
@jwt_required()
@admin_required
def create_pricing_table():
    """Cria uma nova tabela de preços"""
    try:
        tenant_id = get_current_tenant_id()
        data = request.get_json()

        if not data.get('name') or not data.get('square_id'):
            return jsonify({'error': 'Nome e praça são obrigatórios'}), 400

        price_per_km = float(data.get('price_per_km', 2.95))
        min_distance_km = float(data.get('min_distance_km', 4.0))
        min_delivery_fee = float(data.get('min_delivery_fee', price_per_km * min_distance_km))

        table = PricingTable(
            tenant_id=tenant_id,
            square_id=data['square_id'],
            name=data['name'],
            description=data.get('description'),
            price_per_km=price_per_km,
            min_distance_km=min_distance_km,
            min_delivery_fee=min_delivery_fee,
            max_delivery_fee=float(data.get('max_delivery_fee', 50.0)),
            driver_percentage=float(data.get('driver_percentage', 70.0)),
            is_active=data.get('is_active', True)
        )
        db.session.add(table)
        db.session.commit()

        return jsonify({
            'message': 'Tabela de preços criada com sucesso',
            'pricing_table': table.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/pricing-tables/<int:table_id>', methods=['GET'])
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


@admin_bp.route('/pricing-tables/<int:table_id>', methods=['PUT'])
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

        if 'name' in data:
            table.name = data['name']
        if 'description' in data:
            table.description = data['description']
        if 'price_per_km' in data:
            table.price_per_km = float(data['price_per_km'])
        if 'min_distance_km' in data:
            table.min_distance_km = float(data['min_distance_km'])
        if 'min_delivery_fee' in data:
            table.min_delivery_fee = float(data['min_delivery_fee'])
        if 'max_delivery_fee' in data:
            table.max_delivery_fee = float(data['max_delivery_fee'])
        if 'driver_percentage' in data:
            table.driver_percentage = float(data['driver_percentage'])
        if 'is_active' in data:
            table.is_active = data['is_active']

        table.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Tabela atualizada com sucesso',
            'pricing_table': table.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/pricing-tables/<int:table_id>', methods=['DELETE'])
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


@admin_bp.route('/tenant/logo', methods=['POST'])
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
        tenant.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Logo atualizado com sucesso',
            'logo_url': logo_url
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/tenants', methods=['POST'])
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


@admin_bp.route('/tenants', methods=['GET'])
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

@admin_bp.route('/squares', methods=['GET'])
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
                print(f"Erro ao processar praça {sq.id}: {e}")
                continue

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
            driver_percentage=data.get('driver_percentage', 70.0),
            tenant_id=tenant_id
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
    """Atualiza uma praÃƒÂ§a"""
    try:
        from src.models.portal_models import Square
        square = Square.query.get(square_id)
        if not square:
            return jsonify({'error': 'PraÃƒÂ§a nÃƒÂ£o encontrada'}), 404

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

        square.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'message': 'PraÃƒÂ§a atualizada com sucesso', 'square': square.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/squares/<int:square_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_square(square_id):
    """Exclui uma praÃƒÂ§a"""
    try:
        from src.models.portal_models import Square
        square = Square.query.get(square_id)
        if not square:
            return jsonify({'error': 'PraÃƒÂ§a nÃƒÂ£o encontrada'}), 404

        # Verificar se tem estabelecimentos ou entregadores
        has_restaurants = Restaurant.query.filter_by(square_id=square_id).first()
        has_drivers = Driver.query.filter_by(square_id=square_id).first()
        if has_restaurants or has_drivers:
            return jsonify({'error': 'NÃƒÂ£o ÃƒÂ© possÃƒÂ­vel excluir praÃƒÂ§a com estabelecimentos ou entregadores'}), 400

        db.session.delete(square)
        db.session.commit()

        return jsonify({'message': 'PraÃƒÂ§a excluÃƒÂ­da com sucesso'}), 200
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
        tenant_id = get_current_tenant_id()
        
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


@admin_bp.route('/driver-payments/<int:driver_id>/pay', methods=['POST'])
@jwt_required()
@admin_required
def pay_driver(driver_id):
    """Registra pagamento ao entregador"""
    try:
        driver = Driver.query.get(driver_id)
        if not driver:
            return jsonify({'error': 'Entregador nÃƒÂ£o encontrado'}), 404

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
            return jsonify({'error': 'Estabelecimento nÃƒÂ£o encontrado'}), 404

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
            return jsonify({'error': 'Nenhum pedido entregue no perÃƒÂ­odo'}), 400

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

@admin_bp.route('/withdrawals', methods=['GET'])
@jwt_required()
@admin_required
def list_withdrawals():
    """Lista solicitações de saque pendentes"""
    try:
        tenant_id = get_current_tenant_id()
        
        query = Payment.query.filter_by(
            payment_type='WITHDRAWAL',
            status='PENDING'
        ).join(Driver).join(User)
        
        if tenant_id:
            query = query.filter(Driver.tenant_id == tenant_id)
        
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


@admin_bp.route('/withdrawals/<int:withdrawal_id>/process', methods=['POST'])
@jwt_required()
@admin_required
def process_withdrawal(withdrawal_id):
    """Processa (aprova/rejeita) uma solicitação de saque"""
    try:
        from decimal import Decimal
        
        withdrawal = Payment.query.get(withdrawal_id)
        if not withdrawal:
            return jsonify({'error': 'Solicitação não encontrada'}), 404
        
        if withdrawal.status != 'PENDING':
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
            withdrawal.status = 'PROCESSED'
            driver.locked_balance = Decimal(str(float(driver.locked_balance or 0))) - Decimal(str(amount))
        else:
            # Rejeitar saque - devolver ao balance
            withdrawal.status = 'CANCELLED'
            driver.locked_balance = Decimal(str(float(driver.locked_balance or 0))) - Decimal(str(amount))
            driver.balance = Decimal(str(float(driver.balance or 0))) + Decimal(str(amount))
        
        driver.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'message': f'Saque {"aprovado" if action == "approve" else "rejeitado"} com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
