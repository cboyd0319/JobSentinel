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

- Last pushed baseline before post-push cleanup commits:
  `8e6b7bc6 Update README readiness status`.
- Fresh harness evidence reports 2 active docs and 2 indexed workstreams: this
  status file and `current-work.md`.
- Local commits should continue in small verified slices; push only when the
  branch reaches the user's 30-commit batch threshold or the user gives a newer
  explicit push instruction.

## Latest Slice

Latest implementation slice:

- Market Intelligence analytics tests moved out of
  `src-tauri/src/core/market_intelligence/analytics.rs` into
  `src-tauri/src/core/market_intelligence/analytics_tests.rs` and
  `src-tauri/src/core/market_intelligence/analytics_tests/db_tests.rs`.
- The runtime market analytics module is now below the 1,200-line Rust target,
  so the legacy oversized-file exception was removed.

Earlier implementation slice:

- Discord notification tests moved out of
  `src-tauri/src/core/notify/discord.rs` into
  `src-tauri/src/core/notify/discord_tests.rs` and
  `src-tauri/src/core/notify/discord_tests/payload_tests.rs`.
- The runtime Discord notification module is now below the 1,200-line Rust
  target, so the legacy oversized-file exception was removed.

Earlier implementation slice:

- Teams notification tests moved out of `src-tauri/src/core/notify/teams.rs`
  into `src-tauri/src/core/notify/teams_tests.rs` and
  `src-tauri/src/core/notify/teams_tests/payload_tests.rs`.
- The runtime Teams notification module is now below the 1,200-line Rust
  target, so the legacy oversized-file exception was removed.

Earlier implementation slice:

- Slack notification tests moved out of `src-tauri/src/core/notify/slack.rs`
  into `src-tauri/src/core/notify/slack_tests.rs` and
  `src-tauri/src/core/notify/slack_tests/builder_tests.rs`.
- The runtime Slack notification module is now below the 1,200-line Rust
  target, so the legacy oversized-file exception was removed.

Earlier implementation slice:

- Structured resume format checks moved out of
  `src-tauri/src/core/resume/ats_analyzer.rs` into
  `src-tauri/src/core/resume/ats_analyzer/structured_format.rs`.
- The public `AtsAnalyzer::analyze_format` API is unchanged; plain-text format
  checks now call the same shared structured-format issue helpers.
- The runtime ATS analyzer is now below the 1,200-line Rust target, so the
  legacy oversized-file exception was removed.

Earlier implementation slice:

- Mock user-data, job-tracking, settings, and support command bodies moved out
  of `src/mocks/handlers.ts` into focused helper modules under
  `src/mocks/handlers/`.
- The main mock handler keeps the backend command `case` labels for harness
  contract scans and still owns persisted mock state loading and saving.
- The main mock handler is now below the 1,200-line test/mock target, so the
  legacy oversized-file exception was removed.

Earlier implementation slice:

- Greenhouse scraper tests moved out of
  `src-tauri/src/core/scrapers/greenhouse.rs` into
  `src-tauri/src/core/scrapers/greenhouse_tests.rs`.
- The runtime Greenhouse scraper is now below the 1,200-line Rust target, so
  the legacy oversized-file exception was removed.
- Greenhouse behavior was unchanged; only test module ownership changed.

Earlier implementation slice:

- Resume skill extractor tests moved out of
  `src-tauri/src/core/resume/skills.rs` into
  `src-tauri/src/core/resume/skills_tests.rs`.
- The runtime resume skills module is now below the 1,200-line Rust target, so
  the legacy oversized-file exception was removed.
- Resume skill extraction behavior was unchanged; only test module ownership
  changed.

Earlier implementation slice:

- Dashboard job comparison modal moved out of `src/pages/Dashboard.tsx` into
  `src/pages/DashboardUI/DashboardCompareModal.tsx`.
- The main Dashboard page is now below the 1,200-line frontend target, so the
  legacy oversized-file exception was removed.
- Dashboard comparison behavior was unchanged; only modal component ownership
  changed.

Earlier implementation slice:

- Root README reference index moved into `docs/references.md`, leaving a
  compact README anchor and preserving the complete external-source inventory.
- Harness source policy now checks required reference URLs in
  `docs/references.md` instead of requiring the full index in `README.md`.
- The root README is now below the 900-line docs target, so the legacy
  oversized-file exception was removed.

Earlier implementation slice:

- Docs drift checker constants moved out of
  `scripts/harness/checks/docs-drift.mjs` into
  `scripts/harness/checks/docs-drift-constants.mjs`.
- The main docs drift checker is now below the 900-line script target, so the
  legacy oversized-file exception was removed.
- Docs drift behavior was unchanged; only rule data ownership changed.

Earlier implementation slice:

- Interview Scheduler icon components moved out of
  `src/components/InterviewScheduler.tsx` into
  `src/components/InterviewSchedulerIcons.tsx`.
- The main Interview Scheduler component is now below the 1,200-line frontend
  target, so the legacy oversized-file exception was removed.
- Interview Scheduler behavior was unchanged; only local icon component
  ownership changed.

Earlier implementation slice:

- Resume template renderer tests moved out of
  `src-tauri/src/core/resume/templates.rs` into
  `src-tauri/src/core/resume/templates_tests.rs`.
- The runtime resume templates module is now below the 1,200-line Rust target,
  so the legacy oversized-file exception was removed.
- Resume template runtime behavior was unchanged; only test module ownership
  changed.

Earlier implementation slice:

- User data inline tests moved out of `src-tauri/src/core/user_data/mod.rs`
  into `src-tauri/src/core/user_data/tests.rs`.
- The runtime user data module is now below the 1,200-line Rust target, so the
  legacy oversized-file exception was removed.
- User data runtime behavior was unchanged; only test module ownership changed.

Earlier implementation slice:

- Settings loadConfig tests moved out of `src/pages/Settings.test.tsx` into
  `src/pages/Settings.load.test.tsx`.
- Both Settings test files are below the 1,200-line test target, so the legacy
  oversized-file exception was removed.
- Runtime Settings code was unchanged; only Vitest suite ownership changed.

Earlier implementation slice:

- ATS badge tests moved out of
  `src/components/automation/ApplyButton.test.tsx` into
  `src/components/automation/ApplyButton.badge.test.tsx`.
- Both Apply Button test files are below the 1,200-line test target, so the
  legacy oversized-file exception was removed.
- Runtime component code was unchanged; only Vitest suite ownership changed.

Earlier implementation slice:

- Screening Answers Form answer-input, validation, and submission tests moved
  out of `src/components/automation/ScreeningAnswersForm.test.tsx` into
  `src/components/automation/ScreeningAnswersForm.form.test.tsx`.
- Both Screening Answers Form test files are below the 1,200-line test target,
  so the legacy oversized-file exception was removed.
- Runtime component code was unchanged; only Vitest suite ownership changed.

Earlier implementation slice:

- Application Preview hard-screening question tests moved out of
  `src/components/automation/ApplicationPreview.test.tsx` into
  `src/components/automation/ApplicationPreview.screening.test.tsx`.
- Both Application Preview test files are below the 1,200-line test target, so
  the legacy oversized-file exception was removed.
- Runtime component code was unchanged; only Vitest suite ownership changed.

Earlier implementation slice:

- Resume database coverage tests moved out of
  `src-tauri/src/core/resume/tests.rs` into
  `src-tauri/src/core/resume/tests/database_coverage_tests.rs`.
- The main resume test file and new child module are below the 1,200-line
  Rust/test target, so the legacy oversized-file exception was removed.
- Touched resume test fixture paths now use repo-relative placeholders instead
  of local absolute paths.

Earlier implementation slice:

- ATS comprehensive status, interview auto-reminder, and application stats edge
  tests moved out of `src-tauri/src/core/ats/tests.rs` into focused child
  modules under `src-tauri/src/core/ats/tests/`.
- The main ATS test file and new child modules are below the 1,200-line
  Rust/test target, so the legacy oversized-file exception was removed.
- Runtime ATS code was unchanged; only test module ownership changed.

Earlier implementation slice:

- Market Intelligence async database tests moved out of
  `src-tauri/src/core/market_intelligence/tests.rs` into
  `src-tauri/src/core/market_intelligence/tests/async_tests.rs` with focused
  query, compute, and edge/integration submodules.
- The main Market Intelligence test file and new child modules are below the
  1,200-line Rust/test target, so the legacy oversized-file exception was
  removed.
- Runtime Market Intelligence code was unchanged; only test module ownership
  changed.

Earlier implementation slice:

- Scheduler start-loop coverage tests moved out of
  `src-tauri/src/core/scheduler/tests.rs` into
  `src-tauri/src/core/scheduler/tests/start_loop_tests.rs`.
- The main scheduler test file is now below the 1,200-line Rust/test target, so
  its legacy oversized-file exception was removed.
- Runtime scheduler code was unchanged; only test module ownership changed.

Earlier implementation slice:

- Lever scrape-company flow tests moved out of
  `src-tauri/src/core/scrapers/lever/tests.rs` into
  `src-tauri/src/core/scrapers/lever/tests/scrape_company_flow_tests.rs`.
- The main Lever test file is now below the 1,200-line Rust/test target, so its
  legacy oversized-file exception was removed.
- Read-only Lever scout proposed this exact contiguous test boundary and
  changed no files; coordinator implemented and verified it locally.

Earlier implementation slice:

- Scoring engine inline tests moved out of `src-tauri/src/core/scoring/mod.rs`
  into `src-tauri/src/core/scoring/tests/mod.rs`, keeping company scoring tests
  as a sibling test module.
- The main scoring module is now below the 1,200-line Rust target, so its
  legacy oversized-file exception was removed.
- Read-only scoring scout proposed this exact test-module boundary and changed
  no files; coordinator implemented and verified it locally.

Earlier implementation slice:

- Scheduler interval edge-case and scraping-result model tests moved out of
  `src-tauri/src/core/scheduler/tests.rs` into
  `src-tauri/src/core/scheduler/tests/interval_tests.rs` and
  `src-tauri/src/core/scheduler/tests/result_tests.rs`.
