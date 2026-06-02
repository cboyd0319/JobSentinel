# Repo Cleanup and Quality Sweep

## Problem

JobSentinel has accumulated repo clutter, stale surfaces, and quality risks that
make broad maintenance harder than it needs to be. Earlier work added mechanical
bloat detection, but that only catches disposable artifacts. The repo still needs
an intentional pass for root clutter, nested junk, stale docs, redundant files,
and quality gaps found during the sweep.

## Scope

In scope:

- Remove bloat and junk from root and nested repo paths.
- Classify root files as required front-door files, tool config, docs that
  should move under `docs/`, or disposable clutter.
- Keep or improve mechanical sensors for disposable artifacts, generated output,
  skipped tests, weak assertions, security docs, frontend boundaries, and Tauri
  invoke drift.
- Fix concrete security, scraper, frontend, backend, documentation, and test
  issues found during the sweep.
- Treat user ease as a standalone product requirement. JobSentinel should be
  usable by people with zero technical knowledge, including issue reporting,
  recovery, setup, and troubleshooting paths.
- Treat broad job-seeker fit as a standalone design requirement. JobSentinel is
  not just for engineers; user-facing flows and examples must work for
  technical and non-technical job searches.
- Treat protective job-search guidance as a standalone design requirement.
  Ghost-job detection, pay-equity support, long-term-unemployment pacing,
  bias-aware route selection, practical tone, and local-first privacy are now
  core goal inputs, not research appendix items.
- Keep safe support report generation one-click from normal settings and
  crash/error recovery surfaces.
- Keep the macOS build and DMG package path functional, locally verifiable, and
  documented.
- Use multiple sub-agents when isolated audits, research, or implementation
  slices can move faster without shared-state conflicts. Keep sub-agent scopes
  bounded, close completed agents promptly, and record durable findings in
  active plans or the debt tracker.
- Improve the repo harness so future work captures scope, audience, ease,
  evidence, rollback, and exact verification before implementation drifts.
- Update docs when repo structure, behavior, commands, or security posture
  changes.
- Treat every tracked file under `docs/plans/active/` as part of this goal until
  it is completed, superseded, or moved out of active plans. Current active
  goal inputs are `guided-job-search-intake.md`,
  `repo-cleanup-and-quality-sweep.md`, `repo-cleanup-handoff.md`, and
  `research-backed-product-improvements.md`, plus the compact
  `status.md` restart surface.

Out of scope:

- Deleting conventional root metadata without replacement, including
  `README.md`, `LICENSE`, `SECURITY.md`, and `CODE_OF_CONDUCT.md`.
- Removing required tool config files only to make the root look smaller.
- Rewriting product behavior without a concrete defect or product decision.
- Adding telemetry, cloud dependencies, or scraper control-workaround behavior.

## Cleanup Track: Removing Bloat And Junk

This track stays open until root clutter and nested repo junk have been
inventoried, classified, and either removed, moved, merged, or explicitly kept.

Candidate classes:

- Root clutter: one-off scripts, loose docs or reports, stale configs,
  generated assets, duplicate instructions, and unowned support directories.
- Nested junk: stale reports, caches, test artifacts, obsolete examples,
  unreferenced fixtures, duplicate docs, and generated output that slipped into
  source paths.
- Keep by default: repo front-door files, required root tool config, policy
  files, active fixtures, and compatibility wrappers with current references.

Required process:

- Prove whether each candidate is referenced by scripts, docs, CI, tests,
  package manifests, or Tauri build config.
- Remove disposable files, move durable docs under `docs/`, and merge duplicate
  content instead of leaving parallel sources of truth.
- Update `.gitignore`, bloat sensors, docs, and references after each cleanup
  slice.

## Risks

- Root cleanup can break tool discovery if config files move without command
  updates. Mitigation: move files only after proving tool support or leave them
  in place.
- Junk removal can delete useful release, security, or agent context.
  Mitigation: classify purpose before removal and prefer docs relocation for
  durable content.
- Broad sweeps can become too large to review. Mitigation: commit small verified
  slices to `main`.
- Heavy E2E runs can slow iteration. Mitigation: use focused tests first, then
  run broader checks when risk warrants it.

## Milestones

- [x] Add and wire `npm run lint:bloat` into `npm run harness:check`.
- [x] Remove stale tracked generated screenshot artifacts.
- [x] Remove root and nested bloat/junk after classifying each candidate as
  keep, move, merge, or delete.
- [x] Stabilize skip-heavy Playwright suites and remove `test.skip()` sprawl.
- [x] Harden frontend job URL validation for loopback, mapped, and multicast
  targets.
- [x] Harden backend job import fetches against HTTP redirect trust-boundary
  changes.
- [x] Classify root files and mark each as keep, move, merge, or delete.
- [x] Search nested paths for stale reports, generated output, logs, build
  products, duplicate docs, and obsolete examples.
- [x] Remove or relocate confirmed bloat and update references.
- [x] Add sensor coverage for any recurring junk class found during cleanup.
- [x] Add a one-click safe support report path for GitHub issue reporting.
- [x] Improve harness docs and templates from current harness-engineering
  references.
- [x] Add normal-CI coverage for `npm run harness:check` and
  `npm run test:scripts`.
- [x] Add release and manual-build preflight gates for version agreement,
  harness checks, script tests, markdown linting, frontend build, Rust fmt,
  clippy, and Rust unit tests.
- [x] Broaden external-AI provider detection across code and config files so
  provider calls, SDKs, hosted inference endpoints, and provider API-key
  variables stay routed through the AI gateway boundary.
- [x] Extend `npm run doctor` to cover Linux Tauri system packages, Playwright
  browser readiness, and Node/Rust CI-baseline drift warnings.
- [x] Extract hardcoded harness file, snippet, and README reference-source
  policy into `docs/harness/manifest.json`.
- [x] Add compact active-goal status and archive older progress rows so restart
  context stays current without losing provenance.
- [x] Start bloat-sensor modularization by extracting filesystem artifact
  policy into `scripts/harness/checks/repo-artifacts.mjs`.
- [x] Extract package and dependency ownership checks into
  `scripts/harness/checks/dependency-ownership.mjs`.
- [x] Extract source-structure checks for unreferenced helpers, hooks, barrels,
  and notification preference wrappers into
  `scripts/harness/checks/source-structure.mjs`.
- [x] Extract E2E helper ownership checks into
  `scripts/harness/checks/e2e-helpers.mjs`.
- [x] Extract product-framing checks into
  `scripts/harness/checks/product-framing.mjs`.
- [x] Extract product-copy checks for stale resume framing, Application Assist
  automation wording, ghost-risk overconfidence, pay-guidance overconfidence,
  and resume-template audience copy into
  `scripts/harness/checks/product-copy.mjs`.
- [x] Extract release-promise drift checks into
  `scripts/harness/checks/release-promises.mjs`.
- [x] Extract initial privacy-logging checks for automation dropdown values and
  frontend error reporter forwarding into
  `scripts/harness/checks/privacy-logging.mjs`.
- [x] Harden raw automation dropdown logging and frontend error forwarding
  found by the privacy audit, with focused bloat and unit-test coverage.
- [x] Make the feedback submit flow prefer saving a local safe support report,
  add safe support report actions to modal crash recovery, and align setup
  notification docs with the current Slack-only wizard step.
- [x] Simplify problem-history/export labels, safe support report success steps,
  and generated safe support report headings so support reporting no longer
  centers account access or developer jargon.
- [ ] Audit primary user workflows for zero-technical-knowledge ease.
- [ ] Audit user-facing flows and copy for engineer-only assumptions.
- [ ] Run relevant verification and commit each cleanup slice locally. Push only
  when the full goal is complete or the user explicitly reopens remote CI.

## Current Status

As of 2026-06-02, the active plan remains open. Latest local work improved
visible zero-technical UX, broad-audience defaults, privacy/security
boundaries, and harness modularity. Immediate primary focus is
no-Apple-account macOS deployment; resume assistance remains the next
product-function priority after the no-account macOS path is locked down:

- Current local no-account macOS checksum follow-up makes
  `npm run tauri:verify:macos` validate a local `.dmg.sha256` sidecar when it
  exists and fail with `--require-checksum` when it is missing or mismatched.
  The release workflow now requires that builder-created checksum before the
  macOS upload path proceeds, and the security sensor rejects release workflow
  drift that drops `--require-checksum`, while the post-publish verifier still
  checks the downloaded public checksum asset. Gatekeeper rejection remains
  expected without an Apple Developer Account. Verification passed on macOS
  26.5:
  focused macOS script tests, full `npm run test:scripts`, `npm run lint:docs`,
  `npm run lint:security`, `npx actionlint .github/workflows/release.yml
  .github/workflows/verify-release-artifacts.yml`, `git diff --check`, `npm
  run lint:bloat`, local `npm run tauri:verify:macos` with
  `--require-checksum`, and public `npm run tauri:verify:macos:latest -- --tag
  v2.6.4`.
- Current local no-Apple-account release follow-up makes macOS tag releases
  work with the stated constraint that the project has no Apple Developer
  Account. CI builds and uploads a locally verified ad-hoc DMG when all Apple
  release secrets are missing, fails on partial secret sets, and uses signing,
  notarization, stapling, validation, and Gatekeeper acceptance only when all
  required Apple secrets exist. The latest local asset-label slice now renames
  ad-hoc public macOS DMGs to include `_no-account_` before checksum
  creation/upload, makes the public release verifier reject unlabeled
  no-account DMGs or `_no-account_` labels on Gatekeeper-required releases, and
  adds security sensor coverage for that release gate. Verification passed:
  `npx actionlint .github/workflows/release.yml`, `npm run lint:security`,
  `node --test scripts/check-security-sensors.test.mjs`, `npm run lint:docs`,
  `npm run test:scripts`, `npm run lint:bloat`, `git diff --check`, and `npm
  run tauri:verify:macos:latest -- --tag v2.6.4` on macOS 26.5 with SIP
  enabled. Gatekeeper rejection remains expected for the no-account package.
- Current local reviewed-resume-skill sorting follow-up adds an explicit Resume
  page control to use or stop using reviewed local skills for job sorting.
  Backend config commands, browser/dev mocks, feature docs, and privacy labels
  now match that local-only sensitive workflow.
- Current local runtime-settings follow-up fixes current-session configuration
  staleness. Saved settings now update both disk and runtime memory, scheduler
  cycles use a current config snapshot, health/source-status smoke commands use
  managed app state, and resume-enabled score cache entries include the active
  resume id so base keyword scores cannot drift into resume scoring.
- Current local resume category-drift harness follow-up adds frontend-contract
  and repo-bloat sensor coverage so backend resume suggestion categories,
  browser/dev mocks, Resume Match Helper labels, and Resume Builder live review
  labels cannot silently drift. The sensor rejects stale `RemoveItem`, missing
  backend or mock categories, and missing plain labels for `FormatFix` and
  `ReorderContent`. Focused frontend-contract and repo-bloat fixture tests
  passed, live `npm run lint:bloat` passed, and `npm run test:scripts` passed.
- Current local Resume review evidence-label cleanup changes ResumeOptimizer
  and AtsLiveScorePanel away from format-result percentages, `Overall Match`
  wording, and row-level score percentages. The visible UI now uses Resume Fit,
  Overall fit, and evidence labels while keeping internal progress-bar math.
  Product-copy sensors now cover the Resume review surfaces and reject the old
  visible result/scorecard copy. Focused ResumeOptimizer, AtsLiveScorePanel,
  and product-copy verification passed. Broader lint, script, bloat, and
  diff-check verification passed.
- Current local fit-factor display cleanup removes user-visible factor
  percentages from ScoreDisplay tooltips and the Fit Details modal. Tooltip
  factors now show plain priorities and statuses; modal factor badges now show
  evidence labels instead of per-factor percentages. Product-copy sensors now
  reject the old JSX factor-percent displays while leaving internal bar math
  intact. Focused ScoreDisplay, ScoreBreakdownModal, and product-copy
  verification passed. Broader lint, script, bloat, and docs verification
  passed.
- Current local privacy/responsible/resume fit-language cleanup changes
  `PRIVACY.md`, `RESPONSIBLE_AI.md`, and the Resume Match feature guide away
  from match-score and match-result wording toward fit-level and fit-estimate
  wording. Product-copy sensors now cover those maintained docs and reject
  stale match-score, low/strong match, and match-result headings. Focused
  product-copy, bloat, docs, harness, script, and diff-check verification
  passed.
- Current local fit-estimate style-guide cleanup changes maintained writing
  guidance, glossary, Smart Scoring docs, and the active guided-intake plan away
  from match-score and match-factor wording toward fit-estimate language.
  Product-copy sensors now cover those maintained docs and reject stale
  match-score, match-percentage, Match Factors, and alert-threshold drift.
  Focused product-copy, bloat, docs, harness, script, and diff-check
  verification passed.
- Current local fit-and-recovery wording cleanup changes job relevance labels
  from match/ranking language to fit/review language across setup, dashboard
  filters, score displays, Resume evidence panels, notifications, guided tour,
  user-data docs, and smart-scoring docs. It also keeps raw problem messages
  out of the App Problem History list, renames local recovery cleanup to
  `Reset Local App Settings`, and clarifies login-required deep-link and
  email-service setup docs. Product-copy sensors now reject the old labels and
  recovery wording. Focused SetupWizard, Dashboard filters, ScoreDisplay,
  ScoreBreakdownModal, ErrorLogPanel, ErrorBoundary, Resume, Settings,
  product-copy, and lint verification passed. Broader docs, bloat, script,
  harness, and diff-check verification passed.
- Current local zero-technical setup-copy cleanup makes Slack alerts explicit
  opt-in after a connection link is pasted, changes manual email and USAJobs
  setup labels to plain user wording, masks outside job-source previews to the
  site name until the user chooses to show the full link, and changes
  feedback/resume review copy away from diagnostic and prescriptive language.
  Focused Settings, ResumeOptimizer, DebugInfoPreview, script, docs, lint,
  bloat, and diff-check verification passed.
- Current local alert-filter copy cleanup replaces old alert-strength wording
  with `How picky alerts are`, updates notification docs away from
  scoring internals, and adds product-copy sensors against the old label and
  interim jargon. Focused NotificationPreferences, product-copy, docs, and
  diff-check verification passed.
- Current local Resume Match action-copy cleanup renames the old tailor-resume
  button to `Review in Resume Builder`, matching the actual action and avoiding
  optimization-style resume wording. Product-copy sensors now reject the old
  label. Focused ResumeOptimizer and product-copy verification passed.
- Current local App Problem History support-copy cleanup renames the advanced
  local log action to `Advanced: Save Private App Log`, keeps stack and screen
  traces out of safe support report text, changes GitHub-open failures to
  online-help wording, and adds product-copy sensors against older
  detailed-report labels, raw stack/report labels, and GitHub-specific failure
  copy. Focused ErrorLogPanel, feedbackService, product-copy, stale-copy
  search, lint, bloat, docs, and diff-check verification passed.
- Current local external-AI gateway hardening requires a reviewed
  `redactedPayload` whenever redaction is enabled, sends only that reviewed
  payload to provider transports, and rejects payload fields the gateway has
  not classified. Red-test, aiGateway, external-AI sensor, security,
  architecture, docs, bloat, test-quality, product-copy, lint, build, and
  diff-check verification passed.
- Current local application-profile IPC minimization trims the edit-profile
  response and mock response to fields the profile form needs, removing unused
  backend metadata such as ids, default template fields, and timestamps.
  Focused mock/ProfileForm, Rust response, Tauri invoke, Rust formatting, lint,
  build, docs, bloat, and diff-check verification passed.
- Current local Settings safety-copy follow-up makes saved support reports
  review-first before sharing, changes source suggestions from recommendations
  to optional review, and clarifies chat connection links should be treated like
  passwords. Focused Settings, product-copy, lint, docs, bloat, and diff-check
  verification passed.
- Current local API cache-key privacy hardening replaces raw argument JSON in
  in-memory cache keys with an opaque deterministic hash, so cache statistics
  do not expose resume text, salary floors, or other request argument values.
  Red-test, API, lint, build, docs, bloat, and diff-check verification passed.
- Current local source-status wording cleanup replaces remaining user-facing
  `source health` wording with `source status` in README, roadmap, source
  guides, and ScraperHealthDashboard log context. Product-copy sensors now
  reject source-health drift. Focused ScraperHealthDashboard, product-copy,
  stale-phrase, bloat, and docs verification passed.
