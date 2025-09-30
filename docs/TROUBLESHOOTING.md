# Troubleshooting

This guide provides common troubleshooting steps for the job scraper. Always start by checking the health report and logs.

## Initial Checks

1.  Run `python3 -m src.agent --mode health` to get a comprehensive status report. Pay attention to [bold red]CRITICAL[/bold red] and [yellow]WARNING[/yellow] messages.
2.  Check the latest local logs: `tail -50 data/logs/application.log`
3.  For cloud deployments, check [Google Cloud Logging](https://console.cloud.google.com/logs/viewer) for detailed application logs.

## Common Problems and Solutions

### Python Environment Issues

*   **Python not found:** Ensure `python3` is in your PATH. If you have multiple Python versions, explicitly use `python3` or `python`. Consider using a tool like `pyenv`.
*   **Virtual environment not active:**
    *   If using `direnv`, ensure you've run `direnv allow` in the project root. If you see `(venv)` in your terminal prompt, it's active.
    *   Manually activate with `source .venv/bin/activate` (Linux/macOS) or `.venv\Scripts\activate` (Windows PowerShell).
*   **Permission issues:** Ensure your user has write permissions to the project directory, especially `data/logs` and `data/backups`. Using a virtual environment (`.venv`) helps isolate dependencies from system-wide Python installations.
*   **Playwright install fails:** Run `python3 -m playwright install-deps` to install system dependencies for Playwright browsers.

### Configuration and Job Discovery

*   **No jobs found:**
    *   Verify `config/user_prefs.json` is correctly configured with valid company URLs and filters.
    *   Broaden `title_allowlist` or remove restrictive filters in `config/user_prefs.json` for testing purposes.
    *   Check the `LOG_LEVEL` in your `.env` file (set to `DEBUG`) for more detailed scraping output.
*   **Scraping timeouts:** Increase `timeout_seconds` in `config/user_prefs.json` (e.g., try `60` or `90`).
*   **JS-heavy pages not scraping:** Ensure `playwright` is installed and its browsers are installed (`python3 -m playwright install chromium`). The `PlaywrightScraper` is designed for these sites.
*   **Network Resilience:** If a job board is skipped due to consecutive failures, check your network connection or the job board's availability. The scraper implements exponential backoff for retries on transient network issues.

### Notification Problems

*   **Slack:**
    *   Confirm `SLACK_WEBHOOK_URL` is correctly set in your `.env` file.
    *   Ensure the webhook URL starts with `https://hooks.slack.com/services/`.
    *   Verify the Slack app and webhook are correctly configured in your Slack workspace.
*   **Email:**
    *   Verify SMTP settings (host, port, username, password) in your `.env` file.
    *   If using Gmail, ensure you're using an [App Password](https://support.google.com/accounts/answer/185833) if 2FA is enabled.

### Cloud Deployment Issues (GCP with Terraform)

*   **Terraform `init` / `plan` / `apply` failures:**
    *   **Authentication:** Ensure `gcloud` is authenticated and has the correct project selected (`gcloud auth list`, `gcloud config list`).
    *   **Permissions:** Verify the authenticated GCP user or service account has sufficient IAM permissions to create/manage the resources defined in `terraform/gcp/`.
    *   **Billing:** Confirm the GCP project has an active billing account linked.
    *   **State file:** If you encounter issues with the Terraform state, do NOT manually edit the state file unless you know what you are doing. Consider `terraform taint` or `terraform destroy` for problematic resources.
*   **Cloud Run Job failures:**
    *   Check [Google Cloud Logging](https://console.cloud.google.com/logs/viewer) for logs from your Cloud Run service.
    *   Review the Cloud Monitoring alerts for Cloud Run job failures (configured via Terraform).
    *   Ensure the Docker image is correctly built and pushed to Artifact Registry.
*   **Unexpected costs:**
    *   Monitor your GCP billing account regularly.
    *   Review the Cloud Monitoring budget alerts (configured via Terraform) for notifications when spending thresholds are approached.
    *   Refer to `docs/CLOUD_COSTS.md` for optimization strategies.

## Advanced Checks

*   **Enable debug logs:** Set `LOG_LEVEL=DEBUG` in your `.env` file to get verbose output from all modules. Watch `data/logs/application.log` for detailed execution flow.
*   **Manual testing:** Test individual components of the system manually (e.g., `python3 src/agent.py --mode health`, `python3 -m sources.job_scraper <URL>`).

## When Reporting an Issue

To help us diagnose and resolve issues quickly, please include the following information when filing a bug report:

*   **Operating System and Python Version:** (e.g., macOS Sonoma, Python 3.12.10)
*   **Short Description:** A clear and concise summary of the problem.
*   **Steps to Reproduce:** Detailed steps that allow others to consistently reproduce the issue.
*   **Health Check Output:** The full output from `python3 -m src.agent --mode health`.
*   **Recent Log Excerpts:** Relevant sections from `data/logs/application.log` (especially `ERROR` or `WARNING` messages).
*   **Redacted Configuration:** Your `config/user_prefs.json` and `.env` files, with all sensitive information (API keys, passwords, webhook URLs) replaced with placeholders (e.g., `YOUR_API_KEY`).

## Where to Get Help

*   **File an issue on GitHub:** <https://github.com/cboyd0319/job-private-scraper-filter/issues>
*   **Start a discussion:** For feature requests or general questions.

That's it — if you hit something weird and want me to look, open an issue and I'll try to help when I can.
