<div align="center">

<img src="docs/images/logo.png" alt="JobSentinel Logo" width="180">

# JobSentinel

**Your Personal Job Search Bodyguard**

**Find better jobs. Faster. Without selling your soul (or your data).**

<br>

<p align="center">
  <img src="https://img.shields.io/badge/Version-2.5.0-blue?style=for-the-badge" alt="Version 2.5.0">
  <img src="https://img.shields.io/badge/Windows-Ready-0078D6?style=for-the-badge&logo=Windows&logoColor=white" alt="Windows">
  <img src="https://img.shields.io/badge/macOS-Ready-000000?style=for-the-badge&logo=apple&logoColor=white" alt="macOS">
  <img src="https://img.shields.io/badge/Linux-Coming_Soon-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Linux">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Price-FREE_FOREVER-brightgreen?style=for-the-badge" alt="Free Forever">
  <img src="https://img.shields.io/badge/Privacy-100%25_LOCAL-blue?style=for-the-badge" alt="100% Local">
  <img src="https://img.shields.io/badge/Data_Collected-ZERO-red?style=for-the-badge" alt="Zero Data">
  <img src="https://img.shields.io/badge/Dark_Mode-Supported-1a1a2e?style=for-the-badge" alt="Dark Mode">
</p>

---

**Job hunting sucks.** You know it. We know it.

Endless scrolling. Reposted ghost jobs. Missing the perfect role because you were sleeping.
Companies harvesting your data while you search.

**JobSentinel fixes all of that.**

