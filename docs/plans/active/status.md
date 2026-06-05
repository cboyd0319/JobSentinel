# Active Plan Status

Last updated: 2026-06-05.

Read this file first. It is the compact restart surface for current active
work. Detailed history from the previous open plan set moved to archive on
2026-06-04 so active planning does not slow down future sessions.

## Goal State

The repo-wide goal remains open. JobSentinel should keep moving toward zero
known errors, privacy leaks, stale docs, brittle tests, user-facing technical
assumptions, engineer-only defaults, and unverified claims.

Current priority is critical product functionality before broad cleanup:
truthful local resume assistance, readable application guidance, ghost and stale
posting protection, pay-risk protection, guided intake, and cleanup only where
it blocks privacy, security, verification, or user ease.

Rule 0 still controls the work: user data stays local unless the user explicitly
configures an external channel, external AI stays optional and disabled by
default, and users stay in control before anything leaves the device.

## Active Workstreams

| Workstream | State | Current focus | Source |
| ---------- | ----- | ------------- | ------ |
| Current product and quality work | Active | Resume assistance, application readability, job-card protection, guided intake, and blocking cleanup only | [Plan](current-work.md) |

## Archived Context

These plans are no longer active restart surfaces. Keep them as provenance only:

- [Guided job-search intake](../archive/guided-job-search-intake-superseded-2026-06-04.md)
- [Repo cleanup and quality sweep](../archive/repo-cleanup-and-quality-sweep-superseded-2026-06-04.md)
- [Repo cleanup handoff](../archive/repo-cleanup-handoff-superseded-2026-06-04.md)
- [Research-backed product improvements](../archive/research-backed-product-improvements-superseded-2026-06-04.md)

## Current Posture

- `origin/main` is the source of truth for the pushed baseline. `ce93c51a`
  was the last broad-cleanup baseline before the current file-size split batch.
- Fresh harness session evidence reports 2 active docs, 2 indexed workstreams,
  and a 100/100 harness score: this status file and `current-work.md`.
- Final broad verification for the broad-cleanup baseline passed during the
  completed cleanup batch; recent split slices record their focused evidence
  below.
- Push cadence defaults to 30-commit batches unless the user gives a newer
  explicit push instruction.

## Latest Slice

- Lever scraper hash, initialization, and JSON-shape tests now live in
  `src-tauri/src/core/scrapers/lever/tests/basic_tests.rs`, reducing
  `src-tauri/src/core/scrapers/lever/tests.rs` from 960 to 522 lines without
  changing scraper behavior, parsing coverage, remote inference checks, property
  tests, or scrape-flow coverage.

- Focused verification for the Lever scraper test split passed:
  `cargo fmt --all -- --check`,
  `cargo test --lib core::scrapers::lever`, `cargo clippy -- -D warnings`, and
  `npm run lint:bloat`.

- Mock resume degree hard-constraint tests now live in
  `src/mocks/handlers/resumeHardConstraints.degree.test.ts`, reducing
  `src/mocks/handlers/resumeHardConstraints.test.ts` from 960 to 610 lines
  without changing hard-constraint evidence coverage for licenses, work
  authorization, screening, driving, insurance, or skills-only risks.

- Focused verification for the mock resume degree test split passed:
  `npm run test:run -- src/mocks/handlers/resumeHardConstraints.test.ts
  src/mocks/handlers/resumeHardConstraints.degree.test.ts`,
  `npx tsc --noEmit --pretty false`, `npm run lint`, and
  `npm run lint:bloat`.

- Error helper retry and debounced-handler tests now live in
  `src/utils/errorHelpers.async.test.ts`, reducing
  `src/utils/errorHelpers.test.ts` from 962 to 677 lines without changing
  production error handling, safe message tests, reporting tests, response
  classification tests, or edge-case coverage.

- Focused verification for the error helper test split passed:
  `npm run test:run -- src/utils/errorHelpers.test.ts
  src/utils/errorHelpers.async.test.ts`, `npx tsc --noEmit --pretty false`,
  `npm run lint`, and `npm run lint:bloat`.