- Current local user-doc help-heading cleanup replaces remaining user-facing
  `Troubleshooting` headings with plain "When Something Does Not Work" or
  source-status help language across Quick Start, Deep Links, feature guides,
  and source docs. Product-copy sensors now reject those headings and table
  labels. Focused product-copy, stale-heading, bloat, and docs verification
  passed.
- Current local sidecar-finding cleanup replaces restricted-automation source
  policy wording, command-first profile customization guidance, resume-app
  export placeholder/error copy, and guarantee framing in saved-secret docs.
  Product-copy sensors now reject those exact drifts. Focused Resume Match,
  product-copy, stale-phrase, bloat, and docs verification passed.
- Current local README and source-guide wording cleanup replaces internal
  bounded-request, source-specific-boundary, retry-helper, and source-boundary
  flow wording with plain source-check, allowed-use, wait-between-checks, and
  local-save wording. Product-copy sensors now reject the old implementation
  phrases. Focused product-copy, docs, stale-phrase, and bloat verification
  passed.
- Current local Deep Links browser-search cleanup changes automatic-check copy
  to browser-review and scheduled-source-check wording. Product-copy sensors
  now reject `does not check automatically` and `automatic checking` drift in
  addition to scan/automation wording. Focused Deep Links, product-copy,
  stale-phrase, and bloat verification passed.
- Current local scheduled-check wording cleanup changes remaining USAJobs and
  Quick Start automatic-check copy to scheduled/next-step wording. Product-copy
  sensors now reject newline-hidden `automatic USAJobs checks`, Quick Start
  `watching the allowed sources`, and `Here's what happens automatically`
  drift. Focused Settings, product-copy, stale-phrase, and bloat verification
  passed.
- Current local Telegram alert setup copy cleanup removes visible automatic-alert,
  bot-command, and chat-number wording from Settings and the Notifications
  guide. Telegram stays optional, but the primary UI no longer teaches
  `@BotFather`, `/newbot`, or `@userinfobot` setup steps. Product-copy sensors
  now reject those drift phrases. Focused Settings, product-copy,
  stale-phrase, docs, and script verification passed. Broader bloat, docs,
  lint, and diff-check verification passed.
- Current local telemetry-comment cleanup removes analytics-service and
  automatic-error-reporting language from web-vitals and error-boundary comments
  so comments match Rule 0 local-first behavior. Product-copy sensors now reject
  those drift phrases. Focused product-copy, affected Vitest, targeted
  stale-phrase, and diff-check verification passed. Broader bloat, docs,
  script, lint, and diff-check verification passed.
- Current local Resume Builder doc attachment-wording follow-up changes upload
  preview and ready-to-upload phrasing to application-preview and attach
  wording. Product-copy sensors now reject the old Resume Builder doc phrases.
  Focused product-copy, docs, targeted stale-phrase, and diff-check verification
  passed. Broader bloat, docs, script, lint, and diff-check verification passed.
- Current local Smart Scoring doc resume-wording follow-up changes the remaining
  uploaded-resume phrasing to added-resume phrasing in the feature guide.
  Product-copy sensors now reject the old Smart Scoring doc wording. Focused
  product-copy, docs, targeted stale-phrase, and diff-check verification passed.
  Broader bloat, docs, script, lint, and diff-check verification passed.
- Current local Application Profile resume-file help follow-up changes the
  tooltip from generic application-review wording to local, user-controlled
  attachment wording. Product-copy sensors now reject the old ProfileForm
  tooltip. Focused ProfileForm, product-copy, targeted stale-phrase, and
  diff-check verification passed. Broader bloat, docs, script, lint, and
  diff-check verification passed.
- Current local Application Assist resume-file copy follow-up changes the manual
  task label from resume-upload wording to user-controlled resume-file wording.
  Product-copy sensors now reject the old Application Preview label. Focused
  Application Preview, product-copy, targeted stale-phrase, and diff-check
  verification passed. Broader bloat, docs, script, lint, and diff-check
  verification passed.
- Current local Resume Builder add-copy follow-up changes import-skill recovery
  copy from upload wording to add wording so users do not infer cloud transfer
  for local resume review. Product-copy sensors now reject the old Resume
  Builder upload phrasing. Focused product-copy, targeted stale-phrase, and
  diff-check verification passed. Broader bloat, docs, script, lint, and
  diff-check verification passed.
- Current local Resume Match add-copy follow-up changes local Resume Match
  surfaces and feature docs from choose/upload wording to choose/add wording.
  Product-copy sensors now reject the old local-resume upload phrasing in the
  page, details component, and feature doc. Focused Resume Match, product-copy,
  targeted stale-phrase, bloat, docs, script, lint, and diff-check verification
  passed.
- Current local resume-add copy follow-up changes local Resume page and Settings
  resume-match copy from upload/uploaded wording to add/added wording so users
  do not infer cloud transfer for local resume review. Product-copy sensors now
  reject the old local-resume upload labels in those paths. Broader bloat,
  docs, script, lint, and diff-check verification passed.
- Current local resume-error copy follow-up fixes shared error precedence so
  resume-not-found and resume-parsing failures use resume-review recovery
  instead of page/source recovery. It replaces upload/service wording with
  local-first resume-review copy and adds focused utility plus product-copy
  coverage. Broader bloat, docs, script, lint, and diff-check verification
  passed.
- Current local Browser Import doc/code follow-up removes remaining
  user-visible `import helper` wording from the Browser Import guide and the
  generated browser-button failure alert, and adds Rust plus product-copy
  coverage. Focused product-copy, Rust bookmarklet, Rust fmt, and targeted
  stale-phrase verification passed. Broader bloat, docs, script, lint, and
  diff-check verification passed.
- Changed Settings, Quick Start, and notification docs away from technical-first
  email setup wording toward email-service and encrypted sending language.
  Focused Settings, product-copy, search, script, bloat, harness, docs, lint, and
  diff-check verification passed; remote `Docs Harness` and `CI` passed for
  commit `d31a48fb`.
- Committed local saved-secrets docs follow-up rewrites the credential feature doc
  as a plain saved-secrets guide, keeps developer implementation details in
  `docs/security/KEYRING.md`, updates docs index wording, and adds product-copy
  sensors against developer-reference drift in the feature doc. Focused
  security-doc, product-copy, bloat, harness, docs, script, and diff-check
  verification passed.
- Committed local notification-doc cleanup removes maintainer-only alert delivery,
  raw connection-link, and module-structure details from the user-facing
  notification guide. Focused product-copy, targeted-search, bloat, and harness
  verification passed.
- Current local architecture-doc accuracy slice aligns developer credential and
  notification module docs with live Rust names, service naming, legacy LinkedIn
  cleanup, and alert privacy boundaries. Focused docs-drift, targeted-search,
  bloat, and harness verification passed.
- Changed README source coverage, source feature docs, public job-source issue
  template, shared source labels, and frontend mocks from `HN Who's Hiring`
  wording to `Startup and tech job posts`. Focused source-label, Settings,
  SetupWizard, product-copy, search, script, bloat, harness, docs, lint, and
  diff-check verification passed.
- Changed optional source-contact result labels from failure-first words to
  `Needs attention` and `Took too long`, and changed reusable async-button
  guidance from `Failed to...` to `Could not...`. Focused AsyncButton,
  Settings, product-copy, script, bloat, lint, and diff-check verification
  passed.
- Changed optional dev toast, component boundary, modal boundary, and
  certificate-error wording away from support-detail, generic-error, and issue
  labels toward app-problem and problem wording. Focused utility/component,
  product-copy, privacy-logging, script, bloat, lint, and diff-check
  verification passed.
- Changed feedback sharing, success-step, Settings source, setup source,
  source-status table, Resume Builder/Optimizer recovery, Browser Button, and
  error-boundary detail labels away from GitHub-first, issue-first,
  HN-abbreviation, support-only, and technical recovery wording. Focused UI,
  product-copy, script, bloat, lint, and diff-check verification passed.
- Changed remaining Settings and support-report jargon: manual email setup now
  uses email-service wording, USAJobs uses jobs-to-check wording,
  connected-source review uses job-source link labels, and Error Log exposes a
  detailed local report without troubleshooting wording. Focused Settings,
  ErrorLogPanel, bloat, product-copy, harness, docs, script, lint, and
  diff-check verification passed.
- Changed the detailed local report tooltip and Browser Button docs from
  support-only wording to help-requested-use wording. Focused ErrorLogPanel,
  product-copy, and bloat checks passed.
- Hardened detailed local report JSON export so frontend error-report records
  are re-sanitized at export time. Added Vitest coverage for private job-search
  details in detailed local report output and a privacy sensor against raw
  `errors: this.errors` export drift.
- Changed feedback submit and success screens so optional GitHub sharing uses
  online-help wording instead of maintainer/issue-page wording, while the local
  safe support report path stays primary. Added product-copy guards against the
  old phrases.
- Committed local Application Profile stat-copy follow-up replaces `Marked Sent`
  and `Ready to Send` with user-action wording so the page does not imply
  JobSentinel sends applications. Focused verification passed: `npx vitest run
  src/pages/ApplicationProfile.test.tsx` passed 1 test, `node --test
  scripts/check-product-copy.test.mjs` passed 33 tests, targeted component
  search found no stale labels, `npm run lint:bloat`, `npm run lint:docs`,
  `npm run test:scripts` passed 458 script tests, `npm run lint`,
  `npm run harness:check`, and `git diff --check` passed.
- Committed local Settings source-toggle copy follow-up replaces remaining
  `automatic checks` wording with scheduled-job-check wording in source
  guidance and checkbox accessible names. Focused verification passed:
  `npx vitest run src/pages/Settings.test.tsx` passed 38 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 33 tests, targeted Settings
  search found no stale phrase, `npm run lint:bloat`, `npm run lint:docs`,
  `npm run test:scripts` passed 458 script tests, and `npm run lint` passed.
- Committed local Browser Button copy follow-up replaces `Import Helper`,
  `Advanced browser button setting`, `Browser helper number`, and remaining
  import-helper wording with browser-import and optional setup wording.
  Focused verification passed: `npx vitest run
  src/components/BookmarkletGenerator.test.tsx` passed 3 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 33 tests, targeted component
  search found no stale helper phrases, `npm run lint:bloat`,
  `npm run lint:docs`, `npm run test:scripts` passed 458 script tests, and
  `npm run lint` passed.
- Committed local Job Source Status copy follow-up replaces feed, page-read, and
  not-needed labels with public-job-list, reads-job-details, and
  official-source wording. Focused verification passed: `npx vitest run
  src/components/ScraperHealthDashboard.test.tsx` passed 56 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 33 tests, targeted component
  search found no stale labels, `npm run lint:bloat`, `npm run lint:docs`,
  `npm run test:scripts` passed 458 script tests, and `npm run lint` passed.
- Changed generated support-report labels from support-only wording to safe app
  details and added product-copy coverage against those labels returning.
- Changed the detailed local report tooltip from maintainer wording to plain
  help wording and added product-copy coverage against the old tooltip.
- Changed broken-link and invalid saved-detail recovery docs away from
  maintainer/GitHub assumptions. The safe support report path stays primary,
  GitHub is framed only as optional for users who already use it, and
  product-copy tests reject the old phrases.
- Changed README support copy and Settings support surfaces away from
  maintainer GitHub assumptions and troubleshooting-first labels. The visible
  Settings support area now says `Help and Status`, and product-copy tests
  reject the old phrases.
- Applied read-only agent findings across README download/data-boundary wording,
  Quick Start install and local-file wording, Deep Links
  contributor/browser-add-on wording, Browser Button privacy wording,
  notification and credential docs, public issue templates, SECURITY, and
  CODE_OF_CONDUCT. Product-copy tests reject the old phrases.
- Changed the optional connected-source contact history label from
  `Source host` to `Website contacted`, updated Settings coverage, and added a
  product-copy guard against raw source metadata labels returning.
- Changed the Dashboard summary-widget failure message from bare load-failure
  copy to `Try again, or copy a safe support report` recovery wording, with
  focused component and product-copy coverage.
- Changed the Dashboard summary toggle and chart region from analytics wording
  to `Application Summary` and `Application summary charts`, with product-copy
  coverage against the old labels.
- Changed remaining Dashboard summary labels from chart jargon to
  job-search-language: `Weekly Applications`, `Where Jobs Came From`,
  `Pay Ranges Found`, and `At a Glance`.
- Changed the Applications modal entry and modal headings from analytics and
  response-time wording to application-summary, status, reply, and employer
  reply wording. Product-copy coverage now rejects the old visible phrases.
- Changed Browser Button help-only settings from `Support number` to
  `Browser helper number` with support-reply guidance. Product-copy coverage now
  rejects the old label.
- Changed Resume Match helper wording from strong/power resume words to action
  words for clarity. Product-copy coverage now rejects the old labels.
- Changed USAJobs automatic-check settings from `keywords`, posted-within, and
  max-results wording to search words, recent jobs, and jobs-to-check copy.
  Product-copy coverage now rejects the old phrasing.
- Changed notification preferences from settings/control jargon to plain
  job-alert rules: the global switch, source state copy, title-word rules,
  remote-only label, and company-alert labels now read as user choices.
  NotificationPreferences and product-copy tests reject the old phrases.
- Changed keyboard-help and quick-action labels from power-user terms to plain
  app actions: keyboard help, moving around, app-wide, search and refresh,
  save/unsave job, select/unselect job, Hiring Trends, and saving current form
  changes. Component/context tests and product-copy sensors reject the old terms.
- Changed shared recovery messages from source-disabled, website-format,
  request-limit, More Settings, notification-settings, and system-date wording to
  source-turned-off, job-website-changed, check-limit, alert-channel,
  alert-settings, and computer-date wording. Error-message and product-copy tests
  reject the old terms.
- Changed Resume Readability labels from complete/completeness, missing/issues,
  view-details, and full-review wording to details, details included, to-review,
  details-to-check, review-details, and readable review wording. Focused
  AtsLiveScorePanel and product-copy tests reject the old labels.
- Changed Settings tabs from Basic Settings and More Settings to Search
  Preferences and Sources & Alerts. Dashboard no-source copy, Quick Start,
  notifications docs, smart-scoring docs, Settings tests, Dashboard tests, and
  product-copy sensors guard the old labels and old setup path.
- Changed ResumeOptimizer resume-match score label from Completeness to Details
  included. ResumeOptimizer and product-copy tests guard the old label.
- Changed notification docs from advanced/webhook/native-OS setup wording to
  connection-link, optional phone-chat, desktop-alert, and manual email
  reference language. Product-copy tests guard the old phrases.
- Changed resume-builder and smart-scoring docs from Readability Score,
  Completeness, and advanced scoring configuration wording to readable-format,
  details-included, and extra-match-settings language. Product-copy tests guard
  the old phrases.
- Changed ghost-detection docs from low-trust-listing and stale Ghost Detection
  Settings path wording to listing-needs-review and `Settings > Sources & Alerts
  > Posting Risk and Freshness` language. Product-copy tests guard the old
  phrases.
- Changed Deep Links docs from "does not monitor directly" opening wording to
  browser-opened search-link language. Product-copy tests guard the old phrase.
- Changed Hiring Trends docs and Market UI copy from monitored-posting,
  skill-demand, source-bias, job-board-bias, chart-title, and support-log wording
  to plain job-pool, check-several-sources, and hiring trend language.
  Product-copy tests guard the old phrases.
- Changed privacy and source-health docs from lowercase source-host metadata
  wording to website-contacted, count-only request-category, and outcome
  language. Product-copy tests guard the old labels.
- Changed support-preview privacy copy from absolute removes-private-details
  wording to common-private-details and review-before-sharing language.
  DebugInfoPreview and product-copy tests guard the old claim.
- Changed Pay Protection visible guidance and feature docs from career-jargon
  wording to too-low-title-or-pay-level language. Salary and product-copy tests
  guard the old term.
- Changed outside-AI gateway guardrail messages from provider/payload/sensitive
  jargon to review-first outside-AI, public-job-details, and private-details-stay-local
  language. Gateway and product-copy tests guard the old wording.
- Changed email-alert setup labels from provider-address/provider-number wording
  to manual-email-setup and email-service labels. Settings and product-copy
  tests guard the old labels.
- Changed USAJobs setup from old shortcut phrasing to scheduled-check and
  on-your-schedule wording. Settings and product-copy tests guard the old
  phrases.
- Expanded README network disclosure for enabled job-source checks, approved
  job-source feeds, user-configured channels, support links, location detection,
  and approved external AI payloads. Replaced source-adapter, HTTP-client,
  background-monitoring, and duplicate handling jargon in front-door source docs
  and product-copy sensors now guard the old phrases.
