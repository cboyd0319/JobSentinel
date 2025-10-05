# Pester tests for JobFinder.Validation module

Import-Module /Users/chadboyd/Documents/GitHub/job-private-scraper-filter/deploy/windows/modules/JobFinder.Validation.psm1 -Force

BeforeAll {
    $tempDir = Join-Path $env:TEMP "pester-test-$(New-Guid)"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
}

Describe 'Test-ValidUrl' {
    It 'Returns true for valid HTTP URL' {
        Test-ValidUrl 'http://example.com' | Should -Be $true
    }

    It 'Returns true for valid HTTPS URL' {
        Test-ValidUrl 'https://example.com' | Should -Be $true
    }

    It 'Returns false for invalid URL' {
        Test-ValidUrl 'not-a-url' | Should -Be $false
    }

    It 'Returns false for empty string' {
        Test-ValidUrl '' | Should -Be $false
    }

    It 'Returns false for FTP URL' {
        Test-ValidUrl 'ftp://example.com' | Should -Be $false
    }

    It 'Returns false for URL without host' {
        Test-ValidUrl 'https://' | Should -Be $false
    }
}

Describe 'Test-SafePath' {
    AfterAll {
        if (Test-Path $tempDir) {
            Remove-Item $tempDir -Recurse -Force
        }
    }

    It 'Returns true for path within allowed base' {
        $safePath = Join-Path $tempDir "subdir\file.txt"
        Test-SafePath -Path $safePath -AllowedBasePath $tempDir | Should -Be $true
    }

    It 'Returns false for path outside allowed base' {
        $unsafePath = "C:\Windows\System32\config"
        Test-SafePath -Path $unsafePath -AllowedBasePath $tempDir | Should -Be $false
    }

    It 'Handles case-insensitive comparison correctly' {
        $safePath = Join-Path $tempDir "SUBDIR\file.txt"
        Test-SafePath -Path $safePath -AllowedBasePath $tempDir.ToLower() | Should -Be $true
    }
}

Describe 'Test-ValidEmailAddress' {
    It 'Returns true for valid email' {
        Test-ValidEmailAddress 'user@example.com' | Should -Be $true
    }

    It 'Returns false for invalid email' {
        Test-ValidEmailAddress 'not-an-email' | Should -Be $false
    }

    It 'Returns false for empty string' {
        Test-ValidEmailAddress '' | Should -Be $false
    }

    It 'Returns true for email with subdomain' {
        Test-ValidEmailAddress 'user@mail.example.com' | Should -Be $true
    }
}

Describe 'Test-ValidVersion' {
    It 'Returns true for valid semantic version' {
        Test-ValidVersion '0.4.5' | Should -Be $true
    }

    It 'Returns true for version with build number' {
        Test-ValidVersion '1.2.3.4' | Should -Be $true
    }

    It 'Returns false for invalid version' {
        Test-ValidVersion 'not-a-version' | Should -Be $false
    }

    It 'Returns false for partial version' {
        Test-ValidVersion '1.0' | Should -Be $false
    }
}

Describe 'Test-HasDirectoryTraversal' {
    It 'Detects ../ traversal' {
        Test-HasDirectoryTraversal '../../etc/passwd' | Should -Be $true
    }

    It 'Detects ..\ traversal' {
        Test-HasDirectoryTraversal '..\..\ windows\system32' | Should -Be $true
    }

    It 'Detects URL encoded traversal' {
        Test-HasDirectoryTraversal '%2e%2e/file' | Should -Be $true
    }

    It 'Returns false for safe path' {
        Test-HasDirectoryTraversal 'normal/path/file.txt' | Should -Be $false
    }
}
