import os

TEST_DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://spendwise:spendwise@localhost:5432/spendwise_test",
)
