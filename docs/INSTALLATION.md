# Installation

This guide outlines the installation process for the job scraper. The recommended approach is to use the interactive setup wizard, which streamlines the entire process.

## Recommended: Interactive Setup Wizard

For the simplest and most guided installation, use the interactive setup wizard. It will walk you through setting up your local environment, configuring preferences, and optionally deploying to the cloud.

```bash
python3 scripts/setup_wizard.py
```

This wizard handles:

*   **Virtual Environment Setup:** Ensures a clean and isolated Python environment.
*   **Dependency Installation:** Installs all required Python packages and Playwright browsers.
*   **Configuration:** Helps you create and populate `.env` and `config/user_prefs.json`.
*   **Cloud Deployment (GCP):** Optionally guides you through deploying to Google Cloud Run using Terraform.

## Manual Local Installation

If you prefer a manual setup or need to troubleshoot specific steps, follow these instructions.

### Prerequisites

*   Python 3.12.10+
*   Git
*   Internet connection (for dependencies and Playwright)

### Steps

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/cboyd0319/job-private-scraper-filter.git
    cd job-private-scraper-filter
    ```
2.  **Set up Virtual Environment:**
    *   **Using `direnv` (Recommended):** If you have `direnv` installed, simply run `direnv allow` in the project root. This will automatically create and activate a virtual environment.
    *   **Manual `venv`:**
        ```bash
        python3 -m venv .venv
        source .venv/bin/activate # macOS/Linux
        # .venv\Scripts\activate   # Windows PowerShell
        ```
3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    python3 -m playwright install chromium
    ```
4.  **Configure:**
    ```bash
    cp .env.example .env
    cp config/user_prefs.example.json config/user_prefs.json
    # Edit .env and config/user_prefs.json with your filters and alerts
    ```

## Cloud Deployment

For cloud deployment, use the `scripts/deploy-cloud.sh` script. The setup wizard can help you prepare for this.

```bash
# For GCP deployment (Terraform-managed)
export GCP_PROJECT_ID="your-gcp-project-id"
export GCP_REGION="us-central1"
export GCP_SOURCE_REPO="your-github-username/job-private-scraper-filter"
scripts/deploy-cloud.sh gcp
```

## Post-Installation

*   **Edit Configuration:** Adjust `.env` and `config/user_prefs.json` to your liking.
*   **Test Functionality:**
    *   Basic health check: `python3 -m src.agent --mode health`
    *   Test notifications: `python3 -m src.agent --mode test`

## Automation

For setting up automated runs (e.g., via cron jobs or scheduled tasks), refer to the instructions provided by the [Interactive Setup Wizard](#recommended-interactive-setup-wizard) or consult the `docs/DEVELOPMENT.md` for manual cron job examples.

## Troubleshooting

Refer to `docs/TROUBLESHOOTING.md` for common issues and solutions.

## Updating

```bash
git pull origin main
pip install -r requirements.txt --upgrade
python3 -m playwright install chromium
```

## Uninstall

Remove scheduled tasks or cron jobs and delete the project folder.

See the `docs/` folder for more details.
