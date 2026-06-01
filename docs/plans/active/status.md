# Active Plan Status

Last updated: 2026-06-01.

Read this file before opening long active plans. It is the compact restart
surface for the active goal; the detailed plans remain authoritative for scope,
requirements, and history.

## Goal State

The repo-wide goal remains open. JobSentinel should keep moving toward zero
known errors, privacy leaks, stale docs, brittle tests, user-facing technical
assumptions, engineer-only defaults, and unverified claims.

All tracked files under `docs/plans/active/` are part of the active goal until
the work is completed, superseded, or moved out of active plans.

The user has authorized multiple sub-agents for isolated audits, research, and
implementation slices that can be worked without shared-state conflicts. Keep
their scope bounded, preserve user changes, close completed agents promptly,
and record actionable findings in this active-plan surface.

## Workstreams

| Workstream | State | Current focus | Source |
| ---------- | ----- | ------------- | ------ |
| Repo cleanup and quality sweep | Open | Reliability, stale-doc cleanup, harness debt, privacy/security review, broad verification | [Plan](repo-cleanup-and-quality-sweep.md) |
| Repo cleanup handoff | Open | Operational restart notes and verification evidence | [Handoff](repo-cleanup-handoff.md) |
| Guided job-search intake | Active | Implemented setup slices stay accurate; future work expands guided questioning and search support | [Plan](guided-job-search-intake.md) |
| Research-backed product improvements | Active | Ghost/stale detection, pay protection, long-term unemployment support, bias-aware routes, protective tone, local-first privacy | [Plan](research-backed-product-improvements.md) |

## Current Posture

- Latest local work closed the active-plan compaction debt by adding this
  compact status file, archiving older progress rows, and routing the plan
  index, harness guide, agent guide, and handoff toward the compact state.
- Current local work continues the sensor-modularity debt by extracting
  filesystem, tracked-artifact, dependency-ownership, source-structure,
  E2E-helper, product-framing, product-copy including technical-first user
  copy policy, release-promise, and expanded privacy-logging policy from
  `scripts/check-repo-bloat.mjs` into
  `scripts/harness/checks/` modules with focused tests. The latest harness
  slices add `scripts/harness/checks/ipc-minimization.mjs` so minimized
  profile, Dashboard, and job-import IPC contracts fail locally if they drift,
  and `scripts/harness/checks/docs-drift.mjs` so grant-facing docs, stale doc
  shape, version-promise, emoji-marker, and speculative-cloud checks have
  focused coverage outside the main bloat runner.
- Latest local harness-modularity work moves the technical-first user-copy
  sensor into `scripts/harness/checks/product-copy.mjs`, adds focused
  product-copy tests for Settings and Resume drift, and shrinks
  `scripts/check-repo-bloat.mjs` to roughly 4,200 lines.
- Latest local privacy-harness work moves raw private-query logging, scraper
  URL/query logging, scraper loop-error logging, unbounded response-body read,
  and raw local-path logging sensors into
  `scripts/harness/checks/privacy-logging.mjs`; focused privacy-logging tests
  now cover those checks and `scripts/check-repo-bloat.mjs` is roughly 4,100
  lines.
- Latest local privacy-harness work also moves backup-path, ML local-path,
  ML raw-error, ML path-doc, JobsWithGPT/LinkedIn Debug derive, and LinkedIn
  cookie-return sensors into `scripts/harness/checks/privacy-logging.mjs`;
  focused privacy-logging coverage is now 12 tests and
  `scripts/check-repo-bloat.mjs` is roughly 4,000 lines.
- Latest local credential-privacy harness work moves raw email/webhook error,
  secret-bearing Debug derive, credential-key echo, credential-storage error,
  LinkedIn credential guardrail, webhook credential validation, renderer
  credential-read, and config-export redaction sensors into
  `scripts/harness/checks/privacy-logging.mjs`; focused privacy-logging
  coverage is now 17 tests and `scripts/check-repo-bloat.mjs` is under 3,900
  lines.
- Latest local notification/source-health privacy harness work moves
  Telegram bot-token request, webhook-token request, provider error body,
  notification service error detail, JobsWithGPT smoke-endpoint error, and
  source-check result-error sensors into
  `scripts/harness/checks/privacy-logging.mjs`; focused privacy-logging
  coverage is now 20 tests and `scripts/check-repo-bloat.mjs` is roughly
  3,800 lines.
- Latest local URL/import privacy harness work moves raw URL logging, URL
  error display, path/query error display, command setup/config URL display,
  import redirect display, job-import logging, import HTTP error, and
  non-public IP echo sensors into `scripts/harness/checks/privacy-logging.mjs`;
  focused privacy-logging coverage is now 24 tests and
  `scripts/check-repo-bloat.mjs` is roughly 3,700 lines.
