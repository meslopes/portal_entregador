"""
Script de migração para adicionar colunas faltantes na tabela route_settings.
Execute: python migrate_route_settings.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.main_production import app
from src.models.portal_models import db

def migrate():
    with app.app_context():
        # Lista de colunas para adicionar
        columns = [
            ("include_scheduled", "BOOLEAN DEFAULT FALSE"),
            ("scheduled_advance_min", "INTEGER DEFAULT 30"),
            ("include_pending", "BOOLEAN DEFAULT TRUE"),
            ("include_accepted", "BOOLEAN DEFAULT TRUE"),
            ("include_preparing", "BOOLEAN DEFAULT TRUE"),
            ("include_ready", "BOOLEAN DEFAULT TRUE"),
        ]
        
        for col_name, col_type in columns:
            try:
                db.session.execute(db.text(
                    f"ALTER TABLE route_settings ADD COLUMN IF NOT EXISTS {col_name} {col_type}"
                ))
                print(f"✅ Coluna {col_name} adicionada/verificada")
            except Exception as e:
                print(f"⚠️ Coluna {col_name}: {e}")
        
        db.session.commit()
        print("\n✅ Migração concluída!")

if __name__ == '__main__':
    migrate()
