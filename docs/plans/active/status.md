# Active Plan Status

Last updated: 2026-06-17.

Read this file first. It is the bounded restart index for current active work.
Load archived history only when old decision context is needed.

## Goal State

The repo-wide goal remains open: move JobSentinel toward zero known errors,
privacy leaks, stale docs, brittle tests, user-facing technical assumptions,
engineer-only defaults, and unverified claims. Current priority is v2.9.0
readiness for an urgent single-user job search while keeping the broader
product safe for non-technical job seekers.

Repo-bloat cleanup is closed as of 2026-06-05; reopen only for a fresh bloat
failure blocking product, privacy, security, docs accuracy, or verification.

Release creation is paused until development and QA blockers are closed. Do not
spend time creating, uploading, or announcing new release assets while confirmed
product, scraper, privacy, documentation, harness, or Computer Use validation
work remains open.

Rule 0 still controls the work: user data stays local unless the user explicitly
configures an external channel, external AI stays optional and disabled by
default, and users stay in control before anything leaves the device.

Quiet Shield redesign is now part of the active repo-wide goal and the repo
harness. It is a harness-controlled active-goal acceptance gate. `DESIGN.md`,
`docs/design/README.md`, and `docs/design/design-spec.md` are required product
contracts for UI and UX work.

The v2.9.0 goal adds two durable release-readiness requirements:

- Add a downloadable `skills/` directory with Agent Skills that comply with the
  Agent Skills specification.
- Support LinkedIn through user-opened search links and user-clicked Browser
  Import only. Do not add LinkedIn session-cookie storage, token replay,
  background monitoring, result-list crawling, or account automation unless a
  future plan records official API approval for that exact use case.

## Active Workstreams

| Workstream | State | Current focus | Source |
| ---------- | ----- | ------------- | ------ |
| Current product and quality work | Active | Resume assistance, application readability, job-card protection, guided intake, pay protection, encrypted local storage, Quiet Shield redesign, and macOS readiness | [Plan](current-work.md) |

## Current Posture

- `origin/main` is the source of truth for the pushed `2.7.7`
  release-recovery baseline.
- Package metadata is `2.7.7`. The current public no-account macOS package is
  `v2.7.7` as of 2026-06-06; the latest full cross-platform public release
  remains `v2.7.5` until Windows and Linux `2.7.7` assets are rebuilt and
  verified.
- Fresh harness session evidence before this compaction reported 2 active docs,
  2 indexed workstreams, and a 100/100 harness score.
- macOS Computer Use retest is complete for the critical release path from an
  unlocked 2026-06-06 session against the fresh local `2.7.7` universal app:
  first-run setup, dashboard load, seeded application tracker card detail,
  native status change to Applied, dashboard count refresh, Settings Sources &
  Alerts navigation, safe support report copy, and safe support report save.
- Current UI QA evidence confirms shared modal paint fixes, removal of
  avoidable user-controlled text truncation, visible Dashboard and Hiring
  Trends toasts, Application Assist tab behavior, Pay Protection layout, Resume
  Match saved-resume display, and Settings Sources & Alerts opening without a
  passive Keychain prompt.
- Fresh dependency evidence on 2026-06-17: frontend/Rust direct dependencies
  are hard-pinned to current stable versions; `npm outdated --json` is `{}`;
  `npm audit --audit-level=moderate`, `cargo deny check advisories`, and
  `cargo audit` are clean; `cargo update --dry-run` reports zero compatible
  updates. Four transitive crates remain behind absolute latest through
  upstream Linux/Tauri and crypto paths; strict warning audit is tracked as
  SEC-002.
- Live OS keyring integration tests are now opt-in behind
  `JOBSENTINEL_LIVE_KEYRING_TESTS=1`, so default credential tests no longer
  prompt macOS Keychain while still proving LinkedIn credential storage is
  disabled before keyring access.
- v2.9.0 cannot be called done until every UI route, click, action, modal,
  toast, form, settings panel, import flow, keyboard path, empty/loading/error
  state, and narrow-width surface has fresh manual verification evidence.
- Detailed historical slice evidence from the former status file is archived in
  [active status history](../archive/active-status-history-2026-06-17.md).

## Next Best Work

1. Add and validate the downloadable `skills/` directory for job hunting and
   resume assistance, keeping private resume/profile references out of the repo.
2. Harden Browser Import as the compliant LinkedIn path: user opens a job page,
   clicks import, reviews locally, and tracks the application without JobSentinel
   logging in to LinkedIn or monitoring LinkedIn in the background.
3. Continue Quiet Shield QA against design contracts; next proof should rerun
   full test/build, packaged debug rebuild, and Computer Use for toasts,
   settings, keyboard flow, route empty states, and narrow widths.
4. Build a whole-UI manual verification map and exercise every route, click,
   action, modal, toast, form, settings panel, import flow, keyboard path,
   empty/loading/error state, and narrow-width surface before calling v2.9.0
   done.
5. Continue resume assistance only where it improves truthful local requirement
   review, hard-constraint handling, readable evidence, or next-action
   guidance.
6. Continue guided intake only where resume/profile suggestions stay optional,
   reviewed, local, and understandable for non-technical job seekers.
7. Continue job-card protection for stale, risky, duplicate, unclear, or
   pay-problem postings without treating local signals as employer
   predictions.
8. Continue macOS readiness docs and checks without claiming Gatekeeper-ready
   distribution before Apple credentials exist.
9. Continue encrypted local storage and saved-secret UX: encrypted SQLite,
   per-row AEAD vault rows, OS-protected key, passphrase mode, macOS native
   unlock, and no passive secure-storage prompts.
10. Keep harness work focused on bounded startup context, runnable verification,
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
