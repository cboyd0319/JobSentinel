"""
Configuration management and validation for the job scraper.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from urllib.parse import urlparse

from utils.logging import get_logger
from utils.errors import ConfigurationException

logger = get_logger("config")


@dataclass
class CompanyConfig:
    """Configuration for a single company's job board."""

    id: str
    board_type: str
    url: str
    fetch_descriptions: bool = True
    custom_selectors: Optional[Dict[str, str]] = None

    def __post_init__(self):
        """Validate company configuration."""
        if not self.id or not self.board_type or not self.url:
            raise ConfigurationException("Invalid company config: missing required fields")

        # Validate URL
        try:
            parsed = urlparse(self.url)
            if not parsed.scheme or not parsed.netloc:
                raise ConfigurationException(f"Invalid URL for company {self.id}: {self.url}")

            # Security: Only allow HTTPS URLs (or HTTP for localhost/testing)
            if parsed.scheme not in ('https', 'http'):
                raise ConfigurationException(f"URL must use HTTP or HTTPS protocol for company {self.id}: {self.url}")

            if parsed.scheme == 'http' and not parsed.netloc.startswith('localhost'):
                logger.warning(f"Company {self.id} uses insecure HTTP (not HTTPS): {self.url}")

        except Exception as e:
            raise ConfigurationException(f"Invalid URL for company {self.id}: {e}")

        # Validate board type
        supported_boards = [
            "greenhouse",
            "lever",
            "workday",
            "ashby",
            "smartrecruiters",
        ]
        if self.board_type not in supported_boards:
            logger.warning(f"Board type '{self.board_type}' for {self.id} may not be fully supported")


@dataclass
class ScrapingConfig:
    """Configuration for scraping behavior."""

    max_companies_per_run: int = 10
    fetch_descriptions: bool = True
    timeout_seconds: int = 30
    max_retries: int = 3
    respect_robots_txt: bool = True
    user_agent: str = "Mozilla/5.0 (compatible; JobScraper/1.0)"

    def __post_init__(self):
        """Validate scraping configuration."""
        if self.max_companies_per_run < 1:
            raise ConfigurationException("max_companies_per_run must be at least 1")

        if self.timeout_seconds < 1:
            raise ConfigurationException("timeout_seconds must be at least 1")

        if self.max_retries < 0:
            raise ConfigurationException("max_retries must be at least 0")


@dataclass
class FilterConfig:
    """Configuration for job filtering and scoring."""

    title_allowlist: List[str]
    title_blocklist: List[str] = None
    keywords_boost: List[str] = None
    keywords_exclude: List[str] = None
    location_constraints: List[str] = None
    salary_floor_usd: Optional[int] = None
    immediate_alert_threshold: float = 0.9
    digest_min_score: float = 0.0
    max_matches_per_run: int = 50

    def __post_init__(self):
        """Validate filter configuration."""
        if not self.title_allowlist:
            raise ConfigurationException("title_allowlist cannot be empty")

        if not 0 <= self.immediate_alert_threshold <= 1:
            raise ConfigurationException("immediate_alert_threshold must be between 0 and 1")

        if not 0 <= self.digest_min_score <= 1:
            raise ConfigurationException("digest_min_score must be between 0 and 1")

        if self.immediate_alert_threshold <= self.digest_min_score:
            raise ConfigurationException(
                f"immediate_alert_threshold ({self.immediate_alert_threshold}) must be greater than "
                f"digest_min_score ({self.digest_min_score})"
            )

        if self.max_matches_per_run < 1:
            raise ConfigurationException("max_matches_per_run must be at least 1")


@dataclass
class NotificationConfig:
    """Configuration for notifications."""

    slack_webhook_url: Optional[str] = None

    def validate_slack(self) -> bool:
        """Check if Slack notifications are properly configured."""
        return bool(self.slack_webhook_url and self.slack_webhook_url.startswith("https://hooks.slack.com/"))


