# Full Manual Validation v2.9.1

Last updated: 2026-06-22.

This is the required live/manual validation ledger for the `v2.9.1`
maintenance release. It is not completion evidence until every required row has
an owner, platform evidence, and a result.

Every major page and user-facing capability must have manual evidence.
Restricted-source checks remain user-directed. No release-ready claim is valid
until every required row is Pass or Accepted release hold.

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
| Validation date | TBD |
| Local commit | TBD |
| Package version | TBD |
| Build or installer source | TBD |
| Validator | TBD |
| Test data root | TBD |
| Network mode notes | TBD |
| Result | Pending |

## Platform Matrix

| Platform | Package or command | Required checks | Result |
| -------- | ------------------ | --------------- | ------ |
| Windows 11 | Installer or `npm run tauri:dev` | Launch, SmartScreen or unsigned warning path, app data permissions, settings backup/restore, notifications, browser open flows | Pending |
| macOS | DMG or `npm run tauri:dev` | Gatekeeper or no-account warning path, checksum, first launch, app data permissions, keychain/passphrase path, browser open flows | Pending |
| Linux | AppImage/deb/rpm or `npm run tauri:dev` | First launch, app data permissions, desktop notifications where supported, browser open flows | Pending |

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
| Install and launch | Install or run the build, launch twice, close cleanly, reopen with persisted local data, verify app version and no update prompt | Pending |
| First-run and empty states | Fresh profile shows understandable empty Dashboard, Applications, Resume, Salary, Market, Application Assist, and Settings states | Pending |
| Main navigation | Sidebar buttons and `Cmd/Ctrl+1` through `Cmd/Ctrl+8` reach Dashboard, Applications, Resumes, Salary, Hiring Trends, Application Assist, Resume Builder, and Resume Match | Pending |
| Keyboard and focus | Tab order, focus outlines, skip-to-content, modals, toasts, and destructive confirmations are keyboard usable | Pending |
| Responsive view | Major pages fit at narrow width without clipped controls, unreadable tables, or overlapping text | Pending |
| Theme and visual state | Light/dark mode, loading skeletons, empty states, error states, disabled controls, badges, and toasts remain legible | Pending |
| Dashboard search setup | Create and edit saved searches with title, location, remote mode, pay floor, keywords, source choices, and limits | Pending |
| Dashboard job review | Search or seed jobs, inspect cards, sort/filter, save, hide, bookmark, open details, and confirm persistence | Pending |
| Fit and ghost review | Confirm fit reasons, posting-risk cues, stale/reposted/weak-source/scam-like warnings, and local fallback explanations | Pending |
| Public source checks | Run approved public source checks at low volume, confirm rate-limit behavior, source status, user-friendly failures, and no hidden retries | Pending |
| Source settings | Toggle source classes, review warnings, save config, reload app, and verify scheduled checks respect disabled sources | Pending |
| User-configured job source endpoints | Configure, approve exact details, run one check, change details, and verify scheduler skips until reapproved | Pending |
| Browser Import | Start local receiver, import visible job data from a browser page, review queued payload, accept, reject, and confirm one-use behavior | Pending |
| Pasted link and manual import | Add a job by URL or manual entry, verify validation, editable fields, and duplicate handling | Pending |
| Restricted-source Workbench | Show warning before sign-in, user starts session, import only selected visible information, and verify no cookies, tokens, browser storage, or auth headers are persisted | Pending |
| Deep links and bookmarklet | Exercise documented deep link and bookmarklet import paths with valid, duplicate, malformed, and expired payloads | Pending |
| Applications board | Move applications across stages, drag with pointer, use keyboard where supported, add notes, contacts, reminders, interviews, offers, and no-response review | Pending |
| Application review panel | Confirm status summaries, follow-up cues, stale application warnings, and import-from-applications path | Pending |
| Resume library | Add resume files, parse readable text, rename/delete/select active, confirm raw local paths stay hidden in UI and support output | Pending |
| Resume Match | Compare a selected resume to a job, inspect requirements, gaps, hard blockers, evidence labels, local scoring, and unavailable-model fallback | Pending |
| Resume Builder | Import JSON Resume, edit sections, preview, export PDF, DOCX, and JSON, then reopen or inspect exported files | Pending |
| Application Assist | Save profile details, screening answers, selected resume display name, launch browser prep, fill only reviewed data, cancel, and keep final submission manual | Pending |
| Salary and pay protection | Set salary floors, review below-floor roles, written versus verbal offer fields, total compensation, commute, relocation, deadline pressure, and negotiation notes | Pending |
| Hiring Trends | Refresh trends from local data, inspect company/skill/location/pay summaries, alerts tab, mark-read behavior, and empty/error states | Pending |
| Notifications | Test desktop, email, Slack, Discord, Teams, and Telegram with disposable endpoints; verify validation, failure messages, disable path, and payload content | Pending |
| Saved secrets | Save, read through explicit user action, delete, passphrase fallback, wrong passphrase error, and passive Settings reload without credential prompts | Pending |
| External AI settings | Configure each supported provider type with a test key or custom endpoint, reorder providers, save model names, delete keys, and reload | Pending |
| External AI job summary | With external AI disabled, confirm local fallback; with provider enabled, preview/edit/cancel/approve one public job summary and inspect metadata-only history | Pending |
| External AI privacy guards | Attempt private resume, salary, note, application-history, prompt-like, encoded, hidden, and full-database payloads through available UI or test harnesses; confirm blocks | Pending |
| Local semantic matching | Verify model status, unavailable-model fallback, deterministic local matching, and governed model diagnostics without provider calls | Pending |
| Safe support report | Generate support output, review sanitizer, reveal saved file, confirm no secrets, raw paths, full database, session data, or private resume text | Pending |
| Backups and restore | Export settings backup, inspect expected redaction, restore into a clean profile, and confirm secrets are not restored from backup | Pending |
| Error boundaries | Trigger or simulate a recoverable page error, verify safe reset wording, local-settings reset confirmation, and no data-loss surprise | Pending |
| Offline mode | Disable network and confirm local jobs, resumes, applications, salary, backups, and settings still work; external actions fail clearly | Pending |
| Privacy invariants | Confirm default install has no telemetry, no cloud sync, no external AI call, no updater endpoint, and no unexpected background restricted-source access | Pending |
| Release docs from UI | Verify Help, update, privacy, responsible AI, and release-status links open the intended local or GitHub pages without stale version claims | Pending |

