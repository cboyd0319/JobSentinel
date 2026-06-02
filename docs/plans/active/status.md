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
- Current local source-name copy slice changes README source coverage, source
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
- Product-copy sensors must reject recurring old phrases.

Verification completed for this slice:

```bash
npm run lint:bloat
npm run harness:check
npm run lint:docs
npm run test:scripts
npm run lint
node --test scripts/check-product-copy.test.mjs
npx vitest run src/pages/Settings.test.tsx src/components/ErrorLogPanel.test.tsx
npx vitest run src/components/ErrorLogPanel.test.tsx
npx vitest run src/utils/errorReporting.test.ts
npx vitest run src/components/feedback/SubmitOptions.test.tsx src/components/feedback/SuccessScreen.test.tsx
npx vitest run src/services/feedbackService.test.ts
npx vitest run src/components/feedback/SubmitOptions.test.tsx src/components/feedback/SuccessScreen.test.tsx src/pages/Settings.test.tsx src/pages/SetupWizard.test.tsx src/components/ScraperHealthDashboard.test.tsx src/pages/ResumeOptimizer.test.tsx src/components/BookmarkletGenerator.test.tsx src/components/ErrorBoundary.test.tsx src/components/PageErrorBoundary.test.tsx src/components/ModalErrorBoundary.test.tsx src/components/ComponentErrorBoundary.test.tsx
npx vitest run src/utils/api.test.ts src/utils/errorMessages.test.ts src/components/ComponentErrorBoundary.test.tsx src/components/ModalErrorBoundary.test.tsx
npx vitest run src/components/AsyncButton.test.tsx src/pages/Settings.test.tsx
npx vitest run src/utils/sourceLabels.test.ts src/pages/Settings.test.tsx src/pages/SetupWizard.test.tsx
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
