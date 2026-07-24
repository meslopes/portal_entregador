"""
Servico de geocodificacao usando Nominatim (OpenStreetMap).
Converte enderecos em coordenadas geograficas (latitude/longitude).
"""
import requests


def geocode_address(address):
    """
    Converte um endereco em coordenadas geograficas.
    Tenta varias formatacoes para melhorar a taxa de sucesso.
    
    Args:
        address: Endereco completo (ex: "Rua Principal 100, Porto Alegre, RS")
    
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

    # Lista de formatacoes para tentar
    formats = [
        clean,  # Formato original limpo
        clean + ', Brasil',
        clean + ', Capão da Canoa, RS, Brasil',
    ]

    # Se o endereco nao tem cidade/estado, adiciona
    if 'capão' not in clean.lower() and 'capao' not in clean.lower():
        formats.append(f"{clean}, Capão da Canoa, Rio Grande do Sul, Brasil")

    for fmt in formats:
        try:
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                'q': fmt,
                'format': 'json',
                'limit': 1,
                'countrycodes': 'br'
            }

            response = requests.get(url, params=params, headers=headers, timeout=5)
            data = response.json()

            if data and len(data) > 0:
                result = {
                    'latitude': float(data[0]['lat']),
                    'longitude': float(data[0]['lon']),
                    'display_name': data[0].get('display_name', '')
                }
                print(f"Geocodificacao OK: '{fmt}' => {result['latitude']}, {result['longitude']}")
                return result

        except Exception as e:
            print(f"Erro na geocodificacao para '{fmt}': {e}")
            continue

    print(f"Geocodificacao falhou para: '{address}'")
    return None


def geocode_establishment(address, city=None, state=None):
    """
    Geocodifica o endereco de um estabelecimento.
    """
    result = geocode_address(address)
    if result:
        return result

    if city and state:
        full_address = f"{address}, {city}, {state}, Brasil"
        result = geocode_address(full_address)
        if result:
            return result

    if city:
        result = geocode_address(f"{city}, Brasil")
        if result:
            return result

    return None
