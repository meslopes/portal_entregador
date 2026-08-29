from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from enum import Enum

db = SQLAlchemy()

def utcnow():
    """Timezone-aware UTC now, compatible with Python 3.12+"""
    return datetime.now(timezone.utc)

class UserType(Enum):
    DRIVER = "DRIVER"
    ADMIN = "ADMIN"
    CLIENT = "CLIENT"

class UserStatus(Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"

class VehicleType(Enum):
    CAR = "CAR"
    MOTORCYCLE = "MOTORCYCLE"
    BICYCLE = "BICYCLE"
    FOOT = "FOOT"

class OrderStatus(Enum):
    SCHEDULED = "SCHEDULED"  # Pedido agendado (em preparo, visível apenas para admin)
    PENDING = "PENDING"      # Pedido tocando (visível para entregadores)
    OFFERED = "OFFERED"      # Oferecido a entregador próprio, aguardando aceite
    ACCEPTED = "ACCEPTED"
    PREPARING = "PREPARING"
    READY = "READY"
    PICKED_UP = "PICKED_UP"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

class PaymentMethod(Enum):
    CASH = "CASH"
    CARD = "CARD"
    PIX = "PIX"

class PaymentType(Enum):
    DELIVERY_EARNING = "DELIVERY_EARNING"
    BONUS = "BONUS"
    ADJUSTMENT = "ADJUSTMENT"
    WITHDRAWAL = "WITHDRAWAL"

class PaymentStatus(Enum):
    PENDING = "PENDING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class NotificationType(Enum):
    ORDER_AVAILABLE = "ORDER_AVAILABLE"
    NEW_ORDER = "NEW_ORDER"
    ORDER_UPDATE = "ORDER_UPDATE"
    PAYMENT = "PAYMENT"
    SYSTEM = "SYSTEM"
    INVOICE_REMINDER = "INVOICE_REMINDER"
    INVOICE_OVERDUE = "INVOICE_OVERDUE"


class Tenant(db.Model):
    """Organização/Empresa que usa a plataforma (multi-tenant)"""
    __tablename__ = 'tenants'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(200), nullable=False)  # Nome da empresa (ex: "muvy")
    slug = db.Column(db.String(100), unique=True, nullable=False)  # URL slug (ex: "muvy")
    logo_url = db.Column(db.String(500))  # URL do logo
    primary_color = db.Column(db.String(7), default='#6366f1')  # Cor primária (hex)
    secondary_color = db.Column(db.String(7), default='#ffffff')  # Cor secundária (hex)
    domain = db.Column(db.String(200))  # Domínio próprio (ex: "app.muvy.com.br")
    phone = db.Column(db.String(20))
    email = db.Column(db.String(255))
    address = db.Column(db.String(500))
    cnpj = db.Column(db.String(18))
    # Configurações do plano
    plan = db.Column(db.String(50), default='free')  # free, basic, premium, platinum
    max_deliveries_month = db.Column(db.Integer, default=100)
    max_drivers = db.Column(db.Integer, default=2)
    max_clients = db.Column(db.Integer, default=20)
    # Configurações de white-label
    custom_domain = db.Column(db.String(200))  # Domínio personalizado
    terms_url = db.Column(db.String(500))  # URL dos termos de uso
    privacy_url = db.Column(db.String(500))  # URL da política de privacidade
    # Status
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    # Relacionamentos
    users = db.relationship('User', backref='tenant', lazy='dynamic')
    squares = db.relationship('Square', backref='tenant', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'logo_url': self.logo_url,
            'primary_color': self.primary_color,
            'secondary_color': self.secondary_color,
            'domain': self.domain,
            'phone': self.phone,
            'email': self.email,
            'address': self.address,
            'cnpj': self.cnpj,
            'plan': self.plan,
            'max_deliveries_month': self.max_deliveries_month,
            'max_drivers': self.max_drivers,
            'max_clients': self.max_clients,
            'custom_domain': self.custom_domain,
            'terms_url': self.terms_url,
            'privacy_url': self.privacy_url,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)  # NULL = super admin (muv.log)
    email = db.Column(db.String(255), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    cpf = db.Column(db.String(14))
    birth_date = db.Column(db.Date)
    profile_picture_url = db.Column(db.String(500))
    user_type = db.Column(db.Enum(UserType), nullable=False)
    status = db.Column(db.Enum(UserStatus), default=UserStatus.ACTIVE)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)
    
    # Relacionamentos
    driver = db.relationship('Driver', backref='user', uselist=False, cascade='all, delete-orphan')
    notifications = db.relationship('Notification', backref='user', cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'cpf': self.cpf,
            'birth_date': self.birth_date.isoformat() if self.birth_date else None,
            'profile_picture_url': self.profile_picture_url,
            'user_type': self.user_type.value if self.user_type else None,
            'status': self.status.value if self.status else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat()
        }

