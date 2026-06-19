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
- Do not collect candidate profiles, recruiter profiles, employee lists, social
  graph data, login-only pages, or restricted content.
- Track source health and source confidence in plain language.
- Record source, fetch date, canonical URL, and closure evidence.
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

## Open evaluation ideas

- Maintain a source registry with permission notes, rate limits, and data shape.
- Test source adapters against robots and source-specific stop conditions.
- Compare freshness between official ATS pages and third-party copies.
- Review each new source against privacy, security, and responsible-AI docs.
