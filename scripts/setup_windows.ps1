# PowerShell script for Windows 11 setup
# Private Job Scraper - Windows Deployment - Enhanced Version

param(
    [switch]$SkipPython,
    [switch]$SkipChocolatey,
    [string]$InstallPath = "$env:USERPROFILE\job-scraper",
    [switch]$Verbose,
    [switch]$SkipScheduler
)

# Enable strict error handling
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

function Write-Success {
    param($Message)
    Write-Host "${Green}✅ $Message${Reset}"
    if ($Verbose) { Write-Host "    $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor DarkGray }
}

function Write-Error {
    param($Message)
    Write-Host "${Red}❌ ERROR: $Message${Reset}" -ForegroundColor Red
    if ($Verbose) { Write-Host "    $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor DarkGray }
}

function Write-Warning {
    param($Message)
    Write-Host "${Yellow}⚠️  WARNING: $Message${Reset}" -ForegroundColor Yellow
    if ($Verbose) { Write-Host "    $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor DarkGray }
}

function Write-Info {
    param($Message)
    Write-Host "${Blue}ℹ️  $Message${Reset}" -ForegroundColor Blue
    if ($Verbose) { Write-Host "    $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor DarkGray }
}

function Write-Step {
    param($Message)
    Write-Host "${Cyan}🔄 $Message${Reset}" -ForegroundColor Cyan
}

function Test-AdminRights {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-InternetConnection {
    try {
        $null = Test-NetConnection -ComputerName "google.com" -Port 80 -InformationLevel Quiet
        return $true
    } catch {
        return $false
    }
}

function Get-PythonVersion {
    try {
        $output = python --version 2>&1
        if ($output -match "Python (\\d+\\.\\d+\\.\\d+)") {
            return [version]$matches[1]
        }
    } catch {
        return $null
    }
    return $null
}

function Install-Chocolatey {
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Success "Chocolatey is already installed"
        # Update chocolatey to latest version
        Write-Step "Updating Chocolatey..."
        try {
            choco upgrade chocolatey -y | Out-Null
            Write-Success "Chocolatey updated to latest version"
        } catch {
            Write-Warning "Could not update Chocolatey, but continuing with existing version"
        }
        return
    }

    Write-Step "Installing Chocolatey package manager..."
    
    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        
        # Verify installation
        $chocoPath = "$env:ProgramData\\chocolatey\\bin\\choco.exe"
        if (Test-Path $chocoPath) {
            # Refresh environment
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            Write-Success "Chocolatey installed successfully"
        } else {
            throw "Chocolatey installation verification failed"
        }
    } catch {
        Write-Error "Failed to install Chocolatey: $($_.Exception.Message)"
        Write-Info "Alternative: Download Python manually from python.org"
        throw $_
    }
}

function Install-Python {
    $currentVersion = Get-PythonVersion
    $requiredVersion = [version]"3.9.0"
    
    if ($currentVersion -and $currentVersion -ge $requiredVersion) {
        Write-Success "Python $currentVersion is already installed (meets requirement >= 3.9)"
        return
    }

    Write-Step "Installing Python 3.11..."
    
    try {
        choco install python311 -y --force
        
        # Refresh environment variables multiple ways for reliability
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        # Wait a moment for installation to complete
        Start-Sleep -Seconds 3
        
        # Verify Python installation
        $newVersion = Get-PythonVersion
        if ($newVersion -and $newVersion -ge $requiredVersion) {
            Write-Success "Python $newVersion installed and verified"
        } else {
            throw "Python installation verification failed"
        }
    } catch {
        Write-Error "Failed to install Python via Chocolatey: $($_.Exception.Message)"
        Write-Info "Please install Python 3.9+ manually from python.org and re-run this script with -SkipPython"
        throw $_
    }
}

function Install-Git {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        $gitVersion = git --version
        Write-Success "Git is already installed: $gitVersion"
        return
    }

    Write-Step "Installing Git..."
    
    try {
        choco install git -y
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        # Verify Git installation
        if (Get-Command git -ErrorAction SilentlyContinue) {
            $gitVersion = git --version
            Write-Success "Git installed and verified: $gitVersion"
        } else {
            throw "Git installation verification failed"
        }
    } catch {
        Write-Error "Failed to install Git: $($_.Exception.Message)"
        throw $_
    }
}

function Setup-JobScraper {
    param($InstallPath)

    Write-Step "Setting up Job Scraper at $InstallPath..."

    # Create install directory with proper error handling
    try {
        if (!(Test-Path $InstallPath)) {
            New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
            Write-Success "Created installation directory: $InstallPath"
        } else {
            Write-Info "Using existing directory: $InstallPath"
        }

        Set-Location $InstallPath
    } catch {
        Write-Error "Failed to create/access installation directory: $($_.Exception.Message)"
        throw $_
    }

    # Download project files if not already present
    if (!(Test-Path "agent.py")) {
        Write-Step "Downloading project files from GitHub..."
        try {
            git clone https://github.com/cboyd0319/job-private-scraper-filter.git temp-download
            Move-Item temp-download\\* . -Force
            Remove-Item temp-download -Recurse -Force
            Write-Success "Project files downloaded successfully"
        } catch {
            Write-Error "Failed to download project files: $($_.Exception.Message)"
            Write-Info "Please download manually from GitHub and extract to $InstallPath"
            throw $_
        }
    }

    # Create Python virtual environment with better error handling
    Write-Step "Creating Python virtual environment..."
    try {
        if (Test-Path ".venv") {
            Write-Info "Virtual environment already exists, recreating for consistency..."
            Remove-Item ".venv" -Recurse -Force
        }
        
        python -m venv .venv
        Write-Success "Virtual environment created"
        
        # Verify virtual environment
        $venvPython = ".\.venv\Scripts\python.exe"
        if (!(Test-Path $venvPython)) {
            throw "Virtual environment Python not found at expected location"
        }
    } catch {
        Write-Error "Failed to create virtual environment: $($_.Exception.Message)"
        Write-Info "Ensure Python is properly installed and accessible"
        throw $_
    }

    # Activate virtual environment with verification
    Write-Step "Activating virtual environment..."
    try {
        & ".\.venv\Scripts\Activate.ps1"
        Write-Success "Virtual environment activated"
        
        # Verify we're using the virtual environment Python
        $activePython = python -c "import sys; print(sys.executable)" 2>$null
        if ($activePython -like "*\.venv*") {
            Write-Success "Confirmed using virtual environment Python"
        } else {
            Write-Warning "May not be using virtual environment Python, but continuing..."
        }
    } catch {
        Write-Warning "Failed to activate virtual environment, but continuing: $($_.Exception.Message)"
    }

    # Upgrade pip first
    Write-Step "Upgrading pip to latest version..."
    try {
        python -m pip install --upgrade pip
        Write-Success "Pip upgraded successfully"
    } catch {
        Write-Warning "Failed to upgrade pip, but continuing: $($_.Exception.Message)"
    }

    # Install requirements with better error handling
    Write-Step "Installing Python packages..."
    try {
        if (Test-Path "requirements.txt") {
            Write-Info "Installing from requirements.txt..."
            pip install -r requirements.txt
        } else {
            Write-Info "Installing core packages manually..."
            $packages = @(
                "playwright==1.45.1",
                "requests==2.32.3",
                "pydantic==2.8.2",
                "sqlmodel==0.0.19",
                "python-dotenv==1.0.1",
                "tenacity==8.5.0",
                "beautifulsoup4==4.12.3",
                "lxml==5.3.0",
                "aiofiles==24.1.0",
                "flask==3.0.3"
            )

            foreach ($package in $packages) {
                Write-Step "Installing $package..."
                pip install $package
            }
        }
        Write-Success "Python packages installed successfully"
        
        # Verify key imports
        Write-Step "Verifying package installations..."
        $testScript = @"
import sys
try:
    import requests, pydantic, sqlmodel, dotenv, tenacity, playwright
    import bs4, lxml, aiofiles, flask
    print("✅ All core packages imported successfully")
    sys.exit(0)
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)
"@
        $testResult = python -c $testScript
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Package verification completed"
        } else {
            Write-Warning "Some packages may not have installed correctly: $testResult"
        }
    } catch {
        Write-Error "Failed to install Python packages: $($_.Exception.Message)"
        throw $_
    }

    # Install Playwright browsers with enhanced error handling
    Write-Step "Installing Playwright browsers (this may take a few minutes)..."
    try {
        python -m playwright install chromium
        Write-Success "Playwright browsers installed"
        
        # Verify Playwright installation
        $playwrightTest = python -c "from playwright.sync_api import sync_playwright; print('✅ Playwright working')" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Playwright installation verified"
        } else {
            Write-Warning "Playwright may not be fully functional, but continuing..."
        }
    } catch {
        Write-Warning "Playwright browser installation encountered issues: $($_.Exception.Message)"
        Write-Info "You can install browsers later with: python -m playwright install"
    }
}