class Driver(db.Model):
    __tablename__ = 'drivers'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    driver_license = db.Column(db.String(20))
    license_expiry_date = db.Column(db.Date)
    vehicle_type = db.Column(db.Enum(VehicleType), nullable=False)
    vehicle_plate = db.Column(db.String(10))
    vehicle_model = db.Column(db.String(100))
    vehicle_year = db.Column(db.Integer)
    bank_account = db.Column(db.String(50))
    is_online = db.Column(db.Boolean, default=False)
    current_latitude = db.Column(db.Numeric(10, 8))
    current_longitude = db.Column(db.Numeric(11, 8))
    last_location_update = db.Column(db.DateTime)
    rating = db.Column(db.Numeric(3, 2), default=5.00)
    total_deliveries = db.Column(db.Integer, default=0)
    max_concurrent_orders = db.Column(db.Integer, default=3)
    # Praça
    square_id = db.Column(db.Integer, db.ForeignKey('squares.id'), nullable=True)
    # Fila ordenada
    queue_position = db.Column(db.Integer, default=0)  # Posição na fila (menor = maior prioridade)
    last_order_at = db.Column(db.DateTime)  # Quando aceitou/rejeitou o último pedido
    total_orders_today = db.Column(db.Integer, default=0)  # Pedidos completados hoje
    # Penalidades
    rejection_count = db.Column(db.Integer, default=0)  # Rejeições consecutivas
    is_blocked = db.Column(db.Boolean, default=False)  # Bloqueado por rejeições excessivas
    blocked_until = db.Column(db.DateTime)  # Data de desbloqueio (se temporário)
    # Carteira
    balance = db.Column(db.Numeric(10, 2), default=0)  # Saldo disponível para saque
    locked_balance = db.Column(db.Numeric(10, 2), default=0)  # Saldo bloqueado (em trânsito)
    pix_key = db.Column(db.String(100))  # Chave PIX para saques
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)
    
    # Relacionamentos
    orders = db.relationship('Order', backref='driver')
    deliveries = db.relationship('Delivery', backref='driver')
    payments = db.relationship('Payment', backref='driver')

    # Índices para performance
    __table_args__ = (
        db.Index('ix_drivers_tenant_online', 'tenant_id', 'is_online'),
        db.Index('ix_drivers_square', 'square_id'),
    )

    def to_dict(self):
        data = {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'user_id': self.user_id,
            'driver_license': self.driver_license,
            'license_expiry_date': self.license_expiry_date.isoformat() if self.license_expiry_date else None,
            'vehicle_type': self.vehicle_type.value if self.vehicle_type else None,
            'vehicle_plate': self.vehicle_plate,
            'vehicle_model': self.vehicle_model,
            'vehicle_year': self.vehicle_year,
            'is_online': self.is_online,
            'current_latitude': float(self.current_latitude) if self.current_latitude else None,
            'current_longitude': float(self.current_longitude) if self.current_longitude else None,
            'last_location_update': self.last_location_update.isoformat() if self.last_location_update else None,
            'rating': float(self.rating) if self.rating else None,
            'total_deliveries': self.total_deliveries,
            'max_concurrent_orders': self.max_concurrent_orders,
            'square_id': self.square_id,
            'queue_position': self.queue_position,
            'last_order_at': self.last_order_at.isoformat() if self.last_order_at else None,
            'total_orders_today': self.total_orders_today,
            'rejection_count': self.rejection_count or 0,
            'is_blocked': self.is_blocked or False,
            'blocked_until': self.blocked_until.isoformat() if self.blocked_until else None,
            'balance': float(self.balance) if self.balance else 0,
            'locked_balance': float(self.locked_balance) if self.locked_balance else 0,
            'driver_type': 'PLATFORM',
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        # Incluir dados da praça se disponível
        if self.square:
            data['square_name'] = self.square.name
            data['square_city'] = self.square.city
        return data

    def to_admin_dict(self):
        """Inclui dados financeiros (apenas para admins)"""
        data = self.to_dict()
        data['bank_account'] = self.bank_account
        data['pix_key'] = self.pix_key
        return data


class DriverRestaurant(db.Model):
    """Vinculação de entregadores a estabelecimentos (prioridade)"""
    __tablename__ = 'driver_restaurants'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=False)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.id'), nullable=False)
    is_priority = db.Column(db.Boolean, default=False)  # Se True, entregador tem prioridade neste restaurante
    created_at = db.Column(db.DateTime, default=utcnow)

    # Relacionamentos
    driver = db.relationship('Driver', backref='restaurant_assignments')
    restaurant = db.relationship('Restaurant', backref='driver_assignments')

    # Índice único para evitar duplicatas
    __table_args__ = (db.UniqueConstraint('driver_id', 'restaurant_id'),)

    def to_dict(self):
        return {
            'id': self.id,
            'driver_id': self.driver_id,
            'restaurant_id': self.restaurant_id,
            'is_priority': self.is_priority,
            'driver_name': f"{self.driver.user.first_name} {self.driver.user.last_name}" if self.driver and self.driver.user else None,
            'restaurant_name': self.restaurant.name if self.restaurant else None,
            'created_at': self.created_at.isoformat()
        }


