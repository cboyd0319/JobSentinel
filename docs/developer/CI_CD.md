# CI/CD pipeline guide

**How JobSentinel tests, builds, verifies, and releases across platforms**

---

## Table of contents

- [Overview](#overview)
- [Continuous integration (ci.yml)](#continuous-integration-ciyml)
- [Release builds (release.yml)](#release-builds-releaseyml)
- [Published release verification (verify-release-artifacts.yml)](#published-release-verification-verify-release-artifactsyml)
- [Manual build workflows](#manual-build-workflows)
- [Local CI simulation](#local-ci-simulation)
- [Release process](#release-process)
- [Secrets and environment variables](#secrets-and-environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Overview

JobSentinel uses six GitHub Actions workflows for shared verification and
hosted release builds. Production release assets can also be built locally on
the target platform and uploaded manually when the same preflight and artifact
verification gates pass.

| Workflow                 | File                           | Trigger                      | Purpose                         |
| ------------------------ | ------------------------------ | ---------------------------- | ------------------------------- |
| CI                       | `ci.yml`                       | Push or PR to `main`         | Tests, linting, security        |
| Docs Harness             | `docs-harness.yml`             | Docs and harness changes     | Harness, markdown lint          |
| Release                  | `release.yml`                  | Version tag (`v*`)           | Build and stage draft installers |
| Verify Release Artifacts | `verify-release-artifacts.yml` | Published release or manual  | Verify public downloadable DMGs |
| Build Windows            | `build-windows.yml`            | Manual (`workflow_dispatch`) | Windows MSI on demand           |
| Build Linux              | `build-linux.yml`              | Manual (`workflow_dispatch`) | Linux AppImage/deb on demand    |

CI skips runs when only documentation files change (`.md`, `docs/**`, Storybook, etc.).
The docs harness workflow covers maintained docs and agent-facing harness files.

---

## Continuous integration (ci.yml)

**Trigger:** Push to `main` or pull request targeting `main`

All four jobs run in parallel on `ubuntu-latest`. There is no OS matrix and no
beta toolchain, only pinned Rust 1.96.0 on Linux.

### Job: harness

Runs repo harness checks, exact dependency-pin checks, and harness script tests.

| Step                  | Command                 |
| --------------------- | ----------------------- |
| Install dependencies  | `npm ci`                |
| Harness checks        | `npm run harness:check` |
| Dependency pin checks | `npm run lint:deps`     |
| Harness script tests  | `npm run test:scripts`  |

### Job: test-rust

Checks formatting, lints, and runs the library test suite.

| Step             | Command                       |
| ---------------- | ----------------------------- |
| Check formatting | `cargo fmt --all -- --check`  |
| Run Clippy       | `cargo clippy -- -D warnings` |
| Run tests        | `cargo test --lib`            |

Rust dependencies are cached with `Swatinem/rust-cache`. `SQLX_OFFLINE=true` is set globally
so SQLx does not attempt a live database connection.

### Job: test-frontend

Installs dependencies, type-checks, lints, and runs the Vitest suite.

| Step                 | Command             |
| -------------------- | ------------------- |
| Install dependencies | `npm ci`            |
| TypeScript check     | `npx --no-install tsc --noEmit` |
| Lint                 | `npm run lint`      |
| Unit tests           | `npm test -- --run` |

### Job: security

Audits both dependency trees for known vulnerabilities.

| Step            | Tool                               |
| --------------- | ---------------------------------- |
| npm audit       | `npm audit --audit-level=moderate` |
| Rust advisories | `cargo deny check advisories`      |

---

## Release builds (release.yml)

**Trigger:** Push of a tag matching `v*`, for example `vX.Y.Z`

This workflow creates a draft GitHub Release, then builds installers in
parallel across three platforms. It is the hosted cross-platform path, not the
only permitted production path.

### Platforms and artifacts

| Platform         | Target                     | Artifacts uploaded                                |
| ---------------- | -------------------------- | ------------------------------------------------- |
| `windows-latest` | `x86_64-pc-windows-msvc`   | `.msi`                                            |
| `macos-latest`   | `universal-apple-darwin`   | `.dmg` plus `.dmg.sha256` (universal binary - Intel + Apple Silicon) |
| `ubuntu-latest`  | `x86_64-unknown-linux-gnu` | `.AppImage`, `.deb`                               |

The release starts as a draft. After reviewing the generated release notes, publish it manually
from the GitHub Releases page.

### macOS universal binary

The macOS build targets `universal-apple-darwin`, which compiles for both `aarch64-apple-darwin`
and `x86_64-apple-darwin` and links them into a single binary. This means the `.dmg` runs
natively on both Apple Silicon and Intel Macs.

The release workflow verifies the macOS DMG before upload with
`npm run tauri:verify:macos -- --launch-smoke --install-smoke --require-checksum`.
This gate
checks the DMG layout, bundle id, product name, version, icon metadata and
resource file, macOS 13.0 minimum-system metadata, mounted app signature,
universal architectures, mounted-app launch smoke, copied installed-app launch
smoke, isolated macOS data directory and database creation with owner-only
permissions, and matching checksum artifact before the package can be attached
to the draft release. When
Developer ID signing and notarization secrets are configured, the workflow also
adds `--require-gatekeeper`.

## Published release verification (verify-release-artifacts.yml)

**Trigger:** Published GitHub Release or manual `workflow_dispatch`

This workflow verifies the macOS artifact exactly as users download it from
GitHub Releases. It runs on `macos-latest`, installs Node dependencies, and runs
`npm run tauri:verify:macos:latest`. On release publish events, it scopes the
check to the published tag. On manual runs, the optional `tag` input checks a
specific release, and a blank tag checks the latest public release.

The public macOS verifier defaults to the current no-Apple-account release
path: expected JobSentinel bundle id, product name, icon metadata and resource
file, release-tag version, macOS 13.0 minimum-system metadata, universal
`x86_64,arm64` architecture checks, mounted app signature verification,
matching `.dmg.sha256` checksum verification, installed-app smoke, launch
smoke, local data initialization, and owner-only local-data permissions.
Gatekeeper acceptance is required only when the manual `require_gatekeeper` input or
`JOBSENTINEL_MACOS_REQUIRE_GATEKEEPER` repository variable is set to `true`.

Current repository status: JobSentinel does not have an Apple Developer
Account. The macOS package can be built, checksummed, published, and verified
through the no-account path, but it cannot be zero-friction for nontechnical
users until Developer ID signing and notarization are available. The release
workflow builds a locally verified ad-hoc macOS DMG when all Apple release
secrets are missing, fails if only some Apple secrets are configured, and uses
the strict Gatekeeper gate when all required Apple secrets are present.

---

## Manual build workflows

These workflows run only when triggered manually via **Actions > Run workflow** in the GitHub UI.
They are useful for producing a build outside of the normal release flow, for example to test a
hotfix or create a pre-release artifact.

Local platform builds are also supported. Prefer local builds when you have a
trusted Windows, macOS, or Linux host available and want to avoid unnecessary
hosted runner time. Run the same version, harness, lint, test, build, and
artifact verification gates before upload.

### `build-windows.yml` (Windows manual build)

Builds a Windows `.msi` for the specified version tag. Public draft upload is
blocked unless the MSI has a valid Authenticode signature. The workflow then
writes a matching `.msi.sha256` checksum and uploads both files.

**Input:** `version` - the version string, for example `X.Y.Z`

### build-linux.yml

Builds a Linux `.AppImage` and `.deb` and uploads them as workflow artifacts (not a release).
Download them from the Actions run summary.

**Input:** `version` - the version string, for example `X.Y.Z`

---

## Local CI simulation

Run the same checks locally before pushing to avoid a CI failure round-trip.

```bash
# Rust — from src-tauri/
cargo fmt --all -- --check
cargo clippy -- -D warnings
cargo test --lib

# Frontend — from repo root
npx --no-install tsc --noEmit
npm run lint
npm test -- --run

# Security
npm audit --audit-level=moderate
cd src-tauri && cargo deny check advisories
```

For broader local validation, use the [verification matrix](../harness/verification-matrix.md):

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml && \
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings && \
cargo test --manifest-path src-tauri/Cargo.toml --lib && \
npm run lint && npm run test:run
```

---

## Release process

### 1. Prepare the release

```bash
# Update version in release metadata and lock files
# src-tauri/Cargo.toml -> [package] version = "X.Y.Z"
# package.json -> "version": "X.Y.Z"
# package-lock.json -> root "version" and packages[""].version = "X.Y.Z"
# src-tauri/tauri.conf.json -> "version": "X.Y.Z"

# Update CHANGELOG.md, then commit
git add src-tauri/Cargo.toml package.json package-lock.json src-tauri/tauri.conf.json CHANGELOG.md
git commit -m "chore: bump version to X.Y.Z"
git push origin main
```

Before tagging or uploading local assets, run the full release gate in
[Releasing](RELEASING.md). It includes version validation, harness checks,
latest-stable dependency checks, environment doctors, docs lint, frontend
tests, full Playwright E2E, frontend build, Rust formatting, Rust clippy, and
the full Rust test suite.

### 2. Choose release build path

Use either hosted tag CI or local platform builds.

For hosted tag CI:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Pushing the tag triggers `release.yml` automatically.

For local macOS no-account asset upload:

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
JOBSENTINEL_MACOS_NO_ACCOUNT=true npm run tauri:build:macos -- --target universal-apple-darwin
npm run tauri:verify:macos -- \
  --dmg src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_X.Y.Z_no-account_universal.dmg \
  --expected-architectures x86_64,arm64 \
  --expected-bundle-id com.jobsentinel.main \
  --expected-product-name JobSentinel \
  --expected-version X.Y.Z \
  --expected-icon-file icon.icns \
  --expected-minimum-system-version 13.0 \
  --launch-smoke \
  --install-smoke \
  --require-checksum

gh release upload vX.Y.Z \
  src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_X.Y.Z_no-account_universal.dmg \
  src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_X.Y.Z_no-account_universal.dmg.sha256

npm run tauri:verify:macos:latest -- --tag vX.Y.Z
```

For a complete local release, build Windows and Linux installers on native
hosts or VMs from the same tag, then attach those assets to the same release.
Do not publish a release as complete until all advertised platform assets are
present and verified. Windows MSI assets must pass
`Get-AuthenticodeSignature` with status `Valid` and have a matching
`.msi.sha256` checksum before upload.

### 3. Publish the draft release

1. Go to **GitHub > Releases**
2. Find the draft created by the workflow
3. Review the auto-generated release notes
4. Click **Publish release**
5. Confirm the `Verify Release Artifacts` workflow passes for the published tag

### Version numbering

JobSentinel follows Semantic Versioning (`MAJOR.MINOR.PATCH`):

- `MAJOR` — breaking changes or a major feature milestone
- `MINOR` — new features, backward compatible
- `PATCH` — bug fixes and security patches

---

## Secrets and environment variables

### CI environment variables

These are set at the workflow level and require no secrets:

| Variable           | Value    | Purpose                                                     |
| ------------------ | -------- | ----------------------------------------------------------- |
| `SQLX_OFFLINE`     | `true`   | Prevents SQLx from connecting to a database at compile time |
| `CARGO_TERM_COLOR` | `always` | Colorized Cargo output in CI logs                           |

### GitHub-provided secrets

`GITHUB_TOKEN` is automatically available to all workflows. It is used by the release and build
workflows to create releases and upload assets.

### macOS signing and notarization

Zero-friction public macOS release builds require an Apple Developer Account,
Developer ID signing, and notarization. The project does not currently have that
account, so the no-account macOS path is supported with clear first-open
friction. When an account exists, add the signing secrets plus one
notarization auth set to the repository:

```text
APPLE_CERTIFICATE           # Base64-encoded Developer ID Application .p12 certificate
APPLE_CERTIFICATE_PASSWORD  # Password used when exporting the .p12 certificate
APPLE_SIGNING_IDENTITY      # Developer ID Application identity used by codesign

# Option A: Apple ID notarization
APPLE_ID                    # Apple ID used for notarization
APPLE_PASSWORD              # App-specific password, not the account password
APPLE_TEAM_ID               # 10-character Apple Team ID

# Option B: App Store Connect API key notarization
APPLE_API_KEY               # API key id
APPLE_API_KEY_PATH          # Raw .p8 private key contents, or a runner-local .p8 file path
APPLE_API_ISSUER            # Issuer UUID
```

The GitHub release workflow materializes raw `APPLE_API_KEY_PATH` contents into
a temporary owner-only `.p8` file before running `notarytool`. Do not configure
`JOBSENTINEL_MACOS_NOTARY_PROFILE` or `NOTARYTOOL_KEYCHAIN_PROFILE` in GitHub
Actions; pre-existing notarytool keychain profiles are local-machine state and
do not exist on fresh hosted runners.

If all of these secrets are missing, the macOS release job builds an ad-hoc
signed DMG, verifies it without a Gatekeeper claim, labels the asset filename
with `_no-account_`, and writes a matching `.dmg.sha256` after the rename. If
only some secrets are configured, the job fails before building. When all
secrets are present, the workflow imports the Developer ID
certificate into a temporary keychain, `npm run tauri:build:macos` signs,
notarizes, staples, and validates the custom DMG. The release workflow then
verifies the package with
`npm run tauri:verify:macos -- --launch-smoke --install-smoke --require-checksum --require-gatekeeper`
before upload. Without the expected bundle id, product name, release version,
icon resource file, macOS 13.0 minimum-system metadata, checksum, Developer ID
signing, notarization, Gatekeeper acceptance, mounted-app plus installed-app
launch smoke, local data initialization, and owner-only local-data permissions,
the signed macOS release job should fail instead of publishing a package that
nontechnical users cannot open cleanly.

After the GitHub release is published, the `Verify Release Artifacts` workflow
runs automatically. It downloads the public release DMG and applies the same
checksum, signature, architecture, launch-smoke, installed-app smoke, local
data initialization, owner-only local-data permissions, and optional Gatekeeper
checks to the artifact users can actually download. The no-account public
verifier also requires `_no-account_` in the DMG filename, while the
Gatekeeper-required verifier rejects that label for Developer ID signed and
notarized releases. The same no-account check can be run locally on a Mac with
`npm run tauri:verify:macos:latest`; add `--require-gatekeeper` only for a
Developer ID signed and notarized release.

---

## Troubleshooting

### Clippy fails on CI but passes locally

CI uses the pinned stable toolchain. If your local toolchain is older, update it:

```bash
rustup update stable
cargo clippy -- -D warnings
```

### `cargo test --lib` vs `cargo test`

CI runs `cargo test --lib`, which skips integration tests in `tests/`. Normal
integration tests run locally with `cargo test`. Ignored or live tests should
use targeted commands such as
`cargo test --test live_scraper_test -- --ignored --nocapture`.

### npm audit blocks CI

If a transitive dependency has a known vulnerability:

```bash
npm audit        # Identify the advisory
npm update       # Try updating first
# If the advisory is low-risk and no fix is available yet,
# add an override in package.json:
"overrides": {
  "vulnerable-package": "1.2.3"
}
```

### Release build fails for one platform

`release.yml` uses `fail-fast: false`, so a failure on one platform does not cancel the others.
Check the failed job's logs directly. Common causes:

- macOS: partial Apple signing secrets, invalid Developer ID identity, stale
  bundle metadata, missing `.dmg.sha256`, missing `_no-account_` asset label
  for ad-hoc public packages, or a no-account package that fails mounted or
  installed launch smoke
- Linux: system library version mismatch (the workflow installs `libwebkit2gtk-4.1-dev` specifically)
- Windows: MSI bundler configuration error in `tauri.conf.json`

### Retag a broken release

```bash
git tag -d vX.Y.Z
git push origin :vX.Y.Z
# Fix the issue, commit, then retag
git tag vX.Y.Z
git push origin vX.Y.Z
```

---

## Resources

- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [Tauri distribution guide](https://v2.tauri.app/distribute/)
- [cargo-deny documentation](https://embarkstudios.github.io/cargo-deny/)
- [Semantic Versioning](https://semver.org)
