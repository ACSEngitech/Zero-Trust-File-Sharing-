import os
import uuid
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.config import settings

_NONCE_SIZE = 12  # 96-bit nonce required by AES-GCM


def generate_file_key() -> tuple[bytes, str]:
    key = AESGCM.generate_key(bit_length=256)
    key_ref = f"{uuid.uuid4()}.key"
    return key, key_ref


def save_key(key: bytes, key_ref: str) -> None:
    from app.utils.minio_client import put_object
    put_object(settings.MINIO_KEYS_BUCKET, key_ref, key)


def load_key(key_ref: str) -> bytes:
    from app.utils.minio_client import get_object
    try:
        return get_object(settings.MINIO_KEYS_BUCKET, key_ref)
    except Exception:
        raise FileNotFoundError(f"Encryption key not found: {key_ref}")


def delete_key(key_ref: str) -> None:
    from app.utils.minio_client import remove_object
    remove_object(settings.MINIO_KEYS_BUCKET, key_ref)


def encrypt_file(file_data: bytes) -> tuple[bytes, str]:
    """
    Encrypt file data using AES-256-GCM (authenticated encryption).

    Returns:
        (encrypted_data, key_ref) where encrypted_data is nonce || ciphertext+tag
    """
    key, key_ref = generate_file_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(_NONCE_SIZE)
    ciphertext = aesgcm.encrypt(nonce, file_data, None)
    save_key(key, key_ref)
    return nonce + ciphertext, key_ref


def decrypt_file(encrypted_data: bytes, key_ref: str) -> bytes:
    """
    Decrypt file data using AES-256-GCM.

    Raises:
        FileNotFoundError if key is missing
        cryptography.exceptions.InvalidTag if data is corrupted or tampered
    """
    key = load_key(key_ref)
    aesgcm = AESGCM(key)
    nonce = encrypted_data[:_NONCE_SIZE]
    ciphertext = encrypted_data[_NONCE_SIZE:]
    return aesgcm.decrypt(nonce, ciphertext, None)
