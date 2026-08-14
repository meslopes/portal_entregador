"""Funções utilitárias para busca de restaurantes"""

from src.models.portal_models import Restaurant


def find_restaurant_by_name(name):
    """Busca restaurante por nome (case-insensitive)"""
    if not name:
        return None
    restaurant = Restaurant.query.filter_by(name=name).first()
    if restaurant:
        return restaurant
    return Restaurant.query.filter(Restaurant.name.ilike(name)).first()
