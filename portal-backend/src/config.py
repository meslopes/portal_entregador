import os
from datetime import timedelta

from dotenv import load_dotenv

# Carrega variáveis de ambiente baseado no ambiente
env = os.getenv('FLASK_ENV', 'development')
if env == 'production':
    load_dotenv('.env.production')
else:
    load_dotenv('.env')

class Config:
    """Configuração base"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    # 8h: cobre um turno de entrega sem expirar no meio do trabalho.
    # Valor único — main.py e main_production.py importam daqui.
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)

    # Configurações do banco de dados
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///src/database/app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Configurações de CORS
    CORS_ORIGINS = [
        "http://muv.log.br",
        "https://muv.log.br",
        "http://www.muv.log.br",
        "https://www.muv.log.br",
        "http://api.muv.log.br",
        "https://api.muv.log.br",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "https://muvlog.vercel.app",
        "https://muvlog-frontend.vercel.app",
        "https://portal-entregador-gamma.vercel.app",
        "https://portal-entregador.vercel.app",
    ]

    # Configurações de logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'DEBUG')

    # Configurações do WhatsApp Cloud API
    WHATSAPP_TOKEN = os.getenv('WHATSAPP_TOKEN', '')
    WHATSAPP_PHONE_NUMBER_ID = os.getenv('WHATSAPP_PHONE_NUMBER_ID', '')
    WHATSAPP_BUSINESS_ACCOUNT_ID = os.getenv('WHATSAPP_BUSINESS_ACCOUNT_ID', '')
    ADMIN_WHATSAPP = os.getenv('ADMIN_WHATSAPP', '5551981213934')

    # Configurações do Asaas (Gateway de Pagamento)
    ASAAS_API_KEY = os.getenv('ASAAS_API_KEY', '')
    ASAAS_ENVIRONMENT = os.getenv('ASAAS_ENVIRONMENT', 'sandbox')
    ASAAS_WEBHOOK_TOKEN = os.getenv('ASAAS_WEBHOOK_TOKEN', '')

class DevelopmentConfig(Config):
    """Configuração para desenvolvimento"""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///src/database/app.db')

class ProductionConfig(Config):
    """Configuração para produção"""
    DEBUG = False
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'WARNING')  # WARNING em produção, não DEBUG

    # Força HTTPS em produção
    PREFERRED_URL_SCHEME = 'https'

    # Configurações de segurança
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'

    # Banco de dados PostgreSQL obrigatório em produção
    if not os.getenv('DATABASE_URL') or 'sqlite' in os.getenv('DATABASE_URL', ''):
        raise ValueError("DATABASE_URL deve ser configurado com PostgreSQL para produção")

    # Configurações de conexão para evitar SSL stale connections (Cloud Run)
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,          # Testa conexão antes de usar
        'pool_recycle': 300,            # Recicla conexões a cada 5min
        'pool_timeout': 30,             # Timeout ao obter conexão
        'pool_size': 5,                 # Tamanho do pool
        'max_overflow': 10,             # Conexões extras permitidas
    }

    # Validar secret keys em produção — falhar fechado se não configuradas
    _secret = os.getenv('SECRET_KEY')
    if not _secret or _secret in ('dev-secret-key-change-in-production', 'dev-secret-key-local-nao-usar-em-producao', ''):
        raise RuntimeError("FATAL: SECRET_KEY deve ser definida com valor seguro em produção.")
    SECRET_KEY = _secret

    _jwt_secret = os.getenv('JWT_SECRET_KEY')
    if not _jwt_secret or _jwt_secret in ('jwt-secret-key-change-in-production', 'dev-jwt-secret-key-local-nao-usar-em-producao', ''):
        raise RuntimeError("FATAL: JWT_SECRET_KEY deve ser definida com valor seguro em produção.")
    JWT_SECRET_KEY = _jwt_secret

class TestingConfig(Config):
    """Configuração para testes"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

# Mapeamento de configurações
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