[Get Started (2 minutes)](#get-started) • [See It In Action](#see-it-in-action) • [Why It's Different](#why-jobsentinel)

</div>

---

## What Does JobSentinel Actually Do?

**It's like having a tireless assistant who searches for jobs 24/7 and only bothers you when something great comes up.**

Here's the deal:

1. **You tell it what you want** — job titles, salary, remote/hybrid/onsite
2. **It watches 13 job boards for you** — checking every 2 hours, day and night
3. **It scores every job** — so you only see roles that actually match
4. **It alerts you instantly** — Slack, Discord, Teams, Email, or just a desktop notification

That's it. No accounts. No subscriptions. No data harvesting. Just... jobs that match what you want.

---

## See It In Action

<p align="center">
  <img src="docs/images/dashboard.png" alt="JobSentinel Dashboard" width="800">
  <br>
  <em>Your command center. Every job scored and ranked. Dark mode included.</em>
</p>

<p align="center">
  <img src="docs/images/application-tracking.png" alt="Application Tracker" width="800">
  <br>
  <em>Track every application. Never forget to follow up. See your progress at a glance.</em>
</p>

<details>
<summary><strong>See more screenshots</strong></summary>
<br>

<p align="center">
  <img src="docs/images/resume-builder.png" alt="Resume Builder" width="700">
  <br>
  <em>Build ATS-friendly resumes with 5 professional templates. Export to Word in one click.</em>
</p>

<p align="center">
  <img src="docs/images/ats-optimizer.png" alt="ATS Optimizer" width="700">
  <br>
  <em>See exactly how your resume scores against a job description. Fix gaps before applying.</em>
</p>

<p align="center">
  <img src="docs/images/one-click-apply.png" alt="One-Click Apply" width="700">
  <br>
  <em>Fill out job applications in seconds. You review everything before hitting Submit.</em>
</p>

<p align="center">
  <img src="docs/images/salary-ai.png" alt="Salary AI" width="700">
  <br>
  <em>Know your worth. Get negotiation scripts based on real H1B salary data.</em>
</p>

<p align="center">
  <img src="docs/images/market-intelligence.png" alt="Market Intelligence" width="700">
  <br>
  <em>See which skills are trending. Know which companies are actually hiring.</em>
</p>

</details>

---

## Why JobSentinel?

### The Job Search Is Rigged Against You

| The Problem | How JobSentinel Fixes It |
|-------------|--------------------------|
| **Job sites sell your data** | Your data never leaves your computer. Period. |
| **You miss jobs while sleeping** | JobSentinel watches 13 job boards 24/7 and pings you instantly |
| **Half the listings are ghost jobs** | Built-in ghost detection flags fake, stale, and already-filled positions |
| **Applications take forever** | One-click apply fills forms automatically (you still click Submit) |
| **You're guessing at salary** | Salary AI shows real market rates from H1B data |
| **Subscription fatigue** | **Free forever.** No premium tier. No "upgrade to unlock." |

### What Makes It Special

**13 Job Boards, One Dashboard**

- Greenhouse, Lever, LinkedIn, Indeed, RemoteOK, Wellfound, WeWorkRemotely
- BuiltIn, Dice, HN Who's Hiring, JobsWithGPT, YC Startup Jobs, ZipRecruiter
- New jobs every 2 hours (or whenever you want)

**Ghost Job Detection**

- Spots fake listings, reposted jobs, and positions that are already filled
- Color-coded warnings so you don't waste time applying

**Smart Scoring**

- Every job gets a match score based on YOUR preferences
- Skills (40%) + Salary (25%) + Location (20%) + Company (10%) + Freshness (5%)

**Resume Builder + ATS Optimizer**

- Build professional resumes with 5 templates
- See exactly which keywords you're missing before you apply
- Export to Word (.docx) ready to upload

**One-Click Apply**

- Fills out Greenhouse, Lever, Workday, and 4 other application systems
- You review everything and click Submit yourself
- Stores your info locally so you never type it again

**Application Tracking**

- Kanban board to track every application
- Automatic reminders for follow-ups
- Interview prep checklists

**100% Private**

- Runs entirely on your computer
- No cloud. No accounts. No tracking.
- We literally cannot see your data

**Keyboard-First Design**

Power users can navigate entirely by keyboard:

| Key | Action |
|-----|--------|
| `j` / `k` | Navigate job list (down/up) |
| `o` | Open selected job |
| `b` | Bookmark job |
| `h` | Hide job |
| `n` | Add note |
| `/` | Focus search |
| `?` | Show all shortcuts |
| `Ctrl+1-7` | Switch pages |

---

## Get Started

### Step 1: Download

> **Note:** Official installers coming soon. For now, build from source (takes ~5 minutes).

**Windows or macOS:**

```bash
# 1. Install Rust (if you don't have it)
# Visit: https://rustup.rs and follow the instructions

# 2. Install Node.js 20+ (if you don't have it)
# Visit: https://nodejs.org

# 3. Download and build JobSentinel
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel
npm install
npm run tauri:build

# 4. Find your installer in src-tauri/target/release/bundle/
```

**That's it.** The app is ~8MB and runs without admin rights.

### Step 2: Setup (2 minutes)

When you first open JobSentinel, a friendly wizard asks you four questions:

1. **What job titles are you looking for?**
   - Example: "Software Engineer", "Product Manager"

2. **Where do you want to work?**
   - Remote, Hybrid, Onsite (pick any combination)

3. **What's your minimum salary?**
   - Enter a number or $0 to see everything

4. **Want instant alerts?** (optional)
   - Add a Slack, Discord, or Teams webhook to get pinged when great jobs appear

Done. JobSentinel starts watching job boards immediately.

### Step 3: Let It Work

JobSentinel automatically checks all 13 job boards every 2 hours. When it finds something that matches your criteria:

- Jobs appear in your dashboard, sorted by match score
- High-scoring jobs (90%+) trigger instant notifications (if you set them up)
- Ghost jobs are flagged so you can skip them

You can also click "Search Now" anytime to run a manual scan.

---

## Frequently Asked Questions

<details>
<summary><strong>Is this really free?</strong></summary>
<br>
Yes. 100% free, forever. No subscriptions, no premium tier, no "upgrade to unlock features."

JobSentinel is open source under the MIT license. You can literally read every line of code.
</details>

<details>
<summary><strong>Do I need to create an account?</strong></summary>
<br>
Nope. No account, no login, no cloud sync. Everything runs on your computer.
</details>

<details>
<summary><strong>What data do you collect?</strong></summary>
<br>
<strong>Zero.</strong> Nothing. Nada.

JobSentinel has no telemetry, no analytics, no tracking. Your job search data exists only on
your computer. We couldn't see your data even if we wanted to.
</details>

<details>
<summary><strong>How is this different from LinkedIn/Indeed/Glassdoor?</strong></summary>
<br>
Those are job boards that collect and sell your data. JobSentinel is a <em>tool</em> that
searches those job boards for you, privately, on your own computer.

Think of it like the difference between Google tracking your searches vs. a private search engine.
</details>

<details>
<summary><strong>Can I use this for non-tech jobs?</strong></summary>
<br>
Absolutely! While the default settings are optimized for tech roles, JobSentinel works for any
job posted on the supported job boards.

Just change your title allowlist and keywords to match what you're looking for.
</details>

<details>
<summary><strong>What's a "ghost job"?</strong></summary>
<br>
A ghost job is a posting that isn't a real opportunity — maybe it's already filled, posted
just to collect resumes, or has been sitting there for 6 months.

JobSentinel analyzes each job and flags suspicious ones so you don't waste time applying to
dead ends.
</details>

<details>
<summary><strong>How does One-Click Apply work?</strong></summary>
<br>
You save your contact info, work history, and answers to common screening questions. When you
click "Quick Apply" on a job, JobSentinel opens the application form and fills in everything
automatically.

<strong>Important:</strong> You always review the form and click Submit yourself. JobSentinel never
submits applications without you.
</details>

<details>
<summary><strong>Is my data secure?</strong></summary>
<br>
Yes. Passwords and API tokens are stored in your operating system's secure credential manager:

- <strong>macOS:</strong> Keychain
- <strong>Windows:</strong> Credential Manager
- <strong>Linux:</strong> Secret Service (GNOME Keyring)

Your job search data is stored in a local SQLite database that only you can access.
</details>

<details>
<summary><strong>I'm not technical. Can I still use this?</strong></summary>
<br>
That's the goal! Once official installers are released, you'll just download, double-click, and go.

Right now, building from source requires some command-line basics, but the instructions above
should work even if you've never done it before.
</details>

---

## The Nerdy Details

<details>
<summary><strong>For developers and the curious</strong></summary>

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS |
| Backend | Rust, Tokio (async), SQLx |
| Desktop | Tauri 2.x |
| Database | SQLite (local) |

### By the Numbers

- **140 Tauri commands** powering all features
- **2,000+ tests passing** (unit, integration, property-based)
- **0 security vulnerabilities** (cargo-audit verified)
- **~8MB** installed size
- **<50MB RAM** typical usage

### Architecture

JobSentinel follows "LLM-first" development principles — every module is designed to be
understandable and regenerable by AI coding assistants. Files stay under 500 lines, concerns
are clearly separated, and the codebase is extensively documented.

For full technical documentation, see:

- [Developer Guide](docs/developer/GETTING_STARTED.md)
- [Architecture](docs/developer/ARCHITECTURE.md)
- [Contributing](docs/developer/CONTRIBUTING.md)

</details>

---

## What's Next?

### Coming Soon

- **Official installers** — One-click install for Windows, macOS, and Linux
- **Browser extension** — Clip jobs directly from any website
- **Mobile companion** — Get notifications on your phone

### Just Released (v2.2 – v2.4)

- **Smart Scoring Engine** — Customizable weights, synonym matching, graduated salary scoring
- **Resume Matching** — 300+ skills, experience/education matching, weighted scoring (50/30/20)
- **Resume Builder UI** — Skill confidence scores, template previews, ATS score integration
- **ATS Optimizer** — Side-by-side comparison, keyword density heatmap
- **Settings UI** — Configure scoring weights, remote preferences, company lists
- **OS-native credentials** — Keychain (macOS), Credential Manager (Windows)
- **Dark mode** — Full dark theme support across all pages

---

## Support & Community

- **Found a bug?** [Open an issue](https://github.com/cboyd0319/JobSentinel/issues/new)
- **Have an idea?** [Start a discussion](https://github.com/cboyd0319/JobSentinel/discussions)
- **Want to contribute?** [Read the guide](docs/developer/CONTRIBUTING.md)

---

<div align="center">

### Built for Job Seekers Who Refuse to Sacrifice Privacy

Your data is yours.
Your job search is yours.
Your future is yours.

**[Get Started Now](#get-started)**

<br>

<sub>MIT License — Free forever — Zero data collection</sub>

</div>
