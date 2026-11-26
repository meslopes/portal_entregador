"""
WhatsApp — IA com linguagem natural (Fase 7 — 2026-11-25).
Entende texto livre, responde perguntas, recomenda produtos, extrai endereço.
Multi-tenant: cada EST pode ter seu provedor de IA, personalidade e limites.
Roteamento inteligente: IA responde se tem certeza, transfere se não.
"""
import json
import logging

from src.models.portal_models import (
    WhatsAppCredential, WhatsAppProduct,
    WhatsAppOrderSession, db,
)

logger = logging.getLogger(__name__)

# Provedores suportados
PROVIDERS = {
    'openai': 'https://api.openai.com/v1/chat/completions',
    'claude': 'https://api.anthropic.com/v1/messages',
    'gemini': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
}


def get_ai_config(cred):
    """Retorna config de IA do EST (ou padrão)."""
    return {
        'provider': getattr(cred, 'ai_provider', 'openai') or 'openai',
        'api_key': getattr(cred, 'ai_api_key', None),
        'model': getattr(cred, 'ai_model', None) or 'gpt-3.5-turbo',
        'personality': getattr(cred, 'ai_personality', None) or 'Você é um atendente simpático e prestativo de um estabelecimento de delivery.',
        'monthly_limit': getattr(cred, 'ai_monthly_limit', 500) or 500,
        'token_limit': getattr(cred, 'ai_token_limit', 1000) or 1000,
        'transfer_threshold': getattr(cred, 'ai_transfer_threshold', 0.5) or 0.5,
    }


def build_system_prompt(restaurant, products):
    """Monta o prompt do sistema com contexto do EST."""
    product_list = ''
    for p in products[:30]:  # Limitar a 30 produtos
        desc = f' — {p.description}' if p.description else ''
        product_list += f'- {p.name}{desc}: R$ {float(p.price):.2f}\n'

    return f"""Você é um atendente virtual do restaurante "{restaurant.name}".

REGRAS:
- Seja simpático, prestativo e direto
- Responda em português brasileiro
- Use emojis com moderação
- Se não souber a resposta, diga que vai transferir para um atendente
- Nunca invente preços ou informações
- Para pedidos, guie o cliente pelo fluxo: cardálio → seleção → endereço → pagamento → confirmação

CARDÁPIO:
{product_list if product_list else '(cardápio não disponível)'}

INFORMAÇÕES DO ESTABELECIMENTO:
- Endereço: {restaurant.address or 'Não informado'}
- Telefone: {restaurant.phone or 'Não informado'}
- Horário: {restaurant.opening_hours or 'Não informado'}

FORMAS DE PAGAMENTO: PIX, Dinheiro na entrega, Cartão na entrega

Se o cliente fizer uma pergunta sobre horário, endereço, pagamento ou entrega, responda diretamente.
Se o cliente quiser fazer um pedido, guie-o pelo fluxo.
Se o cliente reclamar ou tiver um problema complexo, diga que vai transferir para um atendente."""


def ask_ai(cred, restaurant, customer_message, conversation_history=None):
    """
    Envia mensagem para a IA e retorna a resposta.
    Retorna (resposta, confiança, used_tokens).
    """
    config = get_ai_config(cred)

    if not config['api_key']:
        return None, 0, 0

    try:
        products = WhatsAppProduct.query.filter_by(
            restaurant_id=restaurant.id, is_active=True
        ).all()

        system_prompt = build_system_prompt(restaurant, products)

        # Montar mensagens
        messages = [{'role': 'system', 'content': system_prompt}]
        if conversation_history:
            messages.extend(conversation_history[-10:])  # Últimas 10 mensagens
        messages.append({'role': 'user', 'content': customer_message})

        provider = config['provider']
        if provider == 'openai':
            return _ask_openai(config, messages)
        elif provider == 'claude':
            return _ask_claude(config, messages)
        elif provider == 'gemini':
            return _ask_gemini(config, messages)

        return None, 0, 0

    except Exception as e:
        logger.error(f'[AI] Erro: {e}')
        return None, 0, 0


