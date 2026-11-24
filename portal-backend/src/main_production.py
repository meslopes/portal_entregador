"""
Casca de compatibilidade — NÃO adicionar lógica aqui (lição 34).

A aplicação REAL é `src.main` (entry do Dockerfile/Cloud Run e de
`python main.py`). Este módulo só mantém vivos os caminhos de import
legados que ainda o referenciam:

- Procfile (era Render, morto): `gunicorn ... src.main_production:app`
- Alembic: `FLASK_APP=src.main_production:create_app` (ver alembic.ini)
- `migrate_route_settings.py`: `from src.main_production import app`

Consolidação 2026-11-24: o conteúdo duplicado foi removido — toda
configuração (CORS, JWT loaders, gate de status, migrações, health,
uploads) vive em `src/main.py`. Manter os dois entries sincronizados já
causou 2 incidentes (CORS via app.config, handlers JWT ausentes).
"""
from src.main import app  # noqa: F401


def create_app(config_name=None):
    """Fábrica legada (Alembic) — retorna o app único."""
    return app


if __name__ == '__main__':
    import os

    app.run(
        host=os.getenv('HOST', '0.0.0.0'),
        port=int(os.getenv('PORT', 5000)),
        debug=os.getenv('FLASK_ENV', 'development') == 'development',
    )
