import datetime
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions.business import SavingGoalNotFoundError
from app.models.saving_goal import SavingGoal
from app.models.user import User
from app.schemas.saving_goal import (
    ContributeRequest,
    SavingGoalCreate,
    SavingGoalResponse,
    SavingGoalUpdate,
)

router = APIRouter(prefix="/saving-goals", tags=["saving-goals"])


async def _get_goal(goal_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> SavingGoal:
    result = await db.execute(
        select(SavingGoal).where(
            SavingGoal.id == goal_id,
            SavingGoal.user_id == user_id,
            SavingGoal.deleted_at.is_(None),
        )
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise SavingGoalNotFoundError()
    return goal


@router.get("", response_model=list[SavingGoalResponse])
async def list_goals(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SavingGoal)
        .where(SavingGoal.user_id == user.id, SavingGoal.deleted_at.is_(None))
        .order_by(SavingGoal.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=SavingGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    data: SavingGoalCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    goal = SavingGoal(user_id=user.id, **data.model_dump())
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.patch("/{goal_id}", response_model=SavingGoalResponse)
async def update_goal(
    goal_id: uuid.UUID,
    data: SavingGoalUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    goal = await _get_goal(goal_id, user.id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(goal, field, value)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.post("/{goal_id}/contribute", response_model=SavingGoalResponse)
async def contribute(
    goal_id: uuid.UUID,
    data: ContributeRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    goal = await _get_goal(goal_id, user.id, db)
    goal.current_amount += data.amount
    if goal.current_amount >= goal.target_amount:
        goal.is_completed = True
    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    goal = await _get_goal(goal_id, user.id, db)
    goal.deleted_at = datetime.datetime.utcnow()
    await db.commit()
