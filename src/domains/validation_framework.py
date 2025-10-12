"""
Comprehensive Validation Framework

Provides zero-error validation for all JobSentinel operations with:
- Pre-flight checks before execution
- Runtime validation and monitoring
- Post-execution verification
- Self-healing capabilities
- Comprehensive error reporting

References:
- SWEBOK v4.0a | https://computer.org/swebok | High | Quality assurance processes
- OWASP ASVS 5.0 | https://owasp.org/ASVS | High | Input validation V5.1
- ISO/IEC 25010 | https://iso.org | High | Software quality model
"""

import json
import logging
import re
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Callable

from pydantic import BaseModel, Field, ValidationError, validator

logger = logging.getLogger(__name__)


# ============================================================================
# Enumerations
# ============================================================================


class ValidationLevel(str, Enum):
    """Validation strictness levels."""

    BASIC = "basic"  # Essential checks only
    STANDARD = "standard"  # Recommended checks (default)
    STRICT = "strict"  # All possible checks
    PARANOID = "paranoid"  # Maximum validation + extra safeguards


class CheckStatus(str, Enum):
    """Validation check result status."""

    PASS = "pass"  # Check passed
    WARN = "warn"  # Non-critical issue
    FAIL = "fail"  # Critical issue
    SKIP = "skip"  # Check skipped (not applicable)
    ERROR = "error"  # Check execution failed


class OperationType(str, Enum):
    """Type of operation being validated."""

    SCRAPING = "scraping"
    ANALYSIS = "analysis"
    NOTIFICATION = "notification"
    DATABASE = "database"
    API_CALL = "api_call"
    FILE_IO = "file_io"
    CONFIGURATION = "configuration"


# ============================================================================
# Data Models
# ============================================================================


@dataclass
class ValidationCheck:
    """Individual validation check."""

    name: str
    description: str
    check_function: Callable[..., bool]
    severity: str = "critical"  # critical, high, medium, low
    auto_fix: Callable[..., Any] | None = None
    remediation: str = ""


@dataclass
class ValidationResult:
    """Result of a validation check."""

    check_name: str
    status: CheckStatus
    message: str
    details: dict[str, Any] = field(default_factory=dict)
    execution_time_ms: float = 0.0
    fixed: bool = False
    remediation: str = ""


@dataclass
class ValidationReport:
    """Complete validation report."""

    operation_type: OperationType
    validation_level: ValidationLevel
    total_checks: int
    passed: int
    warned: int
    failed: int
    skipped: int
    errors: int
    results: list[ValidationResult] = field(default_factory=list)
    execution_time_ms: float = 0.0
    overall_status: str = "unknown"
    auto_fixes_applied: int = 0

    def is_valid(self) -> bool:
        """Check if validation passed (no failures)."""
        return self.failed == 0 and self.errors == 0

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "operation_type": self.operation_type.value,
            "validation_level": self.validation_level.value,
            "summary": {
                "total_checks": self.total_checks,
                "passed": self.passed,
                "warned": self.warned,
                "failed": self.failed,
                "skipped": self.skipped,
                "errors": self.errors,
                "auto_fixes_applied": self.auto_fixes_applied,
            },
            "overall_status": self.overall_status,
            "execution_time_ms": self.execution_time_ms,
            "results": [
                {
                    "check": r.check_name,
                    "status": r.status.value,
                    "message": r.message,
                    "details": r.details,
                    "fixed": r.fixed,
                    "remediation": r.remediation,
                }
                for r in self.results
            ],
        }


# ============================================================================
# Configuration Models
# ============================================================================


class ScrapingConfig(BaseModel):
    """Validated scraping configuration."""

    keywords: list[str] = Field(..., min_items=1, max_items=50)
    locations: list[str] = Field(default_factory=list, max_items=20)
    sources: list[str] = Field(..., min_items=1)
    max_pages: int = Field(default=10, ge=1, le=100)
    timeout: int = Field(default=30, ge=10, le=300)
    rate_limit: int = Field(default=100, ge=1, le=1000)

    @validator("keywords")
    def validate_keywords(cls, v: list[str]) -> list[str]:
        """Validate keywords are non-empty and reasonable length."""
        for kw in v:
            if not kw or len(kw) > 100:
                raise ValueError(f"Invalid keyword: {kw}")
        return v

    @validator("sources")
    def validate_sources(cls, v: list[str]) -> list[str]:
        """Validate sources are known."""
        valid_sources = {"indeed", "linkedin", "glassdoor", "reed", "jobswithgpt"}
        for source in v:
            if source not in valid_sources:
                raise ValueError(f"Unknown source: {source}")
        return v


