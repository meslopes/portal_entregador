import os
import sys

# DON'T CHANGE: Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
# Force redeploy: 2026-07-25

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required

from src.config import config
from src.models.portal_models import db
from src.routes.admin import admin_bp

# Importar blueprints
from src.routes.auth import auth_bp
from src.routes.driver import driver_bp


def create_app(config_name=None):

    """Factory function para criar a aplicação Flask"""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')


    app = Flask(__name__)

    # Carrega configuração ANTES de qualquer handler que dependa dela
    app.config.from_object(config[config_name])

    # Inicializar extensões
    db.init_app(app)
    # Migrações versionadas (Alembic) — novas mudanças de schema vão em migrations/
    from flask_migrate import Migrate
    Migrate(app, db, compare_type=True)
    # Configurar CORS (apenas Flask-CORS, sem handler manual duplicado)
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
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    # Blueprints extraídos de admin.py e order.py (mesmos do src/main.py)
    from src.routes.admin_finance import admin_finance_bp
    app.register_blueprint(admin_finance_bp, url_prefix='/api/admin')

    from src.routes.admin_drivers import admin_drivers_bp
    app.register_blueprint(admin_drivers_bp, url_prefix='/api/admin')

    from src.routes.admin_est_drivers_crud import admin_est_drivers_crud_bp
    app.register_blueprint(admin_est_drivers_crud_bp, url_prefix='/api/admin')

    from src.routes.admin_est_drivers_pay import admin_est_drivers_pay_bp
    app.register_blueprint(admin_est_drivers_pay_bp, url_prefix='/api/admin')

    from src.routes.admin_users import admin_users_bp
    app.register_blueprint(admin_users_bp, url_prefix='/api/admin')

    from src.routes.admin_dashboard import admin_dashboard_bp
    app.register_blueprint(admin_dashboard_bp, url_prefix='/api/admin')

    from src.routes.order_my import order_my_bp
    app.register_blueprint(order_my_bp, url_prefix='/api/orders')

    from src.routes.admin_establishments import admin_establishments_bp
    app.register_blueprint(admin_establishments_bp, url_prefix='/api/admin')

    from src.routes.admin_reports import admin_reports_bp
    app.register_blueprint(admin_reports_bp, url_prefix='/api/admin')

    from src.routes.admin_pricing import admin_pricing_bp
    app.register_blueprint(admin_pricing_bp, url_prefix='/api/admin')

    from src.routes.admin_tenants_squares import admin_tenants_squares_bp
    app.register_blueprint(admin_tenants_squares_bp, url_prefix='/api/admin')

    from src.routes.admin_users_softdelete import admin_users_softdelete_bp
    app.register_blueprint(admin_users_softdelete_bp, url_prefix='/api/admin')

    from src.routes.admin_live_tracking import admin_live_tracking_bp
    app.register_blueprint(admin_live_tracking_bp, url_prefix='/api/admin')

    from src.routes.order_delivery_routes import order_delivery_routes_bp
    app.register_blueprint(order_delivery_routes_bp, url_prefix='/api/orders')

    from src.routes.order_acceptance import order_acceptance_bp
    app.register_blueprint(order_acceptance_bp, url_prefix='/api/orders')

    from src.routes.order_lifecycle import order_lifecycle_bp
    app.register_blueprint(order_lifecycle_bp, url_prefix='/api/orders')

    from src.routes.order_queries import order_queries_bp
    app.register_blueprint(order_queries_bp, url_prefix='/api/orders')

    from src.routes.webhooks import webhook_bp
    app.register_blueprint(webhook_bp, url_prefix='/api/webhooks')

    from src.routes.webhooks_ifood import webhooks_ifood_bp
    app.register_blueprint(webhooks_ifood_bp, url_prefix='/api/webhooks')

    from src.routes.webhooks_whatsapp import webhooks_whatsapp_bp
    app.register_blueprint(webhooks_whatsapp_bp, url_prefix='/api/webhooks')

    from src.routes.webhooks_partners import webhooks_partners_bp
    app.register_blueprint(webhooks_partners_bp, url_prefix='/api/webhooks')

    from src.routes.webhooks_payments import webhooks_payments_bp
    app.register_blueprint(webhooks_payments_bp, url_prefix='/api/webhooks')

    from src.routes.admin_database import admin_database_bp
    app.register_blueprint(admin_database_bp, url_prefix='/api/admin')

    from src.routes.admin_integrations import admin_integrations_bp
    app.register_blueprint(admin_integrations_bp, url_prefix='/api/admin')

    from src.routes.admin_exports import admin_exports_bp
    app.register_blueprint(admin_exports_bp, url_prefix='/api/admin')

    from src.routes.admin_driver_payments import admin_driver_payments_bp
    app.register_blueprint(admin_driver_payments_bp, url_prefix='/api/admin')

    from src.routes.admin_invoices import admin_invoices_bp
    app.register_blueprint(admin_invoices_bp, url_prefix='/api/admin')

    from src.routes.admin_invoice_billing import admin_invoice_billing_bp
    app.register_blueprint(admin_invoice_billing_bp, url_prefix='/api/admin')

    from src.routes.user import user_bp
    app.register_blueprint(user_bp, url_prefix='/api/user')

    from src.routes.bonus import bonus_bp
    app.register_blueprint(bonus_bp, url_prefix='/api/bonus')

    from src.routes.muvscore import muvscore_bp
    app.register_blueprint(muvscore_bp, url_prefix='/api/muvscore')

    from src.routes.platform import platform_bp
    app.register_blueprint(platform_bp, url_prefix='/api/platform')

    from src.routes.own_driver import own_driver_bp
    app.register_blueprint(own_driver_bp)

    from src.routes.route import route_bp
    app.register_blueprint(route_bp)

    from src.routes.route_settings import route_settings_bp
    app.register_blueprint(route_settings_bp)

    from src.routes.platform_routes import platform_routes_bp
    app.register_blueprint(platform_routes_bp)

    from src.routes.finance import finance_bp
    app.register_blueprint(finance_bp)

    # Criar tabelas do banco de dados
    with app.app_context():
        _db_available = True
        try:
            db.create_all()
        except Exception as e:
            _db_available = False
            print(f"WARNING: db.create_all() falhou: {e}")
            print("O app vai iniciar, mas rotas que dependem do banco retornarão erro.")

        # Migrações inline (extraídas para src/migrations_inline.py)
        from src.migrations_inline import run_inline_migrations

        run_inline_migrations()
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

    # Servir arquivos de upload (prova de entrega) - autenticação obrigatória
    @app.route('/uploads/proofs/<path:filename>')
    @jwt_required()
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

