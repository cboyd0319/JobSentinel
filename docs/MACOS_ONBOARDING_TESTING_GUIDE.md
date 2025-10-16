# macOS Onboarding Experience - Testing & Validation Guide

This document describes how to test and validate the complete macOS onboarding experience for JobSentinel.

## Overview

The macOS onboarding has been redesigned for users with **ZERO technical knowledge**. Everything is accessible through double-clickable `.command` files.

---

## Testing Checklist

### Pre-Installation Testing

#### 1. Prerequisites Check

Test the **Check Python.command** helper:

```bash
cd deploy/local/macos
open check-python.command
```

**Expected behavior:**
- Opens Terminal automatically
- Shows Python version if installed
- Shows friendly install instructions if Python missing
- Waits for user to press Enter before closing

**Test scenarios:**
- ✅ Python 3.12 installed → Shows "✅ Found: Python 3.12.x"
- ✅ Python 3.11 installed → Shows "✅ Found: Python 3.11.x"
- ❌ No Python → Shows install instructions with links

---

### Installation Testing

#### 2. Setup Wizard

Test the main **setup.command** installer:

```bash
cd deploy/local/macos
open setup.command
```

**Expected flow:**
1. **Gatekeeper warning** (first run only)
   - User gets "unidentified developer" warning
   - User Control-clicks → Open → Opens successfully
   
2. **System checks** (automatic)
   - ✅ macOS version check (12+ required, 14+ recommended)
   - ✅ Python version check (3.11+ required, 3.12+ recommended)
   - ✅ Disk space check (1GB+ required)
   - ✅ Internet connection check

3. **Virtual environment creation** (automatic)
   - Creates `.venv` directory in project root
   - Shows progress: "Creating virtual environment (this happens once)..."
   - On subsequent runs: "Existing virtual environment detected - reusing it."

4. **Dependency installation** (automatic)
   - Updates pip, setuptools, wheel
   - Installs JobSentinel package in development mode
   - Shows progress indicators
   - Takes 2-5 minutes depending on internet speed

5. **Playwright installation** (automatic)
   - Downloads Chromium browser (~100MB)
   - Shows download progress
   - Takes 1-2 minutes

6. **Configuration wizard** (interactive)
   - Asks for job search keywords
   - Asks for preferred locations
   - Asks for salary requirements
   - Asks for notification preferences
   - Creates `deploy/common/config/user_prefs.json`

7. **Health check** (automatic)
   - Verifies all components installed correctly
   - Tests database connectivity
   - Shows green checkmarks for each component

8. **Desktop shortcut creation** (automatic)
   - Creates shortcuts on Desktop:
     - `Run JobSentinel.command`
     - `JobSentinel Dashboard.command`
     - `Configure JobSentinel.command`
     - `JobSentinel Launcher.command` (GUI)
     - `JobSentinel Health Check.command`
     - `JobSentinel Dry Run.command`

9. **Success message**
   - Shows next steps with example commands
   - Waits for user to press Enter before closing

**Test scenarios:**
- ✅ Fresh install → All steps complete successfully
- ✅ Re-run after failed install → Resumes where it left off
- ✅ Re-run after successful install → Skips completed steps
- ❌ No internet → Fails at dependency installation with helpful message
- ❌ Not enough disk space → Fails at disk check with clear message
- ❌ Python too old → Fails at Python check with upgrade instructions

---

### Post-Installation Testing

#### 3. GUI Launcher

Test the **JobSentinel Launcher.command**:

```bash
cd ~/Desktop
open "JobSentinel Launcher.command"
```

**Expected behavior:**
- Opens Terminal briefly
- Launches GUI window (800x600)
- Shows modern, clean interface with:
  - System status indicators (Python, Config, Database, Server)
  - Large "🚀 Start JobSentinel" button (green)
  - "⏹️ Stop JobSentinel" button (red, initially disabled)
  - "🌐 Open Web UI" button (blue, initially disabled)
  - Utility buttons in grid:
    - ⚙️ Setup Wizard
    - 📊 Run Job Scraper
    - 🔧 Edit Configuration
    - 📧 Test Email Alerts
    - 💾 Backup Data
    - ❓ Help & Docs
  - Activity log at bottom
  - Footer: "JobSentinel v0.6.1 | 100% Local • 100% Private • 100% Free"

