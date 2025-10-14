# macOS Deployment Verification Checklist

**Version:** 1.0.0  
**Date:** October 2025  
**Purpose:** Complete end-to-end verification for macOS 15+ deployment

---

## ✅ Pre-Installation Verification

### System Requirements
- [ ] macOS 15+ (Sequoia or later)
  - Run: `sw_vers -productVersion`
  - Verify version ≥ 15.0
- [ ] Python 3.12+ installed
  - Run: `python3 --version`
  - Expected: `Python 3.12.x` or higher
- [ ] Python in PATH
  - Run: `which python3`
  - Should show path to python3 executable
- [ ] Minimum 1GB disk space free
  - Check: `df -h .`
- [ ] Internet connection available
  - Test: Open any website or `ping 8.8.8.8`

### Python Configuration
- [ ] Python from Homebrew or python.org
- [ ] tkinter module available
  - Test: `python3 -c "import tkinter; print('OK')"`
- [ ] pip working
  - Test: `python3 -m pip --version`

### Optional but Recommended
- [ ] Homebrew installed
  - Test: `brew --version`
  - Install from: https://brew.sh/
- [ ] Xcode Command Line Tools
  - Test: `xcode-select -p`
  - Install: `xcode-select --install`

---

## 📦 Installation Verification

### Method 1: Automated Setup (Recommended)

1. **Download Repository**
   - [ ] ZIP downloaded from GitHub
   - [ ] Extracted to Desktop or Documents (not system folders)
   - [ ] Folder path accessible

2. **Run Setup Script**
   - [ ] Make executable: `chmod +x setup-macos.sh` (if needed)
   - [ ] Double-click `setup-macos.sh` OR
   - [ ] Run in Terminal: `./setup-macos.sh`
   - [ ] Script starts without errors
   - [ ] Handle Gatekeeper warning (Right-click → Open)

3. **Pre-flight Checks Pass**
   - [ ] ✅ macOS 15+: OK
   - [ ] ✅ Python 3.12+: OK
   - [ ] ✅ Disk Space: OK
   - [ ] ✅ Internet Connection: OK

4. **Dependency Installation**
   - [ ] pip install completes (may take 3-5 minutes)
   - [ ] No errors in terminal
   - [ ] "Dependencies installed successfully!" message

5. **Playwright Installation**
   - [ ] Chromium download completes (optional, non-critical)
   - [ ] Warning if fails is acceptable

6. **Configuration Wizard**
   - [ ] Setup wizard starts
   - [ ] Prompts for job keywords
   - [ ] Prompts for locations
   - [ ] Prompts for salary preferences
   - [ ] Creates `config/user_prefs.json`

7. **Email Setup (Optional)**
   - [ ] Email provider selected (Gmail, iCloud, Outlook, etc.)
   - [ ] SMTP settings configured in `.env`
   - [ ] Test email sent successfully

8. **Database Initialization**
   - [ ] `data/` directory created
   - [ ] `data/jobs.sqlite` file created
   - [ ] No permission errors

9. **Health Check**
   - [ ] Health check runs automatically
   - [ ] All checks pass or have non-critical warnings

10. **Desktop Shortcuts (Optional)**
    - [ ] .command files appear on Desktop:
      - Run JobSentinel.command
      - Configure JobSentinel.command
      - JobSentinel Dashboard.command
      - JobSentinel Health Check.command
      - JobSentinel Dry Run.command
    - [ ] Shell aliases created in ~/.zshrc or ~/.bash_profile
    - [ ] launch-gui.command created in project root

### Method 2: GUI Launcher

1. **Launch GUI**
   - [ ] Double-click `launch-gui.command` or `launch-gui.sh`
   - [ ] Handle Gatekeeper if prompted
   - [ ] GUI window opens
   - [ ] No crash or error

