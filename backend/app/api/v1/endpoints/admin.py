import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.database import get_db
from app.dependencies import get_current_superadmin
from app.models.audit_log import AuditAction, AuditLog
from app.models.user import RefreshToken, User
from app.repositories.user_repository import RefreshTokenRepository
from app.schemas.user import (
    ActivityLogEntry,
    AdminStatsResponse,
    AdminUserDetail,
    AdminUserUpdate,
    RecentLogin,
    UserGrowthPoint,
    UserResponse,
)

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
    now = datetime.utcnow()
    since_7 = now - timedelta(days=7)
    since_30 = now - timedelta(days=30)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total = (await db.execute(select(func.count()).select_from(User))).scalar() or 0

    active_sessions = (
        await db.execute(
            select(func.count())
            .select_from(RefreshToken)
            .where(RefreshToken.revoked.is_(False), RefreshToken.expires_at > now)
        )
    ).scalar() or 0

    signups_7 = (
        await db.execute(select(func.count()).select_from(User).where(User.created_at >= since_7))
    ).scalar() or 0

    signups_30 = (
        await db.execute(select(func.count()).select_from(User).where(User.created_at >= since_30))
    ).scalar() or 0

    active_today = (
        await db.execute(
            select(func.count()).select_from(User).where(User.last_active_at >= today_start)
        )
    ).scalar() or 0

    active_7_days = (
        await db.execute(
            select(func.count()).select_from(User).where(User.last_active_at >= since_7)
        )
    ).scalar() or 0

    verified_users = (
        await db.execute(
            select(func.count()).select_from(User).where(User.is_email_verified.is_(True))
        )
    ).scalar() or 0

    two_fa_users = (
        await db.execute(select(func.count()).select_from(User).where(User.totp_enabled.is_(True)))
    ).scalar() or 0

    return AdminStatsResponse(
        total_users=total,
        active_sessions=active_sessions,
        signups_last_7_days=signups_7,
        signups_last_30_days=signups_30,
        active_today=active_today,
        active_7_days=active_7_days,
        verified_users=verified_users,
        two_fa_users=two_fa_users,
    )


@router.get("/growth", response_model=list[UserGrowthPoint])
async def user_growth(
    weeks: int = Query(default=12, ge=4, le=52),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superadmin),
):
    from sqlalchemy import literal_column

    since = datetime.utcnow() - timedelta(weeks=weeks)
    result = await db.execute(
        select(
            func.date_trunc(literal_column("'week'"), User.created_at).label("week"),
            func.count().label("count"),
        )
        .where(User.created_at >= since)
        .group_by(func.date_trunc(literal_column("'week'"), User.created_at))
        .order_by(func.date_trunc(literal_column("'week'"), User.created_at))
    )
    return [
        UserGrowthPoint(week=row.week.strftime("%Y-%m-%d"), count=int(row.count))
        for row in result.all()
    ]


@router.get("/activity", response_model=list[ActivityLogEntry])
async def recent_activity(
    limit: int = Query(default=50, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superadmin),
):
    result = await db.execute(
        select(AuditLog, User.username, User.email)
        .outerjoin(User, User.id == AuditLog.user_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    return [
        ActivityLogEntry(
            id=str(row.AuditLog.id),
            user_id=str(row.AuditLog.user_id) if row.AuditLog.user_id else None,
            username=row.username,
            email=row.email,
            action=row.AuditLog.action,
            ip_address=row.AuditLog.ip_address,
            created_at=row.AuditLog.created_at,
        )
        for row in result.all()
    ]


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
    q = q.order_by(User.last_active_at.desc().nulls_last()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/users/{user_id}/detail", response_model=AdminUserDetail)
async def user_detail(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superadmin),
):
    user = await _get_user(user_id, db)

    login_count = (
        await db.execute(
            select(func.count())
            .select_from(AuditLog)
            .where(AuditLog.user_id == user_id, AuditLog.action == AuditAction.LOGIN)
        )
    ).scalar() or 0

    session_count = (
        await db.execute(
            select(func.count())
            .select_from(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked.is_(False),
                RefreshToken.expires_at > datetime.utcnow(),
            )
        )
    ).scalar() or 0

    logins_result = await db.execute(
        select(AuditLog.created_at, AuditLog.ip_address)
        .where(AuditLog.user_id == user_id, AuditLog.action == AuditAction.LOGIN)
        .order_by(AuditLog.created_at.desc())
        .limit(5)
    )
    recent_logins = [
        RecentLogin(at=row.created_at, ip=row.ip_address) for row in logins_result.all()
    ]

    return AdminUserDetail(
        id=str(user.id),
        username=user.username,
        email=user.email,
        currency=user.currency,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_superadmin=user.is_superadmin,
        is_email_verified=user.is_email_verified,
        totp_enabled=user.totp_enabled,
        created_at=user.created_at,
        last_active_at=user.last_active_at,
        login_count=login_count,
        session_count=session_count,
        recent_logins=recent_logins,
    )


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
