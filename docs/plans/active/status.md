# Active Plan Status

Last updated: 2026-06-06.

Read this file first. It is the compact restart surface for current active
work. Detailed history from the previous open plan set moved to archive on
2026-06-04 so active planning does not slow down future sessions.

## Goal State

The repo-wide goal remains open. JobSentinel should keep moving toward zero
known errors, privacy leaks, stale docs, brittle tests, user-facing technical
assumptions, engineer-only defaults, and unverified claims.

Current priority is critical product functionality. Repo-bloat cleanup is
closed as of 2026-06-05; do not continue proactive file-size split work unless
a fresh bloat failure blocks product, privacy, security, docs accuracy, or
verification.

Release creation is paused until development and QA blockers are closed. Do not
spend time creating, uploading, or announcing new release assets while confirmed
product, scraper, privacy, documentation, harness, or Computer Use validation
work remains open.

Rule 0 still controls the work: user data stays local unless the user explicitly
configures an external channel, external AI stays optional and disabled by
default, and users stay in control before anything leaves the device.

## Active Workstreams

| Workstream | State | Current focus | Source |
| ---------- | ----- | ------------- | ------ |
| Current product and quality work | Active | Resume assistance, application readability, job-card protection, guided intake, pay protection, encrypted local storage, Quiet Shield redesign, and macOS readiness | [Plan](current-work.md) |

## Archived Context

These plans are no longer active restart surfaces. Keep them as provenance only:

- [Guided job-search intake](../archive/guided-job-search-intake-superseded-2026-06-04.md)
- [Repo cleanup and quality sweep](../archive/repo-cleanup-and-quality-sweep-superseded-2026-06-04.md)
- [Repo cleanup handoff](../archive/repo-cleanup-handoff-superseded-2026-06-04.md)
- [Research-backed product improvements](../archive/research-backed-product-improvements-superseded-2026-06-04.md)

## Current Posture

- `origin/main` is the source of truth for the pushed `2.7.7` release-recovery
  baseline.
- Package metadata is `2.7.7`. The current public no-account macOS package is
  `v2.7.7` as of 2026-06-06; the latest full cross-platform public release
  remains `v2.7.5` until Windows and Linux `2.7.7` assets are rebuilt and
  verified.
- macOS Computer Use retest is complete for the critical release path from an
  unlocked 2026-06-06 session against the fresh local `2.7.7` universal app:
  first-run setup, dashboard load, seeded application tracker card detail,
  native status change to Applied, dashboard count refresh, Settings Sources &
  Alerts navigation, safe support report copy, and safe support report save
  were exercised with real clicks. The copied and saved reports showed app
  version `2.7.7` and omitted seeded job title, company, notes, and URL.
- Fresh harness session evidence reports 2 active docs, 2 indexed workstreams,
  and a 100/100 harness score: this status file and `current-work.md`.
- Final broad verification for the broad-cleanup baseline passed during the
  completed cleanup batch; recent split slices record their focused evidence
  below.
- Push cadence defaults to 30-commit batches unless the user gives a newer
  explicit push instruction.

## Closed Cleanup Track

Repo-bloat cleanup is closed for current planning. The latest cleanup batch
left `npm run lint:bloat` passing and reduced the active near-limit harness
script pressure without changing detector behavior. Future work should move to
product and macOS readiness slices; reopen bloat cleanup only for a fresh
failing gate or a blocker to privacy, security, docs accuracy, or verification.

## Latest Slice

- Current redesign QA slice fixed the shared modal paint regression that
  Computer Use reproduced in the packaged macOS debug app: shared `Modal`
  dialogs were present in the accessibility tree but invisible in screenshots.
  The shared modal now uses deterministic `app-modal-*` paint classes and
  critical inline viewport styles, with no animation-only visibility
  dependency. Live Computer Use on the rebuilt debug bundle confirmed the
  Dashboard Import Job modal and Application Assist Edit Screening Answer modal
  both paint visibly, focus inside the modal, and keep readable content inside
  the viewport.

- Current visual polish also removed truncation from user-controlled notes,
  companies, locations, interview titles, compare rows, resume word evidence,
  safe problem summaries, and scraper issue details. Remaining truncation hits
  are limited to intentional compact labels, snippets, or bounded controls.
  Previous verification passed: focused UI tests for modal/import/application
  assist/dashboard/resume optimizer/location/analytics/interviews/scraper
  health, full `npm run lint`, full `npm run test:run`, `npm run build`, and
  `npx tauri build --debug --bundles app`.

