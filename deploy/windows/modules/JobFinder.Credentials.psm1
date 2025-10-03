<#
.SYNOPSIS
    Manages credentials for the Job Finder suite.
.DESCRIPTION
    This module handles the secure storage and retrieval of credentials, primarily
    for Google Cloud Platform (GCP). It abstracts the underlying storage mechanism,
    which can be the Windows Credential Manager or gcloud's built-in auth.

    It prioritizes using existing `gcloud` sessions before falling back to other methods.
.NOTES
    Author: Gemini
    Version: 1.0.0
#>

Set-StrictMode -Version Latest

# --- Module Imports ---
try {
    Import-Module (Join-Path $PSScriptRoot '..\Config.ps1')
} catch {
    Write-Error "Could not load the configuration module. Credential management cannot proceed."
    return
}

# --- Constants ---
$GCP_CRED_TARGET = "JobFinder-GCP-Credential"

# --- Helper Functions ---

function Test-GcloudAuthenticated {
    <#
    .SYNOPSIS
        Checks if there is an active gcloud authentication session.
    .OUTPUTS
        [bool] True if authenticated, otherwise false.
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param()

    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        return $false
    }
    try {
        $account = & gcloud config get-value account 2>$null
        return -not [string]::IsNullOrWhiteSpace($account)
    } catch {
        return $false
    }
}

# --- Core Functions ---

function Get-GcpCredential {
    <#
    .SYNOPSIS
        Retrieves the current GCP user account email.
    .DESCRIPTION
        It attempts to find the credential in the following order:
        1. Active `gcloud` CLI session.
        2. Windows Credential Manager.
        3. Interactive login prompt (if specified).
    .PARAMETER Interactive
        If set, the user will be prompted to log in via browser if no credential is found.
    .OUTPUTS
        [string] The user's GCP account email.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [switch]$Interactive
    )

    # 1. Try gcloud auth first (most common for developers)
    if (Test-GcloudAuthenticated) {
        $account = & gcloud config get-value account 2>$null
        Write-Verbose "Found active gcloud account: $account"
        return $account
    }

    # 2. Try Windows Credential Manager
    $cred = Get-Credential -Target $GCP_CRED_TARGET -ErrorAction SilentlyContinue
    if ($cred) {
        Write-Verbose "Found credential in Windows Credential Manager."
        return $cred.UserName
    }

    # 3. Interactive fallback
    if ($Interactive) {
        Write-Host "No GCP credentials found. Please log in via your browser." -ForegroundColor Yellow
        if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
            throw "The Google Cloud SDK (gcloud) is not installed. Please run the installer first."
        }
        try {
            # The `--no-launch-browser` flag is useful for remote sessions, but for a GUI app,
            # launching the browser is more user-friendly.
            & gcloud auth login --launch-browser
            $account = & gcloud config get-value account 2>$null
            if ($account) {
                Write-Host "Successfully authenticated as: $account" -ForegroundColor Green
                # Persist this for next time
                Set-GcpCredential -AccountEmail $account
                return $account
            }
        } catch {
            throw "The gcloud authentication process failed. Error: $($_.Exception.Message)"
        }
    } else {
        throw "No GCP credentials found. Please run the installer with -Interactive or log in manually using 'gcloud auth login'."
    }
}

function Set-GcpCredential {
    <#
    .SYNOPSIS
        Stores a GCP account email securely in the Windows Credential Manager.
    .PARAMETER AccountEmail
        The GCP account email to store.
    #>
    [CmdletBinding(SupportsShouldProcess=$true)]
    param(
        [Parameter(Mandatory)]
        [string]$AccountEmail
    )

    if ($PSCmdlet.ShouldProcess($AccountEmail, "Store GCP credential in Windows Credential Manager")) {
        try {
            # The password here is a placeholder; the credential object is just a container.
            $securePassword = ConvertTo-SecureString -String "gcp-auth-token" -AsPlainText -Force
            $cred = New-Object System.Management.Automation.PSCredential($AccountEmail, $securePassword)
            
            # This cmdlet securely stores the credential.
            Set-Credential -Target $GCP_CRED_TARGET -Credential $cred

            Write-Verbose "Successfully stored credential for $AccountEmail."
            return $true
        } catch {
            Write-Error "Failed to store credential. Error: $($_.Exception.Message)"
            return $false
        }
    }
}

function Remove-GcpCredential {
    <#
    .SYNOPSIS
        Removes the stored GCP credential from the Windows Credential Manager.
    #>
    [CmdletBinding(SupportsShouldProcess=$true)]
    param()

    if ($PSCmdlet.ShouldProcess($GCP_CRED_TARGET, "Remove GCP credential from Windows Credential Manager")) {
        try {
            Remove-Credential -Target $GCP_CRED_TARGET -ErrorAction Stop
            Write-Verbose "Successfully removed stored GCP credential."
            return $true
        } catch {
            # It's common for this to fail if the credential doesn't exist, so we don't throw.
            Write-Verbose "Could not remove credential (it may not exist). Error: $($_.Exception.Message)"
            return $false
        }
    }
}

# --- Export Members ---
Export-ModuleMember -Function Get-GcpCredential, Set-GcpCredential, Remove-GcpCredential, Test-GcloudAuthenticated