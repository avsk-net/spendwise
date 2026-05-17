import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions.auth import InvalidCredentialsError, InvalidTokenError
from app.models.audit_log import AuditAction, AuditLog
from app.models.user import RefreshToken, User
from app.repositories.user_repository import (
    EmailTokenRepository,
    RefreshTokenRepository,
    UserRepository,
)
from app.schemas.user import (
    AccessTokenResponse,
    ForgotPasswordRequest,
    MessageResponse,
    RefreshRequest,
    ResetPasswordRequest,
    SessionResponse,
    TokenResponse,
    UserLogin,
    UserRegister,
    VerifyEmailRequest,
)
from app.services.email_service import send_password_reset_email, send_verification_email
from app.services.seed import seed_categories_for_user

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["auth"])

_VERIFICATION_EXPIRY_MINUTES = 60 * 24  # 24 hours
_RESET_EXPIRY_MINUTES = 60  # 1 hour


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

    # Issue refresh token
    raw_refresh, token_hash, expires_at = create_refresh_token()
    await RefreshTokenRepository(db).save(
        RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at)
    )

    # Send verification email (best-effort — silently skips if SMTP not configured)
    token_repo = EmailTokenRepository(db)
    raw_verify = await token_repo.create_token(
        user.id, "email_verification", _VERIFICATION_EXPIRY_MINUTES
    )

    db.add(
        AuditLog(
            user_id=user.id,
            action=AuditAction.REGISTER,
            ip_address=request.client.host if request.client else None,
        )
    )
    await db.commit()

    send_verification_email(user.email, user.username, raw_verify, settings.APP_BASE_URL)

    return TokenResponse(access_token=create_access_token(str(user.id)), refresh_token=raw_refresh)


@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def login(request: Request, data: UserLogin, db: AsyncSession = Depends(get_db)):
    user_repo = UserRepository(db)
    user = await user_repo.get_by_email(data.email)

    if not user or not verify_password(data.password, user.hashed_password):
        db.add(
            AuditLog(
                action=AuditAction.LOGIN_FAILED,
                ip_address=request.client.host if request.client else None,
                new_value={"email": data.email},
            )
        )
        await db.commit()
        raise InvalidCredentialsError()

    raw_refresh, token_hash, expires_at = create_refresh_token()
    await RefreshTokenRepository(db).save(
        RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at)
    )
    db.add(
        AuditLog(
            user_id=user.id,
            action=AuditAction.LOGIN,
            ip_address=request.client.host if request.client else None,
        )
    )
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
    db.add(
        AuditLog(
            user_id=user.id,
            action=AuditAction.LOGOUT,
            ip_address=request.client.host if request.client else None,
        )
    )
    await db.commit()


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RefreshToken)
        .where(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked == False,  # noqa: E712
            RefreshToken.expires_at > datetime.utcnow(),
        )
        .order_by(RefreshToken.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/sessions/{session_id}", status_code=204)
async def revoke_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.id == session_id,
            RefreshToken.user_id == user.id,
        )
    )
    token = result.scalar_one_or_none()
    if token:
        token.revoked = True
        await db.commit()


@router.delete("/sessions", status_code=204)
async def revoke_all_sessions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked == False,  # noqa: E712
        )
    )
    for token in result.scalars().all():
        token.revoked = True
    await db.commit()


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(data: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    token_repo = EmailTokenRepository(db)
    stored = await token_repo.get_valid_token(data.token, "email_verification")
    if not stored:
        raise InvalidTokenError("Verification link is invalid or has expired")

    result = await db.execute(
        __import__("sqlalchemy", fromlist=["select"]).select(User).where(User.id == stored.user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise InvalidTokenError("User not found")

    user.is_email_verified = True
    user.email_verified_at = datetime.utcnow()
    await token_repo.mark_used(stored)
    await db.commit()

    return MessageResponse(message="Email verified successfully")


@router.post("/resend-verification", response_model=MessageResponse)
@limiter.limit(settings.RATE_LIMIT_RESEND_VERIFICATION)
async def resend_verification(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.is_email_verified:
        return MessageResponse(message="Email is already verified")

    token_repo = EmailTokenRepository(db)
    raw = await token_repo.create_token(user.id, "email_verification", _VERIFICATION_EXPIRY_MINUTES)
    await db.commit()

    send_verification_email(user.email, user.username, raw, settings.APP_BASE_URL)
    return MessageResponse(message="Verification email sent")


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit(settings.RATE_LIMIT_FORGOT_PASSWORD)
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    # Always return the same response to prevent email enumeration
    generic = MessageResponse(message="If that email exists, a reset link has been sent")

    user = await UserRepository(db).get_by_email(data.email)
    if not user:
        return generic

    token_repo = EmailTokenRepository(db)
    raw = await token_repo.create_token(user.id, "password_reset", _RESET_EXPIRY_MINUTES)
    await db.commit()

    send_password_reset_email(user.email, user.username, raw, settings.APP_BASE_URL)
    return generic


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    token_repo = EmailTokenRepository(db)
    stored = await token_repo.get_valid_token(data.token, "password_reset")
    if not stored:
        raise InvalidTokenError("Reset link is invalid or has expired")

    from sqlalchemy import select as _select

    result = await db.execute(_select(User).where(User.id == stored.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise InvalidTokenError("User not found")

    user.hashed_password = hash_password(data.new_password)
    await token_repo.mark_used(stored)
    # Revoke all existing sessions so the old password can't be reused
    await RefreshTokenRepository(db).revoke_all_for_user(user.id)
    await db.commit()

    return MessageResponse(
        message="Password reset successfully. Please log in with your new password."
    )
