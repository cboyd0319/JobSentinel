<#!
.SYNOPSIS
  PowerShell wrapper for the Python ATS analyzer CLI (Alpha).

.DESCRIPTION
  Provides a Windows-friendly entrypoint that proxies to scripts/ats_cli.py.
  Assumes Python is available on PATH and project dependencies installed.

.EXAMPLES
  # Human summary
  ./scripts/ats_cli.ps1 scan -Resume .\resume.txt -Job .\jd.txt -Fuzzy

  # JSON output redirected
  ./scripts/ats_cli.ps1 json -Resume .\resume.txt | Out-File result.json

.PARAMETER Command
  Subcommand: scan | json
.PARAMETER Resume
  Path to plain-text resume file.
.PARAMETER Job
  (Optional) Path to job description file.
.PARAMETER Fuzzy
  Switch to enable fuzzy matching (needs rapidfuzz installed).

.NOTES
  This wrapper passes parameters through to the Python script. Use `pip install -e .[dev,resume]` first.
#>
param(
  [Parameter(Mandatory=$true, Position=0)][ValidateSet('scan','json')] [string]$Command,
  [Parameter(Mandatory=$true)] [string]$Resume,
  [Parameter(Mandatory=$false)] [string]$Job,
  [switch]$Fuzzy
)

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  Write-Error "Python not found on PATH. Install Python 3.11+ and retry."; exit 1
}

$scriptPath = Join-Path $PSScriptRoot 'ats_cli.py'
if (-not (Test-Path $scriptPath)) {
  Write-Error "ats_cli.py not found at $scriptPath"; exit 1
}

$argsList = @($scriptPath, $Command, '--resume', $Resume)
if ($Job) { $argsList += @('--job', $Job) }
if ($Fuzzy) { $argsList += '--fuzzy' }

python @argsList
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
