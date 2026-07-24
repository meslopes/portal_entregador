from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.portal_models import User, Driver, Customer, db

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

        user_data = user.to_dict()

        # Inclui dados do driver se for entregador
        if user.driver:
            user_data['driver'] = user.driver.to_dict()

        # Inclui dados do customer se for estabelecimento
        customer = Customer.query.filter_by(user_id=user.id).first()
        if customer:
            user_data['customer'] = customer.to_dict()

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
                driver.vehicle_type = data['vehicle_type']
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

        db.session.commit()

        user_data = user.to_dict()
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
