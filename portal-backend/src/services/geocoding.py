"""
Servico de geocodificacao usando Nominatim (OpenStreetMap).
Converte enderecos em coordenadas geograficas (latitude/longitude).
Servico de roteirizacao usando OSRM para distancia real.
"""
import requests
import logging

logger = logging.getLogger(__name__)

# OSRM public server
OSRM_URL = "https://router.project-osrm.org/route/v1/driving"


def get_route_distance(lat1, lng1, lat2, lng2):
    """
    Calcula a distancia real de direção entre dois pontos usando OSRM.
    
    Args:
        lat1, lng1: Coordenadas de origem
        lat2, lng2: Coordenadas de destino
    
    Returns:
        dict: {'distance_km': float, 'duration_min': float, 'geometry': list} ou None
    """
    try:
        # OSRM espera lng,lat (não lat,lng)
        url = f"{OSRM_URL}/{lng1},{lat1};{lng2},{lat2}"
        params = {
            'overview': 'false',
            'geometries': 'geojson'
        }
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data.get('code') == 'Ok' and data.get('routes'):
            route = data['routes'][0]
            distance_km = route['distance'] / 1000  # metros para km
            duration_min = route['duration'] / 60  # segundos para minutos
            
            return {
                'distance_km': round(distance_km, 2),
                'duration_min': round(duration_min, 1),
                'geometry': route.get('geometry', {}).get('coordinates', [])
            }
        
        return None
    except Exception as e:
        logger.error(f"Erro ao calcular rota OSRM: {e}")
        return None


