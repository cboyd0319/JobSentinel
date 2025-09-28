"""Command-line entrypoint for cloud automation."""

from __future__ import annotations

import argparse
import sys

from cloud import load_provider
from cloud.providers import PROVIDERS
from cloud.utils import ensure_python_version

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
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    ensure_python_version(MIN_PYTHON)

    namespace = parse_args(argv or sys.argv[1:])
    bootstrapper = load_provider(namespace.provider)
    bootstrapper.run()
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry
    raise SystemExit(main())
