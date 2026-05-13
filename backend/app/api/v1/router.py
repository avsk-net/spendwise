from fastapi import APIRouter

from app.api.v1.endpoints import (
    accounts,
    auth,
    budgets,
    categories,
    notifications,
    recurring,
    reports,
    saving_goals,
    transactions,
    users,
    websocket,
)

v1_router = APIRouter(prefix="/api/v1")

v1_router.include_router(auth.router)
v1_router.include_router(users.router)
v1_router.include_router(accounts.router)
v1_router.include_router(categories.router)
v1_router.include_router(transactions.router)
v1_router.include_router(budgets.router)
v1_router.include_router(recurring.router)
v1_router.include_router(reports.router)
v1_router.include_router(notifications.router)
v1_router.include_router(websocket.router)
v1_router.include_router(saving_goals.router)
