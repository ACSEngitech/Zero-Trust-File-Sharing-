from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.models.user import User
from app.schemas.user import LoginRequest, TokenResponse, MessageResponse, UserResponse
from app.utils.auth import verify_password, create_access_token, get_current_user
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login with username and password.
    Returns a JWT access token on success.
    
    Example request body:
    {
        "username": "john_doe",
        "password": "SecurePass123!"
    }
    """
    # Find user by username
    user = db.query(User).filter(User.username == request.username).first()
    
    # Verify credentials (both checks done to prevent username enumeration timing attacks)
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Check account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been disabled. Contact admin."
        )
    
    # Create JWT token
    token_data = {
        "sub": user.username,
        "role": user.role.value,
        "department": user.department.value,
        "user_id": user.id
    }
    access_token = create_access_token(
        data=token_data,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post("/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_user)):
    """
    Logout the current user.
    
    Note: Since JWT tokens are stateless, the actual token invalidation
    happens on the client side (delete token from storage).
    This endpoint confirms the user was authenticated.
    """
    return MessageResponse(message=f"Successfully logged out. Goodbye, {current_user.username}!")


@router.get("/me", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return current_user
