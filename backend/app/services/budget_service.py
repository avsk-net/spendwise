import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.models.notification import Notification
from app.models.category import Category
from app.enums.transaction_type import TransactionType
from app.enums.notification_type import NotificationType
from app.core.constants import BUDGET_WARNING_THRESHOLD, BUDGET_EXCEEDED_THRESHOLD


async def check_budget(
    user_id: uuid.UUID,
    category_id: uuid.UUID,
    txn_date: date,
    db: AsyncSession,
) -> None:
    month_start = txn_date.replace(day=1)

    budget_result = await db.execute(
        select(Budget).where(
            Budget.user_id == user_id,
            Budget.category_id == category_id,
            Budget.month == month_start,
        )
    )
    budget = budget_result.scalar_one_or_none()
    if not budget:
        return

    spent_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.user_id == user_id,
            Transaction.category_id == category_id,
            Transaction.type == TransactionType.expense,
            Transaction.deleted_at.is_(None),
            func.date_trunc("month", Transaction.date) == month_start,
        )
    )
    spent: Decimal = spent_result.scalar() or Decimal("0")
    percent = float(spent / budget.amount * 100) if budget.amount > 0 else 0.0

    cat_result = await db.execute(
        select(Category.name).where(Category.id == category_id)
    )
    cat_name = cat_result.scalar() or "category"

    if percent >= BUDGET_EXCEEDED_THRESHOLD:
        notif_type = NotificationType.budget_exceeded
        message = f"Budget exceeded for {cat_name}: spent {spent:.0f} of {budget.amount:.0f} ({percent:.0f}%)"
    elif percent >= BUDGET_WARNING_THRESHOLD:
        notif_type = NotificationType.budget_warning
        message = f"Budget warning for {cat_name}: {percent:.0f}% used ({spent:.0f} of {budget.amount:.0f})"
    else:
        return

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
        return

    db.add(Notification(user_id=user_id, type=notif_type, message=message))