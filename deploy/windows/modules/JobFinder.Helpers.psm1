<#
.SYNOPSIS
    Provides common helper and utility functions for the Job Finder suite.
.DESCRIPTION
    This module contains a collection of reusable functions for tasks such as
    creating desktop shortcuts, checking for updates, and managing a local cache
    for installers. It is designed to be used by various components of the suite.
.NOTES
    Author: Gemini
    Version: 1.0.0
#>

Set-StrictMode -Version Latest

# --- Module Imports ---
try {
    Import-Module (Join-Path $PSScriptRoot '..\Config.ps1')
} catch {
    Write-Error "Could not load the configuration module. Helper functions may not work correctly."
    return
}

# --- Core Functions ---

function New-DesktopShortcut {
    <#
    .SYNOPSIS
        Creates or updates a desktop shortcut for the application.
    .PARAMETER Name
        The name of the shortcut file (e.g., "My Job Finder").
    .PARAMETER TargetPath
        The absolute path to the executable or script the shortcut should open.
    .PARAMETER Arguments
        Optional arguments to pass to the target.
    .PARAMETER IconLocation
        Optional path to an icon file (.ico) or a resource DLL.
    .EXAMPLE
        New-DesktopShortcut -Name "My Job Finder" -TargetPath "C:\Path\To\My-Job-Finder.ps1"
    #>
    [CmdletBinding(SupportsShouldProcess=$true)]
    param(
        [Parameter(Mandatory)]
        [string]$Name,
        [Parameter(Mandatory)]
        [string]$TargetPath,
        [string]$Arguments = "",
        [string]$IconLocation = "shell32.dll,21" # Default PowerShell icon
    )

    $shortcutPath = Join-Path ([System.Environment]::GetFolderPath('Desktop')) "$Name.lnk"
    if ($PSCmdlet.ShouldProcess($shortcutPath, "Create shortcut to '$TargetPath'")) {
        try {
            $shell = New-Object -ComObject WScript.Shell
            $shortcut = $shell.CreateShortcut($shortcutPath)

            # If the target is a PowerShell script, the actual target is powershell.exe
            if ($TargetPath -like '*.ps1') {
                $shortcut.TargetPath = "powershell.exe"
                $shortcut.Arguments = "-ExecutionPolicy Bypass -NoProfile -File `"$TargetPath`" $Arguments"
            } else {
                $shortcut.TargetPath = $TargetPath
                $shortcut.Arguments = $Arguments
            }

            $shortcut.WorkingDirectory = Split-Path $TargetPath -Parent
            $shortcut.IconLocation = $IconLocation
            $shortcut.Description = "Launches $Name"
            $shortcut.Save()

            Write-Verbose "Successfully created shortcut at $shortcutPath"
            return $shortcutPath
        } catch {
            Write-Error "Failed to create shortcut. Error: $($_.Exception.Message)"
            return $null
        } finally {
            if ($shell) {
                [System.Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null
            }
        }
    }
}

function Test-UpdateAvailable {
    <#
    .SYNOPSIS
        Checks GitHub for a newer release of the application.
    .DESCRIPTION
        Compares the current version (from config) with the tag of the latest
        release on GitHub. It has a short timeout to avoid delaying startup.
    .OUTPUTS
        [bool] True if a newer version is available, otherwise false.
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param()

    try {
        $repo = Get-JobFinderConfig -Path "Repository"
        $currentVersion = [version](Get-JobFinderConfig -Path "Product.Version")
        $apiUrl = "https://api.github.com/repos/$($repo.Owner)/$($repo.Name)/releases/latest"
        
        $release = Invoke-RestMethod -Uri $apiUrl -TimeoutSec (Get-JobFinderConfig -Path "Timeouts.WebRequest")

        if ($release.tag_name -match 'v?(\d+\.\d+\.\d+)') {
            $latestVersion = [version]$matches[1]
            $updateAvailable = $latestVersion -gt $currentVersion
            Write-Verbose "Current version: $currentVersion, Latest GitHub release: $latestVersion. Update available: $updateAvailable"
            return $updateAvailable
        }
    } catch {
        # This is not a critical failure; network issues are common.
        Write-Verbose "Could not check for updates. Error: $($_.Exception.Message)"
    }
    return $false
}

function Get-InstallerCachePath {
    <#
    .SYNOPSIS
        Gets the path to the installer cache directory and optionally creates it.
    .PARAMETER Create
        If set, the directory will be created if it does not exist.
    .OUTPUTS
        [string] The absolute path to the cache directory.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [switch]$Create
    )

    $cacheDir = Join-Path $env:TEMP (Get-JobFinderConfig -Path "Installer.CacheDirectory")
    if ($Create -and -not (Test-Path $cacheDir)) {
        New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
        Write-Verbose "Created installer cache directory: $cacheDir"
    }
    return $cacheDir
}

function Get-CachedInstaller {
    <#
    .SYNOPSIS
        Finds a cached installer and verifies its integrity via SHA256 hash.
    .PARAMETER Name
        The filename of the installer (e.g., "python-3.12.10.exe").
    .PARAMETER ExpectedHash
        The expected SHA256 hash of the file.
    .OUTPUTS
        [string] The path to the valid cached file, or $null if not found or invalid.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory)]
        [string]$Name,
        [Parameter(Mandatory)]
        [string]$ExpectedHash
    )

    $cachedFile = Join-Path (Get-InstallerCachePath) $Name
    if (Test-Path $cachedFile) {
        Write-Verbose "Found cached file: $cachedFile. Verifying hash..."
        $actualHash = (Get-FileHash $cachedFile -Algorithm SHA256).Hash
        if ($actualHash -eq $ExpectedHash) {
            Write-Host "Using valid cached installer for '$Name'." -ForegroundColor Green
            return $cachedFile
        } else {
            Write-Warning "Cached file '$Name' has an invalid hash. It will be re-downloaded."
            Remove-Item $cachedFile -Force -ErrorAction SilentlyContinue
        }
    }
    return $null
}

function Add-ToInstallerCache {
    <#
    .SYNOPSIS
        Adds a file to the installer cache.
    .PARAMETER SourcePath
        The path to the file to be cached.
    .PARAMETER TargetName
        The name to give the file in the cache.
    #>
    [CmdletBinding(SupportsShouldProcess=$true)]
    param(
        [Parameter(Mandatory)]
        [string]$SourcePath,
        [Parameter(Mandatory)]
        [string]$TargetName
    )

    $cacheDir = Get-InstallerCachePath -Create
    $destination = Join-Path $cacheDir $TargetName
    if ($PSCmdlet.ShouldProcess($destination, "Cache file '$SourcePath'")) {
        try {
            Copy-Item -Path $SourcePath -Destination $destination -Force
            Write-Verbose "Successfully cached '$TargetName'."
            return $destination
        } catch {
            Write-Warning "Could not cache file '$TargetName'. Error: $($_.Exception.Message)"
        }
    }
    return $null
}

# --- Export Members ---
Export-ModuleMember -Function New-DesktopShortcut, Test-UpdateAvailable, Get-InstallerCachePath, Get-CachedInstaller, Add-ToInstallerCache