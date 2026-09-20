"""
Serviço de integração com a API do iFood.
Gerencia autenticação, confirmação de pedidos e callbacks de status.

Suporta dois ambientes:
- Sandbox: https://sandbox-api.ifood.com.br (testes)
- Produção: https://merchant-api.ifood.com.br (real)
"""
import os
import requests
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

# Ambiente: 'sandbox' ou 'production'
IFOOD_ENV = os.getenv('IFOOD_ENV', 'sandbox')

# URLs do iFood por ambiente
IFOOD_URLS = {
    'sandbox': {
        'base': 'https://sandbox-api.ifood.com.br',
        'auth': 'https://sandbox-api.ifood.com.br/authentication/v1.0',
    },
    'production': {
        'base': 'https://merchant-api.ifood.com.br',
        'auth': 'https://merchant-api.ifood.com.br/authentication/v1.0',
    }
}

def get_ifood_urls():
    """Retorna as URLs do iFood baseado no ambiente configurado."""
    env = os.getenv('IFOOD_ENV', 'sandbox')
    urls = IFOOD_URLS.get(env, IFOOD_URLS['sandbox'])
    logger.info(f"iFood ambiente: {env} → {urls['base']}")
    return urls

# URLs padrão (backward compatibility)
IFOOD_BASE_URL = os.getenv('IFOOD_BASE_URL', IFOOD_URLS[IFOOD_ENV]['base'])
IFOOD_AUTH_URL = os.getenv('IFOOD_AUTH_URL', IFOOD_URLS[IFOOD_ENV]['auth'])


def get_auth_headers(access_token):
    """Headers para requisições autenticadas ao iFood"""
    return {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }


def get_environment_info():
    """Retorna informações sobre o ambiente iFood configurado."""
    urls = get_ifood_urls()
    return {
        'environment': os.getenv('IFOOD_ENV', 'sandbox'),
        'base_url': urls['base'],
        'auth_url': urls['auth'],
        'is_sandbox': os.getenv('IFOOD_ENV', 'sandbox') == 'sandbox'
    }


