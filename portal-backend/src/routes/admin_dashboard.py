"""Módulo admin_dashboard — extraído de src/routes/admin_orders.py no refactor de arquivos grandes.
Movimento puro de código — comportamento idêntico ao original.
"""
import contextlib
import logging
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import and_, func

from src.models.portal_models import (
    Driver,
    Order,
    OrderStatus,
    PaymentMethod,
    User,
    db,
)
from src.routes.admin_finance import get_square_filter
from src.utils.auth import admin_required
from src.utils.tenant import get_current_tenant_id, get_current_user

logger = logging.getLogger(__name__)


admin_dashboard_bp = Blueprint('admin_dashboard', __name__)


@admin_dashboard_bp.route('/process-scheduled', methods=['POST'])

@jwt_required()

@admin_required

def process_scheduled_orders():

    """Processa pedidos agendados que expiraram (converte SCHEDULED para PENDING)"""

    try:

        from src.services.order_helpers import process_scheduled_orders as process_orders

        process_orders()

        return jsonify({'message': 'Pedidos agendados processados com sucesso'}), 200

    except Exception as e:

        return jsonify({'error': str(e)}), 500





# ============================================

# APROVACAO DE CADASTROS

# ============================================



@admin_dashboard_bp.route('/dashboard', methods=['GET'])

@jwt_required()

@admin_required

def get_dashboard():

    """Obtém dados do dashboard administrativo"""

    try:

        tenant_id = get_current_tenant_id()
        square_id = get_square_filter()



        # Estatísticas gerais (filtradas por tenant e square)

        total_drivers_query = Driver.query
        if tenant_id:
            total_drivers_query = total_drivers_query.filter_by(tenant_id=tenant_id)
        if square_id:
            total_drivers_query = total_drivers_query.filter(Driver.square_id == square_id)
        total_drivers = total_drivers_query.count()

        online_drivers_query = Driver.query.filter_by(is_online=True)
        if tenant_id:
            online_drivers_query = online_drivers_query.filter_by(tenant_id=tenant_id)
        if square_id:
            online_drivers_query = online_drivers_query.filter(Driver.square_id == square_id)
        online_drivers = online_drivers_query.count()

        total_orders_query = Order.query
        if tenant_id:
            total_orders_query = total_orders_query.filter_by(tenant_id=tenant_id)
        if square_id:
            total_orders_query = total_orders_query.filter(Order.square_id == square_id)
        total_orders = total_orders_query.count()



        # Pedidos por status (filtrados por tenant e square)

        orders_by_status_query = db.session.query(

            Order.status, func.count(Order.id)

        )

        if tenant_id:

            orders_by_status_query = orders_by_status_query.filter(Order.tenant_id == tenant_id)
        if square_id:
            orders_by_status_query = orders_by_status_query.filter(Order.square_id == square_id)

        orders_by_status = orders_by_status_query.group_by(Order.status).all()



        # Estatísticas do dia atual (filtradas por tenant e square)

        today = datetime.now(timezone.utc).date()

        today_orders_query = Order.query.filter(func.date(Order.created_at) == today)

        if tenant_id:

            today_orders_query = today_orders_query.filter(Order.tenant_id == tenant_id)
        if square_id:
            today_orders_query = today_orders_query.filter(Order.square_id == square_id)

        today_orders = today_orders_query.count()



        today_deliveries_query = Order.query.filter(

            func.date(Order.delivery_time) == today,

            Order.status == OrderStatus.DELIVERED

        )

        if tenant_id:

            today_deliveries_query = today_deliveries_query.filter(Order.tenant_id == tenant_id)
        if square_id:
            today_deliveries_query = today_deliveries_query.filter(Order.square_id == square_id)

        today_deliveries = today_deliveries_query.count()



        # Receita do dia (filtrada por tenant e square)

        today_revenue_query = db.session.query(func.sum(Order.delivery_fee)).filter(

            func.date(Order.created_at) == today,

            Order.status == OrderStatus.DELIVERED

        )

        if tenant_id:

            today_revenue_query = today_revenue_query.filter(Order.tenant_id == tenant_id)
        if square_id:
            today_revenue_query = today_revenue_query.filter(Order.square_id == square_id)

        today_revenue = today_revenue_query.scalar() or 0



        # Entregadores mais ativos (últimos 7 dias, filtrados por tenant)

        week_ago = datetime.now(timezone.utc) - timedelta(days=7)

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
        if square_id:
            top_drivers_query = top_drivers_query.filter(Driver.square_id == square_id)

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

        logger.error(f"Erro no dashboard: {e}", exc_info=True)

        return jsonify({'error': str(e)}), 500





