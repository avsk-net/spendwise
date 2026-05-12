from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from sqlalchemy import select
from app.workers.celery_app import celery
from app.workers.db import SyncSession
from app.models.recurring import RecurringRule
from app.models.transaction import Transaction
from app.enums.frequency import Frequency
from app.core.logging import logger


def _advance_date(current: date, freq: Frequency) -> date:
    if freq == Frequency.daily:   return current + timedelta(days=1)
    if freq == Frequency.weekly:  return current + timedelta(weeks=1)
    if freq == Frequency.monthly: return current + relativedelta(months=1)
    return current + relativedelta(years=1)


@celery.task(name="app.workers.recurring.tasks.process_recurring", bind=True, max_retries=3)
def process_recurring(self):
    today = date.today()
    try:
        with SyncSession() as db:
            rules = db.execute(
                select(RecurringRule).where(
                    RecurringRule.is_active == True,  # noqa: E712
                    RecurringRule.next_run_date <= today,
                    RecurringRule.deleted_at.is_(None),
                )
            ).scalars().all()

            for rule in rules:
                if rule.end_date and rule.next_run_date > rule.end_date:
                    rule.is_active = False
                    continue
                db.add(Transaction(
                    user_id=rule.user_id,
                    account_id=rule.account_id,
                    category_id=rule.category_id,
                    type=rule.type,
                    amount=rule.amount,
                    date=rule.next_run_date,
                    notes=rule.notes,
                    recurring_id=rule.id,
                ))
                rule.next_run_date = _advance_date(rule.next_run_date, rule.frequency)
            db.commit()
    except Exception as exc:
        logger.error(f"Recurring task failed: {exc}", exc_info=True)
        raise self.retry(exc=exc, countdown=60)