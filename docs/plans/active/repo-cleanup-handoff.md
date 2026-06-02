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

- `f3ed5fb9 Tighten protective user copy`
- `22b96bf5 Tighten Rule 0 support copy`
- `c08a56d9 Rename market view to Hiring Trends`
- `1ddab044 Disclose location lookup provider use`
- `08c8a106 Clarify problem history clear action`
- `bac8de85 Keep Quick Start nontechnical`
- `bc43a35b Tighten protective support copy`

Recent remote integration evidence:

- Current local outcome-label copy follow-up changes optional source-contact
  result labels from failure-first words to `Needs attention` and
  `Took too long`, and changes reusable async-button example/test guidance from
  `Failed to...` to `Could not...`. Focused verification passed: `npx vitest
  run src/components/AsyncButton.test.tsx src/pages/Settings.test.tsx` passed
  66 tests, `node --test scripts/check-product-copy.test.mjs` passed 32 tests,
  `npm run lint:bloat`, `npm run test:scripts` passed 455 script tests,
  `npm run lint`, and `git diff --check`.
- Current local shared recovery details follow-up changes optional dev toast,
  component boundary, modal boundary, and certificate-error wording away from
  support-detail, generic-error, and issue labels toward app-problem and problem
  wording. Focused verification passed: `npx vitest run src/utils/api.test.ts
  src/utils/errorMessages.test.ts src/components/ComponentErrorBoundary.test.tsx
  src/components/ModalErrorBoundary.test.tsx` passed 94 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, `node --test
  scripts/check-privacy-logging.test.mjs` passed 42 tests, `npm run
  lint:bloat`, `npm run test:scripts` passed 455 script tests, `npm run lint`,
  and `git diff --check`.
- Current local frontend sidecar copy follow-up changes optional feedback
  sharing from GitHub-help and issue-step wording to online-help and help-form
  wording, expands HN source labels to startup and tech job posts, changes
  source-status history from issue wording to problem wording, changes resume
  recovery handoff copy to plain sidebar guidance, and changes visible support
  detail labels to app problem details. Focused verification passed: `npx
  vitest run src/components/feedback/SubmitOptions.test.tsx
  src/components/feedback/SuccessScreen.test.tsx src/pages/Settings.test.tsx
  src/pages/SetupWizard.test.tsx
  src/components/ScraperHealthDashboard.test.tsx
  src/pages/ResumeOptimizer.test.tsx
  src/components/BookmarkletGenerator.test.tsx
  src/components/ErrorBoundary.test.tsx
  src/components/PageErrorBoundary.test.tsx
  src/components/ModalErrorBoundary.test.tsx
  src/components/ComponentErrorBoundary.test.tsx` passed 214 tests,
  `node --test scripts/check-product-copy.test.mjs` passed 32 tests,
  `npm run test:scripts` passed 455 script tests, `npm run lint:bloat`,
  `npm run lint`, and `git diff --check`.
- Current local settings/support copy follow-up changes manual email setup
  labels, USAJobs jobs-to-check wording, connected-source review labels, and
  the detailed local support-report action. Focused verification passed:
  `npx vitest run src/pages/Settings.test.tsx
  src/components/ErrorLogPanel.test.tsx`, `node --test
  scripts/check-product-copy.test.mjs`, `npm run lint:bloat`,
  `npm run harness:check`, `npm run lint:docs`, `npm run test:scripts`,
  `npm run lint`, and `git diff --check`.
- Latest local broad-audience and Rule 0 follow-up applies read-only
  sub-agent findings across support-report privacy wording, visible
  resume/settings/export/outside-AI copy, README and source-doc approved
  job-source feed wording, wrapper Rule 0 snippets, feature privacy-label
  freshness, and active status compaction. Verification passed:
  `npm run harness:check`, `npm run test:scripts`, `npm run lint:docs`,
  `npm run lint:bloat`, `npm run lint`, focused Vitest for eight affected
  frontend/service test files, and `git diff --check`.
- Latest local frontend verification evidence: `npm run test:run` passes 110
  Vitest files and 2637 tests, `npm run build` passes in 4.13 seconds, and
  `npm run test:scripts` passes 454 script tests. The latest local follow-up
  syncs `ErrorLogPanel` unit tests with the current `Save Detailed Local
  Report` action label.
- Latest local backend verification evidence: `cargo fmt --all -- --check`
  passes, `cargo test --lib` passes 2489 tests with 21 ignored, and
  `cargo clippy -- -D warnings` reports no issues from `src-tauri`.
- Latest local security/dependency verification evidence: `npm run
  lint:security`, `npm run lint:architecture`, `npm run lint:external-ai`,
  `npm run lint:tauri-invokes`, `npm audit --audit-level=moderate`, and
  `cargo deny check advisories` pass. `cargo audit` exits 0 with the known 19
  allowed upstream/transitive Rust advisory warnings tracked in `SEC-002`.
