<#
.SYNOPSIS
    Input validation module for Job Finder
.DESCRIPTION
    Provides centralized validation functions for URLs, paths, and other inputs
#>

Set-StrictMode -Version Latest

function Test-ValidUrl {
    <#
    .SYNOPSIS
        Validates if a string is a properly formatted HTTP/HTTPS URL
    .PARAMETER Url
        The URL string to validate
    .OUTPUTS
        Boolean indicating if URL is valid
    .EXAMPLE
        Test-ValidUrl "https://example.com"
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory, ValueFromPipeline)]
        [AllowEmptyString()]
        [string]$Url
    )

    process {
        if ([string]::IsNullOrWhiteSpace($Url)) {
            return $false
        }

        try {
            $uri = [System.Uri]$Url
            $isValid = $uri.Scheme -in @('http', 'https') -and -not [string]::IsNullOrWhiteSpace($uri.Host)
            Write-Verbose "URL validation for '$Url': $isValid"
            return $isValid
        } catch {
            Write-Verbose "URL validation failed for '$Url': $_"
            return $false
        }
    }
}

function Test-SafePath {
    <#
    .SYNOPSIS
        Validates that a path is within an allowed base directory
    .PARAMETER Path
        The path to validate
    .PARAMETER AllowedBasePath
        The base directory that Path must be within
    .OUTPUTS
        Boolean indicating if path is safe
    .EXAMPLE
        Test-SafePath -Path "C:\App\config\file.json" -AllowedBasePath "C:\App"
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
        # Resolve to absolute paths
        $resolvedPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Path)
        $resolvedBase = (Resolve-Path $AllowedBasePath -ErrorAction Stop).Path

        # Check if path starts with base path (case-insensitive)
        $isValid = $resolvedPath.StartsWith($resolvedBase, [StringComparison]::OrdinalIgnoreCase)

        Write-Verbose "Path safety check: '$resolvedPath' within '$resolvedBase': $isValid"
        return $isValid
    } catch {
        Write-Verbose "Path validation failed: $_"
        return $false
    }
}

function Assert-FileExists {
    <#
    .SYNOPSIS
        Throws an error if a file does not exist
    .PARAMETER Path
        Path to the file
    .PARAMETER ErrorMessage
        Custom error message
    .EXAMPLE
        Assert-FileExists -Path "config.json" -ErrorMessage "Configuration file missing"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [string]$ErrorMessage = "Required file not found"
    )

    if (-not (Test-Path $Path)) {
        $fullMessage = "$ErrorMessage`nPath: $Path"
        Write-Error $fullMessage
        throw $fullMessage
    }

    Write-Verbose "File exists: $Path"
}

function Assert-DirectoryExists {
    <#
    .SYNOPSIS
        Throws an error if a directory does not exist
    .PARAMETER Path
        Path to the directory
    .PARAMETER ErrorMessage
        Custom error message
    .EXAMPLE
        Assert-DirectoryExists -Path "C:\Data" -ErrorMessage "Data directory missing"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [string]$ErrorMessage = "Required directory not found"
    )

    if (-not (Test-Path $Path -PathType Container)) {
        $fullMessage = "$ErrorMessage`nPath: $Path"
        Write-Error $fullMessage
        throw $fullMessage
    }

    Write-Verbose "Directory exists: $Path"
}

function Test-ValidEmailAddress {
    <#
    .SYNOPSIS
        Validates email address format
    .PARAMETER EmailAddress
        Email address to validate
    .OUTPUTS
        Boolean indicating if email is valid
    .EXAMPLE
        Test-ValidEmailAddress "user@example.com"
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory, ValueFromPipeline)]
        [AllowEmptyString()]
        [string]$EmailAddress
    )

    process {
        if ([string]::IsNullOrWhiteSpace($EmailAddress)) {
            return $false
        }

        try {
            $mailAddress = [System.Net.Mail.MailAddress]$EmailAddress
            $isValid = $mailAddress.Address -eq $EmailAddress
            Write-Verbose "Email validation for '$EmailAddress': $isValid"
            return $isValid
        } catch {
            Write-Verbose "Email validation failed for '$EmailAddress': $_"
            return $false
        }
    }
}

function Test-ValidVersion {
    <#
    .SYNOPSIS
        Validates semantic version string
    .PARAMETER Version
        Version string (e.g., "1.2.3")
    .OUTPUTS
        Boolean indicating if version is valid
    .EXAMPLE
        Test-ValidVersion "1.0.0"
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)]
        [string]$Version
    )

    try {
        [System.Version]::Parse($Version) | Out-Null
        Write-Verbose "Version string '$Version' is valid"
        return $true
    } catch {
        Write-Verbose "Version validation failed for '$Version': $_"
        return $false
    }
}

function Test-HasDirectoryTraversal {
    <#
    .SYNOPSIS
        Checks if a path contains directory traversal attempts
    .PARAMETER Path
        Path to check
    .OUTPUTS
        Boolean indicating if traversal detected
    .EXAMPLE
        Test-HasDirectoryTraversal "../../etc/passwd"
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    # Check for various directory traversal patterns
    $patterns = @(
        '\.\.[/\\]',      # ../
        '[/\\]\.\.[/\\]', # /../
        '\.\.\\',          # ..\
        '\\\.\\',         # \.\
        '%2e%2e',         # URL encoded ..
        '%252e%252e'      # Double encoded ..
    )

    foreach ($pattern in $patterns) {
        if ($Path -match $pattern) {
            Write-Warning "Directory traversal detected in path: $Path (pattern: $pattern)"
            return $true
        }
    }

    Write-Verbose "No directory traversal detected in: $Path"
    return $false
}

Export-ModuleMember -Function @(
    'Test-ValidUrl',
    'Test-SafePath',
    'Assert-FileExists',
    'Assert-DirectoryExists',
    'Test-ValidEmailAddress',
    'Test-ValidVersion',
    'Test-HasDirectoryTraversal'
)