def authenticate(client_id, client_secret):
    """
    Autentica com o iFood usando OAuth 2.0 (Client Credentials).
    
    Returns:
        dict com access_token, expires_in, ou erro
    """
    try:
        urls = get_ifood_urls()
        payload = {
            'clientId': client_id,
            'clientSecret': client_secret
        }
        logger.info(f"Autenticando iFood em: {urls['auth']}/oauth/token")
        response = requests.post(
            f"{urls['auth']}/oauth/token",
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
        urls = get_ifood_urls()
        payload = {
            'clientId': client_id,
            'clientSecret': client_secret,
            'refreshToken': refresh_token
        }
        response = requests.post(
            f"{urls['auth']}/oauth/token",
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
        urls = get_ifood_urls()
        response = requests.patch(
            f"{urls['base']}/order/v1.0/{order_id}/confirm",
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
        urls = get_ifood_urls()
        payload = {
            'reason': {
                'code': reason_code,
                'description': reason_description
            }
        }
        response = requests.patch(
            f"{urls['base']}/order/v1.0/{order_id}/cancel",
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
        urls = get_ifood_urls()
        response = requests.patch(
            f"{urls['base']}/order/v1.0/{order_id}/status/{status}",
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
        urls = get_ifood_urls()
        response = requests.get(
            f"{urls['base']}/order/v1.0/{order_id}",
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


# =============================================
# SANDBOX — Geração de pedidos de teste
# =============================================

# Dados da loja de teste do iFood (fornecidos pelo portal de desenvolvedores)
IFOOD_SANDBOX_MERCHANT = {
    'id': '5ef178ef-cb24-4bf0-8a56-b2bb428c7998',
    'name': 'Teste - 65.525.361 EMMANUEL BOES LOPES',
    'shortId': '4033304'
}


def generate_sandbox_order(order_number=None):
    """
    Gera um pedido de teste no formato real do iFood sandbox.
    
    Baseado no formato Open Delivery que o iFood envia via webhook.
    Usa a loja de teste configurada no portal de desenvolvedores.
    
    Args:
        order_number: número do pedido (auto-gerado se None)
    
    Returns:
        dict no formato do iFood Open Delivery
    """
    import uuid
    import random
    
    if order_number is None:
        order_number = f"{random.randint(100000, 999999)}"
    
    order_id = str(uuid.uuid4())
    
    # Coordenadas de Canoas/RS (região de teste)
    lat = -29.9150 + random.uniform(-0.01, 0.01)
    lng = -51.1780 + random.uniform(-0.01, 0.01)
    
    # Itens de teste variados
    test_items = [
        [
            {'name': 'X-Tudo', 'quantity': 1, 'unitPrice': 28.90, 'externalCode': 'XT001'},
            {'name': 'Batata Frita Grande', 'quantity': 1, 'unitPrice': 15.90, 'externalCode': 'BF002'},
            {'name': 'Coca-Cola 2L', 'quantity': 1, 'unitPrice': 12.00, 'externalCode': 'CC003'},
        ],
        [
            {'name': 'Pizza Margherita Grande', 'quantity': 1, 'unitPrice': 45.00, 'externalCode': 'PZ001'},
            {'name': 'Guaraná Lata', 'quantity': 2, 'unitPrice': 6.00, 'externalCode': 'GR002'},
        ],
        [
            {'name': 'Açaí 500ml', 'quantity': 1, 'unitPrice': 22.00, 'externalCode': 'AC001'},
            {'name': 'Banana', 'quantity': 1, 'unitPrice': 3.00, 'externalCode': 'AC002'},
            {'name': 'Granola', 'quantity': 1, 'unitPrice': 4.00, 'externalCode': 'AC003'},
            {'name': 'Leite Condensado', 'quantity': 1, 'unitPrice': 3.00, 'externalCode': 'AC004'},
        ],
    ]
    
    items = random.choice(test_items)
    subtotal = sum(i['unitPrice'] * i['quantity'] for i in items)
    delivery_fee = round(random.uniform(5.00, 15.00), 2)
    total = subtotal + delivery_fee
    
    # Nomes de clientes de teste
    customer_names = [
        'Mauro Lopes', 'Ana Silva', 'Carlos Oliveira', 
        'Maria Santos', 'Pedro Souza', 'Julia Costa'
    ]
    
    # Endereços de teste em Canoas/RS
    test_addresses = [
        {'street': 'Rua das Flores, 123', 'neighborhood': 'Centro', 'city': 'Canoas', 'state': 'RS'},
        {'street': 'Av. Getúlio Vargas, 456', 'neighborhood': 'Mathias Velho', 'city': 'Canoas', 'state': 'RS'},
        {'street': 'Rua Marechal Deodoro, 789', 'neighborhood': 'Centro', 'city': 'Canoas', 'state': 'RS'},
        {'street': 'Rua Sinimbu, 321', 'neighborhood': 'Harmonia', 'city': 'Canoas', 'state': 'RS'},
    ]
    
    address = random.choice(test_addresses)
    customer_name = random.choice(customer_names)
    
    # Formato real do iFood Open Delivery
    return {
        'id': order_id,
        'order': order_number,
        'displayId': order_number,
        'createdAt': datetime.now(timezone.utc).isoformat(),
        'preparationStartDateTime': datetime.now(timezone.utc).isoformat(),
        'merchant': {
            'id': IFOOD_SANDBOX_MERCHANT['id'],
            'name': IFOOD_SANDBOX_MERCHANT['name'],
            'shortId': IFOOD_SANDBOX_MERCHANT['shortId'],
        },
        'customer': {
            'id': str(uuid.uuid4()),
            'name': customer_name,
            'phone': {
                'number': f"519{random.randint(10000000, 99999999)}",
                'localizer': str(uuid.uuid4()),
                'localizerExpiration': (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
            },
            'documentNumber': None,
            'ordersCountOnMerchant': random.randint(1, 20),
        },
        'items': [
            {
                'id': str(uuid.uuid4()),
                'name': i['name'],
                'externalCode': i['externalCode'],
                'quantity': i['quantity'],
                'unitPrice': i['unitPrice'],
                'totalPrice': i['unitPrice'] * i['quantity'],
                'observations': '',
                'subItems': [],
            }
            for i in items
        ],
        'total': {
            'subTotal': round(subtotal, 2),
            'deliveryFee': delivery_fee,
            'additionalFees': 0,
            'orderAmount': round(total, 2),
            'benefits': 0,
        },
        'payments': [
            {
                'type': 'CASH',
                'value': round(total, 2),
                'prepaid': 0,
                'pending': round(total, 2),
                'changeFor': round(total + 10, 2),
            }
        ],
        'delivery': {
            'deliveryAddress': {
                'street': address['street'],
                'streetNumber': ''.join(filter(str.isdigit, address['street'].split(',')[1].strip())) if ',' in address['street'] else '1',
                'formattedAddress': f"{address['street']}, {address['neighborhood']}, {address['city']} - {address['state']}",
                'neighborhood': address['neighborhood'],
                'complement': '',
                'postalCode': f"92{random.randint(100, 999)}-{random.randint(100, 999)}",
                'city': address['city'],
                'state': address['state'],
                'country': 'BR',
                'coordinates': {
                    'latitude': lat,
                    'longitude': lng,
                },
                'reference': None,
            },
            'mode': 'DEFAULT',
            'deliveredBy': 'IFOOD',
            'deliveryDateTime': (datetime.now(timezone.utc) + timedelta(minutes=45)).isoformat(),
            'observations': '',
        },
        'pickUp': {
            'mode': 'TAKEOUT',
        },
        'salesChannel': 'IFOOD',
        'additionalInformation': {
            'e2eId': str(uuid.uuid4()),
            'salesChannel': 'IFOOD',
            'utm': {},
            'traceparent': str(uuid.uuid4()),
        },
    }
