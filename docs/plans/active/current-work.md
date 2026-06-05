# Current Product And Quality Work

Last updated: 2026-06-05.

## Problem

Active planning had become too fragmented. Four long active plans plus a long
status file made restart context expensive and encouraged stale duplicated
state. Current active work needs one maintained plan, one compact status file,
and archived history for provenance.

## Scope

In scope:

- Current product priorities: truthful local resume assistance, application
  readability, job-card posting protection, guided intake, pay-risk protection,
  and user-ease work.
- Cleanup only when it blocks critical functionality, Rule 0, verification, or
  zero-technical-knowledge usability.
- Plan compaction, active index cleanup, roadmap/doc links, and harness score
  expectations.

Out of scope:

- Claiming the broad repo-wide quality goal is complete.
- Deleting historical plan evidence.
- Broad product implementation unrelated to plan cleanup in this slice.
- Pushes, releases, remote CI runs, cloud actions, or credentialed vendor
  changes.

## Acceptance Criteria

- `docs/plans/active/` contains only current restart documents.
- Historical active plans are preserved under `docs/plans/archive/`.
- `docs/plans/index.json`, `docs/plans/README.md`, roadmap links, and harness
  score expectations match the compact active-plan model.
- `npm run harness:session` reports the compact active plan count and useful
  next-best work.
- Docs and harness checks pass for the changed files.
- Rule 0 is unchanged: local-first storage, credential safety, explicit user
  review, privacy-preserving defaults, and optional external AI remain intact.

## Current Workstreams

| Area | Status | Next useful slice |
| ---- | ------ | ----------------- |
| Resume assistance | Active | Improve truthful requirement review, hard-constraint handling, readable evidence, and next-action guidance only when evidence is local and explainable. |
| Job-card protection | Active | Keep stale, duplicate, scam-like, pay-risk, source-trust, and unclear-posting cues visible without implying employer-side prediction. |
| Guided intake | Active | Add optional resume/profile suggestions only after user review; avoid engineer-only defaults and technical assumptions. |
| Pay protection | Active | Keep missing, broad, thin, or anchoring-prone pay signals visible and plain-language. |
| Cleanup and harness | Active as needed | Fix stale docs, bloat, privacy/security, or verification gaps when they block current work. |

## Milestones

- [x] Review active plan count and harness constraints.
- [x] Archive superseded active plan docs while preserving history.
- [x] Create one compact current active plan.
- [x] Replace long active status with compact restart state.
- [x] Update repo docs, plan index, and harness score expectations.
- [x] Run focused docs and harness verification.
- [x] Record remaining open work in status and handoff.
- [x] Add local Resume Match hard-constraint review for required background,
  drug, and pre-employment screening.
- [x] Delegate read-only scouts for guided-intake and job-card next slices.
- [x] Show low-score stale or repost job-card evidence without implying
  employer intent.
- [x] Replace repeated-sighting job-card copy that implied separate sources
  with factual `Seen N times` wording.
- [x] Add missing-pay job-card guidance when a salary floor exists, while
  treating missing pay as a review cue rather than scam or stale-posting proof.
- [x] Add reviewed `Add all visible` and `Skip resume suggestions` controls
  around saved-resume skill suggestions.
- [x] Add low-detail job-card guidance for broad titles and thin descriptions
  without claiming employer intent.
- [x] Clean frontend lint warnings in application preview and dashboard fit
  labeling so verification output is easier to trust.
- [x] Run broader frontend build and smoke E2E checks for the current active
  frontend batch.
- [x] Replace technical-first quick-start, browser-button, and support-log copy
  surfaced by read-only zero-technical-knowledge audit.
- [x] Add hard-screening saved-answer review guidance for legal, screening,
  credential, physical, and age-related application questions.
- [x] Gate negotiation-note drafts on user-entered offer and target range facts,
  so benchmark evidence cannot become an invented current offer.
- [x] Preserve vague user wording in drafted resume bullets instead of turning
  it into unverified ownership or development claims.
- [x] Add office/admin, retail/hospitality, and trades/field first-run presets
  that stay off tech-heavy job sources by default.
- [x] Replace outside-AI unreviewed-detail errors that exposed payload,
  field, and classification wording.
- [x] Replace raw `url` labels in safe support report activity details with a
  readable **Link** label.
- [x] Treat saved screening-answer wording as local plain text instead of raw
  regex, preserving literal symbols such as `Security+`.
- [x] Show stale or repost job-card evidence even when the aggregate
  posting-risk score is unavailable.
- [x] Keep dev mock short-credential matching bounded so terms such as `RN`
  do not match inside unrelated words.
- [x] Label missing job-card source data as unavailable instead of implying a
  source label came from the posting.
- [x] Show hard-question review for visible education wording, not only degree
  or diploma wording, when saved education answers can help user review.
- [x] Make App Problem History explain that crash details stay hidden on screen
  and safe support reports should be reviewed before sharing.
- [x] Show hard-question review for visible schedule, available, and notice
  period wording when saved availability answers can help user review.
- [x] Replace visible App Problem History `url` context labels with readable
  link labels while keeping existing link sanitization.
- [x] Align resume live-score missing-word buckets with the documented
  **Nice-to-Have or Other to Review** label.
- [x] Replace resume suggestion **Add job words** labels with
  **Review job words** so wording stays truth-first.
- [x] Show job-import closing dates when the posting preview includes them, and
  preserve source posting dates across local time zones.
- [x] Align dev mock hard schedule/location constraints with Rust/docs for
  remote, hybrid, overtime, holiday, full-time, and part-time wording.
- [x] Label job-import preview pay as listed pay so posting pay stays framed as
  source evidence to review.
- [x] Show live Resume Builder must-have checks when local hard constraints
  need review before tailoring.
- [x] Use plain evidence labels for matched job words, not raw backend section
  names.
- [x] Use plain evidence labels in live Resume Builder matched-word tooltips.
- [x] Sync Resume Builder docs with live must-have review behavior.
- [x] Treat non-finite job fit scores as unavailable instead of saved zero-fit
  estimates.
- [x] Treat out-of-range job fit scores as unavailable instead of impossible
  percentages.
- [x] Keep invalid job fit scores from opening fit details or marking cards as
  elevated local-fit results.
