# CI/CD pipeline guide

**How JobSentinel tests, builds, verifies, and releases across platforms**

---

## Table of contents

- [Overview](#overview)
- [Workflow security baseline](#workflow-security-baseline)
- [Continuous integration (ci.yml)](#continuous-integration-ciyml)
- [Release builds (release.yml)](#release-builds-releaseyml)
- [Published release verification (verify-release-artifacts.yml)](#published-release-verification-verify-release-artifactsyml)
- [Manual release dispatch](#manual-release-dispatch)
- [Local CI simulation](#local-ci-simulation)
- [Release process](#release-process)
- [Secrets and environment variables](#secrets-and-environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Overview

JobSentinel uses three GitHub Actions workflows for shared verification and
hosted release builds. Production release assets can also be built locally on
the target platform and uploaded manually when the same preflight and artifact
verification gates pass.

| Workflow                 | File                           | Trigger                     | Purpose                         |
| ------------------------ | ------------------------------ | --------------------------- | ------------------------------- |
| CI                       | `ci.yml`                       | Push, PR, manual, or weekly | Path-aware tests, linting, security, docs, and harness |
| Release                  | `release.yml`                  | Version tag or manual       | Build and stage draft installers |
| Verify Release Artifacts | `verify-release-artifacts.yml` | Published release or manual | Verify public installers, checksums, SBOMs, and attestations |

CI no longer has a separate docs workflow. A first `changes` job classifies the
diff, then only the relevant jobs run. Documentation-only changes run harness
and markdown checks without Rust, frontend, or security jobs. Rust, frontend,
dependency, and workflow changes still trigger their matching gates. The weekly
schedule runs only the harness and security jobs, then checks latest stable
dependency and Action pin drift.

Dependabot runs weekly for npm, Cargo, and GitHub Actions. Non-security
minor and patch version updates are grouped to reduce review and CI pressure.
Version updates use short cooldowns before opening PRs for new releases;
Dependabot security updates are not delayed by that cooldown.

---

## Workflow security baseline

Workflow changes must preserve the GitHub Actions security baseline:

- Use `permissions: {}` at workflow level and grant only job-level permissions
  that are required.
- Use `actions/checkout` with `persist-credentials: false` unless a job needs
  Git credentials persisted after checkout.
- Do not use `pull_request_target`, `workflow_run`, or comment-triggered
  privileged workflows for untrusted code.
- Pin third-party actions to full commit SHAs and keep the stable version
  comment current with `npm run lint:actions`.
- Pass workflow-dispatch inputs into shell steps through environment variables,
  then quote those variables in `run:` scripts.
- Route release jobs with write permissions or signing secrets through the
  GitHub `release` environment, and configure that environment with required
  reviewers before production releases.
- Do not use dependency caches in release or publishing jobs. CI may cache to
  speed feedback, but release artifacts must not depend on shared caches. Set
  `package-manager-cache: false` on `actions/setup-node` in release and public
  verification workflows.
- Run `node scripts/install-pinned-npm.mjs` after every `actions/setup-node`
  step and before any `npm` command so CI uses the exact `packageManager` pin.
- Keep Dependabot version updates grouped by ecosystem or risk with cooldowns
  for new releases; security updates stay separate and prompt.
- Keep `.github/CODEOWNERS` covering workflow, dependency, release,
  agent-instruction, AI gateway, and Tauri security boundary files with the
  repository owner required for review.
- Treat persistent agent instruction files as security-sensitive. New
  `AGENTS.md`, `CLAUDE.md`, `CODEX.md`, `GEMINI.md`, Cursor, Windsurf, or
  Copilot instruction paths must be deliberate and added to the harness
  allowlist before they can pass `npm run lint:security`.
- Keep `npm run lint:deps` blocking `package-lock.json` entries that resolve
  outside `https://registry.npmjs.org/` or omit registry integrity hashes.
- Keep `npm run lint:security` blocking high-confidence committed secrets
  through `npm run lint:secrets`. The same secret scan runs before local
  commits through `.husky/pre-commit`.

---

## Continuous integration (ci.yml)

**Trigger:** Push to `main`, pull request targeting `main`, weekly schedule,
or manual run

CI runs on `ubuntu-24.04`. There is no OS matrix and no beta toolchain, only
pinned Rust 1.96.0 on Linux. Jobs are path-aware so docs-only changes avoid
unrelated Rust and frontend work.

### Job: changes

Classifies the changed files and exposes booleans for harness/docs, frontend,
Rust, and security checks. Manual dispatch runs the full CI set. The weekly
schedule runs the harness and security jobs only.

### Job: harness

Runs repo harness checks, exact dependency-pin checks, GitHub Actions pin
checks, and harness script tests. Markdown lint runs when docs, scripts,
agent-facing files, workflow files, or release metadata changed.

| Step                       | Command                 |
| -------------------------- | ----------------------- |
| Install pinned npm         | `node scripts/install-pinned-npm.mjs` |
| Install dependencies       | `npm ci --prefer-offline --no-audit --no-fund` |
| Harness checks             | `npm run harness:check` |
| Dependency pin checks      | `npm run lint:deps`     |
| GitHub Actions pin checks  | `npm run lint:actions`  |
| Harness script tests       | `npm run test:scripts`  |
| Markdown lint, when needed | `npm run lint:md`       |

### Job: test-rust

Checks formatting, installs Linux Tauri dependencies only after formatting
passes, lints, and runs the library test suite. This keeps format failures from
waiting on Ubuntu package installation.

| Step             | Command                       |
| ---------------- | ----------------------------- |
| Check formatting | `cargo fmt --all -- --check`  |
| Run Clippy       | `cargo clippy -- -D warnings` |
| Run tests        | `cargo test --lib`            |

Rust dependencies are cached with `Swatinem/rust-cache`. `SQLX_OFFLINE=true` is set globally
so SQLx does not attempt a live database connection.

### Job: test-frontend

Installs dependencies, type-checks, lints, and runs the Vitest suite when
frontend, package, browser extension, public asset, or frontend config files
changed.

| Step                 | Command             |
| -------------------- | ------------------- |
| Install pinned npm   | `node scripts/install-pinned-npm.mjs` |
| Install dependencies | `npm ci --prefer-offline --no-audit --no-fund` |
| TypeScript check     | `npx --no-install tsc --noEmit` |
| Lint                 | `npm run lint`      |
| Unit tests           | `npm test -- --run` |

### Job: security

Audits both dependency trees for known vulnerabilities when dependency,
security, Dependabot, or workflow files changed. The weekly and manual runs
also check latest stable dependency and Action pin drift. This job intentionally
skips Linux WebKit build dependencies because it does not compile the app.

| Step             | Tool                               |
| ---------------- | ---------------------------------- |
| Security sensors | `npm run lint:security`            |
| npm audit        | `npm audit --audit-level=moderate` |
| Rust policy      | `cargo deny check advisories bans licenses sources` |
| Drift check      | `npm run release:check-deps`       |

---

## Release builds (release.yml)

**Trigger:** Push of a tag matching `v*`, for example `vX.Y.Z`, or manual
`workflow_dispatch`

This workflow creates or updates a draft GitHub Release, then builds installers
for the requested platforms. Tag pushes build all platforms. Manual dispatch
accepts a `version` input and a `platform` choice of `all`, `windows`, `macos`,
or `linux`, replacing the old standalone manual Windows and Linux workflows.

Before any draft release or package build starts, the release workflow resolves
and validates release metadata, then runs independent preflight jobs in
parallel:

- Harness and dependency preflight: harness policy, latest stable dependency
  and Action pins, harness script tests, and markdown lint.
- Frontend preflight: frontend lint, frontend unit tests, and frontend build.
- Rust preflight: Rust formatting before Linux build dependencies, then Rust
  clippy and Rust tests.
- Security preflight: npm advisories and Rust advisories.

Draft-release creation waits for every preflight job before write permissions
or the GitHub `release` environment are used.

### Platforms and artifacts

| Platform         | Target                     | Artifacts uploaded                                |
| ---------------- | -------------------------- | ------------------------------------------------- |
| `windows-2025` | `x86_64-pc-windows-msvc`   | `.msi` plus `.msi.sha256`                         |
| `macos-26`     | `universal-apple-darwin`   | `.dmg` plus `.dmg.sha256` (universal binary - Intel + Apple Silicon) |
| `ubuntu-24.04` | `x86_64-unknown-linux-gnu` | `.AppImage`, `.deb`, and matching checksums       |

Each platform job stages its public files under `release-assets/public`, then
runs `npm run release:sbom`. The generated SPDX 2.3 SBOM combines the npm
lockfile inventory with the Cargo lockfile inventory and writes a companion
manifest with release asset names, sizes, and SHA-256 digests. The workflow
uses GitHub artifact attestations for both build provenance and the SPDX SBOM
before uploading assets to the draft release.

The release starts as a draft. After reviewing the generated release notes, publish it manually
from the GitHub Releases page.

### Windows signing

Hosted Windows release builds require Authenticode signing before the MSI can
be uploaded. The workflow imports a base64-encoded PFX certificate into the
current-user certificate store, removes the temporary PFX file, writes a
temporary `tauri.windows.conf.json` with the signing thumbprint and timestamp
URL, runs `tauri build`, then blocks upload unless `Get-AuthenticodeSignature`
reports `Valid`.

Configure these secrets in the GitHub `release` environment before building
Windows assets:

```text
WINDOWS_CERTIFICATE             # Base64-encoded .pfx code-signing certificate
WINDOWS_CERTIFICATE_PASSWORD    # Password used when exporting the .pfx file
WINDOWS_CERTIFICATE_THUMBPRINT  # 40-character SHA-1 certificate thumbprint
WINDOWS_TIMESTAMP_URL           # Certificate-provider timestamp service URL
WINDOWS_TSP                     # Optional: true for RFC 3161/TSP timestamping
```

The workflow fails before packaging if any required Windows signing secret is
missing or malformed. Do not commit certificate material, local thumbprints, or
provider-specific signing config to the repo.

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

This workflow verifies the public installers exactly as users download them
from GitHub Releases. The Ubuntu job downloads the selected Windows, macOS, and
Linux installer assets, verifies matching checksums, rejects stale installer
assets for selected platforms, verifies SBOM manifests, and verifies GitHub
artifact attestations for SLSA provenance plus the SPDX SBOM predicate. The
macOS job also runs `npm run tauri:verify:macos:latest -- --require-supply-chain`
on `macos-26` for the downloadable DMG. On release publish events, both jobs
scope checks to the published tag. On manual runs, the optional `tag` input
checks a specific release, and a blank tag checks the latest public release.

The public verifier runs `node scripts/install-pinned-npm.mjs` before
`npm ci --prefer-offline --no-audit --no-fund` because dependency advisory
checks already block CI and release preflight. This keeps the post-publish
verifier focused on the downloadable assets, checksums, SBOMs, and
attestations.

For each verified platform, the public verifier rejects stale installer or
checksum assets left on the release tag. A published `2.9.0` release must not
carry an older `.msi`, `.dmg`, `.AppImage`, `.deb`, or matching checksum for a
platform included in the verification run.

The public macOS verifier defaults to the current no-Apple-account release
path: expected JobSentinel bundle id, product name, icon metadata and resource
file, release-tag version, macOS 13.0 minimum-system metadata, universal
`x86_64,arm64` architecture checks, mounted app signature verification,
matching `.dmg.sha256` checksum verification, installed-app smoke, launch
smoke, local data initialization, owner-only local-data permissions, public
macOS SBOM manifest binding, SBOM digest verification, and GitHub artifact
attestations for SLSA provenance plus the SPDX SBOM predicate.
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

## Manual release dispatch

Manual hosted package builds now run through **Actions > Release > Run workflow**.
They are useful for producing one platform outside of a tag-triggered full
release, for example to test a hotfix or replace a draft asset.

Manual release dispatch must be run from the existing `vX.Y.Z` tag that matches
the `version` input. The workflow fails when the selected workflow ref is not
that tag, so release assets and attestations stay bound to one immutable source
commit instead of creating a release tag implicitly.

Local platform builds are also supported. Prefer local builds when you have a
trusted Windows, macOS, or Linux host available and want to avoid unnecessary
hosted runner time. Run the same version, harness, lint, test, build, and
artifact verification gates before upload.

Inputs:

| Input      | Value                                      |
| ---------- | ------------------------------------------ |
| `version`  | `X.Y.Z` or `vX.Y.Z`; must match repo metadata and selected tag ref |
| `platform` | `all`, `windows`, `macos`, or `linux`      |

Manual runs still execute every release preflight job before packaging. Windows
MSI upload is blocked unless the MSI has a valid Authenticode signature. Linux
uploads are blocked unless exactly one AppImage and one Debian package exist,
both filenames include the exact release-version segment, both files are
non-empty, Debian metadata can be inspected, and matching checksums are
generated.

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
npm run lint:security
npm audit --audit-level=moderate
(cd src-tauri && cargo deny check advisories bans licenses sources)
npm run release:check-deps
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

npm run tauri:verify:macos:latest -- --tag vX.Y.Z --no-require-supply-chain
```

Use `--no-require-supply-chain` only for legacy local uploads that predate
release SBOM and attestation support. Normal hosted releases must publish the
SBOM, SBOM manifest, and GitHub attestations, and should be verified with the
default supply-chain check.

For a complete local release, build Windows and Linux installers on native
hosts or VMs from the same tag, then attach those assets to the same release.
Do not publish a release as complete until all advertised platform assets are
present and verified, with stale installer and checksum assets removed from the
tag. Windows MSI assets must pass
`Get-AuthenticodeSignature` with status `Valid` and have a matching
`.msi.sha256` checksum before upload. Linux assets must include exactly one
non-empty `.AppImage` and one non-empty `.deb`, filenames must include the
release version, the `.deb` must pass `dpkg-deb --info` and
`dpkg-deb --contents`, and both Linux assets must have matching `.sha256`
checksums before upload. The post-publish public artifact workflow verifies the
downloadable Windows, macOS, and Linux asset set, checksums, SBOM manifests,
and GitHub attestations; its macOS job also smoke-verifies the downloadable
DMG on `macos-26`.

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

Release publishing and platform-signing secrets should live in the GitHub
`release` environment when available. Configure required reviewers on that
environment so draft-release creation, asset upload, and macOS signing secrets
require explicit release approval.

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
runs automatically. It downloads the public Windows, macOS, and Linux
installers, verifies their checksums, exact versioned asset set, SBOM
manifests, SBOM digests, and GitHub artifact attestations. It also downloads
the public release DMG on macOS and applies the same checksum, signature,
architecture, launch-smoke, installed-app smoke, local data initialization,
owner-only local-data permissions, and optional Gatekeeper checks to the
artifact users can actually download. The no-account public macOS verifier
requires `_no-account_` in the DMG filename, while the Gatekeeper-required
verifier rejects that label for Developer ID signed and notarized releases.
The same no-account check can be run locally on a Mac with
`npm run tauri:verify:macos:latest`; add `--require-gatekeeper` only for a
Developer ID signed and notarized release. Use `--no-require-supply-chain`
only when checking an older release that has no SBOM or attestation assets.

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
- Linux: system library version mismatch. The workflow installs exact-pinned
  Tauri Linux packages with `--no-install-recommends`.
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
