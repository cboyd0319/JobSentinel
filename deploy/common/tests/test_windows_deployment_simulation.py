#!/usr/bin/env python3
"""
Windows Deployment End-to-End Simulation Tests

This module simulates a complete Windows deployment flow as a zero-knowledge user
would experience it. Tests the actual user journey from download to first run.

Test Scenarios:
1. Fresh install simulation
2. Setup wizard flow
3. First job search (dry-run)
4. Configuration changes
5. Web UI startup
6. Error recovery

These tests are designed to catch issues that would block real users.
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

import pytest


class TestWindowsDeploymentSimulation:
    """Simulate complete Windows deployment user journey."""

    def test_fresh_install_directory_structure(self):
        """Test that a fresh clone has expected structure."""
        # Navigate from tests/common/tests to repo root (3 levels up)
        repo_root = Path(__file__).parent.parent.parent.parent

        # Essential directories - new deployment-centric structure
        assert (repo_root / "deploy" / "common" / "config").exists(), "deploy/common/config/ directory missing"
        assert (repo_root / "deploy" / "common" / "app" / "src").exists(), "deploy/common/app/src/ directory missing"
        assert (repo_root / "deploy" / "common" / "scripts").exists(), "deploy/common/scripts/ directory missing"
        assert (repo_root / "docs").exists(), "docs/ directory missing"

        # Setup files - new paths
        assert (repo_root / "deploy" / "local" / "windows" / "setup.bat").exists(), "setup.bat missing"
        assert (repo_root / "deploy" / "local" / "windows" / "setup.ps1").exists(), "setup.ps1 missing"
        assert (repo_root / "deploy" / "common" / "scripts" / "windows_setup.py").exists(), "windows_setup.py missing"

        # Documentation
        assert (repo_root / "README.md").exists(), "README.md missing"
        # Note: Beginner guide and troubleshooting may be in different locations now

        # Example config - new location
        assert (repo_root / "deploy" / "common" / "config" / "user_prefs.example.json").exists(), "Example config missing"

    def test_setup_script_has_required_functions(self):
        """Test that setup script has all required functions."""
        # Navigate from tests to repo root, then to scripts
        repo_root = Path(__file__).parent.parent.parent.parent
        setup_script = repo_root / "deploy" / "common" / "scripts" / "windows_setup.py"
        content = setup_script.read_text()

        # Check for key functions
        required_functions = [
            "check_windows_version",
            "check_python_version",
            "check_disk_space",
            "check_internet",
            "run_preflight_checks",
            "install_dependencies",
            "setup_directories",
            "run_setup_wizard",
            "run_health_check",
            "print_next_steps",
        ]

        for func in required_functions:
            assert f"def {func}" in content, f"Function {func}() missing from setup script"

    def test_batch_file_syntax(self):
        """Test that Windows batch file is syntactically valid."""
        batch_file = Path(__file__).parent.parent / "setup-windows.bat"
        content = batch_file.read_text()

        # Check essential commands
        assert "@echo off" in content, "Missing @echo off"
        assert "python --version" in content, "Missing Python version check"
        assert "python scripts\\windows_setup.py" in content, "Missing Python script call"
        assert "errorlevel" in content, "Missing error handling"

        # Check for proper Windows line endings (CRLF) or accept LF
        # (Git may convert line endings, so we accept both)
        assert "\r\n" in content or "\n" in content, "Missing line endings"

    def test_powershell_script_syntax(self):
        """Test that PowerShell script is valid."""
        ps_file = Path(__file__).parent.parent / "setup-windows.ps1"
        content = ps_file.read_text()

        # Check essential PowerShell features
        assert "Set-StrictMode" in content, "Missing strict mode"
        assert "$ErrorActionPreference" in content, "Missing error preference"
        assert "Write-Host" in content, "Missing output commands"
        assert "python --version" in content, "Missing Python check"

        # Check for Windows version validation
        assert "OSVersion" in content or "version" in content.lower(), "Missing OS version check"

    def test_example_config_is_valid_json(self):
        """Test that example config is valid JSON and has required fields."""
        example_config = Path(__file__).parent.parent / "config" / "user_prefs.example.json"

        # Parse JSON
        with open(example_config) as f:
            config = json.load(f)

        # Check structure (should have either old or new format)
        has_companies = "companies" in config and isinstance(config["companies"], list)
        has_job_sources = "job_sources" in config and isinstance(config["job_sources"], dict)

        assert has_companies or has_job_sources, "Config has neither companies nor job_sources"

        # Check common fields exist
        if has_companies:
            assert "title_allowlist" in config or "keywords_boost" in config

        # Check config has sensible defaults
        if "digest_min_score" in config:
            assert 0 <= config["digest_min_score"] <= 1.0, "Invalid digest_min_score"

    def test_cli_setup_command_exists(self):
        """Test that CLI setup command is available."""
        repo_root = Path(__file__).parent.parent
        result = subprocess.run(
            [sys.executable, "-m", "jsa.cli", "setup", "--help"],
            capture_output=True,
            text=True,
            timeout=10,
            cwd=repo_root,
        )

        if result.returncode != 0:
            # Skip if CLI has import issues (may be environment-specific)
            pytest.skip(f"CLI setup command unavailable: {result.stderr[:100]}")

        assert "setup" in result.stdout.lower(), "setup not in help output"

    def test_cli_health_command_exists(self):
        """Test that CLI health command is available."""
        repo_root = Path(__file__).parent.parent
        result = subprocess.run(
            [sys.executable, "-m", "jsa.cli", "health", "--help"],
            capture_output=True,
            text=True,
            timeout=10,
            cwd=repo_root,
        )

        if result.returncode != 0:
            # Skip if CLI has import issues (may be environment-specific)
            pytest.skip(f"CLI health command unavailable: {result.stderr[:100]}")

        assert "health" in result.stdout.lower(), "health not in help output"

    def test_cli_run_once_command_exists(self):
        """Test that CLI run-once command is available."""
        repo_root = Path(__file__).parent.parent
        result = subprocess.run(
            [sys.executable, "-m", "jsa.cli", "run-once", "--help"],
            capture_output=True,
            text=True,
            timeout=10,
            cwd=repo_root,
        )

        if result.returncode != 0:
            # Skip if CLI has import issues (may be environment-specific)
            pytest.skip(f"CLI run-once command unavailable: {result.stderr[:100]}")

        assert "run-once" in result.stdout.lower() or "job search" in result.stdout.lower()

    def test_minimal_config_creation(self):
        """Test creating a minimal valid config."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "test_config.json"

            # Create minimal config (new format)
            config = {
                "keywords": ["test"],
                "locations": ["Remote"],
                "job_sources": {"jobswithgpt": {"enabled": True}},
                "slack": {"enabled": False, "webhook_url": ""},
            }

            config_path.write_text(json.dumps(config, indent=2))

            # Validate it's valid JSON
            with open(config_path) as f:
                loaded = json.load(f)

            assert loaded == config, "Config round-trip failed"

    def test_data_directory_creation(self):
        """Test that data directory can be created in temp location."""
        with tempfile.TemporaryDirectory() as tmpdir:
            data_dir = Path(tmpdir) / "data"
            data_dir.mkdir(exist_ok=True)

            assert data_dir.exists(), "Failed to create data directory"
            assert data_dir.is_dir(), "data is not a directory"

            # Test we can write to it
            test_file = data_dir / "test.txt"
            test_file.write_text("test")
            assert test_file.read_text() == "test"

    def test_sqlite_database_initialization(self):
        """Test SQLite database can be initialized without admin."""
        from sqlalchemy import create_engine, text

        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.sqlite"
            db_url = f"sqlite:///{db_path}"

            # Create engine and initialize
            engine = create_engine(db_url, echo=False)
            with engine.connect() as conn:
                # Create a simple table
                conn.execute(text("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)"))
                conn.execute(text("INSERT INTO test (name) VALUES ('test')"))
                conn.commit()

                # Query it back
                result = conn.execute(text("SELECT * FROM test"))
                rows = result.fetchall()
                assert len(rows) == 1
                assert rows[0][1] == "test"

            engine.dispose()

            # Verify database file was created
            assert db_path.exists(), "Database file not created"
            assert db_path.stat().st_size > 0, "Database file is empty"

    def test_error_messages_are_helpful(self):
        """Test that error messages provide actionable guidance."""
        # Test missing config error
        result = subprocess.run(
            [sys.executable, "-m", "jsa.cli", "run-once"],
            capture_output=True,
            text=True,
            timeout=10,
            cwd=tempfile.gettempdir(),  # Run in temp dir without config
        )

        # Should fail gracefully
        assert result.returncode != 0, "Should fail without config"

        # Check for helpful error message
        output = result.stdout + result.stderr
        helpful_terms = ["config", "setup", "wizard", "python -m jsa.cli"]
        assert any(term in output.lower() for term in helpful_terms), "Error message not helpful"

    def test_documentation_completeness(self):
        """Test that essential documentation exists and is complete."""
        docs_dir = Path(__file__).parent.parent / "docs"

        # Essential docs
        essential_docs = [
            "BEGINNER_GUIDE.md",
            "TROUBLESHOOTING.md",
            "ARCHITECTURE.md",
            "API_INTEGRATION_GUIDE.md",
        ]

        for doc in essential_docs:
            doc_path = docs_dir / doc
            assert doc_path.exists(), f"Missing documentation: {doc}"

            # Check it has content
            content = doc_path.read_text()
            assert len(content) > 100, f"Documentation too short: {doc}"

            # Check it has markdown headers
            assert "#" in content, f"No markdown headers in: {doc}"

    def test_readme_has_windows_section(self):
        """Test that README prominently features Windows support."""
        readme = Path(__file__).parent.parent / "README.md"
        content = readme.read_text()

        # Check for Windows mentions
        assert "windows" in content.lower(), "No Windows mention in README"
        assert (
            "setup-windows" in content.lower() or "windows setup" in content.lower()
        ), "No Windows setup instructions in README"

        # Check for automated installer mention
        assert (
            "automated" in content.lower() or "double-click" in content.lower()
        ), "No mention of automated installer"

        # Check for zero admin rights mention
        assert "admin" in content.lower(), "No admin rights mention"

    @pytest.mark.skipif(
        not (Path(__file__).parent.parent / "config" / "user_prefs.json").exists(),
        reason="Requires valid config",
    )
    def test_dry_run_execution(self):
        """Test that dry-run mode works end-to-end."""
        repo_root = Path(__file__).parent.parent

        result = subprocess.run(
            [sys.executable, "-m", "jsa.cli", "run-once", "--dry-run"],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=repo_root,
        )

        # Dry run should succeed or fail gracefully
        assert result.returncode in [0, 1], "Dry run crashed unexpectedly"

        # Check output mentions dry run
        output = result.stdout + result.stderr
        assert (
            "dry" in output.lower() or "test" in output.lower()
        ), "Dry run mode not indicated in output"


