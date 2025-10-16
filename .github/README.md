# .github Directory Overview

This directory contains all GitHub-specific configuration and workflows for the JobSentinel repository.

## 📁 Directory Structure

```
.github/
├── actions/                      # Reusable composite actions
│   └── python-env/              # Python environment setup action
├── scripts/                      # Workflow-related scripts
│   └── validate-workflows.py    # Workflow validation tool
├── workflows/                    # GitHub Actions workflows (9 total)
│   ├── ci.yml                   # Main CI/CD pipeline
│   ├── codeql.yml               # CodeQL security analysis
│   ├── coverage.yml             # Code coverage reporting
│   ├── dependabot-auto-merge.yml # Dependency update automation
│   ├── docs-ci.yml              # Documentation validation
│   ├── path-guard.yml           # Repository structure validation
│   ├── security.yml             # PyGuard security scanning
│   ├── test-macos-deployment.yml # macOS deployment testing
│   └── test-windows-deployment.yml # Windows deployment testing
├── ISSUE_TEMPLATE/              # Issue templates for bug reports, features
├── pull_request_template.md     # PR template
├── dependabot.yml               # Dependabot configuration
├── copilot-instructions.md      # Repository instructions for AI assistants
├── MCP_CONFIG_README.md         # MCP integration documentation
├── WORKFLOWS.md                 # Comprehensive workflow documentation
└── WORKFLOW_IMPROVEMENTS_SUMMARY.md # Recent workflow improvements
```

## 🔧 Quick Reference

### Running Workflow Validation

```bash
# Validate all workflows
python .github/scripts/validate-workflows.py

# Expected output: ✅ All workflows are valid
```

### Key Workflows

- **CI/CD Pipeline** - Runs on all PRs, includes tests, linting, type checking
- **CodeQL** - Weekly security scanning + on Python changes
- **Path Guard** - Validates file structure on all PRs
- **Coverage** - Detailed coverage reports with HTML artifacts
- **Docs CI** - Markdown linting, prose linting, link checking

### Important Files

- **WORKFLOWS.md** - Complete guide to all workflows
- **copilot-instructions.md** - Repository standards and structure
- **dependabot.yml** - Automated dependency updates

## 🔒 Security

All workflows follow security best practices:

- `persist-credentials: false` on all checkouts
- Minimal permissions (least privilege)
- Action version pinning with Dependabot updates
- Dual security scanning (CodeQL + PyGuard)
- SARIF integration with GitHub Security tab

## 💰 Cost Optimization

Workflows are optimized for personal project use:

- Concurrency control prevents duplicate runs
- Timeout limits prevent runaway jobs
- Path-based triggers avoid unnecessary runs
- Manual dispatch for expensive operations
- No unnecessary scheduled runs

## 📚 Documentation

- [Complete Workflow Guide](WORKFLOWS.md)
- [Recent Improvements Summary](WORKFLOW_IMPROVEMENTS_SUMMARY.md)
- [MCP Configuration](MCP_CONFIG_README.md)
- [Repository Instructions](copilot-instructions.md)

## 🛠️ Maintenance

- **Dependabot:** Automatically updates action versions weekly
- **Validation:** Run `validate-workflows.py` before committing workflow changes
- **Review:** Quarterly review of workflow efficiency and costs

## ⚙️ Composite Actions

### python-env

Reusable action for setting up Python environment with optional dependencies.

**Usage:**
```yaml
- uses: ./.github/actions/python-env
  with:
    python-version: '3.12'
    install-deps: 'true'
    prepare-config: 'true'
```

## 🚀 CI/CD Pipeline Flow

```
Pull Request
     │
     ├─> CI Pipeline (tests, lint, type check, coverage)
     ├─> Docs CI (markdown, vale, link check)
     ├─> Path Guard (structure validation)
     ├─> CodeQL (on Python changes)
     └─> Security (PyGuard)
           │
           └─> All Passed? → Ready to Merge
```

## 📊 Metrics

- **Total Workflows:** 9
- **Total Composite Actions:** 1
- **YAML Syntax Validation:** 100% pass rate
- **Security Workflows:** 2 (CodeQL + PyGuard)
- **Validation Workflows:** 1 (Path Guard)
- **Documentation:** ~17,000 characters

## 🔗 Related Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)

---

**Last Updated:** 2025-10-16  
**Maintained by:** cboyd0319
