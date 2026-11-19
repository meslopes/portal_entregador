"""Registro de atividades da equipe — consulta (§7.2 do backlog EE)."""
import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.models.portal_models import ActivityLog
from src.utils.auth import admin_required

logger = logging.getLogger(__name__)

admin_activity_bp = Blueprint('admin_activity', __name__)


@admin_activity_bp.route('/activity-log', methods=['GET'])
@jwt_required()
@admin_required
def list_activity_log():
    """Lista o registro de atividades (mais recentes primeiro, paginado).

    Filtros opcionais: entity, action, limit, offset.
    """
    try:
        query = ActivityLog.query

        entity = request.args.get('entity')
        if entity:
            query = query.filter(ActivityLog.entity == entity)
        action = request.args.get('action')
        if action:
            query = query.filter(ActivityLog.action == action)

        try:
            limit = min(int(request.args.get('limit', 50)), 200)
            offset = max(int(request.args.get('offset', 0)), 0)
        except (TypeError, ValueError):
            limit, offset = 50, 0

        total = query.count()
        rows = query.order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc()).offset(offset).limit(limit).all()

        return jsonify({
            'activities': [r.to_dict() for r in rows],
            'total': total,
            'limit': limit,
            'offset': offset,
        }), 200

    except Exception as e:
        logger.error(f"Erro ao listar atividades: {e}")
        return jsonify({'error': str(e)}), 500
