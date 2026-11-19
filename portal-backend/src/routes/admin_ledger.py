"""Consulta do livro-caixa financeiro (F-11) — só LEITURA.

Não existe rota de criação/alteração: lançamentos nascem apenas dos
hooks internos (entrega, saque, bônus) — o livro é imutável por design.
"""
import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.services.financial_ledger import extrato, saldo_do
from src.utils.auth import admin_required

logger = logging.getLogger(__name__)

admin_ledger_bp = Blueprint('admin_ledger', __name__)


@admin_ledger_bp.route('/ledger', methods=['GET'])
@jwt_required()
@admin_required
def list_ledger():
    """Extrato + saldo de um partido (DRIVER/ESTABLISHMENT/PLATFORM/TENANT).

    Params: party_type, party_id (omitir para PLATFORM), limit, offset.
    """
    try:
        party_type = request.args.get('party_type', 'PLATFORM')
        if party_type not in ('DRIVER', 'ESTABLISHMENT', 'PLATFORM', 'TENANT'):
            return jsonify({'error': 'party_type inválido'}), 400
        party_id = request.args.get('party_id', type=int)
        if party_type != 'PLATFORM' and not party_id:
            return jsonify({'error': 'party_id é obrigatório para este tipo'}), 400

        try:
            limit = min(int(request.args.get('limit', 50)), 200)
            offset = max(int(request.args.get('offset', 0)), 0)
        except (TypeError, ValueError):
            limit, offset = 50, 0

        linhas, total = extrato(party_type, party_id, limit=limit, offset=offset)
        saldo = saldo_do(party_type, party_id)

        return jsonify({
            'entries': [l.to_dict() for l in linhas],
            'total': total,
            'balance': float(saldo),
            'party_type': party_type,
            'party_id': party_id,
            'limit': limit,
            'offset': offset,
        }), 200

    except Exception as e:
        logger.error(f"Erro no livro-caixa: {e}")
        return jsonify({'error': str(e)}), 500
