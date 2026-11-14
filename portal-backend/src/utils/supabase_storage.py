"""
Utilitário para upload de arquivos no Supabase Storage.
Usado para fotos de prova de entrega.
"""
import base64
import logging
import os

import requests

logger = logging.getLogger(__name__)

# Configurações do Supabase Storage
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY', '')
BUCKET_NAME = 'proofs'


def get_headers():
    """Retorna headers para autenticação na API do Supabase."""
    return {
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'apikey': SUPABASE_KEY,
    }


def create_bucket_if_needed():
    """Cria o bucket 'proofs' se não existir (acesso público para leitura)."""
    try:
        # Verifica se o bucket já existe
        resp = requests.get(
            f'{SUPABASE_URL}/storage/v1/bucket/{BUCKET_NAME}',
            headers=get_headers(),
            timeout=10
        )
        if resp.status_code == 200:
            return True

        # Cria o bucket (público para leitura, upload autenticado via backend)
        resp = requests.post(
            f'{SUPABASE_URL}/storage/v1/bucket',
            headers={**get_headers(), 'Content-Type': 'application/json'},
            json={
                'id': BUCKET_NAME,
                'name': BUCKET_NAME,
                'public': True,  # Leitura pública (URLs diretas)
                'fileSizeLimit': 5 * 1024 * 1024,  # 5MB por foto
                'allowedMimeTypes': ['image/jpeg', 'image/png', 'image/webp'],
            },
            timeout=10
        )
        if resp.status_code in (200, 201):
            logger.info(f"Bucket '{BUCKET_NAME}' criado com sucesso")
            return True
        else:
            logger.error(f"Erro ao criar bucket: {resp.status_code} - {resp.text}")
            return False
    except Exception as e:
        logger.error(f"Erro ao verificar/criar bucket: {e}")
        return False


def upload_proof(base64_data, order_id):
    """
    Faz upload de uma foto de prova de entrega para o Supabase Storage.

    Args:
        base64_data: string base64 da imagem (pode ter prefixo data:image/...)
        order_id: ID do pedido (usado no nome do arquivo)

    Returns:
        URL pública da foto ou None em caso de erro
    """
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.error("SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados")
            return None

        # Remove prefixo data:image se presente
        if ',' in base64_data:
            base64_data = base64_data.split(',')[1]

        # Decodifica base64
        image_bytes = base64.b64decode(base64_data)

        # Nome do arquivo
        from datetime import datetime
        filename = f"proof_{order_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        storage_path = f"deliveries/{filename}"

        # Upload via API REST do Supabase Storage
        resp = requests.post(
            f'{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{storage_path}',
            headers={
                **get_headers(),
                'Content-Type': 'image/jpeg',
            },
            data=image_bytes,
            timeout=30
        )

        if resp.status_code in (200, 201):
            # URL pública da imagem
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{storage_path}"
            logger.info(f"Prova de entrega uploaded: {filename}")
            return public_url
        else:
            logger.error(f"Erro no upload: {resp.status_code} - {resp.text}")
            return None

    except Exception as e:
        logger.error(f"Erro ao fazer upload da prova: {e}")
        return None


# ============================================
# LOGO DA ORGANIZAÇÃO (white-label)
# ============================================

LOGOS_BUCKET = 'logos'
LOGO_MAX_BYTES = 2 * 1024 * 1024  # 2MB
# Tipos aceitos — devem bater com o que o frontend oferece no seletor
LOGO_ALLOWED_MIME = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
}


def _create_logos_bucket_if_needed():
    """Cria o bucket 'logos' se não existir (leitura pública, upload via backend)."""
    try:
        resp = requests.get(
            f'{SUPABASE_URL}/storage/v1/bucket/{LOGOS_BUCKET}',
            headers=get_headers(),
            timeout=10
        )
        if resp.status_code == 200:
            return True

        resp = requests.post(
            f'{SUPABASE_URL}/storage/v1/bucket',
            headers={**get_headers(), 'Content-Type': 'application/json'},
            json={
                'id': LOGOS_BUCKET,
                'name': LOGOS_BUCKET,
                'public': True,  # URL direta no <img> do cabeçalho e do white-label
                'fileSizeLimit': LOGO_MAX_BYTES,
                'allowedMimeTypes': list(LOGO_ALLOWED_MIME.keys()),
            },
            timeout=10
        )
        return resp.status_code in (200, 201)
    except Exception as e:
        logger.error(f"Erro ao verificar/criar bucket de logos: {e}")
        return False


def upload_logo(base64_data, tenant_id, filename='logo'):
    """Faz upload do logo da organização para o Supabase Storage.

    Args:
        base64_data: string base64 da imagem (pode ter prefixo data:image/...;...)
        tenant_id: ID do tenant (usado no nome do arquivo)
        filename: nome original (usado só para extrair a extensão)

    Returns:
        URL pública da imagem.

    Raises:
        ValueError: com mensagem amigável em português para mostrar ao usuário
                    (tipo não aceito ou imagem maior que 2MB).
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError('Armazenamento de imagens não configurado no servidor')

    mime = 'image/png'
    raw = base64_data
    # Formato data:image/png;base64,AAAA... — detecta o tipo pelo prefixo
    if raw.startswith('data:'):
        try:
            header, raw = raw.split(',', 1)
            mime = header.split(';')[0][len('data:'):] or mime
        except ValueError:
            raise ValueError('Formato de imagem inválido')

    if mime not in LOGO_ALLOWED_MIME:
        raise ValueError(
            'Formato não aceito. Use PNG, JPG, SVG ou WEBP.'
        )

    try:
        image_bytes = base64.b64decode(raw)
    except Exception:
        raise ValueError('Não foi possível ler a imagem enviada')

    if len(image_bytes) > LOGO_MAX_BYTES:
        tamanho_mb = len(image_bytes) / (1024 * 1024)
        raise ValueError(
            f'Imagem muito grande ({tamanho_mb:.1f}MB). Tamanho máximo permitido: 2MB.'
        )

    if not _create_logos_bucket_if_needed():
        raise ValueError('Não foi possível preparar o armazenamento de imagens')

    ext = LOGO_ALLOWED_MIME[mime]
    storage_path = f"tenant_{tenant_id}/logo.{ext}"

    resp = requests.post(
        f'{SUPABASE_URL}/storage/v1/object/{LOGOS_BUCKET}/{storage_path}',
        headers={**get_headers(), 'Content-Type': mime},
        data=image_bytes,
        timeout=30
    )

    if resp.status_code not in (200, 201):
        logger.error(f"Erro no upload do logo: {resp.status_code} - {resp.text}")
        raise ValueError('Erro ao enviar a imagem. Tente novamente.')

    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{LOGOS_BUCKET}/{storage_path}"
    logger.info(f"Logo do tenant {tenant_id} enviado: {storage_path}")
    return public_url
