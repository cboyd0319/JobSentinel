# Simple Syntax Validation for Grandma-Friendly Changes
$ErrorActionPreference = 'Stop'

$files = @(
    "deploy\windows\bootstrap.ps1",
    "deploy\windows\install.ps1",
    "deploy\windows\My-Job-Finder.ps1"
)

$allPassed = $true

Write-Host "Validating PowerShell syntax..." -ForegroundColor Cyan
Write-Host ""

foreach ($file in $files) {
    $filePath = Join-Path $PSScriptRoot $file
    Write-Host "Checking: $file" -NoNewline

    if (-not (Test-Path $filePath)) {
        Write-Host " [FAIL - File not found]" -ForegroundColor Red
        $allPassed = $false
        continue
    }

    try {
        $syntaxErrors = $null
        $null = [System.Management.Automation.PSParser]::Tokenize((Get-Content $filePath -Raw), [ref]$syntaxErrors)

        if ($syntaxErrors.Count -eq 0) {
            Write-Host " [PASS]" -ForegroundColor Green
        } else {
            Write-Host " [FAIL - $($syntaxErrors.Count) syntax error(s)]" -ForegroundColor Red
            foreach ($err in $syntaxErrors) {
                Write-Host "  Line $($err.Token.StartLine): $($err.Message)" -ForegroundColor Yellow
            }
            $allPassed = $false
        }
    } catch {
        Write-Host " [FAIL - $($_.Exception.Message)]" -ForegroundColor Red
        $allPassed = $false
    }
}

Write-Host ""
if ($allPassed) {
    Write-Host "[OK] All files passed syntax validation!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[ERROR] Some files have syntax errors." -ForegroundColor Red
    exit 1
}
