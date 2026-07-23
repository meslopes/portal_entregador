"""
Servico de geocodificacao usando Nominatim (OpenStreetMap).
Converte enderecos em coordenadas geograficas (latitude/longitude).
"""
import requests


def geocode_address(address):
    """
    Converte um endereco em coordenadas geograficas.
    
    Args:
        address: Endereco completo (ex: "Rua Principal 100, Porto Alegre, RS")
    
    Returns:
        dict: {'latitude': float, 'longitude': float} ou None se nao encontrar
    """
    try:
        # URL do Nominatim (OpenStreetMap - gratuito)
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            'q': address,
            'format': 'json',
            'limit': 1,
            'countrycodes': 'br'
        }
        headers = {
            'User-Agent': 'muv.log/1.0 (sistema de delivery)'
        }

        response = requests.get(url, params=params, headers=headers, timeout=5)
        data = response.json()

        if data and len(data) > 0:
            return {
                'latitude': float(data[0]['lat']),
                'longitude': float(data[0]['lon']),
                'display_name': data[0].get('display_name', '')
            }

        return None

    except Exception as e:
        print(f"Erro na geocodificacao: {e}")
        return None


def geocode Establishment(address, city=None, state=None):
    """
    Geocodifica o endereco de um estabelecimento.
    Tenta primeiro com endereco completo, depois com cidade+estado.
    """
    # Tenta com endereco completo
    result = geocode_address(address)
    if result:
        return result

    # Se falhou, tenta com cidade e estado
    if city and state:
        full_address = f"{address}, {city}, {state}, Brasil"
        result = geocode_address(full_address)
        if result:
            return result

    # Ultimo recurso: busca por cidade apenas
    if city:
        result = geocode_address(f"{city}, Brasil")
        if result:
            return result

    return None
