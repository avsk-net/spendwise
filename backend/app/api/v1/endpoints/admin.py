import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.database import get_db
from app.dependencies import get_current_superadmin
from app.models.user import RefreshToken, User
from app.repositories.user_repository import RefreshTokenRepository
from app.schemas.user import AdminStatsResponse, AdminUserUpdate, UserResponse

router = APIRouter(prefix="/admin", tags=["admin"])


async def _get_user(user_id: uuid.UUID, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User")
    return user


@router.get("/stats", response_model=AdminStatsResponse)
async def stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superadmin),
):
    total = (await db.execute(select(func.count()).select_from(User))).scalar() or 0

    now = datetime.utcnow()
    active_sessions = (
        await db.execute(
            select(func.count())
            .select_from(RefreshToken)
            .where(RefreshToken.revoked.is_(False), RefreshToken.expires_at > now)
        )
    ).scalar() or 0

    since_7 = now - timedelta(days=7)
    since_30 = now - timedelta(days=30)

    signups_7 = (
        await db.execute(select(func.count()).select_from(User).where(User.created_at >= since_7))
    ).scalar() or 0

    signups_30 = (
        await db.execute(select(func.count()).select_from(User).where(User.created_at >= since_30))
    ).scalar() or 0

    return AdminStatsResponse(
        total_users=total,
        active_sessions=active_sessions,
        signups_last_7_days=signups_7,
        signups_last_30_days=signups_30,
    )


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
    search: str = Query(default=""),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superadmin),
):
    q = select(User)
    if search:
        term = f"%{search}%"
        q = q.where((User.email.ilike(term)) | (User.username.ilike(term)))
    q = q.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    data: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_superadmin),
):
    user = await _get_user(user_id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_superadmin),
):
    user = await _get_user(user_id, db)
    await db.delete(user)
    await db.commit()


@router.post("/users/{user_id}/force-logout", status_code=status.HTTP_204_NO_CONTENT)
async def force_logout(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_superadmin),
):
    await _get_user(user_id, db)
    await RefreshTokenRepository(db).revoke_all_for_user(user_id)
    await db.commit()
