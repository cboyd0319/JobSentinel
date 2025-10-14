# Windows Quick Start Guide

**Target Audience:** Windows 11 users with ZERO technical knowledge  
**Time Required:** 10-15 minutes  
**Admin Rights:** NOT required ✅

---

## 🎯 What You'll Get

JobSentinel will:
- ✅ Automatically search job boards for you
- ✅ Score jobs based on your preferences
- ✅ Send you Slack notifications for great matches
- ✅ Keep all your data private and local
- ✅ Run for $0 (completely free!)

---

## 📋 What You Need

### Required:
1. **Windows 11** (build 22000 or newer)
   - Check: Press `Windows + R`, type `winver`, press Enter
   - You should see "Version 22H2" or newer

2. **Internet Connection**
   - Needed to download software and search jobs
   - Doesn't need to be super fast

3. **1 GB Free Disk Space**
   - Check: Open File Explorer, click "This PC"
   - Look at free space on C: drive

### Optional but Recommended:
- **Slack Account** (free) - for job alerts
  - Sign up at: https://slack.com
  - You'll need to create an "Incoming Webhook"

---

## 🚀 New Installation (Two Simple Steps)

### Step 1: Install Python 3.12+

1. **Download Python:**
   - Go to: https://www.python.org/downloads/
   - Click the big yellow "Download Python 3.12.x" button
   - Save the file to your Downloads folder

2. **Run the Python Installer:**
   - Double-click the downloaded file
   - ⚠️ **CRITICAL**: Check the box "Add Python to PATH" at the bottom
   - Click "Install Now"
   - Wait 2-5 minutes for installation
   - Click "Close" when done

3. **Verify Python Works:**
   - Press `Windows + R`
   - Type `cmd` and press Enter
   - Type `python --version` and press Enter
   - You should see "Python 3.12.x"
   - Type `exit` and press Enter

### Step 2: Download and Bootstrap JobSentinel

**Option A: Download ZIP (Easiest)**

1. Download: https://github.com/cboyd0319/JobSentinel/archive/refs/heads/main.zip
2. Extract to Desktop (right-click → "Extract All")
3. Open the `JobSentinel-main` folder
4. Right-click `bootstrap.ps1`
5. Click "Run with PowerShell"
6. Wait 2-5 minutes while it installs everything

**Option B: Using Git (Advanced)**

1. **Install Git** (if not already installed):
   - Go to: https://git-scm.com/download/win
   - Download and run the installer
   - Click "Next" for all options

2. **Clone and Bootstrap:**
   - Press `Windows + R`, type `cmd`, press Enter
   - Run these commands:
   ```cmd
   cd Desktop
   git clone https://github.com/cboyd0319/JobSentinel
   cd JobSentinel
   powershell -ExecutionPolicy Bypass -File bootstrap.ps1
   ```

**What bootstrap.ps1 does:**
- ✅ Checks your system meets requirements
- ✅ Downloads portable Node.js (no admin needed)
- ✅ Creates Python virtual environment
- ✅ Installs all dependencies
- ✅ Creates database
- ✅ Builds frontend UI
- ✅ Runs health check

**Total time: 2-5 minutes** depending on your internet speed.

### Step 3: Configure and Run

1. **Edit Configuration:**
   - Open `config/user_prefs.json` in Notepad
   - Add your job search keywords, location, salary preferences
   - Save the file

2. **Edit Environment (Optional):**
   - Open `.env` in Notepad
   - Add your Slack webhook URL if you want notifications
   - Save the file

3. **Start JobSentinel:**
   - Right-click `run.ps1`
   - Click "Run with PowerShell"
   - OR open PowerShell in the folder and type: `.\run.ps1`

4. **Access the UI:**
   - Open your browser
   - Go to: http://localhost:8000
   - You'll see the JobSentinel dashboard

**That's it! You're running JobSentinel!**

2. **Run the Setup:**
   - Double-click `setup-windows.bat`
   - If you see "Windows protected your PC":
     - Click "More info"
     - Click "Run anyway"

3. **System Compatibility Check:**
   - The setup will first check your system:
     ✅ Windows 11 (build 22000+)
     ✅ Python 3.12+
     ✅ Disk space (1GB+)
     ✅ Internet connection
     ✅ Write permissions
     ✅ Available memory
     ✅ Port availability
   - If any checks fail, you'll see clear instructions on how to fix them
   - Don't worry - the setup won't let you proceed until everything is ready!

