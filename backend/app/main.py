from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.core.logging import setup_logging
from app.api.v1.router import v1_router
from app.exceptions.handlers import register_exception_handlers
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.logging import RequestLoggingMiddleware

setup_logging()

limiter = Limiter(key_func=get_remote_address, storage_uri=settings.REDIS_URL)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs" if settings.APP_ENV != "production" else None,
    redoc_url=None,
)

# Middleware — order matters: added last = executed first
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RequestIDMiddleware)

# Rate limiter state
app.state.limiter = limiter

# Register all exception handlers
register_exception_handlers(app)

# Mount versioned API
app.include_router(v1_router)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "version": settings.APP_VERSION, "env": settings.APP_ENV}