- [x] Treat invalid posting-risk scores as unavailable while preserving parsed
  stale or repost evidence.
- [x] Hide malformed listed-pay values instead of showing negative, infinite,
  or reversed ranges as pay evidence.
- [x] Treat reversed listed-pay ranges as unavailable for salary-floor guidance.
- [x] Show plain unavailable copy for invalid relative dates instead of
  `Invalid Date`.
- [x] Use the same invalid-date fallback across shared date and time
  formatters.
- [x] Show plain unavailable copy for malformed job-import preview dates.
- [x] Show missing listed-pay guidance in job-import preview.
- [x] Treat malformed resume review scores as unavailable while preserving
  local evidence details.
- [x] Use listed-pay wording and malformed-pay fallback in dashboard
  comparison rows.
- [x] Show plain unavailable copy for malformed dashboard comparison posted
  dates.
- [x] Start oversized-file modularization by extracting resume analyzer result
  types from the 8k-line analyzer module.
- [x] Split resume analyzer tests out of the runtime analyzer file.
- [x] Split Settings icon and config helper code out of the main Settings page.
- [x] Split mock deep-link and job-import helpers out of the main mock handler.
- [x] Split mock support-report helpers out of the main mock handler.
- [x] Split mock resume analysis score assembly out of the main mock handler.
- [x] Split mock command helper and type definitions out of the main mock
  handler.
- [x] Split Settings additional job board UI out of the main Settings page.
- [x] Split resume analyzer bullet prompt helpers out of the runtime analyzer.
- [x] Split DB no-database model tests out of the main DB test file.
- [x] Split DB visibility and bookmark tests out of the main DB test file.
- [x] Split broad-audience bloat integration tests out of the main bloat test
  file.
- [x] Split docs-drift bloat integration tests out of the main bloat test file.
- [x] Split developer-doc bloat integration tests out of the docs-drift bloat
  test file.
- [x] Split feature-doc bloat integration tests out of the main bloat test file.
- [x] Split core privacy/logging bloat integration tests out of the main bloat
  test file.
- [x] Split privacy IPC and notification bloat integration tests out of the main
  bloat test file.
- [x] Split privacy command bloat integration tests out of the main bloat test
  file.
- [x] Split frontend error-report and security-doc bloat integration tests out
  of the main bloat test file.
- [x] Split feedback/privacy, mock-handler, recovery-copy, and score-copy bloat
  integration tests out of the main bloat test file.
- [x] Split product-copy and pay-framing bloat integration tests out of the main
  bloat test file.
- [x] Split source-quality, source-structure, dependency, and E2E guidance bloat
  integration tests out of the main bloat test file.
- [x] Retire the main bloat test file's legacy oversized-file exception after
  bringing it below the 1,200-line test target.
- [x] Split settings-focused product-copy fixture coverage out of the main
  product-copy test file.
- [x] Split support/docs product-copy fixture coverage out of the main
  product-copy test file.
- [x] Split resume-focused product-copy fixture coverage out of the main
  product-copy test file.
- [x] Retire the main product-copy test file's legacy oversized-file exception
  after bringing it below the 1,200-line test target.
- [x] Split technical-first fallback product-copy pattern coverage out of the
  main product-copy checker module.
- [x] Split technical-first preflight product-copy routing out of the main
  product-copy checker module.
- [x] Split technical-first docs and UI product-copy routing out of the main
  product-copy checker module.
- [x] Retire the product-copy checker module's legacy oversized-file exception
  after bringing it below the 900-line script target.
- [x] Split DB job notes tests out of the main DB test file.
- [x] Split resume analyzer keyword term-expansion helpers out of the runtime
  analyzer.
- [x] Split scheduler scraper-cycle tests out of the main scheduler test file.
- [x] Split Lever JSON parsing and edge-case tests out of the main Lever test
  file.
- [x] Split Settings job-board recommendation logic out of the main Settings
  page.
- [x] Lock the whole public GitHub wiki inventory into the harness manifest and
  PR/change-contract review path.
- [x] Split DB search tests out of the main DB test file.
- [x] Split resume plain-text format helpers out of the runtime ATS analyzer.
- [x] Split structured ATS resume format checks out of the runtime ATS analyzer
  and retire its legacy oversized-file exception.
- [x] Split scheduler basic lifecycle/config tests out of the main scheduler
  test file.
- [x] Split scheduler interval and result model tests out of the main scheduler
  test file.
- [x] Split scheduler start-loop coverage tests out of the main scheduler test
  file and retire its legacy oversized-file exception.
- [x] Split scheduler error-path coverage tests out of the main scheduler test
  file.
- [x] Split scoring company tests out of the main scoring module.
- [x] Split remaining inline scoring tests out of the main scoring module and
  retire its legacy oversized-file exception.
- [x] Split Lever scrape-company flow tests out of the main Lever test file and
  retire its legacy oversized-file exception.
- [x] Split Resume Match result-panel rendering and display tests out of the
  main page and page test while keeping product-copy scanners on the moved UI.
- [x] Split mock resume bullet prompt tests out of the broad mock resume
  command test.
- [x] Split mock resume summary and text-preview view helpers out of the main
  mock handler.
- [x] Split mock degree-specialization hard-constraint tests out of the broad
  hard-constraint test file.
- [x] Split scraper and source-health fixture coverage out of the feature-doc
  bloat test file.
- [x] Split Lever remote-inference tests out of the main Lever scraper test
  file.
- [x] Split Market Intelligence async tests out of the main test file and
  retire its legacy oversized-file exception.
- [x] Split Greenhouse scraper tests out of the runtime scraper file and retire
  its legacy oversized-file exception.
- [x] Split Slack notification tests out of the runtime notification file and
  retire its legacy oversized-file exception.
- [x] Split Teams notification tests out of the runtime notification file and
  retire its legacy oversized-file exception.
- [x] Split Discord notification tests out of the runtime notification file and
  retire its legacy oversized-file exception.
- [x] Split Market Intelligence analytics tests out of the runtime analytics
  file and retire its legacy oversized-file exception.
- [x] Split ghost detection tests out of the runtime ghost module and retire
  its legacy oversized-file exception.
