"""Base dos modelos: instância do banco, utilitários de data e os tipos (enums).

Extraído de portal_models.py no refactor de arquivos grandes (2026-11-01).
Importe via src.models.portal_models (fachada) — comportamento idêntico.
"""
from datetime import datetime, timezone
from enum import Enum

from flask_sqlalchemy import SQLAlchemy

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



__all__ = [
    "UserType",
    "UserStatus",
    "VehicleType",
    "OrderStatus",
    "PaymentMethod",
    "PaymentType",
    "PaymentStatus",
    "NotificationType",
    "db",
    "utcnow",
]
