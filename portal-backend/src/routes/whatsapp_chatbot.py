"""
WhatsApp — Bot de atendimento por regras (Fase 6 — 2026-11-25).
Menu interativo, FAQ, transferência para humano. Sem IA — botões e fluxos.
Tudo configurável pelo EST.
"""
import logging
from src.models.portal_models import (
    WhatsAppCredential, WhatsAppProduct,
    WhatsAppOrderSession, db,
)

logger = logging.getLogger(__name__)

# ── Menu principal (configurável) ────────────────────────────────

DEFAULT_MENU = [
    {'id': 'cardapio', 'title': '🍕 Cardápio'},
    {'id': 'pedido', 'title': '🛒 Fazer Pedido'},
    {'id': 'meu_pedido', 'title': '📋 Meu Pedido'},
    {'id': 'repetir', 'title': '🔁 Repetir Pedido'},
    {'id': 'avaliar', 'title': '⭐ Avaliar Entrega'},
    {'id': 'ajuda', 'title': '❓ Ajuda'},
    {'id': 'humano', 'title': '👤 Falar com Atendente'},
]


def get_welcome_message(cred, restaurant):
    """Mensagem de boas-vindas (configurável pelo EST)."""
    if cred and cred.welcome_message:
        return cred.welcome_message
    name = restaurant.name if restaurant else 'Estabelecimento'
    return (
        f'*Bem-vindo ao {name}* 👋\n\n'
        f'Como posso ajudar hoje?\n\n'
        f'🍽️ *Cardápio* — ver nossos produtos\n'
        f'🛒 *Pedido* — fazer um pedido\n'
        f'📋 *Meu Pedido* — ver carrinho\n'
        f'🔁 *Repetir* — repetir último pedido\n'
        f'⭐ *Avaliar* — avaliar última entrega\n'
        f'👤 *Atendente* — falar com uma pessoa\n\n'
        f'Ou simplesmente me diga o que deseja!'
    )


def get_menu_buttons():
    """Botões do menu principal (WhatsApp interactive)."""
    return [
        {'type': 'reply', 'reply': {'id': 'cardapio', 'title': '🍕 Cardápio'}},
        {'type': 'reply', 'reply': {'id': 'pedido', 'title': '🛒 Fazer Pedido'}},
        {'type': 'reply', 'reply': {'id': 'humano', 'title': '👤 Atendente'}},
    ]


def get_faq_answer(text, cred, restaurant):
    """Respostas do FAQ (configurável pelo EST)."""
    text_lower = (text or '').lower().strip()

    # FAQ padrão (configurável via welcome_message + regras)
    faq = {
        'horário': f'🕐 Nosso horário é {cred.business_hours_start or "08:00"} às {cred.business_hours_end or "22:00"}' if cred else '🕐 Consulte nosso horário',
        'horario': f'🕐 Nosso horário é {cred.business_hours_start or "08:00"} às {cred.business_hours_end or "22:00"}' if cred else '🕐 Consulte nosso horário',
        'funcionamento': f'🕐 Funcionamos das {cred.business_hours_start or "08:00"} às {cred.business_hours_end or "22:00"}' if cred else '🕐 Consulte nosso horário',
        'endereço': f'📍 {restaurant.address}' if restaurant and restaurant.address else '📍 Consulte nosso endereço',
        'endereco': f'📍 {restaurant.address}' if restaurant and restaurant.address else '📍 Consulte nosso endereço',
        'localização': f'📍 {restaurant.address}' if restaurant and restaurant.address else '📍 Consulte nosso endereço',
        'localizacao': f'📍 {restaurant.address}' if restaurant and restaurant.address else '📍 Consulte nosso endereço',
        'telefone': f'📞 {restaurant.phone}' if restaurant and restaurant.phone else '📞 Consulte nosso telefone',
        'taxa': '💰 A taxa de entrega varia conforme a distância. Calcule no pedido!',
        'entrega': '🏍️ Fazemos entregas! Faça seu pedido pelo WhatsApp.',
        'pagamento': '💳 Aceitamos PIX, Dinheiro e Cartão na entrega.',
        'pix': '💳 Aceitamos PIX! O QR Code é enviado após a confirmação do pedido.',
        'cancelar': '❌ Para cancelar um pedido, digite *cancelar* ou fale com um atendente.',
        'ajuda': '❓ *Posso ajudar com:*\n\n• Cardápio e produtos\n• Fazer pedido\n• Status do pedido\n• Formas de pagamento\n• Horário de funcionamento\n• Endereço\n\nOu digite *atendente* para falar com uma pessoa.',
    }

    for keyword, answer in faq.items():
        if keyword in text_lower:
            return answer

    return None


