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
  libwebkit2gtk-4.0-dev \
  libgtk-3-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf
```

### Build Tools

- **Node.js** 20+ (frontend)
- **Rust** 1.70+ (backend)
- **npm** (package manager)

## Building Locally

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm ci

# Fetch Rust dependencies
cd src-tauri
cargo fetch --target x86_64-unknown-linux-gnu
cd ..
```

### 2. Build Frontend

```bash
npm run build
```

### 3. Build Tauri App

```bash
cd src-tauri
cargo tauri build --target x86_64-unknown-linux-gnu
```

### 4. Locate Build Artifacts

Build outputs are located at:

- **AppImage**: `src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/appimage/`
- **Debian**: `src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/deb/`

## CI/CD Workflow

JobSentinel uses GitHub Actions for automated Linux builds.

### Build Workflow

`.github/workflows/build-linux.yml` runs on:

- Push to `main` branch
- Pull requests to `main`

Artifacts are uploaded for download.

### Release Workflow

`.github/workflows/release.yml` runs on:

- Git tags matching `v*` (e.g., `v2.7.0`)

Releases include:

- Windows MSI
- macOS DMG (Intel + Apple Silicon)
- Linux AppImage
- Linux .deb

## Distribution Compatibility

### AppImage (Universal)

**Supported Distributions:**

- Ubuntu 20.04+
- Debian 11+
- Fedora 34+
- Arch Linux (current)
- Pop!_OS 20.04+
- Linux Mint 20+

**Runtime Requirements:**

- glibc 2.31+ (Ubuntu 20.04 baseline)
- `libwebkit2gtk-4.0-37`
- `libgtk-3-0`
- `libappindicator3-1`

### Debian Package (.deb)

**Supported Distributions:**

- Ubuntu 20.04+
- Debian 11+
- Pop!_OS 20.04+
- Linux Mint 20+

**Dependency Declaration:**

The `.deb` package declares runtime dependencies in `tauri.conf.json`:

```json
"linux": {
  "deb": {
    "depends": [
      "libwebkit2gtk-4.0-37",
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
  libwebkit2gtk-4.0-37 \
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

JobSentinel is built on **Ubuntu 20.04** for glibc compatibility.

If building on a newer system, the binary may not run on older distributions.

**Solution:** Use Docker or build in an Ubuntu 20.04 container:

```bash
docker run -it --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  ubuntu:20.04 \
  bash -c "apt-get update && \
    apt-get install -y curl build-essential libwebkit2gtk-4.0-dev libgtk-3-dev libappindicator3-dev librsvg2-dev patchelf && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && \
    source ~/.cargo/env && \
    npm ci && npm run build && \
    cd src-tauri && cargo tauri build --target x86_64-unknown-linux-gnu"
```

## Signing and Auto-Updates

### Tauri Signing (Future)

For auto-update support, releases must be signed with Tauri's signing keys.

**Setup:**

1. Generate signing keys: `tauri signer generate`
2. Store public key in repository
3. Add private key to GitHub Secrets
4. Update workflow to sign releases

See [Tauri Signing Documentation](https://tauri.app/v1/guides/distribution/sign-your-app/) for details.

## Notes

- **Ubuntu 20.04 baseline** ensures glibc 2.31 compatibility across distributions
- AppImage is **recommended** for maximum compatibility
- `.deb` is provided for users who prefer package managers
- **No RPM packages yet** - contributions welcome for Fedora/RHEL support
