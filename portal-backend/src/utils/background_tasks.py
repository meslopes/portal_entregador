"""
Background task processor for expired offers and scheduled orders.
Runs in daemon threads, executing periodically.
No external dependencies required (uses Python threading).
"""
import threading
import time
import logging

logger = logging.getLogger(__name__)


def start_background_tasks(app):
    """Start background processing tasks using daemon threads."""
    
    def run_expired_offers():
        """Process expired offers every 30 seconds."""
        logger.info("[BG_TASK] Expired offers processor started")
        while True:
            try:
                with app.app_context():
                    from src.routes.order import process_expired_offers
                    process_expired_offers()
            except Exception as e:
                logger.error(f"[BG_TASK] process_expired_offers error: {e}")
            time.sleep(30)
    
    def run_scheduled_orders():
        """Process scheduled orders every 60 seconds."""
        logger.info("[BG_TASK] Scheduled orders processor started")
        while True:
            try:
                with app.app_context():
                    from src.routes.order import process_scheduled_orders
                    process_scheduled_orders()
            except Exception as e:
                logger.error(f"[BG_TASK] process_scheduled_orders error: {e}")
            time.sleep(60)
    
    # Daemon threads die when main process exits
    t1 = threading.Thread(target=run_expired_offers, daemon=True, name="bg-expired-offers")
    t2 = threading.Thread(target=run_scheduled_orders, daemon=True, name="bg-scheduled-orders")
    t1.start()
    t2.start()
    
    logger.info("[BG_TASK] Background task threads started")
