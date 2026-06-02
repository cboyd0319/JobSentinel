# Active Plan Status

Last updated: 2026-06-02.

Read this file before opening long active plans. It is the compact restart
surface for the active goal; the detailed plans remain authoritative for scope,
requirements, and history.

## Goal State

The repo-wide goal remains open. JobSentinel should keep moving toward zero
known errors, privacy leaks, stale docs, brittle tests, user-facing technical
assumptions, engineer-only defaults, and unverified claims.

All tracked files under `docs/plans/active/` are part of the active goal until
the work is completed, superseded, or moved out of active plans.

The user has authorized multiple sub-agents for isolated audits, research, and
implementation slices that can be worked without shared-state conflicts. Keep
their scope bounded, preserve user changes, close completed agents promptly,
and record actionable findings in this active-plan surface.

## Workstreams

| Workstream | State | Current focus | Source |
| ---------- | ----- | ------------- | ------ |
| Repo cleanup and quality sweep | Open | Reliability, stale-doc cleanup, harness debt, privacy/security review, broad verification | [Plan](repo-cleanup-and-quality-sweep.md) |
| Repo cleanup handoff | Open | Operational restart notes and verification evidence | [Handoff](repo-cleanup-handoff.md) |
| Guided job-search intake | Active | Implemented setup slices stay accurate; future work expands guided questioning and search support | [Plan](guided-job-search-intake.md) |
| Research-backed product improvements | Active | Ghost/stale detection, pay protection, long-term unemployment support, bias-aware routes, protective tone, local-first privacy | [Plan](research-backed-product-improvements.md) |

## Current Posture

- Latest local settings-tab follow-up changes the Settings tabs from `Basic
  Settings` and `More Settings` to `Search Preferences` and `Sources & Alerts`.
  Dashboard no-source guidance, Quick Start notification setup, notification
  docs, smart-scoring docs, Settings tests, Dashboard tests, and product-copy
  sensors now guard the old labels and old user-doc path.
- Latest local ResumeOptimizer follow-up changes the resume-match score label
  from `Completeness` to `Details included`. ResumeOptimizer and product-copy
  tests guard the old label.
- Latest local notifications-doc follow-up changes visible setup wording from
  advanced/webhook/native-OS phrasing to connection-link, optional phone-chat,
  desktop-alert, and manual email reference language. Product-copy tests guard
  the old phrases.
- Latest local resume/scoring docs follow-up changes `Readability Score`,
  `Completeness`, and advanced scoring configuration wording to readable-format,
  details-included, and extra-match-settings language. Product-copy tests guard
  the old phrases.
- Latest local ghost-detection docs follow-up replaces low-trust-listing and
  stale Ghost Detection Settings path wording with listing-needs-review and
  `Settings > Sources & Alerts > Posting Risk and Freshness` language.
- Latest local resume-readability follow-up changes score-adjacent labels from
  `Complete`, `Completeness`, `missing`, `issues`, `View Details`, and `Full
  Resume Readability Review` to details, details-included, to-review,
  details-to-check, review-details, and resume-readability-review wording.
  AtsLiveScorePanel and product-copy tests guard the old labels.
- Latest local recovery-copy follow-up changes shared error messages from
  source-disabled, request-limit, website-format, old More Settings guidance,
  notification settings, and system-date wording to plain source-turned-off,
  check-limit,
  job-website-changed, alert-channel, alert-settings, and computer-date wording.
  Error-message tests and product-copy sensors guard the old recovery phrases.
- Latest local keyboard-help follow-up changes shortcut and quick-action labels
  from power-user wording to plain app action language: `Keyboard Help`, `Moving
  around`, `App-wide`, `Search and refresh`, `Save or unsave job`, `Select or
  unselect job`, `Open Hiring Trends`, and `Save current form changes`.
  Component/context tests and product-copy sensors guard old shortcut jargon.
- Latest local notification-rules follow-up changes alert-preference copy from
  settings jargon to plain job-alert language: the global switch is `All job
  alerts`, source copy says job boards are `turned on`, extra filters are
  `Extra alert rules`, title-word rules use job-title language, and remote plus
  company labels are phrased as user choices. NotificationPreferences tests and
  product-copy sensors guard the old phrases.
- Latest local application-profile loading follow-up replaces vague
  `Taking longer than expected...` copy with `Still opening your application
  profile...`, adds a ProfileForm slow-load test, and extends product-copy
  coverage against the vague phrase returning.
- Latest local general recovery wording follow-up changes app and page error
  buttons and guidance from browser-style reload wording to `Reset App Window`
  and `Clear Temporary App Data` language while preserving existing recovery
  behavior. ErrorBoundary tests and product-copy sensors guard against old
  reload labels returning.
- Latest local safe-support-report wording follow-up replaces remaining visible
  support-preview `more events` copy with `more app actions`, maps event detail
  labels to `App action`, and changes generated report overflow copy from
  frontend-error wording to plain app-problem wording. Product-copy and feedback
  service tests cover the drift.
- Latest local zero-technical settings-backup follow-up changes downloaded
  backup filenames from `jobsentinel-config-*` to
  `jobsentinel-settings-backup-*`, updates export tests, and adds product-copy
  harness coverage so visible backup file names do not drift back to config
  jargon.
- Latest local JobsWithGPT privacy follow-up closes `SEC-019`: approved
  connected-source checks now write a local minimized source-request ledger, and
  Settings shows the latest approved contact time, contacted website, count-only
  request categories, and outcome. The ledger stores no raw titles, raw
  location, resumes, salary floors, notes, application history, or full source
  links. Source-boundary, Settings, Rust health, and scheduler tests cover the
  boundary.
- Latest local connected-source wording follow-up changes the Settings contact
  history label from `Source host` to `Website contacted`, with focused
  Settings and product-copy coverage so raw source metadata labels do not drift
  back into user-facing copy.
- Latest local dashboard recovery follow-up changes the summary-widget failure
  copy from a bare `Could not load application summary` message to support-report
  recovery wording, with focused DashboardWidgets and product-copy coverage.
- Latest local dashboard wording follow-up changes the visible
  `Analytics Dashboard` label to `Application Summary` and the accessible chart
  region label to `Application summary charts`, with product-copy coverage
  against the old analytics wording.
- Latest local dashboard section-label follow-up changes remaining chart labels
  from `Weekly Activity`, `Jobs by Source`, `Salary Distribution`, and
  `Quick Stats` to `Weekly Applications`, `Where Jobs Came From`,
  `Pay Ranges Found`, and `At a Glance`.
- Latest local application-summary modal follow-up changes the Applications
  button from `Analytics` to `Summary` and replaces modal labels such as
  `Application Analytics`, `Status Distribution`, and response-time wording with
  application-summary, application-status, and reply wording.
- Latest local saved-answer recovery follow-up changes Application Assist
  suggested-answer failures from a bare `Could not load saved answers` message
  to support-report recovery wording, with focused component and product-copy
  coverage.
- Latest local privacy harness follow-up closes the screening-question debug-log
  debt: Application Assist traces and screening-answer command logs now stay
  count-only or ID-only for question text, saved answer patterns, original
  answers, and edited answers. Privacy-logging, IPC-minimization, and Rust
  response tests cover the boundary.
- Latest local safe-support-report wording follow-up changes saved-report test
  fixtures, frontend failure log labels, and backend reveal recovery from
  debug-report wording to support-report wording, and expands product-copy
  harness coverage so stale saved debug-report strings fail locally.
- Latest local resume-readability UX follow-up changes visible missing-word
  prompts from "Words To Add" to "Words To Review" across resume review
  surfaces, keeps truthful-use guidance, and adds product-copy harness coverage
  so old add-word framing fails locally.
- Latest local sub-agent-audited copy follow-up tightens first-run privacy
  boundaries, optional source setup wording, email security wording, salary
  guidance, resume import success copy, ghost reason labels, live resume tips,
  score contribution labels, and source-health table headings so user-facing
  surfaces stay plain-language, evidence-bounded, and broad-audience.
