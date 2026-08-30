"""
Endpoints para configurações de roteirização.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from src.models.portal_models import db, RouteSettings
from src.utils.tenant import get_current_user, get_current_tenant_id
from src.models.portal_models import UserType
import logging

logger = logging.getLogger(__name__)

route_settings_bp = Blueprint('route_settings', __name__, url_prefix='/api/route-settings')


@route_settings_bp.route('/', methods=['GET'])
@jwt_required()
def get_settings():
    """Obtém configurações de roteirização"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        tenant_id = get_current_tenant_id()
        
        # Buscar configurações do tenant ou criar padrão
        settings = RouteSettings.query.filter_by(tenant_id=tenant_id).first()
        if not settings:
            settings = RouteSettings(tenant_id=tenant_id)
            db.session.add(settings)
            db.session.commit()

        return jsonify({'settings': settings.to_dict()}), 200

    except Exception as e:
        logger.error(f"Erro ao buscar configurações: {e}")
        return jsonify({'error': str(e)}), 500


@route_settings_bp.route('/', methods=['PUT'])
@jwt_required()
def update_settings():
    """Atualiza configurações de roteirização"""
    try:
        user = get_current_user()
        if not user or user.user_type not in [UserType.ADMIN, UserType.CLIENT]:
            return jsonify({'error': 'Sem permissão'}), 403

        tenant_id = get_current_tenant_id()
        data = request.get_json()

        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400

        # Buscar ou criar configurações
        settings = RouteSettings.query.filter_by(tenant_id=tenant_id).first()
        if not settings:
            settings = RouteSettings(tenant_id=tenant_id)
            db.session.add(settings)

        # Atualizar campos
        if 'auto_routing_enabled' in data:
            settings.auto_routing_enabled = data['auto_routing_enabled']
        if 'auto_routing_interval_min' in data:
            settings.auto_routing_interval_min = max(1, min(60, data['auto_routing_interval_min']))
        if 'max_orders_auto' in data:
            settings.max_orders_auto = max(2, min(20, data['max_orders_auto']))
        if 'max_orders_manual' in data:
            settings.max_orders_manual = max(2, min(20, data['max_orders_manual']))
        if 'max_distance_km' in data:
            settings.max_distance_km = max(1, min(50, data['max_distance_km']))
        if 'direction_weight' in data:
            settings.direction_weight = max(0, min(1, data['direction_weight']))
            settings.distance_weight = 1 - settings.direction_weight
        if 'min_time_savings_min' in data:
            settings.min_time_savings_min = max(1, min(60, data['min_time_savings_min']))
        if 'min_clusterization' in data:
            settings.min_clusterization = max(0, min(1, data['min_clusterization']))
        if 'notify_admin_auto_route' in data:
            settings.notify_admin_auto_route = data['notify_admin_auto_route']
        if 'notify_driver_auto_route' in data:
            settings.notify_driver_auto_route = data['notify_driver_auto_route']

        db.session.commit()

        return jsonify({
            'message': 'Configurações atualizadas',
            'settings': settings.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao atualizar configurações: {e}")
        return jsonify({'error': str(e)}), 500