class DriverPenalty(db.Model):
    """Registro de penalidades dos entregadores"""
    __tablename__ = 'driver_penalties'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)
    penalty_type = db.Column(db.String(50), nullable=False)  # REJECTION, LATE_DELIVERY, CANCELLED, etc.
    reason = db.Column(db.String(500))
    is_active = db.Column(db.Boolean, default=True)  # Se a penalidade ainda está ativa
    created_at = db.Column(db.DateTime, default=utcnow)

    # Relacionamentos
    driver = db.relationship('Driver', backref='penalties')
    order = db.relationship('Order', backref='penalties')

    def to_dict(self):
        return {
            'id': self.id,
            'driver_id': self.driver_id,
            'order_id': self.order_id,
            'penalty_type': self.penalty_type,
            'reason': self.reason,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }


class EstablishmentDriver(db.Model):
    """Entregadores próprios do estabelecimento"""
    __tablename__ = 'establishment_drivers'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(20))
    pin_hash = db.Column(db.String(512))  # Hash do PIN de 4 dígitos para login no PWA
    vehicle_type = db.Column(db.String(20))  # MOTO, BIKE, CAR
    vehicle_plate = db.Column(db.String(10))
    vehicle_model = db.Column(db.String(100))
    is_online = db.Column(db.Boolean, default=False)
    current_latitude = db.Column(db.Numeric(10, 8))
    current_longitude = db.Column(db.Numeric(11, 8))
    is_active = db.Column(db.Boolean, default=True)
    # Frequência de pagamento
    payment_frequency = db.Column(db.String(20), default='WEEKLY')  # DAILY, WEEKLY, MONTHLY, ON_DEMAND
    # Métricas de desempenho
    rating = db.Column(db.Numeric(3, 2), default=5.00)
    total_deliveries = db.Column(db.Integer, default=0)
    total_ratings = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    # Relacionamentos
    restaurant = db.relationship('Restaurant', backref='own_drivers')

    def set_pin(self, pin):
        from werkzeug.security import generate_password_hash
        self.pin_hash = generate_password_hash(pin)

    def check_pin(self, pin):
        from werkzeug.security import check_password_hash
        if not self.pin_hash:
            return False
        return check_password_hash(self.pin_hash, pin)

    def to_dict(self):
        data = {
            'id': self.id,
            'restaurant_id': self.restaurant_id,
            'name': self.name,
            'phone': self.phone,
            'vehicle_type': self.vehicle_type,
            'vehicle_plate': self.vehicle_plate,
            'vehicle_model': self.vehicle_model,
            'is_online': self.is_online,
            'current_latitude': float(self.current_latitude) if self.current_latitude else None,
            'current_longitude': float(self.current_longitude) if self.current_longitude else None,
            'is_active': self.is_active,
            'payment_frequency': self.payment_frequency or 'WEEKLY',
            'rating': float(self.rating) if self.rating else 5.0,
            'total_deliveries': self.total_deliveries or 0,
            'total_ratings': self.total_ratings or 0,
            'has_pin': bool(self.pin_hash),
            'driver_type': 'OWN',
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        # Incluir dados do restaurante/praça/tenant se disponível
        if self.restaurant:
            data['restaurant_name'] = self.restaurant.name
            if self.restaurant.square:
                data['square_id'] = self.restaurant.square_id
                data['square_name'] = self.restaurant.square.name
                data['square_city'] = self.restaurant.square.city
            if self.restaurant.tenant_id:
                data['tenant_id'] = self.restaurant.tenant_id
        return data


class OwnDriverEarning(db.Model):
    """Ganhos de entregadores próprios por entrega"""
    __tablename__ = 'own_driver_earnings'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.id'), nullable=False)
    establishment_driver_id = db.Column(db.Integer, db.ForeignKey('establishment_drivers.id'), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    # Valores calculados
    delivery_fee = db.Column(db.Numeric(10, 2), nullable=False)  # Frete cobrado do cliente
    driver_earning = db.Column(db.Numeric(10, 2), nullable=False)  # Valor a pagar ao entregador
    payment_type = db.Column(db.String(30))  # Tipo de pagamento aplicado
    distance_km = db.Column(db.Numeric(10, 2))  # Distância percorrida
    # Status do pagamento
    is_paid = db.Column(db.Boolean, default=False)  # Se já foi pago
    paid_at = db.Column(db.DateTime)  # Data do pagamento
    payment_method = db.Column(db.String(20))  # PIX, CASH, TRANSFER
    created_at = db.Column(db.DateTime, default=utcnow)

    # Relacionamentos
    restaurant = db.relationship('Restaurant', backref='own_driver_earnings')
    driver = db.relationship('EstablishmentDriver', backref='earnings')
    order = db.relationship('Order', backref='own_driver_earnings')

    def to_dict(self):
        return {
            'id': self.id,
            'restaurant_id': self.restaurant_id,
            'establishment_driver_id': self.establishment_driver_id,
            'order_id': self.order_id,
            'delivery_fee': float(self.delivery_fee),
            'driver_earning': float(self.driver_earning),
            'payment_type': self.payment_type,
            'distance_km': float(self.distance_km) if self.distance_km else None,
            'is_paid': self.is_paid,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'payment_method': self.payment_method,
            'created_at': self.created_at.isoformat(),
            'driver_name': self.driver.name if self.driver else None,
            'order_number': self.order.order_number if self.order else None
        }


class Restaurant(db.Model):
    __tablename__ = 'restaurants'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)
    name = db.Column(db.String(200), nullable=False)
    cnpj = db.Column(db.String(18))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(255))
    address = db.Column(db.String(500), nullable=False)
    latitude = db.Column(db.Numeric(10, 8), nullable=False)
    longitude = db.Column(db.Numeric(11, 8), nullable=False)
    opening_hours = db.Column(db.JSON)
    is_active = db.Column(db.Boolean, default=True)
    # Tempo de preparo em minutos (configuravel por estabelecimento)
    preparation_minutes = db.Column(db.Integer, default=10)  # Tempo padrao: 10 minutos
    # Praça
    square_id = db.Column(db.Integer, db.ForeignKey('squares.id'), nullable=True)
    # Tabela de preços (se vazio, usa a padrão da praça)
    pricing_table_id = db.Column(db.Integer, db.ForeignKey('pricing_tables.id'), nullable=True)
    # Entregadores próprios
    has_own_drivers = db.Column(db.Boolean, default=False)  # Se usa entregadores próprios
    subscription_type = db.Column(db.String(20))  # WEEKLY, NONE
    subscription_expires_at = db.Column(db.DateTime)  # Data de expiração da assinatura
    platform_pricing_table_id = db.Column(db.Integer, db.ForeignKey('pricing_tables.id'), nullable=True)  # Tabela diferenciada para plataforma
    # Roteirização para entregadores da plataforma
    enable_platform_routing = db.Column(db.Boolean, default=False)  # Se usa roteirização para plataforma
    # Configuração de pagamento para entregadores próprios
    own_driver_payment_type = db.Column(db.String(30), default='PER_DELIVERY')  # PER_DELIVERY, PER_KM, PERCENTAGE, DAILY, FIXED, FIXED_PLUS_DELIVERY, FIXED_UP_TO_PLUS_DELIVERY
    own_driver_fixed_value = db.Column(db.Numeric(10, 2), default=5.00)  # Valor fixo por entrega/diária
    own_driver_km_value = db.Column(db.Numeric(10, 2), default=1.50)  # Valor por km
    own_driver_percentage = db.Column(db.Numeric(5, 2), default=70.0)  # Percentual do frete
    own_driver_delivery_value = db.Column(db.Numeric(10, 2), default=3.00)  # Valor por entrega (para FIXED_PLUS_DELIVERY)
    own_driver_max_deliveries = db.Column(db.Integer, default=10)  # Máximo de entregas incluídas no valor fixo
    # Dados bancarios
    bank_name = db.Column(db.String(100))
    bank_agency = db.Column(db.String(20))
    bank_account = db.Column(db.String(30))
    bank_pix_key = db.Column(db.String(100))
    # Integração Asaas
    asaas_customer_id = db.Column(db.String(50))
    # Tipo de confirmacao de entrega
    pickup_confirmation_type = db.Column(db.String(20), default='code')  # code, photo, none
    delivery_confirmation_type = db.Column(db.String(20), default='code')  # code, photo, none
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)
    
    # Relacionamentos
    orders = db.relationship('Order', backref='restaurant')

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'name': self.name,
            'cnpj': self.cnpj,
            'phone': self.phone,
            'email': self.email,
            'address': self.address,
            'latitude': float(self.latitude) if self.latitude else None,
            'longitude': float(self.longitude) if self.longitude else None,
            'opening_hours': self.opening_hours,
            'is_active': self.is_active,
            'preparation_minutes': self.preparation_minutes or 10,
            'square_id': self.square_id,
            'pricing_table_id': self.pricing_table_id,
            'bank_name': self.bank_name,
            'bank_agency': self.bank_agency,
            'bank_account': self.bank_account,
            'bank_pix_key': self.bank_pix_key,
            'asaas_customer_id': self.asaas_customer_id,
            'has_own_drivers': self.has_own_drivers,
            'own_driver_payment_type': self.own_driver_payment_type or 'PER_DELIVERY',
            'own_driver_fixed_value': float(self.own_driver_fixed_value) if self.own_driver_fixed_value else 5.00,
            'own_driver_km_value': float(self.own_driver_km_value) if self.own_driver_km_value else 1.50,
            'own_driver_percentage': float(self.own_driver_percentage) if self.own_driver_percentage else 70.0,
            'subscription_type': self.subscription_type,
            'subscription_expires_at': self.subscription_expires_at.isoformat() if self.subscription_expires_at else None,
            'pickup_confirmation_type': self.pickup_confirmation_type or 'code',
            'delivery_confirmation_type': self.delivery_confirmation_type or 'code',
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Customer(db.Model):
    __tablename__ = 'customers'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    name = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    # Relacionamentos
    user = db.relationship('User', backref='customer_profile', uselist=False)
    addresses = db.relationship('Address', backref='customer', cascade='all, delete-orphan')
    orders = db.relationship('Order', backref='customer')

    # Índices para performance
    __table_args__ = (
        db.Index('ix_customers_phone', 'phone'),
        db.Index('ix_customers_tenant', 'tenant_id'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'user_id': self.user_id,
            'name': self.name,
            'phone': self.phone,
            'email': self.email,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Address(db.Model):
    __tablename__ = 'addresses'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    street = db.Column(db.String(300), nullable=False)
    complement = db.Column(db.String(100))
    neighborhood = db.Column(db.String(100), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(2), nullable=False)
    zip_code = db.Column(db.String(10), nullable=False)
    latitude = db.Column(db.Numeric(10, 8))
    longitude = db.Column(db.Numeric(11, 8))
    is_default = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)
    
    # Relacionamentos
    orders = db.relationship('Order', backref='delivery_address')

    def to_dict(self):
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'street': self.street,
            'complement': self.complement,
            'neighborhood': self.neighborhood,
            'city': self.city,
            'state': self.state,
            'zip_code': self.zip_code,
            'latitude': float(self.latitude) if self.latitude else None,
            'longitude': float(self.longitude) if self.longitude else None,
            'is_default': self.is_default,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)
    square_id = db.Column(db.Integer, db.ForeignKey('squares.id'), nullable=True)  # Praça do pedido
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    delivery_address_id = db.Column(db.Integer, db.ForeignKey('addresses.id'), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'))
    route_id = db.Column(db.Integer, db.ForeignKey('delivery_routes.id'), nullable=True)  # Rota multi-parada
    stop_number = db.Column(db.Integer)  # Número da parada na rota (1, 2, 3...)
    order_number = db.Column(db.String(50), nullable=False)
    tracking_token = db.Column(db.String(36), unique=True)  # UUID para rastreio público
    items = db.Column(db.JSON, nullable=False)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)
    delivery_fee = db.Column(db.Numeric(10, 2), nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method = db.Column(db.Enum(PaymentMethod), nullable=False)
    status = db.Column(db.Enum(OrderStatus), default=OrderStatus.PENDING)
    distribution_method = db.Column(db.String(20), default='nearest')  # nearest, broadcast, queue, manual
    scheduled_at = db.Column(db.DateTime)  # Quando o pedido deve virar PENDING
    estimated_delivery_time = db.Column(db.DateTime)
    pickup_time = db.Column(db.DateTime)
    delivery_time = db.Column(db.DateTime)
    # Timestamps para timeline
    accepted_at = db.Column(db.DateTime)
    offered_at = db.Column(db.DateTime)  # Quando foi oferecido ao entregador próprio
    offer_attempts = db.Column(db.Integer, default=0)  # Quantas vezes foi oferecido
    preparing_at = db.Column(db.DateTime)
    ready_at = db.Column(db.DateTime)
    picked_up_at = db.Column(db.DateTime)
    special_instructions = db.Column(db.Text)
    # Códigos anti-fraude
    pickup_code = db.Column(db.String(6))  # Código para confirmar coleta
    delivery_code = db.Column(db.String(6))  # Código para confirmar entrega
    # Integração com plataformas externas
    external_id = db.Column(db.String(100))  # ID do pedido na plataforma (iFood, etc.)
    platform_source = db.Column(db.String(20))  # IFOOD, OPEN_DELIVERY, etc.
    # Entregadores próprios
    assigned_to_own_driver = db.Column(db.Boolean, default=False)  # Se foi atribuído a entregador próprio
    establishment_driver_id = db.Column(db.Integer, db.ForeignKey('establishment_drivers.id'), nullable=True)
    called_platform = db.Column(db.Boolean, default=False)  # Se chamou entregadores da plataforma
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)
    
    # Relacionamentos
    delivery = db.relationship('Delivery', backref='order', uselist=False, cascade='all, delete-orphan')
    establishment_driver = db.relationship('EstablishmentDriver', foreign_keys=[establishment_driver_id], lazy='select')

    # Índices para performance
    __table_args__ = (
        db.Index('ix_orders_tenant_status', 'tenant_id', 'status'),
        db.Index('ix_orders_restaurant_status', 'restaurant_id', 'status'),
        db.Index('ix_orders_created_at', 'created_at'),
        db.Index('ix_orders_driver_status', 'driver_id', 'status'),
    )

    def to_dict(self):
        result = {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'restaurant_id': self.restaurant_id,
            'customer_id': self.customer_id,
            'delivery_address_id': self.delivery_address_id,
            'driver_id': self.driver_id,
            'route_id': self.route_id,
            'stop_number': self.stop_number,
            'order_number': self.order_number,
            'tracking_token': self.tracking_token,
            'items': self.items,
            'subtotal': float(self.subtotal),
            'delivery_fee': float(self.delivery_fee) if self.delivery_fee else 0,
            'total_amount': float(self.total_amount) if self.total_amount else 0,
            'payment_method': self.payment_method.value if self.payment_method else None,
            'status': self.status.value if self.status else None,
            'external_id': self.external_id,
            'platform_source': self.platform_source,
            'distribution_method': self.distribution_method,
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'estimated_delivery_time': self.estimated_delivery_time.isoformat() if self.estimated_delivery_time else None,
            'pickup_time': self.pickup_time.isoformat() if self.pickup_time else None,
            'delivery_time': self.delivery_time.isoformat() if self.delivery_time else None,
            'accepted_at': self.accepted_at.isoformat() if self.accepted_at else None,
            'preparing_at': self.preparing_at.isoformat() if self.preparing_at else None,
            'ready_at': self.ready_at.isoformat() if self.ready_at else None,
            'picked_up_at': self.picked_up_at.isoformat() if self.picked_up_at else None,
            'special_instructions': self.special_instructions,
            'pickup_code': self.pickup_code,
            'delivery_code': self.delivery_code,
            'square_id': self.square_id,
            'assigned_to_own_driver': self.assigned_to_own_driver or False,
            'establishment_driver_id': self.establishment_driver_id,
            'called_platform': self.called_platform or False,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        # Incluir informações do entregador próprio se atribuído
        if self.establishment_driver:
            result['own_driver'] = {
                'id': self.establishment_driver.id,
                'name': self.establishment_driver.name,
                'phone': self.establishment_driver.phone,
                'vehicle_type': self.establishment_driver.vehicle_type,
                'vehicle_plate': self.establishment_driver.vehicle_plate
            }
        
        return result


class DeliveryRoute(db.Model):
    """Rota de entrega com múltiplas paradas"""
    __tablename__ = 'delivery_routes'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=True)
    route_number = db.Column(db.String(50), unique=True, nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, active, completed, cancelled
    total_stops = db.Column(db.Integer, default=0)
    completed_stops = db.Column(db.Integer, default=0)
    total_distance_km = db.Column(db.Numeric(8, 2))
    estimated_duration_minutes = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    # Relacionamentos
    orders = db.relationship('Order', backref='route', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'driver_id': self.driver_id,
            'route_number': self.route_number,
            'status': self.status,
            'total_stops': self.total_stops,
            'completed_stops': self.completed_stops,
            'total_distance_km': float(self.total_distance_km) if self.total_distance_km else None,
            'estimated_duration_minutes': self.estimated_duration_minutes,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class Delivery(db.Model):
    __tablename__ = 'deliveries'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=True)  # Nullable para entregadores próprios
    pickup_latitude = db.Column(db.Numeric(10, 8))
    pickup_longitude = db.Column(db.Numeric(11, 8))
    delivery_latitude = db.Column(db.Numeric(10, 8))
    delivery_longitude = db.Column(db.Numeric(11, 8))
    distance_km = db.Column(db.Numeric(8, 2))
    estimated_duration_minutes = db.Column(db.Integer)
    actual_duration_minutes = db.Column(db.Integer)
    driver_earnings = db.Column(db.Numeric(10, 2))
    proof_of_delivery_url = db.Column(db.String(500))
    customer_rating = db.Column(db.Integer)
    customer_feedback = db.Column(db.Text)
    driver_rating = db.Column(db.Integer)         # entregador avalia estabelecimento (1-5)
    driver_feedback = db.Column(db.Text)           # comentário do entregador
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'driver_id': self.driver_id,
            'pickup_latitude': float(self.pickup_latitude) if self.pickup_latitude else None,
            'pickup_longitude': float(self.pickup_longitude) if self.pickup_longitude else None,
            'delivery_latitude': float(self.delivery_latitude) if self.delivery_latitude else None,
            'delivery_longitude': float(self.delivery_longitude) if self.delivery_longitude else None,
            'distance_km': float(self.distance_km) if self.distance_km else None,
            'estimated_duration_minutes': self.estimated_duration_minutes,
            'actual_duration_minutes': self.actual_duration_minutes,
            'driver_earnings': float(self.driver_earnings) if self.driver_earnings else None,
            'proof_of_delivery_url': self.proof_of_delivery_url,
            'customer_rating': self.customer_rating,
            'customer_feedback': self.customer_feedback,
            'driver_rating': self.driver_rating,
            'driver_feedback': self.driver_feedback,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

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

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.Enum(NotificationType), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    related_id = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'type': self.type.value,
            'is_read': self.is_read,
            'related_id': self.related_id,
            'created_at': self.created_at.isoformat()
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

class Square(db.Model):
    """Praça/Cidade onde o sistema opera"""
    __tablename__ = 'squares'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)
    name = db.Column(db.String(200), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(2), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    # Tabela de precos por km
    price_per_km = db.Column(db.Numeric(10, 2), default=2.95)
    min_distance_km = db.Column(db.Numeric(5, 2), default=4.0)  # Distancia minima cobrada (4km padrao)
    max_delivery_fee = db.Column(db.Numeric(10, 2), default=50.00)
    driver_percentage = db.Column(db.Numeric(5, 2), default=70.0)  # Percentual do entregador (70% padrao)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    # Relacionamentos
    restaurants = db.relationship('Restaurant', backref='square')
    drivers = db.relationship('Driver', backref='square')
    pricing_tables = db.relationship('PricingTable', backref='square', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'city': self.city,
            'state': self.state,
            'is_active': self.is_active,
            'price_per_km': float(self.price_per_km) if self.price_per_km else 2.95,
            'min_distance_km': float(self.min_distance_km) if self.min_distance_km else 4.0,
            'min_delivery_fee': float(self.price_per_km * (self.min_distance_km or 4.0)),
            'max_delivery_fee': float(self.max_delivery_fee) if self.max_delivery_fee else 50.00,
            'driver_percentage': float(self.driver_percentage) if self.driver_percentage else 70.0,
            'pricing_tables': [t.to_dict() for t in self.pricing_tables] if self.pricing_tables else [],
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
    min_distance_km = db.Column(db.Numeric(5, 2), default=4.0)
    min_delivery_fee = db.Column(db.Numeric(10, 2))
    max_delivery_fee = db.Column(db.Numeric(10, 2), default=50.00)
    driver_percentage = db.Column(db.Numeric(5, 2), default=70.0)
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
            'min_distance_km': float(self.min_distance_km) if self.min_distance_km else 4.0,
            'min_delivery_fee': float(self.min_delivery_fee) if self.min_delivery_fee else float(self.price_per_km) * float(self.min_distance_km or 4.0),
            'max_delivery_fee': float(self.max_delivery_fee) if self.max_delivery_fee else 50.00,
            'driver_percentage': float(self.driver_percentage) if self.driver_percentage else 70.0,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


# ============================================
# SISTEMA DE BONIFICACAO
# ============================================

class DriverScore(db.Model):
    """Pontuacao do entregador por periodo"""
    __tablename__ = 'driver_scores'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=False)
    period = db.Column(db.String(20), nullable=False)  # 'weekly', 'monthly'
    accept_time_avg = db.Column(db.Numeric(5, 2), default=0)  # segundos
    delivery_time_avg = db.Column(db.Numeric(5, 2), default=0)  # minutos
    acceptance_rate = db.Column(db.Numeric(5, 2), default=100)  # percentual
    avg_rating = db.Column(db.Numeric(3, 2), default=5.0)
    hours_online = db.Column(db.Numeric(5, 2), default=0)
    total_deliveries = db.Column(db.Integer, default=0)
    total_refused = db.Column(db.Integer, default=0)
    total_score = db.Column(db.Numeric(10, 2), default=0)
    ranking_position = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    # Relacionamentos
    driver = db.relationship('Driver', backref='scores')

    def to_dict(self):
        return {
            'id': self.id,
            'driver_id': self.driver_id,
            'period': self.period,
            'accept_time_avg': float(self.accept_time_avg) if self.accept_time_avg else 0,
            'delivery_time_avg': float(self.delivery_time_avg) if self.delivery_time_avg else 0,
            'acceptance_rate': float(self.acceptance_rate) if self.acceptance_rate else 100,
            'avg_rating': float(self.avg_rating) if self.avg_rating else 5.0,
            'hours_online': float(self.hours_online) if self.hours_online else 0,
            'total_deliveries': self.total_deliveries or 0,
            'total_refused': self.total_refused or 0,
            'total_score': float(self.total_score) if self.total_score else 0,
            'ranking_position': self.ranking_position,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class DriverBonus(db.Model):
    """Bonus distribuido ao entregador"""
    __tablename__ = 'driver_bonuses'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    bonus_type = db.Column(db.String(50), nullable=False)  # 'weekly', 'monthly', 'rainy', 'demand'
    criteria = db.Column(db.String(100))  # criterio da premiacao
    period_start = db.Column(db.Date)
    period_end = db.Column(db.Date)
    status = db.Column(db.String(20), default='PENDING')  # PENDING, PAID, CANCELLED
    paid_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utcnow)

    # Relacionamentos
    driver = db.relationship('Driver', backref='bonuses')

    def to_dict(self):
        return {
            'id': self.id,
            'driver_id': self.driver_id,
            'amount': float(self.amount),
            'bonus_type': self.bonus_type,
            'criteria': self.criteria,
            'period_start': self.period_start.isoformat() if self.period_start else None,
            'period_end': self.period_end.isoformat() if self.period_end else None,
            'status': self.status,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'created_at': self.created_at.isoformat()
        }


class DriverAchievement(db.Model):
    """Conquista desbloqueada pelo entregador"""
    __tablename__ = 'driver_achievements'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=False)
    achievement_type = db.Column(db.String(50), nullable=False)
    achievement_name = db.Column(db.String(100), nullable=False)
    unlocked_at = db.Column(db.DateTime, default=utcnow)

    # Relacionamentos
    driver = db.relationship('Driver', backref='achievements')

    def to_dict(self):
        return {
            'id': self.id,
            'driver_id': self.driver_id,
            'achievement_type': self.achievement_type,
            'achievement_name': self.achievement_name,
            'unlocked_at': self.unlocked_at.isoformat()
        }


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


