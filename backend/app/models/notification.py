from __future__ import annotations

import datetime
import enum
import uuid

from sqlalchemy import Boolean
from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class NotificationType(str, enum.Enum):
    budget_warning = "budget_warning"
    budget_exceeded = "budget_exceeded"
    system = "system"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[NotificationType] = mapped_column(
        SAEnum(NotificationType, name="notificationtype"), nullable=False
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime.datetime] = mapped_column(
        server_default=text("NOW()"), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="notifications")
