import datetime

from sqlalchemy import select

from app.core.logging import logger
from app.enums.debt_type import DebtStatus
from app.models.debt import Debt
from app.models.notification import Notification, NotificationType
from app.models.saving_goal import SavingGoal
from app.workers.celery_app import celery
from app.workers.db import SyncSession


@celery.task(name="app.workers.notifications.deadline_tasks.check_goals_and_debts")
def check_goals_and_debts():
    """Daily task: notify users about approaching saving goal deadlines and debt due dates."""
    today = datetime.date.today()
    goal_threshold = today + datetime.timedelta(days=7)
    debt_threshold = today + datetime.timedelta(days=3)

    with SyncSession() as db:
        goals = (
            db.execute(
                select(SavingGoal).where(
                    SavingGoal.is_completed.is_(False),
                    SavingGoal.deadline.is_not(None),
                    SavingGoal.deadline >= today,
                    SavingGoal.deadline <= goal_threshold,
                    SavingGoal.deleted_at.is_(None),
                )
            )
            .scalars()
            .all()
        )

        for goal in goals:
            days_left = (goal.deadline - today).days
            label = (
                "today" if days_left == 0 else f"in {days_left} day{'s' if days_left != 1 else ''}"
            )
            pct = float(goal.current_amount / goal.target_amount * 100) if goal.target_amount else 0
            msg = f"Saving goal '{goal.name}' deadline is {label}. Progress: {pct:.0f}% ({goal.current_amount}/{goal.target_amount})."
            notif = Notification(user_id=goal.user_id, type=NotificationType.system, message=msg)
            db.add(notif)

        debts = (
            db.execute(
                select(Debt).where(
                    Debt.status == DebtStatus.active,
                    Debt.due_date.is_not(None),
                    Debt.due_date >= today,
                    Debt.due_date <= debt_threshold,
                )
            )
            .scalars()
            .all()
        )

        for debt in debts:
            days_left = (debt.due_date - today).days
            label = (
                "today" if days_left == 0 else f"in {days_left} day{'s' if days_left != 1 else ''}"
            )
            msg = f"Debt to '{debt.counterparty}' is due {label}. Amount: {debt.principal}."
            notif = Notification(user_id=debt.user_id, type=NotificationType.system, message=msg)
            db.add(notif)

        db.commit()
        logger.info("check_goals_and_debts: processed %d goals, %d debts", len(goals), len(debts))
