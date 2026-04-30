from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List
from app.database import get_db
from app.models.user import User, UserRole
from app.models.file import Folder, FolderShare, FolderVisibilityType
from app.schemas.file import FolderCreate, FolderResponse, FolderShareCreate
from app.utils.auth import get_current_user

router = APIRouter(prefix="/folders", tags=["Folders"])


@router.post("/", response_model=FolderResponse, status_code=201)
def create_folder(
    folder_data: FolderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new folder with the specified visibility type."""
    dept = folder_data.department or current_user.department.value

    existing = db.query(Folder).filter(
        Folder.name == folder_data.name,
        Folder.owner_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"You already have a folder named '{folder_data.name}'",
        )

    folder = Folder(
        name=folder_data.name,
        description=folder_data.description,
        department=dept,
        owner_id=current_user.id,
        parent_id=folder_data.parent_id,
        visibility_type=folder_data.visibility_type,
    )
    db.add(folder)
    db.flush()

    if (
        folder_data.visibility_type == FolderVisibilityType.specific_users
        and folder_data.shared_with_user_ids
    ):
        for user_id in folder_data.shared_with_user_ids:
            target = db.query(User).filter(User.id == user_id).first()
            if not target:
                db.rollback()
                raise HTTPException(status_code=404, detail=f"User {user_id} not found")
            db.add(FolderShare(folder_id=folder.id, shared_with_user_id=user_id))

    db.commit()
    db.refresh(folder)
    return folder


@router.get("/", response_model=List[FolderResponse])
def list_folders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List folders accessible to the current user based on visibility rules."""
    if current_user.role == UserRole.admin:
        return db.query(Folder).all()

    shared_ids = (
        db.query(FolderShare.folder_id)
        .filter(FolderShare.shared_with_user_id == current_user.id)
        .subquery()
    )

    return db.query(Folder).filter(
        or_(
            Folder.owner_id == current_user.id,
            and_(
                Folder.visibility_type == FolderVisibilityType.department,
                Folder.department == current_user.department.value,
            ),
            Folder.id.in_(shared_ids),
        )
    ).all()


@router.post("/{folder_id}/share", response_model=FolderResponse)
def share_folder_with_users(
    folder_id: int,
    body: FolderShareCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add specific users to a folder's share list (owner or admin only)."""
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    if folder.owner_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Only the folder owner can manage sharing")

    for user_id in body.user_ids:
        already_shared = db.query(FolderShare).filter(
            FolderShare.folder_id == folder_id,
            FolderShare.shared_with_user_id == user_id,
        ).first()
        if already_shared:
            continue
        target = db.query(User).filter(User.id == user_id).first()
        if not target:
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
        db.add(FolderShare(folder_id=folder_id, shared_with_user_id=user_id))

    if folder.visibility_type != FolderVisibilityType.specific_users:
        folder.visibility_type = FolderVisibilityType.specific_users

    db.commit()
    db.refresh(folder)
    return folder


@router.delete("/{folder_id}/share/{user_id}", response_model=FolderResponse)
def remove_folder_share(
    folder_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a specific user from a folder's share list (owner or admin only)."""
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    if folder.owner_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Only the folder owner can manage sharing")

    share = db.query(FolderShare).filter(
        FolderShare.folder_id == folder_id,
        FolderShare.shared_with_user_id == user_id,
    ).first()
    if share:
        db.delete(share)
        db.commit()
        db.refresh(folder)
    return folder


@router.delete("/{folder_id}", status_code=204)
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a folder. Only owner or admin can delete."""
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    if current_user.role != UserRole.admin and folder.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own folders")
    if folder.files:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete folder that contains files. Remove files first.",
        )
    db.delete(folder)
    db.commit()
