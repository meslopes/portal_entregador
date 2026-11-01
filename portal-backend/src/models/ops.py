"""Operação: notificações, praças, gamificação, rotas próprias e registros de apoio.

Extraído de portal_models.py no refactor de arquivos grandes (2026-11-01).
Importe via src.models.portal_models (fachada) — comportamento idêntico.
"""
from src.models.base import NotificationType, db, utcnow


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
    fixed_fee = db.Column(db.Numeric(10, 2), default=0)  # Tarifa fixa (0 = usar preço por km)
    min_distance_km = db.Column(db.Numeric(5, 2), default=4.0)  # Distancia minima cobrada (4km padrao)
    max_delivery_fee = db.Column(db.Numeric(10, 2), default=50.00)
    driver_percentage = db.Column(db.Numeric(5, 2), default=65.0)  # Percentual do entregador (65% padrao)
    gamification_percentage = db.Column(db.Numeric(5, 2), default=5.0)  # Percentual para gamificação (5% padrao)
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
            'fixed_fee': float(self.fixed_fee) if self.fixed_fee else 0,
            'min_distance_km': float(self.min_distance_km) if self.min_distance_km else 4.0,
            'min_delivery_fee': float(self.price_per_km * (self.min_distance_km or 4.0)),
            'max_delivery_fee': float(self.max_delivery_fee) if self.max_delivery_fee else 50.00,
            'driver_percentage': float(self.driver_percentage) if self.driver_percentage else 65.0,
            'gamification_percentage': float(self.gamification_percentage) if self.gamification_percentage else 5.0,
            'pricing_tables': [t.to_dict() for t in self.pricing_tables] if self.pricing_tables else [],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


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


class OwnDriverRoute(db.Model):
    """Rota de entrega com múltiplos pedidos para entregadores próprios"""
    __tablename__ = 'own_driver_routes'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    establishment_driver_id = db.Column(db.Integer, db.ForeignKey('establishment_drivers.id'), nullable=True)
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

    @property
    def name(self):
        return f'Rota #{self.id}'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
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
            'order_status': self.order.status.value if self.order and self.order.status else None,
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


