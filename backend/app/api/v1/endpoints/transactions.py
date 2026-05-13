import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.enums.transaction_type import TransactionType
from app.exceptions.business import AccountNotFoundError, TransactionNotFoundError
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import (
    TransactionCreate,
    TransactionFilters,
    TransactionResponse,
    TransactionUpdate,
)
from app.services.budget_service import check_budget
from app.services.ws_manager import manager

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _delta(txn_type: TransactionType, amount: Decimal) -> Decimal:
    return amount if txn_type == TransactionType.income else -amount


async def _get_account(account_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> Account:
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise AccountNotFoundError()
    return account


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    filters: TransactionFilters = Depends(),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Transaction).where(
        Transaction.user_id == user.id,
        Transaction.deleted_at.is_(None),
    )
    if filters.account_id:
        query = query.where(Transaction.account_id == filters.account_id)
    if filters.category_id:
        query = query.where(Transaction.category_id == filters.category_id)
    if filters.type:
        query = query.where(Transaction.type == filters.type)
    if filters.date_from:
        query = query.where(Transaction.date >= filters.date_from)
    if filters.date_to:
        query = query.where(Transaction.date <= filters.date_to)
    if filters.tag:
        query = query.where(Transaction.tags.contains([filters.tag]))
    query = (
        query.order_by(Transaction.date.desc())
        .offset((filters.page - 1) * filters.limit)
        .limit(filters.limit)
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    data: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    account = await _get_account(data.account_id, user.id, db)
    txn = Transaction(user_id=user.id, **data.model_dump())
    db.add(txn)
    account.balance += _delta(data.type, data.amount)

    notif_payload = None
    if data.type == TransactionType.expense:
        notif_payload = await check_budget(user.id, data.category_id, data.date, db)

    await db.commit()
    await db.refresh(txn)

    if notif_payload:
        await manager.send(str(user.id), {"type": "notification", "data": notif_payload})

    return txn


@router.get("/{txn_id}", response_model=TransactionResponse)
async def get_transaction(
    txn_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == txn_id,
            Transaction.user_id == user.id,
            Transaction.deleted_at.is_(None),
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise TransactionNotFoundError()
    return txn


@router.patch("/{txn_id}", response_model=TransactionResponse)
async def update_transaction(
    txn_id: uuid.UUID,
    data: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == txn_id,
            Transaction.user_id == user.id,
            Transaction.deleted_at.is_(None),
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise TransactionNotFoundError()

    account = await _get_account(txn.account_id, user.id, db)
    account.balance -= _delta(txn.type, txn.amount)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(txn, field, value)
    account.balance += _delta(txn.type, txn.amount)

    notif_payload = None
    amount_or_category_changed = data.amount is not None or data.category_id is not None
    if txn.type == TransactionType.expense and amount_or_category_changed:
        notif_payload = await check_budget(user.id, txn.category_id, txn.date, db)

    await db.commit()
    await db.refresh(txn)

    if notif_payload:
        await manager.send(str(user.id), {"type": "notification", "data": notif_payload})

    return txn


@router.delete("/{txn_id}", status_code=204)
async def delete_transaction(
    txn_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == txn_id,
            Transaction.user_id == user.id,
            Transaction.deleted_at.is_(None),
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise TransactionNotFoundError()

    account = await _get_account(txn.account_id, user.id, db)
    account.balance -= _delta(txn.type, txn.amount)
    txn.deleted_at = __import__("datetime").datetime.utcnow()
    await db.commit()
