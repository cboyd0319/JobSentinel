<#
.SYNOPSIS
    Provides core security functions for the Job Finder suite.
.DESCRIPTION
    This module handles the encryption and decryption of sensitive data using the
    Windows Data Protection API (DPAPI). It ensures that secrets are encrypted
    at rest, scoped to the current user account, making them inaccessible to
    other users on the same machine.

    This is a fundamental part of the suite's security posture.
.NOTES
    Author: Gemini
    Version: 1.0.0
#>

Set-StrictMode -Version Latest

# --- Module-level Imports (if any were needed) ---
# Import-Module (Join-Path $PSScriptRoot '..\..\modules\JobFinder.Logging.psm1')

# --- Functions ---

function Protect-SecretString {
    <#
    .SYNOPSIS
        Encrypts a plaintext string using Windows DPAPI.
    .DESCRIPTION
        Takes a string, converts it to a byte array, and uses DPAPI to encrypt it.
        The encrypted data is then returned as a Base64-encoded string, which is safe
        for storage in configuration files.
    .PARAMETER PlainText
        The plaintext string to encrypt.
    .OUTPUTS
        [string] The Base64-encoded, encrypted string.
    .EXAMPLE
        $encrypted = "my-secret-password" | Protect-SecretString
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory, ValueFromPipeline)]
        [string]$PlainText
    )
    process {
        try {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($PlainText)
            # The entropy parameter (optional 3rd arg) could be used for added security,
            # but makes key management more complex. For now, relying on the user scope.
            $protectedBytes = [System.Security.Cryptography.ProtectedData]::Protect(
                $bytes,
                $null, # Optional entropy
                [System.Security.Cryptography.DataProtectionScope]::CurrentUser
            )
            return [Convert]::ToBase64String($protectedBytes)
        } catch {
            throw "Failed to encrypt secret. This can happen if the DPAPI service is not running or has malfunctioned. Error: $($_.Exception.Message)"
        }
    }
}

function Unprotect-SecretString {
    <#
    .SYNOPSIS
        Decrypts a DPAPI-encrypted, Base64-encoded string.
    .PARAMETER EncryptedBase64
        The Base64-encoded string to decrypt.
    .OUTPUTS
        [string] The original plaintext string.
    .EXAMPLE
        $plaintext = $encrypted | Unprotect-SecretString
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory, ValueFromPipeline)]
        [string]$EncryptedBase64
    )
    process {
        try {
            $protectedBytes = [Convert]::FromBase64String($EncryptedBase64)
            $bytes = [System.Security.Cryptography.ProtectedData]::Unprotect(
                $protectedBytes,
                $null, # Entropy used during encryption must be provided here
                [System.Security.Cryptography.DataProtectionScope]::CurrentUser
            )
            return [System.Text.Encoding]::UTF8.GetString($bytes)
        } catch {
            # This is a common and important error to catch.
            throw "Failed to decrypt secret. The secret may have been encrypted by a different user, on a different computer, or the user profile is corrupt. Error: $($_.Exception.Message)"
        }
    }
}

# --- Export Members ---
Export-ModuleMember -Function Protect-SecretString, Unprotect-SecretString