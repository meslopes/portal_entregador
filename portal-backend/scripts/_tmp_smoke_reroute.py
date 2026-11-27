# -*- coding: utf-8 -*-
"""
Smoke da reanálise por evento da roteirização (2026-11-27).
1) agendar_analise_roteirizacao: deadline = now + preparation_minutes do EST
2) Vários pedidos = deadline mais cedo vence (janela do mais urgente)
3) agendamento_vencido: piso min_reroute_interval_min + deadline + fallback periódico
4) run_auto_routing consome o gatilho (last_analysis_at / pending_reroute_at)
5) PUT /api/route-settings aceita min_reroute_interval_min

Uso: python scripts/_tmp_smoke_reroute.py   (backend rodando em localhost:5000)
"""
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

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
            return {"error": raw[:120]}

    try:
        with urllib.request.urlopen(r, timeout=45) as resp:
            return resp.status, _parse(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, _parse(e.read().decode())


def main():
    from src.main import app
    from src.models.portal_models import (
        Address, Customer, Driver, Order, OrderStatus, PaymentMethod,
        PlatformDriverRoute, PlatformDriverStop, Restaurant, RouteSettings,
        Square, Tenant, User, UserStatus, UserType, db,
    )
    from src.services.auto_routing import (
        agendamento_vencido,
        agendar_analise_roteirizacao,
        run_auto_routing,
    )
    from flask_jwt_extended import create_access_token

    resultados = []

    def check(nome, ok, detalhe=""):
        resultados.append(ok)
        print(("PASS " if ok else "FAIL ") + nome + (" — " + detalhe if detalhe else ""))

    with app.app_context():
        pid = os.getpid()
        tenant = Tenant(name=f"Tenant RR {pid}", slug=f"rr-{pid}", is_active=True)
        db.session.add(tenant)
        db.session.flush()
        admin = User(email=f"admin.rr.{pid}@teste.com", first_name="RR", last_name="Admin",
                     user_type=UserType.ADMIN, status=UserStatus.ACTIVE, tenant_id=tenant.id)
        admin.set_password("Teste12345")
        db.session.add(admin)
        db.session.flush()
        sq = Square(name=f"Praca RR {pid}", city="Canoas", state="RS", tenant_id=tenant.id)
        db.session.add(sq)
        db.session.flush()
        # Loja lenta (preparo 7min) e loja rápida (preparo 3min)
        est_lenta = Restaurant(name=f"Estab RRLenta {pid}", address="Rua L", latitude=-29.7,
                               longitude=-50.0, tenant_id=tenant.id, square_id=sq.id,
                               preparation_minutes=7)
        est_rapida = Restaurant(name=f"Estab RRRapida {pid}", address="Rua R", latitude=-29.71,
                                longitude=-50.01, tenant_id=tenant.id, square_id=sq.id,
                                preparation_minutes=3)
        db.session.add_all([est_lenta, est_rapida])
        db.session.flush()

        def criar_pedido(est, tag):
            cust = Customer(name=f"RR {tag} {pid}", phone=f"51977{pid % 10000:04d}{tag}",
                            tenant_id=tenant.id)
            db.session.add(cust)
            db.session.flush()
            addr = Address(customer_id=cust.id, street=f"Rua RR {tag}, 1", neighborhood="Centro",
                           city="Canoas", state="RS", zip_code="90000-000",
                           latitude=-29.72, longitude=-50.02)
            db.session.add(addr)
            db.session.flush()
            ped = Order(tenant_id=tenant.id, restaurant_id=est.id, customer_id=cust.id,
                        delivery_address_id=addr.id,
                        order_number=f"RR{pid}-{tag}",
                        items=[{'name': 'Item', 'quantity': 1, 'price': 10}],
                        subtotal=10, delivery_fee=2, total_amount=12,
                        payment_method=PaymentMethod.CASH, status=OrderStatus.PENDING)
            db.session.add(ped)
            db.session.commit()
            return ped

        p1 = criar_pedido(est_lenta, 'A')
        p2 = criar_pedido(est_rapida, 'B')

        settings = RouteSettings.query.filter_by(tenant_id=tenant.id).first()
        if not settings:
            settings = RouteSettings(tenant_id=tenant.id)
            db.session.add(settings)
            db.session.commit()
        settings.auto_routing_enabled = True
        settings.min_reroute_interval_min = 2
        settings.pending_reroute_at = None
        settings.last_analysis_at = None
        db.session.commit()

        # 1) janela = preparation_minutes do EST (loja lenta = 7 min)
        agendar_analise_roteirizacao(p1)
        db.session.expire_all()
        settings = RouteSettings.query.filter_by(tenant_id=tenant.id).first()
        prazo = settings.pending_reroute_at
        delta = (prazo - datetime.utcnow()).total_seconds() / 60
        check("janela = preparation_minutes do EST (7 min)",
              6.0 <= delta <= 8.0, f"deadline em {delta:.1f} min")

        # 2) pedido da loja rápida puxa o deadline para trás (min vence)
        agendar_analise_roteirizacao(p2)
        db.session.expire_all()
        settings = RouteSettings.query.filter_by(tenant_id=tenant.id).first()
        prazo = settings.pending_reroute_at
        delta = (prazo - datetime.utcnow()).total_seconds() / 60
        check("deadline mais cedo vence (loja rápida 3 min)",
              2.0 <= delta <= 4.0, f"deadline em {delta:.1f} min")

        # 3) agendamento_vencido: deadline no futuro + sem análise anterior = False
        check("agendamento NÃO vence antes do deadline",
              agendamento_vencido(settings) is False)

        # 4) piso entre análises: última análise agora → não vence nem com deadline passado
        settings.pending_reroute_at = datetime.utcnow() - timedelta(minutes=1)
        settings.last_analysis_at = datetime.utcnow()
        db.session.commit()
        check("piso min_reroute_interval_min segura (última análise agora)",
              agendamento_vencido(settings) is False)

        # 5) deadline passado + piso liberado → vence
        settings.last_analysis_at = datetime.utcnow() - timedelta(minutes=10)
        db.session.commit()
        check("deadline passado + piso liberado → vence",
              agendamento_vencido(settings) is True)

        # 6) fallback periódico (sem gatilho): ciclo 5min esgotado → vence
        settings.pending_reroute_at = None
        settings.last_analysis_at = datetime.utcnow() - timedelta(minutes=10)
        db.session.commit()
        check("fallback periódico (sem gatilho) vence após o ciclo",
              agendamento_vencido(settings) is True)

        # 7) run_auto_routing consome o gatilho
        settings.pending_reroute_at = datetime.utcnow() - timedelta(minutes=1)
        settings.last_analysis_at = datetime.utcnow() - timedelta(minutes=10)
        db.session.commit()
        run_auto_routing(tenant.id)
        db.session.expire_all()
        settings = RouteSettings.query.filter_by(tenant_id=tenant.id).first()
        check("run_auto_routing consome o gatilho e marca a análise",
              settings.pending_reroute_at is None and settings.last_analysis_at is not None,
              f"last={settings.last_analysis_at} pending={settings.pending_reroute_at}")

        # 8) PUT /api/route-settings aceita o piso configurável
        admin_tok = create_access_token(identity=str(admin.id))
        s, r = req("PUT", "/api/route-settings/", {"min_reroute_interval_min": 4}, token=admin_tok)
        ok8 = s == 200 and (r.get('settings') or {}).get('min_reroute_interval_min') == 4
        check("PUT route-settings aceita min_reroute_interval_min", ok8, f"s={s}")

        # limpeza (filhos antes dos pais)
        all_orders = [o.id for o in Order.query.filter(
            Order.restaurant_id.in_([est_lenta.id, est_rapida.id])).all()]
        PlatformDriverStop.query.filter(
            PlatformDriverStop.order_id.in_(all_orders)).delete(synchronize_session=False)
        Order.query.filter(Order.id.in_(all_orders)).update(
            {'platform_route_id': None, 'driver_id': None}, synchronize_session=False)
        Order.query.filter(Order.id.in_(all_orders)).delete(synchronize_session=False)
        Address.query.filter(Address.customer.has(Customer.name.like(f'RR % {pid}'))).delete(
            synchronize_session=False)
        Customer.query.filter(Customer.name.like(f'RR % {pid}')).delete(synchronize_session=False)
        RouteSettings.query.filter(RouteSettings.tenant_id == tenant.id).delete(
            synchronize_session=False)
        Restaurant.query.filter(Restaurant.id.in_([est_lenta.id, est_rapida.id])).delete(
            synchronize_session=False)
        Square.query.filter(Square.id == sq.id).delete(synchronize_session=False)
        User.query.filter(User.email == f'admin.rr.{pid}@teste.com').delete(synchronize_session=False)
        Tenant.query.filter(Tenant.id == tenant.id).delete(synchronize_session=False)
        db.session.commit()
        print("limpeza OK")

    falhas = resultados.count(False)
    print("-" * 50)
    print(f"{len(resultados) - falhas}/{len(resultados)} checks OK")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
