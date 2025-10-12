# JobSentinel Frequently Asked Questions (FAQ)
## For Non-Technical Users

**Last Updated:** January 12, 2025

---

## 🤔 General Questions

### What is JobSentinel?

JobSentinel is a tool that automatically searches job boards for you and alerts you when it finds good matches. Think of it as having a personal assistant who checks job sites 24/7 and only shows you the best opportunities.

**In simple terms:**
- You tell it what jobs you want (e.g., "Marketing Manager in New York")
- It searches multiple job sites automatically
- It scores each job based on how well it matches your preferences
- It sends you alerts (Slack, email) for the best matches
- All your data stays on YOUR computer (privacy-first!)

### Do I need to be "technical" to use this?

**No!** If you can:
- Download a file from the internet
- Copy and paste text
- Answer simple questions about what job you want

...then you can use JobSentinel! We've designed it for regular people, not just programmers.

### How much does it cost?

**Free!** JobSentinel is completely free and open-source. There are some optional costs:

| Feature | Cost |
|---------|------|
| **Basic use (local mode)** | $0/month |
| **AI-powered matching** | ~$2-5/month (optional, uses OpenAI) |
| **Cloud hosting** | ~$5-15/month (optional, only if you want it always running) |

Most users run it for free on their own computer.

### Is my data safe? Where does it go?

**Your data stays on YOUR computer.** JobSentinel doesn't send your resume, preferences, or job applications to any external servers (except optionally to OpenAI for AI matching if you enable it).

Think of it like using Microsoft Word - your documents stay on your computer unless you choose to save them to the cloud.

---

## 📥 Installation Questions

### I've never used "Terminal" or "Command Prompt." What are those?

**Terminal (Mac/Linux)** and **Command Prompt (Windows)** are ways to talk to your computer using text commands instead of clicking buttons.

**Think of it like this:**
- Normally, you click icons to open programs (visual)
- Terminal/Command Prompt lets you type commands (text-based)

**Example:**
- Visual way: Click folder → Click file → Double-click to open
- Terminal way: Type `cd folder`, then `open file`

Both do the same thing! Terminal is just a different (older) way that's sometimes more powerful.

### What is Python? Do I need to learn it?

**Python** is a programming language - the "language" JobSentinel is written in. You do **NOT** need to learn Python to use JobSentinel!

**Think of it like this:**
- Python is like the engine in your car
- You don't need to know how an engine works to drive the car
- You just turn the key and go!

JobSentinel uses Python, but you just run simple commands - no programming required.

### What's a "virtual environment" (venv)?

It's a way to keep JobSentinel's files separate from other programs on your computer.

**Think of it like this:**
- Your computer is like a big apartment building
- A virtual environment is like one apartment with its own furniture
- JobSentinel lives in its apartment and doesn't mess with other apartments

**You don't need to understand this** - the installer creates it automatically!

### The installer says "Installing dependencies." What does that mean?

**Dependencies** are other mini-programs that JobSentinel needs to work.

**Think of it like baking a cake:**
- You need flour, eggs, sugar (ingredients)
- JobSentinel needs Playwright, Flask, SQLAlchemy (dependencies)

The installer automatically gets all these "ingredients" for you.

### How long does installation take?

| Step | Time |
|------|------|
| **Downloading JobSentinel** | 1-2 minutes |
| **Extracting files** | 30 seconds |
| **Running installer** | 10-15 minutes |
| **First-time setup** | 2-3 minutes |
| **Total** | ~15-20 minutes |

Most of this is automated - you just wait!

---

## ⚙️ Configuration Questions

### What is a "configuration file"?

It's a file where JobSentinel stores your preferences (what jobs you want, where, salary, etc.).

**Think of it like this:**
- Like setting up your email filters
- Or creating a Netflix profile with your favorite shows
- The computer remembers what you like!

