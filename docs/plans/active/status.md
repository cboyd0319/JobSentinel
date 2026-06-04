# Active Plan Status

Last updated: 2026-06-04.

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

- Last pushed baseline before local commits resumed:
  `4cdcc3e3 Split ATS screening constraint tests`.
- Fresh harness evidence reports 2 active docs and 2 indexed workstreams: this
  status file and `current-work.md`.
- Local commits should continue in small verified slices; push only when the
  branch reaches the user's 30-commit batch threshold or the user gives a newer
  explicit push instruction.

## Latest Slice

Latest implementation slice:

- Product-copy and broad-audience harness path sets now include
  `src/mocks/handlers/marketIntelligence.ts` so market fixture copy stays
  scanned after extraction.
- This is a harness-only follow-up to the market mock helper split.

Recent cleanup summary:

- The whole public GitHub wiki is now treated as external product docs in the
  harness and change contract.
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
- Remaining largest cleanup targets are `src/mocks/handlers.ts`,
  `src/pages/Settings.tsx`, `src-tauri/src/core/resume/ats_analyzer.rs`,
  `src-tauri/src/core/db/tests.rs`, and large harness test files.

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
