# Job Source Status

Job source status helps users see whether job sources are working, having
trouble, unavailable, or turned off. The dashboard turns source failures into
plain-language status and safe next steps.

## Scope

| Area | Current behavior |
| ---- | ---------------- |
| Scheduled source status | Tracks Greenhouse, Lever, RemoteOK, WeWorkRemotely, BuiltIn, startup and tech job posts, JobsWithGPT, Dice, YC Startup Jobs, USAJobs, SimplyHired, and Glassdoor |
| Source-check coverage | Includes scheduled sources plus Indeed, Wellfound, and ZipRecruiter availability checks |
| User-opened search links | LinkedIn and similar destination links are opened by the user, not monitored in the background |
| Saved access details | Tracks user-approved external channels where applicable; LinkedIn login details are not collected |
| Support reports | Safe support reports can be copied or saved locally, reviewed, and shared only when the user chooses |

## User States

| Status | Meaning | User-facing action |
| ------ | ------- | ------------------ |
| Working | Source recently worked | Keep using this source |
| Having trouble | Some recent checks failed | Try again later or use search links if urgent |
| Not working | Repeated recent checks failed | Prefer other sources or open official company pages |
| Off | User or policy turned source off | Turn on only if useful and allowed |
| Not checked | No recent check data | Check this job site now or wait for the next scheduled check |

## Dashboard Surface

The Settings source-status view should show:

- Summary counts for working, having-trouble, not-working, off, and not-checked
  sources.
- One row per source with status, plain recent-result label, time needed, jobs
  found, last checked, whether JobSentinel can read jobs, and what to do next.
- Run history for recent attempts.
- Job-site check buttons for known supported sources.
- Job-site checks use the current saved settings in the running app; users do
  not need to close and reopen JobSentinel after changing source settings.
- Safe support report actions when a user needs help.

## Source Policy

Source status must follow the same rules for job sources:

- Prefer official feeds, public feeds, and official employer or application
  platform postings.
- Check sites politely and avoid reading more page data than needed.
- Do not add hidden job-site checks.
- Do not collect restricted-site session credentials.
- Do not get around human checks or platform controls.
- Do not include raw credentials, cookies, private notes, resumes, salary floors,
  or application history in health errors or support reports.
- For optional user-approved job-source feeds such as JobsWithGPT, disclose
  that JobsWithGPT receives only saved job titles, location, remote preference,
  and result limit for job-site checks. These feeds must stay off unless turned
  on and the exact details are reviewed and approved locally.
  The latest approved contact can be shown locally as contact time, website
  contacted, count-only request categories, and outcome. Do not store raw
  titles, raw location, private notes, resumes, salary floors, application
  history, or full source links in that contact history.
  Settings also labels sensitive data that was not sent, including resume text,
  salary floors, private notes, application history, and full source links.

LinkedIn is intentionally handled as a user-opened search-link destination. It
should not appear as a background source, credential-renewal prompt, or job-site
check.
