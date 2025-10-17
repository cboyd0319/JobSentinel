"""
Comprehensive tests for utils/encryption.py module.

Tests cover:
- Key generation
- Data encryption/decryption
- String encryption/decryption
- Database encryption support
- Key rotation
- Edge cases and error handling
"""

import os
from pathlib import Path
from unittest.mock import patch

import pytest
from cryptography.fernet import Fernet, InvalidToken

from utils.encryption import (
    DatabaseEncryption,
    KeyRotation,
    decrypt_data,
    decrypt_string,
    encrypt_data,
    encrypt_string,
    generate_key,
)


class TestGenerateKey:
    """Tests for generate_key function."""

    def test_generate_key_returns_bytes(self):
        """generate_key returns bytes."""
        key = generate_key()
        assert isinstance(key, bytes)

    def test_generate_key_returns_valid_fernet_key(self):
        """generate_key returns a valid Fernet key."""
        key = generate_key()
        # Should be able to create Fernet instance
        f = Fernet(key)
        assert f is not None

    def test_generate_key_produces_unique_keys(self):
        """generate_key produces unique keys on each call."""
        key1 = generate_key()
        key2 = generate_key()
        assert key1 != key2

    def test_generate_key_length(self):
        """generate_key returns 44-byte URL-safe base64 encoded key."""
        key = generate_key()
        # Fernet keys are 44 bytes when base64 encoded
        assert len(key) == 44


class TestEncryptData:
    """Tests for encrypt_data function."""

    @pytest.fixture
    def encryption_key(self):
        """Provide a consistent encryption key for tests."""
        return generate_key()

    def test_encrypt_data_returns_bytes(self, encryption_key):
        """encrypt_data returns bytes."""
        data = b"test data"
        encrypted = encrypt_data(data, encryption_key)
        assert isinstance(encrypted, bytes)

    def test_encrypt_data_produces_different_output(self, encryption_key):
        """encrypt_data produces different output than input."""
        data = b"test data"
        encrypted = encrypt_data(data, encryption_key)
        assert encrypted != data

    def test_encrypt_data_same_input_different_output(self, encryption_key):
        """encrypt_data produces different output for same input (includes timestamp)."""
        data = b"test data"
        encrypted1 = encrypt_data(data, encryption_key)
        encrypted2 = encrypt_data(data, encryption_key)
        # Fernet includes timestamp, so same plaintext produces different ciphertext
        assert encrypted1 != encrypted2

    def test_encrypt_data_empty_input(self, encryption_key):
        """encrypt_data handles empty bytes."""
        data = b""
        encrypted = encrypt_data(data, encryption_key)
        assert isinstance(encrypted, bytes)

    def test_encrypt_data_large_input(self, encryption_key):
        """encrypt_data handles large data."""
        data = b"x" * 1_000_000
        encrypted = encrypt_data(data, encryption_key)
        assert isinstance(encrypted, bytes)

    def test_encrypt_data_invalid_key_raises(self):
        """encrypt_data raises with invalid key."""
        data = b"test data"
        with pytest.raises(Exception):  # ValueError or similar
            encrypt_data(data, b"invalid_key")


class TestDecryptData:
    """Tests for decrypt_data function."""

    @pytest.fixture
    def encryption_key(self):
        """Provide a consistent encryption key for tests."""
        return generate_key()

    def test_decrypt_data_returns_original(self, encryption_key):
        """decrypt_data returns original data."""
        original = b"test data"
        encrypted = encrypt_data(original, encryption_key)
        decrypted = decrypt_data(encrypted, encryption_key)
        assert decrypted == original

    def test_decrypt_data_empty_input(self, encryption_key):
        """decrypt_data handles empty bytes."""
        original = b""
        encrypted = encrypt_data(original, encryption_key)
        decrypted = decrypt_data(encrypted, encryption_key)
        assert decrypted == original

    def test_decrypt_data_large_input(self, encryption_key):
        """decrypt_data handles large data."""
        original = b"x" * 1_000_000
        encrypted = encrypt_data(original, encryption_key)
        decrypted = decrypt_data(encrypted, encryption_key)
        assert decrypted == original

    def test_decrypt_data_wrong_key_raises(self, encryption_key):
        """decrypt_data raises InvalidToken with wrong key."""
        original = b"test data"
        encrypted = encrypt_data(original, encryption_key)
        wrong_key = generate_key()

        with pytest.raises(InvalidToken):
            decrypt_data(encrypted, wrong_key)

    def test_decrypt_data_tampered_data_raises(self, encryption_key):
        """decrypt_data raises InvalidToken with tampered data."""
        original = b"test data"
        encrypted = encrypt_data(original, encryption_key)
        # Tamper with encrypted data
        tampered = encrypted[:-1] + b"X"

        with pytest.raises(InvalidToken):
            decrypt_data(tampered, encryption_key)

    def test_decrypt_data_invalid_token_raises(self, encryption_key):
        """decrypt_data raises InvalidToken with invalid data."""
        with pytest.raises(InvalidToken):
            decrypt_data(b"not encrypted data", encryption_key)


