# Full Manual Validation v2.9.1

Last updated: 2026-06-22.

This is the live/manual regression validation ledger for the `v2.9.1`
maintenance release. Because this patch is cleanup and maintainability only,
the release bar is to prove existing behavior still works as expected and to
record any validation surface that was not exercised.

Every major page and user-facing capability must have manual evidence.
Restricted-source checks remain user-directed. No release-ready claim is valid
until every regression-critical row is Pass, Partial with adequate automated
coverage, or Accepted release hold.

## Success Criteria

- Validate the app built from the intended `v2.9.1` commit or package.
- Use isolated test app data, test resumes, test job records, and disposable
  notification or provider credentials only.
- Cover Windows 11, macOS, and Linux. If one platform is unavailable, record it
  as a release hold or an explicit accepted gap.
- Exercise online and offline paths, default local-first behavior, disabled
  external-AI behavior, and opt-in external channels.
- Confirm no raw secrets, local file paths, session cookies, authorization
  headers, or full database payloads appear in app screens, support reports,
  logs, backups, or external AI previews.
- Record screenshots or short notes for each major page, modal, destructive
  confirmation, external send, restricted-source warning, error state, empty
  state, and narrow-width or keyboard pass.

## Run Evidence

| Field | Value |
| ----- | ----- |
| Validation date | 2026-06-22 |
| Local commit | Local `v2.9.1` release-prep branch; exact public commit is set when the release tag is cut |
| Package version | `2.9.1` |
| Build or installer source | Vite mock app, production frontend build, Rust library tests, and native macOS `tauri dev` smoke from the local `v2.9.1` release-prep branch; no native installer, DMG, AppImage, deb, or rpm was generated in this pass |
| Validator | Codex local macOS shell, Playwright run, and isolated Tauri dev smoke |
| Test data root | Playwright mock fixtures, Vitest fixtures, Rust in-memory/temp data, docs screenshot fixtures, and isolated macOS smoke root under `$TMPDIR/jobsentinel-macos-smoke-*` |
| Network mode notes | Local Vite server and local tests only. No disposable external notification endpoints, external AI provider keys, live public source checks, restricted-source accounts, or native app package were used. |
| Result | Cleanup-release regression pass with scoped gaps. Browser/UI mock, native macOS dev startup, production frontend build, frontend unit tests, backend library tests, docs screenshots, docs lint, bloat, and harness gates passed. Native installer/package, Windows, Linux, live-source, restricted-source, and credentialed external-channel validation remain unexercised and are not claimed. |

## Local Evidence 2026-06-22

| Check | Result |
| ----- | ------ |
| `npm run doctor:e2e` | Pass with two local baseline warnings: Node `26.3.1` is newer than CI `24.17.0`; npm `11.16.0` is below package-manager pin `11.17.0` because CI runs `node scripts/install-pinned-npm.mjs` first |
| `npm run test:e2e:all:budget` | Pass after final shortcut timing fix: 278 expected, 0 unexpected, 0 flaky, 0 skipped; 147739.463 ms / 240000 ms; 278 tests / 320 budget |
| `npm run test:e2e -- tests/e2e/playwright/keyboard-navigation.spec.ts --project=webkit --reporter=line` | Pass: 38 Chromium/WebKit keyboard-navigation tests |
| `npm run docs:screenshots` | Pass: 9 Chromium screenshots captured; no tracked screenshot changes |
| `npm run test:run` | Pass: 188 files, 3261 tests |
| `npm run build` | Pass |
| `npm run tauri:dev` with isolated macOS smoke root | Pass: native app compiled and launched on macOS 26.5.1, created isolated config/data directories, used smoke-only database key, initialized encrypted SQLite, held scheduler for first-run setup, initialized tray, and reached `JobSentinel initialized successfully` |
| Smoke-root file permissions | Pass: isolated root, config dir, data dir were `drwx------`; `jobs.db` was `-rw-------`; smoke roots were removed after inspection |
| `cargo test --manifest-path src-tauri/Cargo.toml --lib` | Pass: 2958 passed, 0 failed, 11 ignored |
| `npm audit --audit-level=high` | Pass: 0 vulnerabilities |
| `npm run release:check-deps` | Pass: latest stable direct package, crate, override, tool, and GitHub Actions pins verified |
| `npm run release:check-env -- --version 2.9.1` | Pass: unsigned Windows and no-account macOS paths available; signed Windows and Gatekeeper-ready macOS remain credential-dependent |
| `npm run release:readiness -- --version 2.9.1` | Pass |
| `npm run lint:docs` | Pass |
| `npm run harness:check` | Pass |
| `npm run lint:bloat` | Pass |
| `git diff --check` | Pass |

