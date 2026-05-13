class SpendwiseException(Exception):
    """Base exception for all application exceptions."""

    def __init__(self, message: str, error_code: str, status_code: int = 400):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        super().__init__(message)


class AuthError(SpendwiseException):
    pass


class NotFoundError(SpendwiseException):
    def __init__(self, resource: str):
        super().__init__(f"{resource} not found", "NOT_FOUND", 404)


class PermissionError(SpendwiseException):
    def __init__(self, message: str = "Permission denied"):
        super().__init__(message, "PERMISSION_DENIED", 403)


class BusinessError(SpendwiseException):
    pass


class ValidationError(SpendwiseException):
    pass


class RateLimitError(SpendwiseException):
    def __init__(self):
        super().__init__("Too many requests", "RATE_LIMITED", 429)