class TestEncryptString:
    """Tests for encrypt_string function."""

    @pytest.fixture
    def encryption_key(self):
        """Provide a consistent encryption key for tests."""
        return generate_key()

    def test_encrypt_string_returns_string(self, encryption_key):
        """encrypt_string returns string."""
        text = "test string"
        encrypted = encrypt_string(text, encryption_key)
        assert isinstance(encrypted, str)

    def test_encrypt_string_produces_different_output(self, encryption_key):
        """encrypt_string produces different output than input."""
        text = "test string"
        encrypted = encrypt_string(text, encryption_key)
        assert encrypted != text

    def test_encrypt_string_empty_input(self, encryption_key):
        """encrypt_string handles empty string."""
        text = ""
        encrypted = encrypt_string(text, encryption_key)
        assert isinstance(encrypted, str)

    @pytest.mark.parametrize(
        "text",
        [
            "Hello, World!",
            "Unicode: 你好世界",
            "Emoji: 🔐🔑",
            "Special: <>&\"'",
            "Newlines:\n\r\n",
            "Tabs:\t\t",
        ],
        ids=["simple", "unicode", "emoji", "special_chars", "newlines", "tabs"],
    )
    def test_encrypt_string_various_inputs(self, encryption_key, text):
        """encrypt_string handles various text inputs."""
        encrypted = encrypt_string(text, encryption_key)
        assert isinstance(encrypted, str)


class TestDecryptString:
    """Tests for decrypt_string function."""

    @pytest.fixture
    def encryption_key(self):
        """Provide a consistent encryption key for tests."""
        return generate_key()

    def test_decrypt_string_returns_original(self, encryption_key):
        """decrypt_string returns original string."""
        original = "test string"
        encrypted = encrypt_string(original, encryption_key)
        decrypted = decrypt_string(encrypted, encryption_key)
        assert decrypted == original

    def test_decrypt_string_empty_input(self, encryption_key):
        """decrypt_string handles empty string."""
        original = ""
        encrypted = encrypt_string(original, encryption_key)
        decrypted = decrypt_string(encrypted, encryption_key)
        assert decrypted == original

    @pytest.mark.parametrize(
        "text",
        [
            "Hello, World!",
            "Unicode: 你好世界",
            "Emoji: 🔐🔑",
            "Special: <>&\"'",
            "Newlines:\n\r\n",
            "Tabs:\t\t",
            "Long: " + "x" * 10000,
        ],
        ids=["simple", "unicode", "emoji", "special_chars", "newlines", "tabs", "long"],
    )
    def test_decrypt_string_various_inputs(self, encryption_key, text):
        """decrypt_string handles various text inputs."""
        encrypted = encrypt_string(text, encryption_key)
        decrypted = decrypt_string(encrypted, encryption_key)
        assert decrypted == text

    def test_decrypt_string_wrong_key_raises(self, encryption_key):
        """decrypt_string raises InvalidToken with wrong key."""
        original = "test string"
        encrypted = encrypt_string(original, encryption_key)
        wrong_key = generate_key()

        with pytest.raises(InvalidToken):
            decrypt_string(encrypted, wrong_key)


