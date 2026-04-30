import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, Form, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User, UserRole
from app.models.file import File, FileShare, FileUserShare, FileStatus
from app.schemas.file import FileResponse, FileListResponse, FileShareCreate, FileUserShareCreate
from app.utils.auth import get_current_user
from app.utils.encryption import encrypt_file, decrypt_file, delete_key
from app.utils.file_validator import validate_file, sanitize_filename
from app.utils.minio_client import put_object, get_object, remove_object
from app.config import settings

router = APIRouter(prefix="/files", tags=["Files"])


@router.post("/upload", response_model=FileResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    description: Optional[str] = Form(None),
    folder_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload and encrypt a file.

    Process:
    1. Validate file type and size
    2. Read file bytes
    3. Encrypt using AES-256-GCM
    4. Store encrypted file in MinIO
    5. Save metadata to database
    """
    file_content = await file.read()
    file_size = len(file_content)

    ext = validate_file(file.filename, file_size, file.content_type)
    clean_filename = sanitize_filename(file.filename)

    encrypted_data, key_ref = encrypt_file(file_content)

    stored_filename = f"{uuid.uuid4()}.enc"
    put_object(settings.MINIO_FILES_BUCKET, stored_filename, encrypted_data)

    db_file = File(
        original_filename=clean_filename,
        stored_filename=stored_filename,
        file_size=file_size,
        file_extension=ext,
        mime_type=file.content_type,
        encryption_key_ref=key_ref,
        uploaded_by_id=current_user.id,
        department=current_user.department.value,
        folder_id=folder_id,
        description=description,
        status=FileStatus.active
    )

    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    response = FileResponse.model_validate(db_file)
    response.uploader_name = current_user.full_name or current_user.username
    return response


@router.get("/", response_model=FileListResponse)
def list_files(
    department: Optional[str] = None,
    folder_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List files the current user is authorized to see.

    Access rules:
    - Admins see all files
    - Regular users see: their own files + files in their department + files shared with their dept
    """
    query = db.query(File).filter(File.status == FileStatus.active)

    if current_user.role != UserRole.admin:
        user_dept = current_user.department.value

        dept_shared_ids = db.query(FileShare.file_id).filter(
            FileShare.shared_with_department == user_dept
        ).subquery()

        user_shared_ids = db.query(FileUserShare.file_id).filter(
            FileUserShare.shared_with_user_id == current_user.id
        ).subquery()

        from sqlalchemy import or_
        query = query.filter(
            or_(
                File.uploaded_by_id == current_user.id,
                File.department == user_dept,
                File.id.in_(dept_shared_ids),
                File.id.in_(user_shared_ids),
            )
        )

    if department:
        query = query.filter(File.department == department)
    if folder_id is not None:
        query = query.filter(File.folder_id == folder_id)

    files = query.order_by(File.upload_date.desc()).all()

    result = []
    for f in files:
        file_resp = FileResponse.model_validate(f)
        if f.uploader:
            file_resp.uploader_name = f.uploader.full_name or f.uploader.username
        result.append(file_resp)

    return FileListResponse(total=len(result), files=result)


@router.get("/download/{file_id}")
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download and decrypt a file.

    Security check: User must be owner, same department, admin,
    or the file must be shared with user's department.
    """
    db_file = db.query(File).filter(
        File.id == file_id,
        File.status == FileStatus.active
    ).first()

    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    if not _has_file_access(current_user, db_file, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this file"
        )

    try:
        encrypted_data = get_object(settings.MINIO_FILES_BUCKET, db_file.stored_filename)
    except Exception:
        raise HTTPException(status_code=404, detail="File data not found on storage")

    try:
        decrypted_data = decrypt_file(encrypted_data, db_file.encryption_key_ref)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt file"
        )

    return Response(
        content=decrypted_data,
        media_type=db_file.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{db_file.original_filename}"',
            "Content-Length": str(len(decrypted_data))
        }
    )


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a file.
    - Admins can delete any file
    - Regular users can only delete their own files
    """
    db_file = db.query(File).filter(
        File.id == file_id,
        File.status == FileStatus.active
    ).first()

    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    if current_user.role != UserRole.admin and db_file.uploaded_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own files"
        )

    remove_object(settings.MINIO_FILES_BUCKET, db_file.stored_filename)
    delete_key(db_file.encryption_key_ref)

    db_file.status = FileStatus.deleted
    db.commit()


@router.post("/{file_id}/share")
def share_file(
    file_id: int,
    share_data: FileShareCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Share a file with a department."""
    db_file = db.query(File).filter(
        File.id == file_id,
        File.status == FileStatus.active
    ).first()

    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    if current_user.role != UserRole.admin and db_file.uploaded_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the file owner can share it")

    existing = db.query(FileShare).filter(
        FileShare.file_id == file_id,
        FileShare.shared_with_department == share_data.department
    ).first()

    if existing:
        return {"message": f"File already shared with {share_data.department}"}

    share = FileShare(
        file_id=file_id,
        shared_with_department=share_data.department
    )
    db.add(share)
    db.commit()

    return {"message": f"File shared with department: {share_data.department}"}


@router.post("/{file_id}/share/users")
def share_file_with_users(
    file_id: int,
    share_data: FileUserShareCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Share a file with specific users by their IDs."""
    db_file = db.query(File).filter(
        File.id == file_id,
        File.status == FileStatus.active
    ).first()

    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")

    if current_user.role != UserRole.admin and db_file.uploaded_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the file owner can share it")

    if not share_data.user_ids:
        raise HTTPException(status_code=400, detail="No users specified")

    added = []
    for user_id in share_data.user_ids:
        existing = db.query(FileUserShare).filter(
            FileUserShare.file_id == file_id,
            FileUserShare.shared_with_user_id == user_id
        ).first()
        if not existing:
            db.add(FileUserShare(file_id=file_id, shared_with_user_id=user_id))
            added.append(user_id)

    db.commit()
    return {"message": f"File shared with {len(added)} user(s)", "user_ids": added}


def _has_file_access(user: User, file: File, db: Session) -> bool:
    """Check if a user is authorized to access a file."""
    if user.role == UserRole.admin:
        return True
    if file.uploaded_by_id == user.id:
        return True
    if file.department == user.department.value:
        return True

    dept_share = db.query(FileShare).filter(
        FileShare.file_id == file.id,
        FileShare.shared_with_department == user.department.value
    ).first()
    if dept_share:
        return True

    user_share = db.query(FileUserShare).filter(
        FileUserShare.file_id == file.id,
        FileUserShare.shared_with_user_id == user.id
    ).first()
    return user_share is not None
