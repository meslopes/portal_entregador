"""Pessoas e acesso: organização, usuários, entregadores e cadastros próprios.

Extraído de portal_models.py no refactor de arquivos grandes (2026-11-01).
Importe via src.models.portal_models (fachada) — comportamento idêntico.
"""
from werkzeug.security import check_password_hash, generate_password_hash

from src.models.base import UserStatus, UserType, VehicleType, db, utcnow


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
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)
    is_super_admin = db.Column(db.Boolean, default=False, nullable=False)  # Super admin da plataforma (muv.log)
    totp_secret = db.Column(db.String(32))  # Secret para 2FA (TOTP)
    totp_enabled = db.Column(db.Boolean, default=False)  # Se 2FA está ativado
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

    # Soft delete
    deleted_at = db.Column(db.DateTime, nullable=True)
    deleted_by = db.Column(db.Integer, nullable=True)  # ID do admin que excluiu

    # Relacionamentos
    driver = db.relationship('Driver', backref='user', uselist=False, cascade='all, delete-orphan')
    notifications = db.relationship('Notification', backref='user', cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self, include_sensitive=False):
        """
        Serializa o usuário. Por padrão NÃO expõe CPF/nascimento (LGPD).
        Endpoints admin devem passar include_sensitive=True.
        """
        data = {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'is_super_admin': self.is_super_admin,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'profile_picture_url': self.profile_picture_url,
            'user_type': self.user_type.value if self.user_type else None,
            'status': self.status.value if self.status else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'deleted_by': self.deleted_by
        }
        if include_sensitive:
            data['cpf'] = self.cpf
            data['birth_date'] = self.birth_date.isoformat() if self.birth_date else None
        return data

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
    converted_to_own = db.Column(db.Boolean, default=False)  # Convertido para entregador próprio
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
            'converted_to_own': self.converted_to_own or False,
            'balance': float(self.balance) if self.balance else 0,
            'locked_balance': float(self.locked_balance) if self.locked_balance else 0,
            'driver_type': 'PLATFORM',
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        # Incluir dados da praça se disponível
        if self.square:
            data['square_name'] = self.square.name
            data['square_city'] = self.square.city
            data['square_state'] = self.square.state
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



__all__ = [
    "Tenant",
    "User",
    "Driver",
    "DriverRestaurant",
    "DriverPenalty",
    "EstablishmentDriver",
    "OwnDriverEarning",
]
