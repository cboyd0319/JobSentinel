# Active Plan Status

Last updated: 2026-06-18.

Read this file first; load archived history only for old decision context.

## Goal State

The repo-wide goal remains open: move JobSentinel toward zero known errors,
privacy leaks, stale docs, brittle tests, user-facing technical assumptions,
engineer-only defaults, and unverified claims. Current priority is v2.9.0
readiness for an urgent single-user job search while keeping the broader
product safe for non-technical job seekers.

Repo-bloat cleanup is closed; reopen only for a fresh blocking gate failure.

Release creation is paused until development and QA blockers are closed. Do not
create, upload, or announce assets until final design, packaging, and final verification close.

Rule 0 still controls the work: user data stays local unless the user explicitly
configures an external channel, external AI stays optional and disabled by
default, and users stay in control before anything leaves the device.

Quiet Shield redesign is now part of the active repo-wide goal and the repo harness.
It remains a harness-controlled active-goal acceptance gate; broad implementation
waits behind primary v2.9.0 gates. `DESIGN.md`, `docs/design/README.md`, and
`docs/design/design-spec.md` remain UI/UX contracts.

The v2.9.0 goal adds four durable release-readiness requirements:

- Add spec-compliant downloadable Agent Skills under `skills/`.
- Keep the npm package manager, repo-declared npm packages, and Cargo crates
  exact-pinned latest stable; keep resolved transitives lockfile-pinned,
  latest-compatible, and never forced outside upstream constraints.
- Support LinkedIn through user-opened search links and user-clicked Browser
  Import only. Do not add LinkedIn session-cookie storage, token replay,
  background monitoring, result-list crawling, or account automation unless a
  future plan records official API approval for that exact use case.
- Near the end, run a Rust expert and multi-agent improvement analysis across
  non-`content/` surfaces, then apply and verify accepted fixes before push.

## Active Workstreams

| Workstream | State | Current focus | Source |
| ---------- | ----- | ------------- | ------ |
| Current product and quality work | Active | Resume assistance, application readability, job-card protection, guided intake, pay protection, encrypted local storage, Quiet Shield redesign, and macOS readiness | [Plan](current-work.md) |

## Current Posture

- `origin/main` is the pushed `2.7.7` release-recovery baseline; local metadata
  is staged for `2.9.0`. Public macOS `v2.7.7` and full cross-platform
  `v2.7.5` are legacy fallbacks until `2.9.0` assets are verified.
- Fresh harness evidence reports 2 active docs, 2 indexed workstreams, and a
  100/100 score. Current UI QA covers first-run setup, dashboard, application
  tracking, Settings Sources & Alerts, key routes, toasts, and no passive
  Keychain prompt.
- Dependency evidence on 2026-06-18 (`npm` `11.17.0`, Node `24.17.0`, Rust
  `1.96.0`, `getrandom` `0.4.3`): `lint:deps`, `lint:actions`, and
  `release:check-deps` pass; CI/local setup activates pinned npm, direct pins
  are latest/stable, and transitives are lockfile-pinned/latest-compatible.
- Runtime credential commands, scheduler, notifications, and smoke tests use
  encrypted SQLite vault storage, file-backed app data opens through SQLCipher,
  and passive status checks stay non-interactive. Settings passphrase controls
  exist; macOS vault keys use native Keychain user-presence access control.
- macOS package smoke verification now launches fresh with restore-state
  ignored and verifier-owned temporary data plus a verifier-only database key,
  so mounted and installed package checks do not touch live app data or prompt
  for the user's Keychain.
- Private resume parser smoke checks passed on 2026-06-17 for the supplied PDF
  and eight reference profiles via `JOBSENTINEL_LOCAL_RESUME_SMOKE_PATHS`, with
  no committed local paths or names.
