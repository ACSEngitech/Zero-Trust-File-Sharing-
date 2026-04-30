from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, BigInteger, Text, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class FileStatus(str, enum.Enum):
    active = "active"
    deleted = "deleted"


class FolderVisibilityType(str, enum.Enum):
    personal = "personal"
    department = "department"
    specific_users = "specific_users"


class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)

    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    file_extension = Column(String(20), nullable=True)
    mime_type = Column(String(100), nullable=True)

    encryption_key_ref = Column(String(255), nullable=False)

    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    department = Column(String(50), nullable=False)
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)

    status = Column(Enum(FileStatus), default=FileStatus.active)
    description = Column(Text, nullable=True)
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    uploader = relationship("User", back_populates="uploaded_files", foreign_keys=[uploaded_by_id])
    folder = relationship("Folder", back_populates="files")
    shares = relationship("FileShare", back_populates="file")
    user_shares = relationship("FileUserShare", back_populates="file")


class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    department = Column(String(50), nullable=False)
    parent_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    visibility_type = Column(
        Enum(FolderVisibilityType),
        default=FolderVisibilityType.department,
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="folders")
    files = relationship("File", back_populates="folder")
    subfolders = relationship("Folder", backref="parent", remote_side=[id])
    user_shares = relationship(
        "FolderShare", back_populates="folder", cascade="all, delete-orphan"
    )


class FileShare(Base):
    """Tracks which departments a file is shared with."""
    __tablename__ = "file_shares"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("files.id"), nullable=False)
    shared_with_department = Column(String(50), nullable=False)
    shared_at = Column(DateTime(timezone=True), server_default=func.now())

    file = relationship("File", back_populates="shares")


class FileUserShare(Base):
    """Tracks which specific users a file is shared with."""
    __tablename__ = "file_user_shares"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("files.id"), nullable=False)
    shared_with_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shared_at = Column(DateTime(timezone=True), server_default=func.now())

    file = relationship("File", back_populates="user_shares")
    shared_with = relationship("User", foreign_keys=[shared_with_user_id])


class FolderShare(Base):
    """Tracks which specific users a folder is shared with."""
    __tablename__ = "folder_shares"

    id = Column(Integer, primary_key=True, index=True)
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=False)
    shared_with_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shared_at = Column(DateTime(timezone=True), server_default=func.now())

    folder = relationship("Folder", back_populates="user_shares")
    shared_with = relationship("User", foreign_keys=[shared_with_user_id])

    @property
    def shared_with_username(self):
        return self.shared_with.username if self.shared_with else None

    @property
    def shared_with_department(self):
        if self.shared_with and self.shared_with.department:
            return self.shared_with.department.value
        return None
