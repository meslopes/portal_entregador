# ============================================================
# ÍNDICE DO ARQUIVO admin.py
# ============================================================
# Este arquivo contém TODAS as rotas administrativas do sistema.
# Use este índice para localizar rapidamente cada seção.
#
# 1. UTILITÁRIOS (linhas 34-50)
#    - get_square_filter(), admin_required decorator
#
# 2. PEDIDOS - PROCESSAMENTO (linhas 101-134)
#    - POST /process-scheduled
#
# 3. USUÁRIOS - APROVAÇÃO (linhas 135-398)
#    - GET  /pending-users
#    - POST /users/<id>/approve
#    - POST /users/<id>/reject
#
# 4. USUÁRIOS - CRUD (linhas 399-1127)
#    - GET    /users (listar todos)
#    - GET    /users/<id> (detalhes)
#    - PUT    /users/<id> (editar)
#    - POST   /users/<id>/reset-password
#    - DELETE /users/<id>
#    - POST   /create-admin
#
# 5. DASHBOARD (linhas 1128-1333)
#    - GET /dashboard
#
# 6. PEDIDOS - ADMIN (linhas 1334-1582)
#    - PUT    /orders/<id> (editar)
#    - DELETE /orders/<id>
#
# 7. ENTREGADORES PLATAFORMA (linhas 1583-2245)
#    - GET    /drivers (listar)
#    - GET    /drivers/<id> (detalhes)
#    - POST   /drivers (criar)
#    - PUT    /drivers/<id> (editar)
#    - POST   /drivers/<id>/convert-to-own
#    - PUT    /drivers/<id>/status
#
# 8. PEDIDOS - LISTAGEM (linhas 2246-2567)
#    - GET  /orders (listar)
#    - POST /orders/<id>/assign
#
# 9. FINANCEIRO - DASHBOARD (linhas 2568-3094)
#    - GET /reports/earnings
#    - GET /finance
#    - GET /finance/establishments
#
# 10. MAPA AO VIVO (linhas 3095-3422)
#     - GET /live-tracking
#
# 11. ESTABELECIMENTOS (linhas 3423-4281)
#     - GET    /establishments (listar)
#     - GET    /establishments/<id> (detalhes)
#     - POST   /establishments (criar)
#     - PUT    /establishments/<id> (editar)
#     - POST   /establishments/geocode
#     - POST   /establishments/<id>/geocode
#     - DELETE /establishments/<id>
#
# 12. RELATÓRIOS (linhas 4282-5207)
#     - GET /reports/orders-by-date
#     - GET /reports/drivers-performance
#     - GET /reports/establishments-ranking
#     - GET /reports/financial-summary
#     - GET /reports/cancellations
#     - GET /reports/ratings
#     - GET /reports/peak-hours
#     - GET /reports/deliveries-by-driver
#
# 13. CONFIGURAÇÕES (linhas 5208-5319)
#     - GET /settings
#     - PUT /settings
#
# 14. TENANT - CONFIGURAÇÕES (linhas 5320-5511)
#     - GET /tenant/settings
#     - PUT /tenant/settings
#
# 15. TABELAS DE PREÇO (linhas 5512-5877)
#     - GET    /pricing-tables
#     - POST   /pricing-tables
#     - GET    /pricing-tables/<id>
#     - PUT    /pricing-tables/<id>
#     - DELETE /pricing-tables/<id>
#
# 16. PREÇOS DINÂMICOS (linhas 5878-6123)
#     - GET    /dynamic-pricing
#     - POST   /dynamic-pricing
#     - PUT    /dynamic-pricing/<id>
#     - DELETE /dynamic-pricing/<id>
#
# 17. TENANT - LOGO (linhas 6124-6227)
#     - POST /tenant/logo
#
# 18. TENANTS - CRUD (linhas 6228-6353)
#     - POST /tenants
#     - GET  /tenants
#
# 19. PRAÇAS (linhas 6354-6668)
#     - GET    /squares
#     - POST   /squares
#     - PUT    /squares/<id>
#     - DELETE /squares/<id>
#     - PUT    /squares/<id>/toggle-active
#
# 20. PAGAMENTOS DE ENTREGADORES (linhas 6669-6867)
#     - GET  /driver-payments
#     - POST /driver-payments/<id>/pay
#
# 21. FATURAS E COBRANÇA (linhas 6868-8187)
#     - POST /invoices/<id>/generate
#     - GET  /withdrawals
#     - POST /withdrawals/<id>/process
#     - GET  /invoices
#     - POST /invoices/generate
#     - POST /invoices/<id>/pay
#     - GET  /asaas/config
#     - PUT  /asaas/config
#     - POST /asaas/test
#     - POST /invoices/generate-auto
#     - POST /invoices/<id>/charge
#     - POST /invoices/<id>/send-link
#     - POST /withdrawals/<id>/process-auto
#
# 22. CREDENCIAIS DE PLATAFORMA (linhas 8304-8549)
#     - GET    /platform-credentials
#     - POST   /platform-credentials
#     - DELETE /platform-credentials/<id>
#     - POST   /platform-credentials/<id>/test
#
# 23. ENTREGADORES PRÓPRIOS (linhas 8550-10000+)
#     - GET    /establishment-drivers
#     - POST   /establishment-drivers
#     - PUT    /establishment-drivers/<id>
#     - DELETE /establishment-drivers/<id>
#     - PUT    /establishment-drivers/<id>/toggle-online
#     - GET    /establishment-drivers/payment-config
#     - PUT    /establishment-drivers/payment-config
#     - GET    /establishment-drivers/earnings
#     - POST   /establishment-drivers/earnings/<id>/pay
#     - POST   /establishment-drivers/earnings/pay-all
#     - GET    /establishment-drivers/earnings/comparison
#     - GET    /establishment-drivers/metrics
#
# 24. MAPA DE DADOS (linhas 10000+)
#     - GET /database-map
#
# ============================================================

