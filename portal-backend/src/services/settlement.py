# -*- coding: utf-8 -*-
"""
Acerto de retorno (2026-11-24) — pagamento no local.

Quando o entregador PRÓPRIO conclui uma entrega com cobrança no local, nasce
uma PENDÊNCIA de acerto (dinheiro / maquininha / comprovante PIX) até o
estabelecimento confirmar. Enquanto houver pendência, o motor de distribuição
NÃO oferece novos pedidos ao entregador (e o copiloto avisa no manual).

Regras (aprovadas pelo Mauro):
- valor a cobrar = total do pedido (snapshot em settlement_value)
- maquininha: por TURNO (PER_SHIFT — uma pendência agregada) ou por ENTREGA
  (PER_DELIVERY — uma por pedido), configurável por estabelecimento
- confirmação do estabelecimento libera; override manual continua possível
"""
from datetime import datetime, timezone

from src.models.portal_models import Order, OrderStatus


def marcar_pendente_acerto(order):
    """Marca a pendência de acerto de um pedido recém-entregue (pagamento no local)."""
    total = float(order.total_amount or 0)
    if total <= 0:
        order.settlement_status = 'NONE'
        return
    metodo = (order.payment_method.value if hasattr(order.payment_method, 'value') else str(order.payment_method or '')).upper()
    tipo = {'CASH': 'CASH', 'CARD': 'CARD', 'PIX': 'PIX'}.get(metodo, 'CASH')
    order.settlement_status = 'PENDING'
    order.settlement_kind = tipo
    order.settlement_value = total
    order.settled_at = None


def _pendencias(driver_id):
    """Query (não lista) — consumidores usam .count()/.all()."""
    return Order.query.filter(
        Order.establishment_driver_id == driver_id,
        Order.settlement_status == 'PENDING',
    )


def tem_pendencia_acerto(driver_id):
    """True se o entregador tem acerto pendente (trava de novas ofertas)."""
    return _pendencias(driver_id).count() > 0


def resumo_acerto(driver_id, machine_mode='PER_SHIFT'):
    """
    Resumo das pendências do entregador para os banners/telas.
    Com PER_SHIFT a maquininha conta como 1 item; com PER_DELIVERY, 1 por pedido.
    """
    pendentes = _pendencias(driver_id).all()
    dinheiro = sum(float(p.settlement_value or 0) for p in pendentes if p.settlement_kind == 'CASH')
    cartao = [p for p in pendentes if p.settlement_kind == 'CARD']
    pix = [p for p in pendentes if p.settlement_kind == 'PIX']
    itens = []
    if dinheiro > 0:
        itens.append({'tipo': 'CASH', 'texto': f'R$ {dinheiro:.2f} em dinheiro', 'valor': dinheiro})
    if cartao:
        if (machine_mode or 'PER_SHIFT') == 'PER_SHIFT':
            itens.append({'tipo': 'CARD', 'texto': f'devolver maquininha ({len(cartao)} pedido(s) no cartão)',
                          'valor': sum(float(p.settlement_value or 0) for p in cartao), 'order_ids': [p.id for p in cartao]})
        else:
            for p in cartao:
                itens.append({'tipo': 'CARD', 'texto': f'maquininha — pedido #{p.order_number}',
                              'valor': float(p.settlement_value or 0), 'order_ids': [p.id]})
    for p in pix:
        status = 'comprovante enviado' if p.pix_proof_url else 'comprovante pendente'
        itens.append({'tipo': 'PIX', 'texto': f'PIX pedido #{p.order_number} — {status}',
                      'valor': float(p.settlement_value or 0), 'order_ids': [p.id],
                      'proof_url': p.pix_proof_url})
    return {
        'pendente': bool(pendentes),
        'total_dinheiro': round(dinheiro, 2),
        'itens': itens,
        'order_ids': [p.id for p in pendentes],
        'desde': min((p.delivery_time or p.updated_at for p in pendentes), default=None),
    }


def confirmar_acerto(order_ids, nota=None):
    """Estabelecimento confirma o acerto — libera o entregador."""
    agora = datetime.now(timezone.utc)
    confirmados = 0
    for oid in (order_ids or []):
        pedido = Order.query.get(oid)
        if pedido and pedido.settlement_status == 'PENDING':
            pedido.settlement_status = 'SETTLED'
            pedido.settled_at = agora
            pedido.settled_note = (nota or '')[:200]
            confirmados += 1
    return confirmados
