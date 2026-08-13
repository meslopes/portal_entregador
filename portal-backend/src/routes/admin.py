from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging

logger = logging.getLogger(__name__)

from src.models.portal_models import (
    User, Driver, Order, Restaurant, Customer, Address, Payment, Delivery,
    Notification, NotificationType, Tenant, PricingTable, DynamicPricing, Invoice,
    PlatformCredential, DriverRestaurant, EstablishmentDriver, OwnDriverEarning, UserType, UserStatus, VehicleType, OrderStatus, PaymentMethod, PaymentStatus, db
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


def client_or_admin_required(f):
    """Decorator para verificar se o usuário é admin ou cliente (estabelecimento)"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type not in (UserType.ADMIN, UserType.CLIENT):
            return jsonify({'error': 'Acesso restrito'}), 403
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
                        address.longitude = geo['longitude']
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
        
        # Calcula ganhos (% configurável)
        driver_pct = 0.70
        if order.restaurant and order.restaurant.pricing_table_id:
            from src.models.portal_models import PricingTable
            pt = PricingTable.query.get(order.restaurant.pricing_table_id)
            if pt and pt.driver_percentage:
                driver_pct = float(pt.driver_percentage) / 100.0
        elif order.restaurant and order.restaurant.square_id:
            from src.models.portal_models import Square
            sq = Square.query.get(order.restaurant.square_id)
            if sq and sq.driver_percentage:
                driver_pct = float(sq.driver_percentage) / 100.0
        base_earning = float(order.delivery_fee) * driver_pct
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
    """Exclui um estabelecimento (com opção de forçar exclusão mesmo com pedidos)"""
    try:
        est = Restaurant.query.get(establishment_id)
        if not est:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        # Verificar se tem pedidos
        has_orders = Order.query.filter_by(restaurant_id=establishment_id).first()
        if has_orders:
            # Verificar se é exclusão forçada
            force = request.args.get('force', 'false').lower() == 'true'
            if not force:
                return jsonify({'error': 'Estabelecimento tem pedidos vinculados. Use ?force=true para excluir mesmo assim'}), 400
            
            # Exclusão forçada: deletar pedidos e entregas vinculados
            orders = Order.query.filter_by(restaurant_id=establishment_id).all()
            for order in orders:
                # Deletar entregas vinculadas
                Delivery.query.filter_by(order_id=order.id).delete()
                # Deletar pagamentos vinculados (usa reference_id, não order_id)
                Payment.query.filter_by(reference_id=order.id).delete()
                # Deletar notificações vinculadas (usa related_id, não order_id)
                Notification.query.filter_by(related_id=order.id).delete()
            # Deletar pedidos
            Order.query.filter_by(restaurant_id=establishment_id).delete()

        # Deletar cliente vinculado (se existir)
        customer = Customer.query.filter_by(name=est.name).first()
        if customer:
            db.session.delete(customer)

        db.session.delete(est)
        db.session.commit()

        return jsonify({'message': 'Estabelecimento excluído com sucesso'}), 200

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


# ============================================
# DYNAMIC PRICING (Taxas Adicionais)
# ============================================

@admin_bp.route('/dynamic-pricing', methods=['GET'])
@jwt_required()
@admin_required
def get_dynamic_pricing():
    """Lista configurações de taxas adicionais por praça"""
    try:
        tenant_id = get_current_tenant_id()
        query = DynamicPricing.query
        if tenant_id:
            query = query.join(DynamicPricing.square).filter(
                db.or_(DynamicPricing.square.has(tenant_id=tenant_id), DynamicPricing.square.has(tenant_id=None))
            )
        configs = query.all()
        return jsonify({'dynamic_pricing': [d.to_dict() for d in configs]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/dynamic-pricing', methods=['POST'])
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


@admin_bp.route('/dynamic-pricing/<int:config_id>', methods=['PUT'])
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

        config.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Configuração atualizada com sucesso',
            'dynamic_pricing': config.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/dynamic-pricing/<int:config_id>', methods=['DELETE'])
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
        
        driver.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'message': f'Saque {"aprovado" if action == "approve" else "rejeitado"} com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# FATURAS SEMANAIS
# ============================================

@admin_bp.route('/invoices', methods=['GET'])
@jwt_required()
@admin_required
def list_invoices():
    """Lista faturas com filtros"""
    try:
        tenant_id = get_current_tenant_id()
        status = request.args.get('status')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')

        query = Invoice.query.join(Restaurant)
        if tenant_id:
            query = query.filter(Invoice.tenant_id == tenant_id)
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


@admin_bp.route('/invoices/generate', methods=['POST'])
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
            today = datetime.utcnow().date()
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


@admin_bp.route('/invoices/<int:invoice_id>/pay', methods=['POST'])
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
                    driver.updated_at = datetime.utcnow()
                    drivers_unlocked[driver.id] = drivers_unlocked.get(driver.id, 0) + float(earnings)
        
        # Marcar fatura como paga
        invoice.status = 'PAID'
        invoice.paid_at = datetime.utcnow()
        invoice.updated_at = datetime.utcnow()
        
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
# INTEGRAÇÃO ASAAS (Gateway de Pagamento)
# ============================================

@admin_bp.route('/asaas/config', methods=['GET'])
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


@admin_bp.route('/asaas/config', methods=['PUT'])
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
                config.updated_at = datetime.utcnow()
            else:
                config = SystemConfig(config_key=field, config_value=data[field])
                db.session.add(config)

    db.session.commit()
    return jsonify({'message': 'Configuração Asaas atualizada'}), 200


@admin_bp.route('/asaas/test', methods=['POST'])
@jwt_required()
@admin_required
def test_asaas_connection():
    """Testa a conexão com o Asaas"""
    from src.services.asaas_service import is_configured, get_base_url, get_headers
    import requests as req

    if not is_configured():
        return jsonify({'success': False, 'error': 'Asaas não configurado'}), 400

    try:
        response = req.get(f"{get_base_url()}/customers?limit=1", headers=get_headers(), timeout=10)
        if response.status_code == 200:
            return jsonify({'success': True, 'message': 'Conexão com Asaas OK'}), 200
        return jsonify({'success': False, 'error': f'Erro HTTP {response.status_code}'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@admin_bp.route('/invoices/generate-auto', methods=['POST'])
@jwt_required()
@admin_required
def generate_auto_invoices():
    """
    Gera faturas automaticamente para todos os estabelecimentos com entregas na semana.
    """
    from src.services.asaas_service import create_charge, is_configured

    try:
        tenant_id = get_current_tenant_id()

        # Calcular período da semana anterior
        today = datetime.utcnow().date()
        week_end = today - timedelta(days=today.weekday() + 1)
        week_start = week_end - timedelta(days=6)

        restaurants = Restaurant.query.filter(Restaurant.is_active == True).all()
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


@admin_bp.route('/invoices/<int:invoice_id>/charge', methods=['POST'])
@jwt_required()
@admin_required
def create_invoice_charge(invoice_id):
    """Cria cobrança no Asaas para uma fatura específica"""
    from src.services.asaas_service import create_charge, is_configured, create_customer

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
            due_date=(datetime.utcnow().date() + timedelta(days=3)).isoformat(),
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


@admin_bp.route('/invoices/<int:invoice_id>/send-link', methods=['POST'])
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


@admin_bp.route('/withdrawals/<int:withdrawal_id>/process-auto', methods=['POST'])
@jwt_required()
@admin_required
def process_withdrawal_auto(withdrawal_id):
    """Processa saque automaticamente via Asaas PIX"""
    from src.services.asaas_service import transfer_pix, is_configured, detect_pix_key_type

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

        result = transfer_pix(
            value=amount,
            pix_key=driver.pix_key,
            pix_key_type=pix_key_type,
            description=f'Saque muv.log - {driver.user.first_name}'
        )

        if result.get('success'):
            withdrawal.status = PaymentStatus.PROCESSED
            withdrawal.updated_at = datetime.utcnow()
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
# CREDENCIAIS DE PLATAFORMAS (iFood, etc.)
# ============================================

@admin_bp.route('/platform-credentials', methods=['GET'])
@jwt_required()
@admin_required
def list_platform_credentials():
    """Lista credenciais de plataformas por estabelecimento"""
    try:
        tenant_id = get_current_tenant_id()
        restaurant_id = request.args.get('restaurant_id')
        
        query = PlatformCredential.query.join(Restaurant)
        if tenant_id:
            query = query.filter(Restaurant.tenant_id == tenant_id)
        if restaurant_id:
            query = query.filter(PlatformCredential.restaurant_id == int(restaurant_id))
        
        credentials = query.all()
        return jsonify({'credentials': [c.to_dict() for c in credentials]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/platform-credentials', methods=['POST'])
@jwt_required()
@admin_required
def create_platform_credential():
    """Cria ou atualiza credencial de plataforma para um estabelecimento"""
    try:
        data = request.get_json()
        if not data or not data.get('restaurant_id') or not data.get('platform'):
            return jsonify({'error': 'Estabelecimento e plataforma são obrigatórios'}), 400
        
        restaurant_id = data['restaurant_id']
        platform = data['platform'].upper()
        
        # Verificar se já existe credencial para este restaurante/plataforma
        existing = PlatformCredential.query.filter_by(
            restaurant_id=restaurant_id,
            platform=platform
        ).first()
        
        if existing:
            # Atualizar existente
            if 'client_id' in data:
                existing.client_id = data['client_id']
            if 'client_secret' in data:
                existing.client_secret = data['client_secret']
            if 'access_token' in data:
                existing.access_token = data['access_token']
            if 'refresh_token' in data:
                existing.refresh_token = data['refresh_token']
            if 'is_active' in data:
                existing.is_active = data['is_active']
            existing.updated_at = datetime.utcnow()
            db.session.commit()
            return jsonify({
                'message': 'Credencial atualizada com sucesso',
                'credential': existing.to_dict()
            }), 200
        else:
            # Criar nova
            credential = PlatformCredential(
                restaurant_id=restaurant_id,
                platform=platform,
                client_id=data.get('client_id'),
                client_secret=data.get('client_secret'),
                access_token=data.get('access_token'),
                refresh_token=data.get('refresh_token'),
                is_active=data.get('is_active', True)
            )
            db.session.add(credential)
            db.session.commit()
            return jsonify({
                'message': 'Credencial criada com sucesso',
                'credential': credential.to_dict()
            }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/platform-credentials/<int:cred_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_platform_credential(cred_id):
    """Exclui credencial de plataforma"""
    try:
        cred = PlatformCredential.query.get(cred_id)
        if not cred:
            return jsonify({'error': 'Credencial não encontrada'}), 404
        
        db.session.delete(cred)
        db.session.commit()
        return jsonify({'message': 'Credencial excluída com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/platform-credentials/<int:cred_id>/test', methods=['POST'])
@jwt_required()
@admin_required
def test_platform_credential(cred_id):
    """Testa conexão com a plataforma"""
    try:
        cred = PlatformCredential.query.get(cred_id)
        if not cred:
            return jsonify({'error': 'Credencial não encontrada'}), 404
        
        if cred.platform == 'IFOOD':
            from src.services.ifood_service import authenticate
            
            if not cred.client_id or not cred.client_secret:
                return jsonify({'success': False, 'error': 'Client ID e Client Secret são obrigatórios'}), 400
            
            result = authenticate(cred.client_id, cred.client_secret)
            
            if result.get('success'):
                # Salvar tokens
                cred.access_token = result.get('access_token')
                cred.refresh_token = result.get('refresh_token')
                from datetime import timedelta
                cred.expires_at = datetime.utcnow() + timedelta(seconds=result.get('expires_in', 3600))
                cred.is_active = True
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'message': 'Conexão com iFood estabelecida com sucesso'
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'error': result.get('error', 'Erro ao conectar com iFood')
                }), 400
        else:
            return jsonify({'success': False, 'error': f'Plataforma {cred.platform} não suportada para teste'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================
# VINCULAÇÃO ENTREGADOR-ESTABELECIMENTO
# ============================================

@admin_bp.route('/driver-assignments', methods=['GET'])
@jwt_required()
@admin_required
def list_driver_assignments():
    """Lista vinculações entregador-estabelecimento"""
    try:
        tenant_id = get_current_tenant_id()
        restaurant_id = request.args.get('restaurant_id')
        driver_id = request.args.get('driver_id')
        
        query = DriverRestaurant.query
        if tenant_id:
            query = query.join(Restaurant).filter(Restaurant.tenant_id == tenant_id)
        if restaurant_id:
            query = query.filter(DriverRestaurant.restaurant_id == int(restaurant_id))
        if driver_id:
            query = query.filter(DriverRestaurant.driver_id == int(driver_id))
        
        assignments = query.all()
        return jsonify({'assignments': [a.to_dict() for a in assignments]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/driver-assignments', methods=['POST'])
@jwt_required()
@admin_required
def create_driver_assignment():
    """Vincula entregador a estabelecimento"""
    try:
        data = request.get_json()
        if not data or not data.get('driver_id') or not data.get('restaurant_id'):
            return jsonify({'error': 'Entregador e estabelecimento são obrigatórios'}), 400
        
        driver_id = data['driver_id']
        restaurant_id = data['restaurant_id']
        
        # Verificar se já existe
        existing = DriverRestaurant.query.filter_by(
            driver_id=driver_id,
            restaurant_id=restaurant_id
        ).first()
        
        if existing:
            return jsonify({'error': 'Vinculação já existe'}), 400
        
        assignment = DriverRestaurant(
            driver_id=driver_id,
            restaurant_id=restaurant_id,
            is_priority=data.get('is_priority', False)
        )
        db.session.add(assignment)
        db.session.commit()
        
        return jsonify({
            'message': 'Vinculação criada com sucesso',
            'assignment': assignment.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/driver-assignments/<int:assignment_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_driver_assignment(assignment_id):
    """Remove vinculação entregador-estabelecimento"""
    try:
        assignment = DriverRestaurant.query.get(assignment_id)
        if not assignment:
            return jsonify({'error': 'Vinculação não encontrada'}), 404
        
        db.session.delete(assignment)
        db.session.commit()
        
        return jsonify({'message': 'Vinculação removida com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/driver-assignments/<int:assignment_id>/priority', methods=['PUT'])
@jwt_required()
@admin_required
def toggle_driver_priority(assignment_id):
    """Ativa/desativa prioridade do entregador no estabelecimento"""
    try:
        assignment = DriverRestaurant.query.get(assignment_id)
        if not assignment:
            return jsonify({'error': 'Vinculação não encontrada'}), 404
        
        data = request.get_json()
        assignment.is_priority = data.get('is_priority', not assignment.is_priority)
        db.session.commit()
        
        return jsonify({
            'message': 'Prioridade atualizada',
            'assignment': assignment.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# ENTREGADORES PRÓPRIOS DO ESTABELECIMENTO
# ============================================

@admin_bp.route('/establishment-drivers', methods=['GET'])
@jwt_required()
@client_or_admin_required
def list_establishment_drivers():
    """Lista entregadores próprios de um estabelecimento"""
    try:
        restaurant_id = request.args.get('restaurant_id')
        if not restaurant_id:
            return jsonify({'error': 'restaurant_id é obrigatório'}), 400
        
        drivers = EstablishmentDriver.query.filter_by(
            restaurant_id=int(restaurant_id),
            is_active=True
        ).all()
        
        return jsonify({'drivers': [d.to_dict() for d in drivers]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/establishment-drivers', methods=['POST'])
@jwt_required()
@client_or_admin_required
def create_establishment_driver():
    """Cadastra entregador próprio para um estabelecimento"""
    try:
        data = request.get_json()
        if not data or not data.get('restaurant_id') or not data.get('name'):
            return jsonify({'error': 'Estabelecimento e nome são obrigatórios'}), 400
        
        driver = EstablishmentDriver(
            restaurant_id=data['restaurant_id'],
            name=data['name'],
            phone=data.get('phone'),
            vehicle_type=data.get('vehicle_type', 'MOTO'),
            vehicle_plate=data.get('vehicle_plate'),
            vehicle_model=data.get('vehicle_model'),
            is_active=True
        )
        db.session.add(driver)
        
        # Marcar estabelecimento como tendo entregadores próprios
        restaurant = Restaurant.query.get(data['restaurant_id'])
        if restaurant:
            restaurant.has_own_drivers = True
        
        db.session.commit()
        
        return jsonify({
            'message': 'Entregador cadastrado com sucesso',
            'driver': driver.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/establishment-drivers/<int:driver_id>', methods=['PUT'])
@jwt_required()
@client_or_admin_required
def update_establishment_driver(driver_id):
    """Atualiza entregador próprio"""
    try:
        driver = EstablishmentDriver.query.get(driver_id)
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404
        
        data = request.get_json()
        if 'name' in data:
            driver.name = data['name']
        if 'phone' in data:
            driver.phone = data['phone']
        if 'vehicle_type' in data:
            driver.vehicle_type = data['vehicle_type']
        if 'vehicle_plate' in data:
            driver.vehicle_plate = data['vehicle_plate']
        if 'vehicle_model' in data:
            driver.vehicle_model = data['vehicle_model']
        if 'is_active' in data:
            driver.is_active = data['is_active']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Entregador atualizado',
            'driver': driver.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/establishment-drivers/<int:driver_id>', methods=['DELETE'])
@jwt_required()
@client_or_admin_required
def delete_establishment_driver(driver_id):
    """Remove entregador próprio"""
    try:
        driver = EstablishmentDriver.query.get(driver_id)
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404
        
        driver.is_active = False
        db.session.commit()
        
        return jsonify({'message': 'Entregador removido'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/establishment-drivers/<int:driver_id>/toggle-online', methods=['PUT'])
@jwt_required()
@client_or_admin_required
def toggle_establishment_driver_online(driver_id):
    """Ativa/desativa status online do entregador próprio"""
    try:
        driver = EstablishmentDriver.query.get(driver_id)
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404
        
        data = request.get_json() or {}
        driver.is_online = data.get('is_online', not driver.is_online)
        
        if 'latitude' in data:
            driver.current_latitude = data['latitude']
        if 'longitude' in data:
            driver.current_longitude = data['longitude']
        
        db.session.commit()
        
        return jsonify({
            'message': f'Entregador {"online" if driver.is_online else "offline"}',
            'driver': driver.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/establishments/<int:restaurant_id>/subscription', methods=['PUT'])
@jwt_required()
@admin_required
def update_restaurant_subscription(restaurant_id):
    """Configura assinatura do estabelecimento"""
    try:
        restaurant = Restaurant.query.get(restaurant_id)
        if not restaurant:
            return jsonify({'error': 'Estabelecimento não encontrado'}), 404

        data = request.get_json()
        if 'subscription_type' in data:
            restaurant.subscription_type = data['subscription_type']
        if 'subscription_expires_at' in data:
            restaurant.subscription_expires_at = datetime.fromisoformat(data['subscription_expires_at']) if data['subscription_expires_at'] else None
        if 'platform_pricing_table_id' in data:
            restaurant.platform_pricing_table_id = data['platform_pricing_table_id']
        if 'has_own_drivers' in data:
            restaurant.has_own_drivers = data['has_own_drivers']

        db.session.commit()

        return jsonify({
            'message': 'Assinatura atualizada',
            'restaurant': restaurant.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# CONFIGURAÇÃO DE PAGAMENTO - ENTREGADORES PRÓPRIOS
# ============================================

@admin_bp.route('/establishment-drivers/payment-config', methods=['GET'])
@jwt_required()
@client_or_admin_required
def get_payment_config():
    """Obtém configuração de pagamento do estabelecimento"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        # Buscar restaurante
        if user.user_type == UserType.CLIENT:
            customer = Customer.query.filter_by(user_id=user.id).first()
            if not customer:
                return jsonify({'error': 'Cliente não encontrado'}), 404
            restaurant = Restaurant.query.filter_by(name=customer.name).first()
        else:
            restaurant_id = request.args.get('restaurant_id')
            restaurant = Restaurant.query.get(restaurant_id) if restaurant_id else None
        
        if not restaurant:
            return jsonify({'error': 'Restaurante não encontrado'}), 404
        
        return jsonify({
            'payment_type': restaurant.own_driver_payment_type or 'PER_DELIVERY',
            'fixed_value': float(restaurant.own_driver_fixed_value) if restaurant.own_driver_fixed_value else 5.00,
            'km_value': float(restaurant.own_driver_km_value) if restaurant.own_driver_km_value else 1.50,
            'percentage': float(restaurant.own_driver_percentage) if restaurant.own_driver_percentage else 70.0
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/establishment-drivers/payment-config', methods=['PUT'])
@jwt_required()
@client_or_admin_required
def update_payment_config():
    """Atualiza configuração de pagamento do estabelecimento"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        # Buscar restaurante
        if user.user_type == UserType.CLIENT:
            customer = Customer.query.filter_by(user_id=user.id).first()
            if not customer:
                return jsonify({'error': 'Cliente não encontrado'}), 404
            restaurant = Restaurant.query.filter_by(name=customer.name).first()
        else:
            data = request.get_json()
            restaurant_id = data.get('restaurant_id')
            restaurant = Restaurant.query.get(restaurant_id) if restaurant_id else None
        
        if not restaurant:
            return jsonify({'error': 'Restaurante não encontrado'}), 404
        
        data = request.get_json()
        if 'payment_type' in data:
            restaurant.own_driver_payment_type = data['payment_type']
        if 'fixed_value' in data:
            restaurant.own_driver_fixed_value = data['fixed_value']
        if 'km_value' in data:
            restaurant.own_driver_km_value = data['km_value']
        if 'percentage' in data:
            restaurant.own_driver_percentage = data['percentage']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Configuração atualizada',
            'payment_type': restaurant.own_driver_payment_type,
            'fixed_value': float(restaurant.own_driver_fixed_value) if restaurant.own_driver_fixed_value else 5.00,
            'km_value': float(restaurant.own_driver_km_value) if restaurant.own_driver_km_value else 1.50,
            'percentage': float(restaurant.own_driver_percentage) if restaurant.own_driver_percentage else 70.0
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# GANHOS DE ENTREGADORES PRÓPRIOS
# ============================================

@admin_bp.route('/establishment-drivers/earnings', methods=['GET'])
@jwt_required()
@client_or_admin_required
def get_own_driver_earnings():
    """Obtém ganhos dos entregadores próprios"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        # Buscar restaurante
        if user.user_type == UserType.CLIENT:
            customer = Customer.query.filter_by(user_id=user.id).first()
            if not customer:
                return jsonify({'error': 'Cliente não encontrado'}), 404
            restaurant = Restaurant.query.filter_by(name=customer.name).first()
        else:
            restaurant_id = request.args.get('restaurant_id')
            restaurant = Restaurant.query.get(restaurant_id) if restaurant_id else None
        
        if not restaurant:
            return jsonify({'error': 'Restaurante não encontrado'}), 404
        
        # Parâmetros de filtro
        period = request.args.get('period', 'week')  # week, month, all
        driver_id = request.args.get('driver_id')
        is_paid = request.args.get('is_paid')
        
        query = OwnDriverEarning.query.filter_by(restaurant_id=restaurant.id)
        
        # Filtro por período
        if period == 'week':
            from datetime import timedelta
            week_ago = datetime.utcnow() - timedelta(days=7)
            query = query.filter(OwnDriverEarning.created_at >= week_ago)
        elif period == 'month':
            from datetime import timedelta
            month_ago = datetime.utcnow() - timedelta(days=30)
            query = query.filter(OwnDriverEarning.created_at >= month_ago)
        
        # Filtro por entregador
        if driver_id:
            query = query.filter_by(establishment_driver_id=int(driver_id))
        
        # Filtro por status de pagamento
        if is_paid is not None:
            query = query.filter_by(is_paid=is_paid.lower() == 'true')
        
        earnings = query.order_by(OwnDriverEarning.created_at.desc()).all()
        
        # Calcular totais
        total_earning = sum(float(e.driver_earning) for e in earnings)
        total_delivery_fee = sum(float(e.delivery_fee) for e in earnings)
        total_paid = sum(float(e.driver_earning) for e in earnings if e.is_paid)
        total_pending = total_earning - total_paid
        
        return jsonify({
            'earnings': [e.to_dict() for e in earnings],
            'summary': {
                'total_earning': total_earning,
                'total_delivery_fee': total_delivery_fee,
                'total_paid': total_paid,
                'total_pending': total_pending,
                'count': len(earnings)
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/establishment-drivers/earnings/<int:earning_id>/pay', methods=['POST'])
@jwt_required()
@client_or_admin_required
def mark_earning_paid(earning_id):
    """Marca um ganho como pago"""
    try:
        earning = OwnDriverEarning.query.get(earning_id)
        if not earning:
            return jsonify({'error': 'Ganho não encontrado'}), 404
        
        data = request.get_json() or {}
        earning.is_paid = True
        earning.paid_at = datetime.utcnow()
        earning.payment_method = data.get('payment_method', 'PIX')
        
        db.session.commit()
        
        return jsonify({
            'message': 'Pagamento registrado',
            'earning': earning.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/establishment-drivers/earnings/pay-all', methods=['POST'])
@jwt_required()
@client_or_admin_required
def pay_all_earnings():
    """Marca todos os ganhos pendentes de um entregador como pagos"""
    try:
        data = request.get_json()
        driver_id = data.get('driver_id')
        if not driver_id:
            return jsonify({'error': 'ID do entregador é obrigatório'}), 400
        
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        # Buscar restaurante
        if user.user_type == UserType.CLIENT:
            customer = Customer.query.filter_by(user_id=user.id).first()
            if not customer:
                return jsonify({'error': 'Cliente não encontrado'}), 404
            restaurant = Restaurant.query.filter_by(name=customer.name).first()
        else:
            restaurant_id = data.get('restaurant_id')
            restaurant = Restaurant.query.get(restaurant_id) if restaurant_id else None
        
        if not restaurant:
            return jsonify({'error': 'Restaurante não encontrado'}), 404
        
        # Buscar ganhos pendentes
        pending_earnings = OwnDriverEarning.query.filter_by(
            restaurant_id=restaurant.id,
            establishment_driver_id=int(driver_id),
            is_paid=False
        ).all()
        
        for earning in pending_earnings:
            earning.is_paid = True
            earning.paid_at = datetime.utcnow()
            earning.payment_method = data.get('payment_method', 'PIX')
        
        db.session.commit()
        
        total_paid = sum(float(e.driver_earning) for e in pending_earnings)
        
        return jsonify({
            'message': f'{len(pending_earnings)} pagamentos registrados',
            'total_paid': total_paid,
            'count': len(pending_earnings)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/establishment-drivers/earnings/comparison', methods=['GET'])
@jwt_required()
@client_or_admin_required
def get_cost_comparison():
    """Compara custo de entregadores próprios vs plataforma"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        # Buscar restaurante
        if user.user_type == UserType.CLIENT:
            customer = Customer.query.filter_by(user_id=user.id).first()
            if not customer:
                return jsonify({'error': 'Cliente não encontrado'}), 404
            restaurant = Restaurant.query.filter_by(name=customer.name).first()
        else:
            restaurant_id = request.args.get('restaurant_id')
            restaurant = Restaurant.query.get(restaurant_id) if restaurant_id else None
        
        if not restaurant:
            return jsonify({'error': 'Restaurante não encontrado'}), 404
        
        # Parâmetros
        period = request.args.get('period', 'month')  # week, month
        from datetime import timedelta
        
        if period == 'week':
            start_date = datetime.utcnow() - timedelta(days=7)
        else:
            start_date = datetime.utcnow() - timedelta(days=30)
        
        # Entregas próprias
        own_orders = Order.query.filter(
            Order.restaurant_id == restaurant.id,
            Order.assigned_to_own_driver == True,
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= start_date
        ).all()
        
        # Entregas da plataforma
        platform_orders = Order.query.filter(
            Order.restaurant_id == restaurant.id,
            Order.assigned_to_own_driver == False,
            Order.called_platform == True,
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= start_date
        ).all()
        
        # Cálculos
        own_count = len(own_orders)
        own_total_fee = sum(float(o.delivery_fee or 0) for o in own_orders)
        own_total_earning = sum(float(e.driver_earning) for e in 
            OwnDriverEarning.query.filter(
                OwnDriverEarning.restaurant_id == restaurant.id,
                OwnDriverEarning.created_at >= start_date
            ).all())
        
        platform_count = len(platform_orders)
        platform_total_fee = sum(float(o.delivery_fee or 0) for o in platform_orders)
        
        # Economia (se tivesse usado plataforma para as próprias)
        platform_avg_fee = platform_total_fee / platform_count if platform_count > 0 else 0
        estimated_platform_cost = own_count * platform_avg_fee
        savings = estimated_platform_cost - own_total_earning if estimated_platform_cost > 0 else 0
        
        return jsonify({
            'period': period,
            'own_drivers': {
                'deliveries': own_count,
                'total_delivery_fee': own_total_fee,
                'total_earning': own_total_earning,
                'avg_cost_per_delivery': own_total_earning / own_count if own_count > 0 else 0
            },
            'platform': {
                'deliveries': platform_count,
                'total_delivery_fee': platform_total_fee,
                'avg_cost_per_delivery': platform_avg_fee
            },
            'savings': {
                'estimated_savings': savings,
                'savings_percentage': (savings / estimated_platform_cost * 100) if estimated_platform_cost > 0 else 0
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/establishment-drivers/metrics', methods=['GET'])
@client_or_admin_required
def get_own_driver_metrics():
    """Retorna métricas de desempenho dos entregadores próprios"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        # Buscar restaurante
        if user.user_type == UserType.CLIENT:
            customer = Customer.query.filter_by(user_id=user.id).first()
            if not customer:
                return jsonify({'error': 'Cliente não encontrado'}), 404
            restaurant = Restaurant.query.filter_by(name=customer.name).first()
        else:
            restaurant_id = request.args.get('restaurant_id')
            restaurant = Restaurant.query.get(restaurant_id) if restaurant_id else None

        if not restaurant:
            return jsonify({'error': 'Restaurante não encontrado'}), 404

        # Parâmetros
        period = request.args.get('period', 'month')
        driver_id = request.args.get('driver_id')
        from datetime import timedelta

        if period == 'week':
            start_date = datetime.utcnow() - timedelta(days=7)
        else:
            start_date = datetime.utcnow() - timedelta(days=30)

        # Buscar entregadores próprios
        drivers_query = EstablishmentDriver.query.filter_by(
            restaurant_id=restaurant.id, is_active=True
        )
        if driver_id:
            drivers_query = drivers_query.filter_by(id=int(driver_id))
        drivers = drivers_query.all()

        metrics = []
        for driver in drivers:
            # Pedidos atribuídos no período
            orders = Order.query.filter(
                Order.establishment_driver_id == driver.id,
                Order.created_at >= start_date
            ).all()

            delivered = [o for o in orders if o.status == OrderStatus.DELIVERED]
            cancelled = [o for o in orders if o.status == OrderStatus.CANCELLED]
            total = len(orders)

            # Tempos de entrega (accepted -> delivered)
            delivery_times = []
            for o in delivered:
                if o.accepted_at and o.delivery_time:
                    diff = (o.delivery_time - o.accepted_at).total_seconds() / 60
                    delivery_times.append(diff)

            avg_delivery_time = sum(delivery_times) / len(delivery_times) if delivery_times else 0

            # Ganhos no período
            earnings = OwnDriverEarning.query.filter(
                OwnDriverEarning.establishment_driver_id == driver.id,
                OwnDriverEarning.created_at >= start_date
            ).all()
            total_earning = sum(float(e.driver_earning) for e in earnings)
            total_paid = sum(float(e.driver_earning) for e in earnings if e.is_paid)
            total_pending = total_earning - total_paid

            # Avaliações
            ratings = Delivery.customer_rating.join(Order).filter(
                Order.establishment_driver_id == driver.id,
                Delivery.customer_rating.isnot(None),
                Order.created_at >= start_date
            ).all() if False else []  # Fallback simples

            metrics.append({
                'driver': driver.to_dict(),
                'period': period,
                'orders': {
                    'total': total,
                    'delivered': len(delivered),
                    'cancelled': len(cancelled),
                    'acceptance_rate': round((len(delivered) / total * 100) if total > 0 else 0, 1)
                },
                'delivery_time': {
                    'avg_minutes': round(avg_delivery_time, 1),
                    'min_minutes': round(min(delivery_times), 1) if delivery_times else 0,
                    'max_minutes': round(max(delivery_times), 1) if delivery_times else 0
                },
                'financial': {
                    'total_earning': total_earning,
                    'total_paid': total_paid,
                    'total_pending': total_pending,
                    'avg_per_delivery': round(total_earning / len(delivered), 2) if delivered else 0
                },
                'rating': {
                    'average': float(driver.rating) if driver.rating else 5.0,
                    'total_ratings': driver.total_ratings or 0
                }
            })

        # Resumo geral
        total_deliveries = sum(m['orders']['delivered'] for m in metrics)
        total_earning_all = sum(m['financial']['total_earning'] for m in metrics)
        avg_time_all = sum(m['delivery_time']['avg_minutes'] for m in metrics) / len(metrics) if metrics else 0

        return jsonify({
            'drivers': metrics,
            'summary': {
                'total_drivers': len(drivers),
                'total_deliveries': total_deliveries,
                'total_earning': total_earning_all,
                'avg_delivery_time': round(avg_time_all, 1)
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
