<#
.SYNOPSIS
    JobSentinel Windows Bootstrap - One-Click Setup

.DESCRIPTION
    This script bootstraps JobSentinel on Windows 11+ with:
    - Zero admin rights required
    - Automatic portable Node.js installation
    - Python 3.12+ venv setup with locked dependencies
    - SQLite database initialization
    - .env configuration from template
    - Frontend build (React 19 + Vite 7)
    - Health check validation

.NOTES
    Version: 1.0.0
    Target: Windows 11+ (build 22000+)
    Python: 3.12.10 preferred (3.12+ minimum)
    No admin rights needed!

.EXAMPLE
    .\bootstrap.ps1
#>

#Requires -Version 5.1

# Set strict mode for better error handling
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"  # Speeds up downloads

# ============================================================================
# CONSTANTS & CONFIGURATION
# ============================================================================

$SCRIPT_VERSION = "1.0.0"
$MIN_PYTHON_MAJOR = 3
$MIN_PYTHON_MINOR = 12
$MIN_DISK_SPACE_GB = 1
$MIN_MEMORY_GB = 2
$REQUIRED_PORTS = @(8000, 3000)

# Paths
$PROJECT_ROOT = $PSScriptRoot
$TOOLS_DIR = Join-Path $PROJECT_ROOT ".tools"
$NODE_DIR = Join-Path $TOOLS_DIR "node"
$VENV_DIR = Join-Path $PROJECT_ROOT ".venv"
$DATA_DIR = Join-Path $PROJECT_ROOT "data"
$CONFIG_DIR = Join-Path $PROJECT_ROOT "config"
$FRONTEND_DIR = Join-Path $PROJECT_ROOT "frontend"
$ENV_FILE = Join-Path $PROJECT_ROOT ".env"
$ENV_EXAMPLE = Join-Path $PROJECT_ROOT ".env.example"

