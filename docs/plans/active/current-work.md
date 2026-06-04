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
- [x] Replace outside-AI unreviewed-detail errors that exposed payload,
  field, and classification wording.
- [x] Replace raw `url` labels in safe support report activity details with a
  readable **Link** label.
- [x] Treat saved screening-answer wording as local plain text instead of raw
  regex, preserving literal symbols such as `Security+`.
- [x] Show stale or repost job-card evidence even when the aggregate
  posting-risk score is unavailable.
- [x] Keep dev mock short-credential matching bounded so terms such as `RN`
  do not match inside unrelated words.
- [x] Label missing job-card source data as unavailable instead of implying a
  source label came from the posting.
- [x] Show hard-question review for visible education wording, not only degree
  or diploma wording, when saved education answers can help user review.
- [x] Make App Problem History explain that crash details stay hidden on screen
  and safe support reports should be reviewed before sharing.
- [x] Show hard-question review for visible schedule, available, and notice
  period wording when saved availability answers can help user review.
- [x] Replace visible App Problem History `url` context labels with readable
  link labels while keeping existing link sanitization.
- [x] Align resume live-score missing-word buckets with the documented
  **Nice-to-Have or Other to Review** label.
- [x] Replace resume suggestion **Add job words** labels with
  **Review job words** so wording stays truth-first.
- [x] Show job-import closing dates when the posting preview includes them, and
  preserve source posting dates across local time zones.
- [x] Align dev mock hard schedule/location constraints with Rust/docs for
  remote, hybrid, overtime, holiday, full-time, and part-time wording.
- [x] Label job-import preview pay as listed pay so posting pay stays framed as
  source evidence to review.
- [x] Show live Resume Builder must-have checks when local hard constraints
  need review before tailoring.
- [x] Use plain evidence labels for matched job words, not raw backend section
  names.
- [x] Use plain evidence labels in live Resume Builder matched-word tooltips.
- [x] Sync Resume Builder docs with live must-have review behavior.
- [x] Treat non-finite job fit scores as unavailable instead of saved zero-fit
  estimates.
- [x] Treat out-of-range job fit scores as unavailable instead of impossible
  percentages.

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
- Coordinator replaced outside-AI blocked-send wording locally because it
  touched one gateway service, one focused test, feature docs, and active plan
  state while preserving the existing no-send guard.
- Coordinator replaced the safe support report `url` activity label locally
  because it touched one feedback service, one focused test, feature docs, and
  active plan state while preserving existing sanitization.
- Screening-answer matcher scout was read-only and changed no files.
  Coordinator accepted its finding that saved wording like `Security+` could be
  interpreted as regex and overmatch unrelated security questions, then fixed
  Rust matchers, dev mocks, UI validation copy, focused tests, feature docs, and
  active plan state locally.
- Coordinator fixed the job-card stale/repost cue locally because valid
  posting-risk reasons could be present while the aggregate score was missing.
  The card now keeps the factual **Check posting evidence** guidance visible in
  that case without implying employer intent.
- Coordinator aligned dev mock resume matching with backend term-boundary
  behavior because short credentials such as `RN` could match inside unrelated
  words like `intern`. The mock now uses bounded keyword frequency for
  requirement evidence.
- Coordinator fixed missing source-label guidance locally because blank source
  data could read like a posting-provided source label. The card helper now
  labels it as **Source not shown** and asks users to open the original posting
  before tailoring.
- Application-preview scout was read-only and changed no files. Coordinator
  accepted its finding that visible `education` wording did not trigger
  hard-question review, then added the education trigger and focused preview
  test locally.
- Coordinator clarified App Problem History safe-report copy locally because
  expanded problem rows did not explain why crash details stayed off screen or
  that users should review reports before sharing.
- Coordinator aligned Application Preview salary-or-availability triggers with
  saved-answer matching and feature docs by adding visible `schedule`,
  `available`, and `notice period` triggers plus a focused schedule test.
- Coordinator replaced raw URL-like context labels in App Problem History with
  **link** or **job link**, matching safe-report guidance that visible details
  should not expose raw `url` field names.
- Coordinator aligned the resume live-score detail modal with Resume Match docs
  by replacing the third missing-word bucket label with **Nice-to-Have or Other
  to Review** and adding focused group coverage.
- Coordinator changed resume suggestion category labels from **Add job words**
  to **Review job words** in both live-score review and Resume Match, preserving
  the existing truth-first suggestion text.
- Coordinator showed posting closing dates in Job Import preview when the
  backend preview already includes `valid_through`, then fixed import preview
  date formatting so source dates do not shift a day earlier in local time
  zones.
- Resume mock parity scout was read-only and changed no files. Coordinator
  accepted its finding that dev mock hard-constraint extraction missed remote,
  hybrid, overtime, holiday, full-time, and part-time groups that Rust/docs
  already cover, then patched the mock and focused tests locally.
- Coordinator changed the job-import preview pay label from salary to listed
  pay so imported posting pay stays review-first and does not read like a
  guaranteed salary.
- Coordinator added a **Must-Haves To Check** section to the live Resume
  Builder detail modal so hard-constraint risks received from local analysis no
  longer stay hidden behind the score.
- Coordinator reused the existing plain evidence-label formatter for matched
  job-word rows so **Found in** text says current role experience and skills
  list instead of raw backend section names.
- Coordinator added the same plain evidence-label treatment to live Resume
  Builder word-match tooltips.
- Coordinator synced `docs/features/resume-builder.md` so the live-review
  section names must-have checks as well as missing job-word buckets.
- Coordinator fixed `ScoreDisplay` so non-finite fit scores show **No fit yet**
  with `--`, preserving `0%` for actual saved zero-fit estimates.
- Coordinator extended the same fallback to finite scores outside the supported
  `0` to `1` range, preventing impossible negative or over-100 fit percentages.

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
