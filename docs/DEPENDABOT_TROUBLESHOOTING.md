# Dependabot Auto-Approval Troubleshooting Guide

This guide helps diagnose and fix common issues with the Dependabot PR auto-approval workflow.

## Quick Diagnostics

### Step 1: Check if Workflow Ran

1. Go to: `https://github.com/cboyd0319/JobSentinel/actions`
2. Look for "Approve and Merge Dependabot PRs" workflow runs
3. Click on the most recent run to view logs

**What to Look For:**
- ✅ Green checkmark = Workflow succeeded
- ❌ Red X = Workflow failed (check logs for errors)
- ⏸️ Gray = Workflow was cancelled or skipped

### Step 2: Check Repository Settings

#### Auto-Merge Enabled?

1. Go to: Settings → General → Pull Requests
2. Ensure "Allow auto-merge" is **checked**
3. If unchecked, enable it and try the workflow again

#### Workflow Permissions

1. Go to: Settings → Actions → General
2. Under "Workflow permissions", ensure one of:
   - "Read and write permissions" is selected, **OR**
   - "Read repository contents and packages permissions" + specific permissions granted

### Step 3: Check Branch Protection

1. Go to: Settings → Branches
2. Check rules for your default branch (usually `main` or `develop`)
3. Look for:
   - **Require approvals**: If set, workflows might not satisfy this
   - **Require status checks**: Ensure all required checks are listed and passing

## Common Issues and Solutions

### Issue 1: "Could not approve PR" or "Approval failed"

**Symptom:** Workflow logs show approval errors

**Possible Causes:**
1. Branch protection requires approvals from specific teams/users
2. `GITHUB_TOKEN` doesn't satisfy approval requirements
3. Repository has restrictions on who can approve

**Solutions:**

**Option A: Adjust Branch Protection (Recommended)**
1. Go to Settings → Branches → Edit protection rule
2. Under "Require approvals":
   - Uncheck "Dismiss stale pull request approvals when new commits are pushed" (optional)
   - Ensure workflows can approve by checking "Allow specified actors to bypass required pull requests"
   - Add "github-actions[bot]" to the bypass list

**Option B: Use a Personal Access Token**
1. Create a PAT with `repo` scope
2. Add it as a repository secret (e.g., `BOT_PAT`)
3. Update workflow to use `GH_TOKEN: ${{ secrets.BOT_PAT }}` instead of `github.token`

### Issue 2: "Could not enable auto-merge" or "Could not merge PR"

**Symptom:** Workflow approves PRs but doesn't merge them

**Possible Causes:**
1. Auto-merge is disabled in repository settings
2. Required status checks are not passing
3. PR has merge conflicts
4. Branch protection prevents merge

**Solutions:**

1. **Enable Auto-Merge:**
   - Settings → General → Pull Requests → Check "Allow auto-merge"

2. **Check Status Checks:**
   - View the PR and look at the status checks section
   - Ensure all required checks are passing (green checkmark)
   - If checks are pending, the workflow will enable auto-merge and wait

3. **Resolve Merge Conflicts:**
   - Open the PR and check if it says "This branch has conflicts"
   - Conflicts must be resolved manually or by updating the base branch
   - After resolving, run the workflow again

4. **Review Branch Protection:**
   - Ensure branch protection doesn't block auto-merge
   - Check if "Require branches to be up to date before merging" is causing issues

### Issue 3: "Found 0 Dependabot PRs"

**Symptom:** Workflow runs but says no PRs found

**Possible Causes:**
1. No Dependabot PRs are currently open
2. PRs are already merged
3. Dependabot is disabled

**Solutions:**

1. **Check for Open PRs:**
   ```bash
   # List all open Dependabot PRs
   gh pr list --author "app/dependabot" --state open
   ```

2. **Verify Dependabot is Enabled:**
   - Settings → Security → Dependabot alerts
   - Ensure alerts and security updates are enabled

3. **Check Dependabot Configuration:**
   - View `.github/dependabot.yml`
   - Ensure update schedules are configured
   - Check when the next scheduled run is

### Issue 4: Workflow Approves but CI Checks Never Pass

**Symptom:** PRs are approved but remain open with pending/failing checks

**Possible Causes:**
1. CI workflows have errors
2. Tests are failing
3. CI workflows are not triggered on Dependabot PRs

**Solutions:**