function Setup-ConfigFiles {
    param($InstallPath)

    Write-Step "Setting up configuration files..."

    try {
        # Create .env file if it doesn't exist
        if (!(Test-Path ".env")) {
            if (Test-Path ".env.example") {
                Copy-Item ".env.example" ".env"
                Write-Success "Created .env file from example"
            } else {
                @"
# Timezone for logging and scheduling
TZ=America/New_York

# Slack Incoming Webhook URL for immediate alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ

# SMTP settings for daily digest emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_app_password
DIGEST_TO=recipient_email@example.com

# Logging level (DEBUG, INFO, WARNING, ERROR)
LOG_LEVEL=INFO

# Database cleanup (days to keep old jobs)
CLEANUP_DAYS=90

# Flask settings
FLASK_ENV=production
"@ | Out-File -FilePath ".env" -Encoding UTF8
                Write-Success "Created default .env file"
            }
        } else {
            Write-Info ".env file already exists"
        }

        # Create user_prefs.json if it doesn't exist
        if (!(Test-Path "user_prefs.json")) {
            if (Test-Path "user_prefs.example.json") {
                Copy-Item "user_prefs.example.json" "user_prefs.json"
                Write-Success "Created user_prefs.json from example"
            } else {
                @"
{
  "companies": [
    {"id":"cloudflare","board_type":"greenhouse", "url":"https://boards.greenhouse.io/cloudflare"},
    {"id":"discord","board_type":"greenhouse", "url":"https://boards.greenhouse.io/discord"}
  ],
  "title_allowlist": ["Security Engineer", "Product Security", "Application Security", "AppSec"],
  "title_blocklist": ["Director", "Manager", "VP", "Intern", "Contract"],
  "keywords_boost": ["Okta", "Zero Trust", "Kubernetes", "AWS", "IAM"],
  "keywords_exclude": ["recruiter", "sales", "marketing"],
  "location_constraints": ["Remote", "US"],
  "salary_floor_usd": 150000,
  "immediate_alert_threshold": 0.9,
  "max_matches_per_run": 10,
  "fetch_descriptions": true,
  "max_companies_per_run": 10
}
"@ | Out-File -FilePath "user_prefs.json" -Encoding UTF8
                Write-Success "Created default user_prefs.json"
            }
        } else {
            Write-Info "user_prefs.json already exists"
        }

        # Create data directory structure
        $directories = @("data", "data\\logs", ".security-reports")
        foreach ($dir in $directories) {
            if (!(Test-Path $dir)) {
                New-Item -ItemType Directory -Path $dir -Force | Out-Null
            }
        }
        Write-Success "Created data directories"
        
    } catch {
        Write-Error "Failed to setup configuration files: $($_.Exception.Message)"
        throw $_
    }
}

