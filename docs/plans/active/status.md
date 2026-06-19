# Active Plan Status

Last updated: 2026-06-19. Read this file first; load archived history only for old decision context.

## Goal State

The repo-wide goal remains open: zero known errors, privacy leaks, stale docs, brittle tests,
user-facing technical assumptions, engineer-only defaults, and unverified claims.
Current priority is v2.9.0 readiness for an urgent single-user search.

Release creation is paused. Do not push, retag, upload, or publish `v2.9.0`
until the backlog completion checklist in the active roadmap is closed and final
local gates pass again from the verified commit. Do not retag or upload over the
same `v2.9.0` release while an older workflow run is still building assets.

Rule 0 still controls the work: user data stays local unless the user explicitly
configures an external channel, external AI stays optional and disabled by
default, and users stay in control before anything leaves the device.

Quiet Shield redesign is now part of the active repo-wide goal and the repo harness.
It remains a harness-controlled active-goal acceptance gate behind primary
v2.9.0 gates; `DESIGN.md`, `docs/design/README.md`, and
`docs/design/design-spec.md` remain UI/UX contracts.

The v2.9.0 goal adds four durable release-readiness requirements:

- Add spec-compliant downloadable Agent Skills under `skills/`.
- Keep the npm package manager, repo-declared npm packages, and Cargo crates
  exact-pinned latest stable; keep resolved transitives lockfile-pinned,
  latest-compatible, and never forced outside upstream constraints.
- Support restricted job sites through explicit user-directed paths with a hard
  warning/acknowledgement gate. Do not collect logins/cookies, bypass checks,
  or run hidden background access.
- Treat all configured source adapters and user-gated restricted-source paths as
  release blockers with focused parser/import/gate coverage and UI validation.
- Near the end, run a Rust expert and multi-agent improvement analysis across
  non-`content/` surfaces, then apply and verify accepted fixes before push.

## Active Workstreams

| Workstream | State | Current focus | Source |
| ---------- | ----- | ------------- | ------ |
| Current product and quality work | Active | Resume assistance, application readability, job-card protection, guided intake, pay protection, encrypted local storage, Quiet Shield redesign, and macOS readiness | [Plan](current-work.md) |
| v2.9.0 completion and full-feature roadmap | Active | Final release gates, publication sequence, and post-release product roadmap | [Plan](v2.9.0-completion-and-full-feature-roadmap.md) |

## Current Posture

- `origin/main` is the pushed `2.7.7` release-recovery baseline; local metadata
  is staged for `2.9.0`. A premature remote `v2.9.0` tag and draft release
  exist; do not publish or delete them without explicit user approval.
- Fresh harness evidence reports 3 active docs, 3 indexed workstreams, and
  100/100. UI QA covers key routes, toasts, keyboard paths, and no passive
  Keychain prompt.
- Dependency evidence on 2026-06-18 (`npm` `11.17.0`, Node `24.17.0`, Rust
  `1.96.0`, `getrandom` `0.4.3`): `lint:deps`, `lint:actions`, and
  `release:check-deps` pass; CI/local setup activates pinned npm, direct pins
  are latest/stable, and transitives are lockfile-pinned/latest-compatible.
- Runtime credential commands, scheduler, notifications, and smoke tests use
  encrypted SQLite vault storage, file-backed app data opens through SQLCipher,
  and passive status/list checks stay non-interactive without caching the vault key.
  Settings passphrase controls exist; macOS vault keys use native Keychain user-presence access control.
- Current `2.9.0` no-account universal DMG was rebuilt after `28dcd6dd`
  with checksum `7249068da39322b2527f59b12388cb42517459a1f425d85b926ec7e713cd596f`;
  metadata, universal arch, signature, mounted/installed smoke, and private isolated data pass.
- Hosted no-account release can publish `_unsigned` Windows MSI/setup EXE,
  no-account macOS DMG, Linux AppImage/deb, checksums, SBOMs, attestations,
  skills, and final publication after successful matrix uploads.
- Private resume parser smoke checks passed on 2026-06-17 for the supplied PDF
  and eight reference profiles, with no committed local paths or names.
- Downloadable Agent Skills cover the search flow with spec-compatible
  tar.gz/ZIP packaging, strict archive/checksum/CRC/central-directory checks,
  upstream `skills-ref`, handoffs, templates, rubrics, Persona/ResumeSkills/
  career-ops coverage, and fresh 2026-06-19 lint/package/SBOM staging proof.
- LinkedIn paths expose no session-cookie fields: search links, pasted links,
  Browser Import visible-card capture, manual entry, and Workbench ledger.
  Workbench covers applied/saved/tracking/rejected/interview/follow-up/
  reminder/note/not-interested local records. 2026-06-19 checks passed without
  auth/session capture, hidden reads, automation, or submit actions.
- Desktop/mobile normal-state and Quiet Shield token checks passed for primary
  routes; forced empty/loading/error checks passed across startup and setup.
- Setup Wizard and whole-UI click/keyboard evidence exists; Applications
  2026-06-19 Search review refresh passed Chromium/WebKit route specs.
- Current 2026-06-19 release-gate refresh passes: release readiness,
  dependency/action pins, doctor, security sensors, frontend `3168/3168`,
  lint/build, Rust fmt/clippy/lib `2932` passed with `11` ignored, E2E
  `278/278`, docs/prose, bloat, harness, and whitespace checks.
- Final non-`content/` expert/agent pass is applied locally. Public wiki local
  commit `f12f8c3` adds Windows MSI/setup EXE release notes; final push pending.
- OWASP/security, Linux packaging, shared taxonomy, Scrapling no-adoption,
  specialist hardening, and public-HTTPS job-destination evidence are recorded
  in `current-work.md`, source-debug docs, and the tech-debt tracker; no open
  tech-debt rows remain from those slices.
- 2026-06-19 Browser Import review queue commit `9f1305dc` keeps user-clicked
  visible-page imports in a local in-memory review list, strips LinkedIn query
  and fragment context before local send, and writes durable jobs only after
  Save Job or Save All. Fresh evidence: full frontend `3203/3203`, restricted
  source UI/import contracts `104/104`, Rust bookmarklet `47/47`, lint, build,
  Rust fmt, Rust clippy, docs, bloat, harness, and whitespace checks passed.
  Full Rust lib was not rerun in this slice to avoid credential/keychain tests;
  the bookmarklet target covers the changed Rust surface.

## Next Best Work

1. Close the active roadmap backlog checklist before any release action.
2. Continue resume, guided intake, job-card protection, encrypted storage,
   browser assistance, source discovery, pay review, backup/restore, and AI
   readiness only where they improve truthful, reviewed, local, non-technical
   workflows.
3. Continue macOS readiness without claiming Gatekeeper-ready distribution
   before Apple credentials exist.
4. Keep harness work focused on bounded startup context, runnable verification,
   privacy/security gates, and docs accuracy. Do not add new ceremony unless it
   prevents a repeated failure.

## Completion Bar

- No known repo bloat, stale docs, generated artifacts, or duplicate sources of
  truth block product, privacy, security, or verification work.
- No known privacy leak remains in logs, command errors, renderer messages,
  safe support reports, source adapters, external AI calls, or notification
  payloads.
- No known user-facing flow assumes terminal, GitHub, debugging, engineering
  knowledge, or only technical job searches.
- Every shipped scraper, import path, and non-scraper restricted-source workflow
  has source-debug evidence, including proof that restricted-site auth material
  and hidden page state are not stored.
- Final docs, bloat, security, architecture, frontend, build, Rust, and chosen
  E2E or Computer Use gates pass before any production-ready or release-ready
  claim.
