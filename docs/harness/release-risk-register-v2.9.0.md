# v2.9.0 Release Risk Register

Last updated: 2026-06-20.

This register covers source access, scraper behavior, user risk, and release
distribution risks that can block the `2.9.0` release. It is a release harness
artifact, not legal advice. Treat external terms as volatile and recheck primary
sources before changing restricted-source behavior.

Risk tracking must not turn into arbitrary product blocking. When the risk is
account, terms, or source-policy exposure, JobSentinel should inform the user,
record explicit local acknowledgement, and provide the safest local path it can.
Block only for direct privacy/security failures, credential or session capture,
hidden background access, platform-control bypass, unsafe URLs, unbounded source
access, or external side effects the user did not choose.

## Boundary

- Trusted local boundary: the shipped JobSentinel app, local config, local
  encrypted app data, the OS credential manager, and explicit user clicks.
- Untrusted inputs: user-entered URLs, external job pages, public APIs, RSS or
  JSON feeds, optional external endpoints, browser pages, and source HTML.
- Sensitive data: resume content, application history, saved jobs, search terms,
  locations, salary targets, notification destinations, API keys, alert secrets,
  and any browser sign-in material.
- Human approval points: restricted-source acknowledgements, authenticated-source
  pre-login warnings, JobsWithGPT exact-payload approval, credential saves, and
  release environment approval.

## Source Classes

- Reviewed public unauthenticated or feed sources: Greenhouse, Lever, RemoteOK,
  We Work Remotely, Hacker News Who Is Hiring, and YC Work at a Startup. These
  stay low-friction: no restricted acknowledgement and no authenticated-session
  time cap.
- Public local-credential source: USAJobs. It may use a local access code stored
  through the credential service, but it is not an account-session scraper.
- Restricted public unauthenticated boards: Indeed, Built In, Dice, Glassdoor,
  Monster, ZipRecruiter, and similar broad boards. These can remain available
  only with prominent user agreement, source-specific rate limits, and clear
  account/legal/privacy warnings. Do not apply authenticated-session time caps
  unless the source requires a user sign-in.
- Restricted authenticated user sessions: LinkedIn, LinkedIn Jobs Tracker,
  FlexJobs, Upwork, Freelancer, and Toptal. These require a pre-login warning,
  fresh user-initiated sign-in for each use, no auth/session/browser-storage
  persistence, no background or offline collection, and a visible privacy
  reminder for long manual sessions. Hard expiry is not required when
  JobSentinel does not inspect or automate the restricted site.
- Human-controlled restricted browser shell: an isolated browser or webview that
  JobSentinel opens after the warning. This shell is a navigation surface, not a
  scraper, when JobSentinel does not inspect page DOM, network traffic, browser
  storage, cookies, auth headers, or drive user actions. It may show a privacy
  reminder and a close control without forcing the user to stop.
- JobSentinel browser sessions: any browser or webview opened by JobSentinel
  should use the same plain privacy reminder pattern. A long-running manual
  browser session does not need hard expiry unless JobSentinel reads, extracts,
  automates, or submits restricted-site content.
- User-driven authenticated activity ledger: local records the user explicitly
  creates during a restricted browser session, such as applied, saved, tracking,
  rejected, interview, follow-up, reminder, or note events. This is not scraping
  when the event is created by a user action in JobSentinel, stores only
  user-confirmed fields, and does not silently read or refresh the restricted
  site.
- Unknown review-required sources: employer career pages or ATS surfaces without
  reviewed public endpoints. Keep them to user-opened search links, Browser
  Import, pasted single-job links, or manual entry until source-specific terms
  and stability are reviewed.

## Findings

### Critical: do not overclaim native LinkedIn authenticated automation

Evidence:

- `src-tauri/src/commands/linkedin_auth.rs` disables legacy login and cookie
  storage, returns disconnected status, exposes policy only, and tests that no
  auth material is stored.
- `src-tauri/src/core/scrapers/linkedin.rs` returns an invalid-configuration
  warning instead of running hidden monitoring.
- `src/pages/SettingsJobSourcesSection.tsx` tells users LinkedIn is
  user-controlled and that no sign-in material is collected.

Risk:

Release notes, README copy, or UI copy that claims fully functional native
LinkedIn scraping, tracking, or authenticated session automation would be false.
It would also increase account, privacy, and project takedown risk.

Release status:

Blocking only if `2.9.0` claims native authenticated LinkedIn scraping,
scheduled monitoring, or automatic application actions. Non-blocking if
`2.9.0` ships LinkedIn as user-opened search links, the local Workbench ledger,
user-clicked Browser Import for visible jobs, pasted single-job links, and
manual entry.

Fix:

Either keep all LinkedIn claims to the current user-directed paths, or implement
and manually verify an ephemeral interactive session manager before release:
pre-login warning, fresh sign-in, no persisted auth material, no background use,
plain-language privacy reminder, and full UI coverage.

Current release direction is visible-page activity capture, not the browser
extension path. The Workbench can be opened from Dashboard quick actions or
Settings, shows friendly acknowledgement copy, opens LinkedIn only when the user
chooses, imports visible jobs only when the user clicks Browser Import, and
records only user-confirmed local events.

A human-controlled LinkedIn browser shell is compatible with that policy only if
it does not capture login material, browser storage, network traffic, hidden
page state, or actions the user did not choose. JobSentinel may open the
isolated window, show a privacy reminder, provide user-visible navigation links,
let the user close or continue, and accept user-clicked Browser Import payloads
from the visible page. JobSentinel analysis should run after job data is local
through visible-page import, pasted text, pasted links, manual entry, or
user-confirmed activity ledger entries.

An activity ledger can make LinkedIn useful without scheduled scraping: while
the user works in the human-controlled session, JobSentinel may show adjacent
controls such as `Log applied`, `Track this job`, `Saved on LinkedIn`,
`Log rejected`, `Log interview`, `Log follow-up`, `Add reminder`, `Add note`,
or `Paste job details`. Those controls must be clicked by the user, write only
local records, and never infer an action from LinkedIn network traffic,
storage, screenshots, or hidden browser state. Ghost-job analysis may use
Browser Import captures, the local ledger, pasted job details, the user's own
prior snapshots, and public employer or ATS follow-through, but must not
silently refresh LinkedIn.

Saved acknowledgements may reduce repeat friction when they stay local and
specific. Store only source id, warning version, acknowledgement time, and local
device context. Require a fresh acknowledgement when warning copy, source class,
or data behavior changes.

Visible-page import and selected-text or pasted-text prefill are allowed only
when the user explicitly clicks Browser Import, copies, pastes, or sends
selected text into JobSentinel. For restricted sites, JobSentinel must not read
hidden page content, accessibility trees, screenshots, browser storage, or
network traffic to fill the ledger. Prefilled fields remain suggestions until
the user confirms them.
Workbench notes derived from pasted or selected text must remove session-like
URL query fields, cookies, and token-like fields before local storage.

Intent and interest learning is allowed from local JobSentinel actions: saved
jobs, manual ledger events, thumbs up/down, dismissed jobs, search terms, user
notes, and user-confirmed imported details. For restricted authenticated sites,
JobSentinel may learn from the user's JobSentinel-side actions, but not from
silent page observation. Any future browser-session "watch and learn" mode must
be visibly on, describe exactly what it records, stay local, have an off switch,
and never make durable application records without user confirmation.

### High: restricted job boards can create user account and terms risk

Evidence:

- `src/shared/restrictedSourceTaxonomy.ts` requires domain records with category,
  source references, and a concrete reason.
- `src/pages/SettingsConfig.ts` blocks saving enabled restricted scheduled
  sources without acknowledgement.
- `src-tauri/src/core/scheduler/workers/scrapers.rs` skips restricted scheduled
  sources without acknowledgement.
- `src/components/ScraperHealthDashboard.tsx` prompts before one-off Source
  Status checks for restricted public source helpers.
- `src-tauri/src/core/health/smoke_tests.rs` skips restricted public smoke
  checks unless the user action supplies acknowledgement or the source already
  has a saved scheduled-source acknowledgement.

Risk:

Even public unauthenticated job boards can object to automated access, throttle
users, block IPs, or create account/legal exposure if the user is signed in or
if platform controls are bypassed.

Release status:

Non-blocking while user agreement, warnings, rate limits, and no silent
authenticated background access remain intact.

Fix:

Keep public restricted boards warning-gated but do not time-gate them like
authenticated sessions. Add every new restricted domain through
`RESTRICTED_JOB_SOURCE_DOMAIN_RECORDS` with a good reason and source reference.