- `f3ed5fb9` passed Docs Harness run `26790585973` and CI run
  `26790585989` on `main`. CI covered frontend tests, Rust tests, security
  checks, docs harness checks, TypeScript, ESLint, frontend build, Rust fmt,
  Rust clippy, npm audit, cargo-deny advisories, and maintained
  harness/script checks. Use `npm run harness:session` and
  `gh run list --branch main` for the live branch head after later
  continuation slices.
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
  smoke tests in 6.22 seconds against a 30-second budget. The latest local
  follow-up also syncs Settings, Hiring Trends, and Application Assist
  Playwright selectors and report names with current plain-language UI labels.
  Latest local full-suite budget evidence: 252 Chromium and WebKit tests in
  123.15 seconds against a tightened 240-second budget.
- The latest pushed Rule 0 review slice updates `.github/PULL_REQUEST_TEMPLATE.md`
  with privacy/security, local-first, external AI gateway, payload preview,
  responsible-use, safe support report, broad-audience, and
  zero-technical-knowledge checks. Manifest snippets now make
  `npm run harness:check` fail when those PR review requirements drift.
- The latest pushed zero-technical copy slice changes visible market-analysis
  labels to Hiring Trends language and updates component plus
  smoke E2E expectations.
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

- Current local outcome-label copy follow-up changes optional source-contact
  result labels and reusable async-button guidance away from failure-first
  wording. Focused AsyncButton, Settings, product-copy, script, bloat, lint, and
  diff-check verification cover the changed surfaces.
- Current local shared recovery details follow-up changes optional dev toast,
  component boundary, modal boundary, and certificate-error wording away from
  support-detail, generic-error, and issue labels. Focused utility/component,
  product-copy, privacy-logging, script, bloat, lint, and diff-check
  verification cover the changed surfaces.
- Current local frontend sidecar copy follow-up changes feedback sharing,
  success-step, Settings source, setup source, source-status table,
  Resume Builder/Optimizer recovery, Browser Button, and error-boundary detail
  labels away from GitHub-first, issue-first, HN-abbreviation, support-only, and
  technical recovery wording. Focused UI, product-copy, script, bloat, lint, and
  diff-check verification cover the changed surfaces.
- Current local settings/support copy follow-up changes manual email setup
  labels, jobs-to-check wording, connected-source review labels, and detailed
  local support-report action copy, with focused Settings, ErrorLogPanel, and
  product-copy coverage.
- Current local feedback/recovery tooltip follow-up changes the detailed local
  report tooltip and Browser Button docs from support-only wording to
  help-requested-use wording, with focused ErrorLogPanel, product-copy, and
  bloat coverage.
- Current local detailed-report privacy follow-up makes frontend error-report
  JSON export re-sanitize stored records, adds regression coverage for private
  job-search details in detailed local report output, and adds a privacy sensor
  against raw `errors: this.errors` export drift.
- Current local feedback-flow copy follow-up changes optional GitHub sharing
  from maintainer/issue wording to online-help wording, keeps the no-account
  safe support report path primary, and adds product-copy coverage against the
  old support-option phrases.
- Current local support-report label follow-up changes generated support-report
  section labels from support-only wording to safe app details and adds a
  product-copy guard against those labels returning.
- Current local detailed-report tooltip follow-up changes the detailed local
  report tooltip from maintainer wording to plain help wording and adds
  product-copy coverage against the old tooltip.
- Current local user-help docs follow-up changes broken-link and invalid
  saved-detail recovery docs away from maintainer/GitHub assumptions, keeps
  the in-app safe support report path primary, and adds product-copy coverage
  against the old phrases.
- Current local README/settings help-copy follow-up changes front-door support
  copy away from maintainer GitHub assumptions and replaces the visible
  Settings `Troubleshooting` heading with `Help and Status`. Product-copy
  coverage rejects the old phrases.
- Current local docs sidecar copy follow-up applies read-only agent findings
  across README download/data-boundary wording, Quick Start install and
  local-file wording, Deep Links contributor/browser-add-on wording, Browser
  Button privacy wording, notification and credential docs, public issue
  templates, SECURITY, and CODE_OF_CONDUCT. Product-copy coverage rejects the
  old phrases.
- Current local connected-source wording follow-up changes the Settings contact
  history label from `Source host` to `Website contacted`, with focused
  Settings and product-copy coverage against raw source metadata labels
  returning to visible copy.
- Current local dashboard recovery follow-up changes the summary-widget failure
  message from bare load-failure copy to support-report recovery wording, with
  focused DashboardWidgets and product-copy coverage.
- Current local dashboard wording follow-up changes visible and accessible
  analytics labels to `Application Summary` and `Application summary charts`,
  with product-copy coverage against the old wording.
