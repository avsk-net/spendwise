from app.workers.celery_app import celery
from app.core.logging import logger


@celery.task(name="app.workers.emails.tasks.send_monthly_reports")
def send_monthly_reports():
    # Implemented in Phase 3
    logger.info("Monthly email reports task triggered")