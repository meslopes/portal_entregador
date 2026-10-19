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


def find_phone_conflict(phone, exclude_user_id=None, exclude_own_driver_id=None):
    """
    Verifica se o telefone já está em uso por outro cadastro.
    Retorna dict com conflito ou None. Usar em create/update para evitar duplicidade.
    """
    target = normalize_phone(phone)
    if not target:
        return None

    # Conflito com User (qualquer tipo) — telefone deve ser único entre pessoas
    users = User.query.filter(User.deleted_at.is_(None)).all()
    for u in users:
        if exclude_user_id and u.id == exclude_user_id:
            continue
        if normalize_phone(u.phone) == target:
            return {
                'type': 'user',
                'id': u.id,
                'label': f'{u.first_name} {u.last_name} ({u.email})',
                'user_type': u.user_type.value if u.user_type else None,
            }

    # Conflito com EstablishmentDriver ativo
    for od in EstablishmentDriver.query.filter(EstablishmentDriver.is_active.is_(True)).all():
        if exclude_own_driver_id and od.id == exclude_own_driver_id:
            continue
        if normalize_phone(od.phone) == target:
            return {
                'type': 'own_driver',
                'id': od.id,
                'label': f'{od.name} (próprio id {od.id})',
            }
    return None


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
    para um User: retorna 'OWN', 'PLATFORM' ou None (se não for entregador).
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


def sync_user_phone_to_own_driver(user, old_phone=None, new_phone=None):
    """
    Mantém o telefone do cadastro próprio (EstablishmentDriver) igual ao do User.
    Evita que a mesma pessoa fique com 2 telefones após edição no admin.
    """
    if not user or not new_phone:
        return []
    new_norm = normalize_phone(new_phone)
    if not new_norm:
        return []

    updated = []
    name = f"{user.first_name} {user.last_name}".strip()

    # 1) Melhor match: telefone antigo
    if old_phone and normalize_phone(old_phone):
        od = find_own_driver_by_phone(old_phone)
        if od and normalize_phone(od.phone) != new_norm:
            od.phone = new_phone
            updated.append(od.id)
            return updated

    # 2) Match por nome — só UM (o ativo mais recente) para não copiar telefone
    #    para vários cadastros homônimos de teste
    if name:
        candidates = [
            od for od in EstablishmentDriver.query.filter(EstablishmentDriver.is_active.is_(True)).all()
            if (od.name or '').strip() == name
        ]
        # Preferir quem já tem telefone (provável par real); senão o de maior id
        candidates.sort(key=lambda x: (bool(normalize_phone(x.phone)), x.id), reverse=True)
        if candidates:
            od = candidates[0]
            if normalize_phone(od.phone) != new_norm:
                od.phone = new_phone
                updated.append(od.id)
    return updated


def sync_own_phone_to_user(own_driver, old_phone=None, new_phone=None):
    """
    Quando o telefone do próprio muda, reflete no User correspondente (se houver).
    """
    if not own_driver or not new_phone:
        return None
    new_norm = normalize_phone(new_phone)
    if not new_norm:
        return None

    user = None
    if old_phone and normalize_phone(old_phone):
        user = find_platform_user_by_phone(old_phone)
    if not user and (own_driver.name or '').strip():
        for u in User.query.filter(User.deleted_at.is_(None)).all():
            name = f"{u.first_name} {u.last_name}".strip()
            if name == (own_driver.name or '').strip():
                user = u
                break
    if not user:
        return None

    if normalize_phone(user.phone) != new_norm:
        user.phone = new_phone
        return user.id
    return None
