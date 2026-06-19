# Source Debug Verification For v2.9.0

This matrix is the release checklist for job sources. It exists so source
testing is understandable to non-technical users and auditable by maintainers.

## Release Rule

Before release, every source path must be one of these:

Importers and restricted-site workflows must be classified and verified against
the closest matching category below.

- Help-first informed consent is part of the source contract. Account, terms,
  or source-policy risk should produce plain warnings, local acknowledgement,
  rate limits, and secure user-controlled paths. Direct privacy/security risk,
  credential capture, session persistence, hidden background access, platform
  control bypass, unsafe URLs, or unbounded access remains a hard stop.
- Native source check with parser, transport, rate-limit, sanitized-error, and
  source-status coverage.
- Public unauthenticated restricted-source path with a prominent warning,
  explicit acknowledgement, rate limits, safe errors, no credential or
  session-cookie capture, and a fallback to search link, pasted individual job
  link, employer career page, or manual entry. Do not apply sign-in-session
  rules to these public unauthenticated paths.
- Restricted authenticated source path with the warning shown before sign-in,
  fresh user-initiated sign-in for every use, no auth token, session cookie,
  browser storage, or authorization-header persistence, no background or
  offline collection, and a visible privacy reminder for long manual sessions.
  Hard expiry is required only if a future feature inspects or automates
  restricted-site content.
- Human-controlled restricted browser shell where JobSentinel only opens the
  window, shows the warning and privacy reminder, and provides visible
  navigation. This is not a scraper path unless JobSentinel inspects page DOM,
  network traffic, storage, cookies, auth headers, or drives actions.
- User-clicked Browser Import where JobSentinel reads only the current visible
  page or visible job cards after the user clicks the browser button, stores
  only local job records for review, strips session-like URL context, caps
  payload size and job count, and never reads cookies, browser storage, network
  traffic, hidden pages, or pages the user did not open.
- Any JobSentinel-opened browser session with a visible privacy reminder,
  user-controlled close/continue behavior, and no hard expiry unless
  JobSentinel reads, extracts, automates, or submits restricted-site content.
- User-driven authenticated activity ledger where the user explicitly logs
  applied, saved, tracking, rejected, interview, follow-up, reminder, or note
  events from JobSentinel while using a restricted site. The ledger must be
  local-only, user-confirmed, and never silently inferred from restricted-site
  DOM, network, storage, screenshots, or hidden browser state.
- Not shipped or disabled, with the reason documented.

Do not claim a source is ready from a single successful live request. A source
needs deterministic fixture coverage plus a user-safe recovery path when the
site blocks, changes, or returns no jobs.

Do not claim a non-scraper restricted workflow is ready from code inspection
alone. LinkedIn-compatible and similar restricted-site flows need manual proof
for the contract and the user experience: friendly warning copy, explicit saved
acknowledgement, user-controlled browser opening, visible privacy reminder,
continue/close behavior, user-clicked visible-page import, one-click ledger
events, Browser Import or selected/pasted text prefill, local review before
relying on imported data, fallback/manual entry paths, no hidden page reading,
and no token, cookie, browser-storage, authorization-header, HAR, trace,
screenshot, or session-state persistence.

## Current Release Surface

