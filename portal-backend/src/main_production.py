import os
import sys
# DON'T CHANGE: Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

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
    app.config.from_object(config[config_name])
    
    # Inicializar extensões
    db.init_app(app)
    CORS(app, origins=app.config['CORS_ORIGINS'])
    jwt = JWTManager(app)
    
    # Registrar blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(driver_bp, url_prefix='/api/driver')
    app.register_blueprint(order_bp, url_prefix='/api/orders')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    # Criar tabelas do banco de dados
    with app.app_context():
        db.create_all()
    
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
CORS(app)
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    
    app.run(host=host, port=port, debug=debug)

