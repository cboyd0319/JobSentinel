<#
.SYNOPSIS
    JobSentinel Runner - One-Click Application Launcher

.DESCRIPTION
    This script starts JobSentinel with both backend API and frontend UI.
    Supports multiple modes:
    - api: FastAPI backend only
    - web: Legacy Flask UI
    - dev: Development mode with hot reload
    - once: Run job scraper once and exit

.PARAMETER Mode
    Launch mode: api, web, dev, once (default: api)

.PARAMETER Port
    Port for API/Web server (default: 8000 for API, 5000 for web)

.PARAMETER DryRun
    Run in dry-run mode (no actual job alerts sent)

.NOTES
    Version: 1.0.0
    Target: Windows 11+ (build 22000+)
    Requires: Bootstrap completed (run .\bootstrap.ps1 first)

.EXAMPLE
    .\run.ps1
    # Starts API on port 8000

.EXAMPLE
    .\run.ps1 -Mode dev
    # Starts in development mode with hot reload

.EXAMPLE
    .\run.ps1 -Mode once -DryRun
    # Runs job scraper once in dry-run mode
#>

#Requires -Version 5.1

param(
    [Parameter()]
    [ValidateSet("api", "web", "dev", "once")]
    [string]$Mode = "api",
    
    [Parameter()]
    [int]$Port = 0,
    
    [Parameter()]
    [switch]$DryRun
)

# Set strict mode for better error handling
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ============================================================================
# CONSTANTS & CONFIGURATION
# ============================================================================

$SCRIPT_VERSION = "1.0.0"
$PROJECT_ROOT = $PSScriptRoot
$VENV_DIR = Join-Path $PROJECT_ROOT ".venv"
$FRONTEND_DIR = Join-Path $PROJECT_ROOT "frontend"
$NODE_DIR = Join-Path $PROJECT_ROOT ".tools\node"
$DATA_DIR = Join-Path $PROJECT_ROOT "data"

# Default ports
$DEFAULT_API_PORT = 8000
$DEFAULT_WEB_PORT = 5000
$DEFAULT_FRONTEND_PORT = 3000

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Banner {
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor Cyan
    Write-Host "                JobSentinel Runner v$SCRIPT_VERSION" -ForegroundColor Cyan
    Write-Host "============================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Message)
    Write-Host "→ $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "  ✗ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "  ℹ $Message" -ForegroundColor Cyan
}

function Test-Bootstrap {
    # Check if bootstrap has been run
    $venvActivate = Join-Path $VENV_DIR "Scripts\Activate.ps1"
    
    if (-not (Test-Path $venvActivate)) {
        Write-Error "Virtual environment not found"
        Write-Info "Please run .\bootstrap.ps1 first to set up JobSentinel"
        return $false
    }
    
    return $true
}

function Start-ActivateVenv {
    $activateScript = Join-Path $VENV_DIR "Scripts\Activate.ps1"
    . $activateScript
    Write-Success "Virtual environment activated"
}

function Add-NodeToPath {
    if (Test-Path $NODE_DIR) {
        $env:PATH = "$NODE_DIR;$env:PATH"
        Write-Success "Added portable Node.js to PATH"
    }
}

function Start-ApiMode {
    param([int]$Port)
    
    Write-Step "Starting FastAPI backend on port $Port"
    Write-Info "API will be available at: http://localhost:$Port"
    Write-Info "API docs available at: http://localhost:${Port}/docs"
    Write-Host ""
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    
    & python -m jsa.cli api --port $Port
}

function Start-WebMode {
    param([int]$Port)
    
    Write-Step "Starting Flask web UI on port $Port"
    Write-Info "Web UI will be available at: http://localhost:$Port"
    Write-Host ""
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    
    & python -m jsa.cli web --port $Port
}

