# Security Rules Configuration for PowerShell QA Engine
# Comprehensive security validation rules for PowerShell code

@{
    # Security Rule Categories
    Categories = @{
        # Credential and Secret Management
        Credentials = @{
            Rules = @(
                @{
                    Name = 'NoPlaintextPasswords'
                    Description = 'Detect plaintext passwords in code'
                    Severity = 'Error'
                    Patterns = @(
                        '\$password\s*=\s*["\'']\w+["\'']\s*$',
                        '\$pwd\s*=\s*["\'']\w+["\'']\s*$',
                        '\$secret\s*=\s*["\'']\w+["\'']\s*$',
                        'password\s*=\s*["\'']\w+["\'']\s*',
                        'ConvertTo-SecureString\s+-String\s+["\'']\w+["\'']\s+-AsPlainText'
                    )
                    Suggestion = 'Use SecureString or credential objects instead of plaintext passwords'
                    Fixable = $false
                    AutoFix = $null
                    RiskLevel = 'Critical'
                },
                @{
                    Name = 'RequireCredentialValidation'
                    Description = 'Ensure credential parameters use proper validation'
                    Severity = 'Warning'
                    Patterns = @(
                        '\[PSCredential\]\s*\$\w+(?!\s*=\s*\[PSCredential\]::Empty)'
                    )
                    Suggestion = 'Add [ValidateNotNull()] or appropriate validation to credential parameters'
                    Fixable = $true
                    AutoFix = '[ValidateNotNull()]'
                    RiskLevel = 'Medium'
                },
                @{
                    Name = 'NoHardcodedTokens'
                    Description = 'Detect hardcoded API tokens or keys'
                    Severity = 'Error'
                    Patterns = @(
                        '\$(?:api_?key|token|secret_?key|access_?token)\s*=\s*["\'']\w{20,}["\'']\s*$',
                        'Authorization\s*=\s*["\'']\w+["\'']\s*',
                        'Bearer\s+[a-zA-Z0-9\-_\.]{20,}'
                    )
                    Suggestion = 'Store secrets in secure configuration or credential stores'
                    Fixable = $false
                    AutoFix = $null
                    RiskLevel = 'Critical'
                }
            )
        }

        # Code Injection Prevention
        Injection = @{
            Rules = @(
                @{
                    Name = 'NoInvokeExpression'
                    Description = 'Avoid Invoke-Expression with user input'
                    Severity = 'Error'
                    Patterns = @(
                        'Invoke-Expression\s+\$\w+',
                        'iex\s+\$\w+',
                        '\|\s*Invoke-Expression',
                        '\|\s*iex'
                    )
                    Suggestion = 'Use safer alternatives like switch statements or predefined commands'
                    Fixable = $false
                    AutoFix = $null
                    RiskLevel = 'Critical'
                },
                @{
                    Name = 'NoUnsafeScriptBlock'
                    Description = 'Detect potentially unsafe script block construction'
                    Severity = 'Warning'
                    Patterns = @(
                        '\[ScriptBlock\]::Create\s*\(\s*\$\w+',
                        'ScriptBlock\]\s*\$\w+\s*=.*\$\w+'
                    )
                    Suggestion = 'Validate and sanitize input before creating script blocks'
                    Fixable = $false
                    AutoFix = $null
                    RiskLevel = 'High'
                },
                @{
                    Name = 'NoUnsafeFileOperations'
                    Description = 'Detect unsafe file operations with user input'
                    Severity = 'Warning'
                    Patterns = @(
                        '(?:Get-Content|Set-Content|Remove-Item|Copy-Item|Move-Item)\s+\$\w+(?!\s+.*-ErrorAction)',
                        '(?:Out-File|Add-Content)\s+.*\$\w+(?!\s+.*-ErrorAction)'
                    )
                    Suggestion = 'Validate file paths and add proper error handling'
                    Fixable = $true
                    AutoFix = 'Add -ErrorAction Stop and path validation'
                    RiskLevel = 'Medium'
                }
            )
        }

        # Dangerous Commands
        DangerousCommands = @{
            Rules = @(
                @{
                    Name = 'NoUnsafeCommands'
                    Description = 'Detect usage of potentially dangerous commands'
                    Severity = 'Warning'
                    Patterns = @(
                        'Start-Process\s+.*\$\w+',
                        'Invoke-Command\s+.*\$\w+',
                        '&\s*\$\w+',
                        'cmd\.exe\s+/c',
                        'powershell\.exe\s+-Command'
                    )
                    Suggestion = 'Validate command parameters and use proper error handling'
                    Fixable = $false
                    AutoFix = $null
                    RiskLevel = 'High'
                },
                @{
                    Name = 'NoNetworkCommands'
                    Description = 'Monitor network-related commands for security'
                    Severity = 'Information'
                    Patterns = @(
                        'Invoke-WebRequest\s+.*\$\w+',
                        'Invoke-RestMethod\s+.*\$\w+',
                        'New-WebServiceProxy',
                        'Net\.WebClient'
                    )
                    Suggestion = 'Validate URLs and use secure connection practices'
                    Fixable = $true
                    AutoFix = 'Add URL validation and -UseBasicParsing if applicable'
                    RiskLevel = 'Medium'
                }
            )
        }

        # Error Handling
        ErrorHandling = @{
            Rules = @(
                @{
                    Name = 'NoEmptyCatchBlocks'
                    Description = 'Detect empty catch blocks'
                    Severity = 'Warning'
                    Patterns = @(
                        'catch\s*\{\s*\}',
                        'catch\s*\{\s*#.*\s*\}'
                    )
                    Suggestion = 'Add proper error handling or logging in catch blocks'
                    Fixable = $true
                    AutoFix = 'Add Write-Warning or throw statement'
                    RiskLevel = 'Medium'
                },
                @{
                    Name = 'RequireErrorActionPreference'
                    Description = 'Encourage explicit ErrorActionPreference'
                    Severity = 'Information'
                    Patterns = @(
                        '^(?!.*\$ErrorActionPreference).*function\s+\w+'
                    )
                    Suggestion = 'Set explicit ErrorActionPreference for functions'
                    Fixable = $true
                    AutoFix = 'Add $ErrorActionPreference = "Stop" at function start'
                    RiskLevel = 'Low'
                }
            )
        }

        # Data Validation
        Validation = @{
            Rules = @(
                @{
                    Name = 'RequireParameterValidation'
                    Description = 'Parameters should have validation attributes'
                    Severity = 'Information'
                    Patterns = @(
                        '\[string\]\s*\$\w+(?!\s*,|\s*\)|.*\[Validate)',
                        '\[int\]\s*\$\w+(?!\s*,|\s*\)|.*\[Validate)'
                    )
                    Suggestion = 'Add validation attributes like [ValidateNotNullOrEmpty()]'
                    Fixable = $true
                    AutoFix = 'Add appropriate validation attributes'
                    RiskLevel = 'Low'
                },
                @{
                    Name = 'NoTrustAllCertificates'
                    Description = 'Detect certificate validation bypass'
                    Severity = 'Error'
                    Patterns = @(
                        'ServerCertificateValidationCallback.*\$true',
                        'CheckCertificateRevocationList.*\$false',
                        '-SkipCertificateCheck'
                    )
                    Suggestion = 'Use proper certificate validation or explicit security exceptions'
                    Fixable = $false
                    AutoFix = $null
                    RiskLevel = 'Critical'
                }
            )
        }

        # Module Security
        ModuleSecurity = @{
            Rules = @(
                @{
                    Name = 'ValidateModuleImports'
                    Description = 'Monitor dynamic module imports'
                    Severity = 'Information'
                    Patterns = @(
                        'Import-Module\s+.*\$\w+',
                        'Import-Module\s+.*-Name\s+\$\w+'
                    )
                    Suggestion = 'Validate module names and sources before importing'
                    Fixable = $true
                    AutoFix = 'Add module path validation'
                    RiskLevel = 'Medium'
                },
                @{
                    Name = 'NoUnsignedScripts'
                    Description = 'Encourage script signing for production'
                    Severity = 'Information'
                    Patterns = @(
                        '^(?!.*# SIG # Begin signature block).*\.ps1$'
                    )
                    Suggestion = 'Consider code signing for production scripts'
                    Fixable = $false
                    AutoFix = $null
                    RiskLevel = 'Low'
                }
            )
        }

        # Registry and System Modification
        SystemModification = @{
            Rules = @(
                @{
                    Name = 'NoRegistryModification'
                    Description = 'Monitor registry modifications'
                    Severity = 'Warning'
                    Patterns = @(
                        'Set-ItemProperty.*HKLM:',
                        'New-ItemProperty.*HKLM:',
                        'Remove-ItemProperty.*HKLM:',
                        'reg\.exe\s+add'
                    )
                    Suggestion = 'Validate registry changes and add proper error handling'
                    Fixable = $false
                    AutoFix = $null
                    RiskLevel = 'High'
                },
                @{
                    Name = 'NoServiceModification'
                    Description = 'Monitor service modifications'
                    Severity = 'Warning'
                    Patterns = @(
                        'Stop-Service\s+.*\$\w+',
                        'Start-Service\s+.*\$\w+',
                        'Set-Service\s+.*\$\w+',
                        'New-Service\s+.*\$\w+'
                    )
                    Suggestion = 'Validate service operations and add proper error handling'
                    Fixable = $false
                    AutoFix = $null
                    RiskLevel = 'High'
                }
            )
        }
    }

    # Security Scanning Configuration
    ScanningConfig = @{
        # Enable/disable rule categories
        EnabledCategories = @(
            'Credentials',
            'Injection',
            'DangerousCommands',
            'ErrorHandling',
            'Validation',
            'ModuleSecurity',
            'SystemModification'
        )

        # Global settings
        StrictMode = $true
        FailOnCritical = $true
        ReportAllFindings = $true

        # Context analysis
        AnalyzeComments = $true
        AnalyzeStrings = $true
        AnalyzeVariableNames = $true

        # False positive reduction
        IgnoreTestFiles = $true
        IgnoreExampleCode = $true
        RequireConfidenceThreshold = 0.8
    }

    # Risk Assessment
    RiskLevels = @{
        Critical = @{
            Score = 10
            RequiresImmediate = $true
            BlockDeployment = $true
            NotificationLevel = 'Urgent'
        }
        High = @{
            Score = 7
            RequiresImmediate = $false
            BlockDeployment = $true
            NotificationLevel = 'High'
        }
        Medium = @{
            Score = 5
            RequiresImmediate = $false
            BlockDeployment = $false
            NotificationLevel = 'Medium'
        }
        Low = @{
            Score = 2
            RequiresImmediate = $false
            BlockDeployment = $false
            NotificationLevel = 'Low'
        }
    }

    # Remediation Guidance
    RemediationTemplates = @{
        CredentialManagement = @{
            Template = 'Use Get-Credential or secure configuration management'
            Example = '$credential = Get-Credential -Message "Enter credentials"'
            Documentation = 'https://docs.microsoft.com/powershell/security'
        }
        InputValidation = @{
            Template = 'Add parameter validation attributes'
            Example = '[ValidateNotNullOrEmpty()][string]$Parameter'
            Documentation = 'https://docs.microsoft.com/powershell/validation'
        }
        ErrorHandling = @{
            Template = 'Implement proper try-catch-finally blocks'
            Example = 'try { } catch { Write-Warning $_.Exception.Message; throw }'
            Documentation = 'https://docs.microsoft.com/powershell/error-handling'
        }
    }
}