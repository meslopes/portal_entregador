# -*- coding: utf-8 -*-
"""
Rota automática de entregador PRÓPRIO (F2/F3 — 2026-11-24).

Regra (aprovada pelo Mauro): 2+ pedidos no mesmo entregador (oferta, aceite
ou movimentação) => a rota nasce CALCULADA e ATIVA direto (sem segundo
aceite), completa para o entregador (navegação via Google Maps — suporta
mais etapas que o Waze).

A rota é RECONSTRUÍDA por completo a cada mudança (`manter_rota_automatica`)
— nunca fica desatualizada: pedidos que saem (movidos/rejeitados) saem da
rota; entram os novos; a ordem das paradas é recalculada.

F3 (2026-11-24) — rota multi-loja INTERCALADA (regras travadas do Mauro):
- entrega só depois da COLETA da própria loja;
- NUNCA "todas coletas antes/depois de todas entregas" — coletas e entregas
  se INTERCALAM pelo vizinho mais próximo (geográfica);
- pedidos já coletados (PICKED_UP) ficam primeiro (em andamento);
- a rota sai da loja BASE (`route.restaurant_id` — "sai da loja dele");
- coletas viram paradas reais (PICKUP) só em rota multi-loja — em rota de
  loja única a coleta segue implícita (anti-poluição visual);
- `stop_order` = embalagem (contador das entregas) · `stop_seq` = ordem
  global da rota (coletas incluídas).
"""
from src.models.portal_models import (
    EstablishmentDriver,
    Order,
    OrderStatus,
    OwnDriverRoute,
    OwnDriverStop,
    db,
)
from src.utils.geo import haversine_distance

# Pedidos que pertencem à rota (coletado ainda é parada viva)
STATUS_EM_ROTA = (
    OrderStatus.OFFERED, OrderStatus.ACCEPTED, OrderStatus.PREPARING,
    OrderStatus.READY, OrderStatus.PICKED_UP,
)


def _coord_pedido(pedido):
    a = pedido.delivery_address
    if a and a.latitude is not None and a.longitude is not None:
        return (float(a.latitude), float(a.longitude))
    return None


def _coord_loja(rest):
    if rest and rest.latitude is not None and rest.longitude is not None:
        return (float(rest.latitude), float(rest.longitude))
    return None


def _dist(p1, p2):
    if not p1 or not p2:
        return 1e12  # sem coordenada vai para o fim (mantém estável)
    return haversine_distance(p1[0], p1[1], p2[0], p2[1])


def _specs_intercalados(pedidos, origem):
    """Monta a sequência de paradas da rota (F3).

    Retorna specs na ordem: dicts
    {'stop_type': 'PICKUP'|'DELIVERY', 'order': pedido|None,
     'restaurant': Restaurant}. Coletas só quando a rota é multi-loja.
    """
    if not pedidos:
        return []

    lojas = {p.restaurant_id: p.restaurant for p in pedidos if p.restaurant_id}
    multi = len(lojas) > 1
    origem_coord = _coord_loja(origem)

    # Em andamento primeiro (já coletados — regra aprovada M1)
    em_andamento = [p for p in pedidos if p.status == OrderStatus.PICKED_UP]
    restantes = [p for p in pedidos if p.status != OrderStatus.PICKED_UP]

    specs = []

    # Rota multi-loja: coleta da loja BASE é a primeira parada ("sai da loja dele")
    coletadas = set()
    if multi and origem is not None:
        specs.append({'stop_type': 'PICKUP', 'order': None, 'restaurant': origem})
        coletadas.add(origem.id)
    elif origem is not None:
        coletadas.add(origem.id)  # loja única: coleta implícita
    if not multi:
        for rid in lojas:
            coletadas.add(rid)  # rota de loja única: coleta da loja é implícita

    # Coletas já feitas dos pedidos em andamento
    for p in em_andamento:
        if p.restaurant_id:
            coletadas.add(p.restaurant_id)

    # Em andamento: entregas primeiro (vizinho mais próximo entre elas)
    atual = origem_coord
    fila = list(em_andamento)
    while fila:
        fila.sort(key=lambda p: _dist(atual, _coord_pedido(p)))
        escolhido = fila.pop(0)
        specs.append({'stop_type': 'DELIVERY', 'order': escolhido,
                      'restaurant': escolhido.restaurant})
        c = _coord_pedido(escolhido)
        if c:
            atual = c

    # Resto: greedy INTERCALADO — a cada passo, a ação disponível mais
    # próxima = coleta de loja pendente OU entrega de pedido já coletado
    por_loja = {}
    for p in restantes:
        por_loja.setdefault(p.restaurant_id, []).append(p)

    while any(por_loja.values()):
        acoes = []
        for rid, pedidos_loja in por_loja.items():
            if not pedidos_loja:
                continue
            rest = lojas.get(rid)
            if rid not in coletadas:
                # coleta pendente da loja — só faz sentido em rota multi-loja
                if multi:
                    acoes.append(('PICKUP', rest, None, _coord_loja(rest)))
            else:
                for p in pedidos_loja:
                    acoes.append(('DELIVERY', rest, p, _coord_pedido(p)))
        if not acoes:
            break  # nada disponível (sem coordenada/coleta) — evita loop
        acoes.sort(key=lambda a: _dist(atual, a[3]))
        tipo, rest, pedido, coord = acoes[0]
        if tipo == 'PICKUP':
            specs.append({'stop_type': 'PICKUP', 'order': None, 'restaurant': rest})
            coletadas.add(rest.id if rest else None)
            atual = coord or atual
        else:
            specs.append({'stop_type': 'DELIVERY', 'order': pedido, 'restaurant': rest})
            por_loja[pedido.restaurant_id].remove(pedido)
            if coord:
                atual = coord

    return specs


