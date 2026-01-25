# CI/CD Pipeline Guide

**Complete guide to continuous integration and deployment for JobSentinel**

---

## Table of Contents

- [Overview](#overview)
- [CI/CD Philosophy](#cicd-philosophy)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Local CI Simulation](#local-ci-simulation)
- [Release Process](#release-process)
- [Environment Variables and Secrets](#environment-variables-and-secrets)
- [Troubleshooting](#troubleshooting)

---

## Overview

JobSentinel uses GitHub Actions to automate testing, building, and releasing across Windows,
macOS, and Linux platforms. The pipeline ensures code quality, security, and consistency
before changes are merged or released.

### Pipeline Goals

1. **Catch bugs early** - Run tests and linting on every PR
2. **Ensure consistency** - Format code and check for violations
3. **Security first** - Scan for vulnerabilities before release
4. **Multi-platform** - Build and test on all supported OSes
5. **Automated releases** - Generate binaries and GitHub Releases

### Current Status (v2.6.3)

- ✅ Multi-platform builds (Windows, macOS, Linux)
- ✅ Automated testing on CI
- ✅ Security scanning (cargo-audit, npm audit)
- ✅ Code formatting checks
- ✅ Release automation

---

## CI/CD Philosophy

**"If it works locally, it should pass CI. If it passes CI, it's ready to ship."**

All CI checks should:

- Catch the same errors as local development
- Be fast enough not to block PRs (target: <10 minutes)
- Fail clearly with actionable error messages
- Run in parallel when possible

### What's Checked

| Check | When | Time | Scope |
|-------|------|------|-------|
| Linting | Push/PR | <1m | Rust + TypeScript |
| Format | Push/PR | <1m | Rust + TypeScript |
| Type checking | Push/PR | <2m | TypeScript |
| Unit tests | Push/PR | <5m | All Rust tests |
| Build (debug) | Push/PR | <3m | Tauri app (all platforms) |
| Build (release) | Release tag | <10m | Tauri app (all platforms) |
| Audit | Release tag | <1m | Dependencies (Rust + npm) |

---

## GitHub Actions Workflows

### Workflow 1: PR Checks (`.github/workflows/pr-checks.yml`)

**Runs on:** Push to any branch, Pull Requests

**Purpose:** Fast feedback loop for development

```yaml
name: PR Checks

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Rust checks
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo fmt --all -- --check
      - run: cargo clippy --all-targets --all-features -- -D warnings

      # TypeScript checks
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        rust: [stable, beta]
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@${{ matrix.rust }}
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: cd src-tauri && cargo test --all-features
      - run: cd src-tauri && cargo test --release --all-features

  build-debug:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Tauri dependencies (Linux)
        if: runner.os == 'Linux'
        run: |
          sudo apt-get update
          sudo apt-get install -y libssl-dev libgtk-3-dev libappindicator3-dev

      - run: npm ci
      - run: npm run tauri:build

  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: rustsec/audit-check-action@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm audit --audit-level=moderate
```

### Workflow 2: Release Builds (`.github/workflows/release.yml`)

**Runs on:** When a version tag is created (e.g., `v2.1.0`)

**Purpose:** Build and publish release binaries

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  create-release:
    runs-on: ubuntu-latest
    outputs:
      upload_url: ${{ steps.create_release.outputs.upload_url }}
    steps:
      - uses: actions/checkout@v4
      - id: create_release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: true
          prerelease: false

  build-release:
    needs: create-release
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
          - os: windows-latest
            target: x86_64-pc-windows-msvc
          - os: macos-latest
            target: x86_64-apple-darwin
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Tauri dependencies (Linux)
        if: runner.os == 'Linux'
        run: |
          sudo apt-get update
          sudo apt-get install -y libssl-dev libgtk-3-dev libappindicator3-dev

      - run: npm ci
      - run: npm run tauri:build -- --target ${{ matrix.target }}

      # Upload artifacts
      - name: Upload Release Asset (Windows)
        if: runner.os == 'Windows'
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ needs.create-release.outputs.upload_url }}
          asset_path: src-tauri/target/release/JobSentinel.msi
          asset_name: JobSentinel-${{ github.ref_name }}.msi
          asset_content_type: application/octet-stream

      - name: Upload Release Asset (macOS)
        if: runner.os == 'macOS'
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ needs.create-release.outputs.upload_url }}
          asset_path: src-tauri/target/release/bundle/dmg/JobSentinel.dmg
          asset_name: JobSentinel-${{ github.ref_name }}.dmg
          asset_content_type: application/octet-stream

      - name: Upload Release Asset (Linux)
        if: runner.os == 'Linux'
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ needs.create-release.outputs.upload_url }}
          asset_path: src-tauri/target/release/bundle/appimage/JobSentinel.AppImage
          asset_name: JobSentinel-${{ github.ref_name }}.AppImage
          asset_content_type: application/octet-stream