- Current local source-health follow-up changes the recent source status table
  from raw percent display to plain labels such as "Mostly working," "Some
  trouble," and "Needs attention"; feature docs and product-copy harness coverage
  now reject stale metric-first wording.
- Current local pay-language follow-up changes README, roadmap, research, and
  feature docs from optimization and under-leveling jargon to plain lower-title,
  lower-pay, and below-floor risk language; product-copy coverage now rejects the
  stale front-door phrases.
- Current local external-channel accuracy follow-up separates configured alert
  channels from user-opened GitHub/Google Drive support links in README and
  PRIVACY.md, with product-copy coverage against conflating support links with
  external alerts.
- Current local connected-source privacy follow-up keeps Settings explicit after
  approving an optional source address: approval applies only to the displayed
  exact details, any change keeps the source off until approval happens again,
  and the latest approved source contact is shown as host/count/outcome
  metadata only.
- Current local search-link docs follow-up changes user-facing Deep Links and
  ghost-detection docs away from advanced/monitored-source wording toward plain
  job-source and more-control language; product-copy coverage rejects the stale
  terms.
- Latest local zero-technical job-import follow-up changes missing-preview
  warnings from raw missing-field lists to readable details-to-check labels, so
  backend keys such as salary or job-link fields do not leak into the import
  modal. Focused component and product-copy harness tests guard the drift.
- Latest local active-status drift harness work adds docs-drift checks so the
  compact active status fails locally when its `Last updated` date lags newer
  active-plan entries or when it records stale measured harness counts instead
  of pointing to `npm run harness:session -- --json`.
- Current local broad-audience privacy/control follow-up removes raw provider,
  source, severity, interview outcome, and response-rate labels from user-facing
  analytics, alert, interview, and application surfaces; first-run setup now
  previews inferred job sources before saving; notification-rule load failures
  no longer fall back to enabled defaults; Settings now discloses email/chat
  and USAJobs data sharing and labels source toggles for screen readers.
- Latest local zero-technical support and protective-copy follow-up makes
  public issue templates use problem/idea/source wording and tell users to keep
  personal details out; safe support report docs now say users can save/copy,
  review, and share only if they choose. Source-status, search-link,
  match-score, ghost-risk, resume bullet, pay guidance, negotiation template,
  and application-form copy now use advisory, protective language. Product-copy,
  frontend, script, and Rust tests guard the drift.
- Latest local Rule 0 ease follow-up makes first-run profile selection plainer,
  keeps install warning overrides tied to the latest download page, labels
  settings backups as private, warns public issue-template users not to include
  personal details, removes absolute safety claims from crash recovery, and
  redacts phones plus known person-name fields in safe support reports.
  Product-copy, frontend, script, and Rust sanitizer tests cover the drift.
- Latest local Hiring Trends follow-up changes visible market-analysis labels
  to plain Hiring Trends language across navigation, page
  headings, refresh buttons, empty states, snapshot labels, and feature docs;
  focused component tests and product-copy coverage guard the old wording.
- Latest local location-privacy follow-up makes setup and settings disclose
  that Detect Location contacts an outside location lookup service only after
  the user clicks, and that nothing is saved unless the user adds the city.
  Focused page tests and product-copy coverage guard the disclosure.
- Latest local zero-technical problem-history follow-up renames the vague
  `Clear All` recovery action to `Clear Problem List` and adds product-copy
  coverage so support/problem-history screens keep destructive actions
  explicit.
- Latest local zero-technical Quick Start follow-up relabels the early
  developer-build disclosure as an optional self-build path and adds
  product-copy coverage so first-run install help does not drift back toward
  developer-setup wording.
- Latest local sidecar-audit follow-up hardens Application Assist so fill
  requests verify a public supported application URL before loading profile
  data, verify the final browser page stays on the same supported application
  platform before and after filling, and create tracking attempts only after the
  page trust check. External alerts now keep raw local match reasons inside
  JobSentinel, and privacy-logging coverage rejects raw `score.reasons` in
  Slack, Discord, Teams, Telegram, or email payload code.
- Latest local JobsWithGPT privacy follow-up requires a locally approved exact
  payload before the scheduler or source-health checks can contact a
  user-configured JobsWithGPT endpoint. Settings now previews endpoint, saved
  titles, location, remote filter, and result limit before approval; source
  checks skip stale or unapproved payloads, log only high-level metadata, and
  show the latest approved contact summary from a local metadata-only ledger.
- Latest local zero-technical copy follow-up rewords resume upload success,
  resume-app import docs, resume file privacy docs, screening-answer type
  labels, Telegram setup copy, notification troubleshooting, Dashboard filter
  recovery, and JobsWithGPT source-health copy from the read-only UX audit.
- Latest local synonym taxonomy work reorders the Rust synonym map so broad
  job-search roles and tools appear before programming and engineering groups,
  and adds harness coverage against tech-first synonym ordering drift.
- Latest local support/privacy wording work moves README and broken-link help
  to in-app safe support reports and Send Feedback first, labels GitHub as an
  optional maintainer path, clarifies that selected job sources and alert
  providers may be contacted only when users turn them on, and adds
  product-copy coverage against GitHub-first support and overbroad privacy
  claims.
- Latest local broad-source heuristic work stops generic broad role titles such
  as technical product manager, sales engineer, curriculum developer, support
  engineer, and customer success engineer from enabling tech-heavy job source
  defaults. Unit and harness coverage now reject generic `developer` and
  `engineer` substring matching.
- Latest local source-default follow-up also stops standalone stack or tool
  keywords such as SQL, Python, and AWS from enabling tech-heavy sources for
  broad roles like accounting, operations, or sales management. Explicit
  software/data/security role phrases still enable those sources.
- Latest local Resume Match follow-up makes choose/upload the primary resume
  path, moves resume-app export paste behind an explicit Import from Resume App
  action, removes the circular PDF-upload hint, and adds focused UI plus
  product-copy coverage against the old raw export-data path.
- Latest local protective-tone follow-up changes resume readability score
  labels away from judgmental terms such as Excellent, Great, and Poor toward
  evidence-focused labels, with unit and product-copy coverage against drift.
- Latest local security follow-up minimizes screening-answer learning IPC:
  renderer responses no longer expose raw saved answer patterns, historical
  question text, original answers, or edited answer text; summary counts remain
  available locally, and IPC-minimization sensors reject drift.
- Latest local ATS timeline privacy follow-up stops application event metadata
  from duplicating private note bodies or reminder messages. Notes and reminder
  messages stay in their owning tables, timeline events keep only counts and
  presence metadata, a data migration scrubs legacy event payloads, and
  privacy-logging sensors reject drift.
- Latest local broad-audience notification follow-up changes alert preferences
  away from "interrupt you," internal source-rule limits, and tech-career title
  examples. The alert-rules panel now uses protective time-control wording,
  broader role examples, and product-copy coverage against drift.
- Latest local explorer-audit follow-up reduces zero-technical and protective
  tone drift in setup alerts, additional job sources, browser-button setup,
  analytics headings, weekly application pacing, and Dashboard search tips.
  Product-copy sensors now reject the old provider-heavy, browser-power-user,
  funnel/goal, and Boolean-search wording.
- Latest local cover-letter follow-up replaces visible brace-token template
  buttons with plain auto-fill blank labels, keeps token insertion internal,
  changes copy/toast guidance to "blanks" language, and extends product-copy
  coverage against raw placeholder-chip drift.
- Latest local source-label follow-up moves job source display names into a
  shared helper and uses it in job cards, Dashboard filters, saved-search
  summaries, comparison rows, and duplicate-review rows so raw source IDs such
  as `manual_import` stay out of visible user copy.
- Latest local Application Assist follow-up changes the preview badge
  accessible label from "Application tracking system" to "Application form" and
  adds product-copy coverage so broad-audience assistive text does not drift
  back to ATS jargon.
