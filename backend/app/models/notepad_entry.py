from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class NotepadEntry(Base, TimestampMixin):
    __tablename__ = "notepad_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(20), server_default="#fef9c3", nullable=False)
    is_pinned: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)

    user: Mapped["User"] = relationship(back_populates="notepad_entries")
