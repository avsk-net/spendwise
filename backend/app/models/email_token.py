from __future__ import annotations

import datetime
import uuid

from sqlalchemy import ForeignKey, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EmailToken(Base):
    __tablename__ = "email_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    purpose: Mapped[str] = mapped_column(String(30), nullable=False)  # email_verification | password_reset
    expires_at: Mapped[datetime.datetime] = mapped_column(nullable=False)
    used_at: Mapped[datetime.datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        server_default=text("NOW()"), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="email_tokens")