class OwnDriverRoute(db.Model):
    """Rota de entrega com múltiplos pedidos para entregadores próprios"""
    __tablename__ = 'own_driver_routes'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    establishment_driver_id = db.Column(db.Integer, db.ForeignKey('establishment_drivers.id'), nullable=False)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.id'), nullable=False)
    status = db.Column(db.String(20), default='PENDING')  # PENDING, ACTIVE, COMPLETED, CANCELLED
    total_distance_km = db.Column(db.Numeric(10, 2))
    total_duration_min = db.Column(db.Numeric(10, 2))
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utcnow)

    # Relacionamentos
    driver = db.relationship('EstablishmentDriver', backref='routes')
    restaurant = db.relationship('Restaurant', backref='own_driver_routes')
    stops = db.relationship('OwnDriverStop', backref='route', order_by='OwnDriverStop.stop_order')

    def to_dict(self):
        return {
            'id': self.id,
            'name': f'Rota #{self.id}',
            'establishment_driver_id': self.establishment_driver_id,
            'driver_name': self.driver.name if self.driver else None,
            'restaurant_id': self.restaurant_id,
            'status': self.status,
            'total_distance_km': float(self.total_distance_km) if self.total_distance_km else None,
            'total_duration_min': float(self.total_duration_min) if self.total_duration_min else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat(),
            'stops_count': len(self.stops),
            'stops': [s.to_dict() for s in self.stops]
        }


