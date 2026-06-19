# v2.9.0 Release Risk Register

Last updated: 2026-06-19.

This register covers source access, scraper behavior, user risk, and release
distribution risks that can block the `2.9.0` release. It is a release harness
artifact, not legal advice. Treat external terms as volatile and recheck primary
sources before changing restricted-source behavior.

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
  persistence, no background or offline collection, and a one-hour maximum
  session window.
- Human-controlled restricted browser shell: an isolated browser or webview that
  JobSentinel opens after the warning and closes at the session limit. This shell
  is a navigation and time-boxing surface, not a scraper, when JobSentinel does
  not inspect page DOM, network traffic, browser storage, cookies, auth headers,
  or drive user actions.
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

Blocking only if `2.9.0` claims native authenticated LinkedIn scraping or
tracking. Non-blocking if `2.9.0` ships LinkedIn as user-opened search links,
Browser Import, pasted single-job links, and manual entry.

Fix:

Either keep all LinkedIn claims to the current user-directed paths, or implement
and manually verify an ephemeral interactive session manager before release:
pre-login warning, fresh sign-in, no persisted auth material, no background use,
one-hour maximum, and full UI coverage.

A human-controlled LinkedIn browser shell is compatible with that policy only if
it does not read, extract, capture, or automate LinkedIn pages. JobSentinel may
open the isolated window, show the timer, provide user-visible navigation links,
and close the window when the session expires. JobSentinel analysis should run
after the user brings selected job data back through pasted text, pasted links,
manual entry, or another separately reviewed import path.

### High: restricted job boards can create user account and terms risk

Evidence:

- `src/shared/restrictedSourceTaxonomy.ts` requires domain records with category,
  source references, and a concrete reason.
- `src/pages/SettingsConfig.ts` blocks saving enabled restricted scheduled
  sources without acknowledgement.
- `src-tauri/src/core/scheduler/workers/scrapers.rs` skips restricted scheduled
  sources without acknowledgement.

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

Risk:

Verifying only local artifacts misses public download drift: missing checksums,
wrong unsigned labels, missing SBOM manifests, missing attestations, stale
assets, or Gatekeeper expectation mismatches.

Release status:

Blocking for final release. Do not publish until staged assets pass and public
asset verification passes after publication.

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
- Do not add a restricted domain without a category, source reference, and
  concrete reason.
- Do not bypass shared URL validation, redirect blocking, body caps, rate limits,
  or sanitized logging for new source adapters.
- Do not publish final assets until the staged matrix succeeds and public release
  verification passes after publication.
- Do not call `2.9.0` complete until whole-UI and source-debug ledgers are
  current.
