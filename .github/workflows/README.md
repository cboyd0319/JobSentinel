# GitHub Actions Workflows

This directory contains automated CI/CD workflows for JobSentinel.

## Active Workflows

### 🚀 CI/CD Pipeline (`ci.yml`)

**Triggers:** Push/PR to main/develop, workflow_dispatch  
**Purpose:** Core testing, linting, and quality checks

**Jobs:**
- **changes:** Detects which files changed to optimize workflow execution
- **primary-test:** Fast smoke test on Ubuntu with Python 3.13
  - Syntax validation
  - Package installation (dev extras)
  - Database functionality test
  - Core quality gates (lint, type check, coverage ≥85%)
  - Security scans (bandit, pip-audit)
- **cross-platform-ubuntu:** Extended Ubuntu testing with package installation
- **core-quality-matrix:** Matrix testing across Python 3.11, 3.12, 3.13

**Cost Optimizations:**
- Path-based filtering (skips doc-only changes)
- Concurrency cancellation for rapid iterations
- No scheduled runs (manual-only for personal projects)

### 🔒 Security Scanning (`security.yml`)

**Triggers:** Push/PR to main/develop, workflow_dispatch  
**Purpose:** Security vulnerability detection and SARIF reporting

**Scans:**
- **Bandit:** Python security linter → SARIF upload to GitHub Security
- **Safety:** Dependency vulnerability scanner → SARIF upload
  - Supports optional API key for enhanced scanning
  - Falls back to free scan if no key provided

**Outputs:** Results visible in GitHub Security tab

### 🧹 MegaLinter (`mega-linter.yml`)

**Triggers:** Push/PR to main, workflow_dispatch  
**Purpose:** Multi-language comprehensive linting (advisory)

**Configuration:**
- Runs on all PRs for additional quality insights
- Continues on error (non-blocking)
- Complements Python-specific tools (ruff, black, mypy)
- Uploads detailed reports as artifacts

**Note:** This provides broader checks beyond Python. Primary Python linting happens in CI workflow.

### 🤖 Dependabot Auto-Merge (`dependabot-automerge.yml`)

**Triggers:** Dependabot PRs  
**Purpose:** Automatic merging of safe dependency updates

**Auto-merge criteria:**
- Patch or minor version updates only (semver)
- Direct production dependencies only
- All CI checks must pass

**Safety:** Major version updates require manual review.

## Workflow Design Principles

### 1. **Cost Efficiency**
- No scheduled runs (use workflow_dispatch for manual triggers)
- Path filters skip unnecessary runs
- Concurrency cancellation prevents duplicate work
- Short timeouts prevent runaway costs

### 2. **Fast Feedback**
- Primary test job optimized for speed (~3-5 min)
- Matrix jobs run in parallel
- Path detection skips irrelevant changes

### 3. **Python 3.13 First**
- All workflows use Python 3.13 (matches `pyproject.toml` requirement)
- Matrix includes 3.11, 3.12 for compatibility testing

### 4. **Security by Default**
- Minimal permissions (`contents: read`)
- No credential persistence in checkouts
- Security scan results in GitHub Security tab

## Custom Actions

### `.github/actions/python-env/`

Reusable composite action for Python environment setup:
- Installs specified Python version (default: 3.13)
- Pip caching for faster installs
- Optional dependency installation
- Optional config file preparation

**Usage:**
```yaml
- uses: ./.github/actions/python-env
  with:
    python-version: '3.13'
    install-deps: 'true'
    prepare-config: 'true'
```

## Local Testing

### Validate Workflow Syntax
```bash
# Install act (GitHub Actions local runner)
# See: https://github.com/nektos/act

# Run specific workflow
act -l  # List available workflows
act push -j primary-test  # Run primary-test job
```

### Run Quality Checks Locally
```bash
# Same checks as CI workflow
make lint    # Ruff linting
make type    # Mypy type checking  
make cov     # Coverage ≥85%
make test    # Full test suite
```

## Troubleshooting

### Workflow Fails with "Python 3.13 not available"
- Ensure `python-version: '3.13'` is set in workflow
- Check `actions/setup-python@v5` is being used
- Python 3.13 may not be available in older runner images

### Security Workflow Fails on Safety Scan
- Safety scan continues on error (non-blocking)
- Add `SAFETY_API_KEY` secret for enhanced scanning
- Free tier has rate limits

### MegaLinter Takes Too Long
- MegaLinter is marked `continue-on-error: true` (non-blocking)
- Focus on CI workflow's `make lint` for Python-specific issues
- MegaLinter provides additional insights but is not required for merge

## Recent Fixes

See [FIXES.md](FIXES.md) for details on recent workflow error fixes and improvements.

## Contributing

When adding new workflows:
1. Use Python 3.13 as base version
2. Add cost-optimization annotations (💰 comments)
3. Include path filters for efficiency
4. Document purpose and triggers in this README
5. Test locally with `act` when possible
6. Ensure package installation before module imports

See [CONTRIBUTING.md](../../docs/governance/CONTRIBUTING.md) for full guidelines.
