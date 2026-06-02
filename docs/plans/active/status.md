# Active Plan Status

Last updated: 2026-06-02.

Read this file before opening long active plans. It is the current restart
surface for the active goal; detailed history remains in the active plans,
handoff, tech-debt tracker, and archived progress files.

## Goal State

The repo-wide goal remains open. JobSentinel should keep moving toward zero
known errors, privacy leaks, stale docs, brittle tests, user-facing technical
assumptions, engineer-only defaults, and unverified claims.

All tracked files under `docs/plans/active/` are part of the active goal until
the work is completed, superseded, or moved out of active plans.

The user has authorized multiple sub-agents for isolated audits, research, and
implementation slices that can run without shared-state conflicts. Keep scopes
bounded, preserve user changes, close completed agents promptly, and record
actionable findings in this active-plan surface or the relevant plan.

## Workstreams

| Workstream | State | Current focus | Source |
| ---------- | ----- | ------------- | ------ |
| Repo cleanup and quality sweep | Open | Reliability, stale-doc cleanup, harness debt, privacy/security review, broad verification | [Plan](repo-cleanup-and-quality-sweep.md) |
| Repo cleanup handoff | Open | Operational restart notes and verification evidence | [Handoff](repo-cleanup-handoff.md) |
| Guided job-search intake | Active | Implemented setup slices stay accurate; future work expands guided questioning and search support | [Plan](guided-job-search-intake.md) |
| Research-backed product improvements | Active | Ghost/stale detection, pay protection, long-term unemployment support, bias-aware routes, protective tone, local-first privacy | [Plan](research-backed-product-improvements.md) |

## Current Posture

- Branch has multiple local commits ahead of `origin/main`. Use
  `git status --short --branch` for live evidence before committing, pushing,
  or reporting remote state.
- Current local zero-technical setup-copy cleanup makes Slack alerts explicit
  opt-in after a connection link is pasted, changes manual email and USAJobs
  setup labels to plain user wording, masks outside job-source previews to the
  site name until the user chooses to show the full link, and changes
  feedback/resume review copy away from diagnostic and prescriptive language.
  Focused verification passed: `npx vitest run
  src/pages/Settings.test.tsx src/pages/ResumeOptimizer.test.tsx
  src/components/feedback/DebugInfoPreview.test.tsx` passed 55 tests,
  `npm run test:scripts` passed 464 tests, `npm run lint:docs` passed,
  `npm run lint` passed, `npm run lint:bloat` passed, and `git diff --check`
  passed.
- Current local alert-filter copy cleanup replaces old alert-strength wording
  with `How picky alerts are`, updates notification docs away from
  scoring internals, and adds product-copy sensors against the old label and
  interim jargon. Focused verification passed: `npx vitest run
  src/components/NotificationPreferences.test.tsx` passed 45 tests,
  `node --test scripts/check-product-copy.test.mjs` passed 36 tests, `npm run
  lint:docs` passed, and `git diff --check` passed.
- Current local Resume Match action-copy cleanup renames the old tailor-resume
  button to `Review in Resume Builder`, matching the actual action and avoiding
  optimization-style resume wording. Product-copy sensors now reject the old
  `Tailor Resume for This Job` label. Focused verification passed: `npx vitest
  run src/pages/ResumeOptimizer.test.tsx` passed 14 tests and `node --test
  scripts/check-product-copy.test.mjs` passed 36 tests.
- Current local App Problem History support-copy cleanup renames the old
  detailed-report button to `Save Extra Local Details` and clarifies that extra
  local details stay on the user's computer until the user chooses to share
  them. Product-copy sensors now reject the old `Save Detailed Local Report`
  label. Focused verification passed: `npx vitest run
  src/components/ErrorLogPanel.test.tsx` passed 34 tests and `node --test
  scripts/check-product-copy.test.mjs` passed 36 tests.
- Current local source-status wording cleanup replaces remaining user-facing
  `source health` wording with `source status` in README, roadmap, source
  guides, and ScraperHealthDashboard log context. Product-copy sensors now
  reject source-health drift in user-facing surfaces. Focused verification
  passed: `npx vitest run src/components/ScraperHealthDashboard.test.tsx`
  passed 56 tests, `node --test scripts/check-product-copy.test.mjs` passed 36
  tests, targeted stale-phrase search found no old live wording, `npm run
  lint:bloat` passed, and `npm run lint:docs` passed.
