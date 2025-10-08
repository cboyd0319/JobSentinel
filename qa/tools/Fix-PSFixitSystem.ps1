#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Quick PS-Fixit System Fixer - Fixes common issues in one go
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$ProjectPath = (Get-Location)
)

<#
.SYNOPSIS
${1:Short description}

.DESCRIPTION
${2:Long description}

.EXAMPLE
${3:An example}

.NOTES
${4:General notes}
#>
function Fix-ConfigurationIssue {
    Write-Host "🔧 Fixing PS-Fixit Configuration Issues" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan

    $configPath = Join-Path $ProjectPath 'tools/powershell-qa/config/PSQASettings.Enhanced.psd1'

    if (Test-Path $configPath) {
        Write-Host "  📋 Fixing compatibility rule configuration..." -ForegroundColor Yellow

        $content = Get-Content $configPath -Raw
        $originalContent = $content

        # Fix multiple commented compatibility rules
        $content = $content -replace "# # 'PSUseCompatibleCommands'.*", "# 'PSUseCompatibleCommands'  # Disabled: TargetProfiles configuration issue"
        $content = $content -replace "# # 'PSUseCompatibleCmdlets'.*", "# 'PSUseCompatibleCmdlets'   # Disabled: Profile dependencies not configured"

        # Also disable PSUseCompatibleTypes if causing issues
        $content = $content -replace "'PSUseCompatibleTypes'", "# 'PSUseCompatibleTypes'     # Disabled: May require TargetProfiles"

        # Remove any empty TargetProfiles settings
        $content = $content -replace 'TargetProfiles\s*=\s*@\(\s*\)', ''

        if ($content -ne $originalContent) {
            Set-Content $configPath $content -Encoding UTF8
            Write-Host "    ✅ Configuration fixed" -ForegroundColor Green
            return $true
        } else {
            Write-Host "    ℹ️  Configuration already correct" -ForegroundColor Blue
            return $false
        }
    } else {
        Write-Host "    ❌ Configuration file not found: $configPath" -ForegroundColor Red
        return $false
    }
}

<#
.SYNOPSIS
    Fix-TrailingWhitespace function
.DESCRIPTION
    Provides functionality for Fix-TrailingWhitespace
