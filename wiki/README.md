# Wiki Directory

This directory contains wiki-style documentation for JobSentinel. While GitHub repositories can have separate wiki repositories, we've included wiki documentation directly in the repository for easier maintenance and version control.

## Contents

- **[Home.md](Home.md)** - Wiki homepage with navigation
- **[Capabilities.md](Capabilities.md)** - Comprehensive overview of all JobSentinel capabilities

## How to Use This Wiki

### Viewing Locally

1. **In Repository:** Simply browse these Markdown files in your file explorer or text editor
2. **In Browser:** View on GitHub at `https://github.com/cboyd0319/JobSentinel/tree/main/wiki`
3. **VS Code:** Install a Markdown preview extension for formatted viewing

### Converting to GitHub Wiki (Optional)

If you want to move this content to GitHub's wiki system:

1. Clone the wiki repository:
   ```bash
   git clone https://github.com/cboyd0319/JobSentinel.wiki.git
   ```

2. Copy files from this directory:
   ```bash
   cp wiki/*.md JobSentinel.wiki/
   cd JobSentinel.wiki
   git add .
   git commit -m "Add capability documentation"
   git push
   ```

3. Visit `https://github.com/cboyd0319/JobSentinel/wiki`

## Benefits of In-Repository Wiki

✅ **Version Control** - Wiki changes tracked with code changes  
✅ **Easy Updates** - Edit wiki with regular pull requests  
✅ **Single Clone** - No need to clone separate wiki repository  
✅ **Searchable** - GitHub search includes wiki content  
✅ **Always in Sync** - Wiki documentation version-matched to code

## Maintenance

When updating capabilities:

1. Edit relevant wiki files
2. Update version numbers and dates
3. Keep in sync with `/docs/reference/FEATURES.md`
4. Commit changes with descriptive message

## Related Documentation

- [Main Documentation Index](../docs/DOCUMENTATION_INDEX.md)
- [Features Documentation](../docs/reference/FEATURES.md)
- [Architecture Guide](../docs/ARCHITECTURE.md)
- [Quick Start Guide](../docs/QUICKSTART.md)

---

**Note:** This is a living documentation directory. Updates are made as features are added or changed.