- Current local user-doc help-heading cleanup replaces remaining user-facing
  `Troubleshooting` headings with plain "When Something Does Not Work" or
  source-status help language across Quick Start, Deep Links, feature guides,
  and source docs. Product-copy sensors now reject those headings and table
  labels in user-facing docs. Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs` passed 36 tests, targeted stale-heading
  search found no old live headings in user-facing docs, `npm run lint:bloat`
  passed, and `npm run lint:docs` passed.
- Current local sidecar-finding cleanup replaces restricted-automation source
  policy wording, command-first profile customization guidance, resume-app
  export placeholder/error copy, and guarantee framing in saved-secret docs.
  Product-copy sensors now reject those exact drifts across README, roadmap,
  profile docs, Resume Match, and saved-secret docs. Focused verification
  passed: `npx vitest run src/pages/ResumeOptimizer.test.tsx` passed 14 tests,
  `node --test scripts/check-product-copy.test.mjs` passed 35 tests, targeted
  stale-phrase search found no old live wording in touched files, `npm run
  lint:bloat` passed, and `npm run lint:docs` passed.
- Current local README and source-guide wording cleanup replaces internal
  bounded-request, source-specific-boundary, retry-helper, and source-boundary
  flow wording with plain source-check, allowed-use, wait-between-checks, and
  local-save wording. Product-copy sensors now reject the old implementation
  phrases on the front door and source guide. Focused verification passed:
  `node --test scripts/check-product-copy.test.mjs` passed 35 tests,
  `npm run lint:docs` passed, targeted stale-phrase search found no old live
  wording in README or source docs, and `npm run lint:bloat` passed.
- Current local Deep Links browser-search cleanup changes automatic-check copy
  to browser-review and scheduled-source-check wording. Product-copy sensors
  now reject `does not check automatically` and `automatic checking` drift in
  addition to scan/automation wording. Focused verification passed: `npx vitest
  run src/components/DeepLinkGenerator.test.tsx` passed 4 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 34 tests, targeted stale-phrase
  search found no old live wording in the Deep Links component or guide, and
  `npm run lint:bloat` passed.
- Current local scheduled-check wording cleanup changes remaining USAJobs and
  Quick Start automatic-check copy to scheduled/next-step wording. Product-copy
  sensors now reject newline-hidden `automatic USAJobs checks`, Quick Start
  `watching the allowed sources`, and `Here's what happens automatically`
  drift. Focused verification passed: `npx vitest run
  src/pages/Settings.test.tsx`, `node --test
  scripts/check-product-copy.test.mjs`, targeted stale-phrase search found no
  old live wording in Settings or Quick Start, and `npm run lint:bloat`.
- Current local Telegram alert setup copy cleanup removes visible automatic-alert,
  bot-command, and chat-number wording from Settings and the Notifications
  guide. Telegram stays an optional chat-alert path, but the primary UI no
  longer teaches `@BotFather`, `/newbot`, or `@userinfobot` setup steps.
  Product-copy sensors now reject those drift phrases. Focused verification
  passed: `npx vitest run src/pages/Settings.test.tsx`, `node --test
  scripts/check-product-copy.test.mjs`, targeted stale-phrase search found no
  old live wording in Settings or the Notifications guide, `npm run lint:docs`,
  and `npm run test:scripts`. Broader verification passed: `npm run
  lint:bloat`, `npm run lint:docs`, `npm run lint`, and `git diff --check`.
- Current local telemetry-comment cleanup removes analytics-service and
  automatic-error-reporting language from web-vitals and error-boundary comments
  so comments match Rule 0 local-first behavior. Product-copy sensors now reject
  those drift phrases. Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs`, `npx vitest run
  src/components/ErrorBoundary.test.tsx
  src/components/ComponentErrorBoundary.test.tsx
  src/components/PageErrorBoundary.test.tsx
  src/components/ModalErrorBoundary.test.tsx src/utils/vitals.test.ts`,
  targeted stale-phrase search found no old wording in touched files, and
  `git diff --check`. Broader verification passed: `npm run lint:bloat`,
  `npm run lint:docs`, `npm run test:scripts`, `npm run lint`, and
  `git diff --check`.
- Current local Resume Builder doc attachment-wording follow-up changes upload
  preview and ready-to-upload phrasing to application-preview and attach
  wording. Product-copy sensors now reject the old Resume Builder doc phrases.
  Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs`, `npm run lint:docs`, targeted
  stale-phrase search found no old wording in the feature doc, and
  `git diff --check`. Broader verification passed: `npm run lint:bloat`,
  `npm run lint:docs`, `npm run test:scripts`, `npm run lint`, and
  `git diff --check`.
- Current local Smart Scoring doc resume-wording follow-up changes the remaining
  uploaded-resume phrasing to added-resume phrasing in the feature guide.
  Product-copy sensors now reject the old Smart Scoring doc wording. Focused
  verification passed: `node --test scripts/check-product-copy.test.mjs`,
  `npm run lint:docs`, targeted stale-phrase search found no old wording in the
  feature doc, and `git diff --check`. Broader verification passed:
  `npm run lint:bloat`, `npm run lint:docs`, `npm run test:scripts`,
  `npm run lint`, and `git diff --check`.
- Current local Application Profile resume-file help follow-up changes the
  tooltip from generic application-review wording to local, user-controlled
  attachment wording. Product-copy sensors now reject the old ProfileForm
  tooltip. Focused verification passed: `npx vitest run
  src/components/automation/ProfileForm.test.tsx`, `node --test
  scripts/check-product-copy.test.mjs`, targeted stale-phrase search found no
  old visible wording in ProfileForm, and `git diff --check`. Broader
  verification passed: `npm run lint:bloat`, `npm run lint:docs`,
  `npm run test:scripts`, `npm run lint`, and `git diff --check`.
