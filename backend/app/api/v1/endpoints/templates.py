import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.transaction_template import TransactionTemplate
from app.models.user import User
from app.schemas.transaction_template import TemplateCreate, TemplateResponse

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=list[TemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TransactionTemplate)
        .where(TransactionTemplate.user_id == user.id)
        .order_by(TransactionTemplate.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tmpl = TransactionTemplate(user_id=user.id, **data.model_dump())
    db.add(tmpl)
    await db.commit()
    await db.refresh(tmpl)
    return tmpl


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TransactionTemplate).where(
            TransactionTemplate.id == template_id,
            TransactionTemplate.user_id == user.id,
        )
    )
    tmpl = result.scalar_one_or_none()
    if tmpl:
        await db.delete(tmpl)
        await db.commit()