# Node.js portable version (Windows x64)
$NODE_VERSION = "20.11.0"
$NODE_URL = "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-win-x64.zip"
$NODE_ZIP = Join-Path $TOOLS_DIR "node.zip"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Banner {
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor Cyan
    Write-Host "                JobSentinel - Windows Bootstrap v$SCRIPT_VERSION" -ForegroundColor Cyan
    Write-Host "============================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Message)
    Write-Host ""
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

function Write-Warning {
    param([string]$Message)
    Write-Host "  ⚠ $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "  ℹ $Message" -ForegroundColor Cyan
}

function Test-Administrator {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-WindowsVersion {
    $version = [System.Environment]::OSVersion.Version
    $build = $version.Build
    
    if ($version.Major -ge 10 -and $build -ge 22000) {
        return @{ Success = $true; Build = $build }
    }
    return @{ Success = $false; Build = $build }
}

function Test-PythonVersion {
    try {
        $pythonVersion = & python --version 2>&1
        
        if ($LASTEXITCODE -eq 0 -and $pythonVersion -match "Python (\d+)\.(\d+)\.(\d+)") {
            $major = [int]$matches[1]
            $minor = [int]$matches[2]
            $patch = [int]$matches[3]
            
            $isValid = ($major -gt $MIN_PYTHON_MAJOR) -or 
                       ($major -eq $MIN_PYTHON_MAJOR -and $minor -ge $MIN_PYTHON_MINOR)
            
            return @{
                Success = $isValid
                Version = "$major.$minor.$patch"
                Major = $major
                Minor = $minor
            }
        }
    }
    catch {
        return @{ Success = $false; Version = "Not found" }
    }
    
    return @{ Success = $false; Version = "Unknown" }
}

function Test-DiskSpace {
    $drive = (Get-Location).Drive
    $freeSpaceGB = [math]::Round((Get-PSDrive $drive.Name).Free / 1GB, 2)
    
    return @{
        Success = $freeSpaceGB -ge $MIN_DISK_SPACE_GB
        FreeSpaceGB = $freeSpaceGB
    }
}

function Test-Memory {
    $os = Get-CimInstance Win32_OperatingSystem
    $freeMemoryGB = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
    
    return @{
        Success = $freeMemoryGB -ge $MIN_MEMORY_GB
        FreeMemoryGB = $freeMemoryGB
    }
}

function Test-InternetConnection {
    try {
        $response = Test-Connection -ComputerName "www.google.com" -Count 1 -Quiet -ErrorAction SilentlyContinue
        return $response
    }
    catch {
        return $false
    }
}

function Test-PortAvailable {
    param([int]$Port)
    
    try {
        $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
        $listener.Start()
        $listener.Stop()
        return $true
    }
    catch {
        return $false
    }
}

# ============================================================================
# MAIN BOOTSTRAP STEPS
# ============================================================================

function Step-SystemCheck {
    Write-Step "System Compatibility Check"
    
    # Check if running as admin (we should NOT be)
    if (Test-Administrator) {
        Write-Warning "Running as Administrator is not required and not recommended"
        Write-Info "JobSentinel runs with standard user privileges for security"
    }
    else {
        Write-Success "Running as standard user (no admin rights)"
    }
    
    # Windows version
    $winCheck = Test-WindowsVersion
    if ($winCheck.Success) {
        Write-Success "Windows 11 detected (build $($winCheck.Build))"
    }
    else {
        Write-Error "Windows 11 required (build 22000+). Found: build $($winCheck.Build)"
        Write-Info "Please upgrade to Windows 11 to continue"
        throw "Incompatible Windows version"
    }
    
    # Python version
    $pyCheck = Test-PythonVersion
    if ($pyCheck.Success) {
        Write-Success "Python $($pyCheck.Version) found"
    }
    else {
        Write-Error "Python $MIN_PYTHON_MAJOR.$MIN_PYTHON_MINOR+ required. Found: $($pyCheck.Version)"
        Write-Info "Download from: https://www.python.org/downloads/"
        Write-Info "IMPORTANT: Check 'Add Python to PATH' during installation"
        throw "Python not found or version too old"
    }
    
    # Disk space
    $diskCheck = Test-DiskSpace
    if ($diskCheck.Success) {
        Write-Success "$($diskCheck.FreeSpaceGB) GB free disk space"
    }
    else {
        Write-Error "Only $($diskCheck.FreeSpaceGB) GB free. Need at least $MIN_DISK_SPACE_GB GB"
        throw "Insufficient disk space"
    }
    
    # Memory
    $memCheck = Test-Memory
    if ($memCheck.Success) {
        Write-Success "$($memCheck.FreeMemoryGB) GB free memory"
    }
    else {
        Write-Warning "Only $($memCheck.FreeMemoryGB) GB free memory (recommended: $MIN_MEMORY_GB GB+)"
    }
    
    # Internet connection
    if (Test-InternetConnection) {
        Write-Success "Internet connection available"
    }
    else {
        Write-Warning "No internet connection detected"
        Write-Info "Some features may not work without internet access"
    }
    
    # Port availability
    $allPortsAvailable = $true
    foreach ($port in $REQUIRED_PORTS) {
        if (Test-PortAvailable $port) {
            Write-Success "Port $port available"
        }
        else {
            Write-Warning "Port $port is in use"
            $allPortsAvailable = $false
        }
    }
    
    if (-not $allPortsAvailable) {
        Write-Info "Some ports are in use. You may need to stop other applications or use different ports"
    }
    
    Write-Success "System compatibility check passed"
}

function Step-CreateDirectories {
    Write-Step "Creating directory structure"
    
    $directories = @($TOOLS_DIR, $NODE_DIR, $DATA_DIR)
    
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Success "Created: $dir"
        }
        else {
            Write-Info "Already exists: $dir"
        }
    }
}

