"""
Servico de integracao com WhatsApp Business API.
Envia notificacoes de pedidos, atualizacoes de status e mensagens.
"""
import requests
import json
from datetime import datetime


class WhatsAppService:
    """Servico para enviar mensagens via WhatsApp Business API"""

    def __init__(self, api_token=None, phone_number_id=None):
        self.api_token = api_token
        self.phone_number_id = phone_number_id
        self.base_url = "https://graph.facebook.com/v18.0"

    def _get_config(self):
        """Busca configuracao do WhatsApp do SystemConfig"""
        from src.models.portal_models import SystemConfig
        
        if not self.api_token:
            config = SystemConfig.query.filter_by(config_key='whatsapp_api_token').first()
            self.api_token = config.config_value if config else None
        
        if not self.phone_number_id:
            config = SystemConfig.query.filter_by(config_key='whatsapp_phone').first()
            self.phone_number_id = config.config_value if config else None

    def is_configured(self):
        """Verifica se o WhatsApp esta configurado"""
        self._get_config()
        return bool(self.api_token and self.phone_number_id)

    def send_message(self, to, message):
        """Envia uma mensagem de texto via WhatsApp"""
        if not self.is_configured():
            return {'success': False, 'error': 'WhatsApp não configurado'}

        try:
            url = f"{self.base_url}/{self.phone_number_id}/messages"
            headers = {
                'Authorization': f'Bearer {self.api_token}',
                'Content-Type': 'application/json'
            }
            payload = {
                'messaging_product': 'whatsapp',
                'to': to,
                'type': 'text',
                'text': {'body': message}
            }

            response = requests.post(url, headers=headers, json=payload, timeout=10)
            result = response.json()

            if response.status_code == 200:
                return {'success': True, 'message_id': result.get('messages', [{}])[0].get('id')}
            else:
                return {'success': False, 'error': result.get('error', {}).get('message', 'Erro desconhecido')}

        except Exception as e:
            return {'success': False, 'error': str(e)}

    def send_order_notification(self, phone, order_number, status, details=None):
        """Envia notificacao de pedido via WhatsApp"""
        messages = {
            'PENDING': f"📦 *Novo Pedido*\n\nPedido #{order_number} recebido.\nAguardando aceite de um entregador.",
            'ACCEPTED': f"✅ *Pedido Aceito*\n\nPedido #{order_number} foi aceito por um entregador.\nEm preparação.",
            'PREPARING': f"👨‍🍳 *Preparando*\n\nPedido #{order_number} está sendo preparado.",
            'READY': f" ready *Pronto para Retirada*\n\nPedido #{order_number} está pronto!\nO entregador irá retirar em breve.",
            'PICKED_UP': f"🚚 *A Caminho*\n\nPedido #{order_number} foi coletado e está a caminho da entrega.",
            'DELIVERED': f"✅ *Entregue*\n\nPedido #{order_number} foi entregue com sucesso!\nObrigado pela preferência.",
            'CANCELLED': f"❌ *Pedido Cancelado*\n\nPedido #{order_number} foi cancelado."
        }

        message = messages.get(status, f"Atualização do pedido #{order_number}: {status}")
        
        if details:
            message += f"\n\n{details}"

        return self.send_message(phone, message)

    def send_new_order_to_driver(self, phone, order_data):
        """Notifica entregador sobre novo pedido disponivel"""
        message = (
            f"🔔 *Novo Pedido Disponível!*\n\n"
            f"Pedido: #{order_data.get('order_number', 'N/A')}\n"
            f"Restaurante: {order_data.get('restaurant', 'N/A')}\n"
            f"Valor: R$ {order_data.get('total_amount', 0):.2f}\n"
            f"Frete: R$ {order_data.get('delivery_fee', 0):.2f}\n\n"
            f"Acesse o app para aceitar este pedido."
        )
        return self.send_message(phone, message)

    def send_delivery_proof(self, phone, order_number, proof_url=None):
        """Envia comprovante de entrega"""
        message = (
            f"📸 *Comprovante de Entrega*\n\n"
            f"Pedido #{order_number} foi entregue com sucesso!"
        )
        if proof_url:
            message += f"\n\nFoto da entrega: {proof_url}"
        
        return self.send_message(phone, message)


# Instancia singleton
whatsapp_service = WhatsAppService()
