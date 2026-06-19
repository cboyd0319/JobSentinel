# Source Debug Verification For v2.9.0

This matrix is the release checklist for job sources. It exists so source
testing is understandable to non-technical users and auditable by maintainers.

## Release Rule

Before release, every source path must be one of these:

- Native source check with parser, transport, rate-limit, sanitized-error, and
  source-status coverage.
- User-directed path with a prominent restricted-source warning, explicit
  acknowledgement, no credential or session-cookie capture, and a fallback to
  search link, pasted individual job link, employer career page, or manual
  entry.
- Not shipped or disabled, with the reason documented.

Do not claim a source is ready from a single successful live request. A source
needs deterministic fixture coverage plus a user-safe recovery path when the
site blocks, changes, or returns no jobs.

## Current Release Surface

| Source or path | Access model | Debug evidence required |
| -------------- | ------------ | ----------------------- |
| Greenhouse | Public ATS postings | URL parsing, JSON parser fixture, network failure, duplicate handling, status row |
| Lever | Public ATS postings | URL parsing, JSON parser fixture, network failure, duplicate handling, status row |
| RemoteOK | Public JSON feed | JSON parser fixture, rate limit, empty result, network failure, status row |
| We Work Remotely | Public feed or page | Feed/parser fixture, rate limit, empty result, network failure, status row |
| Built In | Restricted scheduled board | Prominent acknowledgement, scheduler skip without acknowledgement, parser or live opt-in check, status recovery |
| Startup and tech hiring posts | Public community source | Parser fixture, monthly thread fallback, empty result, status row |
| JobsWithGPT | User-approved feed | Exact payload preview, approval invalidation, minimized request metadata, sanitized errors |
| Dice | Restricted scheduled board | Prominent acknowledgement, scheduler skip without acknowledgement, parser or live opt-in check, status recovery |
| YC Startup Jobs | Public startup source | Parser fixture, rate limit, empty result, network failure, status row |
| USAJobs | Official API | Access-code handling, credential-status behavior, request minimization, API failure, status row |
| SimplyHired | Restricted scheduled board | Prominent acknowledgement, scheduler skip without acknowledgement, parser or live opt-in check, blocked-site recovery |
| Glassdoor | Restricted scheduled board | Prominent acknowledgement, scheduler skip without acknowledgement, parser or live opt-in check, blocked-site recovery |
| Search links | User-opened browser links | Restricted-board acknowledgement before opening, official/public links stay low-friction |
| Pasted job link import | User-submitted individual URL | URL validation, restricted-domain acknowledgement, no local/private URLs, sanitized errors |
| Browser Import | User-clicked browser action | Prominent warning, acknowledgement before enabling/copying, no token exposure, blocked-page fallback |
| Company careers discovery | User-provided or discovered employer careers URL | Detect public ATS/API where available, normalize to native source when safe, keep unknown/custom pages user-opened until reviewed |
| Shared source taxonomy | Discovery registry | `src/shared/jobSourceDiscoveryTaxonomy.ts` covers platform families, regional boards, source access models, career-profile coverage, and user-agreement requirements |
| Manual entry | Local user input | Works when every external source fails; no external side effects |

## Expansion Candidate Classification

| Candidate | Region | Release path |
| --------- | ------ | ------------ |
| Greenhouse current hosted boards | Global | Accept both `job-boards.greenhouse.io` and legacy `boards.greenhouse.io`; fetch public API first and preserve canonical `absolute_url` |
| Direct employer career pages | Global | Discovery layer should map employer pages to public ATS adapters when possible, otherwise offer user-opened search and manual import |
| Remotive | Global | Prefer native official API or feed with attribution and rate-limit tests |
| Ashby | Global | Prefer native public ATS adapter with company-board input and fixtures |
| SmartRecruiters | Global | Prefer native public ATS adapter with company ID input and fixtures |
| Workable | Global | Prefer official/public posting API only after access model is confirmed |
| Workday | Global | User-opened employer search or source-specific adapter only after public endpoint and terms review |
| Eightfold | Global | User-opened employer search or source-specific adapter only after public endpoint and terms review |
| Breezy, JazzHR, Bullhorn | Global | Candidate ATS families; review official/public access model before native scheduling |
| Adzuna | US, UK, India, global | Native API only with local credentials, attribution UI, and quota tests |
| Reed | UK | Native API only with local credentials and source terms review |
| CV-Library | UK | User-directed path unless official partner API access is configured |
| Totaljobs | UK | User-directed path unless official access is configured |
| Naukri | India | Restricted user-directed path with prominent warning |
| Shine | India | Restricted user-directed path with prominent warning |
| Foundit | India and global variants | Restricted user-directed path with prominent warning |
| Monster | US and global variants | Restricted user-directed path with prominent warning |
| ZipRecruiter | US | Restricted user-directed path with prominent warning |
| Indeed | US and global variants | Restricted user-directed path with prominent warning |
| LinkedIn search and company jobs | Global | User-gated restricted discovery only; no silent scheduled discovery, login or session-cookie capture, hidden background access, or platform-control bypass; do not persist referral, origin, or landing-job session context as source config |
| LinkedIn Jobs Tracker | Global | User-gated restricted tracking only for jobs the user already saved or applied to; validate prominent warning, applied/saved stage handling, no cookie capture, no hidden background access, and fallback to manual tracking |
| LinkedIn Jobs home navigation | Global | User-opened navigation only for Preferences, Job tracker, and My Career Insights anchors; do not treat text-fragment anchors as saved source query state |
| Built In network, state/city filters, and regional city boards | US and local markets | Restricted user-directed path with prominent warning; model parent, state-filtered, city-filtered, and regional-host searches in shared taxonomy; use employer-career follow-through after the user reviews a role |
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
