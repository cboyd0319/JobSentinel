# Releases

Production assets can be produced either by the tag-triggered
[`release.yml`](../../.github/workflows/release.yml) workflow or by verified
local builds from the target platform, then attached to
[GitHub Releases](https://github.com/cboyd0319/JobSentinel/releases). The
workflow remains the easiest full cross-platform path. Local build plus manual
upload is a supported release path when it runs the same version, docs,
package, and artifact gates before publication.

## macOS public release status

JobSentinel does not currently have an Apple Developer Account. That means a
zero-friction public macOS DMG cannot be Developer ID signed, notarized,
stapled, or accepted by Gatekeeper yet.

The no-account macOS path is still useful and verified. Use it for development,
testing, internal checks, and clearly labeled no-account public packages. For
`2.9.0` and newer public no-account Mac packages, the release must include the
`.dmg` and matching `.dmg.sha256` checksum, the DMG filename must include
`_no-account_`, the release must include the generated macOS SBOM plus SBOM
manifest, and `npm run tauri:verify:macos:latest` must pass after publication.
Historical `v2.7.x` public assets predate these current public verifier gates.
Do not publish a macOS package as zero-friction or Gatekeeper-ready until the
project has an Apple Developer Account, the release secrets below are
configured, and the public artifact passes
`npm run tauri:verify:macos:latest -- --require-gatekeeper`.

## Creating a Release

### 1. Prepare and tag

Update the package version, changelog, and release notes as needed, then commit
and push `main`. Run the local release gate before tagging or uploading
artifacts:

```bash
node scripts/install-pinned-npm.mjs
npm run release:check-version -- vX.Y.Z
npm run harness:check
npm run release:check-deps
npm run doctor
npm run doctor:e2e
npm run lint:docs
npm run lint
npm run test:run
npm run test:e2e:all
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

For a normal workflow-driven release, create a version tag:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Pushing the tag triggers `release.yml`. The workflow resolves release inputs,
runs parallel preflight checks, creates a draft release only after those checks
pass, builds Windows, macOS, and Linux packages, verifies the macOS package
before upload, generates platform SBOMs, creates GitHub provenance and SBOM
attestations, and attaches release assets.

Manual release dispatch uses the same workflow but must be launched from the
existing matching `vX.Y.Z` tag ref. If the selected workflow ref is `main`,
another branch, or a different tag, the release workflow fails before creating
or editing a draft release.

For a local-first release, build each platform on that platform or VM, attach
the verified artifacts to the matching draft release, and run the public
artifact verifier before publishing or sharing the release. Do not mix
artifacts from different source commits under one tag.

### 2. macOS signing mode

If no Apple Developer Account secrets are configured, the release workflow
builds a no-account macOS DMG, ad-hoc signs the app bundle if needed, runs the
local no-account verifier, labels the public asset filename with
`_no-account_`, creates a matching `.dmg.sha256` after the rename, and uploads
both files without claiming Gatekeeper readiness.

For a zero-friction public macOS release, configure the Developer ID signing and
notarization secrets before tagging:

Prefer GitHub `release` environment secrets with required reviewers over
repository-wide secrets. The hosted release workflow targets that environment
for draft-release creation, asset upload, and macOS signing.

```bash
export APPLE_CERTIFICATE="base64-encoded-p12"
export APPLE_CERTIFICATE_PASSWORD="p12-export-password"
export APPLE_SIGNING_IDENTITY="Developer ID Application: Name (TEAMID)"
export APPLE_ID="developer@example.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="TEAMID"
```

If only some Apple secrets are configured, the macOS job fails before building.
If all required Apple secrets are configured, the workflow signs, notarizes,
staples, validates, and requires `--require-gatekeeper` before upload.

### 3. Local macOS verification and upload

Use local builds when testing the macOS package path, reducing release-runner
cost, or replacing a broken public Mac asset outside normal tag CI:

```bash
# macOS (from Mac)
npm run tauri:build:macos
# Output: src-tauri/target/release/bundle/dmg/JobSentinel_*.dmg
# Checksum: src-tauri/target/release/bundle/dmg/JobSentinel_*.dmg.sha256

# macOS universal binary (Intel + Apple Silicon)
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run tauri:build:macos -- --target universal-apple-darwin
# Output: src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_*_universal.dmg
# Checksum: src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_*_universal.dmg.sha256

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
  --install-smoke \
  --require-checksum

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
  --require-checksum \
  --require-gatekeeper

# After publishing, verify the downloaded public macOS artifact.
# Current no-account release path:
npm run tauri:verify:macos:latest

# Developer ID signed and notarized release path:
npm run tauri:verify:macos:latest -- --require-gatekeeper

# Verify the public Windows, macOS, and Linux release asset set.
npm run release:verify:public -- --tag vX.Y.Z --platforms windows,macos,linux

# Legacy releases without SBOM or attestation assets only:
npm run tauri:verify:macos:latest -- --tag vX.Y.Z --no-require-supply-chain
```

For local upload, use a unique no-account filename such as
`JobSentinel_X.Y.Z_no-account_universal.dmg`. Reusing a previous
browser-download filename can leave stale CDN content behind. Build with the
no-account filename label, delete any old Mac `.dmg` and `.dmg.sha256` assets
from that tag, upload exactly one replacement `.dmg` and its matching checksum,
and then run the public verifier:

```bash
JOBSENTINEL_MACOS_NO_ACCOUNT=true npm run tauri:build:macos -- --target universal-apple-darwin

for asset in $(gh release view vX.Y.Z --json assets --jq '.assets[].name' | grep -E '\.dmg(\.sha256)?$'); do
  gh release delete-asset vX.Y.Z "$asset" -y
done

gh release upload vX.Y.Z \
  src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_X.Y.Z_no-account_universal.dmg \
  src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_X.Y.Z_no-account_universal.dmg.sha256

# Then verify the downloaded public asset. Use the legacy flag only because
# this local upload path does not create hosted attestations.
npm run tauri:verify:macos:latest -- --tag vX.Y.Z --no-require-supply-chain
```

Do not publish a Mac package without its checksum, and do not leave multiple Mac
DMGs attached to the same release tag.

### 4. Local Windows and Linux builds

Use native Windows and Linux hosts or VMs for local release assets. The
workflow path is still available when local access to a target platform is not
ready.

```bash
# Windows (from Windows machine or VM)
npm run tauri build
# Output: src-tauri/target/release/bundle/msi/JobSentinel_*.msi
Get-AuthenticodeSignature src-tauri/target/release/bundle/msi/JobSentinel_*.msi

# Linux (from Linux)
npx --no-install tauri build --target x86_64-unknown-linux-gnu
# Output: src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/
file src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/appimage/*.AppImage
dpkg-deb --info src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/deb/*.deb
dpkg-deb --contents src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/deb/*.deb >/dev/null
for asset in \
  src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/appimage/*.AppImage \
  src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/deb/*.deb; do
  sha256sum "$asset" > "$asset.sha256"
done
```

Public Windows MSI upload is blocked unless `Get-AuthenticodeSignature` returns
`Valid` for the built `.msi`. Hosted Windows release builds require
`WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`,
`WINDOWS_CERTIFICATE_THUMBPRINT`, and `WINDOWS_TIMESTAMP_URL` in the GitHub
`release` environment; the workflow imports the PFX, writes a temporary
`tauri.windows.conf.json`, removes the temporary PFX file, removes the imported
certificate and private key from the runner certificate store after the build,
and creates `.msi.sha256` only after signature verification passes, including
manual release dispatch for `platform=windows`.
For local Windows builds, configure equivalent local code-signing material
outside the repo before running `tauri build`.

Public Linux upload is blocked unless exactly one `.AppImage` and one `.deb`
exist, both filenames include the release version, both files are non-empty,
the `.deb` passes `dpkg-deb --info` and `dpkg-deb --contents`, and matching
`.sha256` files are generated. The release workflow enforces those checks
before upload, including manual release dispatch for `platform=linux`.

The `Verify Release Artifacts` GitHub Actions workflow also runs after a
release is published. Its Linux job verifies the public Windows, macOS, and
Linux asset set from GitHub Releases: exactly the expected installer and
checksum assets for verified platforms, exact release-version filename
segments, matching `.sha256` files, non-empty downloads, public SBOM manifest
binding, SBOM digest verification, and GitHub artifact attestations for SLSA
provenance plus the SPDX SBOM predicate. Its macOS job then verifies the public
macOS DMG with no-account defaults: universal `x86_64,arm64` architecture
checks, checksum verification, signature verification, bundle identity,
release-tag version, icon metadata and resource file, macOS 13.0
minimum-system metadata, mounted-app launch smoke, installed-app launch smoke,
isolated local database creation, and a visible `_no-account_` filename label.
Gatekeeper acceptance is opt-in with the `require_gatekeeper` workflow input or
`JOBSENTINEL_MACOS_REQUIRE_GATEKEEPER` repository variable, and should be used
for Developer ID signed and notarized releases. In that mode, the verifier
rejects `_no-account_` filenames. If this workflow fails, the public DMG should
be replaced before sharing the release.

The local macOS package smoke launches the app through `open -F -n` with
`ApplePersistenceIgnoreState=YES`, so it starts fresh instead of reopening a
previous crashed session. The smoke path passes a verifier-only temporary data
root and verifier-only database key; it must not read or write the user's live
JobSentinel data or prompt for the user's Keychain.

### 5. Publish

Review the draft release on GitHub and click "Publish release".
Then confirm the `Verify Release Artifacts` workflow passes for the published
tag.

For hosted releases, do not pass `--no-require-supply-chain`; that flag exists
only to inspect old releases that were published before SBOM and attestation
assets existed.

## Supported Platforms

| Platform | Architecture          | Format      | Status   |
| -------- | --------------------- | ----------- | -------- |
| macOS    | universal             | `.dmg`      | Local `2.9.0` no-account package passes the current verifier; published `v2.7.7` is a legacy fallback with matching checksum and first-open Privacy & Security approval |
| Windows  | x86_64                | `.msi`      | Build path ready; public upload blocked until Authenticode signature and checksum verification pass |
| Linux    | x86_64                | `.AppImage` / `.deb` | Build path ready; current `2.9.0` public assets pending target-platform build/upload/verification |

See [CHANGELOG.md](../../CHANGELOG.md) for full history.
