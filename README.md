# Heads-up

This is my personal project and it's still evolving. I make frequent changes and sometimes break things. If you're trying this out, expect rough edges. I’ll remove this notice once things settle down.


# Private Job Scraper & Filter

[![GitHub release](https://img.shields.io/github/v/release/cboyd0319/job-private-scraper-filter)](https://github.com/cboyd0319/job-private-scraper-filter/releases)

This is a local job-scraper I built to watch job boards I care about and to share with friends or anyone else who finds it useful. It runs on your machine and doesn't send your data anywhere.

![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)
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

**Universal Installer (Recommended)**

One command for all platforms (macOS, Linux, Windows):

```bash
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/install.sh | bash
```

**Advanced options:**
```bash
# With AI integration (OpenAI, Gemini, or Anthropic)
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/install.sh | bash -s -- --ai-enhanced openai

# Deploy to cloud (with cost protections)
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/install.sh | bash -s -- --cloud-deploy gcp

# Help and all options
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/install.sh | bash -s -- --help
```

Windows (PowerShell)

Run the setup script and follow the prompts:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; irm "https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/setup_windows.ps1" | iex
```

macOS / Linux

```bash
git clone https://github.com/cboyd0319/job-private-scraper-filter.git
cd job-private-scraper-filter
chmod +x setup.sh && ./setup.sh
```

Config files

Copy the examples and edit them:

```bash
cp .env.example .env
cp user_prefs.example.json user_prefs.json
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

Job filters (example `user_prefs.json`)

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

The universal installer supports cloud deployment with built-in cost guardrails:

```bash
# Google Cloud Run (recommended - generous free tier)
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/install.sh | bash -s -- --cloud-deploy gcp

# AWS Lambda
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/install.sh | bash -s -- --cloud-deploy aws

# Azure Container Instances  
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/install.sh | bash -s -- --cloud-deploy azure
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
- **Safety**: Python dependency vulnerability scanner with SARIF format
- **Ruff**: Fast Python code quality and security linting

**Configuration & Infrastructure:**
- **yamllint**: YAML syntax and style validation for workflows
- **ShellCheck**: Shell script security analysis
- **Dependency Review**: License compliance and vulnerability blocking
- **CI hardening**: Step-Security hardens GitHub Actions runners

**Supply Chain Security:**
- **Build Provenance**: Attestation for key project files
- **FOSSA License Scanning**: Advanced license compatibility checking

All security results are uploaded in **SARIF format** to the **GitHub Security tab** for centralized monitoring and vulnerability management.

**PowerShell Script Validation:**
- **PSScriptAnalyzer**: Static analysis for PowerShell scripts
- **Syntax Testing**: Automated parsing validation for all .ps1 files
- **Security Analysis**: Checks for common PowerShell security issues
- **Cross-platform Testing**: Validates PowerShell compatibility across Windows, macOS, and Linux

## Project Structure

The project follows an organized structure for better maintainability:

```
├── src/                     # Core application code
│   ├── agent.py            # Main job scraper logic
│   ├── database.py         # Database models and operations
│   ├── web_ui.py          # Flask web interface
│   └── __init__.py        # Package initialization
├── scripts/                # Installation and setup scripts
│   ├── install.sh         # Universal installer (all platforms)
│   ├── setup.sh           # macOS/Linux setup
│   ├── setup_windows.ps1  # Enhanced Windows setup
│   └── setup_windows_original.ps1  # Original Windows setup
├── config/                 # Configuration files
│   ├── bandit.yaml        # Python security linting config
│   └── .yamllint.yml      # YAML validation rules
├── utils/                  # Utility modules
├── sources/               # Job board scrapers
├── notify/                # Notification handlers
├── matchers/              # Job filtering rules
└── docs/                  # Documentation
```

**Backward Compatibility:** Root-level `agent.py`, `database.py`, and `web_ui.py` are maintained as entry point wrappers for existing scripts and workflows.

Usage examples

```bash
# Run job search and send alerts
python agent.py --mode poll

# Send daily digest email
python agent.py --mode digest

# Test notification setup
python agent.py --mode test

# System health check
python agent.py --mode health

# Clean up old data
python agent.py --mode cleanup
```

Health checks

Run `python agent.py --mode health` to get a quick status report.

Project layout (important files)

```
agent.py         - main entry point
database.py      - local database code
requirements.txt - dependencies
setup.sh         - macOS/Linux setup script
setup_windows.ps1- Windows setup script
docs/            - extra docs (setup, troubleshooting)
sources/         - job board scrapers
utils/           - helper modules (config, scraping, llm)
notify/          - slack/email code
matchers/        - job scoring rules
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

- Check `docs/` for guides
- Run `python agent.py --mode health` for diagnostics
- Open an issue if you find a bug — I try to help folks who are using this.

Made with ❤️ — hope you find it useful.


