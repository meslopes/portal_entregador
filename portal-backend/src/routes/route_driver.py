"""Módulo route_driver — extraído de src/routes/route.py no refactor de arquivos grandes.
Movimento puro de código — comportamento idêntico ao original.
"""
import logging
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from src.models.portal_models import (
    Order,
    OrderStatus,
    OwnDriverRoute,
    OwnDriverStop,
    Restaurant,
    User,
    UserType,
    db,
)
from src.routes.own_driver import own_driver_required
from src.routes.route_helpers import optimize_stop_order
from src.utils.tenant import get_current_user

logger = logging.getLogger(__name__)


route_driver_bp = Blueprint('route_driver', __name__, url_prefix='/api/routes')


@route_driver_bp.route('/establishment/list', methods=['GET'])
@jwt_required()
def list_establishment_routes():
    """Lista todas as rotas do estabelecimento"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        # Buscar restaurante do usuário
        from src.models.portal_models import Customer
        customer = Customer.query.filter_by(user_id=user.id).first()
        if not customer:
            return jsonify({'routes': []}), 200

        restaurant = Restaurant.query.filter_by(name=customer.name).first()
        if not restaurant:
            return jsonify({'routes': []}), 200

        # Filtrar por status se fornecido, senão mostrar todas não concluídas/canceladas
        status_filter = request.args.get('status', '')
        if status_filter:
            routes = OwnDriverRoute.query.filter_by(
                restaurant_id=restaurant.id,
                status=status_filter
            ).order_by(OwnDriverRoute.created_at.desc()).all()
        else:
            routes = OwnDriverRoute.query.filter(
                OwnDriverRoute.restaurant_id == restaurant.id,
                OwnDriverRoute.status.in_(['CREATED', 'PENDING', 'ACTIVE'])
            ).order_by(OwnDriverRoute.created_at.desc()).all()

        return jsonify({'routes': [r.to_dict() for r in routes]}), 200

    except Exception as e:
        logger.error(f"Erro ao listar rotas: {e}")
        return jsonify({'error': str(e)}), 500


@route_driver_bp.route('/<int:route_id>/activate', methods=['POST'])
@jwt_required()
def activate_route(route_id):
    """Entregador ativa uma rota (quando vai sair para entregar)"""
    try:
        route = OwnDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        if route.status != 'PENDING':
            return jsonify({'error': 'Rota já foi ativada ou concluída'}), 400

        route.status = 'ACTIVE'
        route.started_at = datetime.now(timezone.utc)

        # Re-otimizar paradas (garantir ordem correta)
        stops_data = []
        for stop in route.stops:
            stops_data.append({
                'stop_id': stop.id,
                'order_id': stop.order_id,
                'stop_type': stop.stop_type,
                'latitude': float(stop.latitude) if stop.latitude else None,
                'longitude': float(stop.longitude) if stop.longitude else None,
                'address': stop.address
            })

        optimized_stops = optimize_stop_order(stops_data)

        for stop_data in optimized_stops:
            if 'stop_id' in stop_data:
                stop = OwnDriverStop.query.get(stop_data['stop_id'])
                if stop:
                    stop.stop_order = stop_data['stop_order']

        # Atualizar status dos pedidos
        for stop in route.stops:
            order = Order.query.get(stop.order_id)
            if order and order.status in [OrderStatus.PENDING, OrderStatus.SCHEDULED]:
                order.status = OrderStatus.ACCEPTED
                order.accepted_at = datetime.now(timezone.utc)

        db.session.commit()

        return jsonify({
            'message': 'Rota ativada',
            'route': route.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao ativar rota: {e}")
        return jsonify({'error': str(e)}), 500


@route_driver_bp.route('/<int:route_id>/accept', methods=['POST'])
def accept_route(route_id):
    """Entregador aceita uma rota"""
    try:
        from src.routes.own_driver import get_own_driver_from_token

        own_driver = get_own_driver_from_token()
        if not own_driver:
            return jsonify({'error': 'Autenticação necessária'}), 401

        route = OwnDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        # Verificar se a rota tem entregador atribuído
        if not route.establishment_driver_id:
            return jsonify({'error': 'Esta rota ainda não tem entregador atribuído'}), 400

        if route.establishment_driver_id != own_driver.id:
            return jsonify({'error': 'Esta rota não foi atribuída a você'}), 403

        if route.status != 'PENDING':
            return jsonify({'error': 'Rota já foi aceita ou rejeitada'}), 400

        route.status = 'ACTIVE'
        route.started_at = datetime.now(timezone.utc)

        # Re-otimizar paradas
        stops_data = []
        for stop in route.stops:
            stops_data.append({
                'stop_id': stop.id,
                'order_id': stop.order_id,
                'stop_type': stop.stop_type,
                'latitude': float(stop.latitude) if stop.latitude else None,
                'longitude': float(stop.longitude) if stop.longitude else None,
                'address': stop.address
            })

        optimized_stops = optimize_stop_order(stops_data)

        for stop_data in optimized_stops:
            if 'stop_id' in stop_data:
                stop = OwnDriverStop.query.get(stop_data['stop_id'])
                if stop:
                    stop.stop_order = stop_data['stop_order']

        # Atualizar status dos pedidos
        for stop in route.stops:
            order = Order.query.get(stop.order_id)
            if order and order.status in [OrderStatus.PENDING, OrderStatus.SCHEDULED]:
                order.status = OrderStatus.ACCEPTED
                order.accepted_at = datetime.now(timezone.utc)

        db.session.commit()

        return jsonify({
            'message': 'Rota aceita com sucesso',
            'route': route.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao aceitar rota {route_id}: {e}", exc_info=True)
        return jsonify({'error': f'Erro ao aceitar rota: {str(e)}'}), 500


@route_driver_bp.route('/<int:route_id>/reject', methods=['POST'])
def reject_route(route_id):
    """Entregador rejeita uma rota"""
    try:
        from src.routes.own_driver import get_own_driver_from_token

        own_driver = get_own_driver_from_token()
        if not own_driver:
            return jsonify({'error': 'Autenticação necessária'}), 401

        route = OwnDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        if route.establishment_driver_id != own_driver.id:
            return jsonify({'error': 'Esta rota não foi atribuída a você'}), 403

        if route.status != 'PENDING':
            return jsonify({'error': 'Rota já foi aceita ou rejeitada'}), 400

        # Marcar rota como rejeitada
        route.status = 'REJECTED'

        # Desvincular pedidos da rota
        for stop in route.stops:
            order = Order.query.get(stop.order_id)
            if order:
                order.own_driver_route_id = None
                # Não desvincular o entregador - estabelecimento pode reatribuir

        db.session.commit()

        return jsonify({
            'message': 'Rota rejeitada. O estabelecimento será notificado.',
            'route': route.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao rejeitar rota: {e}")
        return jsonify({'error': str(e)}), 500


@route_driver_bp.route('/<int:route_id>/complete-stop', methods=['POST'])
def complete_stop(route_id):
    """Marca uma parada como concluída (aceita JWT regular ou own_driver_token)"""
    try:
        # Verificar autenticação - aceitar JWT regular ou own_driver_token
        from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

        from src.routes.own_driver import get_own_driver_from_token

        # Tentar JWT regular primeiro
        user = None
        own_driver = None

        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
            if user_id:
                user = User.query.get(int(user_id))
        except Exception:
            pass

        # Se não tem JWT regular, tentar own_driver_token
        if not user:
            own_driver = get_own_driver_from_token()
            if not own_driver:
                return jsonify({'error': 'Autenticação necessária'}), 401

        data = request.get_json()
        stop_id = data.get('stop_id')

        if not stop_id:
            return jsonify({'error': 'ID da parada é obrigatório'}), 400

        stop = OwnDriverStop.query.get(stop_id)
        if not stop or stop.route_id != route_id:
            return jsonify({'error': 'Parada não encontrada'}), 404

        # Verificar permissão: se for own_driver, verificar se a rota é dele
        if own_driver:
            route = OwnDriverRoute.query.get(route_id)
            if route.establishment_driver_id != own_driver.id:
                return jsonify({'error': 'Sem permissão'}), 403

        stop.status = 'COMPLETED'
        stop.completed_at = datetime.now(timezone.utc)

        # Verificar se todas as paradas foram concluídas
        route = OwnDriverRoute.query.get(route_id)
        all_completed = all(s.status == 'COMPLETED' for s in route.stops)

        if all_completed:
            route.status = 'COMPLETED'
            route.completed_at = datetime.now(timezone.utc)

        db.session.commit()

        return jsonify({
            'message': 'Parada concluída',
            'stop': stop.to_dict(),
            'route_completed': all_completed
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@route_driver_bp.route('/<int:route_id>', methods=['GET'])
@jwt_required()
def get_route(route_id):
    """Obtém detalhes de uma rota"""
    try:
        route = OwnDriverRoute.query.get(route_id)
        if not route:
            return jsonify({'error': 'Rota não encontrada'}), 404

        return jsonify({'route': route.to_dict()}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@route_driver_bp.route('/active', methods=['GET'])
@jwt_required()
def get_active_routes():
    """Obtém rotas ativas do entregador"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Buscar entregador próprio por telefone (coluna user_id não existe em EstablishmentDriver)
        from src.utils.driver_type import find_own_driver_by_phone
        driver = find_own_driver_by_phone(user.phone)
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404

        routes = OwnDriverRoute.query.filter(
            OwnDriverRoute.establishment_driver_id == driver.id,
            OwnDriverRoute.status == 'ACTIVE'
        ).all()

        return jsonify({'routes': [r.to_dict() for r in routes]}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@route_driver_bp.route('/own-driver/active', methods=['GET'])
@own_driver_required
def get_own_driver_active_routes():
    """Obtém rotas do entregador próprio (pendentes e ativas)"""
    try:
        driver = request.own_driver

        routes = OwnDriverRoute.query.filter(
            OwnDriverRoute.establishment_driver_id == driver.id,
            OwnDriverRoute.status.in_(['PENDING', 'ACTIVE'])
        ).order_by(OwnDriverRoute.created_at.desc()).all()

        return jsonify({'routes': [r.to_dict() for r in routes]}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== ROTEIRIZAÇÃO PARA PLATAFORMA ====================



