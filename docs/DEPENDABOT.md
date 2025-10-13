# Dependabot Dependency Management

**TL;DR:** Dependabot automatically creates PRs for dependency updates. Patch/minor updates auto-merge if tests pass. Major updates require manual review.

**Quick actions:**
- Check pending PRs: `gh pr list --label dependencies`
- Approve all waiting PRs: Trigger "Approve Dependabot PRs" workflow
- Configure schedule: Edit `.github/dependabot.yml`

---

## Overview

JobSentinel uses GitHub Dependabot to keep dependencies up-to-date automatically. This reduces security risks and ensures compatibility with latest library versions.

### What Dependabot Does
1. **Monitors** dependencies in `requirements.txt`, `pyproject.toml`, GitHub Actions workflows
2. **Creates PRs** when updates are available (weekly Monday 09:00 UTC)
3. **Groups** related updates (production deps, dev deps, GitHub Actions)
4. **Auto-merges** patch/minor versions after CI passes
5. **Requires review** for major version bumps (potential breaking changes)

### Configuration File
**Location:** `.github/dependabot.yml`

```yaml
version: 2
updates:
  # Python dependencies
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "UTC"
    commit-message:
      prefix: "chore(deps):"
    groups:
      production-dependencies:
        patterns: ["*"]
        exclude-patterns: ["pytest*", "ruff*", "mypy*", "black*"]
      dev-dependencies:
        patterns: ["pytest*", "ruff*", "mypy*", "black*"]
  
  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "UTC"
    commit-message:
      prefix: "chore(deps):"
    groups:
      github-actions:
        patterns: ["*"]
```

**Key settings:**
- **Weekly schedule:** Monday 09:00 UTC (avoid weekend surprises)
- **Grouped updates:** Related deps in single PR (cleaner, faster)
- **Commit prefix:** `chore(deps):` for semantic commits
- **Separate groups:** Production vs dev dependencies

---

## Automatic Merge Workflow

**File:** `.github/workflows/dependabot-auto-merge.yml`

### How It Works
1. Dependabot creates PR
2. CI runs tests automatically (python-qa.yml workflow)
3. Workflow approves PR automatically
4. If update type is **patch** or **minor**:
   - Workflow enables auto-merge
   - PR merges when all checks pass
5. If update type is **major**:
   - PR stays open for manual review
   - Requires maintainer approval to merge

### Approval Logic
```yaml
# Approves ALL Dependabot PRs
- gh pr review "$PR_URL" --approve -b "Auto-approved by Dependabot workflow"

# Auto-merges only patch/minor updates
- if [[ "$UPDATE_TYPE" == "version-update:semver-patch" ]] || \
     [[ "$UPDATE_TYPE" == "version-update:semver-minor" ]]; then
    gh pr merge --auto --squash "$PR_URL"
  fi
```

### What Gets Auto-Merged
✅ **Auto-merge enabled:**
- `ruff 0.5.0 → 0.5.1` (patch)
- `flask 2.3.0 → 2.4.0` (minor)
- GitHub Actions minor updates

❌ **Manual review required:**
- `flask 2.4.0 → 3.0.0` (major — potential breaking changes)
- `python 3.11 → 3.12` (major — language version)

---

## Managing Dependabot PRs

### View Pending PRs

**GitHub UI:**
```
Repository → Pull Requests → Label: dependencies
```

**Command line:**
```bash
# List all Dependabot PRs
gh pr list --label dependencies

# Check status of specific PR
gh pr view <PR_NUMBER>

# See diff
gh pr diff <PR_NUMBER>
```

### Manually Approve Existing PRs

For PRs created before auto-merge workflow was enabled:

**Option 1: Trigger Bulk Approval Workflow (Recommended)**

1. Go to Actions tab → "Approve Dependabot PRs"
2. Click "Run workflow" → Select branch → Run
3. Workflow approves all open Dependabot PRs
4. Eligible PRs (patch/minor) auto-merge when checks pass

**Option 2: Command Line Script**

```bash
# Approve all Dependabot PRs
./scripts/approve_dependabot_prs.sh

# Approve and enable auto-merge for patch/minor updates
./scripts/approve_dependabot_prs.sh --auto-merge
```

