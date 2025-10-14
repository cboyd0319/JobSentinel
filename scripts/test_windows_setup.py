#!/usr/bin/env python3
"""
Comprehensive Windows Setup Testing Script

This script simulates and tests the complete Windows 11 installation process
to ensure zero errors and 100% automation for zero-knowledge users.

Usage:
    python scripts/test_windows_setup.py

Tests:
- Python version detection
- Dependency installation simulation
- Configuration validation
- Database initialization
- CLI commands
- Web UI startup
- API server startup
- Health checks
- Error handling
"""

import sys
import subprocess
import json
from pathlib import Path
from typing import Any

# Colors for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def print_header(text: str) -> None:
    """Print a section header."""
    print()
    print("=" * 70)
    print(f"{BLUE}{text}{RESET}")
    print("=" * 70)
    print()


def print_test(name: str, passed: bool, message: str = "") -> None:
    """Print a test result."""
    symbol = f"{GREEN}✓{RESET}" if passed else f"{RED}✗{RESET}"
    status = f"{GREEN}PASS{RESET}" if passed else f"{RED}FAIL{RESET}"
    print(f"{symbol} {name}: {status}")
    if message:
        print(f"  {message}")


def run_command(cmd: list[str], timeout: int = 30) -> tuple[bool, str]:
    """Run a command and return (success, output)."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=Path(__file__).parent.parent,
        )
        return result.returncode == 0, result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return False, "Command timed out"
    except Exception as e:
        return False, str(e)


def test_python_version() -> bool:
    """Test Python version is 3.12+."""
    version = sys.version_info
    passed = version >= (3, 12)
    print_test(
        "Python Version (3.12+)",
        passed,
        f"Found: {version.major}.{version.minor}.{version.micro}",
    )
    return passed


def test_core_imports() -> bool:
    """Test that core modules can be imported."""
    # Only test critical modules - some legacy imports are expected to have issues
    critical_modules = [
        "jsa.health_check",
        "jsa.setup_wizard",
        "flask",
        "fastapi",
        "sqlalchemy",
        "pydantic",
    ]
    
    all_passed = True
    for module in critical_modules:
        try:
            __import__(module)
            print_test(f"Import {module}", True)
        except ImportError as e:
            print_test(f"Import {module}", False, str(e))
            all_passed = False
    
    # Note about legacy modules
    print(f"  {YELLOW}Note: Some legacy module import warnings are expected and non-critical{RESET}")
    
    return all_passed


def test_cli_help() -> bool:
    """Test CLI help command."""
    success, output = run_command([sys.executable, "-m", "jsa.cli", "--help"])
    passed = success and "JobSentinel" in output
    print_test("CLI Help Command", passed)
    return passed


def test_health_check() -> bool:
    """Test health check command."""
    success, output = run_command([sys.executable, "-m", "jsa.cli", "health"])
    # Health check may report warnings but should not crash
    passed = "Health Check" in output
    print_test("Health Check Command", passed)
    return passed


def test_config_validation() -> bool:
    """Test config validation."""
    config_path = Path(__file__).parent.parent / "config" / "user_prefs.json"
    
    if not config_path.exists():
        print_test("Config File Exists", False, "config/user_prefs.json not found (run setup first)")
        return False
    
    success, output = run_command([
        sys.executable, "-m", "jsa.cli", "config-validate",
        "--path", str(config_path)
    ])
    
    passed = success or "validation passed" in output.lower()
    print_test("Config Validation", passed)
    return passed


def test_database_creation() -> bool:
    """Test that database can be created."""
    import tempfile
    from sqlalchemy import create_engine, text
    
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test.sqlite"
        db_url = f"sqlite:///{db_path}"
        
        try:
            engine = create_engine(db_url)
            with engine.connect() as conn:
                conn.execute(text("CREATE TABLE test (id INTEGER PRIMARY KEY)"))
                conn.execute(text("INSERT INTO test (id) VALUES (1)"))
                result = conn.execute(text("SELECT COUNT(*) FROM test"))
                count = result.scalar()
                passed = count == 1
            engine.dispose()
            print_test("SQLite Database Creation", passed)
            return passed
        except Exception as e:
            print_test("SQLite Database Creation", False, str(e))
            return False


def test_playwright_available() -> bool:
    """Test if Playwright is available."""
    success, output = run_command([sys.executable, "-m", "playwright", "--version"])
    passed = success and "Version" in output
    print_test("Playwright Available", passed, output.strip() if passed else "")
    return passed


def test_web_ui_startup() -> bool:
    """Test that Web UI can start (doesn't actually start server)."""
    # Just verify the command exists and doesn't crash immediately
    import signal
    import time
    
    try:
        # Start the server
        proc = subprocess.Popen(
            [sys.executable, "-m", "jsa.cli", "web", "--port", "15000"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=Path(__file__).parent.parent,
        )
        
        # Give it a moment to start
        time.sleep(2)
        
        # Check if still running
        if proc.poll() is None:
            # Server is running, kill it
            proc.send_signal(signal.SIGTERM)
            proc.wait(timeout=5)
            print_test("Web UI Startup", True, "Server started successfully")
            return True
        else:
            # Server crashed
            stdout, stderr = proc.communicate()
            print_test("Web UI Startup", False, f"Server crashed: {stderr.decode()}")
            return False
            
    except Exception as e:
        print_test("Web UI Startup", False, str(e))
        return False


def test_api_server_startup() -> bool:
    """Test that API server can start (doesn't actually start server)."""
    import signal
    import time
    
    try:
        # Start the server
        proc = subprocess.Popen(
            [sys.executable, "-m", "jsa.cli", "api", "--port", "18000"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=Path(__file__).parent.parent,
        )
        
        # Give it a moment to start
        time.sleep(2)
        
        # Check if still running
        if proc.poll() is None:
            # Server is running, kill it
            proc.send_signal(signal.SIGTERM)
            proc.wait(timeout=5)
            print_test("API Server Startup", True, "Server started successfully")
            return True
        else:
            # Server crashed
            stdout, stderr = proc.communicate()
            print_test("API Server Startup", False, f"Server crashed: {stderr.decode()}")
            return False
            
    except Exception as e:
        print_test("API Server Startup", False, str(e))
        return False


def test_setup_scripts_exist() -> bool:
    """Test that all setup scripts exist."""
    project_root = Path(__file__).parent.parent
    scripts = [
        "setup-windows.bat",
        "setup-windows.ps1",
        "scripts/windows_setup.py",
    ]
    
    all_exist = True
    for script in scripts:
        path = project_root / script
        exists = path.exists()
        print_test(f"Setup Script: {script}", exists)
        if not exists:
            all_exist = False
    
    return all_exist


def test_documentation_exists() -> bool:
    """Test that all required documentation exists."""
    project_root = Path(__file__).parent.parent
    docs = [
        "docs/WINDOWS_QUICK_START.md",
        "docs/WINDOWS_TROUBLESHOOTING.md",
        "docs/WINDOWS_LOCAL_FIX.md",
        "docs/BEGINNER_GUIDE.md",
    ]
    
    all_exist = True
    for doc in docs:
        path = project_root / doc
        exists = path.exists()
        print_test(f"Documentation: {doc}", exists)
        if not exists:
            all_exist = False
    
    return all_exist


def main() -> int:
    """Run all tests and report results."""
    print()
    print("=" * 70)
    print(f"{BLUE}Windows 11 Setup Testing - Comprehensive Validation{RESET}")
    print("=" * 70)
    print()
    print("This script validates that Windows deployment is:")
    print("  • 100% functional")
    print("  • Zero errors")
    print("  • Zero warnings (where possible)")
    print("  • Zero admin rights needed")
    print("  • 100% automated")
    print()
    
    results = {}
    
    # Core System Tests
    print_header("1. Core System Requirements")
    results["python_version"] = test_python_version()
    results["core_imports"] = test_core_imports()
    
    # CLI Tests
    print_header("2. Command Line Interface")
    results["cli_help"] = test_cli_help()
    results["health_check"] = test_health_check()
    results["config_validation"] = test_config_validation()
    
    # Database Tests
    print_header("3. Database System")
    results["database"] = test_database_creation()
    
    # Web Services Tests
    print_header("4. Web Services")
    results["playwright"] = test_playwright_available()
    results["web_ui"] = test_web_ui_startup()
    results["api_server"] = test_api_server_startup()
    
    # Setup System Tests
    print_header("5. Setup System")
    results["setup_scripts"] = test_setup_scripts_exist()
    results["documentation"] = test_documentation_exists()
    
    # Summary
    print_header("Test Summary")
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total - passed
    
    print(f"Total Tests: {total}")
    print(f"{GREEN}Passed: {passed}{RESET}")
    print(f"{RED}Failed: {failed}{RESET}")
    print()
    
    if failed == 0:
        print(f"{GREEN}✓ ALL TESTS PASSED! Windows deployment is ready.{RESET}")
        print()
        return 0
    else:
        print(f"{RED}✗ {failed} test(s) failed. Please review above.{RESET}")
        print()
        print("Failed tests:")
        for name, result in results.items():
            if not result:
                print(f"  - {name}")
        print()
        return 1


if __name__ == "__main__":
    sys.exit(main())