- Changed README, ROADMAP, RESPONSIBLE_AI, and the README information-design
  harness from ATS-first front-door labels to hiring-system and hiring-platform
  language while keeping research links intact. Product-copy tests guard the old
  labels.
- Changed Resume Matcher docs and active research no-goal language from
  ATS-internals and ATS-manipulation wording to employer-screening-system
  language. Product-copy tests guard the old phrases.
- Changed notification docs and Quick Start from old email-provider-details,
  Slack app-from-scratch, secure-credential-manager, and provider-guidance
  wording to manual-email-setup, connection-link, password-store, and
  email-service language. Notification troubleshooting now uses turned-on,
  check, and permission wording instead of enabled/verify/admin/manual-provider
  wording. Product-copy tests guard the old phrases.
- Changed application-tracking docs from old mail-protocol privacy-label
  wording to email-alert language and source docs from setup, diagnostics, and
  metadata wording to user-turned-on source, troubleshooting, and
  safe-status-detail language. Also replaced old source setup and credential
  wording with user-approved job-source feeds, saved access details, and
  turned-on access-code language. Product-copy tests guard the old phrases.
- Changed Settings, support-history export, notification docs, credentials
  security docs, privacy/AI policy docs, market docs, user-data docs,
  application-tracking docs, and resume-matcher docs from technical setup and
  policy wording to turned-on, connection-link, password-store,
  request-detail, and local-troubleshooting language. Harness/PR checklist
  snippets now use request-review wording. Product-copy tests guard the old
  phrases.
- Changed Application Assist suggested-answer failure copy from a bare saved
  answers message to support-report recovery wording, with focused component and
  product-copy coverage.
- Replaced vague application-profile slow-load copy with
  `Still opening your application profile...`, added a focused ProfileForm
  test, and extended product-copy coverage against the old phrase.
- Changed app and page error recovery copy from browser-style reload wording to
  explicit reset wording, updated ErrorBoundary expectations, and added
  product-copy coverage against reload labels returning.
- Replaced remaining support-report preview `more events` copy, raw event-detail
  labels, and generated `frontend errors omitted` wording with app-action and
  app-problem language, then added product-copy and feedback service coverage.
- Changed default settings-backup download filenames from
  `jobsentinel-config-*` to `jobsentinel-settings-backup-*`, updated export
  utility tests, and added product-copy coverage so user-visible backup
  artifacts do not drift back toward config jargon.
- Added active-status docs-drift checks so the compact status fails locally when
  its `Last updated` date lags newer active-plan entries or when it records
  stale measured harness counts instead of pointing to
  `npm run harness:session -- --json`.
- Tightened Job Import preview copy so missing details are shown as readable
  details-to-check labels instead of raw backend field names, with focused
  component and product-copy harness coverage against drift.
- Replaced stale saved debug-report file, reveal, and failure-log wording in
  support-report paths with support-report wording and added product-copy
  harness coverage for the backend recovery string.
- Replaced visible resume missing-word prompts from add-word framing to
  review-word framing across resume review surfaces and added product-copy
  harness coverage against old add-word copy.
- Integrated read-only sub-agent audit findings across first-run privacy copy,
  optional source setup, email security, pay guidance, resume import success,
  ghost reason labels, live resume tips, scoring contribution labels, and
  source-health table headings, with product-copy harness coverage for the stale
  phrases.
- Reworked the source-health recent-status table so non-technical users see
  plain labels instead of raw success percentages. Feature docs now describe the
  same user-facing surface, and product-copy coverage rejects stale metric-first
  display code.
- Reworked pay-protection wording in the README, roadmap, pay-equity research
  brief, Hiring Trends docs, Resume Match docs, and README information-design
  harness notes so front-door copy talks about lower-title, lower-pay, and
  below-floor risk instead of optimization or under-leveling jargon. Product-copy
  coverage rejects the stale phrases.
- Corrected README and PRIVACY.md external-channel wording so configured alert
  channels are separate from user-opened GitHub/Google Drive support links.
  Product-copy coverage now rejects conflating GitHub or Google Drive with
  external alerts.
- Added a visible Settings reminder for optional connected job sources after
  approval: the approved state applies only to the displayed exact details, and
  any change keeps the source off until the user approves again. Feature docs and
  focused Settings coverage reflect the behavior.
- Reworked user-facing search-link and ghost-detection docs away from
  advanced/monitored-source wording toward plain job-source and more-control
  language, with product-copy coverage against the old terms.
- Tightened another zero-technical support and protective-copy slice: public
  issue templates now avoid bug/feature/scraper-first wording, safe support
  report docs require review before sharing, source status avoids
  all-sources/login jargon, saved-search summaries map raw filter IDs to plain
  labels, score details use influence labels, ghost-risk tooltips avoid
  warning-theater wording, resume/pay recommendations stay advisory, and
  product-copy sensors reject the old phrases.
- Tightened Rule 0 and zero-technical surfaces after the latest sub-agent
  audit: first-run labels now ask for the work the user wants, Hiring Trends
  alerts no longer use market-alert wording, settings backup copy marks the
  artifact private, public issue templates warn against personal details, safe
  support reports include the user's sanitized description, and frontend plus
  backend sanitizers now redact phone numbers and known person-name fields.
  Product-copy sensors guard install-warning, privacy-claim, source-label,
  issue-template, first-run, and Hiring Trends wording.
- Reordered core synonym taxonomy so customer, office, care, public-sector,
  business, creative, and product examples come before programming and
  engineering groups. Broad-audience harness coverage now rejects tech-first
  synonym ordering.
- Removed preloaded company-source URLs from product, UX, content, and
  marketing profile JSON files so broad non-technical templates do not choose a
  narrow tech or SaaS employer list for the user. Broad-audience harness
  coverage now rejects official company source URLs in broad profile seeds.
- Reordered notification setup for broad non-technical users: Settings now
  starts with desktop alerts, follows with email, and presents Slack, Discord,
  Teams, and Telegram as optional chat alerts for users who already use those
  tools. Quick Start and notification docs mirror this order.
- Tightened external output boundaries after sub-agent security audit:
  renderer CSP is self-only for `connect-src`, `Database::upsert_job` rejects
  localhost/private/userinfo/non-HTTP job links before storage, Application
  Assist validates job links before loading profile data or opening a browser
  page, and alert email HTML escapes scraped job fields plus validates links
  before rendering `href` attributes. `npm run lint:security` now checks that
  known external hosts do not return to renderer CSP.
- Fixed a no-source Dashboard recovery dead end: if no monitored job source is
  enabled and the job list is empty, the primary action now opens Settings to
  turn on job sources and the secondary action opens job-posting import instead
  of offering a search that can only warn.
- Reworded the feedback submit path and README reader map so GitHub issue
  sharing is an optional maintainer path, while saving the safe support report
  remains the no-account primary path.
- Reworked front-door support and privacy copy so README support links,
  broken-link help, setup review, and Quick Start data guidance lead with
  in-app safe support reports, Send Feedback, and local-first defaults without
  claiming selected job sources or alert providers are never contacted.
- Narrowed tech-source heuristics so broad roles such as sales engineer,
  curriculum developer, support engineer, customer success engineer, and
  technical product manager do not inherit RemoteOK, HN, WeWorkRemotely, Dice,
  or BuiltIn recommendations unless explicit software/data/security role
  signals are present. A follow-up also prevents standalone stack or tool
  keywords such as SQL, Python, and AWS from enabling tech-heavy sources for
  broad accounting, operations, or sales searches.
- Reworked optional provider setup in Settings so USAJobs starts with a
  no-setup browser-search path before optional scheduled checks, and
  Telegram bot details stay behind an optional chat-alert path for users who
  already use Telegram bots.
- Reworked cover-letter template auto-fill buttons so non-technical users see
  plain labels instead of brace-token syntax. Token insertion remains available
  internally, copy guidance now says blanks instead of placeholders, and
  product-copy coverage rejects the old raw placeholder-chip wording.
- Reworked source labels into a shared helper used by job cards, Dashboard
  filters, saved-search summaries, comparison rows, and duplicate-review rows
  so raw source IDs such as `manual_import` are not visible to users.
- Reworked the Application Assist preview badge accessible label from
  "Application tracking system" to "Application form" and added product-copy
  coverage against that user-facing ATS-jargon regression.
- Reworked Resume saved-skill chips and rows so users see "Found in resume" or
  "Added by you" instead of unlabeled confidence percentages, with product-copy
  coverage against confidence-score display drift.
- Reworked the live Resume Builder readability panel so users see checking,
  saved-job, view-details, details-to-check, how-to-fix, and why-it-helps copy
  instead of full-analysis, job-context, raw severity, fix, or impact wording.
  Notification setup errors now point to a saved alert channel instead of a
  configured channel, and product-copy sensors reject the old phrases.
- Reworked the Resume Match review details page to use the same plain labels:
  raw severity values are mapped before display, format issues become details
  to check, fix and impact labels become how-to-fix and why-it-helps copy, and
  the Resume Builder handoff toast no longer says job context.
- Reworked generic user-facing error fallbacks so related-data, email,
  file-permission, resume-read, and long-document failures use plain titles and
  recovery steps instead of technical labels. Product-copy sensors now reject
  the old fallback wording.
- Removed raw screening-question text and saved answer patterns from
  Application Assist debug logs. Form-fill traces and screening-answer command
  logs now record only counts, IDs, and booleans when a saved answer matches or
  answer history changes, with privacy-logging coverage against raw trace drift.
- Removed more broad-audience copy drift from user-visible flows:
  Dashboard search help now points users to Search Words to Avoid instead of
  teaching minus-sign operators, saved screening answers show plain match and
  learning labels instead of raw patterns or percentages, site challenge errors
  avoid bot-detection language, Auto-Search help avoids "never miss" pressure,
  and Slack notification docs are framed as advanced chat setup behind easier
  desktop/email alert paths.
- Reworked Application Assist screening-answer suggestion cards so users see
  Suggested Answers, review-state labels, edit-frequency labels, and saved or
  used source labels instead of "Smart Suggestions," confidence percentages,
  modification percentages, or raw Manual/Learned/History badges.
- Reworked Application Assist site-check copy so user-facing warnings,
  preview tasks, and one-click application docs say human check instead of
  leading with CAPTCHA terminology, while still saying JobSentinel leaves that
  step to the user.
- Expanded frontend error-report sanitization so sensitive job-search context
  redacts before local persistence, dev console forwarding, and exported safe
  support reports. The sanitizer now covers salary floors, resume text, private
  notes, application history, screening questions and answers, location
  preferences, career goals, personal circumstances, and labeled sensitive text,
  with focused unit and privacy-logging harness coverage.
- Reworded safe app details in the feedback flow and generated support reports
  so setup summaries use plain states such as saved, set, not set, turned on,
  added, and not added instead of `configured`/`not configured`. The generated
  report privacy summary now explicitly includes salary floors, resume text,
  private notes, and application history as removed data categories, with
  product-copy coverage against setup-summary jargon returning.
- Reworked user and feature docs from the zero-technical sidecar audit:
  Quick Start, Job Site Search Links, Job Sources, and Job Source Status now
  avoid download-page jargon, developer-first headings, low-trust labels,
  scan/refresh wording, browser-session internals, rate-limit terms,
  source-adapter implementation framing, hashing internals, and maintainer
  test-process headings in user-facing sections. Product-copy sensors now
  guard the audited phrases.
- Reworked smaller source/setup UI surfaces from the sidecar audit:
  Browser Button setup now avoids advanced connection, local safety code,
  if-this-feels-hard, and block-page-import phrasing; Job Site Search Links now
  says JobSentinel does not check sites automatically; Job Source Status now
  uses Official source, after another try, plain table/action labels, and
  focused check results wording. Focused component tests and product-copy
  sensors cover the changes.
- Reworked remaining old More Settings copy from the sidecar audit. Desktop alert
  help no longer says native OS notifications, focused-window wording now says
  JobSentinel is open on screen, email details use email sending
  address/number, LinkedIn and USAJobs setup says scheduled checks and optional
  USAJobs scheduled checks, optional tech-source labels are expanded, site warnings
  avoid blocks-automatic-checks phrasing, Browser Integration became Browser
  Button, posting-risk custom labels use user-facing warnings, and
  Resume-Based Scoring became Use Resume to Sort Jobs. The latest local
  follow-up also removes remaining New scans and Advanced chat alert wording.
  Focused Settings tests and product-copy sensors cover old phrasing.
- Fixed Dashboard salary filtering so users enter full yearly dollars instead
  of `$K` shorthand. The filter logic now compares against stored yearly
  salaries directly, the UI labels say yearly salary, current-filter summaries
  use salary formatting, and coverage rejects old thousand-based wording.
- Fixed remaining Dashboard source-check wording that still said scan in the
  manual search button, toast messages, and scheduled check hook. The UI now
  says checking job sources and job check complete, with DashboardHeader and
  product-copy coverage against old scanning labels.
- Fixed remaining Application Assist profile and saved-answer recovery copy
  that still used `Failed to...` or `Please fix the errors` wording. The UI
  now uses plain `Could not...` and `Check highlighted fields` recovery labels,
  with focused component tests and product-copy coverage against old wording.
- Fixed remaining job-link open recovery copy that still used `Failed to open
  link` and `Unable to open the job link`. Job cards and Dashboard keyboard
  opening now give plain browser-copy guidance, with JobCard tests and
  product-copy coverage against old wording.
- Fixed visible Market, Cover Letter Templates, Analytics, and Dashboard
  Widgets load-error panels that still used `Failed to Load...` or `Failed to
  load analytics data` wording. They now use plain `Could not load...` labels,
  and cover-letter copy failures now say `Could not copy template`, with
  focused component tests and product-copy coverage against old wording.
- Fixed remaining visible fallback titles in Resume, Resume Builder, Screening
  Answers, Interview Scheduler, and company-research fallback UI that still
  used `Failed to...` wording. They now use plain `Could not...` recovery
  wording, with focused component tests and product-copy coverage against old
  wording.
- Fixed additional visible action-recovery labels in undo/redo, bookmark,
  bulk-hide, duplicate-merge, resume export, application-status,
  application-list, and section recovery paths that still used failure-first
  wording. They now use `Could not...` wording, with focused hook/component
  tests and product-copy coverage against old labels.
- Fixed remaining generic failure-first titles in job-search, settings
  save/test, notification, reminder, modal recovery, feedback-details, and API
  fallback paths. They now use `Could not...` wording, with focused
  page/component/utility tests and product-copy coverage against old labels.
- Fixed shared generic fallback copy that still used `Something went wrong`,
  `An unexpected error occurred`, and `External AI transport is not configured`
  wording. Shared helpers, Rust command error titles, error boundaries,
  Dashboard recovery, job import, and external AI gateway setup errors now use
  plain `JobSentinel needs attention` / `JobSentinel ran into a problem` /
  `Outside AI sending is not set up` wording, with product-copy coverage
  against the old labels.
- Fixed older shared error-helper messages that still used technical labels
  such as `Invalid input`, `Data format error`, requested-resource wording, and
  permission jargon. They now use plainer review, unreadable-data,
  missing-item, and sign-in/access guidance, with product-copy coverage against
  the stale helper labels.
- Fixed scraper and Prepare Form `user_message()` copy that still used parse,
  CAPTCHA, request-timeout, browser-launch, raw selector, resume-reason, and
  automation wording. They now use plain job-source, human-check, page-load,
  browser, form-field, and review guidance, with focused Rust tests and
  product-copy coverage.
- Fixed read-only UX audit findings in link validation, Quick Start install
  routing, support-detail export copy, maintainer feedback copy, empty
  job-list pay wording, job-card pay warning copy, and alert connection-link
  validation. Focused component, utility, Rust, and product-copy checks cover
  the updated wording.
- Hardened Application Assist after security audit: Prepare Form now validates
  that the target is a recognized application site before loading profile data
  or saved screening answers, unknown-platform generic selectors stay disabled,
  and automation-attempt responses expose screenshot presence flags instead of
  raw local screenshot paths. Harness sensors now reject target-validation drift
  and screenshot-path IPC exposure.
- Clarified the default-off JobsWithGPT privacy boundary across privacy docs,
  scraper docs, feature privacy labels, and config comments. If a user
  configures that endpoint, scheduled checks send only saved job titles,
  location, remote preference, and result limit; resumes, salary floors,
  private notes, application history, screening answers, and profile details
  remain out of that external source request.
- Fixed visible interview outcome labels that still used pass/fail framing.
  The internal saved value remains `failed`, but visible buttons and chips now
  use plain, non-shaming labels such as `Not a fit`, with focused
  component tests and product-copy coverage.
