import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.v1.router import v1_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.exceptions.handlers import register_exception_handlers
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.request_id import RequestIDMiddleware

setup_logging()
log = logging.getLogger(__name__)


async def _seed_superadmin() -> None:
    if not settings.SUPERADMIN_EMAIL or not settings.SUPERADMIN_PASSWORD:
        return
    from sqlalchemy import select

    from app.core.security import hash_password
    from app.database import AsyncSessionLocal
    from app.models.user import User

    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == settings.SUPERADMIN_EMAIL))
        if existing.scalar_one_or_none():
            return
        user = User(
            email=settings.SUPERADMIN_EMAIL,
            username="superadmin",
            hashed_password=hash_password(settings.SUPERADMIN_PASSWORD),
            currency="USD",
            is_superadmin=True,
            is_active=True,
            is_email_verified=True,
        )
        db.add(user)
        await db.commit()
        log.info("Superadmin account created: %s", settings.SUPERADMIN_EMAIL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        os.makedirs(os.path.join(settings.MEDIA_DIR, "avatars"), exist_ok=True)
    except OSError as e:
        log.warning("Could not pre-create media/avatars directory: %s", e)
    await _seed_superadmin()
    yield


limiter = Limiter(key_func=get_remote_address, storage_uri=settings.REDIS_URL)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs" if settings.APP_ENV != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

# Middleware — order matters: added last = executed first
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RequestIDMiddleware)

# Rate limiter state
app.state.limiter = limiter

# Register all exception handlers
register_exception_handlers(app)

# Static media files (avatars etc.)
os.makedirs(settings.MEDIA_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.MEDIA_DIR), name="media")

# Mount versioned API
app.include_router(v1_router)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "version": settings.APP_VERSION, "env": settings.APP_ENV}
