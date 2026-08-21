import os
import sys
# DON'T CHANGE: Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
# Force redeploy: 2026-07-25

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from src.models.portal_models import db
from src.config import config

# Importar blueprints
from src.routes.auth import auth_bp
from src.routes.driver import driver_bp
from src.routes.order import order_bp
from src.routes.admin import admin_bp

def create_app(config_name=None):
    
    """Factory function para criar a aplicação Flask"""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')
    

    app = Flask(__name__)

    # Carrega configuração ANTES de qualquer handler que dependa dela
    app.config.from_object(config[config_name])

    # Handler global para garantir headers CORS em todas as respostas
    from flask import request
    @app.after_request
    def after_request(response):
        origin = request.headers.get('Origin')
        allowed_origins = app.config.get('CORS_ORIGINS', [])
        if origin in allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
        return response

    # Inicializar extensões
    db.init_app(app)
    # Configurar CORS
    CORS(
        app,
        origins=app.config['CORS_ORIGINS'],
        supports_credentials=True,
        allow_headers="*",
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )
    jwt = JWTManager(app)
    
    # Registrar blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(driver_bp, url_prefix='/api/driver')
    app.register_blueprint(order_bp, url_prefix='/api/orders')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    from src.routes.webhooks import webhook_bp
    app.register_blueprint(webhook_bp, url_prefix='/api/webhooks')
    
    from src.routes.user import user_bp
    app.register_blueprint(user_bp, url_prefix='/api/user')

    from src.routes.bonus import bonus_bp
    app.register_blueprint(bonus_bp, url_prefix='/api/bonus')

    from src.routes.platform import platform_bp
    app.register_blueprint(platform_bp, url_prefix='/api/platform')

    from src.routes.own_driver import own_driver_bp
    app.register_blueprint(own_driver_bp)

    # Criar tabelas do banco de dados
    with app.app_context():
        _db_available = True
        try:
            db.create_all()
        except Exception as e:
            _db_available = False
            print(f"WARNING: db.create_all() falhou: {e}")
            print("O app vai iniciar, mas rotas que dependem do banco retornarão erro.")

        # Migration: adicionar CLIENT ao enum usertype no PostgreSQL
        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CLIENT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'usertype')) THEN ALTER TYPE usertype ADD VALUE 'CLIENT'; END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: adicionar SCHEDULED ao enum orderstatus no PostgreSQL
        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SCHEDULED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'orderstatus')) THEN ALTER TYPE orderstatus ADD VALUE 'SCHEDULED'; END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: adicionar coluna user_id na tabela customers
        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'user_id') THEN ALTER TABLE customers ADD COLUMN user_id INTEGER REFERENCES users(id); END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: adicionar colunas bancarias na tabela restaurants
        for col in ['bank_name', 'bank_agency', 'bank_account', 'bank_pix_key']:
            try:
                db.session.execute(db.text(
                    f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = '{col}') THEN ALTER TABLE restaurants ADD COLUMN {col} VARCHAR(100); END IF; END $$"
                ))
                db.session.commit()
            except Exception:
                db.session.rollback()

        # Migration: adicionar square_id em restaurants e drivers
        for table in ['restaurants', 'drivers']:
            try:
                db.session.execute(db.text(
                    f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '{table}' AND column_name = 'square_id') THEN ALTER TABLE {table} ADD COLUMN square_id INTEGER REFERENCES squares(id); END IF; END $$"
                ))
                db.session.commit()
            except Exception:
                db.session.rollback()

        # Migration: adicionar max_concurrent_orders em drivers
        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'max_concurrent_orders') THEN ALTER TABLE drivers ADD COLUMN max_concurrent_orders INTEGER DEFAULT 3; END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: adicionar colunas de preco na tabela squares
        for col in ['price_per_km', 'max_delivery_fee', 'min_distance_km', 'driver_percentage']:
            try:
                db.session.execute(db.text(
                    f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'squares' AND column_name = '{col}') THEN ALTER TABLE squares ADD COLUMN {col} NUMERIC(10,2); END IF; END $$"
                ))
                db.session.commit()
            except Exception:
                db.session.rollback()

        # Migration: remover colunas antigas se existirem
        for col in ['min_delivery_fee', 'driver_km_bonus']:
            try:
                db.session.execute(db.text(
                    f"DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'squares' AND column_name = '{col}') THEN ALTER TABLE squares DROP COLUMN {col}; END IF; END $$"
                ))
                db.session.commit()
            except Exception:
                db.session.rollback()

        # Migration: remover unique constraint do phone (permitir duplicata entre tipos)
        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_phone_key') THEN ALTER TABLE users DROP CONSTRAINT users_phone_key; END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: adicionar preparation_minutes na tabela restaurants
        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'preparation_minutes') THEN ALTER TABLE restaurants ADD COLUMN preparation_minutes INTEGER DEFAULT 10; END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: adicionar scheduled_at na tabela orders
        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'scheduled_at') THEN ALTER TABLE orders ADD COLUMN scheduled_at TIMESTAMP; END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: criar tabela tenants (multi-tenant)
        try:
            db.session.execute(db.text("""
                CREATE TABLE IF NOT EXISTS tenants (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(200) NOT NULL,
                    slug VARCHAR(100) UNIQUE NOT NULL,
                    logo_url VARCHAR(500),
                    primary_color VARCHAR(7) DEFAULT '#6366f1',
                    secondary_color VARCHAR(7) DEFAULT '#ffffff',
                    domain VARCHAR(200),
                    phone VARCHAR(20),
                    email VARCHAR(255),
                    address VARCHAR(500),
                    cnpj VARCHAR(18),
                    plan VARCHAR(50) DEFAULT 'free',
                    max_deliveries_month INTEGER DEFAULT 100,
                    max_drivers INTEGER DEFAULT 2,
                    max_clients INTEGER DEFAULT 20,
                    custom_domain VARCHAR(200),
                    terms_url VARCHAR(500),
                    privacy_url VARCHAR(500),
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: adicionar tenant_id nas tabelas principais
        for table in ['users', 'drivers', 'restaurants', 'customers', 'orders', 'squares']:
            try:
                db.session.execute(db.text(
                    f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '{table}' AND column_name = 'tenant_id') THEN ALTER TABLE {table} ADD COLUMN tenant_id INTEGER REFERENCES tenants(id); END IF; END $$"
                ))
                db.session.commit()
            except Exception:
                db.session.rollback()

        # Migration: criar tenant padrão (muvy.log) e migrar dados existentes
        try:
            result = db.session.execute(db.text("SELECT id FROM tenants WHERE slug = 'muvylog'"))
            if not result.fetchone():
                db.session.execute(db.text("""
                    INSERT INTO tenants (name, slug, plan, max_deliveries_month, max_drivers, max_clients)
                    VALUES ('muvy.log', 'muvylog', 'premium', 2000, 100, 100)
                """))
                db.session.commit()
                # Atualizar todos os registros existentes para o tenant padrão
                for table in ['users', 'drivers', 'restaurants', 'customers', 'orders', 'squares']:
                    try:
                        db.session.execute(db.text(
                            f"UPDATE {table} SET tenant_id = (SELECT id FROM tenants WHERE slug = 'muvylog') WHERE tenant_id IS NULL"
                        ))
                        db.session.commit()
                    except Exception:
                        db.session.rollback()
        except Exception:
            db.session.rollback()

        # Migration: adicionar tracking_token e distribution_method na tabela orders
        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'tracking_token') THEN ALTER TABLE orders ADD COLUMN tracking_token VARCHAR(36) UNIQUE; END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'distribution_method') THEN ALTER TABLE orders ADD COLUMN distribution_method VARCHAR(20) DEFAULT 'nearest'; END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: adicionar campos de fila na tabela drivers
        for col in ['queue_position', 'total_orders_today']:
            try:
                db.session.execute(db.text(
                    f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = '{col}') THEN ALTER TABLE drivers ADD COLUMN {col} INTEGER DEFAULT 0; END IF; END $$"
                ))
                db.session.commit()
            except Exception:
                db.session.rollback()

        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'last_order_at') THEN ALTER TABLE drivers ADD COLUMN last_order_at TIMESTAMP; END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: criar tabela delivery_routes (multi-parada)
        try:
            db.session.execute(db.text("""
                CREATE TABLE IF NOT EXISTS delivery_routes (
                    id SERIAL PRIMARY KEY,
                    tenant_id INTEGER REFERENCES tenants(id),
                    driver_id INTEGER REFERENCES drivers(id),
                    route_number VARCHAR(50) UNIQUE NOT NULL,
                    status VARCHAR(20) DEFAULT 'pending',
                    total_stops INTEGER DEFAULT 0,
                    completed_stops INTEGER DEFAULT 0,
                    total_distance_km NUMERIC(8,2),
                    estimated_duration_minutes INTEGER,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: adicionar route_id e stop_number na tabela orders
        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'route_id') THEN ALTER TABLE orders ADD COLUMN route_id INTEGER REFERENCES delivery_routes(id); END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'stop_number') THEN ALTER TABLE orders ADD COLUMN stop_number INTEGER; END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: tabelas de bonus e ranking
        try:
            db.session.execute(db.text("""
                CREATE TABLE IF NOT EXISTS driver_scores (
                    id SERIAL PRIMARY KEY,
                    driver_id INTEGER REFERENCES drivers(id),
                    period VARCHAR(20) NOT NULL,
                    accept_time_avg NUMERIC(5,2) DEFAULT 0,
                    delivery_time_avg NUMERIC(5,2) DEFAULT 0,
                    acceptance_rate NUMERIC(5,2) DEFAULT 100,
                    avg_rating NUMERIC(3,2) DEFAULT 5.0,
                    hours_online NUMERIC(5,2) DEFAULT 0,
                    total_deliveries INTEGER DEFAULT 0,
                    total_refused INTEGER DEFAULT 0,
                    total_score NUMERIC(10,2) DEFAULT 0,
                    ranking_position INTEGER,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """))
            db.session.execute(db.text("""
                CREATE TABLE IF NOT EXISTS driver_bonuses (
                    id SERIAL PRIMARY KEY,
                    driver_id INTEGER REFERENCES drivers(id),
                    amount NUMERIC(10,2) NOT NULL,
                    bonus_type VARCHAR(50) NOT NULL,
                    criteria VARCHAR(100),
                    period_start DATE,
                    period_end DATE,
                    status VARCHAR(20) DEFAULT 'PENDING',
                    paid_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """))
            db.session.execute(db.text("""
                CREATE TABLE IF NOT EXISTS driver_achievements (
                    id SERIAL PRIMARY KEY,
                    driver_id INTEGER REFERENCES drivers(id),
                    achievement_type VARCHAR(50) NOT NULL,
                    achievement_name VARCHAR(100) NOT NULL,
                    unlocked_at TIMESTAMP DEFAULT NOW()
                )
            """))
            db.session.execute(db.text("""
                CREATE TABLE IF NOT EXISTS dynamic_pricing (
                    id SERIAL PRIMARY KEY,
                    square_id INTEGER REFERENCES squares(id),
                    rainy_day_active BOOLEAN DEFAULT FALSE,
                    rainy_day_bonus NUMERIC(10,2) DEFAULT 3.00,
                    high_demand_active BOOLEAN DEFAULT FALSE,
                    high_demand_threshold INTEGER DEFAULT 5,
                    high_demand_bonus NUMERIC(10,2) DEFAULT 2.00,
                    holiday_active BOOLEAN DEFAULT FALSE,
                    holiday_bonus NUMERIC(10,2) DEFAULT 5.00,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: cancellation_fee em dynamic_pricing
        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dynamic_pricing' AND column_name = 'cancellation_fee_active') THEN ALTER TABLE dynamic_pricing ADD COLUMN cancellation_fee_active BOOLEAN DEFAULT FALSE; END IF; END $$"
            ))
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dynamic_pricing' AND column_name = 'cancellation_fee') THEN ALTER TABLE dynamic_pricing ADD COLUMN cancellation_fee NUMERIC(10,2) DEFAULT 5.00; END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: asaas_customer_id em restaurants
        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'asaas_customer_id') THEN ALTER TABLE restaurants ADD COLUMN asaas_customer_id VARCHAR(50); END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: external_id e platform_source em orders
        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'external_id') THEN ALTER TABLE orders ADD COLUMN external_id VARCHAR(100); END IF; END $$"
            ))
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'platform_source') THEN ALTER TABLE orders ADD COLUMN platform_source VARCHAR(20); END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: pickup_code e delivery_code em orders
        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'pickup_code') THEN ALTER TABLE orders ADD COLUMN pickup_code VARCHAR(6); END IF; END $$"
            ))
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_code') THEN ALTER TABLE orders ADD COLUMN delivery_code VARCHAR(6); END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: tabela platform_credentials
        try:
            db.session.execute(db.text("""
                CREATE TABLE IF NOT EXISTS platform_credentials (
                    id SERIAL PRIMARY KEY,
                    restaurant_id INTEGER REFERENCES restaurants(id),
                    platform VARCHAR(20) NOT NULL,
                    client_id VARCHAR(200),
                    client_secret VARCHAR(200),
                    access_token TEXT,
                    refresh_token TEXT,
                    expires_at TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: tabela driver_restaurants
        try:
            db.session.execute(db.text("""
                CREATE TABLE IF NOT EXISTS driver_restaurants (
                    id SERIAL PRIMARY KEY,
                    driver_id INTEGER REFERENCES drivers(id),
                    restaurant_id INTEGER REFERENCES restaurants(id),
                    is_priority BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(driver_id, restaurant_id)
                )
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: campos de penalidade em drivers
        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'rejection_count') THEN ALTER TABLE drivers ADD COLUMN rejection_count INTEGER DEFAULT 0; END IF; END $$"
            ))
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'is_blocked') THEN ALTER TABLE drivers ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE; END IF; END $$"
            ))
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'blocked_until') THEN ALTER TABLE drivers ADD COLUMN blocked_until TIMESTAMP; END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: tabela driver_penalties
        try:
            db.session.execute(db.text("""
                CREATE TABLE IF NOT EXISTS driver_penalties (
                    id SERIAL PRIMARY KEY,
                    driver_id INTEGER REFERENCES drivers(id),
                    order_id INTEGER REFERENCES orders(id),
                    penalty_type VARCHAR(50) NOT NULL,
                    reason VARCHAR(500),
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: tabela establishment_drivers
        try:
            db.session.execute(db.text("""
                CREATE TABLE IF NOT EXISTS establishment_drivers (
                    id SERIAL PRIMARY KEY,
                    restaurant_id INTEGER REFERENCES restaurants(id),
                    name VARCHAR(200) NOT NULL,
                    phone VARCHAR(20),
                    vehicle_type VARCHAR(20),
                    vehicle_plate VARCHAR(10),
                    vehicle_model VARCHAR(100),
                    is_online BOOLEAN DEFAULT FALSE,
                    current_latitude NUMERIC(10,8),
                    current_longitude NUMERIC(11,8),
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: campos de entregadores próprios em restaurants
        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'has_own_drivers') THEN ALTER TABLE restaurants ADD COLUMN has_own_drivers BOOLEAN DEFAULT FALSE; END IF; END $$"
            ))
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'subscription_type') THEN ALTER TABLE restaurants ADD COLUMN subscription_type VARCHAR(20); END IF; END $$"
            ))
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'subscription_expires_at') THEN ALTER TABLE restaurants ADD COLUMN subscription_expires_at TIMESTAMP; END IF; END $$"
            ))
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'platform_pricing_table_id') THEN ALTER TABLE restaurants ADD COLUMN platform_pricing_table_id INTEGER REFERENCES pricing_tables(id); END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: campos de entregadores próprios em orders
        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'assigned_to_own_driver') THEN ALTER TABLE orders ADD COLUMN assigned_to_own_driver BOOLEAN DEFAULT FALSE; END IF; END $$"
            ))
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'establishment_driver_id') THEN ALTER TABLE orders ADD COLUMN establishment_driver_id INTEGER REFERENCES establishment_drivers(id); END IF; END $$"
            ))
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'called_platform') THEN ALTER TABLE orders ADD COLUMN called_platform BOOLEAN DEFAULT FALSE; END IF; END $$"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Migration: configuração de pagamento para entregadores próprios
        try:
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'own_driver_payment_type') THEN ALTER TABLE restaurants ADD COLUMN own_driver_payment_type VARCHAR(20) DEFAULT 'PER_DELIVERY'; END IF; END $$"
            ))
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'own_driver_fixed_value') THEN ALTER TABLE restaurants ADD COLUMN own_driver_fixed_value NUMERIC(10,2) DEFAULT 5.00; END IF; END $$"
            ))
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'own_driver_km_value') THEN ALTER TABLE restaurants ADD COLUMN own_driver_km_value NUMERIC(10,2) DEFAULT 1.50; END IF; END $$"
            ))
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'own_driver_percentage') THEN ALTER TABLE restaurants ADD COLUMN own_driver_percentage NUMERIC(5,2) DEFAULT 70.0; END IF; END $$"
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
                    payment_type VARCHAR(20),
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
            db.session.commit()
        except Exception:
            db.session.rollback()

    # Iniciar background tasks (process_expired_offers, process_scheduled_orders)
    from src.utils.background_tasks import start_background_tasks
    start_background_tasks(app)

    # Endpoint de health check
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """Endpoint de verificação de saúde da API"""
        return jsonify({
            'status': 'healthy',
            'message': 'Portal API is running',
            'environment': config_name
        })
    
    # Handler para erros JWT
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token expirado'}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': 'Token inválido'}), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': 'Token de acesso necessário'}), 401
    
    # Servir arquivos de upload (prova de entrega)
    @app.route('/uploads/proofs/<path:filename>')
    def serve_proof(filename):
        uploads_dir = os.path.join(os.path.dirname(__file__), 'uploads', 'proofs')
        if os.path.exists(os.path.join(uploads_dir, filename)):
            return send_from_directory(uploads_dir, filename)
        return jsonify({'error': 'Arquivo não encontrado'}), 404
    
    return app

# Criar aplicação
app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    app.run(host=host, port=port, debug=debug)

