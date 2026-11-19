"""Livro-caixa financeiro imutável (F-11) — serviços de escrita e leitura.

Regras (ver docs/LEDGER_FINANCEIRO.md):
- Linhas NUNCA são editadas/apagadas (trigger no banco + sem rotas de alteração).
- Valor sempre positivo; o sinal vem de entry_type (CREDIT/DEBIT).
- Decimal puro (Numeric 12,2) — nenhum float no caminho do dinheiro.
- snapshot guarda as regras/preços da época do evento.
- dedupe_key garante idempotência (retry de webhook não dobra o caixa).
"""
import logging
from datetime import datetime, timezone
from decimal import Decimal

logger = logging.getLogger(__name__)

# Categorias de motivo (reason)
ORDER_FEE = 'ORDER_FEE'            # frete pago pelo cliente
DRIVER_PAYOUT = 'DRIVER_PAYOUT'    # repasse ao entregador
WITHDRAWAL = 'WITHDRAWAL'          # saque do entregador
BONUS = 'BONUS'                    # bônus/gamificação
SUBSCRIPTION = 'SUBSCRIPTION'      # assinatura (estab→admin ou admin→MUV)
REFUND = 'REFUND'                  # estorno (linha negativa de correção)
ADJUSTMENT = 'ADJUSTMENT'          # ajuste manual


def _agora():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def registrar_lancamento(entry_type, party_type, party_id, amount, reason,
                         description=None, reference_type=None, reference_id=None,
                         snapshot=None, dedupe_key=None, occurred_at=None, tenant_id=None):
    """Cria um lançamento imutável. Idempotente via dedupe_key. Nunca edita.

    entry_type: 'CREDIT' (entrou) ou 'DEBIT' (saiu).
    amount: Decimal/float > 0 — convertido para Decimal (centavo exato).
    Retorna a linha criada OU a existente (quando dedupe_key repete).
    """
    from src.models.portal_models import FinancialLedger, db

    valor = Decimal(str(amount)).quantize(Decimal('0.01'))
    if valor <= 0:
        raise ValueError('amount deve ser positivo (o sinal vem do entry_type)')
    if entry_type not in ('CREDIT', 'DEBIT'):
        raise ValueError("entry_type deve ser 'CREDIT' ou 'DEBIT'")

    # Idempotência: mesma dedupe_key = mesmo evento (retry não duplica)
    if dedupe_key:
        existente = FinancialLedger.query.filter_by(dedupe_key=dedupe_key).first()
        if existente:
            logger.info(f"[LEDGER] duplicata ignorada ({dedupe_key})")
            return existente

    linha = FinancialLedger(
        tenant_id=tenant_id,
        occurred_at=occurred_at or _agora(),
        entry_type=entry_type,
        party_type=party_type,
        party_id=party_id,
        amount=valor,
        reason=reason,
        description=(description or '')[:250] or None,
        reference_type=reference_type,
        reference_id=reference_id,
        snapshot=snapshot,
        dedupe_key=dedupe_key,
    )
    db.session.add(linha)
    db.session.flush()
    return linha


def saldo_do(party_type, party_id, tenant_id=None):
    """Saldo do partido = soma dos créditos − débitos (Decimal)."""
    from decimal import Decimal as D
    from src.models.portal_models import FinancialLedger, db
    from sqlalchemy import case, func

    query = db.session.query(
        func.coalesce(func.sum(case((FinancialLedger.entry_type == 'CREDIT', FinancialLedger.amount), else_=0)), 0),
        func.coalesce(func.sum(case((FinancialLedger.entry_type == 'DEBIT', FinancialLedger.amount), else_=0)), 0),
    ).filter(
        FinancialLedger.party_type == party_type,
        FinancialLedger.party_id == party_id,
    )
    if tenant_id:
        query = query.filter(FinancialLedger.tenant_id == tenant_id)
    creditos, debitos = query.one()
    return D(str(creditos)) - D(str(debitos))


def extrato(party_type, party_id, limit=50, offset=0):
    """Linhas do livro do partido, mais recentes primeiro."""
    from src.models.portal_models import FinancialLedger
    query = FinancialLedger.query.filter(
        FinancialLedger.party_type == party_type,
        FinancialLedger.party_id == party_id,
    )
    total = query.count()
    linhas = query.order_by(FinancialLedger.occurred_at.desc(), FinancialLedger.id.desc()) \
        .offset(offset).limit(min(limit, 200)).all()
    return linhas, total
