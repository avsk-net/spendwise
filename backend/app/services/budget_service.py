import datetime
import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import BUDGET_EXCEEDED_THRESHOLD, BUDGET_WARNING_THRESHOLD
from app.enums.notification_type import NotificationType
from app.enums.transaction_type import TransactionType
from app.models.budget import Budget
from app.models.category import Category
from app.models.notification import Notification
from app.models.transaction import Transaction


async def check_budget(
    user_id: uuid.UUID,
    category_id: uuid.UUID,
    txn_date: datetime.date,
    db: AsyncSession,
) -> dict | None:
    """
    Checks whether adding a transaction has pushed spending past the 80% or 100%
    budget threshold for the given category+month.  Adds a Notification row to the
    session (caller must commit) and returns a dict suitable for a WS push, or None
    if no threshold was crossed (or no budget exists).
    """
    month_start = txn_date.replace(day=1)

    budget_row = await db.execute(
        select(Budget).where(
            Budget.user_id == user_id,
            Budget.category_id == category_id,
            Budget.month == month_start,
            Budget.deleted_at.is_(None),
        )
    )
    budget = budget_row.scalar_one_or_none()
    if not budget:
        return None

    spent_row = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.user_id == user_id,
            Transaction.category_id == category_id,
            Transaction.type == TransactionType.expense,
            Transaction.deleted_at.is_(None),
            func.date_trunc("month", Transaction.date) == month_start,
        )
    )
    spent: Decimal = spent_row.scalar() or Decimal("0")
    percent = float(spent / budget.amount * 100) if budget.amount > 0 else 0.0

    cat_row = await db.execute(select(Category.name).where(Category.id == category_id))
    cat_name = cat_row.scalar() or "category"

    if percent >= BUDGET_EXCEEDED_THRESHOLD:
        notif_type = NotificationType.budget_exceeded
        message = f"Budget exceeded for {cat_name}: spent {spent:.0f} of {budget.amount:.0f} ({percent:.0f}%)"
    elif percent >= BUDGET_WARNING_THRESHOLD:
        notif_type = NotificationType.budget_warning
        message = f"Budget warning for {cat_name}: {percent:.0f}% used ({spent:.0f} of {budget.amount:.0f})"
    else:
        return None

    # Avoid duplicate notifications for the same category+month+type
    existing = await db.execute(
        select(Notification).where(
            Notification.user_id == user_id,
            Notification.type == notif_type,
            Notification.message.contains(cat_name),
            func.date_trunc("month", Notification.created_at) == month_start,
        )
    )
    if existing.scalar_one_or_none():
        return None

    notif = Notification(user_id=user_id, type=notif_type, message=message)
    db.add(notif)

    try:
        from app.workers.notifications.tasks import send_budget_alert_email

        send_budget_alert_email.delay(str(user_id), notif_type.value, message)
    except Exception:
        pass

    return {
        "id": str(notif.id),
        "type": notif_type.value,
        "message": message,
        "is_read": False,
        "created_at": datetime.datetime.utcnow().isoformat(),
    }
