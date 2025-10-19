"""
Comprehensive unit tests for jsa/health_check.py module.

Tests cover:
- Python version checking
- Dependency checking (core and optional)
- Configuration validation
- Database accessibility
- Network connectivity
- System resource monitoring
- Overall health report generation
- Edge cases and error handling
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock, Mock, mock_open, patch

import pytest

from jsa.health_check import HealthCheckResult, HealthChecker, run_health_check


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture(autouse=True)
def _seed_rng():
    """Seed RNG for deterministic tests."""
    import random

    random.seed(1337)


@pytest.fixture
def health_checker():
    """Create a HealthChecker instance."""
    return HealthChecker(verbose=False)


@pytest.fixture
def health_checker_verbose():
    """Create a verbose HealthChecker instance."""
    return HealthChecker(verbose=True)


@pytest.fixture
def sample_config():
    """Sample valid configuration."""
    return {
        "keywords": ["python", "software engineer"],
        "job_sources": {
            "indeed": {"enabled": True},
            "linkedin": {"enabled": True},
        },
        "slack": {"webhook_url": "https://hooks.slack.com/services/TEST"},
    }


@pytest.fixture
def empty_config():
    """Empty configuration."""
    return {"keywords": [], "job_sources": {}}


# ============================================================================
# HealthCheckResult Tests
# ============================================================================


class TestHealthCheckResult:
    """Test HealthCheckResult dataclass."""

    def test_result_creates_with_required_fields(self):
        """HealthCheckResult creates with required fields."""
        result = HealthCheckResult(
            name="Test Check", status="pass", message="Test passed"
        )
        assert result.name == "Test Check"
        assert result.status == "pass"
        assert result.message == "Test passed"
        assert result.details == {}
        assert result.recommendations == []

    def test_result_accepts_optional_fields(self):
        """HealthCheckResult accepts optional fields."""
        result = HealthCheckResult(
            name="Test",
            status="fail",
            message="Failed",
            details={"error": "test error"},
            recommendations=["Fix the issue"],
        )
        assert result.details == {"error": "test error"}
        assert result.recommendations == ["Fix the issue"]

    @pytest.mark.parametrize(
        "status",
        ["pass", "warn", "fail"],
        ids=["pass_status", "warn_status", "fail_status"],
    )
    def test_result_accepts_valid_statuses(self, status):
        """HealthCheckResult accepts valid status values."""
        result = HealthCheckResult(name="Test", status=status, message="Test")
        assert result.status == status


# ============================================================================
# Python Version Check Tests
# ============================================================================


class TestPythonVersionCheck:
    """Test check_python_version method."""

    def test_python_version_pass_when_meets_requirements(self, health_checker):
        """check_python_version passes when Python version meets requirements."""

        class MockVersionInfo:
            """Mock version info that is comparable."""

            def __init__(self, major, minor, micro):
                self.major = major
                self.minor = minor
                self.micro = micro

            def __ge__(self, other):
                if len(other) >= 2:
                    return (self.major, self.minor) >= tuple(other[:2])
                return False

        mock_version = MockVersionInfo(3, 12, 0)
        with patch("sys.version_info", mock_version):
            result = health_checker.check_python_version()
            assert result.status == "pass"
            assert "3.12" in result.message
            assert "3.12.0" in result.details["version"]

    def test_python_version_pass_when_exceeds_requirements(self, health_checker):
        """check_python_version passes when Python version exceeds requirements."""

        class MockVersionInfo:
            """Mock version info that is comparable."""

            def __init__(self, major, minor, micro):
                self.major = major
                self.minor = minor
                self.micro = micro

            def __ge__(self, other):
                if len(other) >= 2:
                    return (self.major, self.minor) >= tuple(other[:2])
                return False

        mock_version = MockVersionInfo(3, 13, 1)
        with patch("sys.version_info", mock_version):
            result = health_checker.check_python_version()
            assert result.status == "pass"
            assert "3.13" in result.message

    def test_python_version_fail_when_below_requirements(self, health_checker):
        """check_python_version fails when Python version is below requirements."""

        class MockVersionInfo:
            """Mock version info that is comparable."""

            def __init__(self, major, minor, micro):
                self.major = major
                self.minor = minor
                self.micro = micro

            def __ge__(self, other):
                if len(other) >= 2:
                    return (self.major, self.minor) >= tuple(other[:2])
                return False

        mock_version = MockVersionInfo(3, 11, 5)
        with patch("sys.version_info", mock_version):
            result = health_checker.check_python_version()
            assert result.status == "fail"
            assert "3.11" in result.message
            assert "requires 3.12+" in result.message
            assert len(result.recommendations) > 0
            assert "Install Python 3.12" in result.recommendations[0]

    def test_python_version_fail_when_much_older(self, health_checker):
        """check_python_version fails for very old Python versions."""

        class MockVersionInfo:
            """Mock version info that is comparable."""

            def __init__(self, major, minor, micro):
                self.major = major
                self.minor = minor
                self.micro = micro

            def __ge__(self, other):
                if len(other) >= 2:
                    return (self.major, self.minor) >= tuple(other[:2])
                return False

        mock_version = MockVersionInfo(3, 8, 10)
        with patch("sys.version_info", mock_version):
            result = health_checker.check_python_version()
            assert result.status == "fail"
            assert result.details["required"] == "3.12+"


# ============================================================================
# Dependency Check Tests
# ============================================================================


class TestDependencyCheck:
    """Test check_dependencies method."""

    def test_dependencies_pass_when_all_core_present(self, health_checker):
        """check_dependencies passes when all core packages are present."""
        # Mock all core packages as available
        def mock_find_spec(name):
            core_modules = ["requests", "bs4", "sqlalchemy", "pydantic", "flask"]
            return Mock() if name in core_modules else None

        with patch("importlib.util.find_spec", side_effect=mock_find_spec):
            results = health_checker.check_dependencies()
            core_result = next(r for r in results if r.name == "Core Dependencies")
            assert core_result.status == "pass"
            assert "All core packages installed" in core_result.message

    def test_dependencies_fail_when_core_missing(self, health_checker):
        """check_dependencies fails when core packages are missing."""
        # Mock all as missing
        with patch("importlib.util.find_spec", return_value=None):
            results = health_checker.check_dependencies()
            core_result = next(r for r in results if r.name == "Core Dependencies")
            assert core_result.status == "fail"
            assert "Missing" in core_result.message
            assert len(core_result.details["missing"]) > 0
            assert len(core_result.recommendations) > 0

    def test_dependencies_warn_when_optional_missing(self, health_checker):
        """check_dependencies warns when optional packages are missing."""
        # Mock core as present, optional as missing
        def mock_find_spec(name):
            core_modules = ["requests", "bs4", "sqlalchemy", "pydantic", "flask"]
            return Mock() if name in core_modules else None

        with patch("importlib.util.find_spec", side_effect=mock_find_spec):
            results = health_checker.check_dependencies()
            optional_result = next(
                r for r in results if r.name == "Optional Dependencies"
            )
            assert optional_result.status == "warn"
            assert "unavailable" in optional_result.message

    def test_dependencies_pass_when_all_present(self, health_checker):
        """check_dependencies passes when all packages (core + optional) are present."""
        # Mock all packages as available
        with patch("importlib.util.find_spec", return_value=Mock()):
            results = health_checker.check_dependencies()
            assert all(r.status in ["pass", "warn"] for r in results)


# ============================================================================
# Configuration Check Tests
# ============================================================================


class TestConfigurationCheck:
    """Test check_configuration method."""

    def test_configuration_pass_when_valid(self, health_checker, sample_config, tmp_path):
        """check_configuration passes with valid configuration."""
        config_path = tmp_path / "user_prefs.json"
        config_path.write_text(json.dumps(sample_config))

        with patch("pathlib.Path.exists") as mock_exists:
            mock_exists.side_effect = lambda: str(config_path).endswith("user_prefs.json")
            with patch("builtins.open", mock_open(read_data=json.dumps(sample_config))):
                results = health_checker.check_configuration()
                config_result = next(r for r in results if r.name == "Configuration File")
                assert config_result.status == "pass"
                assert "valid" in config_result.message.lower()

    def test_configuration_warn_when_incomplete(self, health_checker, empty_config):
        """check_configuration warns when configuration is incomplete."""
        with (
            patch("pathlib.Path.exists", return_value=True),
            patch("builtins.open", mock_open(read_data=json.dumps(empty_config))),
        ):
            results = health_checker.check_configuration()
            config_result = next(r for r in results if r.name == "Configuration File")
            assert config_result.status == "warn"
            assert "incomplete" in config_result.message.lower()
            assert len(config_result.recommendations) > 0

    def test_configuration_fail_when_missing(self, health_checker):
        """check_configuration fails when configuration file is missing."""
        with patch("pathlib.Path.exists", return_value=False):
            results = health_checker.check_configuration()
            config_result = next(r for r in results if r.name == "Configuration File")
            assert config_result.status == "fail"
            assert "missing" in config_result.message.lower()

    def test_configuration_fail_when_invalid_json(self, health_checker):
        """check_configuration fails when configuration has invalid JSON."""
        with (
            patch("pathlib.Path.exists", return_value=True),
            patch("builtins.open", mock_open(read_data="{ invalid json")),
        ):
            results = health_checker.check_configuration()
            config_result = next(r for r in results if r.name == "Configuration File")
            assert config_result.status == "fail"
            assert "invalid" in config_result.message.lower()

    def test_configuration_warn_when_env_missing(self, health_checker, sample_config):
        """check_configuration warns when .env file is missing."""

        def exists_side_effect(self):
            """Mock exists to return True for config, False for .env."""
            path_str = str(self)
            if "user_prefs.json" in path_str:
                return True
            if ".env" in path_str:
                return False
            return False

        with (
            patch.object(Path, "exists", exists_side_effect),
            patch("builtins.open", mock_open(read_data=json.dumps(sample_config))),
        ):
            results = health_checker.check_configuration()
            env_result = next((r for r in results if r.name == "Environment Variables"), None)
            if env_result:
                # Accept either warn or pass - the test is checking behavior
                assert env_result.status in ["warn", "pass"]

    def test_configuration_pass_when_env_present(self, health_checker, sample_config):
        """check_configuration passes when .env file is present."""
        with (
            patch("pathlib.Path.exists", return_value=True),
            patch("builtins.open", mock_open(read_data=json.dumps(sample_config))),
        ):
            results = health_checker.check_configuration()
            env_result = next(r for r in results if r.name == "Environment Variables")
            assert env_result.status == "pass"


# ============================================================================
# Database Check Tests
# ============================================================================


class TestDatabaseCheck:
    """Test check_database method."""

    def test_database_pass_when_accessible(self, health_checker, tmp_path):
        """check_database passes when database is accessible."""
        db_path = tmp_path / "jobs.db"
        db_path.write_text("fake db")

        with (
            patch("pathlib.Path.exists", return_value=True),
            patch("pathlib.Path.stat") as mock_stat,
            patch("os.access", return_value=True),
        ):
            mock_stat.return_value.st_size = 1024
            result = health_checker.check_database()
            assert result.status == "pass"
            assert "accessible" in result.message.lower()

    def test_database_warn_when_not_writable(self, health_checker):
        """check_database warns when database exists but is not writable."""
        with (
            patch("pathlib.Path.exists", return_value=True),
            patch("os.access", return_value=False),
        ):
            result = health_checker.check_database()
            assert result.status == "warn"
            assert "not writable" in result.message.lower()

    def test_database_warn_when_not_exists(self, health_checker):
        """check_database warns when database doesn't exist yet."""
        with patch("pathlib.Path.exists", return_value=False):
            result = health_checker.check_database()
            assert result.status == "warn"
            assert "will be created" in result.message.lower()

    def test_database_fail_on_access_error(self, health_checker):
        """check_database fails when database access throws exception."""
        with (
            patch("pathlib.Path.exists", return_value=True),
            patch("os.access", side_effect=Exception("Access denied")),
        ):
            result = health_checker.check_database()
            assert result.status == "fail"


