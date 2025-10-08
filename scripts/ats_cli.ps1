#requires -Version 5.1
<##
.SYNOPSIS
Operator-facing wrapper around Invoke-ATSAnalysis.
.DESCRIPTION
Imports the hardened ATS analysis module and forwards command-line arguments,
providing a simple entry point for technicians.
#>
[CmdletBinding(DefaultParameterSetName = 'Run', SupportsShouldProcess = $true, ConfirmImpact = 'Low')]
param(
    [Parameter(ParameterSetName = 'Run', Mandatory)][ValidateSet('scan', 'json')][string]$Command,
    [Parameter(ParameterSetName = 'Run', Mandatory)][ValidateNotNullOrEmpty()][string]$Resume,
    [Parameter(ParameterSetName = 'Run')][string]$Job,
    [Parameter(ParameterSetName = 'Run')][switch]$Fuzzy,
    [Parameter(ParameterSetName = 'Run')][string]$PythonPath,
    [Parameter(ParameterSetName = 'Diagnostics', Mandatory)][switch]$Diagnostics,
    [switch]$NoColor,
    [string]$LogPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$modulePath = Join-Path -Path $PSScriptRoot -ChildPath '../deploy/windows/powershell/src/Scripts/Invoke-ATSAnalysis.ps1'
if (-not (Test-Path -LiteralPath $modulePath)) {
    throw "Unable to locate Invoke-ATSAnalysis module at '$modulePath'."
}

Import-Module -Name $modulePath -Force
Invoke-ATSAnalysis @PSBoundParameters
