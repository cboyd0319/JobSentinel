# Active Plan Status

Last updated: 2026-06-04.

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

- Last pushed baseline before local commits resumed:
  `4cdcc3e3 Split ATS screening constraint tests`.
- Fresh harness evidence reports 2 active docs and 2 indexed workstreams: this
  status file and `current-work.md`.
- Local commits should continue in small verified slices; push only when the
  branch reaches the user's 30-commit batch threshold or the user gives a newer
  explicit push instruction.

## Latest Slice

Latest implementation slice:

- DB search title, description, limit, FTS edge, and search error-path tests
  moved out of `src-tauri/src/core/db/tests.rs` into
  `src-tauri/src/core/db/tests/tests/job_search_tests.rs`.
- The main DB test file still owns duplicate, bookmark, alert, connection, and
  broad database operation coverage plus shared fixtures.
- `src-tauri/src/core/db/tests.rs` legacy no-growth budget tightened from 2,267
  lines to 2,042 lines.

Recent harness slice:

- The whole public GitHub wiki inventory is now manifest-owned under
  `docs/harness/manifest.json` `publicWiki.requiredPages`.
- `npm run harness:check` validates the public wiki URL, Git remote, branch,
  required pages, and update triggers.
- The PR template and change-contract template now require wiki impact review
  against the manifest page inventory, not only one remembered page.
- Remote wiki pages `Home.md` and `Capabilities.md` were refreshed and pushed
  to the wiki `master` branch at wiki commit `5cdb20f`.

Recent implementation slice:

- Settings job-board recommendation logic moved out of
  `src/pages/Settings.tsx` into
  `src/pages/SettingsJobBoardRecommendations.ts`.
- The main Settings page still owns page state, config loading/saving, and
  credential boundaries; the extracted helper owns only broad-audience optional
  source suggestions and enable callbacks.
- `src/pages/Settings.tsx` legacy no-growth budget tightened from 2,663 lines
  to 2,493 lines.

Recent cleanup summary:

- Lever JSON parsing and edge-case tests moved out of
  `src-tauri/src/core/scrapers/lever/tests.rs` into
  `src-tauri/src/core/scrapers/lever/tests/json_edge_tests.rs`.
- The main Lever test file still owns remote inference, hashing, scraper
  initialization, scrape-company simulation, property tests, and integration
  coverage; the extracted module owns JSON field-shape, fallback, empty-field,
  remote-location edge, hash-consistency, and company-struct edge coverage.
- `src-tauri/src/core/scrapers/lever/tests.rs` legacy no-growth budget
  tightened from 2,257 lines to 1,763 lines.
- Scheduler scraper-cycle tests moved out of
  `src-tauri/src/core/scheduler/tests.rs` into
  `src-tauri/src/core/scheduler/tests/scraper_cycle_tests.rs`.
- The main scheduler test file still owns lifecycle, interval, database,
  shutdown, and broad error-path coverage; the extracted module owns scraper
  URL, source configuration, scoring, alert, LinkedIn policy, JobsWithGPT, and
  multi-scraper cycle coverage.
- `src-tauri/src/core/scheduler/tests.rs` legacy no-growth budget tightened
  from 2,371 lines to 1,929 lines.
- Resume analyzer conservative keyword term expansion moved out of
  `src-tauri/src/core/resume/ats_analyzer.rs` into
  `src-tauri/src/core/resume/ats_analyzer/term_expansion.rs`.
- `AtsAnalyzer` still owns analysis orchestration and evidence scoring; the
  extracted helper owns equivalent search terms, lift-unit term variants,
  year-experience ranges, and human-language requirement detection.
- `src-tauri/src/core/resume/ats_analyzer.rs` legacy no-growth budget
  tightened from 3,060 lines to 2,492 lines.
- Job notes DB tests moved out of `src-tauri/src/core/db/tests.rs` into
  `src-tauri/src/core/db/tests/tests/job_notes_tests.rs`.
- The main DB test file still owns broad operation coverage and shared
  fixtures; the extracted module owns note CRUD, note listing, hidden-note
  filtering, and note text edge cases.
- `src-tauri/src/core/db/tests.rs` legacy no-growth budget tightened from
  2,526 lines to 2,267 lines.
- Technical-first docs and UI product-copy path checks moved out of
  `scripts/harness/checks/product-copy.mjs` into
  `scripts/harness/checks/product-copy/technical-first-docs.mjs` and
  `scripts/harness/checks/product-copy/technical-first-ui.mjs`.
- `hasTechnicalFirstUserCopy` now coordinates preflight, docs, UI, and fallback
  helpers.
- `scripts/harness/checks/product-copy.mjs` is now below the 900-line script
  target, so its legacy no-growth budget was removed.