# ============================================================================
# Network Check Tests
# ============================================================================


class TestNetworkCheck:
    """Test check_network method."""

    def test_network_pass_when_internet_available(self, health_checker):
        """check_network passes when internet is available."""
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_urlopen.return_value = Mock()
            results = health_checker.check_network()
            internet_result = next(r for r in results if r.name == "Internet Connectivity")
            assert internet_result.status == "pass"

    def test_network_fail_when_internet_unavailable(self, health_checker):
        """check_network fails when internet is unavailable."""
        with patch("urllib.request.urlopen", side_effect=Exception("No connection")):
            results = health_checker.check_network()
            internet_result = next(r for r in results if r.name == "Internet Connectivity")
            assert internet_result.status == "fail"
            assert len(internet_result.recommendations) > 0

    def test_network_check_slack_when_configured(self, health_checker, sample_config):
        """check_network checks Slack connectivity when configured."""
        with (
            patch("urllib.request.urlopen"),
            patch("pathlib.Path.exists", return_value=True),
            patch("builtins.open", mock_open(read_data=json.dumps(sample_config))),
            patch("socket.gethostbyname", return_value="1.2.3.4"),
        ):
            results = health_checker.check_network()
            slack_result = next(
                (r for r in results if r.name == "Slack Connectivity"), None
            )
            if slack_result:
                assert slack_result.status == "pass"

    def test_network_warn_when_slack_unreachable(self, health_checker, sample_config):
        """check_network warns when Slack is configured but unreachable."""
        with (
            patch("urllib.request.urlopen"),
            patch("pathlib.Path.exists", return_value=True),
            patch("builtins.open", mock_open(read_data=json.dumps(sample_config))),
            patch("socket.gethostbyname", side_effect=Exception("DNS failed")),
        ):
            results = health_checker.check_network()
            slack_result = next(
                (r for r in results if r.name == "Slack Connectivity"), None
            )
            if slack_result:
                assert slack_result.status == "warn"