- Latest local Resume skills follow-up replaces unlabeled skill confidence
  percentages with plain labels such as "Found in resume" and "Added by you,"
  and extends product-copy coverage against confidence-score display drift.
- Latest local skill-label follow-up replaces vague self-rating labels such as
  beginner, intermediate, advanced, expert, and seniority level with
  behavior-based skill strength and role-stage copy across Resume, Resume
  Builder, Pay Protection, docs, and product-copy sensors.
- Latest local Pay Protection follow-up replaces percentile shorthand on the
  pay-range screen with lower, middle, higher, and highest-seen labels, updates
  salary-floor guidance to explain the sample in plain language, and adds
  product-copy coverage against percentile jargon returning.
- Latest local Company Research follow-up changes unknown-company fallback copy
  from implied background gathering to honest local-details wording, softens
  lookup delay/error messages, and adds product-copy coverage against stale
  "being gathered" and request-timeout phrasing.
- Latest local Market Snapshot follow-up replaces finance-jargon
  bullish/bearish/neutral sentiment labels with plain hiring-outlook labels:
  more active, slower, and steady, with product-copy coverage against stale
  sentiment wording returning.
- Latest local support-report privacy follow-up extends backend report
  sanitization beyond URLs, paths, credentials, and emails to labeled
  job-search context such as salary floors, resume excerpts, private notes,
  application history, screening answers, location preferences, career goals,
  and personal circumstances before feedback reports are returned over IPC or
  saved to disk.
- Latest local zero-technical UX follow-up changes Application Preview,
  Error Log, browser import docs, notification salary filters, Application
  Assist profile settings, screening-answer type labels, Dashboard empty
  state copy, reminder labels, rate-limit errors, and auto-refresh warnings to
  avoid setup jargon, raw enum values, thousand-dollar salary conversion, and
  operational scanning language.
- Latest local broad-audience UX follow-up removes another stale phrase set
  from maintained docs and visible UI: Application Assist docs and E2E page
  objects now use "Ask me before each form," Dashboard status copy uses search
  and selected-site wording, Settings avoids auto-scan and configured-company
  phrasing, generic async toasts avoid "Success"/"Error" titles, and score
  explanations use saved preference wording.
- Latest local Resume Readability follow-up removes analysis/context jargon
  from the live Resume Builder panel. The panel now says "checking," "Saved
  Job," "View Details," "Details to Check," "How to fix," and "Why it helps"
  instead of full-analysis, job-context, raw severity, fix, or impact wording.
  Notification setup errors now say saved alert channel instead of configured
  channel. Product-copy sensors reject the old phrases.
- Latest local Resume Match detail follow-up applies the same plain wording to
  the Resume Match review page. It maps raw issue severity before display,
  changes format issues to details to check, changes fix and impact labels to
  how-to-fix and why-it-helps copy, and replaces job-context saved toasts with
  a plain Resume Builder handoff message.
- Latest local generic-error copy follow-up replaces technical fallback labels
  for related-data, email, file-permission, resume-read, and long-document
  failures with plain recovery wording, and expands product-copy coverage so
  those old labels do not return.
- Latest local Job Source Status follow-up replaces remaining source-panel
  table and dialog jargon with `Kind`, `Recent Status`, `Time Needed`,
  `Last Checked`, and `Check Results`, and expands product-copy coverage so
  `Source Type`, `Recent Success`, and `Job Source Check Results` do not return.
- Latest local Settings copy follow-up replaces the remaining `New scans`
  posting-risk toast and `Advanced chat alert` badge with plain job-check and
  optional-chat-alert wording, with Settings and product-copy coverage.
- Latest local Application Assist recovery-copy follow-up replaces visible
  form-preparation failure wording with `Could not prepare details` and adds
  ApplyButton plus product-copy coverage so old preparation-error labels do
  not return.
- Latest local Dashboard source-check copy follow-up replaces remaining scan
  wording in manual and scheduled job checks with `Checking job sources`,
  `Checking for new jobs`, and `Job check complete`, with DashboardHeader and
  product-copy coverage against old scanning labels.
- Latest local Application Assist profile recovery-copy follow-up replaces
  remaining `Failed to...` and `Please fix the errors` labels in profile and
  saved-answer flows with `Could not...` and `Check highlighted fields`
  wording, with focused component tests and product-copy coverage.
- Latest local saved-answer recovery follow-up replaces the remaining
  retry-only saved-answer load fallback with safe-support-report guidance and
  extends product-copy coverage so retry-only fallback copy does not return
  there.
- Latest local job-link recovery-copy follow-up replaces remaining
  `Failed to open link` / `Unable to open the job link` toasts with
  `Could not open job link` and browser-copy guidance across job cards and the
  Dashboard keyboard-open path, with JobCard and product-copy coverage.
- Latest local dashboard-adjacent load-error follow-up replaces visible
  `Failed to Load...` / `Failed to load analytics data` panels in Market,
  Cover Letter Templates, Analytics, and Dashboard Widgets with `Could not
  load...` wording, and changes cover-letter copy failures to `Could not copy
  template`, with focused component tests and product-copy coverage.
- Latest local cover-letter clipboard recovery follow-up replaces retry-only
  copy-failure guidance with clipboard-permission guidance and expands
  product-copy coverage for the old fallback.
- Latest local AnalyticsPanel recovery follow-up replaces retry-only summary
  load guidance with safe-support-report guidance and adds product-copy
  coverage against the old sentence.
- Latest local dashboard bookmark recovery follow-up replaces retry-only
  bookmark-failure guidance with safe-support-report guidance and adds
  product-copy coverage against the old sentence.
- Latest local notification preference recovery follow-up replaces retry-only
  alert-settings save guidance with safe-support-report guidance and expands
  product-copy coverage against the old sentence.
- Latest local shared error-helper recovery follow-up replaces retry-only API,
  timeout, and unknown fallback guidance with safe-support-report guidance and
  expands product-copy coverage against the old sentences.
- Latest local feedback-report save recovery follow-up replaces the remaining
  `Please try again` save-report wording with direct copy-report and
  choose-another-folder guidance, with product-copy coverage.
- Latest local recovery-title follow-up replaces remaining visible
  `Failed to...` fallback titles in Resume, Resume Builder, Screening Answers,
  Interview Scheduler, and company-research fallback UI with `Could not...`
  recovery wording, and adds product-copy coverage against the old titles.
- Latest local action-recovery follow-up replaces visible action failure labels
  in undo/redo, bookmark, bulk-hide, duplicate-merge, resume export,
  application-status, application-list, and section recovery paths with
  `Could not...` wording, and adds product-copy coverage against old labels.
- Latest local generic-recovery follow-up replaces remaining generic failure
  titles in job search, settings save/test, notification, reminder, modal
  recovery, feedback-details, and API fallback paths with `Could not...`
  wording, and extends product-copy coverage against the old titles.
- Latest local generic error fallback follow-up replaces visible
  `Something went wrong` and `An unexpected error occurred` fallback copy with
  `JobSentinel needs attention` / `JobSentinel ran into a problem` wording
  across shared error helpers, Rust command error titles, boundaries,
  Dashboard, job import, and external AI setup errors. Product-copy sensors
  now reject those old generic labels.
- Latest local shared error-helper follow-up also changes legacy helper
  messages away from `Invalid input`, `Data format error`, `requested
  resource`, and permission jargon toward plain review, unreadable-data,
  missing-item, and sign-in/access guidance, with product-copy coverage.
- Latest local Rust source-error follow-up changes scraper and Prepare Form
  `user_message()` copy away from parse, CAPTCHA, request-timeout, browser
  launch, raw selector, resume-reason, and automation wording toward plain job
  source, human-check, page-load, browser, form-field, and review guidance.
- Latest local zero-technical sidecar follow-up closes read-only UX audit
  findings in link validation, Quick Start install routing, support-detail
  export copy, maintainer feedback copy, empty job-list pay wording, job-card
  pay warning copy, and alert connection-link validation.
