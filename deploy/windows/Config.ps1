<#
.SYNOPSIS
    Centralized configuration for the Job Finder suite.
.DESCRIPTION
    This module provides a single source of truth for all configuration values,
    including versions, URLs, paths, and UI settings. It is designed to be
    imported by all other scripts in the suite.

    It uses a nested hashtable for namespacing and provides helper functions
    for safe and easy access to configuration values.
.NOTES
    Author: Gemini
    Version: 1.0.0
#>
Set-StrictMode -Version Latest

# --- Main Configuration Hashtable ---
$script:JobFinderConfig = @{
    # --- Product Information ---
    Product = @{
        Name      = 'My Job Finder'
        Version   = '1.0.0' # Semantic Versioning
        Author    = 'Gemini'
        Copyright = "Copyright (c) $(Get-Date -Format 'yyyy'). All rights reserved."
    }

    # --- Core Application Paths ---
    # All paths are relative to the project root.
    Paths = @{
        ProjectRoot        = '..' # Relative from this file's location
        SourceDirectory    = 'src'
        ScriptsDirectory   = 'scripts'
        DataDirectory      = 'data'
        LogsDirectory      = 'logs'
        ConfigDirectory    = 'config'
        CloudDirectory     = 'cloud'
        DeployDirectory    = 'deploy'
        WindowsDeploy      = 'deploy/windows'
        EngineDirectory    = 'deploy/windows/engine'
        ModulesDirectory   = 'deploy/windows/modules'
        RequirementsFile   = 'requirements.txt'
        PyProjectFile      = 'pyproject.toml'
        UserPreferences    = 'config/user_prefs.json'
        DatabaseFile       = 'data/job_database.db'
        AgentScript        = 'src/agent.py'
        QueryScript        = 'scripts/query_db.py'
        SetupWizardScript  = 'scripts/setup_wizard.py'
    }

    # --- External Dependencies ---
    Dependencies = @{
        Python = @{
            MinVersion  = [version]'3.12.0'
            RecVersion  = '3.12.10'
            DownloadUrl = 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe'
            SHA256      = 'c3a526c6a84353c8633f01add54abe584535048303455150591e3e9ad884b424'
            InstallArgs = '/quiet InstallAllUsers=0 PrependPath=1 Include_test=0'
        }
        Gcloud = @{
            DownloadUrl      = 'https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe'
            InstallArgsUser  = '/S /noreporting'
            InstallArgsAdmin = '/S /allusers /noreporting'
        }
    }

    # --- GitHub Repository ---
    Repository = @{
        Owner    = 'cboyd0319'
        Name     = 'job-private-scraper-filter'
        ApiUrl   = 'https://api.github.com/repos/cboyd0319/job-private-scraper-filter'
        ZipUrl   = 'https://github.com/cboyd0319/job-private-scraper-filter/archive/refs/heads/main.zip'
    }

    # --- Installer & Uninstaller ---
    Installer = @{
        StateFile      = 'installer-state.json'
        CrashLogFile   = 'installer-crash.log'
        UninstallLog   = 'job-finder-uninstall.log'
        CacheDirectory = 'job-finder-cache'
        TempPrefix     = 'job-finder-temp'
    }

    # --- UI & Branding ---
    UI = @{
        # Based on "Calm & Collected" aesthetic
        # High-contrast, accessible colors.
        Colors = @{
            Primary      = '#4C8BF5' # Vivid Blue
            Accent       = '#22C55E' # Strong Green
            Error        = '#EF4444' # Bright Red
            Warning      = '#F59E0B' # Amber
            Success      = '#10B981' # Emerald
            Text         = '#1F2937' # Cool Gray 900
            Muted        = '#6B7280' # Cool Gray 500
            Background   = '#F9FAFB' # Cool Gray 50
            ButtonText   = '#FFFFFF' # White
        }
        # Unicode symbols for status indicators
        Symbols = @{
            Success      = '✓'
            Error        = '✗'
            Warning      = '⚠'
            Info         = '→'
            Progress     = '•'
        }
    }

    # --- Telemetry (Privacy-First) ---
    Telemetry = @{
        Enabled          = $true
        LocalOnly        = $true # IMPORTANT: No data is ever sent externally.
        EventFile        = 'job-finder-telemetry.jsonl'
        DataRetentionDays = 90
    }

    # --- Timeouts (in seconds) ---
    Timeouts = @{
        DownloadPython  = 300 # 5 minutes
        DownloadGcloud  = 600 # 10 minutes
        InstallPython   = 180 # 3 minutes
        InstallGcloud   = 300 # 5 minutes
        PythonBootstrap = 600 # 10 minutes
        WebRequest      = 30  # 30 seconds
    }
}

