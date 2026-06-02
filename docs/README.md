# JobSentinel Documentation

This directory is the working documentation system for JobSentinel. The root
[README](../README.md) is the public project front door; this page routes
users, contributors, reviewers, and coding agents to maintained docs.

JobSentinel is an open-source, local-first job-search assistant for finding
real, relevant, fairly compensated work while keeping sensitive job-search data
under user control. It is designed for technical and non-technical jobs and for
users who should not need terminal commands, GitHub knowledge, or debugging
skill to get value.

## Project Rules

- **Rule 0:** user privacy and security cannot be circumvented.
- Core workflows must work locally without a hosted account, telemetry, cloud
  sync, or external AI provider.
- External AI is optional, disabled by default, and must go through the
  documented [privacy-first AI gateway](architecture/privacy-first-ai-gateway.md).
- Sensitive job-search data stays local unless the user explicitly chooses,
  previews, and approves what will be sent.
- JobSentinel must not send applications on the user's behalf, use deceptive
  resume tactics, manipulate ATS systems, collect from restricted sites, solve
  CAPTCHAs, or evade platform controls.

## Start Here

| Reader | First docs | Use them for |
| --- | --- | --- |
| Job seeker | [Quick Start](user/QUICK_START.md) | Install, set up, and get help without technical setup. |
| Support request | [Safe support reports](features/user-data-management.md) | Save or copy a safe support report locally, review it, and share it only if you want help. |
| Privacy reviewer | [Privacy](../PRIVACY.md), [Responsible AI](../RESPONSIBLE_AI.md), [AI gateway](architecture/privacy-first-ai-gateway.md) | Review data boundaries and external-AI gates. |
| Research or grant reviewer | [Research notes](research/README.md), [public roadmap](../ROADMAP.md), [research-backed plan](plans/active/research-backed-product-improvements.md) | Review evidence, evaluation boundaries, and product pillars. |
| Contributor | [Getting Started](developer/GETTING_STARTED.md), [Architecture](developer/ARCHITECTURE.md), [Testing](developer/TESTING.md) | Build, understand, and verify the app. |
| Coding agent | [AGENTS.md](../AGENTS.md), [Harness](harness/README.md), [Verification Matrix](harness/verification-matrix.md) | Follow repo operating rules and required checks. |

## Current State

- Package metadata version: `2.6.4`.
- Unreleased work is tracked in [CHANGELOG.md](../CHANGELOG.md) and the
  [active plans index](plans/README.md#current-active-plans).
- Historical release notes are indexed in
  [docs/releases](releases/README.md), but this page should not be used as a
  release log.
- Product priorities live in the root [ROADMAP](../ROADMAP.md); developer
  routing lives in [docs/ROADMAP](ROADMAP.md).

## User Docs

| Need | Doc |
| --- | --- |
| Install and first run | [Quick Start](user/QUICK_START.md) |
| Open job searches on outside sites | [Search Links](user/DEEP_LINKS.md) |
| Manage local data and safe support reports | [User Data Management](features/user-data-management.md) |
| Set up alerts | [Notifications](features/notifications.md) |
| Understand job source checks | [Job Source Status](features/scraper-health.md) |

## Feature Docs

| Area | Doc |
| --- | --- |
| Ghost-job and stale-posting protection | [Ghost Detection](features/ghost-detection.md) |
| Pay protection and salary transparency | [Pay Protection](features/salary-ai.md) |
| Resume fit review | [Resume Match](features/resume-matcher.md) |
| Resume writing | [Resume Builder](features/resume-builder.md) |
| Application board | [Application Tracking](features/application-tracking.md) |
| Review-first application form help | [Application Assist](features/one-click-apply.md) |
| Official-source job monitoring | [Job Source Adapters](features/scrapers.md) |
| Browser import button | [Browser Import Button](BOOKMARKLET.md) |
| Hiring trends | [Hiring Trends](features/market-intelligence.md) |
| Match priorities | [Smart Scoring](features/smart-scoring.md) |
| Work-mode matching | [Remote Preference Matching](features/remote-preference-scoring.md) |
| Broad skill matching | [Synonym Matching](features/synonym-matching.md) |
| Structured resume import | [Resume Data Import](features/json-resume-import.md) |
| Credential storage | [Credential Security](features/credentials-security.md) |

## Privacy, Security, And Responsible AI

| Topic | Doc |
| --- | --- |
| Privacy philosophy and data boundaries | [PRIVACY.md](../PRIVACY.md) |
| Responsible AI boundaries | [RESPONSIBLE_AI.md](../RESPONSIBLE_AI.md) |
| External-AI gateway architecture | [Privacy-first AI Gateway](architecture/privacy-first-ai-gateway.md) |
| OS keyring storage | [Keyring Security](security/KEYRING.md) |
| Security reporting | [SECURITY.md](../SECURITY.md) |

## Research Docs

Research and evaluation use public job postings and synthetic candidate
profiles by default. Real user data requires explicit informed consent.

- [Research README](research/README.md)
- [Job-seeker behavior](research/job-seeker-behavior.md)
- [ATS transparency](research/ats-transparency.md)
- [Ghost jobs](research/ghost-jobs.md)
- [Job-site data sources](research/job-site-data-sources.md)
- [Pay equity](research/pay-equity.md)
- [Salary negotiation](research/salary-negotiation.md)

## Developer Docs

| Need | Doc |
| --- | --- |
| Local development setup | [Getting Started](developer/GETTING_STARTED.md) |
| Architecture map | [Architecture](developer/ARCHITECTURE.md) |
| Test strategy and commands | [Testing](developer/TESTING.md) |
| Contributing workflow | [Contributing](developer/CONTRIBUTING.md) |
| Release process | [Releasing](developer/RELEASING.md) |
| Linux packages | [Linux Build Guide](developer/LINUX_BUILD.md) |
| macOS notes | [macOS Development](developer/MACOS_DEVELOPMENT.md) |
| SQLite and SQLx setup | [SQLite Configuration](developer/sqlite-configuration.md) |
| Error-handling patterns | [Error Handling](developer/ERROR_HANDLING.md) |
| Mutation testing | [Mutation Testing](developer/MUTATION_TESTING.md) |
| Browser E2E tests | [Tests README](../tests/README.md) |

## Harness And Plans

| Need | Doc |
| --- | --- |
| Agent operating model | [Harness README](harness/README.md) |
| Required checks | [Verification Matrix](harness/verification-matrix.md) |
| Change contracts | [Change Contract](harness/change-contract.md) |
| Exec plan format | [Exec Plans](exec-plans.md) |
| Active plans | [Active Plans](plans/README.md#current-active-plans) |
| Completed plans | [Completed Plans](plans/README.md#archived-plans) |
| Technical debt tracker | [Tech Debt Tracker](plans/tech-debt-tracker.md) |

## Maintenance Rules

- Update docs when behavior, setup, commands, architecture, security posture,
  privacy posture, release flow, or user-facing copy changes.
- Keep docs in one maintained home instead of duplicating release logs or old
  implementation notes.
- Prefer plain user language for user-facing docs and clear implementation
  contracts for developer docs.
- Run focused checks for the changed surface. Docs changes usually need:

```bash
npm run lint:docs
npm run lint:bloat
git diff --check
```

Broader changes may also require frontend tests, Rust checks, build checks, or
E2E tests from the [Verification Matrix](harness/verification-matrix.md).
