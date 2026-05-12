import uuid
from datetime import datetime, timezone
from typing import Generic, Optional, Type, TypeVar
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import Base
from app.models.base import SoftDeleteMixin

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    soft_delete = True

    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    def _base_query(self):
        q = select(self.model)
        if self.soft_delete and issubclass(self.model, SoftDeleteMixin):
            q = q.where(self.model.deleted_at.is_(None))
        return q

    async def get_by_id(self, id: uuid.UUID) -> Optional[ModelType]:
        result = await self.db.execute(
            self._base_query().where(self.model.id == id)
        )
        return result.scalar_one_or_none()

    async def get_by_id_for_user(
        self, id: uuid.UUID, user_id: uuid.UUID
    ) -> Optional[ModelType]:
        result = await self.db.execute(
            self._base_query().where(
                self.model.id == id,
                self.model.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_for_user(self, user_id: uuid.UUID) -> list[ModelType]:
        result = await self.db.execute(
            self._base_query().where(self.model.user_id == user_id)
        )
        return list(result.scalars().all())

    async def save(self, instance: ModelType) -> ModelType:
        self.db.add(instance)
        await self.db.flush()
        await self.db.refresh(instance)
        return instance

    async def soft_delete_instance(self, instance: ModelType) -> None:
        if isinstance(instance, SoftDeleteMixin):
            instance.deleted_at = datetime.now(timezone.utc)
            await self.db.flush()

    async def hard_delete(self, instance: ModelType) -> None:
        await self.db.delete(instance)
        await self.db.flush()