- Current local dashboard section-label follow-up changes remaining chart labels
  to `Weekly Applications`, `Where Jobs Came From`, `Pay Ranges Found`, and
  `At a Glance`, with product-copy coverage against the old wording.
- Current local application-summary modal follow-up changes the Applications
  button and modal labels away from analytics and response-time wording toward
  application-summary, status, reply, and employer reply wording.
- Current local Browser Button follow-up changes help-only settings from
  `Support number` to `Browser helper number` with support-reply guidance.
- Current local Resume Match follow-up changes strong/power resume words to
  action words for clarity, with product-copy coverage against old labels.
- Current local USAJobs settings follow-up changes visible `keywords`,
  posted-within, and max-results wording to search words, recent jobs, and
  jobs-to-check copy, with product-copy coverage against old phrasing.
- Current local notification-rules follow-up changes the alert-preferences panel
  from settings/control jargon to plain job-alert choices: `All job alerts`,
  job boards that are `turned on`, `Extra alert rules`, job-title word rules,
  remote-job choice, and company-alert labels. NotificationPreferences and
  product-copy coverage guard the stale copy.
- Current local keyboard-help follow-up changes shortcut and quick-action labels
  from power-user wording to plain app action language: `Keyboard Help`,
  `Moving around`, `App-wide`, `Search and refresh`, save/unsave job,
  select/unselect job, `Open Hiring Trends`, and save-form-change wording.
  Component/context and product-copy coverage guard the old terms.
- Current local recovery-copy follow-up changes shared error messages away from
  source-disabled, website-format, request-limit, More Settings, notification
  settings, and system-date wording toward source-turned-off,
  job-website-changed, check-limit, alert-channel, alert-settings, and
  computer-date wording. Error-message and product-copy coverage guard the stale
  terms.
- Current local Resume Readability follow-up changes score-adjacent labels from
  complete/completeness, missing/issues, view-details, and full-review wording to
  details, details included, to-review, details-to-check, review-details, and
  readable review wording. AtsLiveScorePanel and product-copy coverage guard the
  old labels.
- Current local settings-tab follow-up changes the Settings tabs from Basic
  Settings and More Settings to Search Preferences and Sources & Alerts.
  Dashboard no-source guidance, Quick Start notification setup, notification
  docs, smart-scoring docs, Settings tests, Dashboard tests, and product-copy
  coverage guard the old labels and old setup path.
- Current local ResumeOptimizer follow-up changes the resume-match score label
  from Completeness to Details included. ResumeOptimizer and product-copy
  coverage guard the old label.
- Current local notifications-doc follow-up changes visible setup wording from
  advanced/webhook/native-OS phrasing to connection-link, optional phone-chat,
  desktop-alert, and manual email reference language. Product-copy coverage
  guards the old phrases.
- Current local resume/scoring docs follow-up changes Readability Score,
  Completeness, and advanced scoring configuration wording to readable-format,
  details-included, and extra-match-settings language. Product-copy coverage
  guards the old phrases.
- Current local ghost-detection docs follow-up replaces low-trust-listing and
  stale Ghost Detection Settings path wording with listing-needs-review and
  `Settings > Sources & Alerts > Posting Risk and Freshness` language.
- Current local Deep Links docs follow-up replaces "does not monitor directly"
  opening wording with browser-opened search-link language. Product-copy coverage
  guards the old phrase.
- Current local Hiring Trends follow-up replaces monitored-posting,
  skill-demand, source-bias, job-board-bias, chart-title, and support-log wording
  with plain job-pool, check-several-sources, and hiring trend language.
  Product-copy coverage guards the old phrases.
- Current local source-contact docs follow-up replaces lowercase source-host
  metadata wording with website-contacted, count-only request-category, and
  outcome language. Product-copy coverage guards the old labels.
- Current local support-preview privacy follow-up replaces absolute
  removes-private-details wording with common-private-details and
  review-before-sharing language. DebugInfoPreview and product-copy coverage
  guard the old claim.
- Current local Pay Protection follow-up replaces remaining career-jargon visible
  wording in Salary UI and feature docs with too-low-title-or-pay-level language.
  Salary and product-copy coverage guard the old term.
- Current local outside-AI gateway follow-up replaces provider/payload/sensitive
  guardrail jargon with review-first outside-AI, public-job-details, and
  private-details-stay-local language. Gateway and product-copy coverage guard
  the old wording.
- Current local email-alert setup follow-up replaces provider-address/provider-number
  wording with manual-email-setup and email-service labels.
  Settings and product-copy coverage guard the old labels.
- Current local USAJobs setup follow-up replaces old shortcut phrasing with
  scheduled-check and on-your-schedule wording. Settings and product-copy coverage
  guard the old phrases.
