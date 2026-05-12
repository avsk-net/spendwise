from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, RefreshToken
from app.schemas.user import UserRegister, UserLogin, TokenResponse, RefreshRequest, AccessTokenResponse
from app.core.security import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, hash_token,
)
from app.core.config import settings
from app.repositories.user_repository import UserRepository, RefreshTokenRepository
from app.services.seed import seed_categories_for_user
from app.exceptions.auth import InvalidTokenError, InvalidCredentialsError
from app.exceptions.business import UserNotFoundError
from app.models.audit_log import AuditLog, AuditAction

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit(settings.RATE_LIMIT_REGISTER)
async def register(request: Request, data: UserRegister, db: AsyncSession = Depends(get_db)):
    user_repo = UserRepository(db)

    if await user_repo.email_or_username_exists(data.email, data.username):
        from app.core.exceptions import ValidationError
        raise ValidationError("Email or username already taken", "DUPLICATE_USER")

    user = User(
        email=data.email,
        username=data.username,
        hashed_password=hash_password(data.password),
        currency=data.currency,
    )
    await user_repo.save(user)
    await seed_categories_for_user(user.id, db)

    raw_refresh, token_hash, expires_at = create_refresh_token()
    token_repo = RefreshTokenRepository(db)
    await token_repo.save(RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at))

    db.add(AuditLog(
        user_id=user.id,
        action=AuditAction.REGISTER,
        ip_address=request.client.host if request.client else None,
    ))
    await db.commit()

    return TokenResponse(access_token=create_access_token(str(user.id)), refresh_token=raw_refresh)


@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def login(request: Request, data: UserLogin, db: AsyncSession = Depends(get_db)):
    user_repo = UserRepository(db)
    user = await user_repo.get_by_email(data.email)

    if not user or not verify_password(data.password, user.hashed_password):
        db.add(AuditLog(
            action=AuditAction.LOGIN_FAILED,
            ip_address=request.client.host if request.client else None,
            new_value={"email": data.email},
        ))
        await db.commit()
        raise InvalidCredentialsError()

    raw_refresh, token_hash, expires_at = create_refresh_token()
    await RefreshTokenRepository(db).save(
        RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at)
    )
    db.add(AuditLog(user_id=user.id, action=AuditAction.LOGIN, ip_address=request.client.host if request.client else None))
    await db.commit()

    return TokenResponse(access_token=create_access_token(str(user.id)), refresh_token=raw_refresh)


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    stored = await RefreshTokenRepository(db).get_valid_token(data.refresh_token)
    if not stored:
        raise InvalidTokenError()
    return AccessTokenResponse(access_token=create_access_token(str(stored.user_id)))


@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    data: RefreshRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await RefreshTokenRepository(db).revoke(data.refresh_token, user.id)
    db.add(AuditLog(user_id=user.id, action=AuditAction.LOGOUT, ip_address=request.client.host if request.client else None))
    await db.commit()