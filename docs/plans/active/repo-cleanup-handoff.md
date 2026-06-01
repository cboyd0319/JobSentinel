# Repo Cleanup Handoff

## Current State

This handoff belongs to the active
[repo cleanup and quality sweep](repo-cleanup-and-quality-sweep.md).

The cleanup goal remains open. Do not mark it complete until current evidence
proves the repo-wide objective: identify and fix all known issues across the
JobSentinel repo, then verify docs and code against that full scope.

All tracked files under `docs/plans/active/` are now part of the current goal
scope:

- `guided-job-search-intake.md`
- `repo-cleanup-and-quality-sweep.md`
- `repo-cleanup-handoff.md`
- `research-backed-product-improvements.md`
- `status.md`

Latest pushed checkpoints include:

- `5c0d954a Sanitize toast support details`
- `30394e48 Extract privacy logging bloat rules`
- `8208976a Broaden utility fixture examples`
- `7a1728c6 Broaden config and profile seeds`
- `a4dade40 Refresh documentation screenshots`
- `378d8c56 Make profile docs app-first`
- `2b120e60 Fix bookmarklet copy test race`

Current branch note:

- `main` was pushed through `5c0d954a`. Docs Harness run `26747322402` and CI
  run `26747322398` both passed for that push. CI covered harness checks,
  harness script tests, TypeScript, ESLint, frontend unit tests, Rust fmt,
  Rust clippy, Rust library tests, npm audit, and cargo-deny advisories.
- The latest pushed harness slice adds `npm run harness:plan -- --since
  origin/main`, a changed-file command planner for focused verification.
- The latest pushed slice removes stale hardcoded employer rating claims from
  static company fallback data and adds source-quality coverage against
  reintroducing them.
- The latest pushed browser-import slice removes overbroad import promises,
  keeps setup focused on official career pages and public job pages the user
  opened, and adds product-copy coverage so large-board support claims do not
  drift back.
- The latest pushed search-link slice replaces automated-scan language in the
  Job Site Search Links UI and user docs with direct-monitoring boundaries,
  removes overconfident legal wording, and adds product-copy coverage against
  old scraper-comparison language.
- The latest pushed harness-doc accuracy slice reconciles
  `docs/harness/deep-harness-audit-2026-05-31.md` with live CI,
  docs-harness, release/manual-build, toolchain-pin, plan-index, and
  bloat-runner evidence so closed findings no longer look open.
- The latest pushed support-template UX slice changes issue templates from old
  report and scraper-first wording to safe support report and job source
  wording, with product-copy coverage against the old terms.
- The latest pushed profile-doc UX slice changes `profiles/README.md` from
  command-line-first setup to app setup first, moves manual file copying into
  advanced context, and adds product-copy coverage against recurrence.
- The latest pushed broad-audience support wording slice moves the advanced
  config profile list to broad-first ordering, changes roadmap wording to safe
  support reports, and adds sensor coverage for both drift classes.
- The latest pushed feature-privacy harness slice adds
  `docs/harness/feature-privacy-labels.json` plus `harness:check`
  validation for labels, sensitive data categories, external-AI allowance, and
  local fallback guidance.
- The latest pushed E2E budget slice adds Playwright JSON budget commands for
  smoke and full-suite runs. Latest local smoke budget evidence: 9 Chromium
  smoke tests in 5.97 seconds against a 30-second budget.
- The latest pushed Rule 0 review slice updates `.github/PULL_REQUEST_TEMPLATE.md`
  with privacy/security, local-first, external AI gateway, payload preview,
  responsible-use, safe support report, broad-audience, and
  zero-technical-knowledge checks. Manifest snippets now make
  `npm run harness:check` fail when those PR review requirements drift.
- The latest pushed zero-technical copy slice changes Market Intelligence
  refresh and empty-state wording from "run analysis" to "refresh market data"
  and updates component plus smoke E2E expectations.
- The latest pushed dashboard plain-language slice changes job-list export
  actions to download copy, removes advanced-search wording from the main
  search box, and adds DashboardFiltersBar plus QuickActions tests.
- The latest pushed support-language slice changes feedback category choices
  from bug-report and feature-request wording to report-a-problem,
  suggest-an-improvement, and ask-a-question wording, with CategorySelector
  coverage.
- The latest pushed safe support report slice changes repeat-step prompts, feedback
  modal step labels, frontend activity names, backend report type labels, and
  backend recent-activity lines to plain-language support wording; product-copy
  harness coverage now blocks the old technical labels.
- The latest pushed notification-settings UX slice changes source-rule,
  minimum-salary, saved-error, and loading-error copy to plain alert-settings
  wording, with NotificationPreferences and product-copy coverage.
- The latest pushed source-status UX slice changes source-health summary, table,
  page-check, loading, and result labels to plain job-source wording, removes
  LinkedIn from source-health test fixtures, and adds source-boundary harness
  coverage for stale status labels.
- The latest pushed support-copy UX slice changes troubleshooting helper text and
  safe app detail copy away from logs, diagnosis, and troubleshooting jargon,
  with product-copy harness coverage against those phrases.
- The latest pushed application-tracking UX slice changes visible "Ghosted" labels
  and actions to "No Response" wording while keeping legacy internal status
  keys for compatibility, with product-copy coverage against old labels.
- The latest pushed toast privacy slice sanitizes optional dev support details before
  toast display and adds privacy-logging harness coverage so raw enhanced error
  messages cannot be shown through `safeInvokeWithToast`.
- The current front-door support wording slice replaces old report language
  with safe support report language in the root README, docs hub,
  credential docs, and harness docs; product-copy coverage now includes those
  front-door and harness files.
- Continue using small verified commits. Avoid another remote CI run until the
  next explicit integration gate or full-goal completion pass.

Current cleanup posture:

- Current local synonym taxonomy follow-up reorders
  `src-tauri/src/core/scoring/synonyms.rs` so broad job-search role and tool
  groups come before programming and engineering groups. Harness coverage now
  rejects tech-first synonym ordering.
- Current local broad-profile source follow-up removes preloaded company-source
  URLs from product, UX, content, and marketing profile JSON files and extends
  broad-audience harness coverage so broad non-technical starter profiles stay
  empty until the user chooses official company pages to monitor.
- Current local broad-audience notification follow-up makes desktop alerts the
  first Settings and docs path, email the second path, and Slack, Discord,
  Teams, and Telegram explicitly optional chat paths for people already using
  those tools.
- Current local security follow-up tightens external output boundaries:
  renderer CSP keeps `connect-src 'self'`; saved job storage and Application
  Assist browser launch use the shared public HTTP(S) URL validator; alert
  email HTML escapes scraped job text and validates job links before rendering
  them as clickable links; `npm run lint:security` now guards the self-only
  renderer CSP.
