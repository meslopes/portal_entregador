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
from flask_jwt_extended import jwt_required

logger = logging.getLogger(__name__)



from datetime import datetime, timedelta, timezone

from sqlalchemy import func

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
    OwnDriverRoute,
    Payment,
    PaymentMethod,
    PaymentStatus,
    PlatformCredential,
    Restaurant,
    Tenant,
    User,
    UserType,
    db,
)
from src.utils.auth import admin_required
from src.utils.tenant import get_current_tenant_id, get_current_user

admin_bp = Blueprint('admin', __name__)


def get_square_filter():
    """Retorna o square_id do query param se fornecido."""
    from flask import request
    return request.args.get('square_id', type=int)


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

            order_dict['restaurant'] = order.restaurant.to_dict(include_sensitive=True) if order.restaurant else None

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

            'restaurant': restaurant.to_dict(include_sensitive=True)

        }), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





# ============================================

# CONFIGURAÇÃO DE PAGAMENTO - ENTREGADORES PRÓPRIOS

# ============================================



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
