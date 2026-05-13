from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select

from app.core.logging import logger
from app.enums.transaction_type import TransactionType
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.services.email_service import send_monthly_report_email
from app.workers.celery_app import celery
from app.workers.db import SyncSession


@celery.task(name="app.workers.emails.tasks.send_monthly_reports", bind=True, max_retries=3)
def send_monthly_reports(self):
    today = date.today()
    last_month_end = today.replace(day=1) - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)
    month_label = last_month_start.strftime("%B %Y")

    logger.info("Sending monthly reports for %s", month_label)

    try:
        with SyncSession() as db:
            users = (
                db.execute(select(User).where(User.email_reports_enabled == True))  # noqa: E712
                .scalars()
                .all()
            )

            sent = failed = 0
            for user in users:
                try:
                    report = _build_report(db, user.id, last_month_start, last_month_end)
                    ok = send_monthly_report_email(
                        to=user.email,
                        username=user.username,
                        month_label=month_label,
                        currency=user.currency,
                        **report,
                    )
                    if ok:
                        sent += 1
                    else:
                        failed += 1
                except Exception as exc:
                    logger.error("Failed report for user %s: %s", user.id, exc, exc_info=True)
                    failed += 1

        logger.info("Monthly reports done — sent: %d, failed: %d", sent, failed)
    except Exception as exc:
        logger.error("Monthly reports task failed: %s", exc, exc_info=True)
        raise self.retry(exc=exc, countdown=300)


def _build_report(db, user_id, start: date, end: date) -> dict:
    type_rows = db.execute(
        select(
            Transaction.type,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .where(
            Transaction.user_id == user_id,
            Transaction.date >= start,
            Transaction.date <= end,
            Transaction.type != TransactionType.transfer,
            Transaction.deleted_at.is_(None),
        )
        .group_by(Transaction.type)
    ).all()

    total_income = total_expense = Decimal("0")
    for row in type_rows:
        if row.type == TransactionType.income:
            total_income = Decimal(str(row.total))
        else:
            total_expense = Decimal(str(row.total))

    cat_rows = db.execute(
        select(
            Category.name,
            Category.icon,
            func.coalesce(func.sum(Transaction.amount), 0).label("amount"),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == user_id,
            Transaction.date >= start,
            Transaction.date <= end,
            Transaction.type == TransactionType.expense,
            Transaction.deleted_at.is_(None),
        )
        .group_by(Category.id, Category.name, Category.icon)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(5)
    ).all()

    grand = sum(Decimal(str(r.amount)) for r in cat_rows) or Decimal("1")
    top_categories = [
        {
            "name": r.name,
            "icon": r.icon or "📦",
            "amount": float(Decimal(str(r.amount))),
            "percent": float(Decimal(str(r.amount)) / grand * 100),
        }
        for r in cat_rows
    ]

    return {
        "total_income": float(total_income),
        "total_expense": float(total_expense),
        "top_categories": top_categories,
    }
