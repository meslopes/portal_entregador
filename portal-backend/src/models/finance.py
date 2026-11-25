"""Dinheiro: pagamentos, faturas, assinaturas, tabelas de preço e credenciais.

Extraído de portal_models.py no refactor de arquivos grandes (2026-11-01).
Importe via src.models.portal_models (fachada) — comportamento idêntico.
"""
from src.models.base import PaymentMethod, PaymentStatus, PaymentType, db, utcnow


class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_type = db.Column(db.Enum(PaymentType), nullable=False)
    reference_id = db.Column(db.Integer)
    payment_method = db.Column(db.Enum(PaymentMethod), nullable=False)
    status = db.Column(db.Enum(PaymentStatus), default=PaymentStatus.PENDING)
    processed_at = db.Column(db.DateTime)
    transaction_id = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'driver_id': self.driver_id,
            'amount': float(self.amount),
            'payment_type': self.payment_type.value if self.payment_type else None,
            'reference_id': self.reference_id,
            'payment_method': self.payment_method.value if self.payment_method else None,
            'status': self.status.value if self.status else None,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
            'transaction_id': self.transaction_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class SystemConfig(db.Model):
    __tablename__ = 'system_configs'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)
    config_key = db.Column(db.String(100), nullable=False)
    config_value = db.Column(db.Text, nullable=False)
    description = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    __table_args__ = (db.UniqueConstraint('tenant_id', 'config_key', name='system_configs_tenant_key'),)

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'config_key': self.config_key,
            'config_value': self.config_value,
            'description': self.description,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class PricingTable(db.Model):
    """Tabela de preços - pode ter várias por praça"""
    __tablename__ = 'pricing_tables'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)
    square_id = db.Column(db.Integer, db.ForeignKey('squares.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500))
    price_per_km = db.Column(db.Numeric(10, 2), nullable=False, default=2.95)
    fixed_fee = db.Column(db.Numeric(10, 2), default=0)  # Tarifa fixa (0 = usar preço por km)
    min_distance_km = db.Column(db.Numeric(5, 2), default=4.0)
    min_delivery_fee = db.Column(db.Numeric(10, 2))
    max_delivery_fee = db.Column(db.Numeric(10, 2), default=50.00)
    driver_percentage = db.Column(db.Numeric(5, 2), default=65.0)
    # Pagamento do motorista PLATAFORMA — modelo configurável (2026-11-24, mandato
    # "tudo configurável"). O admin escolhe entre os 7 modelos, mesmo leque do
    # entregador próprio. Padrão 'PERCENTAGE' = comportamento atual (retrocompat).
    platform_payment_type = db.Column(db.String(30), default='PERCENTAGE')
    platform_fixed_value = db.Column(db.Numeric(10, 2), default=5.00)
    platform_km_value = db.Column(db.Numeric(10, 2), default=1.50)
    platform_delivery_value = db.Column(db.Numeric(10, 2), default=3.00)
    platform_max_deliveries = db.Column(db.Integer, default=10)
    # gamification_percentage REMOVIDO (Fase 2, 2026-11-16): a fonte do MuvScore
    # é o SystemConfig (Configurações → Preços) — o campo aqui só confundia
    # Modo de precificação (2026-11-17): 'PER_KM' (padrão — lógica atual com
    # fixed_fee) ou 'TIERS' (por faixa de km, SEM volta — ver plano de monetização)
    pricing_mode = db.Column(db.String(20), default='PER_KM')
    # Faixas p/ modo TIERS: lista ordenada [{"to_km": 3, "price": 8.00}, ...]
    # — a última pode ter "to_km": null (faixa aberta, "a partir de X km")
    tier_bands = db.Column(db.JSON)
    # Frete grátis para pedidos com valor de produtos >= este (None = desligado)
    free_delivery_min_order = db.Column(db.Numeric(10, 2))
    # Volta (ida + volta) — §7.4 do plano: só modelo PLATAFORMA (motorista que sai
    # para run extra não retorna). Em entregas próprias fica SEMPRE desligado.
    round_trip = db.Column(db.Boolean, default=False)
    # Taxa da volta: R$ por km do trajeto de volta (valor variável — não é km x2)
    round_trip_rate_per_km = db.Column(db.Numeric(10, 2), default=0)
    # Taxa de deslocamento até a coleta: R$ por km do motorista até o estabelecimento
    pickup_rate_per_km = db.Column(db.Numeric(10, 2), default=0)
    # Multiplicadores por tipo de veiculo (S7.4 Fase 2 — frota mista): aplicados
    # sobre a base do frete. 1.0 = preco cheio; 0.8 = 20% mais barato.
    vehicle_multiplier_bike = db.Column(db.Numeric(5, 2), default=1.0)
    vehicle_multiplier_moto = db.Column(db.Numeric(5, 2), default=1.0)
    vehicle_multiplier_car = db.Column(db.Numeric(5, 2), default=1.0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    # Relacionamentos
    restaurants = db.relationship('Restaurant', backref='pricing_table', foreign_keys='Restaurant.pricing_table_id')

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'square_id': self.square_id,
            'name': self.name,
            'description': self.description,
            'price_per_km': float(self.price_per_km),
            'fixed_fee': float(self.fixed_fee) if self.fixed_fee else 0,
            'min_distance_km': float(self.min_distance_km) if self.min_distance_km else 4.0,
            'min_delivery_fee': float(self.min_delivery_fee) if self.min_delivery_fee else float(self.price_per_km) * float(self.min_distance_km or 4.0),
            'max_delivery_fee': float(self.max_delivery_fee) if self.max_delivery_fee else 50.00,
            'driver_percentage': float(self.driver_percentage) if self.driver_percentage else 65.0,
            'platform_payment_type': self.platform_payment_type or 'PERCENTAGE',
            'platform_fixed_value': float(self.platform_fixed_value) if self.platform_fixed_value else 5.00,
            'platform_km_value': float(self.platform_km_value) if self.platform_km_value else 1.50,
            'platform_delivery_value': float(self.platform_delivery_value) if self.platform_delivery_value else 3.00,
            'platform_max_deliveries': int(self.platform_max_deliveries) if self.platform_max_deliveries else 10,
            'pricing_mode': self.pricing_mode or 'PER_KM',
            'tier_bands': self.tier_bands or [],
            'free_delivery_min_order': float(self.free_delivery_min_order) if self.free_delivery_min_order else None,
            'round_trip': bool(self.round_trip),
            'round_trip_rate_per_km': float(self.round_trip_rate_per_km) if self.round_trip_rate_per_km else 0,
            'pickup_rate_per_km': float(self.pickup_rate_per_km) if self.pickup_rate_per_km else 0,
            'vehicle_multiplier_bike': float(self.vehicle_multiplier_bike) if self.vehicle_multiplier_bike else 1.0,
            'vehicle_multiplier_moto': float(self.vehicle_multiplier_moto) if self.vehicle_multiplier_moto else 1.0,
            'vehicle_multiplier_car': float(self.vehicle_multiplier_car) if self.vehicle_multiplier_car else 1.0,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


# ============================================
# SISTEMA DE BONIFICACAO
# ============================================

class DynamicPricing(db.Model):
    """Configuracao de taxas adicionais por praca (chuva, demanda, cancelamento, feriado)"""
    __tablename__ = 'dynamic_pricing'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    square_id = db.Column(db.Integer, db.ForeignKey('squares.id'), nullable=False)
    rainy_day_active = db.Column(db.Boolean, default=False)
    rainy_day_bonus = db.Column(db.Numeric(10, 2), default=3.00)
    high_demand_active = db.Column(db.Boolean, default=False)
    high_demand_threshold = db.Column(db.Integer, default=5)
    high_demand_bonus = db.Column(db.Numeric(10, 2), default=2.00)
    holiday_active = db.Column(db.Boolean, default=False)
    holiday_bonus = db.Column(db.Numeric(10, 2), default=5.00)
    cancellation_fee_active = db.Column(db.Boolean, default=False)
    cancellation_fee = db.Column(db.Numeric(10, 2), default=5.00)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    # Relacionamentos
    square = db.relationship('Square', backref='dynamic_pricing')

    def to_dict(self):
        return {
            'id': self.id,
            'square_id': self.square_id,
            'rainy_day_active': self.rainy_day_active,
            'rainy_day_bonus': float(self.rainy_day_bonus) if self.rainy_day_bonus else 3.00,
            'high_demand_active': self.high_demand_active,
            'high_demand_threshold': self.high_demand_threshold or 5,
            'high_demand_bonus': float(self.high_demand_bonus) if self.high_demand_bonus else 2.00,
            'holiday_active': self.holiday_active,
            'holiday_bonus': float(self.holiday_bonus) if self.holiday_bonus else 5.00,
            'cancellation_fee_active': self.cancellation_fee_active,
            'cancellation_fee': float(self.cancellation_fee) if self.cancellation_fee else 5.00,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class Invoice(db.Model):
    """Fatura semanal do estabelecimento"""
    __tablename__ = 'invoices'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.id'), nullable=False)
    week_start = db.Column(db.DateTime, nullable=False)
    week_end = db.Column(db.DateTime, nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), default=0)  # total delivery fees
    driver_earnings = db.Column(db.Numeric(10, 2), default=0)  # total to unlock
    platform_fee = db.Column(db.Numeric(10, 2), default=0)  # muv.log fee
    deliveries_count = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='PENDING')  # PENDING, PAID, OVERDUE
    paid_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    # Relacionamentos
    restaurant = db.relationship('Restaurant', backref='invoices')

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'restaurant_id': self.restaurant_id,
            'restaurant_name': self.restaurant.name if self.restaurant else None,
            'week_start': self.week_start.isoformat() if self.week_start else None,
            'week_end': self.week_end.isoformat() if self.week_end else None,
            'total_amount': float(self.total_amount) if self.total_amount else 0,
            'driver_earnings': float(self.driver_earnings) if self.driver_earnings else 0,
            'platform_fee': float(self.platform_fee) if self.platform_fee else 0,
            'deliveries_count': self.deliveries_count or 0,
            'status': self.status,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class PlatformCredential(db.Model):
    """Credenciais de integração com plataformas externas (iFood, etc.)"""
    __tablename__ = 'platform_credentials'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.id'), nullable=False)
    platform = db.Column(db.String(20), nullable=False)  # IFOOD, OPEN_DELIVERY, etc.
    client_id = db.Column(db.String(200))
    client_secret = db.Column(db.String(200))
    access_token = db.Column(db.Text)
    refresh_token = db.Column(db.Text)
    expires_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    # Relacionamentos
    restaurant = db.relationship('Restaurant', backref='platform_credentials')

    def to_dict(self):
        return {
            'id': self.id,
            'restaurant_id': self.restaurant_id,
            'platform': self.platform,
            'client_id': self.client_id,
            'is_active': self.is_active,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class EstablishmentSubscription(db.Model):
    """Assinatura de entregadores próprios do estabelecimento"""
    __tablename__ = 'establishment_subscriptions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.id'), nullable=False)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)

    # Configuração da assinatura — 3 termos independentes (plano §5.1):
    # total = FIXO + (R$/entregador × ativos) + (R$/pedido × entregues no ciclo)
    # Qualquer termo pode ser zero: a combinação é o modelo comercial que o
    # admin negocia com cada estabelecimento (argumento de venda).
    billing_cycle = db.Column(db.String(20), default='WEEKLY')  # WEEKLY, MONTHLY
    price_per_driver = db.Column(db.Numeric(10, 2), default=50.00)  # Preço por entregador por ciclo
    price_per_order = db.Column(db.Numeric(10, 2), default=0)  # Preço por pedido entregue no ciclo
    fixed_price = db.Column(db.Numeric(10, 2), default=0)  # Preço fixo por estabelecimento (opcional)
    is_active = db.Column(db.Boolean, default=True)

    # Controle de cobrança
    last_billed_at = db.Column(db.DateTime)
    next_billing_at = db.Column(db.DateTime)
    total_billed = db.Column(db.Numeric(10, 2), default=0)
    total_paid = db.Column(db.Numeric(10, 2), default=0)

    # Integração pagamento
    asaas_subscription_id = db.Column(db.String(100))

    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    # Relacionamentos
    restaurant = db.relationship('Restaurant', backref='subscription')
    tenant = db.relationship('Tenant', backref='subscriptions')
    invoices = db.relationship('SubscriptionInvoice', backref='subscription', order_by='SubscriptionInvoice.created_at.desc()')

    def to_dict(self):
        return {
            'id': self.id,
            'restaurant_id': self.restaurant_id,
            'restaurant_name': self.restaurant.name if self.restaurant else None,
            'tenant_id': self.tenant_id,
            'billing_cycle': self.billing_cycle,
            'price_per_driver': float(self.price_per_driver) if self.price_per_driver else 50.00,
            'fixed_price': float(self.fixed_price) if self.fixed_price else 0,
            'is_active': self.is_active,
            'last_billed_at': self.last_billed_at.isoformat() if self.last_billed_at else None,
            'next_billing_at': self.next_billing_at.isoformat() if self.next_billing_at else None,
            'total_billed': float(self.total_billed) if self.total_billed else 0,
            'total_paid': float(self.total_paid) if self.total_paid else 0,
            'pending_amount': float(self.total_billed or 0) - float(self.total_paid or 0),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class SubscriptionInvoice(db.Model):
    """Fatura de assinatura de entregadores próprios"""
    __tablename__ = 'subscription_invoices'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    subscription_id = db.Column(db.Integer, db.ForeignKey('establishment_subscriptions.id'), nullable=False)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.id'), nullable=False)

    # Dados da fatura
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    period_start = db.Column(db.DateTime, nullable=False)
    period_end = db.Column(db.DateTime, nullable=False)

    # Valores
    drivers_count = db.Column(db.Integer, default=0)  # Quantidade de entregadores no período
    price_per_driver = db.Column(db.Numeric(10, 2))
    orders_count = db.Column(db.Integer, default=0)  # Pedidos entregues no período
    price_per_order = db.Column(db.Numeric(10, 2))
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)

    # Status
    status = db.Column(db.String(20), default='PENDING')  # PENDING, PAID, OVERDUE, CANCELLED
    due_date = db.Column(db.DateTime)
    paid_at = db.Column(db.DateTime)
    payment_method = db.Column(db.String(20))

    # Integração pagamento
    asaas_invoice_id = db.Column(db.String(100))
    payment_url = db.Column(db.String(500))

    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    # Relacionamentos
    restaurant = db.relationship('Restaurant', backref='subscription_invoices')

    def to_dict(self):
        return {
            'id': self.id,
            'subscription_id': self.subscription_id,
            'restaurant_id': self.restaurant_id,
            'restaurant_name': self.restaurant.name if self.restaurant else None,
            'invoice_number': self.invoice_number,
            'period_start': self.period_start.isoformat() if self.period_start else None,
            'period_end': self.period_end.isoformat() if self.period_end else None,
            'drivers_count': self.drivers_count,
            'price_per_driver': float(self.price_per_driver) if self.price_per_driver else 0,
            'total_amount': float(self.total_amount) if self.total_amount else 0,
            'status': self.status,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'payment_method': self.payment_method,
            'payment_url': self.payment_url,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }



class FinancialLedger(db.Model):
    """Livro-caixa financeiro IMUTÁVEL (F-11 da auditoria).

    Cada movimento de dinheiro vira uma linha; linhas nunca são editadas
    nem apagadas (erro = linha de estorno). Saldo = soma dos lançamentos.
    Requisitos atendidos: imutável (trigger no banco + sem rotas de
    alteração), Decimal (Numeric 12,2 — nunca float) e snapshot das
    regras/preços da época (campo JSON `snapshot`).
    """
    __tablename__ = 'financial_ledger'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)
    # Quando o dinheiro moveu (≠ de quando a linha foi escrita)
    occurred_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)
    # CREDIT = entrou / DEBIT = saiu (o valor é sempre positivo)
    entry_type = db.Column(db.String(10), nullable=False)
    # Quem: DRIVER / ESTABLISHMENT / PLATFORM / TENANT
    party_type = db.Column(db.String(20), nullable=False)
    party_id = db.Column(db.Integer)  # None = plataforma (muvlog)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    # Motivo em categoria: ORDER_FEE / DRIVER_PAYOUT / WITHDRAWAL / BONUS /
    # SUBSCRIPTION / REFUND / ADJUSTMENT
    reason = db.Column(db.String(40), nullable=False)
    description = db.Column(db.String(250))
    # Referência do evento (pedido/pagamento/fatura/bônus)
    reference_type = db.Column(db.String(30))
    reference_id = db.Column(db.Integer)
    # Fotografia das regras/preços da época (nunca recalcular o passado)
    snapshot = db.Column(db.JSON)
    # Idempotência: retry de webhook não pode dobrar o caixa
    dedupe_key = db.Column(db.String(100), unique=True)

    __table_args__ = (
        db.Index('ix_ledger_party', 'party_type', 'party_id', 'occurred_at'),
        db.Index('ix_ledger_tenant', 'tenant_id', 'occurred_at'),
        db.Index('ix_ledger_reference', 'reference_type', 'reference_id'),
    )

    @staticmethod
    def now_naive():
        """UTC sem fuso — colunas TIMESTAMP são naive (ver AdminInvite)."""
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).replace(tzinfo=None)

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'occurred_at': self.occurred_at.isoformat() if self.occurred_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'entry_type': self.entry_type,
            'party_type': self.party_type,
            'party_id': self.party_id,
            'amount': float(self.amount),
            'reason': self.reason,
            'description': self.description,
            'reference_type': self.reference_type,
            'reference_id': self.reference_id,
            'snapshot': self.snapshot,
        }


