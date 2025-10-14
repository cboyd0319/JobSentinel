# Windows 11 Troubleshooting Guide

**Version:** 0.6.0+  
**Last Updated:** October 14, 2025  
**Platform:** Windows 11 (build 22000+)

**Database:** SQLite (built-in, zero setup required)  
**Admin Rights:** NOT required ✅  
**Prerequisites:** Python 3.12+ only

---

## Important Notes

- **SQLite is the default database** - No database server installation needed!
- **Zero admin rights required** - Everything runs as regular user
- **100% local** - All data stays on your computer
- **PostgreSQL is optional** - Only for advanced enterprise scenarios

---

## Quick Reference

### Common Issues & Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| Execution Policy | Script won't run | `Set-ExecutionPolicy RemoteSigned` |
| Long Paths | Path too long errors | Enable long paths (see below) |
| Python Not Found | "python: command not found" | Add Python to PATH, restart terminal |
| Database Errors | SQLite errors | Delete data/jobs.sqlite and restart |
| Port In Use | Web UI won't start | Use different port: `--port 5001` |
| Module Not Found | Import errors | Reinstall: `pip install -e .` |

---

## Installation Issues

### Issue: Python Installation Fails

**Symptoms:**
- Download fails
- Installer won't run
- "Access denied" during installation

**Solutions:**

1. **Check Network Connection**
   ```powershell
   Test-NetConnection -ComputerName www.python.org -Port 443
   ```

2. **Run as Administrator**
   - Right-click PowerShell → "Run as Administrator"
   - Re-run the installer

3. **Manual Installation**
   - Download Python 3.12.7 from https://www.python.org/downloads/
   - Run installer with "Add Python to PATH" checked
   - Verify: `python --version`

4. **Check Disk Space**
   ```powershell
   Get-PSDrive C
   ```
   - Requires at least 500 MB free space

### Issue: Database Not Created

**Symptoms:**
- "Database file not found" error
- Can't save job data

**Solutions:**

1. **Let System Create Database Automatically**
   - SQLite database is created automatically on first run
   - No manual setup needed!
   - Default location: `data/jobs.sqlite`

2. **Verify Data Directory Exists**
   ```powershell
   # Check if data directory exists
   Test-Path .\data
   
   # Create if missing
   New-Item -ItemType Directory -Path .\data -Force
   ```

3. **Check Database Permissions**
   ```powershell
   # Ensure you can write to data directory
   New-Item -ItemType File -Path .\data\test.txt -Force
   Remove-Item .\data\test.txt
   ```

4. **Reset Database (if corrupted)**
   ```powershell
   # Backup first (optional)
   Copy-Item .\data\jobs.sqlite .\data\jobs.sqlite.backup
   
   # Delete and let system recreate
   Remove-Item .\data\jobs.sqlite
   
   # Run health check to recreate
   python -m jsa.cli health
   ```

---

## Advanced: Using PostgreSQL (Optional)

**Note:** PostgreSQL is NOT required. SQLite (default) works perfectly for most users with ZERO setup.

If you need PostgreSQL for enterprise deployments or specific requirements:

1. **Install PostgreSQL**
   ```powershell
   # Using winget (recommended)
   winget install PostgreSQL.PostgreSQL
   
   # Or download from: https://www.postgresql.org/download/windows/
   ```

2. **Configure Database URL**
   - Edit `.env` file
   - Change `DATABASE_URL` from SQLite to PostgreSQL format:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/jobsentinel
   ```

3. **Create Database**
   ```powershell
   # Using psql
   createdb jobsentinel
   ```

For PostgreSQL troubleshooting, see PostgreSQL documentation.

---

## Permission Issues

### Issue: "Access Denied" or "Permission Denied"

**Symptoms:**
- Cannot create files/folders
- Cannot install packages
- Cannot modify system settings

**Solutions:**

1. **Run as Administrator**
   ```powershell
   # Right-click PowerShell → "Run as Administrator"
   ```

2. **Check User Account Control (UAC)**
   - Control Panel → User Accounts → Change User Account Control settings
   - Set to "Notify me only when apps try to make changes"

3. **Verify User Is in Administrators Group**
   ```powershell
   net localgroup Administrators
   ```

### Issue: Execution Policy Prevents Script Execution

**Symptoms:**
- "cannot be loaded because running scripts is disabled"
- PowerShell script errors

**Solutions:**

1. **Check Current Policy**
   ```powershell
   Get-ExecutionPolicy
   ```

2. **Set Policy for Current User**
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Temporary Bypass (Not Recommended)**
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process
   ```

---

## Path Issues

### Issue: "Path Too Long" or Path-Related Errors

**Symptoms:**
- Error: "The specified path is too long"
- Cannot create deep directory structures
- File operations fail

**Solutions:**

1. **Enable Long Paths (Recommended)**
   ```powershell
   # Run as Administrator
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
     -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   
   # Restart computer for changes to take effect
   ```

2. **Verify Long Paths Enabled**
   ```powershell
   Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
     -Name "LongPathsEnabled"
   ```

