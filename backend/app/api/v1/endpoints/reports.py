import calendar
from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, literal_column, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.enums.debt_type import DebtStatus
from app.enums.transaction_type import TransactionType
from app.models.account import Account
from app.models.budget import Budget
from app.models.category import Category
from app.models.debt import Debt
from app.models.recurring import RecurringRule
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.report import (
    BudgetForecast,
    BudgetVsActualItem,
    CategoryBreakdown,
    DailyTotal,
    InsightsResponse,
    MoMChange,
    MonthlyTotal,
    NetWorthResponse,
    SummaryResponse,
    TrendPoint,
    UpcomingRecurring,
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
            func.date_trunc(literal_column("'month'"), Transaction.date) == month_start,
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
            func.date_trunc(literal_column("'month'"), Transaction.date).label("month"),
            Transaction.type,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .where(
            Transaction.user_id == user.id,
            func.extract("year", Transaction.date) == year,
            Transaction.type != TransactionType.transfer,
            Transaction.deleted_at.is_(None),
        )
        .group_by(func.date_trunc(literal_column("'month'"), Transaction.date), Transaction.type)
        .order_by(func.date_trunc(literal_column("'month'"), Transaction.date))
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
            func.date_trunc(literal_column("'month'"), Transaction.date).label("month"),
            Transaction.type,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .where(
            Transaction.user_id == user.id,
            Transaction.type != TransactionType.transfer,
            Transaction.deleted_at.is_(None),
        )
        .group_by(func.date_trunc(literal_column("'month'"), Transaction.date), Transaction.type)
        .order_by(func.date_trunc(literal_column("'month'"), Transaction.date).desc())
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


@router.get("/net-worth", response_model=NetWorthResponse)
async def net_worth(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    assets_result = await db.execute(
        select(func.coalesce(func.sum(Account.balance), 0)).where(
            Account.user_id == user.id,
            Account.deleted_at.is_(None),
        )
    )
    total_assets: Decimal = Decimal(assets_result.scalar() or 0)

    debts_result = await db.execute(
        select(Debt)
        .options(selectinload(Debt.payments))
        .where(
            Debt.user_id == user.id,
            Debt.status != DebtStatus.paid,
        )
    )
    debts = debts_result.scalars().all()
    total_liabilities: Decimal = sum(
        (
            max(Decimal("0"), d.principal - sum((p.amount for p in d.payments), Decimal("0")))
            for d in debts
        ),
        Decimal("0"),
    )

    return NetWorthResponse(
        net_worth=total_assets - total_liabilities,
        total_assets=total_assets,
        total_liabilities=total_liabilities,
    )


@router.get("/insights", response_model=InsightsResponse)
async def insights(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = date.today()
    month_start = today.replace(day=1)
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    days_elapsed = today.day

    # Last month boundaries
    last_month_end = month_start - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)

    # --- MoM changes ---
    async def _category_totals(d_from: date, d_to: date) -> dict:
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
                Transaction.date >= d_from,
                Transaction.date <= d_to,
                Transaction.type == TransactionType.expense,
                Transaction.deleted_at.is_(None),
            )
            .group_by(Category.id, Category.name, Category.icon)
        )
        return {str(r.id): r for r in result.all()}

    this_month_cats = await _category_totals(month_start, today)
    last_month_cats = await _category_totals(last_month_start, last_month_end)

    all_cat_ids = set(this_month_cats.keys()) | set(last_month_cats.keys())
    mom_changes: list[MoMChange] = []
    for cid in all_cat_ids:
        this_row = this_month_cats.get(cid)
        last_row = last_month_cats.get(cid)
        this_val = float(this_row.total) if this_row else 0.0
        last_val = float(last_row.total) if last_row else 0.0
        if last_val == 0 and this_val == 0:
            continue
        change_pct = ((this_val - last_val) / last_val * 100) if last_val != 0 else 100.0
        if abs(change_pct) < 5:
            continue
        row = this_row or last_row
        assert row is not None
        mom_changes.append(
            MoMChange(
                category_name=row.name,
                icon=row.icon,
                this_month=this_val,
                last_month=last_val,
                change_pct=round(change_pct, 2),
            )
        )
    mom_changes.sort(key=lambda x: abs(x.change_pct), reverse=True)

    # --- Budget forecasts ---
    budgets_result = await db.execute(
        select(Budget, Category)
        .join(Category, Category.id == Budget.category_id)
        .where(
            Budget.user_id == user.id,
            Budget.month == month_start,
            Budget.deleted_at.is_(None),
        )
    )
    budget_rows = budgets_result.all()

    budget_forecasts: list[BudgetForecast] = []
    for budget, category in budget_rows:
        spent_result = await db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                Transaction.user_id == user.id,
                Transaction.category_id == budget.category_id,
                Transaction.date >= month_start,
                Transaction.date <= today,
                Transaction.type == TransactionType.expense,
                Transaction.deleted_at.is_(None),
            )
        )
        actual = float(spent_result.scalar() or 0)
        forecast = (actual / days_elapsed) * days_in_month if days_elapsed > 0 else 0.0
        budget_amount = float(budget.amount)
        if forecast <= budget_amount:
            continue
        overage_pct = (forecast - budget_amount) / budget_amount * 100 if budget_amount else 0.0
        budget_forecasts.append(
            BudgetForecast(
                category_name=category.name,
                icon=category.icon,
                budget=budget_amount,
                actual=actual,
                forecast=round(forecast, 2),
                overage_pct=round(overage_pct, 2),
            )
        )

    # --- Upcoming recurring ---
    window_end = today + timedelta(days=7)
    recurring_result = await db.execute(
        select(RecurringRule, Category)
        .join(Category, Category.id == RecurringRule.category_id)
        .where(
            RecurringRule.user_id == user.id,
            RecurringRule.is_active.is_(True),
            RecurringRule.deleted_at.is_(None),
            RecurringRule.next_run_date >= today,
            RecurringRule.next_run_date <= window_end,
        )
        .order_by(RecurringRule.next_run_date)
    )
    upcoming_recurring: list[UpcomingRecurring] = [
        UpcomingRecurring(
            label=rule.notes,
            amount=float(rule.amount),
            type=rule.type.value,
            frequency=rule.frequency.value,
            next_run_date=rule.next_run_date.strftime("%Y-%m-%d"),
            category_name=cat.name,
            icon=cat.icon,
        )
        for rule, cat in recurring_result.all()
    ]

    return InsightsResponse(
        mom_changes=mom_changes,
        budget_forecasts=budget_forecasts,
        upcoming_recurring=upcoming_recurring,
    )