- Added `npm run doctor` for local Node, npm, Rust, Tauri CLI, lockfile, SQLx
  offline, Linux Tauri package, Playwright browser, and toolchain drift
  readiness checks; added `npm run doctor:e2e` as the strict Playwright
  readiness gate.
- Recorded Walking Labs Lecture 02 and `harness-creator` skill evaluations.
- Recorded a deep harness audit and promoted top findings into
  `docs/plans/tech-debt-tracker.md`.
- Added a normal-CI harness job, expanded Docs Harness coverage for script
  changes, and added release/manual-build preflight gates with version
  metadata validation.
- Added a standalone external-AI gateway sensor and wired it into the harness
  so code, JSON, YAML, TOML, and env-style config cannot add direct provider
  paths outside `src/services/aiGateway.ts`.
- Added `docs/harness/manifest.json` so required harness files, policy
  snippets, and README reference-source coverage are reviewable as data instead
  of being hardcoded inside `scripts/check-harness.mjs`.
- Added `docs/plans/active/status.md` as the compact active-goal restart
  surface and archived older progress rows in
  `docs/plans/archive/progress-history-2026-05-28-to-2026-05-29.md`.
- Hardened user-controlled external URL fetch paths: shared URL validation now
  rejects private host suffixes and embedded private IP hostnames,
  user-entered job-page imports and JobsWithGPT perform fetch-time DNS checks,
  and shared scraper clients return redirects instead of following them.
- Routed bookmarklet browser-helper imports through public HTTP(S) URL
  validation and shared job storage validation instead of a raw insert path.
- Moved production scraper constructors to a shared process-wide rate limiter
  so repeated manual checks keep source cooldown state.
- Removed wildcard CORS and custom auth headers from the bookmarklet
  browser-helper flow, refreshes the local safety code when copying the browser
  button only after copy succeeds, keeps the previous button usable on
  clipboard failure, expires copied codes after about one hour, and binds the
  local helper port before reporting that the helper is running.
- Removed raw Slack connection-link setup from first-run onboarding and kept
  optional chat alerts as a later Settings task.
- Fixed additional zero-technical Settings blockers: restore now rejects JSON
  that is not a JobSentinel settings backup, chat-alert toggles require
  connection details before they can be turned on, stored secret status uses
  plain saved-on-this-computer copy, email manual details avoid server/port
  labels in primary wording, alert-source scope is explained in the UI, and
  settings/help text uses broad non-coding examples.
- Fixed additional broad-audience findings: product/design searches no longer
  default to tech-heavy boards unless explicitly technical, the cover-letter
  filter uses IT/software wording instead of broad engineering framing, and
  company fallback examples now include healthcare, retail, logistics,
  hospitality, education, public service, and insurance employers.
- Fixed additional docs-bloat findings: the Linux build guide is linked from
  the docs hub, its workflow trigger description now matches the manual
  GitHub Actions workflow, and historical release notes now have a maintained
  index. Added docs-drift harness coverage so those links and workflow claims
  stay current.
- Fixed additional Application Assist copy drift: the Prepare Form flow no
  longer exposes backend application-platform notes as hover text or says
  "automation browser" in user-facing close messages. Later follow-up changes
  remaining form-preparation failure copy to plain detail-preparation wording.
  Product-copy coverage rejects those strings returning.
- Updated user docs so downloads, notifications, site requests, and Linux
  credential recovery put non-technical paths before advanced contributor or
  command-line details.
- Extracted root-entry, local-artifact, and tracked-disposable checks from
  `scripts/check-repo-bloat.mjs` into
  `scripts/harness/checks/repo-artifacts.mjs` with focused script tests.
- Extracted package and dependency ownership checks from
  `scripts/check-repo-bloat.mjs` into
  `scripts/harness/checks/dependency-ownership.mjs` with focused script tests.
- Extracted source-structure checks from `scripts/check-repo-bloat.mjs` into
  `scripts/harness/checks/source-structure.mjs` with focused script tests.
- Extracted E2E helper ownership checks from `scripts/check-repo-bloat.mjs`
  into `scripts/harness/checks/e2e-helpers.mjs` with focused script tests.
- Extracted README product definition, free-forever MIT wording, and banned
  job-search framing checks from `scripts/check-repo-bloat.mjs` into
  `scripts/harness/checks/product-framing.mjs` with focused script tests.
- Extracted stale Resume Optimizer, resume-template audience, Application
  Assist automation, ghost-risk, and pay-guidance copy checks from
  `scripts/check-repo-bloat.mjs` into
  `scripts/harness/checks/product-copy.mjs` with focused script tests.
- Extracted front-door and runtime source release-promise checks from
  `scripts/check-repo-bloat.mjs` into
  `scripts/harness/checks/release-promises.mjs` with focused script tests.
- Extracted initial privacy-logging checks for raw automation dropdown values
  and raw frontend error reporter forwarding into
  `scripts/harness/checks/privacy-logging.mjs` with focused module tests.
- Fixed several zero-technical UX audit findings: Settings load failure now has
  a close path and plain restart/report guidance, empty application tracking
  now explains how to begin and can route to job import, the Dashboard no-jobs
  state gives search-preference recovery guidance, browser import hides
  connection details behind Advanced, and location lookup copy explains the
  public internet address lookup in plain language.
- Fixed additional recovery-copy findings: database damage guidance no longer
  points to a nonexistent restore screen, settings restore now reports
  unreadable backup files instead of failing silently, notification
  connection-link errors use provider-first copy without protocol/port jargon,
  advanced problem export is framed as support-only, and job-link import
  failures point users to copy the browser address bar instead of exposing
  Schema.org or URL terminology.
- Fixed additional broad-audience findings: setup defaults and Settings source
  recommendations no longer put every remote or city-based search on
  tech-heavy boards, and synonym matching/docs now cover healthcare, office,
  operations, public-sector, customer support, accounting, education, retail,
  and non-software tool vocabulary as first-class search language.
- Fixed additional source-health UX findings: rows now say what to do next,
  connection warnings point users back to Settings, check speeds avoid
  millisecond jargon where possible, and advanced source warnings give
  search-link or browser-link recovery instead of Cloudflare-protection jargon.
- Fixed additional source-status UX findings: source-health summary, table,
  page-check, loading, and result labels now use plain job-source wording,
  LinkedIn is removed from source-health test fixtures, and source-boundary
  harness coverage blocks stale status labels from returning.
- Fixed additional support-copy UX findings: troubleshooting helper text and
  safe app detail copy no longer use logs, diagnosis, or troubleshooting
  jargon, and product-copy harness coverage blocks those phrases from
  returning.
- Fixed additional application-tracking UX findings: visible "Ghosted" labels
  and actions now use "No Response" wording while legacy internal status keys
  remain for compatibility, and product-copy harness coverage blocks old labels
  from returning.
- Fixed additional toast privacy findings: optional dev support details now use
  sanitized support text before toast display, and privacy-logging harness
  coverage blocks raw enhanced error messages from reaching
  `safeInvokeWithToast`.
- Fixed additional front-door support wording findings: the root README, docs
  hub, and harness docs now use safe support report language instead of safe
  old report wording, with product-copy coverage expanded across those files.
- Started broad-audience drift cleanup by rebalancing company autocomplete
  suggestions across healthcare, retail, logistics, finance, public service,
  education, hospitality, and technology; replacing tech-first placeholders and
  generic fixtures; refreshing resume, mock ATS, and E2E examples; and keeping
  the persisted `technical_interview` key while using the visible
  "Skills Interview" label in tests.
- Removed raw automation dropdown-answer logging and raw frontend error
  forwarding from local/browser output paths. Added bloat sensors for both
  regressions and unit coverage for sanitized console forwarding.
- Made the local safe support report the recommended feedback submit path,
  added copy/save safe support report actions to modal error recovery, and
  corrected Quick Start notification setup wording.
- Reworded problem-history/export labels, safe support report success steps,
  and generated safe support report section names into plain support language.
- The latest IPC minimization work added narrow application-profile
  existence/preview commands, canonical import URLs before
  preview/hash/storage, minimized import responses to `{ jobId }`, and a
  Dashboard-only preferences DTO.
- Added focused IPC-minimization harness coverage for those contracts under
  `scripts/harness/checks/ipc-minimization.mjs`; `lint:bloat` now rejects
  full profile IPC outside the profile editor, Dashboard full-config reads,
  raw import URLs after preview, full imported-job returns, and stale minimized
  mock payloads.
- The latest zero-technical support and privacy slice keeps saved support
  reports local in the primary UI, removes GitHub-first and shared-folder
  wording from Settings, Quick Start, and support report success paths, renames
  visible old report copy to safe support report copy, replaces generic
  code-profile labels with work-sample/profile wording, and hardens Rust
  support report sanitization for full URLs, query secrets, password-like
  values, and bookmarklet import tokens.
- The latest bookmarklet privacy slice removes the browser import token from
  renderer-facing config and mocks, routes browser-button copying through Rust,
  and adds IPC-minimization harness coverage for token DTO drift.
- The latest Application Assist resume-boundary slice routes resume selection
  through a backend native file-picker command, copies selected files into
  app-owned local storage, sends the renderer only a token and display name,
  rejects renderer-supplied resume paths, validates legacy saved paths before
  form prep, and keeps resume attachment manual so saved resumes are not
  uploaded automatically.
- The latest zero-technical copy slice softens optional email setup, labels
  USAJobs access as an access code with no coding needed, changes screening
  answer setup from matching text to plain question wording, and removes
  GitHub-first Deep Links troubleshooting copy.
- The latest harness-doc accuracy slice reconciles the deep harness audit
  against live CI, docs-harness, release/manual-build, toolchain-pin,
  plan-index, and bloat-runner evidence so closed findings no longer look
  open.
- The latest support-template UX slice replaces old report and scraper-first
  GitHub issue template wording with safe support report and job source wording,
  then adds product-copy coverage for recurrence.
- The latest profile-doc UX slice changes `profiles/README.md` from
  command-line-first instructions to app setup first, keeps manual file copying
  advanced, and adds product-copy coverage against recurrence.
- The latest diff-aware harness slice adds `npm run harness:plan -- --since
  origin/main` so changed files produce focused verification commands from the
  matrix instead of relying on manual command selection.
- The latest broad-audience support wording slice moves the advanced config
  profile list to broad-first ordering, replaces old roadmap report labels
  with safe support report wording, and adds sensors for recurrence.
- The latest feature-privacy harness slice adds a machine-readable privacy
  label manifest and validates core feature labels, data categories,
  external-AI allowance, and local fallback guidance through `harness:check`.
- The latest E2E budget slice adds Playwright JSON budget commands for smoke
  and full E2E runs, with the latest smoke budget evidence at 9 Chromium smoke
  tests in 5.97 seconds against a 30-second budget.
- The latest Rule 0 review slice updates the PR template so human review must
  show privacy/security, local-first, external AI gateway, safe support report,
  responsible-use, broad-audience, and zero-technical-knowledge evidence; the
  harness manifest now blocks drift in those review requirements.
- The latest zero-technical copy slice changes visible market-analysis labels
  to Hiring Trends language and keeps component plus smoke E2E
  expectations aligned.
- The latest dashboard plain-language slice changes job-list export actions to
  download copy, removes advanced-search wording from the main search box, and
  adds focused DashboardFiltersBar plus QuickActions tests.
- The latest support-language slice changes feedback category choices from
  bug-report and feature-request wording to report-a-problem,
  suggest-an-improvement, and ask-a-question wording, with focused
  CategorySelector coverage.
- The latest safe support report slice changes repeat-step prompts, feedback
  modal step labels, frontend activity names, backend report type labels, and
  backend recent-activity lines from developer-style labels to plain-language
  support wording, with product-copy harness coverage against recurrence.
- The latest notification-settings UX slice changes source-rule,
  minimum-salary, saved-error, and loading-error copy to plain alert-settings
  wording, with focused NotificationPreferences and product-copy coverage.
- Updated active plan and handoff docs for the latest local cleanup slice.

Open high-value work remains: zero-technical-knowledge UX audit, engineer-only
assumption audit, final stale-doc/reference sweep, backend/scraper privacy edge
review, frontend boundary review, protective job-search UX review, and final
broad verification.

The latest read-only audit follow-ups for support-path copy, privacy copy,
tech-heavy source heuristics, USAJobs setup, and Telegram setup are closed
locally with focused unit and harness coverage. Continue auditing new surfaces
for zero-technical and broad-audience drift.

## Verification

```bash
npm run harness:check
npm run lint:bloat
npm run lint:md
npm run lint:security
npm run lint
npm run test:run
cd src-tauri && cargo fmt --all -- --check
cd src-tauri && cargo clippy -- -D warnings
cd src-tauri && cargo test --lib
git diff --check
```

Use focused tests for narrow code changes. Reserve full E2E runs for UI flow
changes or Playwright-specific work.

## Progress

