# GitHub Actions Workflows

This directory contains the CI/CD workflows for JobSentinel. All workflows follow security best practices and have been optimized for speed, reliability, and cost-effectiveness.

## 🎯 Optimization Highlights

- **All actions pinned by commit SHA** (not tags) for supply chain security
- **Concurrency controls** prevent duplicate workflow runs
- **Composite actions** eliminate code duplication (DRY principle)
- **Minimal permissions** following least-privilege principle
- **Strict shell mode** (`set -euo pipefail`) prevents silent failures
- **Timeouts on all jobs** prevent runaway costs
- **Strategic caching** reduces build times
- **Path filtering** reduces unnecessary workflow runs

## 📋 Workflows Overview

### Security & Compliance

#### 1. **scorecard.yml** - OSSF Security Best Practices
**Triggers:** Push to `main`, PRs, Weekly schedule  
**Timeout:** 15 minutes  
**Concurrency:** Cancels in-progress runs on new pushes

**What it does:**
- Assesses repository against OSSF Security Scorecard criteria
- Checks for security best practices (dependency pinning, branch protection, etc.)
- Uploads SARIF report to GitHub Security tab
- Provides actionable recommendations for improvement

**Optimizations:**
- Weekly schedule prevents excessive runs
- Results cached in Security tab for historical tracking
- Non-blocking (advisory mode)

#### 2. **codeql.yml** - Code Security Scanning
**Triggers:** Push to `main`, PRs, Weekly schedule  
**Timeout:** 30 minutes  
**Concurrency:** Cancels in-progress runs on new pushes

**What it does:**
- Performs semantic code analysis for security vulnerabilities
- Detects SQL injection, XSS, command injection, etc.
- Analyzes Python code for security issues
- Uploads findings to GitHub Security tab

**Optimizations:**
- Autobuild for automatic language detection
- Weekly schedule for comprehensive scans
- Results integrated into PR review process

#### 3. **dependency-review.yml** - Dependency Vulnerability Scanning
**Triggers:** Pull requests only  
**Timeout:** 15 minutes  
**Concurrency:** Per-PR group

**What it does:**
- Scans new dependencies for known vulnerabilities
- Checks license compatibility
- Blocks PRs with moderate+ severity vulnerabilities
- Provides detailed vulnerability reports

**Safety features:**
- Only runs on PRs (not pushes)
- Fails CI on moderate or higher severity vulnerabilities
- License compliance checking

#### 4. **workflow-lint.yml** - GitHub Actions Workflow Validation
**Triggers:** Push to `main`, PRs (workflow changes only)  
**Timeout:** 10 minutes  
**Concurrency:** Cancels in-progress runs on new pushes

**What it does:**
- Validates all workflow YAML syntax
- Checks for common workflow mistakes
- Enforces workflow best practices
- Uses actionlint for comprehensive validation

**Optimizations:**
- Only runs when workflow files change
- Fast validation (< 1 minute typical)
- GITHUB_STEP_SUMMARY shows validation results

### Quality & Documentation

#### 5. **path-guard.yml** - File Organization Enforcement
**Triggers:** Push to `main`, PRs  
**Timeout:** 10 minutes  
**Concurrency:** Cancels in-progress runs on new pushes

**What it does:**
- Enforces file organization rules
- Ensures markdown files are in docs/
- Validates proper documentation structure
- Provides detailed violation reports

**Optimizations:**
- Bash-based for speed
- Clear error messages with file paths
- GITHUB_STEP_SUMMARY shows violations

#### 6. **docs-ci.yml** - Documentation Quality Validation
**Triggers:** Push to `main`, PRs (doc changes only)  
**Timeout:** 15 minutes  
**Concurrency:** Cancels in-progress runs on new pushes

**What it does:**
- Markdown linting with markdownlint
- Prose quality checking with Vale
- Link validation with lychee
- Ensures documentation meets quality standards

