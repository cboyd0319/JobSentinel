from __future__ import annotations

import argparse
import subprocess
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


def _cmd_privacy(args: argparse.Namespace) -> int:
    """Display privacy dashboard with complete data transparency."""
    try:
        from jsa.privacy_dashboard import PrivacyDashboard

        dashboard = PrivacyDashboard()

        if args.export:
            report = dashboard.generate_privacy_report()
            import json
            from datetime import datetime

            output_file = f"privacy_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(output_file, "w") as f:
                # Convert report to dict for JSON serialization
                report_dict = {
                    "total_items": report.total_items,
                    "total_size_bytes": report.total_size_bytes,
                    "data_categories": report.data_categories,
                    "pii_items": report.pii_items,
                    "oldest_data": report.oldest_data,
                    "newest_data": report.newest_data,
                    "telemetry_status": report.telemetry_status,
                    "external_connections": report.external_connections,
                    "inventory": [
                        {
                            "category": item.category,
                            "item_type": item.item_type,
                            "location": item.location,
                            "size_bytes": item.size_bytes,
                            "count": item.count,
                            "created_at": item.created_at,
                            "last_modified": item.last_modified,
                            "purpose": item.purpose,
                            "contains_pii": item.contains_pii,
                        }
                        for item in report.inventory
                    ],
                }
                json.dump(report_dict, f, indent=2)
            print(f"✓ Privacy report exported to: {output_file}")
            return 0
        else:
            dashboard.display_privacy_dashboard()
            return 0

    except ImportError as e:
        print(f"Error: Missing required dependencies: {e}")
        print("Install with: pip install -e '.[dev]'")
        return 1
    except Exception as e:
        print(f"Error: {e}")
        return 1


def _cmd_backup_create(args: argparse.Namespace) -> int:
    """Create a new backup."""
    try:
        from jsa.backup_restore import BackupManager

        manager = BackupManager()
        backup_file = manager.create_backup(
            backup_name=args.name,
            include_logs=args.include_logs,
            compress=not args.no_compress,
        )
        print(f"✓ Backup stored at: {backup_file}")
        return 0

    except ImportError as e:
        print(f"Error: Missing required dependencies: {e}")
        print("Install with: pip install -e '.[dev]'")
        return 1
    except Exception as e:
        print(f"Error: {e}")
        return 1


def _cmd_backup_list(args: argparse.Namespace) -> int:
    """List available backups."""
    try:
        from jsa.backup_restore import BackupManager

        manager = BackupManager()
        manager.display_backups()
        return 0

    except ImportError as e:
        print(f"Error: Missing required dependencies: {e}")
        print("Install with: pip install -e '.[dev]'")
        return 1
    except Exception as e:
        print(f"Error: {e}")
        return 1


def _cmd_backup_restore(args: argparse.Namespace) -> int:
    """Restore from a backup."""
    try:
        from jsa.backup_restore import BackupManager

        manager = BackupManager()
        success = manager.restore_backup(
            backup_path=args.backup_file,
            verify=not args.no_verify,
        )
        return 0 if success else 1

    except ImportError as e:
        print(f"Error: Missing required dependencies: {e}")
        print("Install with: pip install -e '.[dev]'")
        return 1
    except Exception as e:
        print(f"Error: {e}")
        return 1


