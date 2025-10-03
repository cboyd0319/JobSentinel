<#
.SYNOPSIS
    Provides centralized input validation functions for the Job Finder suite.
.DESCRIPTION
    This module contains a set of robust functions for validating common data types
    like URLs, file paths, and email addresses. It is a key part of the suite's
    security and reliability, ensuring that user input and file operations are safe.
.NOTES
    Author: Gemini
    Version: 1.0.0
#>

Set-StrictMode -Version Latest

# --- Module Imports ---
try {
    Import-Module (Join-Path $PSScriptRoot '..\Config.ps1')
} catch {
    Write-Error "Could not load the configuration module. Validation functions may not work correctly."
    return
}

# --- Core Functions ---

function Test-ValidUrl {
    <#
    .SYNOPSIS
        Validates if a string is a well-formed HTTP or HTTPS URL.
    .OUTPUTS
        [bool] True if the URL is valid, otherwise false.
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory, ValueFromPipeline)]
        [string]$Url
    )
    process {
        if ([string]::IsNullOrWhiteSpace($Url)) { return $false }
        try {
            $uri = [System.Uri]$Url
            return $uri.Scheme -in @('http', 'https') -and -not [string]::IsNullOrWhiteSpace($uri.Host)
        } catch {
            return $false
        }
    }
}

function Test-SafePath {
    <#
    .SYNOPSIS
        Ensures that a given path is safely contained within an allowed base directory.
    .DESCRIPTION
        This is a critical security function to prevent directory traversal attacks.
        It resolves both paths to their absolute, canonical forms before comparison.
    .PARAMETER Path
        The path to validate.
    .PARAMETER AllowedBasePath
        The directory that the path must be a child of.
    .OUTPUTS
        [bool] True if the path is safe, otherwise false.
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)]
        [string]$Path,
        [Parameter(Mandatory)]
        [string]$AllowedBasePath
    )
    try {
        $resolvedPath = (Resolve-Path -LiteralPath $Path).Path
        $resolvedBase = (Resolve-Path -LiteralPath $AllowedBasePath).Path
        return $resolvedPath.StartsWith($resolvedBase, [System.StringComparison]::OrdinalIgnoreCase)
    } catch {
        # If paths can't be resolved, they are considered unsafe.
        return $false
    }
}

function Assert-FileExists {
    <#
    .SYNOPSIS
        Throws a terminating error if a file does not exist.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Path,
        [string]$ErrorMessage = "Required file not found at path: $Path"
    )
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw $ErrorMessage
    }
}

function Assert-DirectoryExists {
    <#
    .SYNOPSIS
        Throws a terminating error if a directory does not exist.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Path,
        [string]$ErrorMessage = "Required directory not found at path: $Path"
    )
    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        throw $ErrorMessage
    }
}

function Test-ValidEmail {
    <#
    .SYNOPSIS
        Performs a basic validation of an email address format.
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory, ValueFromPipeline)]
        [string]$EmailAddress
    )
    process {
        if ([string]::IsNullOrWhiteSpace($EmailAddress)) { return $false }
        try {
            $mail = [System.Net.Mail.MailAddress]$EmailAddress
            return $mail.Address -eq $EmailAddress
        } catch {
            return $false
        }
    }
}

# --- Export Members ---
Export-ModuleMember -Function Test-ValidUrl, Test-SafePath, Assert-FileExists, Assert-DirectoryExists, Test-ValidEmail