# Current Product And Quality Work

Last updated: 2026-06-17.

## Purpose

Keep one active execution plan for current product and quality work. Detailed
slice history belongs in archived plans and git history. This file and
`status.md` should stay small enough to remain useful as restart surfaces.

## Problem

JobSentinel still needs steady work toward zero known errors, privacy leaks,
stale docs, brittle tests, user-facing technical assumptions, engineer-only
defaults, and unverified claims. The current push is v2.9.0 readiness for an
urgent single-user job search without weakening the public product contract.
Active planning had become too large and too duplicated, so future work needs a
compact plan plus a compact status file.

## Scope

In scope:

- Completing current development and QA blockers before any new release
  creation, upload, or announcement work.
- Updating package/dependency pins to latest stable versions and clearing
  current freshness and security-audit blockers.
- Adding downloadable Agent Skills under `skills/` for job hunting and resume
  work, with specification-compliant `SKILL.md` packages.
- Hardening the existing Browser Import Button as the LinkedIn-compatible path:
  the user opens a job page, clicks import, reviews the saved job locally, and
  tracks the application without JobSentinel logging in to LinkedIn.
- Truthful local resume assistance, hard-requirement review, readable evidence,
  and next-action guidance.
- Job-card protection for stale, repeated, scam-like, weak-source,
  unclear-detail, and pay-risk postings.
- Guided intake that helps non-technical users without silently narrowing
  searches or selecting sources.
- Pay protection for missing, thin, one-sided, broad, or anchoring-prone listed
  pay signals.
- Local encrypted storage and saved-secret UX: encrypted SQLite at rest,
  per-row AEAD secret vault, lazy unlock, and passphrase mode.
- Locked redesign: move UI and UX toward Quiet Shield and Protective Navy,
  with no horizontal-scroll, cramped-settings, passive secure-storage prompt,
  or engineer-only-user regressions.
- Harness-controlled redesign lock: treat Quiet Shield as an active-goal
  acceptance gate. Keep design files required by the harness, record design
  impact in change contracts, and capture screenshot or Computer Use evidence
  for broad UI changes before release work resumes.
- Cleanup only when a fresh failing gate or blocker affects Rule 0, user ease,
  verification, or docs accuracy.
- macOS readiness docs and harness checks that stay honest about the
  no-Apple-account ceiling, without treating release creation as current work
  while development blockers remain.

Out of scope:

- Claiming the broad repo-wide quality goal is complete.
- Deleting historical plan evidence.
- LinkedIn session-cookie storage, token replay, background monitoring,
  result-list crawling, or account automation without recorded official API
  approval for that exact use case.
- Broad product implementation unrelated to current user safety, privacy,
  macOS readiness, or maintainability.
- Releases, remote CI runs, cloud actions, or credentialed vendor changes
  unless requested after development and QA blockers are closed.

## Current Priorities

| Area | State | Next useful slice |
| ---- | ----- | ----------------- |
| v2.9.0 dependency readiness | Active | Upgrade and hard-pin stable Node and Rust dependencies; rerun audit, outdated, harness, and focused gates. |
| Downloadable Agent Skills | Active | Create spec-compliant `skills/` packages for job hunting, resume review, application tracking, and interview prep; validate package structure. |
| Browser Import and LinkedIn-compatible flow | Active | Keep LinkedIn user-opened and user-clicked; improve single-page import, local review, and application tracking without session cookies or background monitoring. |
| Development and QA completion | Active | Fix confirmed UI, scraper, privacy, docs, harness, and Computer Use validation blockers before any new release work. |
| macOS readiness | Paused for release creation | Keep docs honest when touched, but do not create or upload new release assets until development and QA blockers are closed. |
| Resume assistance | Active | Tighten hard-requirement categories, evidence caps, live review copy, and mock/Rust parity only when evidence is local and explainable. |
| Job-card protection | Active | Keep posting-risk cues visible without implying employer intent or confirmed duplicate/source proof. |
| Guided intake | Active | Add optional suggestions only after user review; keep broad defaults and non-technical paths first-class. |
| Pay protection | Active | Keep missing, minimum-only, maximum-only, malformed, or broad listed-pay evidence plain and review-first. |
| Encrypted local storage | Active | Implement encrypted SQLite plus AEAD secret vault; replace passive Keychain checks with lazy secret-use unlock and macOS native Touch ID-capable key access. |
| Quiet Shield redesign | Active | Apply the design contract to current UI QA work; verify layout, contrast, navigation, modals, toasts, settings, saved-secret UX, and narrow widths before release. |
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

- macOS docs and release workflow separate 94% full-public readiness from 100%
  no-account path completion.
- Public wiki inventory and upkeep are part of the harness.
- Resume Match and Resume Builder hard-requirement handling now covers age,
  citizenship, screening, driving, insurance, language, schedule, and related
  review-first categories more consistently across Rust, mocks, and UI.
