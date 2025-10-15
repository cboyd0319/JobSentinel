<#
.SYNOPSIS
    JobSentinel GUI Launcher (PowerShell Version)

.DESCRIPTION
    Launches the JobSentinel graphical user interface.
    This is the EASIEST way to use JobSentinel on Windows - just double-click!

.NOTES
    Version: 1.0.0
    Target: Windows 10/11
    Python: 3.12+ required
    No admin rights needed!

.EXAMPLE
    .\launch-gui.ps1
    # Launches the GUI application
#>

#Requires -Version 5.1

# Set strict mode for better error handling
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Banner {
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Cyan
    Write-Host "                   JobSentinel GUI Launcher" -ForegroundColor Cyan
    Write-Host "========================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ✓ $Message" -ForegroundColor Green
}

function Write-Error-Message {
    param([string]$Message)
    Write-Host "  ✗ $Message" -ForegroundColor Red
}

function Test-PythonInstalled {
    try {
        $pythonVersion = python --version 2>&1
        if ($pythonVersion -match "Python (\d+)\.(\d+)") {
            $major = [int]$Matches[1]
            $minor = [int]$Matches[2]
            
            if ($major -ge 3 -and $minor -ge 12) {
                Write-Success "Python $major.$minor detected"
                return $true
            }
            else {
                Write-Error-Message "Python $major.$minor is too old (need 3.12+)"
                return $false
            }
        }
        return $false
    }
    catch {
        Write-Error-Message "Python not found in PATH"
        return $false
    }
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

Write-Banner

# Check for Python
Write-Host "Checking requirements..." -ForegroundColor Yellow
Write-Host ""

if (-not (Test-PythonInstalled)) {
    Write-Host ""
    Write-Host "Python 3.12+ is required but not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python from:" -ForegroundColor Yellow
    Write-Host "https://www.python.org/downloads/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "IMPORTANT: Check 'Add Python to PATH' during installation!" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Launching JobSentinel GUI..." -ForegroundColor Yellow
Write-Host ""

# Change to the directory where this script is located
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

try {
    # Launch the GUI
    python deploy\common\launcher_gui.py
    
    Write-Host ""
    Write-Success "JobSentinel GUI closed normally"
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Error-Message "Failed to launch GUI: $_"
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Make sure Python 3.12+ is installed" -ForegroundColor White
    Write-Host "2. Run: pip install -e ." -ForegroundColor White
    Write-Host "3. Check docs/WINDOWS_TROUBLESHOOTING.md" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
