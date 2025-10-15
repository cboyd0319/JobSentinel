"""GCP region selection functions."""

from cloud.utils import choose, run_command


async def select_region(logger, no_prompt: bool) -> str:
    logger.info("Select Cloud Run region")
    logger.info("Regions are ordered by cost-effectiveness (cheapest first):")
    regions = [
        "us-central1",  # Cheapest - Iowa
        "us-east1",  # Second cheapest - South Carolina
        "us-west1",  # Oregon
        "europe-west1",  # Belgium
        "us-west2",  # Los Angeles
        "europe-west4",  # Netherlands
        "asia-northeast1",  # Tokyo
        "asia-southeast1",  # Singapore
        "australia-southeast1",  # Sydney
    ]
    region = choose(
        "Choose the region (us-central1 recommended for lowest cost):", regions, no_prompt
    )
    await run_command(["gcloud", "config", "set", "run/region", region], logger=logger)
    return region


def select_scheduler_region(logger, no_prompt: bool, region: str) -> str:
    logger.info("Select Cloud Scheduler region")
    supported = {
        "us-central1",
        "us-east1",
        "us-east4",
        "us-west1",
        "us-west2",
        "europe-west1",
        "europe-west2",
        "asia-northeast1",
        "asia-southeast1",
        "asia-south1",
        "australia-southeast1",
    }
    if region in supported:
        return region

    logger.info(
        "Cloud Scheduler is not available in your chosen Cloud Run region. "
        "Select the nearest supported location for the scheduler trigger."
    )
    scheduler_choice = choose("Select a Scheduler location:", sorted(supported), no_prompt)
    return scheduler_choice
