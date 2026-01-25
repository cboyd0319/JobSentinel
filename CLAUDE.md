# JobSentinel - AI Assistant Instructions

## Project Overview

**JobSentinel** is a privacy-first job search automation desktop app built with Tauri 2.x (Rust backend) and React 19 (TypeScript frontend).

**Current Version:** 2.6.0 (January 2026)
**Primary Target:** Windows 11+, macOS
**Tests:** 2,024 passing (Rust + React + E2E)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Rust 2021, Tauri 2.x, Tokio async |
| Storage | SQLite (sqlx, offline mode) |
| Testing | Vitest, Playwright, cargo test |

## Project Structure

```
JobSentinel/
├── src/                   # React frontend
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   ├── pages/             # Page components
│   ├── services/          # API/business logic
│   ├── stores/            # State management
│   └── types/             # TypeScript types
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── commands/      # Tauri IPC handlers
│   │   ├── scrapers/      # Job board scrapers (13)
│   │   ├── db/            # Database layer
│   │   └── lib.rs         # App setup
│   └── Cargo.toml
├── tests/                 # Frontend tests
├── docs/                  # Documentation
│   └── developer/         # Dev guides
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
npm run lint:md          # Markdown lint
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
- Use `Result<T, E>` everywhere (no unwrap in production)
- SQLx offline mode - run `cargo sqlx prepare` after schema changes
- Run `cargo clippy` before committing

### React/TypeScript
- Functional components with hooks
- Type all props and state
- Use custom hooks for reusable logic
- Tailwind for styling (no inline styles)

## Key Files

- `src-tauri/src/lib.rs` - Command registration
- `src-tauri/src/commands/` - All Tauri commands
- `src-tauri/src/scrapers/` - Job board scrapers
- `src/components/` - React components
- `src/hooks/` - Custom React hooks
- `src/services/` - Business logic

## Scrapers (13 job boards)

| Scraper | Board |
|---------|-------|
| indeed | Indeed |
| linkedin | LinkedIn |
| glassdoor | Glassdoor |
| ziprecruiter | ZipRecruiter |
| dice | Dice (tech) |
| monster | Monster |
| careerbuilder | CareerBuilder |
| simplyhired | SimplyHired |
| usajobs | USAJobs (gov) |
| flexjobs | FlexJobs (remote) |
| weworkremotely | We Work Remotely |
| remoteok | Remote OK |
| wellfound | Wellfound (startups) |

## Common Tasks

### Adding a new scraper
1. Create `src-tauri/src/scrapers/newboard.rs`
2. Implement `Scraper` trait
3. Register in `src-tauri/src/scrapers/mod.rs`
4. Add to scraper factory

### Adding a Tauri command
1. Create handler in `src-tauri/src/commands/*.rs`
2. Register in `lib.rs` invoke_handler
3. Call from frontend via `invoke()`

### Database changes
1. Add migration in `src-tauri/migrations/`
2. Run `cargo sqlx prepare` for offline mode
3. Update relevant types

## Testing

- **Unit tests:** `npm run test` (React), `cargo test` (Rust)
- **E2E tests:** `npm run test:e2e` (Playwright)
- **Component stories:** `npm run storybook`
- **Coverage:** `npm run test:coverage`

## Documentation

- `docs/developer/GETTING_STARTED.md` - Setup guide
- `docs/developer/ARCHITECTURE.md` - System design
- `docs/developer/TESTING.md` - Testing guide
- `docs/developer/CONTRIBUTING.md` - Contribution guide

## Recommended Agents

| Task | Agent |
|------|-------|
| Rust work | `rust-expert` |
| React/TS work | `typescript-expert` |
| Scraper development | `scraper-expert` |
| Code review | `code-reviewer` |
| Security audit | `security-audit` |
| Database work | `database-expert` |
| Bug investigation | `debugger` |
| Fast exploration | `explore-fast` |

## Memory Conventions

When storing memories for this project, use these tags:
- `jobsentinel` - Always include
- `scraper` - Scraper-related decisions
- `database` - Schema, migration decisions
- `ui` - Frontend patterns, component decisions
- `architecture` - System design decisions
- `bug` - Bug investigations and fixes

## Quick Command Patterns

```bash
# Full validation before commit
cargo fmt --manifest-path src-tauri/Cargo.toml && \
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings && \
cargo test --manifest-path src-tauri/Cargo.toml && \
npm run lint && npm run test:run

# SQLx workflow after schema changes
cd src-tauri && DATABASE_URL="sqlite:jobs.db" cargo sqlx prepare

# Run specific scraper test
cargo test --manifest-path src-tauri/Cargo.toml scraper::indeed

# Check for outdated deps
cargo outdated --manifest-path src-tauri/Cargo.toml
npm outdated
```

## Context7 Usage

For library docs, use Context7 MCP:
- `resolve-library-id` to find the library
- `get-library-docs` to fetch specific docs

Example queries: "react hooks", "tauri commands", "sqlx migrations"

## Project-Specific Notes

- **SQLx offline mode**: Always run `cargo sqlx prepare` after schema changes
- **Scraper rate limiting**: Each scraper has built-in delays; don't bypass
- **Test database**: Tests use in-memory SQLite, not the real db
- **Storybook**: Component stories are in `*.stories.tsx` files
