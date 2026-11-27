import os
import sys

# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required

# Carrega variáveis de ambiente
load_dotenv()

# Importa modelos e rotas
from src.models.portal_models import db
from src.routes.admin import admin_bp
from src.routes.auth import auth_bp
from src.routes.driver import driver_bp
from src.routes.webhooks import webhook_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.url_map.strict_slashes = False

# Configurações
flask_env = os.getenv('FLASK_ENV', 'development')
secret_key = os.getenv('SECRET_KEY')
jwt_secret_key = os.getenv('JWT_SECRET_KEY')

# Em produção, segredos são obrigatórios (falhar fechado)
if flask_env == 'production':
    if not secret_key or secret_key in ('dev-secret-key-change-in-production', ''):
        raise RuntimeError("FATAL: SECRET_KEY deve ser definida em produção. Defina a variável de ambiente SECRET_KEY.")
    if not jwt_secret_key or jwt_secret_key in ('jwt-secret-key-change-in-production', ''):
        raise RuntimeError("FATAL: JWT_SECRET_KEY deve ser definida em produção. Defina a variável de ambiente JWT_SECRET_KEY.")

app.config['SECRET_KEY'] = secret_key or 'dev-secret-key-local-nao-usar-em-producao'
app.config['JWT_SECRET_KEY'] = jwt_secret_key or 'dev-jwt-secret-key-local-nao-usar-em-producao'

# Token JWT: 8h (mesmo valor de config.py — fonte única)
from datetime import timedelta

app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=4)  # SEGURANÇA: reduzido de 8h para 4h

# Configuração do banco de dados
database_url = os.getenv('DATABASE_URL', f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}")
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False


# Inicializa extensões
jwt = JWTManager(app)

# Portão central de status: bloqueia tokens de usuários INACTIVE/SUSPENDED/deletados
# em TODAS as rotas @jwt_required() (ver src/utils/tenant.py)
from src.utils.tenant import register_status_jwt_gate

register_status_jwt_gate(jwt)

# Rate Limiting: protege contra abuso
from src.utils.rate_limit import limiter

limiter.init_app(app)

# CORS centralizado (F-13): fonte única em src/utils/cors.py + config.CORS_ORIGINS
from src.utils.cors import init_cors

init_cors(app, flask_env)

# Alembic (Flask-Migrate) — `flask db ...` via FLASK_APP; migrations/env.py
# lê current_app.extensions['migrate']. Consolidação 2026-11-24 (lição 34):
# antes só o main_production.py (morto) registrava isto.
from flask_migrate import Migrate

Migrate(app, db, compare_type=True)

# Registra blueprints
from src.routes.admin_activity import admin_activity_bp
from src.routes.admin_avoidances import admin_avoidances_bp
from src.routes.admin_ledger import admin_ledger_bp
app.register_blueprint(admin_ledger_bp, url_prefix='/api/admin')
app.register_blueprint(admin_avoidances_bp, url_prefix='/api/admin')
from src.routes.order_link import order_link_bp
app.register_blueprint(order_link_bp, url_prefix='/api')
app.register_blueprint(admin_activity_bp, url_prefix='/api/admin')
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(driver_bp, url_prefix='/api/driver')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(webhook_bp, url_prefix='/api/webhooks')

# Webhooks do iFood (extraído de webhooks.py)
from src.routes.webhooks_ifood import webhooks_ifood_bp

app.register_blueprint(webhooks_ifood_bp, url_prefix='/api/webhooks')

# Robô do WhatsApp (extraído de webhooks.py)
from src.routes.webhooks_whatsapp import webhooks_whatsapp_bp

app.register_blueprint(webhooks_whatsapp_bp, url_prefix='/api/webhooks')

# Parceiros 99Food/InstaDelivery/Saipos (extraído de webhooks.py)
from src.routes.webhooks_partners import webhooks_partners_bp

app.register_blueprint(webhooks_partners_bp, url_prefix='/api/webhooks')

# Pagamentos Asaas (extraído de webhooks.py)
from src.routes.webhooks_payments import webhooks_payments_bp

app.register_blueprint(webhooks_payments_bp, url_prefix='/api/webhooks')

# Ferramentas de banco/limpeza (extraído de admin.py)
from src.routes.admin_database import admin_database_bp

app.register_blueprint(admin_database_bp, url_prefix='/api/admin')

# Credenciais e atribuições (extraído de admin.py)
from src.routes.admin_integrations import admin_integrations_bp

app.register_blueprint(admin_integrations_bp, url_prefix='/api/admin')

# Exportação/importação CSV (extraído de admin.py)
from src.routes.admin_exports import admin_exports_bp

app.register_blueprint(admin_exports_bp, url_prefix='/api/admin')

# Pagamentos a entregadores e saques (extraído de admin_payments.py)
from src.routes.admin_driver_payments import admin_driver_payments_bp

app.register_blueprint(admin_driver_payments_bp, url_prefix='/api/admin')

# Geração de faturas (extraído de admin_payments.py)
from src.routes.admin_invoices import admin_invoices_bp

app.register_blueprint(admin_invoices_bp, url_prefix='/api/admin')

# Cobrança de faturas (extraído de admin_payments.py)
from src.routes.admin_invoice_billing import admin_invoice_billing_bp

