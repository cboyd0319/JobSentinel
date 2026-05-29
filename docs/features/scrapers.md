# Job Source Adapters

JobSentinel favors official-source job monitoring and public, bounded source
adapters. Source access must preserve user privacy, source boundaries, rate
limits, and review-first workflows.

LinkedIn is supported as a user-opened search destination through Deep Links.
JobSentinel does not log in to LinkedIn, collect LinkedIn session credentials,
call hidden LinkedIn endpoints, or read LinkedIn pages in the background.

## Source Model

| Category | Sources |
| -------- | ------- |
| Scheduled adapters | Greenhouse, Lever, RemoteOK, WeWorkRemotely, BuiltIn, HN Who's Hiring, JobsWithGPT, Dice, YC Startup Jobs, USAJobs, SimplyHired, Glassdoor |
| Source-check adapters | Scheduled adapters plus Indeed, Wellfound, and ZipRecruiter availability checks |
| User-opened search links | LinkedIn and other destination links opened by the user |
| Preferred expansion path | Official company career pages and public ATS APIs such as Greenhouse, Lever, Ashby, Workable, SmartRecruiters, and USAJobs |

## Boundaries

| Rule | Requirement |
| ---- | ----------- |
| Official source first | Prefer documented APIs, public feeds, and official company or ATS postings |
| No restricted-site automation | Do not add hidden endpoint use, session-cookie collection, CAPTCHA bypass, or platform-control evasion |
| Local-first storage | Source results, run history, and notes stay local |
| Rate limits | Every adapter must use source-specific limits and shared retry helpers where feasible |
| Bounded reads | HTML, RSS, JSON, source-check, and import fetches cap decoded bodies at 16 MiB |
| User control | Job-site search links open in the user's browser and do not run in the background |

## Adapter Flow

```text
Configured source
  -> source-policy check
  -> rate limit
  -> bounded HTTP request
  -> parse into normalized jobs
  -> deduplicate
  -> store locally
  -> record health metadata
```

## Health And Diagnostics

The job source health dashboard tracks source status without requiring users to
understand HTTP, selectors, credentials, or logs.

| Surface | Purpose |
| ------- | ------- |
| Summary stats | Healthy, degraded, down, disabled, and unknown source counts |
| Source table | Recent success, average check time, jobs found, last run, and latest safe issue |
| Check history | Recent source attempts with timing and sanitized issues |
| Source checks | Availability checks for known supported sources |
| Troubleshooting | Plain-language next steps and sanitized debug report support |

Source health must never leak credentials, raw cookies, full URLs containing
sensitive parameters, private notes, salary floors, resumes, or application
history.

## Rate Limits

Representative adapter limits:

| Source | Requests/hour | Access pattern |
| ------ | ------------- | -------------- |
| Greenhouse | 1000 | Official/public board API |
| Lever | 1000 | Official/public postings API |
| USAJobs | 1000 | Official API with user-provided access code |
| RemoteOK | 500 | Public JSON endpoint |
| HN Who's Hiring | 500 | Public/community source |
| Dice | 500 | Public job endpoint |
| WeWorkRemotely | 300 | Public feed/page |
| BuiltIn | 300 | Public page |
| YC Startup Jobs | 300 | Public page |
| SimplyHired | 200 | Best-effort public source; may be blocked |
| Glassdoor | 200 | Best-effort public source; anti-bot prone |
| JobsWithGPT | 10000 | User-configured endpoint |

Adapters that cannot operate within source boundaries should fail closed and
show a clear user-facing explanation.

## Deduplication

JobSentinel normalizes posting links, titles, and locations before hashing
records.
This reduces duplicate postings across ATS feeds, job boards, social shares,
and company pages.

```text
SHA256(
  normalized_title +
  company_name +
  normalized_location +
  normalized_url
)
```

Normalization removes common tracking parameters, standardizes common title
abbreviations, and maps location aliases such as `SF`, `Remote US`, and
`work from home` to canonical forms.

## Testing

Use focused checks before broad suites:

```bash
cd src-tauri && cargo test --lib core::scrapers
cd src-tauri && cargo test --lib core::health
cd src-tauri && cargo test --lib core::scheduler
npm run lint:bloat
```

Adapter changes should include parser fixtures or source-specific unit tests,
rate-limit awareness, bounded-read coverage where relevant, and sanitized error
checks. Source-boundary changes also need docs and bloat-guard updates.

## Privacy Labels

| Feature | Labels |
| ------- | ------ |
| Job tracking | Local only |
| Saved searches | Local only |
| Scheduled source adapters | Local only, public-data only unless user configures an external source credential such as USAJobs |
| Source health | Local only |
| User-opened search links | Local only, user-controlled browser action |
| Optional debug report | Local only until user chooses copy, save, GitHub, or Google Drive flow; sanitized by default |

## Expansion Checklist

- Use official APIs or public feeds where available.
- Confirm source terms, robots policy, and practical access boundaries.
- Add rate limits and bounded response reads.
- Add parser fixtures or source-check coverage.
- Add health metadata and user-safe errors.
- Add docs and bloat checks for source-policy drift.
- Do not add hidden endpoints, session-cookie collection, CAPTCHA bypass, or
  evasion of platform controls.
