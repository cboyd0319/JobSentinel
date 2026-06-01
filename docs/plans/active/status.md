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
  E2E-helper, product-framing, product-copy, release-promise, and initial
  privacy-logging policy from `scripts/check-repo-bloat.mjs` into
  `scripts/harness/checks/` modules with focused tests. The latest harness
  slice adds `scripts/harness/checks/ipc-minimization.mjs` so minimized profile,
  Dashboard, and job-import IPC contracts fail locally if they drift.
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

1. Continue broad-audience fixture audit in less obvious fixture paths outside
   current sensors, while preserving tech-specific cases only when they test
   explicit branch behavior or source-realism parser contracts.
2. Continue splitting oversized mixed sensors, especially docs-drift,
   privacy-logging, fixture-quality, broad-audience, and technical-first copy
   checks still inside `scripts/check-repo-bloat.mjs`.
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
