# -*- coding: utf-8 -*-
"""
MuvScore - Sistema de Gamificação e Ranking para Entregadores

Gerencia pontuação, níveis e ranking semanal.
"""

from datetime import datetime, date, timedelta, time as dt_time, timezone
from src.models.portal_models import (
    db, Driver, DriverPointsLog, DriverWeeklyScore,
    Order, Delivery, SystemConfig, SpecialDay, PeakHour
)
from sqlalchemy import func
import logging
import json

logger = logging.getLogger(__name__)

# ============================================================
# Constantes de pontuação (defaults - configuráveis via SystemConfig)
# Para configurar: inserir registro na tabela system_configs
# com config_key e config_value (JSON para estruturas complexas)
# ============================================================
POINTS_PER_DELIVERY = 10
RATING_POINTS_DEFAULT = {5: 20, 4: 10, 3: 5, 2: -5, 1: -15}
LEVELS_DEFAULT = {
    'diamante': {'min': 1000, 'label': 'Diamante', 'color': '#B9F2FF'},
    'ouro': {'min': 500, 'label': 'Ouro', 'color': '#FFD700'},
    'prata': {'min': 100, 'label': 'Prata', 'color': '#C0C0C0'},
    'bronze': {'min': 0, 'label': 'Bronze', 'color': '#CD7F32'},
}
REWARD_DISTRIBUTION_DEFAULT = {1: 0.30, 2: 0.20, 3: 0.15, 'others': 0.35}


def get_config_value(key, default):
    """Busca valor de configuração do SystemConfig"""
    try:
        config = SystemConfig.query.filter_by(config_key=key).first()
        if config and config.config_value:
            return type(default)(config.config_value)
    except Exception:
        pass
    return default


def get_json_config(key, default):
    """Busca valor JSON de configuração do SystemConfig.
    Usado para estruturas complexas (dicts, lists).
    Exemplo de config_value no banco: '{"5": 20, "4": 10, "3": 5}'
    """
    try:
        config = SystemConfig.query.filter_by(config_key=key).first()
        if config and config.config_value:
            return json.loads(config.config_value)
    except (json.JSONDecodeError, Exception):
        pass
    return default


def get_rating_points():
    """Retorna pontos por avaliação, configurável via SystemConfig (key: muvscore_rating_points)"""
    return get_json_config('muvscore_rating_points', RATING_POINTS_DEFAULT)


def get_levels():
    """Retorna níveis e thresholds, configurável via SystemConfig (key: muvscore_levels)"""
    return get_json_config('muvscore_levels', LEVELS_DEFAULT)


def get_reward_distribution():
    """Retorna distribuição do pool por posição, configurável via SystemConfig (key: muvscore_reward_distribution)"""
    return get_json_config('muvscore_reward_distribution', REWARD_DISTRIBUTION_DEFAULT)


def get_current_week():
    """Retorna o início (segunda) e fim (domingo) da semana atual"""
    today = date.today()
    # Monday=0, Sunday=6
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


def get_or_create_weekly_score(driver):
    """Obtém ou cria o registro de pontuação semanal do entregador"""
    week_start, week_end = get_current_week()

    score = DriverWeeklyScore.query.filter_by(
        driver_id=driver.id,
        week_start=week_start
    ).first()

    if not score:
        score = DriverWeeklyScore(
            driver_id=driver.id,
            tenant_id=driver.tenant_id,
            square_id=driver.square_id,
            week_start=week_start,
            week_end=week_end,
            total_points=0,
            total_deliveries=0,
            streak_days=0,
            level='bronze'
        )
        db.session.add(score)

    return score


def award_points(driver, points, reason, description=None, order_id=None):
    """
    Registra pontos para o entregador e atualiza o score semanal.

    Args:
        driver: objeto Driver
        points: int (positivo = ganhou, negativo = perdeu)
        reason: str (delivery, rating, special_day, peak_hour, streak)
        description: str (descrição legível)
        order_id: int (opcional, referência ao pedido)
    """
    try:
        # Registrar no log
        log = DriverPointsLog(
            driver_id=driver.id,
            tenant_id=driver.tenant_id,
            points=points,
            reason=reason,
            order_id=order_id,
            description=description
        )
        db.session.add(log)

        # Atualizar score semanal
        score = get_or_create_weekly_score(driver)
        score.total_points = (score.total_points or 0) + points

        # Atualizar entregas se for pontuação de delivery
        if reason == 'delivery':
            score.total_deliveries = (score.total_deliveries or 0) + 1

        # Recalcular nível
        score.level = DriverWeeklyScore.calculate_level(score.total_points)
        score.updated_at = datetime.now(timezone.utc)

        db.session.commit()

        logger.info(f"MuvScore: driver={driver.id} +{points}pts ({reason}) total={score.total_points} level={score.level}")
        return True

    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao registrar pontos: {e}")
        return False