- [x] Split salary predictor tests out of the runtime salary predictor and
  retire its legacy oversized-file exception.
- [x] Split automation answer-learning commands and response tests out of the
  main automation command module and retire its legacy oversized-file exception.
- [x] Split the privacy-logging harness checker into focused detector modules
  and retire its legacy oversized-file exception.
- [x] Split mock user-data, job-tracking, settings, and support command bodies
  out of the main mock handler and retire its legacy oversized-file exception.
- [x] Split ATS status, reminder, and stats edge tests out of the main ATS test
  file and retire its legacy oversized-file exception.
- [x] Split resume database coverage tests out of the main resume test file and
  retire its legacy oversized-file exception.
- [x] Split Application Preview hard-screening tests out of the main component
  test file and retire its legacy oversized-file exception.
- [x] Split Application Preview saved hard-screening answer tests out of the
  focused screening test file.
- [x] Split Screening Answers Form interaction tests out of the main component
  test file and retire its legacy oversized-file exception.
- [x] Split ATS badge tests out of the main Apply Button test file and retire
  its legacy oversized-file exception.
- [x] Split Settings loadConfig tests out of the main Settings test file and
  retire its legacy oversized-file exception.
- [x] Split user-data inline tests out of the runtime module and retire its
  legacy oversized-file exception.
- [x] Split resume template renderer tests out of the runtime module and retire
  its legacy oversized-file exception.
- [x] Split Interview Scheduler icon components out of the main scheduler
  component and retire its legacy oversized-file exception.
- [x] Split docs drift checker constants out of the main checker and retire its
  legacy oversized-file exception.
- [x] Move the root README reference index into a focused references doc and
  retire the root README legacy oversized-file exception.
- [x] Split Dashboard job comparison UI out of the main page and retire its
  legacy oversized-file exception.
- [x] Split resume skill extractor tests out of the runtime module and retire
  its legacy oversized-file exception.
- [x] Split salary benchmark tests out of the runtime module and retire its
  legacy oversized-file exception.
- [x] Split resume matcher tests out of the runtime module and retire its
  legacy oversized-file exception.
- [x] Split Settings search-preference UI out of the main Settings page.
- [x] Split Resume Builder data transforms out of the main Resume Builder page.
- [x] Split DB duplicate tests out of the main DB test file.
- [x] Split config email alert tests out of the main config test file.
- [x] Split config Discord alert tests out of the main config test file.
- [x] Split config Telegram alert tests out of the main config test file.
- [x] Split config Teams alert tests out of the main config test file.
- [x] Split config source URL tests out of the main config test file.
- [x] Split config property-based validation tests out of the main config test
  file.
- [x] Retire the config test file's legacy oversized-file exception after
  bringing it below the 1,200-line test target.
- [x] Split DB edge-case tests out of the main DB test file.
- [x] Split DB query-error tests out of the main DB test file.
- [x] Split DB statistics coverage tests out of the main DB test file.
- [x] Split DB upsert coverage tests out of the main DB test file.
- [x] Split DB bookmark coverage tests out of the main DB test file.
- [x] Split DB duplicate-merge coverage tests out of the main DB test file.
- [x] Split DB score/source/recent job query tests out of the main DB test
  file.
- [x] Split DB field-update, ghost, repost, and company-count tests out of the
  main DB test file.
- [x] Retire the main DB test file's legacy oversized-file exception after
  bringing it below the 1,200-line test target.
- [x] Split DB integrity model tests out of the main integrity test file.
- [x] Split DB integrity backup tests out of the main integrity test file and
  retire its legacy oversized-file exception.
- [x] Split Settings notification UI out of the main Settings page and retire
  its legacy oversized-file exception.
- [x] Split ATS hard-constraint helpers out of the runtime analyzer.
- [x] Split ATS requirement-review helpers out of the runtime analyzer.
- [x] Add no-account macOS release-readiness harness gating and stricter
  future Developer ID verification checks.
- [x] Split Setup Wizard preference helpers, summary UI, location option, and
  icons out of the main page and retire its legacy oversized-file exception.
- [x] Split Resume Builder template thumbnail and export/delete icons out of
  the main page and tighten its legacy oversized-file budget.
- [x] Split resume review job-word overview display out of the main page
  and tighten its legacy oversized-file budget.
- [x] Split Resume Match model helpers, icons, resume library dropdown, and
  readable-text preview modal out of the main page and retire its legacy
  oversized-file exception.
- [x] Split Resume Builder preview step out of the main page and tighten its
  legacy oversized-file budget.
- [x] Split Resume Match Helper model helpers out of the main page and retire its
  legacy oversized-file exception.
- [x] Reuse focused Resume Builder step components from the main page and retire
  the final legacy oversized-file exception.
- [x] Block unsafe saved job links before custom dashboard open callbacks can
  receive the link.
- [x] Keep first-run tech-heavy source suggestions off until the user checks
  them in review.
- [x] Add saved screening-answer aliases for plain quick-add wording such as
  authorized-to-work, lifting, degree, weekend-shift, and reliable-vehicle
  questions.
- [x] Show hard-question review guidance for saved-answer quick-add topics such
  as schedule, education, transportation, salary, start date, language,
  management, travel, and relocation.
- [x] Show hard-question review guidance on saved-answer suggestion cards
  before the user chooses **Use**.
- [x] Return bounded saved-answer review topics from live Application Assist
  fill results without exposing saved answers or exact question text.
- [x] Keep saved-resume skill source context visible in final first-run review
  after the user adds resume suggestions.
- [x] Report Resume Match citizenship requirements as a distinct hard-review
  category instead of generic work authorization.
- [x] Add file-size headroom by splitting the Resume Match fit-breakdown row
  out of `src/pages/Resume.tsx`.
- [x] Keep first-run desktop alerts off until the user explicitly turns them
  on.
- [x] Route low-detail card warnings through posting-risk filters.
- [x] Let Resume Builder users continue without education entries.
- [x] Gate Resume Builder saved-job context on the same valid/recent check as
  the live review panel.
- [x] Cap Resume Match hard constraints when required evidence is missing,
  partial, or only implied.
- [x] Add future-opportunity, talent-pool, and we-are-hiring titles to
  low-detail posting warnings.
