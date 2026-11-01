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
    gamification_percentage = db.Column(db.Numeric(5, 2), default=5.0)
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
            'gamification_percentage': float(self.gamification_percentage) if self.gamification_percentage else 5.0,
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

    # Configuração da assinatura
    billing_cycle = db.Column(db.String(20), default='WEEKLY')  # WEEKLY, MONTHLY
    price_per_driver = db.Column(db.Numeric(10, 2), default=50.00)  # Preço por entregador por ciclo
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
