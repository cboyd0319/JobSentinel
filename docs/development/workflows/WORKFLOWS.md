# GitHub Actions Workflows Documentation

This document provides a comprehensive overview of all GitHub Actions workflows in the JobSentinel repository.

## Workflow Inventory

### 1. CI/CD Pipeline (`ci.yml`)

**Purpose:** Main continuous integration and testing workflow

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Manual dispatch

**Key Features:**
- Path-based change detection to skip unnecessary jobs
- Fast primary test on Ubuntu with Python 3.12
- Cross-platform testing (Ubuntu)
- Python version matrix testing (3.11, 3.12)
- Lint, type checking, and coverage analysis
- Security audit with pip-audit
- Codecov integration for coverage reporting

**Cost Optimization:**
- Skips when only docs are changed
- 15-minute timeout on primary tests
- Concurrency control to cancel outdated runs
- No scheduled runs (manual only)

### 2. CodeQL Security Analysis (`codeql.yml`) **NEW**

**Purpose:** Advanced security scanning using GitHub's CodeQL engine

**Triggers:**
- Push to `main` or `develop` branches (Python files only)
- Pull requests to `main` or `develop` branches (Python files only)
- Weekly schedule (Mondays at 00:00 UTC)
- Manual dispatch

**Key Features:**
- Security-extended query suite for comprehensive analysis
- Excludes tests, examples, and scripts from analysis
- Uploads SARIF results to GitHub Security tab
- Artifact retention for 30 days

**Why CodeQL:**
- Industry-standard security analysis
- Deep semantic analysis beyond pattern matching
- Catches complex security issues (SQL injection, XSS, etc.)
- Free for public repositories
- Complements PyGuard scanning

### 3. Security Scanning - PyGuard (`security.yml`)

**Purpose:** Python-specific security scanning with PyGuard

**Triggers:**
- Push to `main` branch
- Pull requests to `main` or `develop` branches
- Manual dispatch

**Key Features:**
- Scans application code and scripts
- Detects 20+ vulnerability categories
- Includes dependency scanning
- Generates SARIF output for GitHub Security tab
- Non-blocking (fail-on-error: false)

**Why PyGuard:**
- Python-focused analysis
- Faster than CodeQL for quick checks
- Complements CodeQL with different detection methods

### 4. Coverage Analysis (`coverage.yml`)

**Purpose:** Dedicated code coverage analysis with detailed reporting

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch

**Key Features:**
- Comprehensive coverage report generation
- HTML coverage report as artifact (30-day retention)
- Codecov integration
- Detailed summary in GitHub Actions UI

**Note:** While CI workflow also runs coverage, this workflow provides:
- Detailed HTML reports for download
- Focused coverage analysis without other CI noise
- Artifact retention for historical analysis

### 5. Documentation CI (`docs-ci.yml`)

**Purpose:** Validates documentation quality and consistency

**Triggers:**
- Push to `main` branch
- Pull requests

**Jobs:**
1. **markdownlint** - Markdown syntax and style checking
2. **vale** - Prose style linting (tone, voice, clarity)
3. **link-check** - Validates all links in documentation

**Key Features:**
- Enforces documentation standards
- Prevents broken links
- Ensures consistent writing style
- 10-minute timeout per job

### 6. Path Guard (`path-guard.yml`) **NEW**

**Purpose:** Enforces repository file structure per copilot-instructions.md

**Triggers:**
- Pull requests (opened, synchronized, reopened)
- Manual dispatch

**Key Features:**
- Validates file placement against repository standards
- Prevents files in deprecated locations:
  - `src/`, `tests/`, `scripts/`, `config/` (pre-v0.9 structure)
  - Files directly in `deploy/common/` root
  - Docs in `deploy/common/docs/` (should be in `docs/`)
- Provides helpful PR comments with fix suggestions
- Fast validation (5-minute timeout)

**Why Path Guard:**
- Maintains consistent repository structure
- Prevents regressions to old structure
- Educates contributors on correct file placement
- Catches mistakes before code review

