<#
.SYNOPSIS
    A safe and thorough uninstaller for the Job Finder suite.
.DESCRIPTION
    This script removes the Job Finder application and gives the user the option
    to also remove dependencies like Python and the Google Cloud SDK.

    It is designed to be clear, explicit, and leave the user's system in a clean state.
.NOTES
    Author: Gemini
    Version: 1.1.0
#>

[CmdletBinding(SupportsShouldProcess=$true, ConfirmImpact='High')]
param(
    [switch]$RemovePython,
    [switch]$RemoveGcloud,
    [switch]$KeepData,
    [switch]$Force
)

# --- Strict Mode & Initial Setup ---
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$PSScriptRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition

# --- Module Imports ---
try {
    Import-Module (Join-Path $PSScriptRoot 'Config.ps1')
} catch {
    Write-Error "Could not load the configuration module. Uninstallation cannot proceed safely."
    exit 1
}

# --- UI & Styling (Minimal) ---
$useColor = ($null -eq $env:NO_COLOR) -and $Host.UI.SupportsVirtualTerminal
$colors = (Get-JobFinderConfig -Path "UI.Colors")

function Format-ColorText {
    param([string]$Text, [string]$ColorName)
    $colorCode = $colors[$ColorName]
    if (-not $useColor -or -not $colorCode) { return $Text }
    return "`e[1;${colorCode}m${Text}`e[0m"
}

# --- Logging ---
$logFile = Join-Path $env:TEMP (Get-JobFinderConfig -Path "Installer.UninstallLog")
function Write-Log {
    param([string]$Message, [string]$Level = 'Info')
    "[$(Get-Date -Format 'u')] [$Level] $Message" | Add-Content -Path $logFile
    Write-Host (Format-ColorText $Message $Level)
}

# --- Core Uninstall Functions ---

function Invoke-UninstallFromRegistry {
    [CmdletBinding(SupportsShouldProcess=$true)]
    param(
        [Parameter(Mandatory)]
        [string]$ApplicationName
    )

    $UninstallPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"
    )

    Write-Log -Message "Searching for '$ApplicationName' in the registry..." -Level 'Info'
    $app = $null
    foreach ($path in $UninstallPaths) {
            $app = Get-ItemProperty -Path "$path\*" -ErrorAction SilentlyContinue | Where-Object {
                $_.DisplayName -like "*$ApplicationName*" -and $_.UninstallString
            } | Select-Object -First 1
        
            if ($app -and $app.InstallLocation) {
                if ($app.UninstallString -notlike "$($app.InstallLocation)*") {
                    Write-Log -Message "Uninstall string for '$($app.DisplayName)' does not match its installation location. Skipping for safety." -Level 'Warn'
                    $app = $null
                }
            }
        
            if ($app) { break }    }

    if (-not $app) {
        Write-Log -Message "Could not find uninstall information for '$ApplicationName'. It may need to be removed manually from 'Add or Remove Programs'." -Level 'Warn'
        return
    }

    $uninstallCommand = $app.UninstallString
    Write-Log -Message "Found uninstall command: $uninstallCommand" -Level 'Info'

    # Standardize silent uninstall arguments
    if ($uninstallCommand -match 'msiexec.exe') {
        $uninstallCommand = $uninstallCommand -replace '/I\{?,*\}?', '/X' # Replace /I with /X for uninstall
        if ($uninstallCommand -notmatch '/qn') { $uninstallCommand += ' /qn /norestart' }
    } else {
        # For non-MSI installers, silent flags are not standard. We can try common ones.
        if ($uninstallCommand -notmatch '(/S|/silent|/quiet)') {
            $uninstallCommand += ' /S' # A common switch for many installers (e.g., NSIS, Inno Setup)
        }
    }

    if ($PSCmdlet.ShouldProcess($app.DisplayName, "Uninstall")) {
        try {
            Write-Log -Message "Executing: $uninstallCommand" -Level 'Info'
            $process = Start-Process -FilePath cmd.exe -ArgumentList "/c $uninstallCommand" -Wait -PassThru -WindowStyle Hidden
            if ($process.ExitCode -eq 0) {
                Write-Log -Message "Successfully executed uninstaller for '$($app.DisplayName)'." -Level 'Success'
            } else {
                # 1602 is user cancellation, which is not an error.
                if ($process.ExitCode -ne 1602) {
                    throw "Uninstaller for '$($app.DisplayName)' exited with error code: $($process.ExitCode)"
                }
            }
        } catch {
            Write-Log -Message "Failed to uninstall '$($app.DisplayName)'. Error: $($_.Exception.Message)" -Level 'Error'
        }
    }
}

function Remove-ApplicationFiles {
    # ... (Implementation from previous version) ...
}

function Confirm-Uninstall {
    if ($Force) { return $true }

    Write-Host ""
    Write-Host (Format-ColorText "=======================================" 'Cyan')
    Write-Host (Format-ColorText " Job Finder Uninstallation" 'Cyan')
    Write-Host (Format-ColorText "=======================================" 'Cyan')
    Write-Host ""
    Write-Host "This will remove the Job Finder application files."

    if (-not $KeepData) {
        Write-Host (Format-ColorText "  - All user data (database, logs, and configuration) will be permanently deleted." 'Yellow')
    } else {
        Write-Host (Format-ColorText "  - User data will be preserved." 'Green')
    }

    if ($RemovePython) {
        Write-Host (Format-ColorText "[WARNING] You have chosen to remove Python. This may affect other applications that rely on it." 'Red')
    }

    if ($RemoveGcloud) {
        Write-Host (Format-ColorText "[WARNING] You have chosen to remove the Google Cloud SDK. This may affect other applications that rely on it." 'Red')
    }

    Write-Host ""
    try {
        $response = Read-Host -Prompt (Format-ColorText "Are you sure you want to continue? (y/n)" 'Green')
        return $response -eq 'y'
    } catch {
        return $false # User pressed Ctrl+C
    }
}

# ... Other removal functions (ScheduledTasks, DesktopShortcut) ...

# --- Main Execution ---

if (-not (Confirm-Uninstall)) {
    Write-Host (Format-ColorText "Uninstallation cancelled by user." 'Yellow')
    exit 0
}

Write-Log -Message "=== Job Finder Uninstallation Started ===" -Level 'Info'

try {
    # ... (Call other removal functions) ...

    if ($RemovePython) {
        $pyVersion = (Get-JobFinderConfig -Path "Dependencies.Python.RecVersion").Substring(0,4)
        Invoke-UninstallFromRegistry -ApplicationName "Python $pyVersion"
    } else {
        Write-Log -Message "Skipping Python uninstallation. Use the -RemovePython flag to remove it." -Level 'Info'
    }

    if ($RemoveGcloud) {
        Invoke-UninstallFromRegistry -ApplicationName "Google Cloud SDK"
    } else {
        Write-Log -Message "Skipping Google Cloud SDK uninstallation. Use the -RemoveGcloud flag to remove it." -Level 'Info'
    }

    # ... (Summary) ...

} catch {
    # ... (Error handling) ...
}
