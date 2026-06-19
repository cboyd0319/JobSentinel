# Job Sources

JobSentinel favors official-source job monitoring and public job sources
checked within clear limits. Source access must preserve user privacy, source
boundaries, rate limits, and review-first workflows.

Restricted job boards are supported only through explicit user-controlled
paths: search links, manual entry, pasted individual job links, Browser Import,
or scheduled checks that show a source-specific warning first. Before risky
source use, JobSentinel must warn that the site may treat scraping or
automation as a terms violation, account risk, legal-claim risk, and
privacy-law risk. The user can continue only after acknowledging that warning.
JobSentinel does not encourage terms violations, collect restricted-site login
details, save session cookies, bypass human checks, call private systems, or
read restricted pages in hidden background jobs.

The warning must be prominent in the UI and public docs because non-technical
users should not need to understand source internals to make an informed
choice. The secure path is the easy path: official feeds first, user-opened and
reviewed paths next, restricted automation only after explicit local
acknowledgement.

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
| Restricted-site user gate | Warn prominently and require explicit acknowledgement before user-directed restricted-site import, browser import, search-link open, or scheduled restricted-source check |
| No secret capture or evasion | Do not add hidden data paths, session-cookie collection, human-check workarounds, or platform-control evasion |
| Local-first storage | Source results, run history, and notes stay local |
| Rate limits | Every source check must wait within that source's limits |
| Response size | JobSentinel stops reading very large responses; the current safety limit is 16 MiB |
| User control | Job-site search links open in the user's browser; restricted-site actions continue only after acknowledgement |

Third-party scraping frameworks must be evaluated against these boundaries
before adoption. Libraries that add browser fingerprint impersonation, proxy
rotation, hidden browser sessions, challenge solving, persistent cookies,
automatic redirect following, uncapped response reads, or broad crawling do not
fit the scheduled source-check model. A helper library may be considered only
when JobSentinel still controls which pages are read, how often they are read,
how much page data is accepted, and what user-safe message appears when the
source blocks access.

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
update the saved source settings as well as source status. Source-check-only
helpers that need a company URL, feed approval, access code, or other setup
remain setup checks until the user completes that setup in Settings.

| Surface | Purpose |
| ------- | ------- |
| Summary stats | Healthy, degraded, down, disabled, and unknown source counts |
| Source table | Current status, plain recent-result label, jobs found, last checked, and next step |
| Check history | Recent source attempts with timing and sanitized issues |
| Source checks | Availability checks for known supported sources |
| Help steps | Plain-language next steps and sanitized support report help |

Source status must never leak credentials, raw cookies, full links containing
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

Restricted scheduled sources such as BuiltIn, Dice, SimplyHired, and Glassdoor
must also require a saved local acknowledgement before the scheduler runs them.
If a config file or backup turns one on without that acknowledgement, the
scheduler skips the source and returns a plain recovery message telling the
user to review the restricted-source risk in Settings.

## Debug And Release Verification

Every source JobSentinel uses must have release evidence before JobSentinel
claims that source is ready:

- Native source checks need tests that prove JobSentinel can read expected job
  details, wait politely, handle no results or source trouble, and show safe
  status details.
- User-gated restricted paths need tests for warning visibility,
  acknowledgement, disabled actions before acknowledgement, and no credential
  or session-cookie capture.
- Live or manual source checks must be opt-in, low-volume, and recorded with
  date, source, platform, result, and user-safe recovery guidance.
- If a source blocks access, JobSentinel should show a non-technical next step:
  try later, use a search link, import one job from the browser, open the
  employer career page, or add the job manually.

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
- Keep new source checks inside JobSentinel's existing safety path so link
  checks, redirect handling, page-size limits, retry behavior, and safe support
  details stay consistent.
- Add source status and user-safe errors.
- Do not add hidden data paths, session-cookie collection, human-check workarounds,
  or evasion of platform controls.