- Latest local pay-protection follow-up changes Quick Start troubleshooting so
  users are not told to drop their salary floor to zero. No-jobs recovery now
  keeps the user's lowest acceptable pay intact and explains that missing-pay
  roles remain visible for review. Product-copy coverage rejects future
  salary-floor troubleshooting that weakens pay protection.
- Latest local search-link wording follow-up removes site-control workaround framing and
  technical-contributor labeling from user-facing Job Site Search Links docs.
  Search-link boundaries now say JobSentinel does not get around sign-in pages,
  human checks, or site limits, and product-copy coverage rejects the old
  wording.
- Latest local Browser Button follow-up changes support-only connection labels
  from `Connection settings` / `Connection Number` / `Support number` to
  `Help-only settings` / `Browser helper number`, preserving the support escape
  hatch without asking non-technical users to reason about ports or connection
  internals.
- Latest local Resume Match follow-up changes strong/power resume words to
  action words for clarity, preserving truthful readability framing and adding
  product-copy coverage against the old labels.
- Latest local USAJobs settings follow-up changes visible `keywords`,
  posted-within, and max-results wording to search words, recent jobs, and
  jobs-to-ask-for copy, with product-copy coverage against the old phrasing.
- Latest local Application Assist security follow-up rejects unknown
  application-form targets before profile or saved screening-answer data is
  loaded, keeps unknown-platform generic selectors disabled as a second guard,
  and changes automation-attempt IPC to expose screenshot presence flags
  instead of raw local screenshot paths. IPC-minimization sensors cover both
  trust-boundary and screenshot-path regressions.
- Latest local user-configured source privacy follow-up documents the
  default-off JobsWithGPT endpoint boundary in privacy docs, scraper docs,
  feature privacy labels, and config comments: if enabled, it receives only
  saved job titles, location, remote preference, and result limit, never
  resumes, salary floors, private notes, application history, screening
  answers, or profile details.
- Latest local interview-outcome follow-up keeps the internal `failed`
  interview outcome value but changes visible outcome buttons and chips to
  plain, non-shaming labels such as `Did not go well`, with component and
  product-copy coverage against old labels.
- Latest local Application Assist readiness follow-up stops optional
  application-form detection from blocking the Prepare Form action. If form
  recognition is still loading, users with a saved profile can still open the
  review modal and continue. Application Assist now also shares plain
  application-form display labels across job-card badges and the review modal,
  so raw platform IDs such as `greenhouse` do not appear in the preview.
  Application Assist docs now use human-check wording instead of
  CAPTCHA-first troubleshooting copy, with product-copy coverage against drift.
  Deep Links user docs now use the same human-check and site-limits wording
  instead of CAPTCHA/anti-bot phrasing.
- Latest local ghost-detection docs follow-up replaces user-visible ATS-source
  wording with employer and application-platform language while keeping the
  cautious source-evidence boundary.
- Latest local source-docs wording follow-up replaces user-facing ATS,
  CAPTCHA-solving/control-evasion, anti-bot, endpoint, and selector phrasing in source health
  and source adapter docs with employer, application-platform, human-check, and
  source-boundary language.
- Latest local notification privacy follow-up makes desktop notification
  payloads privacy-preserving by default. OS-level alerts no longer include job
  titles, company names, match scores, salary notes, or reminder text; users
  open JobSentinel to review those details locally. The unused generic desktop
  notification passthrough helper was removed, and privacy-logging coverage now
  blocks raw title/body notification passthrough from returning.
- Latest local frontend error-report privacy follow-up expands renderer-side
  report sanitization beyond credentials and URLs to sensitive job-search
  context. Salary floors, resume text, private notes, application history,
  screening questions/answers, location preferences, career goals, personal
  circumstances, and labeled sensitive text now redact before local
  persistence, console forwarding, or exported support reports. Privacy-logging
  coverage requires those sanitizer categories.
- Latest local support-report wording follow-up replaces remaining
  `configured`/`not configured` setup jargon in the safe app details preview
  and generated support report with plain labels such as saved, set, not set,
  turned on, added, and not added. The report privacy summary now also names
  job-search sensitive categories removed before sharing, and product-copy
  coverage rejects setup-summary jargon drift.
- Latest local sidecar audit follow-up cleans user and feature docs that still
  sounded technical or scary for non-technical job seekers. Quick Start, Job
  Site Search Links, Job Sources, and Job Source Status now use plainer wording
  for download instructions, build-from-source, posting-review alerts, search
  refreshes, signed-in website sessions, repeated-search limits, source rules,
  source checks, and maintainer-only sections. Product-copy coverage rejects
  the old doc phrases.
- Latest local UI copy follow-up applies the same sidecar audit to smaller
  source/setup surfaces. The browser import helper, Job Site Search Links
  component, and Job Source Status table now avoid support-unfriendly phrases
  such as advanced connection settings, local safety code, if this feels hard,
  block page import, monitor directly, official feed, retry counts, Access,
  Source Controls, and Source Check Results. Focused component tests and
  product-copy coverage guard the old wording.
- Earlier local Settings copy follow-up applied the sidecar audit to remaining
  old More Settings surfaces. Notifications, email provider details, LinkedIn and
  USAJobs setup, optional job sources, posting-risk controls, and resume-based
  sorting now use plainer labels such as desktop alerts from your computer,
  JobSentinel is open on screen, email sending address/number, automatic
  checks, Optional USAJobs auto-check, Browser Button, postings that need
  review, and Use Resume to Sort Jobs. Settings tests and product-copy sensors
  cover the old phrases.
- Latest local privacy follow-up removes raw screening-question text and saved
  answer patterns from backend debug logs in Application Assist. Logs now keep
  only character counts for matched questions and patterns, and
  privacy-logging sensors reject the old raw trace shape.
- Latest local broad-audience copy follow-up removes remaining
  zero-technical friction found by the broad-audience audit: Dashboard search
  help no longer teaches minus-sign search operators, saved screening answers
  hide raw match internals and confidence percentages behind plain labels,
  site challenge errors use human-check wording instead of bot-detection
  language, Auto-Search copy avoids "never miss" pressure, and Slack docs are
  labeled as advanced chat setup after desktop and email alerts.
- Latest local Application Assist suggestion follow-up changes screening-answer
  suggestion cards from "Smart Suggestions," raw confidence percentages,
  modification percentages, and Manual/Learned/History source badges to plain
  suggested-answer, review-state, edit-frequency, and saved/used labels. A
  focused component test and product-copy sensor now cover the surface.
- Latest local human-check copy follow-up changes Application Assist CAPTCHA
  prompts and docs to plain human-check wording while preserving the boundary
  that JobSentinel pauses and users complete site checks themselves.
- Latest local Dashboard salary-filter follow-up fixes a zero-technical
  high-impact bug: salary filters now accept full yearly dollars such as
  60000, the labels no longer say "in thousands," current-filter summaries use
  salary formatting, and product-copy coverage rejects the old `$K` drift.
- Latest local zero-technical provider setup work labels USAJobs as optional
  automatic checks with a no-setup browser-search path first, keeps Telegram
  bot details behind an optional chat-alert path, and adds
  product-copy coverage against old provider setup shortcuts.
- Latest local broad-profile source work removes preloaded company-source URLs
  from product, UX, content, and marketing profile JSON files. Harness coverage
  now rejects official company source URLs in broad non-technical starter
  profiles unless the user adds them.
- Latest local broad-audience notification work makes Settings and user docs
  present desktop alerts first, email second, and chat integrations as optional
  paths for people already using Slack, Discord, Teams, or Telegram.
- Latest local support UX work makes GitHub issue sharing more explicitly
  optional in the README and feedback submit choice. The local safe support
  report remains the primary path and does not require an account.
- Latest local broad-audience work changes Resume Builder work-sample link
  validation from GitHub-specific error labels to "Portfolio or work samples"
  so non-technical users are not told the field is a developer profile.
- Latest local zero-technical UX work removes a no-source empty-state dead end:
  Dashboard now remembers whether any job source is enabled and changes the
  empty job list to a direct "Turn On Job Sources" recovery path, with import as
  the secondary path, when searches cannot run yet.