The file is called `user_prefs.json` and you can edit it two ways:
1. **Easy way:** Answer questions during setup
2. **Manual way:** Edit the file directly (for advanced users)

### What should I put for "keywords"?

Keywords are words that describe the job you want.

**Good examples:**
- Job titles: "Software Engineer", "Marketing Manager", "Accountant"
- Skills: "Python", "Excel", "Social Media", "Bookkeeping"
- Technologies: "AWS", "Salesforce", "QuickBooks"

**Pro tip:** Be specific! 
- ✅ "Senior Python Backend Engineer"
- ❌ "Computer Job"

### What's the difference between "Remote" and a specific location?

- **Remote:** You can work from anywhere (home, coffee shop, anywhere!)
- **Specific location:** You need to physically go to an office (e.g., "New York, NY")

You can combine them: `"Remote, New York, NY"` means remote jobs OR jobs in New York.

### What is a Slack webhook URL? How do I get one?

**Slack** is a messaging app for teams. A **webhook URL** is like a special address where JobSentinel can send job alerts to your Slack.

**How to get one (5 minutes):**

1. Go to: https://api.slack.com/messaging/webhooks
2. Click **"Create an app"**
3. Choose **"From scratch"**
4. Name it "JobSentinel" and select your workspace
5. Click **"Incoming Webhooks"**
6. Turn on **"Activate Incoming Webhooks"**
7. Click **"Add New Webhook to Workspace"**
8. Choose a channel (e.g., #job-alerts)
9. Copy the webhook URL (looks like: `https://hooks.slack.com/services/...`)

**Paste this URL when JobSentinel asks for it!**

**Don't have Slack?** That's okay! You can skip this and just check jobs on your computer.

---

## 🔍 Using JobSentinel

### How do I run a job search?

**Easiest way:**

**Windows:**
1. Press Windows key + R
2. Type `cmd` and press Enter
3. Type:
```bash
cd Downloads\JobSentinel-main
python -m jsa.cli run-once
```

**Mac/Linux:**
1. Open Terminal
2. Type:
```bash
cd ~/Downloads/JobSentinel
python3 -m jsa.cli run-once
```

**That's it!** JobSentinel will search job boards and show you matches.

### How often should I run searches?

**Recommendations:**

| Frequency | When to Use |
|-----------|-------------|
| **Once per day** | Casual job hunting |
| **Twice per day** | Active job search |
| **Every 4-6 hours** | Urgent/competitive market |

We'll show you how to automate this in Week 2!

### What does "score" mean?

JobSentinel gives each job a score from 0 to 1 (or 0% to 100%).

**Scoring guide:**
- **0.9-1.0 (90-100%):** Excellent match! Apply immediately!
- **0.7-0.9 (70-90%):** Good match, worth applying
- **0.5-0.7 (50-70%):** Decent match, review carefully
- **Below 0.5 (<50%):** Not a great match, usually filtered out

**How is the score calculated?**
JobSentinel checks:
- Does the title match your keywords?
- Is the location what you want?
- Is the salary in your range?
- Are required skills mentioned?
- Is the company on your blacklist?

### Where are jobs saved?

Jobs are saved in a database file on your computer:
```
JobSentinel/data/jobs.db
```

You can view them three ways:
1. **Web UI:** Run `python -m jsa.cli web` and open http://localhost:5000
2. **Command:** Run `python -m jsa.cli logs`
3. **Direct:** Open the database file (requires SQLite browser)

### Can I search multiple job sites at once?

**Yes!** JobSentinel searches these sites automatically:
- Indeed
- LinkedIn (limited, due to rate limits)
- Glassdoor
- Google Jobs
- ZipRecruiter
- Reed (UK)
- And more via APIs

You don't have to manually check each site - JobSentinel does it all!

---

## 🚨 Alerts & Notifications

### I'm not getting any alerts. Why?

**Checklist:**

1. **Did you configure Slack?**
   - Run: `python -m jsa.cli test-notifications`
   - If it fails, your webhook URL might be wrong

2. **Are your keywords too specific?**
   - Try broader terms first (e.g., "Engineer" not "Senior Staff Principal Engineer IV")

3. **Is your minimum salary too high?**
   - Check if jobs exist at that salary level in your location

4. **Did you set the alert threshold too high?**
   - In `config/user_prefs.json`, check `immediate_alert_threshold`
   - Default is 0.8 (80% match) - lower it to 0.6 for more alerts

### What's the difference between "immediate alert" and "digest"?

**Immediate Alert:**
- Sent right away when a high-score job is found (>80% match)
- Goes to Slack instantly
- For urgent/exciting opportunities

**Digest:**
- Daily summary of all jobs (>50% match)
- Sent once per day
- Good for reviewing multiple options

**You can configure both!**

### Can I get email alerts instead of Slack?

Email was removed in v0.5.0, but we're adding it back in Phase 1!

**Current options:**
- Slack (recommended)
- Check the web UI manually
- View logs

**Coming soon:**
- Email digests
- SMS alerts (Twilio)
- Discord webhooks

---

## 🛠️ Troubleshooting

### "Command not found" error

**This means** your computer can't find Python or JobSentinel.

**Fix (Windows):**
1. Restart your computer (seriously, this often works!)
2. Make sure you ran `install.py` successfully
3. Try typing `python` instead of `python3`

**Fix (Mac/Linux):**
1. Make sure you're in the JobSentinel folder:
```bash
cd ~/Downloads/JobSentinel
```
2. Try `python3` instead of `python`

### "Permission denied" error

**This means** you don't have permission to run the file.

**Fix (Windows):**
- Right-click the file → "Run as Administrator"

**Fix (Mac/Linux):**
```bash
chmod +x scripts/install.py
```

### "No jobs found" even though I know jobs exist

**Possible reasons:**

1. **Your keywords are too specific**
   - Try broader terms: "Engineer" instead of "Senior Staff Software Architect"

2. **Location mismatch**
   - If you put "Remote", the job must explicitly say "Remote"
   - Try adding specific cities too: "Remote, San Francisco, Seattle"

3. **Job sites are rate-limiting you**
   - Wait 1 hour and try again
   - LinkedIn especially has strict limits

4. **Scraper needs updating**
   - Job sites change their layouts occasionally
   - Check GitHub for updates

### The web UI won't open

**Try these steps:**

1. Make sure the web server is running:
```bash
python -m jsa.cli web
```

2. Look for this message:
```
* Running on http://127.0.0.1:5000
```

3. Open your browser and go to: http://localhost:5000

4. **If it still doesn't work:**
   - Try a different port: `python -m jsa.cli web --port 8080`
   - Then go to: http://localhost:8080

### "Database locked" error

**This means** JobSentinel is already running somewhere else.

**Fix:**
1. Close all Terminal/Command Prompt windows
2. Restart your computer
3. Try again

**Still happening?**
```bash
# Delete the lock file (advanced)
rm data/jobs.db-wal
```

---

## 🔐 Privacy & Security

### Is my data really private?

**Yes!** Here's how:

**What STAYS on your computer:**
- Your resume
- Your job preferences
- Job search history
- Saved jobs
- Database

**What's sent externally:**
- Job board URLs (to scrape jobs) - normal web browsing
- OpenAI API (optional, only if you enable AI matching)
- Slack webhooks (only job titles, not your personal data)

**We do NOT:**
- Upload your resume anywhere
- Share your data with third parties
- Track your searches
- Sell your information

### Can my employer see that I'm job hunting?

**If you use JobSentinel on a work computer: YES, they might.**

**Recommendations:**
- Use your personal computer
- Use your personal internet (not work WiFi)
- Don't use work email for alerts

**JobSentinel itself doesn't notify anyone** - but using work resources leaves traces.

### Should I use a VPN?

**Not necessary** for privacy, but it might help if:
- Job sites are rate-limiting you (blocks after too many searches)
- You're in a region with blocked access to certain sites

**Note:** VPNs can actually trigger MORE rate-limiting, so use only if needed.

---

## 💰 Cost Questions

### Why does the AI feature cost money?

JobSentinel uses OpenAI's GPT models for smart job matching. OpenAI charges for API usage.

**Cost breakdown:**
- Light use (20 jobs/day): ~$2/month
- Normal use (50 jobs/day): ~$5/month
- Heavy use (100 jobs/day): ~$10/month

**You can skip this!** JobSentinel works fine without AI - it just won't be as "smart" at matching.

### What's "cloud hosting" and why would I pay for it?

**Cloud hosting** means JobSentinel runs on someone else's computer (Google, Amazon, etc.) instead of yours.

**Benefits:**
- Runs 24/7 even when your computer is off
- Searches jobs every few hours automatically
- Access from phone/tablet
- No need to keep your laptop on

**Cost:** $5-15/month (Google Cloud, AWS, etc.)

**Most users DON'T need this** - just run it on your computer daily!

---

## 🎓 Advanced Questions

### Can I customize the scoring algorithm?

**Yes!** Edit `config/user_prefs.json`:

```json
{
  "keywords_boost": {
    "Python": 0.3,      // +30% score if "Python" appears
    "Remote": 0.2,      // +20% score for remote jobs
    "AWS": 0.15         // +15% score for AWS experience
  }
}
```

### Can I add custom job sources?

**Yes!** Create a new scraper in `sources/` directory. See developer docs for details.

**Easier way:** Request it as a GitHub issue - we'll add it!

### Can I export my data?

**Yes!** Multiple ways:

1. **CSV export:**
```bash
python -m jsa.cli export-csv --output jobs.csv
```

2. **JSON export:**
```bash
python -m jsa.cli export-json --output jobs.json
```

3. **Direct database access:**
   - File: `data/jobs.db`
   - Use SQLite browser to view

---

## 🆘 Still Need Help?

### Where can I get support?

1. **This FAQ** - Re-read sections above
2. **Error Recovery Guide:** `docs/ERROR_RECOVERY_GUIDE.md`
3. **Installation Guide:** `docs/INSTALLATION_GUIDE.md`
4. **GitHub Issues:** https://github.com/cboyd0319/JobSentinel/issues
5. **Discussions:** Ask the community for help

### How do I report a bug?

1. Go to: https://github.com/cboyd0319/JobSentinel/issues
2. Click **"New Issue"**
3. Choose **"Bug Report"**
4. Fill out the template with:
   - What you tried to do
   - What happened instead
   - Error messages (copy-paste exactly)
   - Your operating system

### Can I contribute?

**Yes!** Even non-technical contributions help:
- Report bugs
- Improve documentation
- Suggest features
- Test on different computers
- Help other users in discussions

---

## 📚 Glossary (Simple Definitions)

| Term | Simple Definition |
|------|-------------------|
| **CLI** | Command Line Interface - typing commands instead of clicking buttons |
| **Terminal** | The program where you type commands (Mac/Linux) |
| **Command Prompt** | Same as Terminal, but for Windows |
| **Python** | Programming language JobSentinel is written in |
| **Virtual Environment** | Isolated folder for JobSentinel's files |
| **Dependencies** | Other mini-programs JobSentinel needs |
| **API** | Way for programs to talk to each other (like job sites) |
| **Webhook** | Special URL where programs send messages |
| **Scraper** | Code that reads job sites and extracts job listings |
| **Score** | 0-100% rating of how well a job matches your preferences |
| **Database** | File where JobSentinel saves all your job data |
| **Cloud** | Running on someone else's computer via internet |

---

*Remember: There are no stupid questions! If something here is confusing, please let us know so we can improve this FAQ.*

**Last Updated:** January 12, 2025  
**Questions? Ask in GitHub Discussions!**
