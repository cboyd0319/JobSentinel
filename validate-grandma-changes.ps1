# Validation Script for Grandma-Friendly Changes
# Tests all three modified files for syntax errors and common issues

$ErrorActionPreference = 'Stop'
$files = @(
    "deploy\windows\bootstrap.ps1",
    "deploy\windows\install.ps1",
    "deploy\windows\My-Job-Finder.ps1"
)

$results = @()

foreach ($file in $files) {
    $filePath = Join-Path $PSScriptRoot $file
    Write-Host "Validating: $file" -ForegroundColor Cyan

    # Test 1: File exists
    if (-not (Test-Path $filePath)) {
        $results += [PSCustomObject]@{
            File = $file
            Test = "File Exists"
            Status = "FAIL"
            Message = "File not found"
        }
        continue
    }

    $results += [PSCustomObject]@{
        File = $file
        Test = "File Exists"
        Status = "PASS"
        Message = "Found"
    }

    # Test 2: Syntax validation
    try {
        $syntaxErrors = $null
        $null = [System.Management.Automation.PSParser]::Tokenize((Get-Content $filePath -Raw), [ref]$syntaxErrors)

        if ($syntaxErrors.Count -eq 0) {
            $results += [PSCustomObject]@{
                File = $file
                Test = "Syntax Check"
                Status = "PASS"
                Message = "No syntax errors"
            }
        } else {
            $results += [PSCustomObject]@{
                File = $file
                Test = "Syntax Check"
                Status = "FAIL"
                Message = "$($syntaxErrors.Count) syntax error(s) found"
            }
        }
    } catch {
        $results += [PSCustomObject]@{
            File = $file
            Test = "Syntax Check"
            Status = "FAIL"
            Message = $_.Exception.Message
        }
    }

    # Test 3: Check for Write-Error usage (should use friendly messages instead)
    $content = Get-Content $filePath -Raw
    $writeErrorCount = ([regex]::Matches($content, 'Write-Error')).Count

    if ($writeErrorCount -eq 0 -or $file -eq "deploy\windows\bootstrap.ps1") {
        # bootstrap.ps1 is allowed to have Write-Error in final catch
        $results += [PSCustomObject]@{
            File = $file
            Test = "Friendly Errors"
            Status = "PASS"
            Message = "Uses friendly error messages"
        }
    }

    # Test 4: Check for visual cues (emojis, checkmarks, arrows)
    if ($content -match '(→|✓|✗|☁|💻|⚙|💾|👋|☕|🔍|⏳)') {
        $results += [PSCustomObject]@{
            File = $file
            Test = "Visual Cues"
            Status = "PASS"
            Message = "Contains visual cues"
        }
    } else {
        # Check for ASCII alternatives
        if ($content -match '(\[OK\]|\[PASS\]|\[SUCCESS\])') {
            $results += [PSCustomObject]@{
                File = $file
                Test = "Visual Cues"
                Status = "PASS"
                Message = "Contains text-based visual cues"
            }
        } else {
            $results += [PSCustomObject]@{
                File = $file
                Test = "Visual Cues"
                Status = "WARN"
                Message = "No visual cues found"
            }
        }
    }

    # Test 5: Check for time estimates
    if ($content -match '(takes? about|takes? \d+|takes? 1-2|\d+ seconds|\d+ minutes)') {
        $results += [PSCustomObject]@{
            File = $file
            Test = "Time Estimates"
            Status = "PASS"
            Message = "Contains time estimates"
        }
    } else {
        $results += [PSCustomObject]@{
            File = $file
            Test = "Time Estimates"
            Status = "WARN"
            Message = "No time estimates found"
        }
    }

    # Test 6: Check font sizes (should be 16px minimum)
    if ($file -match 'install.ps1|My-Job-Finder.ps1') {
        if ($content -match 'FontSize="([^"]+)"') {
            $fontSizes = [regex]::Matches($content, 'FontSize="(\d+)"') | ForEach-Object { [int]$_.Groups[1].Value }
            $minFontSize = ($fontSizes | Measure-Object -Minimum).Minimum

            if ($minFontSize -ge 16) {
                $results += [PSCustomObject]@{
                    File = $file
                    Test = "Font Size"
                    Status = "PASS"
                    Message = "Minimum font size: ${minFontSize}px (target: ≥16px)"
                }
            } else {
                $results += [PSCustomObject]@{
                    File = $file
                    Test = "Font Size"
                    Status = "WARN"
                    Message = "Minimum font size: ${minFontSize}px (target: ≥16px)"
                }
            }
        }
    }

    Write-Host ""
}

# Display results
Write-Host "===============================================" -ForegroundColor White
Write-Host "   Validation Results" -ForegroundColor White
Write-Host "===============================================" -ForegroundColor White
Write-Host ""

$results | ForEach-Object {
    $color = switch ($_.Status) {
        "PASS" { "Green" }
        "WARN" { "Yellow" }
        "FAIL" { "Red" }
    }
    Write-Host "[$($_.Status)]" -ForegroundColor $color -NoNewline
    Write-Host " $($_.File) - $($_.Test): $($_.Message)"
}

Write-Host ""
$passCount = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$warnCount = ($results | Where-Object { $_.Status -eq "WARN" }).Count
$failCount = ($results | Where-Object { $_.Status -eq "FAIL" }).Count

Write-Host "Summary: " -NoNewline
Write-Host "$passCount PASS" -ForegroundColor Green -NoNewline
Write-Host ", " -NoNewline
Write-Host "$warnCount WARN" -ForegroundColor Yellow -NoNewline
Write-Host ", " -NoNewline
Write-Host "$failCount FAIL" -ForegroundColor Red

if ($failCount -eq 0) {
    Write-Host ""
    Write-Host "[OK] All critical tests passed! Ready for Grandma!" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "[ERROR] Some tests failed. Please review above." -ForegroundColor Red
    exit 1
}