### High: authenticated browser research can leak session material

Risk:

Playwright or manual browser testing against authenticated sources can leak
cookies, localStorage, authorization headers, URLs, screenshots, HAR, traces, or
videos if capture is enabled.

Release status:

Blocking for any authenticated-source testing that stores traces, HAR,
storageState, cookies, localStorage, sessionStorage, or authorization headers.

Fix:

Use ephemeral browsers only. Do not capture auth tokens, cookies, storage state,
HAR, traces, videos, or authorization headers. Record only visible URL/filter
shape and non-sensitive interaction behavior. Close the browser session after
the test.

If a browser automation library is used only to create a human-controlled
window, disable automation recording and page inspection. Do not use it to read
LinkedIn content, query selectors, intercept requests, collect storage state, or
click through flows for the user.

### Medium: JobsWithGPT is an external data path

Evidence:

- `src-tauri/src/core/config/types.rs` requires exact payload approval before
  JobsWithGPT runs.
- `src-tauri/src/core/scheduler/workers/scrapers.rs` skips the source unless the
  current payload is approved.
- `src-tauri/src/core/scrapers/jobswithgpt.rs` validates HTTPS fetch targets and
  uses bounded response reads.

Risk:

The user can send job titles, location presence, remote preference, and result
limit to a configured external endpoint.

Release status:

Non-blocking while disabled by default, exact-payload approval, HTTPS validation,
and minimized logging remain intact.

Fix:

Keep the payload preview obvious in Settings, clear approval when payload changes,
and keep support reports from including endpoint secrets or private payload
values.

### Medium: broad scraper expansion must not bypass transport safety

Evidence:

- `src-tauri/src/core/scrapers/http_client.rs` disables redirects by default,
  validates and resolves fetch URLs, pins DNS resolution where needed, bounds
  retry behavior, and sanitizes logged URLs.
- `src-tauri/src/core/http_body.rs` limits decoded response bodies.
- `src-tauri/src/core/import/fetcher.rs` enforces HTTPS, disables redirects, and
  uses bounded reads for Browser Import.
- `src-tauri/src/core/url_security.rs` rejects non-public hosts, userinfo,
  internal suffixes, private IPs, sensitive URL storage, and unsafe log labels.

Risk:

New sources, scraper libraries, or browser fallbacks could weaken SSRF
protection, redirect boundaries, rate limits, or log privacy.

Release status:

Non-blocking while new sources route through the shared fetch/import safety
layers or receive equivalent tests.

Fix:

For each new adapter, document source class, fetch contract, rate limit, redirect
policy, response cap, parser target, cache key, and user-visible failure mode.
Browser fallback must be explicit and user-initiated.

### Medium: staged release assets and public verification are required

Evidence:

- `.github/workflows/release.yml` creates a staged draft release, builds platform
  assets, labels unsigned/no-account packages, writes checksums, generates SBOMs,
  attests provenance/SBOMs, uploads assets, then publishes.
- `.github/workflows/verify-release-artifacts.yml` verifies the public release
  asset set after publication.
- 2026-06-20 read-only remote ref check: local `main` is at `99a5d381` before
  this documentation evidence edit; remote `origin/main` and remote `v2.9.0`
  still point at `8020d7e6`. A `gh release view v2.9.0` refresh was not
  completed in this pass because the local `gh` wrapper could not get a token
  from 1Password, so hosted release publication state still requires final
  verification before push/tag/publication.
- 2026-06-20 release-prep checks passed: focused release script tests `730/730`,
  `npm run release:check-env`, `npm run macos:readiness`,
  `npm run release:skills -- --out-dir <tmp>`, staged SBOM generation under
  `<tmp>`, no-account universal macOS DMG build, and macOS package verification
  with checksum, metadata, universal architecture, signature, launch smoke,
  install smoke, and private local-data permission checks.

Risk:

Verifying only local artifacts misses public download drift: missing checksums,
wrong unsigned labels, missing SBOM manifests, missing attestations, stale
assets, or Gatekeeper expectation mismatches.

Release status:

Blocking for final release. Do not publish until staged assets pass and public
asset verification passes after publication. The remote tag still needs to move
to the latest verified commit after user confirmation.

Fix:

Let old `v2.9.0` workflow runs finish before retagging or uploading. Publish only
from the verified commit and run the public release verifier after publication.

### Medium: no-account platform artifacts need clear user warnings