app.register_blueprint(admin_invoice_billing_bp, url_prefix='/api/admin')

# Finance routes (extraído de admin.py)
from src.routes.admin_finance import admin_finance_bp

app.register_blueprint(admin_finance_bp, url_prefix='/api/admin')

# Drivers routes (extraído de admin.py)
from src.routes.admin_drivers import admin_drivers_bp

app.register_blueprint(admin_drivers_bp, url_prefix='/api/admin')

# Entregadores próprios — cadastro (extraído de admin_establishment_drivers.py)
from src.routes.admin_est_drivers_crud import admin_est_drivers_crud_bp

app.register_blueprint(admin_est_drivers_crud_bp, url_prefix='/api/admin')

# Entregadores próprios — pagamentos e métricas (extraído de admin_establishment_drivers.py)
from src.routes.admin_est_drivers_pay import admin_est_drivers_pay_bp

app.register_blueprint(admin_est_drivers_pay_bp, url_prefix='/api/admin')

# Gestão de usuários do admin (extraído de admin_orders.py)
from src.routes.admin_users import admin_users_bp

app.register_blueprint(admin_users_bp, url_prefix='/api/admin')

# Dashboard e edição de pedidos do admin (extraído de admin_orders.py)
from src.routes.admin_dashboard import admin_dashboard_bp

app.register_blueprint(admin_dashboard_bp, url_prefix='/api/admin')

# Rotas do usuário em pedidos (extraído de order.py)
from src.routes.order_my import order_my_bp

app.register_blueprint(order_my_bp, url_prefix='/api/orders')

# Estabelecimentos (extraído de admin_finance.py)
from src.routes.admin_establishments import admin_establishments_bp

app.register_blueprint(admin_establishments_bp, url_prefix='/api/admin')

# Relatórios (extraído de admin_finance.py)
from src.routes.admin_reports import admin_reports_bp

app.register_blueprint(admin_reports_bp, url_prefix='/api/admin')

# Preços e configurações (extraído de admin_finance.py)
from src.routes.admin_pricing import admin_pricing_bp

app.register_blueprint(admin_pricing_bp, url_prefix='/api/admin')

# Tenants e praças (extraído de admin_finance.py)
from src.routes.admin_tenants_squares import admin_tenants_squares_bp

app.register_blueprint(admin_tenants_squares_bp, url_prefix='/api/admin')

# Usuários removidos, retenção e Asaas (extraído de admin_finance.py)
from src.routes.admin_users_softdelete import admin_users_softdelete_bp

app.register_blueprint(admin_users_softdelete_bp, url_prefix='/api/admin')

# Rastreio ao vivo (extraído de admin_finance.py)
from src.routes.admin_live_tracking import admin_live_tracking_bp

app.register_blueprint(admin_live_tracking_bp, url_prefix='/api/admin')

# Gestão de rotas de entrega (extraído de order.py)
from src.routes.order_delivery_routes import order_delivery_routes_bp

app.register_blueprint(order_delivery_routes_bp, url_prefix='/api/orders')

# Ofertas, aceite e atribuição (extraído de order.py)
from src.routes.order_acceptance import order_acceptance_bp

app.register_blueprint(order_acceptance_bp, url_prefix='/api/orders')

# Criação e mudanças de estado (extraído de order.py)
from src.routes.order_lifecycle import order_lifecycle_bp

app.register_blueprint(order_lifecycle_bp, url_prefix='/api/orders')

# Consultas de pedidos (extraído de order.py)
from src.routes.order_queries import order_queries_bp

app.register_blueprint(order_queries_bp, url_prefix='/api/orders')

from src.routes.user import user_bp

app.register_blueprint(user_bp, url_prefix='/api/user')

from src.routes.bonus import bonus_bp

app.register_blueprint(bonus_bp, url_prefix='/api/bonus')

from src.routes.muvscore import muvscore_bp

app.register_blueprint(muvscore_bp, url_prefix='/api/muvscore')

from src.routes.platform import platform_bp

app.register_blueprint(platform_bp, url_prefix='/api/platform')

# Cobrança MUV → admin (Fase E) — super admin
from src.routes.platform_billing import platform_billing_bp

app.register_blueprint(platform_billing_bp, url_prefix='/api/platform')

# WhatsApp Business API (Fase 1 — 2026-11-25)
from src.routes.whatsapp_config import whatsapp_config_bp
from src.routes.whatsapp_webhook import whatsapp_webhook_bp
from src.routes.whatsapp_catalog import whatsapp_catalog_bp
app.register_blueprint(whatsapp_config_bp, url_prefix='/api')
app.register_blueprint(whatsapp_webhook_bp, url_prefix='/api')
app.register_blueprint(whatsapp_catalog_bp, url_prefix='/api')

from src.routes.own_driver import own_driver_bp

app.register_blueprint(own_driver_bp)

from src.routes.route_settings import route_settings_bp

app.register_blueprint(route_settings_bp)

from src.routes.platform_routes import platform_routes_bp

app.register_blueprint(platform_routes_bp)

# Rotas de entrega — gestão (extraído de route.py)
from src.routes.route_management import route_management_bp

app.register_blueprint(route_management_bp)

