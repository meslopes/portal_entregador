"""
Serviço de Push Notifications via Firebase Cloud Messaging (FCM)
Envia notificações para dispositivos registrados.
"""
import logging
import json
import os
import requests

logger = logging.getLogger(__name__)

FIREBASE_API_URL = 'https://fcm.googleapis.com/v1/projects/muv-log/messages:send'

# Tokens FCM registrados por usuário (em memória - em produção usar banco)
# Formato: {user_id: [token1, token2, ...]}
_fcm_tokens = {}


def register_token(user_id, token):
    """Registra um token FCM para um usuário."""
    if user_id not in _fcm_tokens:
        _fcm_tokens[user_id] = []
    if token not in _fcm_tokens[user_id]:
        _fcm_tokens[user_id].append(token)
        logger.info(f"[Push] Token FCM registrado para user {user_id}")


def get_user_tokens(user_id):
    """Retorna os tokens FCM de um usuário."""
    return _fcm_tokens.get(user_id, [])


def send_notification(user_id, title, body, data=None):
    """
    Envia uma notificação push para um usuário.
    Retorna True se enviou com sucesso.
    """
    tokens = get_user_tokens(user_id)
    if not tokens:
        logger.warning(f"[Push] Nenhum token FCM para user {user_id}")
        return False

    # Para enviar via FCM HTTP v1, precisamos de um access token OAuth2
    # Como alternativa, vamos usar o FCM legacy API com a server key
    server_key = os.getenv('FIREBASE_SERVER_KEY')
    if not server_key:
        logger.warning("[Push] FIREBASE_SERVER_KEY não configurada")
        return False

    success_count = 0
    for token in tokens:
        try:
            message = {
                'to': token,
                'notification': {
                    'title': title,
                    'body': body,
                    'icon': '/icon-192.png',
                    'click_action': data.get('url', '/') if data else '/'
                },
                'data': data or {},
                'priority': 'high',
                'content_available': True
            }

            response = requests.post(
                'https://fcm.googleapis.com/fcm/send',
                headers={
                    'Authorization': f'key={server_key}',
                    'Content-Type': 'application/json'
                },
                json=message,
                timeout=10
            )

            if response.status_code == 200:
                result = response.json()
                if result.get('success', 0) > 0:
                    success_count += 1
                else:
                    # Token inválido - remover
                    logger.warning(f"[Push] Token inválido para user {user_id}, removendo")
                    _fcm_tokens[user_id].remove(token)
            else:
                logger.error(f"[Push] Erro FCM: {response.status_code} - {response.text}")

        except Exception as e:
            logger.error(f"[Push] Erro ao enviar notificação: {e}")

    return success_count > 0


def send_new_order_notification(driver_user_id, order_number, restaurant_name):
    """Envia notificação de novo pedido disponível para entregador."""
    return send_notification(
        driver_user_id,
        title='Novo pedido disponível!',
        body=f'Pedido #{order_number} de {restaurant_name}',
        data={
            'type': 'NEW_ORDER',
            'order_number': order_number,
            'url': '/orders'
        }
    )


def send_order_status_notification(user_id, order_number, status_text):
    """Envia notificação de atualização de status do pedido."""
    return send_notification(
        user_id,
        title=f'Pedido #{order_number}',
        body=status_text,
        data={
            'type': 'ORDER_UPDATE',
            'order_number': order_number,
            'url': '/orders'
        }
    )


def send_admin_alert(admin_user_id, title, message):
    """Envia alerta para admin (pedido parado, entregador offline, etc)."""
    return send_notification(
        admin_user_id,
        title=title,
        body=message,
        data={
            'type': 'ADMIN_ALERT',
            'url': '/admin'
        }
    )
