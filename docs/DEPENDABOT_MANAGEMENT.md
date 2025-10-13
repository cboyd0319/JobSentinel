# Dependabot PR Management

This document describes how to manage Dependabot PRs in the JobSentinel repository.

> **Quick Start:** For a quick reference guide, see [Dependabot Quick Start](DEPENDABOT_QUICK_START.md)  
> **Having Issues?** Check the [Troubleshooting Guide](DEPENDABOT_TROUBLESHOOTING.md) for detailed solutions

## Overview

JobSentinel uses Dependabot to automatically create PRs for dependency updates. We have two mechanisms to handle these PRs:

1. **Automatic approval and merge** (via GitHub Actions workflow)
2. **Manual script** (for command-line management)

## Automatic Workflow

### Existing Auto-Merge Workflow

The repository has a workflow (`.github/workflows/dependabot-automerge.yml`) that automatically enables auto-merge for **new** Dependabot PRs that meet the following criteria:

- Update type is `semver-patch` or `semver-minor`
- Dependency type is `direct:production`

This workflow runs when a Dependabot PR is opened, synchronized, or reopened.

### Bulk Approve and Merge Workflow

For **existing** Dependabot PRs that are waiting, we provide a manual workflow that can be triggered on-demand.

#### How to Use

1. Go to the Actions tab in the GitHub repository
2. Select "Approve and Merge Dependabot PRs" workflow
3. Click "Run workflow"
4. Choose whether to do a dry run (recommended first time)
5. Click "Run workflow" button

#### What It Does

The workflow will:
1. Find all open PRs authored by `dependabot[bot]`
2. Approve each PR (if not already approved)
3. Check CI status for each PR
4. Enable auto-merge or directly merge PRs with passing CI checks
5. Skip PRs with failing CI checks
6. Add a comment to each processed PR

#### Dry Run Mode

Use dry run mode to see what PRs would be processed without making any changes:
- Set `dry_run: true` when triggering the workflow
- Check the workflow logs to see which PRs would be affected

## Manual Script

For local management or automated scripts, use `scripts/approve_dependabot_prs.py`.

### Prerequisites

- Python 3.11+
- GitHub CLI (`gh`) installed and authenticated
- GitHub token with `repo` and `pull-requests` permissions

### Installation

```bash
# Install GitHub CLI if not already installed
# See: https://cli.github.com/

# Authenticate with GitHub
gh auth login

# Or set a token
export GH_TOKEN="your_token_here"
```

### Usage

```bash
# Dry run (list PRs without making changes)
python scripts/approve_dependabot_prs.py --dry-run

# Approve and merge all Dependabot PRs
python scripts/approve_dependabot_prs.py

# Use a specific token
python scripts/approve_dependabot_prs.py --token "ghp_..."
```

### What the Script Does

1. Lists all open Dependabot PRs
2. Approves each PR
3. Checks CI status
4. For PRs with passing or pending CI:
   - Enables auto-merge (preferred)
   - Falls back to direct merge if auto-merge fails
5. Skips PRs with failing CI checks
6. Provides a summary at the end

### Output Example

```
Fetching open Dependabot PRs...
Found 3 Dependabot PRs

📦 Processing PR #123: Bump pytest from 7.0.0 to 7.1.0
   URL: https://github.com/cboyd0319/JobSentinel/pull/123
   CI Status: success
  ✅ Approved PR #123
  ✅ Enabled auto-merge for PR #123

📦 Processing PR #124: Bump black from 23.0.0 to 23.1.0
   URL: https://github.com/cboyd0319/JobSentinel/pull/124
   CI Status: pending
  ✅ Approved PR #124
   ⏳ CI is still pending, enabling auto-merge
  ✅ Enabled auto-merge for PR #124

📦 Processing PR #125: Bump requests from 2.28.0 to 2.29.0
   URL: https://github.com/cboyd0319/JobSentinel/pull/125
   CI Status: failure
  ✅ Approved PR #125
   ⚠️  CI checks are failing, skipping merge

============================================================
📊 Summary:
   Total PRs processed: 3
   ✅ Approved: 3
   🔀 Merged/Auto-merge enabled: 2
   ❌ Failed: 1
============================================================
```

