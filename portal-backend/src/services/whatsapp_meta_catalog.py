"""
WhatsApp — Meta Catalog Sync (opção configurável — 2026-11-25).
Sincroniza produtos do MuvLog com o catálogo da Meta (habilita carrinho nativo).
Fonte da verdade: MuvLog. Meta Catalog = exibição rica no WhatsApp.
"""
import logging
import requests

from src.models.portal_models import (
    WhatsAppCredential, WhatsAppProduct, db,
)

logger = logging.getLogger(__name__)

GRAPH_API = 'https://graph.facebook.com/v18.0'


def sync_catalog(restaurant_id):
    """
    Sincroniza produtos do MuvLog com o Meta Catalog.
    Retorna (sucesso, mensagem).
    """
    try:
        cred = WhatsAppCredential.query.filter_by(
            restaurant_id=restaurant_id, is_active=True, sync_to_meta_catalog=True
        ).first()
        if not cred or not cred.access_token or not cred.business_account_id:
            return False, 'Sync não habilitado ou credenciais faltando'

        products = WhatsAppProduct.query.filter_by(
            restaurant_id=restaurant_id, is_active=True
        ).all()

        headers = {
            'Authorization': f'Bearer {cred.access_token}',
            'Content-Type': 'application/json',
        }

        # Obter ou criar catálogo
        catalog_id = cred.catalog_id
        if not catalog_id:
            catalog_id = _create_catalog(cred, headers)
            if not catalog_id:
                return False, 'Erro ao criar catálogo na Meta'
            cred.catalog_id = catalog_id
            db.session.commit()

        # Sincronizar produtos
        synced = 0
        for product in products:
            try:
                _sync_product(cred, catalog_id, product, headers)
                synced += 1
            except Exception as e:
                logger.warning(f'[META CATALOG] Erro ao sincronizar {product.name}: {e}')

        return True, f'{synced} produtos sincronizados'

    except Exception as e:
        logger.error(f'[META CATALOG] Erro no sync: {e}')
        return False, str(e)


def _create_catalog(cred, headers):
    """Cria um catálogo na Meta Business."""
    try:
        url = f'{GRAPH_API}/{cred.business_account_id}/product_catalogs'
        payload = {
            'name': f'Cardápio - {cred.restaurant.name if cred.restaurant else "MuvLog"}',
            'vertical': 'commerce',
        }
        resp = requests.post(url, headers=headers, json=payload, timeout=15)
        data = resp.json()
        if resp.status_code == 200 and data.get('id'):
            logger.info(f'[META CATALOG] Catálogo criado: {data["id"]}')
            return data['id']
        logger.warning(f'[META CATALOG] Erro ao criar catálogo: {data}')
        return None
    except Exception as e:
        logger.error(f'[META CATALOG] Erro ao criar catálogo: {e}')
        return None


def _sync_product(cred, catalog_id, product, headers):
    """Sincroniza um produto com o Meta Catalog."""
    # Item do catálogo
    item_url = f'{GRAPH_API}/{catalog_id}/items'
    payload = {
        'name': product.name,
        'description': product.description or product.name,
        'price': float(product.price),
        'currency': 'BRL',
        'availability': 'in stock' if product.is_active else 'out of stock',
        'condition': 'new',
    }
    if product.image_url:
        payload['image_url'] = product.image_url

    resp = requests.post(item_url, headers=headers, json=payload, timeout=15)
    data = resp.json()

    if resp.status_code != 200:
        # Se já existe, tentar atualizar
        if 'already exists' in str(data).lower():
            _update_product(catalog_id, product, headers)
        else:
            raise Exception(f'Erro: {data}')

    return data.get('id')


def _update_product(catalog_id, product, headers):
    """Atualiza um produto existente no Meta Catalog."""
    # Buscar item por nome (simplificado)
    items_url = f'{GRAPH_API}/{catalog_id}/items'
    resp = requests.get(items_url, headers=headers, timeout=15)
    data = resp.json()

    for item in data.get('data', []):
        if item.get('name') == product.name:
            update_url = f'{GRAPH_API}/{item["id"]}'
            payload = {
                'price': float(product.price),
                'availability': 'in stock' if product.is_active else 'out of stock',
            }
            if product.description:
                payload['description'] = product.description
            requests.post(update_url, headers=headers, json=payload, timeout=15)
            break


def delete_from_catalog(restaurant_id, product_name):
    """Remove um produto do Meta Catalog."""
    try:
        cred = WhatsAppCredential.query.filter_by(
            restaurant_id=restaurant_id, is_active=True
        ).first()
        if not cred or not cred.catalog_id or not cred.access_token:
            return

        headers = {'Authorization': f'Bearer {cred.access_token}'}
        items_url = f'{GRAPH_API}/{cred.catalog_id}/items'
        resp = requests.get(items_url, headers=headers, timeout=15)
        data = resp.json()

        for item in data.get('data', []):
            if item.get('name') == product_name:
                requests.delete(f'{GRAPH_API}/{item["id"]}', headers=headers, timeout=15)
                break

    except Exception as e:
        logger.error(f'[META CATALOG] Erro ao remover: {e}')


def get_catalog_products(restaurant_id):
    """Lista produtos do Meta Catalog (para exibição)."""
    try:
        cred = WhatsAppCredential.query.filter_by(
            restaurant_id=restaurant_id, is_active=True
        ).first()
        if not cred or not cred.catalog_id or not cred.access_token:
            return []

        headers = {'Authorization': f'Bearer {cred.access_token}'}
        items_url = f'{GRAPH_API}/{cred.catalog_id}/items'
        resp = requests.get(items_url, headers=headers, timeout=15)
        data = resp.json()

        return [
            {
                'id': item.get('id'),
                'name': item.get('name'),
                'price': item.get('price'),
                'image_url': item.get('image_url'),
            }
            for item in data.get('data', [])
        ]

    except Exception as e:
        logger.error(f'[META CATALOG] Erro ao listar: {e}')
        return []
