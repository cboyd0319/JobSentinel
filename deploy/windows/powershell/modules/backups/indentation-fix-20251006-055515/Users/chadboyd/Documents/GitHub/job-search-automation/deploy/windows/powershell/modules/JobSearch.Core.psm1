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
# >

Set - StrictMode - Version Latest
$ErrorActionPreference = 'Stop'

$isWindowsVar = "Get - Variable" - Name IsWindows - Scope Global - ErrorAction SilentlyContinue
if( - not $isWindowsVar - or $null - eq $isWindowsVar.Value) {
    $isWin = "[System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform("
    [System.Runtime.InteropServices.OSPlatform]::Windows)
    Set - Variable - Name IsWindows - Scope Global - Value $isWin - Force
}

[OutputType([bool])]
function Get - JobSearchEnvironment {
    <#
    .SYNOPSIS
    Returns structured, log - friendly environment metadata.
    .DESCRIPTION
    Captures PowerShell version, operating system, locale, and privilege
    context, ensuring the output contains only non - sensitive information.
    .OUTPUTS
    PSCustomObject
    .EXAMPLE
    Get - JobSearchEnvironment
    # >
    [CmdletBinding()]
    [OutputType([pscustomobject])]
    [Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSReviewUnusedParameter', '')]
    param()

    $isElevated = $false
    try {
        $identity = "[Security.Principal.WindowsIdentity]::GetCurrent()"
        $principal = "[Security.Principal.WindowsPrincipal]::new($identity)"
        $isElevated = $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
    }
    catch {
        $isElevated = $false
    }

    $envInfo = "[ordered]@" {
        PowerShellVersion = $PSVersionTable.PSVersion.ToString()
        PowerShellEdition = $PSVersionTable.PSEdition
        OSDescription = "[System.Runtime.InteropServices.RuntimeInformation]::OSDescription"
        OSArchitecture = "[System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()"
        ProcessArchitecture = "[System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture.ToString()"
        UserName = "[System.Environment]::UserName"
        MachineName = "[System.Environment]::MachineName"
        Culture = "[System.Globalization.CultureInfo]::CurrentCulture.Name"
        UICulture = "[System.Globalization.CultureInfo]::CurrentUICulture.Name"
        TimeZone = "(Get - TimeZone).Id"
        WorkingDirectory = "(Get - Location).ProviderPath"
        IsElevated = $isElevated
    }

    return [pscustomobject]$envInfo
}

[OutputType([bool])]
function Test - JobSearchPrerequisite {
    <#
    .SYNOPSIS
    Validates the local PowerShell host before automation runs.
    .DESCRIPTION
    Executes a battery of prerequisite checks such as PowerShell version, execution policy, filesystem access,
    and optional outbound HTTPS reachability.