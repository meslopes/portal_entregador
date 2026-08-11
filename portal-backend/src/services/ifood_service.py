"""
Serviço de integração com a API do iFood.
Gerencia autenticação, confirmação de pedidos e callbacks de status.
"""
import os
import requests
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# URLs do iFood (sandbox e produção)
IFOOD_BASE_URL = os.getenv('IFOOD_BASE_URL', 'https://merchant-api.ifood.com.br')
IFOOD_AUTH_URL = os.getenv('IFOOD_AUTH_URL', 'https://merchant-api.ifood.com.br/authentication/v1.0')


def get_auth_headers(access_token):
    """Headers para requisições autenticadas ao iFood"""
    return {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }


def authenticate(client_id, client_secret):
    """
    Autentica com o iFood usando OAuth 2.0 (Client Credentials).
    
    Returns:
        dict com access_token, expires_in, ou erro
    """
    try:
        payload = {
            'clientId': client_id,
            'clientSecret': client_secret
        }
        response = requests.post(
            f"{IFOOD_AUTH_URL}/oauth/token",
            json=payload,
            timeout=30
        )
        data = response.json()
        
        if response.status_code == 200:
            logger.info("Autenticação iFood bem-sucedida")
            return {
                'success': True,
                'access_token': data.get('accessToken'),
                'refresh_token': data.get('refreshToken'),
                'expires_in': data.get('expiresIn', 3600)
            }
        else:
            logger.error(f"Erro na autenticação iFood: {data}")
            return {'success': False, 'error': data.get('message', 'Erro desconhecido')}
    except Exception as e:
        logger.error(f"Exceção na autenticação iFood: {e}")
        return {'success': False, 'error': str(e)}


def refresh_access_token(refresh_token, client_id, client_secret):
    """Renova o access token usando o refresh token"""
    try:
        payload = {
            'clientId': client_id,
            'clientSecret': client_secret,
            'refreshToken': refresh_token
        }
        response = requests.post(
            f"{IFOOD_AUTH_URL}/oauth/token",
            json=payload,
            timeout=30
        )
        data = response.json()
        
        if response.status_code == 200:
            return {
                'success': True,
                'access_token': data.get('accessToken'),
                'refresh_token': data.get('refreshToken'),
                'expires_in': data.get('expiresIn', 3600)
            }
        return {'success': False, 'error': data.get('message', 'Erro ao renovar token')}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def confirm_order(access_token, order_id):
    """
    Confirma um pedido no iFood (aceite pelo estabelecimento).
    
    Endpoint: PATCH /order/v1.0/{orderId}/confirm
    """
    try:
        response = requests.patch(
            f"{IFOOD_BASE_URL}/order/v1.0/{order_id}/confirm",
            headers=get_auth_headers(access_token),
            timeout=30
        )
        
        if response.status_code in [200, 202, 204]:
            logger.info(f"Pedido iFood {order_id} confirmado")
            return {'success': True}
        else:
            data = response.json() if response.content else {}
            logger.error(f"Erro ao confirmar pedido iFood {order_id}: {data}")
            return {'success': False, 'error': data.get('message', f'Erro HTTP {response.status_code}')}
    except Exception as e:
        logger.error(f"Exceção ao confirmar pedido iFood {order_id}: {e}")
        return {'success': False, 'error': str(e)}


def cancel_order(access_token, order_id, reason_code='OTHER', reason_description='Cancelado pelo estabelecimento'):
    """
    Cancela um pedido no iFood.
    
    Endpoint: PATCH /order/v1.0/{orderId}/cancel
    """
    try:
        payload = {
            'reason': {
                'code': reason_code,
                'description': reason_description
            }
        }
        response = requests.patch(
            f"{IFOOD_BASE_URL}/order/v1.0/{order_id}/cancel",
            headers=get_auth_headers(access_token),
            json=payload,
            timeout=30
        )
        
        if response.status_code in [200, 202, 204]:
            logger.info(f"Pedido iFood {order_id} cancelado")
            return {'success': True}
        else:
            data = response.json() if response.content else {}
            logger.error(f"Erro ao cancelar pedido iFood {order_id}: {data}")
            return {'success': False, 'error': data.get('message', f'Erro HTTP {response.status_code}')}
    except Exception as e:
        logger.error(f"Exceção ao cancelar pedido iFood {order_id}: {e}")
        return {'success': False, 'error': str(e)}