## Best Practices

### When to Use Automatic Workflow

- Use when you have multiple Dependabot PRs waiting
- Use after reviewing the changes in a dry run
- Use when CI is mostly passing

### When to Use Manual Script

- Use for testing locally
- Use in CI/CD pipelines
- Use when you want more control over the process

### Safety Considerations

1. **Always run dry run first** to see what PRs will be affected
2. **Review failing CI checks** before approving PRs with failures
3. **Check for breaking changes** in major version updates
4. **Monitor the workflow logs** to ensure PRs are processed correctly

## Troubleshooting

### Workflow Not Working / PRs Not Being Approved

**Common Issues:**

1. **Branch Protection Rules**
   - Check if your repository has branch protection rules that require specific approvals
   - The workflow uses `GITHUB_TOKEN` which might not satisfy "Required reviewers" rules
   - Solution: Temporarily adjust branch protection settings or use a Personal Access Token (PAT) with appropriate permissions

2. **Repository Settings**
   - Verify that "Allow auto-merge" is enabled in repository settings
   - Go to Settings → General → Pull Requests → Check "Allow auto-merge"

3. **Workflow Permissions**
   - The workflow needs `contents: write` and `pull-requests: write` permissions
   - These are set in the workflow file and should work with default `GITHUB_TOKEN`
   - If issues persist, check repository settings → Actions → General → Workflow permissions

4. **PR Already Approved**
   - The workflow may show "already approved" if another workflow or user already approved
   - This is normal and expected behavior

5. **CI Checks Not Passing**
   - The workflow will skip PRs with failing CI checks (by design)
   - Check the PR's status checks to ensure they're passing
   - The workflow will enable auto-merge for PRs with pending checks

**Debugging Steps:**

1. Run the workflow with `dry_run: true` to see what would happen
2. Check the workflow logs in Actions tab for specific error messages
3. Verify that Dependabot PRs exist and are open
4. Ensure CI checks are configured and running

### "Personal Access Tokens are not supported for this endpoint"

This error occurs when trying to use certain GitHub API endpoints with a Personal Access Token (PAT). Solutions:

- Use the GitHub Actions workflow instead of a PAT
- Use `gh` CLI which handles authentication properly
- Ensure `GITHUB_TOKEN` secret is available in workflow context

### "gh: command not found"

Install GitHub CLI:
```bash
# macOS
brew install gh

# Ubuntu/Debian
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# Windows
winget install --id GitHub.cli
```

### "PR already approved" Warnings

This is normal - the script detects already-approved PRs and skips the approval step.

### Auto-merge Fails

If auto-merge fails, the script will attempt direct merge. Common reasons:
- Branch protection rules require specific checks
- PR is not mergeable (conflicts)
- Insufficient permissions
- Auto-merge not enabled in repository settings

### "Could not merge PR" Errors

Check for:
- Merge conflicts in the PR
- Required status checks not passing
- Required reviews not met (branch protection)
- Auto-merge not enabled in repository settings

## Related Files

- `.github/workflows/approve-dependabot-prs.yml` - Manual workflow
- `.github/workflows/dependabot-automerge.yml` - Automatic workflow for new PRs
- `.github/dependabot.yml` - Dependabot configuration
- `scripts/approve_dependabot_prs.py` - Manual script

## Configuration

### Dependabot Settings

Edit `.github/dependabot.yml` to configure:
- Update schedule
- Number of open PRs
- Reviewers and assignees
- Labels
- Grouping rules

### Auto-Merge Criteria

Edit `.github/workflows/dependabot-automerge.yml` to change:
- Which update types to auto-merge (currently: patch and minor)
- Which dependency types to auto-merge (currently: production only)
- Merge method (currently: squash)

## Security Considerations

- The workflow uses `GITHUB_TOKEN` which has limited permissions
- PRs are only merged if CI passes
- Major version updates are not auto-merged
- All actions are logged in workflow runs
- Dry run mode available for safety

## Future Enhancements

Potential improvements:
- Add filtering by specific dependencies
- Add option to merge only security updates
- Add Slack notifications
- Add more granular control over merge criteria
- Integration with security scanning results
