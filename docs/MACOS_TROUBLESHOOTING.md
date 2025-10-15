# macOS Troubleshooting Guide

**Last Updated:** October 2025  
**Version:** 0.9.0  
**Target:** macOS 15+ (Sequoia and later)

---

## 🎯 Quick Fixes

### Issue: "Permission denied" when running setup-macos.sh

**Symptoms:**
- Error when trying to run `deployments/macOS/local/setup-macos.sh`
- Message: "Permission denied" or "Operation not permitted"

**Solution:**
1. Open Terminal
2. Navigate to JobSentinel folder:
   ```bash
   cd ~/Desktop/JobSentinel
   ```
3. Make script executable:
   ```bash
   chmod +x setup-macos.sh
   ```
4. Run again:
   ```bash
   ./setup-macos.sh
   ```

---

### Issue: "Unidentified developer" warning (Gatekeeper)

**Symptoms:**
- macOS blocks script from running
- Message: "deployments/macOS/local/setup-macos.sh can't be opened because it is from an unidentified developer"

**Solution (Method 1):**
1. Right-click `deployments/macOS/local/setup-macos.sh`
2. Click "Open"
3. Click "Open" again in the warning dialog
4. Script will run

**Solution (Method 2):**
1. Open System Settings
2. Go to Privacy & Security
3. Scroll down to "Allow applications downloaded from"
4. Click "Allow Anyway" next to the blocked script
5. Re-run the script

**Solution (Method 3 - Disable Gatekeeper temporarily):**
```bash
# Disable Gatekeeper (requires admin password)
sudo spctl --master-disable

# Run setup
./setup-macos.sh

# Re-enable Gatekeeper (recommended)
sudo spctl --master-enable
```

---

### Issue: "Python not found" or "python3: command not found"

**Symptoms:**
- Error when double-clicking scripts
- Message: "python3: command not found" in Terminal

**Solution (Homebrew - Recommended):**
1. Install Homebrew:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. Install Python:
   ```bash
   brew install python@3.12
   ```
3. Verify:
   ```bash
   python3 --version
   ```

**Solution (python.org):**
1. Download Python 3.12+ from https://www.python.org/downloads/
2. Run the installer
3. Complete installation
4. Open a new Terminal window
5. Test: `python3 --version`

---

### Issue: "ModuleNotFoundError: No module named 'tkinter'"

**Symptoms:**
- GUI launcher crashes immediately
- Error: `ModuleNotFoundError: No module named 'tkinter'`

**Solution (Homebrew Python):**
```bash
brew install python-tk@3.12
```

**Solution (python.org Python):**
- tkinter should be included
- If missing, reinstall Python from python.org
- During installation, ensure "tcl/tk and IDLE" is selected

**Solution (Test tkinter):**
```bash
python3 -c "import tkinter; print('OK')"
```

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

**Solution for iCloud Mail:**
1. Enable 2-Factor Authentication
2. Go to https://appleid.apple.com
3. Sign in → Security → App-Specific Passwords
4. Generate password for "Mail"
5. Use this password in `.env`

**Solution for Outlook/Hotmail:**
1. Enable 2-Factor Authentication
2. Generate App Password at: https://account.microsoft.com/security
3. Use App Password in `.env`

---

### Issue: Desktop Shortcuts Not Created

**Symptoms:**
- Setup completes but no .command files appear on Desktop
- Warning: "Could not create shortcuts"

**Solution (Manual Creation):**
1. Open TextEdit
2. Format → Make Plain Text (Cmd+Shift+T)
3. Create file `Run JobSentinel.command`:
   ```bash
   #!/usr/bin/env bash
   cd ~/Desktop/JobSentinel
   python3 -m jsa.cli run-once
   read -p "Press Enter to close..."
   ```
4. Save to Desktop
5. Make executable:
   ```bash
   chmod +x ~/Desktop/"Run JobSentinel.command"
   ```

**Solution (Re-run Shortcut Creation):**
```bash
cd ~/Desktop/JobSentinel
python3 -m jsa.macos_shortcuts
```

---

### Issue: "Port already in use" (5000 or 8000)

**Symptoms:**
- Web UI or API server fails to start
- Error: "Address already in use" or "Port 5000/8000 is already in use"

**Solution (Find and Kill Process):**
```bash
# Find process using port 5000
lsof -ti:5000

# Kill the process (replace PID with actual number)
kill -9 PID

# Or use a different port
python3 -m jsa.cli web --port 5001
```

