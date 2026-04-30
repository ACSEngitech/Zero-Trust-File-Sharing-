"""
One-time migration: adds visibility_type column to folders table
and creates the folder_shares table.

Run once from the backend directory:
    python migrate_folder_visibility.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.database import engine, Base
from app.models import user, file  # noqa: registers all models with Base


def run():
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'folders' AND column_name = 'visibility_type'"
        ))
        if not result.fetchone():
            print("Adding visibility_type column to folders...")
            conn.execute(text(
                "ALTER TABLE folders "
                "ADD COLUMN visibility_type VARCHAR(20) NOT NULL DEFAULT 'department' "
                "CHECK (visibility_type IN ('personal', 'department', 'specific_users'))"
            ))
            conn.commit()
            print("  Done.")
        else:
            print("visibility_type column already exists — skipping.")

    # Create folder_shares and any other new tables
    print("Creating new tables (folder_shares) if they do not exist...")
    Base.metadata.create_all(bind=engine)
    print("  Done.")
    print("\nMigration complete.")


if __name__ == "__main__":
    run()