**Optimizations:**
- Three parallel jobs (markdown, prose, links)
- Only runs on documentation changes
- Caches Vale styles and lychee data
- GITHUB_STEP_SUMMARY shows lint results

### Testing & Coverage

#### 7. **ci.yml** - Main CI/CD Pipeline
**Triggers:** Push to `main`/`develop`, PRs  
**Timeout:** 15-20 minutes per job  
**Concurrency:** Cancels in-progress runs on new pushes

**What it does:**
- Multi-stage pipeline with change detection
- Primary Ubuntu Python 3.12 testing (fast path)
- Cross-platform validation
- Python version compatibility matrix (3.11, 3.12)
- Core quality gates (lint, type, coverage)
- Security audits (pip-audit)

**Optimizations:**
- **Change detection:** Only runs relevant jobs based on file changes
- **Fast primary test:** Ubuntu 3.12 as primary validation
- **Strategic testing:** Full matrix only when needed
- **Composite action:** Uses .github/actions/python-env for DRY
- **Timeout controls:** Prevents runaway costs (15-20 min)
- **Non-blocking quality:** Type/coverage warnings don't fail CI

#### 8. **coverage.yml** - Code Coverage Analysis
**Triggers:** Push to `main`, PRs  
**Timeout:** 20 minutes  
**Concurrency:** Cancels in-progress runs on new pushes

**What it does:**
- Runs test suite with coverage instrumentation
- Generates XML, HTML, and terminal reports
- Uploads coverage to Codecov
- Provides HTML artifact for detailed analysis

**Optimizations:**
- Uses composite action for Python setup
- Coverage data saved to file for summary
- HTML artifacts retained for 30 days
- GITHUB_STEP_SUMMARY shows coverage snapshot

### Automation

#### 9. **dependabot-auto-merge.yml** - Automatic Dependency Updates
**Triggers:** Pull requests opened by Dependabot  
**Timeout:** 10 minutes  
**Concurrency:** Per-PR group (no cancellation)

**What it does:**
- Auto-approves patch/minor version updates
- Auto-merges after CI passes
- Handles security updates with priority
- Comments on major updates requiring manual review

**Safety features:**
- Only auto-merges patch/minor updates (not major versions)
- Security updates always auto-approved
- Requires all CI checks to pass before merging
- Uses squash merge for clean history
- GITHUB_STEP_SUMMARY shows action taken

## 🔒 Security Hardening

All workflows implement these security best practices:

### Action Pinning
```yaml
# ✅ GOOD: Pinned to commit SHA
uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # v5.0.0

# ❌ BAD: Tag-based pinning
uses: actions/checkout@v5
```

See `ACTIONS_VERSIONS.md` for complete version reference.

### Minimal Permissions
```yaml
permissions:
  contents: read  # Only what's needed
```

Each job declares explicit permissions (least privilege).

### Credential Handling
- `persist-credentials: false` for checkout actions
- Secrets only passed where absolutely necessary
- No hardcoded credentials

### Shell Safety
```yaml
defaults:
  run:
    shell: bash

# In each step:
run: |
  set -euo pipefail  # Exit on error, undefined vars, pipe failures
  # command here
```

## 📊 Workflow Performance

| Workflow | Avg Duration | Triggers | Cost Impact |
|----------|-------------|----------|-------------|
| ci.yml | 10-15 min | Push/PR | Medium |
| coverage.yml | 8-12 min | Push/PR | Medium |
| test-macos-deployment.yml | 5-10 min | Manual | Low |
| test-windows-deployment.yml | 5-10 min | Manual | Low |
| docs-ci.yml | 5-8 min | Push/PR (docs) | Low |
| path-guard.yml | 1-2 min | Push/PR | Very Low |
| workflow-lint.yml | 1-2 min | Push/PR (workflows) | Very Low |
| codeql.yml | 15-20 min | Push/PR/Weekly | Medium |
| scorecard.yml | 3-5 min | Push/PR/Weekly | Low |
| dependency-review.yml | 2-4 min | PR only | Low |
| dependabot-auto-merge.yml | 1-2 min | Dependabot PRs | Very Low |

