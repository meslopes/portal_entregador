# -*- coding: utf-8 -*-
"""
Motor de distribuição de pedidos a entregadores PRÓPRIOS (2026-11-24).

Configurável por estabelecimento (diretriz "configurável sem poluir"):
- distribution_mode = MANUAL (padrão — estabelecimento distribui pelo modal)
                   | AUTO   (motor de corredor angular abaixo)
- route_angle_tolerance  = janela de ±G graus em torno do rumo da rota
- route_max_orders       = pedidos simultâneos por entregador/rota
- route_max_distance_km  = raio de segurança a partir do estabelecimento
                           (0 = desligado) — M3, configurável

Corredor angular (M1-M2-M3):
- rumo do pedido   = bearing(estabelecimento → entrega)
- rumo da rota     = bearing(estabelecimento → entrega mais distante do
                     entregador — a direção que ele já está seguindo)
- COMBINA se a diferença angular ≤ ±tolerância (arco circular 0°/360°)
- Prioridade: (1) rota compatível, menor ângulo; (2) livres (sem pedidos),
  mais próximos — consolida rota antes de abrir entrega avulsa.

Cada seleção gera um registro em `Order.distribution_log` (M4 — auditoria:
ângulo, distância, carga e motivo de cada oferta).
"""
import json
from datetime import datetime, timezone

from src.models.portal_models import EstablishmentDriver, Order, OrderStatus
from src.utils.geo import bearing_deg, circular_angle_diff, haversine_distance

# Status que contam como "pedido em rota" (ainda não concluído/cancelado)
STATUS_EM_ROTA = (OrderStatus.OFFERED, OrderStatus.ACCEPTED,
                  OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.PICKED_UP)


def _carga_do_entregador(driver_id):
    return Order.query.filter(
        Order.establishment_driver_id == driver_id,
        Order.status.in_(STATUS_EM_ROTA),
    ).count()


def _rumo_da_rota(driver, restaurant):
    """Rumo da rota do entregador = bearing do estabelecimento até a entrega
    mais distante entre os pedidos ativos dele (a direção que ele já segue)."""
    pedidos = Order.query.filter(
        Order.establishment_driver_id == driver.id,
        Order.status.in_(STATUS_EM_ROTA),
    ).all()
    melhor, melhor_dist = None, -1
    for p in pedidos:
        if not (p.delivery_address and p.delivery_address.latitude):
            continue
        dist = haversine_distance(
            float(restaurant.latitude), float(restaurant.longitude),
            float(p.delivery_address.latitude), float(p.delivery_address.longitude))
        if dist > melhor_dist:
            melhor, melhor_dist = p, dist
    if not melhor:
        return None
    return bearing_deg(
        float(restaurant.latitude), float(restaurant.longitude),
        float(melhor.delivery_address.latitude), float(melhor.delivery_address.longitude))


def selecionar_entregador_proprio(order, exclude_driver_ids=None):
    """
    Escolhe o entregador próprio para OFERECER o pedido (modo AUTO).

    Retorna (driver, info) ou (None, info) — info é o registro de
    distribuição (M4) com o motivo da escolha/não-escolha.
    """
    restaurant = order.restaurant
    exclude_driver_ids = exclude_driver_ids or []
    info = {'ts': datetime.now(timezone.utc).isoformat(), 'order_id': order.id,
            'pedido': order.order_number, 'motivo': None}

    if not (restaurant and restaurant.has_own_drivers):
        info['motivo'] = 'sem_entregadores_proprios'
        return None, info

    # Geometria do pedido
    dest = order.delivery_address
    if not (restaurant.latitude and restaurant.longitude and dest and dest.latitude):
        info['motivo'] = 'sem_coordenadas'
        return None, info

    dist_pedido = haversine_distance(
        float(restaurant.latitude), float(restaurant.longitude),
        float(dest.latitude), float(dest.longitude))
    rumo_pedido = bearing_deg(
        float(restaurant.latitude), float(restaurant.longitude),
        float(dest.latitude), float(dest.longitude))
    info['distancia_km'] = dist_pedido
    info['rumo_pedido'] = round(rumo_pedido, 1) if rumo_pedido is not None else None

    # M3 — raio de segurança (configurável; 0 = desligado). B (2026-11-24):
    # o raio NÃO bloqueia mais a oferta automática — apenas registra o aviso
    # (mesma filosofia do copiloto: informa, nunca trava o humano/sistema)
    raio = float(restaurant.route_max_distance_km or 0)
    if raio > 0 and dist_pedido > raio:
        info['aviso_raio'] = f'fora_do_raio ({dist_pedido:.1f}km > {raio:.1f}km) — oferta liberada com aviso'

    tolerancia = int(restaurant.route_angle_tolerance or 45)
    limite = int(restaurant.route_max_orders or 3)

    candidatos = EstablishmentDriver.query.filter(
        EstablishmentDriver.restaurant_id == restaurant.id,
        EstablishmentDriver.is_online.is_(True),
        EstablishmentDriver.is_active.is_(True),
    ).all()
    candidatos = [d for d in candidatos if d.id not in exclude_driver_ids]

    compativeis, livres = [], []
    for d in candidatos:
        carga = _carga_do_entregador(d.id)
        if carga >= limite:
            continue  # no cap — respeita limite (override é manual, no modal)
        rumo_rota = _rumo_da_rota(d, restaurant)
        if rumo_rota is None:
            # M1 — sem pedidos: livre, entra depois dos compatíveis
            dist_geo = haversine_distance(
                float(restaurant.latitude), float(restaurant.longitude),
                float(d.current_latitude), float(d.current_longitude)) if d.current_latitude else 9999
            livres.append((d, {'carga': carga, 'angulo': None, 'dist_geo': dist_geo,
                               'classe': 'livre'}))
            continue
        angulo = circular_angle_diff(rumo_pedido, rumo_rota)
        registro = {'carga': carga, 'angulo': round(angulo, 1), 'dist_geo': 0,
                    'classe': 'compativel'}
        if angulo <= tolerancia:
            compativeis.append((d, registro))

    # M2 — ordenação: compatíveis pelo menor ângulo; livres pela proximidade
    compativeis.sort(key=lambda t: (t[1]['angulo'], t[1]['carga']))
    livres.sort(key=lambda t: (t[1]['dist_geo'], t[1]['carga']))
    ordenados = compativeis + livres

    if not ordenados:
        info['motivo'] = 'nenhum_candidato' if candidatos else 'sem_candidatos_disponiveis'
        return None, info

    escolhido, reg = ordenados[0]
    info.update({'driver_id': escolhido.id, 'driver': escolhido.name, 'motivo': reg['classe'],
                 'angulo': reg['angulo'], 'carga': reg['carga'], 'limite': limite,
                 'tolerancia': tolerancia})
    return escolhido, info


