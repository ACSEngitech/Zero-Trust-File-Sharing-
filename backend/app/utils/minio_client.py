import io
from minio import Minio
from minio.error import S3Error
from app.config import settings

_client: Minio | None = None


def get_minio_client() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
    return _client


def ensure_buckets() -> None:
    client = get_minio_client()
    for bucket in (settings.MINIO_FILES_BUCKET, settings.MINIO_KEYS_BUCKET):
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)


def put_object(bucket: str, name: str, data: bytes) -> None:
    client = get_minio_client()
    client.put_object(bucket, name, io.BytesIO(data), length=len(data))


def get_object(bucket: str, name: str) -> bytes:
    client = get_minio_client()
    response = client.get_object(bucket, name)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def remove_object(bucket: str, name: str) -> None:
    client = get_minio_client()
    try:
        client.remove_object(bucket, name)
    except S3Error:
        pass
