from __future__ import annotations

import argparse
import sys
from pathlib import Path
from collections.abc import Callable
from typing import cast

from jsa.config import ConfigService
from jsa.db import get_stats_sync


def _cmd_web(args: argparse.Namespace) -> int:
    # Lazy import to avoid hard dependency during CLI parsing/tests
    from jsa.web.app import create_app

    try:
        app = create_app()
        print(f"✓ Starting JobSentinel Web UI on http://localhost:{args.port}")
        print("✓ Press Ctrl+C to stop the server")
        print()
        app.run(debug=args.debug, port=args.port)
        return 0
    except ImportError as e:
        print(f"Error: Missing required dependencies: {e}")
        print("Install with: pip install -e '.[dev]'")
        return 1
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"Error: Port {args.port} is already in use")
            print(f"Try a different port: python -m jsa.cli web --port {args.port + 1}")
        else:
            print(f"Error: {e}")
        return 1
    except Exception as e:
        print(f"Error starting web server: {e}")
        print("Run 'python -m jsa.cli health' to diagnose issues")
        return 1


def _cmd_config_validate(args: argparse.Namespace) -> int:
    import json

    config_path = Path(args.path)
    schema_path = Path("config/user_prefs.schema.json")

    # Load and parse config file
    try:
        with open(config_path, encoding="utf-8") as f:
            config_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: Config file not found: {config_path}")
        print("Create one from the example:")
        print(f"  cp config/user_prefs.example.json {config_path}")
        print("Or run the setup wizard:")
        print("  python -m jsa.cli setup")
        return 1
    except json.JSONDecodeError as e:
        print("Error: Invalid JSON in config file")
        print(f"  {e}")
        print("Tip: Check for missing commas, quotes, or brackets")
        print("Validate JSON online: https://jsonlint.com/")
        return 1

    # Validate against JSON schema if available
    if schema_path.exists():
        try:
            import jsonschema

            with open(schema_path, encoding="utf-8") as f:
                schema = json.load(f)

            jsonschema.validate(instance=config_data, schema=schema)
            print("✓ JSON Schema validation passed")
        except ImportError:
            print("Warning: jsonschema not installed, skipping schema validation")
            print("Install with: pip install jsonschema")
        except jsonschema.ValidationError as e:
            print("Error: Schema validation failed")
            print(f"  {e.message}")
            if e.path:
                print(f"  At: {'.'.join(str(p) for p in e.path)}")
            return 1
        except Exception as e:
            print(f"Warning: Schema validation error: {e}")
    else:
        print(f"Warning: Schema file not found: {schema_path}")

    # Validate with ConfigService
    try:
        svc = ConfigService(config_path=config_path)
        prefs = svc.user_preferences()
        print("✓ Config loaded successfully")
        print(f"  - Keywords boost: {len(prefs.keywords_boost)}")
        print(f"  - Digest min score: {prefs.digest_min_score}")
        print(f"  - Companies: {len(config_data.get('companies', []))}")
        print(f"  - Title allowlist: {len(config_data.get('title_allowlist', []))}")
        return 0
    except Exception as e:
        print(f"Error: Config validation failed: {e}")
        return 1


def _cmd_health(args: argparse.Namespace) -> int:
    """Run comprehensive health check."""
    from jsa.health_check import run_health_check

    result = run_health_check(verbose=args.verbose)
    return int(result)


def _cmd_health_legacy(_: argparse.Namespace) -> int:
    """Legacy health check (database only)."""
    try:
        stats = get_stats_sync()
        print(
            "HEALTH ok total_jobs={} high_score_jobs={}".format(
                stats.get("total_jobs"), stats.get("high_score_jobs")
            )
        )
        return 0
    except Exception as e:
        print(f"HEALTH degraded: {e}")
        return 1


def _cmd_setup(_: argparse.Namespace) -> int:
    """Run interactive setup wizard."""
    from jsa.setup_wizard import run_wizard

    run_wizard()
    return 0


def _cmd_api(args: argparse.Namespace) -> int:
    """Run FastAPI server (modern REST API)."""
    try:
        import uvicorn
    except ImportError:
        print("Error: uvicorn not installed")
        print("Install with: pip install -e .")
        return 1

    try:
        from jsa.fastapi_app import create_app

        app = create_app()
        print(f"✓ Starting JobSentinel API server on http://{args.host}:{args.port}")
        print(f"✓ API docs available at http://{args.host}:{args.port}/api/docs")
        print("✓ Press Ctrl+C to stop the server")
        print()
        uvicorn.run(
            app,
            host=args.host,
            port=args.port,
            log_level=args.log_level.lower(),
            reload=args.reload,
        )
        return 0
    except ImportError as e:
        print(f"Error: Missing required dependencies: {e}")
        print("Install with: pip install -e '.[dev]'")
        return 1
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"Error: Port {args.port} is already in use")
            print(f"Try a different port: python -m jsa.cli api --port {args.port + 1}")
        else:
            print(f"Error: {e}")
        return 1
    except Exception as e:
        print(f"Error starting API server: {e}")
        print("Run 'python -m jsa.cli health' to diagnose issues")
        return 1


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="jsa", description="Job Search Automation CLI")
    sub = p.add_subparsers(dest="cmd", required=True)

    p_setup = sub.add_parser("setup", help="Interactive setup wizard for first-time configuration")
    p_setup.set_defaults(func=_cmd_setup)

    p_web = sub.add_parser("web", help="Run local web UI (Flask)")
    p_web.add_argument("--port", type=int, default=5000)
    p_web.add_argument("--debug", action="store_true")
    p_web.set_defaults(func=_cmd_web)

    p_api = sub.add_parser("api", help="Run FastAPI server (modern REST API)")
    p_api.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind to")
    p_api.add_argument("--port", type=int, default=8000, help="Port to bind to")
    p_api.add_argument("--reload", action="store_true", help="Enable auto-reload on code changes")
    p_api.add_argument(
        "--log-level",
        type=str,
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Log level",
    )
    p_api.set_defaults(func=_cmd_api)

    p_cfg = sub.add_parser("config-validate", help="Validate configuration file")
    p_cfg.add_argument("--path", type=str, default="config/user_prefs.json")
    p_cfg.set_defaults(func=_cmd_config_validate)

    p_health = sub.add_parser("health", help="Run comprehensive system health check")
    p_health.add_argument("--verbose", "-v", action="store_true", help="Show detailed information")
    p_health.set_defaults(func=_cmd_health)

    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    func = cast(Callable[[argparse.Namespace], int], args.func)
    return func(args)


if __name__ == "__main__":  # pragma: no cover - main entrypoint
    raise SystemExit(main(sys.argv[1:]))
