# Windows Setup Validation Checklist

**For:** Zero-technical-knowledge Windows 11 users  
**Purpose:** Verify your JobSentinel installation is working perfectly  
**Time:** 5 minutes

---

## 🎯 Quick Validation (Copy-Paste Commands)

### Step 1: Open Command Prompt
1. Press `Windows + R`
2. Type `cmd` and press Enter
3. Type `cd Desktop\JobSentinel` (if that's where you installed it)
4. Press Enter

### Step 2: Run Validation Script

Copy and paste this command:

```cmd
python scripts\test_windows_setup.py
```

**Expected Result:** You should see "ALL TESTS PASSED!"

If you see this, **you're done!** Your installation is perfect. 🎉

---

## 📋 Manual Validation (If Script Fails)

If the automated script doesn't work, test each component manually:

### Test 1: Python Version

**Command:**
```cmd
python --version
```

**Expected:**
- You should see "Python 3.12.x" or newer
- If you see "Python 3.11" or older → Upgrade Python

✅ **Pass if:** Version is 3.12.0 or higher  
❌ **Fail if:** Version is 3.11.x or lower

---

### Test 2: Health Check

**Command:**
```cmd
python -m jsa.cli health
```

**Expected:**
- You should see "JobSentinel Health Check"
- Most checks should show ✓ (green checkmarks)
- A few ⚠ warnings are OK (optional features)
- ✗ (red X) on critical items means something needs fixing

✅ **Pass if:** No red X marks on critical items  
⚠ **OK if:** Yellow warnings (optional features)  
❌ **Fail if:** Red X on Python, dependencies, or config

**Common Warnings (These are OK):**
- "Optional Dependencies unavailable" → ML/MCP features (optional)
- "Database will be created on first run" → Normal for first time
- ".env file missing" → Optional, not required

---

### Test 3: Configuration

**Command:**
```cmd
python -m jsa.cli config-validate --path config\user_prefs.json
```

**Expected:**
- "JSON Schema validation passed" ✓
- "Config loaded successfully" ✓
- May show a warning about "generic_js" → This is OK

✅ **Pass if:** Validation passed and config loaded  
❌ **Fail if:** Errors about missing file or invalid JSON

**Fix if Failed:**
```cmd
copy config\user_prefs.example.json config\user_prefs.json
```

---

### Test 4: Database

**Command:**
```cmd
dir data\jobs.sqlite
```

**First Time:**
- File might not exist yet → This is OK!
- Database will be created when you first run the app

**After First Run:**
- You should see a file named "jobs.sqlite"

✅ **Pass if:** Directory accessible (file may not exist yet)  
❌ **Fail if:** Can't access data directory

**Fix if Failed:**
```cmd
mkdir data
```

---

### Test 5: Web UI

**Command:**
```cmd
python -m jsa.cli web
```

**Expected:**
- "Starting JobSentinel Web UI on http://localhost:5000"
- "Press Ctrl+C to stop the server"
- Browser should open automatically (or visit http://localhost:5000)
- You should see the JobSentinel dashboard

✅ **Pass if:** Server starts and web page loads  
❌ **Fail if:** "Port already in use" → Try: `python -m jsa.cli web --port 5001`

**To Stop Server:**
- Press `Ctrl + C` in the command window

---

### Test 6: API Server

**Command:**
```cmd
python -m jsa.cli api
```

**Expected:**
- "Starting JobSentinel API server on http://127.0.0.1:8000"
- "API docs available at http://127.0.0.1:8000/api/docs"
- Visit http://localhost:8000/api/docs to see API documentation

✅ **Pass if:** Server starts and API docs load  
❌ **Fail if:** Port conflict → Try: `python -m jsa.cli api --port 8001`

**To Stop Server:**
- Press `Ctrl + C` in the command window

---

### Test 7: Dry Run

**Command:**
```cmd
python -m jsa.cli run-once --dry-run
```

**Expected:**
- "Starting job search..."
- "DRY RUN MODE: Jobs will be collected but no alerts will be sent"
- Should search for jobs and show results
- Takes 2-5 minutes

✅ **Pass if:** Completes without errors  
⚠ **OK if:** Shows some module import warnings (non-critical)  
❌ **Fail if:** Crashes or shows critical errors

---

## 🔍 Troubleshooting Quick Reference

### "Python is not recognized"
**Problem:** Python not in PATH

**Fix:**
1. Reinstall Python from https://www.python.org/downloads/
2. **Check the box** "Add Python to PATH" during installation
3. Restart Command Prompt

---

### "No module named 'jsa'"
**Problem:** Package not installed

**Fix:**
```cmd
python -m pip install -e .
```

---

### "Config file missing"
**Problem:** Haven't run setup wizard

**Fix:** Choose one:

**Option 1 - Interactive Setup:**
```cmd
python -m jsa.cli setup
```

**Option 2 - Quick Setup:**
```cmd
copy config\user_prefs.example.json config\user_prefs.json
```

---

### "Port already in use"
**Problem:** Another program using the port

**Fix:** Use a different port:
```cmd
python -m jsa.cli web --port 5001
```

Or find and close the program using port 5000:
```cmd
netstat -ano | findstr :5000
```

---

### "Database error"
**Problem:** Corrupted database file

**Fix:**
```cmd
del data\jobs.sqlite
python -m jsa.cli health
```
(Database will be recreated automatically)

---

## ✅ Success Criteria

**Your installation is PERFECT if:**

1. ✅ Python 3.12+ detected
2. ✅ Health check shows no critical errors
3. ✅ Config validation passes
4. ✅ Web UI starts successfully
5. ✅ API server starts successfully
6. ✅ Dry run completes without crashing

**Note:** A few warnings are OK. Look for:
- "Optional features" warnings → These are fine
- "Will be created on first run" → Normal
- Module import warnings in console → Non-critical

**Your installation has ISSUES if:**

1. ❌ Python version is older than 3.12
2. ❌ Health check shows critical failures
3. ❌ Can't start web UI or API server
4. ❌ Dry run crashes with errors

---

## 🎉 You're All Set!

If all tests pass, you're ready to use JobSentinel!

**Next Steps:**

1. **Customize Your Settings:**
   - Edit `config\user_prefs.json` with your preferences
   - Or run: `python -m jsa.cli setup`

2. **First Real Search:**
   ```cmd
   python -m jsa.cli run-once
   ```

3. **View Results:**
   - Web UI: `python -m jsa.cli web`
   - Visit: http://localhost:5000

4. **Set Up Automation:**
   - See: docs\WINDOWS_QUICK_START.md
   - Section: "Automate Job Searches"

---

## 📚 More Help

- **Troubleshooting Guide:** docs\WINDOWS_TROUBLESHOOTING.md
- **Quick Start Guide:** docs\WINDOWS_QUICK_START.md
- **Beginner's Guide:** docs\BEGINNER_GUIDE.md
- **Open an Issue:** https://github.com/cboyd0319/JobSentinel/issues

---

**Last Updated:** October 14, 2025  
**Version:** 0.6.0+  
**Tested On:** Windows 11 (build 22000+)
