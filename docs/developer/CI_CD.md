# CI/CD pipeline guide

**How JobSentinel tests, builds, and releases across platforms**

---

## Table of contents

- [Overview](#overview)
- [Continuous integration (ci.yml)](#continuous-integration-ciyml)
- [Release builds (release.yml)](#release-builds-releaseyml)
- [Manual build workflows](#manual-build-workflows)
- [Local CI simulation](#local-ci-simulation)
- [Release process](#release-process)
- [Secrets and environment variables](#secrets-and-environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Overview

JobSentinel uses four GitHub Actions workflows:

| Workflow      | File                | Trigger                      | Purpose                      |
| ------------- | ------------------- | ---------------------------- | ---------------------------- |
| CI            | `ci.yml`            | Push or PR to `main`         | Tests, linting, security     |
| Release       | `release.yml`       | Version tag (`v*`)           | Build and publish installers |
| Build Windows | `build-windows.yml` | Manual (`workflow_dispatch`) | Windows MSI on demand        |
| Build Linux   | `build-linux.yml`   | Manual (`workflow_dispatch`) | Linux AppImage/deb on demand |

CI skips runs when only documentation files change (`.md`, `docs/**`, Storybook, etc.).

---

## Continuous integration (ci.yml)

**Trigger:** Push to `main` or pull request targeting `main`

All three jobs run in parallel on `ubuntu-latest`. There is no OS matrix and no beta toolchain — only stable Rust on Linux.

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
| TypeScript check     | `npx tsc --noEmit`  |
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

**Trigger:** Push of a tag matching `v*` (for example, `v2.6.3`)

This workflow creates a draft GitHub Release, then builds installers in parallel across three platforms.

### Platforms and artifacts

| Platform         | Target                     | Artifacts uploaded                                |
| ---------------- | -------------------------- | ------------------------------------------------- |
| `windows-latest` | `x86_64-pc-windows-msvc`   | `.msi`                                            |
| `macos-latest`   | `universal-apple-darwin`   | `.dmg` (universal binary — Intel + Apple Silicon) |
| `ubuntu-latest`  | `x86_64-unknown-linux-gnu` | `.AppImage`, `.deb`                               |

The release starts as a draft. After reviewing the generated release notes, publish it manually
from the GitHub Releases page.

### macOS universal binary

The macOS build targets `universal-apple-darwin`, which compiles for both `aarch64-apple-darwin`
and `x86_64-apple-darwin` and links them into a single binary. This means the `.dmg` runs
natively on both Apple Silicon and Intel Macs.

---

## Manual build workflows

These workflows run only when triggered manually via **Actions → Run workflow** in the GitHub UI.
They are useful for producing a build outside of the normal release flow, for example to test a
hotfix or create a pre-release artifact.

### `build-windows.yml` (Windows manual build)

Builds a Windows `.msi` and uploads it as a draft release asset for the specified version tag.

**Input:** `version` — the version string, for example `2.6.3`

### build-linux.yml

Builds a Linux `.AppImage` and `.deb` and uploads them as workflow artifacts (not a release).
Download them from the Actions run summary.

**Input:** `version` — the version string, for example `2.6.3`

---

## Local CI simulation

Run the same checks locally before pushing to avoid a CI failure round-trip.

```bash
# Rust — from src-tauri/
cargo fmt --all -- --check
cargo clippy -- -D warnings
cargo test --lib

# Frontend — from repo root
npx tsc --noEmit
npm run lint
npm test -- --run

# Security
npm audit --audit-level=moderate
cd src-tauri && cargo deny check advisories
```

Or use the combined validation command from `CLAUDE.md`:

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
# Update version in both places
# src-tauri/Cargo.toml → [package] version = "X.Y.Z"
# package.json → "version": "X.Y.Z"

# Update CHANGELOG.md, then commit
git add src-tauri/Cargo.toml package.json CHANGELOG.md
git commit -m "chore: bump version to X.Y.Z"
git push origin main
```

### 2. Tag and push

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Pushing the tag triggers `release.yml` automatically.

### 3. Publish the draft release

1. Go to **GitHub → Releases**
2. Find the draft created by the workflow
3. Review the auto-generated release notes
4. Click **Publish release**

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

### Optional: macOS signing

If you want signed and notarized macOS builds, add these secrets to the repository:

```text
MACOS_CERTIFICATE        # Base64-encoded .p12 certificate
MACOS_CERTIFICATE_PWD    # Password for the certificate
APPLE_ID                 # Apple ID used for notarization
APPLE_PASSWORD           # App-specific password (not your account password)
APPLE_TEAM_ID            # 10-character Apple Team ID
```

---

## Troubleshooting

### Clippy fails on CI but passes locally

CI uses the pinned stable toolchain. If your local toolchain is older, update it:

```bash
rustup update stable
cargo clippy -- -D warnings
```

### `cargo test --lib` vs `cargo test`

CI runs `cargo test --lib`, which skips integration tests in `tests/`. Integration tests that
require a file-based database, network access, or Chrome are excluded by design — they run
locally with `cargo test --ignored` or `cargo test`.

### npm audit blocks CI

If a transitive dependency has a known vulnerability:

```bash
npm audit        # Identify the advisory
npm update       # Try updating first
# If the advisory is low-risk and no fix is available yet,
# add an override in package.json:
"overrides": {
  "vulnerable-package": "^patched-version"
}
```

### Release build fails for one platform

`release.yml` uses `fail-fast: false`, so a failure on one platform does not cancel the others.
Check the failed job's logs directly. Common causes:

- macOS: missing signing certificate secrets
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

---

**Last updated:** March 2026
**Version:** v2.6.3