- The main scheduler test file still owns shutdown, logging, error-path,
  notification, and remaining scraping-cycle coverage.
- `src-tauri/src/core/scheduler/tests.rs` legacy no-growth budget tightened
  from 1,609 lines to 1,260 lines.

Earlier implementation slice:

- DB integrity backup, restore, cleanup, and backup-history tests moved out of
  `src-tauri/src/core/db/integrity/tests.rs` into
  `src-tauri/src/core/db/integrity/tests/backup_tests.rs`.
- The main integrity test file is now below the 1,200-line test target, so its
  legacy oversized-file exception was removed.

Earlier implementation slice:

- DB integrity model, clone, debug-format, and default-structure tests moved
  out of `src-tauri/src/core/db/integrity/tests.rs` into
  `src-tauri/src/core/db/integrity/tests/model_tests.rs`.
- The main integrity test file still owns database-backed health, backup,
  WAL, pragma, and restore coverage plus shared setup.
- `src-tauri/src/core/db/integrity/tests.rs` legacy no-growth budget tightened
  from 1,868 lines to 1,613 lines.

Earlier implementation slice:

- Mock handler command helper and type definitions moved out of
  `src/mocks/handlers.ts` into `src/mocks/handlers/commandHelpers.ts` and
  `src/mocks/handlers/types.ts`.
- The main mock handler still owns mock state persistence and command dispatch.
- `src/mocks/handlers.ts` legacy no-growth budget tightened from 1,887 lines
  to 1,645 lines.

Earlier implementation slice:

- Config save/load persistence tests moved out of
  `src-tauri/src/core/config/tests.rs` into
  `src-tauri/src/core/config/tests/persistence_tests.rs`.
- The main config test file is now below the 1,200-line test target, so its
  legacy oversized-file exception was removed.

Recent implementation slice:

- Config Greenhouse and Lever source URL validation tests moved out of
  `src-tauri/src/core/config/tests.rs` into
  `src-tauri/src/core/config/tests/source_url_tests.rs`.
- The main config test file still owns general validation, persistence,
  defaults, LinkedIn, auto-refresh, desktop, serde, boundary, and property
  coverage plus shared fixtures.
- `src-tauri/src/core/config/tests.rs` legacy no-growth budget tightened from
  1,382 lines to 1,247 lines.

Earlier implementation slice:

- Config Teams alert validation tests moved out of
  `src-tauri/src/core/config/tests.rs` into
  `src-tauri/src/core/config/tests/teams_tests.rs`.
- The main config test file still owns general validation, source URL,
  persistence, default, LinkedIn, auto-refresh, desktop, serde, boundary, and
  property coverage plus shared fixtures.
- `src-tauri/src/core/config/tests.rs` legacy no-growth budget tightened from
  1,459 lines to 1,382 lines.

Earlier implementation slice:

- Config Telegram alert validation tests moved out of
  `src-tauri/src/core/config/tests.rs` into
  `src-tauri/src/core/config/tests/telegram_tests.rs`.
- The main config test file still owns general validation, source URL,
  persistence, default, Teams, LinkedIn, auto-refresh, desktop, serde,
  boundary, and property coverage plus shared fixtures.
- `src-tauri/src/core/config/tests.rs` legacy no-growth budget tightened from
  1,545 lines to 1,459 lines.

Earlier implementation slice:

- Config Discord alert validation tests moved out of
  `src-tauri/src/core/config/tests.rs` into
  `src-tauri/src/core/config/tests/discord_tests.rs`.
- The main config test file still owns general validation, source URL,
  persistence, default, Telegram, Teams, LinkedIn, auto-refresh, desktop,
  serde, boundary, and property coverage plus shared fixtures.
- `src-tauri/src/core/config/tests.rs` legacy no-growth budget tightened from
  1,636 lines to 1,545 lines.

Earlier implementation slice:

- Config email alert validation tests moved out of
  `src-tauri/src/core/config/tests.rs` into
  `src-tauri/src/core/config/tests/email_tests.rs`.
- The main config test file still owns general validation, source URL,
  persistence, default, Discord, Telegram, Teams, LinkedIn, auto-refresh,
  desktop, serde, boundary, and property coverage.
- `src-tauri/src/core/config/tests.rs` legacy no-growth budget tightened from
  1,865 lines to 1,636 lines.

Latest implementation slice:

- ATS requirement review building, match-state classification, and review
  recommendation copy moved out of
  `src-tauri/src/core/resume/ats_analyzer.rs` into
  `src-tauri/src/core/resume/ats_analyzer/requirement_reviews.rs`.
- The main ATS analyzer still owns job keyword extraction, evidence scoring,
  and structured resume analysis.
- `src-tauri/src/core/resume/ats_analyzer.rs` legacy no-growth budget
  tightened from 1,682 lines to 1,571 lines.

Earlier implementation slice:

- ATS hard-constraint risk building, hard-constraint categorization, and
  hard-constraint keyword extraction moved out of
  `src-tauri/src/core/resume/ats_analyzer.rs` into
  `src-tauri/src/core/resume/ats_analyzer/hard_constraints.rs`.
