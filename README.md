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

### 🎯 For Complete Beginners

**After installation, here's your first job search:**

```bash
# Step 1: Go to JobSentinel folder
cd ~/JobSentinel  # Mac/Linux
cd %USERPROFILE%\JobSentinel  # Windows

# Step 2: Activate the environment (shows (.venv) in your prompt)
source .venv/bin/activate  # Mac/Linux
.venv\Scripts\activate     # Windows

# Step 3: Run your first search!
python -m jsa.cli run-once
```

**What happens?**
- Scrapes configured job boards
- Filters by your preferences
- Scores each job (0-100%)
- Shows top matches
- Saves to database

**Example output:**
```
🔍 JobSentinel - Starting job search...
🌐 Scraping: Indeed, LinkedIn, Glassdoor
📊 Found: 89 jobs (12 duplicates removed)
✨ Top Matches:

#1. Senior Python Engineer @ Stripe
    📍 Remote (US) | 💰 $160k-$220k | ⭐ 94% match
    
#2. Backend Engineer @ Cloudflare  
    📍 San Francisco | 💰 $180k-$240k | ⭐ 91% match

✅ Complete! Found 77 unique jobs, 12 high matches (>85%)
```

### 📋 Essential Commands

```bash
# Run a job search (main command)
python -m jsa.cli run-once

# Shorter alias
python -m jsa.cli search

# Check system health
python -m jsa.cli health

# View recent logs
python -m jsa.cli logs --tail 50

# Test Slack/email notifications
python -m jsa.cli test-notifications

# Clean old jobs (older than 30 days)
python -m jsa.cli cleanup

# Generate digest email
python -m jsa.cli digest

# Start web UI to browse jobs
python -m jsa.cli web
```

### 🎨 Web UI (Visual Interface)

**Start the web interface:**
```bash
python -m jsa.cli web
```

Then open: **http://localhost:5000**

**Features:**
- 📊 Dashboard with job statistics
- 🔍 Search and filter jobs
- ⭐ Mark as: Applied, Interested, Rejected
- 📈 Track application progress
- 💾 Export to CSV

### 🔧 Advanced Usage

```bash
# Validate config before running
python -m jsa.cli config-validate

# View all available commands
python -m jsa.cli --help

# Get help for specific command
python -m jsa.cli run-once --help

# Cloud deployment (Phase 4)
python -m jsa.cli cloud bootstrap --provider gcp
python -m jsa.cli cloud status
python -m jsa.cli cloud teardown

# AI setup wizard (Phase 5)
python -m jsa.cli ai-setup
```

## Configuration

### 🔧 Quick Setup

**1. Copy example config:**
```bash
cp config/user_prefs.example.json config/user_prefs.json
```

**2. Edit your preferences:**
```bash
nano config/user_prefs.json  # or use any text editor
```

**3. Set environment variables (optional):**
```bash
cp .env.example .env
nano .env
```

### 📝 Configuration Options

**Basic Settings:**

| Setting | What it does | Example |
|---------|-------------|---------|
| `keywords` | Job titles you want | `["Software Engineer", "Backend Developer"]` |
| `locations` | Where you want to work | `["Remote", "San Francisco, CA"]` |
| `salary_min` | Minimum salary (USD/year) | `120000` |
| `title_allowlist` | ONLY show these titles | `["Senior Engineer", "Staff Engineer"]` |
| `title_blocklist` | NEVER show these titles | `["Manager", "Intern", "Contract"]` |
| `blacklisted_companies` | Companies to skip | `["Meta", "Amazon"]` |

**Job Sources:**

| Source | Requires API Key? | How to get key |
|--------|-------------------|----------------|
| Indeed | ❌ No | N/A (web scraping) |
| LinkedIn | ❌ No | N/A (web scraping) |
| Glassdoor | ❌ No | N/A (web scraping) |
| Reed (UK) | ✅ Yes | https://www.reed.co.uk/developers |
| JobsWithGPT | ❌ No | N/A |

**Notifications:**

| Type | Setup Guide | Cost |
|------|-------------|------|
| Slack | [Slack Setup](docs/SLACK_SETUP.md) | Free |
| Email | [Email Setup](docs/EMAIL_SETUP.md) | Free |

### 📋 Example Configurations

**Example 1: Entry-Level Remote Jobs**
```json
{
  "keywords": ["Junior Developer", "Software Engineer", "Python Developer"],
  "locations": ["Remote"],
  "salary_min": 60000,
  "companies": [
    {
      "id": "stripe",
      "board_type": "lever",
      "url": "https://jobs.lever.co/stripe"
    }
  ],
  "job_sources": {
    "indeed": { "enabled": true },
    "linkedin": { "enabled": true }
  }
}
```

**Example 2: Senior Roles in Tech Hubs**
```json
{
  "title_allowlist": ["Senior Engineer", "Staff Engineer", "Principal Engineer"],
  "keywords": ["Backend", "Infrastructure", "Platform"],
  "locations": ["San Francisco, CA", "New York, NY", "Remote"],
  "salary_min": 180000,
  "blacklisted_companies": ["Meta", "Amazon"],
  "keywords_boost": ["Kubernetes", "AWS", "Golang", "Rust"],
  "job_sources": {
    "linkedin": { "enabled": true },
    "glassdoor": { "enabled": true }
  },
  "slack": {
    "webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK",
    "channel": "#senior-jobs"
  }
}
```

**Example 3: Security Engineer (Specific Companies)**
```json
{
  "title_allowlist": ["Security Engineer", "AppSec", "Product Security"],
  "keywords": ["Zero Trust", "Penetration Testing", "Cloud Security"],
  "locations": ["Remote", "US"],
  "salary_min": 150000,
  "companies": [
    {
      "id": "cloudflare",
      "board_type": "greenhouse",
      "url": "https://boards.greenhouse.io/cloudflare"
    },
    {
      "id": "stripe",
      "board_type": "lever", 
      "url": "https://jobs.lever.co/stripe"
    }
  ],
  "keywords_boost": ["Bug Bounty", "Red Team", "SIEM", "SOC"],
  "digest_min_score": 80
}
```

### 🎯 Configuration Tips

**Best Practices:**
- ✅ Start broad, narrow down later
- ✅ Use `title_allowlist` for specific roles
- ✅ Add 3-5 keywords max (more = less focused)
- ✅ Include "Remote" if you're flexible on location
- ✅ Set realistic `salary_min` for your experience level

**Common Mistakes:**
- ❌ Too many keywords (returns nothing)
- ❌ Salary too high for experience level
- ❌ Forgetting to enable job sources
- ❌ Using wrong location format (use "City, State" or "Remote")

### 🔒 Secrets Management

**Never put secrets in config files!** Use `.env` file:

```bash
# .env file (never commit this!)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
OPENAI_API_KEY=sk-...
REED_API_KEY=...

# For email notifications
EMAIL_SMTP_SERVER=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_FROM=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_TO=your-email@gmail.com
```

**Security:** Add `.env` to `.gitignore` (already done). Use environment-specific `.env` files for different deployments.

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