| Source or path | Access model | Debug evidence required |
| -------------- | ------------ | ----------------------- |
| Greenhouse | Public ATS postings | URL parsing, JSON parser fixture, network failure, duplicate handling, status row |
| Lever | Public ATS postings | URL parsing, JSON parser fixture, network failure, duplicate handling, status row |
| RemoteOK | Public JSON feed | JSON parser fixture, rate limit, empty result, network failure, status row |
| We Work Remotely | Public feed or page | Feed/parser fixture, rate limit, empty result, network failure, status row |
| Built In | Restricted public unauthenticated scheduled board | Prominent acknowledgement, scheduler skip without acknowledgement, parser or live opt-in check, status recovery, no authenticated-session cap |
| Startup and tech hiring posts | Public community source | Parser fixture, monthly thread fallback, empty result, status row |
| JobsWithGPT | User-approved feed | Exact payload preview, approval invalidation, minimized request metadata, sanitized errors |
| Dice | Restricted public unauthenticated scheduled board | Prominent acknowledgement, scheduler skip without acknowledgement, parser or live opt-in check, status recovery, no authenticated-session cap |
| YC Startup Jobs | Public startup source | Parser fixture, rate limit, empty result, network failure, status row |
| USAJobs | Official API | Access-code handling, credential-status behavior, request minimization, API failure, status row |
| SimplyHired | Restricted public unauthenticated scheduled board | Prominent acknowledgement, scheduler skip without acknowledgement, parser or live opt-in check, blocked-site recovery, no authenticated-session cap |
| Glassdoor | Restricted public unauthenticated scheduled board | Prominent acknowledgement, scheduler skip without acknowledgement, parser or live opt-in check, blocked-site recovery, no authenticated-session cap |
| Restricted Source Status checks | Public unauthenticated helper checks | One-time review prompt before Indeed, Wellfound, BuiltIn, Dice, ZipRecruiter, SimplyHired, or Glassdoor health checks; skip without acknowledgement; no saved sign-in session |
| Search links | User-opened browser links | Restricted-board acknowledgement before opening, official/public links stay low-friction |
| JobSentinel browser sessions | User-opened browser/webview action | Privacy reminder after long manual sessions, user can close or continue, no hard expiry unless JobSentinel reads or automates restricted content |
| Pasted job link import | User-submitted individual URL | URL validation, restricted-domain acknowledgement, no local/private URLs, sanitized errors |
| Browser Import | User-clicked browser action | Prominent warning, acknowledgement before enabling/copying, one-use local token, capped visible-page capture, LinkedIn visible job-card batch coverage, local review queue before durable save, no token exposure, blocked-page fallback |
| Restricted session activity ledger | User-confirmed local events | Dashboard and Settings Workbench entry points, pre-login warning, saved acknowledgement, privacy reminder, continue/close behavior, explicit user action for each event, Browser Import or selected/pasted text prefill only, one-click applied/saved/tracking records with optional details afterward, local-only storage, no DOM/network/storage inspection outside a user-clicked visible-page import, no hidden inference, no silent refresh |
| Non-scraper LinkedIn-compatible contracts | Human-controlled restricted workflow | Manual verification of copy, design, navigation, ack persistence, privacy reminder, no forced close for manual-only sessions, no stored auth material, user-clicked visible-page import only, no hidden page reading, no background monitoring, no scheduled refresh, local review before relying on imported data, and clear fallback to pasted link or manual entry |
| Company careers discovery | User-provided or discovered employer careers URL | Detect public ATS/API where available, normalize to native source when safe, keep unknown/custom pages user-opened until reviewed |
| Shared source taxonomy | Discovery registry | `src/shared/jobSourceDiscoveryTaxonomy.ts` covers platform families, regional boards, source access models, technical authentication access, career-profile coverage, and user-agreement requirements |
| Manual entry | Local user input | Works when every external source fails; no external side effects |

## Expansion Candidate Classification