import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

logger = logging.getLogger(__name__)



from datetime import datetime, timedelta, timezone

from sqlalchemy import func, or_

from src.models.portal_models import (
    Address,
    Customer,
    Delivery,
    Driver,
    DriverRestaurant,
    EstablishmentDriver,
    Notification,
    NotificationType,
    Order,
    OrderStatus,
    OwnDriverEarning,
    OwnDriverRoute,
    Payment,
    PaymentMethod,
    PaymentStatus,
    PlatformCredential,
    Restaurant,
    Tenant,
    User,
    UserStatus,
    UserType,
    db,
)
from src.utils.tenant import get_current_tenant_id, get_current_user

admin_bp = Blueprint('admin', __name__)


def get_square_filter():
    """Retorna o square_id do query param se fornecido."""
    from flask import request
    return request.args.get('square_id', type=int)





import contextlib

from src.utils.restaurant import find_restaurant_by_name


def soft_delete_user(user_id, admin_id=None):
    """Marca um usuário como excluído (soft delete) em vez de deletar permanentemente"""
    from datetime import datetime, timezone
    user = User.query.get(user_id)
    if not user:
        return False
    user.deleted_at = datetime.now(timezone.utc)
    user.deleted_by = admin_id
    db.session.commit()
    return True


def get_deleted_users_query(tenant_id=None, user_type=None, days=None):
    """Retorna query de usuários excluídos com filtros"""
    from datetime import datetime, timedelta, timezone
    query = User.query.filter(User.deleted_at.isnot(None))

    if tenant_id:
        query = query.filter(User.tenant_id == tenant_id)
    if user_type:
        query = query.filter(User.user_type == UserType(user_type))
    if days:
        cutoff = datetime.now(timezone.utc) - timedelta(days=int(days))
        query = query.filter(User.deleted_at <= cutoff)

    return query.order_by(User.deleted_at.desc())




