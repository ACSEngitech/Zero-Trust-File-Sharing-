from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User, UserRole
from app.models.file import File, Folder, FolderShare, FileUserShare
from app.schemas.user import UserCreate, UserUpdate, UserResponse, MessageResponse
from app.utils.auth import hash_password, get_current_user, require_admin


class UserShareInfo(BaseModel):
    """Minimal user info exposed for the sharing UI."""
    id: int
    username: str
    full_name: str | None
    department: str

    class Config:
        from_attributes = True

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Create a new user. Admin only.
    
    Example request:
    {
        "username": "jane_doe",
        "email": "jane@company.com",
        "password": "SecurePass123!",
        "full_name": "Jane Doe",
        "role": "user",
        "department": "engineering"
    }
    """
    # Check username uniqueness
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{user_data.username}' is already taken"
        )
    
    # Check email uniqueness
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{user_data.email}' is already registered"
        )
    
    # Create user with hashed password
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        department=user_data.department,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.get("/by-department/{department}", response_model=List[UserShareInfo])
def list_users_by_department(
    department: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return active users in a department. Available to any authenticated user for sharing."""
    return (
        db.query(User)
        .filter(User.department == department, User.is_active == True)
        .order_by(User.full_name)
        .all()
    )


@router.get("/", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get all users. Admin only."""
    return db.query(User).all()


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific user by ID.
    - Admins can view any user
    - Regular users can only view themselves
    """
    if current_user.role != UserRole.admin and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own profile"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Update a user's details. Admin only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Apply updates (only fields that were provided)
    update_dict = user_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", response_model=MessageResponse)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Delete a user. Admin only. Cannot delete yourself."""
    if admin.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.query(FolderShare).filter(FolderShare.shared_with_user_id == user_id).delete(synchronize_session=False)
    db.query(FileUserShare).filter(FileUserShare.shared_with_user_id == user_id).delete(synchronize_session=False)

    db.query(File).filter(File.uploaded_by_id == user_id).update(
        {"uploaded_by_id": admin.id}, synchronize_session=False
    )
    db.query(Folder).filter(Folder.owner_id == user_id).update(
        {"owner_id": admin.id}, synchronize_session=False
    )

    db.delete(user)
    db.commit()

    return MessageResponse(message=f"User '{user.username}' deleted successfully")
