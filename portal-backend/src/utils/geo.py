import math


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calcula distância entre dois pontos usando fórmula de Haversine (em km)"""
    if not all([lat1, lon1, lat2, lon2]):
        return 0
    try:
        lat1, lon1, lat2, lon2 = map(math.radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        r = 6371  # Raio da Terra em km
        return round(c * r, 2)
    except (TypeError, ValueError):
        return 0
