# Active Plan Status

Last updated: 2026-05-31.

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
  `scripts/harness/checks/` modules with focused tests.
- Latest local privacy work removes raw automation dropdown-answer logging and
  raw frontend error forwarding, then adds bloat sensors and `errorReporting`
  unit coverage so those regressions fail locally.
- Latest local UX work makes saving a safe local report the primary feedback
  path, adds safe-report copy/save actions to modal crash recovery, updates
  Quick Start notification setup wording to match the current wizard, simplifies
  problem-history/export labels, makes the saved-report success path
  account-optional, and rewords generated reports with plain support language.
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

1. Continue splitting oversized mixed sensors, especially docs-drift,
   privacy-logging, fixture-quality, broad-audience, and technical-first copy
   checks still inside `scripts/check-repo-bloat.mjs`.
2. Continue zero-technical-knowledge UX review across setup, settings,
   recovery, feedback, empty states, and error screens.
3. Continue broad-audience review so non-technical and technical job searches
   both feel first-class.
4. Continue backend/scraper and frontend privacy-edge review.
5. Continue the next zero-technical-knowledge UX audit area outside
   support/reporting.
6. Run final broad verification only when the remaining known work has evidence.

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
