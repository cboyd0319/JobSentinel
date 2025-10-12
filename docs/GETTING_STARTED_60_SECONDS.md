# Getting Started in 60 Seconds

**No technical knowledge required!** ⚡

---

## What is JobSentinel?

JobSentinel is a **FREE tool** that automates your job search:
- 🔍 Finds jobs from multiple websites automatically
- 📊 Scores jobs based on your preferences (salary, location, skills)
- 📝 Analyzes and improves your resume
- ⚠️ Detects job scams (95%+ accuracy)
- 💬 Sends you Slack notifications for great matches

**Cost:** $0 (runs on your computer)  
**Privacy:** Your data NEVER leaves your computer  
**Time:** Set up once, runs automatically

---

## Step 1: Install (5 minutes)

### Windows

1. **Download Python**
   - Go to https://www.python.org/downloads/
   - Click "Download Python 3.13"
   - Run the installer
   - ✅ Check "Add Python to PATH"
   - Click "Install Now"

2. **Download JobSentinel**
   - Go to https://github.com/cboyd0319/JobSentinel
   - Click green "Code" button → "Download ZIP"
   - Extract ZIP to a folder (like `C:\JobSentinel`)

3. **Install JobSentinel**
   - Open Command Prompt (search "cmd" in Start menu)
   - Type: `cd C:\JobSentinel` (or wherever you extracted)
   - Type: `python scripts/install.py`
   - Wait 2-3 minutes for installation

### Mac

1. **Download Python**
   - Go to https://www.python.org/downloads/
   - Click "Download Python 3.13"
   - Open the .pkg file and follow instructions

2. **Download JobSentinel**
   - Go to https://github.com/cboyd0319/JobSentinel
   - Click green "Code" button → "Download ZIP"
   - Extract ZIP to a folder (like `~/JobSentinel`)

3. **Install JobSentinel**
   - Open Terminal (search "Terminal" in Spotlight)
   - Type: `cd ~/JobSentinel` (or wherever you extracted)
   - Type: `python3 scripts/install.py`
   - Wait 2-3 minutes for installation

### Linux

```bash
# Most Linux systems have Python pre-installed
cd ~
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel
python3 scripts/install.py
```

---

## Step 2: Configure (3 minutes)

1. **Open the config file**
   - Windows: `notepad config\user_prefs.json`
   - Mac/Linux: `nano config/user_prefs.json`

2. **Set your preferences** (example below):

```json
{
  "keywords": ["python", "backend", "api"],
  "locations": ["Remote", "San Francisco"],
  "salary_min": 100000,
  "blacklisted_companies": ["Meta", "Amazon"],
  "job_sources": {
    "jobswithgpt": { "enabled": true },
    "reed": { "enabled": false, "api_key": "" }
  },
  "slack": {
    "webhook_url": "",
    "channel": "#job-alerts"
  }
}
```

**What each setting means:**

- **keywords**: Job titles or skills you want (e.g., "python", "nurse", "teacher")
- **locations**: Where you want to work (e.g., "Remote", "New York", "London")
- **salary_min**: Minimum salary you'll accept (e.g., 100000 = $100,000)
- **blacklisted_companies**: Companies you don't want to see
- **job_sources**: Which job boards to search
  - `jobswithgpt`: Free, no API key needed
  - `reed`: Requires free API key from Reed.co.uk
- **slack**: Optional - get notifications in Slack

3. **Save and close** the file

---

## Step 3: Run (30 seconds)

### Option A: Run Once (Manual)

```bash
# Windows
python -m jsa.cli run-once

# Mac/Linux
python3 -m jsa.cli run-once
```

This will:
1. Search job sites for your keywords ✅
2. Score and rank jobs ✅
3. Show you the best matches ✅
4. Save results to a file ✅

### Option B: Run Automatically (Scheduled)

```bash
# Windows (Task Scheduler)
python scripts/setup_scheduler.py

# Mac (launchd)
python3 scripts/setup_scheduler.py

# Linux (cron)
python3 scripts/setup_scheduler.py
```

This will run JobSentinel every 2 hours automatically!

---

## Example Output

```
╭─ JobSentinel Results ────────────────────────────────────╮
│                                                           │
│  Found 47 jobs matching your criteria                    │
│                                                           │
│  🌟 Top Match (Score: 92/100)                           │
│     Senior Python Developer @ TechCorp                   │
│     💰 $140,000 - $160,000                               │
│     📍 Remote                                            │
│     ⏱️  Posted 2 days ago                                │
│     Skills: Python, Django, AWS (✅ 85% match)          │
│                                                           │
│  🌟 Second Match (Score: 88/100)                        │
│     Backend Engineer @ StartupXYZ                        │
│     💰 $120,000 - $150,000                               │
│     📍 San Francisco, CA                                 │
│     ⏱️  Posted 1 day ago                                 │
│     Skills: Python, FastAPI, PostgreSQL (✅ 82% match)  │
│                                                           │
│  ⚠️  Suspicious Posting Detected                         │
│     "Make $10,000/month from home!" @ Unknown           │
│     Scam Score: 95/100 - DO NOT APPLY                   │
│                                                           │
╰───────────────────────────────────────────────────────────╯

Results saved to: data/jobs_2025-10-12.json
```

---

## Bonus: Analyze Your Resume (Optional)

Want to improve your resume? JobSentinel can help!