| Candidate | Region | Release path |
| --------- | ------ | ------------ |
| Greenhouse current hosted boards | Global | Accept both `job-boards.greenhouse.io` and legacy `boards.greenhouse.io`; fetch public API first and preserve canonical `absolute_url` |
| Direct employer career pages | Global | Discovery layer should map employer pages to public ATS adapters when possible, otherwise offer user-opened search and manual import |
| Remotive | Global | Prefer native official API or feed with attribution and rate-limit tests |
| Jobicy | Global | Prefer native official API or feed with attribution and rate-limit tests |
| The Muse | US, global | Native API only with local credentials, attribution UI, and quota tests |
| Ashby | Global | Prefer native public ATS adapter with company-board input and fixtures |
| SmartRecruiters | Global | Prefer native public ATS adapter with company ID input and fixtures |
| Workable | Global | Prefer official/public posting API only after access model is confirmed |
| Recruitee, Personio, Comeet | Global and Europe | Prefer native public careers API/feed only after tenant URL shape, terms, and rate-limit review |
| Workday | Global | User-opened employer search or source-specific adapter only after public endpoint and terms review |
| Eightfold | Global | User-opened employer search or source-specific adapter only after public endpoint and terms review |
| Breezy, JazzHR, Bullhorn, Teamtailor, Jobvite, iCIMS, Taleo, SAP SuccessFactors, Oracle Recruiting, Phenom, BambooHR, ADP, UKG, Rippling, Zoho Recruit, Freshteam, Pinpoint, Jobylon, JobScore | Global | Candidate ATS families; review official/public access model before native scheduling |
| Adzuna | US, UK, India, global | Native API only with local credentials, attribution UI, and quota tests |
| Reed | UK | Native API only with local credentials and source terms review |
| CV-Library | UK | User-directed path unless official partner API access is configured |
| Totaljobs | UK | User-directed path unless official access is configured |
| StepStone, XING Jobs | Europe | Restricted or account-adjacent user-directed path until country-specific terms and platform behavior are reviewed |
| Naukri | India | Restricted public unauthenticated path with prominent warning and source-specific review before scheduling |
| Shine | India | Restricted public unauthenticated path with prominent warning and source-specific review before scheduling |
| Foundit | India and global variants | Restricted public unauthenticated path with prominent warning and source-specific review before scheduling |
| Monster | US and global variants | Restricted public unauthenticated path with prominent warning and source-specific review before scheduling |
| ZipRecruiter | US | Restricted public unauthenticated path with prominent warning and source-specific review before scheduling |
| Indeed | US and global variants | Restricted public unauthenticated path with prominent warning and source-specific review before scheduling |
| LinkedIn search and company jobs | Global | User-gated restricted discovery only; human-controlled browser shell may open search/company pages and show a privacy reminder, and JobSentinel may accept user-clicked Browser Import payloads for visible job cards and let the user log applied/saved/tracking events locally, but JobSentinel must not read hidden pages, network, or storage, drive actions, capture login material, run hidden background access, or persist referral, origin, or landing-job session context as source config |
| LinkedIn Jobs Tracker | Global | User-gated restricted tracking only for jobs the user already saved or applied to; human-controlled browser shell may help the user reach applied/saved pages and let the user update local tracking events, but JobSentinel must not inspect DOM/network/storage, drive actions, capture login material, run hidden background access, or silently refresh tracking state |
| LinkedIn Jobs home navigation | Global | User-opened navigation only for Preferences, Job tracker, and My Career Insights anchors; do not treat text-fragment anchors as saved source query state |
| Built In network, state/city filters, and regional city boards | US and local markets | Restricted public unauthenticated path with prominent warning; model parent, state-filtered, city-filtered, and regional-host searches in shared taxonomy; use employer-career follow-through after the user reviews a role |
| Otta and Welcome to the Jungle | US, UK, Europe, global | User-opened import or review-required path until account/personalization, attribution, and source terms are reviewed |
| No Fluff Jobs and Just Join IT | Europe | Review-required tech-board path; native support only after pay visibility, attribution, terms, and fixture coverage are proven |
| Deel Jobs and Remote.com Jobs | Global remote | Review-required remote-board path; keep separate from Remote OK, Remote.co, and employer career pages |
| Tech Ladies | US, global | Restricted community-board path with user agreement and no silent scheduled access |
| Malt | Europe | Restricted freelance marketplace path with no account/session persistence or background collection |
| State workforce boards, city/county careers, local chambers, local newspapers | Local and regional markets | Research official feeds first; otherwise user-opened search links, pasted job links, and manual entry only |
| Sector-specific local sources | Local and regional markets | Review per source; prioritize retail, hospitality, trades, healthcare, education, legal, creative, finance, and HR gaps |

## Debug Run Record

Record every manual or live source debug pass with:

- Date.
- Platform and app build.
- Source.
- Path tested.
- Result.
- User-facing recovery message.
- Whether any credential, cookie, token, private note, resume, salary floor, or
  application history was exposed. The expected answer is no.

Live source checks must stay opt-in and low volume. If a source blocks access
or presents a human check, stop that path and verify the fallback instead.

### 2026-06-19 Source Verification Pass

Platform and build: macOS 26.5.1 arm64, JobSentinel 2.9.0.

