<#
.SYNOPSIS
    Provides functions for detecting and validating required dependencies.
.DESCRIPTION
    This module is responsible for checking for the presence and version of
    external tools required by the Job Finder suite, such as Python, gcloud, and Git.

    It is used by the installer and deployment scripts to ensure the environment is correctly set up.
.NOTES
    Author: Gemini
    Version: 1.0.0
#>

Set-StrictMode -Version Latest

# --- Module Imports ---
try {
    Import-Module (Join-Path $PSScriptRoot '..\Config.ps1')
} catch {
    Write-Error "Could not load the configuration module. Prerequisite checks may not work correctly."
    return
}

# --- Detection Functions ---

function Test-CommandExists {
    [CmdletBinding()]
    [OutputType([bool])]
    param([string]$CommandName)
    return $null -ne (Get-Command $CommandName -ErrorAction SilentlyContinue)
}

# --- Python Functions ---

function Get-PythonVersion {
    [CmdletBinding()]
    [OutputType([version])]
    param()

    if (-not (Test-CommandExists -CommandName 'python')) { return $null }

    try {
        $versionOutput = & python --version 2>&1
        if ($versionOutput -match 'Python (\d+\.\d+\.\d+)') {
            return [version]$matches[1]
        }
    } catch {
        Write-Verbose "Failed to parse Python version. Error: $($_.Exception.Message)"
    }
    return $null
}

function Test-PythonVersion {
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)]
        [version]$MinVersion
    )
    $installedVersion = Get-PythonVersion
    if (-not $installedVersion) { return $false }
    return $installedVersion -ge $MinVersion
}

# --- Gcloud Functions ---

function Get-GcloudVersion {
    [CmdletBinding()]
    [OutputType([version])]
    param()

    if (-not (Test-CommandExists -CommandName 'gcloud')) { return $null }

    try {
        $versionOutput = & gcloud version --format="value(core.version)" 2>&1 | Select-Object -First 1
        return [version]$versionOutput.Trim()
    } catch {
        Write-Verbose "Failed to parse gcloud version. Error: $($_.Exception.Message)"
    }
    return $null
}

# --- Assertion Functions ---

function Assert-Prerequisites {
    <#
    .SYNOPSIS
        Checks for required prerequisites and throws a terminating error if they are not met.
    .PARAMETER RequirePython
        If set, the function will fail if Python is not installed.
    .PARAMETER RequireGcloud
        If set, the function will fail if the Google Cloud SDK is not installed.
    .PARAMETER MinPythonVersion
        Specifies the minimum required version of Python.
    #>
    [CmdletBinding()]
    param(
        [switch]$RequirePython,
        [switch]$RequireGcloud,
        [version]$MinPythonVersion = (Get-JobFinderConfig -Path "Dependencies.Python.MinVersion")
    )

    $missingItems = [System.Collections.Generic.List[string]]::new()

    if ($RequirePython) {
        if (-not (Test-CommandExists -CommandName 'python')) {
            $missingItems.Add("Python $($MinPythonVersion) or higher")
        } elseif (-not (Test-PythonVersion -MinVersion $MinPythonVersion)) {
            $installed = Get-PythonVersion
            $missingItems.Add("Python version $($MinPythonVersion) or higher (found: $installed)")
        }
    }

    if ($RequireGcloud -and -not (Test-CommandExists -CommandName 'gcloud')) {
        $missingItems.Add("Google Cloud SDK (gcloud)")
    }

    if ($missingItems.Count -gt 0) {
        $errorMessage = "Missing required prerequisites:`n" + ($missingItems | ForEach-Object { "  - $_" } | Out-String)
        throw $errorMessage
    }

    Write-Verbose "All required prerequisites are satisfied."
}

# --- Export Members ---
Export-ModuleMember -Function Test-CommandExists, Get-PythonVersion, Test-PythonVersion, Get-GcloudVersion, Assert-Prerequisites