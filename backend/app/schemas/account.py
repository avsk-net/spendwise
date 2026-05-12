import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel
from app.enums.account_type import AccountType


class AccountCreate(BaseModel):
    name: str
    type: AccountType
    balance: Decimal = Decimal("0")


class AccountUpdate(BaseModel):
    name: str | None = None
    type: AccountType | None = None


class AccountResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: AccountType
    balance: Decimal
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}