- Current local zero-technical follow-up changes the Dashboard empty job-list
  recovery path when no job source is enabled: "Turn On Job Sources" opens
  Settings and "Import a Job Posting" remains available as the secondary path.
- Current local broad-audience follow-up changes Resume Builder work-sample
  link validation from a GitHub-specific label to "Portfolio or work samples".
- Current local support follow-up makes README and feedback submit copy frame
  GitHub issue sharing as optional; local safe support report saving stays
  primary and account-free.
- Current local support/privacy follow-up moves README support links and
  broken-link help to in-app safe support reports and Send Feedback first,
  keeps GitHub as an optional maintainer path, and clarifies setup/Quick Start
  privacy copy so selected job sources and alert providers are contacted only
  for features the user turns on.
- Current local broad-source heuristic follow-up stops generic broad role
  titles such as sales engineer, curriculum developer, support engineer,
  customer success engineer, and technical product manager from turning on
  tech-heavy sources by substring match. Utility and broad-audience harness
  tests now guard this behavior. The latest refinement also keeps standalone
  stack or tool keywords such as SQL, Python, and AWS from enabling tech-heavy
  source defaults for broad accounting, operations, or sales searches.
- Current local zero-technical provider setup follow-up makes USAJobs lead with
  a no-setup browser-search path before optional advanced monitoring, keeps
  Telegram bot details behind an advanced chat-alert path, and adds
  product-copy coverage against old provider setup shortcuts.
- Current local cover-letter follow-up changes template auto-fill buttons from
  raw brace tokens to plain labels such as Company and Job Title, keeps the
  inserted token values internal, updates copy/toast guidance toward blanks
  before sending, and adds product-copy coverage against raw placeholder-chip
  drift.
- Current local source-label follow-up moves source display names into a shared
  helper and applies it to job cards, Dashboard source filters, saved-search
  summaries, comparison rows, and duplicate-review rows so raw source IDs do
  not leak into broad-audience copy.
- Current local Application Assist follow-up changes the preview badge
  accessible label from "Application tracking system" to "Application form" and
  adds product-copy coverage against that user-facing ATS-jargon regression.
- Current local Resume skills follow-up replaces unlabeled skill confidence
  percentages with source labels such as "Found in resume" and "Added by you,"
  with product-copy coverage against confidence-score display drift.
- Current local skill-label follow-up replaces vague self-rating labels such as
  beginner, intermediate, advanced, expert, and seniority level with
  behavior-based skill strength and role-stage copy across Resume, Resume
  Builder, Pay Protection, docs, and product-copy sensors.
- Current local Application Assist readiness follow-up keeps Prepare Form
  available for users with a saved profile even while optional
  application-form detection is still loading, preventing a slow recognition
  check from blocking the review path. The same slice now shares plain
  application-form display labels across job-card badges and the review modal
  so raw platform IDs do not appear in the preview.
- Current local privacy follow-up removes raw screening-question text and saved
  answer patterns from Application Assist debug logs. The trace now records
  only question/pattern character counts when a saved answer matches, and
  privacy-logging coverage rejects the old raw trace shape.
- Current local broad-audience copy follow-up removes technical or anxious
  user-facing copy from Dashboard search help, saved screening answers, site
  challenge errors, Auto-Search help, and Slack notification docs. Users now
  see plain labels for question matches and answer-learning state, human-check
  wording for site challenges, less absolute alert copy, and Slack labeled as
  advanced chat setup after easier desktop/email paths.
- Current local Application Assist suggestion follow-up changes suggested
  screening answers away from smart/history framing, confidence percentages,
  modification percentages, and raw Manual/Learned/History source badges.
  Users now see Suggested Answers, review-state labels, edit-frequency labels,
  and saved/used source labels, with focused UI and product-copy coverage.
- Current local human-check copy follow-up changes Application Assist warnings,
  preview tasks, and one-click application docs away from CAPTCHA-first wording
  toward human-check wording. The responsible-use boundary remains explicit:
  JobSentinel pauses and the user completes site checks themselves.
- Current local Dashboard salary-filter follow-up makes the filter accept full
  yearly dollars, not thousands. A value like 60000 now matches a $65,000 role
  instead of being treated as $60,000,000; labels, current-filter summaries,
  E2E page-object selectors, focused hook/UI tests, and product-copy sensors
  were updated.
- Bloat and junk sensors exist and run through `npm run lint:bloat`.
- `npm run harness:plan -- --since origin/main` now maps changed files to
  focused verification commands from the harness matrix.
- Root-entry, local-artifact, and tracked-disposable bloat checks now live in
  `scripts/harness/checks/repo-artifacts.mjs`.
- Package and dependency ownership checks now live in
  `scripts/harness/checks/dependency-ownership.mjs`.
- Source-structure checks for unreferenced settings helpers, hooks, helper
  modules, local barrels, and notification preference wrappers now live in
  `scripts/harness/checks/source-structure.mjs`.
- E2E helper ownership checks now live in
  `scripts/harness/checks/e2e-helpers.mjs`.
- Product-framing checks for the README definition, free-forever MIT wording,
  and banned job-search phrases now live in
  `scripts/harness/checks/product-framing.mjs`.
- Product-copy checks for stale Resume Optimizer framing, resume-template
  audience copy, Application Assist automation framing, ghost-risk
  overconfidence, and pay-guidance overconfidence now live in
  `scripts/harness/checks/product-copy.mjs`.
- Privacy/logging bloat-runner orchestration now lives in
  `collectPrivacyLoggingViolations`; `scripts/check-repo-bloat.mjs` is now a
  small 584-line orchestrator after the latest IPC-minimization guard.
- Broad-audience fixture checks now cover generic skill-filter categories, Cow
  utility tests, API-contract search history, and ignored live-scraper probes
  so technical defaults do not quietly drift back into broad examples.
- Broad-audience seed checks now cover example config company lists, broad
  non-engineering profile URL seeds, developer-doc examples, and salary
  location fixtures.
- Documentation screenshots were refreshed with current broad-audience UI data;
  the settings screenshot now opens the settings modal instead of duplicating
  the dashboard.
- Static company fallback data no longer ships hardcoded employer ratings;
  cached or live company data can still render a rating when that data exists,
  and `npm run lint:bloat` now rejects hardcoded fallback ratings.
- Browser import copy no longer promises support for any job posting or named
  large job boards. It now explains official/public page boundaries and says
  JobSentinel does not bypass controls when a board blocks page import.
- Search-link copy now describes browser-opened searches instead of automated
  scan avoidance, and user docs avoid legal guarantees or scanner comparison
  language.
- Release-promise drift checks now live in
  `scripts/harness/checks/release-promises.mjs`.
- Initial privacy-logging checks for raw automation dropdown values and raw
  frontend error forwarding now live in
  `scripts/harness/checks/privacy-logging.mjs`.
