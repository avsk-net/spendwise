import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import case, func, literal_column, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.database import get_db
from app.dependencies import get_current_user
from app.enums.transaction_type import TransactionType
from app.exceptions.business import AccountNotFoundError
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.account import AccountCreate, AccountResponse, AccountUpdate

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountResponse])
async def list_accounts(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Account).where(
            Account.user_id == user.id,
            Account.is_active == True,  # noqa: E712
            Account.deleted_at.is_(None),
        )
    )
    return result.scalars().all()


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    data: AccountCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    account = Account(user_id=user.id, **data.model_dump())
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


@router.patch("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: uuid.UUID,
    data: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user.id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise AccountNotFoundError()
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(account, field, value)
    await db.commit()
    await db.refresh(account)
    return account


@router.delete("/{account_id}", status_code=204)
async def delete_account(
    account_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user.id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise AccountNotFoundError()
    account.is_active = False
    await db.commit()


@router.get("/{account_id}/balance-history")
async def balance_history(
    account_id: uuid.UUID,
    months: int = Query(default=6, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Verify ownership
    result = await db.execute(
        select(Account).where(
            Account.id == account_id,
            Account.user_id == user.id,
            Account.deleted_at.is_(None),
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise NotFoundError("Account")

    # Get monthly net changes: income/transfers_in = +, expense/transfers_out = -
    today = date.today()

    net_result = await db.execute(
        select(
            func.date_trunc(literal_column("'month'"), Transaction.date).label("month"),
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.type == TransactionType.income, Transaction.amount),
                        (
                            Transaction.type == TransactionType.transfer,
                            case(
                                (Transaction.to_account_id == account_id, Transaction.amount),
                                else_=-Transaction.amount,
                            ),
                        ),
                        else_=-Transaction.amount,
                    )
                ),
                0,
            ).label("net"),
        )
        .where(
            (Transaction.account_id == account_id) | (Transaction.to_account_id == account_id),
            Transaction.user_id == user.id,
            Transaction.deleted_at.is_(None),
        )
        .group_by(func.date_trunc(literal_column("'month'"), Transaction.date))
        .order_by(func.date_trunc(literal_column("'month'"), Transaction.date).desc())
    )

    monthly_nets = {row.month.strftime("%Y-%m"): float(row.net) for row in net_result.all()}

    # Walk backwards from current balance
    current_balance = float(account.balance)
    history = []
    running = current_balance

    for i in range(months):
        d = date(today.year, today.month, 1)
        for _ in range(i):
            if d.month == 1:
                d = date(d.year - 1, 12, 1)
            else:
                d = date(d.year, d.month - 1, 1)
        key = d.strftime("%Y-%m")
        history.append({"month": key, "balance": round(running, 2)})
        net = monthly_nets.get(key, 0)
        running -= net  # subtract this month's net to get previous month's end balance

    return list(reversed(history))
