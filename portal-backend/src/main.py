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

app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=8)

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

# CORS: permissivo em desenvolvimento (testes em rede local), restritivo em produção
if flask_env == 'production':
    cors_origins = [
        "http://muv.log.br",
        "https://muv.log.br",
        "http://www.muv.log.br",
        "https://www.muv.log.br",
        "http://api.muv.log.br",
        "https://api.muv.log.br",
        "https://muvlog.vercel.app",
        "https://muvlog-frontend.vercel.app",
        "https://portal-entregador-gamma.vercel.app",
        "https://portal-frontend-sepia.vercel.app",
        "https://portal-frontend-apk3ka3zx-muvy.vercel.app",
    ]
    CORS(app, resources={r"/api/*": {"origins": cors_origins, "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "headers": ["Content-Type", "Authorization"], "supports_credentials": True}})
else:
    # DEV: permite qualquer origem (testes em rede local, múltiplos dispositivos)
    CORS(app, resources={r"/*": {"origins": "*"}})

# Registra blueprints
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

    # Migration Fase D (2026-11-17): assinatura de 3 termos (fixo + entregador + pedido)
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
    """Endpoint de verificação de saúde da API"""
    return {'status': 'healthy', 'message': 'Portal API is running'}, 200

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

