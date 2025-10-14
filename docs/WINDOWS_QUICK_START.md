# Windows Quick Start Guide

**For:** Complete beginners with ZERO technical knowledge  
**Time:** 10 minutes to first job search  
**Requirements:** Windows 11, Internet connection

---

## 🎯 Super Quick Start (3 Steps)

### 1. Download
- Go to: https://github.com/cboyd0319/JobSentinel
- Click green "Code" button → "Download ZIP"
- Save to Desktop

### 2. Setup
- Right-click ZIP file → "Extract All" → Extract to Desktop
- Open extracted folder
- **Double-click:** `setup-windows.bat`
- Follow the prompts (takes 5-10 minutes)

### 3. Run
- **Double-click:** `launch-gui.bat` on your Desktop
- Click "🚀 Start JobSentinel" button
- Click "🌐 Open Web UI" button
- View your personalized job matches!

**That's it!** You're now automatically searching for jobs. 🎉

---

## 📋 Detailed Step-by-Step

### Before You Begin

**Do you have Python?**
- Press `Windows key + R`
- Type `cmd` and press Enter
- Type `python --version` and press Enter
- If you see "Python 3.12" or higher: ✅ You're good!
- If you see an error: [Install Python first](#installing-python)

### Installing Python (If Needed)

1. **Download Python**
   - Go to: https://www.python.org/downloads/
   - Click the big yellow button "Download Python 3.12.x"
   - Save the file

2. **Install Python**
   - Double-click the downloaded file
   - **⚠️ CRITICAL:** Check the box "Add Python to PATH"
   - Click "Install Now"
   - Wait 2-3 minutes
   - Click "Close"

3. **Verify Installation**
   - Press `Windows key + R`
   - Type `powershell` and press Enter
   - Type `python --version` and press Enter
   - Should show: `Python 3.12.x`

---

## 🚀 Full Installation

### Step 1: Download JobSentinel

**Option A: Download ZIP (Easiest)**
1. Go to: https://github.com/cboyd0319/JobSentinel
2. Click green "Code" button
3. Click "Download ZIP"
4. Save to Desktop
5. Right-click ZIP → "Extract All"
6. Click "Extract"

**Option B: Use Git (If You Have It)**
```powershell
cd Desktop
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel
```

### Step 2: Run Setup

**Option A: Batch File (Double-Click)**
1. Open JobSentinel folder
2. Find `setup-windows.bat`
3. Double-click it
4. A black window opens - this is normal!
5. Follow the prompts

**Option B: PowerShell (Right-Click)**
1. Open JobSentinel folder
2. Find `setup-windows.ps1`
3. Right-click → "Run with PowerShell"
4. If asked about execution policy, click "Yes"
5. Follow the prompts

### Step 3: Answer Setup Questions

The setup will ask you a few questions. Here's what to answer:

**Job Keywords**
- What kind of job do you want?
- Examples:
  - Tech: `python, backend, django, api`
  - Marketing: `digital marketing, seo, content`
  - Management: `project manager, team lead`
  - Sales: `sales, account executive, business development`

**Locations**
- Where do you want to work?
- Examples:
  - `Remote` (work from home)
  - `New York, NY`
  - `Remote, San Francisco, Seattle`

**Minimum Salary**
- Lowest salary you'll accept (per year)
- Examples:
  - `100000` (for $100k/year)
  - `0` (if you don't want to filter by salary)

**Email Alerts**
- Do you want job alerts by email?
- If yes, you'll need:
  - Your email address
  - Your email password (see [Email Setup](#email-setup))

### Step 4: Wait for Installation

The setup will now:
- ✅ Check your system (30 seconds)
- ✅ Install dependencies (3-5 minutes)
- ✅ Set up database (10 seconds)
- ✅ Create shortcuts (5 seconds)
- ✅ Verify everything works (20 seconds)

**Total time:** 5-10 minutes

You'll see lots of text scroll by. This is normal!

### Step 5: Launch JobSentinel

After setup completes, you have shortcuts on your Desktop:

**Run JobSentinel**
- Double-click to search for jobs once

**JobSentinel Dashboard**
- Double-click to open web interface

**Configure JobSentinel**
- Double-click to change your preferences

**Or use the GUI:**
- Double-click `launch-gui.bat` in JobSentinel folder
- Click buttons to control everything

---

## 📧 Email Setup

### Gmail (Most Common)

**You need an "App Password" (NOT your regular Gmail password)**

1. **Enable 2-Factor Authentication**
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification"
   - Follow the steps to enable it

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Sign in if asked
   - Under "Select app", choose "Mail"
   - Under "Select device", choose "Windows Computer"
   - Click "Generate"
   - Copy the 16-character password (like "abcd efgh ijkl mnop")

3. **Configure JobSentinel**
   - During setup, choose "Gmail"
   - Email: Your Gmail address
   - Password: The 16-character App Password (NOT your regular password)

### Outlook/Hotmail

Similar to Gmail:
1. Enable 2-Factor Authentication
2. Generate App Password at: https://account.microsoft.com/security
3. Use App Password in JobSentinel setup

### Other Email Providers

You'll need:
- SMTP server address (Google for "your provider SMTP settings")
- SMTP port (usually 587)
- Your email address
- Your email password or app password

---

## 🎮 Using JobSentinel

### Quick Actions

**Search for Jobs Once**
```
Method 1: Double-click "Run JobSentinel" on Desktop
Method 2: Open PowerShell in JobSentinel folder, run:
    python -m jsa.cli run-once
```

**Test Without Alerts (Safe)**
```powershell
python -m jsa.cli run-once --dry-run
```
This shows you what it would do, without actually sending alerts.

**Open Web Dashboard**
```
Method 1: Double-click "JobSentinel Dashboard" on Desktop
Method 2: Open PowerShell, run:
    python -m jsa.cli web
Then visit: http://localhost:5000
```

**Change Your Preferences**
```
Method 1: Double-click "Configure JobSentinel" on Desktop
Method 2: Edit config/user_prefs.json with Notepad
```

### Using the GUI (Easiest)

1. Double-click `launch-gui.bat` (in JobSentinel folder or Desktop)
2. Window opens with big buttons:
   - 🚀 Start JobSentinel - Starts the system
   - ⏹️ Stop JobSentinel - Stops the system
   - 🌐 Open Web UI - Opens dashboard in browser
   - ⚙️ Setup Wizard - Change settings
   - 📊 Run Job Scraper - Search for jobs
   - 🔧 Edit Configuration - Advanced settings
   - 📧 Test Email Alerts - Send test email
   - 💾 Backup Data - Save your data
   - ❓ Help & Docs - Open documentation

3. Click buttons, wait, repeat!

---

## 🔍 Viewing Results

### Web Dashboard
1. Start JobSentinel (via GUI or command)
2. Open browser to http://localhost:5000
3. See all your job matches with scores
4. Filter by:
   - Score (higher = better match)
   - Date posted
   - Company
   - Location

### Email Alerts
- High-scoring jobs (80+) sent to your email
- Check your inbox after each run
- Subject: "🎯 JobSentinel: X New Job Matches"

### Database
- All jobs saved in: `data/jobs.sqlite`
- Can view with any SQLite browser
- Never loses your data

---

## 🆘 Something Not Working?

### "Python not found"
- You didn't install Python yet
- Or you forgot to check "Add Python to PATH"
- Solution: [Install Python](#installing-python)

### GUI doesn't open
- Python might not have tkinter
- Solution: Reinstall Python from python.org (not Microsoft Store)

### Email test fails
- Wrong password
- Need App Password, not regular password
- Solution: See [Email Setup](#email-setup)

### No jobs found
- Your search criteria might be too narrow
- Solution: Use broader keywords, lower salary minimum

### Still stuck?
1. Run: `python -m jsa.cli health`
2. Check: `docs/WINDOWS_TROUBLESHOOTING.md`
3. Ask for help: https://github.com/cboyd0319/JobSentinel/issues

---

## 💡 Pro Tips

### Tip 1: Test First
Always run with `--dry-run` first to see what it would do:
```powershell
python -m jsa.cli run-once --dry-run
```

### Tip 2: Use Broad Keywords
Instead of: `"Senior Python Django Developer in San Francisco"`
Use: `python, django, backend`

### Tip 3: Check Regularly
Run once a day or set up Windows Task Scheduler:
```
Task Scheduler → Create Basic Task → Daily → Run program:
    python -m jsa.cli run-once
```

### Tip 4: Backup Your Data
Before major changes:
```powershell
python -m jsa.cli backup create
```

### Tip 5: Privacy First
Your data never leaves your computer unless YOU configure email alerts. Check anytime:
```powershell
python -m jsa.cli privacy
```

---

## 🎓 Next Steps

Once comfortable:

1. **Explore Advanced Features**
   - Resume analysis: `python examples/detection_and_autofix_demo.py`
   - ML matching: `python examples/ml_and_mcp_demo.py`

2. **Automate with Task Scheduler**
   - Search "Task Scheduler" in Windows
   - Create daily or weekly job searches

3. **Customize Scoring**
   - Edit `config/user_prefs.json`
   - Adjust keyword weights
   - Change alert thresholds

4. **Read Full Documentation**
   - `docs/BEGINNER_GUIDE.md` - Complete guide
   - `docs/DEPLOYMENT_GUIDE.md` - Advanced deployment
   - `docs/DOCUMENTATION_INDEX.md` - All docs

---

## 📚 Quick Reference Card

### Essential Commands
| Command | What It Does |
|---------|-------------|
| `python -m jsa.cli run-once` | Search for jobs once |
| `python -m jsa.cli run-once --dry-run` | Test without alerts |
| `python -m jsa.cli web` | Open web dashboard |
| `python -m jsa.cli health` | Check system status |
| `python -m jsa.cli setup` | Change preferences |
| `python -m jsa.cli backup create` | Backup your data |
| `python -m jsa.cli help` | Show all commands |

### Important Files
| File/Folder | Contains |
|-------------|----------|
| `config/user_prefs.json` | Your job preferences |
| `data/jobs.sqlite` | All found jobs |
| `.env` | Email/API secrets |
| `logs/jobsentinel.log` | Activity log |
| `launch-gui.bat` | Start GUI |

### Keyboard Shortcuts
| Keys | Action |
|------|--------|
| `Ctrl+C` | Stop running command |
| `Windows+R → cmd` | Open Command Prompt |
| `Windows+R → powershell` | Open PowerShell |
| `Alt+F4` | Close window |

---

## ✅ Success Checklist

After setup, you should have:
- [ ] JobSentinel folder on Desktop
- [ ] Shortcuts on Desktop
- [ ] `config/user_prefs.json` exists
- [ ] `data/jobs.sqlite` exists
- [ ] Can run: `python -m jsa.cli health` ✓
- [ ] Can launch GUI successfully
- [ ] Can search for jobs without errors
- [ ] Receiving email alerts (if configured)

If all checked: **You're ready!** 🎉

---

## 🤝 Getting Help

**This guide not enough?**
- Full guide: `docs/BEGINNER_GUIDE.md`
- Troubleshooting: `docs/WINDOWS_TROUBLESHOOTING.md`
- GitHub: https://github.com/cboyd0319/JobSentinel/issues

**Found this helpful?**
- Star the repo on GitHub ⭐
- Share with job-seeking friends
- Submit improvements via Pull Request

---

**Happy job hunting!** 🚀

---

**Version:** 1.0.0 (October 2025)  
**License:** MIT  
**Support:** https://github.com/cboyd0319/JobSentinel
