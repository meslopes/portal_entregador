# -*- coding: utf-8 -*-
"""
Smoke da numeração estendida (2026-11-26).
1) #seq curto também nos caminhos alternativos de criação (link rápido)
2) Embalagem nas rotas da PLATAFORMA: stop_seq global + stop_order = embalagem
   (NULL em coleta) + package_number no to_dict do pedido

Uso: python scripts/_tmp_smoke_seq2.py   (backend rodando em localhost:5000)
"""
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
        Address, Customer, Driver, Order, PaymentMethod, PlatformDriverRoute,
        PlatformDriverStop, Restaurant, Square, Tenant, User, UserStatus,
        UserType, OrderStatus, db,
    )
    from flask_jwt_extended import create_access_token

    resultados = []

    def check(nome, ok, detalhe=""):
        resultados.append(ok)
        print(("PASS " if ok else "FAIL ") + nome + (" — " + detalhe if detalhe else ""))

    with app.app_context():
        pid = os.getpid()
        tenant = Tenant(name=f"Tenant Seq2 {pid}", slug=f"seq2-{pid}", is_active=True)
        db.session.add(tenant)
        db.session.flush()
        admin = User(email=f"admin.seq2.{pid}@teste.com", first_name="Seq2", last_name="Admin",
                     user_type=UserType.ADMIN, status=UserStatus.ACTIVE, tenant_id=tenant.id)
        admin.set_password("Teste12345")
        db.session.add(admin)
        db.session.flush()
        sq = Square(name=f"Praca Seq2 {pid}", city="Canoas", state="RS", tenant_id=tenant.id)
        db.session.add(sq)
        db.session.flush()
        # Estab A: pedidos pelo link; Estab B: rota da plataforma
        est_a = Restaurant(name=f"Estab Seq2A {pid}", address="Rua A", latitude=-29.7,
                           longitude=-50.0, tenant_id=tenant.id, square_id=sq.id)
        est_b = Restaurant(name=f"Estab Seq2B {pid}", address="Rua B", latitude=-29.71,
                           longitude=-50.01, tenant_id=tenant.id, square_id=sq.id)
        db.session.add_all([est_a, est_b])
        db.session.flush()

        # Entregador da plataforma (para a rota)
        drv_user = User(email=f"driver.seq2.{pid}@teste.com", first_name="Motor", last_name="Seq2",
                        user_type=UserType.DRIVER, status=UserStatus.ACTIVE, tenant_id=tenant.id)
        drv_user.set_password("Teste12345")
        db.session.add(drv_user)
        db.session.flush()
        drv = Driver(user_id=drv_user.id, tenant_id=tenant.id, rating=5.0,
                     vehicle_type='MOTORCYCLE', is_online=True)
        db.session.add(drv)
        db.session.commit()

        admin_tok = create_access_token(identity=str(admin.id))
        ids_a, ids_b = est_a.id, est_b.id
        drv_id = drv.id

        # --- 1) Link rápido: gerar link e criar pedido público ---
        s, r = req("POST", f"/api/order-link?restaurant_id={ids_a}", {}, token=admin_tok)
        path = r.get("order_link_path") or ""
        token_link = path.split("/")[-1] if path else ""
        check("link rápido gerado", s == 200 and bool(token_link), f"s={s} {path}")

        s, r = req("POST", f"/api/order-link/{token_link}", {
            "customer_name": f"Cliente Seq2 {pid}", "phone": "51999887700",
            "street": "Rua Seq2", "number": "10", "neighborhood": "Centro",
            "items": "2 pizzas",
        })
        seq_link = (r.get('seq_number') if isinstance(r, dict) else None)
        check("pedido pelo link ganha #seq (não só LINK longo)",
              s == 201 and seq_link is not None,
              f"s={s} seq_number={seq_link}")

        # --- 2) Rota da PLATAFORMA: embalagem + stop_seq ---
        # Dois pedidos no estab B (com coordenadas de entrega)
        pedidos = []
        for n in (1, 2):
            cust = Customer(name=f"Plat Seq2 {pid}-{n}", phone=f"51988{pid % 10000:04d}{n}",
                            tenant_id=tenant.id)
            db.session.add(cust)
            db.session.flush()
            addr = Address(customer_id=cust.id, street=f"Rua Plat {n}, 100", neighborhood="Centro",
                           city="Canoas", state="RS", zip_code="90000-000",
                           latitude=-29.72 - n * 0.001, longitude=-50.02)
            db.session.add(addr)
            db.session.flush()
            ped = Order(tenant_id=tenant.id, restaurant_id=ids_b, customer_id=cust.id,
                        delivery_address_id=addr.id, driver_id=None,
                        order_number=f"SEQ2{pid}-{n}",
                        items=[{'name': 'Item', 'quantity': 1, 'price': 10}],
                        subtotal=10, delivery_fee=2, total_amount=12,
                        payment_method=PaymentMethod.CASH, status=OrderStatus.READY)
            db.session.add(ped)
            db.session.flush()
            pedidos.append(ped.id)
        db.session.commit()

        s, r = req("POST", "/api/platform-routes/create",
                   {"driver_id": drv_id, "order_ids": pedidos}, token=admin_tok)
        rota_id = (r.get('route') or {}).get('id')
        check("rota da plataforma criada", s == 201 and rota_id, f"s={s} {str(r)[:120]}")

        db.session.expire_all()
        stops = PlatformDriverStop.query.filter_by(route_id=rota_id).order_by(
            PlatformDriverStop.stop_seq).all()
        seqs = [st.stop_seq for st in stops]
        emb_coleta = [st.stop_order for st in stops if st.stop_type == 'PICKUP']
        emb_entrega = [st.stop_order for st in stops if st.stop_type == 'DELIVERY']
        check("stop_seq global 1..N", seqs == list(range(1, len(stops) + 1)), f"seqs={seqs}")
        check("coletas SEM embalagem (NULL)", all(e is None for e in emb_coleta), f"{emb_coleta}")
        check("entregas numeradas 1,2 (embalagem)", emb_entrega == [1, 2], f"{emb_entrega}")

        o1 = Order.query.get(pedidos[0])
        o2 = Order.query.get(pedidos[1])
        pkg1 = o1.to_dict().get('package_number')
        pkg2 = o2.to_dict().get('package_number')
        check("package_number do pedido = embalagem da rota da plataforma",
              pkg1 == 1 and pkg2 == 2, f"pkg1={pkg1} pkg2={pkg2}")

        d0 = stops[0].to_dict()
        check("parada expõe seq_number + stop_seq + embalagem",
              'seq_number' in d0 and 'stop_seq' in d0 and 'stop_order' in d0,
              f"chaves={sorted(k for k in d0 if k.startswith('stop') or k.startswith('seq'))}")

        # --- 3) remove-order: embalagem renumerada ---
        s, r = req("POST", f"/api/platform-routes/{rota_id}/remove-order",
                   {"order_id": pedidos[0]}, token=admin_tok)
        db.session.expire_all()
        restantes = PlatformDriverStop.query.filter_by(route_id=rota_id).order_by(
            PlatformDriverStop.stop_seq).all()
        emb_rest = [st.stop_order for st in restantes if st.stop_type == 'DELIVERY']
        seq_rest = [st.stop_seq for st in restantes]
        check("remove pedido: embalagem renumerada (sobra = 1)",
              s == 200 and emb_rest == [1] and seq_rest == list(range(1, len(restantes) + 1)),
              f"s={s} emb={emb_rest} seq={seq_rest}")

        # limpeza (lição 39/46: filhos antes dos pais; pedidos antes das rotas)
        all_orders = [o.id for o in Order.query.filter(
            Order.restaurant_id.in_([ids_a, ids_b])).all()]
        PlatformDriverStop.query.filter(
            PlatformDriverStop.order_id.in_(all_orders)).delete(synchronize_session=False)
        PlatformDriverStop.query.filter(
            PlatformDriverStop.route_id == rota_id).delete(synchronize_session=False)
        Order.query.filter(Order.id.in_(all_orders)).update(
            {'platform_route_id': None, 'driver_id': None}, synchronize_session=False)
        PlatformDriverRoute.query.filter(PlatformDriverRoute.id == rota_id).delete(
            synchronize_session=False)
        Order.query.filter(Order.id.in_(all_orders)).delete(synchronize_session=False)
        Address.query.filter(Address.customer.has(Customer.name.like(f'Plat Seq2 {pid}-%'))).delete(
            synchronize_session=False)
        Address.query.filter(Address.customer.has(Customer.name.like(f'Cliente Seq2 {pid}%'))).delete(
            synchronize_session=False)
        Customer.query.filter(Customer.name.like(f'Plat Seq2 {pid}-%')).delete(synchronize_session=False)
        Customer.query.filter(Customer.name.like(f'Cliente Seq2 {pid}%')).delete(synchronize_session=False)
        Driver.query.filter(Driver.id == drv_id).delete(synchronize_session=False)
        User.query.filter(User.email.like(f'%.seq2.{pid}@teste.com')).delete(synchronize_session=False)
        Restaurant.query.filter(Restaurant.id.in_([ids_a, ids_b])).delete(synchronize_session=False)
        Square.query.filter(Square.id == sq.id).delete(synchronize_session=False)
        Tenant.query.filter(Tenant.id == tenant.id).delete(synchronize_session=False)
        db.session.commit()
        print("limpeza OK")

    falhas = resultados.count(False)
    print("-" * 50)
    print(f"{len(resultados) - falhas}/{len(resultados)} checks OK")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