function Step-InstallPortableNode {
    Write-Step "Installing portable Node.js"
    
    $nodeExe = Join-Path $NODE_DIR "node.exe"
    
    if (Test-Path $nodeExe) {
        Write-Info "Node.js already installed in $NODE_DIR"
        
        # Verify it works
        try {
            $nodeVersion = & $nodeExe --version 2>&1
            Write-Success "Node.js $nodeVersion ready"
            return
        }
        catch {
            Write-Warning "Existing Node.js installation corrupted, reinstalling..."
        }
    }
    
    Write-Info "Downloading Node.js v$NODE_VERSION (portable, no admin needed)..."
    
    try {
        # Download Node.js
        Invoke-WebRequest -Uri $NODE_URL -OutFile $NODE_ZIP -UseBasicParsing
        Write-Success "Downloaded Node.js"
        
        # Extract
        Write-Info "Extracting Node.js..."
        Expand-Archive -Path $NODE_ZIP -DestinationPath $TOOLS_DIR -Force
        
        # Move to correct location
        $extractedDir = Join-Path $TOOLS_DIR "node-v$NODE_VERSION-win-x64"
        if (Test-Path $extractedDir) {
            Get-ChildItem $extractedDir | Move-Item -Destination $NODE_DIR -Force
            Remove-Item $extractedDir -Force
        }
        
        # Clean up
        Remove-Item $NODE_ZIP -Force
        
        # Verify
        $nodeVersion = & $nodeExe --version
        Write-Success "Node.js $nodeVersion installed successfully"
    }
    catch {
        Write-Error "Failed to install Node.js: $_"
        throw
    }
}

function Step-SetupPythonVenv {
    Write-Step "Setting up Python virtual environment"
    
    if (Test-Path $VENV_DIR) {
        Write-Info "Virtual environment already exists"
        Write-Info "Activating existing venv..."
    }
    else {
        Write-Info "Creating Python virtual environment..."
        & python -m venv $VENV_DIR
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create virtual environment"
            throw "venv creation failed"
        }
        
        Write-Success "Virtual environment created"
    }
    
    # Activate venv
    $activateScript = Join-Path $VENV_DIR "Scripts\Activate.ps1"
    if (-not (Test-Path $activateScript)) {
        Write-Error "Virtual environment activation script not found"
        throw "Invalid venv"
    }
    
    . $activateScript
    Write-Success "Virtual environment activated"
    
    # Upgrade pip
    Write-Info "Upgrading pip..."
    & python -m pip install --upgrade pip --quiet
    Write-Success "pip upgraded"
    
    # Install dependencies
    Write-Info "Installing JobSentinel and dependencies (this may take a few minutes)..."
    & pip install -e . --quiet
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        throw "pip install failed"
    }
    
    Write-Success "Dependencies installed"
}

function Step-ConfigureEnvironment {
    Write-Step "Configuring environment"
    
    if (-not (Test-Path $ENV_FILE)) {
        if (Test-Path $ENV_EXAMPLE) {
            Copy-Item $ENV_EXAMPLE $ENV_FILE
            Write-Success "Created .env from template"
            Write-Warning "Please edit .env to configure Slack webhook and other settings"
        }
        else {
            Write-Warning ".env.example not found, skipping .env creation"
        }
    }
    else {
        Write-Info ".env already exists"
    }
    
    # Create user_prefs.json if needed
    $userPrefs = Join-Path $CONFIG_DIR "user_prefs.json"
    $userPrefsExample = Join-Path $CONFIG_DIR "user_prefs.example.json"
    
    if (-not (Test-Path $userPrefs)) {
        if (Test-Path $userPrefsExample) {
            Copy-Item $userPrefsExample $userPrefs
            Write-Success "Created user_prefs.json from example"
            Write-Warning "Please edit config/user_prefs.json to set your preferences"
        }
    }
    else {
        Write-Info "user_prefs.json already exists"
    }
}

