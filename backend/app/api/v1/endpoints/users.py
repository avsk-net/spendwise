import os

from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ValidationError
from app.core.security import hash_password, verify_password
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import (
    PasswordChange,
    TOTPSetupResponse,
    TOTPVerifyRequest,
    UserResponse,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["users"])

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_MAX_AVATAR_BYTES = 5 * 1024 * 1024  # 5 MB


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise ValidationError("Only JPEG, PNG, WebP, or GIF images are accepted", "INVALID_FILE")
    data = await file.read()
    if len(data) > _MAX_AVATAR_BYTES:
        raise ValidationError("File must be under 5 MB", "FILE_TOO_LARGE")

    ext = (
        file.filename.rsplit(".", 1)[-1].lower()
        if file.filename and "." in file.filename
        else "jpg"
    )
    avatars_dir = os.path.join(settings.MEDIA_DIR, "avatars")
    os.makedirs(avatars_dir, exist_ok=True)

    # Remove previous avatar file if present
    if user.avatar_url:
        old_path = os.path.join(settings.MEDIA_DIR, user.avatar_url.lstrip("/media/"))
        if os.path.isfile(old_path):
            os.remove(old_path)

    filename = f"{user.id}.{ext}"
    save_path = os.path.join(avatars_dir, filename)
    with open(save_path, "wb") as f:
        f.write(data)

    user.avatar_url = f"/media/avatars/{filename}"
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/me/avatar", response_model=UserResponse)
async def delete_avatar(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.avatar_url:
        path = os.path.join(settings.MEDIA_DIR, user.avatar_url.lstrip("/media/"))
        if os.path.isfile(path):
            os.remove(path)
        user.avatar_url = None
        await db.commit()
        await db.refresh(user)
    return user


@router.patch("/me/password", status_code=204)
async def change_password(
    data: PasswordChange,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, user.hashed_password):
        raise ValidationError("Current password incorrect", "WRONG_PASSWORD")
    user.hashed_password = hash_password(data.new_password)
    await db.commit()


@router.delete("/me", status_code=204)
async def delete_me(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await db.delete(user)
    await db.commit()


@router.post("/me/2fa/setup", response_model=TOTPSetupResponse)
async def setup_2fa(user: User = Depends(get_current_user)):
    import pyotp

    secret = pyotp.random_base32()
    provisioning_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user.email, issuer_name="SpendWise"
    )
    return TOTPSetupResponse(secret=secret, provisioning_uri=provisioning_uri)


@router.post("/me/2fa/enable", response_model=UserResponse)
async def enable_2fa(
    data: TOTPVerifyRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    import pyotp

    if not data.secret:
        from app.core.exceptions import ValidationError

        raise ValidationError("Secret required", "MISSING_SECRET")
    totp = pyotp.TOTP(data.secret)
    if not totp.verify(data.code, valid_window=1):
        from app.core.exceptions import ValidationError

        raise ValidationError("Invalid code", "INVALID_TOTP")
    user.totp_secret = data.secret
    user.totp_enabled = True
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/me/2fa", response_model=UserResponse)
async def disable_2fa(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    user.totp_secret = None
    user.totp_enabled = False
    await db.commit()
    await db.refresh(user)
    return user