Risk:

Unsigned Windows installers can trigger SmartScreen. Ad-hoc signed macOS DMGs
are not Developer ID signed, not notarized, and not Gatekeeper-ready. Users may
misread that as malware or as a broken app.

Release status:

Non-blocking for a no-account release only while filenames, README, release
notes, and verifier gates clearly label unsigned/no-account assets.

Fix:

Keep `_unsigned` Windows labels, `_no-account_` macOS labels, checksum sidecars,
SBOMs, attestations, and plain first-open instructions.

### Medium: completion requires manual UI and source-path evidence

Evidence:

- `docs/harness/ui-manual-verification-v2.9.0.md` is the whole-UI completion
  ledger.
- `docs/harness/source-debug-verification-v2.9.0.md` is the source-path release
  ledger.

Risk:

Unit tests can pass while a non-technical user is blocked by unclear warnings,
hidden save blockers, inaccessible controls, or stale release copy.

Release status:

Blocking for final release. Do not call `2.9.0` done until the UI ledger and
source-path ledger cover every exposed release surface.

Fix:

Finish manual UI validation across routes, clicks, modals, keyboard paths,
mobile widths, source warnings, Browser Import, pasted-link import, scheduled
source acknowledgement, search links, and manual entry.

### Low: passive tests must avoid repeated credential prompts

Risk:

Local tests that probe the OS keychain can slow iteration and train users to
deny or approve prompts without understanding why.

Release status:

Non-blocking while passive Settings/source-status tests avoid secret retrieval
and credential tests are focused and intentional.

Fix:

Keep passive status/list flows non-interactive. Use mocked credential status for
routine UI tests and isolate live keyring checks to explicit credential storage
verification.

## User Risks To Keep Visible

- Account restriction, lockout, throttling, or site-blocking from restricted
  sources.
- Source terms, contract, or privacy-law concerns from automated access.
- Exposure of saved jobs, application history, search terms, locations, pay
  targets, or resume content through optional endpoints, alerts, support reports,
  browser captures, or logs.
- False positives from ghost-job or posting-risk signals causing a user to skip a
  legitimate job.
- False confidence from resume tailoring or keyword matching if edits exceed
  evidence in the user's own background.
- SmartScreen or Gatekeeper friction on no-account release assets.

## External Evidence To Recheck Before Policy Changes

- LinkedIn User Agreement: <https://www.linkedin.com/legal/user-agreement>
- LinkedIn prohibited software and extensions:
  <https://www.linkedin.com/help/linkedin/answer/a1341387/prohibited-software-and-extensions>
- Greenhouse Job Board API:
  <https://developers.greenhouse.io/job-board.html>
- Lever Postings API:
  <https://github.com/lever/postings-api>
- USAJobs API:
  <https://developer.usajobs.gov/API-Reference/GET-api-Search>
- Indeed legal terms: <https://www.indeed.com/legal>
- Glassdoor terms: <https://www.glassdoor.com/about/terms/>

If a source's terms are blocked, unavailable, or unclear, keep it in
`unknown-review-required` or `restricted-user-gated` until reviewed manually.

## Release Blockers From This Register

- Do not claim native authenticated LinkedIn automation unless it is implemented,
  tested, manually verified, and still meets the no-persistence session policy.
- Do not claim non-scraper LinkedIn-compatible workflows are release-ready until
  the source-debug ledger has manual evidence for warning copy, saved
  acknowledgement, privacy reminder, Workbench navigation, one-click local
  ledger actions, user-clicked visible-page Browser Import or selected/pasted
  text prefill, fallback/manual entry, and no cookies, tokens, browser storage,
  authorization headers, hidden page reading, background monitoring, scheduled
  refresh, traces, HARs, screenshots, or persisted session state.
- Do not add a restricted domain without a category, source reference, and
  concrete reason.
- Do not claim any scraper or source adapter is release-ready until it has
  parser/import/gate evidence, safe error behavior, rate-limit or stop-condition
  coverage where applicable, and a user-safe fallback when the source blocks,
  changes, or returns no jobs.
- Do not bypass shared URL validation, redirect blocking, body caps, rate limits,
  or sanitized logging for new source adapters.
- Do not publish final assets until the staged matrix succeeds and public release
  verification passes after publication.
- Do not call `2.9.0` complete until whole-UI and source-debug ledgers are
  current.
