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
| Preferred expansion path | Official company career pages and public hiring-platform sources such as Greenhouse, Lever, Ashby, Workable, SmartRecruiters, and USAJobs |

## Boundaries

| Rule | Requirement |
| ---- | ----------- |
| Official source first | Prefer official posting sources, public feeds, and company or application-platform postings |
| No restricted-site automation | Do not add hidden data paths, session-cookie collection, human-check workarounds, or platform-control evasion |
| Local-first storage | Source results, run history, and notes stay local |
| Rate limits | Every source check must wait within that source's limits |
| Response size | JobSentinel stops reading very large responses; the current safety limit is 16 MiB |
| User control | Job-site search links open in the user's browser and do not run in the background |

## How Job Checks Work

```text
Source the user turned on
  -> confirm the source is allowed
  -> wait within that source's limits
  -> read public job details
  -> remove duplicates
  -> store locally
  -> record safe status details
```

First-run setup can suggest job sources before the user saves the search, but it
contacts only sources the user checks in review. If no outside source is
selected, the review summary says the setup is a local saved search only. Source
checks do not receive resumes, private notes, saved answers, application
history, or unrelated profile details.

## Source Status And Help

The job source status view tracks source status without requiring users to
understand website internals, saved connection details, or logs.
For sources that can be enabled from saved search settings, status toggles must
update the saved source config as well as health metadata. Source-check-only
helpers that need a company URL, feed approval, access code, or other setup
remain diagnostics until the user completes that setup in Settings.

| Surface | Purpose |
| ------- | ------- |
| Summary stats | Healthy, degraded, down, disabled, and unknown source counts |
| Source table | Current status, plain recent-result label, jobs found, last checked, and next step |
| Check history | Recent source attempts with timing and sanitized issues |
| Source checks | Availability checks for known supported sources |
| Help steps | Plain-language next steps and sanitized support report help |

Source status must never leak credentials, raw cookies, full URLs containing
sensitive parameters, private notes, salary floors, resumes, or application
history.

## Source Check Pace

Representative source pacing:

| Source | Check pace | Access pattern |
| ------ | ------------- | -------------- |
| Greenhouse | High | Official public postings |
| Lever | High | Official public postings |
| USAJobs | High | Official source with user-provided access code |
| RemoteOK | Medium | Public job feed |
| Startup and tech job posts | Medium | Public/community source |
| Dice | Medium | Public job feed |
| WeWorkRemotely | Moderate | Public feed/page |
| BuiltIn | Moderate | Public page |
| YC Startup Jobs | Moderate | Public page |
| SimplyHired | Conservative | Best-effort public source; may be blocked |
| Glassdoor | Conservative | Best-effort public source; may ask for human checks |
| JobsWithGPT | Feed-controlled | User-approved job-source feed |

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
The contact summary also names sensitive data that was not sent so users can
verify that resumes, salary floors, private notes, application history, and full
source links stayed out of the source request.

## Duplicate Handling

JobSentinel cleans posting links, titles, and locations before checking for
matching records.
This reduces duplicate postings across hiring-platform feeds, job boards,
social shares, and company pages.

User-imported job links are cleaned before preview, duplicate checks, and
storage. The importer removes embedded credentials, fragments, tracking
parameters, and sensitive query parameters while preserving public posting
identifiers needed to recognize the posting.
When the import preview includes posting pay, it labels it as listed pay so the
user treats it as source evidence to review rather than a guaranteed salary.
When the import preview does not include posting pay, it says listed pay is not
shown and asks the user to verify pay before tailoring.
When the posting includes a closing date, the import preview shows it before
the user saves the job. Previewed posting and closing dates preserve the source
date instead of shifting a day earlier in local time zones. If a source returns
a malformed posting or closing date, the preview shows **Date not shown**
instead of displaying a raw date-parsing error.

JobSentinel compares cleaned title, company, location, and link to spot
duplicates.

Normalization removes common tracking parameters, standardizes common title
abbreviations, and maps location aliases such as `SF`, `Remote US`, and
`work from home` to canonical forms.

## Privacy Labels

| Feature | Labels |
| ------- | ------ |
| Job tracking | Local only |
| Saved searches | Local only |
| Scheduled job checks | Local only, public-data only unless the user turns on an external access code such as USAJobs |
| Source status | Local only |
| User-opened search links | Local only, user-controlled browser action |
| Optional support report | Local only until user chooses copy, save, or GitHub issue flow; sanitized by default |

## Expansion Checklist

- Use official posting sources where available.
- Confirm source terms, robots policy, and practical access boundaries.
- Check sources politely and avoid reading more page data than needed.
- Add health metadata and user-safe errors.
- Do not add hidden data paths, session-cookie collection, human-check workarounds,
  or evasion of platform controls.