- Current local Application Assist resume-file copy follow-up changes the manual
  task label from resume-upload wording to user-controlled resume-file wording.
  Product-copy sensors now reject the old Application Preview label. Focused
  verification passed: `npx vitest run
  src/components/automation/ApplicationPreview.test.tsx`, `node --test
  scripts/check-product-copy.test.mjs`, targeted stale-phrase search found no
  old visible wording in Application Preview, and `git diff --check`. Broader
  verification passed: `npm run lint:bloat`, `npm run lint:docs`,
  `npm run test:scripts`, `npm run lint`, and `git diff --check`.
- Current local Resume Builder add-copy follow-up changes import-skill recovery
  copy from upload wording to add wording so users do not infer a cloud transfer
  for local resume review. Product-copy sensors now reject the old Resume
  Builder upload phrasing. Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs`, targeted stale-phrase search found no
  old visible wording in Resume Builder, and `git diff --check`. Broader
  verification passed: `npm run lint:bloat`, `npm run lint:docs`,
  `npm run test:scripts`, `npm run lint`, and `git diff --check`.
- Current local Resume Match add-copy follow-up changes local Resume Match
  surfaces and feature docs from choose/upload wording to choose/add wording.
  Product-copy sensors now reject the old local-resume upload phrasing in
  `ResumeOptimizer`, `ResumeMatchScoreBreakdown`, and the Resume Match feature
  doc. Focused verification passed: `npx vitest run
  src/pages/ResumeOptimizer.test.tsx
  src/components/ResumeMatchScoreBreakdown.test.tsx`, `node --test
  scripts/check-product-copy.test.mjs`, and targeted stale-phrase search found
  no old visible wording in the touched surfaces. Broader verification passed:
  `npm run lint:bloat`, `npm run lint:docs`, `npm run test:scripts`,
  `npm run lint`, and `git diff --check`.
- Current local resume-add copy follow-up changes local Resume page and Settings
  resume-match copy from upload/uploaded wording to add/added wording so users
  do not infer a cloud transfer for local resume review. Product-copy sensors
  now reject the old local-resume upload labels. Focused verification passed:
  `npx vitest run src/pages/Resume.test.tsx src/pages/Settings.test.tsx`,
  `node --test scripts/check-product-copy.test.mjs`, and targeted search found
  old wording only in sensors, fixtures, or negative assertions for the touched
  paths. Broader local checks also passed: `npm run lint:bloat`,
  `npm run lint:docs`, `npm run test:scripts`, `npm run lint`, and
  `git diff --check`.
- Current local resume-error copy follow-up fixes shared error precedence so
  resume-not-found and resume-parsing failures are treated as resume-review
  problems instead of missing job pages or changed job websites. It also
  replaces upload/service wording with local-first resume-review copy. Focused
  verification passed: `npx vitest run src/utils/errorMessages.test.ts`,
  `node --test scripts/check-product-copy.test.mjs`, and targeted stale-phrase
  search found old wording only in sensor fixtures or negative assertions.
  Broader local checks also passed: `npm run lint:bloat`,
  `npm run lint:docs`, `npm run test:scripts`, `npm run lint`, and
  `git diff --check`.
- Current local Browser Import doc/code follow-up removes remaining
  user-visible `import helper` wording from `docs/BOOKMARKLET.md` and the
  generated browser-button failure alert, then adds Rust and product-copy
  coverage against drift. Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs`, `cargo test --lib bookmarklet`,
  `cargo fmt --all -- --check`, and targeted search found no user-visible
  stale helper phrases in the Browser Import doc, UI, or generated alert.
  Broader local checks also passed: `npm run lint:bloat`,
  `npm run lint:docs`, `npm run test:scripts`, `npm run lint`, and
  `git diff --check`.
- Latest committed frontend verification evidence: `npm run test:run` passed
  110 Vitest files and 2637 tests, `npm run build` passed in 4.13 seconds, and
  `npm run test:scripts` passed 454 script tests.
- Latest committed backend verification evidence: `cargo fmt --all -- --check`
  passed, `cargo test --lib` passed 2489 tests with 21 ignored, and
  `cargo clippy -- -D warnings` reported no issues from `src-tauri`.
- Latest committed security/dependency evidence: `npm run lint:security`,
  `npm run lint:architecture`, `npm run lint:external-ai`,
  `npm run lint:tauri-invokes`, `npm audit --audit-level=moderate`, and
  `cargo deny check advisories` passed. `cargo audit` exited 0 with the known
  allowed upstream/transitive Rust advisory warnings tracked in `SEC-002`.
- Latest committed E2E evidence: `npm run test:e2e:smoke:budget` passed in
  6.22 seconds, and `npm run test:e2e:all:budget` passed 252 Chromium and
  WebKit tests in 123.15 seconds against the 240-second budget.
