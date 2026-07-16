import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

# Importa modelos e rotas
from src.models.portal_models import db
from src.routes.auth import auth_bp
from src.routes.driver import driver_bp
from src.routes.order import order_bp
from src.routes.admin import admin_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.url_map.strict_slashes = False

# Configurações
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')

# Configuração do banco de dados
database_url = os.getenv('DATABASE_URL', f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}")
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicializa extensões
jwt = JWTManager(app)
cors_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "https://muvlog.vercel.app",
    "https://muvlog-frontend.vercel.app",
]
CORS(app, resources={r"/api/*": {"origins": cors_origins, "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "headers": ["Content-Type", "Authorization"], "supports_credentials": True}} )

# Registra blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(driver_bp, url_prefix='/api/driver')
app.register_blueprint(order_bp, url_prefix='/api/orders')
app.register_blueprint(admin_bp, url_prefix='/api/admin')

# Inicializa banco de dados
db.init_app(app)
with app.app_context():
    db.create_all()
    
    # Cria usuário admin padrão se não existir
    # (Comentado para evitar problemas de autoincrement)
    # from src.models.portal_models import User, UserType, UserStatus
    # try:
    #     admin_user = User.query.filter_by(email='admin@portal.com').first()
    #     if not admin_user:
    #         admin_user = User(
    #             email='admin@portal.com',
    #             first_name='Admin',
    #             last_name='Portal',
    #             user_type=UserType.ADMIN,
    #             status=UserStatus.ACTIVE
    #         )
    #         admin_user.set_password('admin123')
    #         db.session.add(admin_user)
    #         db.session.commit()
    #         print("Usuário admin criado: admin@portal.com / admin123")
    # except Exception as e:
    #     print(f"Erro ao criar usuário admin: {e}")
    #     db.session.rollback()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Endpoint de verificação de saúde da API"""
    return {'status': 'healthy', 'message': 'Portal API is running'}, 200

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

@app.errorhandler(500)
def internal_error(error):
    return {'error': 'Internal server error'}, 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