Status language below is intentionally strict:

- `Pass local` means covered by local browser mock, screenshot, frontend unit,
  backend library, or build evidence.
- `Partial` means useful local evidence exists, but native app, platform,
  live-source, account, credentialed external service, or manual observation is
  still missing.
- `Blocked` means this machine or run lacks the platform, package, account, or
  disposable credential needed to complete that row.

## Platform Matrix

| Platform | Package or command | Required checks | Result |
| -------- | ------------------ | --------------- | ------ |
| Windows 11 | Installer or `npm run tauri:dev` | Launch, SmartScreen or unsigned warning path, app data permissions, settings backup/restore, notifications, browser open flows | Blocked: Windows 11 package/runtime not available in this run |
| macOS | DMG or `npm run tauri:dev` | Gatekeeper or no-account warning path, checksum, first launch, app data permissions, keychain/passphrase path, browser open flows | Partial: `tauri dev` isolated startup, encrypted database creation, first-run state, tray init, and data permissions passed; DMG/checksum/Gatekeeper and manual keychain/browser-open flows were not exercised |
| Linux | AppImage/deb/rpm or `npm run tauri:dev` | First launch, app data permissions, desktop notifications where supported, browser open flows | Blocked: Linux package/runtime not available in this run |

## Preflight

1. Start from a clean git tree or record all intentional local changes.
2. Run the automated release gate subset before manual validation:

   ```bash
   npm run harness:check
   npm run lint:docs
   npm run lint:bloat
   npm run lint
   npm run test:run
   npm run build
   cd src-tauri && cargo fmt --all -- --check
   cd src-tauri && cargo clippy -- -D warnings
   cd src-tauri && cargo test --lib
   ```

3. Create or select isolated app data for the validation run. Do not use a real
   job-search database unless the user explicitly approves it.
4. Prepare test records: at least five jobs, two saved searches, two resumes,
   one application in each board stage, one offer, one below-floor pay example,
   one source failure, and one import payload.
5. Prepare external endpoints only when they are disposable: email test inbox,
   Slack, Discord, Teams, Telegram, external AI provider test key, and a browser
   profile with no personal sessions.
6. Open the app with devtools or log capture available. Store only sanitized
   notes, never secrets or raw credential output.

## Manual Surface Checklist