function Start-DevMode {
    Write-Step "Starting development mode"
    Write-Info "This will start both backend and frontend with hot reload"
    Write-Host ""
    
    # Start backend in background
    Write-Info "Starting FastAPI backend on port $DEFAULT_API_PORT..."
    $backendJob = Start-Job -ScriptBlock {
        param($root, $venv)
        Set-Location $root
        . "$venv\Scripts\Activate.ps1"
        & python -m jsa.cli api --port 8000
    } -ArgumentList $PROJECT_ROOT, $VENV_DIR
    
    Write-Success "Backend started (Job ID: $($backendJob.Id))"
    Start-Sleep -Seconds 3
    
    # Start frontend in foreground
    if (Test-Path $FRONTEND_DIR) {
        Write-Info "Starting React frontend on port $DEFAULT_FRONTEND_PORT..."
        Write-Host ""
        Write-Host "Press Ctrl+C to stop both backend and frontend" -ForegroundColor Yellow
        Write-Host ""
        
        Push-Location $FRONTEND_DIR
        
        try {
            & npm run dev
        }
        finally {
            Pop-Location
            
            # Clean up backend job
            Write-Host ""
            Write-Info "Stopping backend..."
            Stop-Job $backendJob
            Remove-Job $backendJob
            Write-Success "Backend stopped"
        }
    }
    else {
        Write-Error "Frontend directory not found: $FRONTEND_DIR"
        
        # Clean up backend job
        Stop-Job $backendJob
        Remove-Job $backendJob
        
        throw "Frontend not available"
    }
}

function Start-OnceMode {
    param([switch]$DryRun)
    
    Write-Step "Running job scraper once"
    
    if ($DryRun) {
        Write-Info "Dry-run mode: no alerts will be sent"
        & python -m jsa.cli run-once --dry-run
    }
    else {
        & python -m jsa.cli run-once
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Scraper completed successfully"
    }
    else {
        Write-Error "Scraper failed with exit code: $LASTEXITCODE"
        exit $LASTEXITCODE
    }
}

function Show-QuickHelp {
    Write-Host "Available modes:" -ForegroundColor Cyan
    Write-Host "  api   - Start FastAPI backend (default)" -ForegroundColor White
    Write-Host "  web   - Start Flask web UI" -ForegroundColor White
    Write-Host "  dev   - Development mode (backend + frontend with hot reload)" -ForegroundColor White
    Write-Host "  once  - Run job scraper once and exit" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Cyan
    Write-Host "  .\run.ps1              # Start API on default port (8000)" -ForegroundColor White
    Write-Host "  .\run.ps1 -Mode dev    # Start in development mode" -ForegroundColor White
    Write-Host "  .\run.ps1 -Mode once -DryRun  # Dry-run job scraper" -ForegroundColor White
    Write-Host ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

try {
    Write-Banner
    
    # Check if bootstrap has been completed
    if (-not (Test-Bootstrap)) {
        exit 1
    }
    
    # Activate virtual environment
    Start-ActivateVenv
    
    # Add Node.js to PATH (for dev mode)
    Add-NodeToPath
    
    # Set default port based on mode if not specified
    if ($Port -eq 0) {
        switch ($Mode) {
            "api" { $Port = $DEFAULT_API_PORT }
            "web" { $Port = $DEFAULT_WEB_PORT }
            default { $Port = $DEFAULT_API_PORT }
        }
    }
    
    # Launch in selected mode
    switch ($Mode) {
        "api" {
            Start-ApiMode -Port $Port
        }
        "web" {
            Start-WebMode -Port $Port
        }
        "dev" {
            Start-DevMode
        }
        "once" {
            Start-OnceMode -DryRun:$DryRun
        }
    }
    
    exit 0
}
catch {
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor Red
    Write-Host "                    Error Running JobSentinel" -ForegroundColor Red
    Write-Host "============================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Ensure bootstrap completed: .\bootstrap.ps1" -ForegroundColor White
    Write-Host "  2. Check configuration: .env and config/user_prefs.json" -ForegroundColor White
    Write-Host "  3. Run health check: python -m jsa.cli health" -ForegroundColor White
    Write-Host "  4. See docs/WINDOWS_TROUBLESHOOTING.md" -ForegroundColor White
    Write-Host ""
    
    Show-QuickHelp
    
    exit 1
}
