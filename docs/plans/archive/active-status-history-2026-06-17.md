# Active Status History: 2026-06-06 To 2026-06-17

This archive preserves detailed status evidence that used to live in
`docs/plans/active/status.md`. The active status file is now a bounded restart
index; this file is loaded only when old slice provenance is needed.

## Source

- Archived from `docs/plans/active/status.md` during the 2026-06-17 harness
  context-budget cleanup.
- The exact pre-compaction wording remains available in git history before this
  archive was added.

## Preserved Current Posture

- `origin/main` was the source of truth for the pushed `2.7.7`
  release-recovery baseline.
- Package metadata was `2.7.7`. The public no-account macOS package was
  `v2.7.7` as of 2026-06-06; the latest full cross-platform public release
  remained `v2.7.5` until Windows and Linux `2.7.7` assets were rebuilt and
  verified.
- A fresh harness session reported 2 active docs, 2 indexed workstreams, and a
  100/100 harness score.
- Push cadence defaulted to 30-commit batches unless the user gave a newer
  explicit push instruction.

## Preserved Slice Evidence

- Shared `Modal` paint regression: Computer Use reproduced invisible modal
  content in the packaged macOS debug app. The fix used deterministic
  `app-modal-*` paint classes and critical inline viewport styles. Live
  Computer Use confirmed Dashboard Import Job and Application Assist Edit
  Screening Answer modals painted visibly, focused inside the modal, and kept
  readable content in the viewport.
- Visual truncation cleanup: removed truncation from user-controlled notes,
  companies, locations, interview titles, compare rows, resume word evidence,
  safe problem summaries, and scraper issue details. Remaining truncation was
  limited to intentional compact labels, snippets, or bounded controls.
- Follow-up redesign lock-in: Application Summary, Interview Schedule, Job
  Sources, and Cover Letter Templates migrated onto shared `Modal`; nested
  dialog aria ids became unique; Hiring Trends tabs wrapped instead of
  scrolling horizontally; Job Sources and source check history tables became
  responsive.
- Locked local encrypted storage direction: encrypt SQLite at rest, store
  secrets in per-row AEAD vault rows, protect the default vault key with the OS
  credential store, add advanced passphrase unlock, use macOS native Keychain
  plus LocalAuthentication for Touch ID-capable unlock, and avoid passive
  secure-store prompts from Settings, dashboards, or status views.
- Locked Quiet Shield direction: `DESIGN.md`, `docs/design/README.md`, and
  `docs/design/design-spec.md` are required product contracts. New UI/UX work
  must preserve or move toward Protective Navy, calm operational density,
  broad-audience copy, accessible controls, stable responsive layouts, no
  horizontal scroll, and no passive secure-storage prompts.
- Current QA-hardening focus after live app screenshots: confirmed UI overflow,
  labeling, toast placement, dashboard empty-state, market empty-state,
  Application Assist tab keyboarding, support-report redaction, scraper source
  health semantics, docs drift, and harness sensors before release work.
- Fresh packaged-app Computer Use validation on 2026-06-06 confirmed dashboard
  summary cards, viewport-visible toasts, Hiring Trends no-data wording,
  Application Assist tab click state, no stray native tab scrollbar, Pay
  Protection layout, Resume Match saved-resume display, and Settings Sources &
  Alerts opening without a passive Keychain prompt.
- Release finalization added credential integration coverage for active
  keyring-backed credentials, sanitized secure-storage denial, disabled
  LinkedIn storage, and legacy LinkedIn cookie plus expiry cleanup.
- Hiring Trends release-recovery used the current jobs schema for local trend
  refresh, treated hidden or dismissed jobs as market evidence rather than
  source-closed roles, kept filled-job counts neutral without source-backed
  closure signals, and added regression coverage for empty migrated databases
  and hidden-job aggregate semantics.
- Release docs separated current no-account macOS package `v2.7.7` from latest
  full cross-platform release `v2.7.5`, and treated verified local build plus
  manual upload as a supported production path when matching release gates pass.
- Repo-bloat fixture splits moved product-copy framing, product-copy
  user-guidance, feedback-report readability, release-promise, Discord
  notification score-color and salary display, Settings support-report,
  database validation, Settings product-copy, Settings email-provider,
  dashboard notes, saved-search modal, Resume Builder modal, and Interview
  Scheduler coverage into smaller focused files without changing detector
  behavior.
- Resume Builder Tauri command handlers moved into
  `src-tauri/src/commands/resume_builder_commands.rs` while preserving public
  command names and privacy guards.
- WeWorkRemotely scraper tests moved into a dedicated test module without
  changing scraper parsing, URL building, hashing, or fetch behavior.

## Preserved Verification Highlights

- Focused UI test batches covered modal/import/application assist/dashboard,
  resume optimizer, location, analytics, interviews, scraper health,
  ApplicationProfile, buttons, toasts, help icon, tooltip, and applications
  model surfaces.
- Harness and docs evidence included `npm run harness:check`,
  `npm run harness:score`, `npm run lint:docs`, `npm run lint:bloat`, and
  `git diff --check`.
- Product verification evidence included focused Vitest runs, full
  `npm run lint`, full `npm run test:run`, `npm run build`, and
  `npx tauri build --debug --bundles app` for the relevant slices.
- Rust and Tauri evidence included `cargo fmt --all -- --check`,
  focused `cargo test` commands, `cargo test commands::tests --lib`, and
  `node --test scripts/check-tauri-invokes.test.mjs`.
