from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from src.models.portal_models import Customer, User, db
from src.utils.restaurant import find_restaurant_by_name

user_bp = Blueprint('user', __name__)


@user_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Retorna o perfil do usuario logado"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuario nao encontrado'}), 404

        user_data = user.to_dict(include_sensitive=True)

        # Inclui dados do driver se for entregador
        if user.driver:
            user_data['driver'] = user.driver.to_dict()

        # Inclui dados do customer se for estabelecimento
        customer = Customer.query.filter_by(user_id=user.id).first()
        if customer:
            user_data['customer'] = customer.to_dict()
            # Busca o restaurante vinculado ao estabelecimento (case-insensitive)
            restaurant = find_restaurant_by_name(customer.name)
            if restaurant:
                user_data['restaurant_id'] = restaurant.id
                user_data['has_own_drivers'] = restaurant.has_own_drivers or False
                user_data['subscription_type'] = restaurant.subscription_type
                # Distribuição de pedidos a próprios (configurável — 2026-11-24)
                user_data['distribution_mode'] = restaurant.distribution_mode or 'MANUAL'
                user_data['route_angle_tolerance'] = restaurant.route_angle_tolerance or 45
                user_data['route_max_orders'] = restaurant.route_max_orders or 3
                user_data['route_max_distance_km'] = float(restaurant.route_max_distance_km or 10)
                user_data['machine_settlement_mode'] = restaurant.machine_settlement_mode or 'PER_SHIFT'
                user_data['seq_reset_mode'] = restaurant.seq_reset_mode or 'DAILY'

        return jsonify(user_data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@user_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Atualiza o perfil do usuario logado"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuario nao encontrado'}), 404

        data = request.get_json() or {}

        # Atualiza campos permitidos
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'phone' in data:
            user.phone = data['phone']
        if 'profile_picture_url' in data:
            user.profile_picture_url = data['profile_picture_url']

        # Atualiza dados do driver se fornecidos
        if user.driver:
            driver = user.driver
            if 'vehicle_type' in data:
                try:
                    from src.models.portal_models import VehicleType
                    driver.vehicle_type = VehicleType(data['vehicle_type'])
                except (ValueError, KeyError):
                    return jsonify({'error': 'Tipo de veículo inválido'}), 400
            if 'vehicle_plate' in data:
                driver.vehicle_plate = data['vehicle_plate']
            if 'vehicle_model' in data:
                driver.vehicle_model = data['vehicle_model']
            if 'vehicle_year' in data:
                driver.vehicle_year = data['vehicle_year']
            if 'pix_key' in data:
                driver.pix_key = data['pix_key']
            if 'bank_account' in data:
                driver.bank_account = data['bank_account']

        # Configurações do estabelecimento (perfil do cliente) — inclui a
        # distribuição de pedidos a próprios (configurável, 2026-11-24)
        customer = Customer.query.filter_by(user_id=user.id).first()
        if customer:
            restaurant = find_restaurant_by_name(customer.name)
            if restaurant:
                if 'has_own_drivers' in data:
                    restaurant.has_own_drivers = bool(data['has_own_drivers'])
                if 'distribution_mode' in data:
                    modo = str(data['distribution_mode']).upper()
                    if modo not in ('MANUAL', 'AUTO'):
                        return jsonify({'error': 'distribution_mode deve ser MANUAL ou AUTO'}), 400
                    restaurant.distribution_mode = modo
                if 'route_angle_tolerance' in data:
                    try:
                        val = int(data['route_angle_tolerance'])
                    except (TypeError, ValueError):
                        return jsonify({'error': 'route_angle_tolerance deve ser inteiro'}), 400
                    if not (5 <= val <= 180):
                        return jsonify({'error': 'route_angle_tolerance deve estar entre 5 e 180 graus'}), 400
                    restaurant.route_angle_tolerance = val
                if 'route_max_orders' in data:
                    try:
                        val = int(data['route_max_orders'])
                    except (TypeError, ValueError):
                        return jsonify({'error': 'route_max_orders deve ser inteiro'}), 400
                    if not (1 <= val <= 20):
                        return jsonify({'error': 'route_max_orders deve estar entre 1 e 20'}), 400
                    restaurant.route_max_orders = val
                if 'route_max_distance_km' in data:
                    try:
                        val = float(data.get('route_max_distance_km') or 0)
                    except (TypeError, ValueError):
                        return jsonify({'error': 'route_max_distance_km deve ser numérico'}), 400
                    if not (0 <= val <= 200):
                        return jsonify({'error': 'route_max_distance_km deve estar entre 0 e 200 km'}), 400
                    restaurant.route_max_distance_km = val
                if 'machine_settlement_mode' in data:
                    modo_maq = str(data['machine_settlement_mode']).upper()
                    if modo_maq not in ('PER_SHIFT', 'PER_DELIVERY'):
                        return jsonify({'error': 'machine_settlement_mode deve ser PER_SHIFT ou PER_DELIVERY'}), 400
                    restaurant.machine_settlement_mode = modo_maq
                if 'seq_reset_mode' in data:
                    modo_seq = str(data['seq_reset_mode']).upper()
                    if modo_seq not in ('DAILY', 'CONTINUOUS'):
                        return jsonify({'error': 'seq_reset_mode deve ser DAILY ou CONTINUOUS'}), 400
                    restaurant.seq_reset_mode = modo_seq

        db.session.commit()

        user_data = user.to_dict(include_sensitive=True)
        if user.driver:
            user_data['driver'] = user.driver.to_dict()

        return jsonify(user_data), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@user_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    """Retorna as notificacoes do usuario logado"""
    try:
        user_id = int(get_jwt_identity())
        from src.models.portal_models import Notification
        notifications = Notification.query.filter_by(
            user_id=user_id
        ).order_by(Notification.created_at.desc()).limit(50).all()

        return jsonify({
            'notifications': [n.to_dict() for n in notifications],
            'unread_count': sum(1 for n in notifications if not n.is_read)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@user_bp.route('/notifications/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_notification_read(notification_id):
    """Marca uma notificacao como lida"""
    try:
        user_id = int(get_jwt_identity())
        from src.models.portal_models import Notification
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=user_id
        ).first()

        if not notification:
            return jsonify({'error': 'Notificacao nao encontrada'}), 404

        notification.is_read = True
        db.session.commit()

        return jsonify({'message': 'Notificacao marcada como lida'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
