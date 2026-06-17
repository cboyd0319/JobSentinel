# Current Product And Quality Work

Last updated: 2026-06-17.

## Purpose

Keep one active plan for current product and quality work. Detailed history
belongs in archives and git. This file and `status.md` should stay compact.

## Problem

JobSentinel still needs steady work toward zero known errors, privacy leaks,
stale docs, brittle tests, user-facing technical assumptions, engineer-only
defaults, and unverified claims. The current push is v2.9.0 readiness for an
urgent single-user job search without weakening the public product contract.
Active planning had become too duplicated, so future work needs compact
restart surfaces.

## Scope

In scope:

- Completing current development and QA blockers before any new release
  creation, upload, or announcement work.
- Keeping package-manager, npm/Cargo direct, and Action pins exact latest
  stable, with transitives lockfile-pinned and upstream exceptions recorded.
- Adding downloadable Agent Skills under `skills/` for job hunting and resume
  work, with specification-compliant `SKILL.md` packages.
- Hardening Browser Import as the LinkedIn-compatible path: user-opened page,
  user-clicked import, local review, and no LinkedIn login automation.
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
- Locked redesign: move UI and UX toward Quiet Shield and Protective Navy after
  primary v2.9.0 gates. `DESIGN.md`, `docs/design/README.md`, and
  `docs/design/design-spec.md` remain the design contract.
- Manual whole-UI verification before v2.9.0 completion: every route, click,
  action, modal, toast, empty/loading/error state, settings panel, import flow,
  keyboard path, and narrow-width surface must be exercised and recorded.
- Late-stage Rust expert plus multi-agent analysis across non-`content/`
  surfaces, with accepted fixes applied and verified before the final push.
- Harness-controlled redesign lock: keep required design files, change
  contracts, and screenshot or Computer Use evidence for broad UI changes.
- Cleanup only when a failing gate or blocker affects Rule 0, user ease,
  verification, or docs accuracy.
- macOS readiness docs that stay honest about the no-Apple-account ceiling
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
| v2.9.0 dependency readiness | Complete | Package-manager, direct dependency, and Action pins are exact latest stable; transitives stay lockfile-pinned and latest-compatible |
| Downloadable Agent Skills | Complete locally | Eight spec-compliant skills are guarded by `lint:skills`, the harness, and `skills-ref@0.1.5`. |
| Browser Import and LinkedIn-compatible flow | Complete locally | Manual desktop/mobile verification passed; revisit only if whole-UI QA finds a blocker. Keep LinkedIn user-opened and user-clicked without session cookies or background monitoring. |
| Development and QA completion | Active | Fix confirmed UI, scraper, privacy, docs, harness, and Computer Use validation blockers before any new release work. |
| macOS readiness | Paused for release creation | Keep docs honest when touched, but do not create or upload new release assets until development and QA blockers are closed. |
| Resume assistance | Active | Tighten hard-requirement categories, evidence caps, live review copy, and mock/Rust parity only when evidence is local and explainable. |
| Job-card protection | Active | Keep posting-risk cues visible without implying employer intent or confirmed duplicate/source proof. |
| Guided intake | Active | Add optional suggestions only after user review; keep broad defaults and non-technical paths first-class. |
| Pay protection | Active | Keep missing, minimum-only, maximum-only, malformed, or broad listed-pay evidence plain and review-first. |
| Encrypted local storage | Active | Runtime AEAD vault storage and legacy migration exist; next: encrypted SQLite, passphrase mode, and macOS native unlock. |
| Quiet Shield redesign | Deferred until primary gates close | Apply Quiet Shield/Protective Navy after primary blockers close; then verify the design contract. |
| Final Rust and agent improvement pass | Deferred until primary gates close | Run a comprehensive non-`content/` review near the end, apply accepted fixes, and verify before the final push. |
| Cleanup and harness | Closed for proactive repo-bloat work | Reopen only for a fresh failing gate or blocker to privacy, security, docs accuracy, or verification. |

## Completion Bar

- Active plan directory contains only current restart docs.
- `status.md` answers current state, recent evidence, macOS posture, and next
  best work without old plan reads.
- Historical active plans stay under `docs/plans/archive/`.
- Plan indexes, docs hubs, roadmap links, README, release notes, and harness
  score expectations match current state.
- Every product change preserves Rule 0: local-first storage, credential
  safety, explicit user review, privacy-preserving defaults, and optional
  external AI.
- Every claim of completion has fresh verification evidence.
- v2.9.0 is not done until whole-UI manual verification covers every click,
  action, and surface across the app.

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
- Active plan sprawl has been reduced to this plan plus `status.md`.
- Quiet Shield QA fixed shared modal visibility, truncation, dialog migration,
  wrapped tabs, responsive source tables, Application Assist paint,
  viewport-fixed toasts, and Settings opening without passive Keychain prompts.
- The v2.9.0 pass confirmed Browser Import is the LinkedIn path, not session
  storage or automatic monitoring. Private profile inputs stay local.
- Package-manager, direct npm/Cargo, and Action pins are exact latest stable;
  transitives are lockfile-pinned. `lint:deps`, `lint:actions`, and
  `release:check-deps` enforce registry, lockfile, and action freshness;
  remaining behind-latest transitives are upstream-bound.
- Live OS keyring integration tests are opt-in behind
  `JOBSENTINEL_LIVE_KEYRING_TESTS=1`; default credential tests remain
  non-interactive and still prove LinkedIn credential storage is blocked before
  keyring access.
- Runtime credentials now use the encrypted vault provider; status checks read
  metadata only.
- Downloadable Agent Skills now cover search planning, posting-risk review,
  resume tailoring, form review, tracking, outreach, interview prep, and
  offer/pay review.
- Browser Import desktop/mobile manual verification passed on 2026-06-17 for
  setup, private-link rejection, LinkedIn preview/save, duplicates, and overflow.
- Whole-UI normal actions, Setup Wizard, keyboard paths, and forced states passed.

## Next Work

1. Build and execute the whole-UI manual verification map for every route,
   click, action, modal, toast, form, settings/import/keyboard path,
   empty/loading/error state, and narrow width before calling v2.9.0 done.
2. After primary gates close, run the final Rust expert plus multi-agent
   improvement analysis across non-`content/` surfaces, apply accepted fixes,
   and verify them before final release readiness.
3. Continue macOS readiness only after development and QA blockers close; do
   not claim Gatekeeper-ready distribution before signing, notarization,
   stapling, and install proof exist.
4. Finish current verified product and QA slices in resume assistance, job-card
   protection, guided intake, and pay protection.
5. Continue encrypted storage: encrypted SQLite, passphrase mode, macOS native
   unlock, and no passive Settings probes.
6. Apply Quiet Shield/Protective Navy design decisions only after primary
   readiness gates and whole-UI verification blockers close; then verify with
   `DESIGN.md`, `docs/design/README.md`, and `docs/design/design-spec.md`.
   Confirm major route screenshots, Computer Use clicks, keyboard flow,
   narrow widths, full tests, build, and empty/error/loading states.
7. Keep the LinkedIn-compatible Browser Import path user-opened and
   user-clicked; do not add browser-session capture, background page access, or
   scheduled LinkedIn fetches.
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
- Plan docs can grow into slow restart surfaces if completed logs are copied
  into active files instead of archived.
- Secret-storage UX can regress if passive Settings or status checks call
  secure storage. Saved-secret verification must stay lazy and action-driven.
- Redesign work can regress if screens keep older styling, horizontal
  scrolling, nested cards, cramped settings rows, over-large compact-panel type,
  or visual states not checked with screenshots and Computer Use.

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
