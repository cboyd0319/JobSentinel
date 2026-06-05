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

- Last pushed baseline before the current local cleanup slice:
  `c1f5dd36 Update macOS readiness and split automation module`.
- Fresh harness evidence reports 2 active docs and 2 indexed workstreams: this
  status file and `current-work.md`.
- Final broad verification passed locally after `91bd9354`: frontend tests/build,
  script tests, harness/bloat/docs/prose, Rust fmt/clippy/lib, `doctor:e2e`,
  and E2E smoke budget.
- Local commits should continue in small verified slices; push only when the
  branch reaches the user's 30-commit batch threshold or the user gives a newer
  explicit push instruction.

## Latest Slice

- Resume Match next-action cards now use the backend hard-requirement action
  text, so seniority, screening, physical, and language constraints keep their
  precise truth-first guidance.

- Job cards now flag open-ended starting pay below the user's saved floor as a
  range-review cue, without claiming the role tops out below the floor.

- README and macOS readiness output now separate full-public readiness (94%)
  from the complete no-account path (100%), matching the known no-Apple-account
  constraint.

- Rust tests and platform examples now avoid concrete developer home paths while
  still covering sanitizer and private-detail redaction behavior.

- Frontend, mock, and script test fixtures now use neutral placeholders for
  private resume paths and emails instead of developer-specific local paths.

- Settings resume sorting copy now says it uses reviewed local resume skills,
  falling back to job titles and search words when no reviewed resume skills are
  saved.

- First-run career-path preview now shows suggested job titles and search words
  before saving, and tells users those suggestions can be edited.

- Dev mock Resume Match now treats bilingual and named-language fluency wording
  as language hard constraints, matching the Rust analyzer's score cap, action
  copy, and evidence matching for Spanish and Mandarin examples.

- Active status history was compacted from the old slice log to current restart
  facts, archived-plan provenance, and the next work list so the active plan
  stays below the file-size budget.

- Resume Builder live readability now surfaces must-have warnings before opening
  the detail modal, so work authorization, language, license, screening, or
  other hard requirements are visible before a user edits a tailored resume.

- Dashboard duplicate-review copy now says possible repeated postings, not proof
  that multiple sources confirmed the same job, and duplicate-check toasts use
  cautious review-first wording.

- Resume Match model types, validators, JSON parsing, fit-status copy, and
  suggestion-category labels moved from `src/pages/ResumeOptimizer.tsx` to
  `src/pages/resumeOptimizerModel.ts`.

- Resume Match model helpers, icons, resume library dropdown, and readable-text
  preview modal moved out of `src/pages/Resume.tsx` into focused helper files
  under `src/pages/`.
- `src/pages/Resume.tsx` is now below the 1,200-line frontend target, so the
  legacy oversized-file exception was removed.

- Resume review job-word overview display moved out of
  `src/pages/ResumeOptimizer.tsx` into
  `src/pages/ResumeOptimizerJobWordsOverview.tsx`.

- Resume Builder template thumbnail previews and export/delete icons moved out
  of `src/pages/ResumeBuilder.tsx` into `src/pages/ResumeBuilderVisuals.tsx`.

## Recent Completed Slices

Detailed implementation history before the current restart window is in the
archived plan docs above and the local git log. Current restart context keeps
only the latest active slice plus the next work list so this file stays below
the active-doc budget.

## Next Best Work

1. Continue resume assistance only where it improves truthful local requirement
   review, hard-constraint handling, readable evidence, or next-action guidance.
2. Continue guided intake only where resume/profile suggestions stay optional,
   reviewed, local, and understandable for non-technical job seekers.
3. Continue job-card protection for stale, risky, duplicate, unclear, or
   pay-problem postings without treating local signals as employer predictions.
4. Continue cleanup only when it blocks critical functionality,
   privacy/security, verification, or user ease.

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
