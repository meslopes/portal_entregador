"""Registro de atividades da equipe (§7.2 do backlog EE).

Uso: from src.utils.activity_log import log_activity
     log_activity('CREATE', 'establishment', est.id, est.name)

Best-effort: a gravação NUNCA pode derrubar a ação principal — falha
vira warning no log e a requisição segue normalmente.
"""
import logging

logger = logging.getLogger(__name__)


def log_activity(action, entity, entity_id=None, entity_label=None, details=None):
    """Grava uma linha no ActivityLog (quem/feito/quando)."""
    try:
        user_id, user_email, tenant_id = None, None, None
        try:
            from src.utils.tenant import get_current_user
            user = get_current_user()
            if user:
                user_id = user.id
                user_email = user.email
                tenant_id = user.tenant_id
        except Exception:
            pass

        from src.models.portal_models import ActivityLog, db
        db.session.add(ActivityLog(
            tenant_id=tenant_id,
            user_id=user_id,
            user_email=user_email,
            action=action,
            entity=entity,
            entity_id=entity_id,
            entity_label=str(entity_label)[:200] if entity_label else None,
            details=str(details)[:2000] if details else None,
        ))
        db.session.commit()
    except Exception as e:
        logger.warning(f"[ATIVIDADE] falha ao registrar {action}/{entity}: {e}")
        try:
            from src.models.portal_models import db
            db.session.rollback()
        except Exception:
            pass
