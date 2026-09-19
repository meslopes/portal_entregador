"""
Rate Limiting - Proteção contra abuso de endpoints
Usar: from src.utils.rate_limit import limiter, login_limit
"""
import os
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Instância global do limiter (configurada em main.py)
# Em desenvolvimento: limites altos para não atrapalhar testes
# Em produção: limites mais restritivos
flask_env = os.getenv('FLASK_ENV', 'development')
if flask_env == 'production':
    default_limits = ["300 per minute", "10 per second"]
else:
    default_limits = ["1000 per minute", "50 per second"]

limiter = Limiter(
    get_remote_address,
    default_limits=default_limits,
    storage_uri="memory://"
)

# Limites específicos para login (mais restritivo contra brute force)
login_limit = limiter.limit("20 per minute")
register_limit = limiter.limit("10 per minute")
