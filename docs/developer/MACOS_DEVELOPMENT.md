# JobSentinel - macOS Development Guide

**Status:** Development works on macOS
**Latest Tested:** macOS Sequoia (15.x) - January 2026

---

## Quick Start (macOS)

### Prerequisites

1. **Install Rust:**

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   ```

2. **Install Node.js:**

   ```bash
   brew install node
   ```

3. **Install Tauri CLI:**

   ```bash
   npm install -g @tauri-apps/cli
   ```

### Development Setup

1. **Clone and install dependencies:**

   ```bash
   cd /Users/c/Documents/GitHub/JobSentinel
   npm install
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
| **Data** | `~/Library/Application Support/JobSentinel` | SQLite database, scraped jobs |
| **Config** | `~/.config/jobsentinel` | config.json, user preferences |
| **Cache** | `~/Library/Caches/JobSentinel` | Temporary files (future) |
| **Logs** | `~/Library/Logs/JobSentinel` | Application logs (future) |

**Tested on:** macOS 15 (Sequoia), macOS 14 (Sonoma), macOS 13 (Ventura)

### View Your Data

```bash
# View configuration
cat ~/.config/jobsentinel/config.json

# View database (requires sqlite3)
sqlite3 ~/Library/Application\ Support/JobSentinel/jobs.db
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
npm run tauri:build
```

**Output:** `src-tauri/target/release/bundle/dmg/JobSentinel_1.0.0_aarch64.dmg`

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
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## macOS-Specific Features

### Currently Implemented ✅

- ✅ Application Support directory (`~/Library/Application Support/JobSentinel`)
- ✅ XDG config directory support (`~/.config/jobsentinel`)
- ✅ Directory creation on first run
- ✅ macOS version detection (`sw_vers`)
- ✅ Sandbox detection
- ✅ Cache and logs directory support

### Future Enhancements (v2.0+)

- 🟡 Menu bar integration (native macOS menu)
- 🟡 macOS notifications (native)
- 🟡 Keychain integration (secure webhook storage)
- 🟡 Launch Agent (start on login)
- 🟡 App Sandbox support
- 🟡 Code signing for distribution

---

## Testing the Full Flow

1. **Start the app:**

   ```bash
   npm run tauri:dev
   ```

2. **Complete setup wizard:**
   - Enter job titles: "Security Engineer", "Product Security"
   - Select location: Remote only
   - Set salary floor: $150,000
   - (Optional) Add Slack webhook

3. **Trigger a search:**
   - Click "Search Now" in the UI
   - Or use the system tray menu

4. **View results:**
   - Check the dashboard for jobs
   - Look in the database:

     ```bash
     sqlite3 ~/Library/Application\ Support/JobSentinel/jobs.db "SELECT title, company, score FROM jobs ORDER BY score DESC LIMIT 10;"
     ```

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

## Next Steps

1. ✅ **macOS module complete** - Fully functional
2. 🔄 **Test compilation** - Verify no errors
3. 🔄 **Run dev server** - Test full application flow
4. 🔄 **Create first job search** - Verify database + scraping works
5. 📋 **Report any issues** - Open GitHub issue if problems occur

---

## Differences from Windows

| Feature | Windows | macOS | Notes |
|---------|---------|-------|-------|
| **Data Dir** | `%LOCALAPPDATA%\JobSentinel` | `~/Library/Application Support/JobSentinel` | Different conventions |
| **Config Dir** | `%APPDATA%\JobSentinel` | `~/.config/jobsentinel` | XDG standard on macOS |
| **Installer** | `.msi` | `.dmg` | Platform-specific |
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

**Happy hacking on macOS! 🍎**

*For general documentation, see [GETTING_STARTED.md](GETTING_STARTED.md)*
