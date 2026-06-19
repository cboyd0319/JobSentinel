# Linux Build Guide

This guide explains how to build JobSentinel for Linux distributions.

## Build Targets

JobSentinel supports two Linux package formats:

- **AppImage** - Universal Linux binary (recommended)
- **Debian (.deb)** - Ubuntu/Debian package manager format

## Prerequisites

### System Dependencies

Install the required development libraries:

```bash
sudo apt-get update
sudo apt-get install -y \
  file \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libgtk-3-bin \
  libappindicator3-dev \
  librsvg2-dev \
  libfuse2t64 \
  patchelf \
  squashfs-tools
```

### Build Tools

- **Node.js** 24.17.0 (frontend)
- **Rust** 1.96.0, matching `rust-toolchain.toml`
- **npm** (package manager)
- **libfuse2t64** on Ubuntu 24.04, or **libfuse2** on older Debian/Ubuntu
  releases, for AppImage helper compatibility

## Building Locally

### 1. Install Dependencies

```bash
# Activate pinned npm, then install frontend dependencies
node scripts/install-pinned-npm.mjs
npm ci --ignore-scripts

# Fetch Rust dependencies
cd src-tauri
cargo fetch --target x86_64-unknown-linux-gnu
cd ..
```

### 2. Build Tauri App

The Tauri CLI builds both the frontend and the Rust backend:

```bash
node scripts/build-linux-appimage.mjs --target x86_64-unknown-linux-gnu
```

The AppImage wrapper keeps `APPIMAGE_EXTRACT_AND_RUN=1` enabled, uses Tauri's
project-local helper cache under `src-tauri/target/.tauri/`, downloads only
missing fallback helpers from pinned HTTPS URLs, and verifies SHA-256 before
executing helper scripts or extracted `linuxdeploy` AppRun binaries.

### 3. Locate Build Artifacts

Build outputs are located at:

- **AppImage**: `src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/appimage/`
- **Debian**: `src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/deb/`

## GitHub Build Workflow

JobSentinel builds Linux packages through the consolidated Release workflow.

### Manual Release Dispatch

`.github/workflows/release.yml` runs through `workflow_dispatch` with a
required `version` input and a `platform` choice. Select `linux` to build only
Linux assets, or `all` to build Windows, macOS, and Linux assets.

Before packaging, the workflow validates the requested version and runs harness
checks, harness script tests, markdown linting, the frontend build, Rust
formatting, Rust clippy, and Rust unit tests. AppImage and Debian artifacts are
attached to the staged release with matching checksums.

### Release Workflow

`.github/workflows/release.yml` runs on:

- Git tags matching `v*` (e.g., `v2.7.0`)
- Manual dispatch with `platform` set to `all` or `linux`

Releases include:

- Windows MSI and setup EXE
- macOS DMG (Intel + Apple Silicon)
- Linux AppImage
- Linux .deb

## Distribution Compatibility

### AppImage (Universal)

**Supported Distributions:**

- Ubuntu 24.04+
- Debian 12+
- Fedora 40+
- Arch Linux (current)
- Pop!_OS 24.04+
- Linux Mint 22+

**Runtime Requirements:**

- glibc 2.39+ (Ubuntu 24.04 baseline)
- `libwebkit2gtk-4.1-0`
- `libgtk-3-0`
- `libappindicator3-1`

### Debian Package (.deb)

**Supported Distributions:**

- Ubuntu 24.04+
- Debian 12+
- Pop!_OS 24.04+
- Linux Mint 22+

**Dependency Declaration:**

The `.deb` package declares runtime dependencies in `tauri.conf.json`:

```json
"linux": {
  "deb": {
    "depends": [
      "libwebkit2gtk-4.1-0",
      "libgtk-3-0",
      "libappindicator3-1"
    ]
  }
}
```

## Installation

### AppImage

```bash
# Make executable
chmod +x JobSentinel-Linux-*.AppImage

# Run
./JobSentinel-Linux-*.AppImage
```

### Debian Package

```bash
sudo dpkg -i JobSentinel-Linux-*.deb

# Fix missing dependencies (if any)
sudo apt-get install -f
```

## Troubleshooting

### Missing Dependencies

If you see errors about missing libraries:

```bash
# Install runtime dependencies
sudo apt-get install -y \
  libwebkit2gtk-4.1-0 \
  libgtk-3-0 \
  libappindicator3-1
```

### AppImage Won't Run

**Issue:** Permission denied

```bash
chmod +x JobSentinel-Linux-*.AppImage
```

**Issue:** FUSE not available

```bash
# Extract and run without FUSE
./JobSentinel-Linux-*.AppImage --appimage-extract
./squashfs-root/AppRun
```

### Build Fails on Non-Ubuntu Systems

JobSentinel CI builds on **Ubuntu 24.04** for glibc compatibility.

If building on a newer system, the binary may not run on older distributions.

**Solution:** Use Docker or build in an Ubuntu 24.04 container:

```bash
docker run -it --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  ubuntu:24.04 \
  bash -c "apt-get update && \
    apt-get install -y curl file build-essential libwebkit2gtk-4.1-dev libgtk-3-dev libgtk-3-bin libappindicator3-dev librsvg2-dev libfuse2t64 patchelf squashfs-tools && \
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y nodejs && \
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && \
    source ~/.cargo/env && \
    node scripts/install-pinned-npm.mjs && \
    npm ci --ignore-scripts && node scripts/build-linux-appimage.mjs --target x86_64-unknown-linux-gnu"
```

## Signing and Auto-Updates

### Tauri Signing (Future)

For auto-update support, releases must be signed with Tauri's signing keys.

**Setup:**

1. Generate signing keys: `tauri signer generate`
2. Store public key in repository
3. Add private key to GitHub Secrets
4. Update workflow to sign releases

See [Tauri Signing Documentation](https://tauri.app/distribute/sign/linux/) for details.

## Notes

- **Ubuntu 24.04 baseline** ensures glibc 2.39 compatibility across distributions
- AppImage is **recommended** for maximum compatibility
- `.deb` is provided for users who prefer package managers
- **No RPM packages yet** - contributions welcome for Fedora/RHEL support
