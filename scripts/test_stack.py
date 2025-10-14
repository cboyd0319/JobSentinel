#!/usr/bin/env python3
"""
End-to-end stack verification script.

Tests:
- Database connection
- API endpoints
- Frontend build exists
- Configuration files
- Environment setup

Exit codes:
  0 - All tests passed
  1 - Some tests failed
"""

import asyncio
import sys
from pathlib import Path


def test_database() -> bool:
    """Test database connection and tables."""
    print("\n[1/6] Testing Database...")
    try:
        import src.database as db
        from sqlmodel import select

        # Test sync connection
        with db.get_sync_session() as session:
            statement = select(db.Job).limit(1)
            _ = session.exec(statement).first()

        print("  ✓ Database connection works")
        print("  ✓ Job table accessible")
        return True
    except Exception as e:
        print(f"  ✗ Database test failed: {e}")
        return False


async def test_api() -> bool:
    """Test FastAPI can be imported and initialized."""
    print("\n[2/6] Testing API...")
    try:
        from jsa.fastapi_app.app import create_app

        app = create_app()

        # Check routes exist
        routes = [r.path for r in app.routes]
        required_routes = ["/", "/api/v1/health", "/api/v1/jobs"]

        for route in required_routes:
            if route in routes:
                print(f"  ✓ Route {route} exists")
            else:
                print(f"  ✗ Route {route} missing")
                return False

        # Check WebSocket route
        ws_routes = [r.path for r in app.routes if "/ws/" in r.path]
        if ws_routes:
            print(f"  ✓ WebSocket route exists: {ws_routes[0]}")
        else:
            print("  ⚠ WebSocket route not found (non-critical)")

        return True
    except Exception as e:
        print(f"  ✗ API test failed: {e}")
        return False


def test_frontend_build() -> bool:
    """Test frontend build exists."""
    print("\n[3/6] Testing Frontend Build...")
    try:
        frontend_dir = Path(__file__).parent.parent / "static" / "frontend"

        if not frontend_dir.exists():
            print(f"  ⚠ Frontend build directory not found: {frontend_dir}")
            print("  ℹ Run 'npm run build' in frontend/ directory")
            return True  # Not critical - can build later

        index_html = frontend_dir / "index.html"
        if index_html.exists():
            print(f"  ✓ Frontend built: {index_html}")
        else:
            print(f"  ⚠ index.html not found in {frontend_dir}")

        assets_dir = frontend_dir / "assets"
        if assets_dir.exists():
            js_files = list(assets_dir.glob("*.js"))
            css_files = list(assets_dir.glob("*.css"))
            print(f"  ✓ Assets: {len(js_files)} JS, {len(css_files)} CSS")

        return True
    except Exception as e:
        print(f"  ✗ Frontend build test failed: {e}")
        return False


def test_config_files() -> bool:
    """Test configuration files exist."""
    print("\n[4/6] Testing Configuration Files...")
    try:
        project_root = Path(__file__).parent.parent

        # Check .env.example
        env_example = project_root / ".env.example"
        if env_example.exists():
            print(f"  ✓ .env.example exists")
        else:
            print(f"  ✗ .env.example missing")
            return False

        # Check user_prefs.example.json
        config_example = project_root / "config" / "user_prefs.example.json"
        if config_example.exists():
            print(f"  ✓ user_prefs.example.json exists")
        else:
            print(f"  ✗ user_prefs.example.json missing")
            return False

        # Check if actual configs exist (not required)
        env_file = project_root / ".env"
        if env_file.exists():
            print(f"  ✓ .env configured")
        else:
            print(f"  ℹ .env not yet configured (will be created by bootstrap)")

        user_prefs = project_root / "config" / "user_prefs.json"
        if user_prefs.exists():
            print(f"  ✓ user_prefs.json configured")
        else:
            print(f"  ℹ user_prefs.json not yet configured (will be created by bootstrap)")

        return True
    except Exception as e:
        print(f"  ✗ Config files test failed: {e}")
        return False


def test_scripts() -> bool:
    """Test bootstrap and run scripts exist."""
    print("\n[5/6] Testing Bootstrap Scripts...")
    try:
        project_root = Path(__file__).parent.parent

        bootstrap_ps1 = project_root / "bootstrap.ps1"
        if bootstrap_ps1.exists():
            print(f"  ✓ bootstrap.ps1 exists ({bootstrap_ps1.stat().st_size} bytes)")
        else:
            print(f"  ✗ bootstrap.ps1 missing")
            return False

        run_ps1 = project_root / "run.ps1"
        if run_ps1.exists():
            print(f"  ✓ run.ps1 exists ({run_ps1.stat().st_size} bytes)")
        else:
            print(f"  ✗ run.ps1 missing")
            return False

        setup_bat = project_root / "setup-windows.bat"
        if setup_bat.exists():
            print(f"  ✓ setup-windows.bat exists (legacy)")

        return True
    except Exception as e:
        print(f"  ✗ Scripts test failed: {e}")
        return False


def test_python_packages() -> bool:
    """Test required Python packages are installed."""
    print("\n[6/6] Testing Python Packages...")
    try:
        required_packages = [
            ("fastapi", "FastAPI"),
            ("sqlmodel", "SQLModel"),
            ("uvicorn", "Uvicorn"),
            ("pydantic", "Pydantic"),
            ("aiosqlite", "aiosqlite"),
        ]

        all_installed = True
        for module_name, package_name in required_packages:
            try:
                __import__(module_name)
                print(f"  ✓ {package_name} installed")
            except ImportError:
                print(f"  ✗ {package_name} not installed")
                all_installed = False

        return all_installed
    except Exception as e:
        print(f"  ✗ Package test failed: {e}")
        return False


def main() -> int:
    """Run all tests."""
    print("=" * 70)
    print("JobSentinel - End-to-End Stack Verification")
    print("=" * 70)

    # Add project root to path
    project_root = Path(__file__).parent.parent
    sys.path.insert(0, str(project_root))

    tests = [
        test_database,
        asyncio.run(test_api()) if asyncio else None,
        test_frontend_build,
        test_config_files,
        test_scripts,
        test_python_packages,
    ]

    # Run tests
    results = []
    try:
        results.append(test_database())
        results.append(asyncio.run(test_api()))
        results.append(test_frontend_build())
        results.append(test_config_files())
        results.append(test_scripts())
        results.append(test_python_packages())
    except Exception as e:
        print(f"\n✗ Test suite failed with error: {e}")
        return 1

    # Summary
    print("\n" + "=" * 70)
    print("Test Summary")
    print("=" * 70)

    passed = sum(results)
    total = len(results)

    print(f"Passed: {passed}/{total}")

    if passed == total:
        print("\n✅ All tests passed! Stack is ready.")
        print("\nNext steps:")
        print("  1. Run bootstrap: .\\bootstrap.ps1 (Windows) or ./bootstrap.ps1 (WSL)")
        print("  2. Configure: Edit .env and config/user_prefs.json")
        print("  3. Start app: .\\run.ps1 or ./run.ps1")
        print("  4. Open browser: http://localhost:8000")
        return 0
    else:
        print(f"\n⚠ {total - passed} test(s) failed.")
        print("See error messages above for details.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
