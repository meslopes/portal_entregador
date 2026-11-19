"""Evitamento entregador↔estabelecimento (G-08 — punição silenciosa com controle do admin).

Regra da reciprocidade (desenho aprovado pelo Mauro, 2026-11-18):
- Entregador avalia o estabelecimento mal (≤2) SEM o contrário → conflito
  pessoal: NÃO alerta o admin; o entregador é DESPRIORIZADO nas ofertas
  daquele estabelecimento (evitamento automático, silencioso).
- Avaliação ruim RECÍPROCA (os dois lados) → problema de qualidade:
  ALERTA ao admin + evitamento automático.
- O admin controla tudo: liga/desliga o mecanismo (SystemConfig
  'avoidance_auto_enabled'), lista os pares e REVOGA a qualquer momento
  (e também cria evitamento manual = suspensão).
"""
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Avaliação ≤ esta nota conta como negativa
NOTA_NEGATIVA = 2


def _agora():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _auto_ativo():
    """O mecanismo automático está ligado? (padrão: ligado)."""
    try:
        from src.models.portal_models import SystemConfig
        cfg = SystemConfig.query.filter_by(config_key='avoidance_auto_enabled').first()
        if cfg and cfg.config_value not in (None, ''):
            return str(cfg.config_value).lower() not in ('0', 'false', 'off', 'não', 'nao')
    except Exception:
        pass
    return True


def _upsert_evitamento(driver_id, restaurant_id, source, reason):
    """Cria/reativa o evitamento do par (idempotente)."""
    from src.models.portal_models import DriverRestaurant, db
    rel = DriverRestaurant.query.filter_by(driver_id=driver_id, restaurant_id=restaurant_id).first()
    if not rel:
        rel = DriverRestaurant(driver_id=driver_id, restaurant_id=restaurant_id)
        db.session.add(rel)
    rel.avoidance_active = True
    rel.avoidance_source = source
    rel.avoidance_reason = (reason or '')[:200]
    rel.avoidance_created_at = _agora()
    rel.avoidance_revoked_at = None
    return rel


def _alertar_admins(tenant_id, titulo, mensagem):
    """Notifica os admins do tenant (melhor esforço — nunca derruba o fluxo)."""
    try:
        from src.models.portal_models import Notification, NotificationType, User, UserType, db
        admins = User.query.filter(
            User.user_type == UserType.ADMIN,
            User.deleted_at.is_(None),
        )
        if tenant_id:
            admins = admins.filter(User.tenant_id == tenant_id)
        for admin in admins.limit(20).all():
            db.session.add(Notification(
                user_id=admin.id, title=titulo, message=mensagem,
                type=NotificationType.SYSTEM if hasattr(NotificationType, 'SYSTEM') else list(NotificationType)[0],
            ))
    except Exception as e:
        logger.warning(f"[EVITAMENTO] falha ao alertar admins: {e}")


def registrar_avaliacao_negativa(driver_id, restaurant_id, order_id, rating):
    """Processa avaliação negativa (≤2) do entregador ao estabelecimento (G-08)."""
    try:
        if not driver_id or not restaurant_id:
            return
        if rating is None or int(rating) > NOTA_NEGATIVA:
            return
        if not _auto_ativo():
            logger.info("[EVITAMENTO] mecanismo automático desligado — ignorando")
            return

        from src.models.portal_models import Delivery, Order

        # Reciprocidade: o estabelecimento também avaliou MAL este entregador?
        reciproca = False
        try:
            order = Order.query.get(order_id)
            if order and order.delivery and order.delivery.customer_rating:
                reciproca = int(order.delivery.customer_rating) <= NOTA_NEGATIVA
        except Exception:
            pass

        if reciproca:
            # Problema de qualidade de verdade: alerta o admin
            _alertar_admins(
                getattr(order, 'tenant_id', None),
                'Conflito recíproco de avaliação',
                f'Entregador e estabelecimento se avaliaram mal no pedido #{getattr(order, "order_number", order_id)}. '
                'Evitamento automático ativado — revogue no painel se for caso isolado.',
            )
            _upsert_evitamento(driver_id, restaurant_id, 'AUTO', f'Conflito recíproco (pedido #{order_id})')
        else:
            # Conflito pessoal (um lado só): punição silenciosa
            _upsert_evitamento(driver_id, restaurant_id, 'AUTO', f'Avaliação {rating}/5 no pedido #{order_id}')

        from src.models.portal_models import db
        db.session.commit()
        logger.info(f"[EVITAMENTO] registrado para driver {driver_id} × estab {restaurant_id} (recíproca={reciproca})")

    except Exception as e:
        logger.warning(f"[EVITAMENTO] falha ao registrar avaliação negativa: {e}")
        try:
            from src.models.portal_models import db
            db.session.rollback()
        except Exception:
            pass


def evitamentos_ativos(restaurant_id, driver_ids):
    """Conjunto de driver_ids com evitamento ATIVO para o estabelecimento.

    Usado na distribuição em lote (1 consulta — anti N+1).
    """
    if not restaurant_id or not driver_ids:
        return set()
    try:
        from src.models.portal_models import DriverRestaurant
        rows = DriverRestaurant.query.filter(
            DriverRestaurant.restaurant_id == restaurant_id,
            DriverRestaurant.driver_id.in_(driver_ids),
            DriverRestaurant.avoidance_active.is_(True),
        ).all()
        return {r.driver_id for r in rows}
    except Exception:
        return set()


def criar_evitamento_manual(driver_id, restaurant_id, reason=None):
    """Suspensão manual pelo admin (revogável a qualquer momento)."""
    from src.models.portal_models import db
    rel = _upsert_evitamento(driver_id, restaurant_id, 'MANUAL', reason or 'Definido pelo admin')
    db.session.commit()
    return rel


def revogar_evitamento(rel_id):
    """Revogação pelo admin — o par volta a ser ofertado normalmente."""
    from src.models.portal_models import DriverRestaurant, db
    rel = DriverRestaurant.query.get(rel_id)
    if not rel:
        return None
    rel.avoidance_active = False
    rel.avoidance_revoked_at = _agora()
    db.session.commit()
    return rel
