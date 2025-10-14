# macOS Quick Start Guide

**For:** Complete beginners with ZERO technical knowledge  
**Time:** 10 minutes to first job search  
**Requirements:** macOS 15+ (Sequoia or later), Internet connection

---

## 🎯 Super Quick Start (3 Steps)

### 1. Download
- Go to: https://github.com/cboyd0319/JobSentinel
- Click green "Code" button → "Download ZIP"
- Save to Desktop or Downloads

### 2. Setup
- Double-click ZIP file to extract
- Open extracted folder
- **Double-click:** `setup-macos.sh`
- If it doesn't run, right-click → Open → Open
- Follow the prompts (takes 5-10 minutes)

### 3. Run
- **Double-click:** `launch-gui.command` on your Desktop
- Click "🚀 Start JobSentinel" button
- Click "🌐 Open Web UI" button
- View your personalized job matches!

**That's it!** You're now automatically searching for jobs. 🎉

---

## 📋 Detailed Step-by-Step

### Before You Begin

**Do you have Python?**
- Open Terminal (Spotlight → type "Terminal")
- Type `python3 --version` and press Enter
- If you see "Python 3.12" or higher: ✅ You're good!
- If you see an error: [Install Python first](#installing-python)

### Installing Python (If Needed)

**Option 1: Homebrew (Recommended)**

1. **Install Homebrew** (if you don't have it):
   - Open Terminal
   - Paste this command and press Enter:
     ```bash
     /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
     ```
   - Wait for installation (5-10 minutes)

2. **Install Python**:
   ```bash
   brew install python@3.12
   ```

3. **Verify Installation**:
   ```bash
   python3 --version
   ```
   Should show: `Python 3.12.x`

**Option 2: python.org**

1. **Download Python**
   - Go to: https://www.python.org/downloads/
   - Click the big yellow button "Download Python 3.12.x"
   - Open the downloaded file
   - Follow installation wizard

2. **Verify Installation**
   - Open Terminal
   - Type `python3 --version`
   - Should show: `Python 3.12.x`

---

## 🚀 Full Installation

### Step 1: Download JobSentinel

**Option A: Download ZIP (Easiest)**
1. Go to: https://github.com/cboyd0319/JobSentinel
2. Click green "Code" button
3. Click "Download ZIP"
4. Save to Desktop or Downloads
5. Double-click ZIP to extract

**Option B: Use Git (If You Have It)**
```bash
cd ~/Desktop
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel
```

### Step 2: Run Setup

1. Open JobSentinel folder
2. Find `setup-macos.sh`
3. **Right-click → Open → Open** (first time only)
   - macOS may warn about unidentified developer
   - Click "Open" to proceed
4. Or use Terminal:
   ```bash
   cd ~/Desktop/JobSentinel
   ./setup-macos.sh
   ```
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

**Run JobSentinel.command**
- Double-click to search for jobs once

**JobSentinel Dashboard.command**
- Double-click to open web interface

**Configure JobSentinel.command**
- Double-click to change your preferences

**launch-gui.command**
- Double-click for graphical interface

**Or use Terminal:**
```bash
cd ~/Desktop/JobSentinel
python3 -m jsa.cli run-once
```

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
   - Under "Select device", choose "Mac"
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
```bash
# Method 1: Double-click "Run JobSentinel.command" on Desktop

# Method 2: Open Terminal, run:
cd ~/Desktop/JobSentinel
python3 -m jsa.cli run-once
```

**Test Without Alerts (Safe)**
```bash
python3 -m jsa.cli run-once --dry-run
```
This shows you what it would do, without actually sending alerts.

**Open Web Dashboard**
```bash
# Method 1: Double-click "JobSentinel Dashboard.command" on Desktop

# Method 2: Open Terminal, run:
python3 -m jsa.cli web
# Then visit: http://localhost:5000
```

**Change Your Preferences**
```bash
# Method 1: Double-click "Configure JobSentinel.command" on Desktop

# Method 2: Edit config/user_prefs.json with TextEdit
```

### Using the GUI (Easiest)

1. Double-click `launch-gui.command` (on Desktop or in JobSentinel folder)
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

### Using Shell Aliases

After setup, you can use these commands from any Terminal window:

```bash
jobsentinel-run      # Search for jobs
jobsentinel-web      # Open web dashboard
jobsentinel-setup    # Change preferences
jobsentinel-health   # Check system status
```

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

### "Permission denied" when running setup
- Right-click `setup-macos.sh` → Get Info
- Check "Locked" is unchecked
- Or run in Terminal: `chmod +x setup-macos.sh`

### "Python not found"
- You didn't install Python yet
- Solution: [Install Python](#installing-python)

### "Unidentified developer" warning
- macOS Gatekeeper blocking the script
- Right-click → Open → Open (instead of double-clicking)
- Or: System Preferences → Security & Privacy → Allow anyway

### GUI doesn't open
- Python might not have tkinter
- Solution: Reinstall Python from python.org or Homebrew

### Email test fails
- Wrong password
- Need App Password, not regular password
- Solution: See [Email Setup](#email-setup)

### No jobs found
- Your search criteria might be too narrow
- Solution: Use broader keywords, lower salary minimum

### Still stuck?
1. Run: `python3 -m jsa.cli health`
2. Check: `docs/MACOS_TROUBLESHOOTING.md`
3. Ask for help: https://github.com/cboyd0319/JobSentinel/issues

---

## 💡 Pro Tips

### Tip 1: Test First
Always run with `--dry-run` first to see what it would do:
```bash
python3 -m jsa.cli run-once --dry-run
```

### Tip 2: Use Broad Keywords
Instead of: `"Senior Python Django Developer in San Francisco"`
Use: `python, django, backend`

### Tip 3: Check Regularly
Run once a day or set up with launchd (macOS task scheduler)

### Tip 4: Backup Your Data
Before major changes:
```bash
python3 -m jsa.cli backup create
```

### Tip 5: Privacy First
Your data never leaves your Mac unless YOU configure email alerts. Check anytime:
```bash
python3 -m jsa.cli privacy
```

### Tip 6: Make .command Files
Create your own shortcuts in TextEdit:
```bash
#!/usr/bin/env bash
cd ~/Desktop/JobSentinel
python3 -m jsa.cli run-once
```
Save as `MyJobSearch.command`, make executable with `chmod +x MyJobSearch.command`

---

## 🎓 Next Steps

Once comfortable:

1. **Explore Advanced Features**
   - Resume analysis: `python3 examples/detection_and_autofix_demo.py`
   - ML matching: `python3 examples/ml_and_mcp_demo.py`

2. **Automate with launchd**
   - Create daily or weekly job searches
   - See docs/MACOS_DEPLOYMENT_CHECKLIST.md for details

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
| `python3 -m jsa.cli run-once` | Search for jobs once |
| `python3 -m jsa.cli run-once --dry-run` | Test without alerts |
| `python3 -m jsa.cli web` | Open web dashboard |
| `python3 -m jsa.cli health` | Check system status |
| `python3 -m jsa.cli setup` | Change preferences |
| `python3 -m jsa.cli backup create` | Backup your data |
| `python3 -m jsa.cli help` | Show all commands |

### Important Files
| File/Folder | Contains |
|-------------|----------|
| `config/user_prefs.json` | Your job preferences |
| `data/jobs.sqlite` | All found jobs |
| `.env` | Email/API secrets |
| `logs/jobsentinel.log` | Activity log |
| `launch-gui.command` | Start GUI |

### Keyboard Shortcuts (Terminal)
| Keys | Action |
|------|--------|
| `Ctrl+C` | Stop running command |
| `Cmd+Space → Terminal` | Open Terminal |
| `Cmd+K` | Clear Terminal |
| `Cmd+W` | Close Terminal tab |

---

## ✅ Success Checklist

After setup, you should have:
- [ ] JobSentinel folder on Desktop
- [ ] .command shortcuts on Desktop
- [ ] `config/user_prefs.json` exists
- [ ] `data/jobs.sqlite` exists
- [ ] Can run: `python3 -m jsa.cli health` ✓
- [ ] Can launch GUI successfully
- [ ] Can search for jobs without errors
- [ ] Receiving email alerts (if configured)
- [ ] Shell aliases work: `jobsentinel-run`

If all checked: **You're ready!** 🎉

---

## 🤝 Getting Help

**This guide not enough?**
- Full guide: `docs/BEGINNER_GUIDE.md`
- Troubleshooting: `docs/MACOS_TROUBLESHOOTING.md`
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
