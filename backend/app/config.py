from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/zerotrust_db"
    SECRET_KEY: str = "change-this-secret-key-in-production-must-be-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 50

    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_FILES_BUCKET: str = "encrypted-files"
    MINIO_KEYS_BUCKET: str = "encryption-keys"
    MINIO_SECURE: bool = False

    class Config:
        env_file = ".env"


settings = Settings()