class RouteSettings(db.Model):
    """Configurações de roteirização"""
    __tablename__ = 'route_settings'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)

    # Auto-roteirização
    auto_routing_enabled = db.Column(db.Boolean, default=True)
    auto_routing_interval_min = db.Column(db.Integer, default=5)  # minutos

    # Limites
    max_orders_auto = db.Column(db.Integer, default=6)  # máximo para auto
    max_orders_manual = db.Column(db.Integer, default=10)  # máximo para manual
    max_distance_km = db.Column(db.Numeric(5, 2), default=10.0)  # distância máxima entre pedidos

    # Algoritmo
    direction_weight = db.Column(db.Numeric(3, 2), default=0.70)  # peso da direção (0-1)
    distance_weight = db.Column(db.Numeric(3, 2), default=0.30)  # peso da distância (0-1)
    min_time_savings_min = db.Column(db.Integer, default=10)  # mínimo de minutos economizados
    min_clusterization = db.Column(db.Numeric(3, 2), default=0.70)  # proximidade mínima (0-1)

    # Status de pedidos para roteirização
    include_scheduled = db.Column(db.Boolean, default=False)  # incluir agendados
    scheduled_advance_min = db.Column(db.Integer, default=30)  # minutos antes do horário agendado para incluir
    include_pending = db.Column(db.Boolean, default=True)  # incluir pendentes
    include_accepted = db.Column(db.Boolean, default=True)  # incluir aceitos
    include_preparing = db.Column(db.Boolean, default=True)  # incluir em preparo
    include_ready = db.Column(db.Boolean, default=True)  # incluir prontos

    # Notificações
    notify_admin_auto_route = db.Column(db.Boolean, default=True)
    notify_driver_auto_route = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'auto_routing_enabled': self.auto_routing_enabled,
            'auto_routing_interval_min': self.auto_routing_interval_min,
            'max_orders_auto': self.max_orders_auto,
            'max_orders_manual': self.max_orders_manual,
            'max_distance_km': float(self.max_distance_km) if self.max_distance_km else 10.0,
            'direction_weight': float(self.direction_weight) if self.direction_weight else 0.70,
            'distance_weight': float(self.distance_weight) if self.distance_weight else 0.30,
            'min_time_savings_min': self.min_time_savings_min,
            'min_clusterization': float(self.min_clusterization) if self.min_clusterization else 0.70,
            'include_scheduled': self.include_scheduled,
            'scheduled_advance_min': self.scheduled_advance_min,
            'include_pending': self.include_pending,
            'include_accepted': self.include_accepted,
            'include_preparing': self.include_preparing,
            'include_ready': self.include_ready,
            'notify_admin_auto_route': self.notify_admin_auto_route,
            'notify_driver_auto_route': self.notify_driver_auto_route,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class PlatformDriverRoute(db.Model):
    """Rota de entrega com múltiplos pedidos para entregadores da plataforma"""
    __tablename__ = 'platform_driver_routes'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=False)
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.id'), nullable=True)  # Nullable para entregadores da plataforma
    status = db.Column(db.String(20), default='PENDING')  # PENDING, ACTIVE, COMPLETED, CANCELLED, REJECTED
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
    restaurant_id = db.Column(db.Integer, db.ForeignKey('restaurants.id'), nullable=True)  # Restaurante da coleta
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
    restaurant = db.relationship('Restaurant', backref='platform_stops')

    def to_dict(self):
        return {
            'id': self.id,
            'route_id': self.route_id,
            'order_id': self.order_id,
            'order_number': self.order.order_number if self.order else None,
            'customer_name': self.order.customer.name if self.order and self.order.customer else None,
            'customer_phone': self.order.customer.phone if self.order and self.order.customer else None,
            'restaurant_id': self.restaurant_id,
            'restaurant_name': self.restaurant.name if self.restaurant else (self.order.restaurant.name if self.order and self.order.restaurant else None),
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


# ============================================================
# MUVSCORE - Sistema de Gamificação e Ranking
# ============================================================

class DriverPointsLog(db.Model):
    """Registro de pontos do entregador (cada evento de pontuação)"""
    __tablename__ = 'driver_points_log'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=False)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)
    points = db.Column(db.Integer, nullable=False)  # Positivo = ganhou, negativo = perdeu
    reason = db.Column(db.String(50), nullable=False)  # delivery, rating, special_day, peak_hour, streak, etc.
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=True)
    description = db.Column(db.String(200))  # Descrição legível do evento
    created_at = db.Column(db.DateTime, default=utcnow)

    # Relacionamentos
    driver = db.relationship('Driver', backref='points_log')

    # Índices
    __table_args__ = (
        db.Index('ix_points_driver_date', 'driver_id', 'created_at'),
        db.Index('ix_points_tenant_date', 'tenant_id', 'created_at'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'driver_id': self.driver_id,
            'points': self.points,
            'reason': self.reason,
            'order_id': self.order_id,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class DriverWeeklyScore(db.Model):
    """Pontuação semanal consolidada do entregador (para ranking e níveis)"""
    __tablename__ = 'driver_weekly_scores'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=False)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)
    square_id = db.Column(db.Integer, db.ForeignKey('squares.id'), nullable=True)
    week_start = db.Column(db.Date, nullable=False)  # Segunda-feira da semana
    week_end = db.Column(db.Date, nullable=False)  # Domingo da semana
    total_points = db.Column(db.Integer, default=0)
    total_deliveries = db.Column(db.Integer, default=0)
    avg_rating = db.Column(db.Numeric(3, 2))  # Média de avaliações na semana
    streak_days = db.Column(db.Integer, default=0)  # Dias consecutivos trabalhando
    level = db.Column(db.String(20), default='bronze')  # bronze, prata, ouro, diamante
    position = db.Column(db.Integer)  # Posição no ranking da semana
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    # Relacionamentos
    driver = db.relationship('Driver', backref='weekly_scores')

    # Índices
    __table_args__ = (
        db.UniqueConstraint('driver_id', 'week_start', name='uq_driver_week'),
        db.Index('ix_weekly_tenant_week', 'tenant_id', 'week_start'),
        db.Index('ix_weekly_square_week', 'square_id', 'week_start'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'driver_id': self.driver_id,
            'week_start': self.week_start.isoformat() if self.week_start else None,
            'week_end': self.week_end.isoformat() if self.week_end else None,
            'total_points': self.total_points,
            'total_deliveries': self.total_deliveries,
            'avg_rating': float(self.avg_rating) if self.avg_rating else None,
            'streak_days': self.streak_days,
            'level': self.level,
            'position': self.position,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @staticmethod
    def calculate_level(points):
        """Calcula o nível do entregador com base nos pontos semanais"""
        if points >= 1000:
            return 'diamante'
        elif points >= 500:
            return 'ouro'
        elif points >= 100:
            return 'prata'
        else:
            return 'bronze'


class SpecialDay(db.Model):
    """Dias especiais marcados pelo admin (chuva, feriado, alta demanda)"""
    __tablename__ = 'special_days'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)
    date = db.Column(db.Date, nullable=False)
    reason = db.Column(db.String(100), nullable=False)  # chuva, feriado, alta_demanda, evento
    multiplier = db.Column(db.Numeric(3, 2), default=1.50)  # Multiplicador de pontos
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    __table_args__ = (
        db.UniqueConstraint('tenant_id', 'date', name='uq_special_day_tenant_date'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'date': self.date.isoformat() if self.date else None,
            'reason': self.reason,
            'multiplier': float(self.multiplier) if self.multiplier else 1.5,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class PeakHour(db.Model):
    """Horários de pico configuráveis pelo admin"""
    __tablename__ = 'peak_hours'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    multiplier = db.Column(db.Numeric(3, 2), default=1.30)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'start_time': self.start_time.strftime('%H:%M') if self.start_time else None,
            'end_time': self.end_time.strftime('%H:%M') if self.end_time else None,
            'multiplier': float(self.multiplier) if self.multiplier else 1.3,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class PushToken(db.Model):
    """Tokens FCM registrados para push notifications"""
    __tablename__ = 'push_tokens'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(500), nullable=False, unique=True)
    platform = db.Column(db.String(20), default='web')  # web, android, ios
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    user = db.relationship('User', backref='push_tokens')


__all__ = [
    "Notification",
    "Square",
    "DriverScore",
    "DriverBonus",
    "DriverAchievement",
    "OwnDriverRoute",
    "OwnDriverStop",
    "RouteSettings",
    "PlatformDriverRoute",
    "PlatformDriverStop",
    "DriverPointsLog",
    "DriverWeeklyScore",
    "SpecialDay",
    "PeakHour",
    "PushToken",
]