class TestDatabaseEncryption:
    """Tests for DatabaseEncryption class."""

    def test_is_sqlcipher_available_returns_bool(self):
        """is_sqlcipher_available returns boolean."""
        result = DatabaseEncryption.is_sqlcipher_available()
        assert isinstance(result, bool)

    def test_is_sqlcipher_available_when_not_installed(self):
        """is_sqlcipher_available returns False when not installed."""
        with patch("builtins.__import__", side_effect=ImportError):
            result = DatabaseEncryption.is_sqlcipher_available()
            assert result is False

    def test_get_encryption_key_returns_env_value(self, monkeypatch):
        """get_encryption_key returns environment variable value."""
        monkeypatch.setenv("DATABASE_ENCRYPTION_KEY", "test_key_123")
        key = DatabaseEncryption.get_encryption_key()
        assert key == "test_key_123"

    def test_get_encryption_key_returns_none_when_not_set(self, monkeypatch):
        """get_encryption_key returns None when env var not set."""
        monkeypatch.delenv("DATABASE_ENCRYPTION_KEY", raising=False)
        key = DatabaseEncryption.get_encryption_key()
        assert key is None

    def test_generate_database_key_returns_string(self):
        """generate_database_key returns string."""
        key = DatabaseEncryption.generate_database_key()
        assert isinstance(key, str)

    def test_generate_database_key_returns_hex(self):
        """generate_database_key returns hex string."""
        key = DatabaseEncryption.generate_database_key()
        # Should be 32 bytes hex encoded = 64 hex characters
        assert len(key) == 64
        # Should be valid hex
        int(key, 16)

    def test_generate_database_key_produces_unique_keys(self):
        """generate_database_key produces unique keys."""
        key1 = DatabaseEncryption.generate_database_key()
        key2 = DatabaseEncryption.generate_database_key()
        assert key1 != key2

    def test_save_key_securely_creates_file(self, tmp_path):
        """save_key_securely creates file with key."""
        key = "test_encryption_key"
        key_path = tmp_path / "keys" / "db.key"

        DatabaseEncryption.save_key_securely(key, key_path)

        assert key_path.exists()
        assert key_path.read_text(encoding="utf-8") == key

    def test_save_key_securely_creates_parent_dirs(self, tmp_path):
        """save_key_securely creates parent directories."""
        key = "test_key"
        key_path = tmp_path / "a" / "b" / "c" / "key.txt"

        DatabaseEncryption.save_key_securely(key, key_path)

        assert key_path.exists()

    @pytest.mark.skipif(os.name == "nt", reason="Unix permissions not supported on Windows")
    def test_save_key_securely_sets_permissions(self, tmp_path):
        """save_key_securely sets restrictive permissions on Unix."""
        key = "test_key"
        key_path = tmp_path / "key.txt"

        DatabaseEncryption.save_key_securely(key, key_path)

        # Check file permissions (0600)
        stat_info = os.stat(key_path)
        permissions = stat_info.st_mode & 0o777
        assert permissions == 0o600

    def test_load_key_securely_returns_key(self, tmp_path):
        """load_key_securely returns saved key."""
        key = "test_encryption_key"
        key_path = tmp_path / "key.txt"

        DatabaseEncryption.save_key_securely(key, key_path)
        loaded = DatabaseEncryption.load_key_securely(key_path)

        assert loaded == key

    def test_load_key_securely_strips_whitespace(self, tmp_path):
        """load_key_securely strips whitespace."""
        key = "test_key"
        key_path = tmp_path / "key.txt"
        key_path.write_text(f"  {key}\n\n  ", encoding="utf-8")

        loaded = DatabaseEncryption.load_key_securely(key_path)

        assert loaded == key

    def test_load_key_securely_returns_none_when_missing(self, tmp_path):
        """load_key_securely returns None for missing file."""
        key_path = tmp_path / "nonexistent.txt"

        loaded = DatabaseEncryption.load_key_securely(key_path)

        assert loaded is None

    def test_get_sqlcipher_url_converts_sqlite(self):
        """get_sqlcipher_url converts SQLite URL to SQLCipher."""
        base_url = "sqlite:///path/to/db.db"
        key = "encryption_key_123"

        result = DatabaseEncryption.get_sqlcipher_url(base_url, key)

        assert result.startswith("sqlcipher://")
        assert "key=encryption_key_123" in result

    def test_get_sqlcipher_url_adds_key_parameter(self):
        """get_sqlcipher_url adds key parameter correctly."""
        base_url = "sqlite:///db.db"
        key = "my_key"

        result = DatabaseEncryption.get_sqlcipher_url(base_url, key)

        assert "?key=my_key" in result

    def test_get_sqlcipher_url_with_existing_params(self):
        """get_sqlcipher_url appends key when params exist."""
        base_url = "sqlite:///db.db?timeout=10"
        key = "my_key"

        result = DatabaseEncryption.get_sqlcipher_url(base_url, key)

        assert "&key=my_key" in result

    def test_get_sqlcipher_url_raises_for_non_sqlite(self):
        """get_sqlcipher_url raises ValueError for non-SQLite URLs."""
        base_url = "postgresql://localhost/mydb"
        key = "my_key"

        with pytest.raises(ValueError, match="SQLCipher only works with SQLite"):
            DatabaseEncryption.get_sqlcipher_url(base_url, key)


