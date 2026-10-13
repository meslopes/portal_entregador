"""
Alembic env — Portal Entregador.
Usa a aplicação Flask e os modelos SQLAlchemy do projeto.
DATABASE_URL define o alvo (mesmo do Flask).
"""
import os
import sys
from logging.config import fileConfig

from alembic import context
from flask import current_app

# Garante import do projeto
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

config = context.config

# Logging do Alembic
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Usa os metadados dos modelos do Flask-SQLAlchemy
target_metadata = current_app.extensions['migrate'].db.metadata


def get_url():
    """URL do banco — mesma do Flask/DATABASE_URL."""
    return current_app.config.get('SQLALCHEMY_DATABASE_URI')


def run_migrations_offline() -> None:
    """Modo offline: só gera SQL."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Modo online: aplica no banco."""
    connectable = current_app.extensions['migrate'].db.engine

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