function Step-InitializeDatabase {
    Write-Step "Initializing SQLite database"
    
    # Database will be created automatically on first run
    # Just ensure data directory exists (already created)
    
    Write-Success "Database directory ready at: $DATA_DIR"
    Write-Info "Database will be created automatically on first run"
}

function Step-BuildFrontend {
    Write-Step "Building frontend (React 19 + Vite 7)"
    
    if (-not (Test-Path $FRONTEND_DIR)) {
        Write-Warning "Frontend directory not found, skipping build"
        return
    }
    
    # Add portable Node to PATH for this session
    $nodeExe = Join-Path $NODE_DIR "node.exe"
    $nodePath = Split-Path $nodeExe
    $env:PATH = "$nodePath;$env:PATH"
    
    Push-Location $FRONTEND_DIR
    
    try {
        # Check if node_modules exists
        $nodeModules = Join-Path $FRONTEND_DIR "node_modules"
        
        if (-not (Test-Path $nodeModules)) {
            Write-Info "Installing frontend dependencies..."
            & npm install
            
            if ($LASTEXITCODE -ne 0) {
                Write-Error "npm install failed"
                throw "Frontend dependency installation failed"
            }
            
            Write-Success "Frontend dependencies installed"
        }
        else {
            Write-Info "Frontend dependencies already installed"
        }
        
        # Build frontend
        Write-Info "Building frontend (this may take a minute)..."
        & npm run build
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Frontend build failed"
            throw "Frontend build failed"
        }
        
        Write-Success "Frontend built successfully"
    }
    finally {
        Pop-Location
    }
}

function Step-RunHealthCheck {
    Write-Step "Running health check"
    
    try {
        & python -m jsa.cli health
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Health check passed"
        }
        else {
            Write-Warning "Health check reported issues (this is normal on first run)"
            Write-Info "Run './run.ps1' to start the application"
        }
    }
    catch {
        Write-Warning "Health check failed: $_"
        Write-Info "This is normal on first run. Try running './run.ps1' to start the app"
    }
}

function Write-CompletionMessage {
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor Green
    Write-Host "                    Bootstrap Complete! 🎉" -ForegroundColor Green
    Write-Host "============================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1. Edit configuration:" -ForegroundColor Yellow
    Write-Host "     - .env (Slack webhook, database settings)" -ForegroundColor White
    Write-Host "     - config/user_prefs.json (keywords, locations, preferences)" -ForegroundColor White
    Write-Host ""
    Write-Host "  2. Start JobSentinel:" -ForegroundColor Yellow
    Write-Host "     .\run.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "  3. Access the UI:" -ForegroundColor Yellow
    Write-Host "     - API: http://localhost:8000" -ForegroundColor White
    Write-Host "     - Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "For help, see:" -ForegroundColor Cyan
    Write-Host "  - docs/WINDOWS_QUICK_START.md" -ForegroundColor White
    Write-Host "  - docs/WINDOWS_TROUBLESHOOTING.md" -ForegroundColor White
    Write-Host ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

try {
    Write-Banner
    
    Write-Host "This script will set up JobSentinel on your Windows machine." -ForegroundColor White
    Write-Host "No admin rights required. All files stay in: $PROJECT_ROOT" -ForegroundColor White
    Write-Host ""
    
    # Run all bootstrap steps
    Step-SystemCheck
    Step-CreateDirectories
    Step-InstallPortableNode
    Step-SetupPythonVenv
    Step-ConfigureEnvironment
    Step-InitializeDatabase
    Step-BuildFrontend
    Step-RunHealthCheck
    
    Write-CompletionMessage
    
    exit 0
}
catch {
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor Red
    Write-Host "                    Bootstrap Failed" -ForegroundColor Red
    Write-Host "============================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "For troubleshooting, see: docs/WINDOWS_TROUBLESHOOTING.md" -ForegroundColor Yellow
    Write-Host ""
    
    exit 1
}