# --- Helper Functions ---

function Get-JobFinderConfig {
    <#
    .SYNOPSIS
        Retrieves a configuration value using a dot-notation path.
    .PARAMETER Path
        The dot-notation path to the configuration value (e.g., "Product.Version").
    .PARAMETER DefaultValue
        A default value to return if the path is not found.
    .EXAMPLE
        $version = Get-JobFinderConfig -Path "Product.Version"
    .EXAMPLE
        $timeout = Get-JobFinderConfig -Path "Timeouts.NonExistent" -DefaultValue 60
    #>
    [CmdletBinding()]
    [OutputType([object])]
    param(
        [Parameter(Mandatory)]
        [string]$Path,
        [object]$DefaultValue = $null
    )
    $parts = $Path -split '\.'
    $current = $script:JobFinderConfig

    foreach ($part in $parts) {
        if ($current -is [hashtable] -and $current.ContainsKey($part)) {
            $current = $current[$part]
        }
        else {
            if ($PSBoundParameters.ContainsKey('DefaultValue')) {
                return $DefaultValue
            }
            Write-Error "Configuration path not found: '$Path'. No default value was provided."
            return $null
        }
    }
    return $current
}

function Get-ProjectRoot {
    <#
    .SYNOPSIS
        Gets the absolute path to the project root directory.
    .DESCRIPTION
        This function reliably finds the project root by traversing up from the
        current script's location until it finds a directory containing the
        'pyproject.toml' file. This makes other path lookups robust.
    .OUTPUTS
        [string] The absolute path to the project root.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param()

    # Memoization for performance: store the result in a script-level variable.
    if ($script:ProjectRootPath) {
        return $script:ProjectRootPath
    }

    $currentDir = $PSScriptRoot
    while ($currentDir -and (Split-Path -Path $currentDir -Parent) -ne $currentDir) {
        if (Test-Path -Path (Join-Path -Path $currentDir -ChildPath 'pyproject.toml') -PathType Leaf) {
            $script:ProjectRootPath = $currentDir
            return $currentDir
        }
        if (Test-Path -Path (Join-Path -Path $currentDir -ChildPath '.git') -PathType Container) {
            $script:ProjectRootPath = $currentDir
            return $currentDir
        }
        $currentDir = Split-Path -Path $currentDir -Parent
    }

    throw "Could not determine the project root. The 'pyproject.toml' file was not found in any parent directory."
}


function Get-ProjectPath {
    <#
    .SYNOPSIS
        Constructs an absolute path to a file or directory within the project.
    .PARAMETER RelativePath
        The path relative to the project root (e.g., "src/agent.py").
    .EXAMPLE
        $logDir = Get-ProjectPath -RelativePath (Get-JobFinderConfig -Path "Paths.LogsDirectory")
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory)]
        [string]$RelativePath
    )
    try {
        $projectRoot = Get-ProjectRoot
        $fullPath = Join-Path -Path $projectRoot -ChildPath $RelativePath
        return (Resolve-Path -Path $fullPath -ErrorAction Stop).Path
    }
    catch {
        Write-Error "Could not resolve project path for '$RelativePath'. Error: $($_.Exception.Message)"
        return $null
    }
}

# --- Export Members ---
Export-ModuleMember -Variable JobFinderConfig
Export-ModuleMember -Function Get-JobFinderConfig, Get-ProjectRoot, Get-ProjectPath