- Latest local privacy/security work tightens external output boundaries:
  renderer CSP now keeps `connect-src 'self'`, saved job links and Application
  Assist browser launches use the shared public HTTP(S) URL validator, and
  alert email HTML escapes scraped job text plus validates job links before
  creating `href` attributes. Focused Rust and harness tests cover these gates.
- Latest local security work hardens user-controlled external URL fetches:
  shared URL validation now blocks private host suffixes and embedded private
  IP hostnames, user-entered job imports and JobsWithGPT use fetch-time DNS
  checks before network requests, shared scraper clients do not follow
  redirects, and focused Rust tests cover the new gates.
- Latest local bookmarklet security work routes browser-helper imports through
  public HTTP(S) URL validation and shared `Database::upsert_job` storage
  validation, with focused tests for unsafe URLs, overlong fields, and valid
  storage.
- Latest local scraper reliability work gives production scraper constructors a
  process-wide shared rate limiter, so repeated manual runs preserve source
  cooldown state across fresh scheduler/scraper instances.
- Latest local bookmarklet boundary work removes wildcard CORS and custom auth
  headers from the browser-helper flow, sends the local safety code in a
  `no-cors` text-body envelope, refreshes it when copying the browser button,
  activates refreshed codes only after successful copy, consumes copied codes
  after one valid local import attempt, and expires copied codes after about
  one hour. The helper now binds its local port before reporting that it is
  running, so port conflicts surface as startup errors.
- Latest local zero-technical setup work removes raw Slack connection-link
  setup from first-run onboarding. Setup now tells users optional chat alerts
  can be added later in Settings, with focused UI and product-copy coverage.
- Latest local user-doc cleanup makes the Quick Start download path point to
  the release Assets section, puts desktop/email notifications before optional
  chat alerts, sends normal site requests through feedback before developer
  docs, and moves Linux keyring commands into an advanced reference.
- Latest local work closed the active-plan compaction debt by adding this
  compact status file, archiving older progress rows, and routing the plan
  index, harness guide, agent guide, and handoff toward the compact state.
- Current local work continues the sensor-modularity debt by extracting
  filesystem, tracked-artifact, dependency-ownership, source-structure,
  E2E-helper, product-framing, product-copy including technical-first user
  copy policy, release-promise, and expanded privacy-logging policy from
  `scripts/check-repo-bloat.mjs` into
  `scripts/harness/checks/` modules with focused tests. The latest harness
  slices add `scripts/harness/checks/ipc-minimization.mjs` so minimized
  profile, Dashboard, and job-import IPC contracts fail locally if they drift,
  and `scripts/harness/checks/docs-drift.mjs` so grant-facing docs, stale doc
  shape, version-promise, emoji-marker, and speculative-cloud checks have
  focused coverage outside the main bloat runner.
- Latest local harness-modularity work moves the technical-first user-copy
  sensor into `scripts/harness/checks/product-copy.mjs` with focused tests for
  Settings and Resume drift.
- Latest local privacy-harness work moves raw private-query logging, scraper
  URL/query logging, scraper loop-error logging, unbounded response-body read,
  raw local-path logging, backup-path, ML path/error, JobsWithGPT/LinkedIn Debug
  derive, LinkedIn cookie-return, credential, config-export, notification, and
  source-health error-detail sensors into
  `scripts/harness/checks/privacy-logging.mjs`. Use the session snapshot for
  current focused-test and bloat-runner counts.
- Latest local URL/import privacy harness work moves raw URL logging, URL
  error display, path/query error display, command setup/config URL display,
  import redirect display, job-import logging, import HTTP error, and
  non-public IP echo sensors into `scripts/harness/checks/privacy-logging.mjs`;
  use the session snapshot for current focused-test and bloat-runner counts.
- Latest local automation/notification privacy harness work moves raw
  automation screening-question logging, automation form-result data,
  automation browser-error detail, and notification job-title logging sensors
  into `scripts/harness/checks/privacy-logging.mjs`; use the session snapshot
  for current focused-test and bloat-runner counts.
- Latest local frontend error/report privacy harness work moves unsafe
  frontend error-report storage, raw error-helper output, raw shared and direct
  frontend error logging, unsafe stored-report parsing, and hardcoded error
  export-version sensors into `scripts/harness/checks/privacy-logging.mjs`;
  use the session snapshot for current focused-test and bloat-runner counts.
- Latest local backend command privacy harness work moves resume path/name/DTO
  exposure, resume command error-detail, application tracking command
  error-detail, automation command error-detail, sensitive command
  error-detail, and utility command error-detail sensors into
  `scripts/harness/checks/privacy-logging.mjs`; use the session snapshot for
  current focused-test and bloat-runner counts.
- Latest local import/bookmarklet/scheduler privacy harness work moves
  user-data privacy logging, scheduler job-content logging, scheduler scraper
  error-detail, import/bookmarklet command error-detail, bookmarklet import
  metadata logging, scoring cache job-hash logging, scheduler scoring privacy,
  residual core privacy, manual bookmarklet JSON error, bookmarklet auth, and
  bookmarklet token-header sensors into
  `scripts/harness/checks/privacy-logging.mjs`; use the session snapshot for
  current focused-test and bloat-runner counts.
- Latest local feedback/report privacy harness work moves stale feedback
  webhook sanitizer, structured debug-log sanitization, feedback-file save
  sanitization, and raw support-open error sensors into
  `scripts/harness/checks/privacy-logging.mjs`; use the session snapshot for
  current focused-test and bloat-runner counts.
- Latest local frontend feedback/report presentation harness work moves raw
  feedback debug-event details, technical company-label report copy, raw
  problem-history context display, raw error-boundary detail display,
  technical recovery copy, non-protective score copy, and legacy
  allowlist/blocklist preference copy sensors into
  `scripts/harness/checks/product-copy.mjs`; use the session snapshot for
  current focused-test and bloat-runner counts.
- Latest local broad-audience fixture harness work moves engineer-first
  example, generic scraper fixture, and salary-audience drift sensors into
  `scripts/harness/checks/broad-audience-fixtures.mjs`. The latest slices also
  broaden generic mock location defaults and Rust Application Assist profile
  examples away from old `John Doe`, `Jane Doe`, GitHub, San Francisco, and New
  York fixtures, and rebase scoring location fixtures away from San Francisco
  and New York defaults, with sensor coverage for those paths.
- Latest local developer-doc drift harness work moves stale test-guidance,
  developer testing/architecture/maintenance doc marker, active-doc marker,
  E2E fixed-wait, getting-started tooling, macOS development, and SQLite
  configuration doc sensors into `scripts/harness/checks/docs-drift.mjs`; use
  the session snapshot for current focused-test and bloat-runner counts.
- Latest local feature-doc drift harness work moves bookmarklet status,
  feature metadata/glyph, synonym/remote-preference doc, Hiring Trends,
  Resume Matcher, Salary AI, smart scoring, notifications, active user-doc,
  maintained-doc, developer-layout, and application-tracking doc drift sensors
  into `scripts/harness/checks/docs-drift.mjs`; use the session snapshot for
  current focused-test and bloat-runner counts.
- Latest local source-boundary harness work moves scraper/source-health doc,
  source-health plain-language, LinkedIn credential/automation/notification
  boundary, cache-usage doc, direct-open fallback, and discontinued source
  sensors into `scripts/harness/checks/source-boundaries.mjs`; use the session
  snapshot for current focused-test and bloat-runner counts.
- Latest local frontend-contract harness work moves user-data, deep-link,
  feedback, and resume optimizer mock-drift sensors, runtime invoke mock
  coverage, unsafe Resume Optimizer JSON parsing, ATS keyword shape, salary,
  interview, resume match, and resume E2E seed sensors into
  `scripts/harness/checks/frontend-contracts.mjs`; use the session snapshot for
  current focused-test and bloat-runner counts.