Current progress rows stay here. Older rows are preserved in [progress history](../archive/progress-history-2026-05-28-to-2026-05-29.md#repo-cleanup-and-quality-sweep).

| Date | Status | Notes |
| ---- | ------ | ----- |
| 2026-06-02 | In progress | Changed the Application Tracker subtitle from visible keyboard-instruction text to plain purpose copy. Product-copy sensors now reject the old technical subtitle; focused product-copy, bloat, lint, and targeted-search verification passed. |
| 2026-06-02 | In progress | Changed Application Assist stats from volume/rate wording (`Forms Opened`, `Submission Rate`) to review-first labels, changed profile review settings to `Review Pace`, removed the normal `50` daily option, and kept higher saved paces visible only as existing state with protective guidance. Focused ProfileForm/ApplicationProfile, product-copy, repo-bloat, Playwright smoke, lint, docs, and diff-check verification passed. |
| 2026-06-02 | In progress | Changed stale ScoreDisplay Storybook examples from `Excellent`, `Average`, `Low`, and percentage-range labels to maintained fit labels. Product-copy sensors now reject the old story names and range labels; focused ScoreDisplay, product-copy, lint, script, bloat, docs, and diff-check verification passed. |
| 2026-06-02 | In progress | Changed Notification Preferences alert-filter badges from raw threshold percentages to plain alert-pickiness labels and added source-specific slider names. Product-copy sensors now reject raw `{config.minScoreThreshold}%` display; focused NotificationPreferences, product-copy, lint, script, bloat, docs, and diff-check verification passed. |
| 2026-06-02 | In progress | Applied latest read-only sidecar findings across the docs hub, Job Sources, Resume Data Import, Fit Review, Resume Builder, Notifications, Quick Start, and Privacy. Removed API/rate/schema/score-range wording from user-facing docs, switched source pacing to plain labels, pointed Resume Builder at the current Resume Match image, and added product-copy coverage; focused product-copy, script, bloat, harness, docs, targeted-search, and diff-check verification passed. |
| 2026-06-02 | In progress | Removed analytics-service and automatic-error-reporting language from web-vitals and error-boundary comments so comments match Rule 0 local-first behavior. Product-copy sensors now reject those drift phrases; focused product-copy, affected Vitest, targeted stale-phrase, bloat, docs, script, lint, and diff-check verification passed. |
| 2026-06-02 | In progress | Changed Resume Builder feature-doc upload preview and ready-to-upload phrasing to application-preview and attach wording. Product-copy sensors now reject the old Resume Builder doc phrases; focused product-copy, docs, targeted stale-phrase, bloat, docs, script, lint, and diff-check verification passed. |
| 2026-06-02 | In progress | Changed remaining Smart Scoring feature-doc uploaded-resume phrasing to added-resume phrasing. Product-copy sensors now reject the old Smart Scoring doc wording; focused product-copy, docs, targeted stale-phrase, bloat, docs, script, lint, and diff-check verification passed. |
| 2026-06-02 | In progress | Changed Application Profile resume-file tooltip from generic application-review wording to local, user-controlled attachment wording. Product-copy sensors now reject the old ProfileForm tooltip; focused ProfileForm, product-copy, targeted stale-phrase, bloat, docs, script, lint, and diff-check verification passed. |
| 2026-06-02 | In progress | Changed Application Assist manual task copy from resume-upload wording to user-controlled resume-file wording. Product-copy sensors now reject the old Application Preview label; focused ApplicationPreview, product-copy, targeted stale-phrase, bloat, docs, script, lint, and diff-check verification passed. |
| 2026-06-02 | In progress | Changed Resume Builder import-skill recovery copy from upload wording to add wording so users do not infer cloud transfer for local resume review. Product-copy sensors now reject the old Resume Builder upload phrasing; focused product-copy, targeted stale-phrase, bloat, docs, script, lint, and diff-check verification passed. |
| 2026-06-02 | In progress | Changed local Resume Match surfaces and feature docs from choose/upload wording to choose/add wording. Product-copy sensors now reject the old local-resume upload phrasing in `ResumeOptimizer`, `ResumeMatchScoreBreakdown`, and the Resume Match feature doc; focused Vitest, product-copy, targeted stale-phrase, bloat, docs, script, lint, and diff-check verification passed. |
| 2026-06-02 | In progress | Changed local Resume page and Settings resume-match copy from upload/uploaded wording to add/added wording so users do not infer cloud transfer for local resume review. Focused Resume, Settings, product-copy, targeted stale-phrase, bloat, docs, script, lint, and diff-check verification passed. |
| 2026-06-02 | In progress | Fixed shared error precedence so resume-not-found and resume-parsing failures use resume-review recovery instead of page/source recovery, replaced upload/service wording with local-first resume-review copy, and added focused utility, product-copy, bloat, docs, script, lint, and diff-check verification. |
| 2026-06-02 | In progress | Removed remaining user-visible `import helper` wording from the Browser Import guide and generated browser-button alert. Product-copy sensors now reject the stale phrase in docs, UI, and generated Rust code; focused Rust bookmarklet, formatter, bloat, docs, script, lint, and diff-check verification passed. |
| 2026-06-02 | In progress | Replaced Job Source Status feed, page-read, and not-needed labels with public-job-list, reads-job-details, and official-source wording. Focused source-status, product-copy, search, script, docs, bloat, and lint verification passed. |
| 2026-06-02 | In progress | Replaced Browser Button helper and advanced-setting wording with browser-import and optional setup copy. Focused Browser Button, product-copy, search, script, docs, bloat, and lint verification passed. |
| 2026-06-02 | In progress | Replaced Settings source-toggle `automatic checks` wording with scheduled-job-check copy in source guidance and checkbox accessible names. Focused Settings, product-copy, search, script, docs, bloat, and lint verification passed. |
| 2026-06-02 | In progress | Replaced Application Profile `Marked Sent` and `Ready to Send` stats with user-action wording so Application Assist does not imply JobSentinel sends applications. Focused page, product-copy, search, script, docs, lint, harness, and diff-check verification passed. |
| 2026-06-02 | In progress | Replaced technical question-match validation copy with plain question-word guidance. Product-copy sensors now reject the old unsupported-pattern-symbol wording if it drifts back. |
| 2026-06-02 | In progress | Replaced remaining GitHub-first online help copy in the safe support report submit and success screens with optional online-help wording. Product-copy sensors now reject those feedback phrases if they drift back. |
| 2026-06-02 | In progress | Removed remaining maintainer blocks, implementation references, module paths, command/test snippets, saved-file internals, and chat-number setup wording from user-facing feature guides. Moved the resume renderer DTO privacy contract into developer architecture docs and extended product-copy/privacy sensors so feature docs stay plain while developer contracts remain checked. |
| 2026-06-02 | In progress | Removed implementation references, notification-preference code snippets, and command/test details from the user-facing Local Job-Search Data guide, moved the notification-preference backend shape contract into developer architecture docs, and retargeted security-doc sensors so the user-facing guide stays plain while the developer contract remains checked. |
| 2026-06-02 | In progress | Removed developer-only command, config, and backend scoring-model details from the user-facing Smart Scoring guide. Product-copy sensors now reject those implementation details in `docs/features/smart-scoring.md`. |
| 2026-06-02 | In progress | Removed developer-only local-storage, command, export, and backend-file details from the user-facing Resume Builder guide. Product-copy sensors now reject those implementation details in `docs/features/resume-builder.md`. |
| 2026-06-02 | In progress | Reworked the Resume Data Import feature guide from raw JSON field mapping and developer command-contract details to plain imported-section, privacy, and validation guidance. Product-copy sensors now reject those implementation details in `docs/features/json-resume-import.md`. |
| 2026-06-02 | In progress | Replaced Quick Start contributor/developer setup labels and advanced local-file wording with plain optional source-code and file-location copy. Product-copy sensors now reject those exact current phrases in `docs/user/QUICK_START.md`. |
| 2026-06-02 | In progress | Removed developer-only schema, signal-weight, and API-command details from the user-facing Ghost Detection guide. Product-copy sensors now reject those details if they drift back into `docs/features/ghost-detection.md`, preserving the protective, zero-technical job-seeker framing. |
| 2026-06-02 | In progress | Applied the latest read-only sub-agent findings: support-report copy now avoids absolute privacy-removal claims, visible resume/settings/export/outside-AI wording avoids scoring/request jargon, README and source docs use approved job-source feed/link wording, agent wrappers carry Rule 0 plus broad-audience requirements, and active status is compact again. Verified with harness, script, docs, bloat, lint, focused Vitest, and diff-check gates. |
| 2026-06-02 | In progress | Replaced stale saved debug-report filename, reveal, and failure-log wording in support-report paths with support-report wording and added product-copy plus Rust coverage against backend reveal recovery drift. |
| 2026-06-02 | In progress | Replaced visible resume missing-word prompts from "Words To Add" to "Words To Review" across resume review surfaces and added product-copy coverage against old add-word framing. |
| 2026-06-02 | In progress | Integrated read-only sub-agent UX/copy audit findings across first-run privacy, source setup, email security, pay guidance, resume import, ghost labels, live resume tips, score contribution labels, and source-health table headings. |
| 2026-06-02 | In progress | Reworded Job Import missing-preview warnings from raw missing-field lists to readable details-to-check labels and added focused component plus product-copy coverage against raw `missing_fields.join` display. |
| 2026-06-02 | In progress | Added docs-drift checks for active-status last-updated lag and stale measured harness-count prose, then rewrote compact status count notes to point at `npm run harness:session -- --json`. |
| 2026-06-02 | In progress | Reworded Resume Optimizer missing-job-post and empty-bullet validation to action-first copy, enabled empty Draft to show guidance instead of doing nothing, and added focused tests plus product-copy stale phrase checks. |
| 2026-06-02 | In progress | Reworded Resume saved-skill validation from invalid-skill wording to `Name the skill` with action guidance, added a focused Resume page regression test, and added product-copy stale phrase checks. |
| 2026-06-02 | In progress | Reworded saved-search empty-name validation from form-rule wording to `Name this search` with action guidance, added focused hook coverage, and added product-copy stale phrase checks. |
| 2026-06-02 | In progress | Replaced the Application Profile generic resume-file picker button with `Choose Resume` and added product-copy coverage against the stale file-manager label. |
| 2026-06-02 | In progress | Followed up the input-neutral copy push after remote CI caught a stale Application Preview test expectation. Updated the test and product-copy sensor so `click the submit button yourself` cannot drift back. |
| 2026-06-01 | In progress | Replaced mouse-only click/drag-first wording in onboarding, location detection, auto-refresh recovery, Application Assist, application tracking, cover-letter blanks, browser import, and user docs with input-neutral guidance while preserving the final-application-submit boundary. Product-copy coverage now rejects the recurring phrases. |
| 2026-06-01 | In progress | Replaced static mac-only shortcut labels in navigation and keyboard help with `Cmd/Ctrl` labels, updated E2E expectations, and added product-copy coverage against mac-only static shortcut drift. |
| 2026-06-01 | In progress | Reworded Interview Schedule form labels so required fields are named directly, meeting details avoid slash notation, and application selection starts with plain "choose" wording. Product-copy coverage now rejects the old asterisk and slash label drift. |
| 2026-06-01 | In progress | Reworded Interview Schedule validation to action-first guidance for missing application/time, past dates, and invalid duration, and added product-copy coverage so those validation titles do not drift back to invalid/missing-field wording. |
| 2026-06-01 | In progress | Closed the latest broad-audience privacy/control audit slice: analytics and dashboard stats now use employer-reply/offers-received wording, job-source displays reuse plain shared source labels, interview outcomes and market alert severity no longer show raw enums, application status/load copy is more protective and local-first, notification preference load failures no longer fall back to enabled defaults, first-run setup previews inferred job sources before saving, and Settings discloses email/chat plus USAJobs data sharing with accessible source toggles. |
| 2026-06-01 | In progress | Added exact-payload approval for the optional JobsWithGPT endpoint: Settings previews endpoint, saved titles, location, remote filter, and result limit; scheduler/source-health checks skip unapproved or stale payloads; local logs stay metadata-only; harness sensors reject unapproved endpoint flows. |
| 2026-06-02 | In progress | Closed `SEC-019`: JobsWithGPT approved source checks now record a local minimized source-request ledger, Settings shows the latest approved contact time plus host/count/outcome summary, and source-boundary, Settings, Rust health, and scheduler tests cover the boundary without storing raw titles, raw location, resumes, salary floors, notes, application history, or full source links. |
| 2026-06-01 | In progress | Closed the high/medium latest read-only sidecar audit findings: Application Assist now validates supported application pages with fetch-time host checks before profile load, rechecks the final page around filling, and creates attempts only after the trust check; external alert payloads no longer send raw local match reasons; zero-technical copy fixes landed across Resume, Dashboard, Settings, screening answers, and feature docs; privacy and IPC sensors cover the new drift classes. JobsWithGPT exact-payload approval and visible approval-scope reminder are landed. |
| 2026-06-01 | In progress | Closed another broad-audience UX copy pass: Application Assist docs/E2E page objects, Dashboard status copy, Settings auto-search and company-preference labels, generic async toast titles, Application Assist history errors, and score explanations now use plain saved-preference/search wording with product-copy coverage. |
| 2026-06-01 | In progress | Tightened backend safe-support-report sanitization for sensitive job-search free text, reworked another zero-technical copy slice across Application Preview, Error Log fallback reports, browser import troubleshooting, notification salary filters, profile review settings, screening-answer type labels, Dashboard empty states, reminder labels, rate-limit errors, and auto-refresh warnings, and fixed TypeScript build fallbacks found by `npm run build`. |
| 2026-06-01 | In progress | Reworked Market Snapshot from bullish/bearish/neutral sentiment labels to plain hiring-outlook labels, with focused component tests and product-copy coverage against stale finance-jargon wording. |
| 2026-06-01 | In progress | Reworked Company Research unknown-company and slow-lookup copy so local fallback details are not described as being gathered in the background; added focused CompanyResearchPanel tests and product-copy coverage against stale request-timeout and gathering language. |
| 2026-06-01 | In progress | Reworked Pay Protection range labels and salary-floor guidance from percentile shorthand to lower/middle/higher/highest-seen sample language, with focused Salary page tests and product-copy coverage against the old percentile jargon. |
| 2026-06-01 | In progress | Replaced vague skill proficiency and salary seniority labels with behavior-based skill strength and role-stage wording across Resume, Resume Builder, Pay Protection, docs, and product-copy sensors. |
| 2026-06-01 | In progress | Hardened browser import safety-code replay: the helper now refreshes safety codes on start, accepts exact import routes only, consumes a copied code after the first valid local import attempt, and documents that users should copy the browser button again after each saved job. |
| 2026-06-01 | In progress | Applied explorer-audit copy fixes across setup alerts, additional job sources, browser-button setup, analytics headings, weekly application pacing, and Dashboard search tips; product-copy sensors now reject provider-heavy, browser-power-user, funnel/goal, and Boolean-search wording. |
| 2026-06-01 | In progress | Changed notification alert preferences away from "interrupt you," internal source-rule limits, and tech-career title examples; alert rules now use protective time-control wording, broader role examples, and product-copy coverage against drift. |
| 2026-06-01 | In progress | Minimized ATS timeline event payloads so private application note bodies and reminder messages are not duplicated into `application_events.event_data`; notes/reminders remain in their owning tables, legacy event payloads are scrubbed by migration, and privacy-logging sensors reject drift. |
| 2026-06-01 | In progress | Minimized screening-answer learning IPC so renderer responses no longer expose raw saved answer patterns, historical question text, original answers, or edited answer text; summary counts remain available locally, with Rust response tests and IPC-minimization sensors against drift. |
| 2026-06-01 | In progress | Changed resume readability score labels away from judgmental terms such as Excellent, Great, and Poor toward evidence-focused labels, with unit and product-copy coverage against drift. |
| 2026-06-01 | In progress | Made Resume Match choose/upload the primary path, moved resume-app export paste behind an explicit Import from Resume App action, removed the circular PDF-upload hint, and added focused UI plus product-copy coverage against the old raw export-data path. |
| 2026-06-01 | In progress | Updated Quick Start, Deep Links, and credential-security docs so download, notification, site-request, and Linux keyring guidance starts with normal user actions before optional developer or command-line paths. |
| 2026-06-01 | In progress | Reran the Rust advisory watch: `cargo audit` and `cargo deny check advisories` both exit 0, with the remaining allowed upstream/transitive RustSec warnings recorded under `SEC-002`. |
| 2026-06-01 | In progress | Removed raw Slack connection-link setup from first-run onboarding and added focused SetupWizard plus product-copy coverage so webhook-shaped setup does not drift back into the first-run path. |
| 2026-06-01 | In progress | Removed wildcard CORS and custom auth headers from bookmarklet browser-helper imports, refreshed the local safety code only after the browser button copies successfully, kept the previous button usable on clipboard failure, surfaced occupied helper ports before reporting running state, expired copied codes after about one hour, and added focused auth-state, bind-error, and expired-token coverage. |
| 2026-06-01 | In progress | Moved production scraper constructors to a shared process-wide rate limiter and added focused coverage proving exhausted source buckets survive fresh handles. |
| 2026-06-01 | In progress | Routed bookmarklet imports through public HTTP(S) URL validation and shared job storage validation, with focused tests for unsafe URLs, overlong fields, and valid storage. |
| 2026-06-01 | In progress | Hardened external URL fetch boundaries for user-entered job imports and JobsWithGPT, disabled shared scraper redirects, added focused URL/security tests, and recorded remaining bookmarklet/rate-limit findings as open debt. |
| 2026-06-01 | In progress | Replaced old report wording with safe support report wording in the root README, docs hub, harness docs, and credential docs; expanded product-copy coverage across front-door and harness files. |
| 2026-06-01 | In progress | Pushed through `e9292268`; remote CI `26778739829` passed. CI covered harness checks, harness script tests, TypeScript, ESLint, frontend unit tests, Rust fmt, Rust clippy, Rust library tests, npm audit, and cargo-deny advisories. Docs Harness last ran on `f050070d` as `26778490093` and passed. |
| 2026-06-01 | In progress | Sanitized optional dev support details before toast display in `safeInvokeWithToast`; added focused API unit coverage and privacy-logging harness coverage against raw enhanced error messages. |
| 2026-06-01 | In progress | Reworded notification settings source-rule, minimum-salary, save-failure, and loading-failure copy to plain alert-settings wording; added focused NotificationPreferences and product-copy coverage. |
| 2026-06-01 | In progress | Reworded safe support report prompts, feedback modal steps, frontend activity labels, backend report type labels, and backend recent-activity lines to plain-language support copy; added product-copy harness coverage against old technical labels. |
| 2026-06-01 | In progress | Reworded feedback choices from bug-report and feature-request labels to report-a-problem, suggest-an-improvement, and ask-a-question labels; added focused CategorySelector tests. |
| 2026-06-01 | In progress | Reworded Dashboard job-list actions from export/CSV copy to download copy, changed the main search placeholder to "Search jobs," and added focused DashboardFiltersBar plus QuickActions tests. |
| 2026-06-01 | In progress | Pushed through `1976fd9e`; remote Docs Harness `26744671097` and CI `26744671092` both passed. CI covered harness checks, harness script tests, TypeScript, ESLint, frontend unit tests, Rust fmt, Rust clippy, Rust library tests, npm audit, and cargo-deny advisories. |
| 2026-06-01 | In progress | Reworded market-analysis refresh and empty states from "run analysis" toward Hiring Trends language; focused component tests passed and smoke-budget E2E measured 9 Chromium smoke tests in 5.75 seconds against a 30-second budget. |
| 2026-06-01 | In progress | Added Rule 0 PR review evidence requirements and manifest-backed harness snippets for privacy/security, local-first workflows, external AI gateway routing, safe support reports, responsible use, broad audience, and zero-technical-knowledge support. |
| 2026-06-01 | In progress | Pushed `a4dade40` to `main`; remote Docs Harness `26741447318` and CI `26741447297` both passed. Per the current goal posture, avoid another remote CI run until full-goal completion or explicit user request. |
| 2026-06-01 | In progress | Removed hardcoded employer rating claims from static company fallback data, kept cached rating rendering covered by component tests, changed unknown-company guidance toward official/public-source research, and added source-quality harness coverage so static fallback ratings cannot drift back. |
| 2026-06-01 | In progress | Narrowed browser import UI and docs away from any-job/large-board support promises toward official career pages and user-opened public job pages, explicitly stated that JobSentinel does not get around blocking controls, and added product-copy coverage against overbroad import promises. |
| 2026-06-01 | In progress | Reworded Job Site Search Links UI and user docs away from automated-scan and legal-guarantee language toward direct-monitoring boundaries and browser-opened searches; added product-copy coverage so old automated-scan and scraper-comparison wording cannot return. |
| 2026-06-01 | In progress | Reconciled the deep harness audit against live workflow and harness evidence: normal CI, Docs Harness script coverage, release/manual-build preflight, toolchain pins, plan index, and main bloat-runner split now read as closed or narrowed to residual module-ownership work. |
| 2026-06-01 | In progress | Replaced old report and scraper-first wording in GitHub issue templates with safe support report and job source language; added product-copy coverage so old issue-template attachment terms and scraper labels cannot return. |
| 2026-06-01 | In progress | Reworked profile README usage from command-line file copying to app setup first, moved manual local-file copying into advanced context, and added product-copy coverage against command-first profile docs. |
| 2026-06-01 | In progress | Standardized visible crash, settings, and feedback flow copy on safe support report wording, and extended product-copy coverage so shorter safe report labels fail locally. |
| 2026-06-01 | In progress | Ran read-only broad-audience and zero-technical UX audits. Broad-audience audit found no high-confidence maintained-surface violations; zero-technical audit found open Settings, source-health, Resume readability, structured resume import, session-storage recovery, and dashboard-shortcut debt. Removed remaining browser-import `ATS` jargon from user-facing browser button and LinkedIn monitoring guidance with product-copy coverage. |
| 2026-06-01 | In progress | Closed the first Settings tab label finding from the zero-technical audit by renaming the old advanced tab, then superseded that label with "Sources & Alerts" and updated smart-scoring, notification, Quick Start, Dashboard, and product-copy coverage. |
| 2026-06-01 | In progress | Closed the source-health zero-technical finding by replacing "Page Check", unclear page-read labels, and icon-only actions with plain "Can Read Jobs", "Source Controls", "Turn On/Off", and "Check Now" copy plus focused component and product-copy coverage. |
| 2026-06-01 | In progress | Closed the raw Resume readability suggestion-category finding by mapping internal labels like `AddKeyword` and `RewordBullet` to plain copy such as "Add job words" and "Rewrite bullet", with focused ResumeOptimizer and product-copy coverage. |
| 2026-06-01 | In progress | Closed the remaining concrete zero-technical audit findings by clarifying Resume Match Helper export/PDF recovery copy, renaming structured resume imports to "Import from resume app", replacing browser-session storage wording with a copy/paste recovery path, and moving visible dashboard shortcut syntax behind the existing Shortcuts control. |
| 2026-06-01 | In progress | Replaced shared backend command error labels such as database/configuration/input errors with plain local-data, saved-settings, and information-review copy; added Rust tests and product-copy coverage so raw SQL/secrets stay suppressed and old technical labels do not return. |
| 2026-06-01 | In progress | Removed raw Tauri command arguments and raw backend exception text from propagated `safeInvoke` errors; enhanced errors now keep display-safe copy plus count/type-only argument summaries, with focused API tests and privacy-logging harness coverage. |
| 2026-06-01 | In progress | Moved structured resume import file reads from renderer `file://` fetches into a Rust command with local file type and size checks; added frontend Windows-path coverage and source-quality harness coverage against the old path. |
| 2026-06-01 | In progress | Closed the stronger resume import path boundary: PDF upload and JSON Resume import now use backend native file-picker commands, raw renderer-supplied resume paths are rejected, PDF uploads are copied into app-owned local storage before parsing, and source-quality coverage rejects renderer-owned file picker imports. |
| 2026-06-01 | In progress | Kept Application Assist Prepare Form available while optional application-form detection is still loading, so a slow or stuck recognition check no longer blocks users with a saved profile from continuing to the review modal. Focused ApplyButton coverage guards the recovery path. |
| 2026-06-01 | In progress | Replaced visible Application Assist form-preparation failure wording with `Could not prepare details`, and added ApplyButton plus product-copy coverage against the old preparation-error labels. |
| 2026-06-01 | In progress | Shared plain application-form display labels between Application Assist job-card badges and the review modal, so raw platform IDs such as `greenhouse` are shown as readable names. Focused ApplyButton and ApplicationPreview tests cover known and fallback labels. |
| 2026-06-01 | In progress | Replaced remaining CAPTCHA-first troubleshooting copy in Application Assist docs with human-check wording and added product-copy coverage so the old user-facing phrasing does not return. |
| 2026-06-01 | In progress | Replaced Deep Links user-doc CAPTCHA/anti-bot phrasing with human-check and site-limits wording, while keeping the no-control-workaround boundary. Product-copy coverage now blocks the old user-facing search-link wording. |
| 2026-06-01 | In progress | Replaced user-visible ATS-source phrasing in ghost-detection docs with employer and application-platform wording, while preserving the cautious source-evidence boundary. Product-copy coverage now blocks the old ATS-source phrases in that doc. |
| 2026-06-01 | In progress | Reworded source health and source adapter docs away from ATS, CAPTCHA-solving/control-evasion, anti-bot, endpoint, and selector phrasing toward employer, application-platform, human-check, and source-boundary language. Product-copy coverage now blocks the old source-doc phrases. |
| 2026-06-01 | In progress | Hardened desktop notification privacy: OS-level alerts no longer include job titles, company names, match scores, salary notes, or reminder text. Settings and notification docs now explain that details stay inside JobSentinel, with focused utility tests covering notification payloads. |
| 2026-06-01 | In progress | Removed the unused generic desktop notification passthrough helper and added privacy-logging coverage so future frontend desktop notifications cannot directly pass caller-provided titles, bodies, job titles, companies, reminder text, or scores to OS notifications. |
| 2026-06-01 | In progress | Fixed `npm run harness:session -- --json` so JSON mode no longer treats the flag as the repo root and returns the real restart snapshot instead of unavailable zero counts. |
| 2026-06-01 | In progress | Removed remaining `networkidle` waits from normal job-interaction E2E tests and expanded active E2E wait sensors to reject both `waitForTimeout` and `networkidle` outside screenshot capture. |
| 2026-06-01 | In progress | Pushed through `378d8c56`; Docs Harness passed and CI run `26742720063` failed only on a frontend unit-test race. Fixed `BookmarkletGenerator.test.tsx` so the copy-failure test waits for the browser-button action to become enabled before clicking. |
| 2026-06-01 | In progress | Pushed `2b120e60`; remote Docs Harness run `26743031643` and CI run `26743031608` passed. Added local `harness:plan` work to make changed-file verification selection faster and less error-prone. |
| 2026-06-01 | In progress | Moved advanced config profile ordering away from software-first defaults and replaced old roadmap report labels with safe support report wording; added bloat sensor coverage for both drift patterns. |
| 2026-06-01 | In progress | Added a machine-readable feature privacy-label manifest and harness validation for local-only, external-AI, sensitive, public-data, data-category, and fallback requirements. |
| 2026-06-01 | In progress | Added Playwright JSON runtime budget tracking for smoke and full E2E commands; `npm run test:e2e:smoke:budget` measured 9 Chromium smoke tests in 5.97 seconds against a 30-second budget. |
| 2026-05-31 | In progress | Fixed high zero-technical UX blockers from the latest audit: job import previews with missing details no longer disable the save path, visible dashboard job cards now expose Prepare Form, no-profile states show a Set Up Profile recovery action, and stale `Settings > Application Assist` guidance is blocked by bloat coverage. |
| 2026-05-31 | In progress | Rebalanced sample JSON Resume, company fallback, bookmarklet, import, remote-scoring, dashboard search, score-modal, undo, export, and feedback sanitizer examples toward broad job-seeker examples; extended bloat coverage for the newly cleaned sample-resume, bookmarklet, search-history, and score-modal fixture paths. |
| 2026-05-31 | In progress | Rebalanced generic scraper adapter fixtures for Greenhouse, Glassdoor, USAJobs, JobsWithGPT, Lever, We Work Remotely, and shared HTTP examples toward broad job-seeker examples without changing fetch, retry, cache, URL, or parser behavior; added bloat coverage for these cleaned generic scraper paths. |
| 2026-05-31 | In progress | Rebalanced salary prediction, seniority, and normalization fixtures away from software-only examples where they were not explicit software-engineer/SWE branch coverage; added bloat coverage so those salary fixture paths cannot drift back to engineer-only examples. |
| 2026-05-31 | In progress | Rebalanced generic frontend mock, E2E, notification, config, database, ATS, ghost, salary, scoring, market-intelligence, SimplyHired, command, and mock job fixtures away from software-only defaults toward broad job-seeker examples, and added focused bloat coverage so recurring generic paths cannot drift back to software-only examples. |
| 2026-05-31 | In progress | Fixed visible zero-technical UX and broad-audience defaults from parallel audits: Settings failure escape, application empty-state routing, Dashboard no-jobs recovery guidance, browser import advanced settings, location copy, broad company suggestions, Skills Interview E2E labels, and broad resume/mock ATS fixtures. Logged remaining IPC minimization and broad fixture drift as active debt. |
| 2026-05-31 | In progress | Continued sensor modularity by extracting raw automation dropdown-value and frontend error-forwarding checks into `scripts/harness/checks/privacy-logging.mjs` with focused `scripts/check-privacy-logging.test.mjs` coverage. |
| 2026-05-31 | In progress | Closed the current support/recovery UX audit findings by simplifying problem-history/export labels, making saved-report success steps account-optional, and rewording generated safe support report headings and fields away from developer jargon. |
| 2026-05-31 | In progress | Improved zero-technical support recovery by making local safe support reports the recommended feedback submit path, adding safe support report copy/save actions to modal crash recovery, and aligning Quick Start notification setup wording with the current wizard. |
| 2026-05-31 | In progress | Used authorized read-only sub-agents for UX and security audits; fixed the security audit's raw dropdown-answer log and frontend error-forwarding findings with bloat sensors and `errorReporting` unit coverage. |
| 2026-05-31 | In progress | Continued the sensor-modularity finding by extracting front-door and runtime source release-promise checks into `scripts/harness/checks/release-promises.mjs`. |
| 2026-05-31 | In progress | Continued the sensor-modularity finding by extracting product-copy checks for stale resume framing, Application Assist automation framing, ghost-risk overconfidence, pay-guidance overconfidence, and resume-template audience copy into `scripts/harness/checks/product-copy.mjs`. |
| 2026-05-31 | In progress | Continued the sensor-modularity finding by extracting product-framing checks for the README definition, free-forever MIT wording, and banned job-search phrases into `scripts/harness/checks/product-framing.mjs`. |
| 2026-05-31 | In progress | Continued the sensor-modularity finding by extracting E2E helper ownership into `scripts/harness/checks/e2e-helpers.mjs`, with focused coverage for referenced and unreferenced helper cases. |
| 2026-05-31 | In progress | Continued the sensor-modularity finding by extracting source-structure checks for unreferenced settings helpers, hooks, helper modules, local barrels, and stale notification preference wrappers into `scripts/harness/checks/source-structure.mjs`. |
| 2026-05-31 | In progress | Continued the sensor-modularity finding by extracting package and dependency ownership checks into `scripts/harness/checks/dependency-ownership.mjs`, keeping existing bloat violation messages and adding focused module tests. |
| 2026-05-31 | In progress | Started the sensor-modularity finding by extracting filesystem and tracked-artifact bloat policy into `scripts/harness/checks/repo-artifacts.mjs`, keeping `checkRepoBloat` outputs unchanged and adding focused module tests. |
| 2026-05-31 | In progress | Closed the active-plan compaction finding by adding `docs/plans/active/status.md`, archiving older progress rows, and routing the plan index, harness guide, agent guide, and handoff toward the compact status surface. |
| 2026-05-31 | In progress | Closed the hardcoded harness-policy finding from the deep audit by moving required file, policy-snippet, and README reference-source lists into `docs/harness/manifest.json`, then making `scripts/check-harness.mjs` consume that manifest with focused script coverage. |
| 2026-05-31 | In progress | Closed the environment doctor platform-coverage finding from the deep audit: `npm run doctor` now checks Linux Tauri packages, `patchelf`, Playwright Chromium launch readiness, and Node/Rust CI-baseline drift; `npm run doctor:e2e` makes Playwright readiness a strict E2E gate. |
| 2026-05-31 | In progress | Closed the external-AI provider surface finding from the deep audit by adding `npm run lint:external-ai`, wiring it into `harness:check`, and testing OpenAI, Anthropic, Gemini/API-key, dependency, gateway-allowlist, and company-name false-positive cases. |
| 2026-05-31 | In progress | Closed the top P0 harness-delivery findings from the deep audit: normal CI now runs harness and script tests, Docs Harness watches the whole script set, and release/manual build workflows validate release metadata before running harness, docs, frontend, and Rust preflight checks. |
| 2026-05-31 | In progress | Refreshed all active plan and handoff docs for the environment doctor, Walking Labs evaluations, deep harness audit, and active-plan refresh. Later cleanup slices are committed locally while remote CI remains deferred until the full goal is complete or the user explicitly reopens it. |
| 2026-05-31 | In progress | Evaluated the harness against Walking Labs Lecture 02's five-subsystem exercise, identified environment readiness as the weakest subsystem, added `npm run doctor`, and recorded the ablation and affordance analysis under `docs/harness/`. |
| 2026-05-31 | In progress | Evaluated Walking Labs' `harness-creator` skill and direct structural validator output. Recorded the low generic-validator score as an interoperability gap caused by root-file assumptions, while keeping JobSentinel's `docs/plans/` harness state as the source of truth. |
| 2026-05-31 | In progress | Completed a deep harness audit across docs, scripts, workflows, issue templates, active plans, and CI/release surfaces; recorded ranked improvements in `docs/harness/deep-harness-audit-2026-05-31.md` and promoted top risks into the technical debt tracker. |

## Discoveries

- Current filesystem bloat scan finds no disposable reports, logs, or artifact
  directories outside ignored build/cache paths.
- Current root inventory is limited to front-door docs, policy files, tool
  config, source directories, package manifests, and expected ignored local
  caches (`node_modules`, `.husky/_`, and `src-tauri/target`).
- `src/hooks/` still contained exported or tested generic hooks with no
  production imports. Keeping them made hook inventory look larger than active
  app behavior.
- `src/utils/cacheStrategies.ts` was only used by the unreferenced cached
  dashboard hook, while the active API cache path remains in `src/utils/api.ts`.
- `package.json` carried a direct `playwright` dev dependency even though the
  app imports `@playwright/test` and that package owns the Playwright CLI.
  Keeping both made Playwright version ownership less clear.
- `@types/dompurify` is a deprecated stub package. The installed `dompurify`
  package already exports TypeScript declarations through `dist/purify.*.d.ts`.
- `docs/developer/sqlite-configuration.md` still claimed the on-disk cache size
  was `-64000` KB even though `connection.rs` configures `-128000` KB, and it
  mixed old benchmark estimates with speculative cloud-backup ideas outside
  the local-first product boundary.
- `docs/features/synonym-matching.md` and
  `docs/features/remote-preference-scoring.md` still carried old emoji/status
  markers, stale `Last Updated` footers, and version-promised future sections
  even though active docs should avoid release promises not owned by a plan.
- SQLite connection and integrity diagnostic logs still used emoji/status
  markers and comments with symbol callouts, making low-level startup logs noisy
  and inconsistent with the repo text-only maintenance posture.
- `src/components/index.ts` re-exported nearly every component and some utility
  helpers, while live production imports only needed a few dashboard UI symbols.
  Direct imports remove that stale public surface.
- `src/components/automation/index.ts`, `src/components/feedback/index.ts`, and
  `src/pages/DashboardUI/index.ts` were local barrels with one production caller
  each, so direct imports better match ownership and avoid stale export surfaces.
- Storybook build completed but warned twice that `@chromatic-com/storybook`
  was configured without being installed. The Storybook story globs also
  included `src/**/*.mdx` even though no tracked MDX stories exist.
- The frontend error reporter persisted raw error messages, stacks, context
  values, current URLs, and captured async arguments in browser localStorage.
  Those values can contain job URLs, query strings, emails, tokens, webhook
  URLs, local usernames in paths, or user-entered request arguments.
- Settings validated Slack webhook shape inline for display, but the save path
  could still persist invalid Slack, Discord, or Teams webhook values to the
  keyring. Discord and Teams also lacked frontend validation hints even though
  backend senders reject non-provider webhook URLs later.
- Feedback-report sanitization redacted Slack webhooks and fake
  `hooks.discord.com` / `hooks.teams.com` patterns, but missed the provider
  URLs accepted by notification code for Discord and Teams.
- `get_debug_log_events` claimed to return sanitized structured events but
  returned cloned raw events. Formatted reports used a sanitizer pass, but the
  frontend GitHub/Drive debug-info path formats structured events directly.
- Frontend stored-error redaction replaced only `hooks.slack.com/services/...`
  Slack URLs before generic URL sanitization. Malformed Slack webhook-like URLs
  could keep secret path segments in local error logs.
- `save_feedback_file` accepted frontend-provided report text and wrote it
  directly, even though the feedback module and plan promise sanitized local
  report output.
- User-data command logs and manager tracing spans still exposed saved-search
  names, saved-search text, cover-letter template names, and notification
  preference payloads.
- Dashboard search history invoked `get_search_history` without the backend's
  required `limit` argument, so initial history loading could fail at runtime.
- Saved-search create and undo-restore calls sent flat filter fields even though
  the Tauri command expects a required `search` object. The list path also read
  snake_case fields even though `SavedSearch` serializes as camelCase.
- Development mock handlers still exposed stale `save_search` behavior and
  lacked the real `create_saved_search`, `use_saved_search`,
  `add_search_history`, and `clear_search_history` command handlers, so
  `npm run dev:mock` could hide or create frontend/backend parity drift.
- Development mock handlers also lacked cover-letter template command handlers
  for `seed_default_templates`, template CRUD, and template lookup, so the
  Cover Letter Templates UI could fail under `npm run dev:mock` while working
  against the real backend.
- Notification preferences had frontend/backend contract drift: backend
  `NotificationPreferences` requires an `indeed` source config and
  `save_notification_preferences` expects a `prefs` envelope, while frontend
  defaults and maintained docs omitted `indeed` and docs showed an older
  notification preference shape.
- Maintained docs still used an overbroad "all user data" localStorage-to-SQLite
  migration claim even though frontend localStorage remains valid for
  non-authoritative UI preferences, caches, sanitized error logs, and transient
  recovery hints.
- Current ignored local paths are `.husky/_/`, `node_modules/`, and
  `src-tauri/target/`.
- The largest local disk use is ignored Rust build output under
  `src-tauri/target/`.
- Root contains conventional repo metadata, agent wrappers, and tool configs;
  cleanup must distinguish necessary tool entrypoints from true junk.
- `src-tauri/test_cache.sh` was an unreferenced one-off test helper. Canonical
  cache coverage now runs through Cargo test commands and repo verification
  scripts, so the shell wrapper was removable bloat.
- The scraper module had a stale pointer to `docs/CLAUDE.md` for restricted
  site alternatives; the maintained docs are `docs/user/DEEP_LINKS.md` and
  `docs/BOOKMARKLET.md`.
- Resume-job matching was silently treating education lookup database failures
  as absent education because the query used `.ok()??`; the matcher now
  propagates lookup failures when a job declares an education requirement.
- Ignored embedded-ML tests used repo-relative cache directories when run
  manually; those tests now use temporary directories, and the bloat sensor
  rejects leftover `test_cache/` and `test_ml_cache/` directories.
- The optional `embedded-ml` feature had drifted out of compile health due to
  SQLx offline macro cache misses, a denied unsafe safetensors mmap, stale
  fields/imports, and a Candle tensor API mismatch.
- The full Rust test suite caught a stale raw database fixture still using the
  old `boolean` screening-answer type after migrations moved the active schema
  to `yes_no`; the profile manager now normalizes legacy type names before
  writing.
- Scheduler startup previously awaited the first scraping cycle before
  observing shutdown; any slow external scraper could make shutdown wait until
  that cycle returned.
- WebKit does not reliably tab to an `sr-only` skip link unless it has an
  explicit tab stop, so the skip link now declares `tabIndex={0}`.
- The Email Alerts switch was visually clickable but the hidden checkbox lacked
  a stable accessible E2E target in WebKit; the visible switch label is now the
  Playwright target and the checkbox has an accessible name.
- `job-interactions.spec.ts` used file-scoped page objects under Playwright
  `fullyParallel`; those shared mutable locators could cross test contexts.
  The spec now builds page objects per test and keeps project-level parallelism.
- `docker/Dockerfile.dev` had no docs, scripts, or workflow consumers and used
  an external `rust-dev:latest` base image that the repo does not define.
- `examples/sample-json-resume.json` is a useful fixture, not junk, but it was
  not linked from the JSON Resume feature docs.
- `docs/ROADMAP.md` still listed JSON Resume Import as planned even though the
  Tauri command, UI entrypoint, mock handler, and feature docs already exist.
- E2E docs had drift from the current Playwright suite: `docs/README.md`
  still described WebdriverIO + Tauri tests, and frontend testing docs showed
  non-existent `fixtures/` and `utils/` directories under
  `tests/e2e/playwright`.
- `linkedin_login` treated a poisoned result mutex as an unrecoverable panic in
  both cookie extraction and cancellation paths. The sender is now recovered
  when possible so the command can resolve instead of crashing the app.
- Location detection contradicted the local-first privacy docs: setup and
  settings called geolocation on mount, the backend used plaintext HTTP, and the
  roadmap still listed location detection as planned even though the command and
  UI existed.
- ATS URL detection was scanning the whole URL with regexes, so a trusted
  provider name in an untrusted query string or a lookalike host could be
  misclassified as a supported ATS.
- Architecture docs referenced stale `ats_detection.rs` and `myworkday.com`
  names instead of current `ats_detector.rs` and `myworkdayjobs.com`.
- Automation commands logged raw job URLs for ATS detection and form fill
  startup; job URLs can contain tracking IDs, session tokens, or credentials in
  query strings or URL userinfo.
- Command-count docs had drifted: architecture still claimed 169 total Tauri
  commands, user-data docs claimed 20 commands while omitting
  `seed_default_templates`, and overview docs carried stale module sub-counts.
- `take_automation_screenshot` was registered as public IPC but always returned
  a fixed active-page-context error; no frontend or docs referenced it, and
  implementing arbitrary screenshot paths would need a separate file-write
  security design.
- Rust test quality had a blind spot: `BrowserManager::new()` was covered by an
  `assert!(true)` smoke test, and the existing test-quality sensor only checked
  JavaScript and TypeScript files.
- `tests/e2e/fixtures/` only contained `.gitkeep` and a README reserving the
  directory for future file fixtures; current E2E coverage uses mock backend
  state and no test reads files from that path.
- Architecture and getting-started docs described a future cloud deployment
  tree that does not exist, and the roadmap listed cloud deployment as a future
  idea even though current product rules keep user data local unless the user
  configures an explicit external channel.
- `ERROR_HANDLING.md` and `MUTATION_TESTING.md` still had informal maintainer
  footers instead of current project-owned ownership labels.
- Getting-started docs claimed a fixed SQLite migration count, and integration
  testing docs listed an integration fixture directory that does not exist.
- Architecture and keyring docs still referenced pre-split scheduler worker
  paths, while getting-started docs carried fixed v1.5 refactor-priority line
  counts after the modularization work had already landed.
- Architecture docs still said core logic could run in the cloud, and the
  roadmap still marked shipped importer, deep-link, and bookmarklet features as
  planned even though source modules, commands, and UI entrypoints exist.
- The active roadmap still used emoji status markers, which conflicted with the
  repo instruction to keep maintained docs emoji-free.
- Company scoring tests still had a temporary-disabled / no-commit
  commented block even though company fuzzy matching had already been
  implemented.
- `src/components/settings/README.md`,
  `src/components/settings/QUICK_REFERENCE.md`, and `src/hooks/USAGE.md` were
  unreferenced nested Markdown notes outside the maintained docs source of
  truth. The settings quick reference also carried absolute local paths and
  stale refactor checklist language.
- `src/components/settings/` helper components were exported and tested, but no
  production page imported them. `Settings.tsx` still owned the equivalent
  inline controls, leaving the helper components and their tests as dead
  source-tree bloat.
- Deep-link and universal job-import paths still logged raw user-controlled URLs,
  including search terms, location filters, credentials, query strings, and
  fragments.
- URL normalization parse failures and browser automation spans still logged raw
  user-controlled URLs. Raw URL logs outside approved sanitizer paths are
  forbidden; use `sanitize_url_for_logging` before writing URL fields or
  messages to logs.
- The legacy LinkedIn source span still recorded raw search query and location fields.
  These values are user-authored job criteria and should be logged only as
  non-content metadata such as character counts.
- Job import commands still recorded raw import URLs in tracing spans and logged
  parsed job titles and company names after preview/import. Import URLs can
  contain private tracking state, and titles/companies are user job targets; log
  sanitized URL labels and content lengths instead.
- Automation form filling logged raw screening question text when a stored
  answer matched. Screening questions can reveal application details; logs
  should record non-content metadata such as character counts.
- LinkedIn auth navigation logged raw webview URLs during login. Login
  redirects can carry query strings or account-routing state, so navigation logs
  should use sanitized URL labels.
- Notification success logs recorded raw job titles after alert delivery. Alert
  payloads intentionally include job details for user-configured channels, but
  local logs should use identifiers instead of job-title text.
- JobsWithGPT logged the full MCP JSON request, including searched job titles
  and location. Scraper request logs should keep request troubleshooting
  metadata without writing search criteria.
- `ScraperError` display strings included raw URLs and the `NoResults` search
  query, while scheduler health paths store and log `e.to_string()` from
  scraper failures.
- `AutomationError` display strings included raw application URLs for
  navigation, page load, element lookup, consent, ATS detection, CAPTCHA, and
  JavaScript failures. Automation command/log paths format errors with
  `to_string()` / `%e`, so display output needs the same sanitizer as explicit
  URL logs.
- `DatabaseError` display strings included raw SQL query text and raw local
  backup/database paths. Command handlers, bookmarklet paths, scheduler
  persistence, and logs format database failures with `to_string()` / `%e`.
- Job-import blocked-redirect errors included the raw `Location` response
  header in formatted UI and Display output. Redirect targets can contain
  credentials, tracking tokens, query strings, fragments, or copied search
  criteria.
- Bookmarklet import responses built JSON error bodies with raw string
  interpolation, so quotes or control characters in parser/database errors could
  produce invalid JSON. Successful bookmarklet imports also logged raw job
  titles and company names from browser-provided data.
- The bookmarklet local HTTP server accepted cross-origin POSTs from any website
  without a shared secret. Because successful requests write to the local SQLite
  database, the bookmarklet needs a generated token in the copied code and a
  matching server-side header check.
- `docs/plans/active/.gitkeep` and `docs/plans/completed/.gitkeep` were
  redundant tracked placeholders because both directories contain real plan
  files.
- The deep-link category filter built selected Tailwind classes with
  ``bg-${metadata.color}-600``. Runtime class names existed, but Tailwind could
  miss the generated CSS because the utility names were not static source
  strings.
- Deep-link backend types and URL generation already supported job type and
  work-mode filters, and user docs described those parameters, but the UI only
  sent query and location.
- User-data docs still promised full JSON export/import and backup as a v1.5
  feature, but current commands only expose template and saved-search migration
  imports plus item-level deletes and search-history clearing.
- Deep Links user docs still used emoji status markers and promised v2.7 for
  favorites/custom sites, creating drift-prone release claims in maintained
  user docs.
- Quick Start user docs still used emoji markers in option lists, feature
  headings, next-step links, and the signoff despite repo doc rules.
- Front-door docs still used emoji markers in historical "What's New" headings,
  which made the docs index visually noisy and inconsistent with maintained
  doc rules.
- Scraper feature docs still used emoji markers for source status, platform
  support, warnings, headings, and implementation status despite maintained doc
  rules.
- Scraper health docs still used emoji markers in status legends, sample
  dashboards, smoke-test results, troubleshooting examples, and best-practice
  recommendations.
- Application tracking docs still described the Kanban UI and Tauri commands as
  future work even though `src/pages/Applications.tsx`, ATS commands, interview
  scheduling, and stats widgets are already present.
- Smart-scoring docs claimed predicted salaries were marked with a robot icon,
  but the live score UI uses factor icons and score reasons, not a robot salary
  marker.
- Ghost Detection and Resume Builder feature docs still used color emoji status
  bullets where plain text labels provide the same meaning.
- The Linux platform module had working XDG directory setup but still described
  itself as a future stub with limited functionality.
- Hiring Trends feature docs still used emoji-heavy headings, sample
  outputs, and stale `*_emoji()` API names after source switched to text
  indicators.
- `get_historical_snapshots` accepted signed IPC input but converted it with
  `days as usize`, allowing negative values to become huge history ranges.
- Registered Tauri commands across jobs, ghost detection, resume matching,
  market intelligence, automation, user data, and scraper health accepted
  unvalidated `limit` values. Negative signed limits can make SQLite treat
  `LIMIT ?` as unlimited, and very large unsigned limits can wrap during signed
  SQL binding conversion.
- `get_ghost_jobs` accepted raw `threshold` values even though ghost scores and
  configuration thresholds are defined on a `0.0..=1.0` scale. Out-of-range
  values could force misleading empty or over-broad result sets.
- Job search and automation answer commands logged raw user search queries,
  screening questions, and answer patterns. These values can contain private job
  criteria or personal application answers, so logs should record metadata such
  as text length or presence instead of content.
- Scraper cache and fetch logs wrote raw URLs or source query strings, including
  parameters that can contain job criteria, locations, or tokens. Fetching and
  cache behavior should keep exact URLs for requests and cache keys, but logs
  should use sanitized URL labels or query metadata.
- Resume upload, automation, database, platform startup, and ML model logs wrote
  raw local paths. Local paths can expose usernames, resume filenames, company
  names, and directory layouts in debug output.
- `ScoreBreakdownModal` sanitized scores only through callers, so direct use of
  the exported modal with `NaN` rendered `NaN%`.
- `ScoreBreakdownModal` converted Tailwind color classes such as
  `text-green-600` into inline CSS values like `green-600`, which browsers do
  not treat as valid colors.
- Security audit found automation dropdown selection logs writing the selected
  value and selector. Dropdown answers can include private screening details,
  so local logs now record only non-content outcome text.
- Security audit found the frontend error reporter forwarding raw
  `console.error` arguments and allowing browser default logging for global
  errors. Forwarded console output now uses the same sanitizer as stored error
  reports, and global handlers suppress raw default console output after
  sanitized capture.
- UX audit found that support and recovery still assume too much technical
  comfort: GitHub/Drive are too central in submit options and docs, the
  settings modal recovery path lacks a safe support report action,
  report/problem labels expose jargon, and notification setup docs mention
  providers beyond the wizard's current flow.
- Follow-up UX work made local safe support report saving primary in the feedback
  submit flow, added modal fallback copy/save safe support report actions, and aligned
  setup notification docs with the current Slack-only wizard step. Remaining
  support UX debt is concentrated in problem-history/export labels and the
  saved-report success path.
- The next follow-up simplified those problem-history/export labels, made the
  saved-report success path account-optional, and changed generated report
  headings from system/config/structured-data language to app, setup, activity,
  and support-summary language.

## Decisions

- Keep Tailwind utility names static in source or in explicit class metadata;
  reject interpolated utility-name construction in frontend boundary checks.
- Keep Deep Link user docs scoped to visible UI controls. Backend-only
  parameters should either have controls or be documented as API internals.
- Document user-data backup/export according to current commands. Do not keep
  expired release promises in maintained feature docs.
- Use text status words in maintained Deep Links docs and keep future work as
  unversioned planned items unless a release plan owns the version claim.
- Keep user docs text-only unless an image or screenshot is the actual content.
- Keep front-door README docs text-only unless an image or screenshot is the
  actual content.
- Keep scraper feature docs text-only for status and warning markers; use words
  like `Production`, `Available`, and `May be blocked`.
- Keep scraper health docs text-only for dashboard status examples and
  troubleshooting outputs; use status words like `Healthy`, `PASS`, and
  `FAILED`.
- Keep maintained feature-doc status legends text-only; color names can be
  written as words without emoji bullets.
- Keep SQLite configuration docs sourced from the live PRAGMA setup in
  `src-tauri/src/core/db/connection.rs`; stale cache-size values and
  speculative cloud-backup text count as documentation bloat.
- Keep maintained feature docs free of emoji status markers and unowned
  version-promised future sections.
- Keep database startup and integrity logs text-only; use clear message text
  instead of emoji/status symbols.
- Keep source comments and logs aligned with implemented platform behavior;
  stale "coming soon" stub markers count as bloat once code exists.
- Keep Hiring Trends docs aligned with text indicator APIs such as
  `severity_indicator()`, `type_indicator()`, and `sentiment_indicator()`.
- Validate signed IPC command inputs before converting to unsigned query or
  limit types.
- Validate all command-boundary `limit` inputs before querying, including
  optional defaults. Keep the shared command maximum at a bounded value unless
  a feature has a documented reason for a different limit.
- Validate public score and threshold inputs at command boundaries before using
  them in filters, even when the current UI sends safe defaults.
- Do not log raw user-authored search, question, answer, or pattern text. Use
  counts, booleans, or other non-content metadata for troubleshooting.
- Scraper transport and cache logs must sanitize URL labels and avoid raw query
  strings. Do not change request URLs or cache keys for logging-only fixes.
- Scraper spans must not record raw user-authored query or location fields; use
  counts, booleans, source names, limits, or result counts instead.
- Job import logging must sanitize untrusted URLs and avoid raw parsed job
  titles or company names. Log identifiers, counts, and missing-field totals.
- Automation logs must not include raw screening questions or answers. Use
  counts, matched-field totals, or other non-content metadata.
- Auth and login navigation logs must sanitize URLs before writing them.
- Notification service logs must not include raw job title, company, URL, or
  description. Use structured job ids, hashes, channel names, and counts.
- Scraper integration request logs must not serialize whole request bodies when
  those bodies contain search criteria. Log endpoint labels and request shape
  instead.
- Scraper error display output must sanitize URL labels and avoid raw search
  criteria. Preserve exact URLs and queries only in request execution and typed
  internal fields that need them.
- Automation error display output must sanitize URL labels. Keep exact
  application URLs only in typed fields and browser operations, not formatted
  errors or logs.
- Database error display output must use non-content query labels and
  non-identifying path labels. Keep exact paths and SQL only in typed fields and
  database operations that need them.
- Job-import redirect errors must keep exact redirect targets only in typed
  fields. UI and Display messages must use sanitized URL labels or omit the raw
  target.
- Bookmarklet local HTTP responses must serialize JSON with `serde_json` rather
  than manual string interpolation. Bookmarklet logs must use identifiers,
  counts, and booleans instead of raw title/company text.
- Bookmarklet imports must require a generated local auth token. Cross-origin
  CORS stays available for real bookmarklets, but POSTs without the token must
  be rejected before JSON parsing or database writes.
- Storybook addons in `.storybook/main.ts` must be owned by `package.json`.
  Uninstalled addon names create noisy build warnings and make the root support
  config look more capable than it is.
- Frontend error reports must sanitize before local persistence or export.
  Forwarded console output, stored reports, and exported reports must strip URL
  query strings/fragments/userinfo, emails, tokens, webhook URLs, local user
  paths, and sensitive context keys. Do not forward exact error objects to the
  browser console after capture.
- Notification webhook credentials must be validated before any keyring write.
  Frontend validation should mirror backend provider allowlists so users see the
  error while configuring Slack, Discord, or Teams, not only after a send fails.
- Feedback reports must redact the same webhook provider hosts accepted by the
  notification senders and settings UI, including legacy Discord and Teams host
  variants.
- Structured debug events returned to the frontend must be sanitized at the
  backend boundary, not only when rendering the formatted debug-log string.
- Frontend stored-error reports must redact webhook provider hosts before
  generic URL sanitization, including malformed Slack webhook-like URLs whose
  path segments may still contain secrets.
- Feedback file saves must sanitize content at the backend write boundary, even
  when the expected caller already used `generate_feedback_report`.
- User-data logs and tracing spans must use shape metadata such as length and
  presence flags instead of raw template names, saved-search names, search text,
  or preference payloads.
- Frontend `get_search_history` calls must include a bounded `limit` argument to
  match the Tauri command contract.
- Frontend command calls with object-literal args must include required backend
  command parameters, including nested command envelopes such as
  `create_saved_search`'s `search`.
- Keep dev mock handlers aligned with frontend-invoked user-data Tauri command
  names so mock development does not hide backend contract drift.
- Keep notification preference docs aligned with the camelCase backend shape,
  including `indeed`, source thresholds, `global`, `advancedFilters`, and the
  `prefs` command envelope.
- Describe SQLite as authoritative for job-search records and durable
  preferences. Do not claim browser localStorage is unused; it remains available
  for local-only UI state, caches, sanitized error logs, and recovery hints.
- Local paths in logs must use non-identifying labels. Preserve actual paths for
  file operations, database records, and user-facing operations that need them.
- Keep feature docs aligned with live source names for frontend routes and IPC
  commands; stale future-work claims count as documentation bloat.
- Do not document UI markers that are not present in source; describe current
  data flow instead.
- Exported score components sanitize non-finite scores at their own boundary,
  even when current callers already pass a safe value.
- Apply Tailwind text color classes directly in React class strings; do not
  derive inline CSS `color` values from utility class names.
- Treat tracked `.gitkeep` files as bloat in this repo. Durable empty directory
  intent belongs in docs or in the commit that introduces real fixtures.
- Treat removing bloat and junk as active repo work even though the earlier
  disposable-artifact sensor is closed.
- Do not delete root front-door or policy files just to reduce visible clutter.
- Prefer small verified cleanup commits over a large repo-wide churn commit.
- Guard the root with an explicit allowlist so new root files must be classified
  instead of silently becoming clutter.
- Keep reusable shell automation under `scripts/`; nested `test_*.sh` helpers
  should be promoted into canonical scripts or deleted.
- Preserve E2E parallelism where possible; fix shared test state directly rather
  than serializing whole suites.
- Remove unused root support directories when no command, doc, or workflow owns
  them; pair the deletion with bloat allowlist updates.
- Keep IP geolocation behind explicit user action, use HTTPS, and document the
  public-IP lookup because it is an external provider call.
- Match hiring platforms from parsed URL host/path only; page fallback can
  inspect page content, but URL detection must not trust arbitrary query text.
- Log sanitized URL labels for automation commands instead of raw
  user-controlled URLs.
- Treat stale source-tree snapshots and old module paths as repo bloat when
  they send maintainers toward files that no longer exist.
- Treat planned-status roadmap rows as bloat when live code proves the feature
  is already shipped.
- Keep active roadmap status markers as plain text so status tables stay
  searchable, accessible, and aligned with repo doc rules.
- Treat commented-out temporary test blocks as test bloat; restore the coverage
  or delete it, then guard against reintroducing it.
- Log sanitized URL labels for user-controlled navigation and import paths;
  raw URLs may include private search criteria or tokens.
- Keep the exact total Tauri command count only in canonical summary claims
  guarded by `npm run lint:tauri-invokes`; remove exact module sub-counts from
  overview docs unless a sensor owns them.
- Do not expose registered Tauri commands that are placeholders or guaranteed
  fixed errors; implement the behavior with a reviewed trust boundary or remove
  the command from the IPC surface.
- Treat Rust `assert!(true)` as no-op test bloat and fail it in
  `npm run lint:tests`; creation smoke tests must assert observable state.
- Do not keep empty placeholder fixture directories. Add real fixtures in the
  same commit as tests that read them.
- Keep speculative cloud deployment architecture out of maintained docs unless
  there is an explicit product decision and implementation plan.
- Use neutral project ownership in maintained docs; informal maintainer footers
  are bloat and should not be reintroduced.
- Avoid fixed migration counts in docs; use live directory contents for exact
  counts and keep integration-test tree examples aligned with tracked files.
- Privacy Rule 0 applies to local logs and browser console output, not only
  network requests or exported support reports.
- Broad-audience copy applies to small dashboard and settings labels, not only
  long-form docs. Avoid raw score, advanced setup, and setup jargon when a plain
  job-seeker label explains the same action.
- Disabled or guarded actions still need plain fallback copy because future UI
  changes can make those paths reachable again.

## Outcomes

- Remote CI and Docs Harness passed for pushed commit `2e28a55f`.
- Current local copy slice tightens Telegram setup, USAJobs access-code,
  dashboard average-match, and Application Assist stat labels; focused Settings
  tests, docs lint, source lint, build, and whitespace checks passed locally.
- Current local resume-copy slice changes visible resume review copy from
  overall score to overall match; focused resume panel tests, source lint,
  build, and whitespace checks passed locally.
- Current local recovery-copy slice changes Settings and Resume Readability
  recovery buttons from retry/dismiss wording to `Try Again` and
  `Close Message`; focused Settings and Resume Readability tests passed locally.
- Current local backend-copy slice changes database-domain user messages to
  local-job-data wording and adds a Rust regression test for database, query,
  schema, I/O, raw SQL, and private-path wording.
- Current local support-panel slice changes Error Log support details to safe
  support report language, replaces the per-problem clear action with
  `Remove from List`, and removes advanced-support wording from Quick Start.
- Current local Application Assist profile fallback slice changes remaining
  no-profile fallback wording to setup guidance and adds product-copy coverage
  against the stale title.
- Current local shared validation-copy slice changes email, required-field,
  resume contact, and screening-answer messages to action-first guidance, with
  product-copy coverage against old required-field phrasing.
- Current local missing-input copy slice changes pay-check, job-import, and
  search-link empty-input messages to action-first guidance, with focused
  component/page coverage.
- Current local Resume Builder validation slice changes missing-step and skill
  detail messages to action-first copy and adds focused helper coverage for
  step validation.
- Current local shared link/contact validation slice changes URL, phone, port,
  and multi-email messages to plain guidance and lets stray email-list commas
  pass instead of treating them as bad addresses.
- Current local unsafe-job-link copy slice changes invalid saved-link warnings
  to plain protective guidance and adds JobCard coverage.
- Current local shared error-fallback slice changes missing-detail, date/time,
  and file-not-found fallback copy to action-first guidance, with focused
  error-message coverage.
- Current local Application Assist profile recovery slice replaces vague
  retry-only copy with safe-support-report next steps and extends product-copy
  coverage.
- Current local saved-answer recovery slice replaces the remaining
  retry-only saved-answer load fallback with safe-support-report guidance and
  focused component coverage.
- Current local cover-letter clipboard recovery slice replaces retry-only
  copy-failure guidance with clipboard-permission guidance and focused
  component coverage.
- Current local AnalyticsPanel recovery slice replaces retry-only summary load
  guidance with safe-support-report guidance and focused component coverage.
- Current local dashboard bookmark recovery slice replaces retry-only
  bookmark-failure guidance with safe-support-report guidance and focused hook
  coverage.
- Current local notification preference recovery slice replaces retry-only
  alert-settings save guidance with safe-support-report guidance and focused
  component coverage.
- Current local shared error-helper recovery slice replaces retry-only API,
  timeout, and unknown fallback guidance with safe-support-report guidance and
  focused helper coverage.
- Current local feedback-report save recovery slice replaces the remaining
  retry-oriented save-report wording with direct copy-report and
  choose-another-folder guidance.
- Current local undo/redo recovery slice replaces browser-refresh-style
  guidance in dashboard undo, global undo, and missing-page recovery flows with
  local check plus safe-support-report next steps, with focused hook/context
  helper tests and product-copy coverage.
- Current local restart-recovery slice makes app-reopen guidance
  support-report-first across saved applications, settings load, review
  history, bulk bookmark, user-data docs, and frontend/Rust local-data plus
  website-format errors, with product-copy coverage against restart/contact
  support drift.
- Current local Resume Builder restart-copy follow-up replaces the remaining
  restart-style builder startup/load fallbacks and browser-button setup note
  with safe-support-report-first or close/reopen guidance plus product-copy
  coverage.
- Current local dashboard bulk-action recovery follow-up removes refresh-only
  and merge-only recovery guidance from selected-job hide and duplicate-merge
  all-failure paths, with focused hook expectations and product-copy coverage.
- Current local shared helper persistent-recovery follow-up adds safe support
  report fallbacks to network, site, permission, reminder, notification, local
  storage, and optional analysis-service error actions, with helper tests and
  product-copy coverage.
- Current local Browser Button recovery follow-up replaces restart wording and
  clipboard-only retry guidance with close/reopen wording plus safe support
  report fallback across frontend and command-boundary copy, with focused
  component/Rust tests and product-copy coverage.
- Current local Browser Button settings/connection follow-up replaces remaining
  Browser Import error copy with action-first safe-support-report recovery,
  renames user-facing guide copy from connection settings to button setup
  number, and adds component coverage for sanitized load, toggle, number-save,
  and copy failures.
- Current local frontend-boundary harness follow-up closes the `@/*` alias
  blind spot from the deep harness audit by resolving `tsconfig.json` path
  aliases before applying layer-boundary checks.
- Current local Application Assist review-pace follow-up changes stats away
  from volume/rate wording (`Forms Opened`, `Submission Rate`) toward
  review-first labels, changes profile review settings to `Review Pace`, removes
  the normal `50` daily option, and keeps higher saved paces visible only as
  existing state with protective guidance.
- Current local Application Tracker subtitle follow-up replaces visible
  keyboard-instruction text with plain purpose copy and adds product-copy
  coverage against the old technical subtitle.
- Current local test-quality harness follow-up closes skipped and empty-test
  blind spots by rejecting `test.skip`, empty JavaScript tests, and empty Rust
  `#[test]` functions.
- Current local modal repeated-failure recovery follow-up replaces close-and
  try-later guidance with copy/save safe support report first, with focused
  modal-boundary and product-copy coverage.
- Current local page repeated-failure recovery follow-up replaces temporary
  unavailable warning copy with save-safe-support-report-first guidance, with
  focused page-boundary and product-copy coverage.
- Current local bookmarklet URL privacy follow-up canonicalizes browser-button
  job links through the shared core URL-security path before duplicate hashing
  or storage, stripping userinfo, fragments, tracking parameters, tokens, and
  candidate/email markers. Remaining Rule 0 findings from the read-only
  security audit are notification-channel URL minimization and feedback/share
  narrative redaction.
- Current local notification URL privacy follow-up routes Slack, Discord,
  Teams, Telegram, and email job links through the shared outbound minimizer
  before optional off-device alert payloads are built; non-public links are
  omitted or replaced with local-app guidance. Remaining Rule 0 finding from
  the read-only security audit is feedback/share narrative redaction.
- Current local feedback/share privacy follow-up uses the backend support-report
  sanitizer for saved reports, copied safe reports, and GitHub issue clipboard
  content, including unlabeled employer, role, and layoff/job-search narrative
  redaction.
- Current local broad-audience copy follow-up replaces jargon in Quick Start,
  resume import, privacy tables, match/posting-risk guidance, and source-health
  troubleshooting with plain job-seeker language.
- Current local pay-floor empty-state cleanup changes no-jobs Dashboard
  recovery copy so empty searches suggest nearby titles, locations, work modes,
  or more sources before changing the user's lowest acceptable pay. Product
  copy and bloat sensors now reject old lowest-pay broadening guidance.
- Current local E2E smoke follow-up syncs Settings, Hiring Trends, and
  Application Assist Playwright selectors and report names with current
  plain-language UI labels. `npm run test:e2e:smoke:budget` now passes locally
  in 6.22 seconds against the 30-second budget.
- Current local full-E2E follow-up syncs non-smoke Playwright expectations with
  current plain-language labels, validation messages, skill-strength options,
  and keyboard-help behavior. `npm run test:e2e:all:budget` now passes 252
  Chromium and WebKit tests in 123.15 seconds with a tightened 240-second
  budget.
- Current local frontend verification follow-up syncs `ErrorLogPanel` unit
  tests with the then-current detailed-report action label.
  `npm run test:run` passes 110 Vitest files and 2637 tests, `npm run build`
  passes in 4.13 seconds, and `npm run test:scripts` passes 454 script tests.
- Current local backend verification evidence: `cargo fmt --all -- --check`
  passes, `cargo test --lib` passes 2489 tests with 21 ignored, and
  `cargo clippy -- -D warnings` reports no issues from `src-tauri`.
- Current local security/dependency verification evidence: `npm run
  lint:security`, `npm run lint:architecture`, `npm run lint:external-ai`,
  `npm run lint:tauri-invokes`, `npm audit --audit-level=moderate`, and
  `cargo deny check advisories` pass. `cargo audit` exits 0 with the known 19
  allowed upstream/transitive Rust advisory warnings tracked in `SEC-002`.
