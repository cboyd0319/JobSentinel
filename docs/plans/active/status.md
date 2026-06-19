# Active Plan Status

Last updated: 2026-06-19. Read this file first; load archived history only for old decision context.

## Goal State

The repo-wide goal remains open: zero known errors, privacy leaks, stale docs, brittle tests,
user-facing technical assumptions, engineer-only defaults, and unverified claims.
Current priority is final v2.9.0 release-gate handoff for an urgent single-user search.

Release creation is paused. Do not push, retag, upload, or publish `v2.9.0`
until final local gates pass from the verified commit and the user confirms
publication. Do not retag or upload over the same `v2.9.0` release while an
older workflow run is still building assets.

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
| Current product and quality work | Active | Final release gates and release handoff; feature rows are complete locally | [Plan](current-work.md) |
| v2.9.0 completion and full-feature roadmap | Active | Checklist closed locally; publication sequence remains user-confirmed | [Plan](v2.9.0-completion-and-full-feature-roadmap.md) |

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
- Private resume parser smoke checks passed on 2026-06-17 with no committed
  local paths or names; 2026-06-19 resume, job-quality, guided-search, and pay-offer evidence passed.
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
  commit `f34ac86` updates v2.9.0 release, recovery, and ATS portal docs; final push pending.
- OWASP/security, Linux packaging, shared taxonomy, scraper-tooling no-adoption,
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
- 2026-06-19 local interest learning now covers explicit Workbench, Browser
  Import save, bookmark, dismiss, note, saved-search, and Useful/Not for me
  actions without notes, URLs, browser state, cookies, or hidden page data.
  Fresh evidence: focused learning/UI tests `121/121`, full frontend `3209/3209`,
  lint, build, docs, bloat, harness, score, and whitespace checks passed.
- 2026-06-19 resume work has role-family taxonomy, Resume Match coverage, and
  open template/tool guidance in `src/shared/resumeWritingTaxonomy.ts`; bullet
  drafting shows Action/XYZ/CAR structures, Preview shows local export checks,
  and retail/service taxonomy covers BOPIS, curbside, planogram, and shrink terms.
- 2026-06-19 Application Preview now shows an Answer Review Checklist for exact
  questions, confirmed answers, voluntary/protected questions, and unknowns.
- 2026-06-19 Cover Letter Templates now show a local review checklist for
  blanks, truthful claims, and job-specific wording before copying/sending.
- 2026-06-19 source corpus/taxonomy covers public ATS APIs, employer web APIs,
  restricted sessions, and regional candidates.
- 2026-06-19 active roadmap checklist has no remaining Partial/Open rows; final
  affected UI refresh and E2E budget pass are recorded in the manual UI ledger.

## Next Best Work

1. Run final local release gates from the verified commit.
2. Push `main` and wiki only after the user confirms final publication steps.
3. Keep macOS readiness honest: no Gatekeeper-ready claim before Apple credentials.

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