def get_route_distance_with_fallback(lat1, lng1, lat2, lng2):
    """
    Calcula distancia real com fallback para Haversine.
    
    Returns:
        dict: {'distance_km': float, 'duration_min': float, 'source': str}
    """
    # Tentar OSRM primeiro
    route = get_route_distance(lat1, lng1, lat2, lng2)
    if route:
        route['source'] = 'osrm'
        return route
    
    # Fallback: Haversine
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371  # Raio da Terra em km
    lat1_r, lat2_r = radians(lat1), radians(lat2)
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    
    a = sin(dlat/2)**2 + cos(lat1_r) * cos(lat2_r) * sin(dlng/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    distance_km = R * c
    
    return {
        'distance_km': round(distance_km, 2),
        'duration_min': round(distance_km / 30 * 60, 1),  # Estimativa: 30km/h média
        'source': 'haversine'
    }


# Coordenadas de fallback para cidades conhecidas
CITY_COORDS = {
    'capão da canoa': {'lat': -29.7447, 'lng': -50.0111},
    'capao da canoa': {'lat': -29.7447, 'lng': -50.0111},
    'xangri-lá': {'lat': -29.8083, 'lng': -50.0500},
    'xangri la': {'lat': -29.8083, 'lng': -50.0500},
    'porto alegre': {'lat': -30.0346, 'lng': -51.2177},
    'gramado': {'lat': -29.3787, 'lng': -50.8767},
    'canela': {'lat': -29.3556, 'lng': -50.8119},
    'torres': {'lat': -29.3333, 'lng': -49.7333},
    'osório': {'lat': -29.8867, 'lng': -50.2683},
    'tramandaí': {'lat': -29.9850, 'lng': -50.1333},
    'criciúma': {'lat': -28.6775, 'lng': -49.3697},
    'florianópolis': {'lat': -27.5954, 'lng': -48.5480},
    'curitiba': {'lat': -25.4284, 'lng': -49.2733},
    'são paulo': {'lat': -23.5505, 'lng': -46.6333},
    'rio de janeiro': {'lat': -22.9068, 'lng': -43.1729},
    'brasília': {'lat': -15.7975, 'lng': -47.8919},
    'belo horizonte': {'lat': -19.9167, 'lng': -43.9345},
    'salvador': {'lat': -12.9714, 'lng': -38.5124},
    'fortaleza': {'lat': -3.7172, 'lng': -38.5433},
    'recife': {'lat': -8.0476, 'lng': -34.8770},
    'manaus': {'lat': -3.1190, 'lng': -60.0217},
    'belém': {'lat': -1.4558, 'lng': -48.5024},
    'goiânia': {'lat': -16.6869, 'lng': -49.2648},
    'campinas': {'lat': -22.9099, 'lng': -47.0626},
    'vitória': {'lat': -20.3155, 'lng': -40.3128},
    'natal': {'lat': -5.7945, 'lng': -35.2110},
    'joão pessoa': {'lat': -7.1195, 'lng': -34.8450},
    'maceió': {'lat': -9.6658, 'lng': -35.7353},
    'aracaju': {'lat': -10.9091, 'lng': -37.0677},
    'teresina': {'lat': -5.0892, 'lng': -42.8019},
    'são luís': {'lat': -2.5297, 'lng': -44.2825},
    'campo grande': {'lat': -20.4697, 'lng': -54.6201},
    'cuiabá': {'lat': -15.6014, 'lng': -56.0979},
    'palmas': {'lat': -10.1689, 'lng': -48.3317},
    'rio branco': {'lat': -9.9747, 'lng': -67.8100},
    'macapá': {'lat': 0.0349, 'lng': -51.0694},
    'boa vista': {'lat': 2.8195, 'lng': -60.6714},
    'porto velho': {'lat': -8.7612, 'lng': -63.9004},
}


def geocode_with_photon(address, city_hint=None):
    """
    Tenta geocodificar usando Photon (baseado em OSM, melhor busca).
    """
    import re
    
    if not address:
        return None
    
    # Limpa o endereco
    clean = address.replace(' - ', ', ').replace('  ', ' ').strip()
    clean = re.sub(r',?\s*\d{5}-?\d{3}\s*$', '', clean).strip()
    clean = re.sub(r',\s*,', ',', clean).strip().rstrip(',')
    
    # Monta query para Photon
    query = clean
    if city_hint:
        query = f"{clean}, {city_hint}"
    
    try:
        url = "https://photon.komoot.io/api/"
        params = {
            'q': query,
            'limit': 5,
            'lang': 'pt'
        }
        
        response = requests.get(url, params=params, timeout=5)
        data = response.json()
        
        if data.get('features') and len(data['features']) > 0:
            # Filtrar resultados pelo Brasil
            for feature in data['features']:
                props = feature.get('properties', {})
                country = props.get('country', '').lower()
                if 'brasil' in country or 'brazil' in country:
                    coords = feature['geometry']['coordinates']
                    lng, lat = coords[0], coords[1]
                    
                    # Verificar se tem cidade no resultado
                    city = props.get('city', '').lower()
                    district = props.get('district', '')
                    street = props.get('street', '')
                    name = props.get('name', '')
                    
                    display_parts = [street or name, district, city, 'Brasil']
                    display_name = ', '.join(p for p in display_parts if p)
                    
                    logger.info(f"Photon OK: '{query}' => {lat}, {lng} ({display_name})")
                    return {
                        'latitude': float(lat),
                        'longitude': float(lng),
                        'display_name': display_name,
                        'source': 'photon'
                    }
        
        logger.info(f"Photon sem resultados para: '{query}'")
        return None
        
    except Exception as e:
        logger.error(f"Erro no Photon para '{query}': {e}")
        return None


def geocode_address(address, city_hint=None):
    """
    Converte um endereco em coordenadas geograficas.
    Tenta Photon primeiro (melhor busca), depois Nominatim.
    
    Args:
        address: Endereco completo (ex: "Rua Principal 100, Porto Alegre, RS")
        city_hint: Nome da cidade para melhorar a busca (opcional)
    
    Returns:
        dict: {'latitude': float, 'longitude': float, 'display_name': str} ou None
    """
    if not address or address == 'Endereço não informado':
        return None

    headers = {
        'User-Agent': 'muv.log/1.0 (sistema de delivery)'
    }

    # Limpa o endereco
    clean = address.replace(' - ', ', ').replace('  ', ' ').strip()
    # Remove CEP no final se existir
    import re
    clean = re.sub(r',?\s*\d{5}-?\d{3}\s*$', '', clean).strip()
    # Remove virgulas duplas
    clean = re.sub(r',\s*,', ',', clean).strip().rstrip(',')

    # TENTAR PHOTON PRIMEIRO (melhor busca para endereços brasileiros)
    photon_result = geocode_with_photon(address, city_hint)
    if photon_result:
        return photon_result
    
    logger.info("Photon falhou, tentando Nominatim...")

    # Lista de formatacoes para tentar (ordem importa)
    formats = []
    
    # Se tem city_hint, usa ele primeiro (mais específico)
    if city_hint:
        formats.append(f"{clean}, {city_hint}, RS, Brasil")
        formats.append(f"{clean}, {city_hint}, Brasil")
        formats.append(f"{clean}, {city_hint}, Rio Grande do Sul, Brasil")
    
    # Formato original limpo
    formats.append(clean)
    formats.append(clean + ', Brasil')
    
    # Tenta extrair cidade do endereço se não tem city_hint
    if not city_hint:
        # Tenta encontrar cidade no endereço (padrão: "endereço, cidade - UF")
        city_match = re.search(r',\s*([^-]+?)\s*-\s*[A-Z]{2}', clean)
        if city_match:
            extracted_city = city_match.group(1).strip()
            formats.append(f"{clean}, {extracted_city}, Brasil")

    for fmt in formats:
        try:
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                'q': fmt,
                'format': 'json',
                'limit': 1,
                'countrycodes': 'br',
                'addressdetails': 1
            }

            response = requests.get(url, params=params, headers=headers, timeout=5)
            data = response.json()

            if data and len(data) > 0:
                result = {
                    'latitude': float(data[0]['lat']),
                    'longitude': float(data[0]['lon']),
                    'display_name': data[0].get('display_name', '')
                }
                logger.info(f"Geocodificacao OK: '{fmt}' => {result['latitude']}, {result['longitude']}")
                return result

        except Exception as e:
            logger.error(f"Erro na geocodificacao para '{fmt}': {e}")
            continue

    # Fallback: retorna coordenadas da cidade com flag is_approximate
    # O frontend vai mostrar mapa para o usuário ajustar o pino manualmente
    city_for_fallback = city_hint
    if not city_for_fallback:
        city_match = re.search(r',\s*([^-]+?)\s*-\s*[A-Z]{2}', clean)
        if city_match:
            city_for_fallback = city_match.group(1).strip()
    
    if city_for_fallback:
        city_key = city_for_fallback.lower().strip()
        if city_key in CITY_COORDS:
            coords = CITY_COORDS[city_key]
            logger.warning(f"Geocodificacao falhou para '{address}', retornando centro de {city_for_fallback} como aproximacao inicial")
            return {
                'latitude': coords['lat'],
                'longitude': coords['lng'],
                'display_name': f'{city_for_fallback} (aproximado - ajuste no mapa)',
                'is_approximate': True
            }
    
    logger.warning(f"Geocodificacao falhou para: '{address}' (sem fallback)")
    return None


def geocode_establishment(address, city=None, state=None):
    """
    Geocodifica o endereco de um estabelecimento.
    """
    result = geocode_address(address, city_hint=city)
    if result:
        return result

    if city and state:
        full_address = f"{address}, {city}, {state}, Brasil"
        result = geocode_address(full_address, city_hint=city)
        if result:
            return result

    if city:
        result = geocode_address(f"{city}, Brasil")
        if result:
            return result

    return None