- [x] Keep first-run/profile defaults broad by selecting all work-location
  modes and leaving salary floor unset until user choice.
- [x] Suggest SimplyHired as an optional broad public source for
  non-technical first-run searches while keeping it off until user opt-in.
- [x] Move first-run source-review state into a focused helper so the setup
  page stays farther below the file-size limit after source additions.
- [x] Let first-run users enter hourly pay floors and save them as yearly
  comparison floors without losing hourly review copy.
- [x] Route possible scam-sign card warnings through the Posting Risk filters
  so **Lower Risk** and **Needs Review** match card guidance.
- [x] Treat clean-driving-record, MVR, auto-insurance, and insured-vehicle
  wording as Resume Match hard requirements.
- [x] Move first-run hourly pay controls into a focused component so the setup
  page stays below the file-size limit.
- [x] Treat car-insurance wording as Resume Match evidence for auto-insurance
  hard requirements.
- [x] Move Resume Match recent-match rendering into a focused component so the
  page stays close to the file-size limit.
- [x] Move Resume Builder progress, export, navigation, and job-context UI into
  focused components so the main page sits under the file-size limit.
- [x] Move local company-research fallback data into a focused module so the
  panel stays small and behavior-focused.
- [x] Move Interview Scheduler add-interview modal into a focused component so
  the scheduler stays under the file-size limit.

## Orchestration Log

2026-06-04:

- Guided-intake scout was read-only and changed no files. Best next slice:
  `Add all visible` and `Skip resume suggestions` around existing saved-resume
  skill chips in setup, keeping suggestions local and reviewed.
- Job-card scout was read-only and changed no files. Best next slice: surface
  stale or repost reasons even when aggregate posting-risk score is below the
  normal badge threshold, using factual "verify before tailoring" copy.
- Coordinator implemented the low-score stale/repost job-card cue locally
  because it touched one component, one component test, docs, and active plan
  state.
- Coordinator implemented the `times_seen` wording fix locally because it
  touched one component, one component test, docs, and active plan state.
- Coordinator implemented the resume hard-constraint slice locally because it
  touched shared analyzer, mock, UI, docs, and tests.
- Coordinator implemented the missing-pay salary-floor cue locally because it
  touched one component, one component test, feature docs, and active plan
  state.
- Guided-intake sidecar implemented reviewed bulk controls for saved-resume
  skill suggestions in `SetupWizard`. Coordinator reviewed the diff and reran
  focused `SetupWizard` tests and ESLint before accepting it.
- Coordinator implemented the low-detail job-card cue locally because it extends
  the same posting-risk component, tests, feature docs, and active plan state.
- Coordinator cleaned the remaining frontend lint warnings by tightening
  Application Preview hard-question dependency tracking and moving dashboard fit
  label formatting out of the component module.
- Coordinator ran production frontend build and smoke E2E budget checks against
  the current active frontend batch.
- Zero-technical-knowledge audit sidecar was read-only and changed no files.
  Coordinator accepted its Quick Start, Browser Button, and support-log findings
  and implemented the copy fixes locally with focused tests.
- Coordinator added local hard-screening review guidance to saved screening
  answers because it touched one Application Assist component, one focused test
  file, feature docs, and active plan state.
- Coordinator extended the same hard-screening review guidance to saved-answer
  suggestion cards so a hard-topic suggested answer cannot sit next to **Use**
  without exact-question review copy.
- Coordinator kept saved-resume skill context visible in first-run final review
  so added local resume skills do not collapse into unlabeled search keywords.
- Coordinator split citizenship into its own Resume Match hard-review category
  while keeping older work-authorization citizenship payloads readable.
- Coordinator moved the Resume Match fit-breakdown row into a focused
  component so the main Resume page stays farther from the harness line limit.
- Coordinator changed first-run desktop alerts from quiet-on to explicit opt-in
  so shared-device notifications do not start without user choice.
- Coordinator aligned posting-risk filters with low-detail card warnings so
  broad or thin postings no longer remain in **Lower Risk** results.
- Coordinator made Resume Builder education optional so users without degree,
  certificate, or training entries do not need to invent data to finish.
- Coordinator shared the saved Resume Match context validator between Resume
  Builder, Resume Match, and the live review panel so malformed or expired
  context is cleared before **Tailoring for Job** appears.
- Coordinator changed hard-constraint score caps to cover missing, partial, and
  implied required evidence, so skills-only hard must-haves still require
  user review before a high fit label.
- Coordinator aligned frontend low-detail posting guidance with backend
  vague-title evidence for future-opportunity, talent-pool, and we-are-hiring
  titles.
- Coordinator removed silent first-run narrowing by making default/profile
  searches include remote, hybrid, and on-site while leaving pay floor unset
  until the user enters one.
- Coordinator added an optional SimplyHired suggestion for non-technical
  first-run searches, filling its query from reviewed titles and skills only
  after the user checks the source.
- Coordinator moved first-run source-review checked-state and opt-in source
  toggling into `src/pages/setupWizardSourceReviewState.ts`, dropping the main
  setup page from 1,173 to 1,119 lines without changing review behavior.
- Coordinator added first-run hourly pay floor entry, converting hourly values
  to yearly saved floors for pay comparisons while showing hourly meaning in
  setup review.
- Coordinator shared possible-scam posting cues with the Posting Risk filters
  so red scam-sign card warnings no longer stay in **Lower Risk** results.
- Coordinator added Resume Match hard-constraint extraction and conservative
  equivalence for clean driving record, MVR, proof of auto insurance, and
  insured-vehicle wording.
- Coordinator moved first-run pay-floor controls into
  `src/pages/SetupWizardPayFloorSection.tsx`, reducing the main setup page from
  1,166 to 1,101 lines without changing hourly or yearly pay behavior.
- Coordinator added conservative Resume Match equivalence for car-insurance
  wording when a posting requires proof of auto insurance.
- Coordinator moved the Resume Match recent-match card into
  `src/pages/ResumeRecentMatches.tsx`, reducing the main resume page from 1,171
  to 1,003 lines without changing score or gap rendering.
- Coordinator moved Resume Builder progress, export, navigation, and
  job-context rendering into focused components, reducing the main builder page
  from 1,106 to 996 lines without changing builder flow.
