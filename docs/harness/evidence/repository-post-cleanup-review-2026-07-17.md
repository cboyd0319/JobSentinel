# Repository Post-Cleanup Review Evidence

Date: 2026-07-17

Verdict: CONCERNS

The completed cleanup is sound against its declared duplication, architecture,
test, and full-gate contracts. The deeper review found two product correctness
defects and a bounded repository-integrity batch that should precede another
major feature stream. It did not find evidence for another broad cleanup or
repository-wide refactor.

## Baseline And Review Evidence

- `./init.sh`: passed, including locked dependency synchronization, harness
  checks, and three baseline smoke tests.
- `npm run lint:dup -- --list`: passed with zero duplicated lines and zero
  regions in all six maintained production and test scopes.
- `npm run lint:architecture`, `npm run lint:deps`, `npm run lint:security`,
  `npm run lint:tests`, `npm run lint:tauri-invokes`, and
  `npm run lint:sqlx`: passed.
- `npm run lint`, `npm run typecheck`, and `cargo fmt --all -- --check`: passed.
- `cargo clippy --workspace -- -D warnings`: passed.
- `npm run test:scripts`: 824 passed and zero skipped.
- `npm run test:coverage`: 2,925 tests passed. Statements were 75.87 percent,
  branches 68.86 percent, functions 73.78 percent, and lines 77.45 percent.
- The isolated SQLx migration and offline-data check passed.
- Advisory complexity linting completed successfully and exposed the database
  initialization hotspot described below.

## Findings

### 1. Pooled database connections do not all receive required settings

Severity: high

Confidence: high

Priority: first

Evidence:

- `crates/jobsentinel-storage/src/connection.rs:85` applies many
  connection-scoped PRAGMAs by executing them once against `SqlitePool`.
- `crates/jobsentinel-storage/src/encryption.rs:33` places only the encryption
  key, secure deletion, and temporary-store settings in `SqliteConnectOptions`.
- The SQLx pool defaults to ten connections. Connections opened after the
  one-time configuration receive the connect options, not the later pooled
  statements.
- SQLx already defaults foreign-key enforcement on and a five-second busy
  timeout, so those two settings are not currently lost. Settings including
  `trusted_schema`, `cell_size_check`, `synchronous`, cache size, memory mapping,
  and WAL autocheckpoint are not consistently initialized on later connections.
- There is no multi-connection regression test for these guarantees.

Impact:

The implementation claims database-wide integrity, security, and performance
settings that can vary by whichever pooled connection executes a query. The
diagnostic checks also sample only one acquired connection and can report a
misleading healthy configuration.

Smallest fix:

Add a fail-first test that holds one connection, forces another pool connection,
and checks every required connection-scoped setting. Configure those settings
through `SqliteConnectOptions` or a bounded per-connection hook. Keep
database-persistent operations separate and simplify the one-time diagnostics.

### 2. Saved job-alert preferences do not govern real desktop alerts

Severity: high

Confidence: high

Priority: second

Evidence:

- `src/features/settings/notifications/notificationPreferencesStore.ts:154`
  defines `shouldNotifyForJob`.
- The only consumers of that decision function are its focused tests.
- `src/features/dashboard/notifications.ts:93` sends completion alerts after
  checking permission and a high-match count, without loading or applying saved
  preferences.
- `src/features/dashboard/hooks/useDashboardAutoRefresh.ts:123` and
  `src/features/dashboard/hooks/useDashboardManualSearch.ts:115` call that
  aggregate notification path directly.
- `src/features/settings/notifications/NotificationPreferences.tsx:252`
  promises global, quiet-hour, source, pay, title, and company controls.
- Coverage reports zero exercised statements for both dashboard notification
  call-path hooks.

Impact:

The global off switch, quiet hours, source thresholds, and advanced filters can
be ignored by real desktop alerts even though the settings save successfully
and their isolated predicate tests pass.

Smallest fix:

Add fail-first tests at the dashboard notification seam. Load normalized
preferences in one notification decision owner and evaluate actual candidate
jobs before sending. If the aggregate search result cannot support a promised
filter, narrow the interface promise instead of adding speculative data
plumbing.

### 3. Maintained documentation contains six broken local links

Severity: medium

Confidence: high

Priority: third

Evidence:

- `docs/README.md:19`, `docs/README.md:34`, and `docs/README.md:120` point to
  `docs/architecture/privacy-first-ai-gateway.md`; the file is under
  `docs/security/`.
- `docs/ROADMAP.md:62` and `docs/ROADMAP.md:91` repeat the same stale path.
- `docs/harness/reliability.md:84` points to a file now under
  `docs/harness/archive/`.
- `npm run lint:docs` passes because it checks prose but not local target
  existence.

Smallest fix:

Repair the six paths and extend the existing documentation check with a small
repository-local link target check. No new dependency is needed.

### 4. Security documentation duplicates stale webhook implementations

Severity: medium

