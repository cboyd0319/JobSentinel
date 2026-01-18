# Releases

Production builds are created via GitHub Actions and published to [GitHub Releases](https://github.com/cboyd0319/JobSentinel/releases).

## Creating a Release

1. **Tag the version:**
   ```bash
   git tag v2.5.1
   git push origin v2.5.1
   ```

2. **GitHub Actions automatically builds:**
   - macOS (Apple Silicon) - `.dmg`
   - macOS (Intel x64) - `.dmg`
   - Windows x64 - `.msi`

3. **Review and publish** the draft release on GitHub.

## Manual Local Build (macOS only)

```bash
npm run tauri build
# Output: src-tauri/target/release/bundle/dmg/JobSentinel_*.dmg
```

## Supported Platforms

| Platform | Architecture | Format | Status |
|----------|-------------|--------|--------|
| macOS | arm64 (Apple Silicon) | `.dmg` | ✅ Ready |
| macOS | x86_64 (Intel) | `.dmg` | ✅ Ready |
| Windows | x86_64 | `.msi` | ✅ Ready |
| Linux | x86_64 | `.AppImage` | 🔮 v2.6 |

## Version History

- **v2.5.1** - Dark mode default, navigation sidebar, all screenshots updated
- **v2.5.0** - Market Intelligence UI, 13 scrapers, One-Click Apply
- **v2.0.0** - Resume Builder, ATS Optimizer, OS keyring integration

See [CHANGELOG.md](../CHANGELOG.md) for full history.
