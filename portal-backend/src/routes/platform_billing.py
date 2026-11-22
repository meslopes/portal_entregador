"""Cobrança MUV → admin (tenant) — Fase E do plano de monetização.

Total do ciclo = FIXO + (R$/estabelecimento ativo × estabelecimentos ativos).
Default R$ 100/estabelecimento (configurável por assinatura — margem de
negociação do admin). Nunca % do frete (princípio da independência).
Reusa o motor de faturas/Asaas; a credencial Asaas por tenant fica preparada
em `tenants.asaas_customer_id` (SaaS futuro; hoje conta única).

Ver docs/PLAN_MONETIZACAO_ENTREGAS_PROPRIAS.md §5.2.
"""
import json
import logging
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from src.models.portal_models import (
    PlatformInvoice,
    PlatformSubscription,
    Restaurant,
    Tenant,
    db,
)
from src.routes.platform import platform_admin_required

logger = logging.getLogger(__name__)

platform_billing_bp = Blueprint('platform_billing', __name__, url_prefix='/api/platform')


def calcular_ciclo_plataforma(subscription, inicio, fim):
    """
    Motor ÚNICO da cobrança MUV → admin (componentes configuráveis):

        total = [FIXO] + [R$/estab × contagem(modo, N)] + [R$/pedido × máx(0, pedidos − cota)]

    Componentes (preço 0 = desligado) — cada assinatura monta a própria
    fórmula (contratos diferentes para admins diferentes):

    - FIXO: subscription.fixed_price
    - POR ESTABELECIMENTO: price_per_establishment × contagem, onde o modo
      (establishment_count_mode) decide o que é "estabelecimento do ciclo":
        · SNAPSHOT     = is_active=True no instante do cálculo (comportamento
                         legado — mantido por compatibilidade)
        · USO          = estabelecimentos com ≥ N pedidos no ciclo (N =
                         min_orders_per_establishment). Olha o PERÍODO, então
                         "desativou na véspera" ou "ativou por 1 dia" não
                         distorcem a conta.
        · PRO_RATA_USO = soma de (dias-com-pedido ÷ dias do ciclo) por
                         estabelecimento — "ativou só pra uma venda" cobra
                         proporcional. Não precisa de tabela nova: deriva
                         dos pedidos existentes.
    - POR PEDIDO: price_per_order × máx(0, pedidos do ciclo − orders_included)

    Espelha o padrão da assinatura de estabelecimentos — esta função é a
    ÚNICA que calcula o total; preview e fatura devem chamá-la.
    """
    from decimal import ROUND_HALF_UP, Decimal

    from src.models.portal_models import Order

    def _d(valor):
        return Decimal(str(valor if valor is not None else 0))

    def _round2(valor):
        return float(Decimal(valor).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

    # Consultas olham o CICLO (período real) — timestamps do banco são naive
    inicio_n = inicio.replace(tzinfo=None) if inicio and inicio.tzinfo else inicio
    fim_n = fim.replace(tzinfo=None) if fim and fim.tzinfo else fim

    modo = (subscription.establishment_count_mode or 'SNAPSHOT').upper()
    min_orders = int(subscription.min_orders_per_establishment or 1)
    price_per_estab = _d(subscription.price_per_establishment)
    fixed_total = _d(subscription.fixed_price)
    price_per_order = _d(subscription.price_per_order)
    orders_included = int(subscription.orders_included or 0)

    pedidos_query = Order.query.filter(
        Order.tenant_id == subscription.tenant_id,
        Order.created_at >= inicio_n,
        Order.created_at < fim_n,
    )

    # --- Componente 2: estabelecimentos (contagem por modo) ---
    establishments_count = 0.0
    if price_per_estab > 0:
        if modo == 'USO':
            por_estab = (
                pedidos_query.with_entities(Order.restaurant_id, db.func.count(Order.id))
                .group_by(Order.restaurant_id).all()
            )
            establishments_count = float(sum(1 for _, qtd in por_estab if qtd >= min_orders))
        elif modo == 'PRO_RATA_USO':
            total_dias = max(1, (fim_n - inicio_n).days)
            por_estab = (
                pedidos_query.with_entities(
                    Order.restaurant_id, db.func.count(db.func.distinct(db.func.date(Order.created_at)))
                )
                .group_by(Order.restaurant_id).all()
            )
            fracao = Decimal(0)
            for _, dias in por_estab:
                fracao += Decimal(min(int(dias), total_dias)) / Decimal(total_dias)
            establishments_count = float(fracao)
        else:  # SNAPSHOT (legado)
            establishments_count = Restaurant.query.filter_by(
                tenant_id=subscription.tenant_id, is_active=True
            ).count()

    establishments_total = _round2(price_per_estab * _d(establishments_count))

    # --- Componente 3: pedidos (com cota inclusa) ---
    orders_count = pedidos_query.count() if price_per_order > 0 else 0
    orders_billed = max(0, orders_count - orders_included) if price_per_order > 0 else 0
    orders_total = _round2(price_per_order * _d(orders_billed))

    total = _round2(fixed_total + _d(establishments_total) + _d(orders_total))

    return {
        'establishments_count': establishments_count,
        'establishment_count_mode': modo,
        'min_orders_per_establishment': min_orders,
        'price_per_establishment': float(price_per_estab),
        'fixed_total': float(fixed_total),
        'establishments_total': establishments_total,
        'orders_count': orders_count,
        'orders_included': orders_included,
        'orders_billed': orders_billed,
        'price_per_order': float(price_per_order),
        'orders_total': orders_total,
        'total': total,
    }


@platform_billing_bp.route('/billing/subscriptions', methods=['GET'])
@jwt_required()
@platform_admin_required
def get_platform_subscriptions():
    """Lista as assinaturas MUV → admin (com nome do tenant)."""
    try:
        subs = PlatformSubscription.query.order_by(PlatformSubscription.id.desc()).all()
        tenants_map = {t.id: t.name for t in Tenant.query.all()}
        return jsonify({'subscriptions': [
            {
                'id': s.id,
                'tenant_id': s.tenant_id,
                'tenant_name': tenants_map.get(s.tenant_id),
                'billing_cycle': s.billing_cycle,
                'price_per_establishment': float(s.price_per_establishment or 0),
                'fixed_price': float(s.fixed_price or 0),
                'establishment_count_mode': s.establishment_count_mode or 'SNAPSHOT',
                'min_orders_per_establishment': s.min_orders_per_establishment or 1,
                'price_per_order': float(s.price_per_order or 0),
                'orders_included': s.orders_included or 0,
                'is_active': s.is_active,
                'last_billed_at': s.last_billed_at.isoformat() if s.last_billed_at else None,
                'next_billing_at': s.next_billing_at.isoformat() if s.next_billing_at else None,
                'total_billed': float(s.total_billed or 0),
                'total_paid': float(s.total_paid or 0),
            }
            for s in subs
        ]}), 200
    except Exception as e:
        logger.error(f"Erro ao listar assinaturas da plataforma: {e}")
        return jsonify({'error': str(e)}), 500


@platform_billing_bp.route('/billing/subscriptions', methods=['POST'])
@jwt_required()
@platform_admin_required
def create_platform_subscription():
    """Cria assinatura MUV → admin para um tenant (default R$100/estabelecimento)."""
    try:
        data = request.get_json() or {}
        tenant_id = data.get('tenant_id')
        if not tenant_id or not Tenant.query.get(tenant_id):
            return jsonify({'error': 'tenant_id é obrigatório'}), 400
        if PlatformSubscription.query.filter_by(tenant_id=tenant_id).first():
            return jsonify({'error': 'Este tenant já possui assinatura'}), 400

        try:
            price = float(data.get('price_per_establishment', 100.0))
            fixed = float(data.get('fixed_price', 0) or 0)
        except (TypeError, ValueError):
            return jsonify({'error': 'Valores devem ser numéricos'}), 400
        if not (0 <= price <= 100000) or not (0 <= fixed <= 100000):
            return jsonify({'error': 'Valores fora da faixa permitida'}), 400

        ciclo = data.get('billing_cycle', 'MONTHLY')
        if ciclo not in ('WEEKLY', 'MONTHLY'):
            return jsonify({'error': 'billing_cycle deve ser WEEKLY ou MONTHLY'}), 400

        # Componentes configuráveis do motor de cobrança (2026-11-20)
        modo = str(data.get('establishment_count_mode', 'SNAPSHOT')).upper()
        if modo not in ('SNAPSHOT', 'USO', 'PRO_RATA_USO'):
            return jsonify({'error': 'establishment_count_mode deve ser SNAPSHOT, USO ou PRO_RATA_USO'}), 400
        try:
            min_orders = int(data.get('min_orders_per_establishment', 1))
            price_order = float(data.get('price_per_order', 0) or 0)
            orders_included = int(data.get('orders_included', 0) or 0)
        except (TypeError, ValueError):
            return jsonify({'error': 'Parâmetros dos componentes inválidos'}), 400
        if not (1 <= min_orders <= 10000):
            return jsonify({'error': 'min_orders_per_establishment fora da faixa (1..10000)'}), 400
        if not (0 <= price_order <= 100000):
            return jsonify({'error': 'price_per_order fora da faixa'}), 400
        if not (0 <= orders_included <= 1000000):
            return jsonify({'error': 'orders_included fora da faixa'}), 400

        sub = PlatformSubscription(
            tenant_id=tenant_id,
            billing_cycle=ciclo,
            price_per_establishment=price,
            fixed_price=fixed,
            establishment_count_mode=modo,
            min_orders_per_establishment=min_orders,
            price_per_order=price_order,
            orders_included=orders_included,
        )
        db.session.add(sub)
        db.session.commit()
        return jsonify({'message': 'Assinatura da plataforma criada', 'subscription_id': sub.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@platform_billing_bp.route('/billing/subscriptions/<int:sub_id>', methods=['PUT'])
@jwt_required()
@platform_admin_required
def update_platform_subscription(sub_id):
    """Atualiza preço/ciclo/estado da assinatura MUV → admin."""
    try:
        sub = PlatformSubscription.query.get(sub_id)
        if not sub:
            return jsonify({'error': 'Assinatura não encontrada'}), 404
        data = request.get_json() or {}
        if 'price_per_establishment' in data:
            try:
                val = float(data['price_per_establishment'])
            except (TypeError, ValueError):
                return jsonify({'error': 'price_per_establishment deve ser numérico'}), 400
            if not (0 <= val <= 100000):
                return jsonify({'error': 'price_per_establishment fora da faixa'}), 400
            sub.price_per_establishment = val
        if 'fixed_price' in data:
            try:
                val = float(data.get('fixed_price') or 0)
            except (TypeError, ValueError):
                return jsonify({'error': 'fixed_price deve ser numérico'}), 400
            if not (0 <= val <= 100000):
                return jsonify({'error': 'fixed_price fora da faixa'}), 400
            sub.fixed_price = val
        if 'billing_cycle' in data:
            if data['billing_cycle'] not in ('WEEKLY', 'MONTHLY'):
                return jsonify({'error': 'billing_cycle deve ser WEEKLY ou MONTHLY'}), 400
            sub.billing_cycle = data['billing_cycle']
        if 'establishment_count_mode' in data:
            modo = str(data['establishment_count_mode']).upper()
            if modo not in ('SNAPSHOT', 'USO', 'PRO_RATA_USO'):
                return jsonify({'error': 'establishment_count_mode deve ser SNAPSHOT, USO ou PRO_RATA_USO'}), 400
            sub.establishment_count_mode = modo
        if 'min_orders_per_establishment' in data:
            try:
                val = int(data['min_orders_per_establishment'])
            except (TypeError, ValueError):
                return jsonify({'error': 'min_orders_per_establishment deve ser inteiro'}), 400
            if not (1 <= val <= 10000):
                return jsonify({'error': 'min_orders_per_establishment fora da faixa (1..10000)'}), 400
            sub.min_orders_per_establishment = val
        if 'price_per_order' in data:
            try:
                val = float(data.get('price_per_order') or 0)
            except (TypeError, ValueError):
                return jsonify({'error': 'price_per_order deve ser numérico'}), 400
            if not (0 <= val <= 100000):
                return jsonify({'error': 'price_per_order fora da faixa'}), 400
            sub.price_per_order = val
        if 'orders_included' in data:
            try:
                val = int(data.get('orders_included') or 0)
            except (TypeError, ValueError):
                return jsonify({'error': 'orders_included deve ser inteiro'}), 400
            if not (0 <= val <= 1000000):
                return jsonify({'error': 'orders_included fora da faixa'}), 400
            sub.orders_included = val
        if 'is_active' in data:
            sub.is_active = bool(data['is_active'])
        db.session.commit()
        return jsonify({'message': 'Assinatura atualizada'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@platform_billing_bp.route('/billing/subscriptions/<int:sub_id>/preview', methods=['GET'])
@jwt_required()
@platform_admin_required
def preview_platform_subscription(sub_id):
    """Simula a fatura do ciclo atual (prévia — não emite nada)."""
    try:
        sub = PlatformSubscription.query.get(sub_id)
        if not sub:
            return jsonify({'error': 'Assinatura não encontrada'}), 404

        now = datetime.now(timezone.utc)
        period_start = now - timedelta(days=7 if sub.billing_cycle == 'WEEKLY' else 30)
        valores = calcular_ciclo_plataforma(sub, period_start, now)
        return jsonify({
            'period_start': period_start.isoformat(),
            'period_end': now.isoformat(),
            'billing_cycle': sub.billing_cycle,
            'breakdown': valores,
        }), 200
    except Exception as e:
        logger.error(f"Erro na prévia da assinatura: {e}")
        return jsonify({'error': 'Erro ao simular fatura'}), 500


@platform_billing_bp.route('/billing/subscriptions/<int:sub_id>/generate-invoice', methods=['POST'])
@jwt_required()
@platform_admin_required
def generate_platform_invoice(sub_id):
    """Gera fatura MUV → admin (com Asaas quando configurado)."""
    try:
        sub = PlatformSubscription.query.get(sub_id)
        if not sub:
            return jsonify({'error': 'Assinatura não encontrada'}), 404

        now = datetime.now(timezone.utc)
        period_start = now - timedelta(days=7 if sub.billing_cycle == 'WEEKLY' else 30)
        valores = calcular_ciclo_plataforma(sub, period_start, now)

        if valores['total'] <= 0:
            return jsonify({'error': 'Nada a cobrar: habilite ao menos um componente (fixo, estab. ou pedido)'}), 400

        count = PlatformInvoice.query.filter_by(tenant_id=sub.tenant_id).count()
        invoice_number = f"PLAT-{sub.tenant_id:04d}-{count + 1:04d}"
        due_date = now + timedelta(days=7 if sub.billing_cycle == 'WEEKLY' else 30)

        invoice = PlatformInvoice(
            tenant_id=sub.tenant_id,
            invoice_number=invoice_number,
            period_start=period_start,
            period_end=now,
            establishments_count=valores['establishments_count'],
            price_per_establishment=sub.price_per_establishment,
            fixed_price=valores['fixed_total'],
            total_amount=valores['total'],
            # snapshot do cálculo (auditoria do que foi cobrado)
            establishment_count_mode=valores['establishment_count_mode'],
            min_orders_per_establishment=valores['min_orders_per_establishment'],
            orders_count=valores['orders_count'],
            orders_billed=valores['orders_billed'],
            price_per_order=valores['price_per_order'],
            orders_included=valores['orders_included'],
            calculation_detail=json.dumps(valores, ensure_ascii=False),
            status='PENDING',
            due_date=due_date,
        )
        db.session.add(invoice)
        db.session.flush()

        # Asaas (mesma engrenagem da assinatura de estabelecimentos — duas pontas)
        tenant = Tenant.query.get(sub.tenant_id)
        try:
            from src.services.asaas_service import create_charge, create_customer, is_configured

            if is_configured() and tenant:
                if not tenant.asaas_customer_id:
                    resultado = create_customer(
                        name=tenant.name, cpf_cnpj=tenant.cnpj or '00000000000100',
                        email=tenant.email, phone=tenant.phone,
                    )
                    if resultado.get('success'):
                        tenant.asaas_customer_id = resultado.get('customer_id')
                    else:
                        logger.warning(f"Erro ao criar cliente Asaas do tenant: {resultado.get('error')}")
                if tenant.asaas_customer_id:
                    descricao = (
                        f"Plataforma muv.log - {tenant.name} - {invoice_number} "
                        f"({valores['establishments_count']} estab. x R${valores['price_per_establishment']})"
                    )
                    if valores['fixed_total'] > 0:
                        descricao += f" + fixo R${valores['fixed_total']}"
                    if valores['orders_billed'] > 0:
                        descricao += f" + {valores['orders_billed']} pedidos x R${valores['price_per_order']}"
                    cobranca = create_charge(
                        customer_id=tenant.asaas_customer_id,
                        value=valores['total'],
                        billing_type='PIX',
                        due_date=due_date.strftime('%Y-%m-%d'),
                        description=descricao,
                        external_reference=f"platform_invoice_{invoice.id}",
                    )
                    if cobranca.get('success'):
                        invoice.asaas_invoice_id = cobranca.get('payment_id')
                        invoice.payment_url = cobranca.get('invoice_url')
        except Exception as erro_asaas:
            logger.warning(f"Asaas não disponível na fatura da plataforma: {erro_asaas}")

        sub.last_billed_at = now
        sub.next_billing_at = due_date
        sub.total_billed = float(sub.total_billed or 0) + valores['total']
        db.session.commit()

        return jsonify({'message': f'Fatura {invoice_number} gerada com sucesso',
                        'invoice_id': invoice.id, 'total': valores['total']}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@platform_billing_bp.route('/billing/invoices', methods=['GET'])
@jwt_required()
@platform_admin_required
def get_platform_invoices():
    """Lista faturas MUV → admin."""
    try:
        invoices = PlatformInvoice.query.order_by(PlatformInvoice.id.desc()).limit(200).all()
        tenants_map = {t.id: t.name for t in Tenant.query.all()}
        return jsonify({'invoices': [
            {
                'id': i.id,
                'tenant_id': i.tenant_id,
                'tenant_name': tenants_map.get(i.tenant_id),
                'invoice_number': i.invoice_number,
                'period_start': i.period_start.isoformat(),
                'period_end': i.period_end.isoformat(),
                'establishments_count': float(i.establishments_count or 0),
                'price_per_establishment': float(i.price_per_establishment or 0),
                'fixed_price': float(i.fixed_price or 0),
                'total_amount': float(i.total_amount),
                'establishment_count_mode': i.establishment_count_mode or 'SNAPSHOT',
                'min_orders_per_establishment': i.min_orders_per_establishment or 1,
                'orders_count': i.orders_count or 0,
                'orders_billed': i.orders_billed or 0,
                'price_per_order': float(i.price_per_order or 0),
                'orders_included': i.orders_included or 0,
                'calculation_detail': json.loads(i.calculation_detail) if i.calculation_detail else None,
                'status': i.status,
                'due_date': i.due_date.isoformat() if i.due_date else None,
                'payment_url': i.payment_url,
                'paid_at': i.paid_at.isoformat() if i.paid_at else None,
            }
            for i in invoices
        ]}), 200
    except Exception as e:
        logger.error(f"Erro ao listar faturas da plataforma: {e}")
        return jsonify({'error': str(e)}), 500


@platform_billing_bp.route('/billing/invoices/<int:invoice_id>/pay', methods=['POST'])
@jwt_required()
@platform_admin_required
def pay_platform_invoice(invoice_id):
    """Marca fatura MUV → admin como paga (acerto manual)."""
    try:
        invoice = PlatformInvoice.query.get(invoice_id)
        if not invoice:
            return jsonify({'error': 'Fatura não encontrada'}), 404
        if invoice.status == 'PAID':
            return jsonify({'error': 'Fatura já está paga'}), 400
        invoice.status = 'PAID'
        invoice.paid_at = datetime.now(timezone.utc)
        sub = PlatformSubscription.query.filter_by(tenant_id=invoice.tenant_id).first()
        if sub:
            sub.total_paid = float(sub.total_paid or 0) + float(invoice.total_amount)
        db.session.commit()
        return jsonify({'message': 'Fatura marcada como paga'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
