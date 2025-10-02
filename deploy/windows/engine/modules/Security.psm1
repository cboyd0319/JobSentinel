<#
.SYNOPSIS
    Security module for Windows Deploy
.DESCRIPTION
    Handles secrets via DPAPI, GCP Secret Manager, and secure logging.
#>

Set-StrictMode -Version Latest

function Protect-SecretString {
    <#
    .SYNOPSIS
        Encrypts a string using Windows DPAPI (CurrentUser scope).
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
            $protected = [System.Security.Cryptography.ProtectedData]::Protect(
                $bytes,
                $null,
                [System.Security.Cryptography.DataProtectionScope]::CurrentUser
            )
            return [Convert]::ToBase64String($protected)
        } catch {
            throw "Failed to encrypt secret: $_"
        }
    }
}

function Unprotect-SecretString {
    <#
    .SYNOPSIS
        Decrypts a DPAPI-encrypted, Base64-encoded string.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory, ValueFromPipeline)]
        [string]$EncryptedBase64
    )
    process {
        try {
            $bytes = [Convert]::FromBase64String($EncryptedBase64)
            $unprotected = [System.Security.Cryptography.ProtectedData]::Unprotect(
                $bytes,
                $null,
                [System.Security.Cryptography.DataProtectionScope]::CurrentUser
            )
            return [System.Text.Encoding]::UTF8.GetString($unprotected)
        } catch {
            throw "Failed to decrypt secret. It may have been encrypted by a different user or on a different machine. Error: $_"
        }
    }
}

Export-ModuleMember -Function Protect-SecretString, Unprotect-SecretString
