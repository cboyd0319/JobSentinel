# JobSentinel v1.0 - Quick Start Guide

**Privacy-first job search automation for Windows 11+**

---

## 🚀 Installation

### For Users (Windows 11+)

1. **Download the installer:**
   - Go to the [Releases](https://github.com/yourusername/JobSentinel/releases) page
   - Download `JobSentinel-1.0.0-x64.msi`

2. **Run the installer:**
   - Double-click the `.msi` file
   - Follow the installation wizard
   - **No admin rights required** (installs to `%LOCALAPPDATA%\JobSentinel`)

3. **First launch:**
   - JobSentinel will appear in your system tray (bottom-right corner)
   - The setup wizard will automatically open
   - Follow the 4-step configuration process

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
   - Create a webhook: https://api.slack.com/messaging/webhooks
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

- **Left-click icon:** Open dashboard
- **Right-click icon:**
  - **Open Dashboard** - View your job matches
  - **Search Now** - Manually trigger job scraping
  - **Settings** - Modify your preferences
  - **Quit** - Exit JobSentinel

### Dashboard

The dashboard shows:

- **Recent Jobs** - Latest job matches sorted by score
- **Statistics** - Total jobs, high matches, average score
- **Search Bar** - Full-text search across all jobs

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

1. Go to https://api.slack.com/messaging/webhooks
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

- **Database:** `%LOCALAPPDATA%\JobSentinel\jobs.db` (SQLite)
- **Configuration:** `%LOCALAPPDATA%\JobSentinel\config.json`
- **Logs:** `%LOCALAPPDATA%\JobSentinel\logs\` (if enabled)

**Privacy:** No data is ever sent to external servers (except Slack notifications if enabled).

---

## 🛠️ Troubleshooting

### JobSentinel won't start

1. Check if it's already running in the system tray
2. Look for error messages in: `%LOCALAPPDATA%\JobSentinel\logs\`
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
4. **Review logs** - Look for error messages in `%LOCALAPPDATA%\JobSentinel\logs\`

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

**Optional external services:**
- Slack (only if you enable notifications)
- Job board APIs (Greenhouse, Lever, JobsWithGPT)

---

## 📚 Additional Resources

- **Full Documentation:** See [GETTING_STARTED.md](GETTING_STARTED.md)
- **Configuration Examples:** See [config.example.json](config.example.json)
- **Environment Variables:** See [.env.example](.env.example)
- **Report Issues:** https://github.com/yourusername/JobSentinel/issues
- **Developer Guide:** See [GETTING_STARTED.md](GETTING_STARTED.md) → Development section

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

| Action | How To |
|--------|--------|
| Open dashboard | Left-click tray icon |
| Manual search | Right-click tray → "Search Now" |
| View settings | Right-click tray → "Settings" |
| Edit config | Open `%LOCALAPPDATA%\JobSentinel\config.json` |
| View database | Use SQLite browser on `jobs.db` |
| Check logs | Open `%LOCALAPPDATA%\JobSentinel\logs\` |
| Test webhook | Setup wizard → "Test Webhook" button |
| Quit app | Right-click tray → "Quit" |

---

## ❓ Getting Help

**Stuck? Have questions?**

1. Check this guide and [GETTING_STARTED.md](GETTING_STARTED.md)
2. Search existing [GitHub Issues](https://github.com/yourusername/JobSentinel/issues)
3. Create a new issue with:
   - Your Windows version
   - JobSentinel version
   - Steps to reproduce the problem
   - Relevant log snippets (from `%LOCALAPPDATA%\JobSentinel\logs\`)

---

**Happy job hunting! 🚀**

*JobSentinel v1.0 - Privacy-first, locally-run job search automation*
