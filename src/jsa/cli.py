from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path
from collections.abc import Callable
from typing import cast

from jsa.config import ConfigService
from jsa.db import get_stats_sync


def _cmd_web(args: argparse.Namespace) -> int:
    """Run local web UI."""
    # Lazy import to avoid hard dependency during CLI parsing/tests
    from jsa.web.app import create_app
    app = create_app()
    app.run(debug=args.debug, port=args.port)
    return 0


def _cmd_config_validate(args: argparse.Namespace) -> int:
    """Validate configuration file."""
    svc = ConfigService(config_path=Path(args.path))
    prefs = svc.user_preferences()
    print(f"Config OK. keywords_boost={len(prefs.keywords_boost)} digest_min_score={prefs.digest_min_score}")
    return 0


def _cmd_health(_: argparse.Namespace) -> int:
    """Print app health summary and run comprehensive diagnostics."""
    # Run the standalone health check tool
    import subprocess
    import sys
    from pathlib import Path
    
    health_check_script = Path(__file__).parent.parent.parent / 'scripts' / 'health_check.py'
    
    if health_check_script.exists():
        # Run the comprehensive health check
        result = subprocess.run(
            [sys.executable, str(health_check_script), '--verbose'],
            cwd=Path(__file__).parent.parent.parent
        )
        return result.returncode
    else:
        # Fallback to simple health check
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


def _cmd_run_once(args: argparse.Namespace) -> int:
    """Run single scrape session.
    
    This is the main command for running a one-off job search.
    It scrapes configured job boards, scores matches, and sends alerts.
    """
    # Import agent main function
    from src.agent import main as agent_main
    
    # Override mode to poll
    import sys
    old_argv = sys.argv
    try:
        sys.argv = ['agent', '--mode', 'poll']
        asyncio.run(agent_main())
        return 0
    except Exception as e:
        print(f"ERROR: Job search failed: {e}", file=sys.stderr)
        return 1
    finally:
        sys.argv = old_argv


def _cmd_search(args: argparse.Namespace) -> int:
    """Alias for run-once (user-friendly name)."""
    return _cmd_run_once(args)


def _cmd_digest(args: argparse.Namespace) -> int:
    """Generate and send job digest."""
    from src.agent import main as agent_main
    
    import sys
    old_argv = sys.argv
    try:
        sys.argv = ['agent', '--mode', 'digest']
        asyncio.run(agent_main())
        return 0
    except Exception as e:
        print(f"ERROR: Digest generation failed: {e}", file=sys.stderr)
        return 1
    finally:
        sys.argv = old_argv


def _cmd_test_notifications(args: argparse.Namespace) -> int:
    """Test notification channels (Slack, etc.)."""
    from src.agent import main as agent_main
    
    import sys
    old_argv = sys.argv
    try:
        sys.argv = ['agent', '--mode', 'test']
        asyncio.run(agent_main())
        return 0
    except Exception as e:
        print(f"ERROR: Notification test failed: {e}", file=sys.stderr)
        return 1
    finally:
        sys.argv = old_argv


def _cmd_cleanup(args: argparse.Namespace) -> int:
    """Clean up old jobs and backups."""
    from src.agent import main as agent_main
    
    import sys
    old_argv = sys.argv
    try:
        sys.argv = ['agent', '--mode', 'cleanup']
        asyncio.run(agent_main())
        return 0
    except Exception as e:
        print(f"ERROR: Cleanup failed: {e}", file=sys.stderr)
        return 1
    finally:
        sys.argv = old_argv


def _cmd_logs(args: argparse.Namespace) -> int:
    """View application logs with optional filters."""
    from pathlib import Path
    import json
    
    log_dir = Path("logs")
    if not log_dir.exists():
        print("No logs directory found.")
        return 1
    
    # Find latest log file
    log_files = sorted(log_dir.glob("jobsentinel_*.log"), reverse=True)
    if not log_files:
        print("No log files found.")
        return 1
    
    latest_log = log_files[0]
    print(f"Reading logs from: {latest_log}")
    print("-" * 80)
    
    try:
        with open(latest_log, 'r') as f:
            lines = f.readlines()
            
            # Apply filter if provided
            if args.filter:
                filter_lower = args.filter.lower()
                lines = [line for line in lines if filter_lower in line.lower()]
            
            # Apply tail limit
            if args.tail:
                lines = lines[-args.tail:]
            
            for line in lines:
                print(line.rstrip())
        
        return 0
    except Exception as e:
        print(f"ERROR: Failed to read logs: {e}", file=sys.stderr)
        return 1


