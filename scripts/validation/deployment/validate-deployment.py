#!/usr/bin/env python3
"""
Deployment Validation Script

Validates that a GCP deployment is working correctly by checking:
- Terraform state exists
- GCP project is accessible
- Cloud Run job is deployed and configured correctly
- Secrets are configured
- IAM permissions are set correctly
- Monitoring and alerts are working

Usage:
 python3 scripts/validate-deployment.py [--project-id PROJECT_ID]
 python3 scripts/validate-deployment.py --list # List all deployments
"""

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))  # noqa: E402

from cloud.utils import run_command  # noqa: E402
from utils.logging import get_logger  # noqa: E402


class DeploymentValidator:
	"""Validate GCP deployment health and configuration."""

	def __init__(self, project_id: str | None = None, logger=None, log_level=logging.INFO):
		self.project_id = project_id
		if logger:
			self.logger = logger
		else:
			self.logger = get_logger("deployment_validator")
		self.logger.setLevel(log_level)
		self.errors: list[str] = []
		self.warnings: list[str] = []
		self.successes: list[str] = []
		self.state_dir: Path | None = None

	async def validate(self) -> bool:
		"""Run all validation checks and emit a summary."""
		self.logger.info("=" * 70)
		self.logger.info("GCP DEPLOYMENT VALIDATION")
		self.logger.info("=" * 70)
		self.logger.info("")

		# Resolve deployment if not supplied
		if not self.project_id:
			self.project_id = await self._find_recent_deployment()
		if not self.project_id:
			self.logger.error(
				"No deployments found. Please deploy first or specify --project-id"
			)
			return False

		self.logger.info(f"Validating deployment: {self.project_id}")
		self.logger.info("")

		checks = [
			("State Directory", self._check_state_directory),
			("GCP Project Access", self._check_project_access),
			("Terraform State", self._check_terraform_state),
			("Cloud Run Job", self._check_cloud_run_job),
			("Secrets Configuration", self._check_secrets),
			("IAM Permissions", self._check_iam_permissions),
			("Monitoring & Alerts", self._check_monitoring),
			("Budget Controls", self._check_budget_controls),
		]

		for check_name, check_func in checks:
			self.logger.info(f"Checking: {check_name}...")
			try:
				await check_func()
			except Exception as exc:  # noqa: BLE001
				self.errors.append(f"{check_name}: {exc}")
				self.logger.error(f" [ERROR] {check_name} failed: {exc}")

		# Summary
		self.logger.info("")
		self.logger.info("=" * 70)
		self.logger.info("VALIDATION SUMMARY")
		self.logger.info("=" * 70)
		self.logger.info("")

		if self.successes:
			self.logger.info(f"[OK] Passed Checks ({len(self.successes)}):")
			for success in self.successes:
				self.logger.info(f" • {success}")
			self.logger.info("")

		if self.warnings:
			self.logger.warning(f"[WARNING] Warnings ({len(self.warnings)}):")
			for warning in self.warnings:
				self.logger.warning(f" • {warning}")
			self.logger.info("")

		if self.errors:
			self.logger.error(f"[ERROR] Errors ({len(self.errors)}):")
			for error in self.errors:
				self.logger.error(f" • {error}")
			self.logger.info("")
			return False

		self.logger.info("[OK] All validation checks passed!")
		self.logger.info("")
		return True

	async def _find_recent_deployment(self) -> str | None:
		"""Find the most recent deployment directory name."""
		home = Path.home()
		job_scraper_dir = home / ".job-scraper"
		if not job_scraper_dir.exists():
			return None
		project_dirs = [
			d
			for d in job_scraper_dir.iterdir()
			if d.is_dir() and d.name.startswith("job-scraper-")
		]
		if not project_dirs:
			return None
		project_dirs.sort(reverse=True)
		most_recent = project_dirs[0]
		self.logger.info(f"Found recent deployment: {most_recent.name}")
		return most_recent.name

	async def _check_state_directory(self) -> None:
		home = Path.home()
		self.state_dir = home / ".job-scraper" / self.project_id
		if not self.state_dir.exists():
			raise ValueError(f"State directory not found: {self.state_dir}")
		terraform_dir = self.state_dir / "terraform"
		if not terraform_dir.exists():
			raise ValueError(f"Terraform directory not found: {terraform_dir}")
		self.successes.append(f"State directory exists: {self.state_dir}")

	async def _check_project_access(self) -> None:
		result = await run_command(
			["gcloud", "projects", "describe", self.project_id, "--format=json"],
			capture_output=True,
			check=False,
		)
		if result.returncode != 0:
			raise ValueError(
				f"Cannot access project {self.project_id}. Error: {result.stderr}"
			)
		project_info = json.loads(result.stdout)
		self.successes.append(
			f"Project accessible: {project_info.get('name', self.project_id)}"
		)

	async def _check_terraform_state(self) -> None:
		terraform_dir = self.state_dir / "terraform"
		state_file = terraform_dir / "terraform.tfstate"
		if not state_file.exists():
			raise ValueError("Terraform state file not found")
		with open(state_file, encoding="utf-8") as fh:
			state = json.load(fh)
		resources = state.get("resources", [])
		if not resources:
			self.warnings.append("Terraform state has no resources")
		else:
			self.successes.append(
				f"Terraform state valid: {len(resources)} resources"
			)

	async def _check_cloud_run_job(self) -> None:
		result = await run_command(
			[
				"gcloud",
				"run",
				"jobs",
				"list",
				f"--project={self.project_id}",
				"--format=json",
			],
			capture_output=True,
			check=False,
		)
		if result.returncode != 0:
			raise ValueError(f"Failed to list Cloud Run jobs: {result.stderr}")
		jobs = json.loads(result.stdout)
		if not jobs:
			raise ValueError("No Cloud Run jobs found")
		job = jobs[0]
		job_name = job.get("metadata", {}).get("name", "unknown")
		self.successes.append(f"Cloud Run job exists: {job_name}")

	async def _check_secrets(self) -> None:
		result = await run_command(
			[
				"gcloud",
				"secrets",
				"list",
				f"--project={self.project_id}",
				"--format=json",
			],
			capture_output=True,
			check=False,
		)
		if result.returncode != 0:
			raise ValueError(f"Failed to list secrets: {result.stderr}")
		secrets = json.loads(result.stdout)
		expected_secrets = ["user-prefs", "slack-webhook"]
		found = {s.get("name", "").split("/")[-1] for s in secrets}
		for expected in expected_secrets:
			if expected not in found:
				self.warnings.append(f"Expected secret not found: {expected}")
			else:
				self.successes.append(f"Secret configured: {expected}")

	async def _check_iam_permissions(self) -> None:
		result = await run_command(
			[
				"gcloud",
				"iam",
				"service-accounts",
				"list",
				f"--project={self.project_id}",
				"--format=json",
			],
			capture_output=True,
			check=False,
		)
		if result.returncode != 0:
			self.warnings.append("Could not check IAM service accounts")
			return
		service_accounts = json.loads(result.stdout)
		if service_accounts:
			self.successes.append(
				f"Service accounts configured: {len(service_accounts)}"
			)
		else:
			self.warnings.append("No service accounts found")

	async def _check_monitoring(self) -> None:
		"""Check monitoring and alert policies."""
		result = await run_command(
			[
				"gcloud",
				"alpha",
				"monitoring",
				"policies",
				"list",
				f"--project={self.project_id}",
				"--format=json",
			],
			capture_output=True,
			check=False,
		)
		if result.returncode != 0:
			self.warnings.append(
				"Could not check monitoring policies (gcloud alpha required)"
			)
			return
		try:
			policies = json.loads(result.stdout)
			if policies:
				self.successes.append(
					f"Alert policies configured: {len(policies)}"
				)
			else:
				self.warnings.append("No alert policies found")
		except json.JSONDecodeError:
			self.warnings.append("Could not parse monitoring policies")

	async def _check_budget_controls(self) -> None:
		"""Check budget configuration."""
		result = await run_command(
			[
				"gcloud",
				"billing",
				"budgets",
				"list",
				"--billing-account=all",
				"--format=json",
			],
			capture_output=True,
			check=False,
		)
		if result.returncode != 0:
			self.warnings.append(
				"Could not check budgets (may require billing permissions)"
			)
			return
		try:
			budgets = json.loads(result.stdout)
			project_budgets = [b for b in budgets if self.project_id in str(b)]
			if project_budgets:
				self.successes.append("Budget controls configured")
			else:
				self.warnings.append("No budget found for this project")
		except json.JSONDecodeError:
			self.warnings.append("Could not parse budget information")