- Latest committed broad-audience and Rule 0 slice fixes read-only sub-agent
  findings: support-report privacy overclaims, visible scoring jargon, Telegram
  setup jargon, approved job-source feed wording, wrapper Rule 0 snippets,
  feature privacy-label freshness, and active-plan status compaction.
- Latest committed verification for that slice: `npm run harness:check`,
  `npm run test:scripts`, `npm run lint:docs`, `npm run lint:bloat`,
  `npm run lint`, focused Vitest for eight affected frontend/service test
  files, and `git diff --check` passed. Focused Vitest passed 178 tests.
- Committed settings/support copy slice changes manual email setup labels,
  USAJobs jobs-to-check labels, connected-source review labels, and the detailed
  local support-report action. Verification passed: focused Vitest for Settings
  and ErrorLogPanel passed 71 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, `npm run lint:bloat`,
  `npm run harness:check`, `npm run lint:docs`, `npm run test:scripts` passed
  454 script tests, `npm run lint`, and `git diff --check` passed.
- Committed feedback/recovery tooltip slice changes the detailed local
  support report tooltip and Browser Button docs away from support-only wording
  and adds product-copy coverage. Verification passed: focused ErrorLogPanel
  Vitest passed 34 tests, `node --test scripts/check-product-copy.test.mjs`
  passed 32 tests, and `npm run lint:bloat` passed.
- Committed detailed-report privacy slice makes frontend error-report JSON
  export re-sanitize stored records before writing, adds a regression test for
  private job-search details in detailed local report output, and adds a privacy
  sensor against raw `errors: this.errors` export drift. Focused verification
  passed: `npx vitest run src/utils/errorReporting.test.ts` passed 14 tests,
  `node --test scripts/check-privacy-logging.test.mjs` passed 42 tests, `npm
  run lint:bloat`, `npm run harness:check`, `npm run lint:docs`, `npm run
  test:scripts` passed 455 script tests, `npm run lint`, and `git diff --check`
  passed.
- Committed feedback-flow copy slice changes optional GitHub sharing from
  maintainer/issue wording to online-help wording, keeps the local safe support
  report path primary, and adds product-copy guards against the old phrases.
  Focused verification passed: feedback SubmitOptions and SuccessScreen Vitest
  passed 5 tests, `node --test scripts/check-product-copy.test.mjs` passed 32
  tests, `npm run lint:bloat`, `npm run test:scripts` passed 455 script tests,
  `npm run lint:docs`, `npm run lint`, and `git diff --check` passed.
- Committed support-report label slice changes generated support-report
  section labels from support-only wording to safe app details, and adds a
  product-copy guard against those labels returning. Focused verification
  passed: `npx vitest run src/services/feedbackService.test.ts` passed 12
  tests, `node --test scripts/check-product-copy.test.mjs` passed 32 tests,
  `npm run lint:bloat`, `npm run test:scripts` passed 455 script tests, `npm
  run lint:docs`, `npm run lint`, and `git diff --check` passed.
- Committed detailed-report tooltip slice changes the detailed local report
  tooltip from maintainer wording to plain help wording and adds product-copy
  coverage against the old tooltip. Focused verification passed: `npx vitest run
  src/components/ErrorLogPanel.test.tsx` passed 34 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, `npm run lint:bloat`,
  `npm run test:scripts` passed 455 script tests, `npm run lint:docs`, `npm run
  lint`, and `git diff --check` passed.
- Committed user-help docs slice changes broken-link and invalid saved-detail
  recovery docs away from maintainer/GitHub assumptions, keeps the safe support
  report path primary, and adds product-copy coverage against the old phrases.
  Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, `npm run lint:bloat`,
  `npm run test:scripts` passed 455 script tests, `npm run lint:docs`,
  `npm run harness:check`, and `git diff --check` passed.
