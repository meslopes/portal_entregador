"""
Tags de sistema armazenadas em Order.special_instructions.

HISTÓRICO: o campo `special_instructions` foi usado para guardar flags de
distribuição (OFFERED_TO, REJECTED_BY, TIMEOUT_BY, ADMIN_NOTIFIED_AT).
Este módulo centraliza a manipulação para:
1. Impedir que o cliente injete tags de sistema no texto livre
2. Não expor as flags internas em respostas para clientes/entregadores
"""
import re

# Padrões de tags internas (pipe-delimited)
SYSTEM_TAG_RE = re.compile(
    r'\|?(?:OFFERED_TO_\d+(?:_\d+)?|REJECTED_BY_\d+|TIMEOUT_BY_\d+|ADMIN_NOTIFIED_AT_\d+)\|?'
)

# Qualquer tag de sistema isolada (para sanitizar input do usuário)
_SYSTEM_TOKEN_RE = re.compile(
    r'(?:OFFERED_TO_\d+(?:_\d+)?|REJECTED_BY_\d+|TIMEOUT_BY_\d+|ADMIN_NOTIFIED_AT_\d+)'
)


def extract_system_tags(raw):
    """Extrai apenas as tags de sistema de special_instructions."""
    if not raw:
        return ''
    return '|'.join(t for t in raw.split('|') if _SYSTEM_TOKEN_RE.fullmatch(t.strip()))


def strip_system_tags(raw):
    """
    Remove tags de sistema, devolvendo só a nota do cliente.
    Usar em to_dict() para não vazar flags internas.
    """
    if not raw:
        return ''
    parts = [p.strip() for p in raw.split('|') if p.strip()]
    customer = [p for p in parts if not _SYSTEM_TOKEN_RE.fullmatch(p)]
    return '|'.join(customer)


def sanitize_customer_instructions(text):
    """
    Sanitiza input do usuário: remove qualquer tag de sistema colada no texto.
    Evita que um cliente force oferta/rejeição forjando tags.
    """
    if not text:
        return text
    cleaned = _SYSTEM_TOKEN_RE.sub('', text)
    # Remove pipes órfãos duplicados
    cleaned = re.sub(r'\|{2,}', '|', cleaned).strip('|').strip()
    return cleaned


def append_system_tag(raw, tag):
    """
    Acrescenta uma tag de sistema ao campo, preservando a nota do cliente.
    `tag` deve ser algo como 'OFFERED_TO_5_1710000000'.
    """
    if not tag or not _SYSTEM_TOKEN_RE.fullmatch(tag):
        raise ValueError(f'Tag de sistema inválida: {tag}')
    if not raw:
        return tag
    # Evitar duplicar a mesma tag
    existing = extract_system_tags(raw)
    if tag in existing.split('|'):
        return raw
    return f"{raw}|{tag}"


def remove_system_tag(raw, tag):
    """Remove uma tag de sistema específica, mantendo o resto."""
    if not raw:
        return raw
    parts = [p for p in raw.split('|') if p.strip() and p.strip() != tag]
    return '|'.join(parts)


def count_system_tags(raw, prefix):
    """Conta tags com um prefixo (ex: 'REJECTED_BY_')."""
    if not raw:
        return 0
    return sum(1 for p in raw.split('|') if p.strip().startswith(prefix))
