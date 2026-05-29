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
- Keep sanitized debug-report generation one-click from normal settings and
  crash/error recovery surfaces.
- Improve the repo harness so future work captures scope, audience, ease,
  evidence, rollback, and exact verification before implementation drifts.
- Update docs when repo structure, behavior, commands, or security posture
  changes.
- Treat every tracked file under `docs/plans/active/` as part of this goal until
  it is completed, superseded, or moved out of active plans. Current active
  goal inputs are `guided-job-search-intake.md`,
  `repo-cleanup-and-quality-sweep.md`, `repo-cleanup-handoff.md`, and
  `research-backed-product-improvements.md`.

Out of scope:

- Deleting conventional root metadata without replacement, including
  `README.md`, `LICENSE`, `SECURITY.md`, and `CODE_OF_CONDUCT.md`.
- Removing required tool config files only to make the root look smaller.
- Rewriting product behavior without a concrete defect or product decision.
- Adding telemetry, cloud dependencies, or scraper bypass behavior.

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
- [x] Add a one-click sanitized debug-report path for GitHub issue reporting.
- [x] Improve harness docs and templates from current harness-engineering
  references.
- [ ] Audit primary user workflows for zero-technical-knowledge ease.
- [ ] Audit user-facing flows and copy for engineer-only assumptions.
- [ ] Run relevant verification and push each cleanup slice.

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

