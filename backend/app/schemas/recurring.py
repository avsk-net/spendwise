from __future__ import annotations
import uuid
from datetime import date
from decimal import Decimal
from pydantic import BaseModel, field_validator
from app.enums.transaction_type import TransactionType
from app.enums.frequency import Frequency


class RecurringCreate(BaseModel):
    account_id: uuid.UUID
    category_id: uuid.UUID
    type: TransactionType
    amount: Decimal
    notes: str | None = None
    frequency: Frequency
    start_date: date
    end_date: date | None = None

    @field_validator("amount")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v


class RecurringUpdate(BaseModel):
    amount: Decimal | None = None
    notes: str | None = None
    end_date: date | None = None
    is_active: bool | None = None


class RecurringResponse(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    category_id: uuid.UUID
    type: TransactionType
    amount: Decimal
    notes: str | None
    frequency: Frequency
    start_date: date
    end_date: date | None
    next_run_date: date
    is_active: bool
    model_config = {"from_attributes": True}