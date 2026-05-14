from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.enums.transaction_type import TransactionType
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.report import (
    CategoryBreakdown,
    DailyTotal,
    MonthlyTotal,
    SummaryResponse,
    TrendPoint,
)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/summary", response_model=SummaryResponse)
async def summary(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Transaction.type, func.coalesce(func.sum(Transaction.amount), 0).label("total"))
        .where(
            Transaction.user_id == user.id,
            Transaction.date >= date_from,
            Transaction.date <= date_to,
            Transaction.type != TransactionType.transfer,
            Transaction.deleted_at.is_(None),
        )
        .group_by(Transaction.type)
    )
    income = expense = Decimal("0")
    for row in result.all():
        if row.type == TransactionType.income:
            income = row.total
        else:
            expense = row.total
    return SummaryResponse(total_income=income, total_expense=expense, net=income - expense)


@router.get("/by-category", response_model=list[CategoryBreakdown])
async def by_category(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(
            Category.id,
            Category.name,
            Category.icon,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == user.id,
            Transaction.date >= date_from,
            Transaction.date <= date_to,
            Transaction.type == TransactionType.expense,
            Transaction.deleted_at.is_(None),
        )
        .group_by(Category.id, Category.name, Category.icon)
        .order_by(func.sum(Transaction.amount).desc())
    )
    rows = result.all()
    grand = sum(r.total for r in rows) or Decimal("1")
    return [
        CategoryBreakdown(
            category_id=str(r.id),
            category_name=r.name,
            icon=r.icon,
            total=r.total,
            percent=float(r.total / grand * 100),
        )
        for r in rows
    ]


@router.get("/daily", response_model=list[DailyTotal])
async def daily(
    month: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    month_start = month.replace(day=1)
    result = await db.execute(
        select(
            Transaction.date,
            Transaction.type,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .where(
            Transaction.user_id == user.id,
            func.date_trunc("month", Transaction.date) == month_start,
            Transaction.type != TransactionType.transfer,
            Transaction.deleted_at.is_(None),
        )
        .group_by(Transaction.date, Transaction.type)
        .order_by(Transaction.date)
    )
    daily: dict = {}
    for row in result.all():
        key = str(row.date)
        if key not in daily:
            daily[key] = {"income": Decimal("0"), "expense": Decimal("0")}
        daily[key][row.type.value] = row.total
    return [
        DailyTotal(date=k, income=v["income"], expense=v["expense"])
        for k, v in sorted(daily.items())
    ]


@router.get("/monthly", response_model=list[MonthlyTotal])
async def monthly(
    year: int = Query(default=date.today().year),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(
            func.date_trunc("month", Transaction.date).label("month"),
            Transaction.type,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .where(
            Transaction.user_id == user.id,
            func.extract("year", Transaction.date) == year,
            Transaction.type != TransactionType.transfer,
            Transaction.deleted_at.is_(None),
        )
        .group_by(func.date_trunc("month", Transaction.date), Transaction.type)
        .order_by(func.date_trunc("month", Transaction.date))
    )
    monthly: dict = {}
    for row in result.all():
        key = row.month.strftime("%Y-%m")
        if key not in monthly:
            monthly[key] = {"income": Decimal("0"), "expense": Decimal("0")}
        monthly[key][row.type.value] = row.total
    return [
        MonthlyTotal(month=k, income=v["income"], expense=v["expense"])
        for k, v in sorted(monthly.items())
    ]


@router.get("/trend", response_model=list[TrendPoint])
async def trend(
    months: int = Query(default=6, ge=3, le=12),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(
            func.date_trunc("month", Transaction.date).label("month"),
            Transaction.type,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .where(
            Transaction.user_id == user.id,
            Transaction.type != TransactionType.transfer,
            Transaction.deleted_at.is_(None),
        )
        .group_by(func.date_trunc("month", Transaction.date), Transaction.type)
        .order_by(func.date_trunc("month", Transaction.date).desc())
    )
    data: dict = {}
    for row in result.all():
        key = row.month.strftime("%Y-%m")
        if key not in data:
            data[key] = {"income": Decimal("0"), "expense": Decimal("0")}
        data[key][row.type.value] = row.total
    recent = sorted(data.keys(), reverse=True)[:months]
    return [
        TrendPoint(month=m, income=data[m]["income"], expense=data[m]["expense"])
        for m in sorted(recent)
    ]
