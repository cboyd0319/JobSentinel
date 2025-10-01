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

## ⚡ Quick Start

### Windows

Open PowerShell and run this command:

```powershell
irm https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/deploy/windows/bootstrap.ps1 -o bootstrap.ps1; ./bootstrap.ps1
```

### macOS / Linux

Open a terminal and run these commands:

```bash
# Clone the repository (only needed once)
# git clone https://github.com/cboyd0319/job-private-scraper-filter.git
# cd job-private-scraper-filter

# Navigate to the installer directory and run it
cd deploy/macos  # or `linux`
sh install.sh
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

Cloud deployment to Google Cloud Platform (GCP) is the recommended way to run the application automatically. This process is handled by the user-friendly installers in the `deploy/` directory.

For a complete overview of the cloud architecture, costs, and security, please see the [Cloud Deployment Guide](docs/CLOUD.md).

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
├── deploy/        # User-facing installers for Windows, macOS, and Linux.
├── src/           # Core application code (agent, database, web_ui).
├── cloud/         # Python logic for cloud provider interactions.
├── terraform/     # Terraform infrastructure-as-code for GCP, AWS, etc.
├── scripts/       # Developer tools (security scanning, testing, etc.).
├── docs/          # Project documentation and guides.
├── config/        # Example configuration files.
└── ...            # Other project files.
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
