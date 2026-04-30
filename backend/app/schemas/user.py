import re
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole, Department


# ─── Request Schemas (data coming IN from client) ───────────────────────────

class UserCreate(BaseModel):
    """Schema for admin creating a new user."""
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.user
    department: Department = Department.general

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.lower()
        if not re.fullmatch(r"[a-z0-9_]+", v):
            raise ValueError(
                "Username may only contain lowercase letters, digits, and underscores — no spaces or special characters."
            )
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        errors = []
        if len(v) < 8:
            errors.append("at least 8 characters")
        if not re.search(r"[a-z]", v):
            errors.append("at least one lowercase letter")
        if not re.search(r"[A-Z]", v):
            errors.append("at least one uppercase letter")
        if not re.search(r"\d", v):
            errors.append("at least one digit")
        if len(re.findall(r"[^a-zA-Z0-9]", v)) < 2:
            errors.append("at least 2 special characters")
        if errors:
            raise ValueError("Password must contain " + ", ".join(errors) + ".")
        return v


class UserUpdate(BaseModel):
    """Schema for updating user details."""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    department: Optional[Department] = None
    is_active: Optional[bool] = None


class LoginRequest(BaseModel):
    """Schema for login credentials."""
    username: str
    password: str


# ─── Response Schemas (data going OUT to client) ─────────────────────────────

class UserResponse(BaseModel):
    """Schema for user data returned to clients (never includes password)."""
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: UserRole
    department: Department
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True   # Allows reading from SQLAlchemy models


class TokenResponse(BaseModel):
    """Schema for JWT token response after login."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