- Current local README/source-doc follow-up expands network disclosure for
  enabled job-source checks, approved job-source feeds, user-configured
  channels, support links, location detection, and approved external AI
  payloads. It also replaces source-adapter, HTTP-client, background-monitoring,
  and duplicate handling jargon in front-door source docs.
- Current local hiring-system wording follow-up changes README, ROADMAP,
  RESPONSIBLE_AI, and the README information-design harness from ATS-first
  labels to hiring-system and hiring-platform language while preserving research
  links.
- Current local Resume Matcher docs follow-up replaces ATS-internals,
  ATS-manipulation, and active research no-goal wording with
  employer-screening-system language and product-copy coverage.
- Current local notification docs follow-up replaces old email-provider-details,
  Slack app-from-scratch, secure-credential-manager, and provider-guidance
  wording with manual-email-setup, connection-link, password-store, and
  email-service language. Troubleshooting copy now uses turned-on, check, and
  permission wording instead of enabled/verify/admin/manual-provider wording,
  with product-copy coverage.
- Current local app-tracking/source-doc follow-up replaces old mail-protocol
  privacy-label wording with email-alert language and source-doc setup,
  diagnostics, and metadata wording with user-turned-on source,
  troubleshooting, and safe-status-detail language. It also replaces old
  source setup and credential wording with user-approved source
  addresses, saved access details, and turned-on access-code language.
- Current local agent-aided copy audit replaces technical setup and policy
  wording in Settings, support-history export, notification docs, credentials
  security docs, privacy/AI policy docs, market docs, user-data docs,
  application-tracking docs, and resume-matcher docs with turned-on,
  connection-link, password-store, request-detail, and local-troubleshooting
  language. Harness/PR checklist snippets now use request-review wording.
  Product-copy tests guard the old phrases.
- Current local saved-answer recovery follow-up changes Application Assist
  suggested-answer failures from a bare saved-answers message to support-report
  recovery wording, with focused component and product-copy coverage.
- Current local application-profile loading follow-up replaces vague slow-load
  copy with `Still opening your application profile...`, with ProfileForm and
  product-copy coverage against the old phrase.
- Current local general recovery wording follow-up changes app and page
  error-boundary copy and buttons from reload wording to `Reset App Window` and
  `Clear Temporary App Data` language, with ErrorBoundary tests and product-copy
  coverage against the old wording.
- Current local safe-support-report wording follow-up changes support-preview
  overflow text from `more events` to `more app actions`, maps event detail
  labels to `App action`, and changes generated report overflow wording from
  frontend-error language to plain app-problem language.
- Current local settings-backup filename follow-up changes downloaded backup
  names from `jobsentinel-config-*` to `jobsentinel-settings-backup-*`,
  updates export utility tests, and adds product-copy coverage against config
  jargon returning through visible backup filenames.
- Current local zero-technical support/protective-copy follow-up updates public
  issue templates, safe support report docs, source status, search-link sign-in
  labels, saved-search filter summaries, match-score influence labels,
  ghost-risk tooltip copy, resume bullet drafting, resume gap guidance, pay
  offer advice, negotiation templates, broad HR/customer-success profile
  defaults, and application-form error copy. Focused frontend, script, and
  Rust tests cover the changed surfaces.
- Current local Rule 0 ease follow-up tightens public and support-report
  privacy boundaries: setup asks for the work the user wants, install docs
  require latest-download verification before OS override steps, issue
  templates warn users away from personal details, safe support reports copy
  the user's sanitized description, frontend and Rust sanitizers redact phone
  numbers plus known person-name fields, error boundaries avoid absolute safety
  claims, Settings marks backups private, and Hiring Trends alerts use the new
  product language. Product-copy sensors cover these drift classes.
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
  a no-setup browser-search path before optional scheduled checks, keeps
  Telegram bot details behind an optional chat-alert path, and adds
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
- Current local Resume Readability follow-up changes the Resume Builder panel
  from analysis/context jargon to plain checking, saved-job, view-details,
  details-to-check, how-to-fix, and why-it-helps copy. Raw severity labels are
  mapped before display, notification setup errors say saved alert channel
  instead of configured channel, and product-copy sensors now reject the old
  phrases.
- Current local Resume Match detail follow-up mirrors that cleanup on the
  review page: format issues are now details to check, raw issue severity is
  mapped before display, fix and impact labels became how-to-fix and
  why-it-helps copy, and the Resume Builder handoff toast no longer says job
  context.
- Current local generic-error copy follow-up replaces technical fallback labels
  for related-data, email, permission, resume-read, and long-document failures
  with plain recovery copy. Unit and product-copy tests reject the old wording.
