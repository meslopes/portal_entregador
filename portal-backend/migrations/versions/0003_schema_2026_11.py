"""Catch-up do schema — novembro/2026 (colunas e tabelas das últimas entregas).

Revision ID: 0003_schema_2026_11
Revisões anteriores: 0002_admin_invites
Create Date: 2026-11-18

Traz o Alembic ao par das migrações inline aplicadas em 2026-11:
- pricing_tables: volta/deslocamento + multiplicadores por veículo
- establishment_drivers: link de ativação
- restaurants: link de pedido rápido
- driver_restaurants: evitamento (G-08)
- activity_logs: registro de atividades (§7.2 EE)

Todas as sentenças são idempotentes (IF NOT EXISTS) — as mesmas mudanças
também vivem em src/main.py (migrações inline), que é a fonte de verdade
de runtime. Ver docs/MIGRACOES.md.
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '0003_schema_2026_11'
down_revision = '0002_admin_invites'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Colunas novas (idempotentes — mesmo padrão das migrações inline)
    colunas = [
        ("pricing_tables", "round_trip BOOLEAN DEFAULT FALSE"),
        ("pricing_tables", "round_trip_rate_per_km NUMERIC(10,2) DEFAULT 0"),
        ("pricing_tables", "pickup_rate_per_km NUMERIC(10,2) DEFAULT 0"),
        ("pricing_tables", "vehicle_multiplier_bike NUMERIC(5,2) DEFAULT 1.0"),
        ("pricing_tables", "vehicle_multiplier_moto NUMERIC(5,2) DEFAULT 1.0"),
        ("pricing_tables", "vehicle_multiplier_car NUMERIC(5,2) DEFAULT 1.0"),
        ("establishment_drivers", "activation_token VARCHAR(64) UNIQUE"),
        ("establishment_drivers", "activation_expires_at TIMESTAMP"),
        ("establishment_drivers", "activation_used_at TIMESTAMP"),
        ("restaurants", "order_link_token VARCHAR(64) UNIQUE"),
        ("driver_restaurants", "avoidance_active BOOLEAN DEFAULT FALSE"),
        ("driver_restaurants", "avoidance_source VARCHAR(20)"),
        ("driver_restaurants", "avoidance_reason VARCHAR(200)"),
        ("driver_restaurants", "avoidance_created_at TIMESTAMP"),
        ("driver_restaurants", "avoidance_revoked_at TIMESTAMP"),
    ]
    for tabela, col_sql in colunas:
        col = col_sql.split()[0]
        op.execute(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
            f"WHERE table_name = '{tabela}' AND column_name = '{col}') "
            f"THEN ALTER TABLE {tabela} ADD COLUMN {col_sql}; END IF; END $$"
        )

    # Tabela nova: registro de atividades
    op.execute(
        "CREATE TABLE IF NOT EXISTS activity_logs ("
        "id SERIAL PRIMARY KEY,"
        "tenant_id INTEGER REFERENCES tenants(id),"
        "user_id INTEGER REFERENCES users(id),"
        "user_email VARCHAR(255),"
        "action VARCHAR(50) NOT NULL,"
        "entity VARCHAR(50) NOT NULL,"
        "entity_id INTEGER,"
        "entity_label VARCHAR(200),"
        "details TEXT,"
        "created_at TIMESTAMP"
        ")"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_activity_tenant_created "
        "ON activity_logs (tenant_id, created_at)"
    )

    # Índices de caminhos quentes
    for idx_sql in (
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)",
        "CREATE INDEX IF NOT EXISTS idx_customers_user ON customers (user_id)",
        "CREATE INDEX IF NOT EXISTS idx_est_drivers_restaurant ON establishment_drivers (restaurant_id)",
        "CREATE INDEX IF NOT EXISTS idx_est_drivers_phone ON establishment_drivers (phone)",
        "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id)",
        "CREATE INDEX IF NOT EXISTS idx_payments_driver ON payments (driver_id)",
        "CREATE INDEX IF NOT EXISTS idx_pricing_tables_square ON pricing_tables (square_id)",
    ):
        op.execute(idx_sql)


def downgrade() -> None:
    # Downgrade não suportado (migrações de dados idempotentes por design).
    raise RuntimeError('Catch-up de schema não pode ser revertido')
