# Job Sources

JobSentinel favors official-source job monitoring and public job sources
checked within clear limits. Source access must preserve user privacy, source
boundaries, rate limits, and review-first workflows.

LinkedIn is supported as a user-opened search destination through Deep Links.
JobSentinel does not log in to LinkedIn, collect LinkedIn session credentials,
call private LinkedIn systems, or read LinkedIn pages in the background.

## Source Model

| Category | Sources |
| -------- | ------- |
| Scheduled job checks | Greenhouse, Lever, RemoteOK, WeWorkRemotely, BuiltIn, startup and tech job posts, JobsWithGPT, Dice, YC Startup Jobs, USAJobs, SimplyHired, Glassdoor |
| Source-check helpers | Scheduled job checks plus Indeed, Wellfound, and ZipRecruiter availability checks |
| User-opened search links | LinkedIn and other destination links opened by the user |
| Preferred expansion path | Official company career pages and public hiring-platform feeds or APIs such as Greenhouse, Lever, Ashby, Workable, SmartRecruiters, and USAJobs |

## Boundaries

| Rule | Requirement |
| ---- | ----------- |
| Official source first | Prefer documented feeds or APIs, public feeds, and official company or application-platform postings |
| No restricted-site automation | Do not add hidden data paths, session-cookie collection, human-check workarounds, or platform-control evasion |
| Local-first storage | Source results, run history, and notes stay local |
| Rate limits | Every source check must use source-specific limits and shared retry helpers where feasible |
| Bounded reads | Page, feed, source-check, and import requests cap decoded bodies at 16 MiB |
| User control | Job-site search links open in the user's browser and do not run in the background |

## How Job Checks Work

```text
Source the user turned on
  -> source-boundary check
  -> rate limit
  -> bounded public request
  -> read public job details
  -> remove duplicates
  -> store locally
  -> record safe status details
```

## Health And Troubleshooting

The job source health dashboard tracks source status without requiring users to
understand website internals, saved connection details, or logs.

| Surface | Purpose |
| ------- | ------- |
| Summary stats | Healthy, degraded, down, disabled, and unknown source counts |
| Source table | Current status, plain recent-result label, jobs found, last checked, and next step |
| Check history | Recent source attempts with timing and sanitized issues |
| Source checks | Availability checks for known supported sources |
| Troubleshooting | Plain-language next steps and sanitized support report help |

Source health must never leak credentials, raw cookies, full URLs containing
sensitive parameters, private notes, salary floors, resumes, or application
history.

## Rate Limits

Representative source limits:

| Source | Requests/hour | Access pattern |
| ------ | ------------- | -------------- |
| Greenhouse | 1000 | Official/public board API |
| Lever | 1000 | Official/public postings API |
| USAJobs | 1000 | Official API with user-provided access code |
| RemoteOK | 500 | Public job feed |
| Startup and tech job posts | 500 | Public/community source |
| Dice | 500 | Public job feed |
| WeWorkRemotely | 300 | Public feed/page |
| BuiltIn | 300 | Public page |
| YC Startup Jobs | 300 | Public page |
| SimplyHired | 200 | Best-effort public source; may be blocked |
| Glassdoor | 200 | Best-effort public source; may ask for human checks |
| JobsWithGPT | 10000 | User-approved job-source feed |

Checks that cannot operate within source boundaries should fail closed and
show a clear user-facing explanation.

## User-Approved Job-Source Feeds

JobsWithGPT is disabled unless the user adds a job-source feed and approves the
exact details for that feed. Source checks send only the reviewed search fields
needed by that feed: saved job titles, location, remote preference, and result
limit. If titles, feed, or remote settings change, the approval no longer
matches and JobSentinel skips that source until the user reviews the new
details. Do not send resumes, salary floors, private notes, application history,
screening answers, or unrelated profile details to a job-source feed.
When the user approves a job-source feed, Settings should keep showing the exact
approved details and explain that any change turns the source off until the user
approves again.
Settings also shows the latest approved contact as local status details only:
contact time, website contacted, count-only request categories, and outcome. The
contact history must not store raw titles, raw location, resumes, salary floors,
private notes, application history, or full source links.

## Duplicate Handling

JobSentinel cleans posting links, titles, and locations before checking for
matching records.
This reduces duplicate postings across hiring-platform feeds, job boards,
social shares, and company pages.

User-imported job links are cleaned before preview, duplicate checks, and
storage. The importer removes embedded credentials, fragments, tracking
parameters, and sensitive query parameters while preserving public posting
identifiers needed to recognize the posting.

JobSentinel compares cleaned title, company, location, and link to spot
duplicates.

Normalization removes common tracking parameters, standardizes common title
abbreviations, and maps location aliases such as `SF`, `Remote US`, and
`work from home` to canonical forms.

<details>
<summary><strong>For maintainers</strong></summary>

## Testing

Use focused checks before broad suites:

```bash
cd src-tauri && cargo test --lib core::scrapers
cd src-tauri && cargo test --lib core::health
cd src-tauri && cargo test --lib core::scheduler
npm run lint:bloat
```

Source-check changes should include parser fixtures or source-specific unit tests,
rate-limit awareness, bounded-read coverage where relevant, and sanitized error
checks. Source-boundary changes also need docs and bloat-guard updates.

</details>

## Privacy Labels

| Feature | Labels |
| ------- | ------ |
| Job tracking | Local only |
| Saved searches | Local only |
| Scheduled job checks | Local only, public-data only unless the user turns on an external access code such as USAJobs |
| Source health | Local only |
| User-opened search links | Local only, user-controlled browser action |
| Optional support report | Local only until user chooses copy, save, or GitHub issue flow; sanitized by default |

## Expansion Checklist

- Use official feeds or APIs where available.
- Confirm source terms, robots policy, and practical access boundaries.
- Check sources politely and avoid reading more page data than needed.
- Add parser fixtures or source-check coverage.
- Add health metadata and user-safe errors.
- Add docs and bloat checks for source-policy drift.
- Do not add hidden data paths, session-cookie collection, human-check workarounds,
  or evasion of platform controls.
