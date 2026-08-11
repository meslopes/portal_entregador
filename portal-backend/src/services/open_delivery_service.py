"""
Serviço Open Delivery - Padrão aberto de comunicação entre plataformas de delivery.
Permite receber pedidos de qualquer plataforma compatível (iFood, Rappi, etc.)
"""
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


# Mapeamento de status Open Delivery → status interno
OPEN_DELIVERY_STATUS_MAP = {
    'PLACED': 'PENDING',
    'CONFIRMED': 'ACCEPTED',
    'PREPARING': 'PREPARING',
    'READY_TO_DELIVER': 'READY',
    'DISPATCHED': 'PICKED_UP',
    'DELIVERED': 'DELIVERED',
    'CANCELLED': 'CANCELLED',
    'CONCLUDED': 'DELIVERED'
}


def parse_open_delivery_order(data):
    """
    Converte um pedido no formato Open Delivery para o formato interno.
    
    Formato Open Delivery:
    {
        "id": "uuid",
        "order": "12345",
        "createdAt": "2024-01-01T12:00:00Z",
        "merchant": {"id": "uuid", "name": "Restaurante"},
        "customer": {"name": "João", "phone": {"number": "51999999999"}},
        "items": [{"name": "Item", "quantity": 1, "unitPrice": 25.00}],
        "total": {"deliveryFee": 10.00, "subTotal": 25.00, "orderAmount": 35.00},
        "payments": [{"type": "CASH", "value": 35.00}],
        "deliveryAddress": {"street": "Rua", "coordinates": {"latitude": -29.95, "longitude": -50.45}}
    }
    """
    try:
        order_id = data.get('id')
        order_number = data.get('order', order_id)
        merchant = data.get('merchant', {})
        customer = data.get('customer', {})
        items = data.get('items', [])
        totals = data.get('total', {})
        payments = data.get('payments', [])
        address = data.get('deliveryAddress', {})
        coordinates = address.get('coordinates', {})
        
        # Mapear pagamento
        payment_type = payments[0].get('type', 'CASH') if payments else 'CASH'
        payment_map = {
            'CASH': 'CASH', 'CREDIT': 'CARD', 'DEBIT': 'CARD',
            'PIX': 'PIX', 'MEAL_VOUCHER': 'CARD', 'FOOD_VOUCHER': 'CARD'
        }
        payment_method = payment_map.get(payment_type, 'CASH')
        
        # Extrair telefone
        phone_data = customer.get('phone', {})
        phone = phone_data.get('number', '') if isinstance(phone_data, dict) else str(phone_data)
        
        return {
            'external_id': order_id,
            'order_number': f"OD-{order_number}",
            'restaurant_name': merchant.get('name', 'Restaurante'),
            'restaurant_external_id': merchant.get('id'),
            'customer': {
                'name': customer.get('name', 'Cliente'),
                'phone': phone
            },
            'delivery_address': {
                'street': address.get('street', ''),
                'neighborhood': address.get('neighborhood', ''),
                'city': address.get('city', ''),
                'state': address.get('state', ''),
                'zip_code': address.get('postalCode', ''),
                'latitude': coordinates.get('latitude'),
                'longitude': coordinates.get('longitude')
            },
            'items': [{'name': i.get('name'), 'quantity': i.get('quantity', 1), 'price': i.get('unitPrice', 0)} for i in items],
            'subtotal': totals.get('subTotal', 0),
            'delivery_fee': totals.get('deliveryFee', 0),
            'total_amount': totals.get('orderAmount', 0),
            'payment_method': payment_method,
            'special_instructions': data.get('observations', '')
        }
    except Exception as e:
        logger.error(f"Erro ao parsear pedido Open Delivery: {e}")
        return None


def detect_platform(data):
    """
    Detecta qual plataforma enviou o pedido baseado no formato dos dados.
    
    Returns:
        str: 'IFOOD', 'OPEN_DELIVERY', ou 'UNKNOWN'
    """
    # iFood tem campos específicos
    if data.get('merchant') and data.get('order'):
        return 'IFOOD'
    # Open Delivery padrão
    if data.get('id') and data.get('merchant'):
        return 'OPEN_DELIVERY'
    return 'UNKNOWN'