- Privacy audit follow-up removed raw automation dropdown-answer logging and
  raw frontend error forwarding. The bloat sensor now rejects those patterns,
  and `errorReporting` unit tests cover sanitized console forwarding.
- UX audit follow-up made local safe support report saving the recommended
  feedback submit path, added safe support report copy/save actions to modal
  crash recovery, and aligned Quick Start notification setup wording with the
  current wizard.
- Support/reporting UX audit items are closed locally: problem-history/export
  labels are plainer, saved-report success steps are account-optional, and
  generated safe support report headings use support language instead of
  system/config/structured-data language.
- Public roadmap and developer roadmap support report wording now use safe
  support report language instead of old report labels.
- Visible crash recovery, Settings, and feedback submit/success copy now use
  safe support report wording, and product-copy checks reject the shorter safe
  report label on those surfaces.
- Latest broad-audience read-only audit found no high-confidence remaining
  engineer-first violations across maintained UI and user docs. Latest
  zero-technical read-only audit found debt in Settings, source health, Resume
  readability import/copy, structured resume import, browser-session storage
  recovery, and visible dashboard shortcut copy. Local follow-ups removed
  remaining `ATS` jargon from browser button and LinkedIn monitoring guidance,
  renamed the old advanced tab to "More Settings", changed source-health
  page-check and icon-only actions to plain labels, mapped raw Resume
  suggestion category keys to plain labels, clarified resume-app export and
  PDF upload recovery paths, labeled structured imports as "Import from resume
  app", replaced browser-session storage wording with copy/paste recovery, and
  moved dashboard shortcut syntax behind the existing Shortcuts control. Each
  closed item has focused or product-copy coverage against recurrence.
- Latest backend command error-copy follow-up replaced shared technical
  category labels with plain local-data, saved-settings, connection, file, and
  information-review copy while preserving raw SQL/secret suppression; product
  copy now rejects the old backend error labels.
- Latest frontend privacy follow-up removed raw `safeInvoke` command arguments
  and raw backend exception text from propagated enhanced errors. The wrapper
  now throws display-safe copy with count/type-only argument summaries; privacy
  logging coverage rejects raw invoke arguments and raw fallback errors.
- Latest resume import boundary follow-up routes PDF and JSON Resume file
  selection through backend native file-picker commands. The renderer no
  longer receives or submits raw resume file paths for upload/import, JSON
  import still checks file type and size before import, PDF uploads copy the
  selected file into app-owned local storage before parsing, and source-quality
  coverage rejects renderer-owned file picker imports.
- Latest Resume Match UX follow-up makes choose/upload the primary route,
  keeps resume-app export paste behind an explicit Import from Resume App
  action, removes the circular PDF-upload hint, and adds focused UI plus
  product-copy coverage against the old raw export-data path.
- Latest protective-tone follow-up changes resume readability score labels
  away from judgmental terms such as Excellent, Great, and Poor toward
  evidence-focused labels, with unit and product-copy coverage against drift.
- Latest security follow-up minimizes screening-answer learning IPC so renderer
  responses no longer expose raw saved answer patterns, historical question
  text, original answers, or edited answer text; summary counts remain
  available locally, and IPC-minimization sensors reject drift.
- Latest ATS timeline privacy follow-up stops `application_events.event_data`
  from duplicating private note bodies or reminder messages. Notes and
  reminders still keep their user-visible content in owning tables, timeline
  events keep only presence/count metadata, legacy event payloads are scrubbed
  by migration, and privacy-logging sensors reject drift.
- Latest broad-audience notification follow-up changes alert preferences away
  from "interrupt you," internal source-rule limits, and tech-career title
  examples. Alert rules now use protective time-control wording, broader role
  examples, and product-copy coverage against drift.
- Latest explorer-audit follow-up reduces zero-technical and protective tone
  drift in setup alerts, additional job sources, browser-button setup,
  analytics headings, weekly application pacing, and Dashboard search tips.
  Product-copy sensors now reject the old provider-heavy, browser-power-user,
  funnel/goal, and Boolean-search wording.
- Latest harness-session follow-up fixed the JSON mode argument parser so
  `npm run harness:session -- --json` no longer treats `--json` as the repo
  root and no longer returns a zeroed unavailable snapshot.
- Latest E2E reliability follow-up removed remaining `networkidle` waits from
  normal job-interaction coverage and expanded the active E2E fixed-wait sensor
  to catch both `waitForTimeout` and `networkidle` outside screenshot capture.
- Latest zero-technical UX follow-up fixed Settings load failure escape and
  guidance, application tracker first-use empty state, Dashboard no-jobs
  recovery guidance, browser import Advanced connection hiding, install wording
  in Quick Start, and location lookup copy.
- Latest broad-audience follow-up rebalanced company suggestions and
  notification placeholders across multiple fields, replaced generic
  tech-first resume/mock ATS fixtures, switched E2E examples toward customer
  support and care coordination, and aligned tests with the visible
  "Skills Interview" label.
- Latest backend fixture follow-up rebalanced generic market-intelligence,
  notification, config, database, ATS, ghost detection, salary, scoring,
  generic scraper adapters, command, and mock job examples toward care
  coordination, public health, operations, training, inventory planning,
  account management, and customer support, then added focused bloat coverage
  for recurring generic-fixture paths.
- Latest salary fixture follow-up broadened prediction, seniority, and
  normalization examples outside explicit software-engineer/SWE branch coverage,
  then added focused bloat coverage for those salary fixture paths.
- Latest broad fixture follow-up broadened the sample JSON Resume, company
  fallback systems, bookmarklet, import, remote-scoring, dashboard-search,
  score-modal, undo, export, and feedback sanitizer examples toward operations,
  care coordination, customer support, public health, inventory planning, and
  other broad job-seeker roles; bloat coverage now rejects drift in the newly
  cleaned sample-resume, bookmarklet, search-history, and score-modal paths.
- Latest broad fixture follow-up also broadened generic mock location defaults
  and Rust Application Assist profile examples away from old `John Doe`,
  `Jane Doe`, GitHub, San Francisco, and New York fixtures; the
  broad-audience fixture sensor now covers those paths.
- Latest broad fixture follow-up rebased scoring location examples away from
  San Francisco and New York defaults toward Chicago and Austin examples; the
  broad-audience fixture sensor now rejects those tech-hub defaults in scoring
  paths.
- Latest E2E reliability follow-up removed the hard sleep from keyboard
  search-focus coverage and expanded the fixed-wait sensor from page objects
  to every active Playwright runtime file. Screenshot capture remains allowed
  to wait because it is excluded from normal E2E runs.
