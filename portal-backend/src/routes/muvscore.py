# -*- coding: utf-8 -*-
"""
MuvScore API - Endpoints de gamificação e ranking
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.models.portal_models import (
    db, User, Driver, DriverWeeklyScore
)
from src.utils.muvscore import (
    get_driver_current_score, get_weekly_ranking, get_driver_points_history
)
import logging

logger = logging.getLogger(__name__)

muvscore_bp = Blueprint('muvscore', __name__)


@muvscore_bp.route('/score', methods=['GET'])
@jwt_required()
def get_my_score():
    """Retorna o MuvScore do entregador logado"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type.value != 'DRIVER':
            return jsonify({'error': 'Usuário não é um entregador'}), 403

        driver = user.driver
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404

        score = get_driver_current_score(driver)

        # Buscar posição no ranking
        from src.models.portal_models import DriverWeeklyScore
        from src.utils.muvscore import LEVELS

        level_info = LEVELS.get(score.get('level', 'bronze'), LEVELS['bronze'])

        return jsonify({
            'score': score,
            'level_info': level_info,
            'driver_id': driver.id
        }), 200

    except Exception as e:
        logger.error(f"Erro ao buscar score: {e}")
        return jsonify({'error': str(e)}), 500


@muvscore_bp.route('/ranking', methods=['GET'])
@jwt_required()
def get_ranking():
    """Retorna o ranking semanal dos entregadores"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type.value != 'DRIVER':
            return jsonify({'error': 'Usuário não é um entregador'}), 403

        driver = user.driver
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404

        square_id = request.args.get('square_id', type=int)
        limit = request.args.get('limit', 30, type=int)

        ranking = get_weekly_ranking(
            tenant_id=driver.tenant_id,
            square_id=square_id or driver.square_id,
            limit=limit
        )

        # Encontrar posição do entregador logado
        my_position = None
        my_score = get_driver_current_score(driver)
        for entry in ranking:
            if entry['driver_id'] == driver.id:
                my_position = entry['position']
                break

        return jsonify({
            'ranking': ranking,
            'my_position': my_position,
            'my_score': my_score,
            'total_drivers': len(ranking)
        }), 200

    except Exception as e:
        logger.error(f"Erro ao buscar ranking: {e}")
        return jsonify({'error': str(e)}), 500


@muvscore_bp.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    """Retorna o histórico de pontos do entregador"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type.value != 'DRIVER':
            return jsonify({'error': 'Usuário não é um entregador'}), 403

        driver = user.driver
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404

        limit = request.args.get('limit', 20, type=int)
        history = get_driver_points_history(driver.id, limit)

        return jsonify({
            'history': history,
            'total': len(history)
        }), 200

    except Exception as e:
        logger.error(f"Erro ao buscar histórico: {e}")
        return jsonify({'error': str(e)}), 500


