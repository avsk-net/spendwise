from __future__ import annotations

import datetime
import uuid

from sqlalchemy import Boolean, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False)
    email_reports_enabled: Mapped[bool] = mapped_column(Boolean, server_default="false")
    is_email_verified: Mapped[bool] = mapped_column(Boolean, server_default="false")
    email_verified_at: Mapped[datetime.datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        server_default=text("NOW()"), nullable=False
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        server_default=text("NOW()"), onupdate=datetime.datetime.utcnow, nullable=False
    )

    accounts: Mapped[list["Account"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    categories: Mapped[list["Category"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    budgets: Mapped[list["Budget"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    recurring_rules: Mapped[list["RecurringRule"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    saving_goals: Mapped[list["SavingGoal"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    email_tokens: Mapped[list["EmailToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    templates: Mapped[list["TransactionTemplate"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    debts: Mapped[list["Debt"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    categorization_rules: Mapped[list["CategorizationRule"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    notepad_entries: Mapped[list["NotepadEntry"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String, nullable=False, index=True)
    expires_at: Mapped[datetime.datetime] = mapped_column(nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime.datetime] = mapped_column(
        server_default=text("NOW()"), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")
