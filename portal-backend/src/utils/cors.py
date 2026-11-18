"""CORS centralizado (F-13 da auditoria): configuração ÚNICA para os dois
entry points (src/main.py e src/main_production.py).

As origens vêm de `config.CORS_ORIGINS` — mudou a lista de domínios, mudou
num lugar só. /uploads/* entra junto porque as fotos de prova são buscadas
pelo navegador a partir de outra origem (P-06).
"""
from flask_cors import CORS


def init_cors(app, flask_env=None):
    """Aplica CORS no app: permissivo em dev, restritivo em produção."""
    env = flask_env or app.config.get('FLASK_ENV') or 'development'

    if env == 'production':
        origins = app.config.get('CORS_ORIGINS') or []
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