1. **Check CI Configuration:**
   - View `.github/workflows/ci.yml` (or similar)
   - Ensure it runs on `pull_request` events
   - Check if it excludes Dependabot PRs

2. **Review CI Logs:**
   - Go to the PR and click "Details" on failing checks
   - Review logs to understand why tests are failing

3. **Grant Dependabot Secrets Access (if needed):**
   - Settings → Secrets and variables → Actions
   - Check "Dependabot secrets" section
   - Ensure Dependabot has access to necessary secrets

### Issue 5: "PR already approved" but Not Merging

**Symptom:** Workflow says PR is already approved, but it's not merging

**Possible Causes:**
1. Auto-merge is not enabled on the PR
2. Required checks are still pending or failing
3. Branch protection requires additional approvals

**Solutions:**

1. **Manually Check PR Status:**
   - Open the PR in GitHub
   - Look for the "Merge pull request" button
   - Check what's blocking the merge (will be shown in red/yellow)

2. **Enable Auto-Merge Manually:**
   ```bash
   # Enable auto-merge for a specific PR
   gh pr merge PR_NUMBER --auto --squash
   ```

3. **Check Required Reviews:**
   - Settings → Branches → Protection rules
   - See if multiple approvals are required
   - If yes, you may need manual intervention

## Advanced Troubleshooting

### View Detailed Workflow Logs

```bash
# List recent workflow runs
gh run list --workflow=approve-dependabot-prs.yml

# View logs for a specific run
gh run view RUN_ID --log
```

### Test the Workflow Locally

Use the Python script to test locally:

```bash
# Dry run to see what would happen
python scripts/approve_dependabot_prs.py --dry-run

# Actually run it
python scripts/approve_dependabot_prs.py
```

### Manually Approve and Merge

If the workflow continues to fail, you can manually approve and merge:

```bash
# Approve a specific PR
gh pr review PR_NUMBER --approve

# Enable auto-merge
gh pr merge PR_NUMBER --auto --squash

# Or merge immediately
gh pr merge PR_NUMBER --squash --delete-branch
```

## Verification Steps

After fixing issues, verify the solution:

1. **Run Workflow with Dry Run:**
   - Go to Actions → "Approve and Merge Dependabot PRs"
   - Click "Run workflow"
   - Set `dry_run: true`
   - Review logs to see what would happen

2. **Run Workflow for Real:**
   - Click "Run workflow" again
   - Set `dry_run: false`
   - Monitor progress in real-time

3. **Verify PRs:**
   - Go to Pull Requests tab
   - Check that Dependabot PRs are approved
   - Verify auto-merge is enabled or PRs are merged
   - Look for the 🤖 comment from the workflow

## Getting More Help

If you're still stuck:

1. **Check Workflow Logs:**
   - Actions tab → Click on the workflow run
   - Review each step's output for specific errors

2. **Review GitHub Docs:**
   - [About auto-merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)
   - [Managing Dependabot](https://docs.github.com/en/code-security/dependabot)
   - [GitHub Actions permissions](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)

3. **Common Error Messages:**
   - `403 Forbidden`: Insufficient permissions, check workflow permissions
   - `422 Unprocessable Entity`: PR not in mergeable state, check for conflicts
   - `Resource not accessible by integration`: Token lacks required scopes

## Quick Fixes Reference

| Problem | Quick Fix |
|---------|-----------|
| Auto-merge fails | Enable in Settings → General → Pull Requests |
| Can't approve | Adjust branch protection or use PAT |
| CI checks pending | Wait for checks or fix CI configuration |
| Merge conflicts | Resolve conflicts manually |
| No PRs found | Check Dependabot configuration and schedule |
| Permission errors | Check Settings → Actions → Workflow permissions |

## Prevention

To avoid future issues:

1. **Keep Dependabot Config Updated:**
   - Review `.github/dependabot.yml` regularly
   - Adjust schedules and limits as needed

2. **Monitor CI Health:**
   - Ensure CI checks are reliable
   - Fix flaky tests promptly

3. **Review Branch Protection:**
   - Keep rules reasonable for automation
   - Use bypass lists for automated actors

4. **Test Workflow Changes:**
   - Always use dry run mode first
   - Test with a single PR before batch processing

5. **Document Custom Setup:**
   - Note any special configurations
   - Update troubleshooting docs with your solutions
