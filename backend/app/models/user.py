from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class Department(str, enum.Enum):
    engineering = "engineering"
    marketing = "marketing"
    finance = "finance"
    hr = "hr"
    operations = "operations"
    sales = "sales"
    it = "it"
    legal = "legal"
    general = "general"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.user, nullable=False)
    department = Column(Enum(Department), default=Department.general, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    uploaded_files = relationship("File", back_populates="uploader", foreign_keys="File.uploaded_by_id")
    folders = relationship("Folder", back_populates="owner")
