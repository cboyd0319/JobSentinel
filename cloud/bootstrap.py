"""Command-line entrypoint for cloud automation."""

from __future__ import annotations

import argparse
import sys

from cloud import load_provider
from cloud.providers import PROVIDERS
from cloud.utils import ensure_python_version
from utils.logging import setup_logging, get_logger

MIN_PYTHON = (3, 10)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Provision cloud infrastructure for the job scraper",
    )
    parser.add_argument(
        "--provider",
        default="gcp",
        choices=sorted(PROVIDERS),
        help="Target cloud provider (default: gcp)",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        help="Set the logging level (default: INFO)",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Automatically answer yes to all prompts",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    ensure_python_version(MIN_PYTHON)

    namespace = parse_args(argv or sys.argv[1:])
    logger = setup_logging(log_level=namespace.log_level)
    bootstrapper = load_provider(namespace.provider, logger, namespace.yes)
    bootstrapper.run()
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry
    raise SystemExit(main())
