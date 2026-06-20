"""Symmetric encryption for receipt images (AES via Fernet).

Images are encrypted before they leave the server and only decrypted when an
authenticated owner views them, so the bytes stored in Supabase are unreadable
even if the bucket is public or the storage key leaks.
"""

import base64
import hashlib
from functools import lru_cache

from cryptography.fernet import Fernet

from app.core.config import settings


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    key = settings.receipt_encryption_key
    if key:
        return Fernet(key.encode())
    # No dedicated key set: derive a stable 32-byte key from jwt_secret so
    # encryption is on by default. (Rotating jwt_secret makes old images
    # undecryptable — set RECEIPT_ENCRYPTION_KEY to decouple them.)
    digest = hashlib.sha256(settings.jwt_secret.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt(data: bytes) -> bytes:
    return _fernet().encrypt(data)


def decrypt(token: bytes) -> bytes:
    return _fernet().decrypt(token)