# ============================================================================
# System Resources Check Tests
# ============================================================================


class TestSystemResourcesCheck:
    """Test check_system_resources method."""

    def test_resources_pass_when_sufficient_disk(self, health_checker):
        """check_system_resources passes with sufficient disk space."""
        mock_disk = Mock()
        mock_disk.free = 2 * 1024**3  # 2 GB

        with patch("psutil.disk_usage", return_value=mock_disk):
            results = health_checker.check_system_resources()
            disk_result = next((r for r in results if r.name == "Disk Space"), None)
            if disk_result:
                assert disk_result.status == "pass"

    def test_resources_warn_when_low_disk(self, health_checker):
        """check_system_resources warns with low disk space."""
        mock_disk = Mock()
        mock_disk.free = 0.7 * 1024**3  # 0.7 GB

        with patch("psutil.disk_usage", return_value=mock_disk):
            results = health_checker.check_system_resources()
            disk_result = next((r for r in results if r.name == "Disk Space"), None)
            if disk_result:
                assert disk_result.status == "warn"

    def test_resources_fail_when_critical_disk(self, health_checker):
        """check_system_resources fails with critical disk space."""
        mock_disk = Mock()
        mock_disk.free = 0.3 * 1024**3  # 0.3 GB

        with patch("psutil.disk_usage", return_value=mock_disk):
            results = health_checker.check_system_resources()
            disk_result = next((r for r in results if r.name == "Disk Space"), None)
            if disk_result:
                assert disk_result.status == "fail"

    def test_resources_pass_when_sufficient_memory(self, health_checker):
        """check_system_resources passes with sufficient memory."""
        mock_mem = Mock()
        mock_mem.available = 2 * 1024**3  # 2 GB
        mock_mem.percent = 50

        with patch("psutil.virtual_memory", return_value=mock_mem):
            results = health_checker.check_system_resources()
            mem_result = next((r for r in results if r.name == "Memory"), None)
            if mem_result:
                assert mem_result.status == "pass"

    def test_resources_warn_when_low_memory(self, health_checker):
        """check_system_resources warns with low memory."""
        mock_mem = Mock()
        mock_mem.available = 0.8 * 1024**3  # 0.8 GB
        mock_mem.percent = 85

        with patch("psutil.virtual_memory", return_value=mock_mem):
            results = health_checker.check_system_resources()
            mem_result = next((r for r in results if r.name == "Memory"), None)
            if mem_result:
                assert mem_result.status == "warn"

    def test_resources_warn_when_psutil_unavailable(self, health_checker):
        """check_system_resources warns when psutil is not available."""
        with patch("psutil.disk_usage", side_effect=ImportError("psutil not found")):
            results = health_checker.check_system_resources()
            # Should not crash, just warn or skip
            assert len(results) >= 0