- Latest local automation/notification privacy harness work moves raw
  automation screening-question logging, automation form-result data,
  automation browser-error detail, and notification job-title logging sensors
  into `scripts/harness/checks/privacy-logging.mjs`; focused privacy-logging
  coverage is now 26 tests and `scripts/check-repo-bloat.mjs` is 3,609 lines.
- Latest local frontend error/report privacy harness work moves unsafe
  frontend error-report storage, raw error-helper output, raw shared and direct
  frontend error logging, unsafe stored-report parsing, and hardcoded error
  export-version sensors into `scripts/harness/checks/privacy-logging.mjs`;
  focused privacy-logging coverage is now 29 tests and
  `scripts/check-repo-bloat.mjs` is 3,496 lines.
- Latest local backend command privacy harness work moves resume path/name/DTO
  exposure, resume command error-detail, application tracking command
  error-detail, automation command error-detail, sensitive command
  error-detail, and utility command error-detail sensors into
  `scripts/harness/checks/privacy-logging.mjs`; focused privacy-logging
  coverage is now 31 tests and `scripts/check-repo-bloat.mjs` is 3,310 lines.
- Latest local import/bookmarklet/scheduler privacy harness work moves
  user-data privacy logging, scheduler job-content logging, scheduler scraper
  error-detail, import/bookmarklet command error-detail, bookmarklet import
  metadata logging, scoring cache job-hash logging, scheduler scoring privacy,
  residual core privacy, manual bookmarklet JSON error, bookmarklet auth, and
  bookmarklet token-header sensors into
  `scripts/harness/checks/privacy-logging.mjs`; focused privacy-logging
  coverage is now 34 tests and `scripts/check-repo-bloat.mjs` is 3,105 lines.
- Latest local feedback/report privacy harness work moves stale feedback
  webhook sanitizer, structured debug-log sanitization, feedback-file save
  sanitization, and raw support-open error sensors into
  `scripts/harness/checks/privacy-logging.mjs`; focused privacy-logging
  coverage is now 35 tests and `scripts/check-repo-bloat.mjs` is 3,052 lines.
- Latest local frontend feedback/report presentation harness work moves raw
  feedback debug-event details, technical company-label report copy, raw
  problem-history context display, raw error-boundary detail display,
  technical recovery copy, non-protective score copy, and legacy
  allowlist/blocklist preference copy sensors into
  `scripts/harness/checks/product-copy.mjs`; focused product-copy coverage is
  now 10 tests and `scripts/check-repo-bloat.mjs` is 2,947 lines.
- Latest local broad-audience fixture harness work moves engineer-first
  example, generic scraper fixture, and salary-audience drift sensors into
  `scripts/harness/checks/broad-audience-fixtures.mjs`; focused
  broad-audience fixture coverage is now 6 tests. The latest slices also
  broadens generic mock location defaults and Rust Application Assist profile
  examples away from old `John Doe`, `Jane Doe`, GitHub, San Francisco, and
  New York fixtures, and rebases scoring location fixtures away from
  San Francisco and New York defaults, with sensor coverage for those paths.
- Latest local developer-doc drift harness work moves stale test-guidance,
  developer testing/architecture/maintenance doc marker, active-doc marker,
  E2E fixed-wait, getting-started tooling, macOS development, and SQLite
  configuration doc sensors into `scripts/harness/checks/docs-drift.mjs`;
  focused docs-drift coverage is now 8 tests and `scripts/check-repo-bloat.mjs`
  is 2,325 lines.
- Latest local feature-doc drift harness work moves bookmarklet status,
  feature metadata/glyph, synonym/remote-preference doc, Market Intelligence,
  Resume Matcher, Salary AI, smart scoring, notifications, active user-doc,
  maintained-doc, developer-layout, and application-tracking doc drift sensors
  into `scripts/harness/checks/docs-drift.mjs`; focused docs-drift coverage is
  now 11 tests and `scripts/check-repo-bloat.mjs` is 2,030 lines.
- Latest local source-boundary harness work moves scraper/source-health doc,
  source-health plain-language, LinkedIn credential/automation/notification
  boundary, cache-usage doc, direct-open fallback, and discontinued source
  sensors into `scripts/harness/checks/source-boundaries.mjs`; focused
  source-boundary coverage is now 5 tests and `scripts/check-repo-bloat.mjs`
  is 1,826 lines.
- Latest local frontend-contract harness work moves user-data, deep-link,
  feedback, and resume optimizer mock-drift sensors, runtime invoke mock
  coverage, unsafe Resume Optimizer JSON parsing, ATS keyword shape, salary,
  interview, resume match, and resume E2E seed sensors into
  `scripts/harness/checks/frontend-contracts.mjs`; focused frontend-contract
  coverage is now 6 tests and `scripts/check-repo-bloat.mjs` is 1,624 lines.