### Review Major Version Updates

**Process:**
1. Check CHANGELOG for breaking changes:
   ```bash
   gh pr view <PR_NUMBER> --comments
   # Look for Dependabot's compatibility notes
   ```

2. Review dependency's migration guide:
   ```bash
   # Example: Flask 2.x → 3.x migration
   open https://flask.palletsprojects.com/en/latest/changes/
   ```

3. Run tests locally:
   ```bash
   gh pr checkout <PR_NUMBER>
   make test
   make lint
   make type
   ```

4. Approve if compatible:
   ```bash
   gh pr review <PR_NUMBER> --approve
   gh pr merge <PR_NUMBER> --squash
   ```

5. Close if incompatible:
   ```bash
   gh pr close <PR_NUMBER> --comment "Requires code changes for compatibility"
   # Create issue to track migration work
   gh issue create --title "Migrate to <package> v<version>" \
                    --body "Breaking changes: <list>" \
                    --label "dependencies,enhancement"
   ```

---

## Troubleshooting

### PR Created But Not Auto-Merging

**Check 1: CI Status**
```bash
gh pr checks <PR_NUMBER>
```
If checks are failing, fix the underlying issue. Auto-merge only proceeds when all checks pass.

**Check 2: Update Type**
```bash
gh pr view <PR_NUMBER> --json title,labels
```
If title contains "Bump <package> from X.0.0 to Y.0.0" (major update), auto-merge is intentionally disabled.

**Check 3: Workflow Permissions**
```bash
# Verify workflow has write permissions
cat .github/workflows/dependabot-auto-merge.yml | grep permissions
```
Should show:
```yaml
permissions:
  contents: write
  pull-requests: write
```

### Dependabot PRs Not Being Created

**Check 1: Configuration**
```bash
# Validate dependabot.yml syntax
cat .github/dependabot.yml
```

**Check 2: Dependabot Status**
```
Repository → Insights → Dependency graph → Dependabot
```
Look for errors or "Last checked" timestamp.

**Check 3: Schedule**
```bash
# Current schedule: Mondays 09:00 UTC
date -u  # Check current UTC time
```
If it's not Monday 09:00 UTC, wait for next scheduled run or trigger manually:
```
Repository Settings → Code security and analysis → Dependabot → Configure → Check for updates
```

### Merge Conflicts

**Symptom:** PR shows merge conflicts, blocks auto-merge

**Fix:**
```bash
# Rebase Dependabot PR (Dependabot will do this automatically)
gh pr comment <PR_NUMBER> --body "@dependabot rebase"

# Or manually resolve locally
gh pr checkout <PR_NUMBER>
git fetch origin main
git rebase origin/main
# Resolve conflicts in files
git add <files>
git rebase --continue
git push --force-with-lease
```

### Security Vulnerability Not Fixed

**Symptom:** GitHub Security tab shows vulnerability, but Dependabot hasn't created PR

**Cause:** Dependabot only updates direct dependencies. Transitive (indirect) dependencies require updating parent package.

**Fix:**
```bash
# Find which direct dependency pulls in vulnerable package
pip show <vulnerable-package>
# Required-by: <parent-package>

# Update parent package
pip install --upgrade <parent-package>
# Or wait for Dependabot to update parent package
```

---

## Security Considerations

### Dependency Review
- **Automated scans:** GitHub automatically scans dependencies for known vulnerabilities
- **Security alerts:** Enable in Repository Settings → Security & Analysis → Dependabot alerts
- **Advisory database:** Uses GitHub Advisory Database + National Vulnerability Database (NVD)

### Supply Chain Security
- **Lock files:** `requirements.txt` pins exact versions
- **Hash verification:** Consider adding `--require-hashes` for production deployments
- **SBOM:** Generate Software Bill of Materials:
  ```bash
  pip-audit --format cyclonedx-json --output sbom.json
  ```

### Review Guidelines
✅ **Safe to auto-merge:**
- Patch versions (0.5.0 → 0.5.1) — bug fixes only
- Minor versions (0.5.0 → 0.6.0) — new features, backward compatible
- Dependencies with ≥95% test coverage
- Dependencies with active maintenance (commits in last 6 months)

