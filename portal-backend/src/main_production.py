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

    # Endpoint temporário para listar todas as rotas do app Flask (fora de Blueprint)
    @app.route('/rotas-teste', methods=['GET'])
    def rotas_teste():
        from flask import current_app
        app_ = current_app._get_current_object()
        rotas = []
        for rule in app_.url_map.iter_rules():
            rotas.append({
                'endpoint': rule.endpoint,
                'methods': list(rule.methods),
                'rule': str(rule)
            })
        return jsonify(rotas=rotas)

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
    # Configurar CORS para todos os métodos e headers, e logar o valor em produção
    print('CORS_ORIGINS:', app.config['CORS_ORIGINS'])
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

    # Criar tabelas do banco de dados
    with app.app_context():
        db.create_all()

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

