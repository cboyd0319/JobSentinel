# Current Product And Quality Work

Last updated: 2026-06-20.

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
| LinkedIn Workbench and restricted-source flow | Complete locally | 2026-06-19 refresh: `cargo test --lib linkedin`, `cargo test --lib bookmarklet`, focused restricted-source frontend tests, and prior user-assisted proof cover Browser Import visible-card capture, Workbench ledger actions, restricted-source acknowledgement, no stored auth material, no hidden page reads, no monitoring, no automation, and no submit actions. |
| Scraper/source verification | Complete locally | 2026-06-19 refresh: deterministic scraper contracts, source-health gates, scraper integration, pipeline integration, API contract, scheduler integration, focused restricted-source frontend tests, Browser Import helper tests, LinkedIn boundary tests, and low-volume live source probes passed; evidence is recorded in `docs/harness/source-debug-verification-v2.9.0.md`. |
| README, docs, and screenshots | Complete locally | `e7a4ba43` refreshed front-door docs, docs hub links, feature-doc names, screenshots, stale-doc archive paths, and docs/harness sensors. |
| Development and QA completion | Publication-gated | Capability verification is recorded in `docs/harness/capabilities-verification-v2.9.0.md`; follow-up local gates passed after the ledger landed, publication remains user-confirmed, and final gates must rerun after any further local change. |
| macOS readiness | Release-gated | No-account path is complete; Gatekeeper-ready public distribution remains Apple-credential-gated. |
| Resume assistance | Complete locally | 2026-06-19 aggregate private-corpus probe plus focused public/synthetic UI, E2E, semantic, and manual-style desktop/mobile verification covered parsing, import, matching, tailoring, builder/export, ATS/readability review, application-form help, cover-letter review, screening-answer review, and Local Match Check diagnostics. |
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
- v2.9.0 is not release-ready until final local gates close from the verified
  commit and the user confirms the push/publish sequence.

## Done Recently

- Recent completed work covers no-account release paths, resume hard-requirement
  handling, job-card protection, first-run setup, Quiet Shield fixes, Browser
  Import, Workbench, encrypted local storage, downloadable skills, source
  taxonomy, release hardening, and non-`content/` audit fixes.
- Dependency, security, frontend, build, Rust, E2E, docs, bloat, harness,
  source, resume, AI, semantic matching, route-probe, and release-readiness
  gates passed for the current capability-evidence slice; the capability
  evidence ledger records each row. Rerun full final gates after any further
  local change and before publication.
- Release version, release environment, macOS readiness, E2E doctor, Agent
  Skills package, Agent Skills archive integrity, and staged Agent Skills SBOM
  checks passed locally under `/tmp` without publishing or uploading assets.
- Script tests moved into `scripts/tests/` and `scripts/security/tests/` before
  commit `b238c7d4`; keep future script tests out of the flat `scripts/` root.

## Next Work

1. Wait for explicit user confirmation before pushing `main`, wiki, tags, or
   release assets.
2. Re-run final gates from the latest commit if any further local change lands
   before publication.
3. Confirm major route screenshots, Computer Use clicks, keyboard flow, and
   affected route/action/state checks after any further UI change.
4. Continue macOS readiness only after publication is approved; do
   not claim Gatekeeper-ready distribution before signing, notarization,
   stapling, and install proof exist.
5. Do not reopen repo-bloat cleanup unless a fresh bloat gate failure or
   product/privacy/security/docs verification blocker appears.
6. Keep README, docs hubs, release docs, wiki inventory, and active status in
   sync when behavior, readiness, or public guidance changes.
7. Commit each major verified change locally; push only at goal completion or
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
