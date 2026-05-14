from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.enums.transaction_type import TransactionType
from app.models.base import TimestampMixin


class TransactionTemplate(Base, TimestampMixin):
    __tablename__ = "transaction_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[TransactionType] = mapped_column(
        SAEnum(TransactionType, name="transactiontype"), nullable=False
    )
    account_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    tags: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)

    user: Mapped["User"] = relationship(back_populates="templates")