- Latest zero-technical UX follow-up fixed the highest dashboard/application
  assist blockers from the audit: missing-detail job-import previews can still
  be saved, job cards expose Prepare Form when dashboard navigation is
  available, no-profile states show a Set Up Profile recovery action, and
  stale `Settings > Application Assist` recovery copy is replaced by the
  sidebar Application Assist path.
- Latest zero-technical Settings follow-up validates settings backups before
  restore, blocks Discord/Teams/Telegram alert toggles until connection
  details exist, uses saved-on-this-computer secret status copy, softens manual
  email detail labels, clarifies alert-source rule scope, and updates
  notification docs to match the current Settings tab layout.
- Latest broad-audience follow-up keeps product/design roles off tech-heavy
  boards unless explicitly technical, changes the cover-letter tech category
  to IT/software wording, and broadens company fallback data across healthcare,
  retail, logistics, hospitality, education, public service, and insurance.
- Latest docs-bloat follow-up links `docs/developer/LINUX_BUILD.md` from the
  docs hub, fixes its Linux build workflow trigger description, and adds
  `docs/releases/README.md` as the historical release-notes index. Docs-drift
  coverage now rejects unlinked Linux build docs, stale Linux build trigger
  claims, and unindexed release-note files.
- Latest Application Assist wording follow-up replaces user-visible
  automation-browser close copy with plain browser-window copy, stops exposing
  raw backend platform notes as badge hover text, and adds product-copy
  coverage against both drift classes.
- Latest support/privacy follow-up keeps saved support reports local in the
  primary flow, removes GitHub-first and shared-folder copy from support
  surfaces, replaces visible old report wording with safe support report
  wording, broadens generic Application Assist profile labels away from Code
  profile, and hardens Rust report sanitization for full URLs, query secrets,
  password-like values, and bookmarklet import tokens.
- Latest bookmarklet privacy follow-up removes the import token from
  renderer-facing bookmarklet config and mocks, copies the browser import
  button through a Rust command, and adds IPC-minimization harness coverage for
  bookmarklet token DTO drift.
- Latest Application Assist resume-boundary follow-up routes resume selection
  through a backend native file-picker command, copies selected files into
  app-owned local storage, sends the renderer only a token and display name,
  rejects renderer-supplied resume paths, validates legacy saved paths before
  form prep, and keeps resume attachment manual so saved resumes are not
  uploaded automatically.
- Latest zero-technical copy follow-up softens optional email setup, labels
  USAJobs access as an access code with no coding needed, changes screening
  answer setup from matching text to plain question wording, and removes
  GitHub-first Deep Links troubleshooting copy.
- Latest recovery-copy follow-up removes stale `Settings > Database > Restore
  from backup` guidance, distinguishes cancelled settings restore from
  unreadable backup files, replaces webhook protocol/port/host errors with
  provider-first connection-link actions, labels raw problem export as an
  advanced support action, and changes failed job-link import guidance to the
  browser-address-bar action instead of Schema.org or URL wording.
- Latest broad-audience source follow-up keeps tech-heavy source defaults and
  recommendations gated to technical searches, adds regression coverage for
  broad remote searches such as office management and medical assistant work,
  and expands synonym matching/docs across healthcare, office, operations,
  public-sector, customer support, accounting, education, retail, and
  non-software tool vocabulary.
- Latest source-health UX follow-up adds a plain "What To Do" column to the job
  source health table, changes connection and check-speed wording away from
  diagnostic jargon, and replaces Cloudflare-protection warnings in advanced
  sources with search-link/browser-link recovery guidance.
- Latest source-status UX follow-up changes source-health summary, table,
  page-check, loading, and result labels to plain job-source wording, removes
  LinkedIn from source-health test fixtures, and expands source-boundary
  harness coverage for stale status labels.
- Latest support-copy UX follow-up changes troubleshooting helper text and safe
  app detail copy away from logs, diagnosis, and troubleshooting jargon, with
  product-copy harness coverage against those phrases.
- Latest application-tracking UX follow-up changes visible "Ghosted" labels and
  actions to "No Response" wording while keeping legacy internal status keys for
  compatibility, with product-copy coverage against old labels.
- Latest toast privacy follow-up sanitizes optional dev support details before
  toast display and adds privacy-logging harness coverage against raw
  `enhancedError.message` display in `safeInvokeWithToast`.
- Latest front-door support wording follow-up replaces old report wording with
  safe support report wording in the root README, docs hub, credential
  docs, and harness docs, with product-copy coverage against recurrence.
- Latest IPC minimization work added `has_application_profile`,
  `get_application_profile_preview`, `get_dashboard_preferences`, canonical
  import URLs before preview/hash/storage, and minimized import responses to
  `{ jobId }`.
- The follow-up harness slice added
  `scripts/harness/checks/ipc-minimization.mjs` and script coverage so full
  profile calls outside the profile editor, Dashboard full-config calls, raw
  post-preview import URLs, full imported-job returns, and stale minimized mocks
  fail through `npm run lint:bloat`.
- `scripts/check-repo-bloat.mjs` is now a small orchestrator for modular
  harness checks. Docs drift, privacy logging, broad-audience fixtures,
  technical-first copy, source quality, and security-doc patterns have focused
  modules under `scripts/harness/checks/`.
- Docs harness exists and runs through `npm run harness:check`.
- Environment readiness is now checked through `npm run doctor`; E2E/browser
  readiness uses `npm run doctor:e2e`.
- Test-quality guard exists and blocks focused tests, runtime skips, and weak
  E2E assertions through `npm run lint:tests`.
- Normal CI now runs `npm run harness:check` and `npm run test:scripts` in a
  dedicated harness job.
- E2E runtime budget tracking now exists through
  `npm run test:e2e:smoke:budget` and `npm run test:e2e:all:budget`.
- Docs Harness now watches the whole `scripts/**` set and runs harness script
  tests, so sensor changes no longer bypass the docs workflow path filter.
- Release and manual Linux/Windows build workflows now validate release version
  metadata and run preflight checks before artifact build or upload.
- External-AI provider detection now runs through `npm run lint:external-ai`
  and through `npm run harness:check`. It scans code plus JSON, YAML, TOML, and
  env-style config for direct provider endpoints, SDKs, hosted inference
  endpoints, dependency declarations, and provider API-key variables outside
  `src/services/aiGateway.ts`.
- Walking Labs harness material has been evaluated twice: Lecture 02 mapped the
  repo against instructions, tools, environment, state, and feedback; the
  `harness-creator` skill evaluation recorded the external validator mismatch
  as an interoperability gap, not a repo quality score.
- A deep harness audit on 2026-05-31 identified harness debt. CI harness
  coverage, release preflight, hardcoded harness policy extraction, external AI
  provider scan breadth, doctor platform/E2E readiness, and active-plan
  compaction are now closed; oversized mixed sensors remain tracked as
  in-progress debt in `docs/plans/tech-debt-tracker.md`.