__all__ = [
    "Payment",
    "SystemConfig",
    "PricingTable",
    "DynamicPricing",
    "Invoice",
    "PlatformCredential",
    "EstablishmentSubscription",
    "SubscriptionInvoice",
]



class PlatformSubscription(db.Model):
    """Assinatura da MUV com o ADMIN (tenant) — cobrança por COMPONENTES (2026-11-20).

    Camada admin → plataforma do fluxo de monetização (§5.2 do plano).
    O modelo de cobrança é CONFIGURÁVEL por assinatura (contratos diferentes
    para admins diferentes) — motor em platform_billing.calcular_ciclo_plataforma:

        total = [FIXO] + [R$/estab × contagem(modo, N)] + [R$/pedido × máx(0, pedidos − cota)]

    Componentes (preço 0 = desligado):
    - Fixo: fixed_price
    - Por estabelecimento: price_per_establishment + establishment_count_mode
      (SNAPSHOT = is_active no instante · USO = estab com ≥N pedidos no ciclo ·
      PRO_RATA_USO = dias-com-pedido ÷ dias do ciclo)
    - Por pedido: price_per_order + orders_included (cota inclusa)

    Nunca % do frete (princípio da independência).
    """
    __tablename__ = 'platform_subscriptions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)

    billing_cycle = db.Column(db.String(20), default='MONTHLY')  # WEEKLY, MONTHLY
    price_per_establishment = db.Column(db.Numeric(10, 2), default=100.00)
    fixed_price = db.Column(db.Numeric(10, 2), default=0)
    is_active = db.Column(db.Boolean, default=True)

    # Componentes configuráveis (2026-11-20 — motor por componentes)
    establishment_count_mode = db.Column(db.String(20), default='SNAPSHOT')  # SNAPSHOT, USO, PRO_RATA_USO
    min_orders_per_establishment = db.Column(db.Integer, default=1)  # N do modo USO
    price_per_order = db.Column(db.Numeric(10, 2), default=0)  # 0 = componente de pedido desligado
    orders_included = db.Column(db.Integer, default=0)  # cota de pedidos inclusa no ciclo
    # Escalonamento por faixas (2026-11-22) — componente de pedido em faixas
    # MARGINAIS (cada faixa cobra só os pedidos que entram nela, como conta de
    # luz): lista de {"upto": int|null, "price": float} — a última faixa tem
    # "upto": null (sem limite). Se presente, substitui price_per_order/
    # orders_included no cálculo (mantidos como resumo/compat).
    order_price_tiers = db.Column(db.JSON)

    # Controle de cobrança
    last_billed_at = db.Column(db.DateTime)
    next_billing_at = db.Column(db.DateTime)
    total_billed = db.Column(db.Numeric(10, 2), default=0)
    total_paid = db.Column(db.Numeric(10, 2), default=0)

    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class PlatformInvoice(db.Model):
    """Fatura da MUV para o ADMIN (tenant) — por componentes configuráveis.

    Guarda o SNAPSHOT do cálculo (modo de contagem, pedidos, cota) para o
    admin conseguir auditar/conferir o valor cobrado depois de emitida.
    """
    __tablename__ = 'platform_invoices'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)

    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    period_start = db.Column(db.DateTime, nullable=False)
    period_end = db.Column(db.DateTime, nullable=False)

    # Valores (contagem pode ser fracionária no modo PRO_RATA_USO)
    establishments_count = db.Column(db.Numeric(10, 2), default=0)
    price_per_establishment = db.Column(db.Numeric(10, 2))
    fixed_price = db.Column(db.Numeric(10, 2), default=0)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)

    # Snapshot do cálculo (motor por componentes, 2026-11-20)
    establishment_count_mode = db.Column(db.String(20))  # SNAPSHOT, USO, PRO_RATA_USO
    min_orders_per_establishment = db.Column(db.Integer, default=1)
    orders_count = db.Column(db.Integer, default=0)  # pedidos do ciclo
    orders_billed = db.Column(db.Integer, default=0)  # pedidos cobráveis (fora de faixas gratuitas)
    price_per_order = db.Column(db.Numeric(10, 2), default=0)  # resumo (última faixa)
    orders_included = db.Column(db.Integer, default=0)  # resumo (1ª faixa)
    order_price_tiers = db.Column(db.JSON)  # snapshot das faixas cobradas (auditoria)
    calculation_detail = db.Column(db.Text)  # JSON com o detalhamento do cálculo

    status = db.Column(db.String(20), default='PENDING')  # PENDING, PAID, OVERDUE, CANCELLED
    due_date = db.Column(db.DateTime)

    # Integração pagamento (Asaas)
    asaas_invoice_id = db.Column(db.String(100))
    payment_url = db.Column(db.String(500))
    paid_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)
