# Releases

Production builds are created locally and published to [GitHub Releases](https://github.com/cboyd0319/JobSentinel/releases).

## Creating a Release

### 1. Build locally

```bash
# macOS (from Mac)
npm run tauri:build:macos
# Output: src-tauri/target/release/bundle/dmg/JobSentinel_*.dmg

# macOS universal binary (Intel + Apple Silicon)
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run tauri:build:macos -- --target universal-apple-darwin
# Output: src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_*_universal.dmg

# Windows (from Windows machine or VM)
npm run tauri build
# Output: src-tauri/target/release/bundle/msi/JobSentinel_*.msi

# Linux (from Linux)
npx tauri build --target x86_64-unknown-linux-gnu
# Output: src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/
```

### 2. Create GitHub Release

```bash
gh release create vX.Y.Z \
  --title "JobSentinel vX.Y.Z" \
  --notes "Release notes here..." \
  --draft \
  src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg
```

### 3. Publish

Review the draft release on GitHub and click "Publish release".

## Supported Platforms

| Platform | Architecture          | Format      | Status   |
| -------- | --------------------- | ----------- | -------- |
| macOS    | universal             | `.dmg`      | Ready after local universal package smoke |
| Windows  | x86_64                | `.msi`      | Ready |
| Linux    | x86_64                | `.AppImage` / `.deb` | Workflow ready |

See [CHANGELOG.md](../../CHANGELOG.md) for full history.
