# Dependabot Quick Start Guide

This is a quick reference for approving and merging Dependabot PRs in JobSentinel.

## 🚀 Fastest Method: Use the GitHub Workflow

### Step-by-Step

1. **Go to Actions tab** in your GitHub repository
   - URL: `https://github.com/cboyd0319/JobSentinel/actions`

2. **Find the workflow**
   - Look for "Approve and Merge Dependabot PRs" in the left sidebar
   - Or use direct link: `https://github.com/cboyd0319/JobSentinel/actions/workflows/approve-dependabot-prs.yml`

3. **Run it**
   - Click "Run workflow" button
   - Choose "dry_run: true" for the first time to see what it will do
   - Click "Run workflow" button

4. **Check the results**
   - Wait for the workflow to complete (usually < 1 minute)
   - Review the logs to see which PRs were processed
   - Check the PRs to verify they were approved/merged

5. **Run again without dry run** (if dry run looks good)
   - Click "Run workflow" again
   - Set "dry_run: false"
   - Click "Run workflow" button

### What It Does

✅ Finds all open Dependabot PRs  
✅ Approves each PR automatically  
✅ Checks CI status  
✅ Merges PRs with passing CI  
✅ Enables auto-merge for PRs with pending CI  
⚠️ Skips PRs with failing CI  

## 💻 Alternative: Command Line Script

If you prefer using the command line or need to run this in automation:

### Prerequisites

```bash
# Install GitHub CLI if not already installed
brew install gh  # macOS
# or see: https://cli.github.com/

# Authenticate
gh auth login
```

### Usage

```bash
# Dry run first
python scripts/approve_dependabot_prs.py --dry-run

# Actually approve and merge
python scripts/approve_dependabot_prs.py
```

## 🔍 Before You Start

### Check What Dependabot PRs Are Waiting

```bash
gh pr list --author "app/dependabot" --state open
```

Or visit: `https://github.com/cboyd0319/JobSentinel/pulls?q=is%3Apr+is%3Aopen+author%3Aapp%2Fdependabot`

### Review a Specific PR

```bash
# View PR details
gh pr view <PR_NUMBER>

# Check what changed
gh pr diff <PR_NUMBER>
```

## ⚙️ Existing Auto-Merge

The repository already has automatic approval for **new** Dependabot PRs that meet criteria:
- Patch or minor version updates
- Production dependencies

This new workflow helps with **existing** PRs that are waiting.

## 🛡️ Safety Features

- **Dry run mode** - See what will happen without making changes
- **CI checks** - Only merges PRs with passing CI
- **Logging** - All actions are logged in workflow runs
- **Selective merging** - Skips PRs with issues

## 📊 Typical Workflow

```
1. Dependabot creates PRs weekly (Monday 9am)
   ↓
2. Automatic workflow enables auto-merge for safe updates
   ↓
3. CI runs on each PR
   ↓
4. For waiting PRs, use manual workflow:
   - Run with dry_run=true first
   - Review the logs
   - Run with dry_run=false to approve/merge
   ↓
5. PRs are merged automatically when CI passes
```

## 🔧 Troubleshooting

### "No Dependabot PRs found"
- Check if any PRs are actually open: `gh pr list --author "app/dependabot"`
- Verify you're in the correct repository

### "Permission denied"
- Ensure your GitHub token has `repo` and `pull-requests` permissions
- Re-authenticate: `gh auth login`

### "CI checks are failing"
- The workflow will skip PRs with failing CI (this is intentional)
- Review the CI failures manually
- Fix the issues or close the PR if it's not safe to merge

### Workflow doesn't appear
- Make sure you pushed the changes to GitHub
- Check you're looking at the correct repository
- Try refreshing the Actions page

## 📚 More Information

- **[Full Documentation](DEPENDABOT_MANAGEMENT.md)** - Complete guide
- **[Scripts README](../scripts/README.md)** - All scripts documentation
- **[Dependabot Config](../.github/dependabot.yml)** - Dependabot settings

## 🎯 Common Use Cases

### Weekly Maintenance
Run the workflow every Monday after Dependabot creates new PRs:
1. Check Actions tab
2. Run "Approve and Merge Dependabot PRs" workflow
3. Review results
4. Merged PRs will be deployed automatically

### Before Release
Clear out all pending Dependabot PRs:
1. Run workflow with dry_run=true
2. Review which PRs will be merged
3. Run workflow with dry_run=false
4. Verify all PRs are merged or have reasons for not merging

### Automated CI/CD
Integrate the script into your CI/CD pipeline:
```bash
# In your CI script
python scripts/approve_dependabot_prs.py
```

## ⏱️ Expected Time

- **Manual review** of each PR: ~5 minutes per PR
- **Automated workflow**: ~30 seconds for all PRs
- **Time saved**: Significant! 🎉

## 🤔 FAQ

**Q: Will this merge PRs with failing tests?**  
A: No, the workflow checks CI status and skips PRs with failures.

**Q: Can I undo an auto-merge?**  
A: Yes, you can revert the commit like any other merge.

**Q: What if I want to review a specific PR manually?**  
A: Just remove it from the auto-merge before running the workflow, or review and merge manually.

**Q: Is this safe for production?**  
A: Yes, it follows the same safety checks as manual merges (CI must pass).

**Q: Will this work with branch protection rules?**  
A: Yes, branch protection rules still apply. The workflow won't merge if required checks haven't passed.
