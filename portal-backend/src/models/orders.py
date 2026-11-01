"""Pedidos e entregas: estabelecimentos, clientes, endereços, pedidos e rotas.

Extraído de portal_models.py no refactor de arquivos grandes (2026-11-01).
Importe via src.models.portal_models (fachada) — comportamento idêntico.
"""
from src.models.base import OrderStatus, PaymentMethod, db, utcnow


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
    # Integração iFood
    external_merchant_id = db.Column(db.String(100))  # ID do merchant no iFood
    # Tipo de confirmacao de entrega
    pickup_confirmation_type = db.Column(db.String(20), default='code')  # code, photo, none
    delivery_confirmation_type = db.Column(db.String(20), default='code')  # code, photo, none
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    # Relacionamentos
    orders = db.relationship('Order', backref='restaurant')

    def to_dict(self, include_sensitive=False):
        """
        Serializa o restaurante. Por padrão NÃO expõe dados bancários (LGPD).
        Endpoints admin/finance devem passar include_sensitive=True.
        """
        data = {
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
        if include_sensitive:
            data['bank_name'] = self.bank_name
            data['bank_agency'] = self.bank_agency
            data['bank_account'] = self.bank_account
            data['bank_pix_key'] = self.bank_pix_key
            data['asaas_customer_id'] = self.asaas_customer_id
            data['external_merchant_id'] = self.external_merchant_id
        return data

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
    own_driver_route_id = db.Column(db.Integer, db.ForeignKey('own_driver_routes.id'), nullable=True)  # Rota do entregador próprio
    platform_route_id = db.Column(db.Integer, db.ForeignKey('platform_driver_routes.id'), nullable=True)  # Rota do entregador da plataforma
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

    def customer_instructions(self):
        """Nota do cliente sem flags internas de distribuição."""
        from src.utils.order_tags import strip_system_tags
        return strip_system_tags(self.special_instructions)

    def internal_system_tags(self):
        """Flags internas (OFFERED_TO, REJECTED_BY, ...) para uso do admin/sistema."""
        from src.utils.order_tags import extract_system_tags
        return extract_system_tags(self.special_instructions)

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
            'special_instructions': self.customer_instructions(),
            'system_tags': self.internal_system_tags(),
            'pickup_code': self.pickup_code,
            'delivery_code': self.delivery_code,
            'square_id': self.square_id,
            'assigned_to_own_driver': self.assigned_to_own_driver or False,
            'establishment_driver_id': self.establishment_driver_id,
            'own_driver_route_id': self.own_driver_route_id,
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


__all__ = [
    "Restaurant",
    "Customer",
    "Address",
    "Order",
    "DeliveryRoute",
    "Delivery",
]