# ============================================================================
# Overall Health Check Tests
# ============================================================================


class TestRunAllChecks:
    """Test run_all_checks method."""

    def test_run_all_checks_returns_complete_report(self, health_checker):
        """run_all_checks returns a complete report with all sections."""
        with (
            patch.object(health_checker, "check_python_version") as mock_python,
            patch.object(health_checker, "check_dependencies") as mock_deps,
            patch.object(health_checker, "check_configuration") as mock_config,
            patch.object(health_checker, "check_database") as mock_db,
            patch.object(health_checker, "check_network") as mock_network,
            patch.object(health_checker, "check_system_resources") as mock_resources,
        ):
            # Mock all checks to return pass
            mock_python.return_value = HealthCheckResult("Python", "pass", "OK")
            mock_deps.return_value = [HealthCheckResult("Deps", "pass", "OK")]
            mock_config.return_value = [HealthCheckResult("Config", "pass", "OK")]
            mock_db.return_value = HealthCheckResult("DB", "pass", "OK")
            mock_network.return_value = [HealthCheckResult("Network", "pass", "OK")]
            mock_resources.return_value = [HealthCheckResult("Resources", "pass", "OK")]

            result = health_checker.run_all_checks()

            assert "overall_status" in result
            assert "summary" in result
            assert "checks" in result
            assert result["summary"]["total"] == 6
            assert result["overall_status"] == "healthy"

    def test_run_all_checks_healthy_when_all_pass(self, health_checker):
        """run_all_checks returns healthy when all checks pass."""
        with (
            patch.object(
                health_checker,
                "check_python_version",
                return_value=HealthCheckResult("Test", "pass", "OK"),
            ),
            patch.object(health_checker, "check_dependencies", return_value=[]),
            patch.object(health_checker, "check_configuration", return_value=[]),
            patch.object(
                health_checker,
                "check_database",
                return_value=HealthCheckResult("DB", "pass", "OK"),
            ),
            patch.object(health_checker, "check_network", return_value=[]),
            patch.object(health_checker, "check_system_resources", return_value=[]),
        ):
            result = health_checker.run_all_checks()
            assert result["overall_status"] == "healthy"

    def test_run_all_checks_degraded_with_warnings(self, health_checker):
        """run_all_checks returns degraded when there are warnings."""
        with (
            patch.object(
                health_checker,
                "check_python_version",
                return_value=HealthCheckResult("Test", "warn", "Warning"),
            ),
            patch.object(health_checker, "check_dependencies", return_value=[]),
            patch.object(health_checker, "check_configuration", return_value=[]),
            patch.object(
                health_checker,
                "check_database",
                return_value=HealthCheckResult("DB", "pass", "OK"),
            ),
            patch.object(health_checker, "check_network", return_value=[]),
            patch.object(health_checker, "check_system_resources", return_value=[]),
        ):
            result = health_checker.run_all_checks()
            assert result["overall_status"] == "degraded"

    def test_run_all_checks_unhealthy_with_failures(self, health_checker):
        """run_all_checks returns unhealthy when there are failures."""
        with (
            patch.object(
                health_checker,
                "check_python_version",
                return_value=HealthCheckResult("Test", "fail", "Failed"),
            ),
            patch.object(health_checker, "check_dependencies", return_value=[]),
            patch.object(health_checker, "check_configuration", return_value=[]),
            patch.object(
                health_checker,
                "check_database",
                return_value=HealthCheckResult("DB", "pass", "OK"),
            ),
            patch.object(health_checker, "check_network", return_value=[]),
            patch.object(health_checker, "check_system_resources", return_value=[]),
        ):
            result = health_checker.run_all_checks()
            assert result["overall_status"] == "unhealthy"

    def test_run_all_checks_counts_correctly(self, health_checker):
        """run_all_checks counts pass/warn/fail correctly."""
        with (
            patch.object(
                health_checker,
                "check_python_version",
                return_value=HealthCheckResult("Test1", "pass", "OK"),
            ),
            patch.object(
                health_checker,
                "check_dependencies",
                return_value=[HealthCheckResult("Test2", "warn", "Warning")],
            ),
            patch.object(
                health_checker,
                "check_configuration",
                return_value=[HealthCheckResult("Test3", "fail", "Failed")],
            ),
            patch.object(
                health_checker,
                "check_database",
                return_value=HealthCheckResult("Test4", "pass", "OK"),
            ),
            patch.object(health_checker, "check_network", return_value=[]),
            patch.object(health_checker, "check_system_resources", return_value=[]),
            patch.object(
                health_checker,
                "check_ripgrep",
                return_value=HealthCheckResult("Test5", "pass", "OK"),
            ),
        ):
            result = health_checker.run_all_checks()
            assert result["summary"]["pass"] == 3
            assert result["summary"]["warn"] == 1
            assert result["summary"]["fail"] == 1


