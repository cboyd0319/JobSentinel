# Windows Deployment Verification Checklist

**Version:** 1.0.0  
**Date:** October 2025  
**Purpose:** Complete end-to-end verification for Windows 11 deployment

---

## ✅ Pre-Installation Verification

### System Requirements
- [ ] Windows 11 (build 22000+)
  - Run: `winver` (Win+R, type winver)
  - Verify build number ≥ 22000
- [ ] Python 3.12+ installed
  - Run: `python --version`
  - Expected: `Python 3.12.x` or higher
- [ ] Python in PATH
  - Run: `where python`
  - Should show path to python.exe
- [ ] Minimum 1GB disk space free
  - Check drive properties
- [ ] Internet connection available
  - Test: Open any website

### Python Configuration
- [ ] Python from python.org (not Microsoft Store)
- [ ] tkinter module available
  - Test: `python -c "import tkinter; print('OK')"`
- [ ] pip working
  - Test: `python -m pip --version`

---

## 📦 Installation Verification

### Method 1: Automated Setup (Recommended)

1. **Download Repository**
   - [ ] ZIP downloaded from GitHub
   - [ ] Extracted to Desktop or Documents (not Program Files)
   - [ ] Folder path has no spaces or special characters

2. **Run Setup Script**
   - [ ] Double-click `setup-windows.bat` OR
   - [ ] Right-click `setup-windows.ps1` → Run with PowerShell
   - [ ] Script starts without errors

3. **Pre-flight Checks Pass**
   - [ ] ✅ Windows 11: OK
   - [ ] ✅ Python 3.12+: OK
   - [ ] ✅ Disk Space: OK
   - [ ] ✅ Internet Connection: OK

4. **Dependency Installation**
   - [ ] pip install completes (may take 3-5 minutes)
   - [ ] No errors in red text
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
   - [ ] Email provider selected (Gmail, Outlook, etc.)
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
    - [ ] Shortcuts appear on Desktop:
      - Run JobSentinel
      - Configure JobSentinel
      - JobSentinel Dashboard
      - JobSentinel Health Check
    - [ ] Or batch files created if pywin32 unavailable

### Method 2: GUI Launcher

1. **Launch GUI**
   - [ ] Double-click `launch-gui.bat`
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
```powershell
python -m jsa.cli config-validate --path config/user_prefs.json
```
- [ ] Exits with code 0 (success)
- [ ] Validates all required fields
- [ ] No error messages

#### 2. Health Check
```powershell
python -m jsa.cli health
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
```powershell
python -m jsa.cli diagnostic
```
- [ ] Generates comprehensive report
- [ ] No crashes
- [ ] Creates `diagnostic-report.txt`

#### 4. Database Operations
```powershell
python -m jsa.cli db-optimize
```
- [ ] Optimizes database
- [ ] Reports success
- [ ] No errors

#### 5. Privacy Dashboard
```powershell
python -m jsa.cli privacy
```
- [ ] Shows data transparency report
- [ ] Lists all stored data locations
- [ ] Confirms no telemetry

#### 6. Backup/Restore
```powershell
# Create backup
python -m jsa.cli backup create
```
- [ ] Creates `backups/` directory
- [ ] Generates `.tar.gz` file
- [ ] Shows backup location

```powershell
# List backups
python -m jsa.cli backup list
```
- [ ] Lists all backups
- [ ] Shows sizes and dates

---

### Job Scraping

#### Dry-Run Test (No Alerts)
```powershell
python -m jsa.cli run-once --dry-run
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
```powershell
python -m jsa.cli run-once
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
```powershell
python -m jsa.cli web --port 5000
```
- [ ] Server starts
- [ ] No errors in console
- [ ] Opens browser automatically (or manually visit http://localhost:5000)
- [ ] Dashboard loads
- [ ] Can view jobs
- [ ] Can filter/search
- [ ] Graceful shutdown with Ctrl+C

#### FastAPI UI (Modern)
```powershell
python -m jsa.cli api --port 8000
```
- [ ] Server starts
- [ ] Visit http://localhost:8000/docs
- [ ] API documentation loads
- [ ] Interactive API explorer works
- [ ] Can test endpoints

---

### GUI Launcher (Full Flow)

1. **Start via GUI**
   - [ ] Double-click `launch-gui.bat`
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
- [ ] No files in Program Files (should be in user directory)

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
- [ ] Verify with: `python -m jsa.cli privacy`

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
```powershell
# Run scraper and check network activity
python -m jsa.cli run-once --dry-run
# Monitor in Task Manager → Performance → Ethernet/Wi-Fi
```

---

## 🚨 Error Handling Verification

### Common Failure Scenarios

Test that errors are handled gracefully:

1. **Invalid Configuration**
   ```powershell
   # Edit config to have invalid JSON
   notepad config\user_prefs.json
   # Add syntax error, save
   python -m jsa.cli config-validate
   ```
   - [ ] Shows helpful error message
   - [ ] Points to exact issue
   - [ ] Doesn't crash

2. **Missing Dependencies**
   ```powershell
   # Uninstall a package
   pip uninstall requests -y
   python -m jsa.cli health
   ```
   - [ ] Detects missing package
   - [ ] Shows installation command
   - [ ] Doesn't crash

3. **Port Already in Use**
   ```powershell
   # Start two instances
   python -m jsa.cli web
   # In another terminal:
   python -m jsa.cli web
   ```
   - [ ] Second instance detects port conflict
   - [ ] Shows helpful error message
   - [ ] Suggests solution (different port)

4. **Network Unavailable**
   ```powershell
   # Disable internet, then:
   python -m jsa.cli run-once
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

Check in Task Manager while running:
```powershell
python -m jsa.cli run-once
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
- [ ] `docs/WINDOWS_TROUBLESHOOTING.md` - This guide!
- [ ] `docs/DEPLOYMENT_GUIDE.md` - Advanced deployment
- [ ] `docs/DOCUMENTATION_INDEX.md` - All docs index

### Content Accuracy
- [ ] README matches actual CLI commands
- [ ] Beginner guide has working examples
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
   - [ ] Double-click setup works
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

## ✅ Sign-Off

### Final Validation
- [ ] All automated tests pass:
  ```powershell
  python -m pytest tests/test_windows*.py -v
  python -m pytest tests/test_gui_launcher.py -v
  ```
- [ ] Manual testing complete
- [ ] Documentation reviewed
- [ ] No critical bugs found
- [ ] User experience validated

### Deployment Ready
- [ ] Windows 11 deployment verified ✅
- [ ] GUI launcher functional ✅
- [ ] Email notifications working ✅
- [ ] Database operations validated ✅
- [ ] Security checks passed ✅
- [ ] Documentation complete ✅

---

**Validated By:** ___________________  
**Date:** ___________________  
**Version Tested:** 0.6.1  
**Windows Build:** ___________________

---

## 📞 Support

If any checklist item fails:

1. Document the failure
2. Check `docs/WINDOWS_TROUBLESHOOTING.md`
3. Run diagnostic: `python -m jsa.cli diagnostic`
4. Open GitHub issue with details

**GitHub Issues:** https://github.com/cboyd0319/JobSentinel/issues

---

**Version History:**
- 1.0.0 (Oct 2025): Initial deployment checklist

**License:** MIT