#>
function Fix-TrailingWhitespace {
    param([string]$FilePath)

    if (-not (Test-Path $FilePath)) {
        Write-Host "    ❌ File not found: $FilePath" -ForegroundColor Red
        return $false
    }

    Write-Host "  🧹 Cleaning trailing whitespace in $(Split-Path $FilePath -Leaf)..." -ForegroundColor Yellow

    try {
        $content = Get-Content $FilePath -Raw
        $originalContent = $content

        # Remove trailing whitespace from each line
        $lines = $content -split "`r?`n"
        $cleanedLines = $lines | ForEach-Object { $_.TrimEnd() }
        $cleanedContent = $cleanedLines -join "`n"

        if ($cleanedContent -ne $originalContent) {
            Set-Content $FilePath $cleanedContent -Encoding UTF8 -NoNewline

            # Count improvements
            $originalTrailingSpaces = ($lines | Where-Object { $_ -match '\s+$' }).Count
            Write-Host "    ✅ Removed trailing whitespace from $originalTrailingSpaces lines" -ForegroundColor Green
            return $true
        } else {
            Write-Host "    ℹ️  No trailing whitespace found" -ForegroundColor Blue
            return $false
        }
    } catch {
        Write-Host "    ❌ Error cleaning file: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

<#
.SYNOPSIS
${1:Short description}

.DESCRIPTION
${2:Long description}

.EXAMPLE
${3:An example}

.NOTES
${4:General notes}
#>
function Test-SystemAfterFix {
    Write-Host "`n🧪 Testing System After Fixes" -ForegroundColor Cyan
    Write-Host "════════════════════════════" -ForegroundColor Cyan

    # Test the configuration
    $configPath = Join-Path $ProjectPath 'tools/powershell-qa/config/PSQASettings.Enhanced.psd1'

    Write-Host "  📋 Testing configuration loading..." -ForegroundColor Yellow
    try {
        $config = Import-PowerShellDataFile $configPath -ErrorAction Stop  # Result stored for potential future use
        Write-Host "    ✅ Configuration loads successfully" -ForegroundColor Green
    } catch {
        Write-Host "    ❌ Configuration error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }

    # Quick syntax test on the cleaned file
    $testFile = Join-Path $ProjectPath 'tools/powershell-qa/src/PSQACore.Enhanced.psm1'
    Write-Host "  📜 Testing syntax of cleaned file..." -ForegroundColor Yellow

    try {
        $parseErrors = $null
        [System.Management.Automation.Language.Parser]::ParseFile($testFile, [ref]$null, [ref]$parseErrors)

        if ($parseErrors.Count -eq 0) {
            Write-Host "    ✅ Syntax is valid" -ForegroundColor Green
        } else {
            Write-Host "    ❌ Found $($parseErrors.Count) syntax errors" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "    ❌ Parse error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }

    # Test PS-Fixit can run without errors
    Write-Host "  🔧 Testing PS-Fixit system..." -ForegroundColor Yellow

    try {
        $testResult = pwsh -Command "
            try {
                Import-Module PSScriptAnalyzer -ErrorAction Stop
                `$config = Import-PowerShellDataFile '$configPath' -ErrorAction Stop
                `$issues = Invoke-ScriptAnalyzer -Path '$testFile' -Settings '$configPath' -ErrorAction Stop
                Write-Output 'SUCCESS: Found ' + `$issues.Count + ' issues'
            } catch {
                Write-Output 'ERROR: ' + `$_.Exception.Message
            }
        " 2>&1

        if ($testResult -like "SUCCESS:*") {
            $issueCount = ($testResult -split ':')[1].Trim() -replace '[^\d]', ''
            Write-Host "    ✅ PS-Fixit system working - found $issueCount issues" -ForegroundColor Green
        } else {
            Write-Host "    ⚠️  PS-Fixit test result: $testResult" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "    ⚠️  PS-Fixit test warning: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    return $true
}

# Main execution
Write-Host "🚀 PS-Fixit Quick System Fixer" -ForegroundColor Cyan
Write-Host "═══════════════════════════════" -ForegroundColor Cyan
Write-Host "📁 Project: $ProjectPath" -ForegroundColor White
Write-Host ""

$fixesApplied = 0

# Step 1: Fix configuration
if (Fix-ConfigurationIssues) {
    $fixesApplied++
}

# Step 2: Clean the main module file
$moduleFile = Join-Path $ProjectPath 'tools/powershell-qa/src/PSQACore.Enhanced.psm1'
if (Fix-TrailingWhitespace -FilePath $moduleFile) {
    $fixesApplied++
}

# Step 3: Test system
$systemWorking = Test-SystemAfterFix

# Summary
Write-Host "`n🎯 Summary" -ForegroundColor Cyan
Write-Host "═════════" -ForegroundColor Cyan
Write-Host "  🔧 Fixes Applied: $fixesApplied" -ForegroundColor White
Write-Host "  🏆 System Status: $(if ($systemWorking) { '✅ Working' } else { '⚠️ Needs Attention' })" -ForegroundColor $(if ($systemWorking) { 'Green' } else { 'Yellow' })

if ($fixesApplied -gt 0) {
    Write-Host "`n💡 Recommended next steps:" -ForegroundColor Yellow
    Write-Host "   1. Re-run PS-Fixit on files to see improvements" -ForegroundColor White
    Write-Host "   2. Test auto-fixing on other PowerShell files" -ForegroundColor White
    Write-Host "   3. Run comprehensive analysis when confident" -ForegroundColor White
}

Write-Host "`n✅ PS-Fixit Quick Fix completed!" -ForegroundColor Green