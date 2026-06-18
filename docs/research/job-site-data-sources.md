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

## Open evaluation ideas

- Maintain a source registry with permission notes, rate limits, and data shape.
- Test source adapters against robots and source-specific stop conditions.
- Compare freshness between official ATS pages and third-party copies.
- Review each new source against privacy, security, and responsible-AI docs.
