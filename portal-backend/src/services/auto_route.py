# -*- coding: utf-8 -*-
"""
Rota automática de entregador PRÓPRIO (F2 — 2026-11-24).

Regra (aprovada pelo Mauro): 2+ pedidos no mesmo entregador (oferta, aceite
ou movimentação) => a rota nasce CALCULADA e ATIVA direto (sem segundo
aceite), completa para o entregador (navegação via Google Maps — suporta
mais etapas que o Waze).

A rota é RECONSTRUÍDA por completo a cada mudança (`manter_rota_automatica`)
— nunca fica desatualizada: pedidos que saem (movidos/rejeitados) saem da
rota; entram os novos; a ordem das paradas é recalculada (em andamento
primeiro, depois vizinho mais próximo saindo do estabelecimento).
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


def _coord(pedido):
    a = pedido.delivery_address
    if a and a.latitude is not None and a.longitude is not None:
        return (float(a.latitude), float(a.longitude))
    return None


def _ordenar_paradas(pedidos, base):
    """Em andamento primeiro; depois vizinho mais próximo a partir da base."""
    em_andamento = [p for p in pedidos if p.status == OrderStatus.PICKED_UP]
    pendentes = [p for p in pedidos if p.status != OrderStatus.PICKED_UP]
    ordenados = list(em_andamento)
    atual = base
    while pendentes:
        def dist(p, _atual=atual):
            c = _coord(p)
            if not c or _atual is None:
                return 0
            return haversine_distance(_atual[0], _atual[1], c[0], c[1])
        pendentes.sort(key=dist)
        escolhido = pendentes.pop(0)
        ordenados.append(escolhido)
        c = _coord(escolhido)
        if c:
            atual = c
    return ordenados


def manter_rota_automatica(driver_id):
    """
    Reconstrói a rota do entregador a partir dos pedidos ativos dele.
    - 2+ pedidos => rota única ATIVA com paradas ordenadas
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

    resto = driver.restaurant
    base = (float(resto.latitude), float(resto.longitude)) if (resto and resto.latitude) else None
    rota = OwnDriverRoute(
        establishment_driver_id=driver_id,
        restaurant_id=driver.restaurant_id,
        status='ACTIVE',  # decisão do Mauro: ativa direto, sem segundo aceite
    )
    db.session.add(rota)
    db.session.flush()

    for i, p in enumerate(_ordenar_paradas(ativos, base)):
        a = p.delivery_address
        db.session.add(OwnDriverStop(
            route_id=rota.id,
            order_id=p.id,
            stop_order=i + 1,
            stop_type='DELIVERY',
            latitude=a.latitude if a else None,
            longitude=a.longitude if a else None,
            address=f'{a.street}, {a.neighborhood}' if a else None,
            status='PENDING',
        ))
        p.own_driver_route_id = rota.id
    return rota