3. **Use Shorter Installation Path**
   ```powershell
   # Install to C:\JobSentinel instead of deep path
   cd C:\
   git clone https://github.com/cboyd0319/JobSentinel
   cd JobSentinel
   ```

### Issue: Python Not in PATH

**Symptoms:**
- "python: command not found"
- `python --version` fails

**Solutions:**

1. **Verify Python Installation**
   ```powershell
   Get-Command python -ErrorAction SilentlyContinue
   ```

2. **Add Python to PATH Manually**
   ```powershell
   # Find Python installation
   Get-ChildItem -Path "C:\Users\$env:USERNAME\AppData\Local\Programs\Python" -Recurse -Filter "python.exe"
   
   # Add to PATH (replace with your Python path)
   $pythonPath = "C:\Users\$env:USERNAME\AppData\Local\Programs\Python\Python312"
   [Environment]::SetEnvironmentVariable("Path", "$env:Path;$pythonPath;$pythonPath\Scripts", "User")
   ```

3. **Restart Terminal**
   - Close and reopen PowerShell
   - Verify: `python --version`

---

## Package Manager Issues (Optional)

**Note:** Chocolatey is NOT required for JobSentinel. Python's pip handles all dependencies.

If you choose to use Chocolatey for other software:

### Installing Chocolatey (Optional)

```powershell
# Run as Administrator
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### Verify Installation

```powershell
choco --version
refreshenv  # Refresh environment variables
```

---

## Network Issues

### Issue: Downloads Fail or Timeout

**Symptoms:**
- "Connection timeout"
- "Unable to reach server"
- Slow downloads

**Solutions:**

1. **Test Network Connectivity**
   ```powershell
   Test-NetConnection -ComputerName python.org -Port 443
   Test-NetConnection -ComputerName community.chocolatey.org -Port 443
   ```

2. **Check Proxy Settings**
   ```powershell
   # View proxy settings
   netsh winhttp show proxy
   
   # Set proxy if needed
   netsh winhttp set proxy proxy-server="http://proxy.example.com:8080"
   ```

3. **Disable Antivirus Temporarily**
   - Some antivirus software blocks downloads
   - Temporarily disable and retry
   - Re-enable after installation

4. **Use Alternative Download Method**
   ```powershell
   # Download Python manually
   Invoke-WebRequest -Uri "https://www.python.org/ftp/python/3.12.7/python-3.12.7-amd64.exe" `
     -OutFile "python-installer.exe"
   ```

---

## Service Issues

### Issue: Web UI Won't Start

**Symptoms:**
- "Port already in use" error
- "Address already in use"
- Can't access http://localhost:5000

**Solutions:**

1. **Use Different Port**
   ```powershell
   python -m jsa.cli web --port 5001
   ```
   Then visit: http://localhost:5001

2. **Check What's Using Port 5000**
   ```powershell
   netstat -ano | findstr :5000
   ```

3. **Kill Process Using Port**
   ```powershell
   # Find process ID from netstat output
   Stop-Process -Id <PID> -Force
   ```

4. **Restart Computer**
   - Sometimes port remains locked
   - Clean restart resolves it

### Issue: API Server Won't Start

**Symptoms:**
- "Port 8000 already in use"
- Can't access http://localhost:8000

**Solutions:**

1. **Use Different Port**
   ```powershell
   python -m jsa.cli api --port 8001
   ```
   Then visit: http://localhost:8001/api/docs

2. **Check Port Availability**
   ```powershell
   netstat -ano | findstr :8000
   ```

---

## Task Scheduler Issues

### Issue: Automated Jobs Don't Run

**Symptoms:**
- Task Scheduler task exists but doesn't execute
- No job search results
- Task history shows failures

**Solutions:**

1. **View Task Details**
   ```powershell
   Get-ScheduledTask -TaskName "JobSentinel"
   Get-ScheduledTaskInfo -TaskName "JobSentinel"
   ```

2. **Check Task History**
   ```powershell
   Get-WinEvent -LogName "Microsoft-Windows-TaskScheduler/Operational" | 
     Where-Object {$_.Message -like "*JobSentinel*"} | 
     Select-Object -First 10
   ```

3. **Run Task Manually**
   ```powershell
   Start-ScheduledTask -TaskName "JobSentinel"
   ```

4. **Verify Task Configuration**
   - Open Task Scheduler (taskschd.msc)
   - Navigate to: Task Scheduler Library → JobSentinel
   - Check:
     - Trigger schedule is correct
     - Action command is correct
     - "Run with highest privileges" if needed

5. **Re-create Task**
   ```powershell
   # Remove existing task
   Unregister-ScheduledTask -TaskName "JobSentinel" -Confirm:$false
   
   # Re-run setup wizard to recreate task
   python -m jsa.cli setup
   ```

---

## Virtual Environment Issues

### Issue: Cannot Activate Virtual Environment

**Symptoms:**
- "Activate.ps1 is not recognized"
- Permission denied
- Execution policy error

**Solutions:**

1. **Use Correct Activation Command**
   ```powershell
   # PowerShell
   .\.venv\Scripts\Activate.ps1
   
   # CMD
   .venv\Scripts\activate.bat
   ```