def reconstruir_paradas_rota(route):
    """Rebuild completo das paradas da rota (coletas + entregas intercaladas).
    Preserva status/atras das paradas já concluídas (match por tipo+pedido/loja).
    Embaralhamento: `stop_order` = embalagem · `stop_seq` = ordem global."""
    pedidos = Order.query.filter(Order.own_driver_route_id == route.id).all()
    specs = _specs_intercalados(pedidos, route.restaurant)

    # Snapshot do estado anterior (preserva COMPLETED no rebuild)
    antigos = {}
    for s in route.stops:
        antigos[(s.stop_type, s.order_id, s.restaurant_id)] = s

    OwnDriverStop.query.filter_by(route_id=route.id).delete()

    seq = 0
    embalagem = 0
    for spec in specs:
        seq += 1
        pedido = spec['order']
        rest = spec['restaurant']
        chave = (spec['stop_type'], pedido.id if pedido else None,
                 rest.id if rest else None)
        velho = antigos.get(chave)
        if spec['stop_type'] == 'DELIVERY':
            embalagem += 1
        db.session.add(OwnDriverStop(
            route_id=route.id,
            order_id=pedido.id if pedido else None,
            restaurant_id=rest.id if rest else None,
            stop_order=embalagem if spec['stop_type'] == 'DELIVERY' else None,
            stop_seq=seq,
            stop_type=spec['stop_type'],
            latitude=(pedido.delivery_address.latitude if pedido and pedido.delivery_address
                      else (rest.latitude if rest else None)),
            longitude=(pedido.delivery_address.longitude if pedido and pedido.delivery_address
                       else (rest.longitude if rest else None)),
            address=(f'{pedido.delivery_address.street}, {pedido.delivery_address.neighborhood}'
                     if pedido and pedido.delivery_address
                     else (f'Coleta — {rest.name}' if rest else None)),
            status=velho.status if velho else 'PENDING',
            arrived_at=velho.arrived_at if velho else None,
            completed_at=velho.completed_at if velho else None,
        ))
    return specs


def manter_rota_automatica(driver_id):
    """
    Reconstrói a rota do entregador a partir dos pedidos ativos dele.
    - 2+ pedidos => rota ÚNICA ATIVA com paradas intercaladas (F3)
    - <2 pedidos => sem rota (desvincula e apaga as existentes)
    Retorna a rota ou None.
    """
    driver = EstablishmentDriver.query.get(driver_id)
    if not driver or not driver.restaurant_id:
        return None

    ativos = Order.query.filter(
        Order.establishment_driver_id == driver_id,
        Order.status.in_(STATUS_EM_ROTA),
    ).all()

    # Remove rotas atuais do driver (rebuild completo — nada sobra órfão)
    rotas = OwnDriverRoute.query.filter(
        OwnDriverRoute.establishment_driver_id == driver_id,
        OwnDriverRoute.status.in_(['CREATED', 'PENDING', 'ACTIVE']),
    ).all()
    for r in rotas:
        for p in Order.query.filter(Order.own_driver_route_id == r.id).all():
            p.own_driver_route_id = None
        OwnDriverStop.query.filter_by(route_id=r.id).delete()
        db.session.delete(r)

    if len(ativos) < 2:
        return None

    # Loja BASE da rota = base do entregador ("sai da loja dele")
    rota = OwnDriverRoute(
        establishment_driver_id=driver_id,
        restaurant_id=driver.restaurant_id,
        status='ACTIVE',  # decisão do Mauro: ativa direto, sem segundo aceite
    )
    db.session.add(rota)
    db.session.flush()

    for p in ativos:
        p.own_driver_route_id = rota.id
    reconstruir_paradas_rota(rota)
    return rota
