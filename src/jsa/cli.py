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
    app = create_app()
    app.run(debug=args.debug, port=args.port)
    return 0


def _cmd_config_validate(args: argparse.Namespace) -> int:
    svc = ConfigService(config_path=Path(args.path))
    prefs = svc.user_preferences()
    print(f"Config OK. keywords_boost={len(prefs.keywords_boost)} digest_min_score={prefs.digest_min_score}")
    return 0


def _cmd_health(_: argparse.Namespace) -> int:
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


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="jsa", description="Job Search Automation CLI")
    sub = p.add_subparsers(dest="cmd", required=True)

    p_web = sub.add_parser("web", help="Run local web UI")
    p_web.add_argument("--port", type=int, default=5000)
    p_web.add_argument("--debug", action="store_true")
    p_web.set_defaults(func=_cmd_web)

    p_cfg = sub.add_parser("config-validate", help="Validate configuration file")
    p_cfg.add_argument("--path", type=str, default="config/user_prefs.json")
    p_cfg.set_defaults(func=_cmd_config_validate)

    p_health = sub.add_parser("health", help="Print app health summary")
    p_health.set_defaults(func=_cmd_health)

    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    func = cast(Callable[[argparse.Namespace], int], args.func)
    return func(args)


if __name__ == "__main__":  # pragma: no cover - main entrypoint
    raise SystemExit(main(sys.argv[1:]))
