#!/usr/bin/env python3
"""
Cloud Bootstrap Entry Point

This module provides the main entry point for deploying the Job Scraper to cloud providers.
Currently supports Google Cloud Platform (GCP) with Terraform-first architecture.

Usage:
 python -m cloud.bootstrap [options]

Options:
 --provider PROVIDER Cloud provider to deploy to (default: gcp)
 --log-level LEVEL Logging level (debug, info, warning, error)
 --no-prompt Run in non-interactive mode (use defaults)
 --yes Auto-confirm all prompts
 --help Show this help message

Examples:
 # Interactive GCP deployment
 python -m cloud.bootstrap

 # Non-interactive deployment
 python -m cloud.bootstrap --no-prompt --yes

 # Debug mode
 python -m cloud.bootstrap --log-level debug
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
import tomllib
from pathlib import Path

from rich.console import Console
from rich.panel import Panel

# Local imports deferred where needed to avoid path mutations at import time.
# (Ruff E402 compliance; runtime safety maintained.)

from cloud.style import RICH_COLORS, SYMBOL, WIDTH  # local style constants (no side effects)

project_root = Path(__file__).parent.parent


def get_version() -> str:
	"""Read version from pyproject.toml.

	Returns 'unknown' if the file cannot be read or key missing (non-fatal).
	"""
	pyproject_path = project_root / "pyproject.toml"
	try:
		with open(pyproject_path, "rb") as f:
			data = tomllib.load(f)
		return data["project"]["version"]
	except Exception:  # pragma: no cover - defensive fallback
		return "unknown"


def parse_args():
 """Parse command line arguments."""
 parser = argparse.ArgumentParser(
 description="Cloud Bootstrap - Deploy Job Scraper to the cloud",
 formatter_class=argparse.RawDescriptionHelpFormatter,
 epilog="""
Examples:
 # Interactive GCP deployment
 %(prog)s

 # Non-interactive deployment
 %(prog)s --no-prompt --yes

 # Debug mode
 %(prog)s --log-level debug

For more information, see: terraform/gcp/README.md
 """,
 )

 parser.add_argument(
 "--provider",
 choices=["gcp", "aws", "azure"],
 default="gcp",
 help="Cloud provider to deploy to (default: gcp)",
 )

 parser.add_argument(
 "--log-level",
 choices=["debug", "info", "warning", "error"],
 default="info",
 help="Logging level (default: info)",
 )

 parser.add_argument(
 "--no-prompt",
 action="store_true",
 help="Run in non-interactive mode (use defaults where possible)",
 )

 parser.add_argument(
 "--yes",
 "-y",
 action="store_true",
 help="Auto-confirm all prompts",
 )

 parser.add_argument(
 "--dry-run",
 action="store_true",
 help="Perform a dry run, showing planned changes without applying them.",
 )

 parser.add_argument(
 "--version",
 action="version",
 version=f"Job Scraper Cloud Bootstrap {get_version()}",
 )

 return parser.parse_args()


async def deploy_gcp(logger, no_prompt: bool = False, console=None, dry_run: bool = False):
	"""Deploy to Google Cloud Platform.

	Returns 0 on success, non-zero error code otherwise.
	"""
	from cloud.providers.gcp.gcp import GCPBootstrap
	from cloud.exceptions import QuotaExceededError
	from cloud.receipt import print_receipt, save_receipt

	logger.info("Starting GCP deployment...")
	bootstrap = GCPBootstrap(logger, no_prompt=no_prompt, dry_run=dry_run)

	try:
		await bootstrap.run()
		if dry_run:
			logger.info("[OK] Dry run completed successfully. No changes were applied.")
			return 0

		logger.info("[OK] GCP deployment completed successfully!")

		# Generate and display receipt
		if console and hasattr(bootstrap, "project_id"):
			print_receipt(
				console=console,
				project_id=bootstrap.project_id,
				region=getattr(bootstrap, "region", "us-central1"),
				service_url=getattr(bootstrap, "service_url", None),
				terraform_version="1.10.3",
			)

		# Save receipt to file
		receipt_path = save_receipt(
			project_id=bootstrap.project_id,
			region=getattr(bootstrap, "region", "us-central1"),
			service_url=getattr(bootstrap, "service_url", None),
		)
		logger.info(f"Receipt saved to: {receipt_path}")
		return 0
	except KeyboardInterrupt:
		logger.warning("Deployment cancelled by user")
		return 130
	except QuotaExceededError:
		logger.error("")
		logger.error("=" * 70)
		logger.error("[ERROR] GOOGLE CLOUD PROJECT QUOTA EXCEEDED")
		logger.error("=" * 70)
		logger.error("")
		logger.info("Manual quota fix steps:")
		logger.info("1. Open: https://console.cloud.google.com/cloud-resource-manager")
		logger.info("2. Delete old projects you no longer need")
		logger.info("3. Re-run this script")
		logger.info("Deleted projects count against quota for 30 days")
		return 1
	except Exception as e:  # pragma: no cover - unexpected failure path
		logger.error(f"Deployment failed: {e}", exc_info=True)
		return 1


async def deploy_aws(logger, no_prompt: bool = False):
 """Deploy to Amazon Web Services."""
 logger.error("AWS deployment is not yet implemented")
 logger.info("See TODO.md for roadmap")
 return 1


async def deploy_azure(logger, no_prompt: bool = False):
 """Deploy to Microsoft Azure."""
 logger.error("Azure deployment is not yet implemented")
 logger.info("See TODO.md for roadmap")
 return 1


async def main():
	"""Main entry point for cloud bootstrap."""
	args = parse_args()

	# Set up logging
	log_level = getattr(logging, args.log_level.upper())
	# Lazy import after standard libs to keep top clean
	from utils.logging import get_logger  # noqa: WPS433 (runtime import intentional)
	logger = get_logger("cloud_bootstrap")
	logger.setLevel(log_level)

	# Set up Rich console (respects NO_COLOR env var)
	console = Console(
		width=WIDTH,
		highlight=False,
		force_terminal=None,  # Auto-detect
		no_color=os.getenv("NO_COLOR") is not None,
	)

	# Print banner
	version = get_version()
	banner_text = f"[bold]{SYMBOL['arrow']} Job Scraper Cloud Bootstrap[/bold]\n"
	banner_text += f"[{RICH_COLORS['muted']}]v{version} • Terraform-First Architecture[/]"

	console.print()
	console.print(
		Panel(
			banner_text,
			border_style=RICH_COLORS["primary"],
			width=WIDTH,
		)
	)
	console.print()

	# Merge --yes into --no-prompt for backward compatibility
	no_prompt = args.no_prompt or args.yes

	# Route to appropriate cloud provider
	if args.provider == "gcp":
		return await deploy_gcp(
			logger, no_prompt=no_prompt, console=console, dry_run=args.dry_run
		)
	if args.provider == "aws":
		return await deploy_aws(logger, no_prompt=no_prompt)
	if args.provider == "azure":
		return await deploy_azure(logger, no_prompt=no_prompt)
	logger.error(f"Unsupported provider: {args.provider}")
	return 1


if __name__ == "__main__":
	try:
		exit_code = asyncio.run(main())
		sys.exit(exit_code)
	except KeyboardInterrupt:
		print("\n\nDeployment cancelled by user")
		sys.exit(130)
	except Exception as e:  # pragma: no cover - top-level guard
		print(f"\n\nFatal error: {e}", file=sys.stderr)
		sys.exit(1)
