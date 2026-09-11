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
        week_start = DriverWeeklyScore.query.filter_by(
            driver_id=driver.id
        ).order_by(DriverWeeklyScore.week_start.desc()).first()

        return jsonify({
            'score': score,
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
