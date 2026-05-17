import asyncio
import uuid
from datetime import datetime, timedelta

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.database import AsyncSessionLocal, get_db
from app.exceptions.auth import InvalidCredentialsError, InvalidTokenError
from app.models.user import User
from app.repositories.user_repository import UserRepository

bearer = HTTPBearer()


async def _touch_last_active(user_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as session:
        await session.execute(
            update(User).where(User.id == user_id).values(last_active_at=datetime.utcnow())
        )
        await session.commit()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        user_id = decode_access_token(credentials.credentials)
    except JWTError:
        raise InvalidTokenError()

    user = await UserRepository(db).get_by_id(uuid.UUID(user_id))
    if not user:
        raise InvalidCredentialsError()

    # Update last_active_at at most once every 5 minutes (fire-and-forget)
    now = datetime.utcnow()
    if user.last_active_at is None or (now - user.last_active_at) > timedelta(minutes=5):
        asyncio.create_task(_touch_last_active(user.id))

    return user


async def get_current_superadmin(
    user: User = Depends(get_current_user),
) -> User:
    if not user.is_superadmin:
        raise InvalidCredentialsError()
    return user