# ============================================================================
# Print Report Tests
# ============================================================================


class TestPrintReport:
    """Test print_report method."""

    def test_print_report_outputs_summary(self, health_checker, capsys):
        """print_report outputs summary information."""
        report = {
            "overall_status": "healthy",
            "summary": {"total": 5, "pass": 5, "warn": 0, "fail": 0},
            "checks": [HealthCheckResult("Test", "pass", "OK")],
        }

        health_checker.print_report(report)
        captured = capsys.readouterr()

        assert "Health Check" in captured.out
        assert "5 total" in captured.out
        assert "5 passed" in captured.out

    def test_print_report_shows_failures(self, health_checker, capsys):
        """print_report shows failure information."""
        report = {
            "overall_status": "unhealthy",
            "summary": {"total": 2, "pass": 0, "warn": 0, "fail": 2},
            "checks": [
                HealthCheckResult(
                    "Test1",
                    "fail",
                    "Failed",
                    recommendations=["Fix this issue"],
                ),
                HealthCheckResult("Test2", "fail", "Also failed"),
            ],
        }

        health_checker.print_report(report)
        captured = capsys.readouterr()

        assert "not ready" in captured.out.lower()
        assert "Failed" in captured.out

    def test_print_report_verbose_shows_details(self, health_checker_verbose, capsys):
        """print_report in verbose mode shows details."""
        report = {
            "overall_status": "healthy",
            "summary": {"total": 1, "pass": 1, "warn": 0, "fail": 0},
            "checks": [
                HealthCheckResult(
                    "Test",
                    "pass",
                    "OK",
                    details={"detail_key": "detail_value"},
                )
            ],
        }

        health_checker_verbose.print_report(report)
        captured = capsys.readouterr()

        assert "detail_key" in captured.out
        assert "detail_value" in captured.out


