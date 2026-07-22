"""
Servico de envio de emails via SendGrid.
Envia convites para admins, notificacoes, etc.
"""
import os


class EmailService:
    """Servico para enviar emails via SendGrid"""

    def __init__(self, api_key=None, from_email=None):
        self.api_key = api_key
        self.from_email = from_email

    def _get_config(self):
        """Busca configuracao do email do SystemConfig"""
        from src.models.portal_models import SystemConfig

        if not self.api_key:
            config = SystemConfig.query.filter_by(config_key='sendgrid_api_key').first()
            self.api_key = config.config_value if config else os.getenv('SENDGRID_API_KEY')

        if not self.from_email:
            config = SystemConfig.query.filter_by(config_key='email_from').first()
            self.from_email = config.config_value if config else 'noreply@muvlog.com.br'

    def is_configured(self):
        """Verifica se o email esta configurado"""
        self._get_config()
        return bool(self.api_key)

    def send_email(self, to_email, subject, html_content):
        """Envia um email"""
        if not self.is_configured():
            return {'success': False, 'error': 'SendGrid não configurado'}

        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail

            message = Mail(
                from_email=self.from_email,
                to_emails=to_email,
                subject=subject,
                html_content=html_content
            )

            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)

            return {
                'success': True,
                'status_code': response.status_code
            }

        except Exception as e:
            return {'success': False, 'error': str(e)}

    def send_welcome_email(self, to_email, name, password, user_type):
        """Envia email de boas-vindas apos aprovacao"""
        user_type_label = {
            'ADMIN': 'Administrador',
            'DRIVER': 'Entregador',
            'CLIENT': 'Estabelecimento'
        }.get(user_type, 'Usuário')

        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">muv.log</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Plataforma de Gestão de Entregas</p>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px;">
                <h2 style="color: #1e293b; margin-top 0;">✅ Sua conta foi aprovada!</h2>
                <p style="color: #475569;">Olá <strong>{name}</strong>,</p>
                <p style="color: #475569;">Seu cadastro como <strong>{user_type_label}</strong> foi aprovado. Você já pode acessar o sistema.</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #64748b; margin: 0 0 10px 0;">Seus dados de acesso:</p>
                    <p style="color: #1e293b; margin: 0 0 5px 0;"><strong>Email:</strong> {to_email}</p>
                    <p style="color: #1e293b; margin: 0 0 5px 0;"><strong>Senha:</strong> {password}</p>
                </div>
                <p style="color: #475569;">Acesse em: <a href="https://portal-entregador-gamma.vercel.app/login" style="color: #0d9488;">portal-entregador-gamma.vercel.app</a></p>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                    Este é um email automático do sistema muv.log.
                </p>
            </div>
        </div>
        """

        return self.send_email(to_email, '✅ Sua conta muv.log foi aprovada!', html)

    def send_rejection_email(self, to_email, name):
        """Envia email de rejeicao de cadastro"""
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">muv.log</h1>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px;">
                <h2 style="color: #1e293b; margin-top: 0;">❌ Cadastro não aprovado</h2>
                <p style="color: #475569;">Olá <strong>{name}</strong>,</p>
                <p style="color: #475569;">Infelizmente seu cadastro no muv.log não foi aprovado.</p>
                <p style="color: #475569;">Entre em contato com o suporte para mais informações.</p>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                    Este é um email automático do sistema muv.log.
                </p>
            </div>
        </div>
        """

        return self.send_email(to_email, '❌ Seu cadastro muv.log não foi aprovado', html)

    def send_new_registration_alert(self, admin_email, user_name, user_type):
        """Notifica admin sobre novo cadastro pendente"""
        user_type_label = {
            'ADMIN': 'Administrador',
            'DRIVER': 'Entregador',
            'CLIENT': 'Estabelecimento'
        }.get(user_type, 'Usuário')

        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">muv.log</h1>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px;">
                <h2 style="color: #1e293b; margin-top: 0;">🔔 Novo cadastro pendente</h2>
                <p style="color: #475569;">Um novo <strong>{user_type_label}</strong> se cadastrou no sistema:</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #1e293b; margin: 0 0 5px 0;"><strong>Nome:</strong> {user_name}</p>
                    <p style="color: #1e293b; margin: 0 0 5px 0;"><strong>Tipo:</strong> {user_type_label}</p>
                </div>
                <p style="color: #475569;">Acesse o painel administrativo para aprovar ou rejeitar:</p>
                <p><a href="https://portal-entregador-gamma.vercel.app/admin" style="color: #0d9488;">Painel Administrativo</a></p>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                    Este é um email automático do sistema muv.log.
                </p>
            </div>
        </div>
        """

        return self.send_email(admin_email, f'🔔 Novo cadastro pendente: {user_name}', html)


# Instancia singleton
email_service = EmailService()