- Coordinator moved local company-research fallback data into
  `src/components/companyResearchData.ts`, reducing the panel from 1,125 to 489
  lines while preserving known, cached, and unknown company behavior.
- Coordinator accepted the Interview Scheduler sidecar's read-only audit and
  moved the add-interview modal into `src/components/InterviewScheduleFormModal.tsx`,
  reducing the scheduler from 1,166 to 999 lines without changing form labels,
  shortcut handling, validation copy, or scheduling ownership.
- Coordinator moved Resume Match result-panel rendering into
  `src/pages/ResumeOptimizerResultsPanel.tsx` and direct display assertions
  into `src/pages/ResumeOptimizerResultsPanel.test.tsx`, reducing the page from
  1,098 to 501 lines and the page test from 1,183 to 479 lines while keeping
  product-copy and broad-audience scanners on the moved UI.
- Coordinator moved mock `improve_bullet_point` prompt guidance coverage into
  `src/mocks/handlers/resumeBulletPrompts.test.ts`, reducing the broad mock
  resume command test from 1,196 to 1,058 lines.
- Coordinator moved mock resume summary and text-preview view helpers into
  `src/mocks/handlers/resumeSummaryViews.ts`, reducing the main mock handler
  from 1,183 to 1,134 lines without changing resume selection or preview
  behavior.
- Coordinator moved scraper and source-health fixture coverage into
  `scripts/check-repo-bloat-source-docs.test.mjs`, reducing the feature-doc
  bloat test file from 1,188 to 933 lines.
- Coordinator moved Lever remote-inference tests into
  `src-tauri/src/core/scrapers/lever/tests/remote_inference_tests.rs`,
  reducing the main Lever test file from 1,185 to 1,040 lines.
- Coordinator moved Application Preview saved hard-screening answer assertions
  into `src/components/automation/ApplicationPreview.savedScreeningAnswers.test.tsx`,
  reducing the focused screening test file from 1,176 to 340 lines.
- Coordinator moved developer-doc bloat fixture coverage into
  `scripts/check-repo-bloat-developer-docs.test.mjs`, reducing the docs-drift
  bloat test file from 1,176 to 847 lines.
- Coordinator moved resume-focused product-copy fixture coverage into
  `scripts/check-product-copy-resume.test.mjs`, reducing the main product-copy
  test file from 1,164 to 879 lines.
- Coordinator moved config property-based validation tests into
  `src-tauri/src/core/config/tests/property_tests.rs`, reducing the main config
  test file from 1,163 to 938 lines.
- Coordinator moved DB field-update, ghost, repost, and company-count tests
  into `src-tauri/src/core/db/tests/tests/job_field_update_tests.rs`, reducing
  the main DB test file from 1,158 to 912 lines.
- Coordinator moved scheduler error-path coverage tests into
  `src-tauri/src/core/scheduler/tests/error_path_tests.rs`, reducing the main
  scheduler test file from 1,155 to 739 lines.
- Coordinator moved degree-specialization hard-constraint assertions into
  `src/mocks/handlers/resumeDegreeSpecializations.test.ts`, reducing the broad
  hard-constraint test file from 1,151 to 805 lines.
- Pay-protection sidecar was read-only and changed no files. Coordinator
  accepted its finding that negotiation-note drafts could treat benchmark
  values as offer facts, then fixed the Salary page, dev mock, tests, feature
  docs, and active plan state locally.
- Truthful-resume sidecar was read-only and changed no files. Coordinator
  accepted its finding that drafted alternative bullets could upgrade vague
  user wording into stronger ownership or development claims, then fixed the
  Rust analyzer, focused tests, feature docs, and active plan state locally.
- Coordinator added non-technical first-run presets locally because it extends
  the existing guided-intake profile data, selector order, focused tests,
  feature docs, and active plan state without changing storage or source
  contact behavior.
- Coordinator replaced outside-AI blocked-send wording locally because it
  touched one gateway service, one focused test, feature docs, and active plan
  state while preserving the existing no-send guard.
- Coordinator replaced the safe support report `url` activity label locally
  because it touched one feedback service, one focused test, feature docs, and
  active plan state while preserving existing sanitization.
- Screening-answer matcher scout was read-only and changed no files.
  Coordinator accepted its finding that saved wording like `Security+` could be
  interpreted as regex and overmatch unrelated security questions, then fixed
  Rust matchers, dev mocks, UI validation copy, focused tests, feature docs, and
  active plan state locally.
- Coordinator fixed the job-card stale/repost cue locally because valid
  posting-risk reasons could be present while the aggregate score was missing.
  The card now keeps the factual **Check posting evidence** guidance visible in
  that case without implying employer intent.
- Coordinator aligned dev mock resume matching with backend term-boundary
  behavior because short credentials such as `RN` could match inside unrelated
  words like `intern`. The mock now uses bounded keyword frequency for
  requirement evidence.
- Coordinator fixed missing source-label guidance locally because blank source
  data could read like a posting-provided source label. The card helper now
  labels it as **Source not shown** and asks users to open the original posting
  before tailoring.
- Application-preview scout was read-only and changed no files. Coordinator
  accepted its finding that visible `education` wording did not trigger
  hard-question review, then added the education trigger and focused preview
  test locally.
- Coordinator clarified App Problem History safe-report copy locally because
  expanded problem rows did not explain why crash details stayed off screen or
  that users should review reports before sharing.
- Coordinator aligned Application Preview salary-or-availability triggers with
  saved-answer matching and feature docs by adding visible `schedule`,
  `available`, and `notice period` triggers plus a focused schedule test.
- Coordinator replaced raw URL-like context labels in App Problem History with
  **link** or **job link**, matching safe-report guidance that visible details
  should not expose raw `url` field names.
- Coordinator aligned the resume live-score detail modal with Resume Match docs
  by replacing the third missing-word bucket label with **Nice-to-Have or Other
  to Review** and adding focused group coverage.
- Coordinator changed resume suggestion category labels from **Add job words**
  to **Review job words** in both live-score review and Resume Match, preserving
  the existing truth-first suggestion text.
- Coordinator showed posting closing dates in Job Import preview when the
  backend preview already includes `valid_through`, then fixed import preview
  date formatting so source dates do not shift a day earlier in local time
  zones.
