# JobSentinel — Self-Hosted Job Search Automation

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.13%2B-blue.svg)](https://www.python.org/)
[![Version](https://img.shields.io/badge/Version-0.6.0--dev-orange.svg)](#)
[![Privacy](https://img.shields.io/badge/Privacy-Local‑first-black.svg)](#security)
[![Cost](https://img.shields.io/badge/Local%20cost-$0-informational)](#cost)

**TL;DR**: Privacy-focused job hunting automation. Scrape multiple job boards, score matches against your preferences, get Slack alerts for top picks. Runs locally ($0) or in your cloud (~$5-15/mo).

---

## 🎯 For Complete Beginners

**Never used a "command line" before? No problem!**

JobSentinel is designed to be accessible to everyone - even if you've never written code or used Terminal. Here's everything you need:

### What You Need
- ✅ A computer (Windows 11+, Mac 15+, or Linux)
- ✅ 15 minutes of time
- ✅ Internet connection
- ✅ Ability to copy and paste text

**That's it!** No programming experience required.

### Quick Start for Beginners

**Step 1: Download JobSentinel**
1. Click the green **"Code"** button above
2. Click **"Download ZIP"**
3. Extract the ZIP file (right-click → Extract All)

**Step 2: Install (Automated)**
1. Open the `JobSentinel` folder
2. Open the `scripts` folder
3. Double-click `install.py`
4. Wait 10-15 minutes (installer does everything automatically!)

**Step 3: Tell it what jobs you want**
The installer will ask you simple questions:
- What job titles are you looking for? (e.g., "Accountant")
- Where? (e.g., "Remote" or "New York, NY")
- Minimum salary? (e.g., "50000" or leave blank)

**Step 4: Find jobs!**
Open Terminal/Command Prompt and type:
```bash
python -m jsa.cli run-once
```

**That's it!** JobSentinel will search job boards and show you matches.

### 📚 Beginner-Friendly Guides

- **[Installation Guide](docs/INSTALLATION_GUIDE.md)** - Step-by-step with screenshots
- **[FAQ for Non-Technical Users](docs/FAQ.md)** - Common questions answered simply
- **[Error Recovery Guide](docs/ERROR_RECOVERY_GUIDE.md)** - Every error + how to fix it

**Need help?** Ask in [GitHub Discussions](https://github.com/cboyd0319/JobSentinel/discussions)

---

## ⚡ Quick Start (For Technical Users)

```bash
# Clone and install
git clone https://github.com/cboyd0319/JobSentinel && cd JobSentinel
python3 scripts/install.py

# Configure
cp config/user_prefs.example.json config/user_prefs.json
# Edit config/user_prefs.json with your preferences

# Run
python -m jsa.cli run-once
```

---

| Item | Version | Why |
|------|---------|-----|
| Python | >=3.13 | Runtime |
| Git | Any | Clone repo |
| OS | Windows 11+, macOS 15+, Ubuntu 22.04+ | Platform support |

Optional: Slack webhook URL, job board API keys (Reed, etc.)

## Install

**Automated (recommended):**
```bash
python3 scripts/install.py
```
Installer detects your platform, installs Python 3.13 if needed, creates venv, installs dependencies, and configures automation.

**Preview changes first:**
```bash
python3 scripts/install.py --dry-run
```

**Manual:**
```bash
python3.13 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e .[dev,resume]
playwright install chromium
cp config/user_prefs.example.json config/user_prefs.json
cp .env.example .env
```

## Usage

### Basic
```bash
# Validate configuration
python -m jsa.cli config-validate --path config/user_prefs.json

# Run single scrape session
python -m jsa.cli run-once

# Start web UI (optional)
python -m jsa.cli web --port 5000
```

### Advanced
```bash
# Dry-run mode (preview only)
python -m jsa.cli run-once --dry-run

# Custom config file
python -m jsa.cli run-once --config /path/to/custom.json

# Verbose logging
python -m jsa.cli run-once --verbose

# Cloud deployment
python -m jsa.cli cloud bootstrap --provider gcp
```

## Configuration

| Name | Type | Default | Example | Notes |
|------|------|---------|---------|-------|
| keywords | list[str] | [] | ["python", "backend"] | Job title/description matches |
| locations | list[str] | [] | ["Remote", "San Francisco"] | Location filters |
| salary_min | int | 0 | 120000 | Minimum salary (USD) |
| blacklisted_companies | list[str] | [] | ["Meta", "Amazon"] | Companies to exclude |
| job_sources.*.enabled | bool | false | true | Enable/disable source |
| job_sources.*.api_key | str | "" | "reed_abc123" | API key if required |
| slack.webhook_url | str | "" | "https://hooks.slack.com/..." | Slack incoming webhook |
| slack.channel | str | "#job-alerts" | "#engineering-jobs" | Target channel |

See `config/user_prefs.example.json` for full structure.

**Example minimal config:**
```json
{
  "keywords": ["python", "backend", "api"],
  "locations": ["Remote"],
  "salary_min": 100000,
  "job_sources": {
    "jobswithgpt": { "enabled": true },
    "reed": { "enabled": true, "api_key": "YOUR_KEY_HERE" }
  },
  "slack": {
    "webhook_url": "YOUR_WEBHOOK_URL",
    "channel": "#job-alerts"
  }
}
```

## Development

**Quick Commands:**
```bash
# Install development dependencies
make dev

# Run tests
make test

# Run linters
make lint

# Format code
make fmt

# Type checking
make type
```

**Docker Build:**
```bash
# Build container
docker build -f docker/Dockerfile -t jobsentinel:latest .

# Run container
docker run -d \
  -v $(pwd)/config:/app/config:ro \
  -v $(pwd)/data:/app/data \
  jobsentinel:latest
```

See [docs/development/](docs/development/) for complete development guide.

## Architecture

```
┌─────────────┐     ┌──────────┐     ┌─────────────┐     ┌──────────┐
│  Job Sites  │────▶│ Scrapers │────▶│   Scoring   │────▶│  Alerts  │
│ (External)  │     │ (Python) │     │   Engine    │     │ (Slack)  │
└─────────────┘     └──────────┘     └─────────────┘     └──────────┘
                          │                  │
                          ▼                  ▼
                    ┌──────────┐      ┌──────────┐
                    │  Config  │      │ SQLite   │
                    │  (JSON)  │      │   DB     │
                    └──────────┘      └──────────┘
                    (Local storage only; no third parties)
```

**Flow:** Scrapers fetch jobs from configured sources → Scoring engine applies filters → High-scoring matches trigger Slack alerts

**Data:** Input: Job site HTML/JSON → Scrapers | Output: Scored jobs → SQLite + Slack

**Trust boundaries:** All data stored locally (SQLite), API keys in `.env` only, no telemetry, Slack webhooks outbound-only

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Security

**Secrets:** Use `.env` or environment variables; never commit. Required: `SLACK_WEBHOOK_URL`. Optional: `OPENAI_API_KEY`, Reed API key, SMTP credentials.

**Least privilege:** Scrapers = read-only access to job sites. Slack webhook = `incoming-webhook` scope only. SQLite = file-system permissions only.

**Supply chain:** Dependencies pinned in `pyproject.toml`. Playwright browsers from official CDN. No executable scripts in dependencies.

**Disclosure:** Report vulnerabilities via [SECURITY.md](docs/governance/SECURITY.md). Contact: [security@yourdomain.tld](mailto:security@yourdomain.tld). Response time: 3 business days.

## Performance

**Local (single run):** 10-50 jobs/minute, ~200-500 MB memory, SQLite grows ~1-5 MB per 1000 jobs

**Cloud (continuous):** 2-hour intervals on micro instance. GCP Cloud Run: ~$8/mo (1vCPU, 512MB). AWS Fargate Spot: ~$5/mo (0.25vCPU, 512MB).

## Troubleshooting

| Error | Fix |
|-------|-----|
| `ModuleNotFoundError: No module named 'jsa'` | Activate venv: `source .venv/bin/activate`, then `pip install -e .` |
| `Playwright executable not found` | Install browsers: `playwright install chromium` |
| `AuthError: Invalid Slack webhook` | Check webhook in `.env` or config. Test: `curl -X POST -H 'Content-type: application/json' --data '{"text":"test"}' YOUR_URL` |
| `No jobs found` | Enable sources in config, verify API keys, run with `--verbose` |
| `SSL certificate verify failed` | Update certifi: `pip install --upgrade certifi`. macOS: run `/Applications/Python 3.13/Install Certificates.command` |

See [docs/troubleshooting.md](docs/troubleshooting.md) for complete troubleshooting guide.

## Cost

| Deployment | Cost | Privacy | Uptime |
|------------|------|---------|--------|
| Local | $0 | Maximum | Manual runs |
| Cloud (GCP) | ~$8/mo | High (your account) | Scheduled |
| Cloud (AWS) | ~$5/mo | High (your account) | Scheduled |

## Roadmap

- [ ] Resume parser integration (auto-match skills)
- [ ] LinkedIn scraper (requires auth)
- [ ] Email digest (daily summary)
- [ ] Mobile app (React Native)
- [ ] Browser extension (one-click apply)

See [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues).

## Contributing

See [CONTRIBUTING.md](docs/governance/CONTRIBUTING.md) for dev setup, testing, commit style, and PR checklist.

## Documentation

- **[Quickstart Guide](docs/quickstart.md)** - Getting started with JobSentinel
- **[Architecture](docs/ARCHITECTURE.md)** - System design and technical details
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions
- **[Development](docs/development/)** - Build tools and development resources
- **[Docker Deployment](docker/)** - Container deployment guides
- **[Governance](docs/governance/)** - Code of conduct, contributing, security

## License

MIT — see [LICENSE](LICENSE). Use freely, keep attribution.