- Committed README/settings help-copy slice changes front-door support copy
  away from maintainer GitHub assumptions and replaces the visible Settings
  `Troubleshooting` heading with `Help and Status`. Product-copy coverage now
  rejects the old phrases. Focused verification passed: `npx vitest run
  src/pages/Settings.test.tsx` passed 38 tests, and `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests. Broader verification
  passed: `npm run lint:bloat`, `npm run test:scripts` passed 455 script tests,
  `npm run lint:docs`, `npm run lint`, `npm run harness:check`, and
  `git diff --check`.
- Committed docs sidecar copy slice applies read-only agent findings across
  README download/data-boundary wording, Quick Start install and local-file
  wording, Deep Links contributor/browser-add-on wording, Browser Button privacy
  wording, notification and credential docs, public issue templates, SECURITY,
  and CODE_OF_CONDUCT. Product-copy sensors now reject the old phrases. Focused
  verification passed: `node --test scripts/check-product-copy.test.mjs`
  passed 32 tests, `npm run lint:bloat`, `npm run test:scripts` passed 455
  script tests, `npm run lint:docs`, and `git diff --check`.
- Committed frontend sidecar copy slice applies read-only agent findings
  across feedback sharing, success-step, Settings source, setup source,
  source-status table, Resume Builder/Optimizer recovery, Browser Button, and
  error-boundary detail labels. Product-copy sensors now reject the old phrases.
  Focused verification passed: `npx vitest run
  src/components/feedback/SubmitOptions.test.tsx
  src/components/feedback/SuccessScreen.test.tsx src/pages/Settings.test.tsx
  src/pages/SetupWizard.test.tsx
  src/components/ScraperHealthDashboard.test.tsx
  src/pages/ResumeOptimizer.test.tsx
  src/components/BookmarkletGenerator.test.tsx
  src/components/ErrorBoundary.test.tsx
  src/components/PageErrorBoundary.test.tsx
  src/components/ModalErrorBoundary.test.tsx
  src/components/ComponentErrorBoundary.test.tsx` passed 214 tests,
  `node --test scripts/check-product-copy.test.mjs` passed 32 tests,
  `npm run test:scripts` passed 455 script tests, `npm run lint:bloat`,
  `npm run lint`, and `git diff --check`.
- Committed shared recovery details slice changes optional dev toast,
  component boundary, modal boundary, and certificate-error wording away from
  support-detail, generic-error, and issue labels toward app-problem and problem
  wording. Product-copy sensors now reject the old phrases. Focused
  verification passed: `npx vitest run src/utils/api.test.ts
  src/utils/errorMessages.test.ts src/components/ComponentErrorBoundary.test.tsx
  src/components/ModalErrorBoundary.test.tsx` passed 94 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, `node --test
  scripts/check-privacy-logging.test.mjs` passed 42 tests, `npm run
  lint:bloat`, `npm run test:scripts` passed 455 script tests, `npm run lint`,
  and `git diff --check`.
- Committed outcome-label copy slice changes optional source-contact result
  labels from failure-first words to `Needs attention` and `Took too long`, and
  changes the reusable async-button example/test guidance from `Failed to...`
  to `Could not...`. Product-copy sensors now reject the old phrases. Focused
  verification passed: `npx vitest run src/components/AsyncButton.test.tsx
  src/pages/Settings.test.tsx` passed 66 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, `npm run lint:bloat`,
  `npm run test:scripts` passed 455 script tests, `npm run lint`, and
  `git diff --check`.
- Committed source-name copy slice changes README source coverage, source
  feature docs, public job-source issue template, shared source labels, and
  frontend mocks from `HN Who's Hiring` wording to `Startup and tech job posts`.
  Product-copy sensors now reject the acronym-first source wording in
  user-facing source surfaces. Focused verification passed: `npx vitest run
  src/utils/sourceLabels.test.ts src/pages/Settings.test.tsx
  src/pages/SetupWizard.test.tsx` passed 60 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, no `HN Who's Hiring`,
  `Hacker News`, or `Who's Hiring thread` wording remains in user-facing issue
  template, README, feature-doc, user-doc, or source paths, `npm run
  test:scripts` passed 455 script tests, `npm run lint:bloat`, `npm run
  harness:check`, `npm run lint:docs`, `npm run lint`, and `git diff --check`
  passed.
- Committed and pushed email-service wording slice changes Settings, Quick Start, and
  notification docs away from technical-first email setup wording toward
  email-service and encrypted sending language. Product-copy sensors now reject
  the old phrases. Focused verification passed: `npx vitest run
  src/pages/Settings.test.tsx` passed 38 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, targeted search found
  no stale email setup phrases in Settings, Quick Start, or notification docs,
  `npm run lint:bloat`, `npm run harness:check`, `npm run lint:docs`, `npm run
  test:scripts` passed 455 script tests, `npm run lint`, and `git diff --check`
  passed. Remote `Docs Harness` and `CI` runs for commit `d31a48fb` passed on
  `main`.
- Committed local saved-secrets docs slice rewrites the credential feature guide as
  a plain-language saved-secrets guide, keeps developer implementation details in
  `docs/security/KEYRING.md`, updates docs index wording, and adds product-copy
  sensors for developer-reference drift in the feature doc. Focused verification
  passed: `node --test scripts/check-security-docs.test.mjs` passed 8 tests,
  `node --test scripts/check-product-copy.test.mjs` passed 32 tests, `npm run
  lint:bloat`, `npm run harness:check`, `npm run lint:docs`, `npm run
  test:scripts` passed 456 script tests, and `git diff --check`.
- Committed local notification-doc cleanup removes maintainer-only alert delivery,
  raw connection-link, and module-structure details from the user-facing
  notification guide. Product-copy sensors now reject those blocks if they drift
  back into the feature doc. Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, targeted search found no
  maintainer-detail block terms in `docs/features/notifications.md`, `npm run
  lint:bloat`, and `npm run harness:check`.
- Committed local architecture-doc accuracy slice aligns the developer credential
  and notification module summary with live Rust names, service naming, legacy
  LinkedIn cleanup, and alert privacy boundaries. Docs-drift sensors now reject
  the stale credential names and old storage-boundary wording. Focused
  verification passed: `node --test scripts/check-docs-drift.test.mjs` passed
  15 tests, targeted architecture search found no stale credential markers,
  `npm run lint:bloat`, and `npm run harness:check`.
