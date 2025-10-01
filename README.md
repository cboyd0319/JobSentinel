# Job Scraper & Filter

```
╔══════════════════════════════════════════════╗
║       Smart Job Search, Running Quietly      ║
║         Local-First • Cloud-Optional         ║
╚══════════════════════════════════════════════╝
```

**One command. Your dream job, filtered and delivered.**

Polls job boards on your schedule → Scores matches with custom rules → Sends Slack alerts when opportunities cross your threshold.

![Python 3.12.10](https://img.shields.io/badge/python-3.12.10-blue.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
[![CI/CD Pipeline](https://github.com/cboyd0319/job-private-scraper-filter/actions/workflows/ci.yml/badge.svg)](https://github.com/cboyd0319/job-private-scraper-filter/actions/workflows/ci.yml)
[![Security Scan](https://github.com/cboyd0319/job-private-scraper-filter/actions/workflows/security.yml/badge.svg)](https://github.com/cboyd0319/job-private-scraper-filter/actions/workflows/security.yml)

---

## ⚡ Quickstart

```bash
# Local setup (5 minutes)
python3 scripts/setup_wizard.py

# Cloud deployment (GCP, one command)
python3 -m cloud.bootstrap --yes
```

> **Privacy-first:** Runs locally by default. Your data stays on your machine unless you opt into cloud deployment.

## Table of contents

- [What it does](#what-it-does)
- [Supported job boards](#supported-job-boards)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Notifications](#notifications)
- [Job filters](#job-filters)
- [Optional AI scoring](#optional-ai-scoring)
- [Cloud deployment](#cloud-deployment)
- [Usage](#usage)
- [Project layout](#project-layout)
- [Security & privacy](#security--privacy)
- [Contributing](#contributing)
- [License](#license)
- [Need help?](#need-help)

## What it does

- Polls job boards on a schedule (hourly during business hours by default)
- Filters and scores results with rules you control
- Sends Slack alerts when a match crosses your threshold
- **NEW:** Auto-configures from your resume (PDF/DOCX) - extracts skills, titles, and experience
- Keeps everything local unless you opt into cloud deployment

## Supported job boards

- Greenhouse (example: Cloudflare, Stripe)
- Lever (example: Netflix, Uber)
- Workday (a lot of large companies)
- Generic JS-heavy career pages via Playwright

## Quick start

To get started quickly, use the interactive setup wizard. It will guide you through setting up your local environment, configuring your preferences, and optionally deploying to the cloud.

### Interactive Setup Wizard (Recommended)

```bash
python3 scripts/setup_wizard.py
```

This wizard will:
*   Guide you through setting up your Python virtual environment.
*   Help you configure your job boards, filters, and notification preferences.
*   Optionally, prepare your project for cloud deployment.

### Local Install (Manual Steps)

If you prefer a manual setup or need to troubleshoot, follow these steps:

1.  **Ensure Python 3.12.10 is installed:** For optimal compatibility, especially on Windows, Python 3.12.10 is recommended. You can download it from [python.org](https://www.python.org/downloads/).
2.  **Clone the repository:**
    ```bash
    git clone https://github.com/cboyd0319/job-private-scraper-filter.git
    cd job-private-scraper-filter
    ```
3.  **Set up a Python Virtual Environment (Highly Recommended):**
    This isolates project dependencies from your system Python and other projects.
    *   **Using `direnv` (Recommended):** If you have `direnv` installed, simply run `direnv allow` in the project root. This will automatically create and activate a virtual environment.
    *   **Manual `venv`:**
        ```bash
        python3 -m venv .venv
        source .venv/bin/activate # Windows: .venv\Scripts\activate
        ```
4.  **Update pip to the latest version:**
    ```bash
    python3 -m pip install --upgrade pip
    ```
5.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    python3 -m playwright install chromium
    ```
6.  **Configure:**
    ```bash
    cp .env.example .env
    cp config/user_prefs.example.json config/user_prefs.json
    # Edit .env and config/user_prefs.json with your filters and alerts
    ```

### Windows Quick Setup

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; irm "https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/setup_windows.ps1" | iex
```

Prefer a slower walkthrough? Check `docs/WINDOWS_SETUP_GUIDE.md` for detailed instructions on `gcloud` CLI and Python installation, PATH configuration, and when elevated privileges (Run as Administrator) might be required.

## Configuration

Initial configuration is best done through the [Interactive Setup Wizard](#interactive-setup-wizard-recommended). For manual adjustments:

*   `.env` holds notification secrets and feature toggles. **Never commit this file to version control.**
*   `config/user_prefs.json` stores job board URLs, filters, and scoring thresholds.

## Notifications

Add your webhook settings to `.env`:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

## Job filters

Example `config/user_prefs.json` snippet:

```json
{
  "companies": [
    { "id": "stripe", "board_type": "lever", "url": "https://jobs.lever.co/stripe" }
  ],
  "title_allowlist": ["Security Engineer", "DevSecOps"],
  "keywords_boost": ["Zero Trust", "Kubernetes", "AWS"],
  "location_constraints": ["Remote", "US"],
  "salary_floor_usd": 150000,
  "immediate_alert_threshold": 0.9
}
```

## Optional AI scoring

Set these if you want LLM help ranking roles (totally optional):

```bash
LLM_ENABLED=true
OPENAI_API_KEY=sk-your-api-key-here
```

## Cloud Deployment

Cloud deployment is managed via Terraform for Google Cloud Platform (GCP), ensuring a robust, repeatable, and cost-optimized infrastructure. The `scripts/deploy-cloud.sh` orchestrates the deployment.

### Google Cloud Platform (GCP)

To deploy to GCP, ensure you have the `gcloud` CLI and `terraform` installed and authenticated. Then, set the required environment variables and run the deployment script:

```bash
export GCP_PROJECT_ID="your-gcp-project-id"
export GCP_REGION="us-central1" # Or your preferred region
export GCP_SOURCE_REPO="your-github-username/job-private-scraper-filter" # e.g., cboyd0319/job-private-scraper-filter

scripts/deploy-cloud.sh gcp
```

This command will:

*   Validate your environment and permissions.
*   Initialize and apply Terraform configurations in `terraform/gcp/`.
*   Set up Cloud Run, Artifact Registry, Cloud Build (including triggers), VPC networking, and IAM roles.
*   Configure Cloud Monitoring alerts for job failures and budget thresholds.

For more details, refer to `docs/CLOUD_DEPLOYMENT_GUIDE.md` and `docs/CLOUD_COSTS.md`.

### Other Cloud Providers (AWS, Azure)

Legacy installers still exist for AWS and Azure, but these will be transitioned to Terraform in future updates.

```bash
# AWS Lambda
scripts/deploy-cloud.sh aws

# Azure Container Instances
scripts/deploy-cloud.sh azure
```

Cost guardrails include spending alerts, strict resource limits, and an emergency stop if spending spikes. Details live in `docs/CLOUD_COSTS.md`.

## Usage

```bash
# scrape and send alerts
python3 -m src.agent --mode poll

# daily digest
python3 -m src.agent --mode digest

# notification smoke test
python3 -m src.agent --mode test

# health check
python3 -m src.agent --mode health

# clean old rows
python3 -m src.agent --mode cleanup

# clean old rows
python3 -m src.agent --mode cleanup
```

## Project layout

```text
├── src/           # core app code (agent, database, web_ui)
├── sources/       # job board scrapers
├── matchers/      # scoring and filter helpers
├── notify/        # outbound notifications
├── utils/         # shared helpers
├── scripts/       # install, deployment, security tooling
├── cloud/         # Cloud deployment logic (Terraform orchestration) and remaining provider-specific Python modules
├── config/        # sample configs and linter settings
├── templates/     # optional web UI templates
├── docs/          # extra guides
└── data/          # local fixtures (optional)
```

## Security & privacy

This project prioritizes security and privacy, especially for local deployments. Here's how:

-   **Local by Default:** Runs locally; no telemetry is collected or sent out unless explicitly configured (e.g., Slack notifications).
-   **Secrets Management:** Sensitive information (API keys, webhook URLs) is stored in `.env` (for local use) or Google Secret Manager (for cloud deployment). Always ensure `.env` has strict file permissions.
    *   **Principle of Least Privilege for User Credentials:** When authenticating `gcloud`, use credentials with only the necessary permissions to create/manage the specified GCP resources. Avoid using highly privileged accounts (e.g., project owner) for routine deployments.
-   **Encryption in Transit and At Rest (Cloud):**
    *   **At Rest:** All data stored in GCP services (Cloud Storage, Secret Manager, Cloud Run, Pub/Sub) is encrypted at rest by default using Google-managed encryption keys. For most use cases, this is sufficient. Customer-Managed Encryption Keys (CMEK) are available for advanced requirements.
    *   **In Transit:** All communication with GCP APIs (via `gcloud` CLI, Python client libraries) is secured using HTTPS/TLS, ensuring encryption in transit.
-   **Local Data Security:** The local `data/jobs.sqlite` database is not encrypted by the script. Ensure your local machine is secured (e.g., full disk encryption, strong passwords) to protect this data.
-   **Dependency Security:**
    *   **Pinned Dependencies:** `requirements.txt` uses pinned versions to ensure reproducible and stable environments.
    *   **Regular Updates:** Regularly update your dependencies (`python -m pip install --upgrade -r requirements.txt`) and re-pin them to patch known vulnerabilities.
    *   **Vulnerability Scanning:** Consider periodically scanning your installed dependencies for known vulnerabilities using tools like `pip-audit` or `safety`.
-   **Robust Input Validation:** All user inputs are validated to prevent unexpected behavior or potential injection attacks.
-   **Strict Logging of Sensitive Data:** No sensitive data (API keys, webhook URLs, etc.) is intentionally logged. Review logs to ensure no accidental leakage.
-   **Enhanced Security Pipeline (for development/CI):** Multi-layered scanning (CodeQL, Bandit, Safety, Semgrep, Prowler CIS, TruffleHog) is used in development. GitHub Actions implement enterprise security best practices (OIDC tokens, minimal permissions, credential isolation).
-   **Pre-commit Hooks:** Run `scripts/precommit-security-scan.sh` before pushing to catch issues early.
-   **Cloud Deployments:** Include advanced security features like Binary Authorization, private VPC, secret rotation, and extensive pre-flight checks for permissions and resource conflicts.
-   Refer to `docs/API_KEY_MANAGEMENT.md` for secure handling of API keys.

## Contributing

Pull requests are welcome. Please ensure your commit messages follow the [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/) as this project uses `semantic-release` for automated versioning and changelog generation. Fork the repo, branch off `main`, and include the commands you ran for testing (`pytest`, `python3 -m src.agent --mode health`, etc.). If you touch cloud or security bits, call that out in the PR body.

## License

MIT — see `LICENSE`.

## Need help?

- Browse `docs/` for platform-specific notes and the comprehensive [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- Run `python3 -m src.agent --mode health`
- Open an issue with steps to reproduce if you hit a bug

Made with ❤️ — hope it helps you find a great gig.