- The main ATS analyzer still owns job keyword extraction, requirement review,
  evidence scoring, and structured resume analysis.
- `src-tauri/src/core/resume/ats_analyzer.rs` legacy no-growth budget
  tightened from 2,115 lines to 1,682 lines.

Earlier implementation slice:

- Settings notification, email, chat-alert, and per-source notification
  preference UI moved out of `src/pages/Settings.tsx` into
  `src/pages/SettingsNotificationsSection.tsx`.
- The main Settings page is now below the 1,200-line frontend target, so its
  legacy oversized-file exception was removed.

Earlier implementation slice:

- DB connection coverage moved out of `src-tauri/src/core/db/tests.rs` into
  `src-tauri/src/core/db/tests/tests/job_connection_tests.rs`.
- The main DB test file is now below the 1,200-line test target, so its legacy
  oversized-file exception was removed.

Earlier implementation slice:

- DB score/source/recent job query coverage moved out of
  `src-tauri/src/core/db/tests.rs` into
  `src-tauri/src/core/db/tests/tests/job_get_jobs_by_tests.rs`.
- The main DB test file still owns core operation, accessor, repost, and
  remaining broad database coverage plus shared fixtures.
- `src-tauri/src/core/db/tests.rs` legacy no-growth budget tightened from
  1,318 lines to 1,250 lines.

Earlier implementation slice:

- DB duplicate-merge coverage moved out of `src-tauri/src/core/db/tests.rs`
  into `src-tauri/src/core/db/tests/tests/job_duplicate_merge_tests.rs`.
- The main DB test file still owns core operation, accessor, repost, and
  remaining broad database coverage plus shared fixtures.
- `src-tauri/src/core/db/tests.rs` legacy no-growth budget tightened from
  1,374 lines to 1,318 lines.

Earlier implementation slice:

- DB bookmark coverage moved out of `src-tauri/src/core/db/tests.rs` into
  `src-tauri/src/core/db/tests/tests/job_bookmark_tests.rs`.
- The main DB test file still owns core operation, accessor, repost, and
  remaining broad database coverage plus shared fixtures.
- `src-tauri/src/core/db/tests.rs` legacy no-growth budget tightened from
  1,414 lines to 1,374 lines.

Earlier implementation slice:

- DB upsert coverage moved out of `src-tauri/src/core/db/tests.rs` into
  `src-tauri/src/core/db/tests/tests/job_upsert_tests.rs`.
- The main DB test file still owns core operation, accessor, bookmark, repost,
  and remaining broad database coverage plus shared fixtures.
- `src-tauri/src/core/db/tests.rs` legacy no-growth budget tightened from
  1,481 lines to 1,414 lines.

Earlier implementation slice:

- DB statistics coverage moved out of `src-tauri/src/core/db/tests.rs` into
  `src-tauri/src/core/db/tests/tests/job_statistics_tests.rs`.
- The main DB test file still owns core operation, accessor, upsert, bookmark,
  repost, and remaining broad database coverage plus shared fixtures.
- `src-tauri/src/core/db/tests.rs` legacy no-growth budget tightened from
  1,543 lines to 1,481 lines.

Earlier implementation slice:

- DB query-error and no-match update coverage moved out of
  `src-tauri/src/core/db/tests.rs` into
  `src-tauri/src/core/db/tests/tests/job_query_error_tests.rs`.
- The main DB test file still owns core operation, accessor, statistic, upsert,
  bookmark, repost, and remaining broad database coverage plus shared fixtures.
- `src-tauri/src/core/db/tests.rs` legacy no-growth budget tightened from
  1,631 lines to 1,543 lines.

Earlier implementation slice:

- DB edge-case coverage moved out of `src-tauri/src/core/db/tests.rs` into
  `src-tauri/src/core/db/tests/tests/job_edge_case_tests.rs`.
- The main DB test file still owns core operation, accessor, query-error,
  statistic, upsert, bookmark, repost, and remaining broad database coverage
  plus shared fixtures.
- `src-tauri/src/core/db/tests.rs` legacy no-growth budget tightened from
  1,833 lines to 1,631 lines.

Earlier implementation slice:

- DB duplicate detection and merge tests moved out of
  `src-tauri/src/core/db/tests.rs` into
  `src-tauri/src/core/db/tests/tests/job_duplicate_tests.rs`.
- The main DB test file still owns core operation, edge case, accessor,
  query-error, statistic, upsert, bookmark, repost, and remaining broad
  database coverage plus shared fixtures.
- `src-tauri/src/core/db/tests.rs` legacy no-growth budget tightened from
  2,042 lines to 1,833 lines.

Earlier implementation slice:

- Resume Builder data models, step metadata, skill labels, export payload
  mapping, template payload mapping, and ATS analysis normalization moved out
  of `src/pages/ResumeBuilder.tsx` into
  `src/pages/resumeBuilderData.ts`.
- The main Resume Builder page still owns UI state, save/export flows, modals,
  and rendering; the extracted helper owns typed resume data shapes and
  backend payload transforms.
