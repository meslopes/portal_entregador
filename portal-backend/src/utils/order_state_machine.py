"""
Máquina de estados central para pedidos.
Define transições válidas e quem pode executar cada transição.
"""
from src.models.portal_models import OrderStatus

# Transições válidas: (status_atual, status_destino) -> lista de papéis permitidos
VALID_TRANSITIONS = {
    # Admin e estabelecimento podem mover de SCHEDULED para PENDING
    (OrderStatus.SCHEDULED, OrderStatus.PENDING): ['admin', 'client'],
    (OrderStatus.SCHEDULED, OrderStatus.CANCELLED): ['admin', 'client'],
    
    # Entregador aceita pedido (plataforma ou próprio)
    (OrderStatus.PENDING, OrderStatus.ACCEPTED): ['driver', 'own_driver', 'admin'],
    (OrderStatus.PENDING, OrderStatus.CANCELLED): ['admin', 'client'],
    
    # Oferta para entregador próprio
    (OrderStatus.PENDING, OrderStatus.OFFERED): ['admin', 'client'],
    (OrderStatus.OFFERED, OrderStatus.ACCEPTED): ['own_driver', 'admin'],
    (OrderStatus.OFFERED, OrderStatus.PENDING): ['admin', 'client'],  # Volta para fila
    
    # Estabelecimento prepara o pedido
    (OrderStatus.ACCEPTED, OrderStatus.PREPARING): ['admin', 'client'],
    (OrderStatus.ACCEPTED, OrderStatus.CANCELLED): ['admin'],
    
    # Pedido pronto para coleta
    (OrderStatus.PREPARING, OrderStatus.READY): ['admin', 'client'],
    (OrderStatus.PREPARING, OrderStatus.CANCELLED): ['admin'],
    
    # Entregador coleta o pedido (de READY ou PREPARING)
    (OrderStatus.READY, OrderStatus.PICKED_UP): ['driver', 'own_driver', 'admin'],
    (OrderStatus.PREPARING, OrderStatus.PICKED_UP): ['driver', 'own_driver', 'admin'],
    (OrderStatus.READY, OrderStatus.CANCELLED): ['admin'],
    
    # Entregador entrega o pedido
    (OrderStatus.PICKED_UP, OrderStatus.DELIVERED): ['driver', 'own_driver', 'admin'],
    
    # Cancelamento após coleta requer admin
    (OrderStatus.PICKED_UP, OrderStatus.CANCELLED): ['admin'],
}


def can_transition(current_status, new_status, user_role):
    """Verifica se uma transição é válida para o papel do usuário.
    
    Args:
        current_status: OrderStatus atual
        new_status: OrderStatus desejado
        user_role: papel do usuário ('admin', 'client', 'driver', 'own_driver')
    
    Returns:
        tuple: (bool, str) - (pode_transicionar, mensagem_erro)
    """
    if not isinstance(current_status, OrderStatus):
        return False, f"Status atual inválido: {current_status}"
    
    if not isinstance(new_status, OrderStatus):
        return False, f"Status destino inválido: {new_status}"
    
    # Mesmo status é sempre permitido (no-op)
    if current_status == new_status:
        return True, ""
    
    transition = (current_status, new_status)
    
    if transition not in VALID_TRANSITIONS:
        return False, f"Transição não permitida: {current_status.value} → {new_status.value}"
    
    allowed_roles = VALID_TRANSITIONS[transition]
    
    if user_role not in allowed_roles:
        return False, f"Papel '{user_role}' não tem permissão para esta transição. Permitidos: {', '.join(allowed_roles)}"
    
    return True, ""


def get_allowed_transitions(current_status, user_role):
    """Retorna os status destino permitidos para o papel do usuário.
    
    Args:
        current_status: OrderStatus atual
        user_role: papel do usuário
    
    Returns:
        list: lista de OrderStatus permitidos como destino
    """
    allowed = []
    for (src, dst), roles in VALID_TRANSITIONS.items():
        if src == current_status and user_role in roles:
            allowed.append(dst)
    return allowed


def get_user_role(user):
    """Determina o papel do usuário para a máquina de estados.
    
    Args:
        user: objeto User do banco
    
    Returns:
        str: papel do usuário ('admin', 'client', 'driver', 'own_driver')
    """
    from src.models.portal_models import UserType
    
    if not user:
        return None
    
    if user.user_type == UserType.ADMIN:
        if user.is_super_admin:
            return 'admin'
        return 'admin'
    
    if user.user_type == UserType.CLIENT:
        return 'client'
    
    if user.user_type == UserType.DRIVER:
        return 'driver'
    
    return None