- Follow-up redesign lock-in on 2026-06-06 migrated remaining confirmed custom
  overlay surfaces for Application Summary, Interview Schedule, Job Sources, and
  Cover Letter Templates onto the shared `Modal`, added unique modal ids for
  nested dialog safety, preserved the Interview Schedule close label, wrapped
  Hiring Trends tabs instead of scrolling them horizontally, and added
  responsive labeled table behavior for Job Sources and source check history.
  Verification passed: `npm run test:run -- src/components/Modal.test.tsx
  src/components/ScraperHealthDashboard.test.tsx
  src/components/ScraperHealthDashboard.sourceChecks.test.tsx
  src/components/InterviewScheduler.test.tsx src/pages/Market.test.tsx
  src/pages/ApplicationProfile.test.tsx src/components/Button.test.tsx
  src/contexts/ToastContext.test.tsx src/components/HelpIcon.test.tsx
  src/components/Tooltip.test.tsx src/pages/applicationsModel.test.ts`,
  `npm run lint`, `npm run harness:check`, and `npm run harness:score`. Full
  `npm run test:run`, `npm run build`, packaged-app rebuild, and Computer Use
  screenshots still need to run after this latest UI migration before any
  production-ready claim.

- Local encrypted storage and saved-secret UX are now part of the active
  repo-wide goal. Locked direction as of 2026-06-06: encrypt SQLite at rest,
  store secrets in per-row AEAD vault rows, protect the default vault key with
  the OS credential store, add advanced passphrase unlock, use macOS native
  Keychain plus LocalAuthentication for Touch ID-capable unlock, and keep
  Settings/dashboard/passive status views from triggering repeated secure-store
  prompts.

- Quiet Shield redesign is now part of the active repo-wide goal and the repo
  harness. Locked direction as of 2026-06-06: `DESIGN.md`,
  `docs/design/README.md`, and `docs/design/design-spec.md` are required
  product contracts for UI and UX work; new work must preserve or move toward
  Protective Navy, calm operational density, broad-audience copy, accessible
  controls, stable responsive layouts, no horizontal scroll, and no passive
  secure-storage prompts.

- Current redesign lock-in now treats Quiet Shield as a harness-controlled
  active-goal acceptance gate, not optional visual polish. `docs/harness` must
  keep design files required, change contracts must record design impact, and
  broad UI changes need Computer Use or Playwright screenshot evidence recorded
  before release work resumes.

- Current QA-hardening slice is in progress after live app screenshots exposed
  real visual and interaction bugs. Work now focuses on fixing confirmed UI
  overflow, labeling, toast placement, dashboard empty-state, market empty-state,
  Application Assist tab keyboarding, support-report redaction, scraper source
  health semantics, docs drift, and harness sensors before any release work.

- Fresh packaged-app Computer Use validation on 2026-06-06 confirmed another
  QA fix slice: dashboard summary cards paint, dashboard and Hiring Trends
  toasts are visible in the viewport, Hiring Trends no-data refresh avoids
  false success wording, Application Assist tab content and underline now agree
  after real clicks, the Application Assist tab row no longer shows a stray
  native scrollbar, Pay Protection lays out without clipping, Resume Match
  shows the saved resume name inside the panel, and Settings opens Sources &
  Alerts without a passive Keychain prompt. Focused verification passed:
  `npm run test:run -- src/pages/ApplicationProfile.test.tsx`,
  `npm run test:run -- src/contexts/ToastContext.test.tsx`, `npm run lint --
  --quiet`, and `npx tauri build --debug --bundles app`.

- Release finalization adds credential integration coverage for active
  keyring-backed credentials, sanitized secure-storage denial, disabled
  LinkedIn storage, and legacy LinkedIn cookie plus expiry cleanup.

- Hiring Trends release-recovery now uses the current jobs schema for local
  trend refresh, treats hidden or dismissed jobs as market evidence rather than
  source-closed roles, leaves filled-job counts neutral without a
  source-backed closure signal, and adds focused regression coverage for empty
  migrated databases and hidden-job aggregate semantics. Public docs now
  separate current no-account macOS package `v2.7.7` from latest full
  cross-platform release `v2.7.5`.