function Test-Installation {
    param($InstallPath)
    
    Write-Step "Testing installation..."
    
    try {
        Push-Location $InstallPath
        
        # Test basic Python imports
        Write-Step "Testing Python environment..."
        $testScript = @"
        # Test imports
        import sys, os
        sys.path.insert(0, os.getcwd())

        # Test imports with new structure
        from src import agent, database, web_ui
        from utils.config import config_manager
        from utils.logging import get_loggerprint("✅ All imports successful")
print(f"Python: {sys.version}")
print(f"Working directory: {os.getcwd()}")
"@
        
        & ".\.venv\Scripts\python.exe" -c $testScript
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Installation test passed"
        } else {
            Write-Warning "Installation test had issues, but setup completed"
        }
        
    } catch {
        Write-Warning "Installation test failed: $($_.Exception.Message)"
    } finally {
        Pop-Location
    }
}

function Setup-TaskScheduler {
    param($InstallPath)

    if ($SkipScheduler) {
        Write-Info "Skipping Task Scheduler setup (requested)"
        return
    }

    Write-Step "Setting up Windows Task Scheduler..."

    $pythonPath = Join-Path $InstallPath ".venv\\Scripts\\python.exe"
    $agentPath = Join-Path $InstallPath "src\\agent.py"

    try {
        # Remove existing tasks first to avoid conflicts
        $existingTasks = @("JobScraper-Poll", "JobScraper-Digest", "JobScraper-Cleanup")
        foreach ($taskName in $existingTasks) {
            try {
                Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
            } catch {}
        }

        # Create polling task (every 15 minutes)
        $pollAction = New-ScheduledTaskAction -Execute $pythonPath -Argument "`"$agentPath`" --mode poll" -WorkingDirectory $InstallPath
        $pollTrigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 15) -Once -At (Get-Date).AddMinutes(2)
        $pollSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
        $pollPrincipal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

        Register-ScheduledTask -TaskName "JobScraper-Poll" -Action $pollAction -Trigger $pollTrigger -Settings $pollSettings -Principal $pollPrincipal -Force | Out-Null
        Write-Success "Created polling task (every 15 minutes)"

        # Create digest task (daily at 9 AM)
        $digestAction = New-ScheduledTaskAction -Execute $pythonPath -Argument "`"$agentPath`" --mode digest" -WorkingDirectory $InstallPath
        $digestTrigger = New-ScheduledTaskTrigger -Daily -At "9:00AM"
        $digestSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

        Register-ScheduledTask -TaskName "JobScraper-Digest" -Action $digestAction -Trigger $digestTrigger -Settings $digestSettings -Principal $pollPrincipal -Force | Out-Null
        Write-Success "Created digest task (daily at 9 AM)"

        # Create cleanup task (weekly)
        $cleanupAction = New-ScheduledTaskAction -Execute $pythonPath -Argument "`"$agentPath`" --mode cleanup" -WorkingDirectory $InstallPath
        $cleanupTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "2:00AM"

        Register-ScheduledTask -TaskName "JobScraper-Cleanup" -Action $cleanupAction -Trigger $cleanupTrigger -Settings $digestSettings -Principal $pollPrincipal -Force | Out-Null
        Write-Success "Created cleanup task (weekly on Sunday)"

    } catch {
        Write-Warning "Failed to create some scheduled tasks: $($_.Exception.Message)"
        Write-Info "You can manually run jobs using the desktop shortcuts"
    }
}

function Create-StartupShortcuts {
    param($InstallPath)

    Write-Step "Creating desktop shortcuts..."

    try {
        $shell = New-Object -ComObject WScript.Shell
        $desktop = [System.Environment]::GetFolderPath('Desktop')

        # Test shortcut
        $testShortcut = $shell.CreateShortcut("$desktop\\Test Job Scraper.lnk")
        $testShortcut.TargetPath = "powershell.exe"
        $testShortcut.Arguments = "-WindowStyle Normal -Command `"cd '$InstallPath'; & '.\.venv\Scripts\python.exe' agent.py --mode test; Write-Host 'Press any key to close...'; `$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')`""
        $testShortcut.WorkingDirectory = $InstallPath
        $testShortcut.Description = "Test Job Scraper notifications and setup"
        $testShortcut.Save()

        # Manual run shortcut
        $runShortcut = $shell.CreateShortcut("$desktop\\Run Job Scraper.lnk")
        $runShortcut.TargetPath = "powershell.exe"
        $runShortcut.Arguments = "-WindowStyle Normal -Command `"cd '$InstallPath'; & '.\.venv\Scripts\python.exe' agent.py --mode poll; Write-Host 'Job search completed. Press any key to close...'; `$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')`""
        $runShortcut.WorkingDirectory = $InstallPath
        $runShortcut.Description = "Manually run Job Scraper search"
        $runShortcut.Save()

        # Web UI shortcut
        $webShortcut = $shell.CreateShortcut("$desktop\\Job Scraper Web UI.lnk")
        $webShortcut.TargetPath = "powershell.exe"
        $webShortcut.Arguments = "-WindowStyle Normal -Command `"cd '$InstallPath'; Write-Host 'Starting web interface on http://localhost:5000'; Write-Host 'Press Ctrl+C to stop...'; & '.\.venv\Scripts\python.exe' web_ui.py`""
        $webShortcut.WorkingDirectory = $InstallPath
        $webShortcut.Description = "Start Job Scraper web interface"
        $webShortcut.Save()

        Write-Success "Created desktop shortcuts"
    } catch {
        Write-Warning "Failed to create desktop shortcuts: $($_.Exception.Message)"
    }
}

function Show-CompletionSummary {
    param($InstallPath)
    
    Write-Host ""
    Write-Success "🎉 Private Job Scraper setup completed successfully!"
    Write-Host ""
    Write-Host "${Cyan}📍 Installation Details:${Reset}"
    Write-Host "   Location: $InstallPath"
    Write-Host "   Python: $(Get-PythonVersion)"
    Write-Host "   Virtual Environment: $InstallPath\\.venv"
    Write-Host ""
    Write-Host "${Yellow}🔧 Next Steps:${Reset}"
    Write-Host "   1. ${Blue}Edit configuration files:${Reset}"
    Write-Host "      • $InstallPath\\.env (notification settings)"
    Write-Host "      • $InstallPath\\user_prefs.json (job preferences)"
    Write-Host ""
    Write-Host "   2. ${Blue}Test your setup:${Reset}"
    Write-Host "      • Use the 'Test Job Scraper' desktop shortcut"
    Write-Host "      • Check notifications are working"
    Write-Host ""
    Write-Host "   3. ${Blue}Start using the scraper:${Reset}"
    Write-Host "      • Scheduled tasks run automatically every 15 minutes"
    Write-Host "      • Use 'Run Job Scraper' shortcut for manual runs"
    Write-Host "      • Use 'Job Scraper Web UI' to view results"
    Write-Host ""
    Write-Host "${Green}💡 Pro Tips:${Reset}"
    Write-Host "   • Check Task Scheduler for automated runs status"
    Write-Host "   • Logs are stored in $InstallPath\\data\\logs\\"
    Write-Host "   • Database file: $InstallPath\\data\\jobs.sqlite"
    Write-Host ""
}

# Main execution with comprehensive error handling
try {
    Write-Host "${Cyan}🚀 Private Job Scraper - Enhanced Windows 11 Setup${Reset}"
    Write-Host "${Cyan}═══════════════════════════════════════════════════${Reset}"
    Write-Host ""

    # Pre-flight checks
    Write-Step "Running pre-flight checks..."
    
    if (!(Test-AdminRights)) {
        Write-Error "This script requires administrator privileges."
        Write-Info "Please right-click PowerShell and 'Run as Administrator'"
        exit 1
    }
    Write-Success "Administrator privileges confirmed"

    if (!(Test-InternetConnection)) {
        Write-Error "Internet connection is required for setup."
        Write-Info "Please check your network connection and try again"
        exit 1
    }
    Write-Success "Internet connection verified"

    # Validate PowerShell version
    if ($PSVersionTable.PSVersion.Major -lt 5) {
        Write-Warning "PowerShell version $($PSVersionTable.PSVersion) detected. Version 5+ recommended."
    } else {
        Write-Success "PowerShell version $($PSVersionTable.PSVersion) is compatible"
    }

    Write-Info "Starting installation to: $InstallPath"
    Write-Host ""

    # Install Chocolatey
    if (!$SkipChocolatey) {
        Install-Chocolatey
    }

    # Install Python
    if (!$SkipPython) {
        Install-Python
    }

    # Install Git
    Install-Git

    # Setup Job Scraper
    Setup-JobScraper -InstallPath $InstallPath

    # Setup configuration files
    Setup-ConfigFiles -InstallPath $InstallPath

    # Test installation
    Test-Installation -InstallPath $InstallPath

    # Setup Task Scheduler
    Setup-TaskScheduler -InstallPath $InstallPath

    # Create shortcuts
    Create-StartupShortcuts -InstallPath $InstallPath

    # Show completion summary
    Show-CompletionSummary -InstallPath $InstallPath

} catch {
    Write-Host ""
    Write-Error "Setup failed with error: $($_.Exception.Message)"
    Write-Host ""
    Write-Host "${Yellow}🔧 Troubleshooting Tips:${Reset}"
    Write-Host "   1. Ensure you're running PowerShell as Administrator"
    Write-Host "   2. Check your internet connection"
    Write-Host "   3. Try running with -Verbose for more details"
    Write-Host "   4. Consider manual Python installation from python.org"
    Write-Host "   5. Report issues at: https://github.com/cboyd0319/job-private-scraper-filter/issues"
    Write-Host ""
    exit 1
}