def award_delivery_points(driver, order):
    """
    Pontua entrega concluída.
    Chamado quando um pedido muda para DELIVERED.
    Verifica bônus de dia especial e horário de pico.
    """
    points_per_delivery = get_config_value('points_per_delivery', POINTS_PER_DELIVERY)
    now = datetime.now(timezone.utc)
    today = now.date()
    current_time = now.time()

    # Pontos base
    base_points = points_per_delivery
    description = f"Entrega #{order.order_number} concluída"
    award_points(driver, base_points, 'delivery', description, order.id)

    # Verificar dia especial
    special = SpecialDay.query.filter_by(
        tenant_id=driver.tenant_id,
        date=today,
        is_active=True
    ).first()
    if special:
        bonus = int(base_points * (float(special.multiplier) - 1.0))
        if bonus > 0:
            award_points(driver, bonus, 'special_day',
                        f"Bônus dia especial ({special.reason}): {special.multiplier}x", order.id)

    # Verificar horário de pico
    peak = PeakHour.query.filter(
        PeakHour.tenant_id == driver.tenant_id,
        PeakHour.is_active == True,
        PeakHour.start_time <= current_time,
        PeakHour.end_time >= current_time
    ).first()
    if peak:
        bonus = int(base_points * (float(peak.multiplier) - 1.0))
        if bonus > 0:
            award_points(driver, bonus, 'peak_hour',
                        f"Bônus horário de pico ({peak.start_time.strftime('%H:%M')}-{peak.end_time.strftime('%H:%M')}): {peak.multiplier}x", order.id)

    # Verificar e atualizar streak
    try:
        check_and_award_streak(driver)
    except Exception as e:
        logger.error(f"Erro ao verificar streak: {e}")

    return True


def award_rating_points(driver, rating, order=None):
    """
    Pontua avaliação recebida.
    Chamado quando estabelecimento avalia o entregador.
    """
    points = get_rating_points().get(str(rating), get_rating_points().get(rating, 0))

    if points == 0:
        return False

    # Verificar se rating está acima do mínimo para bônus
    min_rating = get_config_value('min_rating_for_bonus', 3.0)
    if rating < min_rating:
        # Avaliação abaixo do mínimo - pontos negativos
        description = f"Avaliação {rating}★ recebida (abaixo do mínimo)"
    else:
        description = f"Avaliação {rating}★ recebida"

    return award_points(driver, points, 'rating', description,
                       order.id if order else None)


def get_driver_current_score(driver):
    """Retorna o score semanal atual do entregador"""
    score = get_or_create_weekly_score(driver)
    return score.to_dict()


def get_weekly_ranking(tenant_id, square_id=None, limit=30):
    """
    Retorna o ranking semanal dos entregadores.
    Ordenado por total_points (decrescente).
    """
    week_start, week_end = get_current_week()

    query = DriverWeeklyScore.query.filter(
        DriverWeeklyScore.tenant_id == tenant_id,
        DriverWeeklyScore.week_start == week_start,
        DriverWeeklyScore.total_points > 0
    )

    if square_id:
        query = query.filter(DriverWeeklyScore.square_id == square_id)

    # Filtrar mínimo de entregas
    min_deliveries = get_config_value('min_deliveries_ranking', 5)
    query = query.filter(DriverWeeklyScore.total_deliveries >= min_deliveries)

    scores = query.order_by(DriverWeeklyScore.total_points.desc()).limit(limit).all()

    # Atualizar posições
    ranking = []
    for i, score in enumerate(scores):
        score.position = i + 1
        ranking.append({
            'position': i + 1,
            'driver_id': score.driver_id,
            'driver_name': f"{score.driver.user.first_name} {score.driver.user.last_name}" if score.driver and score.driver.user else 'N/A',
            'total_points': score.total_points,
            'total_deliveries': score.total_deliveries,
            'avg_rating': float(score.avg_rating) if score.avg_rating else None,
            'level': score.level,
            'streak_days': score.streak_days,
        })

    db.session.commit()
    return ranking