- Release docs now treat verified local build plus manual upload as a supported
  production path when the same version, harness, package, checksum, and public
  artifact gates pass. This keeps hosted tag CI available without making it
  the only release route.

- Repo-bloat product-copy framing fixtures now live in
  `scripts/check-repo-bloat-product-copy-framing.test.mjs`, reducing
  `scripts/check-repo-bloat-product-copy.test.mjs` from 862 to 647 lines
  without changing stale Resume Optimizer or Application Assist automation
  framing sensors. Focused verification passed: `node --test
  scripts/check-repo-bloat-product-copy.test.mjs
  scripts/check-repo-bloat-product-copy-framing.test.mjs`.

- Product-copy user-guidance fixtures now live in
  `scripts/check-product-copy-user-guidance.test.mjs`, reducing
  `scripts/check-product-copy.test.mjs` from 879 to 530 lines without changing
  user-doc sidecar, settings alert copy, source-check copy, browser import,
  deep-link, first-run, pay, or ATS wording sensors. Focused verification
  passed: `node --test scripts/check-product-copy.test.mjs
  scripts/check-product-copy-user-guidance.test.mjs`.

- Feedback report readability repo-bloat fixtures now live in
  `scripts/check-repo-bloat-feedback-readability.test.mjs`, reducing
  `scripts/check-repo-bloat-feedback-privacy.test.mjs` from 884 to 531 lines
  without changing feedback debug-event, problem-history, error-boundary, or
  recovery-copy sensors. Focused verification passed: `node --test
  scripts/check-repo-bloat-feedback-privacy.test.mjs
  scripts/check-repo-bloat-feedback-readability.test.mjs`.

- Resume Builder Tauri command handlers now live in
  `src-tauri/src/commands/resume_builder_commands.rs` and are re-exported
  through `src-tauri/src/commands/resume.rs`, reducing `resume.rs` from 886 to
  730 lines without changing public command names, resume upload/import privacy
  guards, matcher commands, export commands, or ATS analysis commands. Tauri
  registration now points at the builder-command submodule so generated command
  helpers remain visible, and the invoke harness now resolves nested command
  modules through Rust `#[path]` sidecars. Focused verification passed:
  `cargo fmt --all -- --check`, `cargo test commands::resume --lib`, `cargo
  test commands::tests --lib`, `node --test scripts/check-tauri-invokes.test.mjs`,
  `npm run lint:docs`, and `npm run lint:bloat`.

- Release-promise repo-bloat fixtures now live in
  `scripts/check-repo-bloat-release-promises.test.mjs`, reducing
  `scripts/check-repo-bloat.test.mjs` from 895 to 820 lines without changing
  release-version, macOS installer, or macOS distribution promise sensors.
  Focused verification passed: `node --test scripts/check-repo-bloat.test.mjs
  scripts/check-repo-bloat-release-promises.test.mjs` and `npm run
  lint:bloat`; full script tests, docs gates, `git diff --check`, and the
  local-path leak scan also passed.

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
| Repo-bloat product-copy test | 862 -> 647 | product-copy framing test file | Focused script tests |
| Product-copy test | 879 -> 530 | user-guidance test file | Focused script tests |
| Feedback privacy bloat test | 884 -> 531 | feedback readability test file | Focused script tests |
| Resume Builder commands | 886 -> 730 | command sidecar re-export plus nested invoke harness | Commands focused tests, script tests, docs, bloat, fmt |
| Repo-bloat release promise tests | 895 -> 820 | release-promise test file | Focused script tests, bloat |
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

1. Continue the Quiet Shield redesign pass against `DESIGN.md`,
   `docs/design/README.md`, and `docs/design/design-spec.md`; modals now have
   focused regression proof, so the next proof should rerun full test/build,
   rebuild the packaged debug app, and use Computer Use on toasts, settings,
   keyboard flow, route empty states, and narrow-width states.
2. Continue resume assistance only where it improves truthful local requirement
   review, hard-constraint handling, readable evidence, or next-action guidance.
3. Continue guided intake only where resume/profile suggestions stay optional,
   reviewed, local, and understandable for non-technical job seekers.
4. Continue job-card protection for stale, risky, duplicate, unclear, or
   pay-problem postings without treating local signals as employer predictions.
5. Continue macOS readiness docs, release checks, and user guidance without
   claiming Gatekeeper-ready public distribution before Apple credentials exist.

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
