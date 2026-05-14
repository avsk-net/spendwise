import uuid
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel

from app.enums.transaction_type import TransactionType


class TemplateCreate(BaseModel):
    name: str
    type: TransactionType
    category_id: uuid.UUID
    account_id: Optional[uuid.UUID] = None
    amount: Optional[Decimal] = None
    notes: Optional[str] = None
    tags: List[str] = []


class TemplateResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: TransactionType
    category_id: uuid.UUID
    account_id: Optional[uuid.UUID]
    amount: Optional[Decimal]
    notes: Optional[str]
    tags: Optional[List[str]]
    model_config = {"from_attributes": True}
