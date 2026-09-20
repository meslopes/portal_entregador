import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_jwt_extended import JWTManager, jwt_required
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

# Token JWT expira em 4 horas
from datetime import timedelta
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=4)

# Configuração do banco de dados
database_url = os.getenv('DATABASE_URL', f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}")
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False


# Inicializa extensões
jwt = JWTManager(app)

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
app.register_blueprint(order_bp, url_prefix='/api/orders')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(webhook_bp, url_prefix='/api/webhooks')

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

from src.routes.route_settings import route_settings_bp
app.register_blueprint(route_settings_bp)

from src.routes.platform_routes import platform_routes_bp
app.register_blueprint(platform_routes_bp)

from src.routes.route import route_bp
app.register_blueprint(route_bp)

from src.routes.finance import finance_bp
app.register_blueprint(finance_bp)

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

    # Migration: adicionar fixed_fee em squares e pricing_tables
    try:
        for table in ['squares', 'pricing_tables']:
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
    from flask import current_app
    from werkzeug.utils import safe_join
    from src.utils.tenant import get_current_user, get_current_tenant_id

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
    from werkzeug.exceptions import BadRequest
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
    app.run(host='0.0.0.0', port=5000, debug=True)

