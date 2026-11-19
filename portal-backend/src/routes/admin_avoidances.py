"""Controle admin dos evitamentos (G-08): listar, suspender manualmente, revogar."""
import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.models.portal_models import Driver, DriverRestaurant, Restaurant, User
from src.services import avoidance_service
from src.utils.auth import admin_required

logger = logging.getLogger(__name__)

admin_avoidances_bp = Blueprint('admin_avoidances', __name__)


@admin_avoidances_bp.route('/avoidances', methods=['GET'])
@jwt_required()
@admin_required
def list_avoidances():
    """Lista os evitamentos ativos (com nomes legíveis)."""
    try:
        query = DriverRestaurant.query.filter(DriverRestaurant.avoidance_active.is_(True))
        rid = request.args.get('restaurant_id', type=int)
        if rid:
            query = query.filter(DriverRestaurant.restaurant_id == rid)
        rows = query.order_by(DriverRestaurant.avoidance_created_at.desc()).limit(200).all()

        itens = []
        for r in rows:
            driver = Driver.query.get(r.driver_id)
            rest = Restaurant.query.get(r.restaurant_id)
            itens.append({
                'id': r.id,
                'driver_id': r.driver_id,
                'driver_name': (f"{driver.user.first_name} {driver.user.last_name}" if driver and driver.user else f"#{r.driver_id}"),
                'restaurant_id': r.restaurant_id,
                'restaurant_name': rest.name if rest else f"#{r.restaurant_id}",
                'source': r.avoidance_source,
                'reason': r.avoidance_reason,
                'created_at': r.avoidance_created_at.isoformat() if r.avoidance_created_at else None,
            })
        return jsonify({'avoidances': itens, 'total': len(itens)}), 200

    except Exception as e:
        logger.error(f"Erro ao listar evitamentos: {e}")
        return jsonify({'error': str(e)}), 500


@admin_avoidances_bp.route('/avoidances', methods=['POST'])
@jwt_required()
@admin_required
def create_avoidance():
    """Suspensão manual: o entregador passa a não receber ofertas do estabelecimento."""
    try:
        data = request.get_json() or {}
        driver_id = data.get('driver_id')
        restaurant_id = data.get('restaurant_id')
        if not driver_id or not restaurant_id:
            return jsonify({'error': 'driver_id e restaurant_id são obrigatórios'}), 400
        rel = avoidance_service.criar_evitamento_manual(
            int(driver_id), int(restaurant_id), data.get('reason'))
        return jsonify({
            'message': 'Evitamento ativado (revogável a qualquer momento)',
            'avoidance': {'id': rel.id, 'driver_id': rel.driver_id, 'restaurant_id': rel.restaurant_id},
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_avoidances_bp.route('/avoidances/<int:rel_id>/revoke', methods=['POST'])
@jwt_required()
@admin_required
def revoke_avoidance(rel_id):
    """Revogação: o par volta a ser ofertado normalmente (controle do admin)."""
    try:
        rel = avoidance_service.revogar_evitamento(rel_id)
        if not rel:
            return jsonify({'error': 'Evitamento não encontrado'}), 404
        return jsonify({'message': 'Evitamento revogado'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