def _cmd_run_once(args: argparse.Namespace) -> int:
    """Run job scraping once (single execution)."""
    import os

    # Check if config exists
    config_path = Path("config/user_prefs.json")
    if not config_path.exists():
        print("❌ Configuration not found!")
        print()
        print("Please run the setup wizard first:")
        print("  python -m jsa.cli setup")
        print()
        return 1

    # Inform user about what's happening
    print("🔍 Starting job search...")
    print("✓ Configuration loaded from config/user_prefs.json")
    print()

    if args.dry_run:
        print("🧪 DRY RUN MODE: Jobs will be collected but no alerts will be sent")
        print()

    try:
        # Run the agent script
        agent_path = Path(__file__).parent.parent / "agent.py"
        cmd = [sys.executable, str(agent_path)]

        if args.dry_run:
            # Set environment variable for dry run mode
            env = os.environ.copy()
            env["DRY_RUN"] = "1"
            result = subprocess.run(cmd, env=env)  # noqa: S603 - Trusted script execution
        else:
            result = subprocess.run(cmd)  # noqa: S603 - Trusted script execution

        if result.returncode == 0:
            print()
            print("✅ Job search completed successfully!")
            print()
            print("Next steps:")
            print("  • View jobs: python -m jsa.cli api")
            print("  • Check health: python -m jsa.cli health")
            print()

        return result.returncode

    except FileNotFoundError:
        print("❌ Error: Job scraping script not found")
        print("   This might be a development environment issue")
        print()
        print("Try running the FastAPI server instead:")
        print("  python -m jsa.cli api")
        print()
        return 1
    except Exception as e:
        print(f"❌ Error: {e}")
        print()
        print("For help, visit:")
        print("  • Troubleshooting: docs/troubleshooting.md")
        print("  • Health check: python -m jsa.cli health")
        print()
        return 1


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="jsa",
        description="JobSentinel - The World's Best Job Search Automation CLI",
        epilog="For more information, visit: docs/DOCUMENTATION_INDEX.md",
    )
    sub = p.add_subparsers(dest="cmd", required=True, help="Available commands")

    p_setup = sub.add_parser(
        "setup",
        help="Interactive setup wizard for first-time configuration",
        description="Run the interactive setup wizard to configure JobSentinel for first-time use. "
        "This will guide you through configuring keywords, locations, job sources, database, and Slack notifications.",
    )
    p_setup.set_defaults(func=_cmd_setup)

    p_run = sub.add_parser(
        "run-once",
        help="Run job scraping once (single execution)",
        description="Execute a single job search run. This will scrape configured job sources, "
        "score matches against your preferences, and send alerts for high-quality jobs.",
    )
    p_run.add_argument(
        "--dry-run",
        action="store_true",
        help="Test mode: collect jobs but don't send alerts",
    )
    p_run.set_defaults(func=_cmd_run_once)

    p_web = sub.add_parser(
        "web",
        help="Run local web UI (Flask)",
        description="Start the Flask-based web UI for JobSentinel. "
        "Provides a simple interface to view jobs and manage settings.",
    )
    p_web.add_argument("--port", type=int, default=5000, help="Port to bind to (default: 5000)")
    p_web.add_argument("--debug", action="store_true", help="Enable debug mode")
    p_web.set_defaults(func=_cmd_web)

    p_api = sub.add_parser(
        "api",
        help="Run FastAPI server (modern REST API)",
        description="Start the FastAPI server with modern REST API. "
        "Includes interactive documentation at /api/docs and serves the React frontend.",
    )
    p_api.add_argument(
        "--host", type=str, default="127.0.0.1", help="Host to bind to (default: 127.0.0.1)"
    )
    p_api.add_argument("--port", type=int, default=8000, help="Port to bind to (default: 8000)")
    p_api.add_argument(
        "--reload", action="store_true", help="Enable auto-reload on code changes (development)"
    )
    p_api.add_argument(
        "--log-level",
        type=str,
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Log level (default: INFO)",
    )
    p_api.set_defaults(func=_cmd_api)

    p_cfg = sub.add_parser(
        "config-validate",
        help="Validate configuration file",
        description="Validate your user preferences configuration file. "
        "Checks JSON syntax, schema compliance, and configuration integrity.",
    )
    p_cfg.add_argument(
        "--path",
        type=str,
        default="config/user_prefs.json",
        help="Path to configuration file (default: config/user_prefs.json)",
    )
    p_cfg.set_defaults(func=_cmd_config_validate)

    p_health = sub.add_parser(
        "health",
        help="Run comprehensive system health check",
        description="Run a comprehensive health check of JobSentinel. "
        "Checks database connectivity, configuration, dependencies, and system status.",
    )
    p_health.add_argument("--verbose", "-v", action="store_true", help="Show detailed information")
    p_health.set_defaults(func=_cmd_health)

    # Privacy Dashboard (NEW - World's Best Feature)
    p_privacy = sub.add_parser(
        "privacy",
        help="Privacy dashboard - complete data transparency",
        description="View complete inventory of all data stored by JobSentinel. "
        "See exactly what data exists, where it's stored, and tools to manage it. "
        "100% privacy-first with zero telemetry verification.",
    )
    p_privacy.add_argument(
        "--export",
        action="store_true",
        help="Export complete privacy report to JSON",
    )
    p_privacy.set_defaults(func=_cmd_privacy)

    # Backup & Restore (NEW - World's Best Feature)
    p_backup = sub.add_parser(
        "backup",
        help="One-click backup and restore",
        description="Create and restore backups of all JobSentinel data. "
        "Includes database, configuration, and optionally logs. "
        "Perfect for data portability and disaster recovery.",
    )
    backup_sub = p_backup.add_subparsers(dest="backup_cmd", required=True)

    p_backup_create = backup_sub.add_parser(
        "create",
        help="Create a new backup",
    )
    p_backup_create.add_argument(
        "--name",
        type=str,
        help="Custom backup name (default: timestamp)",
    )
    p_backup_create.add_argument(
        "--include-logs",
        action="store_true",
        help="Include log files in backup",
    )
    p_backup_create.add_argument(
        "--no-compress",
        action="store_true",
        help="Disable compression",
    )
    p_backup_create.set_defaults(func=_cmd_backup_create)

    p_backup_list = backup_sub.add_parser(
        "list",
        help="List available backups",
    )
    p_backup_list.set_defaults(func=_cmd_backup_list)

    p_backup_restore = backup_sub.add_parser(
        "restore",
        help="Restore from a backup",
    )
    p_backup_restore.add_argument(
        "backup_file",
        type=str,
        help="Path to backup file",
    )
    p_backup_restore.add_argument(
        "--no-verify",
        action="store_true",
        help="Skip checksum verification",
    )
    p_backup_restore.set_defaults(func=_cmd_backup_restore)

    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    func = cast(Callable[[argparse.Namespace], int], args.func)
    return func(args)


if __name__ == "__main__":  # pragma: no cover - main entrypoint
    raise SystemExit(main(sys.argv[1:]))
