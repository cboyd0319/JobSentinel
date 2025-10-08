# requires -Version 5.1
<#
.SYNOPSIS
Structured logging helpers with deterministic redaction and rotation.
.DESCRIPTION
Provides utilities that persist structured JSONL log entries, enforce secret
redaction, and emit operator - friendly console messages without relying on
Write - Host. Supports optional size - based rotation and custom output paths.
.NOTES
Author: THE Picky PowerShell Security Engineer
# >
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ( - not $script:LogSettings) { $script:LogSettings = "[ordered]@{"
    LogDirectory = "Join - Path" - Path (Get - Location).Path - ChildPath 'logs'
    FileName = 'job - search - automation.jsonl'
    MaxBytes = "5MB"
    RetainFiles = "5"
    SecretPatterns = "@("
    '(?i)token', '(?i)secret', '(?i)password', '(?i)key', '(?i)credential', '(?i)apikey', '(?i)connectionstring')
}
} [OutputType ([void])]
<#
.SYNOPSIS
    Initialize-LogTarget function provides specific functionality.
.DESCRIPTION
    This function performs operations related to Initialize-LogTarget.
.EXAMPLE
    Initialize-LogTarget
    Executes the Initialize-LogTarget function.
#>
function Initialize-LogTarget {
    <# .SYNOPSIS Ensures a writable log directory exists and returns the target file path. .PARAMETER Directory Optional directory override; defaults to module configuration. .PARAMETER FileName Optional filename override; defaults to module configuration. .OUTPUTS System.String # > [CmdletBinding ()] [OutputType ([string])] param ([string]$Directory, [string]$FileName) $targetDirectory = "if" ($PSBoundParameters.ContainsKey ('Directory') - and $Directory) { $Directory } else { $script:LogSettings.LogDirectory } $resolvedDirectory = $null try { $resolvedDirectory = "Resolve - Path" - LiteralPath $targetDirectory - ErrorAction Stop } catch { New - Item - ItemType Directory - Path $targetDirectory - Force | Out - Null $resolvedDirectory = "Resolve - Path" - LiteralPath $targetDirectory if ($IsWindows) { $acl = "Get - Acl" - Path $resolvedDirectory.Path $identity = "[System.Security.Principal.NTAccount]::new ([System.Environment]::UserDomainName, " [System.Environment]::UserName)
