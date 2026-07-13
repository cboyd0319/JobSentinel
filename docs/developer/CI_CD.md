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
| Release                  | `release.yml`                  | Manual from version tag     | Build, upload, and publish release assets |
| Verify Release Artifacts | `verify-release-artifacts.yml` | Published release or manual | Verify public installers, checksums, SBOMs, and attestations |

CI no longer has a separate docs workflow. A first `changes` job classifies the
diff, then only the relevant jobs run. Documentation-only changes run harness
and markdown checks without Rust, frontend, or security lanes. Rust, frontend,
dependency, and workflow changes still trigger their matching gates. The weekly
schedule runs only the harness plus split Node/Rust security lanes, then checks
latest stable dependency and Action pin drift.

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
- Run GitHub Actions static analysis in the CI Node security job with a SHA-pinned
  `zizmor-action` step.
- Pass GitHub event data and workflow-dispatch inputs into shell steps through
  environment variables, then quote those variables in `run:` scripts.
- Route release jobs with write permissions or signing secrets through the
  GitHub `release` environment, and configure that environment with required
  reviewers before production releases.
- Do not use dependency caches in release or publishing jobs. CI may cache to
  speed feedback, but release artifacts must not depend on shared caches. Set
  `package-manager-cache: false` on `actions/setup-node` in release and public
  verification workflows.
- Run `node scripts/install-pinned-npm.mjs` after every `actions/setup-node`
  step and before any `npm` command so CI uses the exact `packageManager` pin.
- Add `--ignore-scripts` to workflow `npm ci` installs so dependency lifecycle
  scripts cannot execute during automated checks or release verification.
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
schedule runs the harness plus Node/Rust security lanes only.

### Job: harness

Runs repo harness checks, exact dependency-pin checks, GitHub Actions pin
checks, and harness script tests. Markdown lint runs when docs, scripts,
agent-facing files, workflow files, or release metadata changed.

| Step                       | Command                 |
| -------------------------- | ----------------------- |
| Install pinned npm         | `node scripts/install-pinned-npm.mjs` |
| Install dependencies       | `npm ci --ignore-scripts --prefer-offline --no-audit --no-fund` |
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
| Install dependencies | `npm ci --ignore-scripts --prefer-offline --no-audit --no-fund` |
| TypeScript check     | `npx --no-install tsc --noEmit` |
| Lint                 | `npm run lint`      |
| Unit tests           | `npm test -- --run` |

### Jobs: security-node and security-rust

Audit workflows and both dependency trees for known vulnerabilities when
dependency, security, Dependabot, or workflow files changed. The weekly and
manual runs also check latest stable dependency and Action pin drift. These
lanes intentionally skip Linux WebKit build dependencies because they do not
compile the app. Node security work and Rust dependency policy run in separate
jobs so a broad CI run does not serialize `npm audit`/zizmor checks behind
`cargo-deny` installation and advisory analysis.

| Step             | Tool                               |
| ---------------- | ---------------------------------- |
| Security sensors | `npm run lint:security`            |
| Workflow static analysis | `zizmor-action`            |
| npm audit        | `npm audit --audit-level=moderate` |
| Rust policy      | `cargo deny check advisories bans licenses sources` |
| Drift check      | `npm run release:check-deps`       |

---

## Release builds (release.yml)

**Trigger:** Manual `workflow_dispatch` from an existing tag matching `v*`,
for example `vX.Y.Z`

This workflow creates or updates a staged GitHub Release, then builds installers
for the requested platforms. Manual dispatch accepts a `version` input and a
`platform` choice of `all`, `windows-linux`, `windows`, `macos`, or `linux`,
replacing the old standalone manual Windows and Linux workflows. Use
`windows-linux` only after a local macOS asset has already been built, verified,
and uploaded to the same draft release.

Before any staged release or package build starts, the release workflow resolves
and validates release metadata, then runs independent preflight jobs in
parallel:

- Harness and dependency preflight: release readiness, harness policy, latest
  stable dependency and Action pins, harness script tests, and markdown lint.
- Frontend preflight: frontend lint, frontend unit tests, and frontend build.
- Rust preflight: Rust formatting before Linux build dependencies, then Rust
  clippy and Rust tests.
- Split security preflights: npm advisories and Rust dependency policy.

Draft-release creation waits for every preflight job before write permissions
or the GitHub `release` environment are used.

### Platforms and artifacts

| Platform         | Target                     | Artifacts uploaded                                |
| ---------------- | -------------------------- | ------------------------------------------------- |
| `windows-2025` | `x86_64-pc-windows-msvc`   | Signed `.msi` and setup `.exe`, or `_unsigned` variants, plus `.sha256` |
| `macos-26`     | `universal-apple-darwin`   | `.dmg` plus `.dmg.sha256` (universal binary - Intel + Apple Silicon) |
| `ubuntu-24.04` | `x86_64-unknown-linux-gnu` | `.AppImage`, `.deb`, and matching checksums       |

