# Windows Troubleshooting Guide

**Last Updated:** October 2025  
**Version:** 0.6.1  
**Target:** Windows 11 (build 22000+)

---

## 🎯 Quick Fixes

### Issue: "Python not found"

**Symptoms:**
- Error when double-clicking `deployments/windows/local/setup-windows.bat` or `deployments/windows/local/launch-gui.bat`
- Message: "Python is not recognized as an internal or external command"

**Solution:**
1. Download Python 3.12+ from https://www.python.org/downloads/
2. Run the installer
3. **CRITICAL:** Check the box "Add Python to PATH"
4. Complete installation
5. Restart your terminal/PowerShell
6. Test: Open PowerShell and type `python --version`

---

### Issue: "ModuleNotFoundError: No module named 'tkinter'"

**Symptoms:**
- GUI launcher crashes immediately
- Error: `ModuleNotFoundError: No module named 'tkinter'`

**Solution:**
tkinter is included with Python on Windows. If missing:

1. Reinstall Python from https://www.python.org/downloads/
2. During installation, select "Customize installation"
3. Ensure "tcl/tk and IDLE" is checked
4. Complete installation
5. Test: Run `python -c "import tkinter; print('OK')"`

---

### Issue: "SMTP Authentication Failed" (Email Alerts)

**Symptoms:**
- Email test fails in setup wizard
- Error: "535 5.7.8 Username and Password not accepted"

**Solution for Gmail:**
1. Enable 2-Factor Authentication on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Generate an App Password for "Mail"
4. Use this App Password (not your regular password) in `.env`:
   ```
   SMTP_PASS=your-app-password-here
   ```
5. Test again

**Solution for Outlook/Hotmail:**
1. Ensure "Less secure app access" is enabled (if using old account)
2. Or use OAuth2 authentication (advanced)
3. Check that account is not locked

**Solution for Other Email Providers:**
- Verify SMTP settings are correct
- Check if SMTP port (587 or 465) is blocked by firewall
- Ensure account allows SMTP access

---

### Issue: Desktop Shortcuts Not Created

**Symptoms:**
- Setup completes but no shortcuts appear on Desktop
- Warning: "Could not create shortcuts"

**Solution:**
1. Install pywin32 manually:
   ```powershell
   python -m pip install pywin32
   ```
2. Run shortcut creation manually:
   ```powershell
   python -m jsa.cli fix --create-shortcuts
   ```
3. Verify shortcuts appear on Desktop

**Alternative: Use Batch Files**
If .lnk shortcuts fail, create `.bat` files manually:

1. Create `Run JobSentinel.bat` on Desktop:
   ```batch
   @echo off
   cd /d "C:\Path\To\JobSentinel"
   python -m jsa.cli run-once
   pause
   ```
2. Replace `C:\Path\To\JobSentinel` with your actual path

---

### Issue: "Access Denied" or Permission Errors

**Symptoms:**
- Setup fails with "Access Denied"
- Cannot create directories or files

**Solution:**
1. **DO NOT run as Administrator** - JobSentinel doesn't need admin rights
2. Install in your user directory (e.g., Desktop, Documents)
3. Avoid Program Files directory
4. Check folder permissions (right-click → Properties → Security)
5. If on corporate computer, contact IT about user directory permissions

---

### Issue: Database Initialization Fails

**Symptoms:**
- Error: "Could not create database"
- Database file missing in `data/` directory

**Solution:**
1. Verify `data/` directory exists and is writable
2. Check disk space: Need at least 1GB free
3. Try creating database manually:
   ```powershell
   python -m jsa.cli db-init
   ```
4. If fails, check SQLite installation:
   ```powershell
   python -c "import sqlite3; print(sqlite3.version)"
   ```

---

### Issue: Web UI Won't Start

**Symptoms:**
- Error: "Port 5000 already in use"
- Browser shows "Connection refused"

**Solution:**
1. Check if port is in use:
   ```powershell
   netstat -ano | findstr :5000
   ```
2. Kill process using port (replace `PID` with actual process ID):
   ```powershell
   taskkill /PID <pid> /F
   ```
3. Or use a different port:
   ```powershell
   python -m jsa.cli web --port 5001
   ```

---

### Issue: Playwright/Chromium Installation Fails

**Symptoms:**
- Warning during setup: "Playwright installation failed"
- Some job scrapers don't work

**Solution:**
1. This is **non-critical** - basic scrapers still work
2. Install manually if needed:
   ```powershell
   python -m playwright install chromium
   ```
3. May require internet connection and ~200MB download
4. If fails, continue without Playwright - not required for basic functionality

---

## 🔧 Advanced Troubleshooting

### Clean Reinstallation