| Source or path | Path tested | Result | User-facing recovery message | Exposed credential, cookie, token, private note, resume, salary floor, or application history |
| -------------- | ----------- | ------ | ---------------------------- | ------------------------------------------------------------------------------------------ |
| Native scraper parser and transport contracts | `cargo test --lib scrapers` | Passed: 580 passed, 5 ignored network-only tests | Scraper errors use source-level, sanitized messages and fallbacks | No |
| Scraper construction and pipeline | `cargo test --test scraper_integration_test` and `cargo test --test scraping_pipeline_integration` | Passed: 25 scraper integration tests and 12 pipeline integration tests | Empty or failing sources do not block the local pipeline | No |
| Restricted-source UI and import contracts | `npm run test:run -- src/shared/jobSourceDiscoveryTaxonomy.test.ts src/shared/restrictedSourceTaxonomy.test.ts src/shared/linkedinWorkbench.test.ts src/components/BrowserImportButtonScript.test.ts src/components/LinkedInWorkbench.test.tsx src/components/BookmarkletGenerator.test.tsx src/components/ScraperHealthDashboard.sourceChecks.test.tsx src/components/DeepLinkGenerator.test.tsx src/pages/SettingsConfig.test.ts src/pages/Settings.sources.test.tsx src/pages/Settings.load.test.tsx src/mocks/handlers/scraperInterviewCommands.test.ts src/utils/sourceLabels.test.ts` | Passed: 104 tests across 13 files covering prompts, safe recovery text, visible-card Browser Import script coverage, local review before saving, and fallback paths | Users see acknowledgement prompts, visible-page capture copy, local review before saving, safe recovery text, and manual fallback paths | No |
| LinkedIn-compatible restricted workflow | `cargo test --lib linkedin_workbench`, `cargo test --lib linkedin_auth`, and focused Chromium E2E for LinkedIn Workbench | Passed: local-only event ledger, fail-closed auth persistence, settings entry point, dashboard entry point, pasted-text prefill, privacy reminder, and no forced manual-session close | Add or update local records manually; use pasted link or manual entry if the browser path is unavailable | No |
| Browser Import local helper | `cargo test --lib bookmarklet` | Passed: 46 local helper tests covering loopback binding, origin checks, one-use tokens, URL safety, defensive headers, safe copy errors, import minimization, capped visible LinkedIn job-card batch queueing, review-before-save confirmation, invalid-batch no-partial-insert behavior, mixed-origin rejection, and no stored LinkedIn query context | Use pasted job links or manual entry if Browser Import cannot connect | No |
| Public live source probes | `cargo test --test live_scraper_test -- --ignored --test-threads=1` | Passed: 14 live checks for Greenhouse, Lever, RemoteOK, Hacker News, We Work Remotely, Built In, Dice, YC Startup Jobs, LinkedIn boundary, USAJobs skip path, JobsWithGPT skip path, SimplyHired, and Glassdoor | Live checks are opt-in; blocked, empty, credential-required, or human-check paths must use source-status recovery and manual fallback | No |
| Scrapling Rust comparison | `cargo search scrapling --limit 10`, `cargo info scrapling`, `cargo info scrapling-fetch`, `cargo info scrapling-browser`, `cargo info scrapling-spider`, and local checkout scan at `0d61c3e` | Rechecked: crates remain 0.2.0; no v2.9.0 adoption because current adapters already use shared safe fetch and structured parsing, while Scrapling fetch/browser/spider paths add stealth, cookie/session, proxy, browser, crawler, redirect, or storage behavior outside the release boundary | Keep existing adapters; reconsider parser-only Scrapling after release only with default features off and a failing fixture proving current parsing is insufficient | No |
| User-assisted live LinkedIn session | Ephemeral Playwright Chromium window opened to LinkedIn Jobs with no tracing, HAR, video, screenshots, storage export, cookie inspection, token inspection, or hidden page reads | Passed by user-assisted checklist: user reported covering role/location search, filters, multiple job cards, Save, job URL copy, Job Tracker, company Jobs tab, and Easy Apply modal without asking JobSentinel to automate or submit | JobSentinel should process only user-clicked visible-page imports, copied public job links, pasted visible text, and explicit local ledger actions | No |

Live drift found and corrected: the Lever live test depended on Plaid's public
Lever board, which returned zero jobs on 2026-06-19. The test now uses a small
multi-company public Lever sample and verifies aggregate adapter behavior
instead of depending on one employer's current hiring state.
