# -*- coding: utf-8 -*-
"""Smoke do bloqueio do tempo de preparo pelo admin (prep_time_locked, 2026-11-27)."""
import json
import os
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
    try:
        with urllib.request.urlopen(r, timeout=45) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def main():
    from src.main import app
    from src.models.portal_models import (
        Customer, Restaurant, Square, Tenant, User, UserStatus, UserType, db,
    )
    from flask_jwt_extended import create_access_token

    resultados = []

    def check(nome, ok, detalhe=""):
        resultados.append(ok)
        print(("PASS " if ok else "FAIL ") + nome + (" — " + detalhe if detalhe else ""))

    pid = os.getpid()
    with app.app_context():
        t = Tenant(name=f"Tenant Lock {pid}", slug=f"lock-{pid}", is_active=True)
        db.session.add(t)
        db.session.flush()
        adm = User(email=f"admin.lock.{pid}@teste.com", first_name="L", last_name="A",
                   user_type=UserType.ADMIN, status=UserStatus.ACTIVE, tenant_id=t.id)
        adm.set_password("Teste12345")
        db.session.add(adm)
        db.session.flush()
        sq = Square(name=f"Praca Lock {pid}", city="Canoas", state="RS", tenant_id=t.id)
        db.session.add(sq)
        db.session.flush()
        est = Restaurant(name=f"Estab Lock {pid}", address="Rua X", latitude=-29.7,
                         longitude=-50.0, tenant_id=t.id, square_id=sq.id,
                         preparation_minutes=10, prep_time_locked=False)
        db.session.add(est)
        db.session.flush()
        cli = User(email=f"cli.lock.{pid}@teste.com", first_name="C", last_name="L",
                   user_type=UserType.CLIENT, status=UserStatus.ACTIVE, tenant_id=t.id)
        cli.set_password("Teste12345")
        db.session.add(cli)
        db.session.flush()
        # vínculo Customer.name <-> Restaurant.name (padrão do projeto)
        cust = Customer(name=est.name, phone="51966600000", user_id=cli.id, tenant_id=t.id)
        db.session.add(cust)
        db.session.commit()

        cli_tok = create_access_token(identity=str(cli.id))
        adm_tok = create_access_token(identity=str(adm.id))
        est_id = est.id

        # 1) EST muda o tempo livremente (sem bloqueio)
        s, r = req("PUT", "/api/user/profile", {"preparation_minutes": 7}, token=cli_tok)
        db.session.expire_all()
        v = Restaurant.query.get(est_id).preparation_minutes
        check("EST altera livremente (sem bloqueio)", s == 200 and v == 7, f"s={s} valor={v}")

        # 2) GET perfil expõe prep_time_locked=False
        s, r = req("GET", "/api/user/profile", token=cli_tok)
        check("GET perfil expõe prep_time_locked", r.get("prep_time_locked") is False)

        # 3) Admin fixa o valor + bloqueia
        s, r = req("PUT", f"/api/admin/establishments/{est_id}",
                   {"preparation_minutes": 15, "prep_time_locked": True}, token=adm_tok)
        db.session.expire_all()
        e2 = Restaurant.query.get(est_id)
        check("admin fixa 15min e bloqueia",
              s == 200 and e2.preparation_minutes == 15 and e2.prep_time_locked is True,
              f"s={s} valor={e2.preparation_minutes} locked={e2.prep_time_locked}")

        # 4) EST tenta mudar bloqueado → 403
        s, r = req("PUT", "/api/user/profile", {"preparation_minutes": 5}, token=cli_tok)
        db.session.expire_all()
        v = Restaurant.query.get(est_id).preparation_minutes
        check("EST bloqueado: mudança recusada (403)", s == 403 and v == 15,
              f"s={s} msg={r.get('error')} valor={v}")

        # 5) Salvar o MESMO valor não trava o formulário
        s, r = req("PUT", "/api/user/profile", {"preparation_minutes": 15}, token=cli_tok)
        check("bloqueado: salvar o MESMO valor funciona", s == 200, f"s={s}")

        # 6) GET perfil expõe bloqueio ativo
        s, r = req("GET", "/api/user/profile", token=cli_tok)
        check("GET perfil expõe bloqueio ativo", r.get("prep_time_locked") is True)

        # limpeza
        Customer.query.filter(Customer.id == cust.id).delete(synchronize_session=False)
        Restaurant.query.filter(Restaurant.id == est_id).delete(synchronize_session=False)
        User.query.filter(User.email.in_([
            f"admin.lock.{pid}@teste.com", f"cli.lock.{pid}@teste.com"
        ])).delete(synchronize_session=False)
        Square.query.filter(Square.id == sq.id).delete(synchronize_session=False)
        Tenant.query.filter(Tenant.id == t.id).delete(synchronize_session=False)
        db.session.commit()
        print("limpeza OK")

    falhas = resultados.count(False)
    print("-" * 50)
    print(f"{len(resultados) - falhas}/{len(resultados)} checks OK")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
