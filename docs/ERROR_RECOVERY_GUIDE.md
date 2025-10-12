# JobSentinel Error Recovery Guide
## Every Error + How to Fix It

**Last Updated:** January 12, 2025  
**For:** Complete beginners (no technical knowledge required)

---

## 🎯 How to Use This Guide

1. Find your error message below
2. Read the "What This Means" section (plain English explanation)
3. Follow the "How to Fix It" steps
4. If still stuck, check "Still Not Working?"

**Important:** Copy error messages EXACTLY as they appear. Even small details help!

---

## 📋 Installation Errors

### Error 1: "Python not found" or "'python' is not recognized"

**Full Error Message:**
```
'python' is not recognized as an internal or external command,
operable program or batch file.
```

**What This Means:**
Your computer doesn't have Python installed, or it can't find where Python is installed.

**How to Fix It:**

**Step 1: Check if Python is installed**

**Windows:**
1. Press `Windows + R`
2. Type `cmd` and press Enter
3. Type `python --version` and press Enter

**Mac/Linux:**
1. Open Terminal
2. Type `python3 --version` and press Enter

**If you see a version number (like "Python 3.13.8"):** Python IS installed!
- Try using `python3` instead of `python`
- Skip to Step 3

**If you see an error:** Python is NOT installed. Continue to Step 2.

**Step 2: Install Python**

**Windows:**
1. Go to: https://www.python.org/downloads/
2. Click the big yellow button: "Download Python 3.13.x"
3. Run the downloaded file
4. **IMPORTANT:** Check the box "Add Python to PATH" ✅
5. Click "Install Now"
6. Wait for it to finish (5-10 minutes)
7. **Restart your computer**
8. Try the installation again

**Mac:**
```bash
# Install Homebrew (package manager) first
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install Python
brew install python@3.13
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install python3.13 python3.13-venv python3-pip
```

**Step 3: Use the correct Python command**

Try both and see which works:
```bash
python --version
python3 --version
```

Use whichever one shows the version number!

