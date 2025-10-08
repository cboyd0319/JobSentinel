#!/usr/bin/env pwsh
<#
.SYNOPSIS
    PowerShell Quality Assurance - Root Entry Point
    
.DESCRIPTION
    Simple entry point that delegates to the consolidated QA tool.
    Replaces the bloated collection of 21+ scattered QA scripts.
    
.PARAMETER Mode  
    Operation mode: analyze, fix, report, health
    
.PARAMETER Path
    Path to analyze (defaults to current directory)
    
.PARAMETER Severity
    Minimum severity: Error, Warning, Information
    
.PARAMETER DryRun
    Preview fixes without applying them
    
.EXAMPLE
    ./psqa.ps1 -Mode analyze
    
.EXAMPLE  
    ./psqa.ps1 -Mode fix -Path ./scripts -DryRun
#>

[CmdletBinding()]
param(
    [Parameter()]
    [ValidateSet('analyze', 'fix', 'report', 'health')]
    [string]$Mode = 'analyze',
    
    [Parameter()]
    [string]$Path = '.',
    
    [Parameter()]
    [ValidateSet('Error', 'Warning', 'Information')]
    [string]$Severity = 'Warning',
    
    [Parameter()]
    [switch]$DryRun
)

$qaScript = Join-Path $PSScriptRoot "qa/tools/Invoke-PSQualityCheck.ps1"

if (-not (Test-Path $qaScript)) {
    Write-Error "QA tool not found at: $qaScript"
    Write-Host "Expected structure:" -ForegroundColor Yellow
    Write-Host "  qa/tools/Invoke-PSQualityCheck.ps1" -ForegroundColor Gray
    exit 1
}

if ($Mode -eq 'health') {
    Write-Host "🏥 PowerShell QA System Health Check" -ForegroundColor Cyan
    Write-Host "✅ QA tool found: $qaScript" -ForegroundColor Green
    
    # Check PSScriptAnalyzer
    try {
        Import-Module PSScriptAnalyzer -ErrorAction Stop
        $version = (Get-Module PSScriptAnalyzer).Version
        Write-Host "✅ PSScriptAnalyzer v$version available" -ForegroundColor Green
    } catch {
        Write-Host "❌ PSScriptAnalyzer not available" -ForegroundColor Red
        Write-Host "   Install with: Install-Module PSScriptAnalyzer" -ForegroundColor Yellow
    }
    
    # Check config
    $configFile = Join-Path $PSScriptRoot "qa/config/PSScriptAnalyzerSettings.psd1"
    if (Test-Path $configFile) {
        Write-Host "✅ Configuration found: qa/config/PSScriptAnalyzerSettings.psd1" -ForegroundColor Green
    } else {
        Write-Host "❌ Configuration missing: $configFile" -ForegroundColor Red
    }
    
    Write-Host "`n🎯 System Ready" -ForegroundColor Green
    exit 0
}

# Delegate to the main QA tool
$params = @{
    Path = $Path
    Mode = $Mode
    Severity = $Severity
}

if ($DryRun) { 
    $params.Add('DryRun', $true) 
}

try {
    & $qaScript @params
    exit $LASTEXITCODE
} catch {
    Write-Error "QA tool execution failed: $($_.Exception.Message)"
    exit 1
}
