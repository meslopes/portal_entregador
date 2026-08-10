"""
Serviço de WhatsApp via Meta Cloud API
Envia notificações para entregadores quando pedidos ficam disponíveis
"""
import os
import requests
import logging
from decimal import Decimal

logger = logging.getLogger(__name__)

# Configurações do WhatsApp (via variáveis de ambiente)
WHATSAPP_TOKEN = os.getenv('WHATSAPP_TOKEN', '')
WHATSAPP_PHONE_NUMBER_ID = os.getenv('WHATSAPP_PHONE_NUMBER_ID', '')
WHATSAPP_BUSINESS_ACCOUNT_ID = os.getenv('WHATSAPP_BUSINESS_ACCOUNT_ID', '')

# Número do admin para notificações
ADMIN_WHATSAPP = os.getenv('ADMIN_WHATSAPP', '5551981213934')

def get_headers():
    """Headers para requisições à API do WhatsApp"""
    return {
        'Authorization': f'Bearer {WHATSAPP_TOKEN}',
        'Content-Type': 'application/json'
    }

def send_whatsapp_message(phone: str, message: str) -> dict:
    """
    Envia mensagem via WhatsApp Cloud API
    
    Args:
        phone: Número do telefone (formato: 5551999999999)
        message: Texto da mensagem
    
    Returns:
        dict com resultado do envio
    """
    if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
        logger.warning("WhatsApp não configurado - TOKEN ou PHONE_NUMBER_ID ausente")
        return {'success': False, 'error': 'WhatsApp não configurado'}
    
    # Formatar número (remover caracteres especiais)
    phone = ''.join(filter(str.isdigit, phone))
    
    # Adicionar código do país se não tiver
    if not phone.startswith('55'):
        phone = '55' + phone
    
    url = f"https://graph.facebook.com/v18.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {
            "body": message
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers=get_headers(), timeout=30)
        data = response.json()
        
        if response.status_code == 200 and data.get('messages'):
            logger.info(f"WhatsApp enviado para {phone}: {data['messages'][0]['id']}")
            return {'success': True, 'message_id': data['messages'][0]['id']}
        else:
            logger.error(f"Erro WhatsApp: {data}")
            return {'success': False, 'error': data.get('error', {}).get('message', 'Erro desconhecido')}
            
    except Exception as e:
        logger.error(f"Exceção ao enviar WhatsApp: {e}")
        return {'success': False, 'error': str(e)}


def notify_new_order(driver_phone: str, order_data: dict) -> dict:
    """
    Notifica entregador sobre novo pedido disponível
    
    Args:
        driver_phone: Telefone do entregador
        order_data: Dados do pedido (restaurant_name, distance_km, delivery_fee, order_number, address)
    """
    restaurant_name = order_data.get('restaurant_name', 'Estabelecimento')
    distance_km = order_data.get('distance_km', 0)
    delivery_fee = order_data.get('delivery_fee', 0)
    order_number = order_data.get('order_number', 'N/A')
    address = order_data.get('address', 'Endereço não informado')
    timeout_seconds = order_data.get('timeout_seconds', 60)
    
    message = f"""🛵 *Novo Pedido Disponível!*

📍 *Estabelecimento:* {restaurant_name}
📏 *Distância:* {distance_km} km (estabelecimento → cliente)
💰 *Valor da rota:* R$ {delivery_fee:.2f}

📋 *Pedido:* #{order_number}
📍 *Endereço:* {address}

⏰ *Tempo para aceitar:* {timeout_seconds} segundos

Responda *SIM* para aceitar ou *NÃO* para rejeitar"""
    
    return send_whatsapp_message(driver_phone, message)


def notify_order_accepted(driver_phone: str, order_number: str) -> dict:
    """Notifica entregador que aceitou o pedido"""
    message = f"""✅ *Pedido Aceito!*

📋 *Pedido:* #{order_number}

Dirija-se ao estabelecimento para retirada.
Bom trabalho! 🚀"""
    
    return send_whatsapp_message(driver_phone, message)


def notify_order_ready(driver_phone: str, order_number: str, restaurant_name: str) -> dict:
    """Notifica entregador que pedido está pronto"""
    message = f"""📦 *Pedido Pronto!*

📋 *Pedido:* #{order_number}
📍 *Estabelecimento:* {restaurant_name}

O pedido está pronto para retirada!"""
    
    return send_whatsapp_message(driver_phone, message)


def notify_delivery_completed(driver_phone: str, order_number: str, earnings: float) -> dict:
    """Notifica entregador que entrega foi concluída"""
    message = f"""🎉 *Entrega Concluída!*

📋 *Pedido:* #{order_number}
💰 *Ganho:* R$ {earnings:.2f}

Parabéns! Continue assim! 🏆"""
    
    return send_whatsapp_message(driver_phone, message)


def notify_admin_alert(message: str) -> dict:
    """Envia alerta para o admin"""
    return send_whatsapp_message(ADMIN_WHATSAPP, f"⚠️ *Alerta Admin*\n\n{message}")
