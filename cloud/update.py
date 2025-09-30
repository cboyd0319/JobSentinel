"""Command-line entrypoint for cloud updates."""

from __future__ import annotations

import asyncio
import argparse
import sys

from cloud.providers.gcp.update import GCPUpdate
from cloud.utils import ensure_python_version

MIN_PYTHON = (3, 12)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Update cloud infrastructure for the job scraper",
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
        help="The GCP project ID to update."
    )
    return parser.parse_args(argv)


async def main(argv: list[str] | None = None) -> int:
    ensure_python_version(MIN_PYTHON)

    namespace = parse_args(argv or sys.argv[1:])
    updater = GCPUpdate(namespace.project_id)
    await updater.run()
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry
    asyncio.run(main())