- `src/pages/ResumeBuilder.tsx` legacy no-growth budget tightened from 2,118
  lines to 1,770 lines.

Earlier implementation slice:

- Settings search preference, location, salary, company, and auto-search UI
  moved out of `src/pages/Settings.tsx` into
  `src/pages/SettingsSearchPreferencesSection.tsx`.
- The main Settings page still owns config loading/saving, credentials,
  notifications, source setup, support flows, and tab orchestration; the
  extracted component owns the basic search-preference form UI.
- `src/pages/Settings.tsx` legacy no-growth budget tightened from 2,493 lines
  to 1,931 lines.

Earlier implementation slice:

- Scoring company preference, company normalization, and fuzzy company matching
  tests moved out of `src-tauri/src/core/scoring/mod.rs` into
  `src-tauri/src/core/scoring/tests/company_tests.rs`.
- The main scoring module still owns scoring engine behavior, salary/location
  tests, and shared test fixtures.
- `src-tauri/src/core/scoring/mod.rs` legacy no-growth budget tightened from
  2,109 lines to 1,849 lines.

Recent implementation slice:

- Scheduler schedule-config, lifecycle, shutdown, and result model tests moved
  out of `src-tauri/src/core/scheduler/tests.rs` into
  `src-tauri/src/core/scheduler/tests/basic_tests.rs`.
- The main scheduler test file still owns interval edge cases, database
  persistence, logging, notification, and remaining scraping-cycle coverage.
- `src-tauri/src/core/scheduler/tests.rs` legacy no-growth budget tightened
  from 1,929 lines to 1,609 lines.

Earlier implementation slice:

- Resume plain-text format analysis moved out of
  `src-tauri/src/core/resume/ats_analyzer.rs` into
  `src-tauri/src/core/resume/ats_analyzer/plain_text_format.rs`.
- The main ATS analyzer still owns job keyword extraction, requirement review,
  evidence scoring, and structured resume analysis; the extracted helper owns
  readable-text contact, heading, layout, keyword-list, and generic-filler
  format checks.
- `src-tauri/src/core/resume/ats_analyzer.rs` legacy no-growth budget tightened
  from 2,492 lines to 2,115 lines.

Earlier implementation slice:

- DB search title, description, limit, FTS edge, and search error-path tests
  moved out of `src-tauri/src/core/db/tests.rs` into
  `src-tauri/src/core/db/tests/tests/job_search_tests.rs`.
- The main DB test file still owns duplicate, bookmark, alert, connection, and
  broad database operation coverage plus shared fixtures.
- `src-tauri/src/core/db/tests.rs` legacy no-growth budget tightened from 2,267
  lines to 2,042 lines.

Recent harness slice:

- The whole public GitHub wiki inventory is now manifest-owned under
  `docs/harness/manifest.json` `publicWiki.requiredPages`.
- `npm run harness:check` validates the public wiki URL, Git remote, branch,
  required pages, and update triggers.
- The PR template and change-contract template now require wiki impact review
  against the manifest page inventory, not only one remembered page.
- Remote wiki pages `Home.md` and `Capabilities.md` were refreshed and pushed
  to the wiki `master` branch at wiki commit `5cdb20f`.

Earlier implementation slice:

- Settings job-board recommendation logic moved out of
  `src/pages/Settings.tsx` into
  `src/pages/SettingsJobBoardRecommendations.ts`.
- The main Settings page still owns page state, config loading/saving, and
  credential boundaries; the extracted helper owns only broad-audience optional
  source suggestions and enable callbacks.
- `src/pages/Settings.tsx` legacy no-growth budget tightened from 2,663 lines
  to 2,493 lines.

Recent cleanup summary:

- Lever JSON parsing and edge-case tests moved out of
  `src-tauri/src/core/scrapers/lever/tests.rs` into
  `src-tauri/src/core/scrapers/lever/tests/json_edge_tests.rs`.
- The main Lever test file still owns remote inference, hashing, scraper
  initialization, scrape-company simulation, property tests, and integration
  coverage; the extracted module owns JSON field-shape, fallback, empty-field,
  remote-location edge, hash-consistency, and company-struct edge coverage.
- `src-tauri/src/core/scrapers/lever/tests.rs` legacy no-growth budget
  tightened from 2,257 lines to 1,763 lines.
- Scheduler scraper-cycle tests moved out of
  `src-tauri/src/core/scheduler/tests.rs` into
  `src-tauri/src/core/scheduler/tests/scraper_cycle_tests.rs`.
- The main scheduler test file still owns lifecycle, interval, database,
  shutdown, and broad error-path coverage; the extracted module owns scraper
  URL, source configuration, scoring, alert, LinkedIn policy, JobsWithGPT, and
  multi-scraper cycle coverage.
- `src-tauri/src/core/scheduler/tests.rs` legacy no-growth budget tightened
  from 2,371 lines to 1,929 lines.
- Resume analyzer conservative keyword term expansion moved out of
  `src-tauri/src/core/resume/ats_analyzer.rs` into
  `src-tauri/src/core/resume/ats_analyzer/term_expansion.rs`.