- Resume mock parity scout was read-only and changed no files. Coordinator
  accepted its finding that dev mock hard-constraint extraction missed remote,
  hybrid, overtime, holiday, full-time, and part-time groups that Rust/docs
  already cover, then patched the mock and focused tests locally.
- Coordinator changed the job-import preview pay label from salary to listed
  pay so imported posting pay stays review-first and does not read like a
  guaranteed salary.
- Coordinator added a **Must-Haves To Check** section to the live Resume
  Builder detail modal so hard-constraint risks received from local analysis no
  longer stay hidden behind the score.
- Coordinator reused the existing plain evidence-label formatter for matched
  job-word rows so **Found in** text says current role experience and skills
  list instead of raw backend section names.
- Coordinator added the same plain evidence-label treatment to live Resume
  Builder word-match tooltips.
- Coordinator synced `docs/features/resume-builder.md` so the live-review
  section names must-have checks as well as missing job-word buckets.
- Coordinator fixed `ScoreDisplay` so non-finite fit scores show **No fit yet**
  with `--`, preserving `0%` for actual saved zero-fit estimates.
- Coordinator extended the same fallback to finite scores outside the supported
  `0` to `1` range, preventing impossible negative or over-100 fit percentages.
- Coordinator updated job cards to use the same valid-score rule before adding
  elevated local-fit labels, opening Fit Details, or applying highlighted fit
  styling.
- Coordinator applied the same `0` to `1` validation to posting-risk scores so
  invalid values cannot create stronger warning badges, while parsed stale or
  repost reasons still show **Check posting evidence**.
- Coordinator tightened `formatSalaryRange` so malformed listed-pay values are
  treated as unavailable instead of appearing as real pay evidence.
- Coordinator aligned job-card salary-floor guidance with that formatter so
  reversed structured ranges use missing-pay review guidance instead of a
  below-floor warning.
- Coordinator updated `formatRelativeDate` so invalid timestamps show **Date
  not shown** instead of leaking JavaScript's `Invalid Date` text.
- Coordinator reused that **Date not shown** fallback across event, date-time,
  interview, compact, and future-date formatters.
- Coordinator applied the same plain fallback to job-import preview posting and
  closing dates so malformed source dates remain reviewable without exposing
  JavaScript date-parser text.
- Job-card/pay scout was read-only and changed no files. Coordinator accepted
  its finding that job-import preview hid missing listed pay, then added a
  plain **Listed pay not shown** review cue without claiming employer intent.
- Resume assistance scout was read-only and changed no files. Coordinator
  accepted its finding that malformed local score values could drive misleading
  labels or progress widths, then added score-display validation while keeping
  requirement, word, and must-have evidence visible.
- Coordinator updated dashboard comparison pay rows locally because they still
  hand-formatted salary fields instead of using the shared malformed-pay
  fallback. The comparison now says **Listed Pay** and shows **Not listed** for
  unavailable pay evidence.
- Coordinator updated dashboard comparison posted-date rows locally because they
  still formatted dates directly. Malformed posted-date evidence now shows
  **Date not shown** instead of JavaScript date-parser text.
- After the file-size audit, coordinator started with the largest active code
  file. Resume analyzer DTOs and enums moved to `ats_types.rs`, preserving the
  existing public `crate::core::resume::*` exports and analyzer behavior.
- Coordinator then moved the embedded resume analyzer tests to
  `ats_analyzer_tests.rs`, reducing `ats_analyzer.rs` from roughly 8.5k lines to
  roughly 3.4k lines without changing analyzer APIs or behavior.
- Coordinator split `Settings.tsx` presentation icons into `SettingsIcons.tsx`
  and DTO, preset, credential, and import-validation helpers into
  `SettingsConfig.ts`, reducing the main Settings page from roughly 4.9k lines
  to roughly 4.0k lines without changing settings behavior.
- Read-only subagent Helmholtz audited `src/mocks/handlers.ts` and changed no
  files. Best next low-risk mock split is deep-link and job-import helpers,
  then support-report helpers, then scraper-health and interview mock helpers.
- Coordinator moved the deep-link, job-import preview, imported-job builder,
  and external URL safety helpers into
  `src/mocks/handlers/sourceLinksAndImports.ts`. The root mock handler keeps
  mutable `jobs` state and save behavior, so reset and persistence semantics
  stay local to the main mock state.
- Coordinator moved safe support-report generation, filename sanitizing,
  redaction, mock system info, and config-summary helpers into
  `src/mocks/handlers/supportReports.ts`. The root mock handler passes current
  config and active-resume state explicitly to avoid hidden state capture.
- Coordinator moved ATS platform detection helpers into
  `src/mocks/handlers/atsPlatform.ts`. The root mock handler keeps
  application-form fill state and attempt IDs local, while the extracted helper
  owns pure platform detection and form-field metadata.
- Coordinator moved Settings help/status, backup, and support-report UI into
  `src/pages/SettingsSupportSections.tsx`. The root Settings page keeps
  modal, backup, and support-report state ownership.
- Coordinator moved resume bullet-improvement prompt helpers into
  `src/mocks/handlers/resumeBulletPrompts.ts`. The root mock handler keeps
  keyword extraction and injects it into the extracted prompt helper.
- Coordinator moved resume section parsing and review guard helpers into
  `src/mocks/handlers/resumeAnalysisSections.ts`. The root mock handler keeps
  analysis scoring and keyword extraction.
- Coordinator moved resume requirement review and hard-constraint helper logic
  into `src/mocks/handlers/resumeRequirementReview.ts`. The root mock handler
  keeps keyword extraction, evidence matching, scoring, and command dispatch.
- Coordinator moved resume keyword extraction, conservative term expansion,
  evidence-location matching, and evidence frequency helpers into
  `src/mocks/handlers/resumeKeywordMatching.ts`. The root mock handler keeps
  analysis score assembly and command dispatch.
- Coordinator moved resume format review and job-fit score assembly into
  `src/mocks/handlers/resumeAnalysisRunner.ts`. The root mock handler keeps
  command dispatch, mutable mock state, and bullet prompt keyword injection.