**Test scenarios:**
- ✅ Click "Start JobSentinel" → Server starts, status changes to green
- ✅ Click "Open Web UI" → Browser opens to http://localhost:8000
- ✅ Click "Stop JobSentinel" → Server stops, status changes to gray
- ✅ Click "Setup Wizard" → Configuration wizard opens in new window
- ✅ Click "Run Job Scraper" → Confirmation dialog, then runs in background
- ✅ Click "Edit Configuration" → user_prefs.json opens in default editor
- ✅ Click "Help & Docs" → Opens documentation in browser
- ✅ Close window while server running → Confirmation dialog
- ❌ No config file → Prompts to run Setup Wizard first

#### 4. Desktop Shortcuts

Test each desktop shortcut:

**A. Run JobSentinel.command**
```bash
open ~/Desktop/"Run JobSentinel.command"
```
- Opens Terminal
- Runs job scraper
- Shows progress in real-time
- Sends notifications if jobs found
- Waits for Enter before closing

**B. JobSentinel Dashboard.command**
```bash
open ~/Desktop/"JobSentinel Dashboard.command"
```
- Opens Terminal
- Starts web server on port 5000
- Opens browser to http://localhost:5000
- Shows dashboard with jobs list
- Terminal shows server logs

**C. Configure JobSentinel.command**
```bash
open ~/Desktop/"Configure JobSentinel.command"
```
- Opens Terminal
- Runs configuration wizard
- Interactive prompts for all settings
- Saves to user_prefs.json
- Waits for Enter before closing

**D. JobSentinel Health Check.command**
```bash
open ~/Desktop/"JobSentinel Health Check.command"
```
- Opens Terminal
- Checks all components
- Shows status for:
  - Python version
  - Dependencies installed
  - Database accessible
  - Configuration valid
  - Internet connection
  - Disk space
- Shows green ✅ or red ❌ for each
- Waits for Enter before closing

**E. JobSentinel Dry Run.command**
```bash
open ~/Desktop/"JobSentinel Dry Run.command"
```
- Opens Terminal
- Runs scraper WITHOUT sending notifications
- Shows what would be sent
- Good for testing configuration
- Waits for Enter before closing

---

### Error Handling Testing

#### 5. Common Error Scenarios

**A. Python not found**
```bash
# Temporarily hide Python (for testing)
alias python3='/usr/bin/false'
open setup.command
```
Expected:
- Clear error: "✗ Python not found"
- Shows install instructions
- Links to python.org and Homebrew

**B. No internet connection**
```bash
# Disable network (for testing)
sudo ifconfig en0 down
open setup.command
```
Expected:
- Passes initial checks
- Fails at dependency installation
- Clear message: "Could not download dependencies"
- Suggests checking internet connection

**C. Disk full**
Expected:
- Fails at disk space check
- Clear message: "Only X.X GB free. Need at least 1 GB"
- Suggests freeing up space

**D. Configuration file missing**
```bash
# Delete config
rm deploy/common/config/user_prefs.json
open ~/Desktop/"Run JobSentinel.command"
```
Expected:
- Detects missing config
- Prompts to run Setup Wizard
- Provides clear instructions

**E. Virtual environment corrupted**
```bash
# Delete Python binary from venv
rm .venv/bin/python3
open setup.command
```
Expected:
- Detects corrupted venv
- Recreates virtual environment
- Continues with installation

---

### User Experience Testing

#### 6. Zero-Knowledge User Simulation

Test with someone who has:
- Never used Terminal before
- Doesn't know what "command line" means
- Has basic Mac usage skills (Finder, double-clicking)

**Test flow:**
1. Give them the JobSentinel folder
2. Tell them: "Double-click setup.command in deploy/local/macos"
3. Observe WITHOUT helping
4. Note any confusion or errors

**Success criteria:**
- ✅ Completes setup without asking for help
- ✅ Understands all prompts and messages
- ✅ Can find and launch GUI afterward
- ✅ Can run first job search
- ✅ Understands notification results

**Common issues to watch for:**
- ❌ Gatekeeper warning scares them (add reassurance in docs)
- ❌ Doesn't know what "keywords" means (add examples)
- ❌ Confused about notifications (add test button)
- ❌ Can't find Desktop shortcuts (verify they were created)

---

### Performance Testing

#### 7. Timing Benchmarks

Measure time for each phase:

| Phase | Expected Time | Acceptable Range |
|-------|---------------|------------------|
| System checks | 5 seconds | 3-10 seconds |
| Venv creation | 10 seconds | 5-30 seconds |
| pip upgrade | 15 seconds | 10-30 seconds |
| Package install | 2 minutes | 1-5 minutes |
| Playwright install | 1 minute | 30s-3 minutes |
| Config wizard | Variable | User-paced |
| Health check | 5 seconds | 3-10 seconds |
| Shortcut creation | 2 seconds | 1-5 seconds |
| **Total (automated)** | **4 minutes** | **2-9 minutes** |

