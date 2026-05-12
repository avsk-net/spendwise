import uuid
from datetime import date
from decimal import Decimal
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.repositories.base import BaseRepository
from app.models.transaction import Transaction
from app.enums import TransactionType
from app.utils.pagination import PaginationParams


class TransactionRepository(BaseRepository[Transaction]):

    def __init__(self, db: AsyncSession):
        super().__init__(Transaction, db)

    async def list_filtered(
        self,
        user_id: uuid.UUID,
        account_id: Optional[uuid.UUID] = None,
        category_id: Optional[uuid.UUID] = None,
        txn_type: Optional[TransactionType] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        tag: Optional[str] = None,
        pagination: PaginationParams = PaginationParams(),
    ) -> tuple[list[Transaction], int]:
        query = self._base_query().where(Transaction.user_id == user_id)

        if account_id:
            query = query.where(Transaction.account_id == account_id)
        if category_id:
            query = query.where(Transaction.category_id == category_id)
        if txn_type:
            query = query.where(Transaction.type == txn_type)
        if date_from:
            query = query.where(Transaction.date >= date_from)
        if date_to:
            query = query.where(Transaction.date <= date_to)
        if tag:
            query = query.where(Transaction.tags.contains([tag]))

        # Count total
        count_result = await self.db.execute(select(func.count()).select_from(query.subquery()))
        total = count_result.scalar() or 0

        # Apply pagination
        query = query.order_by(Transaction.date.desc()).offset(pagination.offset).limit(pagination.limit)
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def get_monthly_total(
        self,
        user_id: uuid.UUID,
        category_id: uuid.UUID,
        month_start: date,
        txn_type: TransactionType = TransactionType.expense,
    ) -> Decimal:
        result = await self.db.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0)).where(
                Transaction.user_id == user_id,
                Transaction.category_id == category_id,
                Transaction.type == txn_type,
                Transaction.deleted_at.is_(None),
                func.date_trunc("month", Transaction.date) == month_start,
            )
        )
        return result.scalar() or Decimal("0")