- Current local Job Source Status follow-up makes the remaining source-panel
  table and dialog labels plainer: `Kind`, `Recent Status`, `Time Needed`,
  `Last Checked`, and `Check Results` replace the older source-type,
  recent-success, and check-metric wording. The latest refinement changes raw
  recent success percentages into plain labels such as `Mostly working`,
  `Some trouble`, and `Needs attention`, with matching feature docs and
  product-copy coverage against stale metric-first display code.
- Current local pay-language follow-up changes README, roadmap, pay-equity
  research, Hiring Trends, Resume Match, and README information-design docs away
  from optimization and under-leveling jargon toward lower-title, lower-pay, and
  below-floor risk language. Product-copy coverage now rejects those stale
  front-door phrases.
- Current local external-channel accuracy follow-up separates configured alert
  channels from user-opened GitHub/Google Drive support links in README and
  PRIVACY.md, with product-copy coverage against treating those support links as
  external alerts.
- Current local connected-source privacy follow-up adds a visible Settings
  reminder after optional source approval and a local minimized contact-history
  summary: approval covers only the displayed exact details, changed details
  keep the source off until the user approves again, and the latest approved
  source contact shows host/count/outcome metadata only.
- Current local search-link docs follow-up changes Deep Links and ghost-detection
  docs away from advanced/monitored-source wording toward job-source and
  more-control language, with product-copy coverage against the old phrases.
- Current local Settings copy follow-up changes the posting-risk save toast
  from scan wording to job-check wording and renames the Telegram badge from
  advanced chat alert to optional chat alert. Settings tests and product-copy
  sensors cover the old phrases.
- Current local Application Assist recovery-copy follow-up changes visible
  form-preparation failure copy to `Could not prepare details`. ApplyButton
  tests and product-copy sensors cover the old preparation-error labels.
- Current local Dashboard source-check copy follow-up changes remaining manual
  and scheduled job-check labels away from scan wording to `Checking job
  sources`, `Checking for new jobs`, and `Job check complete`. DashboardHeader
  tests and product-copy sensors cover the old scanning labels.
- Current local Application Assist profile recovery-copy follow-up changes
  profile load, resume selection, validation, save, and saved-answer loading
  failures away from `Failed to...` and `Please fix the errors` labels.
  Focused component tests and product-copy sensors cover the old phrasing.
- Current local job-link recovery-copy follow-up changes remaining
  `Failed to open link` / `Unable to open the job link` toasts in job-card and
  Dashboard keyboard-open paths to plain browser-copy recovery guidance.
  JobCard tests and product-copy sensors cover the old phrasing.
- Current local dashboard-adjacent load-error follow-up changes visible Market,
  Cover Letter Templates, Analytics, and Dashboard Widgets error panels away
  from `Failed to Load...` / `Failed to load analytics data` wording to plain
  `Could not load...` wording. It also changes cover-letter copy failures to
  `Could not copy template`. Focused component tests and product-copy sensors
  cover the old phrasing.
- Current local recovery-title follow-up changes remaining visible
  `Failed to...` fallback titles in Resume, Resume Builder, Screening Answers,
  Interview Scheduler, and company-research fallback UI to `Could not...`
  wording. Related component tests and product-copy sensors cover the old
  phrasing.
- Current local action-recovery follow-up changes undo/redo, bookmark,
  bulk-hide, duplicate-merge, resume export, application-status,
  application-list, and section recovery paths away from visible failure labels
  to `Could not...` wording. Focused hook/component tests and product-copy
  sensors cover the old labels.
- Current local generic-recovery follow-up changes job-search, settings
  save/test, notification, reminder, modal recovery, feedback-details, and API
  fallback titles away from visible failure labels to `Could not...` wording.
  Focused page/component/utility tests and product-copy sensors cover the old
  labels.
- Current local generic error fallback follow-up changes shared fallback copy
  away from `Something went wrong` and `An unexpected error occurred` toward
  `JobSentinel needs attention` / `JobSentinel ran into a problem` wording in
  user-facing recovery surfaces, Rust command error titles, and external AI
  setup errors. Product-copy sensors cover the old generic labels.
- Current local shared error-helper follow-up changes older helper messages
  away from `Invalid input`, `Data format error`, requested-resource wording,
  and permission jargon toward plain review, unreadable-data, missing-item, and
  sign-in/access guidance. Product-copy sensors cover the stale helper labels.
- Current local Rust source-error follow-up changes scraper and Prepare Form
  `user_message()` copy away from parse, CAPTCHA, request-timeout, browser
  launch, raw selector, resume-reason, and automation wording toward plain job
  source, human-check, page-load, browser, form-field, and review guidance.
- Current local zero-technical sidecar follow-up closes read-only UX audit
  findings in link validation, Quick Start install routing, support-detail
  export copy, maintainer feedback copy, empty job-list pay wording, job-card
  pay warning copy, and alert connection-link validation.
