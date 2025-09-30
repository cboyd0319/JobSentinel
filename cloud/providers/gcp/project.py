"""GCP project management functions."""

from cloud.utils import choose, run_command

async def choose_billing_account(logger, no_prompt: bool) -> str:
    logger.info("Locate Billing Account")
    result = await run_command(
        ["gcloud", "billing", "accounts", "list", "--format=json"],
        capture_output=True,
        logger=logger
    )
    accounts = json.loads(result.stdout)
    if not accounts:
        logger.error("No billing accounts detected. Create one in the console and re-run.")
        sys.exit(1)
    # Filter for open accounts first
    open_accounts = [acc for acc in accounts if acc.get('open', False)]
    if open_accounts and len(open_accounts) == 1:
        billing_account = open_accounts[0]["name"].split("/")[-1]
        logger.info(f"Open billing account detected: {billing_account}")
        return billing_account
    elif open_accounts:
        # Use only open accounts if available
        accounts = open_accounts
        logger.info("Using open billing accounts")

    if len(accounts) == 1:
        billing_account = accounts[0]["name"].split("/")[-1]
        logger.info(f"Billing account detected: {billing_account}")
        return billing_account

    choices = [
        f"{acc['name'].split('/')[-1]} ({acc['displayName']}) {'[OPEN]' if acc.get('open', False) else '[CLOSED]'}"
        for acc in accounts
    ]
    selection = choose("Select billing account:", choices, no_prompt)
    return selection.split()[0]