# Rotas de entrega — entregador (extraído de route.py)
from src.routes.route_driver import route_driver_bp

app.register_blueprint(route_driver_bp)

# Rotas de entrega — plataforma (extraído de route.py)
from src.routes.route_platform import route_platform_bp

app.register_blueprint(route_platform_bp)

# Financeiro — pagamentos (extraído de finance.py)
from src.routes.finance_payments import finance_payments_bp

app.register_blueprint(finance_payments_bp)

# Financeiro — faturas e assinaturas (extraído de finance.py)
from src.routes.finance_billing import finance_billing_bp

app.register_blueprint(finance_billing_bp)

# Inicializa banco de dados
db.init_app(app)
with app.app_context():
    db.create_all()

    # Migration: adicionar campo is_super_admin na tabela users
    try:
        # Detecta o tipo de banco e usa a sintaxe correta
        dialect = db.engine.dialect.name
        if dialect == 'sqlite':
            result = db.session.execute(db.text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result.fetchall()]
        else:
            # PostgreSQL: consulta information_schema
            result = db.session.execute(db.text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
            ))
            columns = [row[0] for row in result.fetchall()]

        if 'is_super_admin' not in columns:
            db.session.execute(db.text("ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE NOT NULL"))
            db.session.commit()
            print("Coluna is_super_admin adicionada à tabela users")

            # Marcar super admins existentes (admins sem tenant_id)
            db.session.execute(db.text(
                "UPDATE users SET is_super_admin = TRUE WHERE user_type = 'ADMIN' AND tenant_id IS NULL"
            ))
            db.session.commit()
            print("Super admins existentes atualizados")
    except Exception as e:
        print(f"Migração is_super_admin: {e}")
        db.session.rollback()

    # Migration: adicionar campos 2FA na tabela users
    try:
        dialect = db.engine.dialect.name
        if dialect == 'sqlite':
            result = db.session.execute(db.text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result.fetchall()]
        else:
            result = db.session.execute(db.text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
            ))
            columns = [row[0] for row in result.fetchall()]

        if 'totp_secret' not in columns:
            db.session.execute(db.text("ALTER TABLE users ADD COLUMN totp_secret VARCHAR(32)"))
            db.session.commit()
            print("Coluna totp_secret adicionada à tabela users")

        if 'totp_enabled' not in columns:
            db.session.execute(db.text("ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN DEFAULT FALSE"))
            db.session.commit()
            print("Coluna totp_enabled adicionada à tabela users")
    except Exception as e:
        print(f"Migração 2FA: {e}")
        db.session.rollback()

    # Migration: adicionar fixed_fee em pricing_tables (squares NÃO — Fase 2
    # de preços removeu as colunas de preço da praça de propósito)
    try:
        for table in ['pricing_tables']:
            if dialect == 'sqlite':
                result = db.session.execute(db.text(f"PRAGMA table_info({table})"))
                cols = [row[1] for row in result.fetchall()]
            else:
                result = db.session.execute(db.text(
                    f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'"
                ))
                cols = [row[0] for row in result.fetchall()]

            if 'fixed_fee' not in cols:
                db.session.execute(db.text(f"ALTER TABLE {table} ADD COLUMN fixed_fee NUMERIC(10,2) DEFAULT 0"))
                db.session.commit()
                print(f"Coluna fixed_fee adicionada à tabela {table}")
    except Exception as e:
        print(f"Migração fixed_fee: {e}")
        db.session.rollback()

    # Migration: external_merchant_id em restaurants (iFood)
    try:
        dialect = db.engine.dialect.name
        if dialect == 'sqlite':
            result = db.session.execute(db.text("PRAGMA table_info(restaurants)"))
            columns = [row[1] for row in result.fetchall()]
        else:
            result = db.session.execute(db.text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'restaurants'"
            ))
            columns = [row[0] for row in result.fetchall()]

        if 'external_merchant_id' not in columns:
            db.session.execute(db.text("ALTER TABLE restaurants ADD COLUMN external_merchant_id VARCHAR(100)"))
            db.session.commit()
            print("Coluna external_merchant_id adicionada à tabela restaurants")
    except Exception as e:
        print(f"Migração external_merchant_id: {e}")
        db.session.rollback()

    # Migration FASE 1 DE PREÇOS (2026-11-16): valores vivem só em pricing_tables;
    # a praça apenas INDICA a tabela padrão (default_pricing_table_id)
    try:
        dialect = db.engine.dialect.name
        if dialect == 'sqlite':
            result = db.session.execute(db.text("PRAGMA table_info(squares)"))
            columns = [row[1] for row in result.fetchall()]
        else:
            result = db.session.execute(db.text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'squares'"
            ))
            columns = [row[0] for row in result.fetchall()]

        if 'default_pricing_table_id' not in columns:
            db.session.execute(db.text("ALTER TABLE squares ADD COLUMN default_pricing_table_id INTEGER"))
            db.session.commit()
            print("Coluna default_pricing_table_id adicionada à tabela squares")

        # Data-fix idempotente: praça sem tabela padrão ganha "Padrão — <nome>"
        # copiando os valores LEGADOS da praça (preço observado não muda).
        # min/max_delivery_fee NULL de propósito: o caminho antigo (praça) nunca
        # aplicou piso/teto — manter sem clamp preserva o frete observado.
        # Só roda se as colunas legadas ainda existem (banco novo já nasce sem)
        if dialect != 'sqlite' and 'price_per_km' in columns:
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
            print("Tabelas padrão de preços criadas/ligadas para as praças")
    except Exception as e:
        print(f"Migração Fase 1 de preços: {e}")
        db.session.rollback()

    # Migration FASE 2 DE PREÇOS (2026-11-16): drop das colunas legadas.
    # - squares: os 6 campos de preço morrem (valores vivem em pricing_tables)
    # - gamification_percentage: morre em squares E pricing_tables — a fonte do
    #   MuvScore é o SystemConfig (Configurações → Preços), que já é lido hoje
    # Só derruba se toda praça já tiver tabela padrão (nenhum preço se perde).
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
            print("Fase 2 de preços: colunas legadas removidas (squares) e gamification consolidado no SystemConfig")
    except Exception as e:
        print(f"Migração Fase 2 de preços: {e}")
        db.session.rollback()

    # Migration FASE 2b (2026-11-16): teto de frete nas tabelas sem teto.
    # As tabelas migradas da praça ficaram com max_delivery_fee NULL (sem teto);
    # o teto agora vive e VALE dentro da tabela de preços — aplica o padrão 50
    # para verdade = display = comportamento (ajustável por tabela no formulário).
    try:
        db.session.execute(db.text(
            "UPDATE pricing_tables SET max_delivery_fee = 50 WHERE max_delivery_fee IS NULL"
        ))
        db.session.commit()
        print("Teto de frete (R$ 50) aplicado em tabelas sem teto")
    except Exception as e:
        print(f"Migração Fase 2b de preços: {e}")
        db.session.rollback()

    # Migration: tipos de tabela (2026-11-17) — faixas de km (sem volta) e
    # frete grátis (ver docs/PLAN_MONETIZACAO_ENTREGAS_PROPRIAS.md §7.1)
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
        print("Colunas de tipo de tabela adicionadas (pricing_mode/tier_bands/free_delivery_min_order)")
    except Exception as e:
        print(f"Migração tipos de tabela: {e}")
        db.session.rollback()
    # Migration: volta + deslocamento (2026-11-18) — S7.4 do plano de monetizacao
    # (round_trip = considerar a volta com taxa propria R$/km; pickup_rate = deslocamento ate a coleta)
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
        print("Colunas de volta/deslocamento adicionadas (round_trip/round_trip_rate_per_km/pickup_rate_per_km)")
    except Exception as e:
        print(f"Migração volta/deslocamento: {e}")
        db.session.rollback()
    # Migration: pagamento do motorista PLATAFORMA configurável (2026-11-24)
    # — mandato "tudo configurável": admin escolhe entre os 7 modelos
    try:
        for col_sql in (
            "platform_payment_type VARCHAR(30) DEFAULT 'PERCENTAGE'",
            "platform_fixed_value NUMERIC(10,2) DEFAULT 5.00",
            "platform_km_value NUMERIC(10,2) DEFAULT 1.50",
            "platform_delivery_value NUMERIC(10,2) DEFAULT 3.00",
            "platform_max_deliveries INTEGER DEFAULT 10",
        ):
            col = col_sql.split()[0]
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name = 'pricing_tables' AND column_name = '{col}') "
                f"THEN ALTER TABLE pricing_tables ADD COLUMN {col_sql}; END IF; END $$"
            ))
        db.session.commit()
        print("Colunas de pagamento plataforma adicionadas (platform_payment_type/fixed_value/km_value/delivery_value/max_deliveries)")
    except Exception as e:
        print(f"Migração pagamento plataforma: {e}")
        db.session.rollback()
    # Migration: FCM token para entregadores próprios (2026-11-25)
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'establishment_drivers' AND column_name = 'fcm_token') "
            "THEN ALTER TABLE establishment_drivers ADD COLUMN fcm_token VARCHAR(512); END IF; END $$"
        ))
        db.session.commit()
        print("Coluna fcm_token adicionada a establishment_drivers")
    except Exception as e:
        print(f"Migração fcm_token: {e}")
        db.session.rollback()
    # Migration: WhatsApp Business API — credenciais e mensagens (Fase 1, 2026-11-25)
    try:
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS whatsapp_credentials (
                id SERIAL PRIMARY KEY,
                restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) UNIQUE,
                phone_number_id VARCHAR(100),
                access_token VARCHAR(512),
                business_account_id VARCHAR(100),
                verify_token VARCHAR(100),
                enabled BOOLEAN DEFAULT FALSE,
                notify_customer BOOLEAN DEFAULT TRUE,
                notify_establishment BOOLEAN DEFAULT TRUE,
                accept_orders BOOLEAN DEFAULT TRUE,
                auto_confirm BOOLEAN DEFAULT FALSE,
                welcome_message TEXT,
                business_hours_start VARCHAR(5),
                business_hours_end VARCHAR(5),
                off_hours_message TEXT,
                quiet_hours_start VARCHAR(5),
                quiet_hours_end VARCHAR(5),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS whatsapp_messages (
                id SERIAL PRIMARY KEY,
                restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
                direction VARCHAR(10),
                from_number VARCHAR(20),
                to_number VARCHAR(20),
                message_type VARCHAR(20),
                content TEXT,
                status VARCHAR(20),
                error TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db.session.commit()
        print("Tabelas WhatsApp criadas (whatsapp_credentials, whatsapp_messages)")
    except Exception as e:
        print(f"Migração WhatsApp: {e}")
        db.session.rollback()
    # Migration: WhatsApp Fase 3 — produtos + sessões de pedido (2026-11-25)
    try:
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS whatsapp_products (
                id SERIAL PRIMARY KEY,
                restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
                category VARCHAR(100) DEFAULT 'Geral',
                name VARCHAR(200) NOT NULL,
                description TEXT,
                price NUMERIC(10,2) NOT NULL,
                image_url VARCHAR(500),
                is_active BOOLEAN DEFAULT TRUE,
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db.session.execute(db.text("""
            CREATE TABLE IF NOT EXISTS whatsapp_order_sessions (
                id SERIAL PRIMARY KEY,
                restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
                customer_phone VARCHAR(20) NOT NULL,
                step VARCHAR(20) DEFAULT 'BROWSING',
                cart JSON DEFAULT '[]',
                delivery_address TEXT,
                delivery_lat NUMERIC(10,8),
                delivery_lng NUMERIC(11,8),
                notes TEXT,
                order_id INTEGER,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db.session.commit()
        print("Tabelas WhatsApp Fase 3 criadas (whatsapp_products, whatsapp_order_sessions)")
    except Exception as e:
        print(f"Migração WhatsApp Fase 3: {e}")
        db.session.rollback()
    # Migration: Meta Catalog sync (opção configurável — 2026-11-25)
    try:
        for col_sql in (
            "sync_to_meta_catalog BOOLEAN DEFAULT FALSE",
            "catalog_id VARCHAR(100)",
        ):
            col = col_sql.split()[0]
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name = 'whatsapp_credentials' AND column_name = '{col}') "
                f"THEN ALTER TABLE whatsapp_credentials ADD COLUMN {col_sql}; END IF; END $$"
            ))
        db.session.commit()
        print("Colunas Meta Catalog adicionadas (sync_to_meta_catalog, catalog_id)")
    except Exception as e:
        print(f"Migração Meta Catalog: {e}")
        db.session.rollback()
    # Migration: WhatsApp Fase 4 — endereço + GPS (configurável)
    try:
        for col_sql in (
            "accept_gps BOOLEAN DEFAULT TRUE",
            "accept_text_address BOOLEAN DEFAULT TRUE",
            "confirm_address BOOLEAN DEFAULT TRUE",
            "max_delivery_km NUMERIC(6,2) DEFAULT 0",
        ):
            col = col_sql.split()[0]
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name = 'whatsapp_credentials' AND column_name = '{col}') "
                f"THEN ALTER TABLE whatsapp_credentials ADD COLUMN {col_sql}; END IF; END $$"
            ))
        db.session.commit()
        print("Colunas WhatsApp Fase 4 adicionadas (accept_gps, accept_text_address, confirm_address, max_delivery_km)")
    except Exception as e:
        print(f"Migração WhatsApp Fase 4: {e}")
        db.session.rollback()
    # Migration: WhatsApp Fase 5 — pagamento + polimento (configurável)
    try:
        for col_sql in (
            "accept_pix BOOLEAN DEFAULT TRUE",
            "accept_cash BOOLEAN DEFAULT TRUE",
            "accept_card BOOLEAN DEFAULT TRUE",
            "quick_reorder BOOLEAN DEFAULT TRUE",
            "post_delivery_rating BOOLEAN DEFAULT TRUE",
        ):
            col = col_sql.split()[0]
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name = 'whatsapp_credentials' AND column_name = '{col}') "
                f"THEN ALTER TABLE whatsapp_credentials ADD COLUMN {col_sql}; END IF; END $$"
            ))
        db.session.commit()
        print("Colunas WhatsApp Fase 5 adicionadas (accept_pix, accept_cash, accept_card, quick_reorder, post_delivery_rating)")
    except Exception as e:
        print(f"Migração WhatsApp Fase 5: {e}")
        db.session.rollback()
    # Migration: WhatsApp Fase 6 — bot de atendimento (configurável)
    try:
        for col_sql in (
            "chatbot_enabled BOOLEAN DEFAULT TRUE",
            "chatbot_menu_items JSON",
            "chatbot_faq JSON",
            "chatbot_transfer_to_human BOOLEAN DEFAULT TRUE",
        ):
            col = col_sql.split()[0]
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name = 'whatsapp_credentials' AND column_name = '{col}') "
                f"THEN ALTER TABLE whatsapp_credentials ADD COLUMN {col_sql}; END IF; END $$"
            ))
        db.session.commit()
        print("Colunas WhatsApp Fase 6 adicionadas (chatbot_enabled, chatbot_menu_items, chatbot_faq, chatbot_transfer_to_human)")
    except Exception as e:
        print(f"Migração WhatsApp Fase 6: {e}")
        db.session.rollback()
    # Migration: WhatsApp Fase 7 — IA com linguagem natural (configurável)
    try:
        for col_sql in (
            "ai_enabled BOOLEAN DEFAULT FALSE",
            "ai_provider VARCHAR(20) DEFAULT 'openai'",
            "ai_api_key VARCHAR(512)",
            "ai_model VARCHAR(100)",
            "ai_personality TEXT",
            "ai_monthly_limit INTEGER DEFAULT 500",
            "ai_token_limit INTEGER DEFAULT 1000",
            "ai_transfer_threshold NUMERIC(3,2) DEFAULT 0.5",
        ):
            col = col_sql.split()[0]
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name = 'whatsapp_credentials' AND column_name = '{col}') "
                f"THEN ALTER TABLE whatsapp_credentials ADD COLUMN {col_sql}; END IF; END $$"
            ))
        db.session.commit()
        print("Colunas WhatsApp Fase 7 adicionadas (ai_enabled, ai_provider, ai_api_key, ai_model, ai_personality, ai_monthly_limit, ai_token_limit, ai_transfer_threshold)")
    except Exception as e:
        print(f"Migração WhatsApp Fase 7: {e}")
        db.session.rollback()
    # Migration: multiplicadores por veiculo (2026-11-18) — S7.4 Fase 2 (frota mista)
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
        print("Colunas de multiplicador por veiculo adicionadas (bike/moto/car)")
    except Exception as e:
        print(f"Migração multiplicadores por veículo: {e}")
        db.session.rollback()
    # Migration: link de ativacao do entregador proprio (2026-11-18) — Opcao 2 Enviar Acesso
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
        print("Colunas de link de ativacao adicionadas (activation_token/expires/used)")
    except Exception as e:
        print(f"Migração link de ativação: {e}")
        db.session.rollback()
    # Migration: indices para os caminhos quentes (2026-11-18) — item "Indices + N+1"
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
        print("Indices de caminhos quentes criados (users.email, customers.user_id, est_drivers, notifications, payments, pricing)")
    except Exception as e:
        print(f"Migração de índices: {e}")
        db.session.rollback()
    # Migration: token do Link de Pedido Rapido (2026-11-18) — S7.2 backlog EE
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'restaurants' AND column_name = 'order_link_token') "
            "THEN ALTER TABLE restaurants ADD COLUMN order_link_token VARCHAR(64) UNIQUE; END IF; END $$"
        ))
        db.session.commit()
        print("Coluna do Link de Pedido Rapido adicionada (restaurants.order_link_token)")
    except Exception as e:
        print(f"Migração link de pedido: {e}")
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
        print("Colunas de evitamento adicionadas (driver_restaurants G-08)")
    except Exception as e:
        print(f"Migração evitamento: {e}")
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
        # IMUTABILIDADE: trigger bloqueia UPDATE/DELETE (F-11).
        # Para testes/carga, o dono da tabela pode: ALTER TABLE financial_ledger DISABLE TRIGGER trg_ledger_immutable
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
        print("Tabela financial_ledger criada (imutavel via trigger)")
    except Exception as e:
        print(f"Migração financial_ledger: {e}")
        db.session.rollback()

    # Migration Fase D (2026-11-17): assinatura de 3 termos (fixo + entregador + pedido)
    try:
        for tabela, col_sql in (
            ("establishment_subscriptions", "price_per_order NUMERIC(10,2) DEFAULT 0"),
            ("subscription_invoices", "orders_count INTEGER DEFAULT 0"),
            ("subscription_invoices", "price_per_order NUMERIC(10,2)"),
            ("subscription_invoices", "fixed_price NUMERIC(10,2)"),
            ("establishment_subscriptions", "orders_included INTEGER DEFAULT 0"),
            ("establishment_subscriptions", "order_price_tiers JSON"),
            ("establishment_subscriptions", "establishment_count_mode VARCHAR(20) DEFAULT 'SNAPSHOT'"),
            ("establishment_subscriptions", "min_orders_per_establishment INTEGER DEFAULT 0"),
        ):
            col = col_sql.split()[0]
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name = '{tabela}' AND column_name = '{col}') "
                f"THEN ALTER TABLE {tabela} ADD COLUMN {col_sql}; END IF; END $$"
            ))
        db.session.commit()
        print("Colunas de assinatura de 3 termos adicionadas")
    except Exception as e:
        print(f"Migração assinatura 3 termos: {e}")
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
        print("Tabelas de cobrança MUV→admin criadas (platform_subscriptions/platform_invoices)")
    except Exception as e:
        print(f"Migração cobrança plataforma: {e}")
        db.session.rollback()

    # Migration motor de cobrança por componentes (2026-11-20) — MUV→admin:
    # modo de contagem do estab., N mínimo de pedidos e componente por pedido.
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
        # contagem fracionária no modo PRO_RATA_USO (ex.: 2.33 estab.)
        db.session.execute(db.text(
            "ALTER TABLE platform_invoices ALTER COLUMN establishments_count "
            "TYPE NUMERIC(10,2) USING establishments_count::NUMERIC"
        ))
        # converte contratos legados (cota + preço) em 2 faixas equivalentes (idempotente)
        db.session.execute(db.text(
            "UPDATE platform_subscriptions SET order_price_tiers = json_build_array("
            "json_build_object('upto', COALESCE(orders_included,0), 'price', 0), "
            "json_build_object('upto', NULL, 'price', COALESCE(price_per_order,0))) "
            "WHERE order_price_tiers IS NULL "
            "AND (COALESCE(price_per_order,0) > 0 OR COALESCE(orders_included,0) > 0)"
        ))
        db.session.commit()
        print("Colunas do motor de cobrança por componentes adicionadas")
    except Exception as e:
        print(f"Migração motor de cobrança: {e}")
        db.session.rollback()

    # Migration distribuição configurável de próprios (2026-11-24) — modo,
    # janela angular, limite de pedidos por rota, raio de segurança + log.
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
        print("Colunas de distribuição configurável adicionadas")
    except Exception as e:
        print(f"Migração distribuição configurável: {e}")
        db.session.rollback()

    # Migration acerto de retorno (2026-11-24) — pagamento no local
    # (dinheiro/maquininha/PIX) gera pendência até confirmação do estabelecimento
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
        print("Colunas de acerto de retorno adicionadas")
    except Exception as e:
        print(f"Migração acerto de retorno: {e}")
        db.session.rollback()

    # Migration numeração curta dos pedidos (N1 — 2026-11-24) — #seq do dia
    try:
        for col_sql in (
            "seq_number INTEGER",
            "seq_date DATE",
        ):
            col = col_sql.split()[0]
            db.session.execute(db.text(
                "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name = 'orders' AND column_name = '{col}') "
                f"THEN ALTER TABLE orders ADD COLUMN {col_sql}; END IF; END $$"
            ))
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'restaurants' AND column_name = 'seq_reset_mode') "
            "THEN ALTER TABLE restaurants ADD COLUMN seq_reset_mode VARCHAR(20) DEFAULT 'DAILY'; END IF; END $$"
        ))
        db.session.commit()
        print("Colunas de numeração curta adicionadas")
    except Exception as e:
        print(f"Migração numeração curta: {e}")
        db.session.rollback()

    # Migration F1 frota compartilhada (2026-11-24) — vínculo N:N loja↔entregador
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'restaurants' AND column_name = 'fleet_sharing_enabled') "
            "THEN ALTER TABLE restaurants ADD COLUMN fleet_sharing_enabled BOOLEAN DEFAULT FALSE; END IF; END $$"
        ))
        db.session.execute(db.text(
            "CREATE TABLE IF NOT EXISTS establishment_driver_stores ("
            " id SERIAL PRIMARY KEY,"
            " establishment_driver_id INTEGER NOT NULL REFERENCES establishment_drivers(id),"
            " restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),"
            " active BOOLEAN DEFAULT TRUE,"
            " created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,"
            " CONSTRAINT uq_est_driver_store UNIQUE (establishment_driver_id, restaurant_id))"
        ))
        db.session.commit()
        print("Frota compartilhada: flag + tabela de vínculos adicionadas")
    except Exception as e:
        print(f"Migração frota compartilhada: {e}")
        db.session.rollback()

    # Migration F3 rota multi-loja (2026-11-24) — coleta sem pedido + ordem global
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'own_driver_stops' AND column_name = 'restaurant_id') "
            "THEN ALTER TABLE own_driver_stops ADD COLUMN restaurant_id INTEGER REFERENCES restaurants(id); END IF; END $$"
        ))
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'own_driver_stops' AND column_name = 'stop_seq') "
            "THEN ALTER TABLE own_driver_stops ADD COLUMN stop_seq INTEGER; END IF; END $$"
        ))
        db.session.execute(db.text(
            "ALTER TABLE own_driver_stops ALTER COLUMN order_id DROP NOT NULL"
        ))
        db.session.execute(db.text(
            "ALTER TABLE own_driver_stops ALTER COLUMN stop_order DROP NOT NULL"
        ))
        db.session.execute(db.text(
            "UPDATE own_driver_stops SET stop_seq = stop_order WHERE stop_seq IS NULL"
        ))
        db.session.commit()
        print("Rota multi-loja: paradas de coleta + ordem global (stop_seq) adicionadas")
    except Exception as e:
        print(f"Migração rota multi-loja: {e}")
        db.session.rollback()

    # Migration embalagem da rota da plataforma (2026-11-26) — mesma numeração
    # do F3: stop_seq = ordem global; stop_order = embalagem (contador só das
    # entregas; NULL em PICKUP)
    try:
        db.session.execute(db.text(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'platform_driver_stops' AND column_name = 'stop_seq') "
            "THEN ALTER TABLE platform_driver_stops ADD COLUMN stop_seq INTEGER; END IF; END $$"
        ))
        db.session.execute(db.text(
            "ALTER TABLE platform_driver_stops ALTER COLUMN stop_order DROP NOT NULL"
        ))
        db.session.execute(db.text(
            "UPDATE platform_driver_stops SET stop_seq = stop_order WHERE stop_seq IS NULL AND stop_order IS NOT NULL"
        ))
        # Converter numeração antiga (ordem global em stop_order) para embalagem —
        # só enquanto existir PICKUP numerado (sinal de dado antigo)
        db.session.execute(db.text("""
            DO $$
            BEGIN
              IF EXISTS (SELECT 1 FROM platform_driver_stops WHERE stop_type = 'PICKUP' AND stop_order IS NOT NULL) THEN
                UPDATE platform_driver_stops SET stop_order = NULL WHERE stop_type = 'PICKUP';
                UPDATE platform_driver_stops p SET stop_order = sub.rn FROM (
                  SELECT id, row_number() OVER (PARTITION BY route_id ORDER BY stop_seq) AS rn
                  FROM platform_driver_stops WHERE stop_type = 'DELIVERY'
                ) sub WHERE p.id = sub.id;
              END IF;
            END $$
        """))
        db.session.commit()
        print("Embalagem da rota da plataforma (stop_seq + embalagem) adicionada")
    except Exception as e:
        print(f"Migração embalagem rota plataforma: {e}")
        db.session.rollback()

# Iniciar background tasks apenas em produção
if flask_env == 'production':
    try:
        from src.utils.background_tasks import start_background_tasks
        start_background_tasks(app)
        print("Background tasks iniciadas")
    except Exception as e:
        print(f"Erro ao iniciar background tasks: {e}")

@app.route('/api/health', methods=['GET'])
def health_check():
    """Verificação de saúde da API (F-14): checa o banco de verdade.

    200 = saudável (db ok); 503 = degradado (db inacessível) — é o status
    que o alerta de monitoramento deve observar (item "alerta mínimo").
    """
    import logging
    try:
        db.session.execute(db.text('SELECT 1'))
    except Exception as e:
        logging.getLogger(__name__).error(f"[HEALTH] Banco inacessível: {e}")
        return {'status': 'degraded', 'message': 'Banco de dados inacessível', 'db': 'down'}, 503
    return {'status': 'healthy', 'message': 'Portal API is running', 'db': 'ok'}, 200

@app.route('/uploads/proofs/<path:filename>')
@jwt_required()
def serve_proof(filename):
    """Serve fotos de prova de entrega (autenticação obrigatória + verificação de ownership)"""
    from werkzeug.utils import safe_join

    from src.utils.tenant import get_current_tenant_id, get_current_user

    # Proteção contra path traversal
    uploads_dir = os.path.join(os.path.dirname(__file__), 'uploads', 'proofs')
    try:
        safe_path = safe_join(uploads_dir, filename)
    except Exception:
        return {'error': 'Caminho inválido'}, 400

    if not safe_path or not os.path.exists(safe_path):
        return {'error': 'File not found'}, 404

    # Verificar ownership: apenas membros do mesmo tenant podem ver a prova
    user = get_current_user()
    if user and not user.is_super_admin:
        # Extrair order_id do filename (formato: order_{id}_{hash}.ext)
        try:
            from src.models.portal_models import Order as OrderModel
            parts = filename.split('_')
            if len(parts) >= 2:
                order_id = int(parts[1])
                order = OrderModel.query.get(order_id)
                if order and order.tenant_id and order.tenant_id != get_current_tenant_id():
                    return {'error': 'Sem permissão para acessar este arquivo'}, 403
        except (ValueError, IndexError):
            pass

    return send_from_directory(uploads_dir, filename)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """Serve arquivos estáticos do frontend"""
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "Frontend not found. Please build and place the frontend files in the static folder.", 404

# Handlers JWT — 401 com campo `error` (padrão da casa) em vez do padrão do
# Flask-JWT-Extended (`msg` + 422 em token inválido). Sem isto, sessão inválida
# aparecia como erro de negócio na tela (ex.: "Erro ao calcular frete").
# Também existem em main_production.py — mas o entry REAL da produção é este
# (Dockerfile `src.main:app`); registrar SEMPRE aqui primeiro (lição 34).
@jwt.expired_token_loader
def _jwt_expired(jwt_header, jwt_payload):
    return {'error': 'Sessão expirada. Faça login novamente.'}, 401

@jwt.invalid_token_loader
def _jwt_invalid(error):
    return {'error': 'Token inválido. Faça login novamente.'}, 401

@jwt.unauthorized_loader
def _jwt_missing(error):
    return {'error': 'Token de acesso necessário.'}, 401

@app.errorhandler(404)
def not_found(error):
    return {'error': 'Endpoint not found'}, 404

@app.errorhandler(400)
def bad_request(error):
    """Trata erros de requisição inválida, incluindo JSON com encoding incorreto."""
    return {'error': 'Requisição inválida. Verifique o formato e encoding (UTF-8) do body.'}, 400

@app.before_request
def fix_charset_encoding():
    """Corrige requisições com encoding inválido (ex: Latin-1 em vez de UTF-8).
    Converte o body para UTF-8 antes do Flask tentar decodificar o JSON."""
    from flask import request as req
    if req.content_type and 'application/json' in req.content_type:
        raw = req.get_data()
        if raw:
            # Tenta decodificar como UTF-8; se falhar, tenta Latin-1 (Windows)
            try:
                raw.decode('utf-8')
            except UnicodeDecodeError:
                try:
                    fixed = raw.decode('latin-1').encode('utf-8')
                    req._cached_data = fixed
                    req.content_type = 'application/json; charset=utf-8'
                except Exception:
                    pass

@app.errorhandler(500)
def internal_error(error):
    return {'error': 'Internal server error'}, 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)