- Downloadable Agent Skills cover search planning, posting-risk review, resume
  tailoring, form review, tracking, outreach, interview prep, and offer/pay with
  upstream `skills-ref` and local `lint:skills` validation, `agents/openai.yaml`,
  handoffs, templates, rubrics, and Persona/ResumeSkills/career-ops coverage.
- LinkedIn runtime config/scraper types expose no session-cookie fields, and
  Browser Import manual verification passed on 2026-06-17 for desktop/mobile:
  settings, port validation, copy, private-link rejection, LinkedIn preview/save,
  duplicate handling, no console errors, and no overflow.
- Desktop/mobile normal-state and Quiet Shield token checks passed for primary
  routes; forced empty/loading/error checks passed across startup and setup.
- Setup Wizard desktop/mobile, whole-UI post-design click/action coverage, and
  keyboard paths now have fresh Playwright evidence.
- Fresh 2026-06-18 local release gates pass: version/deps/actions/security,
  docs, harness, scripts, frontend lint/unit/build, Rust fmt/full clippy/full
  `cargo test`, E2E `266/266`, npm audit, cargo deny, Tauri invokes, macOS
  readiness, current `2.9.0` no-account DMG verification, parallel hosted
  preflight, and Rust format checks before Linux package installs.
- Final non-`content/` expert/agent pass is applied locally: memory-only
  company research, accessible onboarding, auto-refresh gating, atomic alert
  claims, HTTPS JobsWithGPT endpoints, shared import hashes, and metadata.
- Last pushed v2.9.0 readiness baseline had CI passing before local follow-up.
  Current local work adds release SBOMs/manifests, exact-version asset checks,
  GitHub attestations, macOS supply-chain checks, import hardening, model pins,
  macOS dependency trimming, and Linux Debian WebKitGTK 4.1 metadata.
  Gatekeeper-ready macOS remains Apple-blocked. Public wiki `Home.md` and
  `Capabilities.md` are stale and need approval before wiki remote writes.
- OWASP CheatSheetSeries scan across 120 local files on 2026-06-18 verified
  Actions, supply-chain, AI, storage, URL, logging, Browser Import, CSS, and
  DOCX parser boundaries; follow-up now includes tag-bound releases, CI drift
  gates, OCR override restrictions, cargo-deny policy, scraper DNS pinning,
  AI obfuscation guards, sandboxed previews, secure delete, and query-plan
  boundaries.

## Next Best Work

1. Get explicit approval to update the public GitHub wiki, then sync
   `Home.md` and `Capabilities.md` with the current `2.9.0` release, security,
   source-boundary, and capability posture.
2. Verify `2.9.0` Windows/macOS/Linux release evidence before any asset
   creation or final push.
3. Continue resume assistance only where it improves truthful requirement review,
   hard-constraint handling, readable evidence, or next-action guidance.
4. Continue guided intake only where resume/profile suggestions stay optional,
   reviewed, local, and understandable for non-technical job seekers.
5. Continue job-card protection without treating local signals as employer
   predictions.
6. Continue macOS readiness docs and checks without claiming Gatekeeper-ready
   distribution before Apple credentials exist.
7. Continue encrypted storage UX; storage primitives exist, and remaining work
   is release verification and packaging readiness.
8. Keep harness work focused on bounded startup context, runnable verification,
   privacy/security gates, and docs accuracy. Do not add new ceremony unless it
   prevents a repeated failure.

## Completion Bar

- No known repo bloat, stale docs, generated artifacts, or duplicate sources of
  truth block product, privacy, security, or verification work.
- No known privacy leak remains in logs, command errors, renderer messages,
  safe support reports, source adapters, external AI calls, or notification
  payloads.
- No known user-facing flow assumes terminal, GitHub, debugging, or engineering
  knowledge.
- No known user-facing flow assumes the job seeker is only an engineer or only
  seeking technical roles.
- Relevant sensors cover recurring drift classes.
- Final docs, bloat, security, architecture, frontend, build, Rust, and chosen
  E2E or Computer Use gates pass before any production-ready or release-ready
  claim.
