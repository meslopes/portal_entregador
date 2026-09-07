"""
Script para inicializar e gerenciar migrações do banco de dados com Alembic.
Uso:
    python migrations.py init      # Inicializa Alembic pela primeira vez
    python migrations.py migrate   # Cria uma nova migração
    python migrations.py upgrade   # Aplica migrações pendentes
    python migrations.py downgrade # Reverte última migração
    python migrations.py status    # Mostra status das migrações
"""
import sys
import os

# Adicionar o diretório pai ao path
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask
from flask_migrate import Migrate
from src.models.portal_models import db
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Configuração
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'DATABASE_URL', 
        f"sqlite:///{os.path.join(os.path.dirname(__file__), 'src', 'database', 'app.db')}"
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    return app

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    
    command = sys.argv[1]
    app = create_app()
    migrate = Migrate(app, db)
    
    with app.app_context():
        if command == 'init':
            from flask_migrate import init as migrate_init
            migrate_init()
            print("Migrações inicializadas em ./migrations/")
            print("Próximo passo: python migrations.py migrate")
        
        elif command == 'migrate':
            from flask_migrate import migrate as migrate_create
            message = sys.argv[2] if len(sys.argv) > 2 else 'auto'
            migrate_create(message=message)
            print(f"Migração criada: {message}")
            print("Próximo passo: python migrations.py upgrade")
        
        elif command == 'upgrade':
            from flask_migrate import upgrade as migrate_upgrade
            migrate_upgrade()
            print("Migrações aplicadas com sucesso")
        
        elif command == 'downgrade':
            from flask_migrate import downgrade as migrate_downgrade
            migrate_downgrade()
            print("Última migração revertida")
        
        elif command == 'status':
            from flask_migrate import current as migrate_current
            migrate_current()
        
        else:
            print(f"Comando desconhecido: {command}")
            print(__doc__)

if __name__ == '__main__':
    main()