**Solution (Check What's Using the Port):**
```bash
lsof -i :5000
```

---

### Issue: "SSL: CERTIFICATE_VERIFY_FAILED"

**Symptoms:**
- Scraping fails with SSL errors
- Error mentioning certificate verification

**Solution (Install Certificates):**

**For python.org Python:**
```bash
# Navigate to Python installation folder
cd /Applications/Python\ 3.12/
# Run the certificate installer
./Install\ Certificates.command
```

**For Homebrew Python:**
```bash
# Reinstall certifi
pip3 install --upgrade certifi
```

---

### Issue: "xcrun: error: invalid active developer path"

**Symptoms:**
- Git or other command-line tools fail
- Error mentions missing Xcode command-line tools

**Solution:**
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Follow the installation dialog
# Wait for installation to complete (5-10 minutes)
```

---

## 🔧 Advanced Issues

### Issue: Database Locked (jobs.sqlite)

**Symptoms:**
- "Database is locked" error
- Cannot write to database

**Solution:**
```bash
# Find and kill any processes using the database
lsof data/jobs.sqlite

# Force unlock (last resort)
python3 -m jsa.cli db-optimize
```

---

### Issue: Memory Issues / System Slow

**Symptoms:**
- JobSentinel runs very slowly
- High memory usage
- System becomes unresponsive

**Solution:**
```bash
# Check memory usage
python3 -m jsa.cli health

# Reduce scraping concurrency
# Edit config/user_prefs.json:
{
  "scraping": {
    "max_workers": 2  # Reduce from default
  }
}
```

---

### Issue: Playwright Browser Installation Fails

**Symptoms:**
- Warning during setup about Playwright
- Some scrapers don't work

**Solution (Manual Install):**
```bash
# Install Playwright
pip3 install playwright

# Install Chromium browser
python3 -m playwright install chromium

# On Apple Silicon Macs, you may need Rosetta 2
softwareupdate --install-rosetta
```

---

### Issue: .command Files Don't Open in Terminal

**Symptoms:**
- Double-clicking .command file does nothing
- Or opens in TextEdit instead

**Solution:**
```bash
# Change default application
# Right-click .command file → Get Info
# Open with: Terminal
# Click "Change All..."
```

---

### Issue: "Operation not permitted" (SIP Protection)

**Symptoms:**
- Cannot write to certain directories
- Error: "Operation not permitted"

**Solution:**
- Don't install in /Applications or system folders
- Use ~/Desktop or ~/Documents
- JobSentinel doesn't need system-level access

---

## 🔒 Security & Privacy Issues

### Issue: Firewall Blocking Connections

**Symptoms:**
- Cannot scrape job boards
- Connection timeouts

**Solution:**
1. System Settings → Network
2. Firewall → Options
3. Allow Python to accept incoming connections
4. Or temporarily disable firewall for testing

---

### Issue: Privacy Settings Block File Access

**Symptoms:**
- Cannot read/write files
- "No permission" errors

**Solution:**
1. System Settings → Privacy & Security
2. Files and Folders
3. Grant Terminal full disk access (if needed)
4. Or run from unrestricted folder (Desktop, Documents)

---

## 📊 Performance Issues

### Issue: Slow Job Scraping

**Symptoms:**
- Takes > 10 minutes to scrape jobs
- System becomes slow during scraping

**Solution:**
```bash
# Reduce concurrent scrapers
# Edit config/user_prefs.json:
{
  "scraping": {
    "max_workers": 2,
    "request_timeout": 10
  }
}

# Run dry-run to test
python3 -m jsa.cli run-once --dry-run
```

---

### Issue: High CPU Usage

**Symptoms:**
- Fans running loud
- CPU at 100%

**Solution:**
```bash
# Check which process is using CPU
top -o cpu

# If it's Python:
# 1. Check for infinite loops in logs
# 2. Restart JobSentinel
# 3. Reduce concurrent workers
```

---

## 🐛 Common macOS-Specific Issues

### Issue: Apple Silicon (M1/M2/M3) Compatibility

**Symptoms:**
- Some packages fail to install
- "Architecture not supported" errors

**Solution:**
```bash
# Most packages now support Apple Silicon natively
# If issues persist, install Rosetta 2:
softwareupdate --install-rosetta

# Use Homebrew for Apple Silicon
/opt/homebrew/bin/brew install python@3.12
```

---

### Issue: Quarantine Attribute on Downloaded Files

**Symptoms:**
- Downloaded files won't execute
- "damaged and can't be opened" error

**Solution:**
```bash
# Remove quarantine attribute
cd ~/Desktop/JobSentinel
xattr -dr com.apple.quarantine .

# Make scripts executable
chmod +x deployments/macOS/local/setup-macos.sh launch-gui.sh
```

---

### Issue: Homebrew PATH Issues

**Symptoms:**
- Homebrew installed but commands not found
- `brew` command not recognized

**Solution (Intel Mac):**
```bash
# Add to ~/.zshrc or ~/.bash_profile
echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc
```

**Solution (Apple Silicon Mac):**
```bash
# Add to ~/.zshrc or ~/.bash_profile
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc
```

---

## 🆘 Getting More Help

### Diagnostic Information to Collect

When asking for help, provide:

```bash
# System information
sw_vers

# Python version
python3 --version

# JobSentinel health check
python3 -m jsa.cli health

# Recent logs
tail -n 50 logs/jobsentinel.log

# Check if ports available
lsof -i :5000
lsof -i :8000
```

### Run Full Diagnostic

```bash
python3 -m jsa.cli diagnostic
# This creates diagnostic-report.txt
```

---

## 📚 Additional Resources

**Documentation:**
- `docs/MACOS_QUICK_START.md` - Getting started
- `docs/BEGINNER_GUIDE.md` - Complete guide
- `docs/DEPLOYMENT_GUIDE.md` - Advanced deployment
- `docs/DOCUMENTATION_INDEX.md` - All documentation

**Online Help:**
- GitHub Issues: https://github.com/cboyd0319/JobSentinel/issues
- Discussions: https://github.com/cboyd0319/JobSentinel/discussions

**macOS Resources:**
- Homebrew: https://brew.sh/
- Python on macOS: https://www.python.org/downloads/macos/
- Terminal Basics: https://support.apple.com/guide/terminal/

---

## 🔧 Preventive Maintenance

### Keep System Healthy

```bash
# Update dependencies regularly
pip3 install --upgrade -e .

# Clean up old data
python3 -m jsa.cli db-optimize

# Create backups
python3 -m jsa.cli backup create

# Check system health
python3 -m jsa.cli health
```

---

**Version:** 1.0.0 (October 2025)  
**Maintained by:** JobSentinel Team  
**License:** MIT
