"""Migrações inline — tabelas novas e baseline do Alembic.

Extraído de migrations_inline.py (parte 2) no refactor de arquivos grandes.
"""
from src.models.portal_models import db


def run_table_migrations():
    """Cria tabelas novas via SQL e marca o baseline do Alembic."""
    # Migration: tabelas de roteirização (own_driver_routes e own_driver_stops)
    try:
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS own_driver_routes (
                id SERIAL PRIMARY KEY,
                establishment_driver_id INTEGER REFERENCES establishment_drivers(id),
                restaurant_id INTEGER REFERENCES restaurants(id),
                status VARCHAR(20) DEFAULT 'ACTIVE',
                total_distance_km NUMERIC(10,2),
                total_duration_min NUMERIC(10,2),
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS own_driver_stops (
                id SERIAL PRIMARY KEY,
                route_id INTEGER REFERENCES own_driver_routes(id),
                order_id INTEGER REFERENCES orders(id),
                stop_order INTEGER NOT NULL,
                stop_type VARCHAR(20),
                latitude NUMERIC(10,8),
                longitude NUMERIC(11,8),
                address VARCHAR(500),
                status VARCHAR(20) DEFAULT 'PENDING',
                arrived_at TIMESTAMP,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: tabelas de roteirização para plataforma (platform_driver_routes e platform_driver_stops)
    try:
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS platform_driver_routes (
                id SERIAL PRIMARY KEY,
                driver_id INTEGER REFERENCES drivers(id),
                restaurant_id INTEGER REFERENCES restaurants(id),
                status VARCHAR(20) DEFAULT 'ACTIVE',
                total_distance_km NUMERIC(10,2),
                total_duration_min NUMERIC(10,2),
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS platform_driver_stops (
                id SERIAL PRIMARY KEY,
                route_id INTEGER REFERENCES platform_driver_routes(id),
                order_id INTEGER REFERENCES orders(id),
                stop_order INTEGER NOT NULL,
                stop_type VARCHAR(20),
                latitude NUMERIC(10,8),
                longitude NUMERIC(11,8),
                address VARCHAR(500),
                status VARCHAR(20) DEFAULT 'PENDING',
                arrived_at TIMESTAMP,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'enable_platform_routing') THEN ALTER TABLE restaurants ADD COLUMN enable_platform_routing BOOLEAN DEFAULT FALSE; END IF; END $$"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: tabelas de assinatura (establishment_subscriptions e subscription_invoices)
    try:
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS establishment_subscriptions (
                id SERIAL PRIMARY KEY,
                restaurant_id INTEGER REFERENCES restaurants(id),
                tenant_id INTEGER REFERENCES tenants(id),
                billing_cycle VARCHAR(20) DEFAULT 'WEEKLY',
                price_per_driver NUMERIC(10,2) DEFAULT 50.00,
                fixed_price NUMERIC(10,2) DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                last_billed_at TIMESTAMP,
                next_billing_at TIMESTAMP,
                total_billed NUMERIC(10,2) DEFAULT 0,
                total_paid NUMERIC(10,2) DEFAULT 0,
                asaas_subscription_id VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS subscription_invoices (
                id SERIAL PRIMARY KEY,
                subscription_id INTEGER REFERENCES establishment_subscriptions(id),
                restaurant_id INTEGER REFERENCES restaurants(id),
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                period_start TIMESTAMP NOT NULL,
                period_end TIMESTAMP NOT NULL,
                drivers_count INTEGER DEFAULT 0,
                price_per_driver NUMERIC(10,2),
                total_amount NUMERIC(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'PENDING',
                due_date TIMESTAMP,
                paid_at TIMESTAMP,
                payment_method VARCHAR(20),
                asaas_invoice_id VARCHAR(100),
                payment_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: fixed_price para establishment_subscriptions
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'establishment_subscriptions' AND column_name = 'fixed_price') THEN ALTER TABLE establishment_subscriptions ADD COLUMN fixed_price NUMERIC(10,2) DEFAULT 0; END IF; END $$"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: tabela own_driver_earnings
    try:
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS own_driver_earnings (
                id SERIAL PRIMARY KEY,
                restaurant_id INTEGER REFERENCES restaurants(id),
                establishment_driver_id INTEGER REFERENCES establishment_drivers(id),
                order_id INTEGER REFERENCES orders(id),
                delivery_fee NUMERIC(10,2) NOT NULL,
                driver_earning NUMERIC(10,2) NOT NULL,
                payment_type VARCHAR(30),
                distance_km NUMERIC(10,2),
                is_paid BOOLEAN DEFAULT FALSE,
                paid_at TIMESTAMP,
                payment_method VARCHAR(20),
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: tenant_id em system_configs
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_configs' AND column_name = 'tenant_id') THEN ALTER TABLE system_configs ADD COLUMN tenant_id INTEGER REFERENCES tenants(id); END IF; END $$"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: remover unique constraint antiga e criar nova composta
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'system_configs_config_key_key' AND table_name = 'system_configs') THEN ALTER TABLE system_configs DROP CONSTRAINT system_configs_config_key_key; END IF; END $$"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'system_configs_tenant_key' AND table_name = 'system_configs') THEN ALTER TABLE system_configs ADD CONSTRAINT system_configs_tenant_key UNIQUE (tenant_id, config_key); END IF; END $$"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: tabela de preços (pricing_tables)
    try:
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS pricing_tables (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id),
                square_id INTEGER REFERENCES squares(id) NOT NULL,
                name VARCHAR(200) NOT NULL,
                description VARCHAR(500),
                price_per_km NUMERIC(10,2) NOT NULL DEFAULT 2.95,
                min_distance_km NUMERIC(5,2) DEFAULT 4.0,
                min_delivery_fee NUMERIC(10,2),
                max_delivery_fee NUMERIC(10,2) DEFAULT 50.00,
                driver_percentage NUMERIC(5,2) DEFAULT 70.0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: pricing_table_id em restaurants
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'pricing_table_id') THEN ALTER TABLE restaurants ADD COLUMN pricing_table_id INTEGER REFERENCES pricing_tables(id); END IF; END $$"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration FASE 1 DE PREÇOS (2026-11-16): valores (R$/km, taxas, percentuais)
    # passam a viver SÓ em pricing_tables; a praça apenas INDICA a tabela padrão.
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'squares' AND column_name = 'default_pricing_table_id') "
            "THEN ALTER TABLE squares ADD COLUMN default_pricing_table_id INTEGER; END IF; END $$"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Data-fix idempotente: praça sem tabela padrão ganha a tabela
    # "Padrão — <nome>" copiando os valores LEGADOS da praça (preço não muda).
    # min/max_delivery_fee ficam NULL de propósito: o caminho antigo (praça)
    # nunca aplicou piso/teto — manter sem clamp preserva o frete observado.
    # Só roda se as colunas legadas ainda existem (banco novo já nasce sem).
    try:
        tem_legadas = db.session.execute(db.text(
            "SELECT count(*) FROM information_schema.columns "
            "WHERE table_name = 'squares' AND column_name = 'price_per_km'"
        )).scalar()
    except Exception:
        db.session.rollback()
        tem_legadas = 0
    if tem_legadas:
        try:
            db.session.execute(db.text("""
                INSERT INTO pricing_tables
                    (tenant_id, square_id, name, description, price_per_km, fixed_fee,
                     min_distance_km, min_delivery_fee, max_delivery_fee,
                     driver_percentage, gamification_percentage, is_active, created_at, updated_at)
                SELECT s.tenant_id, s.id, 'Padrão — ' || s.name,
                       'Tabela padrão criada na consolidação de preços (2026-11-16)',
                       COALESCE(s.price_per_km, 2.95), COALESCE(s.fixed_fee, 0),
                       COALESCE(s.min_distance_km, 4.0), NULL, NULL,
                       COALESCE(s.driver_percentage, 65.0), COALESCE(s.gamification_percentage, 5.0),
                       TRUE, NOW(), NOW()
                FROM squares s
                WHERE s.default_pricing_table_id IS NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM pricing_tables p
                      WHERE p.square_id = s.id AND p.name = 'Padrão — ' || s.name
                  )
            """))
            db.session.execute(db.text("""
                UPDATE squares s SET default_pricing_table_id = p.id
                FROM pricing_tables p
                WHERE p.square_id = s.id
                  AND p.name = 'Padrão — ' || s.name
                  AND s.default_pricing_table_id IS NULL
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()

    # Migration FASE 2 DE PREÇOS (2026-11-16): drop das colunas legadas de preço
    # em squares e de gamification_percentage (fonte do MuvScore = SystemConfig).
    # Só derruba se toda praça já tiver tabela padrão (paridade garantida).
    try:
        pendentes = db.session.execute(db.text(
            "SELECT count(*) FROM squares WHERE default_pricing_table_id IS NULL"
        )).scalar()
        if not pendentes:
            for col in ('price_per_km', 'fixed_fee', 'min_distance_km',
                        'max_delivery_fee', 'driver_percentage', 'gamification_percentage'):
                db.session.execute(db.text(
                    "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns "
                    f"WHERE table_name = 'squares' AND column_name = '{col}') "
                    f"THEN ALTER TABLE squares DROP COLUMN {col}; END IF; END $$"
                ))
            db.session.execute(db.text(
                "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns "
                "WHERE table_name = 'pricing_tables' AND column_name = 'gamification_percentage') "
                "THEN ALTER TABLE pricing_tables DROP COLUMN gamification_percentage; END IF; END $$"
            ))
            db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration FASE 2b (2026-11-16): teto de frete nas tabelas sem teto —
    # verdade = display = comportamento (ajustável por tabela no formulário)
    try:
        db.session.execute(db.text(
            "UPDATE pricing_tables SET max_delivery_fee = 50 WHERE max_delivery_fee IS NULL"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: tipos de tabela (2026-11-17) — faixas de km e frete grátis
    try:
        for col_sql in (
            "pricing_mode VARCHAR(20) DEFAULT 'PER_KM'",
            "tier_bands JSONB",
            "free_delivery_min_order NUMERIC(10,2)",
        ):
            col = col_sql.split()[0]
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name = 'pricing_tables' AND column_name = '{col}') "
                f"THEN ALTER TABLE pricing_tables ADD COLUMN {col_sql}; END IF; END $$"
            ))
        db.session.commit()
    except Exception:
        db.session.rollback()
    # Migration: volta + deslocamento (2026-11-18) — S7.4 do plano de monetizacao
    try:
        for col_sql in (
            "round_trip BOOLEAN DEFAULT FALSE",
            "round_trip_rate_per_km NUMERIC(10,2) DEFAULT 0",
            "pickup_rate_per_km NUMERIC(10,2) DEFAULT 0",
        ):
            col = col_sql.split()[0]
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name = 'pricing_tables' AND column_name = '{col}') "
                f"THEN ALTER TABLE pricing_tables ADD COLUMN {col_sql}; END IF; END $$"
            ))
        db.session.commit()
    except Exception:
        db.session.rollback()
    # Migration: multiplicadores por veiculo (2026-11-18) — S7.4 Fase 2
    try:
        for col_sql in (
            "vehicle_multiplier_bike NUMERIC(5,2) DEFAULT 1.0",
            "vehicle_multiplier_moto NUMERIC(5,2) DEFAULT 1.0",
            "vehicle_multiplier_car NUMERIC(5,2) DEFAULT 1.0",
        ):
            col = col_sql.split()[0]
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name = 'pricing_tables' AND column_name = '{col}') "
                f"THEN ALTER TABLE pricing_tables ADD COLUMN {col_sql}; END IF; END $$"
            ))
        db.session.commit()
    except Exception:
        db.session.rollback()
    # Migration: link de ativacao do entregador proprio (2026-11-18)
    try:
        for col_sql in (
            "activation_token VARCHAR(64) UNIQUE",
            "activation_expires_at TIMESTAMP",
            "activation_used_at TIMESTAMP",
        ):
            col = col_sql.split()[0]
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name = 'establishment_drivers' AND column_name = '{col}') "
                f"THEN ALTER TABLE establishment_drivers ADD COLUMN {col_sql}; END IF; END $$"
            ))
        db.session.commit()
    except Exception:
        db.session.rollback()
    # Migration: indices para os caminhos quentes (2026-11-18)
    try:
        for idx_sql in (
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)",
            "CREATE INDEX IF NOT EXISTS idx_customers_user ON customers (user_id)",
            "CREATE INDEX IF NOT EXISTS idx_est_drivers_restaurant ON establishment_drivers (restaurant_id)",
            "CREATE INDEX IF NOT EXISTS idx_est_drivers_phone ON establishment_drivers (phone)",
            "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id)",
            "CREATE INDEX IF NOT EXISTS idx_payments_driver ON payments (driver_id)",
            "CREATE INDEX IF NOT EXISTS idx_pricing_tables_square ON pricing_tables (square_id)",
        ):
            db.session.execute(db.text(idx_sql))
        db.session.commit()
    except Exception:
        db.session.rollback()
    # Migration: token do Link de Pedido Rapido (2026-11-18)
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'restaurants' AND column_name = 'order_link_token') "
            "THEN ALTER TABLE restaurants ADD COLUMN order_link_token VARCHAR(64) UNIQUE; END IF; END $$"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: colunas de evitamento em driver_restaurants (2026-11-18) — G-08
    try:
        for col_sql in (
            "avoidance_active BOOLEAN DEFAULT FALSE",
            "avoidance_source VARCHAR(20)",
            "avoidance_reason VARCHAR(200)",
            "avoidance_created_at TIMESTAMP",
            "avoidance_revoked_at TIMESTAMP",
        ):
            col = col_sql.split()[0]
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name = 'driver_restaurants' AND column_name = '{col}') "
                f"THEN ALTER TABLE driver_restaurants ADD COLUMN {col_sql}; END IF; END $$"
            ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: livro-caixa financeiro imutavel (2026-11-18) — F-11
    try:
        db.session.execute(db.text(
            "CREATE TABLE IF NOT EXISTS financial_ledger ("
            "id SERIAL PRIMARY KEY,"
            "tenant_id INTEGER REFERENCES tenants(id),"
            "occurred_at TIMESTAMP NOT NULL,"
            "created_at TIMESTAMP,"
            "entry_type VARCHAR(10) NOT NULL,"
            "party_type VARCHAR(20) NOT NULL,"
            "party_id INTEGER,"
            "amount NUMERIC(12,2) NOT NULL,"
            "reason VARCHAR(40) NOT NULL,"
            "description VARCHAR(250),"
            "reference_type VARCHAR(30),"
            "reference_id INTEGER,"
            "snapshot JSONB,"
            "dedupe_key VARCHAR(100) UNIQUE"
            ")"
        ))
        for idx_sql in (
            "CREATE INDEX IF NOT EXISTS ix_ledger_party ON financial_ledger (party_type, party_id, occurred_at)",
            "CREATE INDEX IF NOT EXISTS ix_ledger_tenant ON financial_ledger (tenant_id, occurred_at)",
            "CREATE INDEX IF NOT EXISTS ix_ledger_reference ON financial_ledger (reference_type, reference_id)",
        ):
            db.session.execute(db.text(idx_sql))
        db.session.execute(db.text(
            "CREATE OR REPLACE FUNCTION ledger_block_mutation() RETURNS trigger AS $$ "
            "BEGIN RAISE EXCEPTION 'financial_ledger e imutavel: use lancamento de estorno'; END; "
            "$$ LANGUAGE plpgsql"
        ))
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_ledger_immutable') "
            "THEN CREATE TRIGGER trg_ledger_immutable BEFORE UPDATE OR DELETE ON financial_ledger "
            "FOR EACH ROW EXECUTE FUNCTION ledger_block_mutation(); END IF; END $$"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()    # Migration Fase D (2026-11-17): assinatura de 3 termos
    try:
        for tabela, col_sql in (
            ("establishment_subscriptions", "price_per_order NUMERIC(10,2) DEFAULT 0"),
            ("subscription_invoices", "orders_count INTEGER DEFAULT 0"),
            ("subscription_invoices", "price_per_order NUMERIC(10,2)"),
        ):
            col = col_sql.split()[0]
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name = '{tabela}' AND column_name = '{col}') "
                f"THEN ALTER TABLE {tabela} ADD COLUMN {col_sql}; END IF; END $$"
            ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration Fase E (2026-11-17): cobrança MUV → admin (por estabelecimento ativo)
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'tenants' AND column_name = 'asaas_customer_id') "
            "THEN ALTER TABLE tenants ADD COLUMN asaas_customer_id VARCHAR(50); END IF; END $$"
        ))
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS platform_subscriptions (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
                billing_cycle VARCHAR(20) DEFAULT 'MONTHLY',
                price_per_establishment NUMERIC(10,2) DEFAULT 100.00,
                fixed_price NUMERIC(10,2) DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                last_billed_at TIMESTAMP,
                next_billing_at TIMESTAMP,
                total_billed NUMERIC(10,2) DEFAULT 0,
                total_paid NUMERIC(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS platform_invoices (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id) NOT NULL,
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                period_start TIMESTAMP NOT NULL,
                period_end TIMESTAMP NOT NULL,
                establishments_count INTEGER DEFAULT 0,
                price_per_establishment NUMERIC(10,2),
                fixed_price NUMERIC(10,2) DEFAULT 0,
                total_amount NUMERIC(10,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'PENDING',
                due_date TIMESTAMP,
                asaas_invoice_id VARCHAR(100),
                payment_url VARCHAR(500),
                paid_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration motor de cobrança por componentes (2026-11-20) — MUV→admin
    # + escalonamento por faixas (2026-11-22)
    try:
        for col_sql in (
            "establishment_count_mode VARCHAR(20) DEFAULT 'SNAPSHOT'",
            "min_orders_per_establishment INTEGER DEFAULT 1",
            "price_per_order NUMERIC(10,2) DEFAULT 0",
            "orders_included INTEGER DEFAULT 0",
            "order_price_tiers JSON",
        ):
            col = col_sql.split()[0]
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name = 'platform_subscriptions' AND column_name = '{col}') "
                f"THEN ALTER TABLE platform_subscriptions ADD COLUMN {col_sql}; END IF; END $$"
            ))
        for col_sql in (
            "establishment_count_mode VARCHAR(20)",
            "min_orders_per_establishment INTEGER DEFAULT 1",
            "orders_count INTEGER DEFAULT 0",
            "orders_billed INTEGER DEFAULT 0",
            "price_per_order NUMERIC(10,2) DEFAULT 0",
            "orders_included INTEGER DEFAULT 0",
            "order_price_tiers JSON",
            "calculation_detail TEXT",
        ):
            col = col_sql.split()[0]
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name = 'platform_invoices' AND column_name = '{col}') "
                f"THEN ALTER TABLE platform_invoices ADD COLUMN {col_sql}; END IF; END $$"
            ))
        db.session.execute(db.text(
            "ALTER TABLE platform_invoices ALTER COLUMN establishments_count "
            "TYPE NUMERIC(10,2) USING establishments_count::NUMERIC"
        ))
        db.session.execute(db.text(
            "UPDATE platform_subscriptions SET order_price_tiers = json_build_array("
            "json_build_object('upto', COALESCE(orders_included,0), 'price', 0), "
            "json_build_object('upto', NULL, 'price', COALESCE(price_per_order,0))) "
            "WHERE order_price_tiers IS NULL "
            "AND (COALESCE(price_per_order,0) > 0 OR COALESCE(orders_included,0) > 0)"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration distribuição configurável de próprios (2026-11-24)
    try:
        for col_sql in (
            "distribution_mode VARCHAR(20) DEFAULT 'MANUAL'",
            "route_angle_tolerance INTEGER DEFAULT 45",
            "route_max_orders INTEGER DEFAULT 3",
            "route_max_distance_km NUMERIC(6,2) DEFAULT 10.0",
        ):
            col = col_sql.split()[0]
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name = 'restaurants' AND column_name = '{col}') "
                f"THEN ALTER TABLE restaurants ADD COLUMN {col_sql}; END IF; END $$"
            ))
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'orders' AND column_name = 'distribution_log') "
            "THEN ALTER TABLE orders ADD COLUMN distribution_log TEXT; END IF; END $$"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration acerto de retorno (2026-11-24)
    try:
        for col_sql in (
            "settlement_status VARCHAR(20) DEFAULT 'NONE'",
            "settlement_kind VARCHAR(10)",
            "settlement_value NUMERIC(10,2)",
            "pix_proof_url VARCHAR(500)",
            "settled_at TIMESTAMP",
            "settled_note VARCHAR(200)",
        ):
            col = col_sql.split()[0]
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name = 'orders' AND column_name = '{col}') "
                f"THEN ALTER TABLE orders ADD COLUMN {col_sql}; END IF; END $$"
            ))
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'restaurants' AND column_name = 'machine_settlement_mode') "
            "THEN ALTER TABLE restaurants ADD COLUMN machine_settlement_mode VARCHAR(20) DEFAULT 'PER_SHIFT'; END IF; END $$"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: carteira do entregador (balance, locked_balance, pix_key)
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'balance') THEN ALTER TABLE drivers ADD COLUMN balance NUMERIC(10,2) DEFAULT 0; END IF; END $$"
        ))
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'locked_balance') THEN ALTER TABLE drivers ADD COLUMN locked_balance NUMERIC(10,2) DEFAULT 0; END IF; END $$"
        ))
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'pix_key') THEN ALTER TABLE drivers ADD COLUMN pix_key VARCHAR(100); END IF; END $$"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: WITHDRAWAL em payment_type enum
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'WITHDRAWAL' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'paymenttype')) THEN ALTER TYPE paymenttype ADD VALUE 'WITHDRAWAL'; END IF; END $$"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: CANCELLED em payment_status enum
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CANCELLED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'paymentstatus')) THEN ALTER TYPE paymentstatus ADD VALUE 'CANCELLED'; END IF; END $$"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: tabela invoices
    try:
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id),
                restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
                week_start TIMESTAMP NOT NULL,
                week_end TIMESTAMP NOT NULL,
                total_amount NUMERIC(10,2) DEFAULT 0,
                driver_earnings NUMERIC(10,2) DEFAULT 0,
                platform_fee NUMERIC(10,2) DEFAULT 0,
                deliveries_count INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'PENDING',
                paid_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: driver_rating e driver_feedback na tabela deliveries
    try:
        db.session.execute(db.text(
            "ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS driver_rating INTEGER"
        ))
        db.session.execute(db.text(
            "ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS driver_feedback TEXT"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: tornar driver_id nullable para entregadores próprios
    try:
        db.session.execute(db.text(
            "ALTER TABLE deliveries ALTER COLUMN driver_id DROP NOT NULL"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: timestamps para timeline do pedido (Fase 3)
    try:
        for col in ['accepted_at', 'preparing_at', 'ready_at', 'picked_up_at']:
            db.session.execute(db.text(
                f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = '{col}') THEN ALTER TABLE orders ADD COLUMN {col} TIMESTAMP; END IF; END $$"
            ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: campos de avaliação e métricas para entregadores próprios (Fase 4)
    try:
        for col, coltype in [('rating', 'NUMERIC(3,2) DEFAULT 5.00'), ('total_deliveries', 'INTEGER DEFAULT 0'), ('total_ratings', 'INTEGER DEFAULT 0')]:
            db.session.execute(db.text(
                f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'establishment_drivers' AND column_name = '{col}') THEN ALTER TABLE establishment_drivers ADD COLUMN {col} {coltype}; END IF; END $$"
            ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: pin_hash para entregadores próprios (Fase 5 - PWA)
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'establishment_drivers' AND column_name = 'pin_hash') THEN ALTER TABLE establishment_drivers ADD COLUMN pin_hash VARCHAR(128); END IF; END $$"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: aumentar pin_hash para 512 (scrypt hash é maior)
    try:
        db.session.execute(db.text(
            "ALTER TABLE establishment_drivers ALTER COLUMN pin_hash TYPE VARCHAR(512)"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: square_id na tabela orders (Sistema Multi-Praça)
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'square_id') THEN ALTER TABLE orders ADD COLUMN square_id INTEGER REFERENCES squares(id); END IF; END $$"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: tipo de confirmacao de entrega nos estabelecimentos
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'pickup_confirmation_type') THEN ALTER TABLE restaurants ADD COLUMN pickup_confirmation_type VARCHAR(20) DEFAULT 'code'; END IF; END $$"
        ))
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'delivery_confirmation_type') THEN ALTER TABLE restaurants ADD COLUMN delivery_confirmation_type VARCHAR(20) DEFAULT 'code'; END IF; END $$"
        ))
        # Permitir establishment_driver_id nulo em rotas (rotas sem entregador)
        db.session.execute(db.text(
            "ALTER TABLE own_driver_routes ALTER COLUMN establishment_driver_id DROP NOT NULL"
        ))
        # Adicionar coluna own_driver_route_id em orders
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'own_driver_route_id') THEN ALTER TABLE orders ADD COLUMN own_driver_route_id INTEGER REFERENCES own_driver_routes(id); END IF; END $$"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: adicionar campo is_super_admin na tabela users
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_super_admin') THEN ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE NOT NULL; END IF; END $$"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: marcar super admins existentes (admins sem tenant_id)
    try:
        db.session.execute(db.text(
            "UPDATE users SET is_super_admin = TRUE WHERE user_type = 'ADMIN' AND tenant_id IS NULL AND is_super_admin = FALSE"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: soft delete - campos deleted_at e deleted_by
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'deleted_at') THEN ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP; END IF; END $$"
        ))
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'deleted_by') THEN ALTER TABLE users ADD COLUMN deleted_by INTEGER; END IF; END $$"
        ))
        db.session.execute(db.text(
            "CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at)"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: tabelas MuvScore (gamificação)
    try:
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS driver_points_log (
                id SERIAL PRIMARY KEY,
                driver_id INTEGER NOT NULL REFERENCES drivers(id),
                tenant_id INTEGER REFERENCES tenants(id),
                points INTEGER NOT NULL,
                reason VARCHAR(50) NOT NULL,
                order_id INTEGER REFERENCES orders(id),
                description VARCHAR(200),
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        db.session.execute(db.text(
            "CREATE INDEX IF NOT EXISTS ix_points_driver_date ON driver_points_log(driver_id, created_at)"
        ))
        db.session.execute(db.text(
            "CREATE INDEX IF NOT EXISTS ix_points_tenant_date ON driver_points_log(tenant_id, created_at)"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    try:
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS driver_weekly_scores (
                id SERIAL PRIMARY KEY,
                driver_id INTEGER NOT NULL REFERENCES drivers(id),
                tenant_id INTEGER REFERENCES tenants(id),
                square_id INTEGER REFERENCES squares(id),
                week_start DATE NOT NULL,
                week_end DATE NOT NULL,
                total_points INTEGER DEFAULT 0,
                total_deliveries INTEGER DEFAULT 0,
                avg_rating NUMERIC(3,2),
                streak_days INTEGER DEFAULT 0,
                level VARCHAR(20) DEFAULT 'bronze',
                position INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(driver_id, week_start)
            )
        """))
        db.session.execute(db.text(
            "CREATE INDEX IF NOT EXISTS ix_weekly_tenant_week ON driver_weekly_scores(tenant_id, week_start)"
        ))
        db.session.execute(db.text(
            "CREATE INDEX IF NOT EXISTS ix_weekly_square_week ON driver_weekly_scores(square_id, week_start)"
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # Migration: tabelas de dias especiais e horários de pico
    try:
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS special_days (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id),
                date DATE NOT NULL,
                reason VARCHAR(100) NOT NULL,
                multiplier NUMERIC(3,2) DEFAULT 1.50,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(tenant_id, date)
            )
        """))
        db.session.commit()
    except Exception:
        db.session.rollback()

    try:
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS peak_hours (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id),
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                multiplier NUMERIC(3,2) DEFAULT 1.30,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        db.session.commit()
    except Exception:
        db.session.rollback()

    # === Alembic ===
    # As migrações inline acima são o bootstrap histórico (idempotentes).
    # A partir de agora, mudanças de schema DEVEM ir em migrations/ (Alembic).
    try:
        import os as _os

        from alembic import command
        from alembic.config import Config as AlembicConfig
        from sqlalchemy import inspect
        proj_root = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
        alembic_cfg = AlembicConfig(_os.path.join(proj_root, 'alembic.ini'))
        alembic_cfg.set_main_option('script_location', _os.path.join(proj_root, 'migrations'))
        insp = inspect(db.engine)
        if 'alembic_version' not in insp.get_table_names():
            command.stamp(alembic_cfg, 'head')
            print("[Alembic] Baseline marcada (schema inline existente)")
        else:
            command.upgrade(alembic_cfg, 'head')
            print("[Alembic] Migrações novas aplicadas")
    except Exception as e:
        print(f"WARNING: Alembic indisponível: {e}")


