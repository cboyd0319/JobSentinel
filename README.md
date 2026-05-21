<div align="center">

<img src="docs/images/logo.png" alt="JobSentinel logo" width="180">

# JobSentinel

**A friendly local assistant for finding better jobs without giving up your data.**

JobSentinel watches job boards for you, ranks new roles by fit, warns you about
stale postings, and keeps your search organized on your own computer.

<br>

<p align="center">
  <img src="https://img.shields.io/badge/Version-2.6.4-blue?style=for-the-badge" alt="Version 2.6.4">
  <img src="https://img.shields.io/badge/Windows-Ready-0078D6?style=for-the-badge" alt="Windows ready">
  <img src="https://img.shields.io/badge/macOS-Ready-000000?style=for-the-badge&logo=apple&logoColor=white" alt="macOS ready">
  <img src="https://img.shields.io/badge/Linux-Source_Build-FCC624?style=for-the-badge" alt="Linux source build">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Privacy-Local_First-0f766e?style=for-the-badge" alt="Local first privacy">
  <img src="https://img.shields.io/badge/Telemetry-None-1f2937?style=for-the-badge" alt="No telemetry">
  <img src="https://img.shields.io/badge/License-MIT-7c3aed?style=for-the-badge" alt="MIT license">
  <img src="https://img.shields.io/badge/Desktop-Tauri_2-2563eb?style=for-the-badge" alt="Tauri 2 desktop app">
</p>

