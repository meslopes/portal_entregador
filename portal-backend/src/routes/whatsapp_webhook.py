"""
WhatsApp Business API — Webhook handler (Fase 1 — 2026-11-25).
Recebe mensagens da Meta e roteia para o estabelecimento correto (multi-tenant).
"""
import json
import logging
from flask import Blueprint, jsonify, request

from src.models.portal_models import (
    WhatsAppCredential, WhatsAppMessage, Restaurant, db,
)

logger = logging.getLogger(__name__)
whatsapp_webhook_bp = Blueprint('whatsapp_webhook', __name__)


def _find_restaurant_by_phone_number_id(phone_number_id):
    """Encontra o EST pelo phone_number_id recebido no webhook (multi-tenant)."""
    cred = WhatsAppCredential.query.filter_by(
        phone_number_id=phone_number_id, is_active=True
    ).first()
    return cred.restaurant if cred else None


@whatsapp_webhook_bp.route('/whatsapp/webhook', methods=['GET'])
def verify_webhook():
    """Verificação do webhook pela Meta (GET challenge)."""
    mode = request.args.get('hub.mode')
    token = request.args.get('hub.verify_token')
    challenge = request.args.get('hub.challenge')

    if mode == 'subscribe' and token:
        # Verificar token contra todas as credenciais ativas
        creds = WhatsAppCredential.query.filter_by(
            verify_token=token, is_active=True
        ).all()
        if creds:
            logger.info(f'[WHATSAPP] Webhook verificado para {len(creds)} EST(s)')
            return challenge, 200
        logger.warning('[WHATSAPP] Token de verificação inválido')
        return 'Token inválido', 403

    return 'Bad request', 400


@whatsapp_webhook_bp.route('/whatsapp/webhook', methods=['POST'])
def receive_webhook():
    """Recebe mensagens da Meta e roteia para o EST correto."""
    try:
        data = request.get_json()
        if not data or data.get('object') != 'whatsapp_business_account':
            return jsonify({'status': 'ignored'}), 200

        # Cada entrada pode conter múltiplos "changes"
        for entry in data.get('entry', []):
            for change in entry.get('changes', []):
                value = change.get('value', {})
                phone_number_id = value.get('metadata', {}).get('phone_number_id')

                restaurant = _find_restaurant_by_phone_number_id(phone_number_id)
                if not restaurant:
                    logger.warning(f'[WHATSAPP] Nenhum EST para phone_number_id={phone_number_id}')
                    continue

                cred = WhatsAppCredential.query.filter_by(
                    restaurant_id=restaurant.id).first()

                # Processar mensagens recebidas (inbound)
                for msg in value.get('messages', []):
                    _process_inbound_message(restaurant, cred, msg)

                # Processar status de mensagens enviadas (delivery/read)
                for status in value.get('statuses', []):
                    _process_message_status(restaurant, status)

        return jsonify({'status': 'ok'}), 200

    except Exception as e:
        logger.error(f'[WHATSAPP] Erro no webhook: {e}')
        return jsonify({'status': 'error'}), 500


def _process_inbound_message(restaurant, cred, msg):
    """Processa mensagem recebida do cliente."""
    try:
        from_number = msg.get('from', '')
        msg_type = msg.get('type', 'unknown')
        msg_id = msg.get('id', '')

        # Extrair conteúdo conforme o tipo
        content = ''
        if msg_type == 'text':
            content = msg.get('text', {}).get('body', '')
        elif msg_type == 'interactive':
            interactive = msg.get('interactive', {})
            if 'button_reply' in interactive:
                content = interactive['button_reply'].get('title', '')
            elif 'list_reply' in interactive:
                content = interactive['list_reply'].get('title', '')
        elif msg_type == 'location':
            loc = msg.get('location', {})
            content = f"Localização: {loc.get('latitude')},{loc.get('longitude')}"
        elif msg_type == 'image':
            content = '[Imagem]'
        elif msg_type == 'audio':
            content = '[Áudio]'
        elif msg_type == 'button':
            content = msg.get('button', {}).get('text', '')

        # Salvar no log (auditoria)
        log = WhatsAppMessage(
            restaurant_id=restaurant.id,
            direction='inbound',
            from_number=from_number,
            to_number=msg.get('to', ''),
            message_type=msg_type,
            content=content,
            status='received',
        )
        db.session.add(log)
        db.session.commit()

        logger.info(f'[WHATSAPP] [{restaurant.name}] Mensagem de {from_number}: {content[:50]}')

        # Verificar se está fora do horário
        if cred and not _is_business_hours(cred):
            if cred.off_hours_message:
                _send_text(cred, from_number, cred.off_hours_message)
            return

        # Verificar se deve aceitar pedidos
        if cred and not cred.accept_orders:
            return

        # TODO Fase 3: processar pedido (catálogo)
        # TODO Fase 6: bot de atendimento (regras)
        # TODO Fase 7: IA (LLM)

        # Por enquanto: resposta de boas-vindas
        if cred and cred.welcome_message:
            _send_text(cred, from_number, cred.welcome_message)

    except Exception as e:
        logger.error(f'[WHATSAPP] Erro ao processar mensagem: {e}')
        db.session.rollback()


def _process_message_status(restaurant, status):
    """Processa status de mensagem enviada (delivered, read, failed)."""
    try:
        status_type = status.get('status', '')
        msg_id = status.get('id', '')
        logger.info(f'[WHATSAPP] [{restaurant.name}] Status: {status_type} para msg {msg_id}')
    except Exception as e:
        logger.error(f'[WHATSAPP] Erro ao processar status: {e}')


def _is_business_hours(cred):
    """Verifica se está dentro do horário de atendimento configurado."""
    from datetime import datetime, timezone
    if not cred.business_hours_start or not cred.business_hours_end:
        return True  # Sem horário configurado = sempre aberto

    now = datetime.now(timezone.utc)
    current_time = now.strftime('%H:%M')
    return cred.business_hours_start <= current_time <= cred.business_hours_end


def _send_text(cred, to_number, text):
    """Envia mensagem de texto via WhatsApp Business API."""
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

        # Log de saída
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

        return resp.status_code == 200
    except Exception as e:
        logger.error(f'[WHATSAPP] Erro ao enviar mensagem: {e}')
        db.session.rollback()
        return False
