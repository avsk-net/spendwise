import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, field_validator

from app.enums.debt_type import DebtStatus, DebtType


class DebtPaymentCreate(BaseModel):
    amount: Decimal
    date: date
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v


class DebtPaymentResponse(BaseModel):
    id: uuid.UUID
    amount: Decimal
    date: date
    notes: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


class DebtCreate(BaseModel):
    counterparty: str
    type: DebtType
    principal: Decimal
    interest_rate: Optional[Decimal] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None

    @field_validator("principal")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Principal must be positive")
        return v


class DebtUpdate(BaseModel):
    counterparty: str | None = None
    status: DebtStatus | None = None
    interest_rate: Decimal | None = None
    due_date: date | None = None
    notes: str | None = None


class DebtResponse(BaseModel):
    id: uuid.UUID
    counterparty: str
    type: DebtType
    status: DebtStatus
    principal: Decimal
    interest_rate: Optional[Decimal]
    due_date: Optional[date]
    notes: Optional[str]
    paid_amount: Decimal
    remaining: Decimal
    payments: List[DebtPaymentResponse]
    created_at: datetime
    model_config = {"from_attributes": True}
