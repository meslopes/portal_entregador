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
    PENDING = "PENDING"
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

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), unique=True)
    cpf = db.Column(db.String(14), unique=True)
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
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    driver_license = db.Column(db.String(20), unique=True)
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
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class Restaurant(db.Model):
    __tablename__ = 'restaurants'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(200), nullable=False)
    cnpj = db.Column(db.String(18), unique=True)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(255))
    address = db.Column(db.String(500), nullable=False)
    latitude = db.Column(db.Numeric(10, 8), nullable=False)
    longitude = db.Column(db.Numeric(11, 8), nullable=False)
    opening_hours = db.Column(db.JSON)
    is_active = db.Column(db.Boolean, default=True)
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
            'name': self.name,
            'cnpj': self.cnpj,
            'phone': self.phone,
            'email': self.email,
            'address': self.address,
            'latitude': float(self.latitude) if self.latitude else None,
            'longitude': float(self.longitude) if self.longitude else None,
            'opening_hours': self.opening_hours,
            'is_active': self.is_active,
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
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    delivery_address_id = db.Column(db.Integer, db.ForeignKey('addresses.id'), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'))
    order_number = db.Column(db.String(50), unique=True, nullable=False)
    items = db.Column(db.JSON, nullable=False)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)
    delivery_fee = db.Column(db.Numeric(10, 2), nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method = db.Column(db.Enum(PaymentMethod), nullable=False)
    status = db.Column(db.Enum(OrderStatus), default=OrderStatus.PENDING)
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
    name = db.Column(db.String(200), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(2), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
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
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

