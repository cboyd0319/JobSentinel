# Job-Site Data Sources Research

This brief condenses research and source-governance guidance for job monitoring.

## Key signals

- Public ATS feeds and official employer pages are better sources for freshness
  and closure checks than copied aggregator listings.
- Source terms, robots rules, access controls, privacy limits, and rate limits
  are product constraints.
- Single-user local monitoring is different from operating a public job board or
  reselling job data, but it still needs careful source review.
- Provenance matters. Users need to know where a job came from and how current
  it may be.

## Product implications

- Prefer official-source job monitoring where public feeds or employer pages are
  allowed.
- Keep collection low-volume, bounded, cached, and tied to user intent.
- Make restricted-source terms and account-risk warnings prominent before any
  risky action. JobSentinel does not encourage terms violations, but if users
  choose to proceed, the safe path must be local, explicit, reviewed, and
  harder to misuse than an unreviewed script or fork.
- For restricted authenticated sources such as LinkedIn, do not store auth
  tokens, session cookies, browser storage, authorization headers, or equivalent
  sign-in material. Every use must be user-initiated and show a plain-language
  site-rules and privacy warning before any sign-in screen. When JobSentinel is
  not inspecting or automating the restricted site, use a visible privacy
  reminder instead of forcing the user to stop.
- Do not collect candidate profiles, recruiter profiles, employee lists, social
  graph data, login-only pages, or restricted content.
- Track source health and source confidence in plain language.
- Record source, fetch date, canonical URL, and closure evidence.
- Add a company-careers discovery layer before adding custom scrapers. When a
  user provides or discovers an employer careers page, first detect whether it
  maps to a public hiring platform, official feed, or restricted board, then
  route to the safest available path.
- Keep source candidates, platform families, regional boards, access models,
  and career-profile coverage centralized in
  `src/shared/jobSourceDiscoveryTaxonomy.ts` so source discovery can grow
  without hard-coding source lists in UI components or docs-only notes.
- Keep parser resilience inside the existing source-adapter boundaries. The
  Scrapling Rust core can parse already-fetched HTML, but adopting it is not
  justified while JobSentinel already pins `scraper` and `quick-xml`; Scrapling
  fetch, browser, and spider features are out of scope because they add
  fingerprint impersonation, cookies, proxy rotation, or browser automation.
- Prefer structured parsing over string splitting for source formats that
  already have stable structure, such as JSON-LD script tags and RSS item
  fields.

## Scrapling Rust evaluation

Scrapling was reviewed on 2026-06-18 against JobSentinel's source-access
requirements, using the local `scrapling-rs` checkout, docs.rs crate docs, and
the upstream Rust and Python project docs. A secondary implementation guide was
also checked for its summary of fetcher modes, adaptive selectors, proxy use,
and browser-resource limits.

| Area | Finding | JobSentinel decision |
| ---- | ------- | -------------------- |
| Core parser | `scrapling` adds pseudo-element selectors, text helpers, HTML-to-Markdown, and adaptive element relocation. It also defaults to SQLite-backed storage through `rusqlite`. | Do not adopt for v2.9.0. Reconsider only if a source needs adaptive parsing of already-fetched HTML and the dependency can be added with default features off. |
| HTTP fetcher | `scrapling-fetch` defaults to browser TLS impersonation, stealth headers, redirect following, retries, cookies, proxy support, and whole-body reads. | Do not route source checks through it. JobSentinel requires the existing fetch funnel for URL resolution, no-redirect defaults, request-target checks, sanitized logging, and 16 MiB decoded body caps. |
| Browser automation | `scrapling-browser` uses Playwright and includes stealth sessions, cookie injection, proxy rotation, WebRTC/canvas fingerprint controls, and Cloudflare challenge handling. | Do not adopt. These capabilities conflict with the no hidden automation, no session-cookie collection, and no platform-control workaround boundaries. |
| Spider engine | `scrapling-spider` provides crawling, checkpointing, response cache, robots handling, blocked-response retries, and multi-session fetch backends. | Do not adopt. JobSentinel should keep checks bounded to user-enabled source adapters, official feeds, and source-specific rate limits instead of adding crawler infrastructure. |