def _cmd_cloud(args: argparse.Namespace) -> int:
    """Cloud deployment management.
    
    Subcommands:
      bootstrap  - Initialize cloud infrastructure
      status     - Check cloud deployment status
      update     - Update cloud deployment
      teardown   - Destroy cloud infrastructure
    """
    if not hasattr(args, 'cloud_cmd') or not args.cloud_cmd:
        print("ERROR: Cloud subcommand required (bootstrap|status|update|teardown)", file=sys.stderr)
        return 1
    
    # TODO: Implement cloud commands in Phase 4
    print(f"Cloud command '{args.cloud_cmd}' will be implemented in Phase 4")
    print("For now, please use Terraform directly:")
    print("  cd terraform/gcp && terraform init && terraform apply")
    return 0


def _cmd_ai_setup(args: argparse.Namespace) -> int:
    """Interactive AI configuration wizard."""
    print("🤖 AI Configuration Wizard")
    print("=" * 50)
    print()
    
    # TODO: Implement interactive wizard in Phase 1
    print("This wizard will help you configure AI features.")
    print()
    print("For now, please manually edit your .env file:")
    print("  1. Open .env in a text editor")
    print("  2. Set OPENAI_API_KEY=your-key-here")
    print("  3. Set OPENAI_MODEL=gpt-4o-mini (recommended)")
    print()
    print("Get your API key from: https://platform.openai.com/api-keys")
    
    return 0


def build_parser() -> argparse.ArgumentParser:
    """Build the argument parser with all commands."""
    p = argparse.ArgumentParser(
        prog="jsa",
        description="JobSentinel - Self-Hosted Job Search Automation",
        epilog="For detailed help on a command, run: jsa <command> --help"
    )
    sub = p.add_subparsers(dest="cmd", required=True, help="Available commands")

    # Web UI
    p_web = sub.add_parser("web", help="Run local web UI")
    p_web.add_argument("--port", type=int, default=5000, help="Port to run web server (default: 5000)")
    p_web.add_argument("--debug", action="store_true", help="Enable debug mode")
    p_web.set_defaults(func=_cmd_web)

    # Config validation
    p_cfg = sub.add_parser("config-validate", help="Validate configuration file")
    p_cfg.add_argument("--path", type=str, default="config/user_prefs.json", help="Path to config file")
    p_cfg.set_defaults(func=_cmd_config_validate)

    # Health check
    p_health = sub.add_parser("health", help="Print app health summary")
    p_health.set_defaults(func=_cmd_health)

    # Run once (main command)
    p_run = sub.add_parser("run-once", help="Run single scrape session (main command)")
    p_run.set_defaults(func=_cmd_run_once)

    # Search (alias)
    p_search = sub.add_parser("search", help="Alias for run-once")
    p_search.set_defaults(func=_cmd_search)

    # Digest
    p_digest = sub.add_parser("digest", help="Generate and send job digest")
    p_digest.set_defaults(func=_cmd_digest)

    # Test notifications
    p_test = sub.add_parser("test-notifications", help="Test notification channels")
    p_test.set_defaults(func=_cmd_test_notifications)

    # Cleanup
    p_cleanup = sub.add_parser("cleanup", help="Clean up old jobs and backups")
    p_cleanup.set_defaults(func=_cmd_cleanup)

    # Logs
    p_logs = sub.add_parser("logs", help="View application logs")
    p_logs.add_argument("--tail", type=int, help="Show last N lines")
    p_logs.add_argument("--filter", type=str, help="Filter logs containing text")
    p_logs.set_defaults(func=_cmd_logs)

    # Cloud management
    p_cloud = sub.add_parser("cloud", help="Cloud deployment management")
    cloud_sub = p_cloud.add_subparsers(dest="cloud_cmd", help="Cloud subcommands")
    
    p_cloud_bootstrap = cloud_sub.add_parser("bootstrap", help="Initialize cloud infrastructure")
    p_cloud_bootstrap.add_argument("--provider", choices=["gcp", "aws", "azure"], default="gcp")
    
    p_cloud_status = cloud_sub.add_parser("status", help="Check cloud deployment status")
    
    p_cloud_update = cloud_sub.add_parser("update", help="Update cloud deployment")
    
    p_cloud_teardown = cloud_sub.add_parser("teardown", help="Destroy cloud infrastructure")
    p_cloud_teardown.add_argument("--force", action="store_true", help="Skip confirmation")
    
    p_cloud.set_defaults(func=_cmd_cloud)

    # AI setup wizard
    p_ai = sub.add_parser("ai-setup", help="Interactive AI configuration wizard")
    p_ai.set_defaults(func=_cmd_ai_setup)

    return p


def main(argv: list[str] | None = None) -> int:
    """Main CLI entry point."""
    parser = build_parser()
    args = parser.parse_args(argv)
    func = cast(Callable[[argparse.Namespace], int], args.func)
    return func(args)


if __name__ == "__main__":  # pragma: no cover - main entrypoint
    raise SystemExit(main(sys.argv[1:]))
