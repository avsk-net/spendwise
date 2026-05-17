from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class BudgetCreate(BaseModel):
    category_id: uuid.UUID
    month: date
    amount: Decimal
    rollover: bool = False


class BudgetUpdate(BaseModel):
    amount: Decimal
    rollover: Optional[bool] = None


class BudgetResponse(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    month: date
    amount: Decimal
    spent: Decimal = Decimal("0")
    percent: float = 0.0
    rollover: bool = False
    rollover_amount: Decimal = Decimal("0")
    model_config = {"from_attributes": True}
