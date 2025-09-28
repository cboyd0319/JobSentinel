# GitHub Actions Workflows

These are simple CI workflows I use to keep the project healthy across platforms. Nothing fancy — just enough to catch obvious issues.

## Active Workflows

### 1. `ci.yml` — basic CI
- Triggers: pushes and PRs
- Runs a small set of checks to keep things from breaking
- Tests on Ubuntu/Windows/macOS with supported Python versions

### 2. `release.yml` — releases
- Triggered by tags (`v*.*.*`) or manual dispatch
- Creates a GitHub release and attaches basic assets

### 3. `dependency-submission.yml`
- Submits Python dependencies so GitHub can surface security notices

### 4. `security.yml` — Security & Vulnerability Scanning
- Triggers: pushes, PRs, and weekly schedule
- Runs a comprehensive suite of security tools, including:
  - **Bandit**: Python static analysis
  - **Safety**: Dependency vulnerability scanning
  - **OSV**: Open Source Vulnerability database
  - **Semgrep**: Multi-language security patterns
  - **CodeQL**: GitHub's semantic code analysis
  - **Dependency Review**: License and vulnerability review for PRs
  - **Prowler**: GitHub CIS benchmark scanning
  - **yamllint**: YAML syntax and style checking
  - **TruffleHog**: Secret scanning
- Posts a summary of the scan results as a comment on pull requests.

## Configuration Files

### `dependabot.yml`
- Automated dependency updates for Python packages and GitHub Actions
- Weekly schedule with review assignments
- Conventional commit message formatting

## Workflow notes

- Keep runs fast and only as complex as needed
- Cross-platform checks are there to catch common issues

## Troubleshooting

### Common Issues

1. **"python-version input not set" warning**
   - Resolved by explicit `python-version` specification in all workflows
   - All workflows now use Python 3.12 as the standard version

2. **Excessive workflow runs**
   - CI pipeline uses path filtering to avoid unnecessary runs
   - Documentation changes only trigger lightweight checks

3. **Permission errors**
   - Workflows have minimal required permissions for security
   - Dependency submission has `security-events: write` for vulnerability alerts

### Manual Workflow Triggers

```bash
# Create a new release
git tag v1.0.1
git push origin v1.0.1

# Or use GitHub UI: Actions > Release > Run workflow
```

## Security notes

- Minimal permissions
- Avoid secrets in logs
- Dependabot and GitHub alerts help flag risky dependencies
