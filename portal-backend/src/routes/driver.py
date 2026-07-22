from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.portal_models import Driver, User, UserType, Order, OrderStatus, Payment, PaymentStatus, db
from datetime import datetime, timedelta
from sqlalchemy import func

driver_bp = Blueprint('driver', __name__)

@driver_bp.route('/status', methods=['POST'])
@jwt_required()
def toggle_online_status():
    """Alterna o status online/offline do entregador"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403
        
        driver = user.driver
        if not driver:
            return jsonify({'error': 'Perfil de entregador não encontrado'}), 404
        
        data = request.get_json()
        is_online = data.get('is_online', not driver.is_online)
        
        driver.is_online = is_online
        driver.updated_at = datetime.utcnow()
        
        # Se está ficando online, atualiza a localização
        if is_online and 'latitude' in data and 'longitude' in data:
            driver.current_latitude = data['latitude']
            driver.current_longitude = data['longitude']
            driver.last_location_update = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': f'Status alterado para {"online" if is_online else "offline"}',
            'driver': driver.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@driver_bp.route('/location', methods=['POST'])
@jwt_required()
def update_location():
    """Atualiza a localização do entregador"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403
        
        driver = user.driver
        if not driver:
            return jsonify({'error': 'Perfil de entregador não encontrado'}), 404
        
        data = request.get_json()
        
        if 'latitude' not in data or 'longitude' not in data:
            return jsonify({'error': 'Latitude e longitude são obrigatórias'}), 400
        
        driver.current_latitude = data['latitude']
        driver.current_longitude = data['longitude']
        driver.last_location_update = datetime.utcnow()
        driver.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Localização atualizada com sucesso',
            'latitude': float(driver.current_latitude),
            'longitude': float(driver.current_longitude),
            'last_update': driver.last_location_update.isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@driver_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_driver_stats():
    """Obtém estatísticas do entregador"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403
        
        driver = user.driver
        if not driver:
            return jsonify({'error': 'Perfil de entregador não encontrado'}), 404
        
        # Estatísticas básicas
        from src.models.portal_models import Delivery, Payment, OrderStatus
        
        # Total de entregas
        total_deliveries = driver.total_deliveries
        
        # Ganhos totais
        total_earnings = db.session.query(func.sum(Payment.amount)).filter_by(driver_id=driver.id).scalar() or 0
        
        # Ganhos do dia atual
        today = datetime.utcnow().date()
        today_earnings = db.session.query(func.sum(Payment.amount)).filter(
            Payment.driver_id == driver.id,
            func.date(Payment.created_at) == today
        ).scalar() or 0
        
        # Ganhos da semana
        from datetime import timedelta
        week_start = today - timedelta(days=today.weekday())
        week_earnings = db.session.query(func.sum(Payment.amount)).filter(
            Payment.driver_id == driver.id,
            func.date(Payment.created_at) >= week_start
        ).scalar() or 0
        
        # Avaliação média
        avg_rating = db.session.query(func.avg(Delivery.customer_rating)).filter_by(driver_id=driver.id).scalar() or 5.0
        
        return jsonify({
            'total_deliveries': total_deliveries,
            'total_earnings': float(total_earnings),
            'today_earnings': float(today_earnings),
            'week_earnings': float(week_earnings),
            'average_rating': float(avg_rating),
            'current_rating': float(driver.rating)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@driver_bp.route('/earnings', methods=['GET'])
@jwt_required()
def get_earnings_history():
    """Obtém o histórico de ganhos do entregador"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403
        
        driver = user.driver
        if not driver:
            return jsonify({'error': 'Perfil de entregador não encontrado'}), 404
        
        # Parâmetros de paginação
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Filtros opcionais
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        from src.models.portal_models import Payment
        
        query = Payment.query.filter_by(driver_id=driver.id)
        
        if start_date:
            query = query.filter(Payment.created_at >= datetime.strptime(start_date, '%Y-%m-%d'))
        if end_date:
            query = query.filter(Payment.created_at <= datetime.strptime(end_date, '%Y-%m-%d'))
        
        payments = query.order_by(Payment.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'payments': [payment.to_dict() for payment in payments.items],
            'total': payments.total,
            'pages': payments.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@driver_bp.route('/delivery-history', methods=['GET'])
@jwt_required()
def get_delivery_history():
    """Obtém o histórico de entregas do entregador"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403
        
        driver = user.driver
        if not driver:
            return jsonify({'error': 'Perfil de entregador não encontrado'}), 404
        
        # Parâmetros de paginação
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        from src.models.portal_models import Order, OrderStatus
        
        orders = Order.query.filter_by(driver_id=driver.id).filter(
            Order.status.in_([OrderStatus.DELIVERED, OrderStatus.CANCELLED])
        ).order_by(Order.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        orders_data = []
        for order in orders.items:
            order_dict = order.to_dict()
            # Adiciona informações do restaurante e cliente
            if order.restaurant:
                order_dict['restaurant'] = {
                    'name': order.restaurant.name,
                    'address': order.restaurant.address
                }
            if order.customer:
                order_dict['customer'] = {
                    'name': order.customer.name,
                    'phone': order.customer.phone
                }
            if order.delivery_address:
                order_dict['delivery_address'] = order.delivery_address.to_dict()
            if order.delivery:
                order_dict['delivery'] = order.delivery.to_dict()
            
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

@driver_bp.route('/nearby', methods=['GET'])
@jwt_required()
def get_nearby_drivers():
    """Obtém entregadores próximos (para uso administrativo)"""
    try:
        latitude = request.args.get('latitude', type=float)
        longitude = request.args.get('longitude', type=float)
        radius_km = request.args.get('radius', 10, type=float)
        
        if not latitude or not longitude:
            return jsonify({'error': 'Latitude e longitude são obrigatórias'}), 400
        
        # Fórmula de Haversine para calcular distância
        # Simplificada para demonstração - em produção usar PostGIS ou similar
        drivers = Driver.query.filter(
            Driver.is_online == True,
            Driver.current_latitude.isnot(None),
            Driver.current_longitude.isnot(None)
        ).all()
        
        nearby_drivers = []
        for driver in drivers:
            # Cálculo simplificado de distância (aproximado)
            lat_diff = abs(float(driver.current_latitude) - latitude)
            lng_diff = abs(float(driver.current_longitude) - longitude)
            
            # Aproximação: 1 grau ≈ 111 km
            distance = ((lat_diff ** 2 + lng_diff ** 2) ** 0.5) * 111
            
            if distance <= radius_km:
                driver_data = driver.to_dict()
                driver_data['distance_km'] = round(distance, 2)
                driver_data['user'] = driver.user.to_dict()
                nearby_drivers.append(driver_data)
        
        # Ordena por distância
        nearby_drivers.sort(key=lambda x: x['distance_km'])
        
        return jsonify({
            'drivers': nearby_drivers,
            'count': len(nearby_drivers)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# GAMIFICACAO - RANKING E CONQUISTAS
# ============================================

@driver_bp.route('/ranking', methods=['GET'])
@jwt_required()
def get_ranking():
    """Obtém o ranking dos entregadores"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403

        # Ranking por entregas (ultimos 30 dias)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        ranking = db.session.query(
            Driver.id,
            User.first_name,
            User.last_name,
            Driver.rating,
            Driver.total_deliveries,
            func.count(Order.id).label('recent_deliveries'),
            func.sum(Payment.amount).label('recent_earnings')
        ).join(User).outerjoin(Order, db.and_(
            Order.driver_id == Driver.id,
            Order.status == OrderStatus.DELIVERED,
            Order.created_at >= thirty_days_ago
        )).outerjoin(Payment, db.and_(
            Payment.driver_id == Driver.id,
            Payment.status == PaymentStatus.PROCESSED,
            Payment.created_at >= thirty_days_ago
        )).group_by(
            Driver.id, User.first_name, User.last_name,
            Driver.rating, Driver.total_deliveries
        ).order_by(
            func.count(Order.id).desc()
        ).all()

        ranking_data = []
        for i, r in enumerate(ranking):
            is_me = r.id == user.driver.id if user.driver else False
            ranking_data.append({
                'position': i + 1,
                'driver_id': r.id,
                'name': f"{r.first_name} {r.last_name}",
                'rating': float(r.rating) if r.rating else 5.0,
                'total_deliveries': r.total_deliveries or 0,
                'recent_deliveries': r.recent_deliveries or 0,
                'recent_earnings': float(r.recent_earnings or 0),
                'is_me': is_me
            })

        # Conquistas do entregador
        achievements = get_driver_achievements(user.driver.id if user.driver else 0)

        # Posicao do entregador no ranking
        my_position = next((r['position'] for r in ranking_data if r['is_me']), None)

        return jsonify({
            'ranking': ranking_data,
            'my_position': my_position,
            'achievements': achievements,
            'total_drivers': len(ranking_data)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@driver_bp.route('/achievements', methods=['GET'])
@jwt_required()
def get_achievements():
    """Obtém as conquistas do entregador"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != UserType.DRIVER:
            return jsonify({'error': 'Usuário não é um entregador'}), 403

        achievements = get_driver_achievements(user.driver.id if user.driver else 0)

        return jsonify({'achievements': achievements}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def get_driver_achievements(driver_id):
    """Calcula as conquistas de um entregador"""
    achievements = []

    driver = Driver.query.get(driver_id)
    if not driver:
        return achievements

    # Conquistas baseadas em entregas
    total = driver.total_deliveries or 0
    if total >= 1:
        achievements.append({'id': 'first_delivery', 'title': 'Primeira Entrega', 'description': 'Realizou sua primeira entrega', 'icon': '🎯', 'unlocked': True})
    else:
        achievements.append({'id': 'first_delivery', 'title': 'Primeira Entrega', 'description': 'Realizou sua primeira entrega', 'icon': '🎯', 'unlocked': False})

    if total >= 10:
        achievements.append({'id': 'ten_deliveries', 'title': '10 Entregas', 'description': 'Realizou 10 entregas', 'icon': '📦', 'unlocked': True})
    else:
        achievements.append({'id': 'ten_deliveries', 'title': '10 Entregas', 'description': f'{total}/10 entregas', 'icon': '📦', 'unlocked': False, 'progress': total, 'target': 10})

    if total >= 50:
        achievements.append({'id': 'fifty_deliveries', 'title': '50 Entregas', 'description': 'Realizou 50 entregas', 'icon': '🏆', 'unlocked': True})
    else:
        achievements.append({'id': 'fifty_deliveries', 'title': '50 Entregas', 'description': f'{total}/50 entregas', 'icon': '🏆', 'unlocked': False, 'progress': total, 'target': 50})

    if total >= 100:
        achievements.append({'id': 'hundred_deliveries', 'title': '100 Entregas', 'description': 'Realizou 100 entregas', 'icon': '💯', 'unlocked': True})
    else:
        achievements.append({'id': 'hundred_deliveries', 'title': '100 Entregas', 'description': f'{total}/100 entregas', 'icon': '💯', 'unlocked': False, 'progress': total, 'target': 100})

    if total >= 500:
        achievements.append({'id': 'five_hundred', 'title': 'Lenda', 'description': 'Realizou 500 entregas', 'icon': '👑', 'unlocked': True})

    # Conquistas baseadas em avaliacao
    rating = float(driver.rating) if driver.rating else 5.0
    if rating >= 4.5:
        achievements.append({'id': 'high_rating', 'title': 'Excelente', 'description': 'Avaliação média 4.5+', 'icon': '⭐', 'unlocked': True})
    elif rating >= 4.0:
        achievements.append({'id': 'good_rating', 'title': 'Bom', 'description': 'Avaliação média 4.0+', 'icon': '✨', 'unlocked': True})

    # Conquista de sequencia (simulada - ultimas 7 dias)
    week_ago = datetime.utcnow() - timedelta(days=7)
    week_deliveries = Order.query.filter(
        Order.driver_id == driver_id,
        Order.status == OrderStatus.DELIVERED,
        Order.created_at >= week_ago
    ).count()

    if week_deliveries >= 7:
        achievements.append({'id': 'week_streak', 'title': 'Sequência de 7', 'description': 'Entregou todos os dias da semana', 'icon': '🔥', 'unlocked': True})
    elif week_deliveries >= 3:
        achievements.append({'id': 'week_streak', 'title': 'Sequência', 'description': f'{week_deliveries}/7 dias esta semana', 'icon': '🔥', 'unlocked': False, 'progress': week_deliveries, 'target': 7})

    return achievements

