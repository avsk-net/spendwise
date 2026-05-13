import datetime
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    """Adds created_at and updated_at to any model."""

    created_at: Mapped[datetime.datetime] = mapped_column(
        server_default=text("NOW()"), nullable=False
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        server_default=text("NOW()"),
        onupdate=datetime.datetime.utcnow,
        nullable=False,
    )


class SoftDeleteMixin:
    """
    Adds deleted_at for soft deletes.
    WHY: Hard deletes destroy audit trails and break foreign key references.
    Soft delete lets us recover data and maintain history.
    Repositories must filter deleted_at IS NULL in all queries.
    """

    deleted_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        nullable=True,
        default=None,
        index=True,  # queries on deleted_at = NULL are common — index helps
    )

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None