- Committed local ghost-detection feature-doc cleanup removes developer-only
  schema and API command details from the job-seeker guide. Product-copy sensors
  now reject those implementation details if they drift back into
  `docs/features/ghost-detection.md`. Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, targeted search found no
  ghost schema/API terms in that feature doc, `npm run lint:bloat`, `npm run
  harness:check`, `npm run lint:docs`, `npm run test:scripts`, and
  `git diff --check`.
- Committed local Quick Start cleanup replaces contributor/developer setup labels
  and advanced local-file wording with plain optional source-code and file
  location copy. Product-copy sensors now reject the old current phrases in
  `docs/user/QUICK_START.md`. Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, targeted search found no
  old Quick Start phrases, `npm run lint:bloat`, `npm run harness:check`, `npm
  run lint:docs`, `npm run test:scripts`, and `git diff --check`.
- Committed local resume-import feature-doc cleanup replaces raw JSON field mapping
  and developer command-contract details with plain imported-section, privacy,
  and validation guidance. Product-copy sensors now reject those implementation
  details if they drift back into `docs/features/json-resume-import.md`.
  Focused verification passed: `node --test scripts/check-product-copy.test.mjs`
  passed 32 tests, targeted search found no removed resume-import contract
  markers, `npm run lint:bloat`, `npm run harness:check`, `npm run lint:docs`,
  `npm run test:scripts`, and `git diff --check`.
- Committed local Resume Builder feature-doc cleanup removes developer-only local
  storage, command, export, and backend-file details from the job-seeker guide.
  Product-copy sensors now reject those implementation details if they drift
  back into `docs/features/resume-builder.md`. Focused verification passed:
  `node --test scripts/check-product-copy.test.mjs` passed 32 tests, targeted
  search found no removed Resume Builder developer markers, `npm run
  lint:bloat`, `npm run harness:check`, `npm run lint:docs`, `npm run
  test:scripts`, and `git diff --check`.
- Committed local Smart Scoring feature-doc cleanup removes developer-only command,
  config, and backend scoring-model details from the match-explanation guide.
  Product-copy sensors now reject those implementation details if they drift
  back into `docs/features/smart-scoring.md`. Focused verification passed:
  `node --test scripts/check-product-copy.test.mjs` passed 32 tests, targeted
  search found no removed Smart Scoring developer markers, `npm run lint:bloat`,
  `npm run harness:check`, `npm run lint:docs`, `npm run test:scripts`, and
  `git diff --check`.
- Committed local user-data feature-doc cleanup removes implementation references,
  notification-preference code snippets, and command/test details from the local
  job-search data guide, then moves the notification-preference backend shape
  contract into developer architecture docs. Product-copy and security-doc
  sensors now reject those implementation details in
  `docs/features/user-data-management.md` while requiring the developer contract
  in `docs/developer/ARCHITECTURE.md`. Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, `node --test
  scripts/check-security-docs.test.mjs` passed 9 tests, targeted search found no
  removed user-data developer markers, `npm run lint:bloat`, `npm run
  harness:check`, `npm run lint:docs`, `npm run test:scripts`, and `git diff
  --check`.
- Committed local feature-doc implementation-leak cleanup removes remaining
  maintainer blocks, implementation references, module paths, command/test
  snippets, saved-file internals, and chat-number setup wording from
  user-facing feature guides. Resume renderer DTO privacy requirements moved to
  developer architecture docs. Product-copy and privacy sensors now keep
  feature guides plain while preserving developer contracts. Focused
  verification passed: `node --test scripts/check-product-copy.test.mjs` passed
  32 tests, `node --test scripts/check-privacy-logging.test.mjs
  scripts/check-repo-bloat.test.mjs` passed 263 tests, targeted search found no
  removed feature-doc implementation markers, and `npm run lint:bloat` passed.
- Committed local feedback copy cleanup replaces remaining GitHub-first online
  help copy in the safe support report flow with optional online-help wording.
  Product-copy sensors now reject those phrases if they drift back. Focused
  verification passed: `npx vitest run
  src/components/feedback/SubmitOptions.test.tsx
  src/components/feedback/SuccessScreen.test.tsx` passed 5 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, targeted search found no
  removed GitHub-first feedback phrases, and `npm run lint:bloat` passed.
- Committed local question-match validation copy cleanup replaces technical
  pattern-symbol wording with plain question-word guidance. Product-copy sensors
  now reject the old validation wording if it drifts back. Focused verification
  passed: `npx vitest run src/utils/formValidation.test.ts` passed 78 tests,
  `node --test scripts/check-product-copy.test.mjs` passed 32 tests, targeted
  search found no removed validation phrases, and `npm run lint:bloat` passed.
