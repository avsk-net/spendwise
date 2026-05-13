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
    expense: Decimal
