from __future__ import annotations

import datetime
import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date
from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.enums.debt_type import DebtStatus, DebtType
from app.models.base import TimestampMixin


class Debt(Base, TimestampMixin):
    __tablename__ = "debts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    counterparty: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[DebtType] = mapped_column(SAEnum(DebtType, name="debttype"), nullable=False)
    status: Mapped[DebtStatus] = mapped_column(
        SAEnum(DebtStatus, name="debtstatus"), server_default="active", nullable=False
    )
    principal: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    interest_rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    due_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(back_populates="debts")
    payments: Mapped[list["DebtPayment"]] = relationship(
        back_populates="debt", cascade="all, delete-orphan", order_by="DebtPayment.date.desc()"
    )


class DebtPayment(Base, TimestampMixin):
    __tablename__ = "debt_payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    debt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("debts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    debt: Mapped["Debt"] = relationship(back_populates="payments")