def get_driver_points_history(driver_id, limit=20):
    """Retorna o histórico de pontos do entregador"""
    logs = DriverPointsLog.query.filter_by(
        driver_id=driver_id
    ).order_by(
        DriverPointsLog.created_at.desc()
    ).limit(limit).all()

    return [log.to_dict() for log in logs]


def calculate_streak(driver):
    """
    Calcula quantos dias consecutivos o entregador trabalhou.
    Um dia conta como "trabalhado" se teve pelo menos 1 entrega concluída.
    """
    today = date.today()
    streak = 0
    check_date = today

    for _ in range(365):  # Máximo1ano
        # Verificar se teve entrega neste dia
        has_delivery = db.session.query(DriverPointsLog.query.filter(
            DriverPointsLog.driver_id == driver.id,
            DriverPointsLog.reason == 'delivery',
            func.date(DriverPointsLog.created_at) == check_date
        ).exists()).scalar()

        if has_delivery:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    return streak


def check_and_award_streak(driver):
    """
    Verifica e premia streak do entregador.
    Bônus de5% reservado do pool semanal para streak7+ dias.
    """
    streak = calculate_streak(driver)

    # Atualizar streak no score semanal
    score = get_or_create_weekly_score(driver)
    score.streak_days = streak

    # Bônus de streak (7+ dias consecutivos =50 pontos)
    if streak >= 7:
        streak_bonus = get_config_value('streak_bonus_7_days', 50)
        # Verificar se já recebeu bônus de streak esta semana
        existing = DriverPointsLog.query.filter(
            DriverPointsLog.driver_id == driver.id,
            DriverPointsLog.reason == 'streak',
            func.date(DriverPointsLog.created_at) >= score.week_start
        ).first()
        if not existing:
            award_points(driver, streak_bonus, 'streak',
                        f"Bônus streak: {streak} dias consecutivos!")

    db.session.commit()
    return streak


def calculate_acceptance_rate(driver, days=7):
    """Calcula a taxa de aceite do entregador nos últimos N dias"""
    from src.models.portal_models import Order, OrderStatus
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Pedidos ofertados (via driver_assignments ou offers)
    # Por simplicidade, usar orders onde driver_id = driver.id
    total_offered = Order.query.filter(
        Order.driver_id == driver.id,
        Order.created_at >= since
    ).count()

    if total_offered == 0:
        return 100.0  # Sem ofertas = 100%

    total_accepted = Order.query.filter(
        Order.driver_id == driver.id,
        Order.status.in_([OrderStatus.ACCEPTED, OrderStatus.PREPARING,
                         OrderStatus.READY, OrderStatus.PICKED_UP, OrderStatus.DELIVERED]),
        Order.created_at >= since
    ).count()

    return round((total_accepted / total_offered) * 100, 1)


def calculate_completion_rate(driver, days=7):
    """Calcula a taxa de conclusão (entregas / pedidos aceitos) nos últimos N dias"""
    from src.models.portal_models import Order, OrderStatus
    since = datetime.now(timezone.utc) - timedelta(days=days)

    total_accepted = Order.query.filter(
        Order.driver_id == driver.id,
        Order.status.in_([OrderStatus.ACCEPTED, OrderStatus.PREPARING,
                         OrderStatus.READY, OrderStatus.PICKED_UP, OrderStatus.DELIVERED]),
        Order.created_at >= since
    ).count()

    if total_accepted == 0:
        return 100.0

    total_delivered = Order.query.filter(
        Order.driver_id == driver.id,
        Order.status == OrderStatus.DELIVERED,
        Order.created_at >= since
    ).count()

    return round((total_delivered / total_accepted) * 100, 1)


# ============================================================
# PREMIAÇÃO SEMANAL - Pool de5%
# ============================================================

