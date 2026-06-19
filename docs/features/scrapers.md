# Job Sources

JobSentinel favors official-source job monitoring and public job sources
checked within clear limits. Source access must preserve user privacy, source
boundaries, rate limits, and review-first workflows.

Restricted job boards are supported only through explicit user-controlled
paths: search links, manual entry, pasted individual job links, Browser Import,
or scheduled checks that show a source-specific warning first. Before risky
source use, JobSentinel must explain in plain language that some sites have
rules about automated tools and that misusing tools can affect the user's
account or create legal/privacy risk. The user can continue only after
acknowledging that warning. JobSentinel does not encourage terms violations,
collect restricted-site login details, save session cookies, bypass human
checks, call private systems, or read restricted pages in hidden background
jobs.

Restricted authenticated sites have a stricter rule. If JobSentinel opens a
sign-in page for LinkedIn or a similar source, the warning must appear before
that page opens, the action must be started by the user in that moment, no auth
tokens, session cookies, browser storage, or authorization headers may be saved,
and JobSentinel must not reuse that sign-in state later for offline or scheduled
collection. For manual sessions where JobSentinel does not inspect or automate
the site, use a visible privacy reminder instead of forcing the user to stop.
Hard expiry is reserved for any future restricted-source feature that reads or
automates restricted content.

Use the same privacy-reminder pattern for any browser or webview opened by
JobSentinel. The user should be able to close the session or keep going. Do not
force a timeout only because the browser has been open for a while.

Reviewed public APIs, feeds, ATS postings, and official employer posting
endpoints are low-friction sources. Greenhouse, Lever, public feeds, and
similar unauthenticated posting sources should use normal source opt-in, rate
limits, safe errors, and parser tests, not restricted-source acknowledgements
or authenticated-session time gates.

Do not confuse restricted public boards with authenticated sessions. A job board
can be technically public and unauthenticated while still requiring a prominent
user agreement because its terms, anti-automation controls, or data-use
expectations are unclear. Those restricted public unauthenticated sources may
run as user-approved source checks with rate limits and safe errors; they do
not receive LinkedIn-style sign-in-session restrictions unless the flow opens an
account-backed sign-in session.

The warning must be prominent in the UI and public docs because users should
not need to understand source internals to make an informed choice. The secure
path is the easy path: official feeds first, user-opened and reviewed paths
next, restricted automation only after explicit local acknowledgement.

Saved acknowledgements can reduce repeat friction. Keep them local, tied to the
source and warning version, and reset them when the warning, source class, or
data behavior changes.

## Source Model

| Category | Sources |
| -------- | ------- |
| Scheduled job checks | Greenhouse, Lever, RemoteOK, WeWorkRemotely, BuiltIn, community hiring posts, JobsWithGPT, Dice, YC Startup Jobs, USAJobs, SimplyHired, Glassdoor |
| Source-check helpers | Scheduled job checks plus Indeed, Wellfound, and ZipRecruiter availability checks |
| Company careers discovery | Employer careers pages that JobSentinel can classify before choosing a safe source path |
| User-opened search links | LinkedIn and other destination links opened by the user |
| Preferred expansion path | Official company career pages and public hiring-platform sources such as Greenhouse, Lever, Ashby, Workable, SmartRecruiters, and USAJobs |

## Boundaries

| Rule | Requirement |
| ---- | ----------- |
| Official source first | Prefer official posting sources, public feeds, and company or application-platform postings |
| Restricted-site user gate | Warn prominently and require explicit acknowledgement before user-directed restricted-site import, browser import, search-link open, or scheduled restricted-source check |
| Technical auth classification | Keep public unauthenticated sources, local API-key sources, authenticated user-session sources, and unknown review-required sources distinct in the shared source taxonomy |
| Restricted-domain rationale | Every domain in `RESTRICTED_JOB_SOURCE_DOMAINS` must come from a structured record with a specific reason, category, and source reference; do not add undocumented domains |
| No secret capture or evasion | Do not add hidden data paths, session-cookie collection, human-check workarounds, or platform-control evasion |
| Local-first storage | Source results, run history, and notes stay local |
| Rate limits | Every source check must wait within that source's limits |
| Response size | JobSentinel stops reading very large responses; the current safety limit is 16 MiB |
| User control | Job-site search links open in the user's browser; restricted-site actions continue only after acknowledgement |

## User-Controlled LinkedIn Workbench