@muvscore_bp.route('/levels', methods=['GET'])
@jwt_required()
def get_levels():
    """Retorna os níveis e thresholds"""
    try:
        from src.utils.muvscore import LEVELS
        return jsonify({'levels': LEVELS}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@muvscore_bp.route('/rates', methods=['GET'])
@jwt_required()
def get_my_rates():
    """Retorna as taxas de aceite e conclusão do entregador"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type.value != 'DRIVER':
            return jsonify({'error': 'Usuário não é um entregador'}), 403

        driver = user.driver
        if not driver:
            return jsonify({'error': 'Entregador não encontrado'}), 404

        from src.utils.muvscore import calculate_acceptance_rate, calculate_completion_rate, calculate_streak

        acceptance = calculate_acceptance_rate(driver)
        completion = calculate_completion_rate(driver)
        streak = calculate_streak(driver)

        return jsonify({
            'acceptance_rate': acceptance,
            'completion_rate': completion,
            'streak_days': streak
        }), 200

    except Exception as e:
        logger.error(f"Erro ao buscar taxas: {e}")
        return jsonify({'error': str(e)}), 500


@muvscore_bp.route('/admin/ranking', methods=['GET'])
@jwt_required()
def admin_ranking():
    """Ranking completo para o admin (todos os entregadores)"""
    try:
        from src.routes.admin import admin_required
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type.value != 'ADMIN':
            return jsonify({'error': 'Acesso restrito a admins'}), 403

        tenant_id = user.tenant_id
        square_id = request.args.get('square_id', type=int)
        limit = request.args.get('limit', 50, type=int)

        ranking = get_weekly_ranking(
            tenant_id=tenant_id,
            square_id=square_id,
            limit=limit
        )

        return jsonify({
            'ranking': ranking,
            'total_drivers': len(ranking)
        }), 200

    except Exception as e:
        logger.error(f"Erro ao buscar ranking admin: {e}")
        return jsonify({'error': str(e)}), 500


# ============================================================
# ADMIN - Dias Especiais
# ============================================================

@muvscore_bp.route('/admin/special-days', methods=['GET'])
@jwt_required()
def list_special_days():
    """Lista dias especiais do tenant"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type.value != 'ADMIN':
            return jsonify({'error': 'Acesso restrito'}), 403

        from src.models.portal_models import SpecialDay
        days = SpecialDay.query.filter_by(tenant_id=user.tenant_id).order_by(SpecialDay.date.desc()).all()
        return jsonify({'special_days': [d.to_dict() for d in days]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@muvscore_bp.route('/admin/special-days', methods=['POST'])
@jwt_required()
def create_special_day():
    """Cria um dia especial"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type.value != 'ADMIN':
            return jsonify({'error': 'Acesso restrito'}), 403

        from src.models.portal_models import SpecialDay
        data = request.get_json()

        if not data.get('date') or not data.get('reason'):
            return jsonify({'error': 'Data e motivo são obrigatórios'}), 400

        day = SpecialDay(
            tenant_id=user.tenant_id,
            date=datetime.strptime(data['date'], '%Y-%m-%d').date(),
            reason=data['reason'],
            multiplier=float(data.get('multiplier', 1.5)),
            is_active=data.get('is_active', True)
        )
        db.session.add(day)
        db.session.commit()

        return jsonify({'message': 'Dia especial criado', 'special_day': day.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@muvscore_bp.route('/admin/special-days/<int:day_id>', methods=['DELETE'])
@jwt_required()
def delete_special_day(day_id):
    """Remove um dia especial"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type.value != 'ADMIN':
            return jsonify({'error': 'Acesso restrito'}), 403

        from src.models.portal_models import SpecialDay
        day = SpecialDay.query.filter_by(id=day_id, tenant_id=user.tenant_id).first()
        if not day:
            return jsonify({'error': 'Dia especial não encontrado'}), 404

        db.session.delete(day)
        db.session.commit()
        return jsonify({'message': 'Dia especial removido'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================
# ADMIN - Horários de Pico
# ============================================================

@muvscore_bp.route('/admin/peak-hours', methods=['GET'])
@jwt_required()
def list_peak_hours():
    """Lista horários de pico do tenant"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type.value != 'ADMIN':
            return jsonify({'error': 'Acesso restrito'}), 403

        from src.models.portal_models import PeakHour
        hours = PeakHour.query.filter_by(tenant_id=user.tenant_id).order_by(PeakHour.start_time).all()
        return jsonify({'peak_hours': [h.to_dict() for h in hours]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@muvscore_bp.route('/admin/peak-hours', methods=['POST'])
@jwt_required()
def create_peak_hour():
    """Cria um horário de pico"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type.value != 'ADMIN':
            return jsonify({'error': 'Acesso restrito'}), 403

        from src.models.portal_models import PeakHour
        data = request.get_json()

        if not data.get('start_time') or not data.get('end_time'):
            return jsonify({'error': 'Horário início e fim são obrigatórios'}), 400

        hour = PeakHour(
            tenant_id=user.tenant_id,
            start_time=datetime.strptime(data['start_time'], '%H:%M').time(),
            end_time=datetime.strptime(data['end_time'], '%H:%M').time(),
            multiplier=float(data.get('multiplier', 1.3)),
            is_active=data.get('is_active', True)
        )
        db.session.add(hour)
        db.session.commit()

        return jsonify({'message': 'Horário de pico criado', 'peak_hour': hour.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@muvscore_bp.route('/admin/peak-hours/<int:hour_id>', methods=['DELETE'])
@jwt_required()
def delete_peak_hour(hour_id):
    """Remove um horário de pico"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type.value != 'ADMIN':
            return jsonify({'error': 'Acesso restrito'}), 403

        from src.models.portal_models import PeakHour
        hour = PeakHour.query.filter_by(id=hour_id, tenant_id=user.tenant_id).first()
        if not hour:
            return jsonify({'error': 'Horário de pico não encontrado'}), 404

        db.session.delete(hour)
        db.session.commit()
        return jsonify({'message': 'Horário de pico removido'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================
# ADMIN - Premiação Semanal
# ============================================================

@muvscore_bp.route('/admin/pool', methods=['GET'])
@jwt_required()
def get_weekly_pool():
    """Retorna o pool de premiação da semana atual"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type.value != 'ADMIN':
            return jsonify({'error': 'Acesso restrito'}), 403

        from src.utils.muvscore import calculate_weekly_pool, distribute_weekly_rewards

        pool = calculate_weekly_pool(user.tenant_id)
        preview = distribute_weekly_rewards(user.tenant_id)

        return jsonify({
            'pool': pool,
            'preview': preview
        }), 200
    except Exception as e:
        logger.error(f"Erro ao calcular pool: {e}")
        return jsonify({'error': str(e)}), 500


@muvscore_bp.route('/admin/pool/process', methods=['POST'])
@jwt_required()
def process_weekly_pool():
    """Processa e distribui o pool de premiação da semana"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type.value != 'ADMIN':
            return jsonify({'error': 'Acesso restrito'}), 403

        from src.utils.muvscore import distribute_weekly_rewards

        result = distribute_weekly_rewards(user.tenant_id)

        # Creditar valores na carteira dos entregadores
        from src.models.portal_models import Driver
        from decimal import Decimal

        credited = 0
        for reward in result.get('rewards', []):
            driver = Driver.query.get(reward['driver_id'])
            if driver:
                driver.balance = (driver.balance or Decimal('0')) + Decimal(str(reward['amount']))
                credited += 1

        db.session.commit()

        return jsonify({
            'message': f'Premiação processada: {credited} entregadores creditados',
            'result': result
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao processar pool: {e}")
        return jsonify({'error': str(e)}), 500
