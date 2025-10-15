"""GCP security related functions."""

import json
import tempfile

from deployments.common.cloud.utils import run_command


async def setup_binary_authorization(logger, project_id: str, region: str) -> None:
    logger.info("Setting up Binary Authorization")
    logger.info("Configuring container image security policies...")

    # Create a policy that requires all images to be from our Artifact Registry
    policy = {
        "defaultAdmissionRule": {
            "evaluationMode": "ALWAYS_DENY",
            "enforcementMode": "ENFORCED_BLOCK_AND_AUDIT_LOG",
        },
        "clusterAdmissionRules": {},
        "admissionAllowlistPatterns": [{"namePattern": f"{region}-docker.pkg.dev/{project_id}/*"}],
    }

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json") as temp_policy_file:
        json.dump(policy, temp_policy_file)
        temp_policy_file.flush()
        await run_command(
            [
                "gcloud",
                "container",
                "binauthz",
                "policy",
                "import",
                temp_policy_file.name,
                f"--project={project_id}",
            ],
            check=False,
            logger=logger,
            retries=3,
            delay=5,
        )

    logger.info("Binary Authorization configured to allow only trusted images")
