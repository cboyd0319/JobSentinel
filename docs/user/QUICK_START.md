# JobSentinel - Quick Start Guide

**Privacy-first job search automation**

> **Note:** Pre-built installers are not yet available. See [Building from Source](#building-from-source) below.

---

## Current Status

**Version 2.0.0** (January 2026)

- Windows 11+ is the primary target platform
- macOS 26.2+ (Tahoe) and Linux support planned for v2.1+
- All core features working (13 scrapers, ghost detection, scoring, multi-channel notifications)
- **NEW: Resume Builder & ATS Optimizer** - Create professional resumes with 5 ATS-optimized templates
- **NEW: Secure credential storage** via OS keyring (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- 2078+ tests passing

<p align="center">
  <img src="../images/dashboard.png" alt="JobSentinel Dashboard" width="700">
  <br>
  <em>The JobSentinel Dashboard showing job listings with smart scoring</em>
</p>

---

## Building from Source

### Prerequisites

- **Rust** 1.83+ ([rustup.rs](https://rustup.rs/))
- **Node.js** 20+ ([nodejs.org](https://nodejs.org/))
- **Tauri CLI** 2.1+ (`cargo install tauri-cli`)

### Build Steps

```bash
# Clone the repository
git clone https://github.com/cboyd0319/JobSentinel.git
cd JobSentinel

# Install frontend dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

### First Launch

1. JobSentinel will appear in your system tray (Windows) or menu bar (macOS)
2. The setup wizard will automatically open
3. Follow the 4-step configuration process

---

## ⚙️ Configuration

### Setup Wizard (First Run)

The setup wizard guides you through:

1. **Job Titles** - What positions are you looking for?
   - Example: "Security Engineer", "Product Security Engineer"

2. **Location Preferences** - Where do you want to work?
   - Remote, Hybrid, or Onsite
   - Specific cities/states (optional)

3. **Salary Requirements** - What's your minimum salary?
   - Enter amount in USD
   - Partial credit for unlisted salaries

4. **Slack Notifications** - Get alerts for high matches
   - Create a webhook: <https://api.slack.com/messaging/webhooks>
   - Paste the webhook URL

### Manual Configuration

You can also edit the configuration file directly:

**Location:** `%LOCALAPPDATA%\JobSentinel\config.json`

**Example:**

```json
{
  "title_allowlist": ["Security Engineer"],
  "location_preferences": {
    "allow_remote": true,
    "allow_hybrid": true,
    "allow_onsite": false
  },
  "salary_floor_usd": 150000,
  "alerts": {
    "slack": {
      "enabled": true,
      "webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
    }
  }
}
```

See `config.example.json` in the project root for all available options.

---

## 📖 Usage

### System Tray

JobSentinel runs in your system tray with these options:

- **Left-click icon:** Toggle dashboard visibility
- **Right-click icon:**
  - **Open Dashboard** - View your job matches
  - **Search Now** - Manually trigger job scraping
  - **Quit** - Exit JobSentinel

**Note:** To modify settings, edit the configuration file at `%LOCALAPPDATA%\JobSentinel\config.json`

### Dashboard

The dashboard shows:

- **Recent Jobs** - Latest job matches sorted by score
- **Statistics** - Total jobs, high matches, average score
- **Search Bar** - Full-text search across all jobs
- **Ghost Filter** - Filter out suspected fake/stale job postings

---

## ⌨️ Keyboard Shortcuts

JobSentinel includes keyboard shortcuts for power users:

| Shortcut | Action | Context |
|----------|--------|---------|
| `b` | Toggle bookmark | When job is focused |
| `n` | Open notes modal | When job is focused |
| `c` | View company details | When job is focused |
| `/` | Focus search bar | Dashboard |
| `?` | Show keyboard help | Global |
| `r` | Refresh job list | Dashboard |
| `x` | Clear search | Dashboard |
| `Esc` | Close modal | Any modal open |

**Tip:** Press `?` anywhere in the app to see the full keyboard shortcuts help modal.

---

## 🔍 Advanced Search

### Boolean Operators

JobSentinel supports boolean search operators:

| Operator | Example | Matches |
|----------|---------|---------|
| `AND` | `python AND remote` | Jobs with both terms |
| `OR` | `react OR vue` | Jobs with either term |
| `NOT` | `engineer NOT junior` | Jobs without excluded term |
| Quotes | `"senior engineer"` | Exact phrase match |

**Examples:**

```text
security AND (engineer OR architect) NOT junior
"product manager" AND remote
python OR rust AND senior
```

### Saved Searches

Save frequently used search queries for quick access:

1. Enter your search query
2. Click the **Save** icon next to the search bar
3. Name your saved search
4. Access saved searches from the dropdown menu

Saved searches are stored in the local database and persist across sessions.

### Search History

Your recent searches are automatically saved (up to 100 entries). Access them by:

- Clicking the search bar to see recent queries
- Using the dropdown arrow to browse history
- Clicking any history item to re-run the search

---

## 🏢 Company Research

JobSentinel includes a built-in company research panel with data on 40+ major tech companies:

### What's Included

- **Tech Stack** - Primary technologies used
- **Company Size** - Employee count range
- **Funding Stage** - Startup to public
- **Known For** - Company highlights
- **Glassdoor Rating** - If available

### How to Use

1. Click on any job in the dashboard
2. Click the company name or press `c`
3. View the company research panel

**Supported companies include:** Google, Meta, Amazon, Microsoft, Apple, Netflix, Stripe,
Airbnb, Uber, Lyft, DoorDash, Coinbase, Robinhood, and many more.

---

## 📝 Cover Letter Templates

Create and manage cover letter templates with smart placeholders:

### Template Placeholders

| Placeholder | Replaced With |
|-------------|---------------|
| `{{company}}` | Company name from job |
| `{{position}}` | Job title |
| `{{date}}` | Current date |
| `{{salary}}` | Salary range (if available) |

### Managing Templates

1. Navigate to **Cover Letters** from the sidebar
2. Click **New Template** to create a template
3. Use placeholders for dynamic content
4. Categorize templates (e.g., "Technical", "Management", "Startup")

### Using Templates

1. Open a job you want to apply to
2. Click **Generate Cover Letter**
3. Select a template
4. Review and customize the generated letter
5. Copy or export

---

## 📄 Resume Builder (v2.0)

Create professional, ATS-optimized resumes directly in JobSentinel.

### 7-Step Resume Wizard

1. **Contact Information** - Name, email, phone, LinkedIn, GitHub, website
2. **Professional Summary** - 2-3 sentence career overview
3. **Work Experience** - Add positions with achievements and dates
4. **Education** - Degrees, institutions, GPA, honors
5. **Skills** - Technical and soft skills with proficiency levels
6. **Preview** - Choose from 5 ATS-optimized templates
7. **Export** - Download as DOCX or view HTML preview

### ATS-Optimized Templates

| Template | Best For |
|----------|----------|
| **Classic** | General use, traditional format |
| **Modern** | Tech companies, clean design |
| **Technical** | Engineering roles, skills-first |
| **Executive** | Senior positions, leadership focus |
| **Military** | Veterans, civilian-friendly terms |

All templates are designed for maximum ATS compatibility:

- Single-column layout
- Standard fonts (Arial, Calibri, Times New Roman)
- No tables, graphics, or icons
- Clear section headers

### ATS Optimizer

Analyze your resume against job descriptions:

1. Navigate to **Resume Optimizer** from the sidebar
2. Paste the job description
3. Enter your resume data
4. Click **Analyze** to get ATS scores
5. Review keyword matches and suggestions

**Scores provided:**

- **Overall Score** - Combined ATS compatibility (target: 80+)
- **Keyword Match** - Job description keyword coverage
- **Format Score** - ATS-safe formatting compliance
- **Completeness** - All important sections present

See [Resume Builder Documentation](../features/resume-builder.md) for full details.

---

## 👻 Ghost Job Detection

JobSentinel automatically detects potentially fake or stale job postings ("ghost jobs"):

### Ghost Indicators

| Severity | Color | Meaning |
|----------|-------|---------|
| Low | Yellow | Minor concerns (50-59% ghost score) |
| Medium | Orange | Multiple warning signs (60-74%) |
| High | Red | Likely ghost job (75%+) |

### Detection Signals

- **Stale postings** - Posted 60+ days ago
- **Frequent reposts** - Same job reposted multiple times
- **Vague descriptions** - Generic phrases like "fast-paced environment"
- **Missing salary** - No compensation information
- **Excessive openings** - Company has 100+ similar positions

### Filtering Ghost Jobs

Use the ghost filter dropdown on the Dashboard:

- **All Jobs** - Show everything
- **Real Jobs Only** - Hide ghost jobs (score < 0.5)
- **Ghost Jobs** - Show only flagged jobs for review

See [Ghost Detection Documentation](../features/ghost-detection.md) for full details.

### Automatic Scraping

By default, JobSentinel runs every **2 hours** automatically:

1. Scrapes jobs from Greenhouse, Lever, and JobsWithGPT
2. Scores each job based on your preferences
3. Stores results in local database (SQLite)
4. Sends Slack alerts for high matches (score ≥ 90%)

You can change the interval in `config.json`:

```json
{
  "scraping_interval_hours": 2
}
```

---

## 🔔 Notifications

### Slack Alerts

High-scoring jobs (≥90% match) trigger immediate Slack notifications with:

- Job title and company
- Match score and breakdown
- Location and salary (if available)
- Direct link to apply

**Setting up Slack webhook:**

1. Go to <https://api.slack.com/messaging/webhooks>
2. Click "Create New App" → "From Scratch"
3. Name it "JobSentinel" and select your workspace
4. Enable "Incoming Webhooks"
5. Click "Add New Webhook to Workspace"
6. Copy the webhook URL and paste it in the setup wizard or config file

### Testing Your Webhook

In the setup wizard, click **"Test Webhook"** to verify it works.

Or use the command line:

```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"JobSentinel test notification"}' \
  YOUR_WEBHOOK_URL
```

---

## 🔍 Scoring System

JobSentinel uses a **multi-factor scoring algorithm** (0-100%):

| Factor | Weight | What it measures |
|--------|--------|------------------|
| **Skills** | 40% | Title match, keyword boost/exclude |
| **Salary** | 25% | Meets salary floor requirement |
| **Location** | 20% | Remote/Hybrid/Onsite preference |
| **Company** | 10% | Reputation (v1.1 feature) |
| **Recency** | 5% | Job posted within last 7 days |

**Example:**

- Job title "Security Engineer" matches allowlist: +40%
- Salary $180k exceeds $150k floor: +25%
- Remote position matches preference: +20%
- Posted 2 days ago: +5%
- **Total: 90%** → Triggers immediate alert! 🎯

---

## 📊 Data Storage

All data is stored **locally on your machine**:

**Windows:**

- **Database:** `%LOCALAPPDATA%\JobSentinel\jobs.db` (SQLite)
- **Configuration:** `%LOCALAPPDATA%\JobSentinel\config.json`
- **Logs:** Enable with `RUST_LOG=debug` environment variable

**macOS:**

- **Database:** `~/Library/Application Support/JobSentinel/jobs.db` (SQLite)
- **Configuration:** `~/.config/jobsentinel/config.json`
- **Logs:** Enable with `RUST_LOG=debug` environment variable

**Privacy:** No data is ever sent to external servers (except Slack notifications if enabled).

---

## 🛠️ Troubleshooting

### JobSentinel won't start

1. Check if it's already running in the system tray
2. Run with `RUST_LOG=debug` to see detailed error messages
3. Try reinstalling from the `.msi` file

### No jobs found

1. **Check your title allowlist** - Make sure it's not too specific
2. **Broaden location preferences** - Try allowing remote + hybrid
3. **Lower salary floor** - Start at $0 and increase gradually
4. **Manual trigger** - Right-click tray icon → "Search Now"

### Slack notifications not working

1. **Verify webhook URL** - Should start with `https://hooks.slack.com/`
2. **Test in browser** - Visit the webhook URL (should show "Invalid request")
3. **Check permissions** - Make sure the Slack app is authorized
4. **Review logs** - Run with `RUST_LOG=debug` to see detailed error messages

### Database errors

If you see database corruption errors:

1. Close JobSentinel
2. Backup your database: `%LOCALAPPDATA%\JobSentinel\jobs.db`
3. Delete the database file (will be recreated on next launch)
4. Restart JobSentinel

### High CPU usage

JobSentinel only uses CPU during scraping cycles (a few minutes every 2 hours). If CPU usage is constantly high:

1. Check if multiple instances are running
2. Increase `scraping_interval_hours` in config
3. Report the issue on GitHub

### macOS-Specific Issues

**"JobSentinel" cannot be opened because the developer cannot be verified**

1. Right-click JobSentinel in Applications
2. Select "Open"
3. Click "Open" in the security dialog
4. macOS will remember this choice

**Menu bar icon not appearing:**

1. Check System Settings → Control Center → Menu Bar Only
2. Ensure JobSentinel is allowed in menu bar
3. Try restarting the app

**Permission errors accessing database:**

```bash
# Fix permissions
chmod 755 ~/Library/Application\ Support/JobSentinel
chmod 644 ~/Library/Application\ Support/JobSentinel/jobs.db
```

**"Operation not permitted" errors:**

1. Go to System Settings → Privacy & Security → Full Disk Access
2. Add JobSentinel to the list
3. Restart JobSentinel

**Notifications not showing:**

1. Go to System Settings → Notifications
2. Find JobSentinel in the list
3. Enable "Allow Notifications"
4. Set notification style to "Alerts" or "Banners"

**Database locked errors:**

```bash
# Check for other instances
ps aux | grep JobSentinel

# Kill if found
killall JobSentinel

# Restart
open -a JobSentinel
```

---

## 🔐 Security & Privacy

JobSentinel is designed with **security-first principles**:

- ✅ **No telemetry** - Zero data collection
- ✅ **Local-only** - All data stored on your machine
- ✅ **No admin rights** - Runs in user space
- ✅ **Open source** - Audit the code yourself
- ✅ **HTTPS only** - All web requests use TLS
- ✅ **SQLite** - No external database required
- ✅ **SHA-256 deduplication** - Cryptographic hashing
- ✅ **Secure credential storage** (v2.0) - All passwords/tokens in OS keyring

### Secure Credential Storage (v2.0)

All sensitive credentials are stored in your OS's secure credential manager:

| Platform | Credential Store |
|----------|-----------------|
| **Windows** | Windows Credential Manager |
| **macOS** | Keychain |
| **Linux** | Secret Service (GNOME Keyring, KWallet) |

**Secured credentials:**

- SMTP password (email notifications)
- Slack/Discord/Teams webhook URLs
- Telegram bot token
- LinkedIn session cookie

Credentials are **never stored in plaintext** in the config file.
See [Keyring Documentation](../security/KEYRING.md) for full details.

**Optional external services:**

- Slack (only if you enable notifications)
- Job board APIs (Greenhouse, Lever, JobsWithGPT)

---

## 📚 Additional Resources

- **Full Documentation:** See [Getting Started](../developer/GETTING_STARTED.md)
- **Configuration Examples:** See [config.example.json](../../config.example.json)
- **Environment Variables:** See [.env.example](../../.env.example)
- **Report Issues:** <https://github.com/cboyd0319/JobSentinel/issues>
- **Developer Guide:** See [Developer Guide](../developer/GETTING_STARTED.md) → Development section

---

## 💡 Tips for Best Results

1. **Start broad, narrow down:**
   - Begin with multiple job titles in allowlist
   - Add blocklist terms as you see irrelevant results
   - Fine-tune keywords over time

2. **Use keyword boost strategically:**
   - Add specific technologies you want (e.g., "Kubernetes", "Rust")
   - Each matching keyword adds +5% to score

3. **Exclude deal-breakers:**
   - Add keywords_exclude for things you absolutely don't want
   - Jobs matching exclude keywords get 0% score

4. **Adjust alert threshold:**
   - Default is 90% for immediate alerts
   - Lower to 80% if you want more notifications
   - Raise to 95% if you only want perfect matches

5. **Check the dashboard regularly:**
   - Jobs scoring 70-89% might still be great opportunities
   - Use the search bar to find specific companies or technologies

---

## 🎯 Quick Command Reference

### Windows

| Action | How To |
|--------|--------|
| Open dashboard | Left-click tray icon |
| Manual search | Right-click tray → "Search Now" |
| Edit config | Open `%LOCALAPPDATA%\JobSentinel\config.json` |
| View database | Use SQLite browser on `%LOCALAPPDATA%\JobSentinel\jobs.db` |
| Check logs | Run with `RUST_LOG=debug` environment variable |
| Quit app | Right-click tray → "Quit" |

### macOS

| Action | How To |
|--------|--------|
| Open dashboard | Click menu bar icon |
| Manual search | Right-click menu bar icon → "Search Now" |
| Edit config | `open ~/.config/jobsentinel/config.json` |
| View database | `sqlite3 ~/Library/Application\ Support/JobSentinel/jobs.db` |
| View database (GUI) | Use [DB Browser for SQLite](https://sqlitebrowser.org/) |
| Check logs | Run with `RUST_LOG=debug` environment variable |
| Quit app | Right-click menu bar icon → "Quit" or Cmd+Q |

---

## ❓ Getting Help

**Stuck? Have questions?**

1. Check this guide and the [Developer Guide](../developer/GETTING_STARTED.md)
2. Search existing [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues)
3. Create a new issue with:
   - Your OS version (Windows 11+ or macOS 26.2+)
   - JobSentinel version
   - Steps to reproduce the problem
   - Relevant error messages (run with `RUST_LOG=debug`)

---

**Happy job hunting! 🚀**

*JobSentinel v2.0.0 - Privacy-first, locally-run job search automation with secure credential storage*
