import datetime
import uuid
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, computed_field


class SavingGoalCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    icon: Optional[str] = None
    target_amount: Decimal = Field(..., gt=0)
    deadline: Optional[datetime.date] = None
    notes: Optional[str] = None


class SavingGoalUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    icon: Optional[str] = None
    target_amount: Optional[Decimal] = Field(None, gt=0)
    deadline: Optional[datetime.date] = None
    notes: Optional[str] = None


class ContributeRequest(BaseModel):
    amount: Decimal = Field(..., gt=0)


class SavingGoalResponse(BaseModel):
    id: uuid.UUID
    name: str
    icon: Optional[str]
    target_amount: Decimal
    current_amount: Decimal
    deadline: Optional[datetime.date]
    notes: Optional[str]
    is_completed: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime

    @computed_field
    @property
    def percent(self) -> float:
        if self.target_amount <= 0:
            return 0.0
        return min(float(self.current_amount / self.target_amount * 100), 100.0)

    @computed_field
    @property
    def remaining(self) -> Decimal:
        return max(self.target_amount - self.current_amount, Decimal("0"))

    model_config = {"from_attributes": True}
