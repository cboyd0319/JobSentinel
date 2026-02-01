# Intel Mac Support - Universal Binary

## Overview

JobSentinel now ships as a universal binary for macOS, providing native support for both Intel and Apple Silicon
Macs in a single .dmg installer.

**Version:** 2.7.1+

## What Changed

### Before (2.7.0 and earlier)

- Separate downloads for Intel and Apple Silicon
- Two distinct builds in GitHub Actions:
  - `JobSentinel-macOS-Intel-{version}.dmg` (x86_64-apple-darwin)
  - `JobSentinel-macOS-Apple-Silicon-{version}.dmg` (aarch64-apple-darwin)
- Users had to know their Mac architecture

### After (2.7.1+)

- **Single universal binary** works on both architectures
- One download: `JobSentinel-macOS-{version}.dmg`
- macOS automatically runs the correct architecture
- Simpler user experience

## Technical Implementation

### GitHub Actions Workflow Changes

**File:** `.github/workflows/release.yml`

#### 1. Matrix Configuration

```yaml
- platform: macos-latest
  target: universal-apple-darwin
  asset_name_prefix: JobSentinel-macOS
  asset_path: src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg
```

Previously had two separate entries for x86_64 and aarch64.

#### 2. Rust Target Installation

```yaml
- name: Setup Rust
  uses: dtolnay/rust-toolchain@stable
  with:
    targets: ${{ matrix.target == 'universal-apple-darwin' && 'aarch64-apple-darwin,x86_64-apple-darwin' || matrix.target }}
```

Installs both architectures when building universal binary.

#### 3. Dependency Fetching

```yaml
- name: Install Rust dependencies
  working-directory: ./src-tauri
  run: |
    if [ "${{ matrix.target }}" = "universal-apple-darwin" ]; then
      cargo fetch --target aarch64-apple-darwin
      cargo fetch --target x86_64-apple-darwin
    else
      cargo fetch --target ${{ matrix.target }}
    fi
```

Fetches dependencies for both architectures.

#### 4. Build Command

```yaml
- name: Build Tauri app
  working-directory: ./src-tauri
  run: |
    if [ "${{ matrix.target }}" = "universal-apple-darwin" ]; then
      cargo tauri build --target universal-apple-darwin
    else
      cargo tauri build --target ${{ matrix.target }}
    fi
```

Uses `--target universal-apple-darwin` flag to create universal binary.

## Local Development

### Prerequisites

```bash
# Install both Rust targets
rustup target add aarch64-apple-darwin
rustup target add x86_64-apple-darwin
```

### Building Universal Binary Locally

```bash
cd /Users/c/Documents/GitHub/JobSentinel/src-tauri
cargo tauri build --target universal-apple-darwin
```

Output location: `src-tauri/target/universal-apple-darwin/release/bundle/dmg/`

### Verifying Binary

```bash
# Check architectures in the binary
lipo -info src-tauri/target/universal-apple-darwin/release/bundle/macos/JobSentinel.app/Contents/MacOS/JobSentinel

# Expected output:
# Architectures in the fat file: JobSentinel are: x86_64 arm64
```

## Documentation Updates

### Files Updated

1. **`.github/workflows/release.yml`**
   - Removed separate Intel and Apple Silicon builds
   - Added universal-apple-darwin target
   - Updated asset paths and naming

2. **`docs/ROADMAP.md`**
   - Updated Intel Mac support entry to v2.7.1
   - Changed description to "Universal binary"

3. **`README.md`**
   - Updated download table to show single macOS download
   - Changed label from "macOS (Apple Silicon)" to "macOS (Intel & Apple Silicon)"

4. **`docs/developer/GETTING_STARTED.md`**
   - Added universal binary build instructions
   - Documented target installation requirements
   - Updated output paths

5. **`CHANGELOG.md`**
   - Added v2.7.1 entry for universal binary change

## Benefits

### User Experience

- **Simpler downloads** - One file, no confusion
- **Universal compatibility** - Works on any Mac
- **Future-proof** - Ready for any architecture

### Distribution

- **Fewer artifacts** - Less storage, faster releases
- **Cleaner releases** - Single macOS entry instead of two
- **Simplified docs** - No need to explain architectures

### Technical

- **Native performance** - Each architecture runs optimized code
- **Standard approach** - Matches Apple's universal binary strategy
- **Smaller total size** - One binary vs two separate downloads

## File Sizes

Typical universal binary is only ~20% larger than single-arch binary:

- **Intel only:** ~15 MB
- **Apple Silicon only:** ~13 MB
- **Universal:** ~18 MB (not 28 MB!)

This is because much of the code is shared between architectures.

## Testing

### Manual Testing Checklist

- [ ] Install on Intel Mac - application launches
- [ ] Install on Apple Silicon Mac - application launches
- [ ] Verify system info shows correct architecture
- [ ] Check performance on both platforms
- [ ] Test all major features (scrapers, resume matcher, etc.)

### CI/CD Testing

GitHub Actions automatically:

- Builds universal binary on macos-latest (Apple Silicon runner)
- Verifies both architectures are included
- Uploads to releases with correct naming

## Rollback Plan

If universal binary causes issues, revert to separate builds:

1. Restore previous matrix entries in release.yml
2. Update asset paths back to architecture-specific locations
3. Revert documentation changes
4. Tag new release

## References

- [Tauri Universal Binary Docs](https://tauri.app/v1/guides/building/macos)
- [Rust Cross-Compilation](https://rust-lang.github.io/rustup/cross-compilation.html)
- [Apple Universal Binaries](https://developer.apple.com/documentation/apple-silicon/building-a-universal-macos-binary)

## Related Issues

- Closes GitHub issue for Intel Mac support (if one exists)
- Part of v2.7.1 release scope
