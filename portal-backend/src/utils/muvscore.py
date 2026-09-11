# -*- coding: utf-8 -*-
"""
MuvScore - Sistema de Gamificação e Ranking para Entregadores

Gerencia pontuação, níveis e ranking semanal.
"""

from datetime import datetime, date, timedelta, time as dt_time
from src.models.portal_models import (
    db, Driver, DriverPointsLog, DriverWeeklyScore,
    Order, Delivery, SystemConfig, SpecialDay, PeakHour
)
from sqlalchemy import func
import logging

logger = logging.getLogger(__name__)

# ============================================================
# Constantes de pontuação (defaults - configuráveis via SystemConfig)
# ============================================================
POINTS_PER_DELIVERY = 10
RATING_POINTS = {5: 20, 4: 10, 3: 5, 2: -5, 1: -15}
LEVELS = {
    'diamante': {'min': 1000, 'label': 'Diamante', 'color': '#B9F2FF'},
    'ouro': {'min': 500, 'label': 'Ouro', 'color': '#FFD700'},
    'prata': {'min': 100, 'label': 'Prata', 'color': '#C0C0C0'},
    'bronze': {'min': 0, 'label': 'Bronze', 'color': '#CD7F32'},
}


def get_config_value(key, default):
    """Busca valor de configuração do SystemConfig"""
    try:
        config = SystemConfig.query.filter_by(config_key=key).first()
        if config and config.config_value:
            return type(default)(config.config_value)
    except Exception:
        pass
    return default


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
        score.updated_at = datetime.utcnow()

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
    now = datetime.utcnow()
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

    return True


def award_rating_points(driver, rating, order=None):
    """
    Pontua avaliação recebida.
    Chamado quando estabelecimento avalia o entregador.
    """
    points = RATING_POINTS.get(rating, 0)

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
