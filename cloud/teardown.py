"""Command-line entrypoint for cloud teardown."""

from __future__ import annotations

import argparse
import sys

from cloud.providers.gcp_teardown import GCPTeardown
from cloud.utils import ensure_python_version

MIN_PYTHON = (3, 10)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Deprovision cloud infrastructure for the job scraper",
    )
    parser.add_argument(
        "--provider",
        default="gcp",
        choices=["gcp"],
        help="Target cloud provider (default: gcp)",
    )
    parser.add_argument(
        "--project-id",
        required=True,
        help="The GCP project ID to teardown."
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    ensure_python_version(MIN_PYTHON)

    namespace = parse_args(argv or sys.argv[1:])
    teardown = GCPTeardown(namespace.project_id)
    teardown.run()
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry
    raise SystemExit(main())