class OwnDriverStop(db.Model):
    """Parada individual em uma rota de entrega de entregador próprio"""
    __tablename__ = 'own_driver_stops'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    route_id = db.Column(db.Integer, db.ForeignKey('own_driver_routes.id'), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    stop_order = db.Column(db.Integer, nullable=False)  # Ordem na rota (1, 2, 3...)
    stop_type = db.Column(db.String(20))  # PICKUP, DELIVERY
    latitude = db.Column(db.Numeric(10, 8))
    longitude = db.Column(db.Numeric(11, 8))
    address = db.Column(db.String(500))
    status = db.Column(db.String(20), default='PENDING')  # PENDING, COMPLETED, SKIPPED
    arrived_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utcnow)

    # Relacionamentos
    order = db.relationship('Order', backref='own_driver_stops')

    def to_dict(self):
        return {
            'id': self.id,
            'route_id': self.route_id,
            'order_id': self.order_id,
            'order_number': self.order.order_number if self.order else None,
            'customer_name': self.order.customer.name if self.order and self.order.customer else None,
            'customer_phone': self.order.customer.phone if self.order and self.order.customer else None,
            'stop_order': self.stop_order,
            'stop_type': self.stop_type,
            'latitude': float(self.latitude) if self.latitude else None,
            'longitude': float(self.longitude) if self.longitude else None,
            'address': self.address,
            'status': self.status,
            'arrived_at': self.arrived_at.isoformat() if self.arrived_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat()
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


class PlatformDriverRoute(db.Model):
    """Rota de entrega com múltiplos pedidos para entregadores da plataforma"""
    __tablename__ = 'platform_driver_routes'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=False)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.id'), nullable=False)
    status = db.Column(db.String(20), default='ACTIVE')  # ACTIVE, COMPLETED, CANCELLED
    total_distance_km = db.Column(db.Numeric(10, 2))
    total_duration_min = db.Column(db.Numeric(10, 2))
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utcnow)

    # Relacionamentos
    driver = db.relationship('Driver', backref='routes')
    restaurant = db.relationship('Restaurant', backref='platform_routes')
    stops = db.relationship('PlatformDriverStop', backref='route', order_by='PlatformDriverStop.stop_order')

    def to_dict(self):
        driver_name = 'N/A'
        if self.driver and self.driver.user:
            first = self.driver.user.first_name or ''
            last = self.driver.user.last_name or ''
            driver_name = f"{first} {last}".strip() or 'N/A'
        return {
            'id': self.id,
            'driver_id': self.driver_id,
            'driver_name': driver_name,
            'restaurant_id': self.restaurant_id,
            'restaurant_name': self.restaurant.name if self.restaurant else 'N/A',
            'status': self.status,
            'total_distance_km': float(self.total_distance_km) if self.total_distance_km else None,
            'total_duration_min': float(self.total_duration_min) if self.total_duration_min else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat(),
            'stops': [s.to_dict() for s in self.stops]
        }


class PlatformDriverStop(db.Model):
    """Parada individual em uma rota de entrega de entregador da plataforma"""
    __tablename__ = 'platform_driver_stops'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    route_id = db.Column(db.Integer, db.ForeignKey('platform_driver_routes.id'), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    stop_order = db.Column(db.Integer, nullable=False)
    stop_type = db.Column(db.String(20))  # PICKUP, DELIVERY
    latitude = db.Column(db.Numeric(10, 8))
    longitude = db.Column(db.Numeric(11, 8))
    address = db.Column(db.String(500))
    status = db.Column(db.String(20), default='PENDING')  # PENDING, COMPLETED, SKIPPED
    arrived_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utcnow)

    # Relacionamentos
    order = db.relationship('Order', backref='platform_route_stops')

    def to_dict(self):
        return {
            'id': self.id,
            'route_id': self.route_id,
            'order_id': self.order_id,
            'stop_order': self.stop_order,
            'stop_type': self.stop_type,
            'latitude': float(self.latitude) if self.latitude else None,
            'longitude': float(self.longitude) if self.longitude else None,
            'address': self.address,
            'status': self.status,
            'arrived_at': self.arrived_at.isoformat() if self.arrived_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat()
        }

