from __future__ import annotations

import datetime
import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date
from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.enums.transaction_type import TransactionType
from app.models.base import SoftDeleteMixin, TimestampMixin


class Transaction(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False
    )
    type: Mapped[TransactionType] = mapped_column(
        SAEnum(TransactionType, name="transactiontype"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False, index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)
    recurring_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("recurring_rules.id", ondelete="SET NULL"), nullable=True
    )

    user: Mapped["User"] = relationship(back_populates="transactions")
    account: Mapped["Account"] = relationship(back_populates="transactions")
    category: Mapped["Category"] = relationship(back_populates="transactions")
    recurring_rule: Mapped[Optional["RecurringRule"]] = relationship(back_populates="transactions")
