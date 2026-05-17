import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str
    currency: str

    @field_validator("password")
    @classmethod
    def min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("currency")
    @classmethod
    def upper(cls, v: str) -> str:
        return v.upper()


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    currency: str
    avatar_url: Optional[str] = None
    is_superadmin: bool
    is_active: bool
    email_reports_enabled: bool
    is_email_verified: bool
    totp_enabled: bool = False
    last_active_at: Optional[datetime] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class AdminUserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None
    is_email_verified: Optional[bool] = None


class AdminStatsResponse(BaseModel):
    total_users: int
    active_sessions: int
    signups_last_7_days: int
    signups_last_30_days: int
    active_today: int
    active_7_days: int
    verified_users: int
    two_fa_users: int
    total_transactions: int
    total_budgets: int
    failed_logins_24h: int
    online_now: int


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    email_reports_enabled: Optional[bool] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class TokenResponse(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    requires_2fa: bool = False
    mfa_token: Optional[str] = None


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class VerifyEmailRequest(BaseModel):
    token: str


class MessageResponse(BaseModel):
    message: str


class SessionResponse(BaseModel):
    id: uuid.UUID
    created_at: datetime
    expires_at: datetime
    model_config = {"from_attributes": True}


class TOTPSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str


class TOTPVerifyRequest(BaseModel):
    code: str
    secret: Optional[str] = None


class MFAVerifyRequest(BaseModel):
    mfa_token: str
    code: str


class UserGrowthPoint(BaseModel):
    week: str
    count: int


class ActivityLogEntry(BaseModel):
    id: str
    user_id: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    action: str
    ip_address: Optional[str] = None
    created_at: datetime


class RecentLogin(BaseModel):
    at: datetime
    ip: Optional[str] = None


class AdminUserDetail(BaseModel):
    id: str
    username: str
    email: str
    currency: str
    avatar_url: Optional[str] = None
    is_active: bool
    is_superadmin: bool
    is_email_verified: bool
    totp_enabled: bool
    created_at: datetime
    last_active_at: Optional[datetime] = None
    login_count: int
    session_count: int
    recent_logins: list[RecentLogin]
    transaction_count: int
    total_income: float
    total_expense: float
    account_count: int
    budget_count: int
    failed_login_count: int


class UserLogEntry(BaseModel):
    id: str
    action: str
    ip_address: Optional[str] = None
    created_at: datetime
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None


class AdminNotifyRequest(BaseModel):
    message: str
