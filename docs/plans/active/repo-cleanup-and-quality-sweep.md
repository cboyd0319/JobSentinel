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
- Update docs when repo structure, behavior, commands, or security posture
  changes.

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
- [ ] Remove root and nested bloat/junk after classifying each candidate as
  keep, move, merge, or delete.
- [x] Stabilize skip-heavy Playwright suites and remove `test.skip()` sprawl.
- [x] Harden frontend job URL validation for loopback, mapped, and multicast
  targets.
- [x] Harden backend job import fetches against HTTP redirect trust-boundary
  changes.
- [x] Classify root files and mark each as keep, move, merge, or delete.
- [ ] Search nested paths for stale reports, generated output, logs, build
  products, duplicate docs, and obsolete examples.
- [x] Remove or relocate confirmed bloat and update references.
- [x] Add sensor coverage for any recurring junk class found during cleanup.
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
| 2026-05-21 | In progress | Removed unreferenced tracked docs screenshots for light dashboard and keyboard shortcuts, trimmed duplicate docs screenshot captures, and added bloat coverage so `docs/images/` assets must be referenced by maintained docs. |
| 2026-05-21 | In progress | Removed stale freshness footers and version-suffix roadmap markers from maintained docs while keeping current package-version claims in the docs index tied to `package.json`; updated harness expectations and added guards for recurrence. |
| 2026-05-21 | In progress | Removed unreferenced one-off Intel Mac support report after confirming current universal-binary guidance lives in developer build/release docs; cleaned stale version banners from bookmarklet, embedded-ML, architecture, and testing docs with bloat coverage. |
| 2026-05-21 | In progress | Removed stale status/version/review blocks, local version-history tables, maintainer footers, and phase-promise metadata from remaining maintained feature docs; widened feature-doc metadata bloat coverage. |
| 2026-05-21 | In progress | Removed stale version/status metadata footers from maintained ghost detection, notifications, one-click apply, resume builder, and user-data feature docs, with bloat coverage for recurrence. |
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
| 2026-05-20 | In progress | Replaced raw LinkedIn scraper query and location span fields with length metadata, and extended scraper-log bloat coverage. |
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
- The LinkedIn scraper span still recorded raw search query and location fields.
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
