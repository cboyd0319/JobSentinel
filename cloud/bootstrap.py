#!/usr/bin/env python3
"""
Cloud Bootstrap Entry Point

This module provides the main entry point for deploying the Job Scraper to cloud providers.
Currently supports Google Cloud Platform (GCP) with Terraform-first architecture.

Usage:
    python -m cloud.bootstrap [options]

Options:
    --provider PROVIDER    Cloud provider to deploy to (default: gcp)
    --log-level LEVEL      Logging level (debug, info, warning, error)
    --no-prompt            Run in non-interactive mode (use defaults)
    --yes                  Auto-confirm all prompts
    --help                 Show this help message

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
import sys
import tomllib
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from utils.logging import get_logger


def get_version() -> str:
    """Read version from pyproject.toml."""
    pyproject_path = project_root / "pyproject.toml"
    try:
        with open(pyproject_path, "rb") as f:
            data = tomllib.load(f)
            return data["project"]["version"]
    except Exception:
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
        "--version",
        action="version",
        version=f"Job Scraper Cloud Bootstrap {get_version()}",
    )

    return parser.parse_args()


async def deploy_gcp(logger, no_prompt: bool = False):
    """Deploy to Google Cloud Platform."""
    from cloud.providers.gcp.gcp import GCPBootstrap

    logger.info("Starting GCP deployment...")
    bootstrap = GCPBootstrap(logger, no_prompt=no_prompt)

    try:
        await bootstrap.run()
        logger.info("✅ GCP deployment completed successfully!")
        return 0
    except KeyboardInterrupt:
        logger.warning("Deployment cancelled by user")
        return 130
    except Exception as e:
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
    logger = get_logger("cloud_bootstrap")
    logger.setLevel(log_level)

    # Print banner
    version = get_version()
    version_text = f"Job Scraper Cloud Bootstrap v{version}"
    padding = (46 - len(version_text)) // 2
    print("╔══════════════════════════════════════════════╗")
    print(f"║{' ' * padding}{version_text}{' ' * (46 - padding - len(version_text))}║")
    print("║         Terraform-First Architecture         ║")
    print("╚══════════════════════════════════════════════╝")
    print()

    # Merge --yes into --no-prompt for backward compatibility
    no_prompt = args.no_prompt or args.yes

    # Route to appropriate cloud provider
    if args.provider == "gcp":
        return await deploy_gcp(logger, no_prompt=no_prompt)
    elif args.provider == "aws":
        return await deploy_aws(logger, no_prompt=no_prompt)
    elif args.provider == "azure":
        return await deploy_azure(logger, no_prompt=no_prompt)
    else:
        logger.error(f"Unsupported provider: {args.provider}")
        return 1


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nDeployment cancelled by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n\nFatal error: {e}", file=sys.stderr)
        sys.exit(1)
