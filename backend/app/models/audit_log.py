from __future__ import annotations
import datetime
import uuid
from typing import Optional

from sqlalchemy import ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AuditLog(Base):
    """
    Immutable audit trail. Never update or delete rows here.
    Tracks security-sensitive and business-critical actions.
    """

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    resource_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    resource_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    old_value: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    new_value: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        server_default=text("NOW()"), nullable=False
    )


# Audit action constants — use these instead of raw strings
class AuditAction:
    LOGIN = "auth.login"
    LOGIN_FAILED = "auth.login_failed"
    LOGOUT = "auth.logout"
    REGISTER = "auth.register"
    PASSWORD_CHANGE = "auth.password_change"

    TRANSACTION_CREATE = "transaction.create"
    TRANSACTION_DELETE = "transaction.delete"
    TRANSACTION_UPDATE = "transaction.update"

    BUDGET_CREATE = "budget.create"
    BUDGET_UPDATE = "budget.update"
    BUDGET_DELETE = "budget.delete"

    ACCOUNT_DELETE = "account.delete"
    USER_DELETE = "user.delete"
    DATA_EXPORT = "data.export"