- Technical-first preflight product-copy path routing moved out of
  `scripts/harness/checks/product-copy.mjs` into
  `scripts/harness/checks/product-copy/technical-first-preflight.mjs`.
- `hasTechnicalFirstUserCopy` still owns the main technical-first scanner; the
  extracted helper owns early exact-path checks, issue-template privacy checks,
  pay-language checks, and front-door ATS wording checks.
- `scripts/harness/checks/product-copy.mjs` legacy no-growth budget tightened
  from 2,029 lines to 1,763 lines.
- Technical-first fallback product-copy pattern table moved out of
  `scripts/harness/checks/product-copy.mjs` into
  `scripts/harness/checks/product-copy/technical-first-fallback.mjs`.
- `hasTechnicalFirstUserCopy` still owns path-specific routing; the extracted
  helper owns only the generic fallback pattern table.
- `scripts/harness/checks/product-copy.mjs` legacy no-growth budget tightened
  from 2,563 lines to 2,029 lines.
- Support, external-provider, source-label, issue-template, resume/pay, and
  profile-doc product-copy fixture coverage moved out of
  `scripts/check-product-copy.test.mjs` into
  `scripts/check-product-copy-support-docs.test.mjs`.
- The main product-copy test still owns shared product-copy fixture coverage
  and is now below the 1,200-line test target, so its legacy no-growth budget
  was removed.
- Settings-focused product-copy fixture coverage moved out of
  `scripts/check-product-copy.test.mjs` into
  `scripts/check-product-copy-settings.test.mjs`.
- The main product-copy test still owns shared product-copy fixture coverage;
  the extracted file owns the long technical-first settings, notification,
  support, resume, and onboarding copy fixture.
- `scripts/check-product-copy.test.mjs` legacy no-growth budget tightened from
  2,630 lines to 1,738 lines.
- Source-quality, source-structure, dependency, and E2E guidance
  `checkRepoBloat` integration tests moved out of
  `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-source-quality.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns frontend/source glyph checks, lint-suppression
  checks, unreferenced source helper checks, redundant dependency checks, and
  stale E2E guidance coverage.
- `scripts/check-repo-bloat.test.mjs` is now below the 1,200-line test target,
  so its legacy no-growth budget was removed.
- Legacy no-growth fixture coverage now uses `src/mocks/handlers.ts`, which is
  still an oversized tracked file with a live budget.
- Product-copy and pay-framing `checkRepoBloat` integration tests moved out of
  `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-product-copy.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns banned job-search framing, technical-first user copy,
  stale Resume Optimizer and Application Assist framing, ghost-risk wording,
  support-path wording, pay guidance, salary-floor troubleshooting, and salary
  command logging coverage.
- `scripts/check-repo-bloat.test.mjs` legacy no-growth budget tightened from
  2,671 lines to 1,554 lines.
- Feedback, support-report, mock-handler, recovery-copy, and score-copy
  `checkRepoBloat` integration tests moved out of
  `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-feedback-privacy.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns notification preference docs, feedback sanitization,
  user-data and scheduler logging, mock-handler shape, feedback report,
  problem-history, recovery-copy, and score-copy coverage.
- `scripts/check-repo-bloat.test.mjs` legacy no-growth budget tightened from
  3,660 lines to 2,671 lines.
- Frontend error-report and security-doc `checkRepoBloat` integration tests
  moved out of `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-frontend-security.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns frontend error, webhook redaction, unsafe parsing,
  notification-webhook, XSS, keyring, and security-doc drift coverage.
- `scripts/check-repo-bloat.test.mjs` legacy no-growth budget tightened from
  4,562 lines to 3,660 lines.
- Privacy command `checkRepoBloat` integration tests moved out of
  `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-privacy-commands.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns automation logging, command-error, import, bookmarklet,
  scoring-cache, scheduler, residual-core, and bookmarklet-auth coverage.
- `scripts/check-repo-bloat.test.mjs` legacy no-growth budget tightened from
  5,669 lines to 4,562 lines.
- Privacy IPC and notification `checkRepoBloat` integration tests moved out of
  `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-privacy-ipc.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns renderer credential, resume DTO, config export,
  notification, LinkedIn docs, URL logging, and job-import privacy coverage.
- `scripts/check-repo-bloat.test.mjs` legacy no-growth budget tightened from
  6,497 lines to 5,669 lines.
- Core privacy/logging `checkRepoBloat` integration tests moved out of
  `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-privacy-core.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns Rust stub, private-query, scraper, local-path, ML,
  Debug, LinkedIn, webhook, and credential-storage drift coverage.
- `scripts/check-repo-bloat.test.mjs` legacy no-growth budget tightened from
  7,386 lines to 6,497 lines.
- Feature-doc `checkRepoBloat` integration tests moved out of
  `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-feature-docs.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns active user-doc, feature-doc, scraper-doc, and
  notification-doc drift coverage.
