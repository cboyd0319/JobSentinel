"""
Security Hardening Module for JobSentinel

Implements security controls per OWASP ASVS 5.0 for input validation,
rate limiting, and secret management.

References:
- OWASP ASVS 5.0 | https://owasp.org/ASVS | High | Application security verification
- OWASP Top 10 | https://owasp.org/Top10 | High | Common security risks
- NIST SP 800-63B | https://pages.nist.gov/800-63-3 | High | Authentication guidelines
"""

import hashlib
import hmac
import logging
import re
import secrets
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any
from urllib.parse import urlparse


class ValidationResult(Enum):
    """Input validation result."""

    VALID = "valid"
    INVALID = "invalid"
    SUSPICIOUS = "suspicious"


@dataclass
class RateLimitConfig:
    """
    Rate limiting configuration.

    Implements token bucket algorithm for rate limiting per OWASP ASVS 4.2.1.
    """

    max_requests: int
    window_seconds: int
    burst_allowance: int = 0


@dataclass
class ValidationError:
    """
    Structured validation error.

    Attributes:
        field: Field name that failed validation
        reason: Human-readable reason
        severity: Error severity
        remediation: How to fix the error
    """

    field: str
    reason: str
    severity: str = "error"
    remediation: str = ""


class InputValidator:
    """
    Input validation per OWASP ASVS 5.0 V5.1.

    Provides defense-in-depth validation for all external inputs.
    """

    # Regex patterns for common validations
    EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    URL_PATTERN = re.compile(
        r"^https?://"  # http:// or https://
        r"(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|"  # domain...
        r"localhost|"  # localhost...
        r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})"  # ...or ip
        r"(?::\d+)?"  # optional port
        r"(?:/?|[/?]\S+)$",
        re.IGNORECASE,
    )
    PHONE_PATTERN = re.compile(r"^\+?1?\d{9,15}$")

    # Dangerous patterns that should be rejected
    SQL_INJECTION_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)",
        r"(--|;|'|\"|\/\*|\*\/)",
    ]

    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
    ]

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def validate_email(self, email: str) -> tuple[ValidationResult, list[ValidationError]]:
        """
        Validate email address per OWASP ASVS V5.1.2.

        Args:
            email: Email address to validate

        Returns:
            Tuple of (ValidationResult, list of errors)
        """
        errors = []

        if not email or not isinstance(email, str):
            errors.append(
                ValidationError(
                    field="email",
                    reason="Email is required",
                    remediation="Provide a valid email address",
                )
            )
            return ValidationResult.INVALID, errors

        email = email.strip().lower()

        if len(email) > 254:  # RFC 5321
            errors.append(
                ValidationError(
                    field="email",
                    reason="Email exceeds maximum length (254 characters)",
                    remediation="Use a shorter email address",
                )
            )

        if not self.EMAIL_PATTERN.match(email):
            errors.append(
                ValidationError(
                    field="email",
                    reason="Invalid email format",
                    remediation="Use format: user@domain.com",
                )
            )

        return (ValidationResult.VALID if not errors else ValidationResult.INVALID), errors

    def validate_url(
        self,
        url: str,
        allowed_schemes: list[str] | None = None,
        allowed_domains: list[str] | None = None,
    ) -> tuple[ValidationResult, list[ValidationError]]:
        """
        Validate URL per OWASP ASVS V5.1.3.

        Args:
            url: URL to validate
            allowed_schemes: Allowed URL schemes (default: ['http', 'https'])
            allowed_domains: If provided, restrict to these domains

        Returns:
            Tuple of (ValidationResult, list of errors)
        """
        errors = []

        if not url or not isinstance(url, str):
            errors.append(
                ValidationError(
                    field="url", reason="URL is required", remediation="Provide a valid URL"
                )
            )
            return ValidationResult.INVALID, errors

        url = url.strip()
        allowed_schemes = allowed_schemes or ["http", "https"]

        if not self.URL_PATTERN.match(url):
            errors.append(
                ValidationError(
                    field="url",
                    reason="Invalid URL format",
                    remediation="Use format: https://domain.com/path",
                )
            )
            return ValidationResult.INVALID, errors

        try:
            parsed = urlparse(url)

            # Check scheme
            if parsed.scheme not in allowed_schemes:
                errors.append(
                    ValidationError(
                        field="url",
                        reason=f"URL scheme '{parsed.scheme}' not allowed",
                        remediation=f"Use one of: {', '.join(allowed_schemes)}",
                    )
                )

            # Check domain restriction if provided
            if allowed_domains:
                domain = parsed.netloc.lower()
                if not any(allowed_domain in domain for allowed_domain in allowed_domains):
                    errors.append(
                        ValidationError(
                            field="url",
                            reason=f"Domain '{parsed.netloc}' not in allowed list",
                            remediation=f"Use one of: {', '.join(allowed_domains)}",
                            severity="warning",
                        )
                    )

        except Exception as e:
            errors.append(
                ValidationError(
                    field="url",
                    reason=f"URL parsing failed: {str(e)}",
                    remediation="Check URL format",
                )
            )

        return (ValidationResult.VALID if not errors else ValidationResult.INVALID), errors

    def sanitize_text_input(self, text: str, max_length: int = 10000) -> str:
        """
        Sanitize text input per OWASP ASVS V5.1.1.

        Args:
            text: Text to sanitize
            max_length: Maximum allowed length

        Returns:
            Sanitized text

        Note:
            This performs basic sanitization. For HTML contexts,
            use proper HTML escaping libraries.
        """
        if not text:
            return ""

        # Truncate to max length
        text = text[:max_length]

        # Remove null bytes
        text = text.replace("\x00", "")

        # Normalize whitespace
        text = re.sub(r"\s+", " ", text)

        return text.strip()

    def check_for_injection(self, text: str) -> tuple[bool, list[str]]:
        """
        Check for SQL injection and XSS patterns per OWASP ASVS V5.3.4.

        Args:
            text: Text to check

        Returns:
            Tuple of (has_suspicious_content, list of detected patterns)
        """
        if not text:
            return False, []

        detected = []
        text_lower = text.lower()

        # Check SQL injection patterns
        for pattern in self.SQL_INJECTION_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                detected.append(f"Possible SQL injection: {pattern}")

        # Check XSS patterns
        for pattern in self.XSS_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                detected.append(f"Possible XSS: {pattern}")

        return len(detected) > 0, detected


class RateLimiter:
    """
    Rate limiter implementing token bucket algorithm.

    Provides protection against abuse per OWASP ASVS V4.2.1.
    """

    def __init__(self):
        self.buckets: dict[str, dict[str, Any]] = defaultdict(dict)
        self.logger = logging.getLogger(__name__)

    def check_rate_limit(
        self, identifier: str, config: RateLimitConfig
    ) -> tuple[bool, dict[str, Any]]:
        """
        Check if request is within rate limit.

        Args:
            identifier: Unique identifier (e.g., IP address, user ID)
            config: Rate limit configuration

        Returns:
            Tuple of (allowed, metadata)
            - allowed: True if request is allowed
            - metadata: Dictionary with rate limit info
        """
        now = time.time()
        bucket_key = f"{identifier}:{config.max_requests}:{config.window_seconds}"

        if bucket_key not in self.buckets:
            # Initialize new bucket
            self.buckets[bucket_key] = {
                "tokens": config.max_requests,
                "last_update": now,
                "requests": 0,
            }

        bucket = self.buckets[bucket_key]

        # Calculate tokens to add based on time elapsed
        time_elapsed = now - bucket["last_update"]
        tokens_to_add = (time_elapsed / config.window_seconds) * config.max_requests

        # Update bucket
        bucket["tokens"] = min(
            config.max_requests + config.burst_allowance, bucket["tokens"] + tokens_to_add
        )
        bucket["last_update"] = now

        # Check if request is allowed
        allowed = bucket["tokens"] >= 1.0

        if allowed:
            bucket["tokens"] -= 1.0
            bucket["requests"] += 1

        metadata = {
            "remaining": int(bucket["tokens"]),
            "limit": config.max_requests,
            "window_seconds": config.window_seconds,
            "reset_at": now + config.window_seconds,
        }

        if not allowed:
            self.logger.warning(
                f"Rate limit exceeded for {identifier}: "
                f"{bucket['requests']} requests in {config.window_seconds}s"
            )

        return allowed, metadata

    def reset_bucket(self, identifier: str):
        """Reset rate limit bucket for identifier."""
        self.buckets.pop(identifier, None)


class SecretManager:
    """
    Secret management per OWASP ASVS V2.3.

    Provides secure handling of API keys, tokens, and credentials.
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    @staticmethod
    def generate_token(length: int = 32) -> str:
        """
        Generate cryptographically secure random token.

        Args:
            length: Token length in bytes

        Returns:
            Hex-encoded token
        """
        return secrets.token_hex(length)

    @staticmethod
    def hash_secret(secret: str, salt: str | None = None) -> tuple[str, str]:
        """
        Hash a secret using SHA-256 with salt.

        Args:
            secret: Secret to hash
            salt: Optional salt (generated if not provided)

        Returns:
            Tuple of (hash, salt)
        """
        if not salt:
            salt = secrets.token_hex(16)

        hash_value = hashlib.pbkdf2_hmac(
            "sha256", secret.encode("utf-8"), salt.encode("utf-8"), iterations=100000
        )

        return hash_value.hex(), salt

    @staticmethod
    def verify_secret(secret: str, hash_value: str, salt: str) -> bool:
        """
        Verify a secret against its hash.

        Args:
            secret: Secret to verify
            hash_value: Expected hash
            salt: Salt used in hashing

        Returns:
            True if secret matches
        """
        computed_hash, _ = SecretManager.hash_secret(secret, salt)
        return hmac.compare_digest(computed_hash, hash_value)

    @staticmethod
    def mask_secret(secret: str, visible_chars: int = 4) -> str:
        """
        Mask a secret for logging/display.

        Args:
            secret: Secret to mask
            visible_chars: Number of chars to show at end

        Returns:
            Masked string (e.g., "****xyz")
        """
        if not secret or len(secret) <= visible_chars:
            return "****"

        return "*" * (len(secret) - visible_chars) + secret[-visible_chars:]


# Global instances
_input_validator = InputValidator()
_rate_limiter = RateLimiter()
_secret_manager = SecretManager()


def get_input_validator() -> InputValidator:
    """Get global input validator instance."""
    return _input_validator


def get_rate_limiter() -> RateLimiter:
    """Get global rate limiter instance."""
    return _rate_limiter


def get_secret_manager() -> SecretManager:
    """Get global secret manager instance."""
    return _secret_manager