async def list_deployments() -> None:
	"""List all deployments present under ~/.job-scraper."""
	home = Path.home()
	job_scraper_dir = home / ".job-scraper"
	if not job_scraper_dir.exists():
		print("No deployments found. Directory does not exist: ~/.job-scraper")
		return
	project_dirs = [
		d for d in job_scraper_dir.iterdir() if d.is_dir() and d.name.startswith("job-scraper-")
	]
	if not project_dirs:
		print("No deployments found.")
		return
	print("Found deployments:")
	print("=" * 70)
	for proj_dir in sorted(project_dirs, reverse=True):
		config_file = proj_dir / "deployment_config.json"
		if config_file.exists():
			with open(config_file, encoding="utf-8") as fh:
				config = json.load(fh)
			region = config.get("region", "unknown")
			print(f" • {proj_dir.name} (region: {region})")
		else:
			print(f" • {proj_dir.name} (no config)")
	print("=" * 70)


async def main() -> int:
	"""Main entry point."""
	parser = argparse.ArgumentParser(
		description="Validate GCP deployment health and configuration",
		formatter_class=argparse.RawDescriptionHelpFormatter,
		epilog="""
Examples:
  # Validate most recent deployment
  %(prog)s

  # Validate specific deployment
  %(prog)s --project-id job-scraper-20250930-1234

  # List all deployments
  %(prog)s --list
""",
	)
	parser.add_argument(
		"--project-id",
		help="GCP project ID to validate (defaults to most recent)",
	)
	parser.add_argument(
		"--list",
		action="store_true",
		help="List all deployments",
	)
	parser.add_argument(
		"--log-level",
		choices=["debug", "info", "warning", "error"],
		default="info",
		help="Logging level",
	)
	args = parser.parse_args()
	# Set up logging
	log_level = getattr(logging, args.log_level.upper())
	if args.list:
		await list_deployments()
		return 0
	validator = DeploymentValidator(project_id=args.project_id, log_level=log_level)
	success = await validator.validate()
	return 0 if success else 1


if __name__ == "__main__":
	try:
		exit_code = asyncio.run(main())
		sys.exit(exit_code)
	except KeyboardInterrupt:
		print("\n\nValidation cancelled by user")
		sys.exit(130)
	except Exception as e:  # pragma: no cover - broad fallback
		print(f"\n\nFatal error: {e}", file=sys.stderr)
		sys.exit(1)
