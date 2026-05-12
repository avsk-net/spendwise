import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.repositories.base import BaseRepository
from app.models.user import User, RefreshToken
from app.core.security import hash_token


class UserRepository(BaseRepository[User]):
    soft_delete = False

    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def email_or_username_exists(self, email: str, username: str) -> bool:
        result = await self.db.execute(
            select(User).where(
                (User.email == email) | (User.username == username)
            )
        )
        return result.scalar_one_or_none() is not None


class RefreshTokenRepository(BaseRepository[RefreshToken]):
    soft_delete = False

    def __init__(self, db: AsyncSession):
        super().__init__(RefreshToken, db)

    async def get_valid_token(self, raw_token: str) -> Optional[RefreshToken]:
        result = await self.db.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == hash_token(raw_token),
                RefreshToken.revoked == False,  # noqa: E712
                RefreshToken.expires_at > datetime.utcnow(),

            )
        )
        return result.scalar_one_or_none()

    async def revoke(self, raw_token: str, user_id: uuid.UUID) -> None:
        result = await self.db.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == hash_token(raw_token),
                RefreshToken.user_id == user_id,
            )
        )
        stored = result.scalar_one_or_none()
        if stored:
            stored.revoked = True
            await self.db.flush()