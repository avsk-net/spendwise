import uuid
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse
from app.enums.transaction_type import TransactionType
from app.exceptions.business import BudgetNotFoundError, DuplicateBudgetError

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("", response_model=list[BudgetResponse])
async def list_budgets(
    month: date = Query(default=None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    month = (month or date.today()).replace(day=1)
    result = await db.execute(
        select(Budget).where(Budget.user_id == user.id, Budget.month == month)
    )
    budgets = result.scalars().all()

    response = []
    for b in budgets:
        spent_result = await db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                Transaction.user_id == user.id,
                Transaction.category_id == b.category_id,
                Transaction.type == TransactionType.expense,
                Transaction.deleted_at.is_(None),
                func.date_trunc("month", Transaction.date) == month,
            )
        )
        spent: Decimal = spent_result.scalar()
        percent = float(spent / b.amount * 100) if b.amount > 0 else 0.0
        response.append(BudgetResponse(
            id=b.id, category_id=b.category_id, month=b.month,
            amount=b.amount, spent=spent, percent=percent,
        ))
    return response


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_budget(
    data: BudgetCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data.month = data.month.replace(day=1)
    budget = Budget(user_id=user.id, **data.model_dump())
    db.add(budget)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise DuplicateBudgetError()
    await db.refresh(budget)
    return BudgetResponse(
        id=budget.id, category_id=budget.category_id,
        month=budget.month, amount=budget.amount,
    )


@router.patch("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: uuid.UUID,
    data: BudgetUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Budget).where(Budget.id == budget_id, Budget.user_id == user.id)
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise BudgetNotFoundError()
    budget.amount = data.amount
    await db.commit()
    return BudgetResponse(
        id=budget.id, category_id=budget.category_id,
        month=budget.month, amount=budget.amount,
    )


@router.delete("/{budget_id}", status_code=204)
async def delete_budget(
    budget_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Budget).where(Budget.id == budget_id, Budget.user_id == user.id)
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise BudgetNotFoundError()
    await db.delete(budget)
    await db.commit()