- First-run Notifications step now lives in
  `src/pages/SetupWizardNotificationsStep.tsx`, reducing
  `src/pages/SetupWizard.tsx` from 963 to 801 lines without changing freshness,
  review-volume, desktop alert, quiet mode, source review, or final save
  behavior.

- Focused verification for the SetupWizard notifications split passed:
  `npm run test:run -- src/pages/SetupWizard.test.tsx
  src/pages/SetupWizardResumeSuggestions.test.tsx
  src/pages/setupWizardPreferences.test.ts
  src/pages/setupWizardSourceReviewState.test.ts`, `npx tsc --noEmit --pretty
  false`, `npm run lint`, and `npm run lint:bloat`.

- Resume analyzer keyword patterns, canonical keyword mapping, and industry
  keyword catalog now live in
  `src-tauri/src/core/resume/ats_analyzer/keyword_catalog.rs`, reducing
  `src-tauri/src/core/resume/ats_analyzer.rs` from 976 to 789 lines without
  changing keyword extraction, requirement reviews, score caps, or analyzer
  public APIs.

- Focused verification for the analyzer keyword catalog split passed:
  `cargo fmt --all -- --check`, `cargo test --lib ats_analyzer`,
  `cargo clippy -- -D warnings`, and `npm run lint:bloat`.

- Resume page Skills Management UI now lives in
  `src/pages/ResumeSkillsManagementCard.tsx`, reducing
  `src/pages/Resume.tsx` from 983 to 696 lines without changing resume loading,
  uploads/imports, skill add/edit/delete handlers, skill sorting toggles, recent
  matches, or delete confirmation behavior.

- Focused verification for the Resume skills component split passed:
  `npm run test:run -- src/pages/Resume.test.tsx`,
  `npx tsc --noEmit --pretty false`, `npm run lint`, and
  `npm run lint:bloat`.

- Application Tracker status columns, reminder labels, application statistics,
  status lookup, active-card lookup, and interview-scheduler DTO shaping now
  live in `src/pages/applicationsModel.ts`, reducing
  `src/pages/Applications.tsx` from 987 to 858 lines without changing drag and
  drop, notes, reminders, summary actions, or lazy modal behavior.

- Focused verification for the Applications model split passed:
  `npm run test:run -- src/pages/applicationsModel.test.ts`,
  `npx tsc --noEmit --pretty false`, `npm run lint`, `npm run lint:bloat`,
  `npm run harness:check`, and `git diff --check`.

- Scraper Health Dashboard DTOs, status configs, credential/source/run
  formatting helpers, and safe issue formatting now live in
  `src/components/scraperHealthDashboardModel.ts`, reducing
  `src/components/ScraperHealthDashboard.tsx` from 963 to 773 lines without
  changing source status rendering, credential warnings, check commands, or safe
  error guidance.

- Source-boundary and product-copy sensors now follow the Scraper Health
  Dashboard model split, so moved source-health copy remains covered by stale
  source-health and technical-first copy checks.

- Focused verification for the Scraper Health Dashboard split passed:
  `npm run test:run -- src/components/ScraperHealthDashboard.test.tsx
  src/components/ScraperHealthDashboard.sourceChecks.test.tsx`, `node --test`
  for source-boundary/source-doc/product-copy harness tests,
  `npx tsc --noEmit --pretty false`, and `npm run lint:bloat`.

- Analytics panel model, weekly-plan storage validation, source/status labels,
  and color maps now live in `src/components/analyticsPanelModel.ts`, reducing
  `src/components/AnalyticsPanel.tsx` from 963 to 822 lines without changing
  dialog behavior, charts, CSV export, or the weekly plan key.

- Bloat/source-quality storage-JSON sensors now follow the AnalyticsPanel model
  split, so weekly-goal JSON still requires `isWeeklyGoal` validation and
  invalid local storage cleanup before rendering.

- Focused verification for the AnalyticsPanel split passed:
  `npm run test:run -- src/components/AnalyticsPanel.test.tsx`,
  `node --test` for the source-quality and frontend-security bloat tests,
  `npm run lint`, and `npx tsc --noEmit --pretty false`.

