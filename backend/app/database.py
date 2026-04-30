from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,       # Automatically reconnect if connection drops
    pool_size=10,             # Number of connections in pool
    max_overflow=20           # Extra connections allowed beyond pool_size
)

# Session factory - used to create database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all SQLAlchemy models
Base = declarative_base()


def get_db():
    """
    Dependency function that provides a database session.
    Usage: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables and apply any pending schema migrations."""
    from app.models import user, file  # noqa: F401 - import triggers table registration
    from sqlalchemy import text

    Base.metadata.create_all(bind=engine)

    # Add visibility_type column to folders if it doesn't exist yet
    with engine.connect() as conn:
        row = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'folders' AND column_name = 'visibility_type'"
        )).fetchone()
        if not row:
            conn.execute(text(
                "ALTER TABLE folders "
                "ADD COLUMN visibility_type VARCHAR(20) NOT NULL DEFAULT 'department' "
                "CHECK (visibility_type IN ('personal', 'department', 'specific_users'))"
            ))
            conn.commit()
            print("✅ Migration applied: folders.visibility_type column added")