- Latest local source-quality harness work moves raw salary command logging,
  production/frontend glyph and lint-suppression sensors, backend and
  notification scoring glyph sensors, stale Rust stub checks, database-log
  glyph checks, opaque command unit-error checks, unsafe rendered JSON parsing
  checks, and unsafe Settings webhook/partial-save checks into
  `scripts/harness/checks/source-quality.mjs`; use the session snapshot for
  current focused-test and bloat-runner counts.
- Latest local security-doc harness work moves stale notification webhook docs,
  security doc marker drift, URL validation security reference drift, XSS
  security doc drift, keyring credential docs, keyring migration retry-safety,
  credential architecture comments, and notification preference doc shape
  checks into `scripts/harness/checks/security-docs.mjs`; use the session
  snapshot for current focused-test and bloat-runner counts.
- Latest local repo-integrity harness work moves JobSentinel project detection,
  docs-image reference checks, duplicate screenshot capture checks, and
  contradictory release-plan status checks into
  `scripts/harness/checks/repo-integrity.mjs`; use the session snapshot for
  current focused-test and bloat-runner counts.
- Latest local lifecycle harness work adds the five-tuple harness audit and
  `npm run harness:session`, a tested one-command restart snapshot for branch
  state, latest commit, active plan count, harness module/test counts,
  bloat-runner size, audit path, and next-best work.
- Latest local five-tuple harness work adds `.nvmrc`, `rust-toolchain.toml`,
  runtime-pin doctor checks, `docs/plans/index.json`, and
  `npm run harness:score`, then wires the score into `harness:session` and
  `harness:check` so both WalkingLabs five-tuple models stay at 100/100 for
  repo-managed harness evidence.
- Latest local Rust advisory watch reran `cargo audit` and
  `cargo deny check advisories` on 2026-06-01. Both commands exit 0; the
  remaining RustSec findings are allowed upstream/transitive warnings recorded
  under `SEC-002` in the technical debt tracker.
- Current local zero-technical and broad-audience follow-up validates settings
  backups before restore, blocks chat-alert toggles until connection details
  exist, uses plain saved-securely copy for stored secrets, clarifies which job
  sources have detailed alert rules, keeps product/design searches off
  tech-heavy boards unless explicitly technical, renames the tech cover-letter
  filter to IT/software wording, and broadens company fallback examples across
  healthcare, retail, logistics, hospitality, education, public service, and
  insurance.
- Current local docs-bloat follow-up links the Linux build guide from the docs
  hub, corrects its GitHub Actions trigger description to the manual
  `workflow_dispatch` build, and adds a release-notes index so historical
  release docs are discoverable without becoming the current release log. The
  docs-drift harness now rejects unlinked Linux build docs, stale Linux build
  trigger claims, and unindexed release-note files.
- Current local Application Assist wording follow-up removes user-visible
  automation-browser copy and raw application-platform help text from the
  Prepare Form flow, replacing it with review-first wording and fixed
  plain-language hover copy. Product-copy harness coverage now rejects those
  automation-framed strings and raw platform-note hover wiring.
- Latest local harness benchmark work adds `npm run harness:benchmark`, a
  tested portable before/after report for score, session metrics, active next
  work, and harness-tuning recommendations, modeled on the WalkingLabs
  benchmark/report scripts without generating tracked report files by default.
- Latest local diff-aware harness work adds `npm run harness:plan -- --since
  origin/main`, a tested changed-file command planner that maps docs, scripts,
  frontend, Playwright, Rust, Tauri invoke, security/privacy, package, and
  user-facing copy paths to focused verification commands.
- Latest local privacy-logging harness work moves privacy/logging violation
  orchestration out of `scripts/check-repo-bloat.mjs` and into
  `collectPrivacyLoggingViolations`; focused privacy-logging tests verify the
  collector, and `scripts/check-repo-bloat.mjs` remains a small orchestrator
  after the latest source-boundary guard.
- Latest local broad-audience fixture work replaces engineer-first defaults in
  `SkillCategoryFilter`, Cow utility, API-contract, scraper-construction, and
  ignored live-scraper tests with operations, support, accounting, and care
  examples; the broad-audience sensor now rejects those old fixtures.
- Latest local broad-audience seed work removes tech-brand defaults from
  `config/config.example.json` and broad non-engineering profile URL seeds,
  reorders `profiles/README.md` to match the broad-first UI posture, replaces
  engineer-first developer-doc examples, and moves salary-location fixtures off
  San Francisco, Seattle, and Austin defaults.
- Latest local screenshot work refreshes `docs/images/*.png` with current
  broad-audience UI data and fixes the settings screenshot capture so it opens
  the real settings modal instead of duplicating the dashboard.
- Recent remote integration evidence: `f3ed5fb9 Tighten protective user copy`
  passed Docs Harness run `26790585973` and CI run `26790585989` on `main`.
  Remote CI covered harness checks, harness script tests, TypeScript, ESLint,
  frontend unit tests, Rust fmt, Rust clippy, Rust library tests, npm audit,
  and cargo-deny advisories. Treat this as recorded evidence, not as a promise
  that the named commit remains the current branch head after later
  continuation slices.
- Latest local company-research accuracy work removes hardcoded employer
  rating claims from the static fallback data, keeps cached/live rating
  rendering covered by component tests, changes unknown-company guidance to
  official and public-source research language, and adds a source-quality
  harness check so static fallback ratings cannot drift back.
- Latest local browser-import boundary work removes broad "any job posting" and
  large-board support promises from the browser import UI and docs, points users
  toward official career pages and public job pages opened by them, states that
  JobSentinel does not get around blocking controls, and adds product-copy coverage
  against overbroad import promises.
- Latest local search-link boundary work replaces automated-scan language in
  the Job Site Search Links UI and user docs with direct-monitoring and
  browser-opened search wording, removes overconfident legal claims, and adds
  product-copy coverage so automated-scan and scraper-comparison wording cannot
  drift back into that user path.
- Latest local harness-audit accuracy work reconciles
  `docs/harness/deep-harness-audit-2026-05-31.md` against live CI,
  docs-harness, release/manual-build, toolchain-pin, plan-index, and
  bloat-runner evidence so closed findings no longer read as open work.
- Latest local support-template UX work changes GitHub issue templates from old
  report and scraper-first wording to safe support report and job source
  wording, then adds product-copy coverage so old template language cannot
  drift back.
- Latest local profile-doc UX work changes `profiles/README.md` from
  command-line-first setup to app setup first, keeps manual file copying
  advanced, and adds product-copy coverage against command-first profile docs.
- Latest local broad-audience support wording work moves the advanced config
  profile list to broad-first ordering, changes roadmap support report wording
  away from old report labels, and adds broad-audience/product-copy sensors
  for both drift classes.
- Latest local feature-privacy harness work adds
  `docs/harness/feature-privacy-labels.json` and validates required labels,
  data categories, sensitive-label alignment, external-AI allowance, local
  fallbacks, and core feature entries through `npm run harness:check`.
- Latest local E2E budget work adds `scripts/e2e-budget.mjs`,
  `npm run test:e2e:smoke:budget`, and `npm run test:e2e:all:budget`; the
  latest measured smoke budget run completed 9 Chromium smoke tests in
  5.97 seconds against a 30-second budget.
- Latest Rule 0 harness work updates `.github/PULL_REQUEST_TEMPLATE.md` so PRs
  must show privacy/security, optional external AI, safe support report,
  responsible-use, broad-audience, and zero-technical-knowledge evidence; the
  template is now covered by manifest snippets in `npm run harness:check`.
- Latest zero-technical copy work changes visible market-analysis labels
  toward Hiring Trends language, with focused component tests and smoke-budget
  E2E evidence.
- Latest dashboard plain-language work changes job-list export actions to
  download copy, removes advanced-search wording from the main search box, and
  adds focused DashboardFiltersBar and QuickActions tests for the visible copy.
- Latest support-language work changes feedback choices from bug-report and
  feature-request wording to report-a-problem, suggest-an-improvement, and
  ask-a-question wording, with focused CategorySelector coverage.