- `AtsAnalyzer` still owns analysis orchestration and evidence scoring; the
  extracted helper owns equivalent search terms, lift-unit term variants,
  year-experience ranges, and human-language requirement detection.
- `src-tauri/src/core/resume/ats_analyzer.rs` legacy no-growth budget
  tightened from 3,060 lines to 2,492 lines.
- Job notes DB tests moved out of `src-tauri/src/core/db/tests.rs` into
  `src-tauri/src/core/db/tests/tests/job_notes_tests.rs`.
- The main DB test file still owns broad operation coverage and shared
  fixtures; the extracted module owns note CRUD, note listing, hidden-note
  filtering, and note text edge cases.
- `src-tauri/src/core/db/tests.rs` legacy no-growth budget tightened from
  2,526 lines to 2,267 lines.
- Technical-first docs and UI product-copy path checks moved out of
  `scripts/harness/checks/product-copy.mjs` into
  `scripts/harness/checks/product-copy/technical-first-docs.mjs` and
  `scripts/harness/checks/product-copy/technical-first-ui.mjs`.
- `hasTechnicalFirstUserCopy` now coordinates preflight, docs, UI, and fallback
  helpers.
- `scripts/harness/checks/product-copy.mjs` is now below the 900-line script
  target, so its legacy no-growth budget was removed.
- Technical-first preflight product-copy path routing moved out of
  `scripts/harness/checks/product-copy.mjs` into
  `scripts/harness/checks/product-copy/technical-first-preflight.mjs`.
- `hasTechnicalFirstUserCopy` still owns the main technical-first scanner; the
  extracted helper owns early exact-path checks, issue-template privacy checks,
  pay-language checks, and front-door ATS wording checks.
- `scripts/harness/checks/product-copy.mjs` legacy no-growth budget tightened
  from 2,029 lines to 1,763 lines.
- Technical-first fallback product-copy pattern table moved out of
  `scripts/harness/checks/product-copy.mjs` into
  `scripts/harness/checks/product-copy/technical-first-fallback.mjs`.
- `hasTechnicalFirstUserCopy` still owns path-specific routing; the extracted
  helper owns only the generic fallback pattern table.
- `scripts/harness/checks/product-copy.mjs` legacy no-growth budget tightened
  from 2,563 lines to 2,029 lines.
- Support, external-provider, source-label, issue-template, resume/pay, and
  profile-doc product-copy fixture coverage moved out of
  `scripts/check-product-copy.test.mjs` into
  `scripts/check-product-copy-support-docs.test.mjs`.
- The main product-copy test still owns shared product-copy fixture coverage
  and is now below the 1,200-line test target, so its legacy no-growth budget
  was removed.
- Settings-focused product-copy fixture coverage moved out of
  `scripts/check-product-copy.test.mjs` into
  `scripts/check-product-copy-settings.test.mjs`.
- The main product-copy test still owns shared product-copy fixture coverage;
  the extracted file owns the long technical-first settings, notification,
  support, resume, and onboarding copy fixture.
- `scripts/check-product-copy.test.mjs` legacy no-growth budget tightened from
  2,630 lines to 1,738 lines.
- Source-quality, source-structure, dependency, and E2E guidance
  `checkRepoBloat` integration tests moved out of
  `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-source-quality.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns frontend/source glyph checks, lint-suppression
  checks, unreferenced source helper checks, redundant dependency checks, and
  stale E2E guidance coverage.
- `scripts/check-repo-bloat.test.mjs` is now below the 1,200-line test target,
  so its legacy no-growth budget was removed.
- Legacy no-growth fixture coverage now uses `src/mocks/handlers.ts`, which is
  still an oversized tracked file with a live budget.
- Product-copy and pay-framing `checkRepoBloat` integration tests moved out of
  `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-product-copy.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns banned job-search framing, technical-first user copy,
  stale Resume Optimizer and Application Assist framing, ghost-risk wording,
  support-path wording, pay guidance, salary-floor troubleshooting, and salary
  command logging coverage.
- `scripts/check-repo-bloat.test.mjs` legacy no-growth budget tightened from
  2,671 lines to 1,554 lines.
- Feedback, support-report, mock-handler, recovery-copy, and score-copy
  `checkRepoBloat` integration tests moved out of
  `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-feedback-privacy.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns notification preference docs, feedback sanitization,
  user-data and scheduler logging, mock-handler shape, feedback report,
  problem-history, recovery-copy, and score-copy coverage.
- `scripts/check-repo-bloat.test.mjs` legacy no-growth budget tightened from
  3,660 lines to 2,671 lines.
- Frontend error-report and security-doc `checkRepoBloat` integration tests
  moved out of `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-frontend-security.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns frontend error, webhook redaction, unsafe parsing,
  notification-webhook, XSS, keyring, and security-doc drift coverage.
- `scripts/check-repo-bloat.test.mjs` legacy no-growth budget tightened from
  4,562 lines to 3,660 lines.
