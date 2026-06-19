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
| LinkedIn Workbench and restricted-source flow | Complete locally | Desktop/mobile mock UI, generated Browser Import visible-card coverage, and user-assisted live LinkedIn proof are recorded without cookies, hidden page reads, monitoring, automation, or submit actions. |
| Scraper/source verification | Complete locally | Live source probes, restricted-source contract tests, manual restricted-source proof, and Scrapling comparison are recorded. |
| Development and QA completion | Release-gated | Roadmap checklist is closed locally; final local release gates and user-confirmed push/publish remain. |
| macOS readiness | Release-gated | No-account path is complete; Gatekeeper-ready public distribution remains Apple-credential-gated. |
| Resume assistance | Complete locally | Hard-requirement categories, evidence caps, readable export checks, and major ATS portal guidance are verified. |
| Job-card protection | Complete locally | Posting-risk cues stay visible without implying employer intent or confirmed duplicate/source proof. |
| Guided intake | Complete locally | Search review guides application next actions; suggestions stay reviewed and explainable. |
| Pay protection | Complete locally | Missing, one-sided, malformed, broad, and written-vs-verbal offer cues stay plain and review-first. |
| Encrypted local storage | Complete locally | SQLCipher, AEAD vault rows, migration, passphrase controls, and macOS vault-key locking are release-ready locally. |
| Quiet Shield redesign | Applied locally | Tokens, score colors, and dashboard loading are screenshot-checked; final click/action coverage passed. |
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
- v2.9.0 is not release-ready until final local gates pass from the verified
  commit and the user confirms the push/publish sequence.

## Done Recently

- macOS docs and release workflow separate full-public, no-account, and legacy
  public fallback paths; post-`28dcd6dd` local `2.9.0` DMG passes current smoke gates.
- Resume Match and Builder hard-requirement handling now covers age,
  citizenship, screening, driving, insurance, language, schedule, and related
  review-first categories across Rust, mocks, and UI.
- Job cards, filters, and backend reasons keep repeated-sighting, low-detail,
  source, unsafe-link, pay-risk, and scam-cue evidence visible without overclaiming.
- First-run setup keeps broad work-location defaults, alert opt-in, reviewed
  sources/resume skills, and non-technical starter paths.
- Quiet Shield QA fixed wrapping, passive Keychain prompts, Protective Navy
  tokens, score colors, dashboard loading, and mobile Application Assist layout.
- Browser Import captures cards; Workbench has user-clicked
  applied/saved/tracking/rejected/interview/follow-up/reminder/note/
  not-interested without hidden reads/session storage.
- Package-manager, npm/Cargo, override, Action/runner/apt pins are latest
  stable; `lint:deps`, `lint:actions`, and `release:check-deps` enforce freshness.
- Live OS keyring integration tests are opt-in behind
  `JOBSENTINEL_LIVE_KEYRING_TESTS=1`; default credential tests remain
  non-interactive and still prove LinkedIn credential storage is blocked before
  keyring access.
- Runtime credentials use encrypted vault rows; status checks read metadata only,
  and passphrase controls stay action-driven.
- File-backed app data opens through SQLCipher; legacy plaintext databases
  upgrade in place and delete temporary plaintext backups after success.
- Downloadable Agent Skills cover the search flow with UI metadata, handoffs,
  templates, rubrics, validation, checksums, and release SBOM staging.
- Browser Import desktop/mobile verification passed on 2026-06-17.
- Restricted-source and LinkedIn-compatible proof passed on 2026-06-19 with
  mock UI, generated visible-card Browser Import, and user-assisted browsing.
- Source mining rechecked Scrapling/Stygian, added BDJobs, promoted Naukri/Bayt,
  and kept Google Jobs to user-opened import research.
- CheatSheetSeries follow-ups hardened CI, dependency gates, source/network
  pinning, notification validation/redaction, Browser Import, HTTPS imports,
  Application Assist isolation, release assets, AI guards, skills, sandboxed
  previews/export, secure deletion, parser caps, KDF floors, and body caps.
- Hosted release hardening now gates signing, cleans CI signing material,
  blocks unsigned MSI upload, and narrows renderer notification/dialog permissions.
- Final non-`content/` audit fixes landed for company research, onboarding,
  auto-refresh gating, alert claims, HTTPS JobsWithGPT, shared import hashes,
  and `2.9.0` metadata/changelog.
- 2026-06-19 release gates cover sensors, zizmor, audit, cargo-deny,
  unsigned Windows, no-account macOS, Linux, checksums, SBOMs, attestations,
  skills, and post-matrix publication. Fresh local gates pass release
  readiness, dependency pins, doctor, security sensors, frontend `3168/3168`,
  lint/build, Rust fmt/clippy/lib `2932` with `11` ignored, E2E `278/278`,
  docs/prose, bloat, harness, and whitespace checks.

## Next Work

1. Run final local release gates from the verified commit before release action.
2. Confirm major route screenshots, Computer Use clicks, keyboard flow, and
   affected route/action/state checks after any further UI change.
3. Continue macOS readiness only after final local gates close; do
   not claim Gatekeeper-ready distribution before signing, notarization,
   stapling, and install proof exist.
4. Do not reopen repo-bloat cleanup unless a fresh bloat gate failure or
   product/privacy/security/docs verification blocker appears.
5. Keep README, docs hubs, release docs, wiki inventory, and active status in
   sync when behavior, readiness, or public guidance changes.
6. Commit each major verified change locally; push only at goal completion or
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
