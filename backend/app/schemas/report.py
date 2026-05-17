from decimal import Decimal

from pydantic import BaseModel


class SummaryResponse(BaseModel):
    total_income: Decimal
    total_expense: Decimal
    net: Decimal


class CategoryBreakdown(BaseModel):
    category_id: str
    category_name: str
    icon: str | None
    total: Decimal
    percent: float


class DailyTotal(BaseModel):
    date: str
    income: Decimal
    expense: Decimal


class MonthlyTotal(BaseModel):
    month: str
    income: Decimal
    expense: Decimal


class TrendPoint(BaseModel):
    month: str
    income: Decimal
    expense: Decimal


class NetWorthResponse(BaseModel):
    net_worth: Decimal
    total_assets: Decimal
    total_liabilities: Decimal


class MoMChange(BaseModel):
    category_name: str
    icon: str | None
    this_month: float
    last_month: float
    change_pct: float


class BudgetForecast(BaseModel):
    category_name: str
    icon: str | None
    budget: float
    actual: float
    forecast: float
    overage_pct: float


class UpcomingRecurring(BaseModel):
    label: str | None
    amount: float
    type: str
    frequency: str
    next_run_date: str
    category_name: str | None
    icon: str | None


class InsightsResponse(BaseModel):
    mom_changes: list[MoMChange]
    budget_forecasts: list[BudgetForecast]
    upcoming_recurring: list[UpcomingRecurring]


class BudgetVsActualItem(BaseModel):
    category_id: str
    category_name: str
    icon: str | None
    budget_amount: Decimal
    actual_amount: Decimal
    remaining: Decimal
    percent_used: float