- Privacy command `checkRepoBloat` integration tests moved out of
  `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-privacy-commands.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns automation logging, command-error, import, bookmarklet,
  scoring-cache, scheduler, residual-core, and bookmarklet-auth coverage.
- `scripts/check-repo-bloat.test.mjs` legacy no-growth budget tightened from
  5,669 lines to 4,562 lines.
- Privacy IPC and notification `checkRepoBloat` integration tests moved out of
  `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-privacy-ipc.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns renderer credential, resume DTO, config export,
  notification, LinkedIn docs, URL logging, and job-import privacy coverage.
- `scripts/check-repo-bloat.test.mjs` legacy no-growth budget tightened from
  6,497 lines to 5,669 lines.
- Core privacy/logging `checkRepoBloat` integration tests moved out of
  `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-privacy-core.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns Rust stub, private-query, scraper, local-path, ML,
  Debug, LinkedIn, webhook, and credential-storage drift coverage.
- `scripts/check-repo-bloat.test.mjs` legacy no-growth budget tightened from
  7,386 lines to 6,497 lines.
- Feature-doc `checkRepoBloat` integration tests moved out of
  `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-feature-docs.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns active user-doc, feature-doc, scraper-doc, and
  notification-doc drift coverage.
- `scripts/check-repo-bloat.test.mjs` legacy no-growth budget tightened from
  8,550 lines to 7,386 lines.
- Docs-drift `checkRepoBloat` integration tests moved out of
  `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-docs-drift.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns developer-doc, roadmap, release-doc, active-doc, and
  stale-doc marker coverage.
- `scripts/check-repo-bloat.test.mjs` legacy no-growth budget tightened from
  9,702 lines to 8,550 lines.
- Broad-audience `checkRepoBloat` integration tests moved out of
  `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-broad-audience.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns engineer-first and salary-audience fixture coverage.
- `scripts/check-repo-bloat.test.mjs` legacy no-growth budget tightened from
  10,557 lines to 9,702 lines.
- DB hide, unhide, hidden-query, and bookmark operation tests moved out of
  `src-tauri/src/core/db/tests.rs` into
  `src-tauri/src/core/db/tests/tests/job_visibility_tests.rs`.
- The main DB test file still owns integration-style database operation tests
  and shared fixtures; the extracted module owns visibility and bookmark
  behavior tests.
- `src-tauri/src/core/db/tests.rs` legacy no-growth budget tightened from 2,879
  lines to 2,526 lines.
- DB model, serialization, timeout, and path tests moved out of
  `src-tauri/src/core/db/tests.rs` into
  `src-tauri/src/core/db/tests/tests/model_tests.rs`.
- The main DB test file still owns integration-style database operation tests
  and shared fixtures; the extracted module owns no-database model tests.
- `src-tauri/src/core/db/tests.rs` legacy no-growth budget tightened from 3,420
  lines to 2,879 lines.
- Resume bullet action-word list and role-specific evidence prompts moved out of
  `src-tauri/src/core/resume/ats_analyzer.rs` into
  `src-tauri/src/core/resume/ats_analyzer/bullet_prompts.rs`.
- `AtsAnalyzer` still owns the public API and analysis orchestration; the
  extracted helper owns only prompt wording and action-word lists.
- `src-tauri/src/core/resume/ats_analyzer.rs` legacy no-growth budget
  tightened from 3,439 lines to 3,060 lines.
- Settings additional job board UI moved out of `src/pages/Settings.tsx` into
  `src/pages/SettingsJobSourcesSection.tsx`, and secure credential badge copy
  moved to `src/pages/SettingsSecurityBadge.tsx`.
- The main Settings page still owns modal state, config loading/saving, source
  approval state, and credential state; the extracted section owns only source
  board presentation and child wiring.
- `src/pages/Settings.tsx` legacy no-growth budget tightened from 3,351 lines
  to 2,663 lines.
- Resume analysis score assembly and format-review helper logic moved out of
  `src/mocks/handlers.ts` into
  `src/mocks/handlers/resumeAnalysisRunner.ts`.
- The main mock handler still owns command dispatch, mutable mock state, and
  bullet prompt keyword injection; the extracted helper owns pure resume
  format and job-fit analysis assembly.
- `src/mocks/handlers.ts` legacy no-growth budget tightened from 2,087 lines to
  1,887 lines.
- Resume keyword extraction, conservative term expansion, evidence-location
  matching, and evidence frequency helpers moved out of
  `src/mocks/handlers.ts` into
  `src/mocks/handlers/resumeKeywordMatching.ts`.
- The main mock handler still owned analysis score assembly and command
  dispatch; the extracted helper owns pure keyword and evidence matching.
- `src/mocks/handlers.ts` legacy no-growth budget tightened from 3,050 lines to
  2,087 lines.
- Resume requirement review and hard-constraint helper logic moved out of
  `src/mocks/handlers.ts` into
  `src/mocks/handlers/resumeRequirementReview.ts`.
- The main mock handler still owns job-context keyword extraction, evidence
  matching, scoring, and command dispatch; the extracted helper owns requirement
  review sorting, recommendation copy, score caps, and hard-constraint actions.
- `src/mocks/handlers.ts` legacy no-growth budget tightened from 3,379 lines to
  3,050 lines.