def _ask_openai(config, messages):
    """Chama OpenAI API."""
    import requests
    resp = requests.post(
        PROVIDERS['openai'],
        headers={
            'Authorization': f'Bearer {config["api_key"]}',
            'Content-Type': 'application/json',
        },
        json={
            'model': config['model'],
            'messages': messages,
            'max_tokens': config['token_limit'],
            'temperature': 0.7,
        },
        timeout=30,
    )
    data = resp.json()

    if resp.status_code == 200:
        answer = data['choices'][0]['message']['content'].strip()
        tokens = data.get('usage', {}).get('total_tokens', 0)
        confidence = _estimate_confidence(answer)
        return answer, confidence, tokens

    logger.warning(f'[AI] OpenAI erro: {data}')
    return None, 0, 0


def _ask_claude(config, messages):
    """Chama Claude API (Anthropic)."""
    import requests
    system_msg = messages[0]['content'] if messages and messages[0]['role'] == 'system' else ''
    user_messages = [m for m in messages if m['role'] != 'system']

    resp = requests.post(
        PROVIDERS['claude'],
        headers={
            'x-api-key': config['api_key'],
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
        },
        json={
            'model': config.get('model') or 'claude-3-haiku-20240307',
            'max_tokens': config['token_limit'],
            'system': system_msg,
            'messages': user_messages,
        },
        timeout=30,
    )
    data = resp.json()

    if resp.status_code == 200:
        answer = data['content'][0]['text'].strip()
        tokens = data.get('usage', {}).get('input_tokens', 0) + data.get('usage', {}).get('output_tokens', 0)
        confidence = _estimate_confidence(answer)
        return answer, confidence, tokens

    logger.warning(f'[AI] Claude erro: {data}')
    return None, 0, 0


def _ask_gemini(config, messages):
    """Chama Gemini API (Google)."""
    import requests
    system_msg = messages[0]['content'] if messages and messages[0]['role'] == 'system' else ''
    user_messages = [m for m in messages if m['role'] != 'system']

    contents = []
    for m in user_messages:
        contents.append({
            'role': 'model' if m['role'] == 'assistant' else 'user',
            'parts': [{'text': m['content']}],
        })

    model = config.get('model') or 'gemini-2.5-flash'
    # Remover prefixo "models/" se presente
    if model.startswith('models/'):
        model = model[7:]

    resp = requests.post(
        f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={config["api_key"]}',
        headers={'Content-Type': 'application/json'},
        json={
            'contents': contents,
            'systemInstruction': {'parts': [{'text': system_msg}]},
            'generationConfig': {'maxOutputTokens': config['token_limit']},
        },
        timeout=30,
    )
    data = resp.json()

    if resp.status_code == 200:
        answer = data['candidates'][0]['content']['parts'][0]['text'].strip()
        tokens = data.get('usageMetadata', {}).get('totalTokenCount', 0)
        confidence = _estimate_confidence(answer)
        return answer, confidence, tokens

    logger.warning(f'[AI] Gemini erro: {data}')
    return None, 0, 0


def _estimate_confidence(answer):
    """Estima confiança da resposta (heurística simples)."""
    if not answer:
        return 0.0

    # Indicadores de baixa confiança
    low_confidence = [
        'não sei', 'nao sei', 'não tenho', 'nao tenho',
        'vou transferir', 'atendente', 'desculpe, não',
        'não consigo', 'nao consigo', 'não entendi', 'nao entendi',
    ]
    answer_lower = answer.lower()
    for phrase in low_confidence:
        if phrase in answer_lower:
            return 0.3

    # Resposta curta demais = baixa confiança
    if len(answer) < 10:
        return 0.4

    return 0.9


def should_use_ai(cred):
    """Verifica se a IA está habilitada e configurada."""
    if not cred:
        return False
    if not getattr(cred, 'ai_enabled', False):
        return False
    if not getattr(cred, 'ai_api_key', None):
        return False
    return True


def check_monthly_limit(cred):
    """Verifica se o limite mensal de IA foi atingido."""
    from datetime import datetime, timezone
    from sqlalchemy import func

    config = get_ai_config(cred)
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Contar mensagens de IA enviadas este mês
    from src.models.portal_models import WhatsAppMessage
    count = WhatsAppMessage.query.filter(
        WhatsAppMessage.restaurant_id == cred.restaurant_id,
        WhatsAppMessage.direction == 'outbound',
        WhatsAppMessage.message_type == 'ai',
        WhatsAppMessage.created_at >= month_start,
    ).count()

    return count < config['monthly_limit']