---

### Documentation Testing

#### 8. Documentation Completeness

Verify each documentation file exists and is accurate:

**A. MACOS_QUICK_START.md**
- [ ] Step-by-step installation guide
- [ ] Screenshots or clear descriptions
- [ ] Troubleshooting section with 5+ common issues
- [ ] Zero technical jargon (or explained when used)
- [ ] Links to other resources

**B. MACOS_TROUBLESHOOTING.md**
- [ ] Covers 15+ common issues
- [ ] Each issue has: Problem → Cause → Solution
- [ ] Solutions are copy-paste ready (code blocks)
- [ ] Organized by category (Security, Python, Network, etc.)
- [ ] Links back to Quick Start

**C. MACOS_DEPLOYMENT_CHECKLIST.md**
- [ ] Checkboxes for all validation steps
- [ ] Space for notes
- [ ] Suitable for team handoff
- [ ] References health check commands

**D. deploy/local/macos/README.md**
- [ ] Clear prerequisites table
- [ ] Zero-knowledge quick start section
- [ ] Explains what `.command` files are
- [ ] Daily usage instructions
- [ ] Links to detailed docs

---

### Security Testing

#### 9. Security Validation

**A. Path injection prevention**
```bash
# Test with malicious paths
PROJECT_ROOT="/tmp/test'; rm -rf /; echo 'hacked"
python3 -c "from jsa.macos_shortcuts import create_launcher_script; create_launcher_script('$PROJECT_ROOT')"
```
Expected:
- Paths are properly quoted with shlex.quote()
- No code injection possible
- Script fails safely if path invalid

**B. Subprocess security**
- [ ] All subprocess calls use list arguments (not strings)
- [ ] No shell=True unless absolutely necessary
- [ ] All paths validated before use
- [ ] All `# nosec` comments have justifications

**C. File permissions**
- [ ] .command files are executable (755)
- [ ] Config files are user-readable only (600)
- [ ] .venv directory is user-owned
- [ ] No world-writable files created

---

### Regression Testing

#### 10. Existing Functionality

Ensure nothing broke:

- [ ] Command-line `jsa.cli` still works
- [ ] All existing tests pass
- [ ] Web dashboard still accessible
- [ ] Database migrations work
- [ ] Notification system works
- [ ] Job scrapers work
- [ ] Configuration schema unchanged (or backward compatible)

---

## Test Results Template

Use this template to record test results:

```markdown
## Test Results - [Date]

**Tester:** [Name]
**macOS Version:** [e.g., 14.5 Sonoma]
**Python Version:** [e.g., 3.12.1]
**Test Duration:** [Total time]

### Results

| Test Category | Status | Notes |
|---------------|--------|-------|
| Prerequisites | ✅ | |
| Installation | ✅ | |
| GUI Launcher | ✅ | |
| Desktop Shortcuts | ✅ | |
| Error Handling | ⚠️ | One issue with disk check |
| User Experience | ✅ | |
| Performance | ✅ | |
| Documentation | ✅ | |
| Security | ✅ | |
| Regression | ✅ | |

### Issues Found

1. **Issue:** [Description]
   - **Severity:** [Critical / High / Medium / Low]
   - **Steps to Reproduce:** [...]
   - **Expected:** [...]
   - **Actual:** [...]
   - **Fix:** [...]

### Recommendations

- [Suggestion 1]
- [Suggestion 2]
```

---

## Automated Testing

For CI/CD, run:

```bash
# Unit tests
pytest deploy/common/tests/test_macos_enhancements.py -v

# Linting
ruff check deploy/common/app/src/jsa/macos_shortcuts.py

# Security scan
bandit -r deploy/common/app/src/jsa/macos_shortcuts.py

# Type checking
mypy deploy/common/app/src/jsa/macos_shortcuts.py
```

---

## Sign-Off Criteria

Before merging to main, ensure:

- [ ] All automated tests pass
- [ ] Manual testing completed on macOS 12, 13, and 14
- [ ] Zero-knowledge user successfully completed setup
- [ ] All documentation reviewed and accurate
- [ ] No security vulnerabilities found
- [ ] Performance within acceptable ranges
- [ ] Code review approved
- [ ] PR description updated with test results

---

**Last Updated:** October 16, 2025  
**Version:** 1.0.0
