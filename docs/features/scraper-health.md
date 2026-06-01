# Job Source Health

Job source health helps non-technical users see whether job sources are working,
degraded, blocked, or disabled. The dashboard turns source failures into
plain-language status and safe next steps.

## Scope

| Area | Current behavior |
| ---- | ---------------- |
| Scheduled source health | Tracks Greenhouse, Lever, RemoteOK, WeWorkRemotely, BuiltIn, HN Who's Hiring, JobsWithGPT, Dice, YC Startup Jobs, USAJobs, SimplyHired, and Glassdoor |
| Source-check coverage | Includes scheduled sources plus Indeed, Wellfound, and ZipRecruiter availability checks |
| User-opened search links | LinkedIn and similar destination links are opened by the user, not monitored in the background |
| Credentials | Tracks user-configured external channels where applicable; LinkedIn session credentials are not collected |
| Support reports | Sanitized reports can be copied or saved locally before the user chooses whether to share |

## User States

| Status | Meaning | User-facing action |
| ------ | ------- | ------------------ |
| Healthy | Source recently worked | Keep using this source |
| Degraded | Some recent failures | Watch source or try again later |
| Down | Repeated recent failures | Prefer other sources or open official company pages |
| Disabled | User or policy disabled source | Re-enable only if source policy allows it |
| Unknown | No recent run data | Run a source check or wait for next scheduled scan |

## Dashboard Surface

The Settings troubleshooting dashboard should show:

- Summary counts for healthy, degraded, down, disabled, and unknown sources.
- One row per source with status, recent success, average check time, jobs
  found, last run, and a sanitized latest issue.
- Run history for recent attempts.
- Source-check buttons for known supported sources.
- Safe support report actions when a user needs help.

## Source Policy

Source health must follow the same source boundaries as adapters:

- Prefer official APIs, public feeds, and official company or ATS postings.
- Use rate limits and bounded response reads.
- Do not add hidden endpoint checks.
- Do not collect restricted-site session credentials.
- Do not attempt CAPTCHA bypass or platform-control evasion.
- Do not include raw credentials, cookies, private notes, resumes, salary floors,
  or application history in health errors or support reports.

LinkedIn is intentionally handled as a user-opened search-link destination. It
should not appear as a background source, credential-renewal prompt, or source
check.

## Implementation Notes

Important modules:

| Module | Role |
| ------ | ---- |
| `src-tauri/src/core/health/smoke_tests.rs` | Known source-check list and connectivity checks |
| `src-tauri/src/core/health/tracking.rs` | Run lifecycle records |
| `src-tauri/src/core/health/metrics.rs` | Aggregated health metrics |
| `src-tauri/src/commands/health.rs` | Tauri command boundary |
| `src/pages/Settings.tsx` | Troubleshooting and source status UI |

## Verification

Focused checks:

```bash
cd src-tauri && cargo test --lib core::health
cd src-tauri && cargo test --lib core::scheduler
npm run test:run -- src/pages/Settings.test.tsx
npm run lint:bloat
```

Add or update tests when source lists, source-policy boundaries, source-check
behavior, or user-facing status copy changes.