# ============================================

# ADMIN - EDITAR/EXCLUIR PEDIDOS

# ============================================



@admin_dashboard_bp.route('/orders/<int:order_id>', methods=['PUT'])

@jwt_required()

@admin_required

def admin_update_order(order_id):

    """Admin atualiza qualquer pedido (status, valores, etc)"""

    try:

        order = Order.query.get(order_id)

        if not order:

            return jsonify({'error': 'Pedido não encontrado'}), 404

        # Verificar se o pedido pertence ao tenant do admin
        tenant_id = get_current_tenant_id()
        if tenant_id and order.tenant_id and order.tenant_id != tenant_id:
            return jsonify({'error': 'Pedido não pertence ao seu tenant'}), 403

        data = request.get_json()



        # Atualiza status se fornecido

        if data.get('status'):

            try:

                new_status = OrderStatus(data['status'])

                order.status = new_status

                if new_status == OrderStatus.DELIVERED:

                    order.delivery_time = datetime.now(timezone.utc)

                elif new_status == OrderStatus.PICKED_UP:

                    order.pickup_time = datetime.now(timezone.utc)

            except ValueError:

                return jsonify({'error': 'Status inválido'}), 400



        # Atualiza valores se fornecidos

        if data.get('subtotal') is not None:

            try:

                order.subtotal = float(data['subtotal'])

            except (ValueError, TypeError):

                return jsonify({'error': 'subtotal deve ser um número'}), 400

        if data.get('delivery_fee') is not None:

            try:

                order.delivery_fee = float(data['delivery_fee'])

            except (ValueError, TypeError):

                return jsonify({'error': 'delivery_fee deve ser um número'}), 400

        if data.get('total_amount') is not None:

            try:

                order.total_amount = float(data['total_amount'])

            except (ValueError, TypeError):

                return jsonify({'error': 'total_amount deve ser um número'}), 400

        if data.get('payment_method'):

            with contextlib.suppress(ValueError):

                order.payment_method = PaymentMethod(data['payment_method'])


        if data.get('special_instructions') is not None:

            from src.utils.order_tags import sanitize_customer_instructions
            order.special_instructions = sanitize_customer_instructions(data['special_instructions'])

        if data.get('distribution_method'):

            order.distribution_method = data['distribution_method']

        # Super admin pode alterar o tenant do pedido
        current_user = get_current_user()
        is_super_admin = current_user and current_user.user_type and current_user.user_type.value == 'ADMIN' and current_user.is_super_admin
        if is_super_admin and 'tenant_id' in data:
            order.tenant_id = data['tenant_id'] if data['tenant_id'] else None



        # Atualiza dados do cliente se fornecidos

        if data.get('customer_name') or data.get('customer_phone'):

            customer = order.customer

            if customer:

                if data.get('customer_name'):

                    customer.name = data['customer_name']

                if data.get('customer_phone'):

                    customer.phone = data['customer_phone']

                customer.updated_at = datetime.now(timezone.utc)



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

                address.updated_at = datetime.now(timezone.utc)



        order.updated_at = datetime.now(timezone.utc)

        db.session.commit()



        return jsonify({'message': 'Pedido atualizado com sucesso', 'order': order.to_dict()}), 200

    except Exception as e:

        db.session.rollback()

        return jsonify({'error': str(e)}), 500





@admin_dashboard_bp.route('/orders/<int:order_id>', methods=['DELETE'])

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


