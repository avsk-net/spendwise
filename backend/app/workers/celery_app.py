from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery = Celery(
    "spendwise",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.workers.recurring.tasks",
        "app.workers.emails.tasks",
    ],
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        "recurring-daily": {
            "task": "app.workers.recurring.tasks.process_recurring",
            "schedule": crontab(hour=0, minute=5),
        },
        "monthly-email-reports": {
            "task": "app.workers.emails.tasks.send_monthly_reports",
            "schedule": crontab(hour=8, minute=0, day_of_month=1),
        },
    },
)