- Latest local source-quality harness work moves raw salary command logging,
  production/frontend glyph and lint-suppression sensors, backend and
  notification scoring glyph sensors, stale Rust stub checks, database-log
  glyph checks, opaque command unit-error checks, unsafe rendered JSON parsing
  checks, and unsafe Settings webhook/partial-save checks into
  `scripts/harness/checks/source-quality.mjs`; focused source-quality coverage
  is now 6 tests and `scripts/check-repo-bloat.mjs` is 1,367 lines.
- Latest local security-doc harness work moves stale notification webhook docs,
  security doc marker drift, URL validation security reference drift, XSS
  security doc drift, keyring credential docs, keyring migration retry-safety,
  credential architecture comments, and notification preference doc shape
  checks into `scripts/harness/checks/security-docs.mjs`; focused
  security-doc coverage is now 7 tests and `scripts/check-repo-bloat.mjs` is
  1,231 lines.
- Latest local repo-integrity harness work moves JobSentinel project detection,
  docs-image reference checks, duplicate screenshot capture checks, and
  contradictory release-plan status checks into
  `scripts/harness/checks/repo-integrity.mjs`; focused repo-integrity coverage
  is now 4 tests and `scripts/check-repo-bloat.mjs` is 1,176 lines.
- Latest local lifecycle harness work adds the five-tuple harness audit and
  `npm run harness:session`, a tested one-command restart snapshot for branch
  state, latest commit, active plan count, harness module/test counts,
  bloat-runner size, audit path, and next-best work.
- Latest local five-tuple harness work adds `.nvmrc`, `rust-toolchain.toml`,
  runtime-pin doctor checks, `docs/plans/index.json`, and
  `npm run harness:score`, then wires the score into `harness:session` and
  `harness:check` so both WalkingLabs five-tuple models stay at 100/100 for
  repo-managed harness evidence.
- Latest local harness benchmark work adds `npm run harness:benchmark`, a
  tested portable before/after report for score, session metrics, active next
  work, and harness-tuning recommendations, modeled on the WalkingLabs
  benchmark/report scripts without generating tracked report files by default.
- Latest local privacy-logging harness work moves privacy/logging violation
  orchestration out of `scripts/check-repo-bloat.mjs` and into
  `collectPrivacyLoggingViolations`; focused privacy-logging coverage now
  verifies the collector and `scripts/check-repo-bloat.mjs` is 564 lines.
- Latest local broad-audience fixture work replaces engineer-first defaults in
  `SkillCategoryFilter`, Cow utility, API-contract, scraper-construction, and
  ignored live-scraper tests with operations, support, accounting, and care
  examples; the broad-audience sensor now rejects those old fixtures.
- Latest local broad-audience seed work removes tech-brand defaults from
  `config/config.example.json` and broad non-engineering profile URL seeds,
  reorders `profiles/README.md` to match the broad-first UI posture, replaces
  engineer-first developer-doc examples, and moves salary-location fixtures off
  San Francisco, Seattle, and Austin defaults.
- Latest local docs-drift harness work moves the docs-drift violation messages
  out of `scripts/check-repo-bloat.mjs` and into
  `scripts/harness/checks/docs-drift.mjs` through
  `collectDocsDriftViolations`; focused docs-drift coverage now verifies the
  collector.
- Latest local E2E reliability work removes the hard sleep from keyboard
  search-focus coverage and expands the fixed-wait sensor from page objects to
  every active Playwright runtime file, while keeping screenshot-capture waits
  out of the normal E2E path.
- Latest local privacy work removes raw automation dropdown-answer logging and
  raw frontend error forwarding, then adds bloat sensors and `errorReporting`
  unit coverage so those regressions fail locally.
- Latest local UX work makes saving a safe local report the primary feedback
  path, adds safe-report copy/save actions to modal crash recovery, updates
  Quick Start notification setup wording to match the current wizard, simplifies
  problem-history/export labels, makes the saved-report success path
  account-optional, and rewords generated reports with plain support language.
- Latest local zero-technical and broad-audience work adds a close path and
  plain recovery copy to Settings load failure, gives the empty application
  tracker clear "Go to Jobs" and "Import Job" paths, improves the Dashboard
  no-jobs recovery state, hides browser-import connection details under
  Advanced, explains location lookup without protocol jargon, broadens company
  suggestions and placeholders beyond technology, refreshes broad resume/mock
  ATS fixtures, and aligns E2E labels with the visible "Skills Interview" copy.
- Latest local zero-technical UX work keeps job import from dead-ending when a
  preview is missing details, wires Prepare Form into visible dashboard job
  cards, adds a Set Up Profile recovery action, and replaces stale
  `Settings > Application Assist` guidance with the sidebar Application Assist
  path in frontend and Rust recovery copy.
