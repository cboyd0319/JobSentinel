# Active Plan Status

Last updated: 2026-06-17.

Read this file first; load archived history only for old decision context.

## Goal State

The repo-wide goal remains open: move JobSentinel toward zero known errors,
privacy leaks, stale docs, brittle tests, user-facing technical assumptions,
engineer-only defaults, and unverified claims. Current priority is v2.9.0
readiness for an urgent single-user job search while keeping the broader
product safe for non-technical job seekers.

Repo-bloat cleanup is closed as of 2026-06-05; reopen only for a fresh gate
failure blocking product, privacy, security, docs accuracy, or verification.

Release creation is paused until development and QA blockers are closed. Do not
create, upload, or announce assets while product, scraper, privacy, docs,
harness, or Computer Use validation work remains open.

Rule 0 still controls the work: user data stays local unless the user explicitly
configures an external channel, external AI stays optional and disabled by
default, and users stay in control before anything leaves the device.

Quiet Shield redesign is now part of the active repo-wide goal and the repo
harness. It remains a harness-controlled active-goal acceptance gate, but broad
implementation waits behind primary v2.9.0 gates. `DESIGN.md`,
`docs/design/README.md`, and `docs/design/design-spec.md` stay required
contracts for UI/UX changes when design work resumes.

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

- `origin/main` is the source of truth for the pushed `2.7.7`
  release-recovery baseline.
- Package metadata is `2.7.7`; public macOS is `v2.7.7` as of 2026-06-06, and
  full cross-platform public release remains `v2.7.5` until Windows/Linux
  assets are rebuilt and verified.
- Fresh harness evidence reports 2 active docs, 2 indexed workstreams, and a
  100/100 score; macOS Computer Use retest covered first-run setup, dashboard,
  application tracking, Settings Sources & Alerts, and safe support report.
- Current UI QA evidence confirms modal paint fixes, visible Dashboard and
  Hiring Trends toasts, Application Assist tabs, Pay Protection, Resume Match,
  and Settings Sources & Alerts opening without a passive Keychain prompt.
- Dependency evidence on 2026-06-17 (`dompurify` `3.4.11`, `npm` `11.17.0`):
  npm/Cargo deps, npm overrides, Actions, OS runners, and direct apt packages
  match latest/stable; transitives are lockfile-pinned/latest-compatible.
  `lint:deps`, `lint:actions`, and `release:check-deps` enforce registry,
  lockfile, compatible-transitive, action, OS, apt, local-tool, and
  `npx --no-install`; constraints are recorded in the UI ledger.
- Runtime credential commands, scheduler, notifications, and smoke tests use
  the encrypted SQLite secret-vault provider. Status checks read vault metadata
  only, and live OS keyring tests remain opt-in behind
  `JOBSENTINEL_LIVE_KEYRING_TESTS=1`.
- Private resume parser smoke checks passed on 2026-06-17 for the supplied PDF
  and eight reference profiles via `JOBSENTINEL_LOCAL_RESUME_SMOKE_PATHS`, with
  no committed local paths or names.
- Downloadable Agent Skills cover search planning, posting-risk review, resume
  tailoring, form review, tracking, outreach, interview prep, and offer/pay;
  `skills/` is harness- and `skills-ref@0.1.5`-validated.
- LinkedIn runtime config/scraper types expose no session-cookie fields, and
  Browser Import manual verification passed on 2026-06-17 for desktop/mobile:
  settings, port validation, copy, private-link rejection, LinkedIn preview/save,
  duplicate handling, no console errors, and no overflow.
- Desktop/mobile normal-state checks passed for Settings, Apps, Resumes, Salary,
  Trends, Assist, Builder, and Resume Match. Forced empty/loading/error checks
  passed across startup, setup, and all primary routes.
- Setup Wizard desktop/mobile, whole-UI click/action coverage, and keyboard
  paths now have fresh Playwright evidence.
- v2.9.0 remains blocked until the remaining primary product/security gates,
  final non-`content/` expert/agent pass, redesign pass, and release checks close.

## Next Best Work

1. After primary gates close, run the final Rust expert plus multi-agent
   improvement analysis across non-`content/` surfaces, apply accepted fixes,
   and verify them before final release readiness.
2. Apply Quiet Shield/Protective Navy design decisions only after primary
   v2.9.0 readiness gates and whole-UI verification blockers are closed.
3. Continue resume assistance only where it improves truthful local requirement
   review, hard-constraint handling, readable evidence, or next-action
   guidance.
4. Continue guided intake only where resume/profile suggestions stay optional,
   reviewed, local, and understandable for non-technical job seekers.
5. Continue job-card protection for stale, risky, duplicate, unclear, or
   pay-problem postings without treating local signals as employer
   predictions.
6. Continue macOS readiness docs and checks without claiming Gatekeeper-ready
   distribution before Apple credentials exist.
7. Continue encrypted local storage and saved-secret UX: runtime AEAD vault
   storage and legacy migration now exist; next are encrypted SQLite,
   passphrase mode, and macOS native unlock.
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

## Archived Context

These files are provenance only, not startup context:

- [Active status history](../archive/active-status-history-2026-06-17.md)
- [Guided job-search intake](../archive/guided-job-search-intake-superseded-2026-06-04.md)
- [Repo cleanup and quality sweep](../archive/repo-cleanup-and-quality-sweep-superseded-2026-06-04.md)
- [Repo cleanup handoff](../archive/repo-cleanup-handoff-superseded-2026-06-04.md)
- [Research-backed product improvements](../archive/research-backed-product-improvements-superseded-2026-06-04.md)
