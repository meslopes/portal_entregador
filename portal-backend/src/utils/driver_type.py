"""
Classificação de entregadores: PRÓPRIO vs PLATAFORMA.

Regra de ouro: NUNCA usar nome/email para decidir o tipo.
Identidade do entregador próprio = telefone normalizado (dígitos).
Identidade do entregador da plataforma = User/Driver.

- EstablishmentDriver (qualquer) → PRÓPRIO
- Driver com converted_to_own=True → PRÓPRIO
- Driver com telefone do User igual a um EstablishmentDriver ativo → PRÓPRIO
- Demais Driver → PLATAFORMA
"""
from src.models.portal_models import Driver, EstablishmentDriver, User, db


def normalize_phone(phone):
    """Retorna apenas os dígitos do telefone. Ex.: '(51) 99999-9999' → '51999999999'."""
    if not phone:
        return ''
    return ''.join(filter(str.isdigit, str(phone)))


def find_own_driver_by_phone(phone, restaurant_id=None):
    """Busca entregador próprio ativo pelo telefone (normalizado)."""
    target = normalize_phone(phone)
    if not target:
        return None
    query = EstablishmentDriver.query.filter(EstablishmentDriver.is_active.is_(True))
    if restaurant_id:
        query = query.filter(EstablishmentDriver.restaurant_id == restaurant_id)
    for d in query.all():
        if normalize_phone(d.phone) == target:
            return d
    return None


def find_platform_user_by_phone(phone):
    """Busca User (tipo DRIVER) pelo telefone normalizado."""
    target = normalize_phone(phone)
    if not target:
        return None
    users = User.query.filter(User.deleted_at.is_(None)).all()
    for u in users:
        if normalize_phone(u.phone) == target:
            return u
    return None


def mark_driver_converted_by_phone(phone):
    """
    Se existir Driver vinculado a um User com esse telefone, marca converted_to_own=True.
    Retorna o Driver atualizado ou None.
    """
    user = find_platform_user_by_phone(phone)
    if not user:
        return None
    driver = Driver.query.filter_by(user_id=user.id).first()
    if not driver:
        return None
    if not driver.converted_to_own:
        driver.converted_to_own = True
        driver.is_online = False
    return driver


def is_platform_driver_excluded(driver):
    """
    True se este Driver NÃO deve aparecer em listas de plataforma.
    Exclui convertidos e quem já tem EstablishmentDriver ativo com o mesmo telefone.
    """
    if driver.converted_to_own:
        return True
    user = db.session.get(User, driver.user_id) if driver.user_id else None
    if user and find_own_driver_by_phone(user.phone):
        return True
    return False


def platform_drivers_query():
    """Query de Drivers que pertencem à plataforma (exclui próprios)."""
    return Driver.query.filter(
        db.or_(Driver.converted_to_own.is_(False), Driver.converted_to_own.is_(None))
    )


def get_driver_subtype_for_user(user):
    """
    Para um User: retorna 'OWN', 'PLATFORM' ou None (se não for entregador).
    Usado em listas de usuários.
    """
    if not user or not user.user_type or user.user_type.value != 'DRIVER':
        return None
    driver = Driver.query.filter_by(user_id=user.id).first()
    if driver and driver.converted_to_own:
        return 'OWN'
    if find_own_driver_by_phone(user.phone):
        return 'OWN'
    return 'PLATFORM'