2. **GUI Status Indicators**
   - [ ] ✅ Python Installation
   - [ ] ✅ Configuration File (or ⚠️ if first run)
   - [ ] ✅ Database
   - [ ] ⚫ API Server (not running yet)

3. **GUI Buttons Functional**
   - [ ] "Setup Wizard" button works
   - [ ] "Run Job Scraper" button works
   - [ ] "Edit Configuration" button works
   - [ ] "Help & Docs" button works

---

## 🎯 Functionality Verification

### CLI Commands

Test each command independently:

#### 1. Configuration Validation
```bash
python3 -m jsa.cli config-validate --path config/user_prefs.json
```
- [ ] Exits with code 0 (success)
- [ ] Validates all required fields
- [ ] No error messages

#### 2. Health Check
```bash
python3 -m jsa.cli health
```
- [ ] Shows system status
- [ ] All checks pass (✓)
- [ ] Reports versions correctly

Expected output:
```
✓ Python Version: 3.12.x
✓ Dependencies: Installed
✓ Configuration: Valid
✓ Database: Accessible
✓ Disk Space: X.X GB free
```

#### 3. Diagnostic Report
```bash
python3 -m jsa.cli diagnostic
```
- [ ] Generates comprehensive report
- [ ] No crashes
- [ ] Creates `diagnostic-report.txt`

#### 4. Database Operations
```bash
python3 -m jsa.cli db-optimize
```
- [ ] Optimizes database
- [ ] Reports success
- [ ] No errors

#### 5. Privacy Dashboard
```bash
python3 -m jsa.cli privacy
```
- [ ] Shows data transparency report
- [ ] Lists all stored data locations
- [ ] Confirms no telemetry

#### 6. Backup/Restore
```bash
# Create backup
python3 -m jsa.cli backup create
```
- [ ] Creates `backups/` directory
- [ ] Generates `.tar.gz` file
- [ ] Shows backup location

```bash
# List backups
python3 -m jsa.cli backup list
```
- [ ] Lists all backups
- [ ] Shows sizes and dates

---

### Job Scraping

#### Dry-Run Test (No Alerts)
```bash
python3 -m jsa.cli run-once --dry-run
```
- [ ] Connects to job sources
- [ ] Scrapes job listings
- [ ] Displays found jobs
- [ ] NO alerts sent (dry-run mode)
- [ ] Completes without errors

Expected output pattern:
```
Scraping jobs...
Found X jobs from [source]
Job scores calculated
Dry-run mode: No alerts sent
```

#### Real Run (With Alerts)
```bash
python3 -m jsa.cli run-once
```
- [ ] Scrapes jobs
- [ ] Saves to database
- [ ] Sends email alerts (if configured)
- [ ] No crashes

Verify data saved:
- [ ] Check `data/jobs.sqlite` exists
- [ ] File size increased after run
- [ ] Check email inbox for alerts (if configured)

---

### Web UI

