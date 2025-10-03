# Pester tests for JobFinder.Prerequisites module

BeforeAll {
    $modulePath = "$PSScriptRoot/../deploy/windows/modules/JobFinder.Prerequisites.psm1"
    Import-Module $modulePath -Force
}

Describe 'Test-PythonInstalled' {
    It 'Returns true when python.exe exists in PATH' {
        Mock Get-Command {
            return @{ Source = 'C:\Python\python.exe' }
        }
        Test-PythonInstalled | Should -Be $true
    }

    It 'Returns false when python.exe not found' {
        Mock Get-Command { throw "Command not found" }
        Test-PythonInstalled | Should -Be $false
    }
}

Describe 'Get-PythonVersion' {
    It 'Returns version when Python is installed' {
        Mock Test-PythonInstalled { return $true }
        Mock Invoke-Expression { return 'Python 3.12.10' }

        $version = Get-PythonVersion
        $version | Should -BeOfType [version]
        $version.Major | Should -Be 3
        $version.Minor | Should -Be 12
    }

    It 'Returns null when Python is not installed' {
        Mock Test-PythonInstalled { return $false }

        $version = Get-PythonVersion
        $version | Should -Be $null
    }
}

Describe 'Test-PythonVersion' {
    It 'Returns true when version meets minimum' {
        Mock Get-PythonVersion { return [version]'3.12.10' }

        Test-PythonVersion -MinVersion '3.12.0' | Should -Be $true
    }

    It 'Returns false when version below minimum' {
        Mock Get-PythonVersion { return [version]'3.11.0' }

        Test-PythonVersion -MinVersion '3.12.0' | Should -Be $false
    }

    It 'Returns false when Python not installed' {
        Mock Get-PythonVersion { return $null }

        Test-PythonVersion -MinVersion '3.12.0' | Should -Be $false
    }
}

Describe 'Test-GcloudInstalled' {
    It 'Returns true when gcloud exists in PATH' {
        Mock Get-Command {
            return @{ Source = 'C:\gcloud\gcloud.exe' }
        }
        Test-GcloudInstalled | Should -Be $true
    }

    It 'Returns false when gcloud not found' {
        Mock Get-Command { throw "Command not found" }
        Test-GcloudInstalled | Should -Be $false
    }
}

Describe 'Assert-Prerequisites' {
    It 'Throws when Python is required but not installed' {
        Mock Test-PythonInstalled { return $false }

        { Assert-Prerequisites -RequirePython } | Should -Throw
    }

    It 'Does not throw when all prerequisites are met' {
        Mock Test-PythonInstalled { return $true }
        Mock Test-PythonVersion { return $true }

        { Assert-Prerequisites -RequirePython } | Should -Not -Throw
    }

    It 'Throws when gcloud is required but not installed' {
        Mock Test-GcloudInstalled { return $false }

        { Assert-Prerequisites -RequireGcloud } | Should -Throw
    }
}
