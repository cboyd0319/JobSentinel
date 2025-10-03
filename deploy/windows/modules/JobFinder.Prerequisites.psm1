<#
.SYNOPSIS
    Prerequisites checking module for Job Finder
.DESCRIPTION
    Detects and validates required dependencies (Python, gcloud, etc.)
#>

Set-StrictMode -Version Latest

function Test-PythonInstalled {
    <#
    .SYNOPSIS
        Check if Python is installed and accessible
    .OUTPUTS
        Boolean indicating if Python is available
    .EXAMPLE
        if (Test-PythonInstalled) { ... }
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param()

    try {
        $pythonCmd = Get-Command python -ErrorAction Stop
        Write-Verbose "Python found at: $($pythonCmd.Source)"
        return $true
    } catch {
        Write-Verbose "Python not found in PATH"
        return $false
    }
}

function Get-PythonVersion {
    <#
    .SYNOPSIS
        Get installed Python version
    .OUTPUTS
        Version object or $null if not found
    .EXAMPLE
        $ver = Get-PythonVersion
    #>
    [CmdletBinding()]
    [OutputType([version])]
    param()

    if (-not (Test-PythonInstalled)) {
        return $null
    }

    try {
        $versionOutput = & python --version 2>&1
        if ($versionOutput -match 'Python (\d+\.\d+\.\d+)') {
            $version = [version]$matches[1]
            Write-Verbose "Python version: $version"
            return $version
        }
    } catch {
        Write-Verbose "Failed to get Python version: $_"
    }

    return $null
}

function Test-PythonVersion {
    <#
    .SYNOPSIS
        Check if Python version meets minimum requirement
    .PARAMETER MinVersion
        Minimum required version (e.g., "3.12.0")
    .OUTPUTS
        Boolean indicating if version requirement is met
    .EXAMPLE
        Test-PythonVersion -MinVersion "3.12.0"
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)]
        [version]$MinVersion
    )

    $installedVersion = Get-PythonVersion
    if ($null -eq $installedVersion) {
        Write-Verbose "Python not installed"
        return $false
    }

    $meets = $installedVersion -ge $MinVersion
    Write-Verbose "Python $installedVersion $(if ($meets) {'meets'} else {'does not meet'}) minimum $MinVersion"
    return $meets
}

function Test-GcloudInstalled {
    <#
    .SYNOPSIS
        Check if Google Cloud SDK is installed
    .OUTPUTS
        Boolean indicating if gcloud is available
    .EXAMPLE
        if (Test-GcloudInstalled) { ... }
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param()

    try {
        $gcloudCmd = Get-Command gcloud -ErrorAction Stop
        Write-Verbose "gcloud found at: $($gcloudCmd.Source)"
        return $true
    } catch {
        Write-Verbose "gcloud not found in PATH"
        return $false
    }
}

function Get-GcloudVersion {
    <#
    .SYNOPSIS
        Get installed gcloud version
    .OUTPUTS
        Version string or $null if not found
    .EXAMPLE
        $ver = Get-GcloudVersion
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param()

    if (-not (Test-GcloudInstalled)) {
        return $null
    }

    try {
        $versionOutput = & gcloud version --format="value(core-version)" 2>&1 | Select-Object -First 1
        Write-Verbose "gcloud version: $versionOutput"
        return $versionOutput.Trim()
    } catch {
        Write-Verbose "Failed to get gcloud version: $_"
        return $null
    }
}

function Test-GitInstalled {
    <#
    .SYNOPSIS
        Check if Git is installed
    .OUTPUTS
        Boolean indicating if Git is available
    .EXAMPLE
        if (Test-GitInstalled) { ... }
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param()

    try {
        $gitCmd = Get-Command git -ErrorAction Stop
        Write-Verbose "Git found at: $($gitCmd.Source)"
        return $true
    } catch {
        Write-Verbose "Git not found in PATH"
        return $false
    }
}

function Get-PrerequisitesSummary {
    <#
    .SYNOPSIS
        Get summary of all prerequisites
    .OUTPUTS
        Hashtable with prerequisite status
    .EXAMPLE
        $summary = Get-PrerequisitesSummary
    #>
    [CmdletBinding()]
    [OutputType([hashtable])]
    param()

    $summary = @{
        Python = @{
            Installed = Test-PythonInstalled
            Version = Get-PythonVersion
        }
        Gcloud = @{
            Installed = Test-GcloudInstalled
            Version = Get-GcloudVersion
        }
        Git = @{
            Installed = Test-GitInstalled
        }
    }

    return $summary
}

function Assert-Prerequisites {
    <#
    .SYNOPSIS
        Assert that all required prerequisites are met
    .PARAMETER RequirePython
        Require Python to be installed
    .PARAMETER RequireGcloud
        Require gcloud to be installed
    .PARAMETER MinPythonVersion
        Minimum Python version required
    .EXAMPLE
        Assert-Prerequisites -RequirePython -MinPythonVersion "3.12.0"
    #>
    [CmdletBinding()]
    param(
        [switch]$RequirePython,
        [switch]$RequireGcloud,
        [version]$MinPythonVersion = "3.12.0"
    )

    $missing = @()

    if ($RequirePython) {
        if (-not (Test-PythonInstalled)) {
            $missing += "Python $MinPythonVersion or higher"
        } elseif (-not (Test-PythonVersion -MinVersion $MinPythonVersion)) {
            $installedVer = Get-PythonVersion
            $missing += "Python $MinPythonVersion or higher (found: $installedVer)"
        }
    }

    if ($RequireGcloud -and -not (Test-GcloudInstalled)) {
        $missing += "Google Cloud SDK (gcloud)"
    }

    if ($missing.Count -gt 0) {
        $errorMessage = "Missing required prerequisites:`n" + ($missing | ForEach-Object { "  - $_" } | Out-String)
        Write-Error $errorMessage
        throw $errorMessage
    }

    Write-Verbose "All required prerequisites are satisfied"
}

Export-ModuleMember -Function @(
    'Test-PythonInstalled',
    'Get-PythonVersion',
    'Test-PythonVersion',
    'Test-GcloudInstalled',
    'Get-GcloudVersion',
    'Test-GitInstalled',
    'Get-PrerequisitesSummary',
    'Assert-Prerequisites'
)