- `docs/plans/active/status.md` now provides the compact restart surface for
  active goal state, next work, and the completion bar; older progress rows are
  archived under `docs/plans/archive/`.
- Chromium and WebKit focused E2E flows were stabilized for keyboard navigation
  and job filtering in the latest slice.
- Root README now points developers to the quality gates that protect this work.
- Research-backed product improvement planning exists as an active plan across
  setup, scoring, resume, ATS, ghost detection, applications, market
  intelligence, accessibility, privacy, and security.
- Root and nested junk scans were rerun on 2026-05-28. Local `.DS_Store`
  artifacts in root/docs paths were removed. Tracked disposable pattern scan,
  untracked scan, local artifact `find` scan, and `npm run lint:bloat` passed.
- User ease is now a standalone goal requirement: assume zero technical
  knowledge for end users. Troubleshooting and issue reporting must stay
  one-click, plain-language, and privacy-preserving.
- Multiple sub-agents are authorized for isolated audits, research, and
  implementation slices. Keep scope bounded, avoid shared edit conflicts, close
  completed agents promptly, and copy durable findings into active plans or the
  debt tracker.
- Broad audience fit is also a standalone design requirement: JobSentinel is
  for all job seekers and technical plus non-technical roles, not just
  engineers.
- Protective job-search guidance is now a standalone design requirement:
  ghost-job protection, pay-equity safeguards, long-term-unemployment pacing,
  bias-aware application routes, practical tone, and local-first privacy are
  core goal inputs.
- Harness docs and templates now require audience/ease, support-path, rollback,
  handoff, and experience-sensor thinking for non-trivial work. The harness
  check guards those template snippets.
- Root README was rechecked against live release assets, package version,
  current command count, and product direction.
- `docs/README.md` is now a current documentation hub instead of a stale
  release log. Harness checks no longer require volatile command-count claims
  inside that docs index.
- The plans index includes all current active plans, including the
  research-backed product improvements plan.
- Backend resume parsing, rendering, export, JSON Resume, builder, and
  readability-analysis fixtures now use community-program and client-service
  examples instead of engineer-first defaults, and the readability keyword
  extractor covers common non-software role terms.
- Resume match database fixtures now cover client-support and case-management
  examples instead of relying on software-engineering and TechCorp defaults.
- Resume match degree parsing now guards against false M.A. matches inside
  words such as "management".
- Backend import/schema.org and deep-link generator examples now use
  customer-support and care-coordination examples instead of engineer and
  tech-hub defaults.
- Release notes now use Resume Match and resume-readability framing instead of
  older optimization and score-first language.
- Root README now has the product screenshot, route map, abstract, at-a-glance
  table, download path, safety model, research model, and source index in the
  maintained information-design order.

## Recent Work Landed

Recent cleanup slices on `main` include:

- Protective ghost/posting-risk wording across UI and maintained docs, replacing
  fake/real verdict language with stale, low-trust, needs-review, and
  verify-before-tailoring guidance.
- Backend resume fixture cleanup and broader role keyword extraction for
  resume readability checks.
- Resume match fixture cleanup for broad-audience scoring examples.
- Degree-detection regression coverage for case-management job descriptions.
- Backend import/deep-link fixture cleanup for broad-audience examples.
- Release-note copy cleanup for current resume framing.
- WebKit E2E shortcut delivery and dashboard count stabilization.
- Chromium E2E stabilization after full-suite failures.
- Active research-backed product planning for job-seeker behavior, ATS-aware
  preparation, ghost/stale-post research, local source collection, salary
  negotiation, and pay-equity support.
- Resume Match copy moved from ATS/keyword jargon to resume-match and
  job-word language.
- Root and nested junk scan removed local `.DS_Store` artifacts and confirmed
  no tracked or untracked disposable artifacts remain outside expected ignored
  build/dependency roots.
- Research-backed guided intake, work-to-avoid intake, and setup review summary.
- Plain-language Deep Link, Browser Import Button, problem history, and ATS
  word-match copy.
- Harness improvement from current public harness-engineering references and
  Persona/Bluepeak-AI sibling repo patterns.
- Root README release/download accuracy update and WebKit slash-shortcut E2E
  stabilization.
- Resume sub-score percentage rendering fix.
- JSDOM download navigation noise cleanup.
- Rust advisory watch recheck: `cargo audit` and
  `cargo deny check advisories` both exit 0 on 2026-06-01; remaining allowed
  upstream/transitive warnings stay tracked under `SEC-002`.
- Empty source-directory bloat guard.
- Frontend development logging sanitization.
- Context hook split to remove react-refresh suppressions.
- Browser memory typing and trend-chart typing cleanup.
- Malformed stored JSON validation across resume, ATS, analytics, score, and
  error-log surfaces.
- Credential, scraper, notification, import, resume, feedback, and keyring
  privacy hardening.
- Maintained docs normalization to remove stale status markers, glyph-heavy
  diagrams, stale release promises, and version drift.
- Root README was redesigned as a professional research-project front door and
  pushed to `origin/main`; the remote Docs Harness and CI runs for that README
  slice passed before later cleanup work.
- Setup now asks for review volume in plain language and maps the answer to
  existing local source limits and alert strength.
- Browser import copy now avoids bookmarklet, any-website, safety-token, and
  auto-import language; clipboard failures show safe copy guidance.
- Resume page copy now uses broad skill categories, plain match labels, and
  cautious skill-gap language instead of engineer-first categories or raw
  score-breakdown wording.
- Resume Builder, Resume Match, market intelligence, and company research test
  fixtures now use broader customer-support, care, education, retail,
  logistics, hospitality, finance, public-service, and community-program
  examples.
- `docs/README.md` now routes users, contributors, privacy reviewers, research
  reviewers, and coding agents to maintained docs without duplicating release
  notes.
- Dashboard hooks, dev mock handlers, Application Assist, notifications,
  location heatmap, developer testing docs, and small validation/stat fixtures
  were rebased away from engineer-first examples and covered with bloat
  sensors. Remaining scan hits are intentional technical profile support,
  career-profile coverage, and real company-location sample data.
- Added `npm run doctor` and script tests for local environment readiness.
- Recorded Walking Labs `harness-creator` skill compatibility findings without
  adding duplicate root state files.
- Recorded the deep harness audit and promoted top findings into the debt
  tracker.
- Added normal-CI harness coverage, widened Docs Harness script coverage, and
  added release/manual-build preflight gates with release metadata validation.
- Added standalone external-AI provider scanning for code and config files and
  covered it with focused script tests.
- Extended `npm run doctor` with Linux Tauri package checks, `patchelf`,
  Playwright Chromium launch readiness, and Node/Rust CI-baseline drift
  warnings; added `npm run doctor:e2e` as the strict E2E readiness gate.
