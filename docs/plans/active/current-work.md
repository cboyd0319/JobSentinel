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
- [x] Add local Resume Match hard-constraint review for required background,
  drug, and pre-employment screening.
- [x] Delegate read-only scouts for guided-intake and job-card next slices.
- [x] Show low-score stale or repost job-card evidence without implying
  employer intent.
- [x] Replace repeated-sighting job-card copy that implied separate sources
  with factual `Seen N times` wording.
- [x] Add missing-pay job-card guidance when a salary floor exists, while
  treating missing pay as a review cue rather than scam or stale-posting proof.
- [x] Add reviewed `Add all visible` and `Skip resume suggestions` controls
  around saved-resume skill suggestions.
- [x] Add low-detail job-card guidance for broad titles and thin descriptions
  without claiming employer intent.
- [x] Clean frontend lint warnings in application preview and dashboard fit
  labeling so verification output is easier to trust.
- [x] Run broader frontend build and smoke E2E checks for the current active
  frontend batch.
- [x] Replace technical-first quick-start, browser-button, and support-log copy
  surfaced by read-only zero-technical-knowledge audit.
- [x] Add hard-screening saved-answer review guidance for legal, screening,
  credential, physical, and age-related application questions.
- [x] Gate negotiation-note drafts on user-entered offer and target range facts,
  so benchmark evidence cannot become an invented current offer.
- [x] Preserve vague user wording in drafted resume bullets instead of turning
  it into unverified ownership or development claims.
- [x] Add office/admin, retail/hospitality, and trades/field first-run presets
  that stay off tech-heavy job sources by default.

## Orchestration Log

2026-06-04:

- Guided-intake scout was read-only and changed no files. Best next slice:
  `Add all visible` and `Skip resume suggestions` around existing saved-resume
  skill chips in setup, keeping suggestions local and reviewed.
- Job-card scout was read-only and changed no files. Best next slice: surface
  stale or repost reasons even when aggregate posting-risk score is below the
  normal badge threshold, using factual "verify before tailoring" copy.
- Coordinator implemented the low-score stale/repost job-card cue locally
  because it touched one component, one component test, docs, and active plan
  state.
- Coordinator implemented the `times_seen` wording fix locally because it
  touched one component, one component test, docs, and active plan state.
- Coordinator implemented the resume hard-constraint slice locally because it
  touched shared analyzer, mock, UI, docs, and tests.
- Coordinator implemented the missing-pay salary-floor cue locally because it
  touched one component, one component test, feature docs, and active plan
  state.
- Guided-intake sidecar implemented reviewed bulk controls for saved-resume
  skill suggestions in `SetupWizard`. Coordinator reviewed the diff and reran
  focused `SetupWizard` tests and ESLint before accepting it.
- Coordinator implemented the low-detail job-card cue locally because it extends
  the same posting-risk component, tests, feature docs, and active plan state.
- Coordinator cleaned the remaining frontend lint warnings by tightening
  Application Preview hard-question dependency tracking and moving dashboard fit
  label formatting out of the component module.
- Coordinator ran production frontend build and smoke E2E budget checks against
  the current active frontend batch.
- Zero-technical-knowledge audit sidecar was read-only and changed no files.
  Coordinator accepted its Quick Start, Browser Button, and support-log findings
  and implemented the copy fixes locally with focused tests.
- Coordinator added local hard-screening review guidance to saved screening
  answers because it touched one Application Assist component, one focused test
  file, feature docs, and active plan state.
- Pay-protection sidecar was read-only and changed no files. Coordinator
  accepted its finding that negotiation-note drafts could treat benchmark
  values as offer facts, then fixed the Salary page, dev mock, tests, feature
  docs, and active plan state locally.
- Truthful-resume sidecar was read-only and changed no files. Coordinator
  accepted its finding that drafted alternative bullets could upgrade vague
  user wording into stronger ownership or development claims, then fixed the
  Rust analyzer, focused tests, feature docs, and active plan state locally.
- Coordinator added non-technical first-run presets locally because it extends
  the existing guided-intake profile data, selector order, focused tests,
  feature docs, and active plan state without changing storage or source
  contact behavior.

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
