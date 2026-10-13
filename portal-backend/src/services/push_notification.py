"""
Serviço de Push Notifications via Firebase Cloud Messaging (FCM)
Envia notificações para dispositivos registrados.
Tokens persistidos no banco de dados.

Usa FCM HTTP v1 (API atual) com service account.
Fallback legado (FIREBASE_SERVER_KEY) apenas se v1 não estiver configurado.
"""
import json
import logging
import os
import time

import requests

logger = logging.getLogger(__name__)

# Cache do access token OAuth2 (evita renovar a cada notificação)
_token_cache = {'token': None, 'expires_at': 0}


def _get_service_account():
    """Carrega service account do env FIREBASE_SERVICE_ACCOUNT_JSON (path ou JSON inline)."""
    raw = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON', '')
    if not raw:
        return None
    try:
        if raw.strip().startswith('{'):
            return json.loads(raw)
        with open(raw, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"[Push] Erro ao carregar service account: {e}")
        return None


def _get_oauth2_token(sa):
    """Gera OAuth2 access token via JWT assertion (RFC 7523) com PyJWT."""
    now = int(time.time())
    if _token_cache['token'] and now < _token_cache['expires_at'] - 60:
        return _token_cache['token']

    import jwt as pyjwt

    iat = now
    exp = now + 3600
    payload = {
        'iss': sa['client_email'],
        'scope': 'https://www.googleapis.com/auth/firebase.messaging',
        'aud': 'https://oauth2.googleapis.com/token',
        'iat': iat,
        'exp': exp,
    }
    assertion = pyjwt.encode(payload, sa['private_key'], algorithm='RS256')

    resp = requests.post(
        'https://oauth2.googleapis.com/token',
        data={
            'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion': assertion,
        },
        timeout=10,
    )
    if resp.status_code != 200:
        logger.error(f"[Push] OAuth2 falhou: {resp.status_code} {resp.text}")
        return None
    data = resp.json()
    _token_cache['token'] = data['access_token']
    _token_cache['expires_at'] = now + int(data.get('expires_in', 3600))
    return _token_cache['token']


def _send_fcm_v1(token, title, body, data, sound, project_id, access_token):
    """Envia uma mensagem via FCM HTTP v1."""
    message = {
        'message': {
            'token': token,
            'notification': {
                'title': title,
                'body': body,
            },
            'data': {k: str(v) for k, v in (data or {}).items()},
            'webpush': {
                'notification': {
                    'icon': '/icon-192.png',
                    'click_action': (data or {}).get('url', '/'),
                    'sound': sound,
                },
            },
            'android': {
                'priority': 'high',
            },
        }
    }
    resp = requests.post(
        f'https://fcm.googleapis.com/v1/projects/{project_id}/messages:send',
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        },
        json=message,
        timeout=10,
    )
    return resp


def _send_fcm_legacy(token, title, body, data, sound, server_key):
    """Fallback legado (API descontinuada pelo Google). Só se v1 não configurado."""
    message = {
        'to': token,
        'notification': {
            'title': title,
            'body': body,
            'icon': '/icon-192.png',
            'click_action': data.get('url', '/') if data else '/',
            'sound': sound,
        },
        'data': data or {},
        'priority': 'high',
        'content_available': True,
    }
    return requests.post(
        'https://fcm.googleapis.com/fcm/send',
        headers={
            'Authorization': f'key={server_key}',
            'Content-Type': 'application/json',
        },
        json=message,
        timeout=10,
    )


def register_token(user_id, token, platform='web'):
    """Registra um token FCM para um usuário no banco de dados."""
    from src.models.portal_models import PushToken, db

    existing = PushToken.query.filter_by(token=token).first()
    if existing:
        existing.user_id = user_id
        existing.is_active = True
        existing.platform = platform
    else:
        pt = PushToken(user_id=user_id, token=token, platform=platform)
        db.session.add(pt)

    try:
        db.session.commit()
        logger.info(f"[Push] Token FCM registrado para user {user_id}")
    except Exception as e:
        db.session.rollback()
        logger.error(f"[Push] Erro ao registrar token: {e}")


def get_user_tokens(user_id):
    """Retorna os tokens FCM ativos de um usuário."""
    from src.models.portal_models import PushToken
    tokens = PushToken.query.filter_by(user_id=user_id, is_active=True).all()
    return [t.token for t in tokens]


def send_notification(user_id, title, body, data=None, sound='default'):
    """
    Envia uma notificação push para um usuário.
    Usa FCM HTTP v1 quando FIREBASE_SERVICE_ACCOUNT_JSON está configurado.
    Retorna True se enviou com sucesso.
    """
    tokens = get_user_tokens(user_id)
    if not tokens:
        logger.warning(f"[Push] Nenhum token FCM para user {user_id}")
        return False

    sa = _get_service_account()
    server_key = os.getenv('FIREBASE_SERVER_KEY')
    use_v1 = bool(sa)

    if not use_v1 and not server_key:
        logger.warning("[Push] Nem FIREBASE_SERVICE_ACCOUNT_JSON nem FIREBASE_SERVER_KEY configurados")
        return False

    if not use_v1:
        logger.warning("[Push] Usando FCM legado (descontinuado). Configure FIREBASE_SERVICE_ACCOUNT_JSON para HTTP v1.")

    project_id = (sa or {}).get('project_id') or os.getenv('FIREBASE_PROJECT_ID', 'muv-log')
    access_token = _get_oauth2_token(sa) if use_v1 else None
    if use_v1 and not access_token:
        return False

    success_count = 0
    from src.models.portal_models import PushToken, db

    for token in tokens:
        try:
            if use_v1:
                response = _send_fcm_v1(token, title, body, data, sound, project_id, access_token)
            else:
                response = _send_fcm_legacy(token, title, body, data, sound, server_key)

            if response.status_code in (200, 201):
                result = response.json() if response.content else {}
                # v1 retorna name; legado retorna success
                ok = bool(result.get('name')) or result.get('success', 0) > 0
                if ok:
                    success_count += 1
                else:
                    logger.warning(f"[Push] Resposta FCM sem sucesso: {result}")
            elif response.status_code in (404, 410):
                # Token inválido/expirado — desativar no banco
                logger.warning(f"[Push] Token inválido para user {user_id}, desativando")
                pt = PushToken.query.filter_by(token=token).first()
                if pt:
                    pt.is_active = False
                    db.session.commit()
            else:
                logger.error(f"[Push] Erro FCM: {response.status_code} - {response.text}")

        except Exception as e:
            logger.error(f"[Push] Erro ao enviar notificação: {e}")

    return success_count > 0


def send_approval_notification(user_id, first_name):
    """Envia notificação de aprovação de cadastro."""
    return send_notification(
        user_id,
        title='Conta Aprovada!',
        body=f'Olá {first_name}, sua conta foi aprovada! Faça login para acessar o sistema.',
        data={
            'type': 'ACCOUNT_APPROVED',
            'url': '/login'
        },
        sound='default'
    )


def send_rejection_notification(user_id, first_name):
    """Envia notificação de rejeição de cadastro."""
    return send_notification(
        user_id,
        title='Cadastro Não Aprovado',
        body=f'Olá {first_name}, seu cadastro não foi aprovado. Entre em contato com o suporte.',
        data={
            'type': 'ACCOUNT_REJECTED',
            'url': '/login'
        },
        sound='default'
    )


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
