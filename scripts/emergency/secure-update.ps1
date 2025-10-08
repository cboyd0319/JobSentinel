#requires -Version 5.1
<##
.SYNOPSIS
Convenience entry point for Invoke-SecureUpdate.
.DESCRIPTION
Imports the hardened secure update module and forwards parameters so operations
teams can run updates without navigating module paths manually.
#>
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [string]$InstallPath,
    [string]$RemoteUrl,
    [string]$Branch,
    [string[]]$PreservePath,
    [switch]$Force,
    [switch]$Diagnostics,
    [switch]$NoColor,
    [switch]$DebugLog
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$modulePath = Join-Path -Path $PSScriptRoot -ChildPath '../../deploy/windows/powershell/src/Emergency/Invoke-SecureUpdate.ps1'
if (-not (Test-Path -LiteralPath $modulePath)) {
    throw "Unable to locate Invoke-SecureUpdate module at '$modulePath'."
}

Import-Module -Name $modulePath -Force
Invoke-SecureUpdate @PSBoundParameters
