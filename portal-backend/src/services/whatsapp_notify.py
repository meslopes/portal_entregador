"""
WhatsApp — Serviço de notificações de status do pedido (Fase 2 — 2026-11-25).
Envia mensagens automáticas quando o pedido muda de status.
Tudo configurável pelo estabelecimento (quais status notificar, para quem).
"""
import logging
from src.models.portal_models import (
    WhatsAppCredential, WhatsAppMessage, db,
)

logger = logging.getLogger(__name__)

# Mapeamento de status → template de mensagem (configurável pelo EST)
STATUS_MESSAGES = {
    'CONFIRMED': {
        'customer': '✅ *Pedido confirmado!*\n\nPedido #{order_number}\nRestaurante: {restaurant}\nTotal: R$ {total}\n\nAcompanhe seu pedido por aqui! 🍕',
        'establishment': '🛒 *Novo pedido confirmado!*\n\nPedido #{order_number}\nCliente: {customer}\nTotal: R$ {total}',
    },
    'PREPARING': {
        'customer': '🍳 *Seu pedido está sendo preparado!*\n\nPedido #{order_number} — {restaurant}\nTempo estimado: ~{prep_minutes} min',
    },
    'READY': {
        'customer': '📦 *Pedido pronto!*\n\nPedido #{order_number} — {restaurant}\nEm breve um entregador será designado 🏍️',
    },
    'PICKED_UP': {
        'customer': '🏍️ *Saiu para entrega!*\n\nPedido #{order_number}\nSeu pedido está a caminho!\n\nAcompanhe pelo link: {tracking_url}',
    },
    'DELIVERED': {
        'customer': '✅ *Pedido entregue!*\n\nPedido #{order_number} — {restaurant}\nObrigado pela preferência! 😊\n\nAvalie sua experiência: {rating_url}',
        'establishment': '✅ *Pedido entregue!*\n\nPedido #{order_number}\nCliente: {customer}',
    },
    'CANCELLED': {
        'customer': '❌ *Pedido cancelado*\n\nPedido #{order_number} — {restaurant}\n\nSe tiver dúvidas, entre em contato.',
    },
}


def notify_status_change(order, new_status):
    """
    Envia notificação WhatsApp quando o pedido muda de status.
    Respeita as configurações do EST (notify_customer, notify_establishment,
    quiet_hours). Nunca bloqueia o fluxo do pedido.
    """
    try:
        restaurant = order.restaurant
        if not restaurant:
            return

        cred = WhatsAppCredential.query.filter_by(
            restaurant_id=restaurant.id, is_active=True, enabled=True
        ).first()
        if not cred:
            return

        # Verificar horário silencioso
        if _is_quiet_hours(cred):
            return

        status_key = new_status.value if hasattr(new_status, 'value') else str(new_status)
        templates = STATUS_MESSAGES.get(status_key)
        if not templates:
            return

        # Preparar dados para o template
        context = _build_context(order, restaurant)

        # Notificar CLIENTE
        if cred.notify_customer and 'customer' in templates:
            phone = _get_customer_phone(order)
            if phone:
                message = templates['customer'].format(**context)
                _send_message(cred, phone, message, order)

        # Notificar ESTABELECIMENTO
        if cred.notify_establishment and 'establishment' in templates:
            phone = _get_establishment_phone(restaurant)
            if phone:
                message = templates['establishment'].format(**context)
                _send_message(cred, phone, message, order)

    except Exception as e:
        logger.error(f'[WHATSAPP NOTIFY] Erro: {e}')
        # Nunca bloqueia o fluxo do pedido


def _build_context(order, restaurant):
    """Monta o contexto para o template."""
    return {
        'order_number': order.order_number or order.id,
        'restaurant': restaurant.name or '',
        'customer': order.customer.name if order.customer else '',
        'total': f'{float(order.total_amount or 0):.2f}',
        'prep_minutes': restaurant.preparation_minutes or 10,
        'tracking_url': f'https://www.muv.log.br/track/{order.tracking_token}' if order.tracking_token else '',
        'rating_url': f'https://www.muv.log.br/track/{order.tracking_token}?rating=1' if order.tracking_token else '',
    }


def _get_customer_phone(order):
    """Telefone do cliente (Customer.phone ou User.phone)."""
    try:
        if order.customer and order.customer.phone:
            return order.customer.phone
        if order.customer and order.customer.user and order.customer.user.phone:
            return order.customer.user.phone
    except Exception:
        pass
    return None


def _get_establishment_phone(restaurant):
    """Telefone do estabelecimento."""
    return restaurant.phone or None


def _is_quiet_hours(cred):
    """Verifica se está no horário silencioso (não notificar)."""
    from datetime import datetime, timezone
    if not cred.quiet_hours_start or not cred.quiet_hours_end:
        return False
    now = datetime.now(timezone.utc)
    current_time = now.strftime('%H:%M')
    return cred.quiet_hours_start <= current_time <= cred.quiet_hours_end


def _send_message(cred, to_number, text, order=None):
    """Envia mensagem via WhatsApp Business API e registra no log."""
    try:
        import requests
        url = f'https://graph.facebook.com/v18.0/{cred.phone_number_id}/messages'
        headers = {
            'Authorization': f'Bearer {cred.access_token}',
            'Content-Type': 'application/json',
        }
        payload = {
            'messaging_product': 'whatsapp',
            'to': to_number,
            'type': 'text',
            'text': {'body': text},
        }
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        result = resp.json()

        # Log de auditoria
        log = WhatsAppMessage(
            restaurant_id=cred.restaurant_id,
            direction='outbound',
            from_number='',
            to_number=to_number,
            message_type='text',
            content=text,
            status='sent' if resp.status_code == 200 else 'failed',
            error=str(result.get('error', '')) if resp.status_code != 200 else None,
        )
        db.session.add(log)
        db.session.commit()

        if resp.status_code == 200:
            logger.info(f'[WHATSAPP NOTIFY] Mensagem enviada para {to_number}')
        else:
            logger.warning(f'[WHATSAPP NOTIFY] Falha: {result}')

    except Exception as e:
        logger.error(f'[WHATSAPP NOTIFY] Erro ao enviar: {e}')
        db.session.rollback()
