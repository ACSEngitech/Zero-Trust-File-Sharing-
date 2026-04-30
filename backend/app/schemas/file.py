from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.file import FolderVisibilityType


# ─── Folder Schemas ──────────────────────────────────────────────────────────

class FolderCreate(BaseModel):
    name: str
    description: Optional[str] = None
    department: Optional[str] = None
    parent_id: Optional[int] = None
    visibility_type: FolderVisibilityType = FolderVisibilityType.department
    shared_with_user_ids: Optional[List[int]] = []


class FolderShareCreate(BaseModel):
    user_ids: List[int]


class FolderShareResponse(BaseModel):
    id: int
    shared_with_user_id: int
    shared_with_username: Optional[str] = None
    shared_with_department: Optional[str] = None
    shared_at: datetime

    class Config:
        from_attributes = True


class FolderResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    department: str
    owner_id: int
    parent_id: Optional[int]
    visibility_type: str
    created_at: datetime
    user_shares: List[FolderShareResponse] = []

    class Config:
        from_attributes = True


# ─── File Schemas ─────────────────────────────────────────────────────────────

class FileShareCreate(BaseModel):
    """For sharing a file with an entire department."""
    department: str


class FileUserShareCreate(BaseModel):
    """For sharing a file with specific users."""
    user_ids: List[int]


class FileShareResponse(BaseModel):
    id: int
    file_id: int
    shared_with_department: str
    shared_at: datetime

    class Config:
        from_attributes = True


class FileUserShareResponse(BaseModel):
    id: int
    file_id: int
    shared_with_user_id: int
    shared_with_username: Optional[str] = None
    shared_at: datetime

    class Config:
        from_attributes = True


class FileResponse(BaseModel):
    """File metadata returned to clients."""
    id: int
    original_filename: str
    file_size: int
    file_extension: Optional[str]
    mime_type: Optional[str]
    uploaded_by_id: int
    department: str
    folder_id: Optional[int]
    description: Optional[str]
    upload_date: datetime
    uploader_name: Optional[str] = None
    shares: List[FileShareResponse] = []
    user_shares: List[FileUserShareResponse] = []

    class Config:
        from_attributes = True


class FileListResponse(BaseModel):
    total: int
    files: List[FileResponse]
