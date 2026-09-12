"""
Rate Limiting - Proteção contra abuso de endpoints
Usar: from src.utils.rate_limit import limiter, login_limit
"""
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Instância global do limiter (configurada em main.py)
limiter = Limiter(
    get_remote_address,
    default_limits=["300 per minute", "5 per second"],
    storage_uri="memory://"
)

# Limites específicos para login (mais restritivo contra brute force)
login_limit = limiter.limit("5 per minute")
register_limit = limiter.limit("3 per minute")
