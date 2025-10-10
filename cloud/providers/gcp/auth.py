"""GCP authentication related functions."""


from cloud.utils import run_command


async def authenticate(logger) -> None:
    logger.info("Checking Google Cloud authentication")

    # Check if already authenticated
    check_auth = await run_command(
        ["gcloud", "auth", "list", "--filter=status:ACTIVE", "--format=value(account)"],
        capture_output=True,
        check=False,
        logger=logger,
    )

    if check_auth.returncode == 0 and check_auth.stdout.strip():
        active_account = check_auth.stdout.strip()
        logger.info(f"Already authenticated as {active_account}")

        # Check application-default credentials
        check_adc = await run_command(
            ["gcloud", "auth", "application-default", "print-access-token"],
            capture_output=True,
            check=False,
            logger=logger,
        )

        if check_adc.returncode == 0:
            logger.info("Application default credentials already configured")
            return

    # Not authenticated, proceed with login
    logger.info("Authenticating with Google Cloud")
    await run_command(["gcloud", "auth", "login"], logger=logger)
    await run_command(["gcloud", "auth", "application-default", "login"], logger=logger)