def registrar_log_distribuicao(order, info):
    """M4 — acumula o registro de distribuição no pedido (auditoria)."""
    try:
        logs = json.loads(order.distribution_log or '[]')
        logs.append(info)
        order.distribution_log = json.dumps(logs[-20:], ensure_ascii=False)  # últimas 20
    except (ValueError, TypeError):
        order.distribution_log = json.dumps([info], ensure_ascii=False)


# --- Copiloto de roteiro (2026-11-24) — AVISOS, nunca bloqueios -----------
# O humano organiza o roteiro; o sistema apenas aponta possíveis erros
# (fora do corredor, no teto, fora do raio, sobrecarga com colega livre).
# Limiar de "pedido parado" é constante de propósito (evitar config a mais).

PEDIDO_PARADO_MIN = 10


def avisos_do_pedido(order):
    """Avisos sobre o PRÓPRIO pedido (ex.: parado há muito tempo)."""
    avisos = []
    agora = datetime.now(timezone.utc)
    criado = order.created_at
    if criado is not None:
        if criado.tzinfo is None:
            from datetime import timezone as _tz
            criado = criado.replace(tzinfo=_tz.utc)
        minutos = (agora - criado).total_seconds() / 60
        if order.status == OrderStatus.PENDING and minutos >= PEDIDO_PARADO_MIN:
            avisos.append({
                'tipo': 'pedido_pendente',
                'msg': f'⚠️ Pedido parado há {int(minutos)} min sem distribuição',
            })
    return avisos


def avaliar_atribuicao(order, driver, exclude_driver_ids=None):
    """
    Copiloto: avalia atribuir `order` a `driver` e retorna avisos[]
    ({'tipo', 'msg'}) — informa, NUNCA bloqueia. Reusa a geometria do
    corredor (ângulo, carga, raio) + detecção de sobrecarga com colega livre.
    """
    avisos = []
    restaurant = order.restaurant
    dest = order.delivery_address
    if not (restaurant and dest and restaurant.latitude and dest.latitude):
        return avisos

    tolerancia = int(restaurant.route_angle_tolerance or 45)
    limite = int(restaurant.route_max_orders or 3)
    raio = float(restaurant.route_max_distance_km or 0)

    dist_pedido = haversine_distance(
        float(restaurant.latitude), float(restaurant.longitude),
        float(dest.latitude), float(dest.longitude))
    if raio > 0 and dist_pedido > raio:
        avisos.append({'tipo': 'fora_do_raio',
                       'msg': f'⚠️ Pedido a {dist_pedido:.1f}km — fora do raio de {raio:.1f}km'})

    carga = _carga_do_entregador(driver.id)
    if carga >= limite:
        avisos.append({'tipo': 'no_teto',
                       'msg': f'⚠️ {driver.name} já está no teto ({carga}/{limite} pedidos)'})

    rumo_pedido = bearing_deg(
        float(restaurant.latitude), float(restaurant.longitude),
        float(dest.latitude), float(dest.longitude))
    rumo_rota = _rumo_da_rota(driver, restaurant)
    if rumo_rota is not None and rumo_pedido is not None:
        angulo = circular_angle_diff(rumo_pedido, rumo_rota)
        if angulo > tolerancia:
            avisos.append({'tipo': 'fora_do_corredor',
                           'msg': f'⚠️ Fora da direção da rota de {driver.name} '
                                  f'(diferença de {int(angulo)}° — janela ±{tolerancia}°)'})

    # Sobrecarga com colega livre ("um carregado e outro parado")
    if carga > 0:
        excl = set(exclude_driver_ids or []) | {driver.id}
        livres = EstablishmentDriver.query.filter(
            EstablishmentDriver.restaurant_id == restaurant.id,
            EstablishmentDriver.is_online.is_(True),
            EstablishmentDriver.is_active.is_(True),
        ).all()
        for outro in livres:
            if outro.id in excl:
                continue
            if _carga_do_entregador(outro.id) == 0:
                avisos.append({'tipo': 'tem_livre',
                               'msg': f'ℹ️ {outro.name} está livre — considere equilibrar a carga'})
                break

    return avisos