Each platform job stages its public files under `release-assets/public`, then
runs `npm run release:sbom`. The generated SPDX 2.3 SBOM combines the npm
lockfile inventory with the Cargo lockfile inventory and writes a companion
manifest with release asset names, sizes, and SHA-256 digests. The workflow
uses GitHub artifact attestations for both build provenance and the SPDX SBOM
before uploading assets to the staged release.

The release starts as a draft while matrix jobs upload platform assets, then the
workflow publishes it automatically after all requested platform uploads
succeed. Do not publish manually unless the release workflow has failed after
creating a draft and you have verified the complete asset set yourself from the
GitHub Releases page.

### Windows signing

Hosted Windows release builds use Authenticode signing when signing secrets are
available. The workflow imports a base64-encoded PFX certificate into the
current-user certificate store, removes the temporary PFX file, writes a
temporary `tauri.windows.conf.json` with the signing thumbprint and timestamp
URL, runs `tauri build`, removes the imported certificate and private key from
the runner certificate store, then blocks signed upload unless
`Get-AuthenticodeSignature` reports `Valid`. If all Windows signing secrets are
missing, the workflow builds an explicitly `_unsigned` MSI, verifies that label
before upload, and publishes the matching checksum, SBOM, and attestations.
Windows SmartScreen warnings are expected for that no-account path.

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
to the staged release. When
Developer ID signing and notarization secrets are configured, the workflow also
adds `--require-gatekeeper`.

## Published release verification (verify-release-artifacts.yml)

**Trigger:** Published GitHub Release or manual `workflow_dispatch`

This workflow verifies the public installers exactly as users download them
from GitHub Releases. The Ubuntu job downloads the selected Windows, macOS, and
Linux installer assets, verifies matching checksums, rejects stale installer
assets for selected platforms, verifies SBOM manifests, and verifies GitHub
artifact attestations for SLSA provenance plus the SPDX SBOM predicate. The
macOS job runs `npm run tauri:verify:macos:latest -- --require-supply-chain`
on `macos-26` for the downloadable DMG when the verification scope includes
macOS. On release publish events, both jobs scope checks to the published tag
when the event fires. On manual runs, the optional `tag` input checks a
specific release, a blank tag checks the latest public release, and
`platforms=windows,linux` skips the macOS runner for local-macOS releases.
The Ubuntu job also verifies both downloadable Agent Skills archives:
`JobSentinel-X.Y.Z-agent-skills.tar.gz` for Unix-like tooling and
`JobSentinel-X.Y.Z-agent-skills.zip` for Windows-friendly extraction, along
with both `.sha256` checksum sidecars.

The public verifier runs `node scripts/install-pinned-npm.mjs` before
`npm ci --ignore-scripts --prefer-offline --no-audit --no-fund` because
dependency advisory checks already block CI and release preflight. Lifecycle
scripts stay disabled in automated installs so third-party packages cannot run
install-time code in CI. This keeps the post-publish verifier focused on the
downloadable assets, checksums, SBOMs, and attestations.

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
They are useful for producing one platform outside of a full hosted
release, for example to test a hotfix or replace a draft asset.

Manual release dispatch must be run from the existing `vX.Y.Z` tag that matches
the `version` input. Pushing a tag does not start release publication by
itself. The workflow fails when the selected workflow ref is not that tag, so
release assets and attestations stay bound to one immutable source commit
instead of creating a release tag implicitly.

Local platform builds are also supported. Prefer local macOS builds for
no-account releases when you have a trusted Mac available and do not need
hosted macOS proof. Run the same version, harness, lint, test, build, SBOM,
and artifact verification gates before upload.

Inputs:

| Input      | Value                                      |
| ---------- | ------------------------------------------ |
| `version`  | `X.Y.Z` or `vX.Y.Z`; must match repo metadata and selected tag ref |
| `platform` | `all`, `windows-linux`, `windows`, `macos`, or `linux` |

Manual runs still execute every release preflight job before packaging. Windows
MSI upload is blocked unless the MSI is either Authenticode-signed or explicitly
named with `_unsigned`; both paths require a matching checksum. Linux uploads
are blocked unless exactly one AppImage and one Debian package exist, both
filenames include the exact release-version segment, both files are non-empty,
Debian metadata can be inspected, and matching checksums are generated.

---

## Local CI simulation

Run the same checks locally before pushing to avoid a CI failure round-trip.

```bash
# Rust, from the repository root
cargo fmt --all -- --check
cargo clippy --workspace -- -D warnings
cargo test --workspace

# Frontend — from repo root
npx --no-install tsc --noEmit
npm run lint
npm test -- --run

# Security
npm run lint:security
npm audit --audit-level=moderate
cargo deny check advisories bans licenses sources
npm run release:check-deps
```

For broader local validation, use the [verification matrix](../harness/verification-matrix.md):