| Surface | Required manual checks | Result |
| ------- | ---------------------- | ------ |
| Install and launch | Install or run the build, launch twice, close cleanly, reopen with persisted local data, verify app version and no update prompt | Partial: production frontend build, Playwright app launch, and native macOS `tauri dev` startup passed; native package launch remains pending |
| First-run and empty states | Fresh profile shows understandable empty Dashboard, Applications, Resume, Salary, Market, Application Assist, and Settings states | Pass local: setup wizard, empty/loading/error, and mock route coverage passed through E2E and unit tests |
| Main navigation | Sidebar buttons and `Cmd/Ctrl+1` through `Cmd/Ctrl+8` reach Dashboard, Applications, Resumes, Salary, Hiring Trends, Application Assist, Resume Builder, and Resume Match | Pass local: full E2E and screenshot pass covered main routes |
| Keyboard and focus | Tab order, focus outlines, skip-to-content, modals, toasts, and destructive confirmations are keyboard usable | Pass local: final pass fixed an early-startup shortcut timing race; focused Chromium/WebKit keyboard E2E covered shortcuts, skip link, command palette, focus trap, search focus, and help |
| Responsive view | Major pages fit at narrow width without clipped controls, unreadable tables, or overlapping text | Pass local: responsive E2E and screenshot pass completed with no tracked screenshot changes |
| Theme and visual state | Light/dark mode, loading skeletons, empty states, error states, disabled controls, badges, and toasts remain legible | Pass local: app shell theme, screenshots, forced-state tests, and docs screenshot pass completed |
| Dashboard search setup | Create and edit saved searches with title, location, remote mode, pay floor, keywords, source choices, and limits | Partial: setup wizard and dashboard search/filter tests passed; native persistence pass remains pending |
| Dashboard job review | Search or seed jobs, inspect cards, sort/filter, save, hide, bookmark, open details, and confirm persistence | Pass local: job interaction and search/filter E2E passed against mock fixtures |
| Fit and ghost review | Confirm fit reasons, posting-risk cues, stale/reposted/weak-source/scam-like warnings, and local fallback explanations | Partial: local frontend and Rust ghost/scoring tests passed; live-source posting review remains pending |
| Public source checks | Run approved public source checks at low volume, confirm rate-limit behavior, source status, user-friendly failures, and no hidden retries | Partial: backend source, parser, health, rate-limit, and error-sanitization tests passed; live low-volume source checks remain pending |
| Source settings | Toggle source classes, review warnings, save config, reload app, and verify scheduled checks respect disabled sources | Partial: settings and config tests passed; native reload and scheduled-check observation remain pending |
| User-configured job source endpoints | Configure, approve exact details, run one check, change details, and verify scheduler skips until reapproved | Partial: approval-boundary tests passed; disposable endpoint live check remains pending |
| Browser Import | Start local receiver, import visible job data from a browser page, review queued payload, accept, reject, and confirm one-use behavior | Partial: bookmarklet/import tests passed; live local receiver browser pass remains pending |
| Pasted link and manual import | Add a job by URL or manual entry, verify validation, editable fields, and duplicate handling | Partial: import, URL security, and duplicate tests passed; native manual add pass remains pending |
| Restricted-source Workbench | Show warning before sign-in, user starts session, import only selected visible information, and verify no cookies, tokens, browser storage, or auth headers are persisted | Partial: restricted-source, LinkedIn disabled-credential, and no-session-persistence tests passed; user-directed live account session remains pending |
| Deep links and bookmarklet | Exercise documented deep link and bookmarklet import paths with valid, duplicate, malformed, and expired payloads | Partial: deep-link and bookmarklet tests passed; OS/browser live open pass remains pending |
| Applications board | Move applications across stages, drag with pointer, use keyboard where supported, add notes, contacts, reminders, interviews, offers, and no-response review | Pass local: application tracking E2E and frontend tests passed |
| Application review panel | Confirm status summaries, follow-up cues, stale application warnings, and import-from-applications path | Pass local: application tracking E2E and frontend tests passed |
| Resume library | Add resume files, parse readable text, rename/delete/select active, confirm raw local paths stay hidden in UI and support output | Partial: resume E2E, frontend tests, and Rust path-redaction tests passed; native file picker pass remains pending |
| Resume Match | Compare a selected resume to a job, inspect requirements, gaps, hard blockers, evidence labels, local scoring, and unavailable-model fallback | Partial: Resume Match E2E and backend matcher tests passed; real local-model file pass remains pending |
| Resume Builder | Import JSON Resume, edit sections, preview, export PDF, DOCX, and JSON, then reopen or inspect exported files | Partial: Resume Builder E2E and backend export tests passed; native PDF/print and file-open inspection remain pending |
| Application Assist | Save profile details, screening answers, selected resume display name, launch browser prep, fill only reviewed data, cancel, and keep final submission manual | Partial: Application Assist E2E and backend tests passed; native browser launch pass remains pending |
| Salary and pay protection | Set salary floors, review below-floor roles, written versus verbal offer fields, total compensation, commute, relocation, deadline pressure, and negotiation notes | Pass local: Salary page E2E, frontend, and Rust salary tests passed |
| Hiring Trends | Refresh trends from local data, inspect company/skill/location/pay summaries, alerts tab, mark-read behavior, and empty/error states | Pass local: Hiring Trends E2E, frontend, and Rust market tests passed |
| Notifications | Test desktop, email, Slack, Discord, Teams, and Telegram with disposable endpoints; verify validation, failure messages, disable path, and payload content | Partial: notification validation and secret-boundary tests passed; disposable live endpoint delivery remains pending |
| Saved secrets | Save, read through explicit user action, delete, passphrase fallback, wrong passphrase error, and passive Settings reload without credential prompts | Partial: Rust credential/passphrase/vault tests and smoke-only database-key path passed; native OS keychain prompt pass remains pending |
| External AI settings | Configure each supported provider type with a test key or custom endpoint, reorder providers, save model names, delete keys, and reload | Partial: settings, config, and gateway tests passed; disposable provider/custom endpoint live pass remains pending |
| External AI job summary | With external AI disabled, confirm local fallback; with provider enabled, preview/edit/cancel/approve one public job summary and inspect metadata-only history | Partial: gateway validation tests passed; provider-backed UI approval pass remains pending |
| External AI privacy guards | Attempt private resume, salary, note, application-history, prompt-like, encoded, hidden, and full-database payloads through available UI or test harnesses; confirm blocks | Pass local: backend external-AI privacy guard tests passed |
| Local semantic matching | Verify model status, unavailable-model fallback, deterministic local matching, and governed model diagnostics without provider calls | Partial: disabled-build diagnostics and local matcher tests passed; real governed model files remain pending |
| Safe support report | Generate support output, review sanitizer, reveal saved file, confirm no secrets, raw paths, full database, session data, or private resume text | Partial: feedback sanitizer/report tests passed; native reveal-file UI pass remains pending |
| Backups and restore | Export settings backup, inspect expected redaction, restore into a clean profile, and confirm secrets are not restored from backup | Partial: Rust backup/restore and frontend backup parsing tests passed; native UI restore pass remains pending |
| Error boundaries | Trigger or simulate a recoverable page error, verify safe reset wording, local-settings reset confirmation, and no data-loss surprise | Partial: frontend error-boundary tests passed; manual native trigger remains pending |
| Offline mode | Disable network and confirm local jobs, resumes, applications, salary, backups, and settings still work; external actions fail clearly | Pending: no network-disabled native pass run |
| Privacy invariants | Confirm default install has no telemetry, no cloud sync, no external AI call, no updater endpoint, and no unexpected background restricted-source access | Partial: harness/security/backend tests passed; native runtime observation remains pending |
| Release docs from UI | Verify Help, update, privacy, responsible AI, and release-status links open the intended local or GitHub pages without stale version claims | Partial: docs lint and stale-claim sweep passed; in-app link click pass remains pending |

