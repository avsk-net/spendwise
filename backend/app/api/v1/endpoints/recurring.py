import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.database import get_db
from app.dependencies import get_current_user
from app.models.recurring import RecurringRule
from app.models.user import User
from app.schemas.recurring import RecurringCreate, RecurringResponse, RecurringUpdate

router = APIRouter(prefix="/recurring", tags=["recurring"])


@router.get("", response_model=list[RecurringResponse])
async def list_rules(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RecurringRule).where(
            RecurringRule.user_id == user.id,
            RecurringRule.deleted_at.is_(None),
        )
    )
    return result.scalars().all()


@router.post("", response_model=RecurringResponse, status_code=status.HTTP_201_CREATED)
async def create_rule(
    data: RecurringCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rule = RecurringRule(
        user_id=user.id,
        next_run_date=data.start_date,
        **data.model_dump(),
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.patch("/{rule_id}", response_model=RecurringResponse)
async def update_rule(
    rule_id: uuid.UUID,
    data: RecurringUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RecurringRule).where(
            RecurringRule.id == rule_id,
            RecurringRule.user_id == user.id,
            RecurringRule.deleted_at.is_(None),
        )
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise NotFoundError("RecurringRule")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(rule, field, value)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/{rule_id}", status_code=204)
async def delete_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RecurringRule).where(
            RecurringRule.id == rule_id,
            RecurringRule.user_id == user.id,
        )
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise NotFoundError("RecurringRule")
    rule.is_active = False
    await db.commit()
