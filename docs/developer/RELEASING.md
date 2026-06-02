# Releases

Production builds are created locally and published to [GitHub Releases](https://github.com/cboyd0319/JobSentinel/releases).

## macOS public release status

JobSentinel does not currently have an Apple Developer Account. That means a
zero-friction public macOS DMG cannot be Developer ID signed, notarized,
stapled, or accepted by Gatekeeper yet.

The local macOS build path is still useful and verified. Use it for development,
testing, internal checks, and clearly labeled no-account public packages. Do not
publish a macOS package as zero-friction or Gatekeeper-ready until the project
has an Apple Developer Account, the release secrets below are configured, and
the public artifact passes `npm run tauri:verify:macos:latest -- --require-gatekeeper`.

## Creating a Release

### 1. Build locally

For a zero-friction public macOS release, set the Developer ID signing and
notarization environment before building:

```bash
export APPLE_CERTIFICATE="base64-encoded-p12"
export APPLE_CERTIFICATE_PASSWORD="p12-export-password"
export APPLE_SIGNING_IDENTITY="Developer ID Application: Name (TEAMID)"
export APPLE_ID="developer@example.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="TEAMID"
```

```bash
# macOS (from Mac)
npm run tauri:build:macos
# Output: src-tauri/target/release/bundle/dmg/JobSentinel_*.dmg

# macOS universal binary (Intel + Apple Silicon)
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run tauri:build:macos -- --target universal-apple-darwin
# Output: src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_*_universal.dmg

# Verify macOS package integrity locally
npm run tauri:verify:macos -- \
  --dmg src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_*_universal.dmg \
  --expected-architectures x86_64,arm64 \
  --expected-bundle-id com.jobsentinel.main \
  --expected-product-name JobSentinel \
  --expected-version X.Y.Z \
  --expected-icon-file icon.icns \
  --expected-minimum-system-version 13.0 \
  --launch-smoke \
  --install-smoke

# Developer ID public macOS release gate
npm run tauri:verify:macos -- \
  --dmg src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_*_universal.dmg \
  --expected-architectures x86_64,arm64 \
  --expected-bundle-id com.jobsentinel.main \
  --expected-product-name JobSentinel \
  --expected-version X.Y.Z \
  --expected-icon-file icon.icns \
  --expected-minimum-system-version 13.0 \
  --launch-smoke \
  --install-smoke \
  --require-gatekeeper

# After publishing, verify the downloaded public macOS artifact.
# Current no-account release path:
npm run tauri:verify:macos:latest

# Developer ID signed and notarized release path:
npm run tauri:verify:macos:latest -- --require-gatekeeper

# Windows (from Windows machine or VM)
npm run tauri build
# Output: src-tauri/target/release/bundle/msi/JobSentinel_*.msi

# Linux (from Linux)
npx tauri build --target x86_64-unknown-linux-gnu
# Output: src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/
```

The `Verify Release Artifacts` GitHub Actions workflow also runs after a
release is published. It verifies the public macOS DMG from GitHub Releases
with no-account defaults: universal `x86_64,arm64` architecture checks,
signature verification, bundle identity, release-tag version, icon metadata and
resource file, macOS 13.0 minimum-system metadata, mounted-app launch smoke,
installed-app launch smoke, and isolated local database creation. Gatekeeper
acceptance is opt-in with the `require_gatekeeper` workflow input or
`JOBSENTINEL_MACOS_REQUIRE_GATEKEEPER` repository variable, and should be used
for Developer ID signed and notarized releases. If this workflow fails, the
public DMG should be replaced before sharing the release.

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
Then confirm the `Verify Release Artifacts` workflow passes for the published
tag.

## Supported Platforms

| Platform | Architecture          | Format      | Status   |
| -------- | --------------------- | ----------- | -------- |
| macOS    | universal             | `.dmg`      | Local mounted, installed, and data smoke ready; public nontechnical release blocked until Apple Developer Account and notarization |
| Windows  | x86_64                | `.msi`      | Ready |
| Linux    | x86_64                | `.AppImage` / `.deb` | Workflow ready |

See [CHANGELOG.md](../../CHANGELOG.md) for full history.
