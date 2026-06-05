# Active Plan Status

Last updated: 2026-06-05.

Read this file first. It is the compact restart surface for current active
work. Detailed history from the previous open plan set moved to archive on
2026-06-04 so active planning does not slow down future sessions.

## Goal State

The repo-wide goal remains open. JobSentinel should keep moving toward zero
known errors, privacy leaks, stale docs, brittle tests, user-facing technical
assumptions, engineer-only defaults, and unverified claims.

Current priority is critical product functionality before broad cleanup:
truthful local resume assistance, readable application guidance, ghost and stale
posting protection, pay-risk protection, guided intake, and cleanup only where
it blocks privacy, security, verification, or user ease.

Rule 0 still controls the work: user data stays local unless the user explicitly
configures an external channel, external AI stays optional and disabled by
default, and users stay in control before anything leaves the device.

## Active Workstreams

| Workstream | State | Current focus | Source |
| ---------- | ----- | ------------- | ------ |
| Current product and quality work | Active | Resume assistance, application readability, job-card protection, guided intake, and blocking cleanup only | [Plan](current-work.md) |

## Archived Context

These plans are no longer active restart surfaces. Keep them as provenance only:

- [Guided job-search intake](../archive/guided-job-search-intake-superseded-2026-06-04.md)
- [Repo cleanup and quality sweep](../archive/repo-cleanup-and-quality-sweep-superseded-2026-06-04.md)
- [Repo cleanup handoff](../archive/repo-cleanup-handoff-superseded-2026-06-04.md)
- [Research-backed product improvements](../archive/research-backed-product-improvements-superseded-2026-06-04.md)

## Current Posture

- `origin/main` is the source of truth for the pushed baseline. `ce93c51a`
  was the last broad-cleanup baseline before the current file-size split batch.
- Fresh harness session evidence reports 2 active docs, 2 indexed workstreams,
  and a 100/100 harness score: this status file and `current-work.md`.
- Final broad verification for the broad-cleanup baseline passed during the
  completed cleanup batch; recent split slices record their focused evidence
  below.
- Push cadence defaults to 30-commit batches unless the user gives a newer
  explicit push instruction.

## Latest Slice

- WeWorkRemotely scraper tests now live in
  `src-tauri/src/core/scrapers/weworkremotely_tests.rs`, reducing
  `src-tauri/src/core/scrapers/weworkremotely.rs` from 888 to 244 lines
  without changing scraper parsing, URL building, hashing, or fetch behavior.
  Focused verification passed: `cargo test
  core::scrapers::weworkremotely::tests --lib`, `cargo fmt --all --
  --check`, `cargo clippy -- -D warnings`, `npm run lint:bloat`, docs gates,
  `git diff --check`, and the local-path leak scan.

- Discord notification score-color and salary display tests now live in
  `src-tauri/src/core/notify/discord_tests/display_tests.rs`, reducing
  `src-tauri/src/core/notify/discord_tests.rs` from 893 to 754 lines without
  changing notification payload logic, webhook validation, or test assertions.
  Focused verification passed: `cargo fmt --all -- --check`, `cargo test
  core::notify::discord::tests::display_tests --lib`, and `cargo test
  core::notify::discord::tests --lib`, `cargo clippy -- -D warnings`, `npm
  run lint:bloat`, docs gates, `git diff --check`, and the local-path leak
  scan.

- Settings support-report state and copy/save handlers now live in
  `src/pages/useSettingsSupportReports.ts`, reducing `src/pages/Settings.tsx`
  from 894 to 856 lines without changing settings save, keychain, source
  toggles, support-report copy/save behavior, or feedback modal wiring.
  Focused verification passed: `npm run test:run --
  src/pages/Settings.test.tsx src/pages/Settings.load.test.tsx
  src/pages/Settings.sources.test.tsx`, `npm run lint`, `npm run build`,
  `npm run lint:bloat`, docs gates, `git diff --check`, and the local-path
  leak scan.

- DB validation boundary tests now live in
  `src-tauri/src/core/db/tests/tests/job_validation_tests.rs`, reducing
  `src-tauri/src/core/db/tests.rs` from 912 to 844 lines without changing
  database APIs, migrations, or test assertions. Focused verification passed:
  `cargo fmt --all -- --check`, `cargo test
  core::db::tests::tests::job_validation_tests --lib`, `cargo test
  core::db::tests --lib`, `cargo clippy -- -D warnings`, `npm run
  lint:bloat`, docs gates, `git diff --check`, and the local-path leak scan.

- Settings product-copy harness assertions now use shared path-list helpers,
  reducing `scripts/check-product-copy-settings.test.mjs` from 922 to 862
  lines without changing fixture coverage or product-copy detector behavior.
  Focused verification passed: `node --test
  scripts/check-product-copy-settings.test.mjs` and `npm run lint:bloat`.