- Latest local support/privacy work makes saved support reports local-only in
  the UI, removes GitHub-first and shared-folder wording from the main support
  path, renames visible safe debug-report copy to safe support-report copy,
  broadens generic Application Assist profile labels beyond code profiles, and
  hardens the Rust support-report sanitizer for full URLs plus common token,
  password, and bookmarklet-token forms.
- Latest local bookmarklet privacy work removes the import helper token from
  renderer-facing config and mocks, copies the browser button through a Rust
  command, and adds IPC-minimization coverage so bookmarklet auth tokens do
  not drift back into React state.
- Latest local Application Assist privacy work keeps saved resume file paths
  out of renderer-facing profile IPC and UI, shows only a basename, preserves
  existing resume paths unless the user replaces or clears them, and adds
  IPC-minimization coverage for resume-path DTO drift.
- Latest local zero-technical copy work makes screening-answer setup ask for
  "question wording to look for", softens optional email setup language, labels
  USAJobs access as an access code with no coding needed, and removes
  GitHub-first wording from Deep Links troubleshooting.
- Latest local recovery-copy work replaces stale database recovery directions,
  separates cancelled settings restores from unreadable backup files, makes bad
  connection-link guidance provider-first without protocol or port jargon,
  keeps advanced raw problem export behind support wording, and gives failed
  job-link imports a browser-address-bar action instead of Schema.org or URL
  terminology.
- Latest local broad-audience source work keeps tech-heavy RemoteOK,
  WeWorkRemotely, HN Who's Hiring, Dice, and BuiltIn suggestions tied to
  technical searches instead of every remote or city-based search. It also
  broadens synonym matching and docs for healthcare, office, operations,
  public-sector, customer support, accounting, education, retail, and common
  non-software tools such as EMR/EHR, LMS, CRM, POS, inventory, QuickBooks,
  scheduling, compliance, and care coordination.
- Latest local source-health UX work adds plain "what to do" guidance to job
  source health rows, replaces connection-warning and check-speed jargon with
  support-action copy, and removes Cloudflare-protection wording from
  SimplyHired/Glassdoor setup warnings in favor of search-link or browser-link
  recovery paths.
- Latest local email-setup UX work changes the primary email alert path from
  server/password setup toward provider-first app-password guidance, hides
  sending server details behind Advanced, and updates notification docs so
  non-technical users only need manual server details when their provider gives
  them.
- Latest local settings backup UX work replaces visible `Config` and
  `credentials` backup/restore wording with settings-backup and saved
  connection-detail language, and adds bloat coverage so the old technical
  copy cannot drift back into Settings.
- Latest local broad-audience fixture work rebalanced generic market
  intelligence, notifications, config, database, ATS, ghost detection, salary,
  scoring, generic scraper adapters, command, frontend mock, sample JSON
  Resume, company fallback, bookmarklet, import, dashboard search, score modal,
  Application Assist E2E, and mock data examples toward care coordination,
  public health, operations, training, inventory planning, account management,
  and customer support; it also extends the bloat sensor so the generic
  market-intelligence, generic scraper, salary-normalization, code-profile,
  sample-resume, bookmarklet, search-history, and score-modal fixture paths
  cannot drift back to software-only examples outside explicit branch coverage.
- Latest local IPC minimization work added narrow application profile
  existence/preview commands, canonicalizes imported URLs before
  preview/hash/storage, returns only `{ jobId }` from job import, and moves
  Dashboard to a minimal preferences DTO instead of full config.
- The previous local slice closed the hardcoded harness-policy debt by moving
  required harness files, policy snippets, and README reference-source coverage
  into `docs/harness/manifest.json`.
- Harness delivery, release preflight, external-AI provider scanning, and
  environment doctor platform/E2E readiness have current focused coverage.
- Active progress history older than 2026-05-31 is archived in
  [progress history](../archive/progress-history-2026-05-28-to-2026-05-29.md).
- Current branch state may include local commits not pushed to `origin/main`.
  Use `git status --short --branch` as live evidence before pushing or
  reporting remote status.

## Next Best Work

1. Continue broad-audience fixture audit on screenshot assets, profile/config
   seeds, developer-doc examples, and salary location defaults, while
   preserving tech-specific cases only when they test explicit branch behavior
   or source-realism parser contracts.
2. Continue splitting oversized harness modules only where the ownership
   boundary is clear; the main bloat runner is now 564 lines after docs-drift
   and privacy-logging orchestration moved into modules.
3. Continue zero-technical-knowledge UX review across setup, settings,
   recovery, feedback, empty states, and error screens.
4. Continue broad-audience review so non-technical and technical job searches
   both feel first-class.
5. Continue backend/scraper and frontend privacy-edge review.
6. Continue the next zero-technical-knowledge UX audit area outside
   support/reporting.
7. Run final broad verification only when the remaining known work has evidence.

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