- Latest safe support report work changes repeat-step prompts, feedback modal
  step labels, frontend activity names, backend report type labels, and backend
  recent-activity lines from developer-style labels to plain-language support
  wording, with product-copy harness coverage for recurrence.
- Latest local safe support report UI work standardizes crash recovery,
  Settings, and feedback submit/success copy on safe support report wording,
  with product-copy coverage against shorter safe report labels.
- Latest local read-only audits found no high-confidence remaining
  broad-audience violations in maintained UI and user docs, and found
  zero-technical UX debt in Settings tab naming, source-health table/actions,
  Resume readability import/copy, structured resume import, browser-session
  storage recovery copy, and visible dashboard shortcut syntax.
- Latest local browser-import wording work removes `ATS` jargon from browser
  button setup and LinkedIn monitoring guidance, replacing it with company
  application page language and product-copy coverage.
- Latest local Settings wording work replaces the old advanced tab with clearer
  settings-task labels and updates smart-scoring, notification, Quick Start,
  Dashboard, and product-copy coverage so old tab labels do not return.
- Latest local source-health UX work changes page-check and icon-only action
  columns to plain "Can Read Jobs" and visible "Turn On/Off" plus "Check Now"
  controls, with focused component and product-copy coverage.
- Latest local Resume readability UX work maps internal suggestion category
  keys to plain labels like "Add job words" and "Rewrite bullet", with focused
  ResumeOptimizer and product-copy coverage.
- Latest local zero-technical UX work closes the remaining concrete findings
  from the read-only audit: Resume Match Helper now explains resume-app exports
  and PDF upload recovery, Resume Match labels structured import as "Import
  from resume app", browser-session storage failures now give a copy/paste
  recovery path, and dashboard job-list shortcut syntax moved behind the
  existing Shortcuts control. Focused UI tests and product-copy coverage guard
  those old phrases.
- Latest local backend error-copy work replaces shared command error labels
  like database/configuration/input errors with plain local-data, saved-settings,
  and information-review copy, keeps raw SQL and secrets suppressed, and adds
  product-copy coverage against the old technical labels.
- Latest local frontend privacy work removes raw Tauri command arguments and
  raw backend exception text from propagated `safeInvoke` errors, replacing
  them with display-safe error text plus a count/type-only argument summary.
  Focused API tests and privacy-logging harness coverage guard against raw
  invoke arguments returning.
- Latest local resume import boundary work routes PDF and JSON Resume file
  selection through backend native file-picker commands. The renderer no
  longer receives or submits raw resume file paths for upload/import, JSON
  import still checks file type and size before import, PDF uploads copy the
  selected file into app-owned local storage before parsing, and source-quality
  coverage rejects renderer-owned file picker imports.
- Latest local harness-session work fixes `npm run harness:session -- --json`
  so the JSON flag no longer gets treated as the repo root; the normal and
  machine-readable restart snapshots now report the same live repo state.
- Latest local E2E reliability work removes remaining `networkidle` waits from
  normal job-interaction tests and broadens the active E2E wait sensor so only
  screenshot capture may keep fixed visual-settle waits.
- Latest notification-settings UX work changes source-rule, minimum-salary,
  saved-error, and loading-error copy to plain alert-settings wording, with
  focused NotificationPreferences and product-copy coverage.
- Latest local docs-drift harness work moves the docs-drift violation messages
  out of `scripts/check-repo-bloat.mjs` and into
  `scripts/harness/checks/docs-drift.mjs` through
  `collectDocsDriftViolations`; focused docs-drift coverage now verifies the
  collector.
- Latest local E2E reliability work removes the hard sleep from keyboard
  search-focus coverage and expands the fixed-wait sensor from page objects to
  every active Playwright runtime file, while keeping screenshot-capture waits
  out of the normal E2E path.
- Latest local privacy work removes raw automation dropdown-answer logging and
  raw frontend error forwarding, then adds bloat sensors and `errorReporting`
  unit coverage so those regressions fail locally.
- Latest local UX work makes saving a local safe support report the primary
  feedback path, adds safe support report copy/save actions to modal crash
  recovery, updates Quick Start notification setup wording to match the current
  wizard, simplifies problem-history/export labels, makes the saved-report
  success path account-optional, and rewords generated reports with plain
  support language.
- Latest local zero-technical and broad-audience work adds a close path and
  plain recovery copy to Settings load failure, gives the empty application
  tracker clear "Go to Jobs" and "Import Job" paths, improves the Dashboard
  no-jobs recovery state, hides browser-import connection details under
  Advanced, explains location lookup without protocol jargon, broadens company
  suggestions and placeholders beyond technology, refreshes broad resume/mock
  ATS fixtures, and aligns E2E labels with the visible "Skills Interview" copy.
- Latest local zero-technical UX work keeps job import from dead-ending when a
  preview is missing details, wires Prepare Form into visible dashboard job
  cards, adds a Set Up Profile recovery action, and replaces stale
  `Settings > Application Assist` guidance with the sidebar Application Assist
  path in frontend and Rust recovery copy.
- Latest local support/privacy work makes saved support reports local-only in
  the UI, removes GitHub-first and shared-folder wording from the main support
  path, renames visible old report copy to safe support report copy,
  broadens generic Application Assist profile labels beyond code profiles, and
  hardens the Rust support report sanitizer for full URLs plus common token,
  password, and bookmarklet-token forms.
- Latest local bookmarklet privacy work removes the import helper token from
  renderer-facing config and mocks, copies the browser button through a Rust
  command, and adds IPC-minimization coverage so bookmarklet auth tokens do
  not drift back into React state.
- Latest local Application Assist resume-boundary work routes resume selection
  through a backend native file-picker command, copies selected files into
  app-owned local storage, sends the renderer only a token and display name,
  rejects renderer-supplied resume paths, validates legacy saved paths before
  form prep, and keeps resume attachment manual so saved resumes are not
  uploaded automatically.
- Latest local zero-technical copy work makes screening-answer setup ask for
  "question wording to look for", softens optional email setup language, labels
  USAJobs access as an access code with no coding needed, and removes
  GitHub-first wording from Deep Links troubleshooting.
- Latest local recovery-copy work replaces stale database recovery directions,
  separates cancelled settings restores from unreadable backup files, makes bad
  connection-link guidance provider-first without protocol or port jargon,
  keeps advanced raw problem export behind support wording, and gives failed
  job-link imports a browser-address-bar action instead of Schema.org or URL
  terminology.
- Latest local broad-audience source work keeps tech-heavy RemoteOK,
  WeWorkRemotely, HN Who's Hiring, Dice, and BuiltIn suggestions tied to
  technical searches instead of every remote or city-based search. It also
  broadens synonym matching and docs for healthcare, office, operations,
  public-sector, customer support, accounting, education, retail, and common
  non-software tools such as EMR/EHR, LMS, CRM, POS, inventory, QuickBooks,
  scheduling, compliance, and care coordination.
- Latest local source-health UX work adds plain "what to do" guidance to job
  source health rows, replaces connection-warning and check-speed jargon with
  support-action copy, and removes Cloudflare-protection wording from
  SimplyHired/Glassdoor setup warnings in favor of search-link or browser-link
  recovery paths.
- Latest local source-status UX work changes source-health summary, table,
  page-check, loading, and result labels to plain job-source wording, removes
  LinkedIn from source-health test fixtures, and adds source-boundary harness
  coverage for stale status labels.
- Latest local support-copy UX work changes troubleshooting helper text and
  safe app detail copy away from logs, diagnosis, and troubleshooting jargon,
  with product-copy harness coverage against those phrases.
- Latest local application-tracking UX work changes visible "Ghosted" labels
  and actions to "No Response" wording while keeping legacy internal status
  keys for compatibility, with product-copy coverage against old labels.
- Latest local toast privacy work sanitizes optional dev support details before
  toast display and adds privacy-logging harness coverage so raw enhanced error
  messages cannot be shown through `safeInvokeWithToast`.
