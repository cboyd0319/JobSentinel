# JobSentinel Agent Guide

This file is the short entrypoint for coding agents. Keep durable project
knowledge in `docs/`; keep this file as a map.

## Project

JobSentinel is a privacy-first desktop job search app.

- Frontend: React 19, TypeScript, Vite, Tailwind CSS.
- Backend: Tauri 2, Rust 2021, Tokio, SQLite with SQLx offline mode.
- Audience: anyone trying to find a job, including technical and non-technical
  roles. Do not design user-facing flows only for engineers, developers, or
  people who can debug software. User-facing flows must assume zero technical
  knowledge.
- Rule 0: user privacy and security are non-negotiable. No feature, shortcut,
  test fixture, support flow, external AI provider, or source adapter may
  weaken local-first storage, credential safety, explicit user review, or
  privacy-preserving defaults.
- Product rule: user data stays local unless the user explicitly configures an
  external channel such as email, Slack, Discord, Teams, GitHub, or Google
  Drive. External AI stays optional, disabled by default, and routed through the
  privacy-first AI gateway.
- Primary targets: Windows 11+, macOS, Linux.

## Source Of Truth

Read in this order for non-trivial work:

1. `docs/harness/README.md` for agent operating model.
2. `docs/plans/active/status.md` for current active-goal state.
3. `docs/harness/multi-agent-orchestration.md` when work is broad enough for
   safe parallel code, docs, test, review, or verification slices.
4. `docs/harness/verification-matrix.md` for required checks.
5. `docs/harness/change-contract.md` for feature, bug, and refactor specs.
6. `docs/developer/ARCHITECTURE.md` for system layout.
7. `docs/developer/TESTING.md` for test patterns and commands.
8. Closest feature doc under `docs/features/` for user-facing behavior.

Use `CLAUDE.md` and `.github/copilot-instructions.md` as compatibility
wrappers. If they conflict with this file or `docs/harness/`, this file and
`docs/harness/` win.

## Work Rules

- Inspect files before changing code. Resolve conflicts with live repo files
  before old notes or memory.
- Keep changes scoped to the request and local patterns.
- Use structured APIs and typed data instead of ad hoc string parsing when the
  repo or platform provides them.
- Do not add telemetry or cloud dependencies without explicit product decision.
- Do not bypass scraper rate limits, user review gates, keyring storage, or URL
  validation.
- Do not commit machine-specific absolute local paths. Use repo-relative paths,
  file names, or `<repo-root>` and `<home>` placeholders.
- Keep maintainable source, test, script, and non-archive docs under harness
  file-size budgets; shrink legacy oversized files, do not grow them.
- Keep comments useful and sparse.
- Keep generated summaries and one-off reports out of the repo unless requested.

## Architecture Boundaries

- `src/`: React UI, hooks, contexts, services, and frontend tests.
- `src-tauri/src/commands/`: Tauri IPC handlers. Return typed results or clear
  error strings.
- `src-tauri/src/core/`: platform-neutral business logic.
- `src-tauri/src/core/scrapers/`: job board adapters with rate limits and
  structured `ScraperError` handling.
- `src-tauri/migrations/`: SQLite migrations. Update SQLx offline data after
  schema changes.
- `docs/`: system of record for product behavior, architecture, plans, and
  harness rules.

## Commands

Use the smallest relevant check first, then broaden when risk increases.

```bash
npm run harness:check
npm run harness:score
npm run lint
npm run test:run
npm run test:e2e
npm run test:e2e:all
npm run build
cd src-tauri && cargo fmt --all -- --check
cd src-tauri && cargo clippy -- -D warnings
cd src-tauri && cargo test --lib
```

After schema changes:

```bash
cd src-tauri && DATABASE_URL="sqlite:jobs.db" cargo sqlx prepare
```

## Documentation

- Update docs when behavior, setup, commands, architecture, security, release
  flow, or user-facing copy changes.
- Update the whole public GitHub wiki when behavior, setup, commands,
  architecture, security, release flow, capabilities, or user-facing copy
  changes.
- Add or update an exec plan under `docs/plans/active/` for broad changes.
- Move completed plans to `docs/plans/completed/`.
- Record repeated drift or debt in `docs/plans/tech-debt-tracker.md`.
- Run `npm run harness:check` after agent-facing docs change.

## Review Bar

- Tests must prove the changed behavior where feasible.
- Security-sensitive changes need explicit threat surface review.
- UI changes need keyboard, loading, error, empty, and narrow-width states.
- Scraper changes need fixture or parser coverage and rate-limit awareness.
- Claims of completion need verification output, not only code inspection.
