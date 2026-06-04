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

Current docs-maintenance slice:

- Archive stale long active plans without deleting history.
- Keep one compact active plan for current product and quality work.
- Update docs, index, and harness score expectations so compact active planning
  is the desired state.
- Verification passed for focused script tests, harness score, harness check,
  docs lint, session snapshot, and diff whitespace.

## Next Best Work

1. Continue resume assistance only where it improves truthful local requirement
   review, hard-constraint handling, readable evidence, or next-action guidance.
2. Continue job-card protection for stale, risky, duplicate, unclear, or
   pay-problem postings without treating local signals as employer predictions.
3. Expand guided intake only where resume/profile suggestions stay optional,
   reviewed, local, and understandable for non-technical job seekers.
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
