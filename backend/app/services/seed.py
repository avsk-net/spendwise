import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.category import Category
from app.enums.category_type import CategoryType
from app.core.constants import SYSTEM_CATEGORY_SEED


async def seed_categories_for_user(user_id: uuid.UUID, db: AsyncSession) -> None:
    type_map = {
        "income": CategoryType.income,
        "expense": CategoryType.expense,
        "both": CategoryType.both,
    }
    db.add_all([
        Category(
            user_id=user_id,
            name=name,
            icon=icon,
            type=type_map[ctype],
            is_system=True,
        )
        for name, icon, ctype in SYSTEM_CATEGORY_SEED
    ])