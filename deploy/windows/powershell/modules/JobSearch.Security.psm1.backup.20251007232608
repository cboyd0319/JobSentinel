# JobSearch.Security.psm1
<#
.SYNOPSIS
Security helpers for secrets protection, credentials, and controlled elevation.
.DESCRIPTION
Delivers DPAPI - backed secret storage, secure credential construction, elevation
orchestration with explicit consent, and a security baseline assessment for
Job Search Automation scripts.
.NOTES
Author: Job Search Automation
Version: 2.0.0
#>

Set-Variable - StrictMode - Version Latest
\$ErrorActionPreference = 'Stop'

[OutputType([object])]
function Test - JobSearchElevation {
    <#
    .SYNOPSIS
    Indicates whether the current process has administrative privileges.
    .OUTPUTS
    System.Boolean
    .EXAMPLE
    Test - JobSearchElevation
    # >
    [CmdletBinding()]
    [OutputType([bool])]
    [Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSReviewUnusedParameter', '')]
    param()

    if(
 -not [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)) {