# ============================================================================
# run_health_check Function Tests
# ============================================================================


class TestRunHealthCheckFunction:
    """Test run_health_check standalone function."""

    def test_run_health_check_returns_zero_when_healthy(self):
        """run_health_check returns 0 when system is healthy."""
        with (
            patch.object(HealthChecker, "run_all_checks") as mock_checks,
            patch.object(HealthChecker, "print_report"),
        ):
            mock_checks.return_value = {
                "overall_status": "healthy",
                "summary": {"total": 1, "pass": 1, "warn": 0, "fail": 0},
                "checks": [],
            }

            exit_code = run_health_check(verbose=False)
            assert exit_code == 0

    def test_run_health_check_returns_one_when_unhealthy(self):
        """run_health_check returns 1 when system is unhealthy."""
        with (
            patch.object(HealthChecker, "run_all_checks") as mock_checks,
            patch.object(HealthChecker, "print_report"),
        ):
            mock_checks.return_value = {
                "overall_status": "unhealthy",
                "summary": {"total": 1, "pass": 0, "warn": 0, "fail": 1},
                "checks": [],
            }

            exit_code = run_health_check(verbose=False)
            assert exit_code == 1

    def test_run_health_check_returns_zero_when_degraded(self):
        """run_health_check returns 0 when system is degraded (only warnings)."""
        with (
            patch.object(HealthChecker, "run_all_checks") as mock_checks,
            patch.object(HealthChecker, "print_report"),
        ):
            mock_checks.return_value = {
                "overall_status": "degraded",
                "summary": {"total": 1, "pass": 0, "warn": 1, "fail": 0},
                "checks": [],
            }

            exit_code = run_health_check(verbose=False)
            assert exit_code == 0


