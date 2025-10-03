<#
.SYNOPSIS
    Credential management module for Job Finder
.DESCRIPTION
    Handles secure credential storage and retrieval using Windows DPAPI
    and Google Cloud authentication
#>

Set-StrictMode -Version Latest

function Get-GcpCredentials {
    <#
    .SYNOPSIS
        Retrieves GCP credentials for cloud deployment
    .PARAMETER Interactive
        Prompt for credentials if not found
    .EXAMPLE
        $creds = Get-GcpCredentials -Interactive
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [switch]$Interactive
    )

    # Try gcloud auth first
    if (Get-Command gcloud -ErrorAction SilentlyContinue) {
        try {
            $account = & gcloud config get-value account 2>$null
            if ($account -and -not [string]::IsNullOrWhiteSpace($account)) {
                Write-Verbose "Found gcloud account: $account"
                return $account
            }
        } catch {
            Write-Verbose "gcloud auth check failed: $_"
        }
    }

    # Try Windows Credential Manager
    try {
        $cred = Get-StoredCredential -Target "job-finder-gcp" -ErrorAction SilentlyContinue
        if ($cred) {
            Write-Verbose "Found credentials in Windows Credential Manager"
            return $cred.UserName
        }
    } catch {
        Write-Verbose "Credential Manager check failed: $_"
    }

    # Interactive fallback
    if ($Interactive) {
        Write-Host "No GCP credentials found. Launching browser authentication..." -ForegroundColor Yellow

        if (Get-Command gcloud -ErrorAction SilentlyContinue) {
            try {
                & gcloud auth login --no-launch-browser
                $account = & gcloud config get-value account 2>$null
                if ($account) {
                    Write-Host "Successfully authenticated as: $account" -ForegroundColor Green
                    return $account
                }
            } catch {
                Write-Error "gcloud auth login failed: $_"
            }
        } else {
            throw "gcloud command not found. Install Google Cloud SDK first."
        }
    } else {
        throw "No GCP credentials found. Run with -Interactive or execute: gcloud auth login"
    }
}

function Set-StoredGcpCredential {
    <#
    .SYNOPSIS
        Store GCP account in Windows Credential Manager
    .PARAMETER AccountEmail
        GCP account email
    .EXAMPLE
        Set-StoredGcpCredential -AccountEmail "user@example.com"
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)]
        [string]$AccountEmail
    )

    if ($PSCmdlet.ShouldProcess($AccountEmail, "Store GCP credential")) {
        try {
            # Store in Windows Credential Manager
            $securePassword = ConvertTo-SecureString -String "gcp-auth-token" -AsPlainText -Force
            $cred = New-Object System.Management.Automation.PSCredential($AccountEmail, $securePassword)

            # Use cmdkey to store credential
            $target = "job-finder-gcp"
            & cmdkey /generic:$target /user:$AccountEmail /pass:"gcp-auth-token" | Out-Null

            Write-Verbose "Stored GCP credential for $AccountEmail"
            return $true
        } catch {
            Write-Error "Failed to store credential: $_"
            return $false
        }
    }
}

function Remove-StoredGcpCredential {
    <#
    .SYNOPSIS
        Remove GCP credentials from Windows Credential Manager
    .EXAMPLE
        Remove-StoredGcpCredential
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param()

    $target = "job-finder-gcp"

    if ($PSCmdlet.ShouldProcess($target, "Remove credential")) {
        try {
            & cmdkey /delete:$target 2>$null | Out-Null
            Write-Verbose "Removed GCP credential"
            return $true
        } catch {
            Write-Verbose "No credential to remove or removal failed: $_"
            return $false
        }
    }
}

function Test-GcpAuthenticated {
    <#
    .SYNOPSIS
        Check if user is authenticated with GCP
    .OUTPUTS
        Boolean indicating authentication status
    .EXAMPLE
        if (Test-GcpAuthenticated) { ... }
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param()

    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        Write-Verbose "gcloud command not found"
        return $false
    }

    try {
        $account = & gcloud config get-value account 2>$null
        $result = -not [string]::IsNullOrWhiteSpace($account)
        Write-Verbose "GCP authentication status: $result (Account: $account)"
        return $result
    } catch {
        Write-Verbose "Failed to check GCP authentication: $_"
        return $false
    }
}

Export-ModuleMember -Function @(
    'Get-GcpCredentials',
    'Set-StoredGcpCredential',
    'Remove-StoredGcpCredential',
    'Test-GcpAuthenticated'
)
