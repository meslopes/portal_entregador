import os
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
    JWT_ACCESS_TOKEN_EXPIRES = False  # Token não expira por padrão
    
    # Configurações do banco de dados
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///src/database/app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Configurações de CORS
    CORS_ORIGINS = [
        "http://muv.log.br",
        "https://muv.log.br",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "https://muvlog.vercel.app",
        "https://muvlog-frontend.vercel.app",
    ]
    
    # Configurações de logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'DEBUG')

class DevelopmentConfig(Config):
    """Configuração para desenvolvimento"""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///src/database/app.db')

class ProductionConfig(Config):
    """Configuração para produção"""
    DEBUG = False
    
    # Força HTTPS em produção
    PREFERRED_URL_SCHEME = 'https'
    
    # Configurações de segurança
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Banco de dados PostgreSQL obrigatório em produção
    if not os.getenv('DATABASE_URL') or 'sqlite' in os.getenv('DATABASE_URL', ''):
        raise ValueError("DATABASE_URL deve ser configurado com PostgreSQL para produção")

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