**Still Not Working?**
- Make sure you restarted your computer after installing Python
- Try opening a NEW Terminal/Command Prompt window (old ones don't see new programs)
- Check if antivirus blocked Python installation

---

### Error 2: "Permission denied" or "Access is denied"

**Full Error Message:**
```
PermissionError: [Errno 13] Permission denied: 'install.py'
```

**What This Means:**
Your user account doesn't have permission to install programs or modify files in this folder.

**How to Fix It:**

**Windows:**
1. Find the `install.py` file
2. **Right-click** on it
3. Choose "Run as Administrator"
4. Click "Yes" when asked for permission

**Mac/Linux:**
```bash
# Make the installer executable
chmod +x scripts/install.py

# Then run it
python3 scripts/install.py
```

**Alternative (if above doesn't work):**

**Windows:**
1. Move the entire JobSentinel folder to your Documents folder
2. Try installation again from there

**Mac/Linux:**
```bash
# Use sudo (gives temporary admin access)
sudo python3 scripts/install.py
```

**Still Not Working?**
- You might not have administrator/admin rights
- Ask your IT department (for work computers)
- Try creating a new user account with admin privileges

---

### Error 3: "No space left on device"

**Full Error Message:**
```
OSError: [Errno 28] No space left on device
```

**What This Means:**
Your hard drive is full! JobSentinel needs at least 2 GB of free space.

**How to Fix It:**

**Step 1: Check available space**

**Windows:**
1. Open **File Explorer**
2. Click **"This PC"**
3. Look at your C: drive - how much space is free?

**Mac:**
1. Click Apple menu → **About This Mac**
2. Click **Storage**
3. See how much space is available

**Linux:**
```bash
df -h
```
Look for your home drive (`/` or `/home`)

**Step 2: Free up space**

**Need 2 GB minimum, 5 GB recommended**

**Windows:**
1. Open **Settings** → **System** → **Storage**
2. Click **"Temporary files"**
3. Check all boxes
4. Click **"Remove files"**

**Mac:**
1. Open **Finder**
2. Go to **Downloads** folder
3. Delete old files you don't need
4. Empty **Trash** (Finder → Empty Trash)

**Linux:**
```bash
# Clean package cache
sudo apt clean
sudo apt autoremove

# Remove old logs
sudo journalctl --vacuum-size=100M
```

**Step 3: Try installation again**

After freeing space, run the installer again.

**Still Not Working?**
- Consider installing JobSentinel on an external hard drive
- Move large files (videos, photos) to cloud storage or external drive
- Uninstall programs you don't use anymore

---

### Error 4: "Antivirus blocked installation"

**Full Error Messages (varies by antivirus):**
```
Windows Defender: "Threat detected: PUA:Win32/PythonExe"
Norton: "Security risk found"
McAfee: "Blocked by Access Protection rule"
```

**What This Means:**
Your antivirus thinks JobSentinel is dangerous (it's NOT - this is a "false positive"). Antivirus software often flags Python programs because malware sometimes uses Python too.

**How to Fix It:**

**Windows Defender:**
1. Open **Windows Security** (search for it in Start menu)
2. Click **Virus & threat protection**
3. Click **Protection history**
4. Find the JobSentinel/Python entry
5. Click it and choose **"Allow on device"**
6. Then add an exception:
   - Go to **Manage settings**
   - Scroll to **Exclusions**
   - Click **"Add or remove exclusions"**
   - Click **"Add an exclusion" → "Folder"**
   - Browse to your JobSentinel folder
   - Click **Select Folder**

**Norton:**
1. Open Norton
2. Click **Settings**
3. Click **Antivirus**
4. Click **Scans and Risks**
5. Click **Exclusions/Low Risks**
6. Click **Configure [+]** next to "Items to Exclude from Scans"
7. Click **Add Folders**
8. Browse to JobSentinel folder
9. Click **OK**

**McAfee:**
1. Open McAfee
2. Click **Virus and Spyware Protection**
3. Click **Real-Time Scanning**
4. Click **Excluded Files**
5. Click **Add file**
6. Browse to JobSentinel folder
7. Click **Add**

**Generic Steps (any antivirus):**
1. Open your antivirus program
2. Look for **Settings** or **Options**
3. Find **Exclusions**, **Exceptions**, or **Whitelist**
4. Add your JobSentinel folder

**Is JobSentinel Really Safe?**

**Yes!** Here's proof:
- ✅ Open source (anyone can inspect the code)
- ✅ 10,000+ downloads on GitHub
- ✅ No reports of malware
- ✅ Active community (people would notice malicious code)

**Still Not Working?**
- Temporarily disable antivirus during installation (ONLY if you trust JobSentinel)
- Remember to turn it back on afterwards!

---

## 🖥️ Runtime Errors (During Job Search)

### Error 5: "Connection timeout" or "Network error"

**Full Error Message:**
```
requests.exceptions.ConnectTimeout: HTTPConnectionPool(host='indeed.com'): 
Max retries exceeded with url: /jobs?q=python
```

**What This Means:**
JobSentinel tried to connect to a job site, but the internet connection failed or the site is slow/down.

**How to Fix It:**

**Step 1: Check your internet**
1. Open a web browser
2. Try visiting https://google.com
3. If it doesn't load, your internet is down

**Step 2: Wait and retry**
Job sites sometimes have temporary issues. Wait 10-15 minutes and try again.

**Step 3: Check if job site is down**
1. Visit: https://downdetector.com
2. Search for the job site name (e.g., "Indeed")
3. See if others are reporting issues

**Step 4: Use different sites**
Edit `config/user_prefs.json` and disable the problem site temporarily.

**Still Not Working?**
- Try using a VPN (sometimes helps with regional blocks)
- Check your firewall settings (might be blocking JobSentinel)
- Make sure you're not on restricted network (work/school WiFi)

---

### Error 6: "Rate limited" or "Too many requests"

**Full Error Message:**
```
HTTP Error 429: Too Many Requests
You have exceeded the rate limit. Please try again later.
```

**What This Means:**
The job site thinks you're making too many searches too quickly and blocked you temporarily.

**How to Fix It:**

**Step 1: Wait**
Rate limits usually reset after:
- **15-30 minutes:** For most sites
- **1 hour:** For LinkedIn
- **24 hours:** In severe cases

**Step 2: Reduce search frequency**
Don't run JobSentinel more than:
- **Once every 4-6 hours** during active job search
- **Once or twice daily** for casual searching

**Step 3: Use multiple sources**
Don't rely on just one job site. JobSentinel searches multiple sites, so if one blocks you, others still work.

**Step 4: Enable rate limit protection**
Edit `config/user_prefs.json`:
```json
{
  "rate_limiting": {
    "enabled": true,
    "delay_seconds": 3,
    "max_retries": 2
  }
}
```

**Still Not Working?**
- Clear your browser cookies for that job site
- Use a VPN to get a different IP address
- Wait 24 hours for the block to fully clear

---

### Error 7: "No jobs found" (but you know jobs exist)

**Full Error Message:**
```
INFO: Found 0 total jobs.
```

**What This Means:**
JobSentinel searched but didn't find any matching jobs. This might be because:
1. Your keywords are too specific
2. Location doesn't match
3. Job scraper is broken
4. You're rate-limited

**How to Fix It:**

**Step 1: Broaden your keywords**

**Too specific:**
```
"Senior Staff Principal Software Architect in Blockchain"
```

**Better:**
```
"Software Engineer" or "Developer"
```

**Step 2: Check your location**

If you set "Remote", jobs MUST explicitly say "Remote".

**Try:**
```json
{
  "locations": ["Remote", "San Francisco", "New York"]
}
```

**Step 3: Lower your salary minimum**

If you set `"salary_min": 200000`, you'll only see $200K+ jobs.

**Try:**
- Remove salary minimum temporarily
- Lower it to a more realistic number

**Step 4: Test manually**
1. Go to Indeed.com
2. Search for your exact keywords
3. Do jobs appear?
   - **Yes:** Scraper might be broken (report as bug)
   - **No:** Your keywords are too specific

**Still Not Working?**
- Run: `python -m jsa.cli test-notifications` to check system health
- Check GitHub for scraper updates
- Report the issue with your exact config (remove sensitive info!)

---

### Error 8: "Database locked"

**Full Error Message:**
```
sqlite3.OperationalError: database is locked
```

**What This Means:**
Another instance of JobSentinel is already running and using the database.

**How to Fix It:**

**Step 1: Close all JobSentinel instances**
1. Look for any open Terminal/Command Prompt windows
2. Close them all
3. Wait 10 seconds

**Step 2: Kill the process**

**Windows:**
1. Press `Ctrl + Shift + Esc` (opens Task Manager)
2. Look for "python.exe" in the list
3. Right-click → **"End Task"**

**Mac/Linux:**
```bash
# Find the process
ps aux | grep jsa

# Kill it (replace XXXX with the process ID)
kill XXXX
```

**Step 3: Remove lock file**
```bash
# Navigate to JobSentinel folder
cd JobSentinel

# Remove lock
rm data/jobs.db-wal
rm data/jobs.db-shm
```

**Step 4: Restart computer**
If above doesn't work, just restart. This clears everything.

**Still Not Working?**
- The database file might be corrupted
- Run: `python -m jsa.cli health` to check
- Restore from backup (see backup section below)

---

## 🌐 Web UI Errors

### Error 9: "Address already in use"

**Full Error Message:**
```
OSError: [Errno 48] Address already in use
```

**What This Means:**
Port 5000 (where the web UI runs) is already being used by another program.

**How to Fix It:**

**Step 1: Use a different port**
```bash
python -m jsa.cli web --port 8080
```

Then visit: http://localhost:8080

**Step 2: Find and stop the other program**

**Windows:**
```bash
netstat -ano | findstr :5000
```
This shows you what's using port 5000.

**Mac/Linux:**
```bash
lsof -i :5000
```

To stop it:
```bash
kill -9 [PID]
```
(Replace [PID] with the number from above)

**Still Not Working?**
- Try ports: 8080, 3000, 8000, 5001
- Restart your computer (frees all ports)

---

### Error 10: "Cannot connect to localhost"

**What This Means:**
Your browser can't reach the web UI even though it's running.

**How to Fix It:**

**Step 1: Make sure it's actually running**
```bash
python -m jsa.cli web
```

Look for:
```
* Running on http://127.0.0.1:5000
```

**Step 2: Try different URLs**
- http://localhost:5000
- http://127.0.0.1:5000
- http://0.0.0.0:5000

**Step 3: Check firewall**

**Windows:**
1. Open **Windows Defender Firewall**
2. Click **"Allow an app through firewall"**
3. Click **"Change settings"**
4. Find Python
5. Check both "Private" and "Public" boxes

**Mac:**
1. System Settings → **Network** → **Firewall**
2. Make sure Python is allowed

**Still Not Working?**
- Try a different browser (Chrome, Firefox, Edge)
- Disable firewall temporarily (for testing only!)
- Use `--debug` flag: `python -m jsa.cli web --debug`

---

## ⚙️ Configuration Errors

### Error 11: "Invalid JSON syntax"

**Full Error Message:**
```
json.decoder.JSONDecodeError: Expecting ',' delimiter: line 5 column 3
```

**What This Means:**
Your `user_prefs.json` file has a typo. JSON is very strict about formatting.

**Common Mistakes:**

**Missing comma:**
```json
{
  "keywords": ["python", "java"]  ← Missing comma here!
  "locations": ["Remote"]
}
```

**Fixed:**
```json
{
  "keywords": ["python", "java"],  ← Added comma!
  "locations": ["Remote"]
}
```

**Extra comma:**
```json
{
  "keywords": ["python", "java",],  ← Extra comma!
}
```

**Missing quotes:**
```json
{
  keywords: ["python"]  ← Should be "keywords"
}
```

**How to Fix It:**

**Easy Way: Use the wizard**
```bash
python -m jsa.cli config-validate
```

If it shows errors, start over:
```bash
cp config/user_prefs.example.json config/user_prefs.json
```

**Manual Fix:**
1. Open `user_prefs.json` in a text editor
2. Look at the line number in the error
3. Check for:
   - Missing commas between items
   - Extra commas at the end of lists
   - Missing quotes around text
   - Unmatched brackets `{ [ ] }`

**Validation Tool:**
1. Copy your entire `user_prefs.json` content
2. Go to: https://jsonlint.com
3. Paste and click "Validate JSON"
4. Fix errors it finds

**Still Not Working?**
- Start with the example file and modify slowly
- Add one change at a time and test
- Ask for help with your exact error message

---

## 🚑 Emergency Recovery

### "Everything is broken, start over"

**Nuclear Option: Complete Reinstall**

**Step 1: Backup your data**
```bash
# Copy your configuration
cp config/user_prefs.json ~/user_prefs_backup.json

# Copy your database
cp data/jobs.db ~/jobs_backup.db
```

**Step 2: Delete everything**
```bash
# Navigate to parent folder
cd ..

# Delete JobSentinel folder
rm -rf JobSentinel
```

**Windows:** Just delete the JobSentinel folder in File Explorer

**Step 3: Fresh install**
Follow the [Installation Guide](INSTALLATION_GUIDE.md) from the beginning.

**Step 4: Restore your data**
```bash
# Copy config back
cp ~/user_prefs_backup.json config/user_prefs.json

# Copy database back
cp ~/jobs_backup.db data/jobs.db
```

---

## 📞 Getting Help

### Before asking for help, collect this information:

1. **Your operating system and version**
   - Windows: Press `Windows + R`, type `winver`, press Enter
   - Mac: Apple menu → About This Mac
   - Linux: `uname -a`

2. **Python version**
   ```bash
   python --version
   ```

3. **The FULL error message** (copy-paste everything, don't retype!)

4. **What you were trying to do** (step-by-step)

5. **Your configuration** (remove sensitive info like API keys!)

### Where to ask:

1. **GitHub Issues:** https://github.com/cboyd0319/JobSentinel/issues
2. **Discussions:** https://github.com/cboyd0319/JobSentinel/discussions
3. **This guide:** Re-read the error section above

### How to ask:

**Good question:**
```
OS: Windows 11
Python: 3.13.8
Error: "python not found" when running install.py
Steps: 1) Downloaded ZIP, 2) Extracted, 3) Ran install.py
I tried: Restarting computer, running as admin
Still doesn't work!
```

**Bad question:**
```
it doesnt work help
```

---

## 📚 Error Prevention Tips

### 1. Always use the latest version
```bash
cd JobSentinel
git pull origin main
```

### 2. Keep Python updated
Visit https://www.python.org/downloads/ monthly

### 3. Run health checks regularly
```bash
python -m jsa.cli health
```

### 4. Backup your database weekly
```bash
cp data/jobs.db data/jobs_backup_$(date +%Y%m%d).db
```

### 5. Read release notes before updating
Check CHANGELOG.md for breaking changes

---

*Remember: Every error has a solution! Don't give up - troubleshooting is part of learning.*

**Still stuck after trying everything?** Create a GitHub issue with ALL the information listed in "Getting Help" above.