| Date | Status | Notes |
| ---- | ------ | ----- |
| 2026-05-29 | In progress | Reworked the root README under the README information-design system: restrained badges, formal project abstract, research contributions, reader map, current status, evaluation model, and updated harness guidance. |
| 2026-05-29 | In progress | Reworded Resume Match form, empty state, toasts, and docs from job-description/resume-data/analyze language to job-post, resume-details, and review-match language; added bloat coverage for recurrence. |
| 2026-05-29 | In progress | Reworded strong-resume-word guidance away from screening-tool recognition toward easier-to-scan bullet clarity, renamed the maintained docs heading to Action Words, and added bloat coverage. |
| 2026-05-29 | In progress | Replaced the resume bullet-improver placeholder from a database-performance example to a broad appointment-outcome example, with bloat coverage so engineer-first resume examples do not return. |
| 2026-05-29 | In progress | Reworded repeated-crash reset button and guidance away from window-state jargon toward resetting the app window; added bloat coverage to keep technical recovery wording out of error-boundary surfaces. |
| 2026-05-29 | In progress | Reworded repeated-crash reset recovery so users see that saved jobs and applications stay saved on this device instead of reading local-database terminology; added error-boundary and bloat coverage. |
| 2026-05-29 | In progress | Reworded visible command-palette hints, shortcut help, search placeholder, empty state, and quick-start shortcut copy to quick actions language; added bloat coverage against command-palette jargon returning to user-facing surfaces. |
| 2026-05-29 | In progress | Replaced stale Salary AI and AI Resume-Job Matcher labels in maintained docs with Pay Protection and local resume fit review language; added bloat coverage so those confusing AI labels cannot return. |
| 2026-05-29 | In progress | Renamed visible Resume Optimizer navigation, shortcut, recovery, builder guidance, and maintained user docs to Resume Match so resume help reads as truthful fit review instead of optimization framing; added bloat coverage. |
| 2026-05-29 | In progress | Reworded live resume-format review UI away from ATS score and optimizer framing toward resume readability, hiring-system readability, and Resume Match next steps; added component and bloat coverage. |
| 2026-05-29 | In progress | Reworded saved-settings recovery errors away from configuration-file jargon so non-technical users get direct Settings and safe-debug-report next steps; added frontend and bloat coverage for recurrence. |
| 2026-05-29 | In progress | Hardened the shared external HTTP body reader so oversized-body, body-read, and JSON-parse error display sanitizes URLs and suppresses raw source details even when future callers construct errors directly; added Rust and bloat coverage. |
| 2026-05-29 | In progress | Sanitized shared scraper error display so raw upstream source errors, arbitrary `anyhow` messages, and response-too-large URLs cannot expose query strings, credentials, or fragments through generic scraper failures; added Rust and bloat coverage for recurrence. |
| 2026-05-29 | In progress | Reworked the root README under the source-backed README information-design standard: added first-screen start routes, reframed the front door as a professional research project brief, made product differentiation evidence-based, and synced the harness design doc to prevent drift. |
| 2026-05-29 | In progress | Sanitized notification-preference serialization failures so saved-search, company, filter, or schedule settings cannot be echoed through raw JSON serializer details inside database protocol errors; added Rust and bloat coverage for recurrence. |
| 2026-05-29 | In progress | Sanitized Greenhouse and Lever per-company scrape-loop failures so backend logs no longer combine company names with raw scraper errors when one company board fails and the scraper continues; added Rust and bloat coverage for recurrence. |
| 2026-05-29 | In progress | Sanitized guided form-fill browser setup and resume-upload failures so raw browser config errors, CDP builder details, invalid path encodings, and local resume paths cannot surface through formatted automation errors; added Rust plus bloat coverage for recurrence. |
| 2026-05-29 | In progress | Sanitized guided form-fill screening-question output so prepared-form results and dev mocks report only saved-answer counts, not question text or saved answer patterns; sanitized browser question-discovery errors and added Rust plus bloat coverage for recurrence. |
| 2026-05-29 | In progress | Sanitized optional local-ML error display so model, tokenizer, inference, download, and file-operation failures keep internal detail fields but no longer expose paths, URLs, tokens, or resume-like text when formatted; added embedded-ML coverage and bloat coverage for recurrence. |
| 2026-05-29 | In progress | Sanitized source-check failure storage so live job-source smoke-test results and history save plain troubleshooting categories instead of raw provider, URL, token, parse, or network error details; added Rust coverage and bloat coverage for recurrence. |
| 2026-05-29 | In progress | Sanitized secure-storage credential failures so device keyring/provider errors, internal credential IDs, and OS denial details are collapsed to plain recovery copy before reaching the renderer; added Rust coverage and bloat coverage for recurrence. |
| 2026-05-29 | In progress | Sanitized safe-report support-open failures so GitHub, Drive, and reveal-in-folder helpers no longer return raw OS/browser/file-manager errors to the renderer; added Rust coverage and bloat coverage for recurrence. |
| 2026-05-29 | In progress | Rebalanced mock market-intelligence data away from software-only signals by using customer support, project coordination, patient care, bilingual communication, and data reporting examples, with broader company/location fixtures and bloat coverage against tech-only market demo data returning. |
| 2026-05-29 | In progress | Reworded visible recovery headings and repeat-failure labels across global, page, section, modal, and job-source-health failure surfaces so users see plain next steps instead of component/page error jargon; added bloat coverage so technical recovery copy cannot return. |
| 2026-05-29 | In progress | Replaced visible default error-boundary exception text with protective generic recovery copy across app, page, modal, and section boundaries; raw details stay only in sanitized development detail sections and safe debug reports, with tests and bloat coverage against sanitized raw messages returning to user-facing boundary copy. |
| 2026-05-29 | In progress | Made the legacy shared `getErrorMessage` helper display-safe by routing through user-friendly error categories instead of raw exception strings, removed external error-tracking suggestion copy from the logger comment, and expanded bloat coverage so raw shared frontend error messages cannot return. |
| 2026-05-29 | In progress | Sanitized shared frontend user error messages so generic `Error` instances are converted to safe type-based copy instead of raw exception text, sanitized `handleApiError` original-error context before throwing, and added regression plus bloat coverage against returning `error.message` to users. |
| 2026-05-29 | In progress | Reworked the root README again through the README information-design harness after a fresh 10+ source prior-art pass: first screen now reads as an applied research project abstract, job-seeker harm map, reader map, evidence table, research program, trust model, and system design summary; expanded the harness source pool with desktop-project README patterns and kept the source index mirrored. |
| 2026-05-29 | In progress | Reworded repeated-crash recovery to prioritize copying or saving a safe debug report before reset and to describe the destructive action as resetting local window state, not clearing app data. |
| 2026-05-29 | In progress | Added a setup guard for impossible location preferences so users cannot finish first-run setup with remote, hybrid, and on-site all disabled; updated Quick Start and focused accessibility coverage. |
| 2026-05-29 | In progress | Confirmed GitHub connector shows zero open PRs, including Dependabot PRs; updated the only outdated npm direct dependency, `web-vitals`, from 5.2.0 to 5.3.0. `cargo update` found no lockfile updates within current manifest constraints. |
| 2026-05-29 | In progress | Sanitized ErrorReporter storage warning console output so local storage parse/persist failures do not echo raw exception details, and added bloat coverage to block regressions. |
| 2026-05-29 | In progress | Replaced cache IPC command unit-error returns with string error channels so renderer failures are inspectable instead of opaque, and added bloat coverage to block future `Result<_, ()>` Tauri command surfaces. |
| 2026-05-29 | In progress | Sanitized final residual database/browser/scraper error display paths so database user messages, browser handler events, and scraper task panics no longer expose raw contexts, queries, validation reasons, provider internals, or task error strings; expanded bloat coverage. |
| 2026-05-29 | In progress | Sanitized residual core error/log paths for USAJobs credentials, config/database directory creation, pre-migration backup cleanup, JSON-LD and YC parsing, OCR fallback, ML model download, scheduler cycle failures, and resume template IDs so raw local paths, provider errors, user inputs, and parser details are not echoed; added bloat coverage. |
| 2026-05-29 | In progress | Sanitized scheduler scoring and scoring-config persistence failures so raw score-reason serialization errors, full job hashes, job title/company ghost indicators, and SQLx scoring config errors do not leak through logs or returned strings; added bloat coverage. |
| 2026-05-29 | In progress | Sanitized import, bookmarklet, scoring, and template-category command failures so URL validation details, page parse details, database internals, local server errors, raw JSON parse details, full job hashes, and raw category inputs do not leak through user-facing errors or logs; removed raw scoring-cache hash logs, isolated global cache tests, and added bloat coverage. |
| 2026-05-29 | In progress | Sanitized utility command failures across jobs, ghost-posting review, deep links, geolocation, config, and legacy LinkedIn cleanup so raw database, provider, URL, serialization, and credential-store details no longer reach user-facing command errors; sanitized the local deep-link event URL and added bloat coverage. |
| 2026-05-29 | In progress | Sanitized ML, salary, and market command failures so model, semantic-match, pay-protection, and market-analysis errors return safe categories instead of raw database/serialization/provider details; reduced raw job-hash and negotiation-scenario logs to lengths and added bloat coverage. |
| 2026-05-29 | In progress | Sanitized automation command failures and tracking logs so profile, screening-answer, answer-learning, attempt, and form-prep errors no longer echo database/browser internals, raw job hashes are reduced to lengths, and attempt-tracking failures log safe categories; added bloat coverage. |
| 2026-05-29 | In progress | Reworked the root README front door against the maintained information-design system after a fresh prior-art check: it now opens as a professional research brief with product thesis, reader routes, implementation evidence, product model, research model, trust model, and architecture map while preserving Rule 0, local-first external-AI boundaries, free-forever MIT wording, and the source index. |
| 2026-05-29 | In progress | Sanitized application-tracking command failures and logs so renderer-facing errors no longer echo database/status internals, and job identifiers, interview schedule text, outcomes, and note presence are reduced to lengths or booleans in command logs; added bloat coverage. |
| 2026-05-29 | In progress | Sanitized resume command failures and command logs so renderer-facing errors no longer echo parser/database/export internals, and resume skill/job-fit commands log content lengths instead of raw user skill text or job identifiers; added bloat coverage. |
| 2026-05-29 | In progress | Sanitized scheduler scraper worker failures so source-health rows, scraping cycle errors, and logs use source-level failure categories instead of raw scraper, URL, query, credential, or keyring error text; added Rust helper tests and bloat coverage. |
| 2026-05-29 | In progress | Sanitized notification-service delivery and keyring failure reporting so provider, credential, token, webhook, and SMTP error details are reduced to channel-level categories before logs or aggregate errors; added bloat coverage and focused Rust tests for recurrence. |
| 2026-05-29 | In progress | Sanitized scheduler persistence and job upsert tracing so job titles and companies are not written into backend spans or scraping result errors; added bloat coverage to keep raw job content out of those diagnostic surfaces. |
| 2026-05-29 | In progress | Rewrote JSON Resume Import docs from a code/API mapping dump into a local-only sensitive-data import guide with safe defaults, user-facing failure states, broad-audience requirements, privacy-safe developer contract, and current verification. Sanitized `import_json_resume` logging so resume names and raw JSON content are not written to logs, and added bloat coverage for recurrence. |
| 2026-05-29 | In progress | Rewrote optional local ML docs so embedded semantic matching is clearly disabled by default, not required for core workflows, local-only for matching, explicit for model downloads, and separate from external AI gateway behavior. Replaced old API-dump quickstart with developer commands and user-facing consent requirements. |
| 2026-05-29 | In progress | Replaced the stale `docs/ROADMAP.md` release-log dump with a current developer roadmap that routes readers to the public pillar roadmap, active plans, tech-debt tracker, source policy, privacy/AI boundary, optional local ML status, and verification map. Updated docs index, getting-started, and contributing links so current planning and technical debt have one maintained home. |
| 2026-05-29 | In progress | Reworked the root README front door against a professional information-design system: abstract, status, problem, capability map, research/evaluation model, trust boundaries, architecture map, local-data boundary, source coverage, and download path now follow the maintained harness standard. Added Google documentation best practices and Digital.gov heading guidance to the README/harness source pool. |
| 2026-05-29 | In progress | Ran broad local quality gates: frontend lint, TypeScript no-emit, 2,524 Vitest tests, bloat, Tauri invoke, test-quality, Rust fmt, Rust clippy, 2,393 Rust lib tests, Chromium smoke E2E, npm audit, cargo audit, and cargo-deny advisories. Removed a stale cargo-deny `fxhash` ignore, corrected RustSec comments, added bloat coverage for stale advisory ignores, and opened SEC-002 for current Rust informational advisory watch. |
| 2026-05-29 | In progress | Rewrote user-data management docs around local control, sensitive data, safe debug reports, migrations, deletion risk, and plain troubleshooting while moving command/storage details into a collapsed developer contract with bloat coverage for old API/database doc shape. |
| 2026-05-29 | In progress | Rewrote Market Intelligence docs from stale analytics/API/status dump into local evidence guidance with sample-bias warnings, salary-transparency use, official-source verification, privacy labels, and bloat coverage for old technical-documentation framing. |
| 2026-05-29 | In progress | Rewrote Resume Matcher docs from old API/scoring dump into local-first, advisory, broad-audience fit-review guidance, renamed front-door references away from AI Resume-Job Matcher, and added bloat coverage for stale keyword/optimization/API framing. |
| 2026-05-29 | In progress | Rewrote application-tracking docs from old module/API dump into local-first, protective, broad-audience job-search guidance, and added bloat coverage against stale Trello, ATS-module, technical-interview, future-phase, and API-reference copy returning. |
| 2026-05-29 | In progress | Rewrote remote and work-mode matching docs from scoring-matrix internals into plain user control, uncertainty, and protective-copy guidance, with bloat coverage against the old module-first shape returning. |
| 2026-05-29 | In progress | Replaced the last visible score-tooltip "Weight" header with "Priority" so match details use user-facing preference language while internal scoring math stays unchanged. |
| 2026-05-29 | In progress | Replaced raw job-card source IDs with plain source labels and source-check hints so users see hiring page, job board, saved-by-you, or connected-source language instead of internal scraper names. |
| 2026-05-29 | In progress | Reworded visible match-priority copy in Settings, job score details, resume match breakdown, and smart-scoring docs away from weight/scoring jargon toward plain match priorities and user-adjustable preferences, with bloat coverage for recurrence. |
| 2026-05-29 | In progress | Reworded ghost-detection feature docs away from posting-risk score, threshold, and weight setup jargon toward plain review labels, cautious settings, and verify-before-tailoring guidance, with bloat coverage against threshold/weight wording returning. |
| 2026-05-29 | In progress | Reworked the root README through the maintained information-design system: clearer visitor routing, research brief, trust model, evidence model, privacy/AI boundaries, and professional release/support framing, while preserving required product definition, Rule 0, free-forever MIT commitment, and source index. |
| 2026-05-29 | In progress | Reworded maintained smart-scoring and application-tracking docs away from whitelist/blacklist and booster/excluder labels toward favorite companies, hidden companies, and work words to show more often or avoid. |
| 2026-05-29 | In progress | Translated legacy score-reason allowlist/blocklist terms before they appear in score tooltips or breakdown modals, with tests and bloat coverage so raw reason strings cannot be rendered directly. |
| 2026-05-29 | In progress | Reworded saved/copied safe debug report configuration labels from company allowlist/blocklist to favorite and hidden companies, with regression and bloat coverage so issue attachments stay plain-language for non-technical users. |
| 2026-05-29 | In progress | Broadened synonym matching beyond software terms by adding customer support, office, project coordination, healthcare, education, sales, HR, operations, design, marketing, and accounting groups; refreshed synonym docs and bloat coverage against tech-only examples returning. |
| 2026-05-29 | In progress | Replaced shaming smart-scoring troubleshooting copy with protective next steps for stale postings, salary-floor warnings, settings review, and user notes; added bloat coverage so desperation language cannot return. |
| 2026-05-29 | In progress | Reworded Company Research and scoring presets away from tech-stack-only framing toward broader tools, systems, and skills language so company prep fits technical and non-technical job seekers. |
| 2026-05-29 | In progress | Reworded Settings notification setup away from service-internal webhook/token labels toward connection links, alert codes, and destination numbers, with regression and bloat coverage for recurring jargon. |
| 2026-05-29 | In progress | Replaced visible App Problem History stack/component text with plain safe-report guidance so non-technical users are not asked to inspect developer traces, while preserving sanitized report copy/save paths for support. |
| 2026-05-29 | In progress | Reframed source-health UI and docs from scraper/smoke-test terminology to job sources, source checks, connection warnings, and safe issue guidance; added bloat coverage so user-facing source-health copy stays plain-language. |
| 2026-05-29 | In progress | Replaced remaining user-facing job-score filter and salary/notification score wording with match-strength and pay-fit language, keeping internal score IDs unchanged and adding bloat coverage for recurrence. |
| 2026-05-29 | In progress | Cleaned notification docs for zero-technical-knowledge users by replacing token, embed, chat-ID, and Send Test wording with connection-link, alert-card, destination-number, and Test guidance; extended bloat coverage. |
| 2026-05-29 | In progress | Replaced custom Settings posting-risk slider labels that exposed numeric warning points with plain sensitivity labels, keeping internal ghost thresholds unchanged and adding bloat coverage against numeric threshold copy returning. |
| 2026-05-29 | In progress | Removed internal match filter IDs and remaining match-score wording from saved-search previews, onboarding, compare tables, and match-display aria labels; shared dashboard filter labels now drive both controls and preview copy. |
| 2026-05-29 | In progress | Hardened App Problem History against legacy or malformed stored error messages by sanitizing message text again at render time, with focused tests and bloat coverage so private paths, emails, and token-like values cannot appear in the problem list. |
| 2026-05-29 | In progress | Centralized safe toast copy for remaining enhanced frontend errors in dashboard actions, saved searches, resume builder, resume loading, interview loading, and screening-answer loading so raw `userFriendly` messages cannot surface private paths, emails, or token-like values. |
| 2026-05-29 | In progress | Replaced raw Market and Dashboard load/search error display with safe user guidance and added helper tests plus bloat sensors so backend/provider messages do not surface private paths, emails, or token-like values. |
| 2026-05-29 | In progress | Sanitized remaining pay-protection, async-button, live-resume-score, scraper-health, and application-preparation errors so private paths, emails, and token-like values stay out of visible UI; added tests and bloat sensors. |
| 2026-05-29 | In progress | Replaced raw job-import, resume-analysis, and modal-boundary errors with safe user guidance, keeping sensitive paths, emails, and tokens out of visible failure copy and extending bloat checks. |
| 2026-05-29 | In progress | Sanitized cover-letter template failure toasts and component-boundary default error messages so raw paths, emails, and tokens do not reach user-facing recovery surfaces; added focused tests and repo-harness checks against regressions. |
| 2026-05-29 | In progress | Sanitized `getUserFriendlyError` technical details before they can reach UI/support paths, changed unknown-error guidance to safe debug reports, and added bloat coverage against raw technical-message fallbacks returning. |
| 2026-05-29 | In progress | Removed engineer-first and technical recovery wording from user-data docs: saved-search examples now cover office, design, and clinic roles, migration copy hides localStorage jargon, and deletion recovery points users to safe debug reports instead of manual SQLite file copying. |
| 2026-05-29 | In progress | Reworded notification match filters from score-threshold jargon into match-strength controls and source alert rules, refreshed user-data docs, and extended bloat coverage for recurring notification-score copy. |
| 2026-05-29 | In progress | Reworked Settings posting-risk controls from ghost-detection threshold jargon into plain freshness choices that match setup: widest search, balanced, and fresh and verified first, with custom controls renamed around warnings instead of scoring thresholds. |
| 2026-05-29 | In progress | Removed remaining stale 13-source wording from quick-start, writing guide, Tauri docs, release notes, and dashboard sensors; disabled LinkedIn as a notification source in frontend and backend defaults while preserving it as a user-opened search-link destination only. |
| 2026-05-29 | In progress | Removed a stale dashboard source-count claim, replaced it with protective source/pay/posting-risk copy, and stopped treating LinkedIn search-link settings as an enabled background source during dashboard preflight. |
| 2026-05-29 | In progress | Extended pay protection from setup into job cards by passing the saved salary floor into Dashboard results and warning when listed pay tops out below the user's floor. |
| 2026-05-29 | In progress | Continued guided-intake pay protection by adding an optional setup pay-floor field, summary coverage, and quick-start wording so users can set below-floor warnings before first scan without hiding missing-pay roles. |
| 2026-05-29 | In progress | Locked the LinkedIn source boundary to user-opened search links only: disabled background collection, disabled new session credential storage, removed LinkedIn from smoke tests and Settings credential checks, rewrote source-health docs, and added bloat coverage for recurrence. |
| 2026-05-29 | In progress | Routed Playwright npm scripts through a small wrapper that removes conflicting color environment settings and suppresses only the known upstream Node 26 `DEP0205` deprecation warning from Playwright/Tailwind internals; added script tests and bloat coverage so fast E2E output stays readable. |
| 2026-05-29 | In progress | Switched Tailwind 4 from the PostCSS plugin path to the official Vite plugin to remove PostCSS parser warnings from local E2E and build output while keeping autoprefixer in PostCSS. |
| 2026-05-29 | In progress | Moved Slack, Discord, and Teams connection-link validation into backend credential storage so invalid webhook values cannot be written to the OS keyring through direct IPC or future callers; added command tests, docs, and bloat coverage. |
| 2026-05-29 | In progress | Removed the discontinued Stack Overflow Jobs deep-link source from backend site metadata, URL generation, frontend mocks, and user docs; updated site counts and added bloat coverage against reintroducing that dead job board. |
| 2026-05-29 | In progress | Reframed match-score copy from celebratory recommendations to protective evidence language: Strong Match, Some Match, source-check and must-have review guidance, plus bloat coverage against overconfident score copy. |
| 2026-05-29 | In progress | Reworded Telegram notification setup from bot-token-first copy to connection-token and step-by-step Telegram guidance, with bloat coverage for raw bot-token setup wording. |
| 2026-05-29 | In progress | Removed remaining tech-only placeholder examples from saved-search naming and cover-letter template creation, replacing them with broader customer-support examples and adding bloat coverage for recurrence. |
| 2026-05-29 | In progress | Sanitized visible crash and page-error messages before rendering so local paths, tokens, and email addresses do not appear on recovery screens; added bloat coverage to prevent raw error-boundary message or stack display from returning. |
| 2026-05-29 | In progress | Made App Problem History details easier and safer for non-technical support requests by replacing raw JSON context with readable sanitized rows that redact emails, strip URL tokens, and summarize nested data. |
| 2026-05-29 | In progress | Broadened maintained feature-doc examples away from software-engineer-only scenarios, including market intelligence, saved searches, smart scoring, application notes, scraper-health examples, JSON resume import, and resume skill categories. |
| 2026-05-29 | In progress | Added mechanical bloat coverage for the free-forever MIT project ethos so README, quick-start, and harness docs cannot silently lose that commitment. |
| 2026-05-29 | In progress | Reworked safe debug-report event details so the preview and formatted report use readable labels instead of raw JSON-shaped event data, while continuing to redact private values before sharing. |
| 2026-05-29 | In progress | Simplified feedback submission copy for zero-technical-knowledge users: GitHub remains the recommended trackable path, but the no-account safe feedback-file fallback is visible, success steps no longer imply the report is already submitted, and regression tests cover the support choices. |
| 2026-05-29 | In progress | Tightened the user quick-start path for zero-technical-knowledge use: installer-first setup, source-build content collapsed for developers, protective match and notification wording, optional keyboard shortcuts, clear local-data wording, and safe debug-report support steps. |
| 2026-05-29 | In progress | Reworked the root README using a 12-project professional README research pool: Kubernetes, AlphaFold, TensorFlow, PyTorch, scikit-learn, OpenTelemetry Collector, DuckDB, Transformers, Apache Spark, Ray, Airflow, and Rust. Adopted clearer thesis, status, architecture, scope, verification, and research-boundary framing while preserving the required source index. |
| 2026-05-29 | In progress | Replaced promise-heavy setup and onboarding tour copy with practical saved-search and strong-match wording; added regression coverage so tour copy avoids promise-heavy ranking, profile, and score-jargon phrasing. |
| 2026-05-29 | In progress | Locked privacy-first external-AI boundaries into docs, harness, and a disabled-by-default gateway with tests for opt-in, payload preview, sensitive-data blocking, full-database blocking, public-data-only payloads, and local metadata logging. |
| 2026-05-29 | In progress | Repaired the fast Playwright smoke gate after latest broad-audience mock data made the old software-engineer search assertion stale and Application Assist copy created a strict-selector collision; `npm run test:e2e:smoke` passed at 9 Chromium smoke tests in 6 seconds, and the two edited Chromium spec files passed 25 tests in 12 seconds. Double-confirmed the README reference index against 6 files in `/Users/c/Downloads` with 137 unique source URLs and 0 missing references. |
| 2026-05-29 | In progress | Added saved sanitized debug reports for GitHub issue attachments from Settings, App Problem History, crash recovery, and page-error recovery surfaces; refreshed README badges, front-door layout, and bottom reference index from maintained docs plus user-provided research packets. |
| 2026-05-28 | In progress | Reframed the visible Application Assist surface with review-first wording, protective submit-yourself guardrails, daily review language, updated feature docs/tests, and bloat coverage for one-click, quick-apply, speed, and form-automation drift. |
| 2026-05-28 | In progress | Reframed Salary AI into Pay Protection with salary-floor warnings, salary-history redirect guidance, under-leveling cues, evidence-bounded negotiation notes, sanitized salary command logging, and bloat coverage for overconfident pay advice plus raw salary-query logs. |
| 2026-05-28 | In progress | Added grant-facing front-door docs: root roadmap organized by the six design pillars, root privacy policy, responsible-AI boundaries, and condensed research briefs for job-seeker behavior, ATS transparency, ghost jobs, job-site data sources, pay equity, and salary negotiation; added bloat coverage requiring those docs in the main repo. |
| 2026-05-28 | In progress | Locked the README product definition to open-source, local-first, real/relevant/fairly compensated work under user control; replaced banned job-search framing around ATS tricks, LinkedIn extraction, algorithm gaming, bulk applying, and application automation with ATS transparency, candidate-side explainability, application readability, official-source job monitoring, ghost-job detection, salary transparency, pay-equity support, and privacy-preserving job search; added bloat coverage for recurrence. |
| 2026-05-28 | In progress | Reframed ghost/posting-risk UI and maintained docs away from fake/real verdict language toward stale, low-trust, needs-review, and verify-before-tailoring guidance; added bloat coverage for overconfident ghost-risk copy. |
| 2026-05-28 | In progress | Promoted ghost-job protection, pay-equity safeguards, long-term-unemployment support, bias-aware application routes, protective tone, and local-first privacy into active goal and plan requirements. |
| 2026-05-28 | In progress | Reworded Settings, score-breakdown, feedback-preview, and mock debug report search matching copy from keyword jargon to plain search-word language, with component/page tests and bloat coverage. |
| 2026-05-28 | In progress | Locked all tracked `docs/plans/active/` files into the goal scope, removed local `.DS_Store` artifacts from root and docs paths, and reran root/nested junk checks: tracked disposable scan clean, untracked scan clean, local artifact `find` scan clean, and `npm run lint:bloat` passed. Source-tree README files were classified as owned module/test docs, not disposable reports. |
| 2026-05-28 | In progress | Reworded Resume Optimizer results from ATS/keyword jargon to resume-match and job-word guidance, including honest-fit wording and bloat coverage. |
| 2026-05-28 | In progress | Reworded ATS live-score match copy from keyword jargon to job-post words and honest-fit guidance, with component and bloat coverage for recurrence. |
| 2026-05-28 | In progress | Refreshed direct npm, Cargo, and GitHub Actions dependencies to latest stable versions, including Tailwind 4, TypeScript 6, Vite 8, Vitest 4, Playwright 1.60, Tauri 2.11, SQLx 0.9, reqwest 0.13, keyring 4, and pinned Actions release SHAs. |
| 2026-05-28 | In progress | Continued the broad-audience audit by replacing engineer-first placeholders in resume builder, salary lookup, and deep-link generation; expanded offline resume skill extraction with marketing, sales, healthcare, education, finance, operations, legal, creative, and customer-success vocabulary informed by Persona capability content; added bloat coverage for engineer-first user-facing examples. |
| 2026-05-28 | In progress | Used Persona capability content as source vocabulary for broad job-search defaults, then replaced remaining engineer-first placeholders in Resume, Settings, Dashboard search help, resume-builder step copy, mock search defaults, and salary mock fallback; widened bloat coverage for those visible examples. |
| 2026-05-28 | In progress | Replaced technical JSON/schema wording in resume import and Resume Optimizer with plain "resume data" copy, updated tests, and added bloat coverage so zero-technical-knowledge resume paths cannot drift back to schema-first language. |
| 2026-05-28 | In progress | Replaced visible regex wording in Application Assist screening answers with plain question-text matching copy, changed common answer presets to readable phrases, updated tests/docs, and added bloat coverage for technical-first screening-answer copy. |
| 2026-05-28 | In progress | Simplified shared user-facing error and validation messages so common sign-in, local-data, notification, job-board limit, resume-analysis, and notification connection-link failures no longer expose API, database, webhook, or SMTP jargon; added regression and bloat coverage. |
| 2026-05-28 | In progress | Reworded notification setup in Settings, setup wizard, quick start, and notification docs from webhook/API/database jargon to connection-link and saved-details language; added bloat coverage for recurrence. |
| 2026-05-28 | In progress | Made sanitized issue-report generation clearer by renaming the one-click action to Copy Safe Debug Report across Settings, crash, and problem-history surfaces; replaced debug-information and privacy-guarantee copy with safe-app-details wording; added bloat coverage. |
| 2026-05-28 | In progress | Replaced USAJobs API-key wording in Settings and user-facing feature docs with access-code language, kept federal-job examples broad, and added bloat coverage for stale API-key setup copy. |
| 2026-05-28 | In progress | Reworded job import from URL-first to plain job-link copy, replaced the software-engineer placeholder with an office-manager example, and added component plus bloat coverage. |
| 2026-05-28 | In progress | Renamed the visible resume template from Technical Skills-First to Skills-First, replaced engineering-only template guidance with broad skills-first language across backend, mocks, docs, and E2E selectors, and added bloat coverage. |
| 2026-05-28 | In progress | Cleaned remaining front-door and quick-start API/database/webhook phrasing, replaced an engineer-first quick-start example, and changed app failure copy to restart/try-again guidance instead of database access checks. |
| 2026-05-28 | In progress | Simplified mock job-link and application-link errors so demo/dev UI paths say saved jobs and safe links instead of database or unsafe-URL jargon; added bloat coverage. |
| 2026-05-28 | In progress | Reworded job-card and dashboard open-link errors plus the import quick action from URL wording to plain job-link wording; added bloat coverage. |
| 2026-05-28 | In progress | Generalized the resume ATS contact tip so LinkedIn is optional for any job seeker instead of aimed at tech roles; added bloat coverage. |
| 2026-05-28 | In progress | Replaced the demo software-engineer job with a customer-success role so first-run mock data better represents non-technical searches; added bloat coverage. |
| 2026-05-28 | In progress | Fixed setup onboarding so the default Custom Setup path can continue without choosing a preset profile; added regression coverage. |
| 2026-05-28 | In progress | Reworded onboarding preset/custom copy from profile and pre-configured terms to path and own-search language; added bloat coverage. |
| 2026-05-28 | In progress | Reordered onboarding career paths so broad non-technical searches appear before engineering and security presets; added regression coverage. |
| 2026-05-28 | In progress | Reworded visible application and interview status labels from Technical Interview to Skills Interview while keeping stored status keys stable; added bloat coverage. |
| 2026-05-28 | In progress | Captured guided job-search intake design: one question at a time, recommended answers, skip paths, broad examples, local-only answers, and plain-language mapping to search settings. |
| 2026-05-28 | In progress | Added optional setup intake for work to avoid, saving answers into existing excluded search words so matches can rank unwanted work lower; updated quick-start and README setup docs. |
| 2026-05-28 | In progress | Analyzed job-seeker behavior research notes and added research-backed intake rules for lower-friction setup, explicit must-haves versus preferences, adjustable pay expectations, adjacent-role openness, transparent recommendations, and accessibility. |
| 2026-05-28 | In progress | Added a final setup review summary so users can inspect the answers JobSentinel will use to rank jobs before scanning starts; updated setup docs and regression coverage. |
| 2026-05-28 | In progress | Reworded Deep Link user surfaces to plain job-site search-link language, hid raw generated search URLs from the app UI, refreshed user docs, and added bloat coverage for URL/keyword jargon drift. |
| 2026-05-28 | In progress | Reworked Browser Import Button copy so the app hides generated setup code and no longer asks users to reason about bookmarklets, servers, Schema.org, DOM parsing, or URL fields; refreshed the setup doc and bloat coverage. |
| 2026-05-28 | In progress | Simplified problem-history details from technical/log wording to support and problem-list language, with component and bloat coverage for recurrence. |
| 2026-05-28 | In progress | Closed SEC-001 after the latest-stable Rust refresh removed the `rand` 0.7 and `rsa` advisory paths from `Cargo.lock`; `cargo audit` now exits 0 with only allowed warnings. |
| 2026-05-28 | In progress | Fixed upgrade regressions from the latest-stable refresh: Tailwind 4 PostCSS config and utility composition, TypeScript 6 config cleanup, React compiler hook/static-component purity issues, SQLx 0.9 dynamic SQL guards, keyring 4 native-store initialization, Dashboard refetch loop, WebKit slash shortcut handling, WebKit application-card activation, and invalid notification tooltip markup. |
| 2026-05-28 | In progress | Hardened the Playwright bookmark page object so persistence tests wait for mock backend storage after optimistic UI updates; verified full Chromium/WebKit E2E at 252 passed in 2.0m after the latest-stable dependency refresh. |
| 2026-05-28 | In progress | Confirmed GitHub shows zero open Dependabot, code scanning, and secret scanning alerts after dismissing Dependabot alert #67 as accepted upstream transitive risk with SEC-001 tracking. |
| 2026-05-28 | In progress | Triaged GitHub Dependabot Rust alerts after push; updated `Cargo.lock` for Tauri 2.11.1, OpenSSL 0.10.80, rand 0.8.6, and rand 0.9.3, regenerated Tauri permission schemas, and verified Rust fmt, clippy, and lib tests. Remaining low `rand` 0.7 alert is tracked as SEC-001 because it comes through the Tauri build-time transitive chain. |
| 2026-05-28 | In progress | Reduced Playwright wall time by adding fast smoke scripts and local parallel workers, excluding docs screenshot capture by default, stabilizing parallel-safe page objects, and verifying `npm run test:e2e:all` at 252 passed in 5.5m plus Chromium-only full E2E at 126 passed in 2.8m. |
| 2026-05-28 | In progress | Audited the root README against live package metadata, registered Tauri command count, release assets, platform packaging, and current product direction; updated release/download claims and backend command counts. |
| 2026-05-28 | In progress | Reproduced and fixed a WebKit slash-shortcut E2E flake by accepting `KeyboardEvent.code === "Slash"` and adding a WebKit fallback in the E2E helper; focused stress passed 20/20. |
| 2026-05-28 | In progress | Strengthened the repo harness after reviewing current public harness-engineering references plus Persona and Bluepeak-AI sibling patterns: added session-start, audience/ease, support-path, rollback, handoff, and experience-sensor requirements, with `npm run harness:check` snippet coverage. |
| 2026-05-28 | In progress | Added standalone zero-technical-knowledge ease requirement to the active goal, added one-click sanitized debug report copy from Settings, Error Logs, and the crash screen, and synced GitHub issue templates plus user docs. |
| 2026-05-28 | In progress | Locked broad audience design into repo guidance: JobSentinel is for all job seekers and technical plus non-technical searches, not only engineers. |
| 2026-05-28 | In progress | Stabilized full Chromium and WebKit E2E by hardening Playwright navigation, search, drag/drop, location, and resume page-object waits under local parallel load. |
| 2026-05-21 | In progress | Reached a clean stopping-point slice by stabilizing WebKit-specific E2E navigation/count waits, refreshing README quality-gate guidance, and keeping the broader repo-wide cleanup goal open for future scraper, backend, docs-drift, and junk passes. |
| 2026-05-21 | In progress | Stabilized Chromium E2E after full-suite failures: synced Resume Builder phone fixtures with live validation, synced Resume Matcher E2E match seeds with backend score fractions, waited for delete confirmation modals to close, and hardened dashboard search/keyboard page objects under parallel load. |
| 2026-05-21 | In progress | Fixed Resume match sub-score bars that rendered backend `0.0..1.0` fractions as direct percentages, synced the Resume Matcher doc with the live `Resume.tsx` shape, and added bloat coverage for recurrence. |
| 2026-05-21 | In progress | Removed JSDOM navigation noise from analytics CSV and interview iCal download tests by stubbing temporary anchor clicks and asserting the download trigger directly. |
| 2026-05-21 | In progress | Removed the empty `src/components/settings/` directory left behind by earlier helper cleanup, and added bloat coverage so empty source/doc/test directories are flagged during local scans. |
| 2026-05-21 | In progress | Routed remaining direct frontend component, hook, service, and error-boundary development error logs through the sanitized logger so raw errors, stacks, tokens, emails, webhook URLs, and local paths are redacted before console output; added bloat coverage. |
| 2026-05-21 | In progress | Sanitized shared frontend `logError` development output so component and utility callers no longer pass raw errors, stacks, tokens, emails, webhook URLs, or user paths to `console.error`; added bloat coverage. |
| 2026-05-21 | In progress | Sanitized frontend `logErrorDetails` dev console output so error messages, context, stack traces, URLs, tokens, emails, cookies, and user paths are redacted before logging, with bloat coverage for recurrence. |
| 2026-05-21 | In progress | Removed remaining production react-refresh lint suppressions by moving context definitions, hooks, and shortcut formatting out of provider component files, with bloat coverage for recurrence. |
| 2026-05-21 | In progress | Removed the Company Research hook dependency suppression by eliminating stale `loading` closures from timeout callbacks, and added bloat coverage for production hook dependency suppressions. |
| 2026-05-21 | In progress | Removed the web-vitals `@ts-expect-error` by modeling optional browser heap memory explicitly, added memory-present test coverage, and added bloat coverage for production TypeScript error suppressions. |
| 2026-05-21 | In progress | Removed the TrendChart explicit-any lint suppression by typing chart rows as dynamic objects with unknown field reads, and added component plus bloat coverage for recurrence. |
| 2026-05-21 | In progress | Hardened Resume Optimizer pasted JSON handling so syntactically valid but malformed ATS resume payloads are rejected before backend invoke; added page tests and bloat coverage. |
| 2026-05-21 | In progress | Hardened frontend error-log restore so malformed stored entries are filtered instead of throwing away the whole stored report history, extended plain `token=` redaction, and added focused parser plus bloat coverage. |
| 2026-05-21 | In progress | Hardened ATS live-score job-context session storage so malformed stored payloads cannot be treated as current job descriptions; added focused component and bloat coverage. |
| 2026-05-21 | In progress | Hardened analytics weekly-goal and company-research cache JSON loading so malformed but syntactically valid browser storage cannot feed bogus runtime shapes into rendering; added focused component and bloat coverage. |
| 2026-05-21 | In progress | Hardened score and ghost-reason JSON parsers so malformed but syntactically valid stored reason payloads cannot render character-by-character reason text or break ghost tooltips; added component tests and bloat coverage. |
| 2026-05-21 | In progress | Sanitized development error-reporter console output so it logs the same redacted report stored in local error logs, not raw error objects, webhook URLs, paths, emails, or URL tokens. |
| 2026-05-21 | In progress | Removed credential rustdoc guidance that printed retrieved secrets and added bloat coverage to catch future examples that log credential or password values. |
| 2026-05-21 | In progress | Sanitized resume library command responses so renderer DTOs no longer include backend resume file paths or parsed text, and added frontend, mock, docs, and bloat coverage for recurrence. |
| 2026-05-21 | In progress | Changed feedback file save flow so the renderer receives only a filename and opaque reveal token, not a full local save path; reveal now uses backend-held saved-file paths and bloat coverage prevents raw path returns. |
| 2026-05-21 | In progress | Removed renderer access to stored credential values by retiring the `retrieve_credential` IPC command and moving existing Slack/SMTP test fallback reads into backend-only credential-store paths; synced docs, mocks, tests, and bloat coverage. |
| 2026-05-21 | In progress | Disabled new LinkedIn session credential storage by source policy, kept legacy cleanup/redaction paths, and added bloat coverage. |
| 2026-05-21 | In progress | Sanitized job import URL failure paths so non-public IP validation and fallback HTTP errors do not echo user-supplied hosts, URLs, queries, or provider error URLs; added bloat coverage. |
| 2026-05-21 | In progress | Sanitized database backup restore missing-file errors so backup filenames and local paths are not exposed, with regression and bloat coverage. |
| 2026-05-21 | In progress | Sanitized resume PDF parser failures so renderer-visible upload errors do not expose local file paths; synced command-execution docs and added bloat coverage for raw parser path displays. |
| 2026-05-21 | In progress | Synced keyring docs with live credential status shapes: `list_status` returns key/existence tuples and `get_credential_status` returns `Vec<CredentialStatus>`, with bloat coverage for stale `HashMap` signatures. |
| 2026-05-21 | In progress | Split Settings save failure handling so config write failures are reported as save failures even when credential writes succeed, with UI and bloat coverage for stale partial-save copy. |
| 2026-05-21 | In progress | Sanitized Slack webhook validation command failures so webhook URLs and token paths are never returned or logged raw from the IPC wrapper; added bloat coverage for recurrence. |
| 2026-05-21 | In progress | Sanitized test email command failures so raw SMTP URLs, usernames, hosts, and passwords cannot be returned to the renderer; added bloat coverage for recurrence. |
| 2026-05-21 | In progress | Retired the earlier LinkedIn login experiment in favor of user-opened search links and official-source monitoring. |
| 2026-05-21 | In progress | Synced scraper health smoke tests, frontend result shapes, mocks, and docs with the current 16 configured scraper sources, replacing stale `usa_jobs` and `success`/`response_time_ms` smoke-result assumptions. |
| 2026-05-21 | In progress | Sanitized frontend-visible config/setup/ghost command errors so database URLs, local paths, and raw setup failures are not echoed into command responses; added bloat coverage for recurrence. |
| 2026-05-21 | In progress | Wired hardened Resume Builder contact validation into the live next/save gate so invalid emails, phone numbers, deceptive profile URL schemes, and URL credentials cannot be saved by bypassing blur-time field validation. |
| 2026-05-21 | In progress | Hardened Resume Builder contact URL validation so bare profile domains still work but deceptive `http*` schemes and embedded credentials are rejected, with frontend-boundary coverage. |
| 2026-05-21 | In progress | Sanitized invalid Greenhouse and Lever config URL error display so userinfo, queries, and fragments are not echoed into frontend-visible validation errors. |
| 2026-05-21 | In progress | Removed notification provider error bodies from Discord, Teams, and Telegram errors so failed sends cannot echo private job payloads, and sanitized JobsWithGPT smoke-test endpoint request errors. |
| 2026-05-21 | In progress | Removed token-bearing Slack, Discord, and Teams webhook URLs from request error formatting and added bloat guards for recurrence. |
| 2026-05-21 | In progress | Re-ran root and nested disposable artifact scans with no candidates found, then added bloat guards for secret-bearing debug derives, credential key echo errors, incomplete config export redaction, and Telegram bot-token request URLs. |
| 2026-05-21 | In progress | Redacted USAJobs scraper and test-email command debug output, and removed Telegram bot-token URLs from request error formatting. |
| 2026-05-21 | In progress | Hardened credential export and key parsing so invalid credential IPC keys do not echo untrusted input, USAJobs API keys are redacted in debug output and legacy migration, and config export recursively clears known secret fields. |
| 2026-05-21 | In progress | Removed frontend `window.open()` deep-link fallbacks so job URL opens route only through the backend guard, and added bloat coverage for recurrence. |
| 2026-05-21 | In progress | Replaced the cache usage doc's stale unbounded response-read example with `read_text_with_limit`, and extended the cache-doc bloat guard for recurrence. |
| 2026-05-21 | In progress | Tightened shared external job URL validation to reject embedded credentials in backend and frontend guards before deep-link opening, job imports, and JobsWithGPT endpoint use. |
| 2026-05-21 | In progress | Added bloat-sensor coverage for unbounded Rust HTTP body reads, then routed explicit IP geolocation and Discord/Teams webhook error response parsing through the shared bounded reader. |
| 2026-05-21 | In progress | Reused the shared external URL validator for `jobswithgpt_endpoint` so configured MCP endpoints cannot target localhost or private-network addresses. |
| 2026-05-21 | In progress | Added a shared 16 MiB decoded HTTP body cap for scraper adapters, scraper health smoke tests, single-page imports, and Telegram error reads; synced scraper architecture docs and pushed `f077f9f`. |
| 2026-05-21 | In progress | Re-ran root and tracked-artifact junk scans after the response-cap slice. No untracked junk or tracked disposable artifacts were found beyond expected ignored build/cache paths. |
| 2026-05-21 | In progress | Replaced roadmap, docs index, and style-guide arrow/tree glyphs with plain prose and list text, and added maintained-doc glyph coverage for recurrence. |
| 2026-05-21 | In progress | Replaced ML feature doc tree markers and ML quickstart checkmark examples with plain text, and widened top-level active doc glyph coverage for recurrence. |
| 2026-05-21 | In progress | Replaced the frontend error export's stale hardcoded `1.2.0` version with a package-version build define, added test coverage, and added bloat coverage for recurrence. |
| 2026-05-21 | In progress | Replaced frontend testing doc tree diagrams with plain source/test layout lists and added the doc to developer layout bloat coverage. |
| 2026-05-21 | In progress | Replaced Market Intelligence box/tree mockups with plain flow, schema, and dashboard examples, and widened its doc guard to block box, arrow, triangle, emoji, and stale indicator markers. |
| 2026-05-21 | In progress | Replaced architecture and error-handling diagram trees with plain ordered flows, and widened architecture-doc coverage for box and arrow glyph recurrence. |
| 2026-05-21 | In progress | Normalized remaining active docs glyphs in developer and feature docs, including navigation arrows, size trees, resume mapping arrows, and the macOS footer emoji, with bloat guard coverage for recurrence. |
| 2026-05-21 | In progress | Replaced developer onboarding and Rust integration/testing tree diagrams with plain layout lists, with bloat coverage for those maintained developer-doc layout markers. |
| 2026-05-21 | In progress | Normalized the scraper health guide's tables, trend examples, setup paths, and error interpretations from glyph-heavy separators/arrows to plain text, with scraper-health bloat coverage for recurrence. |
| 2026-05-21 | In progress | Replaced the active scraper feature doc's box diagram, arrow-heavy examples, and versioned section labels with plain flow/list text, and widened scraper doc bloat coverage for recurrence. |
| 2026-05-21 | In progress | Normalized active user-facing setup and application-tracking docs from arrow/tree glyphs to plain menu paths and list text, with bloat coverage for recurrence. |
| 2026-05-21 | In progress | Removed remaining box-drawing and arrow glyphs from the active Salary AI feature doc examples and widened resume/salary doc bloat coverage to catch those markers. |
| 2026-05-21 | In progress | Synced LinkedIn source comments and user docs with the current user-opened search-link model, removing stale credential setup guidance; added bloat coverage. |
| 2026-05-21 | In progress | Replaced raw legacy LinkedIn source `Debug` output with shape-only metadata so debug formatting cannot expose session values, search terms, or locations; added regression and bloat coverage. |
| 2026-05-21 | In progress | Replaced raw JobsWithGPT scraper/query `Debug` output with shape-only metadata so debug formatting cannot expose configured endpoints, searched titles, or locations; added regression and bloat coverage. |
| 2026-05-21 | In progress | Sanitized USAJobs HTTP error messages so external API response bodies cannot echo private keywords, locations, or diagnostics into scraper logs; added regression and bloat coverage. |
| 2026-05-21 | In progress | Sanitized JobsWithGPT MCP error handling so external JSON-RPC errors cannot echo searched titles, locations, endpoint tokens, or response data into scraper logs; added regression and bloat coverage. |
| 2026-05-21 | In progress | Removed optional embedded-ML raw local path exposure from command responses, status payloads, model logs, and model-load errors; deleted generated `dist/` root artifact and added bloat guards for recurrence. |
| 2026-05-21 | In progress | Synced notification test fixtures with plain backend scoring reasons, removed nonessential glyphs from email fallback text and notification setup docs, and added bloat coverage for notification scoring/documentation glyph recurrence. |
| 2026-05-21 | In progress | Normalized backend-generated scoring reasons and resume gap analysis from symbol-coded strings to plain text, synced smart-scoring and resume-matcher docs, and added bloat coverage for backend scoring/gap glyph recurrence. |
| 2026-05-21 | In progress | Replaced remaining production frontend emoji/status glyphs in market intelligence, settings, score breakdown, deep links, ghost feedback, import warnings, scraper health, and web-vitals labels with SVG icons or plain text; added a production-source glyph bloat guard. |
| 2026-05-21 | In progress | Removed versioned future-release promises from the README, roadmap, plans index, and Resume Builder disabled ATS callout; replaced visible status emoji in application, analytics, bookmarklet, and interview surfaces, and added bloat coverage for recurrence. |
| 2026-05-21 | In progress | Removed unreferenced tracked docs screenshots for light dashboard and keyboard shortcuts, trimmed duplicate docs screenshot captures, and added bloat coverage so `docs/images/` assets must be referenced by maintained docs. |
| 2026-05-21 | In progress | Removed stale freshness footers and version-suffix roadmap markers from maintained docs while keeping current package-version claims in the docs index tied to `package.json`; updated harness expectations and added guards for recurrence. |
| 2026-05-21 | In progress | Removed unreferenced one-off Intel Mac support report after confirming current universal-binary guidance lives in developer build/release docs; cleaned stale version banners from bookmarklet, embedded-ML, architecture, and testing docs with bloat coverage. |
| 2026-05-21 | In progress | Removed stale status/version/review blocks, local version-history tables, maintainer footers, and phase-promise metadata from remaining maintained feature docs; widened feature-doc metadata bloat coverage. |
| 2026-05-21 | In progress | Removed stale version/status metadata footers from maintained ghost detection, notifications, Application Assist, resume builder, and user-data feature docs, with bloat coverage for recurrence. |
| 2026-05-21 | In progress | Cleaned stale version footers, emoji status markers, and release-history drift from active developer maintenance docs, synced CI workflow count with live workflows, and added bloat coverage for recurrence. |
| 2026-05-21 | In progress | Synced XSS/security overview docs with the live DOMPurify render path, removed stale status/version markers and CDN/custom-config drift, refreshed manual sanitizer examples, and added bloat coverage for recurrence. |
| 2026-05-21 | In progress | Cleaned stale emoji/status examples and version footers from maintained integration and mutation testing docs, and extended testing-doc bloat coverage to those surfaces. |
| 2026-05-21 | In progress | Removed stale emoji/status callouts, version footers, and versioned privacy wording from maintained architecture and error-handling docs, with bloat coverage for recurrence. |
| 2026-05-21 | In progress | Cleaned stale emoji/status callouts and version footers from maintained backend and frontend testing docs, and added bloat coverage so testing docs stay text-only and count/version claims stay command-derived. |
| 2026-05-21 | In progress | Removed remaining database integrity and backup restore emoji/status log markers after finding live drift beyond the earlier connection/diagnostics cleanup, and widened bloat coverage to include the missed integrity modules. |
| 2026-05-21 | In progress | Made keyring migration retry-safe so partial keyring writes or config-clear failures do not set the migration flag, then synced credential security docs and bloat coverage with current key names and command-backed frontend flow. |
| 2026-05-21 | In progress | Hardened Slack, Discord, and Teams webhook URL validators to reject embedded credentials and non-default HTTPS ports; synced URL validation security docs and bloat coverage with the shared validator helper. |
| 2026-05-21 | In progress | Cleaned command-execution security docs to remove stale status markers, Unicode arrows, and version footer while confirming OCR guidance against live resume parser feature gates and command execution flow. |
| 2026-05-21 | In progress | Cleaned webhook security docs to remove status markers, stale version footer, and old keyring version wording while keeping provider host/path validation aligned with live frontend and backend validators. |
| 2026-05-21 | In progress | Synced cache usage docs with the live scraper HTTP client, removing raw URL logging, direct `reqwest::get`, production-disable guidance, and status markers; added bloat coverage for recurrence. |
| 2026-05-21 | In progress | Removed emoji/status markers from SQLite connection and integrity diagnostic log messages plus comments, and added bloat coverage so database logs stay text-only. |
| 2026-05-21 | In progress | Removed unguarded emoji/status markers and stale version-promised future sections from synonym matching and remote preference scoring docs, fixed their test command examples, and added bloat coverage for recurrence. |
| 2026-05-21 | In progress | Rewrote the SQLite configuration doc against live `connection.rs` and integrity APIs, corrected the file-backed cache-size claim to `-128000`, removed speculative cloud-backup roadmap text, and added bloat coverage for recurrence. |
| 2026-05-20 | In progress | Synced scraper docs with live rate-limit constants and local-first no-bypass posture, marking anti-bot-prone sources as best-effort instead of production-guaranteed. |
| 2026-05-20 | In progress | Bounded scraper `Retry-After` delays, sanitized shared HTTP retry logs and error context, removed raw Greenhouse company-URL span fields, and extended bloat coverage for raw scraper URL logging. |
| 2026-05-20 | In progress | Reduced E2E page-object fixed waits, removed the unreferenced Playwright helper module, corrected E2E wait guidance, and added bloat coverage for recurring wait/helper drift. |
| 2026-05-20 | In progress | Removed unused legacy Rust stubs for `scrape_all` and PDF resume export, corrected stale scraper and resume-export docs, and added bloat coverage for recurrence. |
| 2026-05-20 | In progress | Removed dead notification preference sync wrappers, fixed the unknown-source notification threshold to compare normalized score percentages, and added bloat coverage for stale sync wrappers. |
| 2026-05-20 | In progress | Replaced one-call-site automation, feedback, and Dashboard UI barrel imports with direct imports, removed those local barrels, and extended bloat coverage to catch recurring unreferenced barrel modules. |
| 2026-05-20 | In progress | Replaced the remaining broad `src/components` barrel imports with direct component imports, removed the unused component barrel, and added bloat coverage so broad unreferenced barrels do not return. |
| 2026-05-20 | In progress | Removed deprecated `@types/dompurify` stub package after confirming `dompurify` exports its own TypeScript declarations, and added bloat coverage for recurrence. |
| 2026-05-20 | In progress | Removed the redundant direct `playwright` dev dependency now that `@playwright/test` owns the runner, confirmed the Playwright CLI still resolves through transitive ownership, and added bloat coverage for recurrence. |
| 2026-05-20 | In progress | Removed unreferenced generic hook modules, retired the now-dead cache strategy helper, updated active docs that still referenced those hooks, and added bloat coverage for both dead-source classes. |
| 2026-05-20 | In progress | Removed unused `src/components/settings/` helper components and self-only tests after verifying no production imports, and added bloat coverage for unreferenced settings helper components. |
| 2026-05-20 | In progress | Removed unreferenced Markdown notes from `src/components/settings/` and `src/hooks/`, keeping durable docs under `docs/`, and added bloat coverage so tracked source-tree Markdown notes cannot return. |
| 2026-05-20 | In progress | Removed emoji markers from Resume Matcher and Salary AI feature docs, corrected the stale Salary AI future-UI claim now that `src/pages/Salary.tsx` exists, and added bloat coverage for both drift classes. |
| 2026-05-20 | In progress | Synced maintained macOS and getting-started developer docs with current Tauri CLI ownership, build output naming, Rust/frontend test commands, and text-only status guidance, with bloat coverage for those stale patterns. |
| 2026-05-20 | In progress | Corrected stale Vitest name-filter docs from unsupported `--grep` to `-t`, with bloat coverage so frontend unit-test docs stay aligned with current Vitest CLI behavior. |
| 2026-05-20 | In progress | Removed stale active testing-doc guidance that still demonstrated runtime Playwright skips and focused-test modifiers, and added bloat coverage so maintained testing docs cannot reintroduce those patterns. |
| 2026-05-20 | In progress | Fixed Salary AI seniority lookup drift by sending backend-supported `principal` from the UI, accepting legacy `executive` and `director` aliases in the backend parser, and adding bloat coverage for unsupported salary seniority option values. |
| 2026-05-20 | In progress | Added runtime invoke-to-dev-mock parity coverage, filled missing automation, scraper-health, setup, ghost-feedback, interview prep/follow-up, and salary mock handlers, and corrected salary plus interview follow-up frontend/backend response shapes. |
| 2026-05-20 | In progress | Synced resume optimizer dev mock handlers with registered ATS commands, replaced stale format-only mock result shape, aligned frontend keyword-match types with backend `found_in` arrays plus frequency, and added bloat coverage for recurrence. |
| 2026-05-20 | In progress | Synced feedback dev mock handlers with registered Tauri commands, corrected frontend system-info architecture field handling from `arch` to backend `architecture`, and added bloat coverage for feedback mock and contract drift. |
| 2026-05-20 | In progress | Synced job-import dev mock handlers with registered Tauri commands, added preview/import duplicate behavior, mirrored external URL blocking, and added bloat coverage for missing job-import mock command cases. |
| 2026-05-20 | In progress | Synced deep-link dev mock handlers with registered Tauri commands, mirrored supported-site metadata and URL generation, blocked unsafe mock open URLs, and added bloat coverage for missing deep-link mock command cases. |
| 2026-05-20 | In progress | Restored notification preference parity by adding backend-required Indeed config to frontend defaults/UI, syncing mock get/save handlers, and correcting stale notification preference API docs. |
| 2026-05-20 | In progress | Synced cover-letter template dev mock handlers with real Tauri command names, added lifecycle regression coverage, and broadened mock-parity bloat coverage for user-data commands. |
| 2026-05-20 | In progress | Synced dev mock handlers with real saved-search and search-history Tauri command names, removed stale `save_search` behavior, and added regression plus bloat-sensor coverage. |
| 2026-05-20 | In progress | Fixed saved-search IPC shape so create and undo restore send the backend `search` envelope, frontend reads camelCase saved-search results, and invoke-surface checks catch missing required command args. |
| 2026-05-20 | In progress | Fixed dashboard search-history loading by sending the required `limit` argument to the backend command, and added invoke-surface coverage for recurrence. |
| 2026-05-20 | In progress | Sanitized user-data command and manager logging so saved-search text, saved-search names, cover-letter template names, and notification preference payloads are not captured by logs or tracing spans. |
| 2026-05-20 | In progress | Added backend sanitization for saved feedback file content, so frontend-provided report text cannot bypass the privacy contract before writing through the native save dialog. |
| 2026-05-20 | In progress | Expanded frontend stored-error webhook redaction so malformed Slack webhook-like URLs and provider Discord/Teams webhook URLs are redacted before generic URL sanitization can preserve token paths. |
| 2026-05-20 | In progress | Sanitized structured feedback debug events returned to the frontend, so GitHub/Drive feedback paths cannot bypass the formatted debug-log sanitizer, and added bloat coverage for recurrence. |
| 2026-05-20 | In progress | Fixed feedback-report webhook redaction so provider-valid Discord and Teams webhook URLs are sanitized, corrected notification docs for all allowed provider hosts, and added bloat coverage for recurrence. |
| 2026-05-20 | In progress | Added frontend validation gates for Slack, Discord, and Teams webhook credential saves, added Teams URL validation coverage, corrected stale webhook allowlist docs, and added bloat coverage for recurrence. |
| 2026-05-20 | In progress | Sanitized frontend error-report storage so browser-local error logs no longer persist raw URLs, emails, tokens, webhook URLs, user paths, or captured async arguments; corrected localStorage persistence docs. |
| 2026-05-20 | In progress | Removed stale Storybook config entries for an uninstalled Chromatic addon and an empty MDX story glob, with bloat coverage for unowned Storybook addons. |
| 2026-05-20 | In progress | Added bookmarklet import token authentication so arbitrary websites cannot POST jobs into the local SQLite database when the localhost bookmarklet server is running. |
| 2026-05-20 | In progress | Hardened bookmarklet import responses and logs so local HTTP error bodies are JSON-escaped and import logs use job hash plus shape metadata instead of raw title/company names. |
| 2026-05-20 | In progress | Sanitized job-import redirect error output so blocked redirect `Location` headers cannot expose credentials, query strings, fragments, or search terms in UI/Display messages. |
| 2026-05-20 | In progress | Sanitized database error display output so formatted errors no longer expose SQL query text or local backup/database paths. |
| 2026-05-20 | In progress | Sanitized automation error display output so browser automation logs and command error strings do not expose raw application URLs, credentials, query strings, or fragments. |
| 2026-05-20 | In progress | Sanitized scraper error display output so scheduler logs and health rows no longer receive raw scraper URLs or search query text from `ScraperError::to_string()`. |
| 2026-05-20 | In progress | Replaced raw JobsWithGPT MCP request logging with sanitized endpoint and search-shape metadata, with bloat coverage for recurrence. |
| 2026-05-20 | In progress | Replaced raw notification success job-title logs with structured job id/hash metadata, and added bloat coverage for recurrence. |
| 2026-05-20 | In progress | Sanitized LinkedIn auth navigation logs so login redirects are written as sanitized URL labels, with bloat coverage for recurrence. |
| 2026-05-20 | In progress | Replaced raw automation screening question debug logs with question-length metadata, and added bloat coverage for recurrence. |
| 2026-05-20 | In progress | Sanitized job-import spans and result logs so raw import URLs, titles, and companies are not written to logs, with bloat coverage for recurrence. |
| 2026-05-20 | In progress | Replaced raw legacy LinkedIn source query and location span fields with length metadata, and extended source-log bloat coverage. |
| 2026-05-20 | In progress | Sanitized remaining raw URL logging in URL normalization parse failures and browser automation spans, and added bloat coverage for recurrence. |
| 2026-05-20 | In progress | Replaced raw local path logging with non-identifying path labels for resume, automation, database, platform, startup, and ML model paths. |
| 2026-05-20 | In progress | Sanitized scraper cache, fetch, and query logs so source adapters no longer write raw search queries or full fetch URLs. |
| 2026-05-20 | In progress | Sanitized command and database search logging so raw private search queries, screening questions, and answer patterns are not written to logs. |
| 2026-05-20 | In progress | Validated ghost-job threshold command input so public IPC cannot query with out-of-range or non-finite ghost scores. |
| 2026-05-20 | In progress | Added shared Tauri command limit validation across job, ghost, resume, market, automation, user-data, and health commands, with invoke-surface coverage for recurrence. |
| 2026-05-20 | In progress | Validated Market Intelligence historical snapshot day ranges before integer conversion, with Tauri command-boundary sensor coverage. |
| 2026-05-20 | In progress | Removed decorative emoji and stale indicator API names from Market Intelligence feature docs, with bloat coverage for recurrence. |
| 2026-05-20 | In progress | Replaced stale Linux platform stub wording in source comments/logging and added bloat coverage for those markers. |
| 2026-05-20 | In progress | Removed color emoji status bullets from Ghost Detection and Resume Builder feature docs, with bloat coverage for recurrence. |
| 2026-05-20 | In progress | Sanitized score-breakdown modal input so direct non-finite scores render as `0%` instead of `NaN%`, with boundary regression coverage. |
| 2026-05-20 | In progress | Fixed score-breakdown overall score color rendering that converted Tailwind text classes into invalid inline CSS colors, and added frontend boundary coverage for recurrence. |
| 2026-05-20 | In progress | Corrected smart-scoring docs that promised a robot salary marker not present in the UI, with bloat coverage for recurrence. |
| 2026-05-20 | In progress | Corrected stale application-tracking docs that still marked Kanban UI and Tauri commands as future work, with bloat coverage for recurrence. |
| 2026-05-20 | In progress | Removed emoji status markers from scraper health docs and added bloat coverage for recurrence. |
| 2026-05-20 | In progress | Removed emoji status markers from scraper feature docs and added bloat coverage for recurrence. |
| 2026-05-20 | In progress | Removed emoji markers from front-door README docs and added bloat coverage for recurrence. |
| 2026-05-20 | In progress | Removed emoji markers from Quick Start user docs and added bloat coverage for recurrence. |
| 2026-05-20 | In progress | Removed emoji status markers and stale version promises from Deep Links user docs, with bloat coverage for recurrence. |
| 2026-05-20 | In progress | Corrected stale user-data export and backup docs that still promised v1.5 JSON export/import, and added bloat coverage for those stale roadmap claims. |
| 2026-05-20 | In progress | Added Deep Link UI controls for backend-supported job type and work mode filters, plus frontend coverage and user-doc corrections. |
| 2026-05-20 | In progress | Replaced dynamic Tailwind category button classes in the deep-link UI with static class metadata and added frontend sensor coverage for interpolated Tailwind utility names. |
| 2026-05-20 | In progress | Removed redundant tracked `.gitkeep` placeholders from non-empty plan directories and added bloat coverage for future tracked `.gitkeep` files. |
| 2026-05-20 | In progress | Sanitized deep-link and job-import URL logging so search terms, locations, credentials, query strings, and fragments are not written to logs. |
| 2026-05-20 | In progress | Re-enabled company scoring tests that were still commented out after fuzzy matching landed, and added test-quality coverage for temporarily disabled test blocks. |
| 2026-05-20 | In progress | Replaced roadmap status emoji with text-only statuses and added bloat coverage to keep active roadmap status rows ASCII. |
| 2026-05-20 | In progress | Corrected local-first architecture wording and roadmap statuses for shipped importer, deep-link, and bookmarklet features; bloat sensor now catches stale shipped-feature roadmap statuses. |
| 2026-05-20 | In progress | Corrected stale scheduler worker paths and removed fixed refactor-priority snapshots from setup docs; bloat sensor now catches those drift patterns. |
| 2026-05-20 | Active | Expanded removing bloat and junk into a dedicated cleanup track covering root clutter, nested stale content, candidate classification, and reference-safe deletion or relocation. |
| 2026-05-20 | Active | Added removing bloat and junk as an explicit cleanup track. Current bloat sensor passes, so next pass must classify root clutter and nested stale content beyond disposable artifacts. |
| 2026-05-20 | In progress | Classified current root entries in the bloat sensor allowlist, removed an unreferenced one-off cache test shell script, and added a guard against future nested `test_*.sh` helper drift outside `scripts/`. |
| 2026-05-20 | In progress | Fixed resume matcher education lookup error handling so database failures no longer score as missing education. |
| 2026-05-20 | In progress | Moved ignored embedded-ML tests off repo-relative `test_cache` and `test_ml_cache` directories, taught the bloat sensor to reject those cache dirs, and restored embedded-ML feature compilation. |
| 2026-05-20 | In progress | Restored full Rust test-suite health by updating stale screening-answer integration fixtures and normalizing legacy answer types at the profile manager boundary. |
| 2026-05-20 | In progress | Fixed scheduler shutdown so an in-flight scraping cycle cannot block full-suite integration tests or app shutdown. |
| 2026-05-20 | In progress | Stabilized Chromium and WebKit E2E flows without serializing suites: fixed skip-link focusability, gave the email-alerts switch an accessible visible target, and removed shared page-object state from job interaction tests. |
| 2026-05-20 | In progress | Removed the unreferenced development Dockerfile, pruned its stale Dependabot entry, and tightened the root bloat allowlist so `docker/` must be reintroduced intentionally. |
| 2026-05-20 | In progress | Linked the JSON Resume sample fixture from feature docs and corrected roadmap status from planned to implemented. |
| 2026-05-20 | In progress | Corrected stale E2E documentation that still referenced WebdriverIO, removed a deleted `tests/e2e/docs/` tree entry, and updated Playwright examples/layout notes. |
| 2026-05-20 | In progress | Hardened the LinkedIn login result channel so a poisoned mutex cannot panic the auth flow, and added a regression test for poisoned sender recovery. |
| 2026-05-20 | In progress | Removed implicit external location detection from setup/settings, switched the backend lookup to HTTPS, and documented explicit FreeIPAPI public-IP lookup behavior. |
| 2026-05-20 | In progress | Hardened ATS URL detection so provider names in query strings or lookalike hosts cannot produce false platform matches, and corrected related architecture docs. |
| 2026-05-20 | In progress | Sanitized automation command URL logging so credentials, query strings, fragments, and invalid raw URLs are not written to logs. |
| 2026-05-20 | In progress | Removed stale hard-coded Tauri command sub-counts from docs, added missing user-data command docs, and extended the invoke checker to catch command-count documentation drift. |
| 2026-05-20 | In progress | Removed the registered but unimplemented automation screenshot IPC command and added an invoke-surface sensor for registered stub commands. |
| 2026-05-20 | In progress | Tightened test-quality sensors to reject Rust `assert!(true)` no-op assertions and replaced the browser-manager creation smoke test with a real initial-state assertion. |
| 2026-05-20 | In progress | Removed the empty `tests/e2e/fixtures/` placeholder directory and taught the bloat sensor to reject reserved future fixture placeholders. |
| 2026-05-20 | In progress | Removed speculative cloud deployment docs that pointed to a non-existent cloud source tree and contradicted the local-first architecture. |
| 2026-05-20 | In progress | Replaced stale informal maintainer footers in developer docs and added bloat coverage to keep them out. |
| 2026-05-20 | In progress | Corrected stale docs tree claims for SQLite migrations and Rust integration tests, and added bloat coverage for those drift patterns. |

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
- Market Intelligence feature docs still used emoji-heavy headings, sample
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
- Keep Market Intelligence docs aligned with text indicator APIs such as
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
  Preserve exact error objects for development console output, but stored reports
  must strip URL query strings/fragments/userinfo, emails, tokens, webhook URLs,
  local user paths, and sensitive context keys.
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
- Match ATS platforms from parsed URL host/path only; HTML fallback can inspect
  page content, but URL detection must not trust arbitrary query text.
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

## Outcomes

- Pending.