#### Flask UI (Legacy)
```bash
python3 -m jsa.cli web --port 5000
```
- [ ] Server starts
- [ ] No errors in console
- [ ] Opens browser automatically (or manually visit http://localhost:5000)
- [ ] Dashboard loads
- [ ] Can view jobs
- [ ] Can filter/search
- [ ] Graceful shutdown with Ctrl+C

#### FastAPI UI (Modern)
```bash
python3 -m jsa.cli api --port 8000
```
- [ ] Server starts
- [ ] Visit http://localhost:8000/docs
- [ ] API documentation loads
- [ ] Interactive API explorer works
- [ ] Can test endpoints

---

### GUI Launcher (Full Flow)

1. **Start via GUI**
   - [ ] Double-click `launch-gui.command`
   - [ ] Click "🚀 Start JobSentinel"
   - [ ] Status changes to ✅ API Server
   - [ ] Prompt to open web browser

2. **Open Web UI**
   - [ ] Click "🌐 Open Web UI"
   - [ ] Browser opens to http://localhost:8000
   - [ ] Dashboard displays

3. **Run Scraper from GUI**
   - [ ] Click "📊 Run Job Scraper"
   - [ ] Confirmation dialog appears
   - [ ] Scraper runs in background
   - [ ] Activity log shows progress

4. **Test Email**
   - [ ] Click "📧 Test Email Alerts"
   - [ ] Test email sent
   - [ ] Check inbox for test message

5. **Stop Server**
   - [ ] Click "⏹️ Stop JobSentinel"
   - [ ] Server stops gracefully
   - [ ] Status changes to ⚫ API Server

---

## 🔧 Configuration Verification

### File Structure
```
JobSentinel/
├── .env                    ← Email/API credentials
├── config/
│   └── user_prefs.json    ← Job preferences
├── data/
│   └── jobs.sqlite        ← Job database
├── logs/
│   └── jobsentinel.log    ← Application logs
└── backups/               ← Backup files
```

- [ ] All directories exist
- [ ] Permissions are correct (user has read/write)
- [ ] No files in system directories

### Configuration File
Check `config/user_prefs.json`:

```json
{
  "keywords": ["python", "backend"],
  "locations": ["Remote"],
  "salary_min": 100000,
  "job_sources": {
    "jobswithgpt": { "enabled": true }
  }
}
```

- [ ] Valid JSON syntax
- [ ] At least one keyword defined
- [ ] At least one job source enabled
- [ ] Salary minimum is reasonable (0-500000)

### Environment File
Check `.env` exists:

```env
# Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
SMTP_TO=your-email@gmail.com
```

- [ ] File exists (created by setup wizard)
- [ ] Email settings configured (if using email alerts)
- [ ] No secrets committed to git (`.env` in `.gitignore`)

---

## 🔒 Security & Privacy Verification

### Data Privacy
- [ ] No data sent to external servers
- [ ] All data in local files only
- [ ] No telemetry or tracking code
- [ ] Verify with: `python3 -m jsa.cli privacy`

### Secrets Management
- [ ] No hardcoded API keys in code
- [ ] All secrets in `.env` file
- [ ] `.env` not tracked by git
- [ ] File permissions restrict access to user only

### Network Access
JobSentinel should ONLY connect to:
- [ ] Job board websites (for scraping)
- [ ] Email SMTP server (if configured)
- [ ] pip/PyPI (during installation only)

Verify no unexpected connections:
```bash
# Run scraper and monitor network
python3 -m jsa.cli run-once --dry-run
# Check Activity Monitor → Network tab
```

---

## 🚨 Error Handling Verification

### Common Failure Scenarios

Test that errors are handled gracefully:

1. **Invalid Configuration**
   ```bash
   # Edit config to have invalid JSON
   nano config/user_prefs.json
   # Add syntax error, save
   python3 -m jsa.cli config-validate
   ```
   - [ ] Shows helpful error message
   - [ ] Points to exact issue
   - [ ] Doesn't crash

2. **Missing Dependencies**
   ```bash
   # Uninstall a package
   pip3 uninstall requests -y
   python3 -m jsa.cli health
   ```
   - [ ] Detects missing package
   - [ ] Shows installation command
   - [ ] Doesn't crash

3. **Port Already in Use**
   ```bash
   # Start two instances
   python3 -m jsa.cli web &
   # In same terminal:
   python3 -m jsa.cli web
   ```
   - [ ] Second instance detects port conflict
   - [ ] Shows helpful error message
   - [ ] Suggests solution (different port)

4. **Network Unavailable**
   ```bash
   # Disable Wi-Fi, then:
   python3 -m jsa.cli run-once
   ```
   - [ ] Detects network error
   - [ ] Shows "No internet connection" message
   - [ ] Doesn't crash, can retry

---

## 📊 Performance Verification

### Resource Usage
Monitor during job scraping:

- [ ] CPU usage < 50% average
- [ ] Memory usage < 500MB
- [ ] Disk writes reasonable (database updates)
- [ ] Network traffic only to job boards

Check in Activity Monitor while running:
```bash
python3 -m jsa.cli run-once
```

### Response Times
- [ ] Web UI loads in < 2 seconds
- [ ] Job search completes in < 5 minutes
- [ ] Database queries < 100ms
- [ ] Health check runs in < 5 seconds

---

## 📚 Documentation Verification

### Files Exist and Are Current
- [ ] `README.md` - Project overview
- [ ] `docs/BEGINNER_GUIDE.md` - Zero-knowledge guide
- [ ] `docs/MACOS_QUICK_START.md` - macOS quick start
- [ ] `docs/MACOS_TROUBLESHOOTING.md` - macOS troubleshooting
- [ ] `docs/DEPLOYMENT_GUIDE.md` - Advanced deployment
- [ ] `docs/DOCUMENTATION_INDEX.md` - All docs index

### Content Accuracy
- [ ] README matches actual CLI commands
- [ ] macOS guide has working examples
- [ ] Troubleshooting guide is comprehensive
- [ ] No broken links in docs

---

## 🎓 User Experience Verification

### Zero-Knowledge User Test

Simulate a user with ZERO technical knowledge:

1. **Can they download?**
   - [ ] GitHub download link is obvious
   - [ ] ZIP file extracts easily

2. **Can they install?**
   - [ ] Double-click setup works (after Gatekeeper)
   - [ ] No confusing prompts
   - [ ] Progress is visible

3. **Can they configure?**
   - [ ] Setup wizard is intuitive
   - [ ] Questions are clear
   - [ ] Examples are helpful

4. **Can they run?**
   - [ ] Desktop shortcuts work
   - [ ] GUI is self-explanatory
   - [ ] Results are visible

5. **Can they troubleshoot?**
   - [ ] Error messages are helpful
   - [ ] Documentation is findable
   - [ ] Help commands work

---

## 🍎 macOS-Specific Verification

### Gatekeeper & Security
- [ ] Scripts can be opened after approval
- [ ] No security warnings after initial setup
- [ ] Quarantine attribute handled properly
- [ ] Code signing not required (for now)

### File System
- [ ] Handles spaces in paths
- [ ] Works in user directories (Desktop, Documents)
- [ ] Doesn't require system directories
- [ ] Respects macOS file permissions

### Apple Silicon (M1/M2/M3)
- [ ] Runs natively on Apple Silicon
- [ ] No Rosetta 2 warnings
- [ ] All dependencies compatible
- [ ] Performance is good

### Shell Integration
- [ ] Works in both zsh and bash
- [ ] Shell aliases function correctly
- [ ] .command files double-clickable
- [ ] Terminal opens correctly

---

## ✅ Sign-Off

### Final Validation
- [ ] All automated tests pass:
  ```bash
  python3 -m pytest tests/test_macos*.py -v
  ```
- [ ] Manual testing complete
- [ ] Documentation reviewed
- [ ] No critical bugs found
- [ ] User experience validated

### Deployment Ready
- [ ] macOS 15+ deployment verified ✅
- [ ] GUI launcher functional ✅
- [ ] Email notifications working ✅
- [ ] Database operations validated ✅
- [ ] Security checks passed ✅
- [ ] Documentation complete ✅

---

**Validated By:** ___________________  
**Date:** ___________________  
**Version Tested:** 0.9.0  
**macOS Version:** ___________________

---

## 📞 Support

If any checklist item fails:

1. Document the failure
2. Check `docs/MACOS_TROUBLESHOOTING.md`
3. Run diagnostic: `python3 -m jsa.cli diagnostic`
4. Open GitHub issue with details

**GitHub Issues:** https://github.com/cboyd0319/JobSentinel/issues

---

**Version History:**
- 1.0.0 (Oct 2025): Initial macOS deployment checklist

**License:** MIT
