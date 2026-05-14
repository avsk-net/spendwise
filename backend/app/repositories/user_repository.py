import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_token
from app.models.email_token import EmailToken
from app.models.user import RefreshToken, User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    soft_delete = False

    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def email_or_username_exists(self, email: str, username: str) -> bool:
        result = await self.db.execute(
            select(User).where((User.email == email) | (User.username == username))
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

    async def revoke_all_for_user(self, user_id: uuid.UUID) -> None:
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked == False)  # noqa: E712
            .values(revoked=True)
        )


class EmailTokenRepository(BaseRepository[EmailToken]):
    soft_delete = False

    def __init__(self, db: AsyncSession):
        super().__init__(EmailToken, db)

    async def create_token(self, user_id: uuid.UUID, purpose: str, expiry_minutes: int) -> str:
        """Creates a new token, invalidates previous ones for same user+purpose. Returns raw token."""
        await self.invalidate_all(user_id, purpose)
        raw = secrets.token_urlsafe(32)
        token = EmailToken(
            user_id=user_id,
            token_hash=hash_token(raw),
            purpose=purpose,
            expires_at=datetime.utcnow() + timedelta(minutes=expiry_minutes),
        )
        await self.save(token)
        return raw

    async def get_valid_token(self, raw_token: str, purpose: str) -> Optional[EmailToken]:
        result = await self.db.execute(
            select(EmailToken).where(
                EmailToken.token_hash == hash_token(raw_token),
                EmailToken.purpose == purpose,
                EmailToken.used_at.is_(None),
                EmailToken.expires_at > datetime.utcnow(),
            )
        )
        return result.scalar_one_or_none()

    async def mark_used(self, token: EmailToken) -> None:
        token.used_at = datetime.utcnow()
        await self.db.flush()

    async def invalidate_all(self, user_id: uuid.UUID, purpose: str) -> None:
        await self.db.execute(
            update(EmailToken)
            .where(
                EmailToken.user_id == user_id,
                EmailToken.purpose == purpose,
                EmailToken.used_at.is_(None),
            )
            .values(used_at=datetime.utcnow())
        )
