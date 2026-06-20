# JobSentinel - macOS Development Guide

**Status:** Local app packaging and universal DMG packaging verified on macOS
**Latest Tested:** macOS 26.0 developer-preview family on Apple Silicon - June 2026
**Evidence:** See [Current macOS Readiness](#current-macos-readiness) for the
latest local commands, checksum checks, architecture checks, and mounted-app
launch checks.

---

## Quick Start (macOS)

### Prerequisites

1. **Install Rust:**

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   ```

   Universal macOS builds require the rustup-managed
   `aarch64-apple-darwin` and `x86_64-apple-darwin` targets. The maintained
   macOS package script prefers the rustup toolchain when it is available, so
   Homebrew Rust being earlier in `PATH` should not break universal builds.

2. **Install Node.js:**

   ```bash
   brew install node
   ```

3. **Use the repo-local Tauri CLI:**

   Run `node scripts/install-pinned-npm.mjs` before `npm ci --ignore-scripts`.
   The install uses the repo-pinned npm, installs `@tauri-apps/cli`, and skips
   third-party lifecycle scripts. Use `npm run tauri:*` scripts or
   `npx --no-install tauri` from the repo root.

### Development Setup

1. **Clone and install dependencies:**

   ```bash
   cd <repo-root>
   node scripts/install-pinned-npm.mjs
   npm ci --ignore-scripts
   ```

2. **Run in development mode:**

   ```bash
   npm run tauri:dev
   ```

   This will:
   - Start the Vite dev server (React frontend)
   - Compile the Rust backend
   - Launch the Tauri app window

3. **Check for compilation errors:**

   ```bash
   cd src-tauri
   cargo check
   ```

4. **Run tests:**

   ```bash
   cd src-tauri
   cargo test
   ```

---

## Directory Structure (macOS)

JobSentinel creates the following directories on macOS:

| Purpose | Path | Description |
|---------|------|-------------|
| **Data** | `~/Library/Application Support/JobSentinel` | SQLite database, scraped jobs; app-owned directory should be private to the current macOS account, and `jobs.db` should be owner-only |
| **Config** | `~/.config/jobsentinel` | config.json, user preferences; app-owned directory should be private to the current macOS account |
| **Cache** | `~/Library/Caches/JobSentinel` | Cache files |
| **Logs** | `~/Library/Logs/JobSentinel` | Application logs |

**Tested on:** macOS 26.0 developer-preview family (Darwin 25.5.0, build 25F71)
on Apple Silicon
`arm64` for current-architecture and universal local package smoke. The local
host checked on 2026-06-02 was a MacBook Pro Mac16,5 with Apple M4 Max and SIP
enabled. Historical development coverage also includes macOS 15, macOS 14, and
macOS 13.

### View Your Data

```bash
# View configuration
cat ~/.config/jobsentinel/config.json

# Database note
# jobs.db is SQLCipher encrypted at rest. Inspect data through the app UI,
# safe support reports, or purpose-built encrypted database diagnostics.
```

---

## Running JobSentinel on macOS

### Development Mode

```bash
npm run tauri:dev
```

**Features:**

- Hot reload for React frontend
- Rust backend recompiles on save
- Console logging enabled
- Debug symbols included

### Production Build

```bash
npm run tauri:build -- --bundles app
```

**App output:** `src-tauri/target/release/bundle/macos/JobSentinel.app`

For a local `.dmg` package, use the maintained macOS packaging script:

```bash
npm run tauri:build:macos
```

**DMG output:** `src-tauri/target/release/bundle/dmg/JobSentinel_<version>_<arch>.dmg`

For a universal `.dmg` package:

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run tauri:build:macos -- --target universal-apple-darwin
```

If Homebrew Rust is first in `PATH`, keep using the same command. The package
script asks rustup for the active toolchain path and prepends it while running
Tauri.

The packaging script builds the Tauri `.app`, verifies or ad-hoc signs the app
bundle when no signing identity is configured, creates a drag-to-Applications
DMG with `hdiutil`, verifies the disk image, and writes a matching
`.dmg.sha256` checksum file. It avoids Finder AppleScript so the package path
works in local shells and CI runners with Command Line Tools. When notarization
credentials are available, it also signs, notarizes, staples, and validates the
custom DMG before returning.

JobSentinel does not currently have an Apple Developer Account. Without that
account, the app cannot be Developer ID signed, notarized, stapled, or accepted
by Gatekeeper as a zero-friction public macOS download. The local package path
remains useful for development, testing, and clearly labeled no-account public
packages when the DMG and checksum are uploaded together and the public
artifact verifier passes.

Required public-release environment once an Apple Developer Account exists:

```bash
export APPLE_CERTIFICATE="base64-encoded-p12"
export APPLE_CERTIFICATE_PASSWORD="p12-export-password"
export APPLE_SIGNING_IDENTITY="Developer ID Application: Name (TEAMID)"
export APPLE_ID="developer@example.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="TEAMID"
```

App Store Connect API key notarization is also supported:

```bash
export APPLE_API_KEY="KEYID12345"
export APPLE_API_KEY_PATH="/private/path/AuthKey_KEYID12345.p8"
export APPLE_API_ISSUER="issuer-uuid"
```

Local builds may use `JOBSENTINEL_MACOS_NOTARY_PROFILE` or
`NOTARYTOOL_KEYCHAIN_PROFILE` when that profile already exists in the local
keychain. GitHub Actions release builds do not use profile-only notarization
because hosted runners start with no pre-created notarytool profile; use Apple
ID credentials or raw `.p8` API key contents there.

After building a `.dmg`, run the package verifier:

```bash
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
```

For current no-account package checks, keep `--launch-smoke --install-smoke
--require-checksum` without `--require-gatekeeper`. That mode verifies the app
bundle uses the expected JobSentinel id, product name, version, icon metadata,
and icon resource file, declares macOS 13.0 or newer as its minimum system
version, the generated `.dmg.sha256` sidecar matches the DMG, the mounted app
can start, the copied installed app can start, and both launches create an
isolated local `jobs.db` with owner-only local-data permissions. For Developer
ID public release gating, add `--require-gatekeeper`; that mode also requires
the signed and notarized public app plus disk image to pass Gatekeeper
assessment.

The package smoke starts the app with `open -F -n` and
`ApplePersistenceIgnoreState=YES` so macOS does not restore prior app state after
a crash. It also routes data to a verifier-owned temporary root and uses a
verifier-only database key, so package verification does not touch live app data
or prompt for the user's Keychain.

For a local no-account DMG that is ready to upload or replace manually, build
with `JOBSENTINEL_MACOS_NO_ACCOUNT=true`. The builder writes
`JobSentinel_<version>_no-account_universal.dmg` and a matching `.sha256`
sidecar directly, so the checksum is created for the public filename.

This local upload path is supported for macOS release work when it is cheaper
or faster than hosted release CI. It still needs the same release-version,
harness, package-verification, checksum, and public-artifact verification gates
before users should treat the DMG as current. Hosted release CI is preferred
for public releases because it also creates SBOM and provenance attestations.

After publishing a current `2.9.0` or newer release, verify the downloaded
public artifact too:

```bash
npm run tauri:verify:macos:latest
```

That command downloads the latest public GitHub release DMG and applies
checksum, universal-architecture, visible-window launch-smoke, installed-app
smoke, signature checks, SBOM manifest binding, and GitHub attestation checks,
including bundle identity, release-tag version, icon metadata and resource
file, macOS 13.0 minimum-system metadata, and isolated macOS data directory and
owner-only database permissions during launch smoke. Use
`--no-require-supply-chain` only for older releases that predate hosted SBOM
and attestation assets.

The current complete local universal DMG smoke on 2026-06-18 verified
`JobSentinel_2.9.0_no-account_universal.dmg`, checked the matching
`.dmg.sha256`, confirmed the app binary contains both `x86_64` and `arm64`,
verified the mounted and copied app signatures, and kept both mounted and
installed app launches running for 12 seconds with on-screen app views and
empty stderr. Both launches created an isolated macOS data directory and
`jobs.db` with owner-only local-data permissions. That evidence proves the
current `2.9.0` no-account local packaging path before public upload.

Because the no-account package uses an ad-hoc signature, Gatekeeper assessment
rejects the `.app` and `.dmg`. Gatekeeper rejection remains expected for
no-account packages. A zero-friction public macOS release still needs an Apple
Developer Account, Developer ID signing, notarization, and stapling. No-account
macOS releases must be clearly labeled, include a matching checksum, and pass
the public release verifier before they are treated as current.

**Note:** The `.dmg` installer is for distribution. You can also run the binary directly:

```bash
./src-tauri/target/release/jobsentinel
```

---

## Troubleshooting

### Rust not found

```bash
# Add Rust to PATH
source $HOME/.cargo/env

# Verify installation
rustc --version
cargo --version
```

### SQLite errors

If you see database errors, try:

```bash
# Install SQLite (should be pre-installed on macOS)
brew install sqlite

# Clear existing database
rm -f ~/Library/Application\ Support/JobSentinel/jobs.db
```

### Port conflicts

If port 1420 is already in use:

```bash
# Kill the process using port 1420
lsof -ti:1420 | xargs kill -9

# Or change the port in src-tauri/tauri.conf.json
```

### Node modules issues

```bash
# Clear installed packages and reinstall from the lockfile
rm -rf node_modules
node scripts/install-pinned-npm.mjs
npm ci --ignore-scripts
```

---

## macOS-Specific Features

### Implemented

- Application Support directory (`~/Library/Application Support/JobSentinel`)
- XDG config directory support (`~/.config/jobsentinel`)
- Directory creation on first run
- macOS version detection (`sw_vers`)
- Sandbox detection
- Cache and logs directory support
- Menu bar tray integration through Tauri's tray APIs
- Native desktop notifications through the Tauri notification plugin
- Secret-vault credential storage with a Keychain-protected vault key

### Planned Or Distribution-Dependent

- Launch Agent support for start-on-login
- App Sandbox support
- Developer ID code signing and notarization for public distribution

---

## Testing the Full Flow

1. **Start the app:**

   ```bash
   npm run tauri:dev
   ```

2. **Complete first-run setup:**
   - Enter job titles: "Program Analyst", "Operations Manager"
   - Select location: Remote only
   - Set salary floor: $85,000
   - (Optional) Add Slack webhook

3. **Trigger a search:**
   - Click "Search Now" in the UI
   - Or use the system tray menu

4. **View results:**
   - Check the dashboard for jobs
   - Use safe support reports or encrypted database diagnostics for deeper
     local inspection. Raw `sqlite3 jobs.db` cannot read the SQLCipher file.

---

## Development Workflow

### Making Changes

1. **Frontend changes (React/TypeScript):**
   - Edit files in `src/`
   - Hot reload automatically updates UI
   - No restart needed

2. **Backend changes (Rust):**
   - Edit files in `src-tauri/src/`
   - Save triggers automatic recompilation
   - Tauri restarts backend automatically

3. **Configuration changes:**
   - Edit `src-tauri/tauri.conf.json`
   - Requires full restart: `Ctrl+C` then `npm run tauri:dev`

### Running Specific Tests

```bash
cd src-tauri

# Run all tests
cargo test

# Run tests for a specific module
cargo test --test db
cargo test --test platforms

# Run with output
cargo test -- --nocapture

# Run macOS platform tests specifically
cargo test --lib platforms::macos
```

### Debugging

```bash
# Check for compilation errors
cargo check

# Build with verbose output
cargo build --verbose

# Run with trace logging
RUST_LOG=trace npm run tauri:dev

# Check SQLx migrations
cargo sqlx migrate info
```

---

## Known Limitations (macOS)

1. **System tray behavior:**
   - macOS uses menu bar instead of system tray
   - Icon appears in top-right menu bar area

2. **Window management:**
   - Tauri Windows behave slightly differently on macOS vs Windows
   - Use Cmd+Q to quit (not just closing window)

3. **File permissions:**
   - macOS may require granting app permissions for:
     - Full Disk Access (for some directories)
     - Notifications (if enabled)

4. **Database location:**
   - Different from Windows (`~/Library` vs `%LOCALAPPDATA%`)
   - Use platform-agnostic code: `Database::default_path()`

---

## Performance Notes

### First Compilation

First `cargo build` will be slow (~5-10 minutes):

- Downloads and compiles all Rust dependencies
- Subsequent builds are much faster (~10-30 seconds)

### Optimization

For faster development cycles:

```bash
# Use mold linker (faster linking on macOS)
brew install mold

# Add to ~/.cargo/config.toml
[target.aarch64-apple-darwin]
linker = "clang"
rustflags = ["-C", "link-arg=-fuse-ld=/opt/homebrew/bin/mold"]
```

---

## Current macOS Readiness

Current macOS full-public-readiness is 94%; no-account path completion is 100%.
The full-public value is the maximum honest readiness while the project has no
Apple Developer Account. The remaining 6% requires Developer ID signing,
notarization, stapling, Gatekeeper acceptance, and signed public-artifact
verification.

1. **Local package path verified** - Universal DMG build, checksum
   verification, app signature verification, architecture check, and packaged
   plus installed visible-window launch smoke pass locally, including local
   database creation under isolated macOS homes.
2. **No-account public package path available** - Public macOS releases can use
   a clearly labeled ad-hoc signed package with a matching `.dmg.sha256` and a
   passing public verifier. It still requires first-open Privacy & Security
   approval.
3. **Zero-friction public release blocked on Apple account** - Gatekeeper-ready
   public macOS releases require an Apple Developer Account, Developer ID
   signing, notarization, then `--launch-smoke --install-smoke
   --require-gatekeeper` verification before upload.
4. **Published artifact gate active** - After publishing a current release,
   run `npm run tauri:verify:macos:latest` to verify the downloaded public
   DMG, isolated-data smoke, SBOM manifest, and GitHub attestations.
5. **Runtime workflow checks before release** - Run the app, complete setup,
   create a first search, save an application, and generate a safe support
   report before publishing a release.
6. **Report issues with safe support reports** - Save a local support report
   from the app and share it only after review.

---

## Differences from Windows

| Feature | Windows | macOS | Notes |
|---------|---------|-------|-------|
| **Data Dir** | `%LOCALAPPDATA%\JobSentinel` | `~/Library/Application Support/JobSentinel` | Different conventions |
| **Config Dir** | `%APPDATA%\JobSentinel` | `~/.config/jobsentinel` | XDG standard on macOS |
| **Installer** | `.msi` / setup `.exe` | `.dmg` | Platform-specific |
| **System Tray** | Bottom-right | Top-right menu bar | Different UI location |
| **Admin Rights** | Not needed | Not needed | Both run in user space |
| **Auto-start** | Task Scheduler | Launch Agent | Future feature |

---

## Contributing (macOS-specific)

When contributing macOS-specific code:

1. Use conditional compilation:

   ```rust
   #[cfg(target_os = "macos")]
   pub fn macos_specific_function() {
       // macOS-only code
   }
   ```

2. Test on real macOS hardware
3. Follow Apple Human Interface Guidelines
4. Use native macOS APIs when possible
5. Document platform-specific behavior

---

**macOS development setup is ready.**

*For general documentation, see [GETTING_STARTED.md](GETTING_STARTED.md)*
