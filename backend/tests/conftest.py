import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.main import app
from app.database import Base, get_db

TEST_DB_URL = "postgresql+asyncpg://spendwise:spendwise@localhost:5432/spendwise_test"

test_engine = create_async_engine(TEST_DB_URL)
TestSession = async_sessionmaker(test_engine, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db() -> AsyncSession:
    async with TestSession() as session:
        yield session


@pytest_asyncio.fixture
async def client(db: AsyncSession):
    app.dependency_overrides[get_db] = lambda: db  # type: ignore
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_client(client: AsyncClient):
    """Returns (client, tokens) with a registered user already logged in."""
    r = await client.post("/api/auth/register", json={
        "email": "fixture@example.com",
        "username": "fixtureuser",
        "password": "securepass123",
        "currency": "BDT",
    })
    tokens = r.json()
    client.headers["Authorization"] = f"Bearer {tokens['access_token']}"
    return client, tokens