"""Módulo route_management — extraído de src/routes/route.py no refactor de arquivos grandes.
Movimento puro de código — comportamento idêntico ao original.
"""
import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.models.portal_models import (
    EstablishmentDriver,
    Order,
    OrderStatus,
    OwnDriverEarning,
    OwnDriverRoute,
    OwnDriverStop,
    Restaurant,
    UserType,
    db,
)
from src.routes.route_helpers import _update_route_stats
from src.services.auto_route import reconstruir_paradas_rota
from src.utils.geo import haversine_distance
from src.utils.tenant import get_current_user

logger = logging.getLogger(__name__)


route_management_bp = Blueprint('route_management', __name__, url_prefix='/api/routes')


@route_management_bp.route('/create', methods=['POST'])
@jwt_required()
def create_route():
    """Cria uma rota com pedidos (sem entregador - será atribuído depois)"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400

        order_ids = data.get('order_ids', [])

        if not order_ids:
            return jsonify({'error': 'Pedidos são obrigatórios'}), 400

        # Verificar pedidos
        orders = Order.query.filter(Order.id.in_(order_ids)).all()
        if len(orders) != len(order_ids):
            return jsonify({'error': 'Alguns pedidos não foram encontrados'}), 400

        # F3 rota multi-loja: pedidos podem ser de várias lojas — a BASE da
        # rota é a loja do primeiro pedido (a loja que cria a rota); a
        # validação "entregador atende todas as lojas" roda no assign-driver
        for order in orders:
            # Verificar se algum pedido já está em outra rota ativa
            if order.own_driver_route_id:
                existing_route = OwnDriverRoute.query.get(order.own_driver_route_id)
                if existing_route and existing_route.status in ['CREATED', 'PENDING', 'ACTIVE']:
                    return jsonify({'error': f'Pedido {order.order_number} já está na rota #{existing_route.id}'}), 400

        restaurant_id = next(
            (o.restaurant_id for o in orders if o.id == order_ids[0]),
            orders[0].restaurant_id)

        # Criar rota SEM entregador (status CREATED - aguardando atribuição)
        route = OwnDriverRoute(
            establishment_driver_id=None,  # Sem entregador ainda
            restaurant_id=restaurant_id,
            status='CREATED'
        )
        db.session.add(route)
        db.session.flush()

        # Vincular pedidos à rota (sem atribuir entregador)
        for order in orders:
            order.own_driver_route_id = route.id

        # F3: paradas = coletas + entregas INTERCALADAS (precedência por loja)
        reconstruir_paradas_rota(route)

        db.session.commit()

        return jsonify({
            'message': f'Rota criada com {len(orders)} entregas',
            'route': route.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao criar rota: {e}")
        return jsonify({'error': str(e)}), 500


@route_management_bp.route('/<int:route_id>/assign-driver', methods=['POST'])
@jwt_required()
def assign_driver_to_route(route_id):
    """Atribui entregador a uma rota (calcula ganhos para cada pedido)"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        data = request.get_json()
        driver_id = data.get('driver_id')

        if not driver_id:
            return jsonify({'error': 'ID do entregador é obrigatório'}), 400

        route = OwnDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        driver = EstablishmentDriver.query.get(driver_id)
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404

        # F2 frota compartilhada: a rota só aceita base OU vínculo ativo da loja
        # (retrocompat: loja sem o produto continua aceitando só os seus)
        from src.services.distribution import pertence_a_loja
        restaurant = Restaurant.query.get(route.restaurant_id)
        if not pertence_a_loja(driver, restaurant):
            return jsonify({'error': f'{driver.name} não atende esta loja '
                                     f'(precisa ser da base ou ter vínculo ativo)'}), 403

        # F3 rota multi-loja: o entregador precisa atender TODAS as lojas dos
        # pedidos da rota (base OU vínculo ativo em cada uma)
        pedidos_rota = Order.query.filter(Order.own_driver_route_id == route.id).all()
        for pedido in pedidos_rota:
            if not pertence_a_loja(driver, pedido.restaurant):
                return jsonify({'error': f'{driver.name} não atende a loja do pedido '
 f'{pedido.order_number} (precisa ser da base ou ter vínculo ativo)'}), 403

        # Atribuir entregador à rota
        route.establishment_driver_id = driver_id
        route.status = 'PENDING'  # Aguardando entregador aceitar

        # Atribuir entregador a todos os pedidos da rota e calcular ganhos
        # (ganhos pela loja DO PEDIDO — cada loja paga a sua config)
        for order in pedidos_rota:
            if order:
                order.assigned_to_own_driver = True
                order.establishment_driver_id = driver_id
                order.own_driver_route_id = route.id

                # Calcular ganho do entregador para este pedido
                restaurant = order.restaurant
                if restaurant:
                    payment_type = restaurant.own_driver_payment_type or 'PER_DELIVERY'
                    delivery_fee = float(order.delivery_fee or 0)
                    distance_km = 0

                    if order.delivery_address and order.delivery_address.latitude and restaurant.latitude:
                        distance_km = haversine_distance(
                            float(restaurant.latitude), float(restaurant.longitude),
                            float(order.delivery_address.latitude), float(order.delivery_address.longitude)
                        )

                    # Calcular valor baseado no tipo de pagamento
                    if payment_type == 'PER_DELIVERY':
                        driver_earning = float(restaurant.own_driver_fixed_value or 5.00)
                    elif payment_type == 'PER_KM':
                        driver_earning = distance_km * float(restaurant.own_driver_km_value or 1.50)
                    elif payment_type == 'PERCENTAGE':
                        driver_earning = delivery_fee * (float(restaurant.own_driver_percentage or 70.0) / 100)
                    elif payment_type == 'FIXED_PLUS_DELIVERY':
                        delivery_value = float(restaurant.own_driver_delivery_value or 3.00)
                        driver_earning = float(restaurant.own_driver_fixed_value or 5.00) + delivery_value
                    elif payment_type == 'FIXED_UP_TO_PLUS_DELIVERY':
                        delivery_value = float(restaurant.own_driver_delivery_value or 3.00)
                        max_deliveries = restaurant.own_driver_max_deliveries or 10
                        from datetime import datetime as dt
                        today_start = dt.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                        deliveries_today = OwnDriverEarning.query.filter(
                            OwnDriverEarning.establishment_driver_id == driver_id,
                            OwnDriverEarning.created_at >= today_start
                        ).count()
                        driver_earning = delivery_value if deliveries_today >= max_deliveries else 0
                    else:
                        driver_earning = float(restaurant.own_driver_fixed_value or 5.00)

                    # Criar registro de ganho
                    earning = OwnDriverEarning(
                        restaurant_id=restaurant.id,
                        establishment_driver_id=driver_id,
                        order_id=order.id,
                        delivery_fee=delivery_fee,
                        driver_earning=driver_earning,
                        payment_type=payment_type,
                        distance_km=distance_km
                    )
                    db.session.add(earning)

        db.session.commit()

        return jsonify({
            'message': f'Entregador {driver.name} atribuído à rota',
            'route': route.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao atribuir entregador à rota: {e}")
        return jsonify({'error': str(e)}), 500


@route_management_bp.route('/<int:route_id>/add-orders', methods=['POST'])
@jwt_required()
def add_orders_to_route(route_id):
    """Adiciona pedidos a uma rota existente"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        data = request.get_json()
        order_ids = data.get('order_ids', [])

        if not order_ids:
            return jsonify({'error': 'Pedidos são obrigatórios'}), 400

        route = OwnDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        # Verificar pedidos
        orders = Order.query.filter(Order.id.in_(order_ids)).all()
        if len(orders) != len(order_ids):
            return jsonify({'error': 'Alguns pedidos não foram encontrados'}), 400

        # F3 rota multi-loja: pedidos de outras lojas são aceitos — desde que
        # o entregador da rota atenda a loja de cada um (base OU vínculo ativo)
        for order in orders:
            # Verificar se já está em outra rota ativa
            if order.own_driver_route_id and order.own_driver_route_id != route_id:
                existing_route = OwnDriverRoute.query.get(order.own_driver_route_id)
                if existing_route and existing_route.status in ['CREATED', 'PENDING', 'ACTIVE']:
                    return jsonify({'error': f'Pedido {order.order_number} já está na rota #{existing_route.id}'}), 400

            if route.establishment_driver_id:
                from src.services.distribution import pertence_a_loja
                if not pertence_a_loja(route.driver, order.restaurant):
                    return jsonify({'error': f'Entregador {route.driver.name} não atende a '
 f'loja do pedido {order.order_number} (precisa ser da base ou ter vínculo ativo)'}), 403

        # Adicionar pedidos à rota
        for order in orders:
            # Verificar se já está na rota
            existing = OwnDriverStop.query.filter_by(
                route_id=route_id, order_id=order.id).first()
            if existing:
                continue
            if not order.delivery_address:
                continue

            # Vincular pedido à rota
            order.own_driver_route_id = route.id

            # Se a rota já tem entregador, atribuir e calcular ganhos
            # (ganhos pela loja DO PEDIDO — cada loja paga a sua config)
            if route.establishment_driver_id:
                order.assigned_to_own_driver = True
                order.establishment_driver_id = route.establishment_driver_id

                restaurant = order.restaurant
                if restaurant:
                    # Calcular ganho (mesmo cálculo do assign)
                    payment_type = restaurant.own_driver_payment_type or 'PER_DELIVERY'
                    delivery_fee = float(order.delivery_fee or 0)
                    distance_km = 0

                    if order.delivery_address and order.delivery_address.latitude and restaurant.latitude:
                        distance_km = haversine_distance(
                            float(restaurant.latitude), float(restaurant.longitude),
                            float(order.delivery_address.latitude), float(order.delivery_address.longitude)
                        )

                    if payment_type == 'PER_DELIVERY':
                        driver_earning = float(restaurant.own_driver_fixed_value or 5.00)
                    elif payment_type == 'PER_KM':
                        driver_earning = distance_km * float(restaurant.own_driver_km_value or 1.50)
                    elif payment_type == 'PERCENTAGE':
                        driver_earning = delivery_fee * (float(restaurant.own_driver_percentage or 70.0) / 100)
                    else:
                        driver_earning = float(restaurant.own_driver_fixed_value or 5.00)

                    earning = OwnDriverEarning(
                        restaurant_id=restaurant.id,
                        establishment_driver_id=route.establishment_driver_id,
                        order_id=order.id,
                        delivery_fee=delivery_fee,
                        driver_earning=driver_earning,
                        payment_type=payment_type,
                        distance_km=distance_km
                    )
                    db.session.add(earning)

        # F3: rebuild das paradas (coletas + entregas intercaladas)
        reconstruir_paradas_rota(route)

        # Atualizar distância e tempo
        _update_route_stats(route)

        db.session.commit()

        return jsonify({
            'message': f'{len(orders)} pedido(s) adicionado(s) à rota',
            'route': route.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao adicionar pedidos à rota: {e}")
        return jsonify({'error': str(e)}), 500


@route_management_bp.route('/<int:route_id>', methods=['DELETE'])
@jwt_required()
def delete_route(route_id):
    """Exclui uma rota"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        route = OwnDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        # Não permitir excluir rotas ativas
        if route.status == 'ACTIVE':
            return jsonify({'error': 'Não é possível excluir uma rota ativa'}), 400

        # Desvincular pedidos da rota
        for stop in route.stops:
            order = Order.query.get(stop.order_id)
            if order:
                order.own_driver_route_id = None
                # Se o pedido foi atribuído apenas por esta rota, desvincular entregador
                if order.assigned_to_own_driver and order.establishment_driver_id == route.establishment_driver_id:
                    order.assigned_to_own_driver = False
                    order.establishment_driver_id = None

        # Excluir paradas e rota
        for stop in route.stops:
            db.session.delete(stop)

        db.session.delete(route)
        db.session.commit()

        return jsonify({'message': 'Rota excluída com sucesso'}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao excluir rota: {e}")
        return jsonify({'error': str(e)}), 500


@route_management_bp.route('/<int:route_id>/remove-order', methods=['POST'])
@jwt_required()
def remove_order_from_route(route_id):
    """Remove um pedido de uma rota (torna disponível novamente)"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        data = request.get_json()
        order_id = data.get('order_id')
        if not order_id:
            return jsonify({'error': 'order_id é obrigatório'}), 400

        route = OwnDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        # Encontrar a parada do pedido nesta rota
        stop = OwnDriverStop.query.filter_by(route_id=route_id, order_id=order_id).first()
        if not stop:
            return jsonify({'error': 'Pedido não encontrado nesta rota'}), 404

        # Não permitir remover paradas já concluídas
        if stop.status == 'COMPLETED':
            return jsonify({'error': 'Não é possível remover uma parada já concluída'}), 400

        # Desvincular pedido da rota
        order = Order.query.get(order_id)
        if order:
            order.own_driver_route_id = None
            order.assigned_to_own_driver = False
            order.establishment_driver_id = None
            # Resetar status para PENDING se estava ACCEPTED (aceito pela rota mas não coletado)
            # Não resetar se já foi coletado ou entregue
            if order.status not in [OrderStatus.PICKED_UP, OrderStatus.DELIVERED]:
                if order.status == OrderStatus.ACCEPTED:
                    order.status = OrderStatus.PENDING
                    order.accepted_at = None

        # F3: rebuild das paradas (apaga/recria — inclusive coletas órfãs)
        restam = Order.query.filter(Order.own_driver_route_id == route_id).count()
        if not restam:
            # Se rota ficou sem pedidos, excluir rota
            OwnDriverStop.query.filter_by(route_id=route_id).delete()
            db.session.delete(route)
        else:
            reconstruir_paradas_rota(route)

        db.session.commit()

        return jsonify({
            'message': 'Pedido removido da rota',
            'route': route.to_dict() if restam else None
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao remover pedido da rota: {e}")
        return jsonify({'error': str(e)}), 500


@route_management_bp.route('/<int:route_id>/move-order', methods=['POST'])
@jwt_required()
def move_order_between_routes(route_id):
    """Move um pedido de uma rota para outra"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        data = request.get_json()
        order_id = data.get('order_id')
        target_route_id = data.get('target_route_id')

        if not order_id:
            return jsonify({'error': 'order_id é obrigatório'}), 400
        if not target_route_id:
            return jsonify({'error': 'target_route_id é obrigatório'}), 400
        if route_id == target_route_id:
            return jsonify({'error': 'Rota de origem e destino são iguais'}), 400

        source_route = OwnDriverRoute.query.get(route_id)
        if not source_route:
            return jsonify({'error': 'Rota de origem não encontrada'}), 404

        target_route = OwnDriverRoute.query.get(target_route_id)
        if not target_route:
            return jsonify({'error': 'Rota de destino não encontrada'}), 404

        # Encontrar a parada na rota de origem
        stop = OwnDriverStop.query.filter_by(route_id=route_id, order_id=order_id).first()
        if not stop:
            return jsonify({'error': 'Pedido não encontrado na rota de origem'}), 404

        # Não permitir mover paradas já concluídas
        if stop.status == 'COMPLETED':
            return jsonify({'error': 'Não é possível mover uma parada já concluída'}), 400

        # Verificar se o pedido já está na rota de destino
        existing = OwnDriverStop.query.filter_by(route_id=target_route_id, order_id=order_id).first()
        if existing:
            return jsonify({'error': 'Pedido já está na rota de destino'}), 400

        # F3 rota multi-loja: pedido de outra loja só entra se o entregador
        # da rota de destino atender a loja dele (base OU vínculo ativo)
        order = Order.query.get(order_id)
        if order and target_route.establishment_driver_id:
            from src.services.distribution import pertence_a_loja
            if not pertence_a_loja(target_route.driver, order.restaurant):
                return jsonify({'error': f'Entregador {target_route.driver.name} não atende a '
 f'loja do pedido (precisa ser da base ou ter vínculo ativo)'}), 403

        # Mover: desvincula da origem e vincula ao destino (rebuild nas 2)
        if order:
            order.own_driver_route_id = target_route_id
            # Se a rota de destino tem entregador, atribuir
            if target_route.establishment_driver_id:
                order.assigned_to_own_driver = True
                order.establishment_driver_id = target_route.establishment_driver_id

        # F3: rebuild das paradas nas duas rotas (coletas + intercalado)
        restam_origem = Order.query.filter(Order.own_driver_route_id == route_id).count()
        if not restam_origem:
            # Se rota de origem ficou sem pedidos, excluir
            OwnDriverStop.query.filter_by(route_id=route_id).delete()
            db.session.delete(source_route)
        else:
            reconstruir_paradas_rota(source_route)
        reconstruir_paradas_rota(target_route)

        db.session.commit()

        return jsonify({
            'message': f'Pedido movido para {target_route.name}',
            'source_route': source_route.to_dict() if restam_origem else None,
            'target_route': target_route.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao mover pedido entre rotas: {e}")
        return jsonify({'error': str(e)}), 500