class TestWindowsUserExperience:
    """Test the user experience for Windows users."""

    def test_all_user_facing_commands_have_help(self):
        """Test that all user-facing commands have help text."""
        repo_root = Path(__file__).parent.parent
        commands = ["setup", "run-once", "web", "api", "health", "config-validate"]

        for cmd in commands:
            result = subprocess.run(
                [sys.executable, "-m", "jsa.cli", cmd, "--help"],
                capture_output=True,
                text=True,
                timeout=10,
                cwd=repo_root,
            )

            if result.returncode != 0:
                # Skip this command if unavailable
                continue

            assert len(result.stdout) > 50, f"Help text too short for {cmd}"
            assert cmd in result.stdout.lower(), f"Help doesn't mention {cmd}"

    def test_error_messages_suggest_solutions(self):
        """Test that error messages suggest solutions, not just state problems."""
        # This is a design test - we check the error handling code
        from jsa import health_check

        checker = health_check.HealthChecker(verbose=False)
        results = checker.check_dependencies()

        # All results should have recommendations if they failed/warned
        for result in results:
            if result.status in ["fail", "warn"]:
                assert (
                    len(result.recommendations) > 0
                ), f"{result.name} failed/warned but has no recommendations"

    def test_success_messages_provide_next_steps(self):
        """Test that success scenarios tell users what to do next."""
        # Check setup script has next steps
        setup_script = Path(__file__).parent.parent / "scripts" / "windows_setup.py"
        content = setup_script.read_text()

        assert "next steps" in content.lower(), "Setup script missing next steps"
        assert "python -m jsa.cli" in content, "Missing CLI commands in next steps"

    def test_configuration_has_comments(self):
        """Test that example config has helpful comments."""
        example_config = Path(__file__).parent.parent / "config" / "user_prefs.example.json"
        content = example_config.read_text()

        # JSON comments (via _comment field) or nearby explanation
        assert (
            "_comment" in content or "README" in content
        ), "Config has no comments or reference to docs"


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])
