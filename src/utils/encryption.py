"""
Encryption utilities for handling sensitive data.
"""

from cryptography.fernet import Fernet


def generate_key() -> bytes:
    """Generates a new encryption key."""
    return Fernet.generate_key()


def encrypt_data(data: bytes, key: bytes) -> bytes:
    """Encrypts data using the provided key."""
    f = Fernet(key)
    return f.encrypt(data)


def decrypt_data(token: bytes, key: bytes) -> bytes:
    """Decrypts data using the provided key."""
    f = Fernet(key)
    return f.decrypt(token)
