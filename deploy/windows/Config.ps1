<#
.SYNOPSIS
    Centralized configuration for Job Finder
.DESCRIPTION
    Contains all magic strings, constants, and configuration values
#>

Set-StrictMode -Version Latest

# === Version Information ===
$script:Config = @{
    Version = '0.4.5'
    ProductName = 'Job Finder'
    Author = 'cboyd0319'

    # === Python Configuration ===
    Python = @{
        Version = '3.12.10'
        MinVersion = [version]'3.12.0'
        DownloadUrl = 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe'
        SHA256 = 'c3a526c6a84353c8633f01add54abe584535048303455150591e3e9ad884b424'
        InstallArgs = '/quiet InstallAllUsers=0 PrependPath=1 Include_test=0'
    }

    # === Google Cloud SDK Configuration ===
    Gcloud = @{
        DownloadUrl = 'https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe'
        InstallArgs = '/S /noreporting'
        InstallArgsAdmin = '/S /allusers /noreporting'
    }

    # === Repository Configuration ===
    Repository = @{
        Name = 'job-private-scraper-filter'
        Url = 'https://github.com/cboyd0319/job-private-scraper-filter'
        ZipUrl = 'https://github.com/cboyd0319/job-private-scraper-filter/archive/refs/heads/main.zip'
        ApiUrl = 'https://api.github.com/repos/cboyd0319/job-private-scraper-filter'
    }

    # === Path Configuration ===
    Paths = @{
        # Relative paths from project root
        ScriptsDir = 'scripts'
        DataDir = 'data'
        LogsDir = 'logs'
        ConfigDir = 'config'
        CloudDir = 'cloud'
        TestsDir = 'tests'
        DeployDir = 'deploy'

        # Specific files
        VersionFile = 'VERSION'
        RequirementsFile = 'requirements.txt'
        PyProjectFile = 'pyproject.toml'

        # Script files
        QueryScript = 'scripts\query_db.py'
        AgentScript = 'src\agent.py'
        SetupWizard = 'scripts\setup_wizard.py'

        # Config files
        UserPrefsFile = 'config\user_prefs.json'
        EnvFile = '.env'
    }

    # === Installer Configuration ===
    Installer = @{
        StateFile = 'installer-state.json'
        CrashLogFile = 'installer-crash.log'
        CacheDir = 'job-finder-cache'
        TempPrefix = 'job-finder-temp'
    }

    # === Timeouts (milliseconds) ===
    Timeouts = @{
        DownloadPython = 300000   # 5 minutes
        DownloadGcloud = 600000   # 10 minutes
        InstallPython  = 180000   # 3 minutes
        InstallGcloud  = 300000   # 5 minutes
        PythonBootstrap = 600000  # 10 minutes
    }

    # === UI Configuration ===
    UI = @{
        Colors = @{
            Primary = '#4C8BF5'
            Accent = '#22C55E'
            Error = '#EF4444'
            Warning = '#F59E0B'
            Success = '#10B981'
            Text = '#333333'
            Muted = '#6c757d'
            Background = '#fdfdfd'
            ButtonText = '#ffffff'
        }
    }

    # === Telemetry Configuration ===
    Telemetry = @{
        Enabled = $true
        LocalOnly = $true
        EventFile = 'job-finder-telemetry.jsonl'
    }
}

function Get-Config {
    <#
    .SYNOPSIS
        Get configuration value
    .PARAMETER Path
        Dot-notation path to config value (e.g., "Python.Version")
    .EXAMPLE
        $pythonVer = Get-Config "Python.Version"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    $parts = $Path -split '\.'
    $current = $script:Config

    foreach ($part in $parts) {
        if ($current -is [hashtable] -and $current.ContainsKey($part)) {
            $current = $current[$part]
        } else {
            Write-Error "Configuration path not found: $Path"
            return $null
        }
    }

    return $current
}

function Get-ProjectPath {
    <#
    .SYNOPSIS
        Get absolute path to project file/directory
    .PARAMETER RelativePath
        Relative path from project root
    .PARAMETER ProjectRoot
        Project root directory (defaults to script location)
    .EXAMPLE
        $logsDir = Get-ProjectPath "logs"
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory)]
        [string]$RelativePath,

        [string]$ProjectRoot = $PSScriptRoot
    )

    # Navigate up to project root if we're in deploy/windows
    if ($ProjectRoot -like '*\deploy\windows*') {
        $ProjectRoot = (Resolve-Path (Join-Path $ProjectRoot "..\..")).Path
    }

    $fullPath = Join-Path $ProjectRoot $RelativePath
    return $fullPath
}

function Initialize-ProjectDirectories {
    <#
    .SYNOPSIS
        Ensure all required project directories exist
    .PARAMETER ProjectRoot
        Project root directory
    .EXAMPLE
        Initialize-ProjectDirectories -ProjectRoot "C:\App"
    #>
    [CmdletBinding()]
    param(
        [string]$ProjectRoot = $PSScriptRoot
    )

    # Navigate up to project root if we're in deploy/windows
    if ($ProjectRoot -like '*\deploy\windows*') {
        $ProjectRoot = (Resolve-Path (Join-Path $ProjectRoot "..\..")).Path
    }

    $directories = @(
        $script:Config.Paths.LogsDir,
        $script:Config.Paths.DataDir,
        $script:Config.Paths.ConfigDir
    )

    foreach ($dir in $directories) {
        $fullPath = Join-Path $ProjectRoot $dir
        if (-not (Test-Path $fullPath)) {
            New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
            Write-Verbose "Created directory: $fullPath"
        }
    }
}

# Export the configuration
Export-ModuleMember -Variable Config
Export-ModuleMember -Function @(
    'Get-Config',
    'Get-ProjectPath',
    'Initialize-ProjectDirectories'
)
