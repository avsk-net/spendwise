import uuid

from pydantic import BaseModel


class RuleCreate(BaseModel):
    keyword: str
    category_id: uuid.UUID
    priority: int = 0


class RuleUpdate(BaseModel):
    keyword: str | None = None
    category_id: uuid.UUID | None = None
    priority: int | None = None
    is_active: bool | None = None


class RuleResponse(BaseModel):
    id: uuid.UUID
    keyword: str
    category_id: uuid.UUID
    priority: int
    is_active: bool
    model_config = {"from_attributes": True}


class RuleSuggestRequest(BaseModel):
    text: str