The practical value for current adapters is low because JobSentinel already
extracts from official APIs, RSS feeds, JSON-LD scripts, and source-specific
structured payloads. If future work borrows ideas from Scrapling, borrow only
parser ergonomics or selector tests. Do not borrow stealth, proxy, cookie,
challenge-solving, broad crawling, or uncapped fetch behavior.

2026-06-19 recheck: `cargo search`, `cargo info`, and local checkout `0d61c3e`
show the Rust crates are still `0.2.0`, MIT licensed, and require Rust `1.85`.
`scrapling` still defaults to SQLite storage through `rusqlite`;
`scrapling-fetch` still advertises TLS-fingerprint-aware browser-like requests,
automatic retries, proxy rotation, and persistent cookie sessions;
`scrapling-browser` still exposes Playwright dynamic and stealth sessions with
cookies in responses; and `scrapling-spider` still combines scheduler dedupe,
sessions, caching, robots, and checkpointing. JobSentinel should not adopt them
for v2.9.0. Its current `reqwest` funnel keeps redirects disabled, validates
external URLs before fetch, rechecks request targets, uses sanitized logging,
and caps decoded bodies. Reconsider only a parser-only `scrapling` experiment
after release, with default features off and a failing source fixture proving
that existing `scraper`/`quick-xml` parsing is insufficient.

## Open evaluation ideas

- Maintain a source registry with permission notes, rate limits, and data shape.
- Test source adapters against robots and source-specific stop conditions.
- Compare freshness between official ATS pages and third-party copies.
- Review each new source against privacy, security, and responsible-AI docs.

## Source Governance Matrix

| Access model | Technical access | Preferred use | Examples | User agreement |
| ------------ | ---------------- | ------------- | -------- | -------------- |
| Official API or feed | Public unauthenticated or local API key | Native scheduled source | USAJobs, Adzuna, Reed, Remotive, official RSS or JSON feeds | Normal source opt-in; API key or source setup plus any required attribution or rate limit when needed |
| Public ATS postings | Public unauthenticated | Native scheduled source | Greenhouse, Lever, Ashby, Workable, SmartRecruiters | Normal source opt-in, no restricted-source acknowledgement unless the source is reclassified after review |
| Public community source | Public unauthenticated | Native scheduled source with conservative rate limits | Hacker News hiring posts, YC job listings, We Work Remotely, RemoteOK | Normal source opt-in |
| Employer career system | Public unauthenticated when reviewed; otherwise unknown | Company discovery first, then native adapter only if a public endpoint is stable | SpaceX, Fivetran, Google, Yahoo, IBM, Microsoft, other direct employer career pages | Normal source opt-in when public; restricted warning when access model is unclear or account-adjacent |
| Restricted public board | Public unauthenticated with terms/account-risk warning | Search link, pasted individual job link, Browser Import, or explicitly acknowledged scheduled check | Indeed, Glassdoor, Monster, ZipRecruiter, Built In, Dice, Naukri, Shine, Foundit, CV-Library, Totaljobs, Wellfound, ClearanceJobs | Prominent warning and explicit local acknowledgement before the risky action; no sign-in-session rules unless a sign-in session is opened |
| Restricted authenticated source | Authenticated user session | User-initiated interactive use only | LinkedIn search, LinkedIn Jobs Tracker, FlexJobs, Upwork, Freelancer, Toptal, any future account-backed restricted source | Warning before sign-in, fresh sign-in for every use when JobSentinel opens the session, no auth/session/browser-storage persistence, no background or offline collection, and a visible privacy reminder for supported interactive sessions |
| Unknown or changing source | Unknown review required | Manual entry or search link until reviewed | New country or niche boards | Treat as restricted until source terms, robots policy, rate limits, and practical access are reviewed |

## Company-Careers Discovery Examples

The 2026-06-19 source pass found that employer pages can hide a safe public ATS
source behind custom JavaScript. JobSentinel should make that discovery easy for
non-technical users instead of expecting them to know the ATS vendor or board
token.

