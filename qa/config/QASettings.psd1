# PowerShell QA Engine Configuration
# Comprehensive configuration for bulletproof PowerShell quality assurance

@{
    # Engine Configuration
    Engine = @{
        Version = '3.0.0'
        Name = 'PowerShell QA Engine'
        MaxConcurrentFiles = 16
        DefaultLogLevel = 'Info'
        DefaultSeverity = 'Warning'
        EnableBackups = $true
        BackupRetentionDays = 30
        WorkingDirectory = $null  # Auto-detected from script location
    }

    # File Processing Configuration
    FileProcessing = @{
        # Supported file extensions
        SupportedExtensions = @('.ps1', '.psm1', '.psd1')

        # Maximum file size for processing (bytes)
        MaxFileSizeBytes = 10485760  # 10MB

        # Encoding settings
        DefaultEncoding = 'UTF8'
        DetectEncoding = $true

        # Timeout settings
        AnalysisTimeoutSeconds = 300  # 5 minutes per file

        # Exclude patterns (glob-style)
        ExcludePatterns = @(
            '*/bin/*',
            '*/obj/*',
            '*/.git/*',
            '*/node_modules/*',
            '*/*.backup.*',
            '*/*.bak',
            '*/temp/*',
            '*/tmp/*',
            '*/.vs/*',
            '*/packages/*',
            '*/TestResults/*',
            '*/__pycache__/*',
            '*/dist/*',
            '*/build/*',
            '*/qa-old/*'  # Exclude old QA directories
        )

        # Include hidden files/directories
        IncludeHidden = $false
    }

    # Analysis Configuration
    Analysis = @{
        # Syntax analysis settings
        Syntax = @{
            Enabled = $true
            StrictMode = $true
            RequireVersion = '5.1'
            CrossPlatformCompatibility = $true
        }

        # Style analysis settings
        Style = @{
            Enabled = $true
            EnforceConsistency = $true
            IndentationSize = 4
            LineLength = 120
            RequireDocumentation = $true
            EnforceNamingConventions = $true
            RequireCommentBasedHelp = $true
        }

        # Security analysis settings
        Security = @{
            Enabled = $true
            DetectCredentials = $true
            DetectInjection = $true
            DetectUnsafePractices = $true
            ScanComments = $true
            RequireParameterValidation = $true
            EnforceSecureStrings = $true
        }

        # Performance analysis settings
        Performance = @{
            Enabled = $true
            DetectInefficiencies = $true
            AnalyzeComplexity = $true
            MaxCyclomaticComplexity = 15
            MaxNestingDepth = 5
            DetectMemoryLeaks = $true
        }
    }

    # Fix Configuration
    Fixes = @{
        # Auto-fix settings
        AutoFix = @{
            Enabled = $true
            SafeFixesOnly = $true
            CreateBackups = $true
            MaxFixesPerFile = 50
            DryRun = $false
            Interactive = $false
        }

        # Specific fix types
        FixTypes = @{
            Formatting = $true
            WhitespaceCleanup = $true
            CasingCorrection = $true
            AliasExpansion = $true
            QuoteNormalization = $true
            BraceFormatting = $true
            IndentationFix = $true
            DocumentationGeneration = $false  # Too complex for auto-fix
        }
    }

    # Reporting Configuration
    Reporting = @{
        # Output formats
        Formats = @('Console', 'JSON', 'HTML', 'XML')

        # Report settings
        IncludeSummary = $true
        IncludeDetails = $true
        IncludeMetrics = $true
        IncludeRecommendations = $true

        # File paths (relative to working directory)
        OutputDirectory = 'reports'
        ReportFileName = 'qa-report-{timestamp}'

        # Retention
        MaxReports = 50
        ArchiveOldReports = $true
    }

    # Logging Configuration
    Logging = @{
        # Log levels: Trace, Debug, Info, Warn, Error, Fatal
        Level = 'Info'

        # Log targets
        Targets = @{
            Console = @{
                Enabled = $true
                Format = 'Simple'
                ColorOutput = $true
            }

            File = @{
                Enabled = $true
                Path = 'logs/qa-engine.log'
                Format = 'Detailed'
                MaxSizeBytes = 52428800  # 50MB
                MaxFiles = 10
                RollingPolicy = 'Size'
            }

            StructuredFile = @{
                Enabled = $true
                Path = 'logs/qa-engine.jsonl'
                Format = 'JSON'
                MaxSizeBytes = 52428800  # 50MB
                MaxFiles = 5
            }
        }

        # Correlation
        EnableTraceCorrelation = $true
        CorrelationIdHeader = 'X-Trace-ID'
    }

    # Integration Settings
    Integration = @{
        # PSScriptAnalyzer integration
        PSScriptAnalyzer = @{
            Enabled = $true
            ConfigPath = 'config/PSScriptAnalyzerSettings.psd1'
            CustomRules = @()
            SeverityLevels = @('Error', 'Warning', 'Information')
        }

        # Pester integration
        Pester = @{
            Enabled = $true
            AutoGenerateTests = $false
            TestPath = 'tests'
            CoverageReports = $true
            CodeCoverageThreshold = 80
        }

        # Git integration
        Git = @{
            Enabled = $true
            PreCommitHooks = $false
            DiffAnalysis = $true
            BranchProtection = $false
        }

        # CI/CD integration
        CICD = @{
            GenerateConfigs = $true
            Platforms = @('GitHubActions', 'AzureDevOps')
            FailOnError = $true
            FailOnWarning = $false
        }
    }

    # Performance Settings
    Performance = @{
        # Parallel processing
        EnableParallelProcessing = $true
        MaxDegreeOfParallelism = 4  # Will be auto-detected at runtime

        # Caching
        EnableCaching = $true
        CacheDirectory = '.psqa-cache'
        CacheExpirationHours = 24

        # Memory management
        MaxMemoryUsageMB = 2048
        ForceGarbageCollection = $true
        GCCollectionFrequency = 100  # files processed
    }

    # Security Settings
    Security = @{
        # Credential scanning
        CredentialPatterns = @(
            'password|pwd|pass',
            'api_key|apikey',
            'secret|token',
            'connection_string'
        )

        # Code injection patterns
        InjectionPatterns = @(
            'Invoke-Expression',
            'iex',
            'Invoke-Command',
            'New-Object'
        )

        # Security rules
        RequireCodeSigning = $false
        AllowRemoteExecution = $false
        RestrictedExecutionPolicy = $true
    }

    # Quality Gates
    QualityGates = @{
        # Error thresholds
        MaxErrors = 0
        MaxWarnings = 5
        MaxInformational = 20

        # Coverage thresholds
        MinCodeCoverage = 75
        MinDocumentationCoverage = 80

        # Complexity thresholds
        MaxFileComplexity = 50
        MaxFunctionComplexity = 15
        MaxLineLength = 120

        # Security thresholds
        MaxSecurityIssues = 0
        MaxCredentialExposures = 0
    }

    # Extensibility
    Plugins = @{
        # Plugin directories
        PluginPaths = @('plugins', 'custom-analyzers')

        # Auto-load plugins
        AutoLoadPlugins = $true

        # Plugin configuration
        PluginSettings = @{}
    }
}