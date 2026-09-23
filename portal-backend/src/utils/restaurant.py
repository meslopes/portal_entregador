"""Utility functions for restaurant operations."""
from src.models.portal_models import Restaurant


def find_restaurant_by_name(name):
    """Find a restaurant by name (case-insensitive)."""
    if not name:
        return None
    return Restaurant.query.filter(
        Restaurant.name.ilike(f'%{name}%')
    ).first()
