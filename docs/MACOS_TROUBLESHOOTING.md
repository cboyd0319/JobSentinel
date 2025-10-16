# macOS Troubleshooting Guide

This guide covers common issues encountered when setting up and running JobSentinel on macOS, with practical solutions for users of all skill levels.

---

## 🔒 Gatekeeper & Security Issues

### Problem: "setup.command can't be opened because it is from an unidentified developer"

**Cause:** macOS Gatekeeper protects you from running untrusted software.

**Solution:**
1. **Control-click** (or right-click) the `.command` file
2. Select **Open** from the menu
3. Click **Open** again in the dialog
4. The script will run and be remembered as safe

**Alternative:** In System Settings → Privacy & Security, click "Open Anyway" if the option appears.

---

### Problem: "Permission denied" when double-clicking scripts

**Cause:** The script files don't have executable permissions.

**Solution:**
```bash
cd ~/JobSentinel/deploy/local/macos
chmod +x *.command *.sh
```

Or right-click the script → Get Info → Sharing & Permissions → check "Execute" for yourself.

---

## 🐍 Python Installation Issues

### Problem: "Python 3 was not found on this Mac"

**Cause:** Python 3 is not installed or not in your PATH.

**Solution 1 - Install via Homebrew (recommended):**
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python 3.12
brew install python@3.12