- Coordinator moved Settings additional job board presentation into
  `src/pages/SettingsJobSourcesSection.tsx` and shared secure-credential badge
  copy into `src/pages/SettingsSecurityBadge.tsx`. The root Settings page keeps
  config, source-approval, and credential state ownership.
- Coordinator moved resume bullet action-word list and role-specific evidence prompts
  into `src-tauri/src/core/resume/ats_analyzer/bullet_prompts.rs`.
  `AtsAnalyzer` keeps the public API and analysis orchestration.
- Coordinator moved DB model, serialization, timeout, and path tests into
  `src-tauri/src/core/db/tests/tests/model_tests.rs`. The root DB test file keeps
  integration-style database operation tests and shared fixtures.
- Coordinator moved DB hide, unhide, hidden-query, and bookmark operation tests
  into `src-tauri/src/core/db/tests/tests/job_visibility_tests.rs`. The root DB
  test file keeps shared fixtures and remaining database operation tests.
- Coordinator moved broad-audience `checkRepoBloat` integration tests into
  `scripts/check-repo-bloat-broad-audience.test.mjs`. The root bloat integration
  test keeps aggregate sensor smoke coverage.
- Coordinator moved docs-drift `checkRepoBloat` integration tests into
  `scripts/check-repo-bloat-docs-drift.test.mjs`. The root bloat integration
  test keeps aggregate sensor smoke coverage.
- Coordinator moved feature-doc `checkRepoBloat` integration tests into
  `scripts/check-repo-bloat-feature-docs.test.mjs`. The root bloat integration
  test keeps aggregate sensor smoke coverage.
- Coordinator moved core privacy/logging `checkRepoBloat` integration tests into
  `scripts/check-repo-bloat-privacy-core.test.mjs`. The root bloat integration
  test keeps aggregate sensor smoke coverage.
- Coordinator moved privacy IPC and notification `checkRepoBloat` integration
  tests into `scripts/check-repo-bloat-privacy-ipc.test.mjs`. The root bloat
  integration test keeps aggregate sensor smoke coverage.
- Coordinator moved privacy command `checkRepoBloat` integration tests into
  `scripts/check-repo-bloat-privacy-commands.test.mjs`. The root bloat
  integration test keeps aggregate sensor smoke coverage.
- Coordinator moved frontend error-report and security-doc `checkRepoBloat`
  integration tests into `scripts/check-repo-bloat-frontend-security.test.mjs`.
  The root bloat integration test keeps aggregate sensor smoke coverage.
- Coordinator moved feedback/privacy, mock-handler, recovery-copy, and
  score-copy `checkRepoBloat` integration tests into
  `scripts/check-repo-bloat-feedback-privacy.test.mjs`. The root bloat
  integration test keeps aggregate sensor smoke coverage.
- Coordinator moved product-copy and pay-framing `checkRepoBloat` integration
  tests into `scripts/check-repo-bloat-product-copy.test.mjs`. The root bloat
  integration test keeps aggregate sensor smoke coverage.
- Coordinator moved source-quality, source-structure, dependency, and E2E
  guidance `checkRepoBloat` integration tests into
  `scripts/check-repo-bloat-source-quality.test.mjs`. The root bloat
  integration test is now below the 1,200-line test target and no longer has a
  legacy oversized-file exception.
- Coordinator moved settings-focused product-copy fixture coverage into
  `scripts/check-product-copy-settings.test.mjs`. The main product-copy test
  file still owns shared product-copy fixture coverage.
- Coordinator moved support/docs product-copy fixture coverage into
  `scripts/check-product-copy-support-docs.test.mjs`. The main product-copy
  test file is now below the 1,200-line test target and no longer has a legacy
  oversized-file exception.
- Coordinator moved the technical-first fallback product-copy pattern table into
  `scripts/harness/checks/product-copy/technical-first-fallback.mjs`. The main
  product-copy checker still owns path-specific routing.
- Coordinator moved technical-first preflight product-copy path routing into
  `scripts/harness/checks/product-copy/technical-first-preflight.mjs`. The main
  product-copy checker still owns the remaining scanner flow.
- Coordinator moved technical-first docs and UI product-copy routing into
  `scripts/harness/checks/product-copy/technical-first-docs.mjs` and
  `scripts/harness/checks/product-copy/technical-first-ui.mjs`. The main
  product-copy checker is now below the 900-line script target and no longer
  has a legacy oversized-file exception.
- Coordinator moved DB note CRUD, note listing, hidden-note filtering, and note
  text edge-case tests into
  `src-tauri/src/core/db/tests/tests/job_notes_tests.rs`. The main DB test file
  still owns broad operation coverage and shared fixtures.
- Read-only sidecar Newton audited `ats_analyzer.rs` and changed no files.
  Best next slices were term expansion, plain-text format helpers, and
  requirement review helpers. Coordinator accepted the term-expansion boundary
  and moved equivalent search terms, lift-unit variants, year-experience
  ranges, and human-language requirement detection into
  `src-tauri/src/core/resume/ats_analyzer/term_expansion.rs`.
- Coordinator moved scheduler scraper URL, source configuration, scoring,
  alert, LinkedIn policy, JobsWithGPT, and multi-scraper cycle tests into
  `src-tauri/src/core/scheduler/tests/scraper_cycle_tests.rs`. The main
  scheduler test file still owns lifecycle, interval, database, shutdown, and
  broad error-path coverage.
- Coordinator moved Lever JSON field-shape, fallback, empty-field,
  remote-location edge, hash-consistency, and company-struct edge tests into
  `src-tauri/src/core/scrapers/lever/tests/json_edge_tests.rs`. The main Lever
  test file still owns remote inference, hashing, scraper initialization,
  scrape-company simulation, property tests, and integration coverage.
- Coordinator moved Settings optional job-board recommendation logic into
  `src/pages/SettingsJobBoardRecommendations.ts`. The main Settings page still
  owns page state, config loading/saving, and credential boundaries; the
  extracted helper only builds broad-audience source suggestions and enable
  callbacks.
- Coordinator locked whole-wiki upkeep into the harness by adding a
  manifest-owned `publicWiki` inventory, checker validation, policy tests, and
  PR/change-contract review wording. The remote wiki `Home.md` and
  `Capabilities.md` pages were refreshed and pushed to wiki commit `5cdb20f`.