- Discord webhook URL validation tests now live in
  `src-tauri/src/core/notify/discord_tests/webhook_url_tests.rs`, reducing
  `discord_tests.rs` from 989 to 893 lines while keeping URL allowlist,
  bypass-attack, and error-message coverage intact.

- Focused verification for the Discord webhook test split passed:
  `cargo fmt --all -- --check`, `cargo test --lib core::notify::discord`, and
  `npm run lint:bloat`.

- ATS status/default unit tests now live in
  `src-tauri/src/core/ats/tests/status_basic_tests.rs`, reducing the parent
  `src-tauri/src/core/ats/tests.rs` file from 978 to 839 lines without changing
  tracker behavior or database test helpers.

- Focused verification for the ATS status test split passed:
  `cargo fmt --all -- --check`, `cargo test --lib core::ats`, and
  `npm run lint:bloat`.

- Resume analyzer format-safety tests now live in
  `ats_analyzer_tests/format_safety_tests.rs`, reducing
  `ats_analyzer_tests.rs` from 992 to 668 lines without changing analyzer
  behavior or production APIs.

- Focused verification for the analyzer test split passed:
  `cargo fmt --all -- --check`, `cargo test --lib ats_analyzer`, and
  `npm run lint:bloat`.

- Application Assist ATS selector tables now live in a focused
  `form_filler/selectors.rs` module, reducing `form_filler.rs` from 988 to
  813 lines while preserving the existing `FormFiller::get_field_selectors`
  behavior and human-in-the-loop fill boundaries.

- Read-only docs audit found stale pushed-baseline and active-plan completion
  overclaims after `3192b0b3`; README and this status file now keep active work
  open instead of claiming repo-wide quality completion.

- Read-only file-size audit ranked the next cleanup candidates after
  `form_filler.rs`: `src-tauri/src/core/resume/ats_analyzer_tests.rs`,
  `src-tauri/src/core/ats/tests.rs`,
  `src-tauri/src/core/notify/discord_tests.rs`,
  `src/components/AnalyticsPanel.tsx`, and
  `src/components/ScraperHealthDashboard.tsx`.

- Focused verification for the selector split passed:
  `cargo fmt --all -- --check`, `cargo test form_filler`,
  `cargo clippy -- -D warnings`, `npm run lint:bloat`,
  `npm run harness:session -- --json`, `npm run harness:score`,
  `npm run harness:check`, `npm run lint:docs`, and `git diff --check`.

- Mock resume keyword search-term and evidence-frequency helpers now live in a
  focused module, reducing `resumeKeywordMatching.ts` from 989 to 427 lines
  without changing mock Resume Match evidence behavior.

- `current-work.md` is compact again, with long completed-slice history moved
  out of the active restart path and current macOS/readiness priorities kept
  explicit.

- Feature-doc drift predicates now live in a focused harness module, reducing
  `docs-drift.mjs` from 866 to 628 lines while keeping the existing public
  exports and bloat rule messages stable.

- Resume Builder live-score DTOs and hard-requirement helpers now live in a
  focused model module, reducing the live panel from 982 to 638 lines without
  changing must-have review behavior.

- Resume Match now treats required minimum-age or legal work-age wording as a
  hard review item with truth-first guidance instead of dropping it or treating
  it as years-of-experience evidence.

- First-run custom searches now recognize reviewed data analyst and business
  intelligence analyst titles as tech/data-focused for optional source
  suggestions, without matching generic analyst roles or selecting sources
  automatically.

- Dashboard posting-risk filters now treat local repeated-sighting evidence
  (`times_seen > 1`) as a Needs Review cue while ignoring missing, single, or
  non-finite sighting counts.

- README, docs index, and release docs now match the current macOS deployment
  posture: 94% full-public readiness, 100% no-account path completion, verified
  `v2.6.4` no-account DMG plus checksum, and Gatekeeper-ready distribution
  blocked only by Apple Developer Program materials.

- Dev mock resume bullet suggestions now preserve vague wording such as
  "was responsible for", "worked on", and "helped with" instead of upgrading it
  to unverified ownership verbs, matching the Rust truth-first behavior.