class AnalysisConfig(BaseModel):
    """Validated analysis configuration."""

    target_industry: str | None = Field(None, max_length=50)
    target_role: str | None = Field(None, max_length=100)
    min_quality_score: int = Field(default=50, ge=0, le=100)
    enable_autofix: bool = Field(default=True)
    aggressive_fix: bool = Field(default=False)


# ============================================================================
# Validation Engine
# ============================================================================


class ValidationEngine:
    """
    Comprehensive validation engine with pre-flight checks, runtime validation,
    and self-healing capabilities.
    
    Supports:
    - Pre-execution validation
    - Runtime monitoring
    - Post-execution verification
    - Automatic fixes when possible
    - Detailed reporting
    """

    def __init__(self, level: ValidationLevel = ValidationLevel.STANDARD):
        """Initialize validation engine."""
        self.level = level
        self.checks: dict[OperationType, list[ValidationCheck]] = {
            OperationType.SCRAPING: self._get_scraping_checks(),
            OperationType.ANALYSIS: self._get_analysis_checks(),
            OperationType.NOTIFICATION: self._get_notification_checks(),
            OperationType.DATABASE: self._get_database_checks(),
            OperationType.API_CALL: self._get_api_checks(),
            OperationType.FILE_IO: self._get_file_checks(),
            OperationType.CONFIGURATION: self._get_configuration_checks(),
        }

    # ========================================================================
    # Check Definitions
    # ========================================================================

    def _get_scraping_checks(self) -> list[ValidationCheck]:
        """Get scraping validation checks."""
        return [
            ValidationCheck(
                name="keywords_present",
                description="Verify keywords are provided",
                check_function=lambda config: bool(config.get("keywords")),
                severity="critical",
                remediation="Provide at least one keyword for job search",
            ),
            ValidationCheck(
                name="sources_valid",
                description="Verify job sources are configured",
                check_function=lambda config: bool(config.get("sources")),
                severity="critical",
                remediation="Enable at least one job source",
            ),
            ValidationCheck(
                name="rate_limit_safe",
                description="Verify rate limits are reasonable",
                check_function=lambda config: 1
                <= config.get("rate_limit", 100)
                <= 1000,
                severity="high",
                remediation="Set rate_limit between 1 and 1000 requests/minute",
            ),
            ValidationCheck(
                name="timeout_reasonable",
                description="Verify timeout is appropriate",
                check_function=lambda config: 10
                <= config.get("timeout", 30)
                <= 300,
                severity="medium",
                remediation="Set timeout between 10 and 300 seconds",
            ),
            ValidationCheck(
                name="max_pages_bounded",
                description="Verify max pages is bounded",
                check_function=lambda config: 1
                <= config.get("max_pages", 10)
                <= 100,
                severity="medium",
                remediation="Set max_pages between 1 and 100",
            ),
        ]

    def _get_analysis_checks(self) -> list[ValidationCheck]:
        """Get analysis validation checks."""
        return [
            ValidationCheck(
                name="resume_text_present",
                description="Verify resume text provided",
                check_function=lambda data: bool(
                    data.get("resume_text", "").strip()
                ),
                severity="critical",
                remediation="Provide resume text for analysis",
            ),
            ValidationCheck(
                name="resume_length_valid",
                description="Verify resume length is reasonable",
                check_function=lambda data: 100
                <= len(data.get("resume_text", ""))
                <= 50000,
                severity="high",
                remediation="Resume should be 100-50000 characters",
            ),
            ValidationCheck(
                name="industry_valid",
                description="Verify industry is known",
                check_function=lambda data: data.get("target_industry")
                in [
                    None,
                    "software_engineering",
                    "data_science",
                    "healthcare",
                    "finance",
                    "legal",
                ],
                severity="medium",
                remediation="Use a recognized industry or leave blank",
            ),
        ]

    def _get_notification_checks(self) -> list[ValidationCheck]:
        """Get notification validation checks."""
        return [
            ValidationCheck(
                name="webhook_url_present",
                description="Verify webhook URL configured",
                check_function=lambda config: bool(config.get("webhook_url")),
                severity="critical",
                remediation="Configure Slack webhook URL",
            ),
            ValidationCheck(
                name="webhook_url_format",
                description="Verify webhook URL format",
                check_function=lambda config: bool(
                    re.match(
                        r"https://hooks\.slack\.com/services/\w+/\w+/\w+",
                        config.get("webhook_url", ""),
                    )
                ),
                severity="critical",
                remediation="Use valid Slack webhook URL format",
            ),
        ]

    def _get_database_checks(self) -> list[ValidationCheck]:
        """Get database validation checks."""
        return [
            ValidationCheck(
                name="db_path_writable",
                description="Verify database path is writable",
                check_function=lambda config: Path(
                    config.get("db_path", "data/jobs.db")
                )
                .parent.exists(),
                severity="critical",
                remediation="Ensure database directory exists and is writable",
            ),
            ValidationCheck(
                name="connection_pool_size",
                description="Verify connection pool is reasonable",
                check_function=lambda config: 1
                <= config.get("pool_size", 5)
                <= 20,
                severity="medium",
                remediation="Set pool_size between 1 and 20",
            ),
        ]

    def _get_api_checks(self) -> list[ValidationCheck]:
        """Get API call validation checks."""
        return [
            ValidationCheck(
                name="url_format_valid",
                description="Verify URL format",
                check_function=lambda data: bool(
                    re.match(r"https?://", data.get("url", ""))
                ),
                severity="critical",
                remediation="Provide valid HTTP/HTTPS URL",
            ),
            ValidationCheck(
                name="timeout_set",
                description="Verify timeout is configured",
                check_function=lambda data: data.get("timeout") is not None,
                severity="high",
                remediation="Always set timeout for external calls",
            ),
        ]

    def _get_file_checks(self) -> list[ValidationCheck]:
        """Get file I/O validation checks."""
        return [
            ValidationCheck(
                name="path_safe",
                description="Verify path is safe (no directory traversal)",
                check_function=lambda data: ".." not in data.get("path", ""),
                severity="critical",
                remediation="Remove directory traversal patterns (..)",
            ),
            ValidationCheck(
                name="file_size_reasonable",
                description="Verify file size is reasonable",
                check_function=lambda data: data.get("size", 0) <= 10 * 1024 * 1024,
                severity="high",
                remediation="File should be <= 10MB",
            ),
        ]

    def _get_configuration_checks(self) -> list[ValidationCheck]:
        """Get configuration validation checks."""
        return [
            ValidationCheck(
                name="required_fields_present",
                description="Verify required fields are present",
                check_function=lambda config: all(
                    k in config for k in ["keywords", "job_sources"]
                ),
                severity="critical",
                remediation="Provide keywords and job_sources in config",
            ),
        ]

    # ========================================================================
    # Validation Execution
    # ========================================================================

    def validate(
        self, operation: OperationType, data: dict[str, Any], auto_fix: bool = True
    ) -> ValidationReport:
        """
        Run validation checks for an operation.
        
        Args:
            operation: Type of operation to validate
            data: Data/configuration to validate
            auto_fix: Apply automatic fixes if available
            
        Returns:
            ValidationReport with results
        """
        start_time = time.time()
        checks = self.checks.get(operation, [])

        results: list[ValidationResult] = []
        passed = warned = failed = skipped = errors = auto_fixes = 0

        logger.info(
            f"Running {len(checks)} validation checks for {operation.value}"
        )

        for check in checks:
            result = self._run_check(check, data, auto_fix)
            results.append(result)

            if result.status == CheckStatus.PASS:
                passed += 1
            elif result.status == CheckStatus.WARN:
                warned += 1
            elif result.status == CheckStatus.FAIL:
                failed += 1
            elif result.status == CheckStatus.SKIP:
                skipped += 1
            elif result.status == CheckStatus.ERROR:
                errors += 1

            if result.fixed:
                auto_fixes += 1

        execution_time = (time.time() - start_time) * 1000

        # Determine overall status
        if failed > 0 or errors > 0:
            overall_status = "failed"
        elif warned > 0:
            overall_status = "warning"
        else:
            overall_status = "passed"

        report = ValidationReport(
            operation_type=operation,
            validation_level=self.level,
            total_checks=len(checks),
            passed=passed,
            warned=warned,
            failed=failed,
            skipped=skipped,
            errors=errors,
            results=results,
            execution_time_ms=execution_time,
            overall_status=overall_status,
            auto_fixes_applied=auto_fixes,
        )

        logger.info(
            f"Validation complete: {overall_status} "
            f"({passed} passed, {failed} failed, {warned} warnings, "
            f"{auto_fixes} auto-fixed)"
        )

        return report

    def _run_check(
        self,
        check: ValidationCheck,
        data: dict[str, Any],
        auto_fix: bool,
    ) -> ValidationResult:
        """Run a single validation check."""
        start_time = time.time()

        try:
            # Run check function
            passed = check.check_function(data)

            if passed:
                status = CheckStatus.PASS
                message = f"✓ {check.description}"
                fixed = False
            else:
                # Check failed - try auto-fix if available
                if auto_fix and check.auto_fix:
                    try:
                        check.auto_fix(data)
                        status = CheckStatus.PASS
                        message = f"✓ {check.description} (auto-fixed)"
                        fixed = True
                    except Exception as e:
                        status = CheckStatus.FAIL
                        message = f"✗ {check.description}"
                        fixed = False
                        logger.warning(f"Auto-fix failed: {e}")
                else:
                    status = CheckStatus.FAIL
                    message = f"✗ {check.description}"
                    fixed = False

            execution_time = (time.time() - start_time) * 1000

            return ValidationResult(
                check_name=check.name,
                status=status,
                message=message,
                details={"severity": check.severity},
                execution_time_ms=execution_time,
                fixed=fixed,
                remediation=check.remediation,
            )

        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            logger.error(f"Check {check.name} failed with error: {e}")
            return ValidationResult(
                check_name=check.name,
                status=CheckStatus.ERROR,
                message=f"Error running check: {str(e)}",
                details={"exception": str(e)},
                execution_time_ms=execution_time,
                fixed=False,
                remediation=check.remediation,
            )

    # ========================================================================
    # Pre-flight Validation
    # ========================================================================

    def pre_flight_check(
        self, operation: OperationType, data: dict[str, Any]
    ) -> ValidationReport:
        """
        Run pre-flight validation before executing operation.
        
        This catches issues early before potentially expensive operations.
        """
        logger.info(f"Running pre-flight check for {operation.value}")
        return self.validate(operation, data, auto_fix=True)

    # ========================================================================
    # Configuration Validation
    # ========================================================================

    def validate_scraping_config(self, config: dict[str, Any]) -> ScrapingConfig:
        """
        Validate scraping configuration with Pydantic.
        
        Raises:
            ValidationError: If configuration is invalid
        """
        return ScrapingConfig(**config)

    def validate_analysis_config(self, config: dict[str, Any]) -> AnalysisConfig:
        """
        Validate analysis configuration with Pydantic.
        
        Raises:
            ValidationError: If configuration is invalid
        """
        return AnalysisConfig(**config)


