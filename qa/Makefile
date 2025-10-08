# PowerShell QA Engine - Makefile
# Production-grade quality automation for PowerShell projects

.PHONY: help analyze fix test report clean install setup validate ci-analyze ci-fix benchmark security lint format docs all

# Configuration
QA_ENGINE = ./tools/Invoke-PSQAEngine.ps1
CONFIG_DIR = ./config
SOURCE_DIR = ..
REPORTS_DIR = ./reports

# Default target
help:
	@echo "PowerShell QA Engine - Available Commands"
	@echo "========================================"
	@echo ""
	@echo "Quality Assurance:"
	@echo "  analyze       - Run comprehensive code analysis"
	@echo "  fix          - Apply safe automated fixes"
	@echo "  test         - Run quality validation tests"
	@echo "  report       - Generate detailed quality reports"
	@echo "  security     - Run security-focused analysis"
	@echo "  lint         - Quick style and syntax check"
	@echo "  format       - Auto-format code (dry-run available)"
	@echo ""
	@echo "Development:"
	@echo "  validate     - Validate QA system configuration"
	@echo "  setup        - Initial setup and dependency check"
	@echo "  install      - Install required PowerShell modules"
	@echo "  clean        - Clean up reports and temporary files"
	@echo ""
	@echo "CI/CD Integration:"
	@echo "  ci-analyze   - CI-optimized analysis with JSON output"
	@echo "  ci-fix       - CI-safe fixes with quality gates"
	@echo "  benchmark    - Performance benchmarking"
	@echo ""
	@echo "Utilities:"
	@echo "  docs         - Generate documentation"
	@echo "  all          - Complete QA pipeline (analyze + fix + test + report)"
	@echo ""
	@echo "Options:"
	@echo "  DRY_RUN=1    - Preview changes without applying them"
	@echo "  VERBOSE=1    - Enable verbose output"
	@echo "  TARGET=path  - Specify custom target path (default: .)"
	@echo ""
	@echo "Examples:"
	@echo "  make analyze TARGET=./src"
	@echo "  make fix DRY_RUN=1"
	@echo "  make ci-analyze VERBOSE=1"

# Variables
TARGET ?= $(SOURCE_DIR)
DRY_RUN ?= 0
VERBOSE ?= 0
OUTPUT_FORMAT ?= Console

# PowerShell command construction
PWSH_CMD = pwsh -NoProfile -NonInteractive
QA_BASE_CMD = $(PWSH_CMD) -File $(QA_ENGINE) -Path "$(TARGET)" -ConfigPath "$(CONFIG_DIR)"

ifeq ($(VERBOSE),1)
    QA_BASE_CMD += -Verbose
endif

ifeq ($(DRY_RUN),1)
    QA_BASE_CMD += -DryRun
endif

# Setup and Installation
setup: install validate
	@echo "✓ PowerShell QA Engine setup completed successfully"

install:
	@echo "Installing required PowerShell modules..."
	@$(PWSH_CMD) -Command "Install-Module PSScriptAnalyzer -Scope CurrentUser -Force -SkipPublisherCheck"
	@$(PWSH_CMD) -Command "Install-Module Pester -Scope CurrentUser -Force -SkipPublisherCheck"
	@echo "✓ PowerShell modules installed"

validate:
	@echo "Validating QA system configuration..."
	@test -f $(QA_ENGINE) || (echo "❌ QA engine not found: $(QA_ENGINE)" && exit 1)
	@test -f $(CONFIG_DIR)/QASettings.psd1 || (echo "❌ QA settings not found" && exit 1)
	@test -f $(CONFIG_DIR)/PSScriptAnalyzerSettings.psd1 || (echo "❌ PSSA settings not found" && exit 1)
	@test -f $(CONFIG_DIR)/SecurityRules.psd1 || (echo "❌ Security rules not found" && exit 1)
	@$(PWSH_CMD) -Command "Get-Module PSScriptAnalyzer -ListAvailable | Out-Null" || (echo "❌ PSScriptAnalyzer module not installed" && exit 1)
	@echo "✓ QA system configuration validated"

# Core QA Operations
analyze:
	@echo "Running comprehensive PowerShell code analysis..."
	@$(QA_BASE_CMD) -Mode Analyze -OutputFormat $(OUTPUT_FORMAT)

fix:
	@echo "Applying automated fixes to PowerShell code..."
ifeq ($(DRY_RUN),1)
	@echo "🔍 DRY RUN MODE - No changes will be applied"
endif
	@$(QA_BASE_CMD) -Mode Fix

test:
	@echo "Running quality validation tests..."
	@$(QA_BASE_CMD) -Mode Test

report:
	@echo "Generating comprehensive quality reports..."
	@$(QA_BASE_CMD) -Mode Report -OutputFormat All
	@echo "📊 Reports generated in $(REPORTS_DIR)/"

security:
	@echo "Running security-focused analysis..."
	@$(QA_BASE_CMD) -Mode Analyze -OutputFormat HTML
	@echo "🛡️ Security analysis completed - check HTML report for details"

lint:
	@echo "Quick style and syntax validation..."
	@$(QA_BASE_CMD) -Mode Analyze -OutputFormat Console

format:
	@echo "Auto-formatting PowerShell code..."
ifeq ($(DRY_RUN),1)
	@echo "🔍 FORMAT PREVIEW - Use 'make format DRY_RUN=0' to apply changes"
endif
	@$(QA_BASE_CMD) -Mode Fix

