# Windows 11 Troubleshooting Guide

**Version:** 0.6.0+  
**Last Updated:** October 14, 2025  
**Platform:** Windows 11 (build 22000+)

---

## Quick Reference

### Common Issues & Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| Admin Rights | "Access denied" errors | Run PowerShell as Administrator |
| Execution Policy | Script won't run | `Set-ExecutionPolicy RemoteSigned` |
| Long Paths | Path too long errors | Enable long paths (see below) |
| PostgreSQL Won't Start | Service not running | Check firewall, manually start service |
| Python Not Found | "python: command not found" | Add Python to PATH, restart terminal |
| Chocolatey Issues | Package install fails | Verify Chocolatey installation |

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

### Issue: PostgreSQL Installation Fails

**Symptoms:**
- "Package not found" error
- Installation timeout
- Service won't start

**Solutions:**

1. **Verify Chocolatey Installation**
   ```powershell
   choco --version
   ```
   - If not installed, see Chocolatey setup below

2. **Manual PostgreSQL Installation**
   ```powershell
   # Option 1: Download official installer
   # Visit: https://www.postgresql.org/download/windows/
   
   # Option 2: Use winget
   winget install PostgreSQL.PostgreSQL
   
   # Option 3: Use Chocolatey manually
   choco install postgresql17 -y
   ```

3. **Check Service Status**
   ```powershell
   Get-Service | Where-Object {$_.Name -like "*postgres*"}
   ```

4. **Start Service Manually**
   ```powershell
   net start postgresql-x64-17
   # OR
   Start-Service postgresql-x64-17
   ```

5. **Check Firewall**
   ```powershell
   # Allow PostgreSQL through firewall
   New-NetFirewallRule -DisplayName "PostgreSQL" -Direction Inbound `
     -LocalPort 5432 -Protocol TCP -Action Allow
   ```

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

## Chocolatey Issues

### Issue: Chocolatey Not Installed

**Symptoms:**
- "choco: command not found"
- Automated PostgreSQL install fails

**Solutions:**

1. **Install Chocolatey**
   ```powershell
   # Run as Administrator
   Set-ExecutionPolicy Bypass -Scope Process -Force
   [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
   iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

2. **Verify Installation**
   ```powershell
   choco --version
   refreshenv  # Refresh environment variables
   ```

3. **Troubleshoot Chocolatey**
   ```powershell
   # Check Chocolatey configuration
   choco config list
   
   # Test with simple package
   choco install nano -y
   ```

### Issue: Chocolatey Package Installation Fails

**Symptoms:**
- Timeout errors
- Download fails
- Package conflicts

**Solutions:**

1. **Clear Chocolatey Cache**
   ```powershell
   choco cache remove
   ```

2. **Update Chocolatey**
   ```powershell
   choco upgrade chocolatey
   ```

3. **Check for Package Conflicts**
   ```powershell
   choco list --local-only
   ```

4. **Verbose Mode for Debugging**
   ```powershell
   choco install postgresql17 -y -v
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

### Issue: PostgreSQL Service Won't Start

**Symptoms:**
- "Service failed to start"
- Database connection refused
- Port 5432 not listening

**Solutions:**

1. **Check Service Status**
   ```powershell
   Get-Service | Where-Object {$_.Name -like "*postgres*"}
   ```

2. **View Service Logs**
   ```powershell
   # Check Event Viewer
   Get-EventLog -LogName Application -Source "PostgreSQL" -Newest 50
   ```

3. **Start Service Manually**
   ```powershell
   # Try different service names
   net start postgresql-x64-17
   # OR
   net start postgresql
   # OR
   Start-Service -Name "postgresql*"
   ```

4. **Check Port Availability**
   ```powershell
   # Check if port 5432 is in use
   netstat -ano | findstr :5432
   ```

5. **Verify PostgreSQL Installation**
   ```powershell
   # Find PostgreSQL directory
   Get-ChildItem -Path "C:\Program Files\PostgreSQL" -ErrorAction SilentlyContinue
   
   # Check if postgres.exe exists
   Test-Path "C:\Program Files\PostgreSQL\17\bin\postgres.exe"
   ```

6. **Reinstall PostgreSQL**
   ```powershell
   # Uninstall
   choco uninstall postgresql17 -y
   
   # Clean remaining files
   Remove-Item -Path "C:\Program Files\PostgreSQL" -Recurse -Force -ErrorAction SilentlyContinue
   
   # Reinstall
   choco install postgresql17 -y
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

## Database Connection Issues

### Issue: Cannot Connect to PostgreSQL

**Symptoms:**
- "could not connect to server"
- "Connection refused"
- Authentication errors

**Solutions:**

1. **Verify Service is Running**
   ```powershell
   Get-Service | Where-Object {$_.Name -like "*postgres*"} | Select-Object Status
   ```

2. **Check Connection String**
   ```powershell
   # View .env file
   Get-Content .env | Where-Object {$_ -like "*DATABASE_URL*"}
   ```

3. **Test Connection with psql**
   ```powershell
   # Add PostgreSQL bin to PATH temporarily
   $env:Path += ";C:\Program Files\PostgreSQL\17\bin"
   
   # Test connection
   psql -U jobsentinel -d jobsentinel -h localhost
   ```

4. **Check pg_hba.conf**
   ```powershell
   # Location: C:\Program Files\PostgreSQL\17\data\pg_hba.conf
   # Ensure these lines exist:
   # host    all             all             127.0.0.1/32            md5
   # host    all             all             ::1/128                 md5
   ```

5. **Reset PostgreSQL Password**
   ```powershell
   # Login as postgres superuser
   psql -U postgres
   
   # In psql prompt:
   ALTER USER jobsentinel WITH PASSWORD 'your_new_password';
   \q
   
   # Update .env file with new password
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
- [ ] At least 2 GB free disk space
- [ ] Stable internet connection
- [ ] Running PowerShell as Administrator (when needed)
- [ ] Execution policy allows scripts
- [ ] No conflicting Python installations
- [ ] Antivirus allows downloads
- [ ] Firewall won't block PostgreSQL

### After Installation Checklist

- [ ] Python `--version` shows 3.11 or 3.12
- [ ] Virtual environment activates successfully
- [ ] `python -m jsa.cli health` passes all checks
- [ ] PostgreSQL service is running
- [ ] Database connection works
- [ ] Task Scheduler task is created
- [ ] Web UI loads (http://localhost:5000)

---

**Note:** This is a living document. If you encounter issues not covered here, please report them so we can improve this guide.