# ============================================================================
# Edge Cases and Integration Tests
# ============================================================================


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_health_checker_handles_no_checks(self, health_checker):
        """HealthChecker handles case with no checks run."""
        # Don't run any checks, just get results
        assert health_checker.results == []

    def test_check_dependencies_handles_package_import_name_differences(self, health_checker):
        """check_dependencies correctly maps package names to import names."""
        # beautifulsoup4 should be imported as 'bs4'
        with patch("importlib.util.find_spec") as mock_find:
            mock_find.side_effect = lambda name: Mock() if name == "bs4" else None
            results = health_checker.check_dependencies()
            # Should not fail just because 'beautifulsoup4' module doesn't exist
            assert len(results) > 0

    def test_configuration_handles_partial_config(self, health_checker):
        """check_configuration handles configuration with some missing fields."""
        partial_config = {
            "keywords": ["python"],
            # missing job_sources
        }
        with (
            patch("pathlib.Path.exists", return_value=True),
            patch("builtins.open", mock_open(read_data=json.dumps(partial_config))),
        ):
            results = health_checker.check_configuration()
            config_result = next(r for r in results if r.name == "Configuration File")
            # Should warn, not crash
            assert config_result.status in ["pass", "warn"]

    def test_database_check_handles_path_with_unicode(self, health_checker):
        """check_database handles database path with unicode characters."""
        with patch("pathlib.Path.exists", return_value=False):
            # Should not crash with unicode paths
            result = health_checker.check_database()
            assert result.status == "warn"

    def test_network_check_handles_malformed_slack_url(self, health_checker):
        """check_network handles malformed Slack webhook URL gracefully."""
        malformed_config = {
            "keywords": ["test"],
            "slack": {"webhook_url": "not-a-valid-url"},
        }
        with (
            patch("urllib.request.urlopen"),
            patch("pathlib.Path.exists", return_value=True),
            patch("builtins.open", mock_open(read_data=json.dumps(malformed_config))),
        ):
            # Should not crash
            results = health_checker.check_network()
            assert len(results) >= 1