Confidence: high

Priority: third

Evidence:

- `docs/security/URL_VALIDATION.md`,
  `docs/security/WEBHOOK_SECURITY.md`, and
  `docs/security/WEBHOOK_URL_VALIDATION.md` total 1,281 lines and repeat provider
  validation examples and tests.
- The provider examples show inline host and path validation.
- Current Slack, Discord, and Teams code delegates validation to
  `jobsentinel_security::validate_webhook_target`.
- An exact eight-significant-line documentation scan found 205 repeated lines
  in 19 regions, with the security documents containing the material
  implementation-shaped duplicates.

Impact:

Security-sensitive guidance presents obsolete ownership and can drift from the
shared validator that actually controls outbound webhook targets.

Smallest fix:

Keep one concise shared URL-validation concept owner. Replace copied provider
implementations with current rules, shared-owner references, and links to the
canonical tests.

### 5. Four member-level Cargo dependency declarations are unused

Severity: low

Confidence: high

Priority: third

Evidence:

- `crates/jobsentinel-application/Cargo.toml` declares `scopeguard` and
  `urlencoding` without source use in that crate.
- `crates/jobsentinel-domain/Cargo.toml` declares `proptest` without source or
  test use in that crate.
- `src-tauri/Cargo.toml` declares `urlencoding` without source use in that crate.
- Uses in other workspace members do not require these member-level
  declarations.

Smallest fix:

Remove only those four declarations, then run the focused Cargo checks. Keep the
workspace-level dependencies because other members use them.

### 6. Development mock types form a type-level ownership cycle

Severity: low

Confidence: high

Priority: fourth

Evidence:

- `src/dev-runtime/mocks/handlers/types.ts` imports two feature-owned mock record
  types.
- Those feature modules import
  `src/dev-runtime/mocks/handlers/commandHelpers.ts`.
- `commandHelpers.ts` imports the central handler types.
- The reverse imports are type-only, so there is no runtime module cycle.

Smallest fix:

Move the two shared mock record interfaces to the central pure type owner, or to
feature model modules that do not import command helpers.

### 7. Definition-only Rust APIs need explicit classification

Severity: low

Confidence: medium

Priority: fourth

The maintained Rust source contains 25 public functions or methods whose names
occur only at their definitions. The set includes retry helpers, scoring
constructors, health mutation methods, browser helpers, storage size methods,
and resume-builder mutations. Some may be intended product behavior, so absence
of a call site is not enough to delete all of them automatically.

One concrete example increases the value of classification:
`crates/jobsentinel-storage/src/health/maintenance.rs` exposes `wal_size`, but
its scalar query reads the first `wal_checkpoint` result column rather than a
WAL byte or page size. Because it is unused, deletion is preferable unless a
current product contract requires it.

Smallest fix:

For each candidate, identify a current product or test contract. Wire and test
required behavior; delete unrequired APIs and their dead support code. Do not
create abstractions to preserve speculative future use.

### 8. The modularization review sensor is saturated

Severity: low

Confidence: high

Priority: fourth

`npm run lint:file-size` passes hard caps but reports 407 review candidates.
That volume is not an actionable review queue. Independent function scanning
also found 138 TypeScript functions over 100 lines, with the most useful
hotspots being behavior-heavy and branch-heavy controllers rather than every
file above the advisory size threshold.

Smallest fix:

Keep the hard caps. Make advisory output changed-file scoped or ratcheted, and
split only a hotspot needed by a current correction. The notification call path
is the first justified target. Do not begin another repository-wide splitting
campaign.

## Immediate Workspace Issue

`npm run lint:bloat` reports
`crates/jobsentinel-sources/src/.DS_Store`. Its timestamp is after the cleanup
commit, so it was not omitted from that commit's clean evidence. It is still a
disposable current artifact and must be removed before the corrective baseline
can pass.

## Rejected Objections And False Positives

- The startup-owner mismatch came from stale instructions supplied outside the
  repository. The live root `AGENTS.md` points to
  `docs/harness/current-status.md` and
  `scripts/harness/state/feature-list.json`, so no repository correction is
  needed.
- An initial frontend orphan scan excluded mock modules and incorrectly
  reported 17 files. A complete import graph found no true runtime orphans.
- Duplicate Cargo versions are transitive through maintained upstream stacks;
  the review found no safe direct consolidation.
- Direct npm dependencies all had current source, configuration, script, or
  type-tooling uses.
- The root public roadmap and developer roadmap have explicitly different
  audiences and owners.
- Ignored live-network and model-download tests are intentional integration
  lanes, not evidence that the ordinary local suites silently skipped product
  tests.
- Repeated research citations and source lists were not treated as actionable
  code duplication.

## Required Next Work

Execute `docs/plans/completed/repository-post-cleanup-corrections.md` in its stated
order. The first two findings should block another major feature stream. The
remaining items are one bounded repository-integrity batch, not a new broad
cleanup program.
