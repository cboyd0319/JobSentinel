# Dependabot Auto-Merge Setup

## What I've Configured

✅ **Auto-merge enabled** for safe dependency updates:
- **Patch updates** (1.0.1 → 1.0.2) 
- **Minor updates** (1.0.0 → 1.1.0)
- **Security updates** (any version)

⚠️ **Manual review required** for:
- Major version bumps (1.x → 2.x)
- Dev dependencies changes

## How It Works

1. **Dependabot creates PR** (Mondays 9 AM)
2. **Auto-merge workflow runs** if update is safe  
3. **Waits for CI to pass**
4. **Auto-merges with squash commit**

## Weekly Schedule

- **Python deps:** Monday 9 AM, max 5 PRs
- **GitHub Actions:** Monday 9 AM, max 3 PRs  
- **Groups similar updates** to reduce PR spam

## Manual Override

To disable auto-merge for a specific PR:
```bash
gh pr ready --undo <PR_NUMBER>  # Mark as draft
```

To force merge a major update:
```bash  
gh pr merge --squash <PR_NUMBER>
```

## Repository Settings

You may need to enable auto-merge in your repo settings:
1. Go to Settings → General → Pull Requests
2. Check "Allow auto-merge"
3. Ensure branch protection allows merging

## Files Changed

- `.github/dependabot.yml` - Dependabot configuration
- `.github/workflows/dependabot-automerge.yml` - Auto-merge workflow