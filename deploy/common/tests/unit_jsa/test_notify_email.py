"""Comprehensive tests for notify_email module.

Tests email notification functionality with SMTP handling.
"""

from __future__ import annotations

import os
from unittest.mock import MagicMock, Mock, patch

import pytest

from jsa.notify_email import EmailNotifier


class TestEmailNotifierConfiguration:
    """Test EmailNotifier configuration and initialization."""

    def test_initialization_with_all_params(self):
        """Test EmailNotifier initialization with all parameters."""
        # Act
        notifier = EmailNotifier(
            smtp_host="smtp.example.com",
            smtp_port=587,
            smtp_user="user@example.com",
            smtp_password="password",
            from_email="from@example.com",
            to_email="to@example.com",
            use_tls=True,
        )

        # Assert
        assert notifier.smtp_host == "smtp.example.com"
        assert notifier.smtp_port == 587
        assert notifier.smtp_user == "user@example.com"
        assert notifier.smtp_password == "password"
        assert notifier.from_email == "from@example.com"
        assert notifier.to_email == "to@example.com"
        assert notifier.use_tls is True

    def test_initialization_with_gmail_provider(self):
        """Test initialization with Gmail preset."""
        # Act
        notifier = EmailNotifier(
            provider="gmail",
            smtp_user="user@gmail.com",
            smtp_password="password",
            from_email="from@gmail.com",
            to_email="to@example.com",
        )

        # Assert
        # Should use Gmail's SMTP settings
        assert notifier.smtp_host == "smtp.gmail.com"
        assert notifier.smtp_port == 587
        assert notifier.use_tls is True

    def test_initialization_with_outlook_provider(self):
        """Test initialization with Outlook preset."""
        # Act
        notifier = EmailNotifier(
            provider="outlook",
            smtp_user="user@outlook.com",
            smtp_password="password",
            from_email="from@outlook.com",
            to_email="to@example.com",
        )

        # Assert
        # Should use Outlook's SMTP settings
        assert notifier.smtp_host == "smtp-mail.outlook.com"
        assert notifier.smtp_port == 587
        assert notifier.use_tls is True

    @patch.dict(
        os.environ,
        {
            "SMTP_HOST": "env.smtp.com",
            "SMTP_PORT": "465",
            "SMTP_USER": "user@example.com",
            "SMTP_PASSWORD": "password",
            "EMAIL_TO": "to@example.com",
        },
    )
    def test_initialization_from_environment(self):
        """Test initialization using environment variables."""
        # Act
        notifier = EmailNotifier()

        # Assert
        assert notifier.smtp_host == "env.smtp.com"
        assert notifier.smtp_port == 465

    def test_smtp_configs_dict_exists(self):
        """Test that SMTP_CONFIGS class variable exists and is populated."""
        # Assert
        assert hasattr(EmailNotifier, "SMTP_CONFIGS")
        assert isinstance(EmailNotifier.SMTP_CONFIGS, dict)
        assert "gmail" in EmailNotifier.SMTP_CONFIGS
        assert "outlook" in EmailNotifier.SMTP_CONFIGS

    @pytest.mark.parametrize(
        "provider,expected_host",
        [
            ("gmail", "smtp.gmail.com"),
            ("outlook", "smtp-mail.outlook.com"),
            ("office365", "smtp.office365.com"),
            ("yahoo", "smtp.mail.yahoo.com"),
        ],
        ids=["gmail", "outlook", "office365", "yahoo"],
    )
    def test_smtp_configs_for_providers(self, provider: str, expected_host: str):
        """Test SMTP configurations for different providers."""
        # Assert
        config = EmailNotifier.SMTP_CONFIGS[provider]
        assert config["host"] == expected_host
        assert "port" in config
        assert "tls" in config
        assert config["port"] == 587  # Standard for all major providers
        assert config["tls"] is True

    def test_default_smtp_port(self):
        """Test default SMTP port when not specified."""
        # Act
        notifier = EmailNotifier(
            smtp_host="smtp.example.com",
            smtp_user="user@example.com",
            smtp_password="password",
            to_email="to@example.com",
        )

        # Assert
        # Should default to 587 (standard submission port)
        assert notifier.smtp_port == 587

    def test_use_tls_default_true(self):
        """Test that use_tls defaults to True."""
        # Act
        notifier = EmailNotifier(
            smtp_host="smtp.example.com",
            smtp_user="user@example.com",
            smtp_password="password",
            to_email="to@example.com",
        )

        # Assert
        assert notifier.use_tls is True


class TestEmailNotifierSMTPConfigs:
    """Test SMTP configuration details."""

    def test_all_providers_have_help_url(self):
        """Test that all provider configs include help URLs."""
        # Act & Assert
        for provider, config in EmailNotifier.SMTP_CONFIGS.items():
            assert "help_url" in config, f"{provider} missing help_url"
            assert config["help_url"].startswith("http")

    def test_all_providers_have_required_fields(self):
        """Test that all provider configs have required fields."""
        # Arrange
        required_fields = ["host", "port", "tls", "help_url"]

        # Act & Assert
        for provider, config in EmailNotifier.SMTP_CONFIGS.items():
            for field in required_fields:
                assert field in config, f"{provider} missing {field}"

    def test_gmail_config_details(self):
        """Test Gmail configuration details."""
        # Arrange
        config = EmailNotifier.SMTP_CONFIGS["gmail"]

        # Assert
        assert config["host"] == "smtp.gmail.com"
        assert config["port"] == 587
        assert config["tls"] is True
        assert "google.com" in config["help_url"]

    def test_outlook_config_details(self):
        """Test Outlook configuration details."""
        # Arrange
        config = EmailNotifier.SMTP_CONFIGS["outlook"]

        # Assert
        assert config["host"] == "smtp-mail.outlook.com"
        assert config["port"] == 587
        assert config["tls"] is True
        assert "microsoft.com" in config["help_url"]


class TestEmailNotifierEdgeCases:
    """Test edge cases for EmailNotifier."""

    def test_initialization_with_none_values_raises_error(self):
        """Test initialization with None values raises validation error."""
        # Act & Assert
        with pytest.raises(ValueError, match="SMTP host is required"):
            EmailNotifier(
                smtp_host=None,
                smtp_port=None,
                smtp_user=None,
                smtp_password=None,
            )

    def test_initialization_with_custom_port(self):
        """Test initialization with custom port."""
        # Act
        notifier = EmailNotifier(
            smtp_host="smtp.example.com",
            smtp_port=465,  # SSL port
            smtp_user="user@example.com",
            smtp_password="password",
            to_email="to@example.com",
        )

        # Assert
        assert notifier.smtp_port == 465

    def test_initialization_with_tls_disabled(self):
        """Test initialization with TLS disabled."""
        # Act
        notifier = EmailNotifier(
            smtp_host="smtp.example.com",
            smtp_user="user@example.com",
            smtp_password="password",
            to_email="to@example.com",
            use_tls=False,
        )

        # Assert
        assert notifier.use_tls is False

    @patch.dict(os.environ, {}, clear=True)
    def test_initialization_without_env_vars_raises_error(self):
        """Test initialization when environment variables are not set."""
        # Act & Assert
        with pytest.raises(ValueError, match="SMTP host is required"):
            EmailNotifier()

    def test_multiple_instances_independent(self):
        """Test that multiple EmailNotifier instances are independent."""
        # Act
        notifier1 = EmailNotifier(
            smtp_host="smtp1.example.com",
            smtp_user="user1@example.com",
            smtp_password="pass1",
            to_email="to1@example.com",
        )
        notifier2 = EmailNotifier(
            smtp_host="smtp2.example.com",
            smtp_user="user2@example.com",
            smtp_password="pass2",
            to_email="to2@example.com",
        )

        # Assert
        assert notifier1.smtp_host != notifier2.smtp_host
        assert notifier1.smtp_host == "smtp1.example.com"
        assert notifier2.smtp_host == "smtp2.example.com"

    @pytest.mark.parametrize(
        "from_email,to_email",
        [
            ("sender@example.com", "receiver@example.com"),
            ("user+tag@example.com", "another@test.org"),
            ("admin@sub.example.com", "user@sub2.test.org"),
        ],
        ids=["simple", "with_tag", "subdomain"],
    )
    def test_various_email_formats(self, from_email: str, to_email: str):
        """Test initialization with various email address formats."""
        # Act
        notifier = EmailNotifier(
            smtp_host="smtp.example.com",
            smtp_user="user@example.com",
            smtp_password="password",
            from_email=from_email,
            to_email=to_email,
        )

        # Assert
        assert notifier.from_email == from_email
        assert notifier.to_email == to_email

    def test_provider_case_sensitivity(self):
        """Test provider name handling (should be case-sensitive as stored)."""
        # Arrange
        valid_providers = ["gmail", "outlook", "office365", "yahoo"]

        # Act & Assert
        for provider in valid_providers:
            notifier = EmailNotifier(
                provider=provider,
                smtp_user="user@example.com",
                smtp_password="password",
                to_email="to@example.com",
            )
            assert isinstance(notifier, EmailNotifier)

    def test_unknown_provider_fallback(self):
        """Test behavior with unknown provider."""
        # Act
        notifier = EmailNotifier(
            provider="unknown_provider",
            smtp_host="custom.smtp.com",
            smtp_user="user@example.com",
            smtp_password="password",
            to_email="to@example.com",
        )

        # Assert - Should still work with explicit smtp_host
        assert notifier.smtp_host == "custom.smtp.com"

    def test_smtp_configs_immutable(self):
        """Test that SMTP_CONFIGS should not be accidentally modified."""
        # Arrange
        original_gmail = EmailNotifier.SMTP_CONFIGS["gmail"].copy()

        # Act - Try to use the config (don't modify it)
        notifier = EmailNotifier(
            provider="gmail",
            smtp_user="user@gmail.com",
            smtp_password="password",
            to_email="to@example.com",
        )

        # Assert - Config should remain unchanged
        assert EmailNotifier.SMTP_CONFIGS["gmail"] == original_gmail
