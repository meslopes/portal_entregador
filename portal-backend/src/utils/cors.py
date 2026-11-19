"""CORS centralizado (F-13 da auditoria): configuração ÚNICA para os dois
entry points (src/main.py e src/main_production.py).

FONTES ÚNICA das origens: a lista DEFAULT_ORIGINS abaixo. Um entry point
pode sobrescrever via app.config['CORS_ORIGINS'] (main_production carrega
a config class); se não houver config, vale DEFAULT_ORIGINS — nunca uma
lista vazia (CORS vazio bloqueia TUDO, inclusive o login).

/uploads/* entra junto porque as fotos de prova são buscadas pelo
navegador a partir de outra origem (P-06).
"""
from flask_cors import CORS

# Origens permitidas em produção — ESTA é a fonte de verdade (F-13).
# Mudou a lista de domínios, muda aqui; nada mais.
DEFAULT_ORIGINS = [
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
    "https://portal-frontend-sepia.vercel.app",
]


def init_cors(app, flask_env=None):
    """Aplica CORS no app: permissivo em dev, restritivo em produção."""
    env = flask_env or app.config.get('FLASK_ENV') or 'development'

    if env == 'production':
        # Nunca lista vazia: config do app (se existir) ou a lista padrão
        origins = app.config.get('CORS_ORIGINS') or DEFAULT_ORIGINS or []
        if not origins:
            origins = DEFAULT_ORIGINS
        CORS(app, resources={
            r"/api/*": {
                "origins": origins,
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "headers": ["Content-Type", "Authorization"],
                "supports_credentials": True,
            },
            r"/uploads/*": {
                "origins": origins,
                "methods": ["GET", "OPTIONS"],
                "headers": ["Authorization"],
                "supports_credentials": True,
            },
        })
    else:
        # DEV: permite qualquer origem (testes em rede local, múltiplos dispositivos)
        CORS(app, resources={r"/*": {"origins": "*"}})
