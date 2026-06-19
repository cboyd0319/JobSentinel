# Current Product And Quality Work

Last updated: 2026-06-19.

## Purpose

Keep one active plan for current product and quality work. History belongs in
archives and git. This file and `status.md` should stay compact.

## Problem

JobSentinel still needs steady work toward zero known errors, privacy leaks,
stale docs, brittle tests, technical user assumptions, engineer-only defaults,
and unverified claims. The current push is v2.9.0 readiness for an urgent
single-user search without weakening the public product. Active planning had
become duplicated, so future work needs compact restart surfaces.

## Scope

In scope:

- Completing final release sequencing without racing an older same-tag run.
- Keeping package-manager, npm/Cargo direct, npm override, and Action pins exact
  latest stable, with transitives lockfile-pinned and exceptions recorded.
- Adding downloadable Agent Skills under `skills/` for job hunting and resume
  work, with specification-compliant `SKILL.md` packages.
- Hardening Browser Import as the LinkedIn-compatible path: user-opened page,
  user-clicked visible-page or visible-card import, local review, and no
  LinkedIn login automation.
- Treating all scraper adapters, import paths, and non-scraper restricted-site
  contracts as release blockers, including LinkedIn-compatible search-link,
  pasted-link, Browser Import, Workbench, reminder, acknowledgement, ledger,
  fallback, and manual-entry paths.
- Keeping scraper-tooling no-adoption decisions tied to live evidence.
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
- Locked redesign: move UI/UX toward Quiet Shield after primary v2.9.0 gates.
  `DESIGN.md`, `docs/design/README.md`, and `docs/design/design-spec.md`
  remain the design contract.
- Manual whole-UI verification before v2.9.0 completion: every route, click,
  action, modal, toast, empty/loading/error state, settings panel, import flow,
  keyboard path, and narrow-width surface must be exercised and recorded.
- Late-stage Rust expert plus multi-agent analysis across non-`content/`
  surfaces, with accepted fixes applied and verified before final push.
- Harness-controlled redesign lock: keep required design files, change
  contracts, and screenshot or Computer Use evidence for broad UI changes.
- Cleanup only when a failing gate or blocker affects Rule 0, user ease,
  verification, or docs accuracy.
- macOS readiness docs that stay honest about the no-Apple-account ceiling
  while development blockers remain.

Out of scope:

- Claiming the broad repo-wide quality goal is complete.
- Deleting historical plan evidence.
- Secret capture, token replay, platform-control bypass, or hidden background
  access for restricted job sites.
- Broad product implementation unrelated to current user safety, privacy,
  macOS readiness, or maintainability.
- Credentialed vendor changes unless requested after final local release gates close.

## Current Priorities

| Area | State | Next useful slice |
| ---- | ----- | ----------------- |
| Dependency readiness | Complete | Package-manager, direct deps, overrides, and Action pins are latest; transitives stay lockfile-pinned |
| Downloadable Agent Skills | Complete locally | Skills pass `lint:skills`; release packaging creates deterministic tar/ZIP artifacts. |
| LinkedIn Workbench and restricted-source flow | Open | Revalidate LinkedIn-compatible browser capture, Browser Import visible-card capture, Workbench ledger actions, restricted-source acknowledgement, artifact/session checks, and user-assisted proof without cookies, hidden page reads, monitoring, automation, or submit actions. |
| Scraper/source verification | Open | Manually re-run and record every current personal scraper, public source adapter, restricted-source compatible flow, and source-specific no-account limitation. |
| README, docs, and screenshots | Open | Refresh README, docs hub, release notes, and screenshots for current v2.9.0 surfaces; archive/delete stale maintained docs where appropriate. |
| Development and QA completion | Release-gated | Roadmap checklist is open; final local release gates and user-confirmed push/publish remain after docs, screenshots, source, resume, and UI proof close. |
| macOS readiness | Release-gated | No-account path is complete; Gatekeeper-ready public distribution remains Apple-credential-gated. |
| Resume assistance | Open | Manually verify parsing, import, matching, tailoring, builder/export, ATS/readability review, application-form help, cover-letter review, and screening-answer review against local resume corpora. |
| Job-card protection | Complete locally | Posting-risk cues stay visible without implying employer intent or confirmed duplicate/source proof. |
| Guided intake | Complete locally | Search review guides application next actions; suggestions stay reviewed and explainable. |
| Pay protection | Complete locally | Missing, one-sided, malformed, broad, and written-vs-verbal offer cues stay plain and review-first. |
| Encrypted local storage | Complete locally | SQLCipher, AEAD vault rows, migration, passphrase controls, and macOS vault-key locking are release-ready locally. |
| Quiet Shield redesign | Applied locally | Tokens, score colors, and dashboard loading are screenshot-checked; final click/action coverage must rerun after current docs/screenshots and any UI changes. |
| Final Rust and agent improvement pass | Complete locally | Accepted non-`content/` fixes are applied and verified; revisit only for regressions. |
| Cleanup and harness | Closed for proactive bloat work | Reopen only for a fresh blocker to privacy, security, docs accuracy, or verification. |

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
- v2.9.0 is not release-ready until the active roadmap rows for docs,
  screenshots, scraper/source verification, resume verification, UI proof, and
  final local gates close from the verified commit and the user confirms the
  push/publish sequence.

## Done Recently

- Recent completed work covers no-account release paths, resume hard-requirement
  handling, job-card protection, first-run setup, Quiet Shield fixes, Browser
  Import, Workbench, encrypted local storage, downloadable skills, source
  taxonomy, release hardening, and non-`content/` audit fixes.
- Dependency, security, frontend, build, Rust, E2E, docs, bloat, harness, and
  release-readiness gates have passed in prior slices, but final gates must
  rerun from the final verified commit.
- Script tests moved into `scripts/tests/` and `scripts/security/tests/` before
  commit `b238c7d4`; keep future script tests out of the flat `scripts/` root.

## Next Work

1. Refresh README, docs hubs, release notes, and screenshots for current
   v2.9.0 surfaces; archive/delete maintained stale docs where appropriate.
2. Revalidate LinkedIn-compatible browser capture, Workbench actions,
   restricted-source acknowledgement, and no-session-artifact behavior.
3. Manually verify every current scraper/source path and every resume
   capability, then record evidence.
4. Run final local release gates from the verified commit before release action.
5. Confirm major route screenshots, Computer Use clicks, keyboard flow, and
   affected route/action/state checks after any further UI change.
6. Continue macOS readiness only after final local gates close; do
   not claim Gatekeeper-ready distribution before signing, notarization,
   stapling, and install proof exist.
7. Do not reopen repo-bloat cleanup unless a fresh bloat gate failure or
   product/privacy/security/docs verification blocker appears.
8. Keep README, docs hubs, release docs, wiki inventory, and active status in
   sync when behavior, readiness, or public guidance changes.
9. Commit each major verified change locally; push only at goal completion or
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

1. [Status](status.md)
2. [Release roadmap](v2.9.0-completion-and-full-feature-roadmap.md)
3. [Verification matrix](../../harness/verification-matrix.md)
4. Archives only for old decisions

Archived history stays under `docs/plans/archive/`.
