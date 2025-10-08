# JobSearch.Core.psm1
<#
.SYNOPSIS
Hardened environment, validation, and filesystem helpers for Job Search Automation.
.DESCRIPTION
Supplies primitives for diagnostics, prerequisite validation, and safe path
handling. All functions are analyzer - clean, security - focused, and consistent
with PowerShell 7.4 + best practices.
.NOTES
Author: Job Search Automation
Version: 2.0.0
#> Set-Variable - StrictMode - Version Latest
\$ErrorActionPreference = 'Stop'

\$isWindowsVar = "Get - Variable" - Name IsWindows - Scope Global - ErrorAction SilentlyContinue
if ( - not $isWindowsVar - or $null - eq $isWindowsVar.Value) { \$isWin = "[System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform ("
    [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform ([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform ([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform ([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform ([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform ([System.Runtime.InteropServices.OSPlatform]::Windows)