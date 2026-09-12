"""
Background task processor for expired offers and scheduled orders.
Runs in daemon threads, executing periodically.
Uses file-based locking to prevent duplicate execution across instances.
"""
import threading
import time
import logging
import os

logger = logging.getLogger(__name__)

# fcntl é Unix-only (funciona no Render/Linux, não no Windows)
try:
    import fcntl
    HAS_FCNTL = True
except ImportError:
    HAS_FCNTL = False
    import msvcrt  # Windows alternative

# Diretório para locks
LOCK_DIR = os.path.join(os.path.dirname(__file__), '..', 'locks')


def acquire_lock(lock_name):
    """Tenta adquirir um lock file-based. Retorna o arquivo de lock ou None."""
    os.makedirs(LOCK_DIR, exist_ok=True)
    lock_path = os.path.join(LOCK_DIR, f'{lock_name}.lock')
    try:
        lock_file = open(lock_path, 'w')
        if HAS_FCNTL:
            fcntl.flock(lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
        else:
            # Windows: usar msvcrt
            msvcrt.locking(lock_file.fileno(), msvcrt.LK_NBLCK, 1)
        lock_file.write(str(os.getpid()))
        lock_file.flush()
        return lock_file
    except (IOError, OSError):
        return None


def release_lock(lock_file):
    """Libera um lock file-based."""
    if lock_file:
        try:
            if HAS_FCNTL:
                fcntl.flock(lock_file, fcntl.LOCK_UN)
            else:
                lock_file.seek(0)
                msvcrt.locking(lock_file.fileno(), msvcrt.LK_UNLCK, 1)
            lock_file.close()
        except Exception:
            pass


def start_background_tasks(app):
    """Start background processing tasks using daemon threads with locking."""
    
    def run_expired_offers():
        """Process expired offers every 30 seconds."""
        # Aguardar30s antes de iniciar para garantir que o banco está pronto
        logger.info("[BG_TASK] Expired offers processor waiting 30s for DB readiness...")
        time.sleep(30)
        logger.info("[BG_TASK] Expired offers processor started")
        while True:
            lock = acquire_lock('expired_offers')
            if lock:
                try:
                    with app.app_context():
                        from src.routes.order import process_expired_offers
                        process_expired_offers()
                except Exception as e:
                    logger.error(f"[BG_TASK] process_expired_offers error: {e}")
                    # Se for erro de conexão, aguardar mais tempo
                    if 'SSL' in str(e) or 'OperationalError' in str(e) or 'connection' in str(e).lower():
                        logger.warning("[BG_TASK] DB connection error, waiting 60s before retry...")
                        time.sleep(60)
                finally:
                    release_lock(lock)
            else:
                logger.debug("[BG_TASK] expired_offers lock held by another process, skipping")
            time.sleep(30)
    
    def run_scheduled_orders():
        """Process scheduled orders every 60 seconds."""
        logger.info("[BG_TASK] Scheduled orders processor waiting 45s for DB readiness...")
        time.sleep(45)
        logger.info("[BG_TASK] Scheduled orders processor started")
        while True:
            lock = acquire_lock('scheduled_orders')
            if lock:
                try:
                    with app.app_context():
                        from src.routes.order import process_scheduled_orders
                        process_scheduled_orders()
                except Exception as e:
                    logger.error(f"[BG_TASK] process_scheduled_orders error: {e}")
                    if 'SSL' in str(e) or 'OperationalError' in str(e) or 'connection' in str(e).lower():
                        logger.warning("[BG_TASK] DB connection error, waiting 60s before retry...")
                        time.sleep(60)
                finally:
                    release_lock(lock)
            else:
                logger.debug("[BG_TASK] scheduled_orders lock held by another process, skipping")
            time.sleep(60)
    
    def run_auto_routing():
        """Run auto-routing analysis every 5 minutes."""
        logger.info("[BG_TASK] Auto-routing processor waiting 60s for DB readiness...")
        time.sleep(60)
        logger.info("[BG_TASK] Auto-routing processor started")
        while True:
            lock = acquire_lock('auto_routing')
            if lock:
                try:
                    with app.app_context():
                        from src.services.auto_routing import run_auto_routing
                        from src.models.portal_models import RouteSettings
                        
                        # Get all tenants with auto-routing enabled
                        settings_list = RouteSettings.query.filter_by(auto_routing_enabled=True).all()
                        
                        for settings in settings_list:
                            result = run_auto_routing(settings.tenant_id)
                            if result['status'] == 'created':
                                logger.info(f"[AUTO-ROUTE] {result['message']}")
                except Exception as e:
                    logger.error(f"[BG_TASK] run_auto_routing error: {e}")
                    if 'SSL' in str(e) or 'OperationalError' in str(e) or 'connection' in str(e).lower():
                        logger.warning("[BG_TASK] DB connection error, waiting 60s before retry...")
                        time.sleep(60)
                finally:
                    release_lock(lock)
            else:
                logger.debug("[BG_TASK] auto_routing lock held by another process, skipping")
            
            # Wait for configured interval (default 5 minutes)
            try:
                with app.app_context():
                    from src.models.portal_models import RouteSettings
                    settings = RouteSettings.query.first()
                    interval = (settings.auto_routing_interval_min if settings else 5) * 60
            except Exception:
                interval = 300
            
            time.sleep(interval)
    
    # Daemon threads die when main process exits
    t1 = threading.Thread(target=run_expired_offers, daemon=True, name="bg-expired-offers")
    t2 = threading.Thread(target=run_scheduled_orders, daemon=True, name="bg-scheduled-orders")
    t3 = threading.Thread(target=run_auto_routing, daemon=True, name="bg-auto-routing")
    t1.start()
    t2.start()
    t3.start()
    
    logger.info("[BG_TASK] Background task threads started (with file-based locking)")
