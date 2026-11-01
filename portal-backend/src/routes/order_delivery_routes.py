"""Gestão de rotas de entrega e agrupamento de pedidos.

Extraído de order.py no refactor de arquivos grandes (2026-11-01).
Movimento puro de código — comportamento idêntico ao original.
"""
import uuid
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from src.models.portal_models import (
    Order,
    OrderStatus,
    User,
    UserType,
    db,
)
from src.utils.geo import haversine_distance
from src.utils.tenant import get_current_tenant_id

order_delivery_routes_bp = Blueprint('order_delivery_routes', __name__)


# ============================================
# ROTAS MULTI-PARADA
# ============================================

@order_delivery_routes_bp.route('/routes', methods=['POST'])
@jwt_required()
def create_route():
    """Cria uma nova rota com múltiplas paradas"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Acesso negado'}), 403

        data = request.get_json()
        order_ids = data.get('order_ids', [])

        if len(order_ids) < 2:
            return jsonify({'error': 'Uma rota precisa ter pelo menos 2 pedidos'}), 400

        # Verifica se todos os pedidos existem e estão pendentes
        orders = []
        for order_id in order_ids:
            order = Order.query.get(order_id)
            if not order:
                return jsonify({'error': f'Pedido {order_id} não encontrado'}), 404
            if order.status != OrderStatus.PENDING:
                return jsonify({'error': f'Pedido {order_id} não está pendente'}), 400
            if order.route_id:
                return jsonify({'error': f'Pedido {order_id} já pertence a uma rota'}), 400
            orders.append(order)

        # Verifica se todos são do mesmo tenant
        tenant_id = orders[0].tenant_id
        if any(o.tenant_id != tenant_id for o in orders):
            return jsonify({'error': 'Pedidos de tenants diferentes não podem ser agrupados'}), 400

        # Cria a rota
        from src.models.portal_models import DeliveryRoute
        route = DeliveryRoute(
            tenant_id=tenant_id,
            route_number=f"ROT{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}",
            status='pending',
            total_stops=len(orders)
        )
        db.session.add(route)
        db.session.flush()

        # Associa pedidos à rota com número de parada
        for i, order in enumerate(orders, 1):
            order.route_id = route.id
            order.stop_number = i

        db.session.commit()

        return jsonify({
            'message': f'Rota criada com {len(orders)} paradas',
            'route': route.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@order_delivery_routes_bp.route('/routes/<int:route_id>', methods=['GET'])
@jwt_required()
def get_route_details(route_id):
    """Obtém detalhes de uma rota"""
    try:
        from src.models.portal_models import DeliveryRoute
        route = DeliveryRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        route_dict = route.to_dict()

        # Busca pedidos da rota ordenados por stop_number
        orders = Order.query.filter_by(route_id=route_id).order_by(Order.stop_number).all()
        route_dict['orders'] = []
        for order in orders:
            order_dict = order.to_dict()
            order_dict['restaurant'] = order.restaurant.to_dict()
            order_dict['delivery_address'] = order.delivery_address.to_dict()
            route_dict['orders'].append(order_dict)

        return jsonify(route_dict), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@order_delivery_routes_bp.route('/routes/<int:route_id>/reorder', methods=['PUT'])
@jwt_required()
def reorder_route(route_id):
    """Reordena as paradas de uma rota"""
    try:
        from src.models.portal_models import DeliveryRoute
        route = DeliveryRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        data = request.get_json()
        new_order = data.get('order', [])  # Lista de order_ids na nova ordem

        if not new_order:
            return jsonify({'error': 'Nova ordem é obrigatória'}), 400

        # Atualiza stop_number de cada pedido
        for i, order_id in enumerate(new_order, 1):
            order = Order.query.get(order_id)
            if order and order.route_id == route_id:
                order.stop_number = i

        db.session.commit()

        return jsonify({'message': 'Rota reordenada com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@order_delivery_routes_bp.route('/group-pending', methods=['POST'])
@jwt_required()
def group_pending_orders():
    """Agrupa pedidos pendentes próximos automaticamente"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.ADMIN:
            return jsonify({'error': 'Acesso restrito a administradores'}), 403

        data = request.get_json() or {}
        radius_km = data.get('radius_km', 1.0)  # Raio de agrupamento em km (padrão 1km)
        tenant_id = get_current_tenant_id()

        # Busca pedidos pendentes sem rota
        query = Order.query.filter(
            Order.status == OrderStatus.PENDING,
            Order.route_id.is_(None),
            Order.driver_id.is_(None)
        )
        if tenant_id:
            query = query.filter(Order.tenant_id == tenant_id)

        pending_orders = query.all()

        if len(pending_orders) < 2:
            return jsonify({
                'message': 'Menos de 2 pedidos pendentes disponíveis',
                'groups': 0
            }), 200

        # Agrupa pedidos por proximidade
        groups = []
        used_orders = set()

        for order in pending_orders:
            if order.id in used_orders:
                continue

            # Inicia um grupo com este pedido
            group = [order]
            used_orders.add(order.id)

            if not order.restaurant.latitude or not order.restaurant.longitude:
                continue

            # Busca outros pedidos próximos
            for other_order in pending_orders:
                if other_order.id in used_orders:
                    continue
                if not other_order.restaurant.latitude or not other_order.restaurant.longitude:
                    continue

                # Calcula distância entre restaurantes
                distance = haversine_distance(
                    order.restaurant.latitude, order.restaurant.longitude,
                    other_order.restaurant.latitude, other_order.restaurant.longitude
                )

                if distance <= radius_km:
                    group.append(other_order)
                    used_orders.add(other_order.id)

            if len(group) >= 2:
                groups.append(group)

        # Cria rotas para cada grupo
        routes_created = []
        from src.models.portal_models import DeliveryRoute

        for group in groups:
            route = DeliveryRoute(
                tenant_id=tenant_id,
                route_number=f"ROT{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}",
                status='pending',
                total_stops=len(group)
            )
            db.session.add(route)
            db.session.flush()

            # Associa pedidos à rota
            for i, order in enumerate(group, 1):
                order.route_id = route.id
                order.stop_number = i

            routes_created.append(route.to_dict())

        db.session.commit()

        return jsonify({
            'message': f'{len(routes_created)} rotas criadas com {sum(len(g) for g in groups)} pedidos',
            'routes': routes_created
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