- Added `docs/harness/manifest.json` so `npm run harness:check` reads required
  harness files, policy snippets, and README reference-source coverage from
  data instead of hardcoded checker tables.
- Added `docs/plans/active/status.md`, archived older active-plan progress
  rows, routed the plan index and harness/agent guides toward the compact
  status surface, and closed `HE-011`.
- Extracted repo artifact policy from `scripts/check-repo-bloat.mjs` into
  `scripts/harness/checks/repo-artifacts.mjs` with focused
  `scripts/check-repo-artifacts.test.mjs` coverage.
- Extracted package and dependency ownership checks from
  `scripts/check-repo-bloat.mjs` into
  `scripts/harness/checks/dependency-ownership.mjs` with focused
  `scripts/check-dependency-ownership.test.mjs` coverage.
- Extracted source-structure checks from `scripts/check-repo-bloat.mjs` into
  `scripts/harness/checks/source-structure.mjs` with focused
  `scripts/check-source-structure.test.mjs` coverage.
- Extracted E2E helper ownership checks from `scripts/check-repo-bloat.mjs`
  into `scripts/harness/checks/e2e-helpers.mjs` with focused
  `scripts/check-e2e-helpers.test.mjs` coverage.
- Extracted product-framing checks from `scripts/check-repo-bloat.mjs` into
  `scripts/harness/checks/product-framing.mjs` with focused
  `scripts/check-product-framing.test.mjs` coverage.
- Extracted product-copy checks from `scripts/check-repo-bloat.mjs` into
  `scripts/harness/checks/product-copy.mjs` with focused
  `scripts/check-product-copy.test.mjs` coverage.
- Extracted release-promise checks from `scripts/check-repo-bloat.mjs` into
  `scripts/harness/checks/release-promises.mjs` with focused
  `scripts/check-release-promises.test.mjs` coverage.
- Used read-only UX and security sub-agents. Closed the security findings for
  raw dropdown-answer logging and raw frontend console forwarding in code and
  tests. Recorded remaining UX support/recovery findings as open debt.
- Latest local security follow-up hardens user-controlled external URL fetches:
  structural URL validation rejects private host suffixes and embedded private
  IP hostnames, user-entered job-page imports and JobsWithGPT do fetch-time DNS
  checks before sending, shared scraper clients no longer follow redirects, and
  remaining bookmarklet/rate-limit findings are recorded in the debt tracker.
- Latest local bookmarklet security follow-up routes browser-helper imports
  through public HTTP(S) URL validation and shared job storage validation,
  closing the raw insert bypass for unsafe URLs and oversize job fields.
- Latest local scraper reliability follow-up moves production scraper
  constructors to a process-wide shared rate limiter, preserving source
  cooldown state across repeated manual runs and fresh scheduler instances.
- Latest local bookmarklet boundary follow-up removes wildcard CORS and custom
  auth headers from the browser-helper flow, refreshes the local safety code
  only after the browser button is copied successfully, keeps the previous
  button usable on clipboard failure, consumes copied codes after the first
  valid local import attempt, and expires copied codes after about one hour.
  The helper now binds the local port before reporting that it is running, so
  occupied ports fail visibly instead of leaving stale running state.
- Latest local zero-technical setup follow-up removes raw Slack connection-link
  setup from first-run onboarding and replaces it with a plain note that
  optional chat alerts can be added later in Settings.
- Latest local user-doc follow-up clarifies release-asset downloads, leads
  notification setup with desktop and email before optional chat alerts, sends
  normal site requests through feedback before developer docs, and moves Linux
  keyring commands into an advanced reference.
- Improved zero-technical support recovery by making local safe support report
  saving primary, keeping GitHub optional, adding safe support report actions to
  modal crash recovery, and updating notification setup docs.
- Simplified problem-history/export copy, made saved-report success steps
  account-optional, and reworded generated report headings and field names for
  non-technical users.

The active plan progress table has detailed slice history.

## Verified Recently

Latest zero-technical and broad-audience UX slice checks on 2026-05-31:

- `npm run test:run -- src/components/BookmarkletGenerator.test.tsx
  src/components/CompanyAutocomplete.test.tsx src/pages/Settings.test.tsx
  src/pages/Resume.test.tsx src/mocks/handlers.test.ts`
- `npm run lint:docs`
- `npm run lint:bloat`
- `npm run lint`
- `npm run build`
- `npm run test:e2e -- tests/e2e/playwright/application-tracking.spec.ts
  tests/e2e/playwright/resume-builder.spec.ts`
- `cd src-tauri && cargo fmt --all -- --check`
- `git diff --check`

Latest sensor-modularity slice checks on 2026-05-31:

- `node --check scripts/check-repo-bloat.mjs`
- `node --check scripts/harness/checks/repo-artifacts.mjs`
- `node --check scripts/harness/checks/dependency-ownership.mjs`
- `node --check scripts/harness/checks/source-structure.mjs`
- `node --check scripts/harness/checks/e2e-helpers.mjs`
- `node --check scripts/harness/checks/product-framing.mjs`
- `node --check scripts/harness/checks/product-copy.mjs`
- `node --check scripts/harness/checks/release-promises.mjs`
- `node --test scripts/check-product-framing.test.mjs scripts/check-repo-bloat.test.mjs`
- `node --test scripts/check-product-copy.test.mjs scripts/check-repo-bloat.test.mjs`
- `node --test scripts/check-release-promises.test.mjs scripts/check-repo-bloat.test.mjs`
- `npm run test:scripts`

Latest privacy-audit slice checks on 2026-05-31:

- `node --check scripts/harness/checks/privacy-logging.mjs`
- `node --check scripts/check-repo-bloat.mjs`
- `node --test scripts/check-privacy-logging.test.mjs scripts/check-repo-bloat.test.mjs`
- `node --test scripts/check-repo-bloat.test.mjs`
- `npm run test:run -- src/utils/errorReporting.test.ts`
- `npm run test:scripts`
- `npm run lint:bloat`
- `npm run harness:check`
- `npm run lint:docs`
- `npm run lint`
- `cd src-tauri && cargo fmt --all -- --check`
- `git diff --check`

Latest UX support-recovery slice checks on 2026-05-31:

- `npm run test:run -- src/components/feedback/SubmitOptions.test.tsx
  src/components/ModalErrorBoundary.test.tsx`
- `npm run test:run -- src/components/ErrorLogPanel.test.tsx
  src/components/feedback/SuccessScreen.test.tsx
  src/services/feedbackService.test.ts src/mocks/handlers.test.ts`
- `cd src-tauri && cargo test --lib commands::feedback`
- `npm run lint:bloat`
- `npm run lint:docs`
- `npm run lint`
- `npm run build`

Latest active-plan documentation slice checks on 2026-05-31:

- `npm run harness:check`
- `npm run test:scripts`
- `npm run lint:docs`
- `npm run lint:bloat`
- `git diff --check`

Latest generic scraper broad-audience fixture slice checks on 2026-05-31:

- `cd src-tauri && cargo fmt --all -- --check`
- `cd src-tauri && cargo test --lib scrapers`
- `npm run lint:bloat`
- `npm run test:scripts -- check-repo-bloat`
- `npm run lint:docs`
- `git diff --check`

Latest salary broad-audience fixture slice checks on 2026-05-31:

- `cd src-tauri && cargo fmt --all -- --check`
- `cd src-tauri && cargo test --lib salary`
- `npm run lint:bloat`
- `npm run test:scripts -- check-repo-bloat`

Latest mock/profile broad-audience fixture slice checks on 2026-06-01:

- `node --test scripts/check-broad-audience-fixtures.test.mjs`
- `npm run lint:bloat`
- `npm run test:scripts -- --test-name-pattern broad audience`

Latest scoring broad-audience fixture slice checks on 2026-06-01:

- `node --test scripts/check-broad-audience-fixtures.test.mjs`
- `cargo test --manifest-path src-tauri/Cargo.toml core::scoring --lib`
- `rg "San Francisco|New York" src-tauri/src/core/scoring/mod.rs src-tauri/src/core/scoring/remote.rs`

Latest active E2E fixed-wait slice checks on 2026-06-01:

- `rg "waitForTimeout" tests/e2e/playwright`
- `node --test scripts/check-docs-drift.test.mjs scripts/check-repo-bloat.test.mjs`
- `node scripts/run-playwright.mjs test --project=chromium --grep "focuses dashboard search"`
- `npm run test:e2e:smoke`
- `npm run lint:bloat`
- `npm run test:scripts`

Latest five-tuple harness score slice checks on 2026-06-01:

- `node --check scripts/harness-score.mjs`
- `node --check scripts/harness-session.mjs`
- `node --check scripts/harness-benchmark.mjs`
- `node --check scripts/check-harness.mjs`
- `node --check scripts/doctor.mjs`
- `node --test scripts/harness-score.test.mjs`
- `node --test scripts/harness-session.test.mjs`
- `node --test scripts/harness-benchmark.test.mjs`
- `node --test scripts/doctor.test.mjs`
- `node --test scripts/check-harness-policy.test.mjs`
- `node --test scripts/check-repo-artifacts.test.mjs`
- `npm run harness:score`
- `npm run harness:session`
- `npm run harness:benchmark`
- `npm run harness:check`
- `npm run test:scripts`
- `npm run doctor`
- `npm run doctor:e2e`
- `npm run lint:md`
- `npm run lint:docs`
- `git diff --check`

Latest docs-drift harness modularity slice checks on 2026-06-01:

- `node --check scripts/check-repo-bloat.mjs`
- `node --check scripts/harness/checks/docs-drift.mjs`
- `node --test scripts/check-docs-drift.test.mjs`
- `node --test scripts/check-repo-bloat.test.mjs`
- `npm run lint:bloat`
- `npm run harness:check`
- `npm run harness:score`
- `wc -l scripts/check-repo-bloat.mjs scripts/harness/checks/docs-drift.mjs`

Latest harness benchmark slice checks on 2026-06-01:

- `node --check scripts/harness-benchmark.mjs`
- `node --test scripts/harness-benchmark.test.mjs scripts/harness-score.test.mjs`
- `npm run harness:score`
- `npm run harness:benchmark`
- `npm run harness:check`
- `npm run test:scripts`
- `npm run lint:bloat`
- `npm run lint:docs`
- `git diff --check`

Latest privacy-logging orchestration split checks on 2026-06-01:

- `node --check scripts/check-repo-bloat.mjs`
- `node --check scripts/harness/checks/privacy-logging.mjs`
- `node --test scripts/check-privacy-logging.test.mjs`
- `node --test --test-name-pattern` focused bloat cases:
  `raw private query logging|unsanitized feedback|manual bookmarklet|frontend error reporter`
  against `scripts/check-repo-bloat.test.mjs`
- `npm run lint:bloat`
- `npm run test:scripts`
- `npm run harness:check`
- `npm run lint:docs`
- `npm run harness:score`
- `git diff --check`
- `wc -l scripts/check-repo-bloat.mjs scripts/harness/checks/privacy-logging.mjs`

Latest broad-audience fixture slice checks on 2026-06-01:

- `node --check scripts/harness/checks/broad-audience-fixtures.mjs`
- `node --test scripts/check-broad-audience-fixtures.test.mjs`
- `npm run test:run -- src/components/SkillCategoryFilter.test.tsx`
- `cargo test --manifest-path src-tauri/Cargo.toml --test cow_zero_copy_tests`
- `cargo test --manifest-path src-tauri/Cargo.toml --test api_contract_test test_search_history`
- `cargo test --manifest-path src-tauri/Cargo.toml --test scraper_integration_test test_dice_scraper`
- `cargo test --manifest-path src-tauri/Cargo.toml --test live_scraper_test --no-run`
- `npm run lint:bloat`
- `npm run test:scripts`
- `npm run lint:docs`
- `npm run harness:check`
- `npm run harness:score`
- `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check`
- `git diff --check`
- `npm run harness:benchmark`

Latest broad-audience seed slice checks on 2026-06-01:

- `node --test scripts/check-broad-audience-fixtures.test.mjs`
- `npm run lint:bloat`
- `node -e` JSON parse check for `config/config.example.json` and changed
  profile JSON files
- `npm run lint:docs`
- `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check`
- `cargo test --manifest-path src-tauri/Cargo.toml core::salary --lib`

Latest documentation screenshot slice checks on 2026-06-01:

- `npm run docs:screenshots`
- `npm run docs:screenshots -- --grep "settings screenshot"`
- Visual check of refreshed `dashboard.png`, `application-tracking.png`,
  `settings.png`, `resume-builder.png`, `resume-matcher.png`,
  `ats-optimizer.png`, `salary-ai.png`, `market-intelligence.png`, and
  `one-click-apply.png`

Latest harness/readiness slice checks on 2026-05-31:

- `node --check scripts/check-harness.mjs`
- `node --test scripts/check-harness-policy.test.mjs`
- `npm run harness:check`
- `npm run test:scripts`
- `npm run lint:docs`
- `npm run lint:bloat`
- `npm run lint -- scripts/check-harness.mjs scripts/check-harness-policy.test.mjs`
- `git diff --check`
- `npm run doctor`
- `npm run doctor:e2e`
- `node --test scripts/doctor.test.mjs`
- `npm run release:check-version -- v2.6.4`
- `npm run lint:external-ai`
- `npm run test:scripts`
- `npm run harness:check`
- `npm run lint:md`
- `npm run lint:docs`
- `npm run lint:bloat`
- `npm run build`
- `npx --yes github-actionlint@1.7.12` against the updated workflow files.
- `ruby -e 'require "yaml"; ARGV.each { |path| YAML.load_file(path) }'`
  against the updated workflow files.