# Add to PATH (usually automatic, but run this if needed)
echo 'export PATH="/opt/homebrew/opt/python@3.12/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Solution 2 - Install from python.org:**
1. Download Python 3.12 from [python.org/downloads](https://www.python.org/downloads/)
2. Run the installer (PKG file)
3. Restart Terminal
4. Run `python3 --version` to verify

---

### Problem: Python version is too old (3.10 or earlier)

**Cause:** JobSentinel requires Python 3.11+.

**Solution:**
```bash
# Check current version
python3 --version

# Install newer version via Homebrew
brew install python@3.12

# Update your shell PATH
echo 'export PATH="/opt/homebrew/opt/python@3.12/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify new version
python3 --version
```

---

## 📦 Installation & Setup Issues

### Problem: Setup fails with "No module named 'jsa'"

**Cause:** Dependencies not installed or virtual environment not activated.

**Solution:**
```bash
cd ~/JobSentinel

# Make sure virtual environment exists
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi

# Activate and install
source .venv/bin/activate
pip install --upgrade pip
pip install -e .

# Verify installation
python -m jsa.cli health
```

---

### Problem: "playwright install chromium" fails or hangs

**Cause:** Network issues, disk space, or security software blocking download.

**Solution 1 - Retry with clean cache:**
```bash
cd ~/JobSentinel
source .venv/bin/activate
python -m playwright uninstall chromium
python -m playwright install chromium
```

**Solution 2 - Check disk space:**
```bash
df -h ~
```
Need at least 1GB free. Delete files if needed.

**Solution 3 - Temporarily disable VPN/firewall:**
Some corporate networks block Playwright downloads. Try on personal network.

---

### Problem: Setup stuck downloading dependencies

**Cause:** Slow network, PyPI issues, or interrupted connection.

**Solution:**
1. Press `Ctrl+C` to cancel
2. Check your internet connection
3. Re-run `setup.command` — it will resume where it left off
4. If problem persists, try:
```bash
cd ~/JobSentinel
source .venv/bin/activate
pip install --upgrade pip --no-cache-dir
pip install -e . --no-cache-dir
```

---

## 🖥️ GUI Launcher Issues

### Problem: GUI launcher won't start or crashes immediately

**Cause:** Missing tkinter (Python GUI library) or corrupted installation.

**Solution 1 - Reinstall Python with tkinter:**
```bash
brew reinstall python@3.12
```

**Solution 2 - Install tkinter manually:**
```bash
brew install python-tk@3.12
```

**Solution 3 - Use command-line instead:**
```bash
cd ~/JobSentinel
.venv/bin/python -m jsa.cli run-once
```

---

### Problem: Desktop shortcuts not created after setup

**Cause:** Permissions issue or interrupted setup process.

**Solution:**
```bash
cd ~/JobSentinel
source .venv/bin/activate
python -m jsa.macos_shortcuts
```

This manually creates all desktop shortcuts.

---

## 🔧 Configuration Issues

### Problem: "Configuration file not found"

**Cause:** Setup wizard not completed or config file deleted.

**Solution:**
```bash
cd ~/JobSentinel
.venv/bin/python -m jsa.cli setup
```

Run the interactive setup wizard to create `deploy/common/config/user_prefs.json`.

---

### Problem: Changes to config file don't take effect

**Cause:** Cached settings or config file syntax error.

**Solution:**
1. Verify JSON syntax at [jsonlint.com](https://jsonlint.com)
2. Restart any running JobSentinel processes
3. Check config path is correct:
```bash
ls -la ~/JobSentinel/deploy/common/config/user_prefs.json
```

---

## 🌐 Network & API Issues

### Problem: "Failed to fetch jobs" or timeout errors

**Cause:** Network connectivity, rate limiting, or job board down.

**Solution:**
1. Check internet: `ping google.com`
2. Try with fewer sources first
3. Add delays between requests in config
4. Check if job board website is accessible in browser

---

### Problem: "SSL certificate verification failed"

**Cause:** Corporate proxy, outdated certificates, or system time wrong.

**Solution 1 - Check system time:**
System Settings → General → Date & Time → Set automatically

**Solution 2 - Update certificates:**
```bash
pip install --upgrade certifi
```

**Solution 3 - Corporate proxy:**
Add to `~/.zshrc`:
```bash
export HTTPS_PROXY="http://proxy.company.com:8080"
```

---

## 💾 Database Issues

### Problem: "Database is locked" error

**Cause:** Multiple JobSentinel instances running simultaneously.

**Solution:**
```bash
# Find and kill any running instances
ps aux | grep jsa
kill <PID>

# Or force kill all Python processes (careful!)
pkill -f "python.*jsa"
```

---

### Problem: Data directory permission errors

**Cause:** Wrong file permissions on `data/` folder.

**Solution:**
```bash
cd ~/JobSentinel
chmod -R u+w data/
ls -la data/
```

---

## 🍎 Apple Silicon (M1/M2/M3) Issues

### Problem: "Bad CPU type in executable" or Rosetta errors

**Cause:** Running Intel-only binary on Apple Silicon without Rosetta.

**Solution - Install Rosetta 2:**
```bash
softwareupdate --install-rosetta --agree-to-license
```

---

### Problem: Homebrew installed in wrong location

**Cause:** Homebrew for Apple Silicon is at `/opt/homebrew`, not `/usr/local`.

**Solution:**
```bash
# Add Homebrew to PATH for Apple Silicon
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc
```

---

## 🔐 Privacy & Security

### Problem: Notifications not being sent

**Cause:** Missing credentials, incorrect SMTP settings, or blocked port.

**Solution:**
1. Check `.env` file exists and has correct values
2. For Gmail, generate App Password (Settings → Security → 2-Step Verification → App passwords)
3. Test email settings:
```bash
cd ~/JobSentinel
.venv/bin/python -m jsa.cli test-notifications
```

---

## 🚨 Emergency Fixes

### Complete Reset (Last Resort)

If nothing works, start fresh:

```bash
# Backup your data first!
cp -r ~/JobSentinel/data ~/JobSentinel-backup-data
cp ~/JobSentinel/deploy/common/config/user_prefs.json ~/user_prefs.json.backup

# Remove everything
cd ~/JobSentinel
rm -rf .venv
rm -rf deploy/common/app/src/jsa.egg-info

# Re-run setup
cd deploy/local/macos
./setup.command
```

---

## 📞 Still Stuck?

1. **Check logs:** `~/JobSentinel/data/logs/jobsentinel.log`
2. **Run health check:** `.venv/bin/python -m jsa.cli health`
3. **Search existing issues:** [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues)
4. **Ask for help:** Open a new issue with:
   - macOS version: `sw_vers -productVersion`
   - Python version: `python3 --version`
   - Error message (full text)
   - Steps to reproduce

---

**See also:**
- [MACOS_QUICK_START.md](./MACOS_QUICK_START.md) — Complete setup guide
- [MACOS_DEPLOYMENT_CHECKLIST.md](./MACOS_DEPLOYMENT_CHECKLIST.md) — Validation checklist
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — General troubleshooting (all platforms)