```bash
cargo fmt --all -- --check && \
cargo clippy --workspace -- -D warnings && \
cargo test --workspace && \
npm run lint && npm run test:run
```

---

## Release process

### 1. Prepare the release

```bash
# Update version in release metadata and lock files
# Cargo.toml -> [workspace.package] version = "X.Y.Z"
# package.json -> "version": "X.Y.Z"
# package-lock.json -> root "version" and packages[""].version = "X.Y.Z"
# src-tauri/tauri.conf.json -> "version": "X.Y.Z"

# Update CHANGELOG.md, then commit
git add Cargo.toml Cargo.lock package.json package-lock.json src-tauri/tauri.conf.json CHANGELOG.md
git commit -m "chore: bump version to X.Y.Z"
git push origin main
```

Before tagging or uploading local assets, run the full release gate in
[Releasing](RELEASING.md). It includes version validation, harness checks,
latest-stable dependency checks, environment doctors, docs lint, frontend
tests, full Playwright E2E, frontend build, Rust formatting, Rust clippy, and
the full Rust test suite.

### 2. Choose release build path

Use either hosted release dispatch or local platform builds.

For a full hosted release:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Then run **Actions > Release > Run workflow** from the `vX.Y.Z` tag ref with
`platform=all`.

For local macOS no-account asset upload:

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
JOBSENTINEL_MACOS_NO_ACCOUNT=true npm run tauri:build:macos -- --target universal-apple-darwin
npm run tauri:verify:macos -- \
  --dmg target/universal-apple-darwin/release/bundle/dmg/JobSentinel_X.Y.Z_no-account_universal.dmg \
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
  target/universal-apple-darwin/release/bundle/dmg/JobSentinel_X.Y.Z_no-account_universal.dmg \
  target/universal-apple-darwin/release/bundle/dmg/JobSentinel_X.Y.Z_no-account_universal.dmg.sha256

npm run tauri:verify:macos:latest -- --tag vX.Y.Z --no-require-supply-chain
```

Use `--no-require-supply-chain` only for local uploads or legacy releases that
do not have GitHub Actions build-provenance attestations for the macOS asset.
Normal hosted releases must publish the SBOM, SBOM manifest, and GitHub
attestations, and should be verified with the default supply-chain check.

For the preferred no-account local-macOS release path, create or update the
draft release, upload the verified local DMG, checksum, macOS SBOM manifest,
and macOS SPDX SBOM, then run **Actions > Release > Run workflow** from the
same tag with `platform=windows-linux`.

For a complete local release, build Windows and Linux installers on native
hosts or VMs from the same tag, then attach those assets to the same release.
Do not publish a release as complete until all advertised platform assets are
present and verified, with stale installer and checksum assets removed from the
tag. Windows MSI and NSIS setup assets must be Authenticode-signed or
explicitly named with `_unsigned`; both paths require matching `.sha256`
checksums before upload. Linux assets must include exactly one non-empty
`.AppImage` and one non-empty `.deb`, filenames must include the release
version, the `.deb` must pass `dpkg-deb --info` and `dpkg-deb --contents`, and
both Linux assets must have matching `.sha256` checksums before upload. The
post-publish public artifact workflow verifies the downloadable Windows,
macOS, and Linux asset set, Agent Skills tar.gz/ZIP archives, checksums, SBOM
manifests, and GitHub attestations; its macOS job also smoke-verifies the
downloadable DMG on `macos-26`.

### 3. Verify the published release

1. Wait for the `Release` workflow to finish successfully.
2. Confirm the release is no longer a draft.
3. Run explicit public verification for the published tag. Use
   `npm run release:verify:public -- --tag vX.Y.Z --platforms windows,macos,linux`
   plus `npm run tauri:verify:macos:latest -- --tag vX.Y.Z` for a full hosted
   release. For a local-macOS release, use `--platforms windows,linux` for the
   hosted assets and `npm run tauri:verify:macos:latest -- --tag vX.Y.Z --no-require-supply-chain`
   for the local Mac artifact.

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
environment so staged release creation, asset upload, publication, and macOS
signing secrets require explicit release approval.

Use `npm run release:check-env` locally before tagging to check release-signing
environment completeness without reading or printing secret values. Add
`-- --require-windows-signing` only for Authenticode-signed Windows installers,
and add `-- --require-macos-gatekeeper` only for a Developer ID signed and
notarized macOS release.

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
After the macOS build and verification steps, CI deletes the temporary signing
keychain, decoded `.p12` certificate, and materialized App Store Connect `.p8`
key from the hosted runner.

After the GitHub release is published, run public verification explicitly. The
`Verify Release Artifacts` workflow can also be dispatched manually. It
downloads the public Windows, macOS, and Linux installers, verifies their
checksums, exact versioned asset set, SBOM
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
only when checking a local macOS artifact or an older release that has no
GitHub Actions provenance attestations.

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