If all else fails, start fresh:

1. **Backup your data:**
   ```powershell
   python -m jsa.cli backup create
   ```
   (Saves to `backups/` directory)

2. **Delete installation:**
   ```powershell
   cd ..
   rmdir /s JobSentinel
   ```

3. **Fresh install:**
   ```powershell
   git clone https://github.com/cboyd0319/JobSentinel
   cd JobSentinel
   .\setup-windows.bat
   ```

4. **Restore data:**
   ```powershell
   python -m jsa.cli backup restore backups/backup-YYYY-MM-DD.tar.gz
   ```

---

### Verify Installation Health

Run comprehensive health check:

```powershell
python -m jsa.cli health
```

Expected output (all ✓):
```
✓ Python Version: 3.12.x
✓ Dependencies Installed
✓ Configuration Valid
✓ Database Accessible
✓ Internet Connection
✓ Ports Available
```

If any check fails, review the specific section above.

---

### Diagnostic Mode

For detailed troubleshooting info:

```powershell
python -m jsa.cli diagnostic
```

This generates a `diagnostic-report.txt` with:
- System information
- Python environment details
- Installed packages
- Configuration status
- Recent errors from logs

Share this file when asking for help on GitHub.

---

## 🐛 Common Error Messages

### "ImportError: DLL load failed while importing _sqlite3"

**Cause:** SQLite DLL missing or corrupted in Python installation

**Solution:**
1. Reinstall Python from official source
2. Use Python installer (not Microsoft Store version)
3. Ensure "Install for all users" is checked

---

### "SSLError: [SSL: CERTIFICATE_VERIFY_FAILED]"

**Cause:** SSL certificate validation failing

**Solution:**
```powershell
python -m pip install --upgrade certifi
```

For Python from python.org on Windows:
```powershell
# Find Python directory (usually C:\Python312)
cd C:\Python312
.\python.exe Install\Certificates.command
```

---

### "UnicodeDecodeError: 'charmap' codec can't decode"

**Cause:** File encoding issue with special characters

**Solution:**
Set environment variable:
```powershell
$env:PYTHONIOENCODING = "utf-8"
python -m jsa.cli run-once
```

To make permanent, add to PowerShell profile:
```powershell
notepad $PROFILE
# Add line: $env:PYTHONIOENCODING = "utf-8"
```

---

## 📞 Getting Help

### Before Asking for Help

1. Run diagnostic:
   ```powershell
   python -m jsa.cli diagnostic > diagnostic.txt
   ```

2. Check logs:
   ```
   logs/jobsentinel.log
   ```

3. Search existing issues:
   https://github.com/cboyd0319/JobSentinel/issues

### How to Ask for Help

Create a GitHub issue with:

1. **Title:** Brief description (e.g., "Setup fails on Windows 11")
2. **System Info:**
   - Windows version: `winver` (press Win+R, type winver)
   - Python version: `python --version`
3. **Steps to Reproduce:**
   - Exact commands you ran
   - Where in the process it failed
4. **Error Messages:**
   - Full error message (copy/paste, not screenshot)
   - Relevant logs from `logs/` directory
5. **Diagnostic Report:**
   - Attach `diagnostic.txt` file

---

## 🔒 Privacy & Security Notes

**All data stays local:**
- Database: `data/jobs.sqlite` (on your computer)
- Configuration: `config/user_prefs.json` (on your computer)
- No telemetry, no tracking, no external services

**Safe to uninstall:**
```powershell
# Just delete the folder
cd ..
rmdir /s JobSentinel
```

Your data is in that folder. If you want to keep it:
```powershell
# Backup first
python -m jsa.cli backup create
# Then uninstall
```

---

## 📚 Related Documentation

- [BEGINNER_GUIDE.md](BEGINNER_GUIDE.md) - Complete setup walkthrough
- [README.md](../README.md) - Project overview
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Advanced deployment options
- [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) - All documentation

---

## 💡 Tips for Success

1. **Use PowerShell** (not Command Prompt) - Better error messages
2. **Install in user directory** - Avoids permission issues
3. **Keep Python updated** - Use Python 3.12+ for best compatibility
4. **Don't run as Admin** - Not needed, adds complexity
5. **Read error messages** - They usually tell you what's wrong
6. **Start with dry-run** - Test without sending alerts:
   ```powershell
   python -m jsa.cli run-once --dry-run
   ```

---

**Still stuck?** Open an issue: https://github.com/cboyd0319/JobSentinel/issues

**Found a solution not listed here?** Submit a PR to help others!

---

**Version History:**
- 1.0.0 (Oct 2025): Initial Windows troubleshooting guide

**Maintainers:** @cboyd0319

**License:** MIT
