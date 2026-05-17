import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NoteCreate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    color: str = "#fef9c3"
    is_pinned: bool = False


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    color: Optional[str] = None
    is_pinned: Optional[bool] = None


class NoteResponse(BaseModel):
    id: uuid.UUID
    title: Optional[str]
    content: Optional[str]
    color: str
    is_pinned: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
