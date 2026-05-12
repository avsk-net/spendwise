import uuid
from pydantic import BaseModel
from app.enums.category_type import CategoryType


class CategoryCreate(BaseModel):
    name: str
    icon: str | None = None
    type: CategoryType = CategoryType.both


class CategoryUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    type: CategoryType | None = None


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    icon: str | None
    type: CategoryType
    is_system: bool
    model_config = {"from_attributes": True}