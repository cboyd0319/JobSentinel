# Getting Started with JobSentinel v2.0

## For Users

### Installation

1. Download the latest `.msi` installer from [Releases](https://github.com/cboyd0319/JobSentinel/releases)
2. Double-click to install (no admin rights needed)
3. Follow the 4-step setup wizard
4. Done! The app runs in your system tray

### Usage

- **Open Dashboard**: Click the tray icon
- **Search Now**: Right-click tray icon → "Search Now"
- **Settings**: Right-click tray icon → "Settings"

---

## For Developers

### Prerequisites

```bash
# Install Rust (https://rustup.rs/)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js 20+ (https://nodejs.org/)

# Install Tauri CLI
cargo install tauri-cli@2.1
```

### Development Setup

```bash
# Clone the repository
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel

# Install npm dependencies
npm install

# Run in development mode (hot reload enabled)
npm run tauri:dev
```

### Building for Production

```bash
# Build Windows MSI installer
npm run tauri:build

# Output: src-tauri/target/release/bundle/msi/JobSentinel_1.0.0_x64_en-US.msi
```

### Project Structure

```
JobSentinel/
├── src/                      # React frontend (TypeScript + Tailwind)
│   ├── pages/               # Setup Wizard, Dashboard
│   ├── components/          # Reusable UI components
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── main.rs          # Tauri app entry
│   │   ├── lib.rs           # Library exports
│   │   ├── core/            # Business logic (scrapers, scoring, etc.)
│   │   ├── platforms/       # Windows/macOS/Linux specific code
│   │   ├── cloud/           # GCP/AWS deployment (v3.0+)
│   │   └── commands/        # Tauri RPC commands
│   ├── migrations/          # SQLite migrations
│   └── Cargo.toml           # Rust dependencies
├── public/                  # Static assets (logo, etc.)
├── docs/                    # Documentation
├── package.json             # npm dependencies
└── vite.config.ts           # Vite configuration
```

### Key Technologies

| Technology | Purpose |
|------------|---------|
| **Tauri 2.1** | Desktop app framework (Rust + Web) |
| **React 19** | UI framework |
| **Vite** | Fast build tool |
| **TailwindCSS** | Utility-first CSS |
| **TypeScript** | Type-safe JavaScript |
| **Rust** | Backend language |
| **Tokio** | Async runtime |
| **SQLx** | SQLite database |
| **reqwest** | HTTP client |
| **scraper** | HTML parsing |

### Running Tests

```bash
# Rust tests
cd src-tauri
cargo test

# Frontend tests (coming soon)
npm test
```

### Code Style

```bash
# Format Rust code
cd src-tauri
cargo fmt

# Lint Rust code
cargo clippy

# Format TypeScript/React
npm run format
```

---

## Architecture Overview

### Core Business Logic (Platform-Agnostic)

All core functionality is in `src-tauri/src/core/` and works identically on all platforms:

- **config**: JSON-based user preferences
- **db**: SQLite database with async support
- **scrapers**: Job board scraping (Greenhouse, Lever, JobsWithGPT)
- **scoring**: Multi-factor scoring algorithm
- **notify**: Slack notifications
- **scheduler**: Periodic job scraping

### Platform-Specific Code

Platform code is in `src-tauri/src/platforms/` and uses conditional compilation:

- **windows**: Windows 11+ specific features (v1.0)
- **macos**: macOS 13+ specific features (v2.1+)
- **linux**: Linux specific features (v2.1+)

Example:
```rust
#[cfg(target_os = "windows")]
pub fn get_data_dir() -> PathBuf {
    // Windows implementation
}

#[cfg(target_os = "macos")]
pub fn get_data_dir() -> PathBuf {
    // macOS implementation
}
```

### Cloud Deployment (v3.0+)

Cloud code is in `src-tauri/src/cloud/` and only compiled with feature flags:

- **gcp**: Google Cloud Platform (Cloud Run, Scheduler)
- **aws**: Amazon Web Services (Lambda, EventBridge)

---

## Debugging

### Enable Rust Logs

```bash
# Set log level (trace, debug, info, warn, error)
RUST_LOG=debug npm run tauri:dev
```

### Chrome DevTools

When running `npm run tauri:dev`, press `Ctrl+Shift+I` (Windows) to open Chrome DevTools for the React frontend.

### Database

Database location: `%LOCALAPPDATA%\JobSentinel\jobs.db`

Open with [DB Browser for SQLite](https://sqlitebrowser.org/):
```bash
# Windows
explorer %LOCALAPPDATA%\JobSentinel
```

---

## Troubleshooting

### "Rust not found"

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Restart terminal
```

### "npm install fails"

```bash
# Clear cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### "Build fails on Windows"

Ensure you have:
- Visual Studio Build Tools 2022
- Windows 10 SDK

Download: https://visualstudio.microsoft.com/downloads/

---

## Next Steps

1. Read [Feature Inventory](FEATURE_INVENTORY.md) for v1.0 features
2. Read [Dependency Analysis](DEPENDENCY_ANALYSIS.md) for Rust equivalents
3. Check [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues) for tasks
4. Join [Discussions](https://github.com/cboyd0319/JobSentinel/discussions) for questions

---

**Happy coding!** 🚀