- Latest local front-door support wording work replaces old report language
  with safe support report language in the root README, docs hub, and
  harness docs; product-copy coverage now includes those front-door and harness
  files.
- Latest local email-setup UX work changes the primary email alert path from
  server/password setup toward provider-first app-password guidance, keeps
  manual provider details in a secondary disclosure, and updates notification
  docs so non-technical users only need manual email details when their
  provider gives them.
- Latest local settings backup UX work replaces visible `Config` and
  `credentials` backup/restore wording with settings-backup and saved
  connection-detail language, and adds bloat coverage so the old technical
  copy cannot drift back into Settings.
- Latest local broad-audience fixture work rebalanced generic market
  intelligence, notifications, config, database, ATS, ghost detection, salary,
  scoring, generic scraper adapters, command, frontend mock, sample JSON
  Resume, company fallback, bookmarklet, import, dashboard search, score modal,
  Application Assist E2E, and mock data examples toward care coordination,
  public health, operations, training, inventory planning, account management,
  and customer support; it also extends the bloat sensor so the generic
  market-intelligence, generic scraper, salary-normalization, code-profile,
  sample-resume, bookmarklet, search-history, and score-modal fixture paths
  cannot drift back to software-only examples outside explicit branch coverage.
- Latest local IPC minimization work added narrow application profile
  existence/preview commands, canonicalizes imported URLs before
  preview/hash/storage, returns only `{ jobId }` from job import, and moves
  Dashboard to a minimal preferences DTO instead of full config.
- Latest pushed checkpoint is `2e28a55f` on `origin/main`. Remote CI and Docs
  Harness both passed for that commit after the broad-audience privacy and
  hiring-trend label slices were pushed.
- Latest local broad-audience copy slice removes remaining technical-first
  setup labels from Telegram and USAJobs settings, changes dashboard average
  score wording to average match, and makes Application Assist stats use plain
  forms-opened, marked-sent, and ready-to-send wording.
- Current local resume-copy slice removes standalone overall-score wording
  from visible resume review UI and keeps match/readability language centered
  for users who do not know scoring internals.
- Current local recovery-copy slice changes visible retry/dismiss buttons in
  Settings and Resume Readability to `Try Again` and `Close Message`, keeping
  recovery actions plain.
- Current local backend-copy slice changes database-domain user messages toward
  local-job-data wording so renderer fallbacks avoid database, query, schema,
  and disk I/O jargon.
- Current local support-panel slice keeps Error Log actions in safe support
  report language, changes the per-problem clear action to `Remove from List`,
  and replaces advanced-support wording in Quick Start.
- Current local interview-scheduling slice changes required-field, date, and
  duration validation to action-first guidance, and extends product-copy
  coverage against the old invalid/missing-field labels.
- Current local interview-form slice replaces asterisk required labels,
  slash-separated meeting-link wording, and select-placeholder copy with plain
  required-field and location guidance.
- Current local shortcut-label slice changes static navigation/help shortcut
  copy from mac-only command symbols to `Cmd/Ctrl` labels so Windows and macOS
  users get usable directions.
- Current local mouse-neutral copy slice replaces remaining click/drag-first
  guidance in onboarding, location detection, auto-refresh recovery,
  Application Assist, application tracking, cover-letter blanks, and browser
  import docs while preserving the "user submits applications" boundary.
- Current local CI follow-up fixes the stale Application Preview test
  expectation found by remote frontend CI and extends product-copy coverage
  against the old `click the submit button yourself` phrase.
- Current local resume-choice copy slice replaces the Application Profile
  generic resume-file picker label with `Choose Resume` and adds product-copy
  coverage against the stale file-manager label.
- Current local saved-search validation slice changes empty-name copy to
  `Name this search` with action guidance and focused hook coverage.
- Current local Resume skill-validation slice changes empty-skill copy to
  `Name the skill` with action guidance and focused page coverage.
- Current local Resume Optimizer validation slice changes missing-job-post and
  empty-bullet guidance to action-first copy, and empty Draft now shows guidance
  instead of doing nothing.
- Current local Application Assist profile fallback slice replaces remaining
  no-profile fallback wording with setup guidance and adds product-copy
  coverage against the stale title.
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
- Current local modal repeated-failure recovery follow-up replaces close-and
  try-later guidance with copy/save safe support report first, with focused
  modal-boundary and product-copy coverage.
- Current local page repeated-failure recovery follow-up replaces temporary
  unavailable warning copy with save-safe-support-report-first guidance, with
  focused page-boundary and product-copy coverage.
- Current local bookmarklet URL privacy follow-up canonicalizes browser-button
  job links before duplicate hashing or storage, stripping userinfo, fragments,
  tracking parameters, tokens, and candidate/email markers while preserving
  public job identifiers.
- Current local notification URL privacy follow-up routes Slack, Discord,
  Teams, Telegram, and email job links through the shared outbound minimizer
  before any optional off-device alert payload is built; non-public links are
  omitted or replaced with local-app guidance.
- Current local feedback/share privacy follow-up uses the backend
  support-report sanitizer for saved reports, copied safe reports, and GitHub
  issue clipboard content, including unlabeled employer, role, and layoff/job
  search narrative redaction.
- Current local broad-audience copy follow-up replaces jargon in Quick Start,
  resume import, privacy tables, match/posting-risk guidance, and source-health
  troubleshooting with plain job-seeker language.
- The previous local slice closed the hardcoded harness-policy debt by moving
  required harness files, policy snippets, and README reference-source coverage
  into `docs/harness/manifest.json`.
- Harness delivery, release preflight, external-AI provider scanning, and
  environment doctor platform/E2E readiness have current focused coverage.
- Active progress history older than 2026-05-31 is archived in
  [progress history](../archive/progress-history-2026-05-28-to-2026-05-29.md).
- Current branch state may include local commits not pushed to `origin/main`.
  Use `git status --short --branch` as live evidence before pushing or
  reporting remote status.

## Next Best Work

1. Continue broad-audience review on remaining visual/user-facing copy and
   preserve tech-specific cases only when they test explicit branch behavior or
   source-realism parser contracts.
2. Continue splitting oversized harness modules only where the ownership
   boundary is clear; use `npm run harness:session -- --json` for the current
   main bloat-runner line count.
3. Continue zero-technical-knowledge UX review across setup, settings,
   recovery, feedback, empty states, and error screens.
  The latest support-path, privacy-copy, USAJobs setup, Telegram setup,
  dashboard match-label, Application Assist stat-label, resume overall-match,
  recovery action-label, database user-message, and support-panel findings are
  closed locally; continue looking for new issues as later slices touch copy.
4. Continue broad-audience review so non-technical and technical job searches
   both feel first-class.
   The latest tech-source heuristic finding is closed locally; keep auditing
   setup defaults, examples, placeholders, and source recommendations as new
   slices touch broad-role behavior.
5. Continue backend/scraper and frontend privacy-edge review.
   The browser-button stored-URL and notification-channel URL minimization
   findings from the latest read-only security audit are closed locally.
   Feedback/share narrative redaction is closed locally. JobsWithGPT approval
   enforcement, visible approval-scope reminder, and local minimized
   source-request history are landed locally; `SEC-019` is closed in the debt
   tracker.
6. Continue the next zero-technical-knowledge UX audit area outside
   support/reporting.
7. Run final broad verification only when the remaining known work has evidence.

## Completion Bar

Do not mark the goal complete until current evidence proves:

- No known repo bloat, stale docs, generated artifacts, or duplicate sources of
  truth remain.
- No known privacy leak remains in logs, command errors, renderer messages,
  reports, credential paths, scraper errors, notifications, or local path
  exposure.
- No known user-facing flow assumes terminal, GitHub, debugging, or engineering
  knowledge.
- No known user-facing flow assumes the job seeker is only an engineer or only
  searching for technical work.
- Relevant sensors cover recurring drift classes.
- Final docs, bloat, security, architecture, frontend, build, Rust, and chosen
  E2E checks pass from the current checkout.
