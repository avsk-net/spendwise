from __future__ import annotations
import uuid
from datetime import date
from decimal import Decimal
from pydantic import BaseModel


class BudgetCreate(BaseModel):
    category_id: uuid.UUID
    month: date
    amount: Decimal


class BudgetUpdate(BaseModel):
    amount: Decimal


class BudgetResponse(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    month: date
    amount: Decimal
    spent: Decimal = Decimal("0")
    percent: float = 0.0
    model_config = {"from_attributes": True}