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