def admin_required(f):

    """Decorator para verificar se o usuário é admin"""

    from functools import wraps

    @wraps(f)

    def decorated_function(*args, **kwargs):

        user_id = int(get_jwt_identity())

        user = User.query.get(user_id)

        if not user or user.user_type != UserType.ADMIN:

            return jsonify({'error': 'Acesso restrito a administradores'}), 403

        # Verificar status do usuário e do tenant
        from src.utils.tenant import check_user_and_tenant_status
        block = check_user_and_tenant_status(user)
        if block:
            return block

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

        # Verificar status do usuário e do tenant
        from src.utils.tenant import check_user_and_tenant_status
        block = check_user_and_tenant_status(user)
        if block:
            return block

        return f(*args, **kwargs)

    return decorated_function





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

        square_id = request.args.get('square_id', type=int)

        tenant_id = get_current_tenant_id()



        query = Order.query



        # Filtrar por tenant

        if tenant_id:

            query = query.filter(Order.tenant_id == tenant_id)

        # Filtrar por praça

        if square_id:

            query = query.filter(Order.square_id == square_id)



        # Filtros

        if status_filter:

            try:

                status_enum = OrderStatus(status_filter)

                query = query.filter(Order.status == status_enum)

            except ValueError:

                pass



        if date_from:

            try:

                query = query.filter(Order.created_at >= datetime.strptime(date_from, '%Y-%m-%d'))

            except ValueError:

                return jsonify({'error': 'Formato de data_from inválido. Use YYYY-MM-DD'}), 400



        if date_to:

            try:

                # Incluir todo o dia final (até 23:59:59)
                end_date = datetime.strptime(date_to, '%Y-%m-%d') + timedelta(days=1)
                query = query.filter(Order.created_at < end_date)

            except ValueError:

                return jsonify({'error': 'Formato de data_to inválido. Use YYYY-MM-DD'}), 400



        orders = query.order_by(Order.created_at.desc()).paginate(

            page=page, per_page=per_page, error_out=False

        )



        orders_data = []

        for order in orders.items:

            order_dict = order.to_dict()

            order_dict['restaurant'] = order.restaurant.to_dict() if order.restaurant else None

            order_dict['customer'] = order.customer.to_dict() if order.customer else None

            order_dict['delivery_address'] = order.delivery_address.to_dict() if order.delivery_address else None



            if order.driver:

                order_dict['driver'] = {

                    'id': order.driver.id,

                    'name': f"{order.driver.user.first_name} {order.driver.user.last_name}" if order.driver.user else 'N/A',

                    'phone': order.driver.user.phone if order.driver.user else None

                }

            # Incluir informações da rota se o pedido estiver em uma rota
            if order.own_driver_route_id:
                own_route = OwnDriverRoute.query.get(order.own_driver_route_id)
                if own_route:
                    order_dict['own_driver_route'] = {
                        'id': own_route.id,
                        'name': f'Rota #{own_route.id}',
                        'status': own_route.status
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

        order.updated_at = datetime.now(timezone.utc)



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

            existing.updated_at = datetime.now(timezone.utc)

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

                cred.expires_at = datetime.now(timezone.utc) + timedelta(seconds=result.get('expires_in', 3600))

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

        # Verificação de ownership: CLIENT só pode ver drivers do seu próprio restaurante
        current_user = get_current_user()
        if current_user and current_user.user_type == UserType.CLIENT:
            from src.utils.restaurant import find_restaurant_by_name
            customer = Customer.query.filter_by(user_id=current_user.id).first()
            if customer:
                user_restaurant = find_restaurant_by_name(customer.name)
                if user_restaurant and int(restaurant_id) != user_restaurant.id:
                    return jsonify({'error': 'Acesso negado: você só pode ver entregadores do seu próprio estabelecimento'}), 403

        drivers = EstablishmentDriver.query.filter_by(

            restaurant_id=int(restaurant_id),

            is_active=True

        ).all()



        return jsonify({'drivers': [d.to_dict() for d in drivers]}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500


@admin_bp.route('/establishment/orders', methods=['GET'])
@jwt_required()
@client_or_admin_required
def get_establishment_orders():
    """Lista pedidos do estabelecimento (para CLIENT e ADMIN)"""
    try:
        restaurant_id = request.args.get('restaurant_id')
        status_filter = request.args.get('status', '')

        if not restaurant_id:
            return jsonify({'error': 'restaurant_id é obrigatório'}), 400

        query = Order.query.filter_by(restaurant_id=int(restaurant_id))

        # Filtrar por status se fornecido
        if status_filter:
            statuses = [s.strip().upper() for s in status_filter.split(',')]
            status_enums = []
            for s in statuses:
                with contextlib.suppress(KeyError):
                    status_enums.append(OrderStatus[s])
            if status_enums:
                query = query.filter(Order.status.in_(status_enums))

        # Excluir pedidos que já estão em rotas ativas (CREATED, PENDING, ACTIVE)
        # Incluir pedidos sem rota (NULL) OU com rota não ativa
        active_route_ids = db.session.query(OwnDriverRoute.id).filter(
            OwnDriverRoute.status.in_(['CREATED', 'PENDING', 'ACTIVE'])
        )
        query = query.filter(
            or_(
                Order.own_driver_route_id.is_(None),
                ~Order.own_driver_route_id.in_(active_route_ids)
            )
        )

        orders = query.order_by(Order.created_at.desc()).limit(100).all()

        # Carregar relacionamentos
        result = []
        for order in orders:
            order_dict = order.to_dict()
            # Adicionar informações do cliente
            if order.customer:
                order_dict['customer'] = {
                    'id': order.customer.id,
                    'name': order.customer.name,
                    'phone': order.customer.phone
                }
            # Adicionar endereço de entrega
            if order.delivery_address:
                order_dict['delivery_address'] = {
                    'street': order.delivery_address.street,
                    'neighborhood': order.delivery_address.neighborhood,
                    'city': order.delivery_address.city,
                    'state': order.delivery_address.state,
                    'latitude': float(order.delivery_address.latitude) if order.delivery_address.latitude else None,
                    'longitude': float(order.delivery_address.longitude) if order.delivery_address.longitude else None
                }
            # Adicionar informações do entregador da plataforma
            if order.driver_id:
                driver = Driver.query.get(order.driver_id)
                if driver:
                    order_dict['driver'] = {
                        'id': driver.id,
                        'name': f"{driver.user.first_name} {driver.user.last_name}" if driver.user else 'N/A',
                        'phone': driver.user.phone if driver.user else None
                    }
            result.append(order_dict)

        return jsonify({
            'orders': result,
            'total': len(result)
        }), 200

    except Exception as e:
        logger.error(f"Erro ao listar pedidos do estabelecimento: {e}")
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

        # Verificação de ownership: CLIENT só pode criar drivers no seu próprio restaurante
        current_user = get_current_user()
        if current_user and current_user.user_type == UserType.CLIENT:
            from src.utils.restaurant import find_restaurant_by_name
            customer = Customer.query.filter_by(user_id=current_user.id).first()
            if customer:
                user_restaurant = find_restaurant_by_name(customer.name)
                if user_restaurant and int(data['restaurant_id']) != user_restaurant.id:
                    return jsonify({'error': 'Acesso negado: você só pode cadastrar entregadores no seu próprio estabelecimento'}), 403

        driver = EstablishmentDriver(

            restaurant_id=data['restaurant_id'],

            name=data['name'],

            phone=data.get('phone'),

            vehicle_type=data.get('vehicle_type', 'MOTO'),

            vehicle_plate=data.get('vehicle_plate'),

            vehicle_model=data.get('vehicle_model'),

            payment_frequency=data.get('payment_frequency', 'WEEKLY'),

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

        # Verificação de ownership: CLIENT só pode editar drivers do seu próprio restaurante
        current_user = get_current_user()
        if current_user and current_user.user_type == UserType.CLIENT:
            from src.utils.restaurant import find_restaurant_by_name
            customer = Customer.query.filter_by(user_id=current_user.id).first()
            if customer:
                user_restaurant = find_restaurant_by_name(customer.name)
                if user_restaurant and driver.restaurant_id != user_restaurant.id:
                    return jsonify({'error': 'Acesso negado: você só pode editar entregadores do seu próprio estabelecimento'}), 403

        data = request.get_json()

        if 'name' in data:

            driver.name = data['name']

        if 'phone' in data:

            driver.phone = data['phone']

        if 'vehicle_type' in data:

            # Mapear valores legados e normalizar
            vt = data['vehicle_type'].upper().strip()
            vehicle_map = {'MOTO': 'MOTORCYCLE', 'MOTORCYCLE': 'MOTORCYCLE', 'CAR': 'CAR', 'BICYCLE': 'BICYCLE', 'BIKE': 'BICYCLE', 'FOOT': 'FOOT'}
            vt = vehicle_map.get(vt, vt)
            if vt not in ('CAR', 'MOTORCYCLE', 'BICYCLE', 'FOOT'):
                return jsonify({'error': 'Tipo de veículo inválido'}), 400
            driver.vehicle_type = vt

        if 'vehicle_plate' in data:

            driver.vehicle_plate = data['vehicle_plate']

        if 'vehicle_model' in data:

            driver.vehicle_model = data['vehicle_model']

        if 'payment_frequency' in data:

            driver.payment_frequency = data['payment_frequency']

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

        # Verificação de ownership: CLIENT só pode deletar drivers do seu próprio restaurante
        current_user = get_current_user()
        if current_user and current_user.user_type == UserType.CLIENT:
            from src.utils.restaurant import find_restaurant_by_name
            customer = Customer.query.filter_by(user_id=current_user.id).first()
            if customer:
                user_restaurant = find_restaurant_by_name(customer.name)
                if user_restaurant and driver.restaurant_id != user_restaurant.id:
                    return jsonify({'error': 'Acesso negado: você só pode remover entregadores do seu próprio estabelecimento'}), 403

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

            restaurant = find_restaurant_by_name(customer.name)

        else:

            restaurant_id = request.args.get('restaurant_id')

            restaurant = Restaurant.query.get(restaurant_id) if restaurant_id else None



        if not restaurant:

            return jsonify({'error': 'Restaurante não encontrado'}), 404



        return jsonify({

            'payment_type': restaurant.own_driver_payment_type or 'PER_DELIVERY',

            'fixed_value': float(restaurant.own_driver_fixed_value) if restaurant.own_driver_fixed_value else 5.00,

            'km_value': float(restaurant.own_driver_km_value) if restaurant.own_driver_km_value else 1.50,

            'percentage': float(restaurant.own_driver_percentage) if restaurant.own_driver_percentage else 70.0,

            'delivery_value': float(restaurant.own_driver_delivery_value) if restaurant.own_driver_delivery_value else 3.00,

            'max_deliveries': restaurant.own_driver_max_deliveries or 10

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

            restaurant = find_restaurant_by_name(customer.name)

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

        if 'delivery_value' in data:

            restaurant.own_driver_delivery_value = data['delivery_value']

        if 'max_deliveries' in data:

            restaurant.own_driver_max_deliveries = data['max_deliveries']



        db.session.commit()



        return jsonify({

            'message': 'Configuração atualizada',

            'payment_type': restaurant.own_driver_payment_type,

            'fixed_value': float(restaurant.own_driver_fixed_value) if restaurant.own_driver_fixed_value else 5.00,

            'km_value': float(restaurant.own_driver_km_value) if restaurant.own_driver_km_value else 1.50,

            'percentage': float(restaurant.own_driver_percentage) if restaurant.own_driver_percentage else 70.0,

            'delivery_value': float(restaurant.own_driver_delivery_value) if restaurant.own_driver_delivery_value else 3.00,

            'max_deliveries': restaurant.own_driver_max_deliveries or 10

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

            restaurant = find_restaurant_by_name(customer.name)

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

            week_ago = datetime.now(timezone.utc) - timedelta(days=7)

            query = query.filter(OwnDriverEarning.created_at >= week_ago)

        elif period == 'month':

            from datetime import timedelta

            month_ago = datetime.now(timezone.utc) - timedelta(days=30)

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

        earning.paid_at = datetime.now(timezone.utc)

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

            restaurant = find_restaurant_by_name(customer.name)

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

            earning.paid_at = datetime.now(timezone.utc)

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

            restaurant = find_restaurant_by_name(customer.name)

        else:

            restaurant_id = request.args.get('restaurant_id')

            restaurant = Restaurant.query.get(restaurant_id) if restaurant_id else None



        if not restaurant:

            return jsonify({'error': 'Restaurante não encontrado'}), 404



        # Parâmetros

        period = request.args.get('period', 'month')  # week, month

        from datetime import timedelta



        if period == 'week':

            start_date = datetime.now(timezone.utc) - timedelta(days=7)

        else:

            start_date = datetime.now(timezone.utc) - timedelta(days=30)



        # Entregas próprias

        own_orders = Order.query.filter(

            Order.restaurant_id == restaurant.id,

            Order.assigned_to_own_driver,

            Order.status == OrderStatus.DELIVERED,

            Order.created_at >= start_date

        ).all()



        # Entregas da plataforma

        platform_orders = Order.query.filter(

            Order.restaurant_id == restaurant.id,

            not Order.assigned_to_own_driver,

            Order.called_platform,

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

            restaurant = find_restaurant_by_name(customer.name)

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

            start_date = datetime.now(timezone.utc) - timedelta(days=7)

        else:

            start_date = datetime.now(timezone.utc) - timedelta(days=30)



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

            Delivery.customer_rating.join(Order).filter(

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


# ============================================
# ENDPOINT TEMPORARIO: LIMPEZA DE CLIENTS/DRIVERS
# ============================================

@admin_bp.route('/cleanup-clients-drivers', methods=['DELETE'])
@jwt_required()
@admin_required
def cleanup_clients_drivers():
    try:
        # Deletar na ordem correta para respeitar foreign keys
        # 1. Tabelas sem dependencias diretas
        db.session.execute(db.text("DELETE FROM deliveries"))
        db.session.execute(db.text("DELETE FROM payments"))
        db.session.execute(db.text("DELETE FROM notifications"))
        db.session.execute(db.text("DELETE FROM own_driver_earnings"))
        db.session.execute(db.text("DELETE FROM driver_restaurants"))
        db.session.execute(db.text("DELETE FROM platform_credentials"))
        db.session.execute(db.text("DELETE FROM establishment_drivers"))
        db.session.execute(db.text("DELETE FROM invoices"))

        # 2. Orders (referencia restaurants, customers, addresses)
        db.session.execute(db.text("DELETE FROM orders"))

        # 3. Addresses (referencia customers)
        db.session.execute(db.text("DELETE FROM addresses"))

        # 4. Customers e Drivers (referenciam users)
        db.session.execute(db.text("DELETE FROM customers"))
        db.session.execute(db.text("DELETE FROM drivers"))

        # 5. Users que nao sao admins
        result = db.session.execute(db.text("DELETE FROM users WHERE user_type != 'ADMIN'"))
        deleted_count = result.rowcount

        db.session.commit()

        return jsonify({
            'message': 'Limpeza concluida com sucesso',
            'users_deleted': deleted_count,
            'note': 'Todos os CLIENTs e DRIVERs foram removidos. Apenas ADMINs permanecem.'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/database-map', methods=['GET'])
@jwt_required()
@admin_required
def database_map():
    """Retorna mapa completo de todos os cadastros e relacionamentos"""
    try:
        result = {}

        # Tenants
        tenants = Tenant.query.order_by(Tenant.id).all()
        result['tenants'] = [{'id': t.id, 'name': t.name, 'slug': t.slug, 'plan': t.plan, 'is_active': t.is_active} for t in tenants]

        # Squares
        from src.models.portal_models import Square
        squares = Square.query.order_by(Square.id).all()
        result['squares'] = [{'id': s.id, 'name': s.name, 'city': s.city, 'state': s.state, 'tenant_id': s.tenant_id, 'is_active': s.is_active} for s in squares]

        # Users (limitar a 500 para performance)
        users = User.query.order_by(User.id).limit(500).all()
        result['users'] = []
        for u in users:
            user_data = {
                'id': u.id, 'email': u.email, 'first_name': u.first_name, 'last_name': u.last_name,
                'user_type': u.user_type.value if u.user_type else None,
                'status': u.status.value if u.status else None,
                'tenant_id': u.tenant_id, 'phone': u.phone, 'cpf': u.cpf,
                'birth_date': u.birth_date.isoformat() if u.birth_date else None,
                'square_id': None, 'square_name': None, 'linked_name': None,
                # Driver fields
                'driver_id': None, 'vehicle_type': None, 'vehicle_plate': None,
                'vehicle_model': None, 'vehicle_year': None, 'driver_license': None,
                'pix_key': None, 'bank_account': None, 'max_concurrent_orders': None,
                'is_online': None, 'is_blocked': None, 'rating': None, 'total_deliveries': None,
                # Client fields
                'customer_id': None, 'restaurant_id': None, 'restaurant_name': None
            }
            # DRIVER: todos os campos do driver
            if u.user_type and u.user_type.value == 'DRIVER' and u.driver:
                d = u.driver
                user_data['driver_id'] = d.id
                user_data['vehicle_type'] = d.vehicle_type.value if d.vehicle_type else None
                user_data['vehicle_plate'] = d.vehicle_plate
                user_data['vehicle_model'] = d.vehicle_model
                user_data['vehicle_year'] = d.vehicle_year
                user_data['driver_license'] = d.driver_license
                user_data['pix_key'] = d.pix_key
                user_data['bank_account'] = d.bank_account
                user_data['max_concurrent_orders'] = d.max_concurrent_orders
                user_data['is_online'] = d.is_online
                user_data['is_blocked'] = d.is_blocked
                user_data['rating'] = float(d.rating) if d.rating else None
                user_data['total_deliveries'] = d.total_deliveries
                user_data['square_id'] = d.square_id
                if d.square_id:
                    sq = Square.query.get(d.square_id)
                    if sq: user_data['square_name'] = sq.name
            # CLIENT: campos do customer + restaurante
            elif u.user_type and u.user_type.value == 'CLIENT':
                cust = Customer.query.filter_by(user_id=u.id).first()
                if cust:
                    user_data['customer_id'] = cust.id
                    user_data['linked_name'] = cust.name
                    rest = Restaurant.query.filter_by(name=cust.name).first()
                    if rest:
                        user_data['restaurant_id'] = rest.id
                        user_data['restaurant_name'] = rest.name
                        user_data['square_id'] = rest.square_id
                        if rest.square_id:
                            sq = Square.query.get(rest.square_id)
                            if sq: user_data['square_name'] = sq.name
            result['users'].append(user_data)

        # Restaurants (limitar a 200)
        restaurants = Restaurant.query.order_by(Restaurant.id).limit(200).all()
        result['restaurants'] = [{'id': r.id, 'name': r.name, 'address': r.address, 'tenant_id': r.tenant_id, 'square_id': r.square_id, 'has_own_drivers': r.has_own_drivers, 'is_active': r.is_active} for r in restaurants]

        # Customers (limitar a 500)
        customers = Customer.query.order_by(Customer.id).all()
        result['customers'] = [{'id': c.id, 'name': c.name, 'phone': c.phone, 'user_id': c.user_id, 'tenant_id': c.tenant_id} for c in customers]

        # Platform Drivers
        drivers = Driver.query.order_by(Driver.id).all()
        drivers_data = []
        for d in drivers:
            user = User.query.get(d.user_id) if d.user_id else None
            drivers_data.append({'id': d.id, 'user_id': d.user_id, 'name': f"{user.first_name} {user.last_name}" if user else 'SEM USER', 'email': user.email if user else None, 'vehicle_type': d.vehicle_type.value if d.vehicle_type else None, 'vehicle_plate': d.vehicle_plate, 'square_id': d.square_id, 'tenant_id': d.tenant_id, 'is_online': d.is_online, 'is_blocked': d.is_blocked, 'total_deliveries': d.total_deliveries, 'rating': float(d.rating) if d.rating else None})
        result['platform_drivers'] = drivers_data

        # Own Drivers
        own_drivers = EstablishmentDriver.query.order_by(EstablishmentDriver.id).all()
        result['own_drivers'] = []
        for od in own_drivers:
            restaurant = Restaurant.query.get(od.restaurant_id)
            square = restaurant.square if restaurant else None
            result['own_drivers'].append({'id': od.id, 'name': od.name, 'phone': od.phone, 'vehicle_type': od.vehicle_type, 'vehicle_plate': od.vehicle_plate, 'restaurant_id': od.restaurant_id, 'restaurant_name': restaurant.name if restaurant else None, 'square_id': restaurant.square_id if restaurant else None, 'square_name': square.name if square else None, 'tenant_id': restaurant.tenant_id if restaurant else None, 'is_online': od.is_online, 'is_active': od.is_active, 'has_pin': bool(od.pin_hash), 'total_deliveries': od.total_deliveries})

        # Orders summary
        from sqlalchemy import func as sqlfunc
        order_stats = db.session.query(Order.status, sqlfunc.count(Order.id)).group_by(Order.status).all()
        result['order_summary'] = [{'status': s[0].value if hasattr(s[0], 'value') else str(s[0]), 'count': s[1]} for s in order_stats]

        # Last 15 orders
        last_orders = Order.query.order_by(Order.id.desc()).limit(15).all()
        result['recent_orders'] = []
        for o in last_orders:
            restaurant = Restaurant.query.get(o.restaurant_id)
            customer = Customer.query.get(o.customer_id)
            if o.assigned_to_own_driver:
                driver_type = 'OWN'
                est_driver = EstablishmentDriver.query.get(o.establishment_driver_id) if o.establishment_driver_id else None
                driver_name = est_driver.name if est_driver else None
            elif o.driver_id:
                driver_type = 'PLATFORM'
                drv = Driver.query.get(o.driver_id)
                usr = User.query.get(drv.user_id) if drv else None
                driver_name = f"{usr.first_name} {usr.last_name}" if usr else None
            else:
                driver_type = 'NONE'
                driver_name = None
            result['recent_orders'].append({'id': o.id, 'order_number': o.order_number, 'status': o.status.value if o.status else None, 'restaurant_name': restaurant.name if restaurant else None, 'customer_name': customer.name if customer else None, 'driver_type': driver_type, 'driver_name': driver_name, 'created_at': o.created_at.isoformat() if o.created_at else None})

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/database-restore', methods=['POST'])
@jwt_required()
@admin_required
def database_restore():
    """Restaura dados de um backup JSON (cria/atualiza tenants, squares, users, restaurants)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados de backup não fornecidos'}), 400

        results = {'created': 0, 'updated': 0, 'errors': []}

        # Restaurar Tenants
        for t in data.get('tenants', []):
            existing = Tenant.query.get(t['id']) or Tenant.query.filter_by(slug=t.get('slug')).first()
            if existing:
                existing.name = t.get('name', existing.name)
                existing.is_active = t.get('is_active', existing.is_active)
                results['updated'] += 1
            else:
                tenant = Tenant(id=t['id'], name=t['name'], slug=t['slug'], is_active=t.get('is_active', True))
                db.session.add(tenant)
                results['created'] += 1

        # Restaurar Squares
        from src.models.portal_models import Square
        for s in data.get('squares', []):
            existing = Square.query.get(s['id'])
            if existing:
                existing.name = s.get('name', existing.name)
                existing.city = s.get('city', existing.city)
                existing.state = s.get('state', existing.state)
                existing.tenant_id = s.get('tenant_id', existing.tenant_id)
                existing.is_active = s.get('is_active', existing.is_active)
                results['updated'] += 1
            else:
                square = Square(id=s['id'], name=s['name'], city=s['city'], state=s['state'],
                               tenant_id=s.get('tenant_id'), is_active=s.get('is_active', True))
                db.session.add(square)
                results['created'] += 1

        # Restaurar Users (apenas se não existirem)
        for u in data.get('users', []):
            existing = User.query.filter_by(email=u['email']).first()
            if existing:
                results['updated'] += 1
                continue
            try:
                user = User(
                    id=u['id'], email=u['email'],
                    first_name=u.get('first_name', ''),
                    last_name=u.get('last_name', ''),
                    user_type=UserType(u['user_type']),
                    status=UserStatus(u.get('status', 'ACTIVE')),
                    tenant_id=u.get('tenant_id'),
                    phone=u.get('phone'),
                    cpf=u.get('cpf')
                )
                user.set_password('restore123')  # Senha temporária
                db.session.add(user)
                results['created'] += 1
            except Exception as e:
                results['errors'].append(f"User {u.get('email')}: {str(e)}")

        # Restaurar Restaurants (apenas se não existirem)
        for r in data.get('restaurants', []):
            existing = Restaurant.query.get(r['id'])
            if existing:
                results['updated'] += 1
                continue
            try:
                restaurant = Restaurant(
                    id=r['id'], name=r['name'],
                    address=r.get('address', ''),
                    latitude=-29.95, longitude=-50.45,
                    tenant_id=r.get('tenant_id'),
                    square_id=r.get('square_id'),
                    has_own_drivers=r.get('has_own_drivers', False),
                    is_active=r.get('is_active', True)
                )
                db.session.add(restaurant)
                results['created'] += 1
            except Exception as e:
                results['errors'].append(f"Restaurant {r.get('name')}: {str(e)}")

        db.session.commit()
        return jsonify({
            'message': 'Restauração concluída',
            'created': results['created'],
            'updated': results['updated'],
            'errors': results['errors']
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/restaurants/<int:restaurant_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_restaurant(restaurant_id):
    """Exclui um restaurante"""
    try:
        restaurant = Restaurant.query.get(restaurant_id)
        if not restaurant:
            return jsonify({'error': 'Restaurante nao encontrado'}), 404

        force = request.args.get('force', 'false').lower() == 'true'

        has_orders = Order.query.filter_by(restaurant_id=restaurant_id).first()
        has_drivers = EstablishmentDriver.query.filter_by(restaurant_id=restaurant_id).first()

        if (has_orders or has_drivers) and not force:
            order_count = Order.query.filter_by(restaurant_id=restaurant_id).count()
            drv_count = EstablishmentDriver.query.filter_by(restaurant_id=restaurant_id).count()
            return jsonify({'error': f'Restaurante tem {order_count} pedido(s) e {drv_count} entregador(es) proprio(s)', 'has_data': True, 'suggestion': 'Use ?force=true para desvincular e excluir'}), 400

        if force:
            # Deletar pedidos vinculados (restaurant_id é NOT NULL)
            Order.query.filter_by(restaurant_id=restaurant_id).delete()
            EstablishmentDriver.query.filter_by(restaurant_id=restaurant_id).delete()
            from src.models.portal_models import OwnDriverEarning, PlatformCredential
            OwnDriverEarning.query.filter_by(restaurant_id=restaurant_id).delete()
            PlatformCredential.query.filter_by(restaurant_id=restaurant_id).delete()

        db.session.delete(restaurant)
        db.session.commit()
        return jsonify({'message': 'Restaurante excluido com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/tenants/<int:tenant_id>/toggle-active', methods=['PUT'])
@jwt_required()
@admin_required
def toggle_tenant_active(tenant_id):
    try:
        tenant = Tenant.query.get(tenant_id)
        if not tenant:
            return jsonify({'error': 'Organizacao nao encontrada'}), 404

        data = request.get_json() or {}
        new_status = data.get('is_active')
        if new_status is None:
            new_status = not tenant.is_active

        tenant.is_active = bool(new_status)
        db.session.commit()

        return jsonify({'message': f'Tenant {tenant.name} agora esta ativo={tenant.is_active}', 'tenant': tenant.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/cleanup-test-data', methods=['POST'])
@jwt_required()
@admin_required
def cleanup_test_data():
    """Limpa dados em lotes para evitar timeout."""
    try:
        user = get_current_user()
        if not user or not user.is_super_admin:
            return jsonify({'error': 'Apenas super admin'}), 403

        deleted = {}

        # Deletar em ordem de dependencia (filhos primeiro)
        # Lotes de 5000 para evitar timeout
        batch = 5000

        tables = [
            'own_driver_earnings', 'deliveries', 'payments',
            'driver_scores', 'driver_bonuses', 'driver_achievements',
            'driver_penalties', 'driver_restaurants',
            'orders', 'addresses', 'notifications',
            'platform_credentials', 'invoices',
            'establishment_drivers', 'drivers',
            'customers', 'system_configs', 'dynamic_pricing',
        ]

        for tbl in tables:
            try:
                total = 0
                while True:
                    r = db.session.execute(db.text(f"DELETE FROM {tbl} WHERE id IN (SELECT id FROM {tbl} LIMIT {batch})"))
                    db.session.commit()
                    total += r.rowcount
                    if r.rowcount < batch:
                        break
                deleted[tbl] = total
            except Exception as e:
                db.session.rollback()
                deleted[tbl] = f'erro: {str(e)[:60]}'

        # Users nao-admin
        try:
            r = db.session.execute(db.text("DELETE FROM users WHERE user_type != 'ADMIN'"))
            db.session.commit()
            deleted['non_admin_users'] = r.rowcount
        except Exception as e:
            db.session.rollback()
            deleted['non_admin_users'] = f'erro: {str(e)[:60]}'

        # Restaurantes
        try:
            r = db.session.execute(db.text("DELETE FROM restaurants"))
            db.session.commit()
            deleted['restaurants'] = r.rowcount
        except Exception as e:
            db.session.rollback()
            deleted['restaurants'] = f'erro: {str(e)[:60]}'

        # Tramandai
        try:
            r = db.session.execute(db.text("DELETE FROM squares WHERE city = 'Tramandai'"))
            db.session.commit()
            deleted['tramandai'] = r.rowcount
        except Exception as e:
            db.session.rollback()
            deleted['tramandai'] = f'erro: {str(e)[:60]}'

        return jsonify({'message': 'Limpeza concluida', 'deleted': deleted}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================
# EXPORTAÇÃO CSV (abre no Excel)
# ============================================================

@admin_bp.route('/export/orders', methods=['GET'])
@jwt_required()
@admin_required
def export_orders_csv():
    """Exporta pedidos em formato CSV (abre no Excel)"""
    try:
        import csv
        import io

        from flask import make_response

        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        status = request.args.get('status')

        query = Order.query
        if start_date:
            query = query.filter(Order.created_at >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(Order.created_at <= datetime.fromisoformat(end_date))
        if status:
            query = query.filter(Order.status == OrderStatus(status))

        user = get_current_user()
        if not user.is_super_admin and user.tenant_id:
            query = query.filter(Order.tenant_id == user.tenant_id)

        orders = query.order_by(Order.created_at.desc()).limit(10000).all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            'Numero', 'Status', 'Restaurante', 'Cliente', 'Telefone',
            'Endereco Entrega', 'Bairro', 'Cidade', 'Taxa Entrega',
            'Total', 'Pagamento', 'Entregador', 'Criado em', 'Entregue em'
        ])

        for o in orders:
            writer.writerow([
                o.order_number,
                o.status.value if o.status else '',
                o.restaurant.name if o.restaurant else '',
                o.customer.name if o.customer else '',
                o.customer.phone if o.customer else '',
                o.delivery_address.street if o.delivery_address else '',
                o.delivery_address.neighborhood if o.delivery_address else '',
                o.delivery_address.city if o.delivery_address else '',
                float(o.delivery_fee or 0),
                float(o.total_amount or 0),
                o.payment_method.value if o.payment_method else '',
                f"{o.driver.user.first_name} {o.driver.user.last_name}" if o.driver and o.driver.user else '',
                o.created_at.strftime('%d/%m/%Y %H:%M') if o.created_at else '',
                o.delivery_time.strftime('%d/%m/%Y %H:%M') if o.delivery_time else ''
            ])

        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv; charset=utf-8'
        response.headers['Content-Disposition'] = 'attachment; filename=pedidos.csv'
        return response

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/export/drivers', methods=['GET'])
@jwt_required()
@admin_required
def export_drivers_csv():
    """Exporta entregadores em formato CSV (abre no Excel)"""
    try:
        import csv
        import io

        from flask import make_response

        query = Driver.query.join(User)
        user = get_current_user()
        if not user.is_super_admin and user.tenant_id:
            query = query.filter(Driver.tenant_id == user.tenant_id)

        drivers = query.all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            'ID', 'Nome', 'Telefone', 'Veiculo', 'Placa',
            'Praça', 'Rating', 'Total Entregas', 'Saldo',
            'Status', 'Online', 'Desde'
        ])

        for d in drivers:
            writer.writerow([
                d.id,
                f"{d.user.first_name} {d.user.last_name}" if d.user else '',
                d.user.phone if d.user else '',
                d.vehicle_type.value if d.vehicle_type else '',
                d.vehicle_plate or '',
                d.square.name if d.square else '',
                float(d.rating or 5.0),
                d.total_deliveries,
                float(d.balance or 0),
                d.user.status.value if d.user and d.user.status else '',
                'Sim' if d.is_online else 'Não',
                d.created_at.strftime('%d/%m/%Y') if d.created_at else ''
            ])

        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv; charset=utf-8'
        response.headers['Content-Disposition'] = 'attachment; filename=entregadores.csv'
        return response

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/import/orders', methods=['POST'])
@jwt_required()
@admin_required
def import_orders_csv():
    """Importa pedidos em lote a partir de um arquivo CSV.
    Formato esperado do CSV:
    cliente,telefone,endereco,bairro,cidade,itens,valor_total,taxa_entrega,forma_pagamento
    """
    try:
        import csv
        import io

        if 'file' not in request.files:
            return jsonify({'error': 'Envie um arquivo CSV no campo "file"'}), 400

        file = request.files['file']
        if not file.filename.endswith('.csv'):
            return jsonify({'error': 'Arquivo deve ser .csv'}), 400

        content = file.read().decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(content))

        get_current_user()
        tenant_id = get_current_tenant_id()

        created = 0
        errors = []

        for i, row in enumerate(reader, start=2):
            try:
                customer_name = row.get('cliente', '').strip()
                customer_phone = row.get('telefone', '').strip()
                delivery_address = row.get('endereco', '').strip()

                if not customer_name or not customer_phone or not delivery_address:
                    errors.append(f'Linha {i}: campos obrigatorios ausentes')
                    continue

                customer = Customer.query.filter_by(phone=customer_phone, tenant_id=tenant_id).first()
                if not customer:
                    customer = Customer(name=customer_name, phone=customer_phone, tenant_id=tenant_id)
                    db.session.add(customer)
                    db.session.flush()

                address = Address(
                    customer_id=customer.id,
                    street=delivery_address,
                    neighborhood=row.get('bairro', '').strip(),
                    city=row.get('cidade', '').strip()
                )
                db.session.add(address)
                db.session.flush()

                items_str = row.get('itens', '').strip()
                items = [{'name': items_str, 'quantity': 1}] if items_str else []

                from datetime import datetime as dt
                order = Order(
                    tenant_id=tenant_id,
                    customer_id=customer.id,
                    delivery_address_id=address.id,
                    order_number=f"IMP{dt.now().strftime('%Y%m%d%H%M%S')}{i:04d}",
                    items=items,
                    subtotal=float(row.get('valor_total', 0) or 0),
                    delivery_fee=float(row.get('taxa_entrega', 0) or 0),
                    total_amount=float(row.get('valor_total', 0) or 0) + float(row.get('taxa_entrega', 0) or 0),
                    payment_method=PaymentMethod(row.get('forma_pagamento', 'CASH').strip().upper() or 'CASH'),
                    status=OrderStatus.PENDING
                )
                db.session.add(order)
                created += 1

            except Exception as e:
                errors.append(f'Linha {i}: {str(e)[:80]}')

        db.session.commit()

        return jsonify({
            'message': f'{created} pedidos importados com sucesso',
            'created': created,
            'errors': errors[:20]
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