⚠️ **Requires review:**
- Major versions (1.x → 2.x) — breaking changes likely
- New dependencies added as transitive deps
- Dependencies with recent CVEs (check advisory)
- Updates that change 10+ transitive dependencies

---

## Configuration Changes

### Change Update Frequency

Edit `.github/dependabot.yml`:

```yaml
schedule:
  interval: "daily"   # Options: daily, weekly, monthly
  time: "09:00"       # HH:MM in timezone
  timezone: "UTC"     # IANA timezone
```

**Recommendation:** Weekly is optimal balance between freshness and PR noise.

### Add New Dependency Source

Example: Add Docker updates

```yaml
updates:
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
    commit-message:
      prefix: "chore(deps):"
```

Supported ecosystems: `pip`, `npm`, `cargo`, `docker`, `github-actions`, `gomod`, `maven`, `gradle`, etc.

### Ignore Specific Dependencies

```yaml
updates:
  - package-ecosystem: "pip"
    directory: "/"
    # Ignore major version updates for specific packages
    ignore:
      - dependency-name: "django"
        update-types: ["version-update:semver-major"]
      - dependency-name: "sqlalchemy"
        versions: ["2.x"]  # Ignore all 2.x versions
```

**Use case:** Pin to specific major version until migration work is completed.

### Change Auto-Merge Behavior

Edit `.github/workflows/dependabot-auto-merge.yml`:

```yaml
# Example: Also auto-merge major updates for dev dependencies
- name: Enable auto-merge
  if: |
    (steps.metadata.outputs.update-type == 'version-update:semver-patch' ||
     steps.metadata.outputs.update-type == 'version-update:semver-minor' ||
     (steps.metadata.outputs.update-type == 'version-update:semver-major' &&
      steps.metadata.outputs.dependency-type == 'direct:development'))
  run: gh pr merge --auto --squash "$PR_URL"
```

**Caution:** Auto-merging major updates increases risk of breaking changes reaching main branch.

---

## Best Practices

### For Maintainers
1. **Review security updates immediately** — Don't let CVE fixes sit unmerged
2. **Test major updates locally** — Run full test suite before approving
3. **Read CHANGELOGs** — Understand what changed before merging
4. **Monitor CI** — Failing tests indicate compatibility issues
5. **Keep lock files** — Commit `requirements.txt` changes from Dependabot

### For Contributors
1. **Rebase on latest main** — Reduces merge conflicts with Dependabot PRs
2. **Don't manually edit Dependabot PRs** — Let Dependabot manage its own PRs
3. **Report compatibility issues** — If Dependabot update breaks your feature, open issue
4. **Pin dependencies conservatively** — Use `>=` and `<` ranges in `pyproject.toml`

### For CI/CD
1. **Require all checks** — Branch protection rules should require CI pass
2. **Test on multiple Python versions** — Matrix testing catches compatibility issues early
3. **Run security scans** — Integrate `pip-audit` or `safety` in CI
4. **Cache dependencies** — Speed up CI with `actions/cache`

---

## Related Documentation

- [Contributing Guide](../CONTRIBUTING.md) — Development workflow
- [Security Policy](../SECURITY.md) — Vulnerability disclosure
- [CI/CD Workflows](.github/workflows/) — GitHub Actions configuration
- [Best Practices](BEST_PRACTICES.md) — Production-grade patterns

---

## Quick Reference

| Task | Command |
|------|---------|
| List Dependabot PRs | `gh pr list --label dependencies` |
| Approve all PRs | Trigger "Approve Dependabot PRs" workflow |
| Review specific PR | `gh pr view <NUMBER>` |
| Check PR diff | `gh pr diff <NUMBER>` |
| Rebase PR | `gh pr comment <NUMBER> --body "@dependabot rebase"` |
| Merge manually | `gh pr merge <NUMBER> --squash` |
| Close PR | `gh pr close <NUMBER>` |
| Validate config | Check `.github/dependabot.yml` syntax |
| Force update check | Repository → Dependency graph → Dependabot → Check for updates |

**Need help?** Open an issue with:
- PR number or link
- Output from `gh pr checks <NUMBER>`
- Error messages from workflow logs
