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
- Product mission: help people find jobs in every secure, local,
  user-directed way JobSentinel can support. Prefer informed consent,
  plain-language warnings, and secure enablement over arbitrary product blocks
  when privacy and security boundaries remain intact.
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
6. `docs/style-guide/README.md` for language, terminology, and copy.
7. `DESIGN.md`, `docs/design/README.md`, and
   `docs/design/design-spec.md` for UI and UX changes.
8. `docs/developer/ARCHITECTURE.md` for system layout.
9. `docs/developer/TESTING.md` for test patterns and commands.
10. Closest feature doc under `docs/features/` for user-facing behavior.
11. `docs/harness/harness-map.md` to find the right sensor, gate, or harness doc.
12. `docs/harness/completion-gate.md` for the layered done gate and clean-state
    exit checklist.

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
- Apply `docs/style-guide/README.md` to all language, including user-interface
  copy, docs, identifiers, comments, tests, fixtures, errors, release notes,
  pull requests, and commits. Run `npm run lint:language` after terminology
  changes.

## Engineering Principles

All current and future development is DRY and lean. Before writing code, walk
this ladder and stop at the first step that satisfies the requirement:

1. Does this need to exist at all? Prefer YAGNI and deletion.
2. Does the standard library do it? Use it.
3. Does a native platform feature cover it? Prefer it (`<input type="date">`
   over a picker library, CSS over JS, a database constraint over app code).
4. Does an already-installed dependency solve it? Never add a new dependency
   for what a few clear lines can do.
5. Can it be one line and still clear? Make it one line.

Boring over clever. Reduce or remove duplication everywhere. When two standard
options are the same size, take the one correct on edge cases. Documentation is
product: an undocumented change does not exist. See
[docs/harness/engineering-principles.md](docs/harness/engineering-principles.md).

## Architecture Boundaries

- `src/`: app composition, feature owners, shared contracts, UI primitives,
  development mocks, and frontend tests.
- `Cargo.toml`: explicit two-member virtual workspace and shared Cargo policy.
- `crates/jobsentinel-core/`: Tauri-free business logic, platform adapters,
  migrations, and core integration tests.
- `src-tauri/src/commands/`: private Tauri IPC handlers. Return typed results or clear
  error strings.
- `crates/jobsentinel-core/src/core/`: platform-neutral business logic.
- `crates/jobsentinel-core/src/core/scrapers/`: job board adapters with rate limits and
  structured `ScraperError` handling.
- `crates/jobsentinel-core/migrations/`: SQLite migrations. Update SQLx offline data after
  schema changes.
- `docs/`: system of record for product behavior, architecture, plans, and
  harness rules.

Use modules before crates. Add a workspace member only for a distinct runtime,
dependency policy, release unit, or stable cross-crate contract.

## Commands

Use the smallest relevant check first, then broaden when risk increases.

```bash
npm run harness:check
npm run harness:score
npm run lint:language
npm run lint
npm run test:run
npm run test:e2e
npm run test:e2e:all
npm run build
cargo fmt --all -- --check
cargo clippy --workspace -- -D warnings
cargo test --workspace
```

After schema changes:

```bash
npm run sqlx:prepare
npm run lint:sqlx
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
- Record verification runs in `docs/harness/evidence-log.md` so completion
  claims survive session restarts.