```

### Workflow 3: Documentation Deploy (`.github/workflows/docs.yml`)

**Runs on:** Pushes to `main`, Changes to `docs/`

**Purpose:** Deploy documentation site

```yaml
name: Deploy Docs

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'
      - '.github/workflows/docs.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
          cname: jobsentinel.dev
```

---

## Local CI Simulation

### Run All CI Checks Locally

Before pushing, test your changes against the same checks as CI:

```bash
# 1. Format check (Rust)
cd src-tauri
cargo fmt --all -- --check

# 2. Linting (Rust)
cargo clippy --all-targets --all-features -- -D warnings

# 3. Tests (Rust)
cargo test --all-features

# 4. Build (debug)
cargo build

# 5. Return to root
cd ..

# 6. Format check (TypeScript)
npm run lint:fix  # or just 'npm run lint' to check

# 7. Type check (TypeScript)
npm run type-check

# 8. Security audit (Rust)
cargo audit

# 9. Security audit (npm)
npm audit --audit-level=moderate
```

### Pre-commit Hook

Add this to `.git/hooks/pre-commit` to catch issues before committing:

```bash
#!/bin/bash
set -e

echo "Running pre-commit checks..."

# Rust checks
echo "Checking Rust formatting..."
cd src-tauri
cargo fmt --all -- --check || {
    echo "Rust formatting failed. Run 'cargo fmt' to fix."
    exit 1
}

echo "Running Rust clippy..."
cargo clippy --all-targets --all-features -- -D warnings || {
    echo "Clippy warnings found. Fix them before committing."
    exit 1
}

cd ..

# TypeScript checks
echo "Checking TypeScript..."
npm run lint --quiet || {
    echo "TypeScript linting failed. Run 'npm run lint:fix' to fix."
    exit 1
}

echo "All checks passed!"
```

Save and make executable:

```bash
chmod +x .git/hooks/pre-commit
```

---

## Release Process

### 1. Prepare Release

```bash
# 1. Update version in package.json
npm version minor  # or major/patch/prerelease

# 2. Update version in src-tauri/Cargo.toml
# [package]
# version = "2.1.0"

# 3. Update CHANGELOG.md
# Add entry for new version

# 4. Update ROADMAP.md (mark completed items)

# 5. Commit changes
git add -A
git commit -m "chore: bump version to 2.1.0"

# 6. Push
git push origin main
```

### 2. Create Release Tag

```bash
# Tag the release
git tag v2.1.0