def update_status(access_token, order_id, status):
    """
    Atualiza o status de um pedido no iFood.
    
    Status válidos: DISPATCHED, DELIVERED
    
    Endpoint: PATCH /order/v1.0/{orderId}/status/{status}
    """
    try:
        response = requests.patch(
            f"{IFOOD_BASE_URL}/order/v1.0/{order_id}/status/{status}",
            headers=get_auth_headers(access_token),
            timeout=30
        )
        
        if response.status_code in [200, 202, 204]:
            logger.info(f"Status do pedido iFood {order_id} atualizado para {status}")
            return {'success': True}
        else:
            data = response.json() if response.content else {}
            logger.error(f"Erro ao atualizar status do pedido iFood {order_id}: {data}")
            return {'success': False, 'error': data.get('message', f'Erro HTTP {response.status_code}')}
    except Exception as e:
        logger.error(f"Exceção ao atualizar status do pedido iFood {order_id}: {e}")
        return {'success': False, 'error': str(e)}


def get_order_details(access_token, order_id):
    """
    Busca detalhes de um pedido no iFood.
    
    Endpoint: GET /order/v1.0/{orderId}
    """
    try:
        response = requests.get(
            f"{IFOOD_BASE_URL}/order/v1.0/{order_id}",
            headers=get_auth_headers(access_token),
            timeout=30
        )
        
        if response.status_code == 200:
            return {'success': True, 'data': response.json()}
        return {'success': False, 'error': f'Erro HTTP {response.status_code}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def parse_ifood_order(ifood_data):
    """
    Converte um pedido do formato iFood (Open Delivery) para o formato interno.
    
    Formato iFood real:
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
        # Extrair dados do formato iFood
        order_id = ifood_data.get('id')
        order_number = ifood_data.get('order', order_id)
        merchant = ifood_data.get('merchant', {})
        customer = ifood_data.get('customer', {})
        items = ifood_data.get('items', [])
        totals = ifood_data.get('total', {})
        payments = ifood_data.get('payments', [])
        address = ifood_data.get('deliveryAddress', {})
        coordinates = address.get('coordinates', {})
        
        # Mapear método de pagamento
        payment_type = payments[0].get('type', 'CASH') if payments else 'CASH'
        payment_map = {
            'CASH': 'CASH',
            'CREDIT': 'CARD',
            'DEBIT': 'CARD',
            'PIX': 'PIX',
            'MEAL_VOUCHER': 'CARD',
            'FOOD_VOUCHER': 'CARD'
        }
        payment_method = payment_map.get(payment_type, 'CASH')
        
        # Extrair telefone
        phone_data = customer.get('phone', {})
        phone = phone_data.get('number', '') if isinstance(phone_data, dict) else str(phone_data)
        
        return {
            'external_id': order_id,
            'order_number': f"IFOOD-{order_number}",
            'restaurant_name': merchant.get('name', 'Restaurante iFood'),
            'restaurant_external_id': merchant.get('id'),
            'customer': {
                'name': customer.get('name', 'Cliente iFood'),
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
            'special_instructions': ifood_data.get('observations', '')
        }
    except Exception as e:
        logger.error(f"Erro ao parsear pedido iFood: {e}")
        return None


# Mapeamento de status iFood → status interno
IFOOD_STATUS_MAP = {
    'PLACED': 'PENDING',
    'CONFIRMED': 'ACCEPTED',
    'PREPARING': 'PREPARING',
    'READY_TO_DELIVER': 'READY',
    'DISPATCHED': 'PICKED_UP',
    'DELIVERED': 'DELIVERED',
    'CANCELLED': 'CANCELLED',
    'CONCLUDED': 'DELIVERED'
}

# Mapeamento de status interno → status iFood (para callbacks)
INTERNAL_TO_IFOOD_STATUS = {
    'ACCEPTED': 'CONFIRMED',
    'PREPARING': 'PREPARING',
    'READY': 'READY_TO_DELIVER',
    'PICKED_UP': 'DISPATCHED',
    'DELIVERED': 'DELIVERED',
    'CANCELLED': 'CANCELLED'
}
