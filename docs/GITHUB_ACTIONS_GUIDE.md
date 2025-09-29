# GitHub Actions Workflows Guide

This document outlines the enhanced GitHub Actions workflows that provide comprehensive CI/CD, security scanning, and automation for the job scraper project.

## Workflow Overview

### 🔄 CI/CD Pipeline (`ci.yml`)
**Purpose**: Fast, efficient continuous integration with comprehensive testing
**Triggers**: Push/PR to `main` or `develop` branches

**Features**:
- ⚡ **Performance optimized** with pip caching and parallel execution
- 🛡️ **Security hardened** with credential isolation and minimal permissions
- 🧪 **Multi-platform testing** (Ubuntu, macOS, Windows)
- 📊 **Intelligent change detection** to skip unnecessary runs

**Jobs**:
1. **Change Detection**: Determines what files changed to optimize subsequent jobs
2. **Fast Primary Test**: Ubuntu + Python 3.12 for rapid feedback
3. **Cross-Platform Test**: Matrix testing across OS/Python versions
4. **PowerShell Validation**: Windows-specific script validation

### 🔒 Security Pipeline (`security.yml`)
**Purpose**: Multi-layered security scanning with enterprise-grade practices
**Triggers**: Push/PR to `main` or `develop`, manual dispatch with scan type selection

**Security Tools**:
- **CodeQL**: GitHub's semantic code analysis
- **Bandit**: Python-specific security linting
- **Safety**: Known vulnerability scanning
- **Semgrep**: Pattern-based security analysis
- **Prowler**: CIS benchmark compliance for GitHub
- **TruffleHog**: Secret detection
- **YAML Lint**: Configuration validation

**Security Enhancements**:
- `persist-credentials: false` on all checkouts
- OIDC token support for secure cloud authentication
- Dependabot protection against untrusted code execution
- Minimal permission sets per job
- Enhanced timeout handling for reliable scans

### 🪟 PowerShell Validation (`powershell-validation.yml`)
**Purpose**: Comprehensive validation of PowerShell scripts
**Triggers**: Changes to `.ps1` files

**Validation Steps**:
1. **PSScriptAnalyzer**: Static analysis for best practices
2. **Syntax Testing**: Parse validation
3. **Security Analysis**: Pattern-based security checks

## Performance Optimizations

### ⚡ Caching Strategy
```yaml
# Python dependency caching
- uses: actions/setup-python@v5
  with:
    cache: 'pip'
    cache-dependency-path: 'requirements.txt'
```

### 🚀 Parallel Execution
- **Concurrency groups** prevent redundant runs
- **Matrix testing** runs OS/Python combinations in parallel
- **Job dependencies** minimize wait times
- **Change detection** skips unnecessary jobs

### 📦 Optimized Dependencies
```bash
# Install security tools without dependencies first
pip install --no-deps bandit[toml] safety
# Then install project dependencies
pip install -r requirements.txt
```

## Security Best Practices

### 🔐 Credential Management
- All secrets managed through GitHub Secrets
- `persist-credentials: false` prevents credential leakage
- OIDC tokens for cloud authentication
- No hardcoded credentials in workflows

### 🛡️ Access Control
```yaml
permissions:
  contents: read          # Minimal read access
  security-events: write  # SARIF upload only
  id-token: write        # OIDC authentication
```

### 🚨 Threat Protection
- Dependabot PR restrictions
- Untrusted code execution prevention
- Resource limits and timeouts
- Cancel-in-progress for efficiency

## Configuration Files

### `.yamllint.yml`
Project-specific YAML linting rules:
- 120 character line limit (vs default 80)
- Document start markers disabled
- Truthy values configured for GitHub Actions

### Workflow Triggers
```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:  # Manual triggering
    inputs:
      scan_type:
        description: 'Security scan depth'
        required: false
        default: 'basic'
        type: choice
        options: [full, basic, dependencies-only]
```

## Monitoring and Troubleshooting

### 📊 Workflow Status
- All workflows upload SARIF results to Security tab
- Status badges in README for quick status checks
- Comprehensive logging with structured output

### 🔍 Debugging
1. **Check workflow logs** for specific error messages
2. **Review SARIF uploads** in Security tab
3. **Use manual dispatch** to test specific scan types
4. **Validate YAML locally** with project config

### ⚠️ Common Issues
- **Prowler timeouts**: Fixed with `--timeout 300` and `--no-cache-dir`
- **YAML lint failures**: Use project config with 120 char limit
- **Dependency conflicts**: Optimized install order
- **Permission errors**: Minimal permissions with OIDC support

## Best Practices for Contributors

### 🔧 Local Testing
```bash
# Validate YAML before push
yamllint .github/workflows/ --config-file config/.yamllint.yml

# Run security scans locally
scripts/precommit-security-scan.sh

# Test Python syntax
find . -name "*.py" -exec python3 -m py_compile {} +
```

### 📝 Making Changes
1. **Test locally first** using provided scripts
2. **Use descriptive commit messages**
3. **Keep workflows focused** - one concern per workflow
4. **Maintain security standards** - never weaken existing protections

### 🚀 Performance Considerations
- **Use caching** for dependencies when possible
- **Minimize job dependencies** to enable parallelization
- **Skip unnecessary steps** with conditional execution
- **Optimize install commands** with `--no-deps` when appropriate

## Integration with Cloud Deployment

The workflows integrate seamlessly with cloud deployment:
- **OIDC tokens** for secure cloud authentication
- **Security scanning** before deployment
- **Cost monitoring** integration
- **Automated rollback** on security failures

For cloud deployment details, see `docs/CLOUD_DEPLOYMENT_GUIDE.md`.