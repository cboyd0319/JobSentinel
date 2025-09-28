# Heads-up

This is my personal project and it's still evolving. I make frequent changes and sometimes break things. If you're trying this out, expect rough edges. I’ll remove this notice once things settle down.


# Private Job Scraper & Filter

[![GitHub release](https://img.shields.io/github/v/release/cboyd0319/job-private-scraper-filter)](https://github.com/cboyd0319/job-private-scraper-filter/releases)

This is a local job-scraper I built to watch job boards I care about and to share with friends or anyone else who finds it useful. It runs on your machine and doesn't send your data anywhere.

![Python 3.12.10](https://img.shields.io/badge/python-3.12.10-blue.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

Table of contents
- Features
- Supported job boards
- Quick start
- Configuration
- Optional AI help
- Cloud deployment (with cost protection)
- Usage
- Security scanning & monitoring
- Health checks
- Project layout
- Security & privacy
- Contributing
- License

> 🎯 **Project priorities:** Ease of use and security come first. Every installer,
> deployment path, and feature aims to be simple to adopt while defaulting to
> hardened, least-privilege configurations.

What it does
- Monitors job boards on a schedule (default: every 15 minutes)
- Filters and scores jobs using rules (and optionally AI)
- Sends alerts to Slack or email when a match looks good
- Keeps everything local — no telemetry or cloud storage
- **NEW**: Enterprise-grade security scanning with automated vulnerability detection
- **NEW**: One-command setup for local, AI-enhanced, or cloud deployment
- **NEW**: Built-in cost protections for cloud deployments (prevents surprise bills)

Supported job boards
- Greenhouse (example: Cloudflare, Stripe)
- Lever (example: Netflix, Uber)
- Workday (many large companies)
- Generic JS-powered career pages

Quick start

**Recommended: free Google Cloud Run deployment (secure & automated)**

The easiest, most secure way to run the scraper is the new Cloud Run bootstrapper.
It installs the Google Cloud SDK if needed, creates a dedicated project, enables
required APIs, stores secrets in Secret Manager, wires Cloud Scheduler, and sets
up a $5 USD budget guardrail — all in one command:

```bash
python -m cloud.bootstrap --provider gcp
```

> ℹ️ The script pauses so you can confirm Google Cloud account creation and
> billing activation (a Google requirement even for free tier usage). Everything
> else is handled automatically with security-first defaults.

**Local install (macOS, Linux, Windows)**

Prefer to run everything on your own machine? Use the universal installer:

```bash
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/install.sh | bash
```

**Advanced options:**
```bash
# With AI integration (OpenAI, Gemini, or Anthropic)
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/install.sh | bash -s -- --ai-enhanced openai

# Help and all options
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/install.sh | bash -s -- --help
```

Windows (PowerShell)

Run the setup script and follow the prompts:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; irm "https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/setup_windows.ps1" | iex
```

> 📖 **Windows users**: See the detailed [Windows Setup Guide](docs/WINDOWS_SETUP_GUIDE.md) for step-by-step instructions with screenshots and troubleshooting tips.

macOS / Linux

```bash
git clone https://github.com/cboyd0319/job-private-scraper-filter.git
cd job-private-scraper-filter
chmod +x scripts/setup.sh && ./scripts/setup.sh
```

Config files

Copy the examples and edit them:

```bash
cp .env.example .env
cp config/user_prefs.example.json config/user_prefs.json
```

Notifications

Put your webhook or email settings in `.env`:

```bash
# Slack webhook for alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Email settings for daily digest
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
DIGEST_TO=your_email@gmail.com
```

Job filters (example `config/user_prefs.json`)

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

Optional: AI scoring

You can enable ChatGPT to help with scoring (totally optional):

```bash
LLM_ENABLED=true
OPENAI_API_KEY=sk-your-api-key-here
```

Cloud deployment (with cost protection)

**New cross-platform bootstrapper:** provision an entire Google Cloud Run Jobs
stack without pre-installed tooling. A single command works on Windows, macOS,
and Linux:

```bash
python3 -m cloud.bootstrap --provider gcp
```

The guided workflow installs the Cloud SDK if necessary, creates a dedicated
project, enables required APIs, builds the container via Cloud Build, configures
Secret Manager, and wires Cloud Scheduler for a 15-minute polling cadence.

> 🔁 **Windows note:** Replace `python3` with `python` in the commands below if
> the `python3` alias is not available on your system.

Legacy installer flows remain available:

```bash
# Google Cloud Run (legacy path)
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/install.sh | bash -s -- --cloud-deploy gcp

# AWS Lambda
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/install.sh | bash -s -- --cloud-deploy aws

# Azure Container Instances
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/install.sh | bash -s -- --cloud-deploy azure
```

**Cost Protection Features:**
- Automatic billing alerts at $5/$10/$15 thresholds
- Hard resource limits (512MB RAM, 15min timeout)
- Weekend/holiday auto-pause
- Emergency stop at 80% of spending limits
- Monthly cost reports via email

See `docs/CLOUD_COSTS.md` for detailed cost analysis and protection details.

Security scanning & monitoring

The project includes enterprise-grade security scanning with multiple automated tools:

**Core Security Analysis:**
- **CodeQL Analysis**: GitHub's semantic code vulnerability detection
- **OSV Scanner**: Google's comprehensive vulnerability database (replaces Trivy)
- **Secrets detection**: TruffleHog scans for leaked API keys/passwords (verified results only)

**Python Security:**
- **Enhanced Bandit**: Python security linter with 50+ comprehensive security tests
- **Safety**: Dependency vulnerability scanner configured with `config/.safety-project.ini`, blocking fixable Critical/High/Medium issues and exporting SARIF locally/CI

**Configuration & Infrastructure:**
- **yamllint**: YAML syntax and style validation for workflows
- **ShellCheck**: Shell script security analysis
- **Dependency Review**: License compliance and vulnerability blocking
- **CI hardening**: Step-Security hardens GitHub Actions runners

**Supply Chain Security:**
- **Build Provenance**: Attestation for key project files
- **FOSSA License Scanning**: Advanced license compatibility checking
- **Prowler CIS Reports**: Automated Cloud Run bootstrap report (cis_4.0_gcp) saved in `cloud/reports/`, plus scheduled GitHub CIS scans via Prowler.

All security results are uploaded in **SARIF format** to the **GitHub Security tab** for centralized monitoring and vulnerability management. Locally, run `scripts/local-security-scan.sh` to execute the same blocking policy before pushing changes.

**PowerShell Script Validation:**
- **PSScriptAnalyzer**: Static analysis for PowerShell scripts
- **Syntax Testing**: Automated parsing validation for all .ps1 files
- **Security Analysis**: Checks for common PowerShell security issues
- **Cross-platform Testing**: Validates PowerShell compatibility across Windows, macOS, and Linux

## Project Structure

The project follows an organized structure for better maintainability:

```
├── src/                       # Core application code
│   ├── agent.py              # Main job scraper logic
│   ├── database.py           # Database models and operations
│   ├── web_ui.py             # Flask web interface
│   └── __init__.py           # Package initialization
├── scripts/                  # Installation and security tooling
│   ├── install.sh            # Universal installer (all platforms)
│   ├── setup.sh              # macOS/Linux setup helpers
│   ├── setup_windows*.ps1    # Windows setup (current & legacy)
│   ├── setup-dev-tools.sh    # Developer tooling bootstrap
│   ├── local-security-scan.sh # Pre-commit security gate (Bandit + Safety)
│   └── enhanced-security-scan.sh # Comprehensive local security suite
├── cloud/                    # Cross-provider automation (Cloud Run bootstrap, etc.)
├── config/                   # Configuration & samples (.env.example, user_prefs.example.json, linters)
│   ├── bandit.yaml           # Python security linting config
│   ├── .yamllint.yml         # YAML validation rules
│   ├── .safety-project.ini   # Safety metadata (project id, findings url)
│   └── user_prefs.example.json # Copy to user_prefs.json and customize
├── utils/                    # Utility modules (config, logging, health checks)
├── sources/                  # Job board scrapers
├── notify/                   # Notification handlers
├── matchers/                 # Job filtering rules
├── templates/                # Web UI templates
└── docs/                     # Documentation (installation, development, ops)
```

Usage examples

```bash
# Run job search and send alerts
python3 -m src.agent --mode poll

# Send daily digest email
python3 -m src.agent --mode digest

# Test notification setup
python3 -m src.agent --mode test

# System health check
python3 -m src.agent --mode health

# Clean up old data
python3 -m src.agent --mode cleanup
```

> 💡 On Windows, use `python` in place of `python3` when running these commands.

Health checks

Run `python3 -m src.agent --mode health` to get a quick status report.

Project layout (important files)

```
├── src/                     # Core application code
│   ├── agent.py            # Main job scraper logic
│   ├── database.py         # Database models and operations
│   └── web_ui.py          # Flask web interface
├── scripts/                # Installation and setup scripts
│   ├── install.sh         # Universal installer (all platforms)
│   ├── setup.sh           # macOS/Linux setup
│   └── setup_windows.ps1  # Enhanced Windows setup
├── cloud/                 # Cross-provider automation (Cloud Run bootstrap, etc.)
├── config/                # Config samples & security policies
│   ├── bandit.yaml       # Python security linting config
│   ├── .yamllint.yml     # YAML validation rules
│   ├── .safety-project.ini # Safety configuration
│   └── user_prefs.example.json # Copy to user_prefs.json and customize
├── utils/                  # Helper modules (config, scraping, llm)
├── sources/               # Job board scrapers
├── notify/                # Slack/email notification code
├── matchers/              # Job scoring rules
├── docs/                  # Extra docs (setup, troubleshooting)
├── requirements.txt       # Python dependencies
```

Security & privacy

- Everything runs locally by default
- Secrets live in `.env` on your machine
- No telemetry or tracking

Contributing

If you want to help:

1. Fork the repo
2. Create a branch
3. Make changes and test
4. Open a pull request

License

MIT — see the `LICENSE` file.


Need help?

- Check [`docs/`](docs/) for guides:
  - [🪟 Windows Setup Guide](docs/WINDOWS_SETUP_GUIDE.md) - Complete Windows 11 setup instructions
  - [☁️ Cloud Costs](docs/CLOUD_COSTS.md) - Detailed cloud deployment cost analysis
  - [🚀 Installation](docs/INSTALLATION.md) - Alternative installation methods
  - [🛠️ Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions
  - [🤖 ChatGPT Integration](docs/ChatGPT-Integration.md) - AI-enhanced job scoring setup
- Run `python3 -m src.agent --mode health` for diagnostics
- Open an issue if you find a bug — I try to help folks who are using this.

Made with ❤️ — hope you find it useful.
