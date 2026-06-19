# Active Plan Status

Last updated: 2026-06-19. Read this file first; load archived history only for old decision context.

## Goal State

The repo-wide goal remains open: move JobSentinel toward zero known errors,
privacy leaks, stale docs, brittle tests, user-facing technical assumptions,
engineer-only defaults, and unverified claims. Current priority is v2.9.0
readiness for an urgent single-user job search while keeping the broader product safe for non-technical job seekers.

Release creation is now in final sequencing. Do not retag or upload over the
same `v2.9.0` release while an older workflow run is still building assets.
After it finishes, push the simplified workflow, move the tag to the verified
commit, upload while staged, and publish only after every platform succeeds.

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

## Current Posture

- `origin/main` is the pushed `2.7.7` release-recovery baseline; local metadata
  is staged for `2.9.0`. Public macOS `v2.7.7` and full cross-platform
  `v2.7.5` are legacy fallbacks until `2.9.0` assets are verified.
- Fresh harness evidence reports 2 active docs, 2 indexed workstreams, and
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
- LinkedIn config/scraper types expose no session-cookie fields. Native paths stay
  user-gated: search links, pasted links, Browser Import, manual entry, and local
  activity ledger. Manual sessions use a privacy reminder, not hard expiry.
- Desktop/mobile normal-state and Quiet Shield token checks passed for primary
  routes; forced empty/loading/error checks passed across startup and setup.
- Setup Wizard desktop/mobile, whole-UI post-design click/action coverage, and
  keyboard paths now have fresh Playwright evidence.
- Current 2026-06-19 pre-release gates pass: harness 100, docs, bloat,
  release version/environment/readiness/deps/skills, security/static sensors,
  npm/cargo audit/deny, doctor, scripts `710/710`, frontend `3124/3124`,
  lint/build, Rust fmt/clippy/tests, E2E `272/272`, and macOS DMG/SBOM/skills checks.
- Final non-`content/` expert/agent pass is applied locally. Public wiki local
  commit `f12f8c3` adds Windows MSI/setup EXE release notes; final push pending.
- 2026-06-18 OWASP CheatSheetSeries scan covered Actions, supply-chain, AI,
  storage, URL, logging, Browser Import, CSS, parsers, and follow-up hardening
  for credential binding, imports, redaction, signing, AI guards, and release drift.
- 2026-06-18 Linux packaging hardening adds exact AppImage helper hashes,
  project-local Tauri bundler tools, exact build package pins, fallback
  linuxdeploy wrapping, clean Ubuntu assets, and verified `.sha256` sidecars.
- 2026-06-18 shared taxonomy/research work moved credentials, company suffixes,
  ATS terms, bullet prompts, hard-constraint categories, and screening aliases
  into `src/shared/`; added HTML/JSON Resume/source-routing hardening and
  Scrapling no-adoption decision. Recheck this decision before release against
  current `scrapling-rs` and JobSentinel scraper evidence.
- 2026-06-19 specialist hardening closes AppImage helper rehashing, shared
  scraper hashes, fragment-free dedupe, HTTPS JobsWithGPT smoke, Browser Import
  origin binding, UI blockers, and optional ML duplicate downloader deps.
  Evidence includes frontend `3124/3124`, scripts `710/710`, targeted suites,
  Rust fmt/clippy/lib, and no open tech-debt rows.
- 2026-06-19 job-destination hardening requires public HTTPS for stored job
  links, Browser Import jobs, previews, open-link destinations, notification
  hrefs, and Application Assist targets. The local Browser Import callback
  remains `http://localhost` as the one-shot local receiver. Fresh evidence:
  affected frontend `121/121`, full frontend `3124/3124`, Rust URL/import/
  deep-link/automation/bookmarklet/db/notify suites, Rust lib `2905` passed
  with `11` ignored, targeted Chromium/WebKit UI, build/clippy/readiness/deps/
  security/docs/bloat/harness passed.

## Next Best Work

1. Use the v2.9.0 risk register to finish full scraper/import verification,
   including LinkedIn-compatible user-gated paths and the current Scrapling
   comparison.
2. Wait for the old `v2.9.0` workflow run to finish, then push main/wiki,
   retag/build/upload/publish/verify `2.9.0` no-account assets; signed Windows
   and Gatekeeper-ready macOS remain credential-backed upgrades.
3. Continue resume, guided intake, job-card protection, and encrypted storage
   only where they improve truthful, reviewed, local, non-technical workflows.
4. Continue macOS readiness without claiming Gatekeeper-ready distribution
   before Apple credentials exist.
5. Keep harness work focused on bounded startup context, runnable verification,
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
- Relevant sensors cover recurring drift classes.
- Final docs, bloat, security, architecture, frontend, build, Rust, and chosen
  E2E or Computer Use gates pass before any production-ready or release-ready
  claim.
