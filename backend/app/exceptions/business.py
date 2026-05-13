from app.core.exceptions import BusinessError, NotFoundError


class DuplicateUserError(BusinessError):
    def __init__(self):
        super().__init__("Email or username already taken", "DUPLICATE_USER", 409)


class SystemCategoryError(BusinessError):
    def __init__(self):
        super().__init__("Cannot modify system categories", "SYSTEM_CATEGORY", 403)


class AccountNotFoundError(NotFoundError):
    def __init__(self):
        super().__init__("Account")


class TransactionNotFoundError(NotFoundError):
    def __init__(self):
        super().__init__("Transaction")


class UserNotFoundError(NotFoundError):
    def __init__(self):
        super().__init__("User")


class BudgetNotFoundError(NotFoundError):
    def __init__(self):
        super().__init__("Budget")


class DuplicateBudgetError(BusinessError):
    def __init__(self):
        super().__init__(
            "Budget already exists for this category and month",
            "BUDGET_DUPLICATE",
            409,
        )


class SavingGoalNotFoundError(NotFoundError):
    def __init__(self):
        super().__init__("Saving goal")