class TestKeyRotation:
    """Tests for KeyRotation class."""

    def test_rotate_field_encryption_returns_bytes(self):
        """rotate_field_encryption returns bytes."""
        old_key = generate_key()
        new_key = generate_key()
        data = b"sensitive data"
        encrypted = encrypt_data(data, old_key)

        rotated = KeyRotation.rotate_field_encryption(old_key, new_key, encrypted)

        assert isinstance(rotated, bytes)

    def test_rotate_field_encryption_decrypts_with_new_key(self):
        """rotate_field_encryption produces data decryptable with new key."""
        old_key = generate_key()
        new_key = generate_key()
        original = b"sensitive data"
        encrypted = encrypt_data(original, old_key)

        rotated = KeyRotation.rotate_field_encryption(old_key, new_key, encrypted)
        decrypted = decrypt_data(rotated, new_key)

        assert decrypted == original

    def test_rotate_field_encryption_not_decryptable_with_old_key(self):
        """rotate_field_encryption produces data not decryptable with old key."""
        old_key = generate_key()
        new_key = generate_key()
        data = b"sensitive data"
        encrypted = encrypt_data(data, old_key)

        rotated = KeyRotation.rotate_field_encryption(old_key, new_key, encrypted)

        # Should not decrypt with old key
        with pytest.raises(InvalidToken):
            decrypt_data(rotated, old_key)

    def test_rotate_field_encryption_preserves_data(self):
        """rotate_field_encryption preserves original data content."""
        old_key = generate_key()
        new_key = generate_key()
        original = b"test data with unicode: \xc3\xa9"
        encrypted = encrypt_data(original, old_key)

        rotated = KeyRotation.rotate_field_encryption(old_key, new_key, encrypted)
        decrypted = decrypt_data(rotated, new_key)

        assert decrypted == original

    def test_rotate_field_encryption_empty_data(self):
        """rotate_field_encryption handles empty data."""
        old_key = generate_key()
        new_key = generate_key()
        original = b""
        encrypted = encrypt_data(original, old_key)

        rotated = KeyRotation.rotate_field_encryption(old_key, new_key, encrypted)
        decrypted = decrypt_data(rotated, new_key)

        assert decrypted == original

    def test_rotate_field_encryption_large_data(self):
        """rotate_field_encryption handles large data."""
        old_key = generate_key()
        new_key = generate_key()
        original = b"x" * 100_000
        encrypted = encrypt_data(original, old_key)

        rotated = KeyRotation.rotate_field_encryption(old_key, new_key, encrypted)
        decrypted = decrypt_data(rotated, new_key)

        assert decrypted == original

    def test_rotate_field_encryption_wrong_old_key_raises(self):
        """rotate_field_encryption raises with wrong old key."""
        old_key = generate_key()
        new_key = generate_key()
        wrong_key = generate_key()
        data = b"test data"
        encrypted = encrypt_data(data, old_key)

        with pytest.raises(InvalidToken):
            KeyRotation.rotate_field_encryption(wrong_key, new_key, encrypted)


class TestEncryptionIntegration:
    """Integration tests for encryption workflows."""

    def test_full_encryption_workflow(self):
        """Complete encryption workflow works end-to-end."""
        # Generate key
        key = generate_key()

        # Encrypt string
        original = "Sensitive user data 🔐"
        encrypted = encrypt_string(original, key)

        # Decrypt string
        decrypted = decrypt_string(encrypted, key)

        assert decrypted == original

    def test_database_key_management_workflow(self, tmp_path):
        """Database key management workflow works end-to-end."""
        # Generate database key
        key = DatabaseEncryption.generate_database_key()

        # Save key
        key_path = tmp_path / "db.key"
        DatabaseEncryption.save_key_securely(key, key_path)

        # Load key
        loaded_key = DatabaseEncryption.load_key_securely(key_path)

        assert loaded_key == key

    def test_key_rotation_workflow(self):
        """Key rotation workflow preserves data."""
        # Setup
        old_key = generate_key()
        new_key = generate_key()
        sensitive_data = b"User password hash"

        # Encrypt with old key
        encrypted_old = encrypt_data(sensitive_data, old_key)

        # Rotate to new key
        encrypted_new = KeyRotation.rotate_field_encryption(old_key, new_key, encrypted_old)

        # Verify decryption with new key
        decrypted = decrypt_data(encrypted_new, new_key)

        assert decrypted == sensitive_data

    def test_multiple_key_rotation_workflow(self):
        """Multiple key rotations preserve data."""
        # Generate keys
        key1 = generate_key()
        key2 = generate_key()
        key3 = generate_key()

        original = b"Original sensitive data"

        # Encrypt with key1
        encrypted1 = encrypt_data(original, key1)

        # Rotate to key2
        encrypted2 = KeyRotation.rotate_field_encryption(key1, key2, encrypted1)

        # Rotate to key3
        encrypted3 = KeyRotation.rotate_field_encryption(key2, key3, encrypted2)

        # Verify final decryption
        decrypted = decrypt_data(encrypted3, key3)

        assert decrypted == original
