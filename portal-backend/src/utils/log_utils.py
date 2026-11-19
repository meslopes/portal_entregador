"""Máscara de PII para logs (item F-22 da auditoria de 2026-09).

Telefone e endereço nunca aparecem completos em log: o suficiente para
diagnosticar (prefixo/últimos dígitos), sem expor dado pessoal.
"""


def mask_phone(value):
    """Mantém DDD e os 4 últimos dígitos: 51****9999."""
    if not value:
        return value
    digits = ''.join(filter(str.isdigit, str(value)))
    if len(digits) >= 8:
        return f"{digits[:2]}****{digits[-4:]}"
    return "***"


def mask_address(value):
    """Mantém só o início do endereço (rua) — número/bairro/cliente não vazam."""
    if not value:
        return value
    text = str(value).strip()
    if len(text) <= 12:
        return "***"
    return text[:12] + "...(mascarado)"