- Current local Application Assist security follow-up validates recognized
  application-form targets before profile or saved screening-answer data is
  loaded, keeps unknown-platform generic selectors disabled, and returns
  screenshot presence flags instead of raw local screenshot paths over IPC.
  IPC-minimization sensors cover both target-validation order and screenshot
  path exposure.
- Current local source-address privacy follow-up documents the
  default-off JobsWithGPT endpoint boundary in privacy docs, scraper docs,
  feature privacy labels, and config comments. If enabled, it receives only
  saved job titles, location, remote preference, and result limit, not resumes,
  salary floors, private notes, application history, screening answers, or
  profile details.
- Current local interview-outcome follow-up keeps the persisted `failed`
  interview outcome value while changing visible outcome buttons and chips to
  plain, non-shaming labels such as `Did not go well`. Focused component tests
  and product-copy sensors cover the old labels.
- Current local skill-label follow-up replaces vague self-rating labels such as
  beginner, intermediate, advanced, expert, and seniority level with
  behavior-based skill strength and role-stage copy across Resume, Resume
  Builder, Pay Protection, docs, and product-copy sensors.
- Current local Application Assist readiness follow-up keeps Prepare Form
  available for users with a saved profile even while optional
  application-form detection is still loading, preventing a slow recognition
  check from blocking the review path. The same slice now shares plain
  application-form display labels across job-card badges and the review modal
  so raw platform IDs do not appear in the preview, and Application Assist docs
  now use human-check wording instead of CAPTCHA-first troubleshooting copy.
  Deep Links user docs now use matching human-check and site-limits language
  instead of CAPTCHA/anti-bot phrasing. Ghost-detection docs now use employer
  and application-platform source language instead of user-visible ATS-source
  phrasing. Source health and source adapter docs now use employer,
  application-platform, human-check, and source-boundary language instead of
  user-facing ATS, CAPTCHA-solving/control-evasion, anti-bot, endpoint, and
  selector phrasing.
- Current local notification privacy follow-up keeps OS-level desktop
  notification payloads generic so job titles, company names, match scores,
  salary notes, and reminder text stay inside JobSentinel. The unused generic
  desktop notification passthrough helper is removed and privacy-logging
  coverage blocks raw title/body notification payloads.
- Current local frontend error-report privacy follow-up expands renderer-side
  report sanitization beyond credentials and URLs. Salary floors, resume text,
  private notes, application history, screening questions and answers, location
  preferences, career goals, personal circumstances, and labeled sensitive text
  now redact before local persistence, dev console forwarding, and exported
  safe support reports; privacy-logging coverage rejects drift.
- Current local support-report wording follow-up removes
  `configured`/`not configured` setup jargon from the safe app details preview
  and generated support report. Support reports now use plain setup states and
  explicitly name job-search sensitive categories removed before sharing, with
  product-copy harness coverage for the wording boundary.
- Current local sidecar audit follow-up updates Quick Start, Deep Links, Job
  Sources, and Job Source Status docs to avoid remaining technical-first or
  scary phrases such as Assets section, low-trust postings, session cookies,
  background-check wording, rate-limit jargon, source-adapter labels, hidden
  internal-address wording, raw format lists, and hashing internals. Product-copy
  harness coverage now blocks those audited doc phrases from returning.
- Current local UI copy follow-up updates Browser Button setup, Job Site Search
  Links, and Job Source Status wording from the sidecar audit. The old advanced
  connection, local safety code, if-this-feels-hard, block-page-import,
  monitor-directly, official-feed, retry-count, Access, Source Controls, and
  Source Check Results phrases are removed and covered by focused tests plus
  product-copy sensors.
- Current local Settings copy follow-up updates notification, email, LinkedIn,
  USAJobs, optional-source, posting-risk, and resume-sorting copy found by the
  sidecar audit. Focused Settings tests and product-copy sensors now reject the
  old native-OS, focused-app, SMTP, automatic-monitoring, HN abbreviation,
  source-blocking, Browser Integration, low-trust, risk-threshold, and
  resume-score-formula wording.
- Current local privacy follow-up removes raw screening-question text and saved
  answer patterns from Application Assist debug logs. Form-fill traces and
  screening-answer command logs now record only counts, IDs, and booleans when a
  saved answer matches or answer history changes, and privacy-logging coverage
  rejects the old raw trace shape.
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
  small 609-line orchestrator after the latest source-boundary guard.
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
  JobSentinel does not get around controls when a board blocks page import.
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
  replaced the old advanced tab with clearer settings-task labels, changed source-health
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
  tests, so sensor changes no longer skip the docs workflow path filter.
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

- Backend safe-support-report sanitization now redacts labeled sensitive
  job-search context such as salary floors, resume excerpts, private notes,
  application history, screening answers, location preferences, career goals,
  and personal circumstances before feedback reports are returned or saved.
