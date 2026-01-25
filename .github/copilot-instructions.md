# JobSentinel - Copilot Instructions

## Project Overview

**JobSentinel** is a privacy-first job search automation desktop app built with Tauri 2.x (Rust backend) and React 19 (TypeScript frontend).

| Fact | Value |
|------|-------|
| Version | 2.6.3 |
| Tests | 4,286+ passing (2,129 frontend + 2,157 Rust) |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Rust 2021, Tauri 2.x, Tokio async |
| Database | SQLite (sqlx, offline mode) |

## Project Structure

```
JobSentinel/
├── src/                   # React frontend
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   ├── pages/             # Page components
│   ├── services/          # API/business logic
│   ├── stores/            # State management
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── commands/      # Tauri IPC handlers
│   │   ├── scrapers/      # Job board scrapers (13)
│   │   ├── db/            # Database layer
│   │   └── lib.rs         # App setup
│   └── Cargo.toml
├── tests/                 # Frontend tests
├── docs/                  # Documentation
└── .storybook/            # Component stories
```

## Development Commands

```bash
# Frontend
npm run dev              # Dev server
npm run build            # Production build
npm run test             # Vitest
npm run test:coverage    # With coverage
npm run lint             # ESLint
npm run lint:fix         # Auto-fix
npm run storybook        # Component stories

# Rust (from src-tauri/)
cargo check
cargo test
cargo clippy -- -D warnings
cargo fmt

# Full app
npm run tauri:dev        # Dev mode
npm run tauri:build      # Production build

# E2E
npm run test:e2e         # Playwright tests
npm run test:e2e:ui      # Interactive mode
```

## Code Standards

### Rust
- Use `Result<T, E>` everywhere - no `.unwrap()` in production code
- SQLx offline mode - run `cargo sqlx prepare` after schema changes
- Run `cargo clippy -- -D warnings` before committing
- Error handling: use `anyhow` with `.context()` for meaningful errors

### React/TypeScript
- Functional components with hooks only
- Type all props and state - avoid `any`
- Custom hooks for reusable logic
- Tailwind for styling (no inline styles)
- Named exports preferred over default exports

### Tauri IPC Pattern
```rust
// Rust command - always return Result<T, String>
#[tauri::command]
pub async fn get_jobs(state: State<'_, AppState>) -> Result<Vec<Job>, String> {
    state.db.fetch_jobs().await.map_err(|e| e.to_string())
}
```

```typescript
// Frontend - use invoke with type parameters
import { invoke } from '@tauri-apps/api/core';
const jobs = await invoke<Job[]>('get_jobs');
```

## Key Files

| File | Purpose |
|------|---------|
| `src-tauri/src/lib.rs` | Command registration |
| `src-tauri/src/commands/` | All Tauri IPC handlers |
| `src-tauri/src/scrapers/` | Job board scrapers |
| `src/components/` | React components |
| `src/hooks/` | Custom React hooks |
| `src/services/` | Business logic |

## Scrapers (13 job boards)

Indeed, LinkedIn, Glassdoor, ZipRecruiter, Dice, Monster, CareerBuilder, SimplyHired, USAJobs, FlexJobs, We Work Remotely, Remote OK, Wellfound

### Adding a New Scraper
1. Create `src-tauri/src/scrapers/newboard.rs`
2. Implement `Scraper` trait
3. Register in `src-tauri/src/scrapers/mod.rs`
4. Add to scraper factory

## Database Changes

1. Add migration in `src-tauri/migrations/`
2. Run `cargo sqlx prepare` for offline mode
3. Update relevant types

## Validation Commands

```bash
# Full validation before commit
cargo fmt --manifest-path src-tauri/Cargo.toml && \
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings && \
cargo test --manifest-path src-tauri/Cargo.toml && \
npm run lint && npm run test:run

# SQLx workflow after schema changes
cd src-tauri && DATABASE_URL="sqlite:jobs.db" cargo sqlx prepare
```

## Project-Specific Notes

- **SQLx offline mode**: Always run `cargo sqlx prepare` after schema changes
- **Scraper rate limiting**: Each scraper has built-in delays - never bypass
- **Test database**: Tests use in-memory SQLite, not the real db
- **Storybook**: Component stories are in `*.stories.tsx` files
- **Error boundaries**: Use `ErrorBoundary` for page-level, `ComponentErrorBoundary` for component-level