- Coordinator moved DB search title, description, limit, FTS edge, and search
  error-path tests into `src-tauri/src/core/db/tests/tests/job_search_tests.rs`.
  The main DB test file still owns duplicate, bookmark, alert, connection, and
  broad database operation coverage plus shared fixtures.
- Coordinator moved resume plain-text format analysis into
  `src-tauri/src/core/resume/ats_analyzer/plain_text_format.rs`. The main ATS
  analyzer still owns job keyword extraction, requirement review, evidence
  scoring, and structured resume analysis.
- Coordinator moved scheduler schedule-config, lifecycle, shutdown, and result
  model tests into `src-tauri/src/core/scheduler/tests/basic_tests.rs`. The
  main scheduler test file still owns interval edge cases, database
  persistence, logging, notification, and remaining scraping-cycle coverage.
- Coordinator moved scoring company preference, company normalization, and
  fuzzy company matching tests into
  `src-tauri/src/core/scoring/tests/company_tests.rs`. The main scoring module
  still owns scoring engine behavior, salary/location tests, and shared test
  fixtures.
- Coordinator moved ApplyButton browser, submit, storage, human-check,
  screening summary, and accessibility lifecycle coverage into
  `src/components/automation/ApplyButton.lifecycle.test.tsx`. The main
  ApplyButton test file still owns initial rendering, platform detection,
  profile checks, fill flow, loading, and error-state coverage.
- Coordinator moved ghost-risk, local-first support, pay-guidance,
  salary-floor, and salary logging copy bloat fixtures into
  `scripts/check-repo-bloat-trust-copy.test.mjs`. The product-copy bloat test
  still owns general product, resume review, and Application Assist copy
  fixture coverage.
- Coordinator moved runtime privacy-logging fixtures for credentials,
  notifications, feedback reports, URL errors, backend commands, and import
  error details into `scripts/check-privacy-logging-runtime.test.mjs`. The main
  privacy-logging test file still owns collector, automation, frontend,
  scheduler, scraper, ML, and path/privacy fixtures.
- Coordinator moved import, bookmarklet, scoring, residual core privacy, setup
  error, and auth-token bloat fixtures into
  `scripts/check-repo-bloat-bookmarklet-privacy.test.mjs`. The privacy command
  bloat test still owns automation, URL/path, resume, ATS, sensitive command,
  and utility command fixtures.
- Coordinator moved Settings source-recommendation, source wording, USAJobs
  setup, and invalid chat connection-link tests into
  `src/pages/Settings.sources.test.tsx`. The main Settings test still owns
  save, backup, notification, credential, and ordering coverage.
- Coordinator moved lower Slack payload and webhook edge-case tests into
  `src-tauri/src/core/notify/slack_tests/payload_edge_tests.rs`. The main
  Slack test file still owns validation basics, payload basics, sanitization,
  and request-builder behavior.
- Coordinator moved database-integrity health-metric and fragmentation tests
  into `src-tauri/src/core/db/integrity/tests/health_metrics_tests.rs`. The
  main integrity test file still owns quick/startup checks, PRAGMA diagnostics,
  full-check scheduling, logging, optimization, and foreign-key coverage.
- Coordinator moved lower Teams payload display, webhook, fact, and
  serialization edge tests into
  `src-tauri/src/core/notify/teams_tests/payload_edge_tests.rs`. The main
  Teams payload test file still owns base card structure, validation basics,
  score/reason displays, optional fields, and earlier edge cases.
- Coordinator moved Greenhouse API JSON parsing, API URL construction, and late
  parser/hash edge tests into
  `src-tauri/src/core/scrapers/greenhouse_tests/api_tests.rs`. The main
  Greenhouse test file still owns hash basics, scraper setup, HTML parsing,
  model checks, and property-based hash coverage.
- Coordinator moved graduated salary scoring tests into
  `src-tauri/src/core/scoring/tests/salary_tests.rs`. The main scoring test
  file still owns base scoring, title/keyword, location, recency, alert, and
  consistency coverage.
- Coordinator moved salary BenchmarkManager database tests into
  `src-tauri/src/core/salary/benchmarks_tests/manager_tests.rs`. The main
  salary benchmark test file still owns formatting, competitiveness,
  negotiation, percentile, seniority, and location comparison coverage.
- Latest focused frontend splits: JobCard posting-risk guidance, mock
  resume-analysis availability/location constraints, ScraperHealthDashboard
  source-check coverage, and ScreeningAnswersForm contract coverage now live in
  separate focused test files. `status.md` keeps the full recent-slice index.
- Mock resume business hyphen-normalization evidence now has a compact
  table-driven test file; non-hyphen business synonym coverage stays in place.
- ATS edge-case and duplicate/empty reminder tests now live in a child test
  module; main ATS tests stay focused on core status, tracker, and stats flows.
- AtsLiveScorePanel details-modal coverage now lives in a focused frontend
  spec with shared resume-analysis fixtures.
- Lever scraper property tests plus score-copy, feature-status, and security-doc
  bloat fixtures now live in focused test modules.

## Risks

- Archived docs may contain stale historical statements. Treat them as
  provenance, not current behavior.
- Product-roadmap readers may need one current planning link instead of the old
  separate guided-intake and research-plan links.
- Harness checks that rewarded plan sprawl must change carefully so future
  sessions keep compact active state without losing restart evidence.

## Sensors

Use focused docs and harness checks for this slice:

```bash
npm run harness:session -- --json
npm run harness:score
npm run harness:check
npm run lint:docs
git diff --check
```

Broaden only if edits touch product code, privacy/security sensors, or release
behavior.

## Handoff

When resuming, read:

1. [Active status](status.md)
2. This plan
3. [Verification matrix](../../harness/verification-matrix.md)
4. Archived plans only if old decision context is needed

Archived plan history:

- [Guided job-search intake](../archive/guided-job-search-intake-superseded-2026-06-04.md)
- [Repo cleanup and quality sweep](../archive/repo-cleanup-and-quality-sweep-superseded-2026-06-04.md)
- [Repo cleanup handoff](../archive/repo-cleanup-handoff-superseded-2026-06-04.md)
- [Research-backed product improvements](../archive/research-backed-product-improvements-superseded-2026-06-04.md)
