# Current Product And Quality Work

Last updated: 2026-06-04.

## Problem

Active planning had become too fragmented. Four long active plans plus a long
status file made restart context expensive and encouraged stale duplicated
state. Current active work needs one maintained plan, one compact status file,
and archived history for provenance.

## Scope

In scope:

- Current product priorities: truthful local resume assistance, application
  readability, job-card posting protection, guided intake, pay-risk protection,
  and user-ease work.
- Cleanup only when it blocks critical functionality, Rule 0, verification, or
  zero-technical-knowledge usability.
- Plan compaction, active index cleanup, roadmap/doc links, and harness score
  expectations.

Out of scope:

- Claiming the broad repo-wide quality goal is complete.
- Deleting historical plan evidence.
- Broad product implementation unrelated to plan cleanup in this slice.
- Pushes, releases, remote CI runs, cloud actions, or credentialed vendor
  changes.

## Acceptance Criteria

- `docs/plans/active/` contains only current restart documents.
- Historical active plans are preserved under `docs/plans/archive/`.
- `docs/plans/index.json`, `docs/plans/README.md`, roadmap links, and harness
  score expectations match the compact active-plan model.
- `npm run harness:session` reports the compact active plan count and useful
  next-best work.
- Docs and harness checks pass for the changed files.
- Rule 0 is unchanged: local-first storage, credential safety, explicit user
  review, privacy-preserving defaults, and optional external AI remain intact.

## Current Workstreams

| Area | Status | Next useful slice |
| ---- | ------ | ----------------- |
| Resume assistance | Active | Improve truthful requirement review, hard-constraint handling, readable evidence, and next-action guidance only when evidence is local and explainable. |
| Job-card protection | Active | Keep stale, duplicate, scam-like, pay-risk, source-trust, and unclear-posting cues visible without implying employer-side prediction. |
| Guided intake | Active | Add optional resume/profile suggestions only after user review; avoid engineer-only defaults and technical assumptions. |
| Pay protection | Active | Keep missing, broad, thin, or anchoring-prone pay signals visible and plain-language. |
| Cleanup and harness | Active as needed | Fix stale docs, bloat, privacy/security, or verification gaps when they block current work. |

## Milestones

- [x] Review active plan count and harness constraints.
- [x] Archive superseded active plan docs while preserving history.
- [x] Create one compact current active plan.
- [x] Replace long active status with compact restart state.
- [x] Update repo docs, plan index, and harness score expectations.
- [x] Run focused docs and harness verification.
- [x] Record remaining open work in status and handoff.

## Risks

- Archived docs may contain stale historical statements. Treat them as
  provenance, not current behavior.
- Product-roadmap readers may need one current planning link instead of the old
  separate guided-intake and research-plan links.
- Harness checks that rewarded plan sprawl must change carefully so future
  sessions keep compact active state without losing restart evidence.

## Sensors

Use focused docs and harness checks for this slice:

```bash
npm run harness:session -- --json
npm run harness:score
npm run harness:check
npm run lint:docs
git diff --check
```

Broaden only if edits touch product code, privacy/security sensors, or release
behavior.

## Handoff

When resuming, read:

1. [Active status](status.md)
2. This plan
3. [Verification matrix](../../harness/verification-matrix.md)
4. Archived plans only if old decision context is needed

Archived plan history:

- [Guided job-search intake](../archive/guided-job-search-intake-superseded-2026-06-04.md)
- [Repo cleanup and quality sweep](../archive/repo-cleanup-and-quality-sweep-superseded-2026-06-04.md)
- [Repo cleanup handoff](../archive/repo-cleanup-handoff-superseded-2026-06-04.md)
- [Research-backed product improvements](../archive/research-backed-product-improvements-superseded-2026-06-04.md)