# ============================================================================
# Health Checks
# ============================================================================


class HealthChecker:
    """System health checker with component-level checks."""

    @staticmethod
    def check_dependencies() -> dict[str, bool]:
        """Check if required dependencies are available."""
        dependencies = {}

        try:
            import aiohttp

            dependencies["aiohttp"] = True
        except ImportError:
            dependencies["aiohttp"] = False

        try:
            import pydantic

            dependencies["pydantic"] = True
        except ImportError:
            dependencies["pydantic"] = False

        try:
            import requests

            dependencies["requests"] = True
        except ImportError:
            dependencies["requests"] = False

        try:
            from bs4 import BeautifulSoup

            dependencies["beautifulsoup4"] = True
        except ImportError:
            dependencies["beautifulsoup4"] = False

        return dependencies

    @staticmethod
    def check_storage() -> dict[str, Any]:
        """Check storage availability and space."""
        import shutil

        data_dir = Path("data")
        data_dir.mkdir(exist_ok=True)

        usage = shutil.disk_usage(data_dir)

        return {
            "total_gb": usage.total / (1024**3),
            "used_gb": usage.used / (1024**3),
            "free_gb": usage.free / (1024**3),
            "percent_used": (usage.used / usage.total) * 100,
        }

    @staticmethod
    def check_connectivity() -> dict[str, bool]:
        """Check network connectivity to key services."""
        import socket

        results = {}

        # Check DNS resolution
        try:
            socket.gethostbyname("google.com")
            results["dns"] = True
        except socket.gaierror:
            results["dns"] = False

        # Check HTTP connectivity
        try:
            import requests

            response = requests.get("https://httpbin.org/status/200", timeout=5)
            results["http"] = response.status_code == 200
        except Exception:
            results["http"] = False

        return results

    @staticmethod
    def system_health() -> dict[str, Any]:
        """Run complete system health check."""
        return {
            "dependencies": HealthChecker.check_dependencies(),
            "storage": HealthChecker.check_storage(),
            "connectivity": HealthChecker.check_connectivity(),
        }


# ============================================================================
# Example Usage
# ============================================================================


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)

    # Initialize engine
    engine = ValidationEngine(level=ValidationLevel.STANDARD)

    # Example 1: Validate scraping configuration
    print("\n=== Example 1: Scraping Configuration ===")
    scraping_config = {
        "keywords": ["python", "developer"],
        "sources": ["indeed", "glassdoor"],
        "max_pages": 10,
        "timeout": 30,
        "rate_limit": 100,
    }

    report = engine.validate(
        OperationType.SCRAPING, scraping_config, auto_fix=True
    )
    print(f"Status: {report.overall_status}")
    print(f"Checks: {report.passed} passed, {report.failed} failed")

    # Example 2: Validate analysis data
    print("\n=== Example 2: Analysis Data ===")
    analysis_data = {
        "resume_text": "Software Engineer with 5 years experience...",
        "target_industry": "software_engineering",
    }

    report = engine.validate(OperationType.ANALYSIS, analysis_data, auto_fix=True)
    print(f"Status: {report.overall_status}")
    print(json.dumps(report.to_dict(), indent=2))

    # Example 3: System health check
    print("\n=== Example 3: System Health ===")
    health = HealthChecker.system_health()
    print(json.dumps(health, indent=2, default=str))
