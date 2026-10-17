"""
Corrige classificação own vs platform no banco (dados existentes).

REGRAS (sem usar nome):
- Se existe EstablishmentDriver ativo com o mesmo telefone de um User/Driver
  → marca Driver.converted_to_own = True e is_online = False

Uso:
  cd portal-backend
  python scripts/fix_driver_type_separation.py           # dry-run (mostra o que faria)
  python scripts/fix_driver_type_separation.py --apply   # aplica

ATENÇÃO: o .env local aponta para o MESMO banco do Cloud Run (produção).
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.main import app  # noqa: E402
from src.models.portal_models import Driver, EstablishmentDriver, User, db  # noqa: E402
from src.utils.driver_type import normalize_phone  # noqa: E402


def main():
    apply_changes = '--apply' in sys.argv
    with app.app_context():
        own_drivers = EstablishmentDriver.query.filter(
            EstablishmentDriver.is_active.is_(True)
        ).all()
        own_by_phone = {}
        for od in own_drivers:
            p = normalize_phone(od.phone)
            if p:
                own_by_phone.setdefault(p, []).append(od)

        print(f'Own drivers ativos com telefone: {len(own_by_phone)}')
        print(f'Modo: {"APLICAR" if apply_changes else "DRY-RUN (use --apply)"}')
        print('-' * 70)

        fixed = 0
        already_ok = 0
        no_match = 0

        for phone_norm, ods in sorted(own_by_phone.items()):
            users = [
                u for u in User.query.filter(User.deleted_at.is_(None)).all()
                if normalize_phone(u.phone) == phone_norm
            ]
            if not users:
                no_match += 1
                print(f'  [sem User] telefone {phone_norm} → own: {ods[0].name} (id {ods[0].id})')
                continue

            for user in users:
                driver = Driver.query.filter_by(user_id=user.id).first()
                label = f'User {user.id} {user.email} | Driver {driver.id if driver else "-"}'
                if not driver:
                    print(f'  [sem Driver] {label} → own: {ods[0].name}')
                    continue
                if driver.converted_to_own:
                    already_ok += 1
                    print(f'  [ok] {label} já convertido')
                    continue
                print(f'  [FIX] {label} → converted_to_own=True (own: {ods[0].name})')
                if apply_changes:
                    driver.converted_to_own = True
                    driver.is_online = False
                fixed += 1

        if apply_changes:
            db.session.commit()
            print('-' * 70)
            print(f'COMMIT OK — corrigidos: {fixed}')
        else:
            print('-' * 70)
            print(f'DRY-RUN — corrigiria: {fixed} | já ok: {already_ok} | sem User: {no_match}')


if __name__ == '__main__':
    main()
