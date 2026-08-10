"""
Serviço de integração com a API do Asaas.
Gerencia cobranças, clientes e transferências PIX.
"""
import os
import requests
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Configurações do Asaas
ASAAS_API_KEY = os.getenv('ASAAS_API_KEY', '')
ASAAS_ENVIRONMENT = os.getenv('ASAAS_ENVIRONMENT', 'sandbox')  # sandbox ou production

def get_base_url():
    """Retorna a URL base do Asaas conforme o ambiente"""
    if ASAAS_ENVIRONMENT == 'production':
        return 'https://api.asaas.com/v3'
    return 'https://api-sandbox.asaas.com/v3'

def get_headers():
    """Headers para requisições ao Asaas"""
    return {
        'access_token': ASAAS_API_KEY,
        'Content-Type': 'application/json'
    }

def is_configured():
    """Verifica se o Asaas está configurado"""
    return bool(ASAAS_API_KEY)


# ============================================
# CLIENTES (CUSTOMERS)
# ============================================

def create_customer(name, cpf_cnpj, email=None, phone=None, address=None):
    """
    Cria um cliente no Asaas.
    
    Args:
        name: Nome do cliente
        cpf_cnpj: CPF ou CNPJ
        email: Email (opcional)
        phone: Telefone (opcional)
        address: Dict com endereço (opcional)
    
    Returns:
        dict com o id do cliente no Asaas ou erro
    """
    if not is_configured():
        return {'success': False, 'error': 'Asaas não configurado'}

    payload = {
        'name': name,
        'cpfCnpj': cpf_cnpj,
    }
    if email:
        payload['email'] = email
    if phone:
        payload['phone'] = phone
    if address:
        payload.update({
            'address': address.get('street', ''),
            'addressNumber': address.get('number', ''),
            'complement': address.get('complement', ''),
            'province': address.get('neighborhood', ''),
            'city': address.get('city', ''),
            'state': address.get('state', ''),
            'postalCode': address.get('zip_code', ''),
        })

    try:
        response = requests.post(
            f"{get_base_url()}/customers",
            json=payload,
            headers=get_headers(),
            timeout=30
        )
        data = response.json()
        if response.status_code == 200:
            logger.info(f"Cliente Asaas criado: {data.get('id')}")
            return {'success': True, 'customer_id': data.get('id'), 'data': data}
        else:
            logger.error(f"Erro ao criar cliente Asaas: {data}")
            return {'success': False, 'error': data.get('errors', [{}])[0].get('description', 'Erro desconhecido')}
    except Exception as e:
        logger.error(f"Exceção ao criar cliente Asaas: {e}")
        return {'success': False, 'error': str(e)}