## Feature Privacy Label Coverage

| Feature label id | Manual evidence required | Result |
| ---------------- | ------------------------ | ------ |
| `job-tracking` | Local job save, status, notes, and delete persistence without external send | Pending |
| `saved-searches` | Local saved search CRUD and source approval boundaries | Pending |
| `application-kanban` | Local board movement, notes, reminders, and history | Pending |
| `application-assist` | Local profile and manual final submission boundary | Pending |
| `first-seen-last-seen-job-tracking` | First seen, last seen, stale, and reposted signals | Pending |
| `user-configured-job-source-endpoints` | Explicit endpoint approval and reapproval after detail changes | Pending |
| `ghost-job-heuristic-scoring` | Local posting-risk scoring and reasons | Pending |
| `ghost-job-external-ai-explanation` | Optional public-data-only external path or local fallback | Pending |
| `job-description-summary` | Optional public-data-only external path or local fallback | Pending |
| `resume-assistance-application-readability` | Local resume parsing, readable text, and truthful guidance | Pending |
| `resume-job-fit-explanation` | Local fit evidence and blocked sensitive external send unless explicitly reviewed | Pending |
| `negotiation-prep` | Local negotiation notes and sensitive external-send guard | Pending |
| `salary-floor-protection` | Local salary-floor filtering and warnings | Pending |
| `salary-transparency-check` | Local public posting pay-range review | Pending |
| `salary-transparency-ai-explanation` | Optional public-data-only external path or local fallback | Pending |
| `safe-support-report` | Sanitized support report review and reveal path | Pending |
| `research-evaluation` | Public-postings-only or synthetic-data-only research fixtures | Pending |

## Exit Bar

- Every required row is `Pass`, `Fail`, `Blocked`, or `Accepted release hold`.
- Every `Fail` has an issue, local fix commit, or release hold decision.
- Every `Blocked` row states the missing platform, credential, account, or
  external service dependency.
- Privacy and security rows cannot be accepted as release gaps without explicit
  maintainer approval.
- The final v2.9.1 release note must summarize the manual validation date,
  platforms, package source, and any accepted gaps.
