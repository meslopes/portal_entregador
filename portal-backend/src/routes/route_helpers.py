"""Helpers compartilhados das rotas de entrega.

Extraido de route.py no refactor de arquivos grandes (2026-11-01).
Otimizacao de paradas e estatisticas de rota.
"""
import logging

from src.utils.geo import haversine_distance

logger = logging.getLogger(__name__)


def optimize_stop_order(stops):
    """
    Otimiza a ordem das paradas usando algoritmo do vizinho mais próximo.
    Retorna a lista de paradas reordenadas.

    Lógica:
    1. Todas as coletas primeiro (no restaurante)
    2. Entregas ordenadas por proximidade (vizinho mais próximo)
    """
    if len(stops) <= 2:
        for i, stop in enumerate(stops):
            stop['stop_order'] = i + 1
        return stops

    # Separar pickups e deliveries
    pickups = [s for s in stops if s['stop_type'] == 'PICKUP']
    deliveries = [s for s in stops if s['stop_type'] == 'DELIVERY']

    if len(deliveries) <= 1:
        # Se tem 0 ou 1 entrega, não precisa otimizar
        optimized = pickups + deliveries
        for i, stop in enumerate(optimized):
            stop['stop_order'] = i + 1
        return optimized

    # Otimizar ordem das entregas usando vizinho mais próximo
    # Começar do restaurante (último pickup ou primeiro ponto)
    start_lat = pickups[0]['latitude'] if pickups else None
    start_lng = pickups[0]['longitude'] if pickups else None

    # Se não tem coordenadas do restaurante, usar primeira entrega como ponto de partida
    if (not start_lat or not start_lng) and deliveries:
        start_lat = deliveries[0]['latitude']
        start_lng = deliveries[0]['longitude']

    # Algoritmo do vizinho mais próximo
    optimized_deliveries = []
    remaining = list(deliveries)
    current_lat = start_lat
    current_lng = start_lng

    while remaining:
        # Encontrar a entrega mais próxima do ponto atual
        nearest_idx = 0
        nearest_dist = float('inf')

        for i, stop in enumerate(remaining):
            if stop['latitude'] and stop['longitude'] and current_lat and current_lng:
                dist = haversine_distance(
                    float(current_lat), float(current_lng),
                    float(stop['latitude']), float(stop['longitude'])
                )
            else:
                dist = 0  # Se não tem coordenadas, manter ordem original

            if dist < nearest_dist:
                nearest_dist = dist
                nearest_idx = i

        # Adicionar a mais próxima à lista otimizada
        nearest_stop = remaining.pop(nearest_idx)
        optimized_deliveries.append(nearest_stop)
        current_lat = nearest_stop['latitude']
        current_lng = nearest_stop['longitude']

    # Combinar: pickups primeiro, depois deliveries otimizadas
    optimized = pickups + optimized_deliveries

    # Reatribuir ordem
    for i, stop in enumerate(optimized):
        stop['stop_order'] = i + 1

    return optimized


def auto_create_or_update_route(establishment_driver_id, restaurant_id):
    """
    DESABILITADO - Rotas agora são criadas manualmente pelo estabelecimento.
    Mantido para compatibilidade mas não faz nada.
    """
    logger.info("[ROUTE-AUTO] Criação automática desabilitada - rotas são manuais")
    return None


def _update_route_stats(route):
    """Atualiza distância e tempo estimado da rota"""
    try:
        from src.services.geocoding import get_route_distance_with_fallback

        stops = sorted(route.stops, key=lambda s: s.stop_order)
        total_distance = 0
        total_duration = 0

        for i in range(len(stops) - 1):
            if stops[i].latitude and stops[i].longitude and stops[i+1].latitude and stops[i+1].longitude:
                route_info = get_route_distance_with_fallback(
                    float(stops[i].latitude), float(stops[i].longitude),
                    float(stops[i+1].latitude), float(stops[i+1].longitude)
                )
                total_distance += route_info['distance_km']
                total_duration += route_info['duration_min']

        route.total_distance_km = round(total_distance, 2)
        route.total_duration_min = round(total_duration, 1)

    except Exception as e:
        logger.error(f"[ROUTE-AUTO] Erro ao calcular stats da rota: {e}")



