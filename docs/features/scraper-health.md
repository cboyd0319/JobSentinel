# Job Source Status

Job source status helps users see whether job sources are working, having
trouble, unavailable, or turned off. The dashboard turns source failures into
plain-language status and safe next steps.

## Scope

| Area | Current behavior |
| ---- | ---------------- |
| Scheduled source health | Tracks Greenhouse, Lever, RemoteOK, WeWorkRemotely, BuiltIn, HN Who's Hiring, JobsWithGPT, Dice, YC Startup Jobs, USAJobs, SimplyHired, and Glassdoor |
| Source-check coverage | Includes scheduled sources plus Indeed, Wellfound, and ZipRecruiter availability checks |
| User-opened search links | LinkedIn and similar destination links are opened by the user, not monitored in the background |
| Credentials | Tracks user-configured external channels where applicable; LinkedIn session credentials are not collected |
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

The Settings troubleshooting dashboard should show:

- Summary counts for working, having-trouble, not-working, off, and not-checked
  sources.
- One row per source with status, plain recent-result label, time needed, jobs
  found, last checked, whether JobSentinel can read jobs, and what to do next.
- Run history for recent attempts.
- Job-site check buttons for known supported sources.
- Safe support report actions when a user needs help.

## Source Policy

Source health must follow the same rules for job sources:

- Prefer official feeds, public feeds, and official employer or application
  platform postings.
- Check sites politely and avoid reading more page data than needed.
- Do not add hidden job-site checks.
- Do not collect restricted-site session credentials.
- Do not get around human checks or platform controls.
- Do not include raw credentials, cookies, private notes, resumes, salary floors,
  or application history in health errors or support reports.
- For optional user-configured source addresses such as JobsWithGPT, disclose that
  JobsWithGPT receives only saved job titles, location, remote preference, and
  result limit for job-site checks. These addresses must stay off unless
  configured and the exact details are reviewed and approved locally.

LinkedIn is intentionally handled as a user-opened search-link destination. It
should not appear as a background source, credential-renewal prompt, or job-site
check.

## For Maintainers

Important modules:

| Module | Role |
| ------ | ---- |
| `src-tauri/src/core/health/smoke_tests.rs` | Known source-check list and connectivity checks |
| `src-tauri/src/core/health/tracking.rs` | Run lifecycle records |
| `src-tauri/src/core/health/metrics.rs` | Aggregated health metrics |
| `src-tauri/src/commands/health.rs` | Tauri command boundary |
| `src/pages/Settings.tsx` | Troubleshooting and source status UI |

## Checks for Maintainers

Focused checks:

```bash
cd src-tauri && cargo test --lib core::health
cd src-tauri && cargo test --lib core::scheduler
npm run test:run -- src/pages/Settings.test.tsx
npm run lint:bloat
```

Add or update tests when source lists, source-policy boundaries, source-check
behavior, or user-facing status copy changes.
