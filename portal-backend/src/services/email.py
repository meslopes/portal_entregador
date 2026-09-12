"""
Serviço de Email - Stub (não implementado ainda)
Quando implementar, usar SMTP (Gmail, SendGrid) ou API de terceiros.
"""
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Serviço de envio de emails. Atualmente apenas loga as ações."""

    def is_configured(self):
        """Retorna se o serviço está configurado (SMTP/API key definida)."""
        import os
        return bool(os.getenv('SMTP_HOST') or os.getenv('SENDGRID_API_KEY'))

    def send_welcome_email(self, email, name):
        """Envia email de boas-vindas após confirmação de cadastro."""
        logger.info(f"[Email] Boas-vindas enviada para {email} ({name})")
        # TODO: implementar envio real via SMTP ou API

    def send_notification(self, email, subject, body):
        """Envia email de notificação genérico."""
        logger.info(f"[Email] Notificação enviada para {email}: {subject}")
        # TODO: implementar envio real


email_service = EmailService()
