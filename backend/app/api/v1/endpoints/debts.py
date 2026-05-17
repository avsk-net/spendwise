import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError
from app.database import get_db
from app.dependencies import get_current_user
from app.enums.debt_type import DebtStatus
from app.models.debt import Debt, DebtPayment
from app.models.user import User
from app.schemas.debt import (
    DebtCreate,
    DebtPaymentCreate,
    DebtPaymentResponse,
    DebtResponse,
    DebtUpdate,
)

router = APIRouter(prefix="/debts", tags=["debts"])


async def _get_debt(debt_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> Debt:
    result = await db.execute(
        select(Debt)
        .options(selectinload(Debt.payments))
        .where(Debt.id == debt_id, Debt.user_id == user_id)
    )
    debt = result.scalar_one_or_none()
    if not debt:
        raise NotFoundError("Debt")
    return debt


def _enrich(debt: Debt) -> DebtResponse:
    paid = sum((p.amount for p in debt.payments), Decimal("0"))
    return DebtResponse(
        id=debt.id,
        counterparty=debt.counterparty,
        type=debt.type,
        status=debt.status,
        principal=debt.principal,
        interest_rate=debt.interest_rate,
        due_date=debt.due_date,
        notes=debt.notes,
        paid_amount=paid,
        remaining=max(Decimal("0"), debt.principal - paid),
        payments=[DebtPaymentResponse.model_validate(p) for p in debt.payments],
        created_at=debt.created_at,
    )


@router.get("", response_model=list[DebtResponse])
async def list_debts(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit
    result = await db.execute(
        select(Debt)
        .options(selectinload(Debt.payments))
        .where(Debt.user_id == user.id)
        .order_by(Debt.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return [_enrich(d) for d in result.scalars().all()]


@router.post("", response_model=DebtResponse, status_code=status.HTTP_201_CREATED)
async def create_debt(
    data: DebtCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    debt = Debt(user_id=user.id, **data.model_dump())
    db.add(debt)
    await db.commit()
    await db.refresh(debt)
    # reload with payments
    debt = await _get_debt(debt.id, user.id, db)
    return _enrich(debt)


@router.patch("/{debt_id}", response_model=DebtResponse)
async def update_debt(
    debt_id: uuid.UUID,
    data: DebtUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    debt = await _get_debt(debt_id, user.id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(debt, field, value)
    await db.commit()
    debt = await _get_debt(debt_id, user.id, db)
    return _enrich(debt)


@router.delete("/{debt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_debt(
    debt_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    debt = await _get_debt(debt_id, user.id, db)
    await db.delete(debt)
    await db.commit()


@router.post(
    "/{debt_id}/payments", response_model=DebtResponse, status_code=status.HTTP_201_CREATED
)
async def add_payment(
    debt_id: uuid.UUID,
    data: DebtPaymentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    debt = await _get_debt(debt_id, user.id, db)
    payment = DebtPayment(debt_id=debt.id, **data.model_dump())
    db.add(payment)
    # auto-mark paid if remaining goes to zero
    paid_after = sum((p.amount for p in debt.payments), Decimal("0")) + data.amount
    if paid_after >= debt.principal:
        debt.status = DebtStatus.paid
    await db.commit()
    debt = await _get_debt(debt_id, user.id, db)
    return _enrich(debt)


@router.delete("/{debt_id}/payments/{payment_id}", response_model=DebtResponse)
async def delete_payment(
    debt_id: uuid.UUID,
    payment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    debt = await _get_debt(debt_id, user.id, db)
    payment = next((p for p in debt.payments if p.id == payment_id), None)
    if not payment:
        raise NotFoundError("Payment")
    await db.delete(payment)
    await db.commit()
    debt = await _get_debt(debt_id, user.id, db)
    return _enrich(debt)