- Committed local Application Profile stat-copy cleanup replaces send/sent
  wording with labels that make clear users submit applications themselves.
  Focused verification passed: `npx vitest run
  src/pages/ApplicationProfile.test.tsx` passed 1 test, `node --test
  scripts/check-product-copy.test.mjs` passed 33 tests, targeted component
  search found no stale labels, `npm run lint:bloat`, `npm run lint:docs`,
  `npm run test:scripts` passed 458 script tests, `npm run lint`,
  `npm run harness:check`, and `git diff --check` passed.
- Committed local Settings source-toggle copy cleanup replaces remaining
  `automatic checks` wording with scheduled-job-check wording so accessible
  source controls stay clear and non-automation-framed. Focused verification
  passed: `npx vitest run src/pages/Settings.test.tsx` passed 38 tests,
  `node --test scripts/check-product-copy.test.mjs` passed 33 tests,
  targeted Settings search found no stale phrase, `npm run lint:bloat`,
  `npm run lint:docs`, `npm run test:scripts` passed 458 script tests, and
  `npm run lint` passed.
- Committed local Browser Button copy cleanup replaces remaining helper and
  advanced-setting wording with browser-import and optional setup wording.
  Focused verification passed: `npx vitest run
  src/components/BookmarkletGenerator.test.tsx` passed 3 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 33 tests, targeted component
  search found no stale helper phrases, `npm run lint:bloat`,
  `npm run lint:docs`, `npm run test:scripts` passed 458 script tests, and
  `npm run lint` passed.
- Committed local Job Source Status copy cleanup replaces feed, page-read, and
  not-needed labels with public-job-list, reads-job-details, and official-source
  wording. Focused verification passed: `npx vitest run
  src/components/ScraperHealthDashboard.test.tsx` passed 56 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 33 tests, targeted component
  search found no stale labels, `npm run lint:bloat`, `npm run lint:docs`,
  `npm run test:scripts` passed 458 script tests, and `npm run lint` passed.
- No remote CI or push should run unless the user explicitly asks in the current
  turn.

## Latest Slice

Scope:

- Manual email settings must be framed as optional setup details from the user's
  email service, not server/address/number jargon.
- USAJobs and connected-source review labels must describe jobs checked and
  job-source links, not source addresses or requested jobs.
- Error-log support actions must keep the easy safe support report path primary
  while avoiding troubleshooting jargon in visible labels.
- Detailed local support-report tooltips should explain help-requested use
  without support-only or maintainer jargon.
- Browser Button help docs should keep connection settings plain and place
  support-request gating in instructions, not labels.
- Detailed local report JSON export must re-sanitize records at export time, not
  rely only on earlier capture/storage sanitization.
- Feedback submit and success screens must keep the no-account safe support
  report path primary and avoid maintainer/issue-page jargon in visible copy.
- Generated support-report text must use plain safe-app-detail labels, not
  support-only labels or uppercase support blocks.
- Detailed local report tooltip copy must avoid maintainer jargon in user-facing
  surfaces.
- Broken-link and invalid saved-detail recovery docs must keep the in-app safe
  support report path primary and avoid maintainer/GitHub assumptions.
- README and Settings help surfaces must avoid maintainer/GitHub assumptions and
  troubleshooting-first labels.
- User-facing install, support, browser-button, notification, credential,
  security, conduct, and public issue-template docs must avoid technical setup,
  debugging, maintainer, and GitHub-first assumptions.
- Feedback sharing, setup/source labels, source-status history, resume handoff
  recovery, browser-button settings, and error-boundary detail labels must avoid
  GitHub-first, issue-first, HN-abbreviation, support-only, and technical
  recovery wording.
- Optional dev toasts and app/window recovery details must use app-problem
  labels, not support-detail labels or generic error fallbacks.
- Optional source-contact history and reusable component examples must avoid
  failure-first labels in user-facing or future-copy surfaces.
- User-facing source coverage, issue templates, shared source labels, and
  frontend mocks must avoid acronym-first `HN Who's Hiring` wording.
- Email setup surfaces must use email-service and plain sending-detail language
  instead of technical mail-setup labels.
- Credential feature docs must explain saved secrets in plain language and keep
  developer implementation references in security/developer docs.
- Notification feature docs must not include maintainer-only alert delivery,
  raw connection-link, or module-structure details.
- Developer architecture docs must match live credential key names and current
  alert/secret boundaries.
- Ghost-detection feature docs must explain posting-risk guidance in
  job-seeker language and keep developer schema/API details out of the
  user-facing guide.
- Quick Start must not make normal users parse developer setup labels or
  advanced local-file wording.
- Resume import feature docs must keep sensitive import behavior, privacy, and
  validation guidance readable without raw schema, command, or renderer terms.
- Resume Builder feature docs must teach resume building and matching without
  local-storage, command, export, or backend-file implementation details.
- Smart Scoring feature docs must teach match explanations without command,
  config, or backend scoring-model internals.
- User-data feature docs must explain local data control without implementation
  references, code snippets, command names, or test commands. Developer
  architecture docs must own the notification-preference command shape.
