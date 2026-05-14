import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.database import get_db
from app.dependencies import get_current_user
from app.models.categorization_rule import CategorizationRule
from app.models.user import User
from app.schemas.categorization_rule import RuleCreate, RuleResponse, RuleSuggestRequest, RuleUpdate

router = APIRouter(prefix="/categorization-rules", tags=["categorization-rules"])


@router.get("", response_model=list[RuleResponse])
async def list_rules(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CategorizationRule)
        .where(CategorizationRule.user_id == user.id)
        .order_by(CategorizationRule.priority.desc(), CategorizationRule.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=RuleResponse, status_code=status.HTTP_201_CREATED)
async def create_rule(
    data: RuleCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rule = CategorizationRule(user_id=user.id, **data.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.patch("/{rule_id}", response_model=RuleResponse)
async def update_rule(
    rule_id: uuid.UUID,
    data: RuleUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CategorizationRule).where(
            CategorizationRule.id == rule_id,
            CategorizationRule.user_id == user.id,
        )
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise NotFoundError("Rule")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(rule, field, value)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CategorizationRule).where(
            CategorizationRule.id == rule_id,
            CategorizationRule.user_id == user.id,
        )
    )
    rule = result.scalar_one_or_none()
    if rule:
        await db.delete(rule)
        await db.commit()


@router.post("/suggest")
async def suggest_category(
    data: RuleSuggestRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return best matching category_id for given text, or null."""
    result = await db.execute(
        select(CategorizationRule)
        .where(CategorizationRule.user_id == user.id, CategorizationRule.is_active.is_(True))
        .order_by(CategorizationRule.priority.desc())
    )
    rules = result.scalars().all()
    text_lower = data.text.lower()
    for rule in rules:
        if rule.keyword.lower() in text_lower:
            return {"category_id": str(rule.category_id)}
    return {"category_id": None}