- Resume section parsing and resume-review guard helpers moved out of
  `src/mocks/handlers.ts` into
  `src/mocks/handlers/resumeAnalysisSections.ts`.
- The main mock handler still owns analysis scoring, keyword extraction, and
  command dispatch; the extracted helper owns section normalization and
  hidden-text, keyword-list, unclear-capability, and generic-filler guards.
- `src/mocks/handlers.ts` legacy no-growth budget tightened from 3,656 lines to
  3,379 lines.
- Resume bullet-improvement prompt helpers moved out of
  `src/mocks/handlers.ts` into
  `src/mocks/handlers/resumeBulletPrompts.ts`.
- The main mock handler still owns keyword extraction and command dispatch; the
  extracted helper receives the keyword extractor explicitly and owns only
  prompt wording and bullet rewrite guidance.
- `src/mocks/handlers.ts` legacy no-growth budget tightened from 3,971 lines to
  3,656 lines.
- Settings help/status, backup, and support-report UI moved out of
  `src/pages/Settings.tsx` into `src/pages/SettingsSupportSections.tsx`.
- The main Settings page still owns modal state, backup handlers, support report
  actions, and scraper-health modal state; the extracted component owns only
  presentation.
- `src/pages/Settings.tsx` legacy no-growth budget tightened from 3,435 lines
  to 3,351 lines.
- ATS platform detection helpers moved out of `src/mocks/handlers.ts` into
  `src/mocks/handlers/atsPlatform.ts`; the main mock handler still owns
  application-form fill state and attempt IDs.
- `src/mocks/handlers/atsPlatform.test.ts` covers backend command wiring for
  platform detection, safe form-fill attempts, and unsafe-link rejection.
- `src/mocks/handlers.ts` legacy no-growth budget tightened from 4,013 lines to
  3,971 lines.
- Resume-builder mock normalizers, templates, HTML rendering, and text export
  helpers moved out of `src/mocks/handlers.ts` into
  `src/mocks/handlers/resumeBuilder.ts`.
- The main mock handler still owns mutable draft state and persistence; the
  extracted helper owns pure draft normalization and rendering behavior.
- `src/mocks/handlers/resumeBuilder.test.ts` covers command wiring for draft
  updates, HTML escaping, and text export through `mockInvoke`.
- `src/mocks/handlers.ts` legacy no-growth budget tightened from 4,253 lines to
  4,013 lines.
- The whole public GitHub wiki is now treated as external product docs in the
  harness and change contract.
- Product-copy and broad-audience harness path sets now include
  `src/mocks/handlers/marketIntelligence.ts` so market fixture copy stays
  scanned after extraction.
- Market intelligence mock fixtures moved to
  `src/mocks/handlers/marketIntelligence.ts`; command wiring and alert
  read-state persistence are covered by
  `src/mocks/handlers/marketIntelligence.test.ts`.
- Settings resume matching and match-review guide UI moved to
  `src/pages/SettingsResumeMatchingSection.tsx` with product-copy and
  broad-audience harness path coverage.
- `src/mocks/handlers.ts` legacy no-growth budget tightened from 5,302 lines to
  4,315 lines after earlier mock helper extractions.
- Settings connected job-source UI moved to
  `src/pages/SettingsConnectedJobSource.tsx` with source-boundary, product-copy,
  and broad-audience harness path coverage.
- Settings posting-risk and freshness UI moved to
  `src/pages/SettingsPostingRiskSection.tsx`.
- Mock salary benchmark and negotiation-note helpers moved to
  `src/mocks/handlers/salary.ts`.
- Mock ATS analysis DTOs/constants moved to `src/mocks/handlers/resumeAnalysis.ts`
  with sensor coverage for split suggestion category labels.
- ATS analyzer tests were split into focused modules for bullets, credentials,
  degrees, work arrangements, experience constraints, current-experience
  evidence, screening constraints, business equivalences, and
  service/healthcare equivalences.
- `src/mocks/handlers.test.ts` and
  `src-tauri/src/core/resume/ats_analyzer_tests.rs` are now both under the
  1,200-line harness target and no longer need legacy no-growth exemptions.
- Remaining oversized-file exceptions are `src/pages/ResumeBuilder.tsx`,
  `src/pages/ResumeOptimizer.tsx`,
  `src/pages/SetupWizard.tsx`,
  `src/pages/Resume.tsx`, `src-tauri/src/commands/automation.rs`,
  `scripts/harness/checks/privacy-logging.mjs`,
  `src-tauri/src/core/ghost/mod.rs`, and
  `src-tauri/src/core/salary/predictor.rs`.

## Next Best Work

1. Continue resume assistance only where it improves truthful local requirement
   review, hard-constraint handling, readable evidence, or next-action guidance.
2. Continue guided intake only where resume/profile suggestions stay optional,
   reviewed, local, and understandable for non-technical job seekers.
3. Continue job-card protection for stale, risky, duplicate, unclear, or
   pay-problem postings without treating local signals as employer predictions.
4. Continue cleanup only when it blocks critical functionality,
   privacy/security, verification, or user ease.
5. Run final broad verification only when remaining known work has current
   evidence.

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