def should_transfer_to_human(text, cred):
    """Decide se deve transferir para humano (regras simples)."""
    if not cred:
        return False

    text_lower = (text or '').lower().strip()

    # Pedidos explícitos para humano
    human_keywords = [
        'atendente', 'humano', 'pessoa', 'falar com alguém', 'falar com alguem',
        'suporte', 'reclamação', 'reclamacao', 'problema', 'erro', 'cancelar pedido',
    ]
    for kw in human_keywords:
        if kw in text_lower:
            return True

    # Se não entendeu e repetiu 3 vezes (sessão)
    # (simplificado — em produção, contar tentativas)

    return False


def send_interactive_menu(cred, to_number, restaurant):
    """Envia menu interativo com botões (WhatsApp Business API)."""
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
            'type': 'interactive',
            'interactive': {
                'type': 'button',
                'header': {'type': 'text', 'text': 'Menu Principal'},
                'body': {'text': get_welcome_message(cred, restaurant)},
                'footer': {'text': 'Escolha uma opção'},
                'action': {
                    'buttons': get_menu_buttons(),
                },
            },
        }
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        return resp.status_code == 200
    except Exception as e:
        logger.error(f'[CHATBOT] Erro ao enviar menu: {e}')
        return False


def send_text(cred, to_number, text):
    """Envia mensagem de texto simples."""
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
        return resp.status_code == 200
    except Exception as e:
        logger.error(f'[CHATBOT] Erro ao enviar texto: {e}')
        return False


def handle_bot_message(restaurant, cred, phone, text, msg_type='interactive', interactive_data=None):
    """
    Processa mensagem no contexto do bot de atendimento.
    Retorna lista de respostas.
    """
    responses = []

    # Se veio de botão interativo
    if interactive_data:
        button_id = interactive_data.get('button_id', '')
        if button_id == 'cardapio':
            from src.routes.whatsapp_order_flow import _show_catalog
            responses.extend(_show_catalog(restaurant))
        elif button_id == 'pedido':
            from src.routes.whatsapp_order_flow import _handle_browsing
            responses.extend(_handle_browsing(restaurant, cred, None, 'pedido', 'text'))
        elif button_id == 'humano':
            responses.append({
                'text': '👤 *Transferindo para atendente...*\n\nUm de nossos atendentes responderá em breve. Enquanto isso, pode nos dizer como podemos ajudar!'
            })
            # Notificar EST
            _notify_establishment_human_needed(cred, restaurant, phone)
        else:
            responses.append({'text': 'Opção não reconhecida. Digite *ajuda* para ver as opções.'})
        return responses

    # Texto livre → verificar FAQ
    faq_answer = get_faq_answer(text, cred, restaurant)
    if faq_answer:
        responses.append({'text': faq_answer})
        return responses

    # Verificar transferência para humano
    if should_transfer_to_human(text, cred):
        responses.append({
            'text': '👤 *Transferindo para atendente...*\n\nUm de nossos atendentes responderá em breve.'
        })
        _notify_establishment_human_needed(cred, restaurant, phone)
        return responses

    # Fluxo de pedido (Fases 3-5)
    from src.routes.whatsapp_order_flow import process_customer_message
    responses.extend(process_customer_message(restaurant, cred, phone, text, msg_type))

    return responses


def _notify_establishment_human_needed(cred, restaurant, customer_phone):
    """Notifica o EST que um cliente precisa de atendimento humano."""
    try:
        if cred and cred.notify_establishment:
            est_phone = restaurant.phone if restaurant else None
            if est_phone:
                msg = f'👤 *Cliente precisa de atendimento*\n\nTelefone: {customer_phone}\n\nResponda pelo WhatsApp ou painel MuvLog.'
                send_text(cred, est_phone, msg)
    except Exception as e:
        logger.error(f'[CHATBOT] Erro ao notificar EST: {e}')
