# JobSentinel

**JobSentinel is an open-source, local-first job-search assistant for finding real,
relevant, fairly compensated work while keeping sensitive job-search data under user
control.**

**Current macOS full-public-readiness: 94%; no-account path completion:
100%.** The current `v2.6.4` release has a public universal DMG, matching
`.sha256` checksum, public release verifier, universal architecture checks,
install smoke, launch smoke, isolated local data smoke, and harness-enforced
readiness checks. The no-account path is complete. Full public Mac readiness
cannot honestly reach 100% without Developer ID signing, notarization,
stapling, and Gatekeeper acceptance, all of which require Apple Developer
Program materials.

Active-plan implementation status is separate: 100% of the current active-plan
checklist is complete, with 153 of 153 tracked items checked off. Current
broad verification evidence is recorded in
[active plan status](docs/plans/active/status.md): no known bloat, privacy
leak, stale docs, engineer-only user flow, or unverified claim remains from the
current checkout. No grandfathered oversized-file exceptions remain. Ongoing
work focuses on resume assistance, job-card protection, guided intake, and pay
protection where they improve privacy, security, verification, or user ease.

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
salary floors, resume records, source status, and safe support reports work
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
| Current release | `v2.6.4` with Windows and Linux installers plus a verified no-account universal macOS package. A public Mac package is recommended only when the release includes a matching `.sha256` checksum and the public macOS verifier passes. |
| macOS full-public-readiness | 94%; no-account path completion is 100%. Public universal DMG, checksum, metadata, architecture, install, launch, local-data, public-artifact, and readiness-harness checks are in place. The final 6% is externally blocked by Apple Developer Program materials for Developer ID signing, notarization, stapling, and Gatekeeper acceptance. |
| Current active plan | 100% checklist completion for the compact current-work plan, with current broad verification evidence recorded in active status. |

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
| Stale, reposted, or unverifiable roles waste tailoring time | Ghost-job detection, first-seen and last-seen tracking, repost context, source status, and official-source job monitoring | [Ghost-job research](docs/research/ghost-jobs.md), [ghost detection](docs/features/ghost-detection.md) |
| Pay opacity can lead to underpaid work | Salary floors, salary transparency checks, compensation range review, lower-title or lower-pay cues, and negotiation prep | [Pay-equity research](docs/research/pay-equity.md), [salary negotiation](docs/research/salary-negotiation.md) |
| Screening systems are opaque | Hiring-system transparency, candidate-side explainability, and application readability review | [screening-system research](docs/research/ats-transparency.md), [Responsible AI](RESPONSIBLE_AI.md) |
| Long searches erode confidence and time | Fresh-role focus, pacing, weekly summaries, and gap-framing work are tracked as product requirements | [Roadmap](ROADMAP.md), [current plan](docs/plans/active/current-work.md) |
| Opaque channels can trap effort | Bias-aware strategy favors direct sources, official postings, recruiter context, referral routes, and verifiable signals | [Research model](#research-model), [job-source docs](docs/research/job-site-data-sources.md) |
| Support can expose private data | Safe support reports can be saved locally and shared only when the user chooses | [Privacy](PRIVACY.md), [docs index](docs/README.md) |

JobSentinel keeps applications under user review. It does not prioritize
application volume, deceptive resume changes, source-boundary evasion, or hidden
data sharing.

## Download and First Run

Download the latest package or installer from the
[latest download page](https://github.com/cboyd0319/JobSentinel/releases/latest).

| Platform | Download |
| -------- | --------- |
| Windows | Windows installer |
| macOS | Universal Mac package for Apple silicon and Intel Macs. Use only a Mac package that has a matching `.sha256` checksum asset on the release. Until Developer ID signing and notarization are available, the no-account DMG filename should include `_no-account_`. The project does not currently have an Apple Developer Account, so macOS requires a first-open Privacy & Security approval until Developer ID signing and notarization are available. |
| Linux | Linux installer |

The current `v2.6.4` release includes Windows and Linux installers plus
`JobSentinel_2.6.4_no-account_universal.dmg` for macOS. Most Windows and Linux
users should use the installer. Mac users should use only a release package
with a matching `JobSentinel_*_universal.dmg.sha256` checksum and passing public
macOS verification. Until Developer ID signing and notarization are available,
the no-account DMG filename should include `_no-account_`. If a release is
missing the checksum or that no-account label, treat the Mac package as pending
replacement and use a fresh local build instead.

Mac first open is not zero-friction because JobSentinel does not currently have
an Apple Developer Account for Developer ID signing and notarization. This is a
release-distribution constraint, not a core runtime feature gap: the macOS app
can still be built, packaged, verified, and tested locally. The no-account
macOS release path verifies ad-hoc packages for metadata, signatures,
universal architecture, launch smoke, installed-app smoke, checksum, and local
data creation, but it does not claim Gatekeeper readiness. It is not Developer
ID signed and not notarized. Current Mac full-public-readiness is 94%;
no-account path completion is 100%. The remaining 6% is zero-friction public
distribution through Developer ID signing, notarization, stapling, Gatekeeper
acceptance, and signed-artifact verification.
Contributors can use the
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

Install on Mac:

1. Open the downloaded `.dmg`.
2. Drag **JobSentinel** to **Applications**.
3. Eject the disk image.
4. Open **JobSentinel** from **Applications**.

macOS may show this message because the no-account macOS package is not
Developer ID signed and notarized:

```text
JobSentinel can't be opened because Apple cannot check it for malicious software.
```

Continue only if you downloaded JobSentinel from the latest download page linked
above and expected this file. If you are not sure, stop, delete the download,
and download it again from that page.

After checking the download, try opening **JobSentinel** from **Applications**
once and dismiss the warning. Then open **System Settings**, go to **Privacy &
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
| Job-source checks | Source checks contact approved public job sources, wait between checks, read only needed job details, and save results locally. |
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
duplicate cleanup, plain source-status checks, and limited website reads. The
Settings page also shows 15 source-status checks. LinkedIn is a user-opened search-link
destination, not a scheduled source.

| Category | Sources |
| -------- | ------- |
| Hiring-platform feeds | Greenhouse, Lever |
| General and tech job sites | Dice, Glassdoor, SimplyHired |
| Remote and startup job sites | RemoteOK, WeWorkRemotely, BuiltIn, YC Startup Jobs |
| Community and official feeds | Startup and tech job posts, JobsWithGPT, USAJobs |
| User-opened search links | LinkedIn and other job-site destinations opened by the user |

Some monitored sources have optional setup. USAJobs can use an access code for
scheduled checks, but users can open USAJobs through job-site search links
without setup. JobSentinel reports source status so you can see when a source is
healthy, degraded, or blocked. Source collection is scoped to a single user's
local search, follows each source's allowed use, and favors public
hiring-platform feeds or official company sources when available. Some sites
only allow user-opened searches. Use search links for those sites.

Read the full [job source guide](docs/features/scrapers.md) and
[job source status docs](docs/features/scraper-health.md).

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

Build the app from source:

```bash
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel
npm install
npm run tauri:build
```

On macOS, use the maintained DMG package path:

```bash
npm run tauri:build:macos
```

For a universal macOS package and local package verification:

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
JOBSENTINEL_MACOS_NO_ACCOUNT=true npm run tauri:build:macos -- --target universal-apple-darwin
npm run tauri:verify:macos -- \
  --dmg src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_*_no-account_universal.dmg \
  --expected-architectures x86_64,arm64 \
  --launch-smoke \
  --install-smoke \
  --require-checksum
```

The macOS package script also writes
`JobSentinel_<version>_no-account_universal.dmg.sha256` next to the
no-account DMG. Without `JOBSENTINEL_MACOS_NO_ACCOUNT=true`, local-only builds
use `JobSentinel_<version>_universal.dmg` instead. The verifier can require
the checksum sidecar before upload or sharing. Upload or share both files
together.

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

Current backend surface: **201 registered Tauri commands**.

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

- Windows `.msi`, verified no-account macOS `.dmg`, Linux `.AppImage`, and
  Linux `.deb` release assets are available. The macOS package is not Developer
  ID signed or notarized, so it requires first-open Privacy & Security approval.
- Mac full-public-readiness is 94%, and no-account path completion is 100%:
  package, checksum, universal architecture, install, launch, local-data,
  public-artifact, and readiness harness verification are covered, while
  zero-friction public distribution still needs Developer ID signing,
  notarization, stapling, and Gatekeeper acceptance.
- Settings no longer spins forever on first load.
- Jobs with missing salary or scoring data no longer show `NaN`.
- Bulk bookmark and hide actions keep working when one job has an error.
- Tests were expanded across settings, scoring edge cases, and bulk actions.
- Transitive dependency security updates were applied.

### In Main for the Next Release

- Safe support reports can be copied or saved from settings, error
  logs, and crash recovery surfaces.
- Active planning has been compacted to one current-work plan and one status
  file; the harness session reports 2 active plan docs and a 100/100
  five-tuple harness score.
- Resume requirement review, saved-answer review, job-card stale or repost
  evidence, listed-pay guidance, first-run presets, and support copy were
  tightened around local evidence and plain-language review.
- Oversized-file modularization reduced legacy exceptions across mock handlers,
  settings UI, resume analysis, database tests, scheduler tests, scoring tests,
  scraper tests, the README, and harness sensors. No grandfathered oversized
  files remain.
- Direct npm, Cargo, and GitHub Actions dependencies were refreshed to latest
  stable versions; narrower Dependabot PRs are superseded by the mainline
  refresh.
- Playwright smoke and full-browser test commands are faster and support
  `npm run test:e2e:last-failed` for quick failure loops.
- LinkedIn is now user-opened search links only; scheduled checks and new
  session credential storage are disabled by source policy.

### Tracked Next

- Keep the zero-oversized-file baseline intact during future changes.
- Continue resume assistance only where it improves truthful local requirement
  review, hard-constraint handling, readable evidence, or next-action guidance.
- Continue guided intake, job-card protection, and pay protection only where
  the work stays local, reviewed, plain-language, and evidence-bounded.
- Repeat broad verification after future material code or documentation changes.

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

The complete reference index moved to [docs/references.md](docs/references.md).
It collects external sources referenced across the main docs, research notes,
and active or completed plans. Security test payloads, placeholder URLs, and
fake example links stay excluded.
