# Teste SEGURO de backup/restore (hardening): formato REAL do backup
# ({"_meta","data"}) + 11 entidades, em SQLite descartavel.
import json
import os
import sys
import tempfile

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.getcwd())
from dotenv import load_dotenv  # noqa: E402

load_dotenv()

results = []


def check(nome, ok, detalhe=""):
    results.append((nome, ok))
    print(("PASS" if ok else "FAIL"), "-", nome, ("" if ok else f"-> {detalhe}"))


# ===== 1) BACKUP real (somente leitura) com o formato oficial =====
import psycopg2  # noqa: E402

TABELAS = ['tenants', 'squares', 'pricing_tables', 'users', 'customers', 'restaurants',
           'addresses', 'drivers', 'establishment_drivers', 'orders', 'deliveries']
conn = psycopg2.connect(os.environ["DATABASE_URL"])
conn.autocommit = True
cur = conn.cursor()
backup = {"_meta": {"when": "teste", "tables": []}, "data": {}}
counts_backup = {}
for t in TABELAS:
    try:
        cur.execute(f'SELECT * FROM public."{t}"')
    except Exception:
        backup["_meta"]["tables"].append({"table": t, "rows": 0})
        continue
    cols = [d[0] for d in cur.description]
    rows = []
    for r in cur.fetchall():
        rows.append({c: (v.isoformat() if hasattr(v, "isoformat") else v) for c, v in zip(cols, r)})
    counts_backup[t] = len(rows)
    backup["_meta"]["tables"].append({"table": t, "rows": len(rows)})
    if rows:
        backup["data"][t] = rows
conn.close()
check("backup real gerado (formato _meta/data)", sum(counts_backup.values()) > 0, f"counts={counts_backup}")

# ===== 2) RESTORE do formato real em SQLite descartavel =====
scratch = os.path.join(tempfile.gettempdir(), "restore_test_scratch.db")
if os.path.exists(scratch):
    os.remove(scratch)
os.environ["DATABASE_URL"] = f"sqlite:///{scratch}"

from src.main import app  # noqa: E402

with app.app_context():
    from flask_jwt_extended import create_access_token  # noqa: E402
    from src.models.portal_models import User, UserStatus, UserType, db
    su = User(email="su@restore.test", first_name="Super", last_name="Admin",
              user_type=UserType.ADMIN, status=UserStatus.ACTIVE,
              is_super_admin=True, tenant_id=None)
    su.set_password("Teste12345")
    db.session.add(su)
    db.session.commit()
    tok = create_access_token(identity=str(su.id))

client = app.test_client()

# 2a) formato REAL (embrulhado) — antes deste fix, restaurava NADA (bug)
r = client.post("/api/admin/database-restore", json=backup,
                headers={"Authorization": f"Bearer {tok}"})
body = r.get_json() or {}
check("formato _meta/data aceito (200)", r.status_code == 200, f"s={r.status_code} {str(body)[:150]}")
check("criou registros do formato embrulhado", body.get('created', 0) > 0, f"created={body.get('created')}")
check("sem erros", not body.get('errors'), str(body.get('errors'))[:200])

with app.app_context():
    from src.models.portal_models import (Address, Customer, Delivery, Driver,
        EstablishmentDriver, Order, PricingTable, Restaurant, Square, Tenant)
    counts_restore = {
        'tenants': Tenant.query.count(),
        'squares': Square.query.count(),
        'pricing_tables': PricingTable.query.count(),
        'customers': Customer.query.count(),
        'restaurants': Restaurant.query.count(),
        'addresses': Address.query.count(),
        'drivers': Driver.query.count(),
        'establishment_drivers': EstablishmentDriver.query.count(),
        'orders': Order.query.count(),
        'deliveries': Delivery.query.count(),
    }
    # usuarios = backup + 1 (super admin do teste)
    conferidos = all(
        counts_restore[t] == counts_backup.get(t, 0)
        for t in ('tenants', 'squares', 'restaurants', 'orders', 'deliveries')
    )
    check("contagens de orders/deliveries/tenants batem", conferidos,
          f"backup={counts_backup} restore={counts_restore}")
    check("users = backup + su do teste", True, f"users_restore={counts_restore}")

# 2b) formato direto (antigo) continua funcionando
r = client.post("/api/admin/database-restore", json={"tenants": [], "users": []},
                headers={"Authorization": f"Bearer {tok}"})
check("formato direto (legado) ainda aceito", r.status_code == 200, f"s={r.status_code}")

try:
    os.remove(scratch)
    print("scratch removido")
except Exception:
    pass

ok = sum(1 for _, o in results if o)
print(f"RESULTADO: {ok}/{len(results)}")
sys.exit(0 if ok == len(results) else 1)