- Another zero-technical UX slice removed setup jargon and raw internal values
  from Application Preview, Error Log support fallback, browser import docs,
  notification salary filters, Application Assist profile settings,
  screening-answer type labels, Dashboard empty states, reminder labels,
  rate-limit errors, and auto-refresh warnings.
- Build verification also caught nullable application-form style lookups and a
  missing Market Snapshot fallback; both are now type-safe.
- A follow-up broad-audience copy pass replaced the stale "Require manual
  approval" Application Assist doc/E2E wording, Dashboard scan status text,
  Settings auto-scan and configured-company copy, generic Success/Error async
  toast titles, Application Assist history failure copy, and score-explanation
  configured-preference wording.
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
- Pay Protection range labels and salary-floor guidance now explain lower,
  middle, higher, and highest-seen sample evidence without requiring users to
  understand percentile shorthand.
- Company Research unknown-company copy now says JobSentinel has no local
  details yet instead of implying background gathering, and slow/error states
  avoid request-timeout language.
- Market Snapshot now describes hiring outlook as more active, slower, or
  steady instead of showing bullish, bearish, or neutral sentiment jargon.
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
  closing the raw insert path for unsafe URLs and oversize job fields.
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

Latest active-status drift harness slice checks on 2026-06-02:

- `node --check scripts/harness/checks/docs-drift.mjs`
- `node --test scripts/check-docs-drift.test.mjs`
- `npm run test:scripts`
- `npm run lint:bloat`
- `npm run harness:session -- --json`
- `npm run lint:docs`
- `npm run harness:check`
- `git diff --check`

Latest zero-technical Job Import slice checks on 2026-06-02:

- `npm run test:run -- src/components/JobImportModal.test.tsx`
- `node --test scripts/check-product-copy.test.mjs`
- `npm run lint:bloat`
- `npm run lint`
- `npm run lint:docs`
- `git diff --check`

Latest safe-support-report wording slice checks on 2026-06-02:

- `node --test scripts/check-product-copy.test.mjs`
- focused support-report frontend tests
- `cargo test --manifest-path src-tauri/Cargo.toml commands::feedback::tests::test_feedback_reveal_error_uses_support_report_wording`
- `npm run lint:bloat`
- `npm run lint:docs`
- `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check`
- `git diff --check`

Latest resume-readability add-word wording slice checks on 2026-06-02:

- `node --test scripts/check-product-copy.test.mjs`
- `npm run test:run -- src/pages/ResumeOptimizer.test.tsx src/components/AtsLiveScorePanel.test.tsx`
- `npm run lint:bloat`
- `npm run lint`
- `npm run lint:docs`
- `git diff --check`

Latest sub-agent UX/copy audit slice checks on 2026-06-02:

- `node --test scripts/check-product-copy.test.mjs`
- focused setup/settings/salary/resume/ghost/score frontend tests
- `npm run lint:bloat`
- `npm run lint`
- `npm run lint:docs`
- `git diff --check`

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
   - The latest read-only security audit's Application Assist redirect/origin
     and external alert-reason findings are closed locally. JobsWithGPT
     exact-payload approval, visible approval-scope reminder, and local
     minimized source-request history are landed locally; `SEC-019` is closed
     in the debt tracker.
   - Keep no-control-workaround and local-first product rules intact.
4. Continue frontend boundary review.
   - Recheck stored JSON parsing, URL validation, error rendering, direct
     browser-open paths, logging, and malformed input handling.
   - Prefer focused Vitest and E2E coverage for each concrete defect.