| Employer URL | Observed source family | Recommended JobSentinel path |
| ------------ | ---------------------- | ---------------------------- |
| `https://www.fivetran.com/careers#jobs` | Greenhouse public board API, board `fivetran`; canonical job URLs point back to Fivetran careers pages | Detect and normalize to Greenhouse native source; preserve Greenhouse `absolute_url` |
| `https://job-boards.greenhouse.io/primerai` | Current Greenhouse hosted board, board `primerai` | Accept current `job-boards.greenhouse.io` host and use Greenhouse API first |
| `https://www.spacex.com/careers` | Custom Angular employer page with public Greenhouse board `spacex` | Detect Greenhouse board and use native Greenhouse API instead of scraping the custom frontend |
| `https://builtin.com/jobs`, state/city filters such as `?state=California&country=USA&allLocations=true`, and `https://www.builtincolorado.com/jobs` | Restricted Built In network, location-filtered searches, and regional city job boards with custom data and filtering | Keep user-gated restricted source path; prefer employer-career follow-through after the user reviews a role |
| `https://www.linkedin.com/company/fivetran/jobs/` and search-results URLs with `keywords`, `geoId`, `f_TPR`, or `f_AL` filters | Restricted LinkedIn jobs and company jobs pages | User-gated restricted discovery only; preserve user-entered query intent and selected filters, but do not persist referral, origin, landing-job, or other session-like identifiers |
| `https://www.linkedin.com/jobs-tracker/?stage=applied` | Restricted LinkedIn Jobs Tracker for user-reviewed jobs | User-gated restricted tracking only for jobs the user already saved or applied to; no broad background discovery, login capture, session-cookie storage, or hidden background access |
| LinkedIn Jobs home anchors for Preferences, Job tracker, and My Career Insights | Restricted LinkedIn navigation surfaces | User-opened navigation only; use these to help a user reach the right LinkedIn area, not as stored source-query or session state |
| `https://www.google.com/about/careers/applications/?hl=en_US` | Google proprietary career system | User-opened employer search until a stable public endpoint is reviewed |
| `https://www.yahooinc.com/careers/` | Yahoo custom career site with server-rendered search pages | User-opened employer search or source-specific adapter after endpoint and terms review |
| `https://www.ibm.com/careers/search` | IBM proprietary career search with additional career-domain links | User-opened employer search until a stable public endpoint is reviewed |
| `https://careers.microsoft.com/v2/global/en/home.html` | Microsoft career site backed by Eightfold career platform surfaces | Treat as employer career system; native adapter only after Eightfold endpoint and terms review |

Candidate platform families for the discovery registry include Greenhouse,
Workday, SmartRecruiters, Lever, Ashby, Breezy, JazzHR, Bullhorn, Workable,
Teamtailor, Recruitee, Jobvite, iCIMS, Taleo, Eightfold, SAP SuccessFactors,
Oracle Recruiting, Phenom, Personio, Comeet, Jobylon, Rippling, Zoho Recruit,
Freshteam, Pinpoint, JobScore, and employer-owned custom systems. Greenhouse,
Lever, Ashby, Recruitee, Personio, and SmartRecruiters are the first native
expansion candidates because they expose public posting APIs or feeds. Workday,
Eightfold, Bullhorn, JazzHR, Rippling, Zoho Recruit, Freshteam, Pinpoint, and
other enterprise or account-scoped systems need source-specific proof before
scheduled checks ship.

Regional and local boards are first-class source-discovery candidates, not
one-off hard-coded hostnames. This includes Built In city pages, state workforce
job banks, city and county career pages, local chambers of commerce, economic
development boards, local newspaper job boards, industry associations, and
sector-specific local sources for retail, hospitality, trades, healthcare,
education, legal, creative, finance, and HR roles. Treat these sources as
review-required or restricted until the specific source terms, structure, and
rate limits are recorded.

Expansion work for UK, India, and other markets should add sources only after
this classification is recorded. New native adapters need fixtures, rate-limit
rules, user-safe errors, and source-status behavior before release. If a source
requires attribution, such as logo or "jobs by" language, the UI must include it
before the adapter is enabled.

2026-06-19 expanded source research synced the shared taxonomy with additional
UK, European, remote, and sector-specific sources. Taxonomy-only additions
include CV-Library, Totaljobs, StepStone, XING Jobs, Otta, Welcome to the
Jungle, Jobicy, The Muse, Deel Jobs, Remote.com Jobs, No Fluff Jobs, Just Join
IT, Tech Ladies, and Malt. CV-Library and Totaljobs now match existing
restricted-domain gates; Foundit Gulf and Indonesia now share the Foundit
taxonomy entry. Treat these additions as discovery/import coverage until a
specific adapter has parser fixtures, transport limits, attribution handling,
safe errors, source-status behavior, and release-ledger proof.
