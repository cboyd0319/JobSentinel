# Current Product And Quality Work

Last updated: 2026-06-05.

## Purpose

Keep one active execution plan for current product and quality work. Detailed
slice history belongs in `status.md`, archived plans, and git history. This
file should stay small enough to remain useful as a restart surface.

## Problem

JobSentinel still needs steady work toward zero known errors, privacy leaks,
stale docs, brittle tests, user-facing technical assumptions, engineer-only
defaults, and unverified claims. Active planning had become too large and too
duplicated, so future work needs a compact plan plus a compact status file.

## Scope

In scope:

- Truthful local resume assistance, hard-requirement review, readable evidence,
  and next-action guidance.
- Job-card protection for stale, repeated, scam-like, weak-source,
  unclear-detail, and pay-risk postings.
- Guided intake that helps non-technical users without silently narrowing
  searches or selecting sources.
- Pay protection for missing, thin, one-sided, broad, or anchoring-prone listed
  pay signals.
- Cleanup only when a fresh failing gate or blocker affects Rule 0, user ease,
  verification, or docs accuracy.
- macOS release-readiness docs and harness checks that stay honest about the
  no-Apple-account ceiling.

Out of scope:

- Claiming the broad repo-wide quality goal is complete.
- Deleting historical plan evidence.
- Broad product implementation unrelated to current user safety, privacy,
  macOS readiness, or maintainability.
- Pushes, releases, remote CI runs, cloud actions, or credentialed vendor
  changes unless the user explicitly asks.

## Current Priorities

| Area | State | Next useful slice |
| ---- | ----- | ----------------- |
| macOS readiness | Active | Keep README, release docs, harness checks, and wiki guidance aligned with 94% full-public readiness and 100% no-account path completion. |
| Resume assistance | Active | Tighten hard-requirement categories, evidence caps, live review copy, and mock/Rust parity only when evidence is local and explainable. |
| Job-card protection | Active | Keep posting-risk cues visible without implying employer intent or confirmed duplicate/source proof. |
| Guided intake | Active | Add optional suggestions only after user review; keep broad defaults and non-technical paths first-class. |
| Pay protection | Active | Keep missing, minimum-only, maximum-only, malformed, or broad listed-pay evidence plain and review-first. |
| Cleanup and harness | Closed for proactive repo-bloat work | Reopen only for a fresh failing gate or blocker to privacy, security, docs accuracy, or verification. |

## Completion Bar

- Active plan directory contains only current restart docs.
- `status.md` answers current state, recent evidence, current macOS percentage,
  and next best work without requiring old plan reads.
- Historical active plans stay under `docs/plans/archive/`.
- `docs/plans/index.json`, docs hubs, roadmap links, README, release notes, and
  harness score expectations match current state.
- Every product change preserves Rule 0: local-first storage, credential
  safety, explicit user review, privacy-preserving defaults, and optional
  external AI.
- Every claim of completion has fresh verification evidence.

## Done Recently

- macOS docs, README, release notes, readiness scripts, and release workflow
  now separate 94% full-public readiness from 100% no-account path completion.
- Public wiki inventory and upkeep are part of the harness, including
  `Home.md` and `Capabilities.md`.
- Resume Match and Resume Builder hard-requirement handling now covers age,
  citizenship, screening, driving, insurance, language, schedule, and related
  review-first categories more consistently across Rust, mocks, and UI.
- Job cards and posting-risk filters now keep repeated-sighting, low-detail,
  source-trust, unsafe-link, pay-risk, and scam-cue evidence visible without
  overclaiming.
- First-run setup now keeps broad work-location defaults, explicit alert
  opt-in, reviewed source choices, reviewed resume-skill suggestions, and
  non-technical starter paths.
- Large files and tests have been split across analyzer, settings, resume,
  dashboard, mock, bloat, scheduler, DB, notification, scraper, and harness
  modules.
- Repo-bloat cleanup is closed as of 2026-06-05. Do not continue proactive
  file-size split work unless a fresh gate failure or blocker appears.
- Active plan sprawl has been reduced to this plan plus `status.md`.

## Next Work

1. Keep pushing macOS readiness as far as possible without Apple Developer
   Program credentials; do not claim Gatekeeper-ready public distribution until
   Developer ID signing, notarization, stapling, and install proof exist.
2. Continue small verified product slices in resume assistance, job-card
   protection, guided intake, and pay protection.
3. Do not reopen repo-bloat cleanup unless a fresh bloat gate failure or
   product/privacy/security/docs verification blocker appears.
4. Keep README, docs hubs, release docs, wiki inventory, and active status in
   sync when behavior, readiness, or public guidance changes.
5. Push only when the local commit batch reaches the user-approved threshold or
   the user gives a newer explicit push instruction.

## Sensors

Use focused docs and harness checks for plan-only edits:

```bash
npm run harness:session -- --json
npm run harness:score
npm run harness:check
npm run lint:docs
npm run lint:bloat
git diff --check
```

Broaden only if edits touch product code, privacy/security sensors, release
workflow, packaging, or macOS deployment behavior.

## Risks

- Archived docs may contain stale historical statements. Treat them as
  provenance, not current behavior.
- macOS public-readiness language can drift if no-account completion and
  Apple-account-only release work are not kept separate.
- Plan docs can grow back into slow restart surfaces if completed slice logs
  are copied here instead of summarized in `status.md`.

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