- `scripts/check-repo-bloat.test.mjs` legacy no-growth budget tightened from
  8,550 lines to 7,386 lines.
- Docs-drift `checkRepoBloat` integration tests moved out of
  `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-docs-drift.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns developer-doc, roadmap, release-doc, active-doc, and
  stale-doc marker coverage.
- `scripts/check-repo-bloat.test.mjs` legacy no-growth budget tightened from
  9,702 lines to 8,550 lines.
- Broad-audience `checkRepoBloat` integration tests moved out of
  `scripts/check-repo-bloat.test.mjs` into
  `scripts/check-repo-bloat-broad-audience.test.mjs`.
- The main bloat integration test still owns aggregate sensor smoke coverage;
  the extracted file owns engineer-first and salary-audience fixture coverage.
- `scripts/check-repo-bloat.test.mjs` legacy no-growth budget tightened from
  10,557 lines to 9,702 lines.
- DB hide, unhide, hidden-query, and bookmark operation tests moved out of
  `src-tauri/src/core/db/tests.rs` into
  `src-tauri/src/core/db/tests/tests/job_visibility_tests.rs`.
- The main DB test file still owns integration-style database operation tests
  and shared fixtures; the extracted module owns visibility and bookmark
  behavior tests.
- `src-tauri/src/core/db/tests.rs` legacy no-growth budget tightened from 2,879
  lines to 2,526 lines.
- DB model, serialization, timeout, and path tests moved out of
  `src-tauri/src/core/db/tests.rs` into
  `src-tauri/src/core/db/tests/tests/model_tests.rs`.
- The main DB test file still owns integration-style database operation tests
  and shared fixtures; the extracted module owns no-database model tests.
- `src-tauri/src/core/db/tests.rs` legacy no-growth budget tightened from 3,420
  lines to 2,879 lines.
- Resume bullet action-word list and role-specific evidence prompts moved out of
  `src-tauri/src/core/resume/ats_analyzer.rs` into
  `src-tauri/src/core/resume/ats_analyzer/bullet_prompts.rs`.
- `AtsAnalyzer` still owns the public API and analysis orchestration; the
  extracted helper owns only prompt wording and action-word lists.
- `src-tauri/src/core/resume/ats_analyzer.rs` legacy no-growth budget
  tightened from 3,439 lines to 3,060 lines.
- Settings additional job board UI moved out of `src/pages/Settings.tsx` into
  `src/pages/SettingsJobSourcesSection.tsx`, and secure credential badge copy
  moved to `src/pages/SettingsSecurityBadge.tsx`.
- The main Settings page still owns modal state, config loading/saving, source
  approval state, and credential state; the extracted section owns only source
  board presentation and child wiring.
- `src/pages/Settings.tsx` legacy no-growth budget tightened from 3,351 lines
  to 2,663 lines.
- Resume analysis score assembly and format-review helper logic moved out of
  `src/mocks/handlers.ts` into
  `src/mocks/handlers/resumeAnalysisRunner.ts`.
- The main mock handler still owns command dispatch, mutable mock state, and
  bullet prompt keyword injection; the extracted helper owns pure resume
  format and job-fit analysis assembly.
- `src/mocks/handlers.ts` legacy no-growth budget tightened from 2,087 lines to
  1,887 lines.
- Resume keyword extraction, conservative term expansion, evidence-location
  matching, and evidence frequency helpers moved out of
  `src/mocks/handlers.ts` into
  `src/mocks/handlers/resumeKeywordMatching.ts`.
- The main mock handler still owned analysis score assembly and command
  dispatch; the extracted helper owns pure keyword and evidence matching.
- `src/mocks/handlers.ts` legacy no-growth budget tightened from 3,050 lines to
  2,087 lines.
- Resume requirement review and hard-constraint helper logic moved out of
  `src/mocks/handlers.ts` into
  `src/mocks/handlers/resumeRequirementReview.ts`.
- The main mock handler still owns job-context keyword extraction, evidence
  matching, scoring, and command dispatch; the extracted helper owns requirement
  review sorting, recommendation copy, score caps, and hard-constraint actions.
- `src/mocks/handlers.ts` legacy no-growth budget tightened from 3,379 lines to
  3,050 lines.
- Resume section parsing and resume-review guard helpers moved out of
  `src/mocks/handlers.ts` into
  `src/mocks/handlers/resumeAnalysisSections.ts`.
- The main mock handler still owns analysis scoring, keyword extraction, and
  command dispatch; the extracted helper owns section normalization and
  hidden-text, keyword-list, unclear-capability, and generic-filler guards.
- `src/mocks/handlers.ts` legacy no-growth budget tightened from 3,656 lines to
  3,379 lines.
- Resume bullet-improvement prompt helpers moved out of
  `src/mocks/handlers.ts` into
  `src/mocks/handlers/resumeBulletPrompts.ts`.
- The main mock handler still owns keyword extraction and command dispatch; the
  extracted helper receives the keyword extractor explicitly and owns only
  prompt wording and bullet rewrite guidance.
- `src/mocks/handlers.ts` legacy no-growth budget tightened from 3,971 lines to
  3,656 lines.
- Settings help/status, backup, and support-report UI moved out of
  `src/pages/Settings.tsx` into `src/pages/SettingsSupportSections.tsx`.
- The main Settings page still owns modal state, backup handlers, support report
  actions, and scraper-health modal state; the extracted component owns only
  presentation.
- `src/pages/Settings.tsx` legacy no-growth budget tightened from 3,435 lines
  to 3,351 lines.
- ATS platform detection helpers moved out of `src/mocks/handlers.ts` into
  `src/mocks/handlers/atsPlatform.ts`; the main mock handler still owns
  application-form fill state and attempt IDs.
- `src/mocks/handlers/atsPlatform.test.ts` covers backend command wiring for
  platform detection, safe form-fill attempts, and unsafe-link rejection.
- `src/mocks/handlers.ts` legacy no-growth budget tightened from 4,013 lines to
  3,971 lines.
- Resume-builder mock normalizers, templates, HTML rendering, and text export
  helpers moved out of `src/mocks/handlers.ts` into
  `src/mocks/handlers/resumeBuilder.ts`.
- The main mock handler still owns mutable draft state and persistence; the
  extracted helper owns pure draft normalization and rendering behavior.
- `src/mocks/handlers/resumeBuilder.test.ts` covers command wiring for draft
  updates, HTML escaping, and text export through `mockInvoke`.
- `src/mocks/handlers.ts` legacy no-growth budget tightened from 4,253 lines to
  4,013 lines.
- The whole public GitHub wiki is now treated as external product docs in the
  harness and change contract.
- Product-copy and broad-audience harness path sets now include
  `src/mocks/handlers/marketIntelligence.ts` so market fixture copy stays
  scanned after extraction.
- Market intelligence mock fixtures moved to
  `src/mocks/handlers/marketIntelligence.ts`; command wiring and alert
  read-state persistence are covered by
  `src/mocks/handlers/marketIntelligence.test.ts`.
- Settings resume matching and match-review guide UI moved to
  `src/pages/SettingsResumeMatchingSection.tsx` with product-copy and
  broad-audience harness path coverage.
- `src/mocks/handlers.ts` legacy no-growth budget tightened from 5,302 lines to
  4,315 lines after earlier mock helper extractions.
- Settings connected job-source UI moved to
  `src/pages/SettingsConnectedJobSource.tsx` with source-boundary, product-copy,
  and broad-audience harness path coverage.
- Settings posting-risk and freshness UI moved to
  `src/pages/SettingsPostingRiskSection.tsx`.
- Mock salary benchmark and negotiation-note helpers moved to
  `src/mocks/handlers/salary.ts`.
- Mock ATS analysis DTOs/constants moved to `src/mocks/handlers/resumeAnalysis.ts`
  with sensor coverage for split suggestion category labels.
- ATS analyzer tests were split into focused modules for bullets, credentials,
  degrees, work arrangements, experience constraints, current-experience
  evidence, screening constraints, business equivalences, and
  service/healthcare equivalences.
- `src/mocks/handlers.test.ts` and
  `src-tauri/src/core/resume/ats_analyzer_tests.rs` are now both under the
  1,200-line harness target and no longer need legacy no-growth exemptions.
- Remaining largest cleanup targets are `src/mocks/handlers.ts`,
  `src/pages/Settings.tsx`, `src-tauri/src/core/resume/ats_analyzer.rs`,
  `src-tauri/src/core/db/tests.rs`, and large harness test files.

## Next Best Work

1. Continue resume assistance only where it improves truthful local requirement
   review, hard-constraint handling, readable evidence, or next-action guidance.
2. Continue guided intake only where resume/profile suggestions stay optional,
   reviewed, local, and understandable for non-technical job seekers.
3. Continue job-card protection for stale, risky, duplicate, unclear, or
   pay-problem postings without treating local signals as employer predictions.
4. Continue cleanup only when it blocks critical functionality,
   privacy/security, verification, or user ease.
5. Run final broad verification only when remaining known work has current
   evidence.

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
