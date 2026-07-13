# V3 Foundation Exec Plan

Last updated: 2026-06-21.

## Problem

V3 planning now has a ranked idea index, but the highest-ranked ideas need
durable code primitives before UI, browser companion, agents, packs, or Qwen3
workflow work can land safely. The first slice should create the local
foundation for opportunity case files, a sanitized job-search event ledger,
privacy receipts, source policy records, and compatibility metadata.

## Scope And Non-Goals

In scope:

- SQLite migration for v3 foundation tables.
- Rust database types and methods for the first foundation primitives.
- Tests that prove privacy-sensitive ledger behavior is local, typed, and
  sanitized.
- Docs and plan state for the first v3 implementation stream.

Out of scope:

- UI routes or visible v3 workflows.
- Browser extension or restricted-source behavior changes.
- Qwen3 model runtime changes.
- External AI behavior changes.
- Pack registry implementation beyond source-policy records needed by the
  foundation.
- Public wiki updates until user-facing behavior changes.

## Constraints And Risks

- User data must stay local.
- Job events must not duplicate raw private notes, resumes, credentials,
  browser storage, or provider payloads.
- New database tables must migrate cleanly on Windows 11+, macOS, and Linux.
- Existing `application_events` behavior must remain unchanged.
- New Rust modules must stay under file-size budgets.
- No dependency additions are expected for this slice.
- Rollback is dropping the new migration and Rust module before release, since
  v3 compatibility is not yet shipped.

## Milestones

### 1. Active Plan And Change Contract

- Add this plan.
- Register it in `docs/plans/index.json`.
- Keep `docs/plans/active/status.md` compact if a status note is needed.
- Verify with `npm run harness:check`.

### 2. Red Tests

- Add focused Rust tests for:
  - creating or reusing a case file for a job
  - recording sanitized user-owned job events
  - rejecting oversized event metadata
  - creating privacy receipts without raw payload storage
  - upserting source policy records
  - reading v3 compatibility metadata
- Run the targeted test and confirm it fails before implementation.

### 3. Migration And Rust Implementation

- Add the next SQLite migration under `crates/jobsentinel-core/migrations/`.
- Add a focused database module for v3 foundation operations.
- Add public database types only where downstream modules need them.
- Keep methods typed and parameterized.
- Do not expose frontend commands yet.

### 4. Verification

Targeted:

```bash
cargo test -p jobsentinel-core --lib core::db::tests::tests::v3_foundation_tests
```

Broader:

```bash
npm run harness:plan -- --since origin/main
npm run lint:bloat
npm run harness:check
npm run lint:docs
cargo fmt --all -- --check
cargo test -p jobsentinel-core --lib core::db
```

Run `cargo clippy --workspace -- -D warnings` if the Rust diff touches
shared APIs or warnings surface.

### 5. Commit

- Commit the completed slice after checks pass.
- Push only after the commit is clean and verified.

## Progress

- 2026-06-21: Plan created. Implementation has not started in this planning
  pass.

## Surprises And Discoveries

- `docs/plans/active/status.md` is exactly at the harness line budget, so v3
  implementation progress should stay in this focused plan unless the status
  file is compacted first.

## Decision Log

- Use a new `job_events` ledger instead of overloading the existing
  `application_events` table because the existing table is application-specific
  and has privacy-scrubbing history.
- Keep the first slice backend-only so later UI and agent work can share the
  same local primitives.

## Outcomes And Retrospective

- Pending.
