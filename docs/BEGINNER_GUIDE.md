##Complete Beginner's Guide to JobSentinel

**Never used a terminal? Never written code? No problem!**  
This guide assumes absolutely zero technical knowledge.

---

## 📖 Table of Contents

1. [What is JobSentinel?](#what-is-jobsentinel)
2. [What You Need](#what-you-need)
3. [Step-by-Step Installation](#step-by-step-installation)
4. [First Time Setup](#first-time-setup)
5. [Running Your First Job Search](#running-your-first-job-search)
6. [Understanding the Results](#understanding-the-results)
7. [Common Questions](#common-questions)
8. [Troubleshooting](#troubleshooting)

---

## What is JobSentinel?

JobSentinel is a tool that automatically searches for jobs and tells you about the best matches.

**Think of it like this:**
- You tell it what kind of jobs you want (keywords like "Python" or "Manager")
- It searches multiple job websites for you (while you sleep!)
- It scores each job based on how well it matches what you want
- It sends you notifications (via Slack) for really good matches
- All your data stays on your computer (nothing goes to the cloud unless you want it to)

**What makes it special:**
- ✅ **Free**: No monthly subscription, no hidden costs
- ✅ **Private**: Your data never leaves your computer
- ✅ **Smart**: Uses AI to understand job descriptions
- ✅ **Automatic**: Runs in the background
- ✅ **Honest**: Won't spam you with bad job matches

---

## What You Need

### Required (Must have):
1. **A Computer**
   - Windows 11 or newer
   - macOS 15 (Sequoia) or newer
   - Ubuntu Linux 22.04 or newer

2. **Internet Connection**
   - Needed to download the software and search for jobs
   - Doesn't need to be super fast

3. **About 1 GB of Free Disk Space**
   - For the software and its data

### Optional (Nice to have):
1. **Slack Account** (free)
   - To get instant notifications about good jobs
   - Not required, but highly recommended
   - Sign up at: https://slack.com

2. **Reed.co.uk API Key** (free, UK jobs)
   - For searching Reed.co.uk jobs
   - Only needed if you want UK jobs
   - Get it at: https://www.reed.co.uk/developers

---

## Step-by-Step Installation

### Windows Users

#### Step 1: Open PowerShell
1. Click the Windows Start button (bottom left)
2. Type "PowerShell"
3. Click on "Windows PowerShell" (the blue icon)
4. A black or blue window will open - this is your "terminal"

#### Step 2: Check if Python is Installed
1. In the PowerShell window, type: `python --version`
2. Press Enter
3. What happens next:
   - ✅ If you see "Python 3.12" or "Python 3.13" - great! Skip to Step 4
   - ❌ If you see an error or older version - continue to Step 3

#### Step 3: Install Python (if needed)
1. Go to: https://www.python.org/downloads/
2. Click the big yellow "Download Python" button
3. Run the downloaded file
4. **IMPORTANT**: Check the box that says "Add Python to PATH"
5. Click "Install Now"
6. Wait for it to finish (takes 2-5 minutes)
7. Close and reopen PowerShell
8. Test again: `python --version` should now work

#### Step 4: Download JobSentinel
1. In PowerShell, type:
   ```powershell
   cd Desktop
   git clone https://github.com/cboyd0319/JobSentinel
   cd JobSentinel
   ```
2. Press Enter after each line
3. **Don't have Git?** Download from: https://git-scm.com/downloads

#### Step 5: Run the Setup Wizard
1. Type:
   ```powershell
   python scripts/setup_wizard.py
   ```
2. Press Enter
3. Follow the questions on screen (see [First Time Setup](#first-time-setup))

---

### Mac Users

#### Step 1: Open Terminal
1. Press `Command + Space` (opens Spotlight)
2. Type "Terminal"
3. Press Enter
4. A white or black window opens - this is your "terminal"

#### Step 2: Check if Python is Installed
1. In Terminal, type: `python3 --version`
2. Press Enter
3. What happens next:
   - ✅ If you see "Python 3.12" or higher - great! Skip to Step 4
   - ❌ If you see an error or older version - continue to Step 3

#### Step 3: Install Python (if needed)
1. Go to: https://www.python.org/downloads/
2. Click the big yellow "Download Python" button
3. Open the downloaded file
4. Follow the installer (click Continue, Agree, Install)
5. Wait for it to finish (takes 2-5 minutes)
6. Close and reopen Terminal
7. Test again: `python3 --version` should now work

#### Step 4: Download JobSentinel
1. In Terminal, type:
   ```bash
   cd Desktop
   git clone https://github.com/cboyd0319/JobSentinel
   cd JobSentinel
   ```
2. Press Enter after each line
3. **Don't have Git?** It's usually pre-installed on Mac. If not, run: `xcode-select --install`

#### Step 5: Run the Setup Wizard
1. Type:
   ```bash
   python3 scripts/setup_wizard.py
   ```
2. Press Enter
3. Follow the questions on screen (see [First Time Setup](#first-time-setup))

---

### Linux (Ubuntu) Users

#### Step 1: Open Terminal
1. Press `Ctrl + Alt + T`
2. A black window opens - this is your "terminal"

#### Step 2: Install Python (if needed)
```bash
sudo apt update
sudo apt install python3 python3-pip git
```
(Type your password when asked)

#### Step 3: Download JobSentinel
```bash
cd ~
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel
```

#### Step 4: Run the Setup Wizard
```bash
python3 scripts/setup_wizard.py
```

---

## First Time Setup

The setup wizard will ask you questions. Here's what they mean:

### Question 1: Job Keywords
**"What keywords describe jobs you want?"**

Examples:
- For tech jobs: `python, backend, api, django`
- For marketing jobs: `digital marketing, social media, seo`
- For management: `project manager, team lead, scrum`

**Tip**: Think about words that would appear in your dream job posting.

### Question 2: Locations
**"Where do you want to work?"**

Examples:
- `Remote` (work from home)
- `San Francisco, CA` (specific city)
- `Remote, New York, Boston` (multiple options)

**Tip**: "Remote" is very popular and gives you the most options.

### Question 3: Minimum Salary
**"What's your minimum acceptable salary?"**

Examples:
- `100000` (for $100,000 USD per year)
- `0` (if you don't want to filter by salary)

**Tip**: Be realistic - too high and you'll miss opportunities.

### Question 4: Companies to Avoid
**"Any companies you want to exclude?" (optional)**

Examples:
- `Meta, Amazon` (if you don't want big tech)
- Leave blank if none

### Question 5: Job Sources
**"Which job boards should we search?"**

- **JobsWithGPT**: Free, no setup needed ✅ Recommended
- **Reed.co.uk**: Requires free API key, UK jobs only

**Tip**: Start with just JobsWithGPT. You can add more later.

### Question 6: Slack Notifications
**"Want instant alerts?"**

If yes, you'll need:
1. A Slack workspace (create free at https://slack.com)
2. A webhook URL (the wizard will guide you)

**Don't understand Slack?** Say "no" for now. You can add it later.

### Question 7: Resume Optimization
**"Want help improving your resume?"**

Say "yes" if you want:
- Resume analysis (what's good, what needs work)
- Industry-specific suggestions
- ATS (Applicant Tracking System) compatibility checks

Choose your industry from the list.

---

## Running Your First Job Search

### Method 1: One-Time Search (Recommended for first try)

1. Open Terminal/PowerShell
2. Navigate to JobSentinel folder:
   ```bash
   cd Desktop/JobSentinel  # or wherever you installed it
   ```
3. Run:
   ```bash
   python -m jsa.cli run-once
   ```
4. Wait 2-5 minutes while it searches
5. Look for results in `data/jobs.db` or Slack notifications

### Method 2: Dry Run (Test Mode)
Want to see what it would do without actually saving anything?

```bash
python -m jsa.cli run-once --dry-run
```

This shows you what jobs it finds without saving them.

### Method 3: Schedule Automatic Searches
Want it to run automatically every day?

**Windows**: Use Task Scheduler (search for it in Start menu)  
**Mac**: Use `launchd` or create a cron job  
**Linux**: Use `cron`

See [Automated Scheduling Guide](DEPLOYMENT_GUIDE.md#scheduling) for details.

---

## Understanding the Results

### Job Scores
Each job gets a score from 0-100:
- **90-100**: Excellent match! Apply immediately
- **75-89**: Very good match, worth investigating
- **60-74**: Decent match, review carefully
- **Below 60**: Probably not a great fit

### What Affects the Score?
1. **Keywords** (40%): Does the job mention your keywords?
2. **Salary** (25%): Does it meet your minimum?
3. **Location** (20%): Is it in your preferred locations?
4. **Company** (10%): Is it a reputable company?
5. **Freshness** (5%): How recently was it posted?

### Where to Find Jobs
- **Slack**: High-scoring jobs (80+) are sent here
- **Database**: All jobs saved in `data/jobs.db`
- **Web UI**: Run `python -m jsa.cli web` to see a dashboard

---

## Common Questions

### "Do I need to keep Terminal open?"
No! Once a search finishes, you can close it. For automatic searches, see scheduling guides.

### "How much does it cost?"
**Free** if you run it locally. The only costs are:
- Your electricity (pennies per month)
- Optional: Cloud hosting (~$5-15/month if you want 24/7 automation)

### "Is my data safe?"
Yes! Everything stays on your computer. JobSentinel never sends your:
- Resume
- Job preferences  
- Search history
- Personal information

To external companies (unless you choose cloud deployment).

### "Can I use this if I'm not a programmer?"
**Absolutely!** This guide is written for non-programmers. You only need to:
1. Copy/paste a few commands
2. Answer some questions
3. Let it run

No coding required!

### "What if something breaks?"
1. Check [Troubleshooting](#troubleshooting) below
2. Run the health check: `python -m jsa.cli health`
3. Ask for help on GitHub: https://github.com/cboyd0319/JobSentinel/issues

### "Can I change settings later?"
Yes! Edit `config/user_prefs.json` with any text editor (like Notepad), or run the wizard again.

---

## Troubleshooting

### "python: command not found"
**Problem**: Python isn't installed or not in PATH.

**Fix**:
1. Reinstall Python from python.org
2. **Important**: Check "Add Python to PATH" during installation
3. Restart your terminal

---

### "Permission denied"
**Problem**: Your user account doesn't have permission.

**Fix** (Mac/Linux):
```bash
chmod +x scripts/setup_wizard.py
```

---

### "Module not found"
**Problem**: A required package isn't installed.

**Fix**:
```bash
python -m pip install -e .
```

---

### "No jobs found"
**Problem**: Your search criteria might be too restrictive, or job sources aren't enabled.

**Fix**:
1. Check `config/user_prefs.json`
2. Make sure at least one job source has `"enabled": true`
3. Try broader keywords
4. Lower your minimum salary

---

### "Slack notifications not working"
**Problem**: Webhook URL might be wrong, or Slack is unreachable.

**Fix**:
1. Test your webhook in a browser or with curl
2. Check `.env` file has correct `SLACK_WEBHOOK_URL`
3. Make sure your internet is working

---

### "It's running very slow"
**Problem**: First run downloads ML models (~500MB).

**Fix**:
- Be patient on first run (5-10 minutes)
- Subsequent runs will be much faster (<1 minute)
- Check internet speed

---

### "Still need help?"

1. **Run Health Check**:
   ```bash
   python -m jsa.cli health --verbose
   ```
   This tells you exactly what's wrong.

2. **Check Logs**:
   Look in `logs/` folder for error details.

3. **Ask on GitHub**:
   https://github.com/cboyd0319/JobSentinel/issues

4. **Read Full Documentation**:
   See [Documentation Index](DOCUMENTATION_INDEX.md)

---

## Next Steps

Once you're comfortable:

1. **Try Resume Analysis**:
   ```bash
   python examples/detection_and_autofix_demo.py
   ```

2. **Explore ML Features**:
   ```bash
   python examples/ml_and_mcp_demo.py
   ```

3. **Set Up Cloud Deployment**:
   See [Deployment Guide](DEPLOYMENT_GUIDE.md)

4. **Customize Scoring**:
   Edit `config/user_prefs.json` to adjust keyword weights

---

## Video Tutorials (Coming Soon)

- Installation walkthrough (Windows)
- Installation walkthrough (Mac)
- Setting up Slack notifications
- Understanding job scores
- Resume optimization guide

---

**You did it!** 🎉

JobSentinel is now searching for jobs on your behalf. Sit back and wait for those high-quality job alerts!

---

**Questions?** Open an issue: https://github.com/cboyd0319/JobSentinel/issues  
**Updates?** Watch the repo for new features and improvements.

**Happy job hunting!** 🚀
