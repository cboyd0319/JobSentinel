# Releases

Production builds are created locally and published to [GitHub Releases](https://github.com/cboyd0319/JobSentinel/releases).

## Creating a Release

### 1. Build locally

```bash
# macOS (from Mac)
npm run tauri build
# Output: src-tauri/target/release/bundle/dmg/JobSentinel_*.dmg

# Windows (from Windows machine or VM)
npm run tauri build
# Output: src-tauri/target/release/bundle/msi/JobSentinel_*.msi
```

### 2. Create GitHub Release

```bash
gh release create v2.5.1 \
  --title "JobSentinel v2.5.1" \
  --notes "Release notes here..." \
  --draft \
  src-tauri/target/release/bundle/dmg/*.dmg
```

### 3. Publish

Review the draft release on GitHub and click "Publish release".

## Supported Platforms

| Platform | Architecture          | Format      | Status   |
| -------- | --------------------- | ----------- | -------- |
| macOS    | arm64 (Apple Silicon) | `.dmg`      | ✅ Ready |
| Windows  | x86_64                | `.msi`      | ✅ Ready |
| Linux    | x86_64                | `.AppImage` | 🔮 v2.6  |
| macOS    | x86_64 (Intel)        | `.dmg`      | 🔮 v2.6  |

## Version History

- **v2.6.4** - Settings infinite loading fix, NaN score handling, bulk operation resilience, 45 new tests, security updates
- **v2.6.3** - Security fixes, memory leak fixes, standardized errors, docs update
- **v2.5.1** - Dark mode default, navigation sidebar, all screenshots updated
- **v2.5.0** - Market Intelligence UI, 13 scrapers, One-Click Apply
- **v2.0.0** - Resume Builder, ATS Optimizer, OS keyring integration

See [CHANGELOG.md](../CHANGELOG.md) for full history.
