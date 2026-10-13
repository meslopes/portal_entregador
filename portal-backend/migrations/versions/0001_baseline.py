"""Baseline — schema existente das migrações inline (main_production.py)

Revision ID: 0001_baseline
Revisões anteriores:
Create Date: 2026-10-12

Esta revisão NÃO cria tabelas. Ela marca o estado atual do banco
(que já foi criado pelas migrações inline idempotentes) como baseline
do Alembic. Novas mudanças de schema devem ser geradas com:

    flask db migrate -m "descricao"
    flask db upgrade

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001_baseline'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Schema já existe (criado por db.create_all + migrações inline).
    # Nada a fazer — apenas estabelece a baseline.
    pass


def downgrade() -> None:
    # Downgrade da baseline não é suportado (irreversível por design).
    raise RuntimeError('Baseline não pode ser revertida')
