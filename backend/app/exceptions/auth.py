from app.core.exceptions import AuthError


class InvalidTokenError(AuthError):
    def __init__(self, detail: str = "Invalid or expired token"):
        super().__init__(detail, "INVALID_TOKEN", 401)


class InvalidCredentialsError(AuthError):
    def __init__(self):
        super().__init__("Invalid email or password", "INVALID_CREDENTIALS", 401)