class ConfigManager:
    """Manages configuration loading and validation."""

    def __init__(
        self,
        config_path: str = "config/user_prefs.json",
        env_path: str = ".env",
        fallback_paths: Optional[List[str]] = None,
    ):
        candidates = [Path(config_path)]
        if fallback_paths is None:
            fallback_paths = ["user_prefs.json"]
        candidates.extend(Path(p) for p in fallback_paths)

        self._candidate_paths = candidates
        self.config_path = next((p for p in candidates if p.exists()), Path(config_path))
        self.env_path = Path(env_path)
        self._config_data: Optional[Dict[str, Any]] = None
        self.database_url: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///data/jobs.sqlite")

    def load_config(self) -> Dict[str, Any]:
        """Load and validate complete configuration."""
        logger.info("Loading configuration...")

        # Load user preferences
        if not self.config_path.exists():
            raise ConfigurationException(
                "Configuration file not found. Expected one of: "
                + ", ".join(str(path) for path in self._candidate_paths)
            )

        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                config_data = json.load(f)
        except json.JSONDecodeError as e:
            raise ConfigurationException(f"Invalid JSON in {self.config_path}: {e}")
        except Exception as e:
            raise ConfigurationException(f"Failed to read {self.config_path}: {e}")

        # Load environment variables
        if self.env_path.exists():
            from dotenv import load_dotenv

            load_dotenv(self.env_path)

        # Validate configuration
        self._validate_config(config_data)

        self._config_data = config_data
        logger.info("Configuration loaded and validated successfully")
        return config_data

    def _validate_config(self, config: Dict[str, Any]):
        """Validate the complete configuration."""
        logger.debug("Validating configuration...")

        # Validate companies
        companies = config.get("companies", [])
        if not companies:
            raise ConfigurationException("No companies configured")

        for i, company_data in enumerate(companies):
            try:
                CompanyConfig(**company_data)
            except Exception as e:
                raise ConfigurationException(f"Invalid company config at index {i}: {e}")

        # Validate filters
        try:
            FilterConfig(
                title_allowlist=config.get("title_allowlist", []),
                title_blocklist=config.get("title_blocklist", []),
                keywords_boost=config.get("keywords_boost", []),
                keywords_exclude=config.get("keywords_exclude", []),
                location_constraints=config.get("location_constraints", []),
                salary_floor_usd=config.get("salary_floor_usd"),
                immediate_alert_threshold=config.get("immediate_alert_threshold", 0.9),
                max_matches_per_run=config.get("max_matches_per_run", 50),
            )
        except Exception as e:
            raise ConfigurationException(f"Invalid filter configuration: {e}")

        # Validate notifications
        notification_config = NotificationConfig(
            slack_webhook_url=os.getenv("SLACK_WEBHOOK_URL"),
        )

        if not notification_config.validate_slack():
            logger.warning("No notification methods configured. You will not receive alerts.")

        # Security validation
        self._validate_security()

        logger.debug("Configuration validation completed")

    def _validate_security(self):
        """Validate security-related configuration."""
        # Check for hardcoded secrets in config
        if self._config_data:
            config_str = json.dumps(self._config_data)
            suspicious_patterns = [
                "password",
                "secret",
                "key",
                "token",
                "webhook",
                "api_key",
            ]

            for pattern in suspicious_patterns:
                if pattern in config_str.lower():
                    logger.warning(f"Potential secret found in config file: {pattern}")

        # Check environment variables
        required_env_vars = ["SLACK_WEBHOOK_URL"]
        missing_vars = [var for var in required_env_vars if not os.getenv(var)]

        if missing_vars:
            logger.warning(f"Missing environment variables: {', '.join(missing_vars)}")

        # Check file permissions
        try:
            if self.env_path.exists():
                stat_info = self.env_path.stat()
                if stat_info.st_mode & 0o077:
                    logger.warning(f"{self.env_path} has overly permissive permissions")
        except Exception as e:
            logger.warning(f"Could not check file permissions: {e}")

    def get_companies(self) -> List[CompanyConfig]:
        """Get validated company configurations."""
        if not self._config_data:
            self.load_config()

        companies = []
        for company_data in self._config_data.get("companies", []):
            companies.append(CompanyConfig(**company_data))

        return companies

    def get_filter_config(self) -> FilterConfig:
        """Get validated filter configuration."""
        if not self._config_data:
            self.load_config()

        return FilterConfig(
            title_allowlist=self._config_data.get("title_allowlist", []),
            title_blocklist=self._config_data.get("title_blocklist", []),
            keywords_boost=self._config_data.get("keywords_boost", []),
            keywords_exclude=self._config_data.get("keywords_exclude", []),
            location_constraints=self._config_data.get("location_constraints", []),
            salary_floor_usd=self._config_data.get("salary_floor_usd"),
            immediate_alert_threshold=self._config_data.get("immediate_alert_threshold", 0.9),
            max_matches_per_run=self._config_data.get("max_matches_per_run", 50),
        )

    def get_notification_config(self) -> NotificationConfig:
        """Get validated notification configuration."""
        return NotificationConfig(
            slack_webhook_url=os.getenv("SLACK_WEBHOOK_URL"),
        )

    def get_scraping_config(self) -> ScrapingConfig:
        """Get scraping configuration with defaults."""
        if not self._config_data:
            self.load_config()

        return ScrapingConfig(
            max_companies_per_run=self._config_data.get("max_companies_per_run", 10),
            fetch_descriptions=self._config_data.get("fetch_descriptions", True),
            timeout_seconds=self._config_data.get("timeout_seconds", 30),
            max_retries=self._config_data.get("max_retries", 3),
        )


# Global config manager instance
config_manager = ConfigManager()