# Distribuição percentual do pool por posição
REWARD_DISTRIBUTION = [
    {'positions': [1], 'percent': 15},
    {'positions': [2], 'percent': 10},
    {'positions': [3], 'percent': 8},
    {'positions': [4, 5], 'percent_each': 6},  # 6% cada =12% total
    {'positions': list(range(6, 11)), 'percent_each': 4},  # 4% cada =20% total
    {'positions': list(range(11, 21)), 'percent_each': 2},  # 2% cada =20% total
    {'positions': list(range(21, 31)), 'percent_each': 1},  # 1% cada =10% total
]
STREAK_POOL_PERCENT = 5  # 5% do pool para bônus de streak


def calculate_weekly_pool(tenant_id, week_start=None):
    """
    Calcula o pool de premiação da semana.
    Soma5% de todas as taxas de entrega da semana.
    """
    if week_start is None:
        week_start, _ = get_current_week()

    week_end = week_start + timedelta(days=6)

    # Buscar total de fretes da semana
    from src.models.portal_models import Delivery, Order
    total_fees = db.session.query(func.sum(Delivery.delivery_fee)).join(
        Order, Delivery.order_id == Order.id
    ).filter(
        Order.tenant_id == tenant_id,
        Order.status == OrderStatus.DELIVERED,
        func.date(Order.delivery_time) >= week_start,
        func.date(Order.delivery_time) <= week_end
    ).scalar() or 0

    # Buscar percentual de gamificação (default5%)
    gamification_pct = get_config_value('gamification_percentage', 5.0) / 100.0

    pool = float(total_fees) * gamification_pct
    return round(pool, 2)


def distribute_weekly_rewards(tenant_id, week_start=None):
    """
    Distribui o pool de premiação semanal aos top entregadores.
    Retorna o resultado da distribuição.
    """
    if week_start is None:
        week_start, _ = get_current_week()

    pool = calculate_weekly_pool(tenant_id, week_start)
    if pool <= 0:
        return {'pool': 0, 'distributed': 0, 'rewards': []}

    # Buscar ranking da semana
    min_deliveries = get_config_value('min_deliveries_ranking', 5)
    scores = DriverWeeklyScore.query.filter(
        DriverWeeklyScore.tenant_id == tenant_id,
        DriverWeeklyScore.week_start == week_start,
        DriverWeeklyScore.total_deliveries >= min_deliveries
    ).order_by(DriverWeeklyScore.total_points.desc()).limit(30).all()

    rewards = []
    total_distributed = 0

    for dist in REWARD_DISTRIBUTION:
        if 'percent' in dist:
            # Posição única
            pos = dist['positions'][0]
            if pos <= len(scores):
                score = scores[pos - 1]
                amount = round(pool * (dist['percent'] / 100), 2)
                rewards.append({
                    'driver_id': score.driver_id,
                    'position': pos,
                    'points': score.total_points,
                    'deliveries': score.total_deliveries,
                    'amount': amount,
                    'type': 'ranking'
                })
                total_distributed += amount
        else:
            # Múltiplas posições
            for pos in dist['positions']:
                if pos <= len(scores):
                    score = scores[pos - 1]
                    amount = round(pool * (dist['percent_each'] / 100), 2)
                    rewards.append({
                        'driver_id': score.driver_id,
                        'position': pos,
                        'points': score.total_points,
                        'deliveries': score.total_deliveries,
                        'amount': amount,
                        'type': 'ranking'
                    })
                    total_distributed += amount

    # Bônus de streak (5% do pool)
    streak_pool = round(pool * (STREAK_POOL_PERCENT / 100), 2)
    streak_drivers = [s for s in scores if s.streak_days >= 7]
    if streak_drivers and streak_pool > 0:
        streak_each = round(streak_pool / len(streak_drivers), 2)
        for score in streak_drivers:
            rewards.append({
                'driver_id': score.driver_id,
                'position': None,
                'points': score.total_points,
                'deliveries': score.total_deliveries,
                'amount': streak_each,
                'type': 'streak_bonus'
            })
            total_distributed += streak_each

    carried_over = round(pool - total_distributed, 2)

    return {
        'pool': pool,
        'distributed': round(total_distributed, 2),
        'carried_over': carried_over,
        'driver_count': len(scores),
        'rewards': rewards
    }
