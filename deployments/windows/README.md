# Windows Deployment

Windows-specific deployment files and configurations.

## Local Development (`local/`)

Scripts for setting up and running JobSentinel on Windows:

### Setup Scripts
- **`setup-windows.bat`** - Simple batch launcher for the setup wizard
- **`setup-windows.ps1`** - PowerShell setup script with full system checks
- **`bootstrap.ps1`** - Windows bootstrap script for initial environment setup

### GUI Launchers
- **`launch-gui.bat`** - Batch file launcher (easiest for non-technical users)
- **`launch-gui.ps1`** - PowerShell launcher with advanced options
- **`run.ps1`** - Windows run script

### Usage

**First-time setup:**
```cmd
cd /path/to/JobSentinel
deployments\windows\local\setup-windows.bat
```

**Launch GUI:**
```cmd
deployments\windows\local\launch-gui.bat
```

### Requirements
- Windows 11 (build 22000+)
- Python 3.12+
- No admin rights needed

## Cloud Deployment (`cloud/`)

Windows-specific cloud deployment configurations (if needed in the future).

## Documentation

For detailed Windows deployment guides, see:
- `/docs/WINDOWS_QUICK_START.md`
- `/docs/WINDOWS_TROUBLESHOOTING.md`
- `/docs/WINDOWS_DEPLOYMENT_ANALYSIS.md` (archived)