4. **Follow the Setup Wizard:**
   - After checks pass, the setup will:
     ✅ Install required software
     ✅ Ask you a few simple questions
     ✅ Set everything up automatically
     ✅ Create desktop shortcuts for easy access

4. **Answer the Setup Questions:**
   
   **Question 1: What kind of jobs are you looking for?**
   - Enter keywords like: `python`, `data analyst`, `marketing manager`
   - Separate with commas: `python, backend, remote`
   - Press Enter when done

   **Question 2: Where do you want to work?**
   - Enter locations like: `Remote`, `New York`, `San Francisco`
   - Or just enter: `Remote` for remote jobs only
   - Press Enter when done

   **Question 3: What job boards should we search?**
   - Use arrow keys to select sources
   - Press Space to enable/disable
   - Press Enter when done
   - **Tip**: Enable "JobsWithGPT" for best results (500k+ jobs)

   **Question 4: Do you want Slack notifications?**
   - If yes: Enter your Slack webhook URL
   - If no: Press Enter to skip
   - **How to get webhook URL:**
     1. Go to: https://api.slack.com/apps
     2. Click "Create New App" → "From scratch"
     3. Name it "JobSentinel" and select your workspace
     4. Click "Incoming Webhooks" → Enable
     5. Click "Add New Webhook to Workspace"
     6. Select a channel and click "Allow"
     7. Copy the webhook URL

5. **Wait for Setup to Complete:**
   - This takes 5-10 minutes
   - You'll see progress messages
   - Don't close the window!

6. **Setup Complete!**
   - You'll see "Setup Complete! 🎉"
   - Desktop shortcuts will be created automatically:
     • "Run JobSentinel" - Search for jobs
     • "JobSentinel Dashboard" - View jobs in browser
     • "Configure JobSentinel" - Change settings
     • "JobSentinel Health Check" - Check system status
   - Press any key to close

---

## 🎮 Using JobSentinel

### First Test Run (No Alerts)

Let's test it without sending Slack messages:

**Option A: Using Desktop Shortcut (Easiest)**

1. Double-click the "Run JobSentinel" shortcut on your Desktop
2. Wait 2-5 minutes for the search to complete
3. Check the results in the terminal window

**Option B: Using Command Line**

1. Open Command Prompt:
   - Press `Windows + R`
   - Type `cmd` and press Enter

2. Navigate to JobSentinel:
   ```cmd
   cd Desktop\JobSentinel
   ```

3. Run a test search:
   ```cmd
   python -m jsa.cli run-once --dry-run
   ```

4. **What Happens:**
   - JobSentinel searches for jobs
   - Shows you what it found
   - Does NOT send Slack alerts (dry-run mode)
   - Takes 2-5 minutes

5. **Check Results:**
   - You should see job listings in the terminal
   - If you see errors, see Troubleshooting below

### Real Run (With Alerts)

Once the test works, do a real run:

```cmd
python -m jsa.cli run-once
```

This will:
- Search for jobs
- Score them against your preferences
- Send Slack alerts for high matches
- Save results to database

### View Jobs in Web Browser

**Option A: Using Desktop Shortcut (Easiest)**

1. Double-click "JobSentinel Dashboard" on your Desktop
2. Your browser will open automatically
3. If not, go to: http://localhost:5000
4. To stop: Close the terminal window or press `Ctrl + C`

**Option B: Using Command Line**

1. Run:
   ```cmd
   python -m jsa.cli web
   ```

2. Open your browser:
   - Go to: http://localhost:5000

3. **What You'll See:**
   - Dashboard with job statistics
   - List of all found jobs
   - Search and filter options
   - Job scores and details

4. **Stop the Server:**
   - Press `Ctrl + C` in the terminal

### View Jobs in Modern UI (React)

For a more modern interface:

1. Start the API server:
   ```cmd
   python -m jsa.cli api
   ```

2. In another terminal, start the React frontend:
   ```cmd
   cd frontend
   npm install
   npm run dev
   ```

3. Open browser:
   - Go to: http://localhost:3000

---

## 🔧 Common Tasks

### Check System Status