- Settings email-provider setup labels, links, and SMTP preset templates now
  live in `src/pages/SettingsEmailProviderSetup.tsx` and
  `src/pages/SettingsEmailProviderTemplates.ts`, reducing
  `src/pages/SettingsNotificationsSection.tsx` from 923 to 841 lines without
  changing credential storage, email test behavior, chat alert toggles, or
  keychain access patterns. Focused verification passed:
  `npm run test:run -- src/pages/Settings.test.tsx
  src/pages/Settings.load.test.tsx src/pages/Settings.sources.test.tsx`,
  `npm run build`, `npm run lint`, `npm run lint:bloat`,
  `git diff --check`, and the local-path leak scan.

- Dashboard notes and saved-search modal markup now lives in
  `src/pages/DashboardUI/DashboardNotesModal.tsx` and
  `src/pages/DashboardUI/DashboardSaveSearchModal.tsx`, reducing
  `src/pages/Dashboard.tsx` from 937 to 804 lines without changing job
  search, filters, saved-search persistence, notes save/remove behavior,
  duplicate review, import, or company research behavior. Focused verification
  passed: dashboard, job-ops, saved-search, header, filters-bar, quick-actions,
  and filter-label tests; `npm run build`; `npm run lint`;
  `npm run lint:bloat`; docs/harness/path gates.

- Recent UI cleanup also split Resume Builder modals, Interview Scheduler
  model data, Settings credential state, and Settings email setup. Local
  commits since the source-persistence fix preserve the 30-commit push cadence
  and keep the tree clean after each committed slice.

## Compact Slice Ledger

Detailed per-slice evidence lives in git commits and older status revisions.
Keep this active restart surface compact; add only the newest slice details here
and summarize older cleanup once committed.

Recent committed cleanup batch:

| Area | Main file before -> after | Extracted surface | Focused proof |
| ---- | ------------------------- | ----------------- | ------------- |
| WeWorkRemotely scraper | 888 -> 244 | scraper test sidecar | Scraper focused tests |
| Discord notification tests | 893 -> 754 | display test module | Discord focused tests, fmt |
| Settings support reports | 894 -> 856 | support-report hook | Settings load tests, build, lint, bloat |
| DB validation tests | 912 -> 844 | validation boundary module | Rust focused tests, fmt |
| Settings product-copy test | 922 -> 862 | assertion path helpers | Focused script test, bloat |
| Settings email setup | 923 -> 841 | email provider setup/templates | Settings focused tests, build, lint, bloat |
| Dashboard modals | 937 -> 804 | notes and saved-search modals | Dashboard focused tests, build, lint, bloat |
| Resume Builder | 947 -> 723 | experience and education modals | Resume Builder focused tests, build, lint, bloat |
| Interview Scheduler | 941 -> 856 | scheduler model data | Scheduler focused tests, build, lint, bloat |
| Settings credentials | 1016 -> 895 | credential state hook | Settings focused tests, build, lint, bloat |
| Market DB tests | 931 -> 837 | sentiment test module | Rust focused tests, fmt, clippy, bloat |

Earlier cleanup in this batch split config validation tests, scraper tests,
mock resume tests, error-helper tests, first-run setup sections, resume analyzer
keyword data, Resume page skills UI, Applications model data, Scraper Health
Dashboard model data, AnalyticsPanel model data, and several Rust/test/harness
near-limit files. Use `git log --oneline` plus commit stats for exact history.

## Recent Completed Slices

Detailed implementation history before the current restart window is in the
archived plan docs above and the local git log. Current restart context keeps
only the latest active slice plus the next work list so this file stays below
the active-doc budget.

## Next Best Work

1. Continue resume assistance only where it improves truthful local requirement
   review, hard-constraint handling, readable evidence, or next-action guidance.
2. Continue guided intake only where resume/profile suggestions stay optional,
   reviewed, local, and understandable for non-technical job seekers.
3. Continue job-card protection for stale, risky, duplicate, unclear, or
   pay-problem postings without treating local signals as employer predictions.
4. Continue cleanup only when it blocks critical functionality,
   privacy/security, verification, or user ease.

## Completion Bar

Do not mark the goal complete until current evidence proves:

- No known repo bloat, stale docs, generated artifacts, or duplicate sources of
  truth remain.
- No known privacy leak remains in logs, command errors, renderer messages,
  reports, credential paths, scraper errors, notifications, or local path
  exposure.
- No known user-facing flow assumes terminal, GitHub, debugging, or engineering
  knowledge.
- No known user-facing flow assumes the job seeker is only an engineer or only
  searching for technical work.
- Relevant sensors cover recurring drift classes.
- Final docs, bloat, security, architecture, frontend, build, Rust, and chosen
  E2E checks pass from the current checkout.