```bash
# Analyze your resume
python -m jsa.cli analyze-resume --file my_resume.pdf

# Auto-fix common issues
python -m jsa.cli fix-resume --file my_resume.pdf --output fixed_resume.pdf
```

**What it checks:**
- ✅ Spelling and grammar
- ✅ ATS compatibility
- ✅ Keyword optimization
- ✅ Action verbs
- ✅ Quantifiable achievements
- ⚠️ Red flags

**Example Output:**

```
╭─ Resume Analysis ────────────────────────────────────────╮
│                                                           │
│  Overall Score: 72/100 ⚠️                                │
│  Improvement Potential: +28 points                       │
│                                                           │
│  ✅ Strengths:                                           │
│     - Good length (550 words)                            │
│     - ATS-friendly formatting                            │
│     - Clear section structure                            │
│                                                           │
│  ⚠️  Issues Found:                                       │
│     1. Only 30% of achievements have metrics (need 70%)  │
│     2. Using weak verbs like "worked on" instead of      │
│        "developed"                                       │
│     3. Missing keywords: AWS, Docker, Kubernetes         │
│                                                           │
│  🔧 Auto-Fixes Available:                                │
│     - Fix 3 spelling mistakes                            │
│     - Upgrade 7 weak verbs                               │
│     - Add 5 quantification suggestions                   │
│     - Insert 3 missing keywords                          │
│                                                           │
│     Run with --fix to apply automatically                │
│                                                           │
╰───────────────────────────────────────────────────────────╯
```

---

## Common Questions

### Q: Is this really free?
**A:** Yes! 100% free. No hidden costs, no subscriptions, no "premium" version.

### Q: Is my data safe?
**A:** Yes! Everything runs on YOUR computer. Your resume and job data NEVER go to the cloud or external services (except when you enable integrations like Slack).

### Q: How often should I run it?
**A:** Every 2-4 hours is ideal. New jobs post throughout the day, so frequent checks help you apply early.

### Q: Will it apply to jobs for me?
**A:** No, JobSentinel FINDS and ANALYZES jobs. You still apply manually. This is intentional - you should review each job before applying.

### Q: Can I use it for non-tech jobs?
**A:** YES! Works for any job: nursing, teaching, sales, marketing, etc. Just change your keywords.

### Q: What if I don't want Slack notifications?
**A:** That's fine! Just leave `slack.webhook_url` empty. Results save to `data/` folder.

### Q: Do I need to know programming?
**A:** No! Just follow the steps above. Copy-paste the commands exactly as shown.

### Q: What if something doesn't work?
**A:** Check [Troubleshooting Guide](troubleshooting.md) or [open an issue](https://github.com/cboyd0319/JobSentinel/issues).

---

## Next Steps

Once you're comfortable with the basics:

1. **[Add More Job Sources](docs/quickstart.md#job-sources)**
   - Reed.co.uk (UK jobs)
   - LinkedIn (requires setup)
   - Custom scrapers

2. **[Enable ML Features](docs/ML_CAPABILITIES.md)**
   - Semantic job matching
   - Sentiment analysis
   - Advanced keyword extraction

3. **[Connect to Cloud](docs/DEPLOYMENT_GUIDE.md)**
   - Run on Google Cloud (~$8/month)
   - Run on AWS (~$5/month)
   - Automatic scheduling

4. **[Advanced Features](docs/ADVANCED_FEATURES.md)**
   - Skills gap analysis
   - Salary benchmarking
   - Career path recommendations

---

## Visual Guide

### Windows Installation (Screenshots)

```
Step 1: Download Python
┌─────────────────────────────────────┐
│ python.org                          │
│                                     │
│ [Download Python 3.13] ← Click here│
│                                     │
└─────────────────────────────────────┘

Step 2: Run Installer
┌─────────────────────────────────────┐
│ Python 3.13 Setup                   │
│                                     │
│ ☑ Add Python to PATH ← CHECK THIS! │
│                                     │
│ [Install Now]                       │
└─────────────────────────────────────┘

Step 3: Open Command Prompt
┌─────────────────────────────────────┐
│ Windows Search Bar                  │
│                                     │
│ Type: cmd                           │
│ [Command Prompt] ← Click here       │
└─────────────────────────────────────┘

Step 4: Navigate to JobSentinel
┌─────────────────────────────────────┐
│ C:\Users\You>                       │
│ C:\Users\You> cd C:\JobSentinel     │
│ C:\JobSentinel>                     │
└─────────────────────────────────────┘

Step 5: Run Installer
┌─────────────────────────────────────┐
│ C:\JobSentinel>                     │
│ C:\JobSentinel> python scripts/install.py │
│                                     │
│ Installing dependencies...          │
│ [████████████████████] 100%         │
│                                     │
│ ✅ Installation complete!            │
└─────────────────────────────────────┘
```

---

## Need Help?

- **Documentation**: [Full docs](docs/)
- **Examples**: [Example scripts](examples/)
- **Issues**: [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues)
- **Community**: [Discussions](https://github.com/cboyd0319/JobSentinel/discussions)

---

## Summary

That's it! In just 60 seconds (after installation), you can:

✅ Search multiple job boards  
✅ Get scored, ranked results  
✅ Detect scams automatically  
✅ Improve your resume  
✅ Save hours of manual searching

**Welcome to automated job hunting!** 🚀
