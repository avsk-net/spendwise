import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions.business import SystemCategoryError
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate


class CategoryTreeNode(CategoryResponse):
    children: list["CategoryTreeNode"] = []
    model_config = {"from_attributes": True}


CategoryTreeNode.model_rebuild()

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/tree", response_model=list[CategoryTreeNode])
async def categories_tree(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Category).where(
            Category.user_id == user.id,
            Category.deleted_at.is_(None),
        )
    )
    all_cats = result.scalars().all()
    # Build tree in memory
    nodes = {c.id: CategoryTreeNode.model_validate(c) for c in all_cats}
    roots = []
    for cat in all_cats:
        node = nodes[cat.id]
        if cat.parent_id and cat.parent_id in nodes:
            nodes[cat.parent_id].children.append(node)
        else:
            roots.append(node)
    return roots


@router.get("", response_model=list[CategoryResponse])
async def list_categories(
    limit: int = Query(default=200, le=500),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Category)
        .where(
            Category.user_id == user.id,
            Category.deleted_at.is_(None),
        )
        .limit(limit)
    )
    return result.scalars().all()


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    category = Category(user_id=user.id, is_system=False, **data.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: uuid.UUID,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == user.id,
            Category.deleted_at.is_(None),
        )
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise NotFoundError("Category")
    if cat.is_system:
        raise SystemCategoryError()
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(cat, field, value)
    await db.commit()
    await db.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=204)
async def delete_category(
    category_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == user.id,
            Category.deleted_at.is_(None),
        )
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise NotFoundError("Category")
    if cat.is_system:
        raise SystemCategoryError()
    await db.delete(cat)
    await db.commit()
