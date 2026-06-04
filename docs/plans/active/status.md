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

- Live repo evidence before this compaction: `git status --short --branch`
  reported `## main...origin/main`.
- Latest observed commit before this compaction:
  `6a220a8c Record pushed semantic evidence batch`.
- Previous active-plan count was 5 and indexed active workstream count was 5.
  Fresh session evidence after this compaction reports 2 active docs and 2
  indexed workstreams: this status file and `current-work.md`.
- No push or remote CI action should run unless the user explicitly asks in the
  current turn.

## Latest Slice

Latest implementation slice:

- Accepted a read-only zero-technical-knowledge audit sidecar and fixed three
  high-confidence findings.
- Quick Start install copy now keeps the main path on choosing an installer,
  without making checksum, signing, release-asset, or account-label knowledge
  part of the front-door instructions.
- Browser Button setup now makes paste-link import the recommended path and
  frames bookmark setup as an optional shortcut for users who already use
  browser bookmarks or have step-by-step browser help.
- Error log copy now uses **Save Extra Problem Details** instead of
  technical/private-log wording, with a tooltip that tells users to use it only
  if JobSentinel help asks.
- Pre-commit verification passed for focused changed-surface tests, full unit
  tests, full frontend ESLint, TypeScript, docs lint, external-AI gateway
  sensor, repo-bloat sensor, harness plan, harness session, and diff whitespace.

Previous verification slice:

- Ran broader frontend checks over the current active frontend batch after unit,
  lint, and type checks were already current.
- `npm run build` passed and emitted a production Vite bundle. Build output
  included toolchain deprecation and plugin-timing warnings, but no build
  failure.
- `npm run test:e2e:smoke:budget` passed in 8.8 seconds with 10 expected smoke
  tests, 0 unexpected, 0 flaky, and 0 skipped.
- Removed generated `dist/` and `test-results/` artifacts after those checks
  and reran docs/harness verification.

Previous implementation slice:

- Cleaned the remaining frontend lint warnings from current `npm run lint`
  output.
- Application Preview hard-question loading now depends on the job description
  field it actually reads, with regression coverage for changing from a harmless
  posting to a hard-screening posting.
- Dashboard fit-label formatting moved out of the component module so Fast
  Refresh lint no longer treats `Dashboard.tsx` as mixed component/helper
  exports.
- Verification passed for focused `ApplicationPreview` and `Dashboard` tests,
  combined changed-surface frontend tests, full unit test suite, full frontend
  ESLint with no warnings, TypeScript, external-AI sensor, docs lint, harness
  check, harness plan, harness session, bloat check, and diff whitespace.

Previous implementation slice:

- Added low-detail job-card guidance for broad titles and thin descriptions.
- The cue uses **Check role details** copy, asks users to confirm role, team,
  and work details before tailoring, and does not claim employer intent,
  scam behavior, or fake-job proof.
- Stronger backend posting-risk guidance still takes priority over the
  local low-detail cue.
- Verification passed for focused and full `JobCard` tests, combined
  `JobCard` and `SetupWizard` tests, TypeScript, ESLint with no errors,
  external-AI sensor, docs lint, harness check, harness plan, bloat check,
  harness session, and diff whitespace.

Previous implementation slice:

- Added reviewed guided-intake bulk controls for saved-resume skill suggestions:
  `Add all visible` and `Skip resume suggestions`.
- Existing individual chips remain user-reviewed. The slice shows skill names
  only, does not expose raw resume text, and adds no network calls, external AI,
  telemetry, storage changes, or hidden automation.
- A guided-intake sidecar implemented the disjoint `SetupWizard` slice.
  Coordinator reviewed the diff and reran focused `SetupWizard` tests and ESLint
  before accepting it.
- Verification passed for focused `SetupWizard` tests, focused SetupWizard
  ESLint, TypeScript, external-AI sensor, docs lint, harness check, and diff
  whitespace.

Previous implementation slice:

- Added missing-pay job-card guidance when both salary fields are empty and a
  salary floor exists.
- The cue asks users to compare the role before tailoring and keeps missing pay
  framed as a review signal, not proof of scam behavior, stale posting, or
  employer intent.
- Open-ended minimum-only pay stays visible without below-floor guidance because
  a listed minimum alone does not prove the role tops out below the user's
  floor.
- Verification passed for focused and full `JobCard` salary tests, TypeScript,
  ESLint, external-AI sensor, docs lint, harness check, and diff whitespace.

Previous implementation slice:

- Changed job-card repeated-sighting copy from source-count wording to
  factual `Seen N times` wording. Tooltips now tell users to check source
  details before treating repeats as separate places.
- Verification passed for focused and full `JobCard` tests, TypeScript, ESLint,
  external-AI sensor, docs lint, harness check, and diff whitespace.

Previous implementation slice:

- Added job-card visibility for parsed stale or repost evidence even when the
  aggregate posting-risk score is below the normal badge threshold.
- The cue uses factual **Check posting evidence** copy and does not claim
  employer intent, scam proof, or employer-side prediction.
- Verification passed for focused and full `JobCard` tests, TypeScript, ESLint,
  external-AI sensor, docs lint, harness check, and diff whitespace.

Previous implementation slice:

- Added local Resume Match hard-constraint handling for required background
  checks, drug screens, and pre-employment screening.
- Backend analyzer, browser/dev mock analyzer, Resume Match UI labels, and
  feature docs now share the same cautious category:
  **Background or drug screening**.
- The slice does not add storage, network calls, external AI, telemetry, or
  hidden automation. It only adds local evidence review and truthful next-action
  guidance.
- Verification passed for focused Rust and Vitest checks, full affected
  frontend tests, TypeScript, ESLint, Rust formatter, Rust clippy, full Rust
  library tests, external-AI sensor, docs lint, harness check, and diff
  whitespace.

Previous docs-maintenance slice:

- Archive stale long active plans without deleting history.
- Keep one compact active plan for current product and quality work.
- Update docs, index, and harness score expectations so compact active planning
  is the desired state.
- Verification passed for focused script tests, harness score, harness check,
  docs lint, session snapshot, and diff whitespace.

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
