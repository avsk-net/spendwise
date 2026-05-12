import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, field_validator
from app.enums.transaction_type import TransactionType


class TransactionCreate(BaseModel):
    account_id: uuid.UUID
    category_id: uuid.UUID
    type: TransactionType
    amount: Decimal
    date: date
    notes: Optional[str] = None
    tags: List[str] = []

    @field_validator("amount")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v


class TransactionUpdate(BaseModel):
    account_id: Optional[uuid.UUID] = None
    category_id: Optional[uuid.UUID] = None
    type: Optional[TransactionType] = None
    amount: Optional[Decimal] = None
    date: Optional[date] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class TransactionResponse(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    category_id: uuid.UUID
    type: TransactionType
    amount: Decimal
    date: date
    notes: Optional[str]
    tags: Optional[List[str]]
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class TransactionFilters(BaseModel):
    account_id: Optional[uuid.UUID] = None
    category_id: Optional[uuid.UUID] = None
    type: Optional[TransactionType] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    tag: Optional[str] = None
    page: int = 1
    limit: int = 50