- Dev mock Resume Match now treats partial or implied required hard-constraint
  evidence as a risk, and matches Rust behavior for driving-record and
  auto-insurance requirement categories, actions, and term equivalents.

- Harness session parsing now accepts `--limit N` without treating the option
  as a repository root, so restart snapshots keep real branch, active-plan,
  score, and next-work evidence even when output is capped.

- Resume Builder DOCX download and print-dialog DOM helpers now live in a
  focused module, keeping the main builder page farther below the file-size
  target without changing export commands or user-facing export copy.

- Interview calendar export generation now lives in a focused helper, keeping
  the scheduler component farther below the file-size target while preserving
  `.ics` download behavior.

- Mock resume keyword-frequency matching now lives in a focused helper, keeping
  the main mock keyword matcher under the file-size target while preserving
  boundary-aware evidence counts.

- Application board icon helpers now live in a focused module, keeping the main
  Applications page under the file-size target without changing board actions,
  quick stats, or modal controls.

- Dashboard duplicate-group card rendering now lives in a focused UI component,
  keeping the main dashboard page under the file-size target while preserving
  repeated-posting review and hide-extra behavior.

- Settings desktop-alert controls now live in a focused component, keeping the
  notifications settings section under the file-size target without changing
  opt-in, sound, or focused-window behavior.

- Mock resume command handling now lives in a focused module, and the bloat
  privacy guard follows the split so mock resume summaries still avoid renderer
  file-path exposure.

- Application Assist resume-token/file-picker helpers now live in a focused
  automation submodule, keeping the Tauri command surface smaller while
  preserving app-owned resume storage and private path redaction.

- First-run setup location-step rendering now lives in a focused component,
  keeping the main setup page under the file-size target while preserving
  manual city entry, location detection opt-in, and work-location validation.

- Resume template CSS literals now live in a focused style module, cutting the
  renderer below the file-size target without changing template HTML output.

- Market-alert unit and database tests now live in a focused sibling file,
  keeping the production alert module small while preserving alert query
  coverage.

- Resume Match empty-state rendering now lives in a focused component, keeping
  the main resume page under the file-size target without changing upload or
  import behavior.

- First-run setup and profile presets now start with remote, hybrid, and
  on-site selected and no preset salary floor, so new users do not silently
  narrow results before choosing.

- Low-detail posting guidance now includes future-opportunity, talent-pool, and
  we-are-hiring titles so card warnings and filters match backend vague-title
  evidence more closely.

- Resume Match hard-constraint caps now apply to required hard requirements
  with missing, partial, or implied evidence instead of waiting for a fully
  missing row.

- Resume Builder now uses the same valid/recent saved-job context gate as the
  live review panel, clearing malformed or expired context before showing
  **Tailoring for Job**.

- Resume Builder education is now optional, so users without degrees,
  certificates, or training entries can continue without inventing data.

- Posting-risk filters now treat low-detail card warnings as review alerts, so
  **Lower Risk** hides broad/thin postings and **Needs Review** can find them.
- Posting-risk filters now also treat possible scam-sign card warnings as
  review alerts, so **Lower Risk** cannot include those red card cues.

- First-run desktop alerts now start off and require explicit opt-in before
  setup saves job-search notifications for this computer.

- Resume Match page-size headroom improved by moving the fit-breakdown row
  into a focused component while preserving build output and UI behavior.

- Resume Match now reports citizenship as an explicit hard-review category
  instead of serializing it as generic work authorization and relying on
  requirement-text inference.

- First-run review now keeps saved-resume skill context visible after the user
  adds resume suggestions, so reviewed local resume skills are labeled before
  the search is saved.

- Saved-answer suggestion cards now show the same hard-question review guidance
  before the **Use** action when the current screening question covers work
  authorization or another hard review topic.

- Live Application Assist fill results now return bounded saved-answer review
  topics, so success copy can name hard areas to check without exposing saved
  answers or exact form questions.

- Saved screening answers now show hard-question review guidance for schedule,
  education, transportation, salary, start-date, language, management, travel,
  and relocation quick-add topics.

- Application Assist saved-answer matching now handles plain quick-add aliases
  such as authorized-to-work, able-to-lift, degree, weekend-shift, and
  reliable-vehicle wording.

- First-run setup now keeps suggested tech-heavy job sources off until the user
  checks them in review, and saves only checked sources.
- Non-technical first-run searches can now suggest SimplyHired as a broad
  public source, still off by default and saved only after source review opt-in.
- First-run source-review state now lives in a focused helper, keeping the main
  setup page farther below the file-size limit after source additions.
- First-run setup now accepts hourly pay floors, saves the annual equivalent
  for local pay comparisons, and keeps the hourly meaning visible in review.

- Resume Match now treats clean driving record, MVR, proof of auto insurance,
  and insured-vehicle wording as hard requirements with conservative evidence
  equivalence.
- Resume Match now treats car-insurance wording as conservative evidence for
  required proof of auto insurance.

- Resume Match recent-match rendering now lives in a focused component, keeping
  the main resume page close to the file-size limit.

- Resume Builder progress, export, navigation, and job-context rendering now
  live in focused components, putting the main builder page below the file-size
  limit.

- Company Research fallback data now lives in a focused module, keeping the
  panel small while preserving local known-company lookup behavior.

- Interview Scheduler add-interview modal now lives in a focused component,
  keeping the scheduler under the file-size limit.

- First-run hourly pay controls now live in a focused setup component, keeping
  the main setup page farther below the file-size limit.

- Job cards now run unsafe saved-link checks before custom dashboard open
  handlers, so visible **Check job link** guidance cannot be bypassed by a
  callback path.

- Job cards now flag top-only listed pay as weak pay evidence, telling users to
  confirm the starting pay before tailoring instead of treating an "up to"
  amount as a full range.

- Resume Builder live-score hard-constraint tests moved into a focused file,
  keeping the main ATS live-score test under the frontend test size target.

- Dashboard job-list, empty-state, and filtered-empty rendering moved into a
  focused component, bringing the main dashboard page down near 1,000 lines
  before more product work touches it.

- Resume Builder and Resume Match now label citizenship hard risks as
  citizenship in visible category/fallback text, instead of showing the shared
  work-authorization category when the requirement text is citizenship-specific.

- Resume hard-requirement actions now tell users to check citizenship for
  citizenship requirements instead of reusing work-authorization wording, and
  the dev mock matches the Rust analyzer.

- Build My Search now offers broad starter job-title buttons such as office,
  customer service, sales, warehouse, healthcare, and bookkeeping roles so
  non-technical first-run users do not start from a blank title field.
- Non-technical first-run source review now offers a broad public SimplyHired
  option without turning it on by default.

- First-run saved-resume skill suggestions now wait for an explicit
  **Check saved resume skills** action before reading local resume skills, and
  the suggestion panel moved out of the main setup page to stay under file-size
  limits.

- Resume Builder live score now shows must-have warnings from weak hard
  requirement review rows even when no separate hard-risk list is present.

- Resume Match next actions no longer duplicate partial or implied hard
  requirements as both **Check first** and supporting-evidence actions.

- Dashboard repeat-posting controls now say possible repeats and hide extras
  instead of merge duplicates, keeping the UI from implying confirmed duplicate
  jobs or separate source confirmation.

- Job cards now show visible **Check job link** guidance for unsafe saved links
  before the user clicks, so link-safety risk is not hidden behind the open
  action.

- Resume Match hard-constraint extraction no longer treats age wording such as
  "18 years of age" as a years-experience requirement, and the dev mock now
  matches the Rust analyzer behavior.

- Schema.org job import now converts known non-yearly listed pay units such as
  hourly pay into yearly stored pay fields for pay-floor comparisons, while the
  import preview keeps the original listed unit visible.

- Healthcare guided-intake defaults now keep common support roles such as
  medical assistant, patient care assistant, home health aide, and certified
  nursing assistant visible instead of blocking them through generic
  "Assistant" or "Aide" avoid terms.

- macOS readiness tests now prove that missing Apple Developer Program
  credentials are external blockers only: no-account completion stays 100% at
  the 94% public-readiness ceiling, and full-public readiness reaches 100% only
  when Developer ID and notarization inputs exist.

- README macOS readiness copy now names the 94% no-account public-readiness
  ceiling, so the top-level percentage stays honest while the known
  no-Apple-account constraint remains explicit.

- Job-card low-detail cues now flag generic remote and entry-level titles as
  role details to check before tailoring.

- First-run source defaults no longer treat generic software sales,
  implementation, or support searches as engineering searches for tech-heavy
  job boards.

- Public wiki `Home.md` and `Capabilities.md` were updated during the macOS
  readiness slice with current no-account checksum guidance, hard must-have
  resume status, and scam-cue behavior. Verify remote wiki freshness separately
  before claiming post-baseline wiki currency.

- Job-card scam cues now catch sensitive-detail requests that appear after
  phrases like "before the interview" as well as before the phrase.

- Resume Fit evidence status now treats hard-requirement review rows as
  **Check must-haves first** even when no separate hard-risk item is present.

- Job-card scam cues now flag messaging-app interview requests while keeping
  ordinary team-chat wording quiet.

- Resume Match next actions now use hard-requirement review rows as check-first
  guidance when no separate hard-risk item is present.

- Mac first-open help now tells users to look for the matching `.dmg.sha256`
  checksum file before using **Open Anyway**, and product-copy checks guard
  that wording.

- The macOS DMG builder now writes `_no-account_` filenames directly when
  `JOBSENTINEL_MACOS_NO_ACCOUNT=true`, and stale cleanup removes both labeled
  and unlabeled checksum variants.

- macOS readiness now checks that no-account release workflow order stays
  verify, label, recreate checksum, then upload.

- macOS development docs now match the README readiness split: 94%
  full-public readiness, 100% no-account path completion, with a readiness
  guard against stale no-account percentage wording.

- Resume Fit evidence status now stays at mixed evidence when required
  job-post wording is missing, partial, or only implied.

- First-run search review now makes job-source choices explicit before saving
  and says resumes, private notes, saved answers, and application history are
  not sent to job sources.

- Job cards now flag minimum-only listed pay as open-ended range evidence even
  when no salary floor is saved, while avoiding duplicate open-ended pay cards
  when floor guidance already covers it.

- Application Assist now treats legally authorized, eligible-to-work,
  employment authorization, green card, and EAD wording as work-authorization
  screening topics.

- Job-card scam cues now cover crypto or payment-app transfer requests and
  passport or direct-deposit requests before interview or offer.

- Resume Match next actions now suppress positive keep-visible guidance whenever
  missing or weak required evidence already needs review.

- Source-specific alert rules now keep sound off by default and normalize older
  partial preferences to quiet source alerts.

- Resume Match next actions now fill hard-requirement checks first and suppress
  positive keep-visible guidance until hard blockers are cleared.

- Desktop alert sound is now opt-in across first-run setup, Settings fallback,
  and config deserialization, so old or partial configs stay quiet unless the
  user turns sound on.

- First-run desktop alerts now start off and save only after explicit opt-in,
  while users can still turn sound back on before saving setup.

- Job cards now show visible source-review cues for job boards, connected
  feeds, saved links, sample jobs, custom labels, and missing source labels,
  while employer-side hiring pages stay quieter source evidence.

- Resume Match next-action cards now use the backend hard-requirement action
  text, so seniority, screening, physical, and language constraints keep their
  precise truth-first guidance.

- Job cards now flag open-ended starting pay below the user's saved floor as a
  range-review cue, without claiming the role tops out below the floor.

- README and macOS readiness output now separate full-public readiness (94%)
  from the complete no-account path (100%), matching the known no-Apple-account
  constraint.

- Rust tests and platform examples now avoid concrete developer home paths while
  still covering sanitizer and private-detail redaction behavior.

- Frontend, mock, and script test fixtures now use neutral placeholders for
  private resume paths and emails instead of developer-specific local paths.

- Settings resume sorting copy now says it uses reviewed local resume skills,
  falling back to job titles and search words when no reviewed resume skills are
  saved.

- First-run career-path preview now shows suggested job titles and search words
  before saving, and tells users those suggestions can be edited.

- Dev mock Resume Match now treats bilingual and named-language fluency wording
  as language hard constraints, matching the Rust analyzer's score cap, action
  copy, and evidence matching for Spanish and Mandarin examples.

- Active status history was compacted from the old slice log to current restart
  facts, archived-plan provenance, and the next work list so the active plan
  stays below the file-size budget.

- Resume Builder live readability now surfaces must-have warnings before opening
  the detail modal, so work authorization, language, license, screening, or
  other hard requirements are visible before a user edits a tailored resume.

- Dashboard duplicate-review copy now says possible repeated postings, not proof
  that multiple sources confirmed the same job, and duplicate-check toasts use
  cautious review-first wording.

- Resume Match model types, validators, JSON parsing, fit-status copy, and
  suggestion-category labels moved from `src/pages/ResumeOptimizer.tsx` to
  `src/pages/resumeOptimizerModel.ts`.

- Resume Match model helpers, icons, resume library dropdown, and readable-text
  preview modal moved out of `src/pages/Resume.tsx` into focused helper files
  under `src/pages/`.
- `src/pages/Resume.tsx` is now below the 1,200-line frontend target, so the
  legacy oversized-file exception was removed.

- Resume review job-word overview display moved out of
  `src/pages/ResumeOptimizer.tsx` into
  `src/pages/ResumeOptimizerJobWordsOverview.tsx`.

- Resume Match result-panel rendering and display assertions moved out of
  `src/pages/ResumeOptimizer.tsx` and `src/pages/ResumeOptimizer.test.tsx` into
  focused result-panel files, and harness copy/audience scanners now include
  the moved UI.

- Mock resume bullet-prompt guidance assertions moved out of the broad mock
  resume command test into a focused prompt test, keeping the command test
  farther below the size limit.

- Mock resume summary and text-preview view helpers moved out of the main mock
  handler, keeping resume selection and preview behavior covered while lowering
  handler size.

- Scraper and source-health bloat fixture coverage moved out of the feature-doc
  bloat test file into a focused source-doc test file.

- Lever remote-inference tests moved out of the main Lever scraper test file
  into a focused Rust test module.

- Resume Builder template thumbnail previews and export/delete icons moved out
  of `src/pages/ResumeBuilder.tsx` into `src/pages/ResumeBuilderVisuals.tsx`.

- Application Preview saved hard-screening answer assertions moved out of the
  focused screening test file into their own saved-answer test file.

- Developer-doc bloat fixture coverage moved out of the docs-drift bloat test
  file into a focused developer-doc test file.

- Resume-focused product-copy fixture coverage moved out of the main
  product-copy test file into a focused resume product-copy test file.

- Config property-based validation tests moved out of the main config test file
  into a focused Rust test module.

- DB field-update, ghost, repost, and company-count tests moved out of the main
  DB test file into a focused Rust test module.

- Scheduler error-path coverage tests moved out of the main scheduler test file
  into a focused Rust test module.

- Mock resume degree-specialization hard-constraint tests moved out of the broad
  hard-constraint test file into a focused mock test file.

- ApplyButton browser, submit, storage, human-check, screening summary, and
  accessibility lifecycle tests moved out of the main ApplyButton test file
  into a focused lifecycle test file.

- Ghost-risk, local-first support, pay-guidance, salary-floor, and salary
  logging copy bloat fixtures moved out of the product-copy bloat test into a
  focused trust-copy test file.

- Runtime privacy-logging fixtures for credentials, notifications, feedback
  reports, URL errors, backend commands, and import error details moved out of
  the main privacy-logging test into a focused runtime test file.

- Import, bookmarklet, scoring, residual core privacy, setup error, and
  auth-token bloat fixtures moved out of the privacy command bloat test into a
  focused bookmarklet/privacy bloat test file.

- Settings source-recommendation, source wording, USAJobs setup, and invalid
  chat connection-link tests moved out of the main Settings test into a focused
  source Settings test file.

- Lower Slack payload and webhook edge-case tests moved out of the main Slack
  test file into a focused payload-edge Rust test module.

- Database-integrity health-metric and fragmentation tests moved out of the
  main integrity test file into a focused health-metrics Rust test module.

- Lower Teams payload display, webhook, fact, and serialization edge tests
  moved out of the main Teams payload test file into a focused payload-edge
  Rust test module.

- Greenhouse API JSON parsing, API URL construction, and late parser/hash edge
  tests moved out of the main Greenhouse scraper test file into a focused API
  Rust test module.

- Graduated salary scoring tests moved out of the main scoring test file into
  a focused salary scoring Rust test module.

- Salary BenchmarkManager database tests moved out of the main salary benchmark
  test file into a focused manager Rust test module.

- JobCard posting-risk guidance tests moved out of the main JobCard test file
  into a focused frontend test file.

- Mock resume-analysis availability and location hard-constraint tests moved
  out of the main command test file into a focused frontend mock-handler test.

- ScraperHealthDashboard source-check, refresh, and formatting tests moved out
  of the main dashboard test file into a focused frontend test, with shared
  fixtures extracted for both specs.

- ScreeningAnswersForm accessibility and max-length contract tests moved out
  of the main screening-answer test file into a focused frontend test, with
  shared saved-answer fixtures extracted for both specs.

- Mock resume business hyphen-normalization evidence tests moved out of the
  main business evidence test file into a compact table-driven mock-handler
  test.

- ATS edge-case, duplicate job hash, empty board, and completed-reminder tests
  moved out of the main ATS test file into a focused Rust child test module.

- AtsLiveScorePanel details-modal tests moved out of the main live score panel
  test file into a focused frontend test, with shared resume-analysis fixtures.

- Lever scraper hash and remote-inference property tests moved out of the main
  Lever test file into a focused Rust child test module.

- Score-copy bloat fixtures moved out of the feedback/privacy bloat test file
  into a focused script test.

- Feature status/doc glyph bloat fixtures moved out of the main feature-docs
  bloat test file into a focused script test.

- Security-doc and keyring bloat fixtures moved out of the frontend-security
  bloat test file into a focused script test.

- Secret/debug, notification-error, and credential bloat fixtures moved out of
  the main privacy-core bloat test file into a focused script test.

- `user_data` public DTOs and SQLite row adapters moved into a focused models
  module while keeping manager APIs and public re-exports stable.

- HN Who's Hiring scraper tests moved into `hn_hiring/tests.rs`; production
  scraper file now stays focused on fetch/parse behavior.

- Email notification formatter tests moved into `email/tests.rs`; production
  SMTP and formatting module now stays focused on runtime behavior.

- Notification service orchestration tests moved into `notify/tests.rs`; the
  service module now stays focused on channel dispatch logic.

- Bookmarklet server tests moved into `bookmarklet/server/tests.rs`; the server
  module now stays focused on listener/auth/import behavior.

- RemoteOK scraper tests moved into focused hash, parse, smoke, and tag modules;
  the scraper file now stays focused on API fetch/parse behavior.

- JobsWithGPT scraper tests moved into `jobswithgpt/tests.rs`; the scraper file
  now stays focused on MCP query and response parsing behavior.

- YC startup scraper fixture helpers and tests moved into `yc_startup/tests.rs`;
  the scraper file now stays focused on Inertia extraction and job parsing.

- Resume command privacy/serialization tests moved into `commands/resume/tests.rs`;
  the command module now stays under the current size target.

## Recent Completed Slices

Detailed implementation history before the current restart window is in the
archived plan docs above and the local git log. Current restart context keeps
only the latest active slice plus the next work list so this file stays below
the active-doc budget.

## Next Best Work

1. Continue resume assistance only where it improves truthful local requirement
   review, hard-constraint handling, readable evidence, or next-action guidance.
2. Continue guided intake only where resume/profile suggestions stay optional,
   reviewed, local, and understandable for non-technical job seekers.
3. Continue job-card protection for stale, risky, duplicate, unclear, or
   pay-problem postings without treating local signals as employer predictions.
4. Continue cleanup only when it blocks critical functionality,
   privacy/security, verification, or user ease.

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