The LinkedIn-compatible flow should be a workbench, not a scraper:

1. The user starts the LinkedIn session from JobSentinel.
2. JobSentinel shows short, friendly copy about what it can help with.
3. The user signs in and uses LinkedIn directly.
4. JobSentinel shows local controls beside the browser: save, applied, track,
   note, follow up, not interested, and paste details.
5. JobSentinel stores only user-confirmed local records.
6. Local analysis runs after the record exists in JobSentinel.

`Log applied` should be a one-click action. If title, company, or link are not
known yet, create a draft application record with `Needs details` fields and
prompt the user to finish it later. Optional details should come after the
click, not before it.

Prefill is allowed only from explicit user action: pasted job links, pasted
details, selected text the user sends to JobSentinel, or previously confirmed
local records. For restricted authenticated sites, do not prefill by reading
page DOM, network traffic, browser storage, accessibility trees, screenshots,
or hidden browser state. Prefilled values remain suggestions until the user
confirms them.

Interest learning should use local JobSentinel signals first: saved jobs,
manual ledger events, search terms, dismissed jobs, notes, profile preferences,
and user ratings. For restricted authenticated sites, JobSentinel may learn from
JobSentinel-side actions, but not from silent page observation. Any future
"watch and learn" mode must be visibly on, explain what it records, stay local,
have an off switch, and never submit applications or create durable application
records without user confirmation.

Third-party scraping frameworks must be evaluated against these boundaries
before adoption. Libraries that add browser fingerprint impersonation, proxy
rotation, hidden browser sessions, challenge solving, persistent cookies,
automatic redirect following, uncapped response reads, or broad crawling do not
fit the scheduled source-check model. A helper library may be considered only
when JobSentinel still controls which pages are read, how often they are read,
how much page data is accepted, and what user-safe message appears when the
source blocks access.

## Company Careers Discovery

Many strong employer postings never appear cleanly on stock job boards. A user
should be able to paste or open an employer careers page, such as a company
careers URL, and have JobSentinel classify it before deciding what to do next.

The discovery order is:

1. Detect public ATS or official API signals such as Greenhouse, Lever, Ashby,
   SmartRecruiters, Workable, Workday, Breezy, JazzHR, Bullhorn, Eightfold,
   iCIMS, Jobvite, Teamtailor, Recruitee, Taleo, SAP SuccessFactors, Oracle
   Recruiting, or Phenom.
2. Normalize to a native scheduled source only when the public endpoint and
   source terms are reviewed.
3. Offer a user-opened search link, pasted job link import, Browser Import, or
   manual entry when the employer page is custom, restricted, blocked, or still
   under review.

Examples from the 2026-06-19 source pass:

| Employer page | Discovery result |
| ------------- | ---------------- |
| Fivetran careers | Greenhouse board `fivetran`; keep the employer job links shown by the source |
| Primer AI Greenhouse board | Greenhouse board `primerai` on the current `job-boards.greenhouse.io` host |
| SpaceX careers | Custom page, but public Greenhouse board `spacex` exists behind it |
| Google, Yahoo, IBM, and Microsoft company pages | Open in the user browser while safer handling is reviewed |
| LinkedIn company jobs | User-gated restricted discovery only; no silent scheduled discovery or session capture |
| LinkedIn Jobs Tracker | User-gated restricted tracking only for saved or applied jobs; no silent scheduled discovery or session capture |

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
| Community hiring posts | Medium | Public/community source |
| Dice | Medium | Public job feed |
| WeWorkRemotely | Moderate | Public feed/page |
| BuiltIn | Moderate | Public page |
| YC Startup Jobs | Moderate | Public page |
| SimplyHired | Conservative | Best-effort public source; may be blocked |
| Glassdoor | Conservative | Best-effort public source; may ask for human checks |
| JobsWithGPT | Feed-controlled | User-approved job-source feed |

Checks that cannot operate within source boundaries should fail closed and
show a clear user-facing explanation.

Source Status must show a one-time review prompt before checking restricted
public unauthenticated helpers such as Indeed, Wellfound, BuiltIn, Dice,
ZipRecruiter, SimplyHired, and Glassdoor. The prompt explains that some job
boards have rules about automated tools and points users to search links,
Browser Import, pasted links, employer pages, or manual entry if a site blocks
the check or asks for human review.

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
- If a source blocks access, JobSentinel should show a plain next step:
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
