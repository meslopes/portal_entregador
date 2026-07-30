"""
Rotas do sistema de bonus e ranking de entregadores.
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.portal_models import (
    db, User, Driver, Order, OrderStatus, DriverScore, DriverBonus,
    DriverAchievement, DynamicPricing, Square, Delivery
)
from datetime import datetime, timedelta
from sqlalchemy import func

bonus_bp = Blueprint('bonus', __name__)


def admin_required(f):
    """Decorator para verificar se o usuario e admin"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type.value != 'ADMIN':
            return jsonify({'error': 'Acesso restrito a administradores'}), 403
        return f(*args, **kwargs)
    return decorated_function


# ============================================
# RANKING E PONTUACAO
# ============================================

@bonus_bp.route('/ranking', methods=['GET'])
@jwt_required()
def get_ranking():
    """Obtem o ranking dos entregadores"""
    try:
        period = request.args.get('period', 'monthly')
        today = datetime.utcnow().date()

        if period == 'weekly':
            start_date = today - timedelta(days=today.weekday())
        elif period == 'monthly':
            start_date = today.replace(day=1)
        else:
            start_date = today - timedelta(days=30)

        # Busca entregadores com suas metricas
        from src.utils.tenant import get_current_tenant_id
        tenant_id = get_current_tenant_id()
        
        drivers_query = Driver.query.join(User).filter(User.status == 'ACTIVE')
        if tenant_id:
            drivers_query = drivers_query.filter(Driver.tenant_id == tenant_id)
        drivers = drivers_query.all()

        ranking_data = []
        for driver in drivers:
            # Entregas no periodo
            deliveries = Order.query.filter(
                Order.driver_id == driver.id,
                Order.status == OrderStatus.DELIVERED,
                func.date(Order.delivery_time) >= start_date
            ).all()

            total_deliveries = len(deliveries)
            total_refused = Order.query.filter(
                Order.driver_id == driver.id,
                Order.status == OrderStatus.CANCELLED,
                func.date(Order.updated_at) >= start_date
            ).count()

            # Metricas
            total_notifications = total_deliveries + total_refused
            acceptance_rate = (total_deliveries / total_notifications * 100) if total_notifications > 0 else 100

            # Tempo medio de aceite (simulado)
            accept_time_avg = 45  # segundos

            # Tempo medio de entrega (simulado)
            delivery_time_avg = 20  # minutos

            # Avaliacao media
            avg_rating = driver.rating or 5.0

            # Horas online (simulado)
            hours_online = total_deliveries * 2  # estimativa

            # Calcula pontuacao
            score = calculate_score(accept_time_avg, delivery_time_avg, acceptance_rate, avg_rating, hours_online)

            ranking_data.append({
                'driver_id': driver.id,
                'name': f"{driver.user.first_name} {driver.user.last_name}",
                'total_deliveries': total_deliveries,
                'acceptance_rate': round(acceptance_rate, 1),
                'avg_rating': float(avg_rating),
                'hours_online': hours_online,
                'score': round(score, 1),
                'vehicle_type': driver.vehicle_type.value
            })

        # Ordena por pontuacao
        ranking_data.sort(key=lambda x: x['score'], reverse=True)

        # Adiciona posicao
        for i, item in enumerate(ranking_data):
            item['position'] = i + 1

        return jsonify({
            'ranking': ranking_data[:20],  # Top 20
            'total_drivers': len(ranking_data),
            'period': period
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def calculate_score(accept_time_avg, delivery_time_avg, acceptance_rate, avg_rating, hours_online):
    """Calcula a pontuacao do entregador baseado nos criterios"""
    # Tempo de aceite (20 pts maximo)
    if accept_time_avg < 30:
        accept_score = 20
    elif accept_time_avg < 60:
        accept_score = 16
    elif accept_time_avg < 120:
        accept_score = 12
    elif accept_time_avg < 180:
        accept_score = 8
    elif accept_time_avg < 300:
        accept_score = 4
    else:
        accept_score = 0

    # Velocidade de entrega (25 pts maximo)
    if delivery_time_avg < 15:
        speed_score = 25
    elif delivery_time_avg < 20:
        speed_score = 20
    elif delivery_time_avg < 30:
        speed_score = 15
    elif delivery_time_avg < 45:
        speed_score = 10
    elif delivery_time_avg < 60:
        speed_score = 5
    else:
        speed_score = 0

    # Taxa de aceitacao (20 pts maximo)
    if acceptance_rate >= 95:
        acceptance_score = 20
    elif acceptance_rate >= 90:
        acceptance_score = 16
    elif acceptance_rate >= 80:
        acceptance_score = 12
    elif acceptance_rate >= 70:
        acceptance_score = 8
    elif acceptance_rate >= 60:
        acceptance_score = 4
    else:
        acceptance_score = 0

    # Avaliacao (25 pts maximo)
    if avg_rating >= 4.8:
        rating_score = 25
    elif avg_rating >= 4.5:
        rating_score = 20
    elif avg_rating >= 4.0:
        rating_score = 15
    elif avg_rating >= 3.5:
        rating_score = 10
    elif avg_rating >= 3.0:
        rating_score = 5
    else:
        rating_score = 0

    # Tempo online (10 pts maximo)
    if hours_online >= 200:
        online_score = 10
    elif hours_online >= 160:
        online_score = 8
    elif hours_online >= 120:
        online_score = 6
    elif hours_online >= 80:
        online_score = 4
    elif hours_online >= 40:
        online_score = 2
    else:
        online_score = 0

    # Pontuacao final com pesos
    total = (accept_score * 0.20) + (speed_score * 0.25) + (acceptance_score * 0.20) + (rating_score * 0.25) + (online_score * 0.10)

    return total * 10  # Escala de 0 a 100


# ============================================
# BONUS
# ============================================

@bonus_bp.route('/bonuses', methods=['GET'])
@jwt_required()
def get_bonuses():
    """Lista bonus de um entregador"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type.value == 'DRIVER':
            driver = user.driver
            if not driver:
                return jsonify({'error': 'Perfil nao encontrado'}), 404
            bonuses = DriverBonus.query.filter_by(driver_id=driver.id).order_by(DriverBonus.created_at.desc()).limit(50).all()
        else:
            # Admin pode ver todos
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 20, type=int)
            bonuses = DriverBonus.query.order_by(DriverBonus.created_at.desc()).paginate(page=page, per_page=per_page).items

        return jsonify({
            'bonuses': [b.to_dict() for b in bonuses],
            'count': len(bonuses)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bonus_bp.route('/bonuses/process-weekly', methods=['POST'])
@jwt_required()
@admin_required
def process_weekly_bonuses():
    """Processa bonus semanais (top 3)"""
    try:
        today = datetime.utcnow().date()
        week_start = today - timedelta(days=today.weekday())
        week_end = today

        # Busca ranking da semana
        drivers = Driver.query.join(User).filter(User.status == 'ACTIVE').all()

        ranking = []
        for driver in drivers:
            deliveries = Order.query.filter(
                Order.driver_id == driver.id,
                Order.status == OrderStatus.DELIVERED,
                func.date(Order.delivery_time) >= week_start
            ).count()

            ranking.append({
                'driver': driver,
                'deliveries': deliveries
            })

        ranking.sort(key=lambda x: x['deliveries'], reverse=True)

        # Pool da semana (estimativa: 100 entregas x R$15 x 5%)
        weekly_pool = 100 * 15 * 0.05  # R$ 75,00

        # Distribui para top 3
        distribution = [
            {'position': 1, 'percentage': 0.40, 'label': '1º Lugar - Entregador do Semana'},
            {'position': 2, 'percentage': 0.35, 'label': '2º Lugar'},
            {'position': 3, 'percentage': 0.25, 'label': '3º Lugar'},
        ]

        bonuses_created = []
        for i, dist in enumerate(distribution[:3]):
            if i < len(ranking):
                driver = ranking[i]['driver']
                amount = weekly_pool * dist['percentage']

                bonus = DriverBonus(
                    driver_id=driver.id,
                    amount=amount,
                    bonus_type='weekly',
                    criteria=dist['label'],
                    period_start=week_start,
                    period_end=week_end,
                    status='PENDING'
                )
                db.session.add(bonus)
                bonuses_created.append({
                    'driver': f"{driver.user.first_name} {driver.user.last_name}",
                    'amount': float(amount),
                    'position': dist['position']
                })

        db.session.commit()

        return jsonify({
            'message': 'Bonus semanais processados',
            'bonuses': bonuses_created,
            'pool_total': weekly_pool
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bonus_bp.route('/bonuses/process-monthly', methods=['POST'])
@jwt_required()
@admin_required
def process_monthly_bonuses():
    """Processa bonus mensais (top 5)"""
    try:
        today = datetime.utcnow().date()
        month_start = today.replace(day=1)

        # Busca ranking do mes
        drivers = Driver.query.join(User).filter(User.status == 'ACTIVE').all()

        ranking = []
        for driver in drivers:
            deliveries = Order.query.filter(
                Order.driver_id == driver.id,
                Order.status == OrderStatus.DELIVERED,
                func.date(Order.delivery_time) >= month_start
            ).count()

            ranking.append({
                'driver': driver,
                'deliveries': deliveries
            })

        ranking.sort(key=lambda x: x['deliveries'], reverse=True)

        # Pool do mes (estimativa: 1000 entregas x R$15 x 5%)
        monthly_pool = 1000 * 15 * 0.05  # R$ 750,00

        # Distribui para top 5
        distribution = [
            {'position': 1, 'percentage': 0.35, 'label': '1º Lugar - Entregador do Mes'},
            {'position': 2, 'percentage': 0.25, 'label': '2º Lugar'},
            {'position': 3, 'percentage': 0.20, 'label': '3º Lugar'},
            {'position': 4, 'percentage': 0.12, 'label': '4º Lugar'},
            {'position': 5, 'percentage': 0.08, 'label': '5º Lugar'},
        ]

        bonuses_created = []
        for i, dist in enumerate(distribution[:5]):
            if i < len(ranking):
                driver = ranking[i]['driver']
                amount = monthly_pool * dist['percentage']

                bonus = DriverBonus(
                    driver_id=driver.id,
                    amount=amount,
                    bonus_type='monthly',
                    criteria=dist['label'],
                    period_start=month_start,
                    period_end=today,
                    status='PENDING'
                )
                db.session.add(bonus)
                bonuses_created.append({
                    'driver': f"{driver.user.first_name} {driver.user.last_name}",
                    'amount': float(amount),
                    'position': dist['position']
                })

        db.session.commit()

        return jsonify({
            'message': 'Bonus mensais processados',
            'bonuses': bonuses_created,
            'pool_total': monthly_pool
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================
# CONQUISTAS
# ============================================

@bonus_bp.route('/achievements', methods=['GET'])
@jwt_required()
def get_achievements():
    """Lista conquistas do entregador"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type.value == 'DRIVER':
            driver = user.driver
            if not driver:
                return jsonify({'error': 'Perfil nao encontrado'}), 404
            achievements = DriverAchievement.query.filter_by(driver_id=driver.id).all()
        else:
            achievements = DriverAchievement.query.all()

        return jsonify({
            'achievements': [a.to_dict() for a in achievements]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def check_achievements(driver_id):
    """Verifica e desbloqueia conquistas do entregador"""
    driver = Driver.query.get(driver_id)
    if not driver:
        return

    existing = [a.achievement_type for a in DriverAchievement.query.filter_by(driver_id=driver_id).all()]

    # Total de entregas
    total_deliveries = driver.total_deliveries

    achievements_to_check = [
        ('first_delivery', 'Primeira Entrega', total_deliveries >= 1),
        ('10_deliveries', '10 Entregas', total_deliveries >= 10),
        ('50_deliveries', '50 Entregas', total_deliveries >= 50),
        ('100_deliveries', '100 Entregas', total_deliveries >= 100),
        ('500_deliveries', '500 Entregas', total_deliveries >= 500),
    ]

    for achievement_type, achievement_name, condition in achievements_to_check:
        if condition and achievement_type not in existing:
            achievement = DriverAchievement(
                driver_id=driver_id,
                achievement_type=achievement_type,
                achievement_name=achievement_name
            )
            db.session.add(achievement)

    db.session.commit()
