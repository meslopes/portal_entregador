import os
import sys
# DON'T CHANGE: Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, jsonify
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
        for col in ['price_per_km', 'min_delivery_fee', 'max_delivery_fee', 'driver_km_bonus']:
            try:
                db.session.execute(db.text(
                    f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'squares' AND column_name = '{col}') THEN ALTER TABLE squares ADD COLUMN {col} NUMERIC(10,2); END IF; END $$"
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
    
    return app

# Criar aplicação
app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    app.run(host=host, port=port, debug=debug)

