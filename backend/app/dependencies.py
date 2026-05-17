import uuid

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.database import get_db
from app.exceptions.auth import InvalidCredentialsError, InvalidTokenError
from app.models.user import User
from app.repositories.user_repository import UserRepository

bearer = HTTPBearer()


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
    return user


async def get_current_superadmin(
    user: User = Depends(get_current_user),
) -> User:
    if not user.is_superadmin:
        raise InvalidCredentialsError()
    return user