2. **Check Execution Policy**
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Verify Virtual Environment Exists**
   ```powershell
   Test-Path .\.venv\Scripts\python.exe
   ```

4. **Recreate Virtual Environment**
   ```powershell
   # Remove old environment
   Remove-Item -Path .venv -Recurse -Force
   
   # Create new environment
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   
   # Install dependencies
   pip install -e .[dev,resume]
   ```

---

## Database Issues

### Issue: SQLite Database Errors

**Symptoms:**
- "database is locked"
- "unable to open database file"
- Corrupted database errors

**Solutions:**

1. **Check Database File Permissions**
   ```powershell
   # Check if file exists and is writable
   Get-ChildItem .\data\jobs.sqlite
   ```

2. **Close Other Connections**
   - Make sure only one instance of JobSentinel is running
   - Close any database viewers (DB Browser for SQLite, etc.)

3. **Backup and Reset Database**
   ```powershell
   # Backup existing database
   Copy-Item .\data\jobs.sqlite .\data\jobs.sqlite.backup
   
   # Delete corrupted database
   Remove-Item .\data\jobs.sqlite
   
   # Database will be recreated on next run
   python -m jsa.cli health
   ```

4. **Restore from Backup** (if you had one)
   ```powershell
   # Copy backup back
   Copy-Item .\data\jobs.sqlite.backup .\data\jobs.sqlite
   ```

### Issue: Database Connection Errors

**Symptoms:**
- "could not connect to database"
- "database does not exist"

**Solutions:**

1. **Verify .env Configuration**
   ```powershell
   # Check database URL in .env
   Get-Content .env | Select-String "DATABASE_URL"
   ```

2. **Default SQLite Configuration**
   - Should be: `DATABASE_URL=sqlite+aiosqlite:///data/jobs.sqlite`
   - This creates a file-based database (no server needed)

3. **Create Data Directory**
   ```powershell
   New-Item -ItemType Directory -Path .\data -Force
   ```

4. **Test Database Creation**
   ```powershell
   # Run health check to initialize database
   python -m jsa.cli health
   
   # Verify database file was created
   Test-Path .\data\jobs.sqlite
   ```

---

## Performance Issues

### Issue: Installation is Slow

**Symptoms:**
- Downloads take very long
- Dependency installation times out
- System feels sluggish

**Solutions:**

1. **Close Resource-Intensive Applications**
   ```powershell
   # Check CPU and memory usage
   Get-Process | Sort-Object CPU -Descending | Select-Object -First 10
   ```

2. **Increase Timeout Values**
   ```powershell
   # Set environment variables
   $env:INSTALL_TIMEOUT_DOWNLOAD = 600  # 10 minutes
   $env:INSTALL_TIMEOUT_CMD = 30        # 30 seconds
   ```

3. **Use Wired Connection**
   - WiFi can be slow/unstable
   - Use Ethernet cable if possible

4. **Disable Windows Defender During Installation**
   ```powershell
   # Temporarily disable real-time protection
   Set-MpPreference -DisableRealtimeMonitoring $true
   
   # Re-enable after installation
   Set-MpPreference -DisableRealtimeMonitoring $false
   ```

---

## Getting Help

### Diagnostic Information to Collect

When asking for help, provide this information:

```powershell
# System information
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"System Type"

# Python version
python --version

# PowerShell version
$PSVersionTable.PSVersion

# Chocolatey version (if installed)
choco --version

# PostgreSQL version (if installed)
postgres --version

# Network connectivity
Test-NetConnection -ComputerName python.org -Port 443
Test-NetConnection -ComputerName github.com -Port 443

# Execution policy
Get-ExecutionPolicy

# Admin rights
([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# Long paths enabled
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -ErrorAction SilentlyContinue
```

### Support Resources

- **Documentation:** [docs/DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)
- **Issues:** https://github.com/cboyd0319/JobSentinel/issues
- **Cross-Platform Guide:** [docs/CROSS_PLATFORM_GUIDE.md](CROSS_PLATFORM_GUIDE.md)
- **Beginner Guide:** [docs/BEGINNER_GUIDE.md](BEGINNER_GUIDE.md)

---

## Preventive Measures

### Before Installation Checklist

- [ ] Running Windows 11 (build 22000+)
- [ ] At least 1 GB free disk space
- [ ] Stable internet connection
- [ ] Python 3.12+ downloaded from python.org
- [ ] "Add Python to PATH" checked during Python installation
- [ ] Execution policy allows scripts (Set-ExecutionPolicy RemoteSigned)
- [ ] Antivirus allows downloads (if issues occur)

### After Installation Checklist

- [ ] Python `--version` shows 3.12 or newer
- [ ] Virtual environment activates successfully (if using venv)
- [ ] `python -m jsa.cli health` passes all checks
- [ ] SQLite database created (data/jobs.sqlite)
- [ ] Configuration file exists (config/user_prefs.json)
- [ ] Web UI loads (http://localhost:5000)
- [ ] API server loads (http://localhost:8000/api/docs)
- [ ] Test run completes: `python -m jsa.cli run-once --dry-run`

---

**Note:** This is a living document. If you encounter issues not covered here, please report them so we can improve this guide.
