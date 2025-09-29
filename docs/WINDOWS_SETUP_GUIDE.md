# 🪟 **Windows 11 Setup Guide - Job Private Scraper & Filter**

This guide provides **crystal-clear, step-by-step instructions** to get the job scraper running on Windows 11 with **maximum security** and **zero technical background required**.

---

## 🎯 **What This Does**

This software will:

- **Automatically monitor job boards** every 15 minutes
- **Find jobs that match your criteria** (title, location, salary, keywords)
- **Send immediate Slack alerts** for high-scoring matches
- **Email daily digest** of all relevant jobs
- **Run completely private** on your own computer
- **Work 24/7** in the background with **zero elevated privileges**

**No ChatGPT required** - it works perfectly without any external AI services!

---

## 🔐 **RECOMMENDED: Secure Service Account Setup**

### **🛡️ Why This Method is Best**

- **Maximum Security**: Runs with absolutely zero admin privileges after setup
- **Complete Isolation**: Separate from your main user account
- **Production Ready**: Follows enterprise security best practices
- **Audit Trail**: Clean logging and monitoring
- **Principle of Least Privilege**: Only the permissions needed, nothing more

### **📋 Table of Contents**

- [🔐 **RECOMMENDED: Secure Service Account Setup**](#-recommended-secure-service-account-setup)
- [⚡ **Alternative: Quick Personal Setup**](#-alternative-quick-personal-setup)
- [🔧 **Configuration Guide**](#-configuration-guide)
- [🔒 **Security & Architecture**](#-security--architecture)
- [🔧 **Troubleshooting & Debug Mode**](#-troubleshooting--debug-mode)
- [🛠 **Manual Installation (If Script Fails)**](#-manual-installation-if-script-fails)

---

### **Step 1: Create Dedicated Service Account**

🔒 **This creates a dedicated non-admin user ONLY for job scraping - maximum security!**

1. **Open PowerShell as Administrator** (one-time setup)

   - Press `Windows key + X`
   - Click "Windows PowerShell (Admin)" or "Terminal (Admin)"
   - When it asks "Do you want to allow this app to make changes?", click **YES**

2. **Create the service account:**

```powershell
# Create dedicated user (you will be prompted for password)
$password = Read-Host "Enter secure password for jobscraper account" -AsSecureString
$plaintextPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
net user jobscraper "$plaintextPassword" /add /passwordchg:no /fullname:"Job Scraper Service"
net localgroup "Users" jobscraper /add

# Verify the account was created
net user jobscraper
```

3. **Close PowerShell** (we're done with admin privileges!)

### **Step 2: Login as Service Account**

1. **Sign out of your current user**

   - Click Start → Your profile picture → Sign out

2. **Login as jobscraper**

   - On login screen, click "Other user"
   - Username: `jobscraper`
   - Password: (the secure password you entered when creating the account)

### **Step 3: Run Secure Installation**

**Now logged in as jobscraper (non-admin user):**

1. **Update Windows** (Important!)

   - Press `Windows key + I` → Windows Update → Check for updates
   - Install any updates and restart if needed

2. **Open PowerShell** (NOT as admin - we want limited privileges!)

   - Press `Windows key + X` → Click "Windows PowerShell" (NOT Admin)
   - You should see a blue window

3. **Run the secure installation:**

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; irm "https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/setup_windows.ps1" | iex
```

**🔐 Security Benefits:**

- ✅ **No admin privileges** during normal operation
- ✅ **Isolated from main user** - maximum security
- ✅ **Limited attack surface** - minimal permissions
- ✅ **Enterprise-grade security** - follows best practices

**What happens next:**

- **Downloads and installs Python 3.12.10** to user directory (no admin needed)
- **Creates isolated Python environment** (keeps system clean)
- **Downloads job scraper files** from GitHub
- **Installs required packages** (about 20-30 packages)
- **Downloads web browser components** (for scraping job sites)
- **Creates configuration files** with examples
- **Sets up automated tasks** (runs as LIMITED user every 15 minutes)
- **Creates desktop shortcuts** for easy management
- **Tests installation** to ensure everything works

**This takes 10-20 minutes** - when done, you'll see: `🎉 Setup completed successfully!`

➡️ **Continue to [Configuration Guide](#-configuration-guide)** to set up your job search criteria.

---

## ⚡ **Alternative: Quick Personal Setup**

**⚠️ Less Secure**: This method runs on your main user account. Use the [Secure Service Account Setup](#-recommended-secure-service-account-setup) above for better security.

### **Step 1: Prepare Your Computer**

1. **Update Windows** (Important!)

   - Press `Windows key + I`
   - Click "Windows Update" → "Check for updates"
   - Install any available updates and restart if needed

2. **Open PowerShell as Administrator**

   🔒 **Security Note**: Admin rights needed **ONLY** for initial setup (Python install, scheduled tasks). After setup, everything runs as **limited user**.

   - Press `Windows key + X`
   - Click "Windows PowerShell (Admin)" or "Terminal (Admin)"
   - When it asks "Do you want to allow this app to make changes?", click **YES**

### **Step 2: Run Setup Command**

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; irm "https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/setup_windows.ps1" | iex
```

---

## 🔧 **Configuration Guide**

**📁 Location**: After setup, find the `job-scraper` folder on your Desktop.

### **🔔 Step 1: Setup Notifications (Optional but Recommended)**

#### **A. Slack Alerts (Immediate notifications)**

1. **Right-click `.env`** → "Open with" → "Notepad"
2. **Get Slack webhook URL**:

   - Go to your Slack workspace
   - Add the "Incoming Webhooks" app
   - Create a webhook URL (starts with `https://hooks.slack.com/`)
3. **Paste it after** `SLACK_WEBHOOK_URL=`

#### **B. Email Digest (Daily summary)**

1. **Use Gmail** and create an "App Password":

   - Google Account → Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
2. **Fill in `.env` file**:
   ```
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@example.com
   SMTP_PASSWORD=your_app_password
   EMAIL_TO=your_email@example.com
   ```

### **🎯 Step 2: Configure Job Search Criteria**

1. **Right-click `config/user_prefs.json`** → "Open with" → "Notepad"
2. **Customize these key sections**:

#### **Companies (Job Boards to Monitor)**
```json
"companies": [
    "https://boards.greenhouse.io/company",
    "https://company.lever.co/",
    "https://company.workday.com/careers"
]
```

#### **Job Titles You Want**
```json
"title_allowlist": [
    "Software Engineer",
    "Full Stack Developer", 
    "Python Developer",
    "Backend Engineer"
]
```

#### **Location Preferences**
```json
"location_constraints": [
    "Remote",
    "New York", 
    "San Francisco",
    "Hybrid"
]
```

#### **Salary Requirements**
```json
"salary_floor_usd": 120000
```

### **🧪 Step 3: Test Your Configuration**

**Desktop shortcuts created for you:**

1. **🧪 "Test Job Scraper"**

   - Sends test notification to verify Slack/email setup
   - Should receive test message within 30 seconds

2. **▶️ "Run Job Scraper"**

   - Manually runs one complete job search cycle
   - Check output to see jobs found and scoring

3. **🔄 "Update Job Scraper"**

   - Gets latest security and feature updates
   - Preserves your configuration automatically

**✅ Success**: If both Test and Run work, you're all set! The system now runs automatically every 15 minutes.

➡️ **Next**: Check out [Security & Architecture](#-security--architecture) to understand how everything works securely.

---

## 🔄 **Automatic Operation & Updates**

### **⚙️ Automatic Job Monitoring**

- **🕐 Every 15 minutes**: Checks for new jobs matching your criteria
- **🌅 Daily at 9 AM**: Sends digest email with all jobs found
- **🧹 Weekly cleanup**: Removes old jobs (90+ days) to save space

### **🔄 Automatic Updates (Zero Maintenance!)**

Your system **automatically updates itself** every day at 6 AM:

- ✅ **Security patches** applied automatically
- ✅ **New features** and job board support added
- ✅ **Your settings preserved** - never touched
- ✅ **Backup created** before each update
- ✅ **Logged activity** in `data/logs/updates.log`

**Manual Updates**: Double-click "Update Job Scraper" shortcut anytime.

- ✅ **Bug Fixes**: Any issues get resolved automatically
- ✅ **Dependencies**: Python packages stay up-to-date

### **What NEVER Changes**

- ❌ **Your Settings**: .env file (Slack, email settings)
- ❌ **Job Preferences**: config/user_prefs.json (companies, keywords, etc.)
- ❌ **Your Data**: All found jobs and history preserved
- ❌ **Scheduled Tasks**: Continues running every 15 minutes

---

## 🔧 **Detailed Configuration**

### **Job Board Setup**

In `config/user_prefs.json`, the `companies` section tells the scraper where to look:

```json
{
  "companies": [
    {
      "id": "google",
      "board_type": "greenhouse",
      "url": "https://boards.greenhouse.io/google"
    },
    {
      "id": "stripe",
      "board_type": "lever",
      "url": "https://jobs.lever.co/stripe"
    },
    {
      "id": "cloudflare",
      "board_type": "greenhouse",
      "url": "https://boards.greenhouse.io/cloudflare"
    }
  ]
}
```

**Supported job board types:**

- `greenhouse` - boards.greenhouse.io
- `lever` - jobs.lever.co
- `workday` - Most corporate career pages
- `generic_js` - JavaScript-heavy career pages

### **Smart Filtering**

The scraper uses intelligent filtering:

```json
{
  "title_allowlist": ["Software Engineer", "Senior Developer", "Full Stack"],
  "title_blocklist": ["Manager", "Director", "Intern"],
  "keywords_boost": ["Python", "React", "Remote"],
  "location_constraints": ["Remote", "San Francisco", "New York"],
  "salary_floor_usd": 120000,
  "immediate_alert_threshold": 0.9
}
```

### **Scoring System**

Jobs are scored 0.0 to 1.0:

- **Title match**: +0.6 (required)
- **Location match**: +0.2
- **Keyword boosts**: +0.05 each
- **Salary meets minimum**: +0.1

Score ≥ 0.9 = Immediate Slack alert
Score ≥ 0.7 = Included in daily digest

---

## 📱 **Notifications Setup**

### **Slack Setup (Immediate Alerts)**

1. **In Slack**: Go to your workspace
2. **Click your workspace name** → Settings & administration → Manage apps
3. **Search for "Incoming Webhooks"** → Add to Slack
4. **Choose a channel** where you want job alerts
5. **Copy the Webhook URL** (starts with `https://hooks.slack.com/`)
6. **In `.env` file**: Paste it after `SLACK_WEBHOOK_URL=`

### **Email Setup (Daily Digest)**

**For Gmail:**

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:

   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **In `.env` file**:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@example.com
   SMTP_PASS=your_app_password_here
   DIGEST_TO=your_email@example.com
   ```

**For Outlook/Hotmail:**
```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_password
DIGEST_TO=your_email@example.com
```

---

## 🕒 **Automatic Scheduling**

The setup creates these automatic tasks:

- **Every 15 minutes**: Check for new jobs → Send immediate alerts
- **Daily at 6 AM**: **Auto-update** with latest security fixes and features 🔄
- **Daily at 9 AM**: Send email digest of all matched jobs
- **Weekly on Sunday**: Clean up old database entries
- **Every 6 hours**: Health check and system monitoring

**To view/modify schedule:**

1. Press `Windows key + R`
2. Type `taskschd.msc` and press Enter
3. Look for tasks starting with "JobScraper"

### **The Auto-Update Task**

- **Task Name**: JobScraper-AutoUpdate
- **Schedule**: Daily at 6:00 AM
- **What it does**: Downloads latest code, updates dependencies, preserves your settings
- **Runs silently**: No interruption to your work
- **Logs everything**: Check data/logs/updates.log for update history

---

## 🔍 **Monitoring & Troubleshooting**

### **Check if it's working**

1. **Desktop shortcuts**: Use "Test Job Scraper" anytime
2. **Log files**: `Desktop/job-scraper/data/logs/` - check for errors
3. **Database**: `Desktop/job-scraper/data/jobs.sqlite` - grows as jobs are found

### **Common Issues**

#### "No jobs found"

- Check your `title_allowlist` - might be too specific
- Verify company URLs are correct
- Run "Test Job Scraper" to check for errors

#### "Notifications not working"

- Run "Test Job Scraper" - check error messages
- Verify `.env` file has correct credentials
- Check Slack webhook URL format

#### "Script not running automatically"

- Open Task Scheduler (`taskschd.msc`)
- Check if JobScraper tasks are there and enabled
- Right-click a task → "Run" to test manually

#### "Getting too many alerts"

- Increase `immediate_alert_threshold` (try 0.95)
- Add more words to `title_blocklist`
- Reduce number of companies

### **Getting Help**

1. **Check logs first**: `Desktop/job-scraper/data/logs/scraper_YYYYMMDD.log`
2. **Run health check**: Open PowerShell in the job-scraper folder, run:

   ```powershell
   .\.venv\Scripts\python.exe src/agent.py --mode health
   ```

3. **Manual test run**:

   ```powershell
   .\.venv\Scripts\python.exe src/agent.py --mode test --verbose
   ```

---

## 🚀 **Optional: ChatGPT Integration (Advanced)**

If you want AI-enhanced job matching:

1. **Get OpenAI API key**: Go to platform.openai.com
2. **Edit `.env` file**, uncomment and fill:

   ```
   LLM_ENABLED=true
   OPENAI_API_KEY=sk-your-key-here
   ```

3. **Install AI packages**: In PowerShell (job-scraper folder):

   ```powershell
   .\.venv\Scripts\pip.exe install openai tiktoken
   ```

**Cost**: ~$5/month for typical usage

**Benefits**: Better job matching, AI summaries, "why this fits you" analysis

---

## 🔒 **Security & Architecture**

### **🛡️ Secure Architecture (Why Admin is Needed Only Once)**

**Admin Rights Required ONLY for Initial Setup:**

- **Python installation** (if not already installed)
- **Scheduled task creation** (Windows requirement)
- **System dependency installation** (Git, web drivers)

**After Setup: 100% Non-Admin Operation** ✅

- **All tasks run as LIMITED user** (RunLevel Limited)
- **No elevated privileges** during normal operation
- **Installs to user directory only** (`%USERPROFILE%\job-scraper`)
- **No system modifications** after initial setup

### **🏢 Production Deployment (Recommended)**

#### **Best Practice: Dedicated Service Account**

```powershell
# 1. Create dedicated non-admin user (as administrator)
# Prompt for secure password
$password = Read-Host "Enter secure password for jobscraper account" -AsSecureString
$plaintextPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
net user jobscraper "$plaintextPassword" /add /passwordchg:no
net localgroup "Users" jobscraper /add

# 2. Login as jobscraper user and run setup
runas /user:jobscraper "powershell -File scripts/setup_windows.ps1"
```

**Why This Matters:**

- **🔒 Principle of least privilege** - runs with minimal permissions
- **🚫 No admin access** during daily operation
- **🔐 Isolated from main user account** - better security
- **📊 Clean audit trail** - separate user for job scraping activity

### **🔐 Data Security**

- **Runs 100% on your computer** - no external dependencies
- **Your data never leaves your machine** (except for configured notifications)
- **No telemetry or tracking**
- **API keys stored securely** in local `.env` file
- **Rate-limited scraping** respects website terms
- **Database encryption** - SQLite with secure file permissions

---

## 📊 **Advanced Features**

### **Multiple Job Searches**

You can create different configurations for different job types:

1. Copy `config/user_prefs.json` to `user_prefs_fulltime.json`
2. Create different search criteria in each file
3. Run manually: `python3 -m src.agent --mode poll --config user_prefs_fulltime.json`

### **Salary Extraction**

The scraper automatically detects salary information in job descriptions and filters based on your `salary_floor_usd`.

### **Duplicate Detection**

Jobs are automatically deduplicated - you'll never get the same job alert twice.

### **Database Management**

- **Automatic cleanup**: Old jobs removed after 90 days
- **Backup system**: Automatic daily backups in `data/backups/`
- **Health monitoring**: System checks itself for issues

---

## 🛠 **Manual Installation (If Script Fails)**

If the automatic script doesn't work:

### **Step 1: Install Python 3.12.10**

1. Go to python.org
2. Download Python 3.12.10 for Windows
3. **Important**: Check "Add Python to PATH" during installation

### **Step 2: Download Project**

1. Download the project ZIP file
2. Extract to `C:\job-scraper\`

### **Step 3: Setup**

Open PowerShell in `C:\job-scraper\` and run:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m playwright install chromium
```

### **Step 4: Configure**

1. Copy `.env.example` to `.env` and edit
2. Copy `config/user_prefs.example.json` to `config/user_prefs.json` and edit

### **Step 5: Test**

```powershell
python3 -m src.agent --mode test
```

### **Step 6: Schedule**

Create Windows scheduled tasks manually or use the provided PowerShell commands in `scripts/setup_windows.ps1`.

---

## 📞 **Support**

This system is designed to be **completely self-sufficient**. If something goes wrong:

1. **Check the logs** first (they're very detailed)
2. **Try the desktop shortcuts** to test individual components
3. **Use the health check** to diagnose issues
4. **The system auto-recovers** from most problems

---

## 🔧 **Troubleshooting & Debug Mode**

### **Setup Debug Mode**

If setup fails, run with verbose logging:

```powershell
.\scripts\setup_windows.ps1 -Verbose
```

This provides timestamped detailed output for troubleshooting.

### **Agent Debug Mode**

For detailed scraping logs:

```powershell
cd %USERPROFILE%\job-scraper
.\.venv\Scripts\python.exe src/agent.py --mode test --verbose
.\.venv\Scripts\python.exe src/agent.py --mode poll -v
```

**Debug Features:**

- **Detailed HTTP logs** - See exactly what's being scraped
- **Database operation tracking** - Monitor data storage
- **Error context** - Enhanced error messages
- **Timing information** - Performance analysis

### **Log Files**

Check these for issues:

- `data/logs/scraper_YYYYMMDD.log` - Scraping activity
- `data/logs/errors_YYYYMMDD.log` - Error details

**Remember**: This runs completely on your computer, so it works as long as your computer is on and connected to the internet!

---

**🎉 Enjoy your automated job hunting! The system will find opportunities while you sleep!** 🎯