- Feature docs must stay user-facing: no maintainer blocks, implementation
  references, module paths, command/test snippets, internal saved-file wording,
  or chat-number setup details. Developer architecture docs must own renderer
  DTO privacy contracts.
- Feedback submit and success screens must keep the local safe support report
  path primary and refer to optional online help rather than GitHub-specific
  help-page copy.
- Question-match validation should tell users what to do in plain terms instead
  of naming pattern symbols, brackets, or special characters first.
- Product-copy sensors must reject recurring old phrases.

Verification completed for this slice:

```bash
npm run lint:bloat
npm run harness:check
npm run lint:docs
npm run test:scripts
npm run lint
node --test scripts/check-product-copy.test.mjs
node --test scripts/check-security-docs.test.mjs
node --test scripts/check-privacy-logging.test.mjs scripts/check-repo-bloat.test.mjs
! rg -n "This opens GitHub in your browser|GitHub should have opened|The GitHub page keeps replies and updates" src/components/feedback
! rg -n "unsupported pattern symbols|Check brackets or special characters" src/utils/formValidation.ts src/utils/formValidation.test.ts
! rg -n "Technical Details|Signal Weights|Database Schema|API Commands|invoke\\(|ghost_reasons TEXT|ghost_score|repost_count|Ghost configuration commands|get_ghost_config|set_ghost_config|reset_ghost_config" docs/features/ghost-detection.md
! rg -n "For contributors|Developer Setup|Advanced: where JobSentinel saves local files" docs/user/QUICK_START.md
! rg -n "JSON Resume content|basics\\.|work\\[\\]|Developer contract|Implementation paths|select_and_import_json_resume|import_json_resume|Returned renderer DTOs|Run the focused Rust tests|cargo test core::resume::json_resume" docs/features/json-resume-import.md
! rg -n "Developer Details|For developers and the curious|Local Storage Model|Tauri Commands|resume_drafts|create_resume_draft|export_resume_docx|analyze_resume_for_job|Backend Files|DOCX generation" docs/features/resume-builder.md
! rg -n "Developer Notes|Current Tauri commands|get_scoring_config|update_scoring_config|reset_scoring_config_cmd|validate_scoring_config|ScoringConfig|recency proportions|complete scoring model|Internal field names" docs/features/smart-scoring.md
! rg -n "Developer Notes|Implementation references|src/components/CoverLetterTemplates\\.tsx|src-tauri/src/core/user_data|Tauri commands|notificationPrefsExample|advancedFilters|save_notification_preferences|minScoreThreshold|npm run test:run|cargo test --lib user_data|Implementation rule" docs/features/user-data-management.md
! rg -n "Developer Notes|Implementation references|For maintainers|For Maintainers|Important modules|Checks for Maintainers|Tauri commands|Backend core|src-tauri/src|src/pages/|cargo test|npm run test:run|npm run lint:bloat|Core tables|Core commands|HashMap-based|O\\(n\\*?m\\)|SynonymMap::|private saved-file reference|saved resume state|negative number for groups|chat number" docs/features
npx vitest run src/pages/Settings.test.tsx src/components/ErrorLogPanel.test.tsx
npx vitest run src/components/ErrorLogPanel.test.tsx
npx vitest run src/utils/errorReporting.test.ts
npx vitest run src/components/feedback/SubmitOptions.test.tsx src/components/feedback/SuccessScreen.test.tsx
npx vitest run src/services/feedbackService.test.ts
npx vitest run src/components/feedback/SubmitOptions.test.tsx src/components/feedback/SuccessScreen.test.tsx src/pages/Settings.test.tsx src/pages/SetupWizard.test.tsx src/components/ScraperHealthDashboard.test.tsx src/pages/ResumeOptimizer.test.tsx src/components/BookmarkletGenerator.test.tsx src/components/ErrorBoundary.test.tsx src/components/PageErrorBoundary.test.tsx src/components/ModalErrorBoundary.test.tsx src/components/ComponentErrorBoundary.test.tsx
npx vitest run src/utils/api.test.ts src/utils/errorMessages.test.ts src/components/ComponentErrorBoundary.test.tsx src/components/ModalErrorBoundary.test.tsx
npx vitest run src/components/AsyncButton.test.tsx src/pages/Settings.test.tsx
npx vitest run src/utils/sourceLabels.test.ts src/pages/Settings.test.tsx src/pages/SetupWizard.test.tsx
npx vitest run src/pages/Settings.test.tsx
node --test scripts/check-privacy-logging.test.mjs
git diff --check
```

## Next Best Work

1. Continue zero-technical-knowledge UX review across setup, settings,
   recovery, feedback, empty states, and error screens.
2. Continue broad-audience review so technical and non-technical job searches
   both feel first-class.
3. Continue backend/scraper and frontend privacy-edge review, especially logs,
   reports, notifications, local paths, optional source checks, and external-AI
   boundaries.
4. Continue splitting oversized harness modules only where ownership boundaries
   are clear and verification cost improves.
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
