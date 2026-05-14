import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, model_validator

from app.enums.transaction_type import TransactionType


class TransactionCreate(BaseModel):
    account_id: uuid.UUID
    category_id: Optional[uuid.UUID] = None
    type: TransactionType
    amount: Decimal
    date: date
    notes: Optional[str] = None
    tags: List[str] = []
    to_account_id: Optional[uuid.UUID] = None
    linked_transaction_id: Optional[uuid.UUID] = None

    @model_validator(mode="after")
    def validate_type_fields(self) -> "TransactionCreate":
        if self.type == TransactionType.transfer:
            if not self.to_account_id:
                raise ValueError("to_account_id is required for transfer transactions")
        elif self.type != TransactionType.adjustment:
            if self.amount <= 0:
                raise ValueError("Amount must be positive")
            if not self.category_id:
                raise ValueError("category_id is required for non-transfer transactions")
        else:
            # adjustment: category_id required, amount can be any sign
            if not self.category_id:
                raise ValueError("category_id is required for non-transfer transactions")
        return self


class TransactionUpdate(BaseModel):
    account_id: Optional[uuid.UUID] = None
    category_id: Optional[uuid.UUID] = None
    type: Optional[TransactionType] = None
    amount: Optional[Decimal] = None
    date: Optional[date] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    to_account_id: Optional[uuid.UUID] = None
    linked_transaction_id: Optional[uuid.UUID] = None


class TransactionResponse(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    category_id: Optional[uuid.UUID]
    type: TransactionType
    amount: Decimal
    date: date
    notes: Optional[str]
    tags: Optional[List[str]]
    to_account_id: Optional[uuid.UUID]
    linked_transaction_id: Optional[uuid.UUID]
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
