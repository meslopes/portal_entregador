import math


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calcula distância entre dois pontos usando fórmula de Haversine (em km)"""
    if any(v is None for v in [lat1, lon1, lat2, lon2]):
        return 0
    try:
        lat1, lon1, lat2, lon2 = map(math.radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(min(math.sqrt(a), 1.0))
        r = 6371  # Raio da Terra em km
        return round(c * r, 2)
    except (TypeError, ValueError):
        return 0


def bearing_deg(lat1, lon1, lat2, lon2):
    """Rumo (bearing) do ponto 1 ao ponto 2, em graus (0=N, 90=L, 180=S, 270=O).

    Usado pelo motor de corredor angular da distribuição de pedidos:
    o rumo do estabelecimento até a entrega é comparado com o rumo da rota
    do entregador (distribuição configurável, 2026-11-24).
    """
    if any(v is None for v in [lat1, lon1, lat2, lon2]):
        return None
    try:
        lat1, lon1, lat2, lon2 = map(math.radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
        dlon = lon2 - lon1
        x = math.sin(dlon) * math.cos(lat2)
        y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
        return (math.degrees(math.atan2(x, y)) + 360) % 360
    except (TypeError, ValueError):
        return None


def circular_angle_diff(a, b):
    """Menor arco entre dois rumos em graus (0..180) — trata a virada 0°/360°."""
    if a is None or b is None:
        return None
    diff = abs((float(a) - float(b)) % 360)
    return min(diff, 360 - diff)