# CI/CD Integration
ci-analyze:
	@echo "CI/CD Analysis Mode - JSON Output"
	@$(QA_BASE_CMD) -Mode Analyze -OutputFormat JSON -TraceId "CI-$(shell date +%Y%m%d%H%M%S)"

ci-fix:
	@echo "CI/CD Safe Fix Mode"
	@$(QA_BASE_CMD) -Mode Fix -OutputFormat JSON
	@echo "✓ CI fixes completed"

# Performance and Benchmarking
benchmark:
	@echo "Running QA engine performance benchmark..."
	@echo "Target: $(TARGET)"
	@echo "Start Time: $(shell date)"
	@time $(QA_BASE_CMD) -Mode All -OutputFormat JSON
	@echo "Benchmark completed: $(shell date)"

# Complete Pipeline
all: validate analyze fix test report
	@echo "✅ Complete QA pipeline executed successfully"
	@echo ""
	@echo "Summary:"
	@echo "- ✓ Code analysis completed"
	@echo "- ✓ Safe fixes applied"
	@echo "- ✓ Quality tests executed"
	@echo "- ✓ Reports generated"
	@echo ""
	@echo "📊 Check $(REPORTS_DIR)/ for detailed reports"

# Utility Commands
clean:
	@echo "Cleaning up reports and temporary files..."
	@rm -rf $(REPORTS_DIR)/*.json $(REPORTS_DIR)/*.html $(REPORTS_DIR)/*.xml
	@rm -rf ./.psqa-cache/
	@rm -f ./*.backup.*
	@find . -name "*.backup.*" -type f -delete 2>/dev/null || true
	@echo "✓ Cleanup completed"

docs:
	@echo "Generating QA system documentation..."
	@mkdir -p ./docs
	@$(PWSH_CMD) -Command "Get-Help $(QA_ENGINE) -Full" > ./docs/QAEngine-Help.txt 2>/dev/null || echo "Help generation skipped"
	@echo "📚 Documentation generated in ./docs/"

# Quality Gates for CI/CD
quality-gate:
	@echo "Executing quality gate validation..."
	@$(QA_BASE_CMD) -Mode Analyze -OutputFormat JSON > qg-results.json
	@$(PWSH_CMD) -Command '\
		$$results = Get-Content qg-results.json | ConvertFrom-Json; \
		$$errorCount = $$results.Summary.ErrorCount; \
		$$warningCount = $$results.Summary.WarningCount; \
		Write-Host "Quality Gate Results:"; \
		Write-Host "- Errors: $$errorCount"; \
		Write-Host "- Warnings: $$warningCount"; \
		if ($$errorCount -gt 0) { \
			Write-Error "❌ Quality gate FAILED: $$errorCount errors found"; \
			exit 1; \
		} elseif ($$warningCount -gt 10) { \
			Write-Warning "⚠️ Quality gate WARNING: $$warningCount warnings (threshold: 10)"; \
			exit 1; \
		} else { \
			Write-Host "✅ Quality gate PASSED"; \
		}'
	@rm -f qg-results.json

# Development helpers
dev-setup: setup
	@echo "Setting up development environment..."
	@mkdir -p $(REPORTS_DIR)
	@mkdir -p ./logs
	@echo "✓ Development environment ready"

quick-check:
	@echo "Quick quality check for changed files..."
	@$(PWSH_CMD) -Command '\
		$$changedFiles = git diff --name-only --diff-filter=AM | Where-Object { $$_ -match "\.(ps1|psm1|psd1)$$" }; \
		if ($$changedFiles) { \
			Write-Host "Checking $$(@($$changedFiles).Count) changed PowerShell files..."; \
			foreach ($$file in $$changedFiles) { \
				if (Test-Path $$file) { \
					& "$(QA_ENGINE)" -Path $$file -Mode Analyze -OutputFormat Console; \
				} \
			} \
		} else { \
			Write-Host "No PowerShell files changed"; \
		}'

# Maintenance
update-modules:
	@echo "Updating PowerShell modules..."
	@$(PWSH_CMD) -Command "Update-Module PSScriptAnalyzer -Force"
	@$(PWSH_CMD) -Command "Update-Module Pester -Force"
	@echo "✓ Modules updated"

version:
	@echo "PowerShell QA Engine Version Information"
	@echo "======================================="
	@$(PWSH_CMD) -Command "$$PSVersionTable"
	@echo ""
	@$(PWSH_CMD) -Command "Get-Module PSScriptAnalyzer -ListAvailable | Select-Object Name, Version"
	@$(PWSH_CMD) -Command "Get-Module Pester -ListAvailable | Select-Object Name, Version"

# Help for specific targets
help-ci:
	@echo "CI/CD Integration Help"
	@echo "====================="
	@echo ""
	@echo "GitHub Actions Example:"
	@echo "  - name: PowerShell QA"
	@echo "    run: make ci-analyze"
	@echo ""
	@echo "Quality Gate Example:"
	@echo "  - name: Quality Gate"
	@echo "    run: make quality-gate"
	@echo ""
	@echo "Azure DevOps Example:"
	@echo "  - script: make ci-fix"
	@echo "    displayName: 'PowerShell QA Fix'"

help-dev:
	@echo "Development Workflow Help"
	@echo "========================"
	@echo ""
	@echo "1. Initial Setup:"
	@echo "   make dev-setup"
	@echo ""
	@echo "2. Development Cycle:"
	@echo "   make quick-check    # Check changed files"
	@echo "   make fix DRY_RUN=1  # Preview fixes"
	@echo "   make fix            # Apply fixes"
	@echo "   make test           # Validate changes"
	@echo ""
	@echo "3. Before Commit:"
	@echo "   make all            # Complete validation"