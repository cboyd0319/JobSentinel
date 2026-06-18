# Current Product And Quality Work

Last updated: 2026-06-18.

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

- Completing final design, packaging, and release-verification blockers before
  any new release creation, upload, or announcement work.
- Keeping package-manager, npm/Cargo direct, npm override, and Action pins exact
  latest stable, with transitives lockfile-pinned/latest-compatible and
  upstream exceptions recorded.
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
  unless requested after final local release gates close.

## Current Priorities

| Area | State | Next useful slice |
| ---- | ----- | ----------------- |
| Dependency readiness | Complete | Package-manager, direct deps, overrides, and Action pins are latest; transitives stay lockfile-pinned/latest-compatible |
| Downloadable Agent Skills | Complete locally | Eight skills include UI metadata, handoffs, templates, references, Persona/ResumeSkills/career-ops/JobSentinel research coverage, and `lint:skills`. |
| Browser Import and LinkedIn-compatible flow | Complete locally | Manual desktop/mobile verification passed; revisit only if whole-UI QA finds a blocker. Keep LinkedIn user-opened and user-clicked without session cookies or background monitoring. |
| Development and QA completion | Finalizing | Primary product/security fixes and whole-UI verification are complete locally; finish design, packaging, and release checks. |
| macOS readiness | Release-gated | Keep docs honest when touched, but do not create or upload assets until final local gates close. |
| Resume assistance | Active | Tighten hard-requirement categories, evidence caps, live review copy, and mock/Rust parity only when evidence is local and explainable. |
| Job-card protection | Active | Keep posting-risk cues visible without implying employer intent or confirmed duplicate/source proof. |
| Guided intake | Active | Add optional suggestions only after user review; keep broad defaults and non-technical paths first-class. |
| Pay protection | Active | Keep missing, minimum-only, maximum-only, malformed, or broad listed-pay evidence plain and review-first. |
| Encrypted local storage | Active | SQLCipher, AEAD vault rows, migration, passphrase controls, and macOS vault-key user-presence locking exist; continue release/packaging readiness. |
| Quiet Shield redesign | Applied locally | Protective Navy/teal tokens, score-color semantics, and compact dashboard widget loading are screenshot-checked; final click/action coverage still required. |
| Final Rust and agent improvement pass | Complete locally | Accepted non-`content/` fixes are applied and verified; revisit only for regressions. |
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

- macOS docs and release workflow separate full-public readiness from the
  no-account path, and public wiki upkeep is harness-owned.
- Resume Match and Resume Builder hard-requirement handling now covers age,
  citizenship, screening, driving, insurance, language, schedule, and related
  review-first categories more consistently across Rust, mocks, and UI.
- Job cards, filters, and backend reasons now keep repeated-sighting,
  low-detail, source, unsafe-link, pay-risk, and scam-cue evidence visible
  without overclaiming.
- First-run setup now keeps broad work-location defaults, explicit alert
  opt-in, reviewed source choices, reviewed resume-skill suggestions, and
  non-technical starter paths.
- Active plan sprawl has been reduced to this plan plus `status.md`.
- Quiet Shield QA fixed wrapping, passive Keychain prompts, Protective Navy
  tokens, score colors, dashboard loading, and mobile Application Assist layout.
- The v2.9.0 pass confirmed Browser Import is the LinkedIn path, not session
  storage or automatic monitoring. Private profile inputs stay local.
- Package-manager, npm/Cargo, npm override, Action, OS-runner, and apt direct
  pins are exact latest stable; transitives are latest-compatible.
  `lint:deps`, `lint:actions`, and `release:check-deps` enforce freshness.
- Live OS keyring integration tests are opt-in behind
  `JOBSENTINEL_LIVE_KEYRING_TESTS=1`; default credential tests remain
  non-interactive and still prove LinkedIn credential storage is blocked before
  keyring access.
- Runtime credentials use encrypted vault rows; status checks read metadata
  only, and passphrase Settings controls stay non-interactive until user action.
- File-backed app data opens through SQLCipher; legacy plaintext databases
  upgrade in place and delete temporary plaintext backups after success.
- Downloadable Agent Skills cover the full search flow with UI metadata,
  handoffs, templates, evidence validation, posting liveness, tracker history,
  sourced interview intel, and pay/offer decisions cross-checked against
  Persona, ResumeSkills, career-ops, and JobSentinel research.
- Browser Import desktop/mobile manual verification passed on 2026-06-17 for
  setup, private-link rejection, LinkedIn preview/save, duplicates, and
  overflow; commit `361560f9` added clean send APIs and local-model
  revision/checksum pinning from the CheatSheetSeries scan.
- Current CheatSheetSeries follow-ups removed unused macOS WebKit/cookie deps,
  refreshed stale transitives, added source-boundary and Browser Import timeout
  sensors, resume guards, URL/browser fixes, and Linux runtime metadata.
- Final whole-UI post-design pass: 266/266 E2E, 16 route inventories, and no
  console/page errors or overflow.
- Final non-`content/` audit fixes landed: memory-only company research,
  accessible onboarding, auto-refresh gating, atomic alert claims, HTTPS
  JobsWithGPT endpoints, shared import hashes, and `2.9.0` metadata/changelog.

## Next Work

1. Get approval before updating the public GitHub wiki, then sync `Home.md`
   and `Capabilities.md` with current `2.9.0` readiness.
2. Verify Windows/macOS/Linux release evidence before any asset creation or
   final push.
3. Confirm major route screenshots, Computer Use clicks, keyboard flow, and
   affected route/action/state checks after any further UI change before calling
   v2.9.0 done.
4. Continue macOS readiness only after final local gates close; do
   not claim Gatekeeper-ready distribution before signing, notarization,
   stapling, and install proof exist.
5. Finish current verified product and QA slices in resume assistance, job-card
   protection, guided intake, and pay protection.
6. Continue encrypted storage UX: release/packaging readiness and no passive
   Settings probes.
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

Archived history stays under `docs/plans/archive/`.