**Total estimated monthly cost:** ~$0-10 (GitHub Actions free tier covers most usage)

## 🔄 Concurrency Strategy

All workflows use concurrency groups to prevent duplicate runs:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Benefits:**
- Saves compute resources (cancel outdated runs)
- Faster feedback (latest changes always prioritized)
- Cost reduction (no duplicate work)

## 🚀 Composite Actions

Reusable setup logic lives in `.github/actions/`:

### python-env
**Location:** `.github/actions/python-env/action.yml`

**Purpose:** Sets up Python with caching and optional dependency installation

**Inputs:**
- `python-version`: Python version (default: "3.13")
- `cache-dependency-path`: Files for cache key (default: "requirements.txt")
- `install-deps`: Whether to install requirements (default: "false")
- `requirements-file`: Requirements file to install (default: "requirements.txt")
- `prepare-config`: Whether to copy example configs (default: "false")

**Usage:**
```yaml
- name: Prepare Python environment
  uses: ./.github/actions/python-env
  with:
    python-version: '3.12'
    install-deps: 'true'
    prepare-config: 'true'
```

**Benefits:**
- DRY principle (define once, use everywhere)
- Consistent Python setup across all workflows
- Centralized caching logic
- Version updates in one place

## 📦 Dependabot Configuration

See `.github/dependabot.yml` for automatic dependency updates:

- **Python dependencies:** Weekly updates
- **GitHub Actions:** Weekly updates
- **Docker:** Weekly updates (if applicable)
- **Auto-merge:** Patch and minor updates auto-merge after CI passes

## 🔧 Maintenance

### Updating Action Versions

1. Check `ACTIONS_VERSIONS.md` for current versions
2. Verify new version exists and get commit SHA:
   ```bash
   # Example for actions/checkout v5.0.1
   git ls-remote https://github.com/actions/checkout v5.0.1
   ```
3. Update ACTIONS_VERSIONS.md with new SHA
4. Search/replace across all workflows:
   ```bash
   find .github/workflows -name "*.yml" -exec sed -i '' 's/OLD_SHA/NEW_SHA/g' {} \;
   ```
5. Test workflows on a feature branch before merging

### Adding New Workflows

When creating new workflows:

1. Use existing workflows as templates
2. Always pin actions to commit SHAs
3. Set explicit permissions (minimal)
4. Add timeout-minutes to all jobs
5. Use concurrency groups
6. Add shell defaults with error handling
7. Include GITHUB_STEP_SUMMARY for visibility
8. Document in this README

### Rollback Procedure

If a workflow update causes issues:

1. Identify the problematic commit
2. Revert specific workflow file:
   ```bash
   git checkout <previous_commit> .github/workflows/<workflow>.yml
   git commit -m "Revert workflow changes"
   git push
   ```
3. Update ACTIONS_VERSIONS.md to reflect rollback
4. Document the issue for future reference

## 📚 References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Security Hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [OSSF Scorecard](https://github.com/ossf/scorecard)
- [CodeQL Documentation](https://codeql.github.com/docs/)

## 🤝 Contributing

When modifying workflows:

1. Test changes on a feature branch first
2. Update this README if adding/removing workflows
3. Update ACTIONS_VERSIONS.md if changing action versions
4. Ensure all security best practices are followed
5. Add GITHUB_STEP_SUMMARY output for visibility

## 📝 Changelog

**v1.0 (2025-01-15)** - Initial standardization
- Added ACTIONS_VERSIONS.md reference
- Pinned all actions to commit SHAs
- Added scorecard.yml for OSSF security scoring
- Added workflow-lint.yml for workflow validation
- Added dependency-review.yml for PR security scanning
- Standardized dependabot-auto-merge.yml
- Updated all workflows with consistent structure
- Added composite action for Python environment setup
- Implemented path filtering where appropriate
- Added this comprehensive README

---

**Last Updated:** 2025-01-15  
**Maintainer:** @cboyd0319