- `git diff --check`

The latest cleanup slices were verified with:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run test:run`
- `npm run lint:bloat`
- `npm run lint:tauri-invokes`
- `npm run lint:tests`
- `cd src-tauri && cargo fmt --all -- --check`
- `cd src-tauri && cargo clippy -- -D warnings`
- `cd src-tauri && cargo test --lib`
- `npm run test:e2e:smoke`
- `npm audit --audit-level=moderate`
- `cd src-tauri && cargo audit`
- `cd src-tauri && cargo deny check advisories`
- `npm run test:run -- src/components/AtsLiveScorePanel.test.tsx`
- `npm run test:run -- src/components/ErrorLogPanel.test.tsx`
- `npm run test:run -- src/components/BookmarkletGenerator.test.tsx`
- `npm run test:run -- src/components/DeepLinkGenerator.test.tsx`
- `npm run test:run -- src/pages/SetupWizard.test.tsx`
- `npm run test:scripts -- scripts/check-repo-bloat.test.mjs`
- `npm run lint:bloat`
- `npm run lint:docs`
- `npm run lint -- --max-warnings=0`
- `npm run build`
- `git diff --check`
- Focused WebKit E2E for job filtering and keyboard navigation.
- Focused Chromium E2E for job filtering and keyboard navigation.
- `npm run test:scripts`
- `npm run lint:bloat`
- `npm run lint:tests`
- `npm run lint:docs`
- `npx tsc --noEmit`
- `git diff --check`
- `npm run test:run -- src/components/BookmarkletGenerator.test.tsx src/components/JobImportModal.test.tsx`
- `npm run test:run -- src/pages/Resume.test.tsx`
- `npm run lint:tauri-invokes`
- `npm run lint:security`
- `npm run lint:architecture`
- `npm run test:e2e:smoke:budget`

For later handoff or active-plan refreshes, rerun docs and bloat checks before
committing.

## Known Remaining Work

Keep the objective broad. Do not collapse it to already-landed slices.

Next high-value passes:

1. Keep root and nested junk scans current after each later slice.
   - Latest scan removed local `.DS_Store` artifacts and found no remaining
     tracked or untracked disposable artifacts.
   - Repeat before final completion or after any build/test command that may
     create local artifacts.
2. Run a final stale-docs and reference sweep.
   - Compare README, `docs/README.md`, harness docs, developer docs, security
     docs, feature docs, and source comments against live commands and APIs.
   - Update docs or add bloat sensors for every recurring drift class.
3. Continue backend and scraper edge review.
   - Recheck command error wrappers for path, URL, query, secret, cookie, and
     provider-body leaks.
   - Recheck scraper request caps, retry handling, rate limits, and health
     result shapes.
   - The concrete findings from the latest read-only security audit are closed
     locally; continue looking for new issues as later slices touch trust
     boundaries.
   - Keep no-bypass and local-first product rules intact.
4. Continue frontend boundary review.
   - Recheck stored JSON parsing, URL validation, error rendering, direct
     browser-open paths, logging, and malformed input handling.
   - Prefer focused Vitest and E2E coverage for each concrete defect.
5. Continue zero-technical-skill UX review.
   - Recheck setup, settings, feedback, recovery, empty states, and error
     screens for plain-language actions and no terminal/developer assumptions.
   - Keep safe support report generation one click from Settings, Error
     Logs, and crash/error recovery surfaces.
   - The latest support-path, privacy-copy, USAJobs setup, and Telegram setup
     findings are closed locally. Continue looking for new issues as new
     surfaces change.
6. Continue broad-audience UX review.
   - Recheck onboarding, examples, placeholders, filters, profile presets, docs,
     and empty states for engineer-only assumptions.
   - Make sure technical and non-technical job searches both feel first-class.
   - The latest tech-source heuristic finding is closed locally. Keep looking
     for source recommendations, defaults, and profile examples that still
     assume software roles.
7. Keep harness evidence current.
   - Use the updated change-contract and plan templates for broad follow-up
     work.
   - Promote any repeated ease, privacy, or flaky-test failure into a guide or
     sensor instead of leaving it in chat.
   - Prioritize the remaining top harness debt: sensor modularity, evidence
     ledger, harness architecture map, optional external harness adapter, and
     scheduled/manual reference health checks.
8. Continue protective job-search UX review.
   - Make ghost/stale detection central on job cards and saved jobs.
   - Make salary floor, pay transparency, salary-history guardrails, and
     under-leveling checks part of pay support.
   - Add pacing, weekly summaries, fresh-role filters, reactivation strategy,
     and gap-framing support for long-term unemployment.
   - Prefer verified company routes, referrals, recruiter contact, and
     hiring-manager signals over opaque cold-apply paths where evidence exists.
   - Keep product copy factual and protective, not generic encouragement.
9. Decide final E2E scope.
   - Use focused E2E while fixing narrow browser-flow issues.
   - Run `npm run test:e2e:all` before claiming broad cross-browser completion,
     or document why it is deferred with exact risk.
10. Run final broad verification before goal completion.
    - Docs, bloat, test-quality, security, architecture, frontend tests, build,
      Rust formatting, Rust clippy, Rust tests, and chosen E2E scope all need
      current evidence.

## Completion Bar

Completion is not a vibes call. Before marking the goal complete, produce
current evidence for each requirement:

- Repo bloat and junk inventoried, removed, moved, merged, or explicitly kept.
- Docs accurately describe current behavior, commands, security posture,
  release state, and architecture.
- No known stale docs, duplicate sources of truth, tracked disposable artifacts,
  or generated outputs remain.
- No known privacy leaks through logs, renderer responses, command errors,
  scraper errors, notifications, credential paths, stored reports, or local path
  exposure remain.
- No known frontend/runtime issue found during the sweep remains unfixed.
- No known backend/Rust issue found during the sweep remains unfixed.
- No known user-facing path assumes technical knowledge for setup, recovery,
  troubleshooting, or GitHub issue reporting.
- No known user-facing path assumes the job seeker is an engineer or searching
  only for technical work.
- Relevant mechanical sensors cover recurring drift classes.
- Final verification commands pass from the current checkout.

If any evidence is stale, narrow, indirect, or missing, keep the goal open.

## Suggested Next Command Set

Start with cheap current-state checks:

```bash
npm run lint:bloat
npm run lint:docs
npm run lint:tests
npm run lint:security
npm run lint:architecture
npm run test:scripts
git status --short --branch
git diff --check
```

Then pick the next concrete sweep target from the known remaining work list.