**Option A: Using Desktop Shortcut**
- Double-click "JobSentinel Health Check" on your Desktop

**Option B: Using Command Line**
```cmd
python -m jsa.cli health
```

Shows:
- Python version ✓
- Dependencies ✓
- Configuration ✓
- Database ✓
- Disk space ✓
- Internet connection ✓

### Change Settings

**Option A: Using Desktop Shortcut**
- Double-click "Configure JobSentinel" on your Desktop
- Follow the interactive wizard

**Option B: Manual Editing**
1. Open `config/user_prefs.json` in Notepad
2. Edit your preferences:
   - `keywords`: Job keywords to search for
   - `locations`: Preferred locations
   - `salary_min`: Minimum salary
   - `job_sources`: Which sites to search
3. Save and close

**Option C: Setup Wizard (Command Line)**
```cmd
python -m jsa.cli setup
```

### View Your Data

Your job database is at:
- `data/jobs.sqlite`

Open with any SQLite viewer, or use the web UI.

### Automate Job Searches (Optional)

To run searches automatically every day:

1. Open Task Scheduler:
   - Press Windows + R
   - Type `taskschd.msc`
   - Press Enter

2. Create a new task:
   - Click "Create Basic Task"
   - Name: "JobSentinel Daily Search"
   - Trigger: Daily at 9:00 AM
   - Action: Start a program
   - Program: `python`
   - Arguments: `-m jsa.cli run-once`
   - Start in: `C:\Users\YourName\Desktop\JobSentinel`

3. Click Finish

---

## ❓ Troubleshooting

### "Python is not recognized"

**Problem:** Python not in PATH

**Solution:**
1. Uninstall Python
2. Download fresh installer from python.org
3. **Check "Add Python to PATH"** during installation
4. Reinstall

### "Module not found" errors

**Problem:** Dependencies not installed

**Solution:**
```cmd
cd Desktop\JobSentinel
python -m pip install -e .
```

### "No jobs found"

**Possible Causes:**
1. **No sources enabled**
   - Check `config/user_prefs.json`
   - Make sure at least one source has `"enabled": true`

2. **Keywords too specific**
   - Try broader keywords
   - Example: "engineer" instead of "senior backend engineer"

3. **Internet connection**
   - Check you're online
   - Try: `ping google.com`

### "Database error"

**Solution:**
1. Delete the database: `del data\jobs.sqlite`
2. Run again: `python -m jsa.cli run-once`
3. Database will be recreated automatically

### "Port already in use"

**Problem:** Another program using port 5000

**Solution:**
```cmd
python -m jsa.cli web --port 5001
```

Then visit: http://localhost:5001

---

## 🔒 Privacy & Security

### What Data is Collected?

**Local Data (stored on your computer):**
- Job listings from public job boards
- Your search history
- Your preferences (keywords, locations)

**Never Collected or Shared:**
- Your personal information
- Your resume or application data
- Your browsing history
- Any data you don't explicitly configure

### Where is Data Stored?

- **Database:** `data/jobs.sqlite` (single file)
- **Config:** `config/user_prefs.json`
- **Logs:** `logs/` folder

### How to Delete Everything?

To completely remove JobSentinel:

1. Delete the JobSentinel folder
2. That's it! No registry entries or hidden files

---

## 📚 Learn More

- **Full Documentation:** See `docs/` folder
- **Beginner's Guide:** `docs/BEGINNER_GUIDE.md`
- **Troubleshooting:** `docs/WINDOWS_TROUBLESHOOTING.md`
- **Advanced Features:** `docs/ADVANCED_FEATURES.md`

---

## 💬 Get Help

1. **Check Documentation:**
   - `docs/WINDOWS_TROUBLESHOOTING.md`
   - `docs/BEGINNER_GUIDE.md`

2. **Run Health Check:**
   ```cmd
   python -m jsa.cli health
   ```

3. **Open an Issue:**
   - Go to: https://github.com/cboyd0319/JobSentinel/issues
   - Click "New Issue"
   - Describe your problem

---

## 🎉 You're Done!

Congratulations! JobSentinel is now running on your computer.

It will:
- ✅ Find jobs that match your preferences
- ✅ Alert you via Slack for great matches
- ✅ Keep all your data private and local
- ✅ Cost you $0

**Enjoy your automated job search!** 🚀