- Job cards and posting-risk filters now keep repeated-sighting, low-detail,
  source-trust, unsafe-link, pay-risk, and scam-cue evidence visible without
  overclaiming.
- First-run setup now keeps broad work-location defaults, explicit alert
  opt-in, reviewed source choices, reviewed resume-skill suggestions, and
  non-technical starter paths.
- Large files and tests have been split across product, Rust, and harness
  modules.
- Repo-bloat cleanup is closed as of 2026-06-05. Do not continue proactive
  file-size split work unless a fresh gate failure or blocker appears.
- Active plan sprawl has been reduced to this plan plus `status.md`.
- Current Quiet Shield QA fixed shared modal visibility in the packaged macOS
  debug app and removed avoidable truncation from user-controlled UI text.
  Computer Use confirmed visible Dashboard import and Application Assist edit
  modals on the rebuilt debug bundle.
- Follow-up redesign lock-in migrated several dialogs onto shared `Modal`,
  added unique modal aria ids, wrapped Hiring Trends tabs, and made Job Sources
  tables responsive. Focused UI tests, lint, harness check, and harness score
  passed on 2026-06-06.
- Latest packaged-app QA fixed Application Assist tab paint, removed the
  native tab-row overflow thumb, made toasts fixed to the viewport, kept
  Dashboard and Hiring Trends toasts visible, and verified Settings Sources &
  Alerts opens without a passive Keychain prompt. Focused ApplicationProfile
  and ToastContext tests, lint, and packaged debug app build passed.
- The v2.9.0 pass confirmed the compliant LinkedIn path is the existing
  user-clicked Browser Import model, not session-cookie storage or automatic
  monitoring. Private resume/profile test inputs stay local and must not be
  committed.

## Next Work

1. Upgrade and hard-pin dependencies; clear `npm outdated`, `npm audit
   --audit-level=moderate`, and Rust freshness findings before claiming v2.9.0
   readiness.
2. Create and validate the downloadable `skills/` directory using the Agent
   Skills specification and job-search/resume workflows.
3. Harden Browser Import for user-clicked LinkedIn job saves and application
   tracking without browser-session capture, background page access, or
   scheduled LinkedIn fetches.
4. Keep pushing macOS readiness as far as possible without Apple Developer
   Program credentials only after current development and QA blockers close; do
   not claim Gatekeeper-ready distribution until signing, notarization,
   stapling, and install proof exist.
5. Finish current verified product and QA slices in resume assistance, job-card
   protection, guided intake, and pay protection.
6. Implement the encrypted local storage slice: encrypted SQLite, per-row AEAD
   vault rows, OS-protected default vault key, advanced passphrase mode,
   macOS native Keychain/LocalAuthentication unlock, and no passive Settings
   probes that cause repeated prompts.
7. Finish the Quiet Shield redesign pass across current QA surfaces using
   `DESIGN.md`, `docs/design/README.md`, and `docs/design/design-spec.md`.
   Confirm major route screenshots, Computer Use clicks, keyboard flow, narrow
   widths, full frontend tests, build, packaged debug app rebuild, and major
   empty/error/loading states before release work resumes.
8. Do not reopen repo-bloat cleanup unless a fresh bloat gate failure or
   product/privacy/security/docs verification blocker appears.
9. Keep README, docs hubs, release docs, wiki inventory, and active status in
   sync when behavior, readiness, or public guidance changes.
10. Commit each major verified change locally; push only at goal completion or
   on newer explicit instruction.

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

- Archived docs may contain stale statements; treat them as provenance.
- macOS public-readiness language can drift if no-account completion and
  Apple-account-only release work are not kept separate.
- Plan docs can grow back into slow restart surfaces if completed slice logs
  are copied into active files instead of archived.
- Secret-storage UX can regress if passive Settings or status checks call
  secure storage. Saved-secret verification must stay lazy and action-driven.
- Redesign work can regress if screens keep older green-heavy styling,
  horizontal scrolling, nested cards, cramped settings rows, over-large type in
  compact panels, or visual states that have not been checked with screenshots
  and Computer Use.

## Handoff

When resuming, read:

1. [Active status](status.md)
2. This plan
3. [Verification matrix](../../harness/verification-matrix.md)
4. Archived plans only if old decision context is needed

Archived plan history:

- [Active status history](../archive/active-status-history-2026-06-17.md)
- [Guided job-search intake](../archive/guided-job-search-intake-superseded-2026-06-04.md)
- [Repo cleanup and quality sweep](../archive/repo-cleanup-and-quality-sweep-superseded-2026-06-04.md)
- [Repo cleanup handoff](../archive/repo-cleanup-handoff-superseded-2026-06-04.md)
- [Research-backed product improvements](../archive/research-backed-product-improvements-superseded-2026-06-04.md)
