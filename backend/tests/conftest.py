import asyncio
import os

import pytest

TEST_DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://spendwise:spendwise@localhost:5432/spendwise_test",
)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()
