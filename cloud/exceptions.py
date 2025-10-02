"""Custom exceptions for cloud deployment."""


class DeploymentError(Exception):
    """Base exception for deployment errors."""
    pass


class QuotaExceededError(DeploymentError):
    """Raised when GCP project quota is exceeded."""
    pass


class AuthenticationError(DeploymentError):
    """Raised when authentication fails."""
    pass


class ConfigurationError(DeploymentError):
    """Raised when configuration is invalid."""
    pass
