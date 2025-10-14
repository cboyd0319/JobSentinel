"""
Encryption utilities for handling sensitive data.

Supports:
- Field-level encryption (Fernet)
- Database encryption at rest (SQLCipher for SQLite)
- Key management and rotation

References:
- Fernet: https://cryptography.io/en/latest/fernet/
- SQLCipher: https://www.zetetic.net/sqlcipher/
"""

import os
from pathlib import Path
from typing import Optional

from cryptography.fernet import Fernet


def generate_key() -> bytes:
    """Generate a new Fernet encryption key.
    
    Returns:
        32-byte URL-safe base64-encoded key
    """
    return Fernet.generate_key()


def encrypt_data(data: bytes, key: bytes) -> bytes:
    """Encrypt data using Fernet symmetric encryption.
    
    Args:
        data: Raw bytes to encrypt
        key: 32-byte Fernet key
        
    Returns:
        Encrypted bytes with timestamp and signature
    """
    f = Fernet(key)
    return f.encrypt(data)


def decrypt_data(token: bytes, key: bytes) -> bytes:
    """Decrypt Fernet-encrypted data.
    
    Args:
        token: Encrypted bytes from encrypt_data()
        key: Same 32-byte key used for encryption
        
    Returns:
        Original decrypted bytes
        
    Raises:
        cryptography.fernet.InvalidToken: If key wrong or data tampered
    """
    f = Fernet(key)
    return f.decrypt(token)


def encrypt_string(text: str, key: bytes) -> str:
    """Encrypt a string and return base64-encoded result.
    
    Args:
        text: String to encrypt
        key: Fernet encryption key
        
    Returns:
        Base64-encoded encrypted string
    """
    encrypted = encrypt_data(text.encode('utf-8'), key)
    return encrypted.decode('utf-8')


def decrypt_string(encrypted_text: str, key: bytes) -> str:
    """Decrypt a base64-encoded encrypted string.
    
    Args:
        encrypted_text: Base64-encoded encrypted string
        key: Same Fernet key used for encryption
        
    Returns:
        Original decrypted string
    """
    decrypted = decrypt_data(encrypted_text.encode('utf-8'), key)
    return decrypted.decode('utf-8')


# Database encryption support
class DatabaseEncryption:
    """
    Database encryption at rest.
    
    For SQLite: Uses SQLCipher extension for transparent database encryption.
    For PostgreSQL: Uses pgcrypto extension for column-level encryption.
    
    Note: SQLCipher requires separate installation and is not included by default.
    Install with: pip install pysqlcipher3
    """
    
    @staticmethod
    def is_sqlcipher_available() -> bool:
        """Check if SQLCipher is available."""
        try:
            import pysqlcipher3  # type: ignore  # noqa: F401
            return True
        except ImportError:
            return False
    
    @staticmethod
    def get_encryption_key() -> Optional[str]:
        """Get database encryption key from environment.
        
        Returns:
            Encryption key if set, None otherwise
        """
        return os.getenv('DATABASE_ENCRYPTION_KEY')
    
    @staticmethod
    def generate_database_key() -> str:
        """Generate a new database encryption key.
        
        Returns:
            Secure random key suitable for database encryption
        """
        # Generate 32 bytes of random data, hex-encoded
        return os.urandom(32).hex()
    
    @staticmethod
    def save_key_securely(key: str, key_path: Path) -> None:
        """Save encryption key to file with restricted permissions.
        
        Args:
            key: Encryption key to save
            key_path: Path to save key file
        """
        key_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write key with restricted permissions (owner read/write only)
        key_path.write_text(key, encoding='utf-8')
        
        # Set file permissions to 0600 (owner read/write only)
        try:
            os.chmod(key_path, 0o600)
        except Exception:
            # Windows doesn't support chmod
            pass
    
    @staticmethod
    def load_key_securely(key_path: Path) -> Optional[str]:
        """Load encryption key from file.
        
        Args:
            key_path: Path to key file
            
        Returns:
            Encryption key or None if file doesn't exist
        """
        if not key_path.exists():
            return None
        
        return key_path.read_text(encoding='utf-8').strip()
    
    @staticmethod
    def get_sqlcipher_url(base_url: str, key: str) -> str:
        """Convert SQLite URL to SQLCipher URL with encryption key.
        
        Args:
            base_url: Standard SQLite URL
            key: Encryption key
            
        Returns:
            SQLCipher connection URL with key parameter
        """
        if not base_url.startswith('sqlite'):
            raise ValueError("SQLCipher only works with SQLite databases")
        
        # Convert sqlite:/// to sqlcipher:///
        url = base_url.replace('sqlite://', 'sqlcipher://')
        
        # Add encryption key parameter
        separator = '&' if '?' in url else '?'
        return f"{url}{separator}key={key}"


# Key rotation support
class KeyRotation:
    """Support for rotating encryption keys."""
    
    @staticmethod
    def rotate_field_encryption(
        old_key: bytes, 
        new_key: bytes, 
        encrypted_data: bytes
    ) -> bytes:
        """Rotate encryption key for field-level encrypted data.
        
        Args:
            old_key: Current encryption key
            new_key: New encryption key
            encrypted_data: Data encrypted with old_key
            
        Returns:
            Data re-encrypted with new_key
        """
        # Decrypt with old key
        decrypted = decrypt_data(encrypted_data, old_key)
        
        # Re-encrypt with new key
        return encrypt_data(decrypted, new_key)