# Push tag (triggers CI/CD)
git push origin v2.1.0
```

### 3. GitHub Actions Builds Release

The `release.yml` workflow automatically:

1. Creates a GitHub Release (draft status)
2. Builds binaries on Windows, macOS, Linux
3. Uploads binaries to the release
4. Signs macOS binaries (if secrets configured)
5. Notarizes macOS app (if secrets configured)

### 4. Finalize Release

1. Go to GitHub Releases
2. Review draft release notes
3. Publish release (removes draft status)
4. Announce on social media, Discord, etc.

### Version Numbering

JobSentinel uses Semantic Versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes, major features
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, security patches

Example: `2.1.0`

- `2` = Major version (v2.0)
- `1` = Minor version (2.1)
- `0` = Patch version (2.1.0)

---

## Environment Variables and Secrets

### Required Secrets for CI/CD

Add these to GitHub repository settings under **Secrets and variables**:

#### Required for All Workflows

```text
GITHUB_TOKEN                # Auto-provided by GitHub Actions
```

#### Required for macOS Signing (v2.1.0+)

```text
MACOS_CERTIFICATE           # Base64-encoded .p12 certificate
MACOS_CERTIFICATE_PWD       # Password for certificate
MACOS_KEYCHAIN_PWD          # Temporary keychain password
APPLE_ID                    # Apple ID for notarization
APPLE_PASSWORD              # App-specific password (not regular password)
APPLE_TEAM_ID               # 10-character Apple Team ID
```

#### Recommended for Security

```text
CARGO_AUDIT_TOKEN           # For rustsec advisory database
```

### Setting Up Secrets

1. Go to GitHub repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret

### Using Secrets in Workflows

In workflow files (`.github/workflows/*.yml`):

```yaml
env:
  MACOS_CERTIFICATE: ${{ secrets.MACOS_CERTIFICATE }}
  MACOS_CERTIFICATE_PWD: ${{ secrets.MACOS_CERTIFICATE_PWD }}
```

---

## Troubleshooting

### Issue: Tests fail locally but pass on CI (or vice versa)

**Cause:** Platform-specific code or environment differences

**Solution:**

1. Check OS-specific tests: `#[cfg(target_os = "...")]`
2. Run tests on target OS locally (or use Docker)
3. Check for hardcoded paths (use `cfg!` macros)
4. Verify no environment variables are assumed

### Issue: Clippy warnings fail the build

**Cause:** New Rust version introduced stricter linting

**Solution:**

```bash
# View warnings
cargo clippy --all-targets --all-features

# Fix automatically (if possible)
cargo clippy --fix --allow-staged

# Review and commit
git diff
git add -A
git commit -m "style: fix clippy warnings"
```

### Issue: npm audit fails due to transitive dependencies

**Cause:** Dependency has known vulnerability

**Solution:**

```bash
# View audit results
npm audit

# If low risk, override in package.json
# (only for development dependencies)
"overrides": {
  "vulnerable-package": "^1.0.0"
}

# Or wait for dependency to release fix
npm update
npm audit
```

### Issue: Release build fails on macOS

**Cause:** Code signing or notarization issues

**Solution:**

1. Check certificates are valid:

   ```bash
   security find-identity -v -p codesigning
   ```

2. Check Team ID matches:

   ```bash
   codesign -dv --verbose=2 JobSentinel.app
   ```

3. Verify Apple credentials in GitHub Secrets

4. Check for sandboxing issues in `tauri.conf.json`

### Issue: Build takes longer than expected

**Cause:** No incremental compilation or dependency redownloading

**Solution:**

1. Use cache in CI workflows:

   ```yaml
   - uses: actions/cache@v3
     with:
       path: ~/.cargo
       key: ${{ runner.os }}-cargo
   ```

2. Use Mold linker on Linux for faster linking:

   ```bash
   cargo install mold
   RUSTFLAGS="-C link-arg=-fuse-ld=mold" cargo build --release
   ```

### Issue: Cannot publish to GitHub because draft release exists

**Cause:** Previous release never published

**Solution:**

1. Go to GitHub Releases
2. Delete or publish the draft release
3. Retag and push:

   ```bash
   git tag -d v2.1.0
   git push origin :v2.1.0
   git tag v2.1.0
   git push origin v2.1.0
   ```

---

## Best Practices

### DO ✅

- Run PR checks locally before pushing
- Keep CI/CD configuration in version control
- Use matrix builds for multi-platform support
- Cache dependencies (npm, Cargo) in workflows
- Document why a workflow step exists
- Review workflow logs when builds fail
- Tag releases with semantic versions

### DON'T ❌

- Commit broken code and rely on CI to catch it
- Use `git push --force` after CI starts
- Ignore security warnings in audit results
- Commit secrets or passwords to version control
- Disable security checks for "speed"
- Run separate workflows for simple checks
- Hardcode paths or OS-specific commands

---

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Tauri Distribution Guide](https://tauri.app/v2/guides/distribution/)
- [Cargo Documentation](https://doc.rust-lang.org/cargo/)
- [npm Scripts](https://docs.npmjs.com/cli/v10/using-npm/scripts)

---

**Last Updated:** January 25, 2026
**Version:** v2.6.3
**Status:** Documentation-only (Workflows not yet implemented)
**Maintained By:** The Rust Mac Overlord 🦀
