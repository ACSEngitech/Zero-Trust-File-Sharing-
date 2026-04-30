from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db

# Password hashing context - uses bcrypt algorithm
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token extractor from Authorization header
security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a plain text password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check if a plain password matches the stored hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Payload to encode (usually {"sub": username, "role": role})
        expires_delta: How long the token is valid (defaults to settings value)
    
    Returns:
        Signed JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT token.
    
    Returns:
        Token payload dict
    
    Raises:
        HTTPException 401 if token is invalid or expired
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    FastAPI dependency to get the currently authenticated user.
    
    Usage in a router:
        @router.get("/protected")
        def protected_route(current_user = Depends(get_current_user)):
            ...
    """
    from app.models.user import User  # Avoid circular import
    
    token = credentials.credentials
    payload = decode_token(token)
    
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    return user


def require_admin(current_user=Depends(get_current_user)):
    """
    FastAPI dependency that requires the user to be an admin.
    
    Usage:
        @router.post("/admin-only")
        def admin_route(current_user = Depends(require_admin)):
            ...
    """
    from app.models.user import UserRole  # Avoid circular import
    
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user
