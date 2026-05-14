import uuid
from typing import Optional

from pydantic import BaseModel

from app.enums.category_type import CategoryType


class CategoryCreate(BaseModel):
    name: str
    icon: str | None = None
    type: CategoryType = CategoryType.both
    parent_id: Optional[uuid.UUID] = None
    color: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    type: CategoryType | None = None
    parent_id: Optional[uuid.UUID] = None
    color: Optional[str] = None


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    icon: str | None
    type: CategoryType
    is_system: bool
    parent_id: Optional[uuid.UUID]
    color: Optional[str]
    model_config = {"from_attributes": True}
