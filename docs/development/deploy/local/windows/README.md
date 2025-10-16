# Windows Local Deployment

Scripts for deploying JobSentinel on Windows machines locally.

## Prerequisites

- Windows 10/11
- PowerShell 5.1 or later
- Python 3.11 or 3.12
- 1GB free disk space

## Quick Start

### Option 1: PowerShell Setup (Recommended)

```powershell
# Run from this directory
.\setup.ps1
```

This will:
1. Check Python installation
2. Create virtual environment
3. Install dependencies
4. Set up configuration
5. Run initial health check

### Option 2: Batch File Setup

```cmd
setup.bat
```

Simpler batch script that calls the PowerShell setup.

## Launch GUI

After setup, launch the GUI:

```powershell
# PowerShell
.\launch-gui.ps1

# Or CMD
launch-gui.bat
```

## Bootstrap (First-Time Setup)

For a completely fresh installation:

```powershell
.\bootstrap.ps1
```

This performs additional first-time setup like:
- Installing system dependencies
- Configuring Windows-specific settings
- Setting up scheduled tasks (optional)

## Run CLI

To run JobSentinel from command line:

```powershell
.\run.ps1
```

## Configuration

Edit configuration at: `../../common/config/user_prefs.json`

Example:
```json
{
  "keywords": ["python", "backend", "api"],
  "locations": ["Remote", "New York"],
  "min_salary": 100000
}
```

## Scheduled Execution

To run JobSentinel automatically on a schedule:

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (e.g., Daily at 9 AM)
4. Action: Start Program
5. Program: `powershell.exe`
6. Arguments: `-File "C:\path\to\deploy\local\windows\run.ps1"`

## Troubleshooting

### "Execution Policy" Error
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### "Python not found"
Install Python from: https://www.python.org/downloads/

Make sure to check "Add Python to PATH" during installation.

### "Module not found"
```powershell
cd ../../
pip install -e .
```

### GUI Won't Launch
Check that `launcher_gui.py` exists in `../../deploy/common/`

## Scripts in This Directory

| Script | Purpose |
|--------|---------|
| `setup.ps1` | Main setup script (recommended) |
| `setup.bat` | Batch wrapper for setup.ps1 |
| `bootstrap.ps1` | First-time system configuration |
| `launch-gui.ps1` | Launch GUI (PowerShell) |
| `launch-gui.bat` | Launch GUI (Batch) |
| `run.ps1` | Run JobSentinel CLI |

## Support

- [Windows Quick Start Guide](../../../docs/WINDOWS_QUICK_START.md)
- [Windows Troubleshooting](../../../docs/WINDOWS_TROUBLESHOOTING.md)
- [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues)

---

**Platform:** Windows 10/11  
**Last Updated:** October 14, 2025