@router.get("/budget-vs-actual", response_model=list[BudgetVsActualItem])
async def budget_vs_actual(
    month: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    month_start = month.replace(day=1)
    days_in_month = calendar.monthrange(month_start.year, month_start.month)[1]
    month_end = month_start.replace(day=days_in_month)

    budgets_result = await db.execute(
        select(Budget, Category)
        .join(Category, Category.id == Budget.category_id)
        .where(
            Budget.user_id == user.id,
            Budget.month == month_start,
            Budget.deleted_at.is_(None),
        )
    )
    budget_rows = budgets_result.all()

    items: list[BudgetVsActualItem] = []
    for budget, category in budget_rows:
        spent_result = await db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                Transaction.user_id == user.id,
                Transaction.category_id == budget.category_id,
                Transaction.date >= month_start,
                Transaction.date <= month_end,
                Transaction.type == TransactionType.expense,
                Transaction.deleted_at.is_(None),
            )
        )
        actual = Decimal(str(spent_result.scalar() or 0))
        budget_amount = budget.amount
        remaining = budget_amount - actual
        percent_used = float(actual / budget_amount * 100) if budget_amount else 0.0
        items.append(
            BudgetVsActualItem(
                category_id=str(budget.category_id),
                category_name=category.name,
                icon=category.icon,
                budget_amount=budget_amount,
                actual_amount=actual,
                remaining=remaining,
                percent_used=round(percent_used, 2),
            )
        )

    return items


@router.get("/by-weekday", response_model=list[dict])
async def by_weekday(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(
            func.extract("dow", Transaction.date).label("dow"),
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
            func.count().label("n"),
        )
        .where(
            Transaction.user_id == user.id,
            Transaction.date >= date_from,
            Transaction.date <= date_to,
            Transaction.type == TransactionType.expense,
            Transaction.deleted_at.is_(None),
        )
        .group_by(func.extract("dow", Transaction.date))
        .order_by(func.extract("dow", Transaction.date))
    )
    day_names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    rows = result.all()
    data = {int(r.dow): {"total": float(r.total), "count": int(r.n)} for r in rows}
    return [
        {
            "day": day_names[i],
            "total": data.get(i, {}).get("total", 0.0),
            "count": data.get(i, {}).get("count", 0),
        }
        for i in range(7)
    ]


@router.get("/export/pdf")
async def export_report_pdf(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from fastapi.responses import Response as FastAPIResponse

    from app.utils.pdf_export import generate_report_pdf

    # Fetch summary
    sum_result = await db.execute(
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
    for row in sum_result.all():
        if row.type == TransactionType.income:
            income = row.total
        else:
            expense += row.total
    net = income - expense
    savings_rate = float(net / income * 100) if income > 0 else 0.0

    # Fetch categories
    cat_result = await db.execute(
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
    cat_rows = cat_result.all()
    grand = sum(r.total for r in cat_rows) or Decimal("1")
    categories = [
        {
            "category_name": r.name,
            "icon": r.icon,
            "total": float(r.total),
            "percent": float(r.total / grand * 100),
        }
        for r in cat_rows
    ]

    # Fetch monthly
    year = date_from.year
    monthly_result = await db.execute(
        select(
            func.date_trunc(literal_column("'month'"), Transaction.date).label("month"),
            Transaction.type,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .where(
            Transaction.user_id == user.id,
            func.extract("year", Transaction.date) == year,
            Transaction.type != TransactionType.transfer,
            Transaction.deleted_at.is_(None),
        )
        .group_by(func.date_trunc(literal_column("'month'"), Transaction.date), Transaction.type)
        .order_by(func.date_trunc(literal_column("'month'"), Transaction.date))
    )
    monthly_data: dict = {}
    for row in monthly_result.all():
        key = row.month.strftime("%Y-%m")
        if key not in monthly_data:
            monthly_data[key] = {"income": Decimal("0"), "expense": Decimal("0")}
        monthly_data[key][row.type.value] = row.total
    monthly = [
        {"month": k, "income": float(v["income"]), "expense": float(v["expense"])}
        for k, v in sorted(monthly_data.items())
    ]

    pdf_bytes = generate_report_pdf(
        username=user.username,
        currency=user.currency,
        date_from=date_from,
        date_to=date_to,
        total_income=float(income),
        total_expense=float(expense),
        net=float(net),
        savings_rate=savings_rate,
        categories=categories,
        monthly=monthly,
    )

    filename = f"spendwise_report_{date_from}_{date_to}.pdf"
    return FastAPIResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