## Feature Privacy Label Coverage

| Feature label id | Manual evidence required | Result |
| ---------------- | ------------------------ | ------ |
| `job-tracking` | Local job save, status, notes, and delete persistence without external send | Pass local |
| `saved-searches` | Local saved search CRUD and source approval boundaries | Partial: local setup/search evidence passed; native persistence pending |
| `application-kanban` | Local board movement, notes, reminders, and history | Pass local |
| `application-assist` | Local profile and manual final submission boundary | Partial: local evidence passed; native browser prep pending |
| `first-seen-last-seen-job-tracking` | First seen, last seen, stale, and reposted signals | Partial: local tests passed; live source history pending |
| `user-configured-job-source-endpoints` | Explicit endpoint approval and reapproval after detail changes | Partial: local approval tests passed; live endpoint pending |
| `ghost-job-heuristic-scoring` | Local posting-risk scoring and reasons | Pass local |
| `ghost-job-external-ai-explanation` | Optional public-data-only external path or local fallback | Partial: local guard tests passed; provider-backed UI path pending |
| `job-description-summary` | Optional public-data-only external path or local fallback | Partial: local guard tests passed; provider-backed UI path pending |
| `resume-assistance-application-readability` | Local resume parsing, readable text, and truthful guidance | Pass local |
| `resume-job-fit-explanation` | Local fit evidence and blocked sensitive external send unless explicitly reviewed | Partial: local fit tests passed; sensitive external-send UI path remains pending |
| `negotiation-prep` | Local negotiation notes and sensitive external-send guard | Partial: local salary/negotiation evidence passed; external-send path pending |
| `salary-floor-protection` | Local salary-floor filtering and warnings | Pass local |
| `salary-transparency-check` | Local public posting pay-range review | Pass local |
| `salary-transparency-ai-explanation` | Optional public-data-only external path or local fallback | Partial: local guard tests passed; provider-backed UI path pending |
| `safe-support-report` | Sanitized support report review and reveal path | Partial: sanitizer/report tests passed; native reveal path pending |
| `research-evaluation` | Public-postings-only or synthetic-data-only research fixtures | Partial: test fixtures passed; no live research/export pass run |

## Exit Bar

- Every regression-critical row is `Pass`, `Pass local`, `Partial`, `Fail`,
  `Blocked`, or `Accepted release hold`.
- Every `Fail` has an issue, local fix commit, or release hold decision.
- Every `Blocked` row states the missing platform, credential, account, or
  external service dependency.
- Privacy and security rows cannot be accepted as release gaps without explicit
  maintainer approval.
- The final v2.9.1 release note must summarize the manual validation date,
  platforms, package source, and any accepted gaps.