def get_customer(customer_id):
    """Busca um cliente no Asaas pelo ID"""
    if not is_configured():
        return {'success': False, 'error': 'Asaas não configurado'}

    try:
        response = requests.get(
            f"{get_base_url()}/customers/{customer_id}",
            headers=get_headers(),
            timeout=30
        )
        if response.status_code == 200:
            return {'success': True, 'data': response.json()}
        return {'success': False, 'error': 'Cliente não encontrado'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


# ============================================
# COBRANÇAS (PAYMENTS)
# ============================================

def create_charge(customer_id, value, billing_type='PIX', due_date=None, description=None, external_reference=None):
    """
    Cria uma cobrança no Asaas.
    
    Args:
        customer_id: ID do cliente no Asaas
        value: Valor da cobrança
        billing_type: PIX, BOLETO, CREDIT_CARD ou UNDEFINED
        due_date: Data de vencimento (default: amanhã)
        description: Descrição da cobrança
        external_reference: Referência externa (order_id, invoice_id, etc.)
    
    Returns:
        dict com dados da cobrança ou erro
    """
    if not is_configured():
        return {'success': False, 'error': 'Asaas não configurado'}

    if due_date is None:
        due_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')

    payload = {
        'customer': customer_id,
        'billingType': billing_type,
        'value': float(value),
        'dueDate': due_date,
    }
    if description:
        payload['description'] = description[:500]
    if external_reference:
        payload['externalReference'] = str(external_reference)

    try:
        response = requests.post(
            f"{get_base_url()}/payments",
            json=payload,
            headers=get_headers(),
            timeout=30
        )
        data = response.json()
        if response.status_code == 200:
            logger.info(f"Cobrança Asaas criada: {data.get('id')} - R$ {value}")
            return {
                'success': True,
                'payment_id': data.get('id'),
                'invoice_url': data.get('invoiceUrl'),
                'pix_qr_code': data.get('pixQrCodeId'),
                'bank_slip_url': data.get('bankSlipUrl'),
                'status': data.get('status'),
                'data': data
            }
        else:
            logger.error(f"Erro ao criar cobrança Asaas: {data}")
            return {'success': False, 'error': data.get('errors', [{}])[0].get('description', 'Erro desconhecido')}
    except Exception as e:
        logger.error(f"Exceção ao criar cobrança Asaas: {e}")
        return {'success': False, 'error': str(e)}


def get_payment(payment_id):
    """Busca uma cobrança no Asaas pelo ID"""
    if not is_configured():
        return {'success': False, 'error': 'Asaas não configurado'}

    try:
        response = requests.get(
            f"{get_base_url()}/payments/{payment_id}",
            headers=get_headers(),
            timeout=30
        )
        if response.status_code == 200:
            return {'success': True, 'data': response.json()}
        return {'success': False, 'error': 'Cobrança não encontrada'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def get_payment_pix_qr_code(payment_id):
    """Obtém o QR Code PIX de uma cobrança"""
    if not is_configured():
        return {'success': False, 'error': 'Asaas não configurado'}

    try:
        response = requests.get(
            f"{get_base_url()}/payments/{payment_id}/pixQrCode",
            headers=get_headers(),
            timeout=30
        )
        if response.status_code == 200:
            return {'success': True, 'data': response.json()}
        return {'success': False, 'error': 'QR Code não encontrado'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


# ============================================
# TRANSFERÊNCIAS PIX (SAQUES)
# ============================================

def transfer_pix(value, pix_key, pix_key_type='CPF', description=None):
    """
    Realiza uma transferência PIX via Asaas.
    
    Args:
        value: Valor da transferência
        pix_key: Chave PIX (CPF, CNPJ, email, telefone ou aleatória)
        pix_key_type: Tipo da chave (CPF, CNPJ, EMAIL, PHONE, EVP)
        description: Descrição da transferência
    
    Returns:
        dict com resultado da transferência
    """
    if not is_configured():
        return {'success': False, 'error': 'Asaas não configurado'}

    payload = {
        'value': float(value),
        'pixAddressKey': pix_key,
        'pixAddressKeyType': pix_key_type,
        'description': description or 'Saque via muv.log',
    }

    try:
        response = requests.post(
            f"{get_base_url()}/transfers",
            json=payload,
            headers=get_headers(),
            timeout=30
        )
        data = response.json()
        if response.status_code == 200:
            logger.info(f"Transferência PIX Asaas: R$ {value} para {pix_key}")
            return {
                'success': True,
                'transfer_id': data.get('id'),
                'status': data.get('status'),
                'data': data
            }
        else:
            logger.error(f"Erro na transferência PIX Asaas: {data}")
            return {'success': False, 'error': data.get('errors', [{}])[0].get('description', 'Erro desconhecido')}
    except Exception as e:
        logger.error(f"Exceção na transferência PIX Asaas: {e}")
        return {'success': False, 'error': str(e)}


def get_transfer(transfer_id):
    """Busca uma transferência pelo ID"""
    if not is_configured():
        return {'success': False, 'error': 'Asaas não configurado'}

    try:
        response = requests.get(
            f"{get_base_url()}/transfers/{transfer_id}",
            headers=get_headers(),
            timeout=30
        )
        if response.status_code == 200:
            return {'success': True, 'data': response.json()}
        return {'success': False, 'error': 'Transferência não encontrada'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


# ============================================
# WEBHOOK
# ============================================

def verify_webhook_token(token):
    """Verifica o token do webhook do Asaas (checa env var e SystemConfig)"""
    expected = os.getenv('ASAAS_WEBHOOK_TOKEN', '')
    if not expected:
        try:
            from src.models.portal_models import SystemConfig
            config = SystemConfig.query.filter_by(config_key='asaas_webhook_token').first()
            expected = config.config_value if config else ''
        except Exception:
            pass
    return expected == token if expected else True


# ============================================
# UTILITÁRIOS
# ============================================

def detect_pix_key_type(pix_key):
    """Detecta o tipo de chave PIX automaticamente"""
    import re
    pix_key = pix_key.strip()
    
    # CPF (11 dígitos)
    if re.match(r'^\d{11}$', pix_key.replace('.', '').replace('-', '')):
        return 'CPF'
    # CNPJ (14 dígitos)
    if re.match(r'^\d{14}$', pix_key.replace('.', '').replace('/', '').replace('-', '')):
        return 'CNPJ'
    # Email
    if '@' in pix_key:
        return 'EMAIL'
    # Telefone (11 dígitos com DDD)
    if re.match(r'^\+?\d{10,13}$', pix_key):
        return 'PHONE'
    # Chave aleatória (EVP - UUID)
    if re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', pix_key, re.I):
        return 'EVP'
    
    return 'CPF'  # fallback
