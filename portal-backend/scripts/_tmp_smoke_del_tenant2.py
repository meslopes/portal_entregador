# -*- coding: utf-8 -*-
"""
Smoke da exclusão de tenant (fix 2026-11-27 — delete estava dentro do if de
usuários/force: tenant "excluía" mas ficava no banco).

1) Tenant SEM usuário → DELETE 200 → some de verdade (o bug)
2) Tenant COM usuário + linha derivada → DELETE force 200 → some; usuário
   mantido no sistema mas desvinculado (tenant_id NULL)
3) Gate de dados vinculados sem force → 400

Uso: python scripts/_tmp_smoke_del_tenant2.py   (backend em localhost:5000)
"""
import glob
import json
import os
import re
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
BASE = os.environ.get("MUV_API", "http://localhost:5000")


def req(method, path, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)

    def _parse(raw):
        try:
            return json.loads(raw or "{}")
        except ValueError:
            return {"error": raw[:150]}

    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            return resp.status, _parse(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, _parse(e.read().decode())


def main():
    from src.main import app
    from src.models.portal_models import RouteSettings, Tenant, User, UserStatus, UserType, db

    resultados = []

    def check(nome, ok, detalhe=""):
        resultados.append(ok)
        print(("PASS " if ok else "FAIL ") + nome + (" — " + detalhe if detalhe else ""))

    # Login super admin (credencial vem da memória do projeto — lição 29)
    mem = glob.glob(r"C:\Users\Dell\.local\share\mimocode\memory\projects\*\MEMORY.md")
    mem.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    pw = re.search(r"Mauro\d+", open(mem[0], encoding="utf-8").read()).group(0)
    s, login = req("POST", "/api/auth/login", {"email": "meslopes@gmail.com", "password": pw})
    tok = login.get("access_token")
    check("login super admin", bool(tok), f"s={s}")

    pid = os.getpid()

    # --- 1) Tenant SEM usuário (o bug): delete deve apagar de verdade ---
    s, r = req("POST", "/api/platform/tenants", {"name": f"DelA {pid}", "slug": f"dela-{pid}"}, token=tok)
    ida = (r.get("tenant") or r).get("id")
    check("criar tenant A (sem usuário)", s in (200, 201) and ida, f"s={s} id={ida}")

    s, r = req("DELETE", f"/api/platform/tenants/{ida}", token=tok)
    with app.app_context():
        db.session.expire_all()
        ainda_a = Tenant.query.get(ida) is not None
    check("tenant A SEM usuário: delete some de verdade",
          s == 200 and not ainda_a, f"s={s} msg={r.get('message')} ainda_no_banco={ainda_a}")

    # --- 2) Tenant COM usuário + linha derivada (force) ---
    s, r = req("POST", "/api/platform/tenants", {"name": f"DelB {pid}", "slug": f"delb-{pid}"}, token=tok)
    idb = (r.get("tenant") or r).get("id")
    check("criar tenant B", s in (200, 201) and idb, f"s={s} id={idb}")

    with app.app_context():
        u = User(email=f"delb.{pid}@teste.com", first_name="DelB", last_name="Teste",
                 user_type=UserType.CLIENT, status=UserStatus.ACTIVE, tenant_id=idb)
        u.set_password("Teste12345")
        db.session.add(u)
        db.session.add(RouteSettings(tenant_id=idb))
        db.session.commit()
        uid = u.id

    # gate: sem force deve recusar (tem usuário)
    s, r = req("DELETE", f"/api/platform/tenants/{idb}", token=tok)
    check("gate de dados vinculados (sem force) recusa", s == 400, f"s={s}")

    s, r = req("DELETE", f"/api/platform/tenants/{idb}?force=true", token=tok)
    with app.app_context():
        db.session.expire_all()
        ainda_b = Tenant.query.get(idb) is not None
        usuario = User.query.get(uid)
        desvinculado = usuario is not None and usuario.tenant_id is None
        rotas = RouteSettings.query.filter_by(tenant_id=idb).count()
    check("tenant B COM dados (force): some + usuário desvinculado + derivados limpos",
          s == 200 and not ainda_b and desvinculado and rotas == 0,
          f"s={s} ainda={ainda_b} user_tenant={getattr(usuario, 'tenant_id', 'apagado')} route_settings={rotas}")

    # limpeza: usuário de teste criado pelo smoke
    with app.app_context():
        User.query.filter(User.email == f"delb.{pid}@teste.com").delete(synchronize_session=False)
        db.session.commit()
    print("limpeza OK")

    falhas = resultados.count(False)
    print("-" * 50)
    print(f"{len(resultados) - falhas}/{len(resultados)} checks OK")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
