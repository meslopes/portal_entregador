# -*- coding: utf-8 -*-
"""
Smoke da lixeira de tenants (2026-11-27) — soft delete igual aos usuários:
1) DELETE move para a lixeira (some da lista, aparece na lixeira)
2) RESTORE devolve (some da lixeira, volta à lista, is_active=True)
3) DELETE de novo + PERMANENT apaga de verdade (walk genérico de FKs)
4) cleanup-deleted (bulk permanente) funciona
5) Retenção configurável aparece na resposta

Uso: python scripts/_tmp_smoke_tenant_trash.py   (backend em localhost:5000)
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

    mem = glob.glob(r"C:\Users\Dell\.local\share\mimocode\memory\projects\*\MEMORY.md")
    mem.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    pw = re.search(r"Mauro\d+", open(mem[0], encoding="utf-8").read()).group(0)
    s, login = req("POST", "/api/auth/login", {"email": "meslopes@gmail.com", "password": pw})
    tok = login.get("access_token")
    check("login super admin", bool(tok), f"s={s}")

    pid = os.getpid()
    s, r = req("POST", "/api/platform/tenants", {"name": f"TrashT {pid}", "slug": f"trasht-{pid}"}, token=tok)
    tid = (r.get("tenant") or r).get("id")
    check("criar tenant de teste", s in (200, 201) and tid, f"s={s} id={tid}")

    with app.app_context():
        u = User(email=f"trasht.{pid}@teste.com", first_name="TT", last_name="User",
                 user_type=UserType.CLIENT, status=UserStatus.ACTIVE, tenant_id=tid)
        u.set_password("Teste12345")
        db.session.add(u)
        db.session.add(RouteSettings(tenant_id=tid))
        db.session.commit()
        uid = u.id

    # 1) DELETE = lixeira (soft)
    s, r = req("DELETE", f"/api/platform/tenants/{tid}", token=tok)
    s2, lista = req("GET", "/api/platform/tenants", token=tok)
    s3, lixeira = req("GET", "/api/platform/tenants/deleted", token=tok)
    na_lista = any(t["id"] == tid for t in lista.get("tenants", []))
    na_lixeira = any(t["id"] == tid for t in lixeira.get("tenants", []))
    item = next((t for t in lixeira.get("tenants", []) if t["id"] == tid), {})
    check("DELETE move para a lixeira (some da lista, aparece na lixeira)",
          s == 200 and not na_lista and na_lixeira,
          f"s={s} lista={na_lista} lixeira={na_lixeira}")
    check("lixeira expõe dias + quem excluiu + retenção",
          item.get("days_deleted") == 0 and "deleted_by_name" in item
          and lixeira.get("config", {}).get("retention_days") in (30, 60, 90),
          f"days={item.get('days_deleted')} por={item.get('deleted_by_name')} retencao={lixeira.get('config')}")
    with app.app_context():
        db.session.expire_all()
        t = Tenant.query.get(tid)
        check("soft delete: dados preservados (usuário vínculo mantido)",
              t is not None and t.deleted_at is not None and t.is_active is False
              and User.query.get(uid).tenant_id == tid,
              f"deleted_at={t.deleted_at} active={t.is_active}")

    # 2) RESTORE
    s, r = req("POST", f"/api/platform/tenants/{tid}/restore", token=tok)
    s2, lista = req("GET", "/api/platform/tenants", token=tok)
    s3, lixeira = req("GET", "/api/platform/tenants/deleted", token=tok)
    check("RESTORE devolve o tenant (volta à lista, sai da lixeira)",
          s == 200 and any(t["id"] == tid for t in lista.get("tenants", []))
          and not any(t["id"] == tid for t in lixeira.get("tenants", [])),
          f"s={s}")
    with app.app_context():
        db.session.expire_all()
        t = Tenant.query.get(tid)
        check("RESTORE reativa o tenant", t.is_active is True and t.deleted_at is None)

    # 3) DELETE de novo + PERMANENT
    req("DELETE", f"/api/platform/tenants/{tid}", token=tok)
    s, r = req("DELETE", f"/api/platform/tenants/{tid}/permanent", token=tok)
    with app.app_context():
        db.session.expire_all()
        usuario = User.query.get(uid)
        check("PERMANENT apaga de verdade (usuário mantido e desvinculado)",
              s == 200 and Tenant.query.get(tid) is None
              and usuario is not None and usuario.tenant_id is None,
              f"s={s} msg={r.get('message')}")

    # 4) bulk cleanup-deleted
    s, r = req("POST", "/api/platform/tenants", {"name": f"TrashB {pid}", "slug": f"trashb-{pid}"}, token=tok)
    tidb = (r.get("tenant") or r).get("id")
    req("DELETE", f"/api/platform/tenants/{tidb}", token=tok)
    s, r = req("POST", "/api/platform/tenants/cleanup-deleted", {"tenant_ids": [tidb]}, token=tok)
    with app.app_context():
        db.session.expire_all()
        check("cleanup-deleted (bulk permanente) apaga",
              s == 200 and Tenant.query.get(tidb) is None, f"s={s} msg={r.get('message')}")

    # limpeza
    with app.app_context():
        User.query.filter(User.email == f"trasht.{pid}@teste.com").delete(synchronize_session=False)
        db.session.commit()
    print("limpeza OK")

    falhas = resultados.count(False)
    print("-" * 50)
    print(f"{len(resultados) - falhas}/{len(resultados)} checks OK")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
