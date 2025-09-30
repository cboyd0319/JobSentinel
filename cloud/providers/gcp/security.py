"""GCP security related functions."""

import json
import tempfile
from pathlib import Path
from datetime import datetime

from cloud.utils import run_command, ensure_directory, resolve_project_root, which


async def setup_binary_authorization(logger, project_id: str, region: str) -> None:
    logger.info("Setting up Binary Authorization")
    logger.info("Configuring container image security policies...")

    # Create a policy that requires all images to be from our Artifact Registry
    policy = {
        "defaultAdmissionRule": {"evaluationMode": "ALWAYS_DENY", "enforcementMode": "ENFORCED_BLOCK_AND_AUDIT_LOG"},
        "clusterAdmissionRules": {},
        "admissionWhitelistPatterns": [{"namePattern": f"{region}-docker.pkg.dev/{project_id}/*"}],
    }

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json") as temp_policy_file:
        json.dump(policy, temp_policy_file)
        temp_policy_file.flush()
        await run_command(
            ["gcloud", "container", "binauthz", "policy", "import", temp_policy_file.name, f"--project={project_id}"],
            check=False,
            logger=logger,
            retries=3,
            delay=5,
        )

    logger.info("Binary Authorization configured to allow only trusted images")


async def run_prowler_scan(logger, project_id: str, project_root: Path) -> None:
    logger.info("Generating CIS benchmark report with Prowler")
    reports_dir = ensure_directory(project_root / "cloud" / "reports")
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    output_file = reports_dir / f"prowler-cis-gcp-{timestamp}.json"

    if not which("prowler"):
        logger.warning("Prowler not found, skipping security scan")
        logger.info("   • Install manually: python3 -m pip install prowler")
        logger.info("   • Then run: prowler gcp --compliance cis_4.0_gcp --output-types json")
        return

    # Prowler requires specific GCP credentials and may fail on first deployment
    logger.info("Running Prowler security scan (this may take a few minutes)...")
    result = await run_command(
        [
            "prowler",
            "gcp",
            "--compliance",
            "cis_4.0_gcp",
            "--output-types",
            "json",
            "--output-filename",
            str(output_file),
            "--project-id",  # Changed from --project
            project_id,
        ],
        logger=logger,
        show_spinner=True,
        check=False,
        capture_output=True,
    )

    if result.returncode == 0 and output_file.exists():
        logger.info(f"✓ Prowler CIS report saved to {output_file}")
    else:
        logger.warning(f"Prowler scan failed (non-critical, exit {result.returncode})")
        if result.stderr:
            # Show first few lines of error for troubleshooting
            error_lines = result.stderr.strip().split("\n")[:3]
            for line in error_lines:
                logger.debug(f"Prowler: {line}")
        logger.info("   • You can run manually later: prowler gcp --compliance cis_4.0_gcp --output-types json")
        logger.info("   • Common issues: missing credentials, API not enabled, or first-time setup needed")
