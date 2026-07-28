from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from enum import Enum

db = SQLAlchemy()

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

class PaymentStatus(Enum):
    PENDING = "PENDING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"

class NotificationType(Enum):
    ORDER_AVAILABLE = "ORDER_AVAILABLE"
    ORDER_UPDATE = "ORDER_UPDATE"
    PAYMENT = "PAYMENT"
    SYSTEM = "SYSTEM"


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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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
            'user_type': self.user_type.value,
            'status': self.status.value,
            'created_at': self.created_at.isoformat(),
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
    pix_key = db.Column(db.String(100))
    is_online = db.Column(db.Boolean, default=False)
    current_latitude = db.Column(db.Numeric(10, 8))
    current_longitude = db.Column(db.Numeric(11, 8))
    last_location_update = db.Column(db.DateTime)
    rating = db.Column(db.Numeric(3, 2), default=5.00)
    total_deliveries = db.Column(db.Integer, default=0)
    max_concurrent_orders = db.Column(db.Integer, default=3)
    # Praça
    square_id = db.Column(db.Integer, db.ForeignKey('squares.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    orders = db.relationship('Order', backref='driver')
    deliveries = db.relationship('Delivery', backref='driver')
    payments = db.relationship('Payment', backref='driver')

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'user_id': self.user_id,
            'driver_license': self.driver_license,
            'license_expiry_date': self.license_expiry_date.isoformat() if self.license_expiry_date else None,
            'vehicle_type': self.vehicle_type.value,
            'vehicle_plate': self.vehicle_plate,
            'vehicle_model': self.vehicle_model,
            'vehicle_year': self.vehicle_year,
            'bank_account': self.bank_account,
            'pix_key': self.pix_key,
            'is_online': self.is_online,
            'current_latitude': float(self.current_latitude) if self.current_latitude else None,
            'current_longitude': float(self.current_longitude) if self.current_longitude else None,
            'last_location_update': self.last_location_update.isoformat() if self.last_location_update else None,
            'rating': float(self.rating) if self.rating else None,
            'total_deliveries': self.total_deliveries,
            'max_concurrent_orders': self.max_concurrent_orders,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
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
    # Dados bancarios
    bank_name = db.Column(db.String(100))
    bank_agency = db.Column(db.String(20))
    bank_account = db.Column(db.String(30))
    bank_pix_key = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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
            'bank_name': self.bank_name,
            'bank_agency': self.bank_agency,
            'bank_account': self.bank_account,
            'bank_pix_key': self.bank_pix_key,
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    user = db.relationship('User', backref='customer_profile', uselist=False)
    addresses = db.relationship('Address', backref='customer', cascade='all, delete-orphan')
    orders = db.relationship('Order', backref='customer')

    def to_dict(self):
        return {
            'id': self.id,
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    delivery_address_id = db.Column(db.Integer, db.ForeignKey('addresses.id'), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'))
    order_number = db.Column(db.String(50), nullable=False)
    items = db.Column(db.JSON, nullable=False)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)
    delivery_fee = db.Column(db.Numeric(10, 2), nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method = db.Column(db.Enum(PaymentMethod), nullable=False)
    status = db.Column(db.Enum(OrderStatus), default=OrderStatus.PENDING)
    scheduled_at = db.Column(db.DateTime)  # Quando o pedido deve virar PENDING
    estimated_delivery_time = db.Column(db.DateTime)
    pickup_time = db.Column(db.DateTime)
    delivery_time = db.Column(db.DateTime)
    special_instructions = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    delivery = db.relationship('Delivery', backref='order', uselist=False, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'restaurant_id': self.restaurant_id,
            'customer_id': self.customer_id,
            'delivery_address_id': self.delivery_address_id,
            'driver_id': self.driver_id,
            'order_number': self.order_number,
            'items': self.items,
            'subtotal': float(self.subtotal),
            'delivery_fee': float(self.delivery_fee),
            'total_amount': float(self.total_amount),
            'payment_method': self.payment_method.value,
            'status': self.status.value,
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'estimated_delivery_time': self.estimated_delivery_time.isoformat() if self.estimated_delivery_time else None,
            'pickup_time': self.pickup_time.isoformat() if self.pickup_time else None,
            'delivery_time': self.delivery_time.isoformat() if self.delivery_time else None,
            'special_instructions': self.special_instructions,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Delivery(db.Model):
    __tablename__ = 'deliveries'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=False)
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'driver_id': self.driver_id,
            'amount': float(self.amount),
            'payment_type': self.payment_type.value,
            'reference_id': self.reference_id,
            'payment_method': self.payment_method.value,
            'status': self.status.value,
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    config_key = db.Column(db.String(100), unique=True, nullable=False)
    config_value = db.Column(db.Text, nullable=False)
    description = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    restaurants = db.relationship('Restaurant', backref='square')
    drivers = db.relationship('Driver', backref='square')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'city': self.city,
            'state': self.state,
            'is_active': self.is_active,
            'price_per_km': float(self.price_per_km) if self.price_per_km else 2.95,
            'min_distance_km': float(self.min_distance_km) if self.min_distance_km else 4.0,
            'min_delivery_fee': float(self.price_per_km * (self.min_distance_km or 4.0)),  # Calculado automaticamente
            'max_delivery_fee': float(self.max_delivery_fee) if self.max_delivery_fee else 50.00,
            'driver_percentage': float(self.driver_percentage) if self.driver_percentage else 70.0,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    unlocked_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    """Configuracao de preco dinamico por praca"""
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

