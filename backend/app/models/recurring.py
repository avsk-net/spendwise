from __future__ import annotations

import datetime
import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, Date
from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.enums.frequency import Frequency
from app.enums.transaction_type import TransactionType
from app.models.base import SoftDeleteMixin, TimestampMixin


class RecurringRule(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "recurring_rules"

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
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    frequency: Mapped[Frequency] = mapped_column(
        SAEnum(Frequency, name="frequency"), nullable=False
    )
    start_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    next_run_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")

    user: Mapped["User"] = relationship(back_populates="recurring_rules")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="recurring_rule")
