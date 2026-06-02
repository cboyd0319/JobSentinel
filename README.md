# JobSentinel

**JobSentinel is an open-source, local-first job-search assistant for finding real,
relevant, fairly compensated work while keeping sensitive job-search data under user
control.**

[![CI](https://github.com/cboyd0319/JobSentinel/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/cboyd0319/JobSentinel/actions/workflows/ci.yml)
[![Docs Harness](https://github.com/cboyd0319/JobSentinel/actions/workflows/docs-harness.yml/badge.svg?branch=main)](https://github.com/cboyd0319/JobSentinel/actions/workflows/docs-harness.yml)
[![Release](https://img.shields.io/github/v/release/cboyd0319/JobSentinel?label=release&color=2563eb)](https://github.com/cboyd0319/JobSentinel/releases/latest)
[![MIT License](https://img.shields.io/badge/license-MIT-111827)](LICENSE)
[![Rule 0](https://img.shields.io/badge/rule%200-privacy%20%26%20security-991b1b)](PRIVACY.md)
[![Local First](https://img.shields.io/badge/data-local--first-0f766e)](PRIVACY.md)
[![No Telemetry](https://img.shields.io/badge/telemetry-none-111827)](PRIVACY.md)
[![External AI Optional](https://img.shields.io/badge/external%20AI-optional-2563eb)](docs/architecture/privacy-first-ai-gateway.md)
[![Research Backed](https://img.shields.io/badge/research-backed-334155)](docs/research/README.md)

**Start here:** [Download](#download-and-first-run) |
[Quick start](docs/user/QUICK_START.md) | [Privacy](PRIVACY.md) |
[Research](docs/research/README.md) | [Roadmap](ROADMAP.md) |
[Support](#support-and-community)

<p align="center">
  <img src="docs/images/dashboard.png" alt="JobSentinel dashboard" width="840">
  <br>
  <em>Local dashboard with job matches, posting-risk cues, filters, source status, and dark mode.</em>
</p>

## Abstract

JobSentinel is a desktop assistant and applied research project for people
trying to find work. It is built for technical and non-technical roles, career
changes, long searches, and users who should not need terminal commands, GitHub
knowledge, or debugging skill to get value.

The project tests a practical thesis: local-first software can help job seekers
focus on real openings, protect compensation goals, understand opaque screening
signals, and keep sensitive job-search data under personal control.

Core workflows work locally. Job tracking, saved searches, application notes,
salary floors, resume records, source health, and safe support reports work
without a hosted account, telemetry, cloud sync, or external AI provider.

**Rule 0: user privacy and security are non-negotiable.** No feature,
integration, support shortcut, AI provider, research workflow, test fixture, or
convenience path may weaken local control, credential safety, source boundaries,
explicit review, or privacy-preserving defaults.

External AI, including OpenAI or another provider, is optional, disabled by
default, and routed through the
[privacy-first AI gateway](docs/architecture/privacy-first-ai-gateway.md).
External requests send only needed details, show those details before anything
leaves the device, and provide redaction, cancellation, approval, and local
request logging.

JobSentinel is free, will always stay free, and will always remain MIT
licensed. This code exists to help job seekers. Fork it, adapt it, improve it,
or build something better with it if that helps more people.

## At A Glance

| Question | Answer |
| -------- | ------ |
| Who is it for? | Anyone trying to find a new job, including technical and non-technical roles. |
| What is it built to help with? | Real, relevant, fairly compensated work, not application volume. |
| What stays local? | Searches, saved jobs, notes, resumes, salary floors, application history, and safe support reports by default. |
| What can leave the device? | Enabled job-source checks, job sources or career pages the user approves for checking, alerts the user turns on, optional location detection after a click, support links opened by the user, or explicitly approved external AI requests. |
| Is external AI required? | No. External AI is optional, disabled by default, preview-gated, and gateway-bound. |
| Is it free? | Yes. JobSentinel is MIT licensed and free forever. |
| Current release | `v2.6.4` with Windows, macOS, and Linux installers. |

## Reader Map

| Reader | Start here | You should quickly learn |
| ------ | ---------- | ------------------------ |
| Job seeker | [Download and first run](#download-and-first-run), then [Quick start](docs/user/QUICK_START.md) | How to start without technical setup. |
| Grant or research reviewer | [Research model](#research-model), [Roadmap](ROADMAP.md), and [references](#references-and-external-sources) | What is evidence-backed and how real user data is protected. |
| Privacy or security reviewer | [Safety model](#safety-model), [PRIVACY.md](PRIVACY.md), and [RESPONSIBLE_AI.md](RESPONSIBLE_AI.md) | What can leave the device and which review gates are mandatory. |
| Contributor | [Architecture](#architecture), [development](#development-and-verification), and [contributing](docs/developer/CONTRIBUTING.md) | How the app is structured, tested, and governed. |
| Person reporting a problem | Save the in-app safe support report first; use Send Feedback if you want replies | How to keep useful app details local unless you choose to share them. |

## What JobSentinel Does

| Job-seeker problem | Product response | Evidence or boundary |
| ------------------ | ---------------- | -------------------- |
| Stale, reposted, or unverifiable roles waste tailoring time | Ghost-job detection, first-seen and last-seen tracking, repost context, source health, and official-source job monitoring | [Ghost-job research](docs/research/ghost-jobs.md), [ghost detection](docs/features/ghost-detection.md) |
| Pay opacity can lead to underpaid work | Salary floors, salary transparency checks, compensation range review, lower-title or lower-pay cues, and negotiation prep | [Pay-equity research](docs/research/pay-equity.md), [salary negotiation](docs/research/salary-negotiation.md) |
| Screening systems are opaque | Hiring-system transparency, candidate-side explainability, and application readability review | [screening-system research](docs/research/ats-transparency.md), [Responsible AI](RESPONSIBLE_AI.md) |
| Long searches erode confidence and time | Fresh-role focus, pacing, weekly summaries, and gap-framing work are tracked as product requirements | [Roadmap](ROADMAP.md), [research-backed plan](docs/plans/active/research-backed-product-improvements.md) |
| Opaque channels can trap effort | Bias-aware strategy favors direct sources, official postings, recruiter context, referral routes, and verifiable signals | [Research model](#research-model), [job-source docs](docs/research/job-site-data-sources.md) |
| Support can expose private data | Safe support reports can be saved locally and shared only when the user chooses | [Privacy](PRIVACY.md), [docs index](docs/README.md) |

JobSentinel keeps applications under user review. It does not prioritize
application volume, deceptive resume changes, source-boundary evasion, or hidden
data sharing.

## Download and First Run

Download the latest installer from the
[latest download page](https://github.com/cboyd0319/JobSentinel/releases/latest).

| Platform | Installer |
| -------- | --------- |
| Windows | Windows installer |
| macOS | Mac installer for Apple silicon and Intel Macs |
| Linux | Linux installer |

The current `v2.6.4` release includes Windows, macOS, and Linux installers.
Most people should use the installer. Contributors can use the
[development setup guide](docs/developer/GETTING_STARTED.md).

First run is designed for zero technical knowledge:

1. Pick a career path or choose your own search.
2. Add job titles.
3. Add skills or work you want more of.
4. Add work to avoid, if anything comes to mind.
5. Choose remote, hybrid, onsite, or any mix.
6. Choose where to get alerts.
7. Review the search before JobSentinel checks selected sources.

After setup, JobSentinel checks your selected sources. You can change every
setting later.

<details>
<summary><strong>Installer security prompts</strong></summary>
<br>

macOS may show this message because JobSentinel is a new open-source app:

```text
JobSentinel can't be opened because Apple cannot check it for malicious software.
```

Continue only if you downloaded JobSentinel from the latest download page linked
above and expected this file. If you are not sure, stop, delete the download,
and download it again from that page.

After checking the download, open **System Settings**, go to **Privacy &
Security**, click **Open Anyway** next to the JobSentinel message, then click
**Open**.

Windows may show this message because JobSentinel is a new app:

```text
Windows protected your PC
```

Continue only if you downloaded JobSentinel from the latest download page linked
above and expected this file. If you are not sure, stop, delete the download,
and download it again from that page.

After checking the download, click **More info**, then click **Run anyway**.

</details>

## Safety Model

Privacy and security are release blockers, not preferences. No account is
required. JobSentinel stores search data locally and only sends data outside the
app for enabled job-source checks, job sources or career pages the user approves
for checking, channels the user turns on, support links the user opens,
optional location detection after a click, or approved external AI requests.

| Principle | Repository commitment |
| --------- | --------------------- |
| Rule 0 | Privacy and security cannot be set aside for convenience, automation, support, research, or speed. |
| Local-first | Jobs, searches, resumes, notes, salary floors, applications, and reports stay on the user's device by default. |
| No telemetry | JobSentinel does not collect analytics or behavioral telemetry. |
| Optional external channels | Alert channels work only after the user turns them on; GitHub and Google Drive support links open only when the user chooses them. |
| Optional external AI | Provider calls need opt-in, minimization, preview, approval, redaction or cancellation, and local request logging. |
| Candidate-side framing | Explanations help the job seeker understand fit, source risk, pay transparency, and readability. |
| Protective tone | The app surfaces warnings, tradeoffs, and next safe actions instead of hollow motivation. |
| Free forever | JobSentinel stays MIT licensed and free for reuse, forks, and contribution. |

External AI support must go through the documented
[privacy-first AI gateway](docs/architecture/privacy-first-ai-gateway.md). AI
can help summarize public job posts, explain fit, explain stale-posting risk,
check salary transparency, and prepare compensation questions. It must not
submit applications, fabricate qualifications, hide keywords, add resume prompt
injection, manipulate employer screening systems, solve CAPTCHAs, collect private candidate
data for research, infer protected characteristics, or send full local database
dumps.

## Research Model

JobSentinel is evidence-backed, but user activity is not research data.
Product direction is driven by public research, public job postings, synthetic
candidate profiles, and explicit limitations. Real user data is not research
data without informed consent.

| Research pillar | Product commitment | Evaluation question |
| --------------- | ------------------ | ------------------- |
| Ghost-job and stale-posting detection | Prioritize fresh, verifiable roles and warn before a user spends time tailoring weak postings. | Does JobSentinel reduce time spent on stale or low-trust roles without hiding useful options? |
| Pay equity and salary-floor protection | Treat salary floors, pay transparency, lower-title or lower-pay risk, and compensation prep as core search features. | Does JobSentinel help users avoid underpaid opportunities and preserve compensation goals? |
| Long-term unemployment support | Support pacing, fresh-role focus, weekly summaries, and gap framing without shame or pressure. | Does JobSentinel reduce fatigue and improve search control for people in long searches? |
| Bias-aware application strategy | Favor direct sources, official hiring-platform postings, recruiter context, referral routes, and verifiable signals over opaque channels. | Does JobSentinel shift effort toward channels with better evidence and clearer next steps? |
| Protective UX | Use practical warnings and next actions instead of hollow motivation. | Does JobSentinel protect time, confidence, and dignity under rejection-heavy conditions? |
| Privacy-first local control | Keep sensitive job-search data local by default and make every external path explicit, inspectable, and cancellable. | Does JobSentinel preserve user control when optional integrations are enabled? |

| Evaluation area | Default data | Boundary |
| --------------- | ------------ | -------- |
| Job-posting analysis | Public official postings, public hiring-platform postings, source fixtures | No private user search history |
| Candidate modeling | Synthetic resumes, synthetic salary floors, synthetic candidate profiles | No real resume, notes, or salary floor unless explicit informed consent exists |
| Posting-risk tests | Synthetic suspicious, stale, scam-like, or adversarial postings | No accusation of employer intent from weak evidence |
| UX and support tests | Local fixtures, screenshots, safe support report fixtures | No raw local database uploads |
| Research outputs | Methodology notes, evaluation limits, responsible-use guidance | No demographic-linked real-user outcomes without informed consent |

Research notes live in [docs/research](docs/research/README.md). Product
direction lives in [ROADMAP.md](ROADMAP.md) and active plans under
[docs/plans](docs/plans/README.md). The README design standard and source pool
live in [docs/harness/readme-information-design.md](docs/harness/readme-information-design.md).

## Architecture

JobSentinel is a desktop application, not a hosted job-search service.

```text
React 19 + TypeScript UI
  -> Tauri command boundary
  -> Rust 2021 services
  -> local SQLite database
  -> job-source checks and optional channels the user turns on
```

| Boundary | Rule |
| -------- | ---- |
| Renderer to backend | UI calls typed Tauri commands and handles errors with user-safe messages. |
| Storage | SQLite stores search state, saved jobs, notes, applications, and local reports. |
| Secrets | Alert connection details, email credentials, and USAJobs access codes use the OS credential store. |
| Job-source checks | Source checks use bounded requests, source-specific limits, and shared retry helpers. |
| External alerts | Slack, Discord, Teams, Telegram, and email work only after the user turns them on. |
| Support sharing | GitHub issue pages and Google Drive support links open only when the user chooses them. |
| External AI | All provider calls must go through the AI gateway. Scattered provider calls are not allowed. |
| Research mode | Public postings and synthetic candidate profiles are the default evaluation data. |

Architecture and maintenance docs:

- [Developer architecture](docs/developer/ARCHITECTURE.md)
- [Privacy-first AI gateway](docs/architecture/privacy-first-ai-gateway.md)
- [Security docs](docs/security/README.md)
- [Harness engineering](docs/harness/README.md)
- [README information design](docs/harness/readme-information-design.md)

## Interface Overview

<p align="center">
  <img src="docs/images/application-tracking.png" alt="Application tracking board" width="800">
  <br>
  <em>Track applications from saved to offer, with notes and follow-up reminders.</em>
</p>

<details>
<summary><strong>More screenshots</strong></summary>
<br>

| Resume builder | Resume matcher |
| -------------- | -------------- |
| ![Resume builder](docs/images/resume-builder.png) | ![Resume matcher](docs/images/resume-matcher.png) |

| Hiring-system transparency | Application Assist |
| ---------------- | ------------------ |
| ![Hiring-system transparency](docs/images/ats-optimizer.png) | ![Application Assist](docs/images/one-click-apply.png) |

| Pay Protection | Hiring Trends |
| -------------- | ------------- |
| ![Pay Protection](docs/images/salary-ai.png) | ![Hiring Trends](docs/images/market-intelligence.png) |

| Settings |
| -------- |
| ![Settings](docs/images/settings.png) |

</details>

---

## Data Boundaries

JobSentinel is local-first. The app runs on your computer and does not depend on
a hosted JobSentinel service.

| Data or action | Where it lives |
| -------------- | -------------- |
| Search settings, saved jobs, notes, and applications | Saved on your computer |
| Slack, Discord, Teams, email, Telegram, and USAJobs secrets | Your computer's password store |
| Desktop notifications | Your computer |
| External alerts | Only the channels you configure |
| Enabled job-source checks | Public job-source services or user-approved job sources and career pages; selected search details only |
| Support sharing links | Help links open only when you choose them |
| Optional location detection | FreeIPAPI HTTPS lookup only after you click **Detect location**; cached for the session |
| Optional external AI | Disabled by default; every request needs opt-in, preview, approval, minimization, and local request logging |
| Telemetry and analytics | Not collected |

Credentials use platform storage:

- **Windows:** Windows Credential Manager
- **macOS:** Keychain
- **Linux:** Secret Service, such as GNOME Keyring or KWallet

JobSentinel keeps each application under your review, never clicks Submit for
you, and does not send your profile data to an external service unless you
explicitly configure that flow.
Optional location detection is separate: it contacts FreeIPAPI over HTTPS with
your public IP only after you request detection, and it saves a city only if you
choose to add it.

Learn more in [secure credential storage](docs/security/KEYRING.md) and the
[security docs](docs/security/README.md).

## Source Coverage

JobSentinel can check 12 job sources on a schedule, with clear source limits,
duplicate handling, health checks, and bounded website reads. The health system
also has 15 source-health checks. LinkedIn is a user-opened search-link
destination, not a scheduled source.

| Category | Sources |
| -------- | ------- |
| Hiring-platform feeds | Greenhouse, Lever |
| General and tech job sites | Dice, Glassdoor, SimplyHired |
| Remote and startup job sites | RemoteOK, WeWorkRemotely, BuiltIn, YC Startup Jobs |
| Community and official feeds | HN Who's Hiring, JobsWithGPT, USAJobs |
| User-opened search links | LinkedIn and other job-site destinations opened by the user |

Some monitored sources have optional setup. USAJobs can use an access code for
scheduled checks, but users can open USAJobs through job-site search links
without setup. JobSentinel reports source health so you can see when a source is
healthy, degraded, or blocked. Source collection is scoped to a single user's
local search, follows source-specific boundaries, and favors public
hiring-platform feeds or official company sources when available. Large
platforms with restricted
automation policies should be opened by the user through search links.

Read the full [job source guide](docs/features/scrapers.md) and
[job source health docs](docs/features/scraper-health.md).

---

## Scope and Limitations

JobSentinel is a job-search assistant, not an employer-side hiring system, a
legal adviser, a compensation authority, or a hosted data platform.

| Area | Boundary |
| ---- | -------- |
| Posting risk | Warning signs come from visible evidence, not proof of employer intent |
| Salary guidance | Pay support is evidence-bounded and avoids legal claims unless current jurisdiction rules are verified |
| Resume help | Suggestions must preserve truthful application readability and user-confirmed experience |
| Application Assist | The user remains responsible for review and final submission |
| External AI | AI output is advisory and must pass through opt-in, preview, redaction, approval, and local logging |
| Research evaluation | Public job postings and synthetic candidate profiles are the default evaluation data |

See [RESPONSIBLE_AI.md](RESPONSIBLE_AI.md), [PRIVACY.md](PRIVACY.md), and
[docs/research/README.md](docs/research/README.md) for the full boundaries.

---

## Build From Source

You need:

- Node.js 20; `.nvmrc` pins the repo baseline
- Rust from [rustup.rs](https://rustup.rs); `rust-toolchain.toml` pins stable
- Platform dependencies listed in the
  [developer setup guide](docs/developer/GETTING_STARTED.md)

Build:

```bash
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel
npm install
npm run tauri:build
```

Installer output:

| Platform | Output path |
| -------- | ----------- |
| Windows | `src-tauri/target/release/bundle/msi/` |
| macOS | `src-tauri/target/release/bundle/dmg/` |
| Linux | `src-tauri/target/release/bundle/appimage/` and `src-tauri/target/release/bundle/deb/` |

---

## Keyboard Shortcuts

| Key | Action |
| --- | ------ |
| <kbd>j</kbd> / <kbd>k</kbd> | Move through the job list |
| <kbd>o</kbd> | Open the selected job |
| <kbd>b</kbd> | Bookmark a job |
| <kbd>h</kbd> | Hide a job |
| <kbd>n</kbd> | Add a note |
| <kbd>/</kbd> | Focus search |
| <kbd>?</kbd> | Show all shortcuts |
| <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>1</kbd> to <kbd>8</kbd> | Switch pages |

---

## Development and Verification

JobSentinel is built as a Tauri desktop app.

| Layer | Stack |
| ----- | ----- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Rust 2021, Tauri 2, Tokio |
| Storage | SQLite with SQLx offline mode |
| Tests | Vitest, Playwright, Rust tests, docs harness checks |

Current backend surface: **197 registered Tauri commands**.

Common checks:

```bash
npm run harness:check
npm run lint:bloat
npm run lint:tests
npm run lint:docs
npm run lint
npm run test:run
npm run test:e2e:smoke
npm run build
cd src-tauri && cargo fmt --all -- --check
cd src-tauri && cargo clippy -- -D warnings
cd src-tauri && cargo test --lib
```

Full release verification also includes `npm run test:e2e:all` and the full
Rust test suite. Local `npm run test:e2e` runs the faster Chromium functional
suite; `npm run test:e2e:smoke` is the routine fast browser gate; documentation
screenshots are refreshed separately with `npm run docs:screenshots`.

Quality guardrails:

- `npm run harness:check` keeps agent-facing docs, plan lifecycle rules, and
  version-linked front-door claims in sync.
- `npm run lint:bloat` blocks disposable artifacts, stale docs patterns, weak
  test shortcuts, and recurring junk classes found during cleanup.
- `npm run lint:tests` rejects focused tests, runtime skips, and weak E2E
  assertions before they can hide regressions.
- Use focused Playwright projects first for browser-specific changes. Run
  `npm run test:e2e:all` when release risk or cross-browser behavior warrants
  the full browser matrix.
- Use `npm run test:e2e:last-failed` after a failed Playwright run instead of
  rerunning the whole matrix while debugging.

Developer docs:

- [Harness engineering](docs/harness/README.md)
- [Developer setup](docs/developer/GETTING_STARTED.md)
- [Architecture](docs/developer/ARCHITECTURE.md)
- [Testing guide](docs/developer/TESTING.md)
- [Contributing](docs/developer/CONTRIBUTING.md)
- [Roadmap](ROADMAP.md)

---

## Release Notes

### Current Release: v2.6.4

- Windows `.msi`, universal macOS `.dmg`, Linux `.AppImage`, and Linux `.deb`
  release assets are available.
- Settings no longer spins forever on first load.
- Jobs with missing salary or scoring data no longer show `NaN`.
- Bulk bookmark and hide actions keep working when one job has an error.
- Tests were expanded across settings, scoring edge cases, and bulk actions.
- Transitive dependency security updates were applied.

### In Main for the Next Release

- Safe support reports can be copied or saved from settings, error
  logs, and crash recovery surfaces.
- Direct npm, Cargo, and GitHub Actions dependencies were refreshed to latest
  stable versions; narrower Dependabot PRs are superseded by the mainline
  refresh.
- Playwright smoke and full-browser test commands are faster and support
  `npm run test:e2e:last-failed` for quick failure loops.
- LinkedIn is now user-opened search links only; scheduled checks and new
  session credential storage are disabled by source policy.

### Tracked Next

- Continued zero-technical-knowledge UX review.
- Continued broad-audience review for technical and non-technical roles.
- Local matching improvements.

Read [docs/README.md](docs/README.md), [CHANGELOG.md](CHANGELOG.md),
[ROADMAP.md](ROADMAP.md), and the [developer roadmap](docs/ROADMAP.md) for more
release detail.

---

## FAQ

<details>
<summary><strong>Is JobSentinel free?</strong></summary>
<br>

Yes. JobSentinel is open source under the MIT license.

JobSentinel is free, will always stay free, and will always remain MIT
licensed. This project exists to help job seekers, not to lock them into a paid
service.

</details>

<details>
<summary><strong>Do I need an account?</strong></summary>
<br>

No. JobSentinel does not require a hosted account or cloud sync.

</details>

<details>
<summary><strong>What data does JobSentinel collect?</strong></summary>
<br>

JobSentinel does not collect telemetry or analytics. Your job data is stored on
your computer. External alerts only send data to channels you configure.

</details>

<details>
<summary><strong>Can I use JobSentinel for non-tech jobs?</strong></summary>
<br>

Yes. JobSentinel is designed for technical and non-technical roles. You can
change job titles, search words, locations, and source settings for your search.

</details>

<details>
<summary><strong>What is a ghost job?</strong></summary>
<br>

A ghost job is a posting that may be stale, already filled, repeatedly reposted,
or posted mainly to collect resumes. JobSentinel flags these so you can decide
whether the role is worth your time.

</details>

<details>
<summary><strong>Does Application Assist submit applications for me?</strong></summary>
<br>

No. JobSentinel can prepare supported forms, but you review the form and click
Submit yourself.

</details>

<details>
<summary><strong>Where is my data stored?</strong></summary>
<br>

JobSentinel stores app data in the standard app-data location for your platform.
See [quick start](docs/user/QUICK_START.md#wheres-my-data) for exact paths.

</details>

---

## Support and Community

For job seekers, the easiest support path starts inside JobSentinel:

1. Open **Settings**.
2. Choose **Save Safe Support Report** or **Copy Safe Support Report**.
3. Choose **Send Feedback** if you want a report that can receive replies.
4. Share the safe support report only if you want help.

GitHub is optional. If you already use it, you can
[open the project help page](https://github.com/cboyd0319/JobSentinel/issues/new)
or start a [discussion](https://github.com/cboyd0319/JobSentinel/discussions).
Anyone who wants to contribute can read the
[contributing guide](docs/developer/CONTRIBUTING.md).

Want to build something better? Fork the code, adapt it, and use it to help
more people. That is part of the point.

---

<div align="center">

**JobSentinel helps job seekers focus on real, relevant, fairly compensated work
without surrendering private search data.**

[Download](#download-and-first-run)

<br>

<sub>Open source. Local-first. Built for job seekers who value privacy.</sub>

</div>

---

## References and external sources

This index collects external sources referenced across the main docs, research
notes, and active or completed plans. Security test payloads, placeholder URLs,
and fake example links are intentionally excluded.

### Job-Seeker Research

- [Why Don't Jobseekers Search More?](https://docs.iza.org/dp17520.pdf)
- [Duration Dependence and Job Search over the Spell](https://docs.iza.org/dp16781.pdf)
- [Duration Dependence and Job Search over the Spell: Evidence from Job Seeker Activity Reports](https://arxiv.org/abs/2511.03377)
- [The Accuracy of Job Seekers' Wage Expectations](https://docs.iza.org/dp17198.pdf)
- [Jobseekers' Skills and Job Search Behaviour](https://pmc.ncbi.nlm.nih.gov/articles/PMC12537773/)
- [Jobseekers' Skills and Job Search Behaviour, journal page](https://link.springer.com/article/10.1186/s41937-025-00142-9)
- [Job Search with Commuting and Unemployment Insurance](https://www.sciencedirect.com/science/article/pii/S0927537124000320)
- [Competitive Job Seekers: When Sharing Less Leaves Firms at a Loss](https://www.nber.org/system/files/working_papers/w32171/revisions/w32171.rev0.pdf)
- [Online Buddies for Job Seekers: A Field Experiment](https://docs.iza.org/dp18437.pdf)
- [The Cyclicality of On-the-Job Search](https://www.sciencedirect.com/science/article/pii/S0927537124000137)
- [Minimum Wage Laws and Low-Skilled Job Search](https://www.nber.org/system/files/working_papers/w33433/w33433.pdf)
- [JobHop: A Large-Scale Dataset of Career Trajectories](https://arxiv.org/abs/2505.07653)
- [Feedback, Confidence and Job Search Behavior](https://docs.iza.org/dp17761.pdf)
- [Application Flows](https://www.nber.org/system/files/working_papers/w32320/w32320.pdf)
- [Words Matter: Experimental Evidence from Job Applications](https://www.sciencedirect.com/science/article/abs/pii/S0167268124002312)
- [Employ 2025 Job Seeker Nation Report](https://www.employinc.com/resources/2025-job-seeker-nation-report/)
- [Greenhouse 2024 State of Job Hunting Report](https://www.greenhouse.com/blog/greenhouse-2024-state-of-job-hunting-report)
- [Indeed Hiring Lab AI-role search behavior](https://www.hiringlab.org/2026/04/28/job-seeker-searches-for-ai-roles-have-grown/)

### Automated Hiring, Resume Screening, and Candidate-Side Explainability

- [Navigating Automated Hiring: Perceptions, Strategy Use, and Outcomes Among Young Job Seekers](https://arxiv.org/abs/2502.05099)
- [Navigating Automated Hiring: Perceptions, Strategy Use, and Worker Orientations toward Automated Employment Decision Tools](https://dl.acm.org/doi/10.1145/3711038)
- [AI-Mediated Hiring and the Job Search of Blind and Low-Vision Individuals](https://arxiv.org/abs/2601.11884)
- [Let's Get You Hired: A Job Seeker's Perspective on Multi-Agent Recruitment Systems for Explaining Hiring Decisions](https://arxiv.org/abs/2505.20312)
- [Building Job Seekers' Profiles: Can LLMs Level the Playing Field?](https://ceur-ws.org/Vol-3908/paper_26.pdf)
- [Generative Job Recommendations with Large Language Model](https://arxiv.org/abs/2307.02157)
- [JobMatchAI: An Intelligent Job Matching Platform Using Knowledge Graphs, Semantic Search and Explainable AI](https://arxiv.org/abs/2603.14558)
- [AI Self-preferencing in Algorithmic Hiring](https://arxiv.org/abs/2509.00462)
- [Measuring Validity in LLM-based Resume Screening](https://arxiv.org/abs/2602.18550)
- [Understanding and Defending Against Resume-Based Prompt Injection Attacks on LLM-Based Hiring Systems](https://ceur-ws.org/Vol-4046/RecSysHR2025-paper_9.pdf)
- [AI Security Beyond Core Domains: Resume Screening as a Case Study](https://arxiv.org/abs/2512.20164)
- [AI Hiring with LLMs: A Context-Aware and Explainable Multi-Agent Framework](https://arxiv.org/abs/2504.02870)
- [AutoScreen-FW: An LLM-based Framework for Resume Screening](https://arxiv.org/abs/2603.18390)
- [Smart-Hiring: An Explainable End-to-End Pipeline for CV Information Extraction and Job Matching](https://arxiv.org/abs/2511.02537)
- [PopResume: Causal Fairness Evaluation of LLM/VLM Resume Screeners](https://arxiv.org/abs/2603.22714)
- [Resume2Vec: Transforming Applicant Tracking Systems with Semantic Matching](https://www.mdpi.com/2079-9292/14/4/794)
- [Hidden Workers: Untapped Talent](https://www.hbs.edu/managing-the-future-of-work/Documents/research/hiddenworkers09032021.pdf)
- [Help Wanted: An Exploration of Hiring Algorithms, Equity and Bias](https://www.upturn.org/static/reports/2018/hiring-algorithms/files/Upturn%20--%20Help%20Wanted%20-%20An%20Exploration%20of%20Hiring%20Algorithms%2C%20Equity%20and%20Bias.pdf)
- [Networked Employment Discrimination](https://www.datasociety.net/pubs/fow/EmploymentDiscrimination.pdf)
- [Fairness, AI and Recruitment](https://www.sciencedirect.com/science/article/pii/S0267364924000335)
- [Fairness and Bias in Algorithmic Hiring](https://dl.acm.org/doi/full/10.1145/3696457)
- [Local Law 144: A Critical Analysis of Regression Metrics](https://arxiv.org/abs/2302.04119)
- [What We Learned While Automating Bias Detection in AI Hiring Systems](https://arxiv.org/abs/2501.10371)

### Ghost Jobs, Job Scams, and Posting Reliability

- [Ghost Jobs, Columbia Law Review Forum PDF](https://www.columbialawreview.org/wp-content/uploads/2025/11/November-2025-Forum-Grimm.pdf)
- [Ghost Jobs, Columbia Law Review page](https://columbialawreview.org/content/ghost-jobs/)
- [Why is it so hard to find a job now? Enter Ghost Jobs](https://arxiv.org/abs/2410.21771)
- [Wall Street Journal reporting on ghost jobs](https://www.wsj.com/lifestyle/careers/ghost-jobs-2c0dcd4e)
- [ResumeBuilder.com fake job listing survey](https://www.resumebuilder.com/3-in-10-companies-currently-have-fake-job-posting-listed/)
- [Clarify Capital Ghost Jobs](https://clarifycapital.com/ghost-jobs)
- [Clarify Capital job seeker ghost-job survey](https://clarifycapital.com/job-seekers-beware-of-ghost-jobs-survey)
- [FTC job scam guidance](https://consumer.ftc.gov/articles/job-scams)
- [Guardian reporting on ghost jobs](https://www.theguardian.com/money/2024/oct/30/ghost-jobs-why-do-40-of-companies-advertise-positions-that-dont-exist)
- [Bloomberg Law on state job-ad bills](https://news.bloomberglaw.com/daily-labor-report/state-job-ad-bills-shift-from-pay-ranges-to-ghost-jobs-ai-use)
- [Business Insider reporting on hiring slowdowns and ghost jobs](https://www.businessinsider.com/hiring-slowdown-companies-take-longer-fill-open-roles-ghost-jobs-2025-5)
- [Fraudulent job-posting detection research](https://arxiv.org/abs/2304.02019)

### Pay Equity, Salary Transparency, and Negotiation

- [Pay Transparency and the Gender Gap](https://arxiv.org/abs/2006.16099)
- [US Salary History Bans](https://arxiv.org/abs/2202.03602)
- [Asking an AI for salary negotiation advice is a matter of concern](https://arxiv.org/abs/2409.15567)
- [Macroeconomics of Racial Disparities](https://arxiv.org/abs/2412.00615)
- [Monetary policy and the racial wage gap](https://arxiv.org/abs/2203.03565)
- [Do Women Avoid Salary Negotiations?](https://gap.hks.harvard.edu/do-women-avoid-salary-negotiations-evidence-large-scale-natural-field-experiment)
- [Social Incentives for Gender Differences in Negotiation](https://gap.hks.harvard.edu/social-incentives-gender-differences-propensity-initiate-negotiations-sometimes-it-does-hurt-ask)
- [Program on Negotiation: In Salary Negotiations, Women Do Ask](https://www.pon.harvard.edu/daily/salary-negotiations/in-salary-negotiations-women-do-ask/)
- [Program on Negotiation: Counteracting racial and gender bias](https://www.pon.harvard.edu/daily/leadership-skills-daily/counteracting-racial-and-gender-bias-in-job-negotiations-nb/)
- [HBR: Women ask for raises as often as men](https://hbr.org/2018/06/research-women-ask-for-raises-as-often-as-men-but-are-less-likely-to-get-them)
- [Harvard Business School: Salary Negotiations, a Catch-22 for Women](https://www.library.hbs.edu/working-knowledge/salary-negotiations-a-catch-22-for-women)
- [Why Do Women Ask for Less?](https://www.sciencedirect.com/science/article/pii/S0927537122000951)
- [Bargaining while Black: The role of race in salary negotiations](https://pubmed.ncbi.nlm.nih.gov/30335407/)
- [Exploring the Role of Gender and Race in Salary Negotiation](https://repository.lsu.edu/cgi/viewcontent.cgi?article=5986&context=gradschool_theses)
- [Wage negotiations and strategic responses to transparency](https://www.sciencedirect.com/science/article/pii/S0167268123000653)
- [PsycNet salary negotiation reference from PON PDF](https://psycnet.apa.org/record/2006-08981-013)
- [ScienceDirect salary negotiation reference from PON PDF](https://www.sciencedirect.com/science/article/abs/pii/S0749597806000884)
- [Academy of Management Discoveries salary negotiation reference](https://journals.aom.org/doi/10.5465/amd.2022.0021)
- [Springer salary negotiation reference from PON PDF](https://link.springer.com/chapter/10.1007/978-3-030-75645-1_17)
- [PON: Ask a Negotiation Expert to Narrow the Wage Gap](https://www.pon.harvard.edu/daily/salary-negotiations/ask-a-negotiation-expert-to-narrow-the-wage-gap-take-a-wider-view-nb/)
- [PON: Negotiating a Salary When Compensation Is Public](https://www.pon.harvard.edu/daily/salary-negotiations/negotiating-a-salary-when-compensation-is-public/)
- [PON: Salary Negotiations, a Lesson from Meryl Streep](https://www.pon.harvard.edu/daily/salary-negotiations/salary-negotiations-a-lesson-from-meryl-streep/)
- [PON: Backlash Effect for Women Negotiators](https://www.pon.harvard.edu/daily/salary-negotiations/the-backlash-effect-for-women-negotiators-in-hollywood-and-beyond-nb/)
- [PON: Salary Negotiation Skills Different for Men and Women](https://www.pon.harvard.edu/daily/salary-negotiations/salary-negotiation-skills-different-for-men-and-women/)
- [Program on Negotiation salary-negotiations category](https://www.pon.harvard.edu/category/daily/salary-negotiations/)
- [Program on Negotiation staff author page](https://www.pon.harvard.edu/author/pon_staff/)
- [Program on Negotiation blog](https://www.pon.harvard.edu/blog/)
- [Program on Negotiation events](https://www.pon.harvard.edu/events/)
- [Program on Negotiation executive education](https://www.pon.harvard.edu/executive-education/)
- [Program on Negotiation faculty and research](https://www.pon.harvard.edu/faculty-and-research/)
- [Program on Negotiation teaching materials and publications](https://www.pon.harvard.edu/teaching-materials-publications/)
- [Program on Negotiation combined program](http://www.pon.harvard.edu/courses-and-training/3-day/special-three-day-combined-program/)
- [Vanderbilt: Stop blaming women for the gender pay gap](https://business.vanderbilt.edu/news/2023/09/05/stop-blaming-women-for-the-gender-pay-gap/)
- [UC Berkeley research on pay-gap myths](https://vcresearch.berkeley.edu/news/new-research-shatters-outdated-pay-gap-myth-women-dont-negotiate)
- [Role of race in salary negotiations](https://www.colorado.edu/business/faculty-research/2020/04/29/role-race-salary-negotiations)
- [Negotiating the wage gap and race](https://icccr.tc.columbia.edu/blog/negotiating-the-wage-gap-the-role-of-race-in-salary-negotiations/)
- [APA salary negotiation paper](https://www.apa.org/pubs/journals/releases/apl-apl0000363.pdf)
- [NBER summary on salary negotiation](https://www.nber.org/digest/apr13/do-women-avoid-salary-negotiations)
- [IWPR pay equity policy compilation](https://iwpr.org/wp-content/uploads/2022/01/Equal-Pay-Policies-and-the-Gender-Wage-Gap_Compilation_20220125_FINAL.pdf)
- [NWLC pay range transparency factsheet](https://nwlc.org/wp-content/uploads/2023/01/NWLC-Pay-Range-Transparency-Factsheet_2023-1.pdf)
- [NWLC wage gap for Black women](https://nwlc.org/resource/wage-gap-state-black-women/)
- [NWLC state-by-state Black women wage gap](https://nwlc.org/wp-content/uploads/2024/03/Wage-Gap-State-by-State-Black-Women-2.12.2025.pdf)
- [Urban Institute pay inequities among Black women](https://www.urban.org/sites/default/files/2022-12/Pay%20Inequities%20among%20Black%20Women.pdf)
- [Center for American Progress on women of color and the wage gap](https://www.americanprogress.org/article/women-of-color-and-the-wage-gap/)
- [Economic Policy Institute on Black-white labor-market disparities](https://www.epi.org/unequalpower/publications/understanding-black-white-disparities-in-labor-market-outcomes/)
- [Pew Research Center gender pay gap overview](https://www.pewresearch.org/short-reads/2025/03/04/gender-pay-gap-in-us-has-narrowed-slightly-over-2-decades/)
- [Pew Research Center enduring grip of the gender pay gap](https://www.pewresearch.org/social-trends/2023/03/01/the-enduring-grip-of-the-gender-pay-gap/)
- [Pew Research Center gender pay gap facts](https://www.pewresearch.org/short-reads/2023/03/01/gender-pay-gap-facts/)
- [Pew Research Center gender pay gap facts, parenthood note](https://www.pewresearch.org/short-reads/2023/03/01/gender-pay-gap-facts/#:~:text=Parents%20with%20children%20younger%20than,among%20both%20men%20and%20women)
- [Pew Research Center racial and gender wage gaps](https://www.pewresearch.org/short-reads/2016/07/01/racial-gender-wage-gaps-persist-in-u-s-despite-some-progress/)
- [SHRM on Black workers' earnings](https://www.shrm.org/topics-tools/news/benefits-compensation/black-workers-still-earn-less-white-counterparts)
- [Stateline on salary transparency laws](https://stateline.org/2024/07/10/more-states-enact-salary-transparency-laws-to-fight-gender-racial-pay-gaps/)
- [Guardian on salary-history questions](https://www.theguardian.com/society/2021/nov/18/campaigners-urge-bosses-to-stop-asking-job-applicants-for-salary-history)

### Job-Source Access, Robots Policy, and Web Governance

- [Common Crawl opt-out protocols](https://commoncrawl.org/blog/balancing-discovery-and-privacy-a-look-into-opt-out-protocols)
- [Common Crawl FAQ](https://commoncrawl.org/faq)
- [Robots Exclusion Protocol RFC 9309](https://datatracker.ietf.org/doc/html/rfc9309)
- [Google robots.txt specification](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)
- [Google robots introduction](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- [Web access for research: legal, ethical, institutional, and scientific considerations](https://arxiv.org/abs/2410.23432)
- [The Liabilities of Robots.txt](https://arxiv.org/abs/2503.06035)
- [Empirical study of robots.txt compliance](https://arxiv.org/abs/2505.21733)
- [Robots.txt gatekeeping study](https://arxiv.org/abs/2510.10315)
- [Putting GenAI on Notice](https://arxiv.org/abs/2504.00961)
- [Data consent mechanisms in web-sourced datasets](https://arxiv.org/abs/2511.08637)
- [LinkedIn prohibited software and extensions](https://www.linkedin.com/help/linkedin/answer/a1341387/prohibited-software-and-extensions)
- [LinkedIn user agreement](https://www.linkedin.com/legal/user-agreement)
- [Axios on Supreme Court LinkedIn data case](https://www.axios.com/2021/06/15/supreme-court-linkedin-data-scraper)
- [Ninth Circuit public-data access analysis](https://www.loeb.com/en/insights/publications/2022/05/ninth-circuit-provides-path-forward-for-web-scraping-of-public-data)
- [White & Case analysis of hiQ and CFAA](https://www.whitecase.com/insight-our-thinking/web-scraping-website-terms-and-cfaa-hiqs-preliminary-injunction-affirmed-again)
- [Web access legal landscape and practice tips](https://www.swlaw.com/publication/legal-landscape-of-web-scraping-and-practice-tips/)
- [Website terms and CFAA analysis](https://www.metaverselaw.com/hiq-v-linkedin-user-agreements-in-the-age-of-data-scraping/)
- [Indeed legal terms](https://www.indeed.com/legal)
- [Greenhouse job board API](https://developers.greenhouse.io/job-board.html)
- [Greenhouse board API template](https://boards-api.greenhouse.io/v1/boards/{company}/jobs)
- [Greenhouse API overview](https://support.greenhouse.io/hc/en-us/articles/10568627186203-Greenhouse-API-overview)
- [Lever postings API](https://github.com/lever/postings-api)
- [Lever developer docs](https://hire.lever.co/developer)
- [Lever API documentation](https://hire.lever.co/developer/documentation)
- [Ashby public job posting API](https://developers.ashbyhq.com/docs/public-job-posting-api)
- [Ashby job board embed examples](https://www.ashbyhq.com/job-board-embed-examples)
- [Workable developers](https://www.workable.com/developers)
- [Workable careers page API guide](https://help.workable.com/hc/en-us/articles/115012771647-Using-the-Workable-API-to-create-a-careers-page)
- [Workable API documentation](https://help.workable.com/hc/en-us/articles/115013356548-Workable-API-Documentation)
- [SmartRecruiters customer overview](https://developers.smartrecruiters.com/docs/customer-overview)
- [SmartRecruiters endpoints](https://developers.smartrecruiters.com/docs/endpoints)
- [SmartRecruiters posting API](https://developers.smartrecruiters.com/docs/posting-api)

### Platform, Product, and Data-Source References

- [Tauri](https://tauri.app/)
- [Tauri distribution guide](https://v2.tauri.app/distribute/)
- [Tauri security guide](https://v2.tauri.app/learn/security/)
- [Tauri Linux signing](https://tauri.app/distribute/sign/linux/)
- [React](https://react.dev/)
- [Rust](https://doc.rust-lang.org/)
- [rustup](https://rustup.rs)
- [Node.js](https://nodejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [USAJobs developer portal](https://developer.usajobs.gov/)
- [USAJobs data API](https://data.usajobs.gov)
- [USAJobs search API](https://data.usajobs.gov/api/Search)
- [USA Staffing support](https://help.usastaffing.gov/USAS/index.php?title=USA_Staffing_Support)
- [LinkedIn system status](https://www.linkedin.com/system-status)
- [Slack connection-link docs](https://api.slack.com/messaging/webhooks)
- [Discord connection-link docs](https://discord.com/developers/docs/resources/webhook)
- [Microsoft Teams connector-link docs](https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using)
- [Telegram BotFather](https://t.me/BotFather)

### Security, Privacy, and Reliability References

- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [OWASP command injection](https://owasp.org/www-community/attacks/Command_Injection)
- [OWASP unvalidated redirects cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)
- [CWE-22: Path Traversal](https://cwe.mitre.org/data/definitions/22.html)
- [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html)
- [MITRE CWE Top 25](https://cwe.mitre.org/top25/)
- [RFC 3986: URI Generic Syntax](https://www.rfc-editor.org/rfc/rfc3986)
- [ANSSI Rust secure coding guide](https://anssi-fr.github.io/rust-guide/)
- [Rust error handling](https://doc.rust-lang.org/book/ch09-00-error-handling.html)
- [Rust testing](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Rust integration tests](https://doc.rust-lang.org/book/ch11-03-test-organization.html#integration-tests)
- [Rust `std::process::Command`](https://doc.rust-lang.org/std/process/struct.Command.html)
- [SQLite documentation](https://www.sqlite.org/docs.html)
- [SQLite security](https://www.sqlite.org/security.html)
- [SQLite WAL](https://www.sqlite.org/wal.html)
- [SQLite PRAGMA docs](https://www.sqlite.org/pragma.html)
- [SQLite optimizer overview](https://www.sqlite.org/optoverview.html)
- [1Password security architecture background](https://blog.1password.com/1password-8-the-story-so-far/)

### Information Design References

- [GitHub Docs: About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
- [Google README guide](https://google.github.io/styleguide/docguide/READMEs.html)
- [Google documentation best practices](https://google.github.io/styleguide/docguide/best_practices.html)
- [Diataxis documentation framework](https://diataxis.fr/)
- [GOV.UK content design](https://www.gov.uk/guidance/content-design/what-is-content-design)
- [GOV.UK user needs](https://www.gov.uk/guidance/content-design/user-needs)
- [GOV.UK heading guidance](https://design-system.service.gov.uk/styles/headings/)
- [Digital.gov heading guidance](https://digital.gov/guides/plain-language/design/headings)
- [DHS plain language guidance](https://www.dhs.gov/digital-experience/plain-language)

### Harness Engineering References

- [Walking Labs, Lecture 02. What a Harness Actually Is](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-02-what-a-harness-actually-is/)
- [Walking Labs harness engineering skills](https://github.com/walkinglabs/learn-harness-engineering/tree/main/skills)
- [Walking Labs harness-creator skill](https://github.com/walkinglabs/learn-harness-engineering/tree/main/skills/harness-creator)
- [Walking Labs harness-creator scripts](https://github.com/walkinglabs/learn-harness-engineering/tree/main/skills/harness-creator/scripts)

### Engineering and Test References

- [Kubernetes repository README](https://github.com/kubernetes/kubernetes)
- [AlphaFold repository README](https://github.com/google-deepmind/alphafold)
- [TensorFlow repository README](https://github.com/tensorflow/tensorflow)
- [PyTorch repository README](https://github.com/pytorch/pytorch)
- [scikit-learn repository README](https://github.com/scikit-learn/scikit-learn)
- [OpenTelemetry Collector repository README](https://github.com/open-telemetry/opentelemetry-collector)
- [DuckDB repository README](https://github.com/duckdb/duckdb)
- [Transformers repository README](https://github.com/huggingface/transformers)
- [Apache Spark repository README](https://github.com/apache/spark)
- [Ray repository README](https://github.com/ray-project/ray)
- [Apache Airflow repository README](https://github.com/apache/airflow)
- [Rust repository README](https://github.com/rust-lang/rust)
- [Electron repository README](https://github.com/electron/electron)
- [Visual Studio Code repository README](https://github.com/microsoft/vscode)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Playwright](https://playwright.dev/)
- [Playwright intro](https://playwright.dev/docs/intro)
- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Common React Testing Library mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [SQLx testing notes](https://github.com/launchbadge/sqlx#testing)
- [Tokio testing](https://tokio.rs/tokio/topics/testing)
- [cargo-deny](https://embarkstudios.github.io/cargo-deny/)
- [cargo-geiger](https://github.com/rust-secure-code/cargo-geiger)
- [RustSec](https://github.com/rustsec/rustsec)
- [cargo-mutants](https://mutants.rs/)
- [Mutation testing overview](https://en.wikipedia.org/wiki/Mutation_testing)
- [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
- [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
- [SQLite Browser](https://sqlitebrowser.org/)
- [W3C accessibility evaluation guidance](https://www.w3.org/WAI/test-evaluate/)

### Machine-Learning and Resume-Data References

- [BERT paper](https://arxiv.org/abs/1810.04805)
- [Hugging Face Candle](https://github.com/huggingface/candle)
- [Candle documentation](https://huggingface.co/docs/candle)
- [Hugging Face Hub client](https://github.com/huggingface/hf-hub)
- [Sentence Transformers](https://www.sbert.net/)
- [all-MiniLM-L6-v2 model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [JSON Resume](https://jsonresume.org/)
- [JSON Resume getting started](https://jsonresume.org/getting-started/)
- [JSON Resume schema](https://jsonresume.org/schema/)
- [JSON Resume registry](https://registry.jsonresume.org/)

### Community and Project References

- [Contributor Covenant](https://www.contributor-covenant.org/)
- [Shields.io badges](https://shields.io/)
- [JobSentinel GitHub repository](https://github.com/cboyd0319/JobSentinel)
- [JobSentinel releases](https://github.com/cboyd0319/JobSentinel/releases)
- [JobSentinel discussions](https://github.com/cboyd0319/JobSentinel/discussions)
- [JobSentinel issue tracker](https://github.com/cboyd0319/JobSentinel/issues)