5. Continue zero-technical-skill UX review.
   - Recheck setup, settings, feedback, recovery, empty states, and error
     screens for plain-language actions and no terminal/developer assumptions.
   - Keep safe support report generation one click from Settings, Error
     Logs, and crash/error recovery surfaces.
   - The latest support-path, privacy-copy, USAJobs setup, Telegram setup,
     dashboard average-match label, Application Assist stat-label, and resume
     overall-match findings are closed locally. The latest recovery-label slice
     also replaces visible retry/dismiss buttons in Settings and Resume
     Readability with plain `Try Again` and `Close Message` actions. The latest
     backend-copy slice changes database-domain user messages toward
     local-job-data wording. The latest support-panel slice keeps Error Log
     actions in safe support report language and makes per-problem removal
     clearer. The latest interview-scheduling slice changes missing-field,
     past-date, and invalid-duration validation to action-first guidance, and
     the follow-up interview-form slice replaces asterisk/slash labels with
     plain required-field and meeting-location wording. The latest shortcut
     label slice changes static navigation/help shortcut copy from mac-only
     symbols to `Cmd/Ctrl` labels. The latest mouse-neutral copy slice removes
     click/drag-first guidance from onboarding, location detection, recovery,
     Application Assist, application tracking, cover-letter blanks, and browser
     import docs, with a follow-up stale-test fix for the Application Preview
     submit-yourself guidance. The latest resume-choice copy slice replaces the
     Application Profile generic resume-file picker label with `Choose Resume`.
     The latest saved-search validation slice changes empty-name copy to
     `Name this search` with action guidance. The latest Resume validation
     slice changes empty-skill copy to `Name the skill` with action guidance.
     The latest Resume Optimizer validation slice changes missing-job-post and
     empty-bullet guidance to action-first copy, and empty Draft now shows
     guidance instead of doing nothing. The latest Application Assist profile
     fallback slice changes remaining no-profile fallback wording to setup
     guidance with product-copy coverage. The latest shared validation-copy
     slice changes email, required-field, resume contact, and screening-answer
     messages to action-first guidance. The latest missing-input copy slice
     changes pay-check, job-import, and search-link empty-input messages to
     action-first guidance. The latest Resume Builder validation slice changes
     missing-step and skill-detail messages to action-first copy with focused
     helper coverage. The latest shared link/contact validation slice changes
     URL, phone, port, and multi-email messages to plain guidance and ignores
     stray email-list commas. The latest unsafe-job-link copy slice changes
     invalid saved-link warnings to plain protective guidance with JobCard
     coverage. The latest shared error-fallback slice changes missing-detail,
     date/time, and file-not-found fallback copy to action-first guidance.
     The latest Application Assist profile recovery slice replaces vague
     retry-only copy with safe-support-report next steps. Continue looking for
     new issues as new surfaces change.
     The latest saved-answer recovery slice also replaces the remaining
     retry-only saved-answer load fallback with safe-support-report guidance.
     The latest cover-letter clipboard recovery slice replaces retry-only
     copy-failure guidance with clipboard-permission guidance.
     The latest AnalyticsPanel recovery slice replaces retry-only summary load
     guidance with safe-support-report guidance.
     The latest dashboard bookmark recovery slice replaces retry-only
     bookmark-failure guidance with safe-support-report guidance.
     The latest notification preference recovery slice replaces retry-only
     alert-settings save guidance with safe-support-report guidance.
     The latest shared error-helper recovery slice replaces retry-only API,
     timeout, and unknown fallback guidance with safe-support-report guidance.
     The latest feedback-report save recovery slice replaces the remaining
     retry-oriented save-report wording with direct copy-report and
     choose-another-folder guidance.
     The latest undo/redo recovery slice replaces browser-refresh-style
     guidance in dashboard undo, global undo, and missing-page recovery flows
     with local check plus safe-support-report next steps.
     The latest restart-recovery slice makes app-reopen guidance
     support-report-first across saved applications, settings load, review
     history, bulk bookmark, user-data docs, and frontend/Rust local-data plus
     website-format errors.
     The latest Resume Builder restart-copy follow-up replaces the remaining
     restart-style builder startup/load fallbacks and browser-button setup note
     with safe-support-report-first or close/reopen guidance.
     The latest dashboard bulk-action recovery follow-up removes refresh-only
     and merge-only recovery guidance from selected-job hide and
     duplicate-merge all-failure paths.
     The latest shared helper persistent-recovery follow-up adds safe support
     report fallbacks to network, site, permission, reminder, notification,
     local storage, and optional analysis-service error actions.
     The latest Browser Button recovery follow-up replaces restart wording and
     clipboard-only retry guidance with close/reopen wording plus safe support
     report fallback across frontend and command-boundary copy.
     The latest modal repeated-failure recovery follow-up replaces
     close-and-try-later guidance with copy/save safe support report first.
     The latest page repeated-failure recovery follow-up replaces temporary
     unavailable warning copy with save-safe-support-report-first guidance.
     The latest bookmarklet URL privacy follow-up canonicalizes browser-button
     job links before duplicate hashing or storage; notification-channel URL
     minimization and feedback/share narrative redaction remain next.
     The latest notification URL privacy follow-up routes Slack, Discord,
     Teams, Telegram, and email job links through the shared outbound minimizer;
     feedback/share narrative redaction remains next.
     The latest feedback/share privacy follow-up uses the backend support-report
     sanitizer for saved reports, copied reports, and GitHub issue clipboard
     content, including unlabeled employer, role, and layoff/job-search narrative
     redaction.
     The latest broad-audience copy follow-up replaces jargon in Quick Start,
     resume import, privacy tables, match/posting-risk guidance, and
     source-health troubleshooting with plain job-seeker language.
   - Do not trust hardcoded checkpoint notes for remote status. Use
     `git status --short --branch`, `git log --oneline -3`, and `gh run list
     --branch main --limit 5` as live evidence before reporting CI state.
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