[Get started](#get-started) | [See screenshots](#see-it-in-action) |
[Privacy model](#privacy-model) | [Developer setup](#build-from-source)

</div>

---

## What JobSentinel does

JobSentinel is a desktop app for people who want job-search help without a
cloud account, subscription, or tracking. You tell it what you want, and it
keeps checking for matching jobs in the background.

At a glance:

| You need | JobSentinel helps by |
| -------- | -------------------- |
| Find new roles faster | Checking 13 job sources every 2 hours by default |
| Avoid noisy listings | Ranking jobs by skills, salary, location, company, and freshness |
| Save promising jobs | Bookmarking, hiding, searching, and adding private notes |
| Know what to apply for | Flagging suspicious or stale postings before you spend time |
| Stay organized | Tracking applications, interviews, reminders, and follow-ups |
| Apply with less typing | Filling supported forms while you review and click Submit yourself |

No account is required. JobSentinel stores your search data locally and only
sends data outside the app when you configure a channel like Slack, Discord,
Teams, Telegram, email, or feedback through GitHub or Google Drive.

---

## How it works

1. **Set your search**

   Add job titles, locations, remote preferences, salary floor, and alert rules.

2. **Let JobSentinel scan**

   It checks supported job sources on a schedule. You can also run **Search Now**
   when you want a fresh scan.

3. **Review ranked matches**

   Jobs show up in one dashboard with match scores, source details, ghost-job
   warnings, and saved notes.

4. **Apply when ready**

   For supported application systems, JobSentinel can fill common fields. You
   still review the form, handle CAPTCHAs, upload files, and click Submit.

---

## See it in action

<p align="center">
  <img src="docs/images/dashboard.png" alt="JobSentinel dashboard" width="800">
  <br>
  <em>Dashboard with scored jobs, filters, source status, and dark mode.</em>
</p>

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

| ATS optimizer | One-click apply |
| ------------- | --------------- |
| ![ATS optimizer](docs/images/ats-optimizer.png) | ![One-click apply](docs/images/one-click-apply.png) |

| Salary AI | Market intelligence |
| --------- | ------------------- |
| ![Salary AI](docs/images/salary-ai.png) | ![Market intelligence](docs/images/market-intelligence.png) |

| Settings |
| -------- |
| ![Settings](docs/images/settings.png) |

</details>

---

## Privacy model

JobSentinel is local-first. That means the app runs on your computer and does
not depend on a hosted JobSentinel service.

| Data or action | Where it lives |
| -------------- | -------------- |
| Search settings, saved jobs, notes, and applications | Local SQLite storage |
| Slack, Discord, Teams, email, Telegram, USAJobs, and LinkedIn secrets | Your OS credential store |
| Desktop notifications | Your computer |
| External alerts | Only the channels you configure |
| Optional location detection | FreeIPAPI HTTPS lookup only after you click **Detect location**; cached for the session |
| Telemetry and analytics | Not collected |

Credentials use platform storage:

- **Windows:** Windows Credential Manager
- **macOS:** Keychain
- **Linux:** Secret Service, such as GNOME Keyring or KWallet

JobSentinel does not auto-submit applications, bypass CAPTCHAs, or send your
profile data to an external service unless you explicitly configure that flow.
Optional location detection is separate: it contacts FreeIPAPI over HTTPS with
your public IP only after you request detection, and it saves a city only if you
choose to add it.

Learn more in [secure credential storage](docs/security/KEYRING.md) and the
[security docs](docs/security/README.md).

---

## Job sources

JobSentinel supports 13 job sources with rate limits, deduplication, health
checks, and shared retry helpers for adapters that route requests through the
common scraper HTTP client.

| Category | Sources |
| -------- | ------- |
| ATS platforms | Greenhouse, Lever |
| General and tech boards | LinkedIn, Dice, Glassdoor, SimplyHired |
| Remote and startup boards | RemoteOK, WeWorkRemotely, BuiltIn, YC Startup Jobs |
| Community and specialized feeds | HN Who's Hiring, JobsWithGPT, USAJobs |

Some sources need setup. LinkedIn uses your own session cookie and stores it in
the OS keyring. USAJobs uses a free API key. JobSentinel reports scraper health
so you can see when a source is healthy, degraded, or blocked.

Read the full [scraper guide](docs/features/scrapers.md) and
[scraper health docs](docs/features/scraper-health.md).

---

## Main features

### Job matching

- Score each job against your skills, salary floor, location, company filters,
  and posting age.
- Use advanced search, saved searches, job notes, bookmarks, and hidden jobs.
- Flag likely ghost jobs so stale or suspicious postings do not dominate your
  list.

### Application tracking

- Use a Kanban-style board for saved, applied, interviewing, offer, and rejected
  stages.
- Track interviews, prep tasks, reminders, and follow-up notes.
- Review response rates and weekly progress without leaving the app.

### Resume tools

- Build resumes with ATS-friendly templates.
- Compare your resume with a job description and see missing keywords.
- Export resume documents when you are ready to apply.

### One-click apply

- Works with Greenhouse, Lever, Workday, Taleo, iCIMS, BambooHR, and Ashby.
- Fills contact fields and saved screening answers where possible.
- Keeps the final submit step manual by design.
- Pauses for CAPTCHAs and unusual fields instead of bypassing them.

### Salary and market insight

- Compare salary ranges against market data.
- Review negotiation notes and offer comparisons.
- See skill, location, and company trends from the Market Intelligence view.

### Notifications

- Use desktop notifications for local alerts.
- Configure Slack, Discord, Teams, Telegram, or email when you want external
  alerts.
- Filter alerts by score, keywords, company, salary, and job source.

---

## Get started

### Download

Download the latest installer from
[GitHub Releases](https://github.com/cboyd0319/JobSentinel/releases/latest).

| Platform | Installer |
| -------- | --------- |
| **Windows** | `.msi` |
| **macOS** | `.dmg` |
| **Linux** | Build from source today; release packaging is tracked in the roadmap |

If a release asset is not available yet, use the source build below.

<details>
<summary><strong>macOS Gatekeeper warning</strong></summary>
<br>

macOS may show this message because JobSentinel is a new open-source app:

```text
JobSentinel can't be opened because Apple cannot check it for malicious software.
```

To continue:

1. Open **System Settings**.
2. Go to **Privacy & Security**.
3. Click **Open Anyway** next to the JobSentinel message.
4. Click **Open** in the confirmation dialog.

</details>

<details>
<summary><strong>Windows SmartScreen warning</strong></summary>
<br>

Windows may show this message because JobSentinel is a new app:

```text
Windows protected your PC
```

To continue:

1. Click **More info**.
2. Click **Run anyway**.

</details>

### First run

The setup wizard asks four questions:

1. What job titles are you looking for?
2. Do you prefer remote, hybrid, onsite, or any mix?
3. What is your minimum salary?
4. Do you want alerts through desktop, Slack, Discord, Teams, Telegram, or email?

After setup, JobSentinel starts scanning. You can change every setting later.

### Build from source

You need:

- Node.js 20 or newer
- Rust from [rustup.rs](https://rustup.rs)
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
| Linux | `src-tauri/target/release/bundle/appimage/` |

---

## Keyboard shortcuts

| Key | Action |
| --- | ------ |
| <kbd>j</kbd> / <kbd>k</kbd> | Move through the job list |
| <kbd>o</kbd> | Open the selected job |
| <kbd>b</kbd> | Bookmark a job |
| <kbd>h</kbd> | Hide a job |
| <kbd>n</kbd> | Add a note |
| <kbd>/</kbd> | Focus search |
| <kbd>?</kbd> | Show all shortcuts |
| <kbd>Ctrl</kbd>+<kbd>1</kbd> to <kbd>7</kbd> | Switch pages |

---

## For developers

JobSentinel is built as a Tauri desktop app.

| Layer | Stack |
| ----- | ----- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Rust 2021, Tauri 2, Tokio |
| Storage | SQLite with SQLx offline mode |
| Tests | Vitest, Playwright, Rust tests, docs harness checks |

Current backend surface: **190 registered Tauri commands**.

Common checks:

```bash
npm run harness:check
npm run lint
npm run test:run
npm run build
cd src-tauri && cargo fmt --all -- --check
cd src-tauri && cargo clippy -- -D warnings
cd src-tauri && cargo test --lib
```

Full release verification also includes `npm run test:e2e:all` and the full
Rust test suite. Local `npm run test:e2e` runs the faster Chromium functional
suite; documentation screenshots are refreshed separately with
`npm run docs:screenshots`.

Developer docs:

- [Harness engineering](docs/harness/README.md)
- [Developer setup](docs/developer/GETTING_STARTED.md)
- [Architecture](docs/developer/ARCHITECTURE.md)
- [Testing guide](docs/developer/TESTING.md)
- [Contributing](docs/developer/CONTRIBUTING.md)
- [Roadmap](docs/ROADMAP.md)

---

## Current release

### Just released in v2.6.4

- Settings no longer spins forever on first load.
- Jobs with missing salary or scoring data no longer show `NaN`.
- Bulk bookmark and hide actions keep working when one job has an error.
- Tests were expanded across settings, scoring edge cases, and bulk actions.
- Transitive dependency security updates were applied.

### Tracked next

- Universal macOS release artifact.
- Linux AppImage and `.deb` release artifacts.
- Local matching improvements.

Read [docs/README.md](docs/README.md), [CHANGELOG.md](CHANGELOG.md), and
[ROADMAP.md](docs/ROADMAP.md) for more release detail.

---

## FAQ

<details>
<summary><strong>Is JobSentinel free?</strong></summary>
<br>

Yes. JobSentinel is open source under the MIT license.

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

Yes. Some defaults and sources are strongest for tech roles, but you can change
job titles, keywords, locations, and source settings.

</details>

<details>
<summary><strong>What is a ghost job?</strong></summary>
<br>

A ghost job is a posting that may be stale, already filled, repeatedly reposted,
or posted mainly to collect resumes. JobSentinel flags these so you can decide
whether the role is worth your time.

</details>

<details>
<summary><strong>Does one-click apply submit applications for me?</strong></summary>
<br>

No. JobSentinel can fill supported forms, but you review the form and click
Submit yourself.

</details>

<details>
<summary><strong>Where is my database?</strong></summary>
<br>

JobSentinel stores app data in the standard app-data location for your platform.
See [developer setup](docs/developer/GETTING_STARTED.md#database) for exact
paths.

</details>

---

## Support and community

- Found a bug? [Open an issue](https://github.com/cboyd0319/JobSentinel/issues/new).
- Have an idea? [Start a discussion](https://github.com/cboyd0319/JobSentinel/discussions).
- Want to contribute? Read the [contributing guide](docs/developer/CONTRIBUTING.md).

---

<div align="center">

**JobSentinel helps you search steadily, stay organized, and keep your data close.**

[Get started](#get-started)

<br>

<sub>Open source. Local-first. Built for job seekers who value privacy.</sub>

</div>