### 7. Dependabot Auto-Merge (`dependabot-auto-merge.yml`)

**Purpose:** Automates dependency update merges

**Triggers:**
- Pull requests (from Dependabot only)

**Auto-Merge Strategy:**
- **Security updates:** Auto-approve and auto-merge immediately
- **Patch/minor updates:** Enable auto-merge (requires passing CI)
- **Major updates:** Comment only, requires manual review

**Key Features:**
- Reduces maintenance burden
- Ensures security updates are applied ASAP
- Requires CI to pass before merge
- 5-minute timeout

### 8. macOS Deployment Testing (`test-macos-deployment.yml`)

**Purpose:** Validates macOS deployment scripts and documentation

**Triggers:**
- Manual dispatch (cost-conscious)
- Pull requests affecting macOS deployment files

**Tests:**
- Script existence and executability
- Python syntax validation
- Path resolution in shell scripts
- Platform detection
- Documentation completeness

**Cost Optimization:**
- Only runs when macOS files change
- 30-minute timeout
- No scheduled runs

### 9. Windows Deployment Testing (`test-windows-deployment.yml`)

**Purpose:** Validates Windows deployment scripts and documentation

**Triggers:**
- Manual dispatch (cost-conscious)
- Pull requests affecting Windows deployment files

**Tests:**
- PowerShell script existence
- Python syntax validation
- Path resolution in PowerShell
- Documentation completeness

**Cost Optimization:**
- Only runs when Windows files change
- 30-minute timeout
- No scheduled runs

## Workflow Best Practices

### All workflows follow these standards:

1. **Concurrency Control**
   - Prevents duplicate runs
   - Cancels outdated runs (except Dependabot)
   - Saves compute resources

2. **Timeout Limits**
   - Prevents runaway jobs
   - Fails fast on issues
   - Protects against cost overruns

3. **Security**
   - `persist-credentials: false` on checkout
   - Minimal permissions (least privilege)
   - Action version pinning with Dependabot updates

4. **Cost Consciousness**
   - Path-based triggers where appropriate
   - Manual dispatch for expensive operations
   - Smart caching strategies
   - No unnecessary scheduled runs

5. **YAML Quality**
   - All workflows validated with YAML linting
   - Consistent formatting
   - Clear job and step names

## Workflow Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                     Pull Request Opens                       │
└────────────────────┬────────────────────────────────────────┘
                     │
      ┌──────────────┼──────────────┐
      │              │              │
      ▼              ▼              ▼
  ┌────────┐   ┌──────────┐   ┌──────────┐
  │ CI/CD  │   │   Docs   │   │  Path    │
  │Pipeline│   │    CI    │   │  Guard   │
  └────────┘   └──────────┘   └──────────┘
      │
      ├─> Security Scan (PyGuard)
      ├─> CodeQL Analysis (on Python changes)
      ├─> Coverage Analysis
      └─> Platform Tests (if deployment files changed)
                     │
                     ▼
              ┌──────────────┐
              │   Merge to   │
              │     Main     │
              └──────────────┘
                     │
                     ├─> CodeQL Weekly Scan
                     └─> Dependabot Updates
```

## Adding New Workflows

When adding a new workflow, ensure it includes:

1. Clear name and purpose in header comment
2. Appropriate triggers (avoid unnecessary runs)
3. Concurrency control
4. Timeout limits on all jobs
5. `persist-credentials: false` on checkout
6. Minimal permissions
7. Cost-conscious design (for personal project)

## Maintenance

- **Dependabot:** Automatically updates action versions weekly
- **Monthly Review:** Check workflow efficiency and costs
- **Quarterly Audit:** Review workflow necessity and optimization opportunities

## Related Documentation

- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides)
- [Dependabot Configuration](../.github/dependabot.yml)
- [Repository Structure Guidelines](../.github/copilot-instructions.md)
- [Contributing Guide](../CONTRIBUTING.md)

---

**Last Updated:** 2025-10-16
**Workflow Count:** 9
**Total Lines of YAML:** ~1,000+
