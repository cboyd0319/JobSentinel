# JobSentinel Roadmap

Use `package.json` for the current release package version.

## Working Features

- **12 scheduled source adapters**: Greenhouse, Lever, RemoteOK,
  WeWorkRemotely, BuiltIn, HN Who's Hiring, JobsWithGPT, Dice, YC Startup Jobs,
  USAJobs, SimplyHired, Glassdoor
- **User-opened search links**: LinkedIn and other destinations opened by the
  user, not monitored in the background
- Application board: column board, reminders, timeline, and quiet-period review
- Interview Scheduler: iCal export, prep checklists, follow-up reminders
- AI Resume-Job Matcher: PDF parsing, skill extraction, matching
- Salary AI: Benchmarks, predictions, offer comparison, negotiation scripts
- Market Intelligence: Trends, snapshots, alerts, hiring velocity
- Multi-factor scoring algorithm
- Multi-channel notifications: Slack, Discord, Teams, Desktop, Email (SMTP)
- Advanced notification filtering: keyword filters, salary threshold, company lists
- Keyboard shortcuts: `b` bookmark, `n` notes, `c` company, `/` search, `?` help
- Advanced search: Boolean AND/OR/NOT, search history
- Enhanced analytics: Response rates, weekly goals, company response times
- Company research: 40+ companies with tech stacks
- SQLite database with full-text search
- Scheduler for periodic scraping
- React 19 frontend with virtual lists

### v1.1 Features (COMPLETED)

| Feature                                     | Status   | Notes                       |
| ------------------------------------------- | -------- | --------------------------- |
| Email notifications (SMTP)                  | **Done** | Full UI in Settings         |
| Frontend pages for ATS/Resume/Salary/Market | **Done** | 4 new pages with navigation |
| GitHub Actions CI/CD                        | **Done** | Multi-platform build/test   |

### v1.2 Features (COMPLETED)

| Feature           | Status   | Notes                       |
| ----------------- | -------- | --------------------------- |
| Virtual job list  | **Done** | Performance for large lists |
| Error boundaries  | **Done** | Graceful error handling     |
| Command palette   | **Done** | Cmd/Ctrl+K quick actions    |
| Onboarding tour   | **Done** | First-run guided tour       |
| Export utilities  | **Done** | CSV/JSON export             |
| RemoteOK scraper  | **Done** | JSON API for remote jobs    |
| Remote-first source coverage | **Done** | RemoteOK and WeWorkRemotely |

### v1.3 Features (COMPLETED)

| Feature                         | Status   | Notes                               |
| ------------------------------- | -------- | ----------------------------------- |
| Advanced notification filtering | **Done** | Keywords, salary, company lists     |
| Keyboard shortcuts              | **Done** | Power user navigation               |
| Cover letter categories         | **Done** | Template filtering and placeholders |
| Company research panel          | **Done** | 40+ companies with tech stacks      |
| Interview prep checklist        | **Done** | 5-item checklist with reminders     |
| Follow-up reminders             | **Done** | Post-interview thank you tracking   |
| Analytics weekly goals          | **Done** | Application targets with progress   |
| Company response rates          | **Done** | Fastest/slowest responders          |
| WeWorkRemotely scraper          | **Done** | RSS feed for remote jobs            |
| BuiltIn scraper                 | **Done** | City-specific tech jobs             |
| HN Who's Hiring scraper         | **Done** | Monthly thread parsing              |
| Advanced search                 | **Done** | AND/OR/NOT, search history          |

### v1.4 Features (COMPLETED)

| Feature                      | Status   | Notes                                              |
| ---------------------------- | -------- | -------------------------------------------------- |
| Ghost Job Detection          | **Done** | Flag stale, reposted, and low-trust job postings   |
| Ghost Filter UI              | **Done** | Dashboard dropdown to filter by ghost status       |
| Ghost Indicators             | **Done** | Visual badges with severity coloring               |
| Score Breakdown Tooltip      | **Done** | Hover to see scoring factor breakdown              |
| Application Conversion Stats | **Done** | Quick stats bar on Applications page               |
| Resume Match Visualization   | **Done** | Green/red skill match display                      |
| **Backend Persistence (E3)** | **Done** | localStorage to SQLite migration                   |
| Cover Letter Templates       | **Done** | Persisted with categories in SQLite                |
| Interview Prep Checklists    | **Done** | Per-interview completion tracking                  |
| Saved Searches               | **Done** | Filter presets stored in database                  |
| Search History               | **Done** | Unlimited history (no 10-item cap)                 |
| Notification Preferences     | **Done** | Advanced filtering stored in SQLite                |
| **UI Polish (E4)**           | **Done** | Cover letter auto-fill, shortcut badges, tour link |
| Cover Letter Auto-Fill       | **Done** | "Use for Job" button fills placeholders            |
| Keyboard Shortcut Badges     | **Done** | ShortcutKey component for visual hints             |
| Tour Integration             | **Done** | "Take a guided tour" link in keyboard help         |

### v1.5 - Code Quality & Refactoring (COMPLETED)

Major refactoring effort to modularize oversized files. All high-priority files have been split.

| File                         | Before | After             | Status                  |
| ---------------------------- | ------ | ----------------- | ----------------------- |
| `db/mod.rs`                  | 4442   | 85 (+8 modules)   | **Done**                |
| `scheduler/mod.rs`           | 2955   | ~300 (+7 modules) | **Done**                |
| `market_intelligence/mod.rs` | 2703   | ~400 (+4 modules) | **Done**                |
| `db/integrity.rs`            | 2517   | 85 (+5 modules)   | **Done**                |
| `config/mod.rs`              | 2343   | ~300 (+5 modules) | **Done**                |
| `Dashboard.tsx`              | 2315   | 672 (+11 files)   | **Done**                |
| `ats/mod.rs`                 | 2082   | ~300 (+5 modules) | **Done**                |
| `scrapers/lever.rs`          | 2256   | -                 | Deferred (mostly tests) |

### v1.6 - Additional Refactoring (COMPLETED)

Continued refactoring of remaining large files.

| File                | Before | After                        | Status   |
| ------------------- | ------ | ---------------------------- | -------- |
| `commands/mod.rs`   | 1732   | 94 (+9 domain modules)       | **Done** |
| `scrapers/lever.rs` | 2379   | 183 (+tests.rs)              | **Done** |
| `salary/mod.rs`     | 2026   | 59 (+types, analyzer, tests) | **Done** |
| `resume/mod.rs`     | 1831   | 440 (+types.rs, tests.rs)    | **Done** |

**Commands split into domain modules:**

- jobs.rs (314 lines) - Job operations, search, bookmarks
- ats.rs (224 lines) - Application tracking, interviews
- user_data.rs (354 lines) - Templates, saved searches, history
- resume.rs (126 lines) - Resume matching commands
- salary.rs (92 lines) - Salary prediction commands
- market.rs (80 lines) - Market intelligence commands
- ghost.rs (93 lines) - Ghost detection commands
- config.rs (99 lines) - Configuration commands
- tests.rs (371 lines) - Command tests

### v2.0 - Security & Production Hardening (COMPLETED)

Major security release with OS-native keyring integration, Resume Builder, and Application Assist.

| Feature                               | Status   | Notes                                          |
| ------------------------------------- | -------- | ---------------------------------------------- |
| **OS-Native Keyring Integration**     | **Done** | Secure credential storage                      |
| macOS Keychain support                | **Done** | `keyring` native store                         |
| Windows Credential Manager            | **Done** | `keyring` native store                         |
| Linux Secret Service                  | **Done** | `keyring` native store                         |
| Automatic migration                   | **Done** | Plaintext to keyring on first v2.0 launch      |
| 5 credential commands                 | **Done** | store, retrieve, delete, has, get_status       |
| Updated Settings UI                   | **Done** | Credential status indicators                   |
| **P3 Integration Tests**              | **Done** | Integration suite documented; use fresh command output for counts |
| **P4 Resume Builder + Resume Optimizer** | **Done** | Full resume creation and optimization       |
| **P5 Application Assist**                | **Done** | Form preparation with human review |

**Credentials secured:**

- `smtp_password` - Email SMTP password
- `telegram_bot_token` - Telegram Bot API token
- `slack_webhook_url` - Slack incoming webhook URL
- `discord_webhook_url` - Discord webhook URL
- `teams_webhook_url` - Microsoft Teams webhook URL
- `usajobs_api_key` - USAJobs access code

See [docs/security/KEYRING.md](security/KEYRING.md) for full documentation.

**P4 Resume Builder Features:**

- 7-step resume wizard (contact, summary, experience, education, skills, preview, export)
- 5 readable templates (Classic, Modern, Skills-First, Executive, Military)
- DOCX export with professional formatting
- Resume analyzer with job-post evidence review and scoring
- Bullet point improver with 45+ power words
- 22 new Tauri commands

See [docs/features/resume-builder.md](features/resume-builder.md) for full documentation.

**P5 Application Assist Features:**

- Human-in-the-loop design (user clicks Submit manually)
- Application profile management (contact info, URLs, work authorization)
- Saved screening answers with plain question-text matching
- ATS platform detection (Greenhouse, Lever, Workday, Taleo, iCIMS, BambooHR, Ashby)
- Visible browser review flow
- CAPTCHA detection with user prompts
- Daily review limit
- 18 new Tauri commands

See [docs/features/one-click-apply.md](features/one-click-apply.md) for full documentation.

### v2.1 - Job Source Health (COMPLETED)

Comprehensive health monitoring system for scheduled source adapters and
source availability checks.

| Feature                       | Status   | Notes                           |
| ----------------------------- | -------- | ------------------------------- |
| **Scheduled source adapters wired** | **Done** | 12 scheduled adapters active |
| **Health Dashboard**          | **Done** | Settings > Troubleshooting      |
| **Run History Tracking**      | **Done** | Per-source check history        |
| **Exponential Backoff Retry** | **Done** | Auto-retry on 429, 5xx errors   |
| **Source Checks**             | **Done** | Check individual or all sources |
| **LinkedIn search-link policy** | **Done** | User-opened links only; no background monitoring |
| **9 New Tauri Commands**      | **Done** | Health monitoring API           |
| **4 New Database Tables**     | **Done** | + 1 aggregation view            |

**Scheduled source adapters now wired:**

- RemoteOK, WeWorkRemotely, BuiltIn
- HN Who's Hiring, Dice, YC Startup Jobs, USAJobs, SimplyHired, Glassdoor

**Health Dashboard features:**

- Summary stats (healthy/degraded/down/disabled sources)
- Source table with recent success, average check time, and jobs found
- Check history panel with safe issue details
- Source check results modal
- Connection expiry warnings

See [docs/features/scrapers.md](features/scrapers.md) for full documentation.

### v2.3 - Advanced Resume Matching (COMPLETED)

Comprehensive resume enhancement with 7 major features for intelligent job matching.

| Feature                              | Status   | Notes                               |
| ------------------------------------ | -------- | ----------------------------------- |
| **Phase 1: Skill Validation UI**     | **Done** | Edit/delete/add extracted skills    |
| **Phase 2: Resume Library UI**       | **Done** | Multiple resume management          |
| **Phase 3: Experience Matching**     | **Done** | Years of experience vs requirements |
| **Phase 4: Education Matching**      | **Done** | Degree level comparison             |
| **Phase 5: PDF Export**              | **Done** | Browser print-to-PDF                |
| **Phase 6: OCR Support**             | **Done** | Scanned PDF parsing (optional)      |
| **Phase 7: Enhanced Skill Database** | **Done** | 300+ skills, 10 categories          |

**Weighted Match Scoring:**

```text
overall_score = (skills × 0.5) + (experience × 0.3) + (education × 0.2)
```

**New Types:**

- `ExperienceRequirement` - Skill name, min/max years, required flag
- `EducationRequirement` - Degree level, fields, required flag
- `DegreeLevel` enum - None, HighSchool, Associate, Bachelor, Master, PhD

**OCR Feature (Optional):**

- Requires: tesseract-ocr + poppler-utils
- Enable with `cargo build --features ocr`
- Falls back when pdf-extract returns < 100 characters

**Self-Contained Skill Extraction:**

- Technical, workplace, and role-specific skills across broad career categories
- 100% offline - no external dependencies
- Deterministic, fast keyword matching

See [docs/features/resume-matcher.md](features/resume-matcher.md) for full documentation.

### v2.4 - Resume Builder + Resume Optimizer UI Enhancements (COMPLETED)

Enhanced user interfaces for resume management with visual improvements and seamless workflow integration.

| Feature                                | Status   | Notes                                                   |
| -------------------------------------- | -------- | ------------------------------------------------------- |
| **Resume.tsx Skill Enhancements**      | **Done** | Confidence scores, experience, category filter          |
| **Visual Score Breakdown Chart**       | **Done** | Three-factor visualization: skills/experience/education |
| **Styled Gap Analysis**                | **Done** | Color-coded missing skills display                      |
| **Proficiency Distribution Chart**     | **Done** | Skill level visualization                               |
| **ResumeOptimizer.tsx Job Comparison** | **Done** | Side-by-side resume vs job requirements                 |
| **Keyword Density Heatmap**            | **Done** | Keyword importance visualization                        |
| **Tailor Resume Workflow**             | **Done** | Button linking optimizer to builder                     |
| **Template Thumbnail Previews**        | **Done** | Visual template selection cards                         |
| **Import Skills from Resume**          | **Done** | Auto-populate builder skills from matcher               |
| **ATS Score Preview**                  | **Done** | Score display in builder step 6                         |
| **New Components**                     | **Done** | ResumeMatchScoreBreakdown, SkillCategoryFilter, etc.    |
| **Resume to Builder Integration**      | **Done** | Seamless data flow between modules                      |

**Enhanced User Workflow:**

1. Upload resume and view match scores
2. Filter skills by category
3. See visual score breakdown
4. Compare with specific job using side-by-side view
5. Click "Tailor Resume" to jump to builder
6. Builder pre-fills skills from matched resume
7. Choose template with ATS score preview
8. Export optimized resume

See [docs/features/resume-matcher.md](features/resume-matcher.md) for full UI integration documentation.

### v2.5 - Market Intelligence UI (COMPLETED)

Complete visualization layer for Market Intelligence with interactive charts and tabbed layout.

| Feature                    | Status   | Notes                                          |
| -------------------------- | -------- | ---------------------------------------------- |
| **MarketSnapshotCard**     | **Done** | Daily summary with sentiment                   |
| **TrendChart (Recharts)**  | **Done** | Line/bar charts for trends                     |
| **MarketAlertCard**        | **Done** | Severity-colored alert display                 |
| **LocationHeatmap**        | **Done** | Interactive job density grid                   |
| **Tabbed Market.tsx**      | **Done** | Overview, Skills, Companies, Locations, Alerts |
| **Enhanced Backend Types** | **Done** | change_percent, trend_direction, growth_rate   |
| **4 New Tauri Commands**   | **Done** | snapshot, historical, alert marking            |
| **TypeScript Alignment**   | **Done** | Frontend types match Rust exactly              |

**New Tauri Commands:**

- `get_market_snapshot` - Latest daily market snapshot
- `get_historical_snapshots` - Historical snapshots for N days
- `mark_alert_read` - Mark single alert as read
- `mark_all_alerts_read` - Bulk mark all alerts

**Enhanced Query Types:**

- `SkillTrend` - Added `change_percent: f64`, `trend_direction: String`
- `CompanyActivity` - Added `avg_salary: Option<i64>`, `growth_rate: f64`
- `LocationHeat` - Added `remote_percent: f64`

See [docs/features/market-intelligence.md](features/market-intelligence.md) for full documentation.

### v2.6.0 - UX Improvement Sprint (COMPLETED)

Comprehensive frontend UX improvements released January 24, 2026.

| Feature                    | Status  | Notes                                                                                         |
| -------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| Error Recovery UI          | Done | Retry buttons in Market, CoverLetterTemplates, AtsLiveScorePanel, AnalyticsPanel, ApplyButton |
| Stale Data Indicators      | Done | Color-coded timestamps (green/amber/red)                                                      |
| Skeleton Loaders           | Done | ResumeSkeleton component, better perceived performance                                        |
| Timeout Feedback           | Done | "Taking longer than expected..." messages                                                     |
| Inline Validation          | Done | InterviewScheduler datetime, ResumeBuilder steps                                              |
| Unsaved Changes Warning    | Done | CoverLetterTemplates editor confirmation                                                      |
| Component Memoization      | Done | DashboardFiltersBar, QuickActions, Dropdown                                                   |
| Lookup Objects             | Done | MarketAlertCard severity/type styles                                                          |
| Accessible Labels          | Done | ResumeBuilder, ResumeOptimizer textareas                                                      |
| Optimistic Update Rollback | Done | NotificationPreferences reverts on failure                                                    |
| useMinimumLoadingDuration  | Retired | Removed from main after no production references remained                                    |
| Actionable Empty States    | Done | Resume skills, ResumeBuilder experience/education                                             |

See [v2.6.0 UX improvements](plans/completed/v2.6.0-ux-improvements.md) and [v2.6.0 release notes](releases/v2.6.0.md)
for details.

### v2.6.1 - Performance & Code Quality (COMPLETED)

Performance optimizations and code quality improvements released January 2026.

| Feature                   | Status  | Notes                                                    |
| ------------------------- | ------- | -------------------------------------------------------- |
| **Rust Performance**      | Done | Removed unnecessary clones (190+ instances)              |
| **React Performance**     | Done | Added useCallback to prevent re-renders (50+ components) |
| **Accessibility**         | Done | Added aria-hidden to decorative icons                    |
| **Documentation Cleanup** | Done | Fixed inconsistencies across all docs                    |
| **Constant Extraction**   | Done | Extracted magic numbers to named constants               |

### v2.6.2 - Code Quality & Test Coverage (COMPLETED)

Test coverage expansion and code quality improvements released January 2026.

| Feature                    | Status  | Notes                                         |
| -------------------------- | ------- | --------------------------------------------- |
| **Integration Tests**      | Done | 50+ new integration tests                     |
| **Frontend Tests**         | Done | 100+ new component tests                      |
| **TypeScript Strict Mode** | Done | Enabled strict null checks                    |
| **Accessibility**          | Done | ARIA labels, keyboard navigation improvements |

### v2.6.3 - Security & Stability (COMPLETED)

Security fixes, memory leak resolution, and standardized error handling released January 25, 2026.

| Feature                       | Status  | Notes                                                      |
| ----------------------------- | ------- | ---------------------------------------------------------- |
| **Custom React Hooks**        | Retired | Unreferenced generic hooks removed from main; active hooks remain under `src/hooks/` |
| **Error Utilities**           | Done | errorHelpers.ts with retry logic and error classification  |
| **Form Validation**           | Done | Shared validation utilities (email, URL, phone)            |
| **Enhanced Error Boundaries** | Done | Component-level error isolation with retry                 |
| **Security Fixes**            | Done | XSS prevention, URL validation, input sanitization         |
| **Memory Leak Fixes**         | Done | useEffect cleanup, subscription management                 |
| **Standardized Error Types**  | Done | Consistent error handling across frontend/backend          |
| **Config Validation**         | Done | Comprehensive runtime config validation                    |
| **Test Coverage**             | Done | 145+ new tests (ApplyButton, custom hooks, utilities)      |

**Current Verification Status:**

- Test counts change as work lands; use fresh `npm run test:run` and `cargo test` output.
- Docs and harness changes must pass `npm run harness:check` and `npm run lint:md`.

See [CHANGELOG.md](../CHANGELOG.md) for detailed v2.6.3 changes.

### Planned / Unreleased Features

| Feature                         | Status     | Priority | Notes                                                                    |
| ------------------------------- | ---------- | -------- | ------------------------------------------------------------------------ |
| **Beta Feedback System**        | Done    | High     | Implemented on main                                                       |
| macOS support (.dmg)            | Done    | -        | v2.5.1                                                                   |
| Windows support (.msi)          | Done    | -        | v2.5.1                                                                   |
| Linux support (.deb, .AppImage) | Done    | -        | Ubuntu 20.04+ compatibility                                              |
| Intel Mac support               | Done    | -        | Universal binary (single .dmg for both Intel and Apple Silicon)          |
| CI/CD Pipeline                  | Done    | -        | GitHub Actions                                                           |
| **Expanded Scrapers**           | Done    | -        | USAJobs, SimplyHired (v2.6.3+)                                           |
| **Undo/Redo for Actions**       | Done    | Medium   | Wired on main for dashboard, applications, and cover letter templates    |
| **Auto-detect Location**        | Done    | Medium   | Explicit HTTPS IP lookup in Setup Wizard and Settings                    |
| **Settings Quick Mode**         | Planned | Low      | Simplified settings for new users                                        |
| **JSON Resume Import**          | Done    | Low      | Implemented on main; see `docs/features/json-resume-import.md`           |
| **Smart Screening Answers**     | Planned | Low      | Learn from previous answers                                              |

---

## Source Expansion Plan

**User privacy, security, and source boundaries are non-negotiable.**
JobSentinel favors official APIs, public feeds, and official company or ATS
postings.

Currently JobSentinel has **12 scheduled Rust source adapters** plus user-opened
search links. The goal is to cover more job sources while respecting source
boundaries. This helps everyone: job seekers, veterans, career changers, and
people searching outside software roles.

### New Sources (official API or public feed first)

| Source          | Method       | Priority | Status  | Notes                                 |
| --------------- | ------------ | -------- | ------- | ------------------------------------- |
| **USAJobs.gov** | Official API | High     | Done | Free API key, v2.6.3+                 |
| **SimplyHired** | RSS Feed     | High     | Done | May be blocked by Cloudflare, v2.6.3+ |

Files implemented:

- `src-tauri/src/core/scrapers/usajobs.rs` - USAJobs API client
- `src-tauri/src/core/scrapers/simplyhired.rs` - SimplyHired RSS scraper
- Backend integration: `src-tauri/src/core/scheduler/workers/scrapers.rs` (lines 286-384)
- Frontend config: `src/pages/Settings.tsx` (USAJobs, SimplyHired sections)
- Documentation: `docs/features/scrapers.md`

### Restricted Sites (Legal Alternatives Only)

These sites explicitly prohibit scraping in their Terms of Service. **DO NOT SCRAPE THEM.**

| Site                   | Restriction                                    | Our Approach    |
| ---------------------- | ---------------------------------------------- | --------------- |
| **ClearanceJobs.com**  | ToS prohibits scraping + AI/ML training        | Deep links only |
| **GovernmentJobs.com** | robots.txt blocks bots, ToS prohibits scraping | Deep links only |
| **Glassdoor**          | Heavy anti-bot, login walls                    | Skip entirely   |

### Legal Maximum Value Features

Instead of automating restricted sites, JobSentinel provides value through
user-controlled and official-source paths:

#### 1. Universal Job Importer (Schema.org Parser)

User pastes any job URL. JobSentinel fetches that one page and parses Schema.org or
JobPosting structured data.

- **Why legal:** User-initiated, single page, Schema.org is designed for machine reading
- **Implementation:** `src-tauri/src/core/import/` module and dashboard import modal
- **Supports:** Any site with JobPosting schema (most major job boards)

#### 2. Deep Link Generator

Build pre-filled search URLs that open in user's browser.

1. User enters: "security engineer" + "Denver, CO".
2. JobSentinel generates:
   `https://www.governmentjobs.com/jobs?keyword=security+engineer&location=Denver`.
3. User clicks the generated link and opens the search in their browser.

- **Why allowed:** Building URLs only. The user opens the destination in their
  own browser.
- **Sites:** GovernmentJobs, ClearanceJobs, Glassdoor, LinkedIn, Indeed, Monster, CareerBuilder,
  FlexJobs, Dice, ZipRecruiter, state gov portals, + more
- **Implementation:** `src-tauri/src/core/deeplinks/` module, Tauri commands, and Deep Links UI

#### 3. Bookmarklet

A user installs the JavaScript bookmarklet in their browser. They browse to any
job, click the bookmarklet, extract job data, and send it to local JobSentinel.

- **Why legal:** Runs in USER's browser with THEIR session. Not server-side scraping.
- **Implementation:** Frontend bookmarklet generator plus local `src-tauri/src/core/bookmarklet/`
  receiver

#### 4. RSS Feeds

Some sites offer public RSS feeds - these are explicitly permitted.

#### 5. Government Open Data

Many governments publish job data as open CSV/JSON:

- data.gov federal datasets
- State open data portals

### Implementation Priority

1. Done - USAJobs API scraper
2. Done - SimplyHired scraper
3. Done - Universal Job Importer with Schema.org parsing
4. Done - Deep Link Generator for 19+ sites
5. Done - Bookmarklet generator and local receiver
6. Planned - Curated job board directory with direct links
7. Planned - RSS feed discovery and parsing

### Community Contributions

- Scrapers: `src-tauri/src/core/scrapers/` - follow Greenhouse/Lever patterns
- Deep links: Add URL patterns for new sites
- See [docs/features/scrapers.md](features/scrapers.md) for implementation guide

---

### v3.0+ Future Ideas

- Multi-user support with web dashboard
- Mobile companion app (React Native)
- Company health monitoring (reviews, funding, red flags)
- GPT-powered cover letter generator
- **Embedded ML** - See section below

---

## Embedded ML (Future Enhancement)

### Background

The original Python version of JobSentinel (pre-Tauri rewrite, ~Oct 2025) had actual ML capabilities:

- **BERT Embeddings** - Semantic text understanding
- **Sentence-BERT** (all-MiniLM-L6-v2) - Sentence similarity
- **spaCy NLP** - Named entity recognition, POS tagging
- **VADER Sentiment** - Sentiment analysis for job descriptions

These were lost in the Tauri/Rust rewrite. The current version uses **rule-based algorithms**:

- Resume matching: keyword extraction + weighted scoring
- Salary prediction: statistical regression on H1B data
- Market intelligence: data aggregation and trend analysis

### Why Not External Services?

JobSentinel must be **100% self-contained** for:

- **Privacy** - No data leaves the user's machine
- **Security** - No API keys, no external attack surface
- **Portability** - Works offline, no network dependencies
- **Simplicity** - No setup required, just install and run

LM Studio, OpenAI, or other external services violate these principles.

### Recommended Approach: Embedded Models

Use Rust-native ML frameworks to ship small models with the application:

| Framework                | Pros                                    | Cons                        |
| ------------------------ | --------------------------------------- | --------------------------- |
| **candle** (HuggingFace) | Pure Rust, no C deps, growing ecosystem | Newer, less mature          |
| **ort** (ONNX Runtime)   | Mature, wide model support, optimized   | C++ deps, larger binary     |
| **burn**                 | Pure Rust, GPU support, modern API      | Very new, smaller ecosystem |
| **tract**                | Pure Rust, ONNX support, lightweight    | Less active development     |

**Recommendation:** Start with `candle` for pure Rust simplicity, fall back to `ort` if model
support is needed.

### Potential ML Features

| Feature                 | Model Type                   | Use Case                                      |
| ----------------------- | ---------------------------- | --------------------------------------------- |
| Semantic skill matching | Sentence embeddings          | Match skills beyond exact keywords            |
| Job classification      | Text classifier              | Auto-categorize jobs (remote, contract, etc.) |
| Resume section parsing  | NER model                    | Extract experience, education, skills         |
| Job quality scoring     | Regression model             | Predict job posting quality/legitimacy        |
| Cover letter generation | Small LLM (Phi-2, TinyLlama) | Generate personalized cover letters           |

### Implementation Plan

1. **Phase 1: Infrastructure**
   - Add `candle` to Cargo.toml with feature flag `embedded-ml`
   - Create `src/core/ml/` module structure
   - Implement model loading/caching from app resources

2. **Phase 2: Sentence Embeddings**
   - Ship quantized all-MiniLM-L6-v2 (~20MB)
   - Use for semantic skill matching in resume matcher
   - Fall back to keyword matching if ML disabled

3. **Phase 3: Additional Models**
   - Job classification model
   - Resume section NER
   - Quality scoring

4. **Phase 4: Optional Small LLM**
   - Ship Phi-2 or TinyLlama (~1-2GB) as optional download
   - Use for cover letter generation
   - Keep as opt-in due to size

### Size Considerations

| Model            | Size (Quantized) | Purpose             |
| ---------------- | ---------------- | ------------------- |
| all-MiniLM-L6-v2 | ~20MB            | Sentence embeddings |
| DistilBERT       | ~65MB            | Text classification |
| Phi-2            | ~1.5GB           | Text generation     |
| TinyLlama        | ~600MB           | Text generation     |

Base app should stay under 100MB. Larger models (LLMs) should be optional downloads.

---

## Feature Details

### Job Scrapers (Working)

Current Rust scraper adapters are integrated with scheduler and Settings UI.

- LinkedIn: User-opened search links only; no background monitoring or session
  credential collection
- USAJobs: Requires free API key and user email
- SimplyHired and Glassdoor: May return empty results when blocked by anti-bot protection

### AI Resume-Job Matcher (Working)

Automatically parse resumes and match skills against job requirements.

- PDF parsing with skill extraction (300+ skills, 10 categories)
- Multi-factor matching (skills, experience, education)
- Confidence scoring per job match
- Skills database with proficiency levels
- 6 Tauri commands exposed

### Salary AI (Working)

Data-driven compensation insights.

- H1B data-based salary predictions
- Salary benchmarks by role/location/company
- Seniority-level aware predictions
- Offer comparison and negotiation insights
- 4 Tauri commands exposed

### Market Intelligence (Working)

Analytics and trend visualization.

- Daily market snapshots
- Skill demand trends over time
- Salary trends by region
- Company hiring velocity
- Location job density
- Market alerts for anomalies
- 5 Tauri commands exposed

### Desktop Notifications (Working)

Native OS notifications via Tauri plugin.

- Notifies on high-match job discoveries
- Integrated into Dashboard

### Application Assist (v2.0 - COMPLETE)

Human-in-the-loop form preparation.

- Visible browser review flow
- 7 ATS platforms: Greenhouse, Lever, Workday, Taleo, iCIMS, BambooHR, Ashby
- Application profile for contact info, links, work authorization
- Saved screening answers with plain question-text matching
- CAPTCHA detection with user prompts
- User always clicks Submit
- 18 Tauri commands exposed

See [docs/features/one-click-apply.md](features/one-click-apply.md) for full documentation.

---

## Development Policy: No Backward Compatibility (Pre-v2.1.0)

**v2.1.0 is the first official public release. No users exist before that.**

### What This Means

- **NO incremental migrations** - Modify schema files directly
- **NO backward compatibility work** - No one has data to preserve
- **DELETE/consolidate migrations** when refactoring schema
- **Focus on features** - Don't waste time on migration infrastructure

### Schema Change Process (Pre-v2.1.0)

1. Edit the existing migration file directly (or create new consolidated file)
2. Delete database and run `cargo sqlx database reset` if needed
3. No need for "up" and "down" migrations

### When Migrations Start

- v2.1.0 will freeze the schema baseline
- All migrations from that point forward will be incremental
- Users upgrading from v2.1.0+ will have proper migration support

---

## Technical Status

### Code Quality

- All Rust code compiles with 0 errors
- Clippy passes with 0 warnings (`-D warnings`)
- Test counts vary; use fresh local and CI output for current pass/fail status
- Integration tests: use fresh `cd src-tauri && cargo test --test '*' -- --list` output for current count
- Component tests: use fresh `npm run test:run -- --reporter=verbose` output for current count
- E2E tests: Playwright test suite
- All modules enabled and functional
- **190 registered Tauri commands** for backend modules
- 12 scheduled source adapters with parallel execution
- Ghost job detection with repost tracking
- Backend persistence for job-search records and preferences, with frontend
  localStorage limited to non-authoritative UI preferences, caches, sanitized
  error reports, and transient recovery hints
- Application Assist with 7 ATS platforms
- Custom React hooks for optimistic updates, pagination, form validation
- Enhanced error boundaries with component-level isolation

### Resolved Technical Debt

- [x] SQLite MEDIAN() - computed in Rust instead
- [x] SQLx query! macros - converted to runtime queries
- [x] All compilation errors fixed
- [x] All clippy warnings fixed (with comprehensive lint configuration)
- [x] Current scheduled source adapters integrated
- [x] Desktop notifications implemented
- [x] All backend modules exposed via Tauri commands
- [x] Accessibility improvements (ARIA labels, keyboard nav, focus styles)
- [x] Form validation (email format validation in Settings)
- [x] Virtual list for large job lists
- [x] Error boundaries for graceful failures
- [x] Advanced search with boolean operators
- [x] Interview scheduler with iCal export
- [x] Company research panel with known companies database
- [x] **v2.5.1** Resume to Application Assist integration (resume file path wired)
- [x] **v2.5.1** PDF export implemented (browser print method)
- [x] **v2.5.1** Scraper retry logic with exponential backoff
- [x] **v2.5.1** Scraper response caching (5-min TTL)
- [x] **v2.5.1** ARIA accessibility for 12 components
- [x] **v2.5.1** useEffect cleanup for async components
- [x] **v2.5.1** Recharts circular dependency fix
- [x] **v2.5.1** Console.log cleanup (debug statements removed)
- [x] **v2.5.1** 248 new component tests (16 test files)

### Remaining Work

- [x] Email notifications frontend UI
- [x] Frontend pages for ATS, Resume, Salary, Market features
- [x] Virtual list optimization
- [x] Keyboard shortcuts
- [x] Advanced notification filtering
- [x] Additional job scrapers (WeWorkRemotely, BuiltIn, HN)
- [x] Add comprehensive integration tests (P3 complete)
- [ ] E2E tests with Playwright
- [ ] **File modularization (v1.5)** - See Technical Debt below

---

## Technical Debt: File Modularization (v1.5 COMPLETE)

The v1.5 modularization effort successfully split 7 oversized files into smaller, focused modules.

### Completed Splits

#### Rust Backend Modules

| Module                       | Before | After             | Files Created                                                                                   |
| ---------------------------- | ------ | ----------------- | ----------------------------------------------------------------------------------------------- |
| `db/mod.rs`                  | 4442   | 85                | types.rs, connection.rs, crud.rs, queries.rs, interactions.rs, analytics.rs, ghost.rs, tests.rs |
| `db/integrity.rs`            | 2517   | Split into `db/integrity/` | mod.rs (85), types.rs, checks.rs, backups.rs, diagnostics.rs, tests.rs                          |
| `scheduler/mod.rs`           | 2955   | ~300              | types.rs, pipeline.rs, workers/{mod,scrapers,scoring,persistence}.rs, tests.rs                  |
| `market_intelligence/mod.rs` | 2703   | ~400              | computations.rs, queries.rs, utils.rs, tests.rs                                                 |
| `config/mod.rs`              | 2343   | ~300              | types.rs, defaults.rs, validation.rs, io.rs, tests.rs                                           |
| `ats/mod.rs`                 | 2082   | ~300              | types.rs, tracker.rs, reminders.rs, interview.rs, tests.rs                                      |
| `salary/mod.rs`              | 2026   | 59                | types.rs (98), analyzer.rs (213), tests.rs (853)                                                |

#### React Frontend

| File            | Before | After | Files Created                                                                                                                                                                                                                            |
| --------------- | ------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dashboard.tsx` | 2315   | 672   | DashboardTypes.ts, DashboardIcons.tsx, 5 hooks (useDashboardFilters, useDashboardSearch, useDashboardJobOps, useDashboardSavedSearches, useDashboardAutoRefresh), 3 UI components (DashboardHeader, DashboardStats, DashboardFiltersBar) |

### Remaining Lower Priority

| File                | Lines | Notes                                             |
| ------------------- | ----- | ------------------------------------------------- |
| `scrapers/lever.rs` | 2256  | Mostly tests - extract when needed                |
| `resume/mod.rs`     | 1727  | Split parser, matcher, tests                      |
| `commands/mod.rs`   | 1278  | Could split by domain (jobs, ats, resume, salary) |

### Frontend Architecture

The current flat `src/components/` directory contains 70+ files. A future refactor should organize into:

Target frontend layout:

- `src/features/`: feature modules by domain
- `src/features/dashboard/`: Dashboard page and related components
- `src/features/dashboard/components/`: JobCard, VirtualJobList, GhostIndicator
- `src/features/dashboard/hooks/`: dashboard filters, search, job operations, and saved searches
- `src/features/dashboard/Dashboard.tsx`: dashboard feature entrypoint
- `src/features/applications/`: application tracking
- `src/features/resume/`: resume matcher, builder, and optimizer
- `src/features/automation/`: Application Assist
- `src/features/market/`: market intelligence
- `src/features/salary/`: salary predictions
- `src/features/settings/`: settings and setup wizard
- `src/components/`: shared UI components only
- `src/components/ui/`: Button, Card, Badge, Input, Modal
- `src/components/layout/`: Navigation, FocusTrap, SkipToContent
- `src/components/feedback/`: ErrorBoundary, LoadingSpinner, EmptyState
- `src/hooks/`: shared hooks
- `src/contexts/`: global contexts such as Theme, Keyboard, and Toast
- `src/types/`: shared TypeScript types
- `src/utils/`: utility functions

**Why deferred:** Requires 100+ import path updates. Not worth the risk before Reddit launch.
**Target:** v2.6 with comprehensive import path migration script.

- `config/validation.rs` - Validation logic (~400 lines)
- `config/defaults.rs` - Default values (~200 lines)
- `config/tests.rs` - Tests (~900 lines)

#### `src/pages/Dashboard.tsx` (2315 lines)

**Split Strategy:**

- `pages/Dashboard.tsx` - Main layout and state (~400 lines)
- `components/dashboard/JobList.tsx` - Virtual job list (~400 lines)
- `components/dashboard/Filters.tsx` - Filter sidebar (~300 lines)
- `components/dashboard/SearchBar.tsx` - Search with history (~250 lines)
- `components/dashboard/StatsPanel.tsx` - Statistics display (~200 lines)
- `components/dashboard/GhostFilter.tsx` - Ghost job filtering (~150 lines)

#### `src-tauri/src/core/scrapers/lever.rs` (2256 lines)

**Problem:** Most of the file is tests.
**Split Strategy:**

- Keep `lever.rs` with implementation (~500 lines)
- Move tests to `scrapers/tests/lever_tests.rs` (~1750 lines)

#### `src-tauri/src/core/ats/mod.rs` (2082 lines)

**Split Strategy:**

- `ats/mod.rs` - ApplicationTracker and types (~300 lines)
- `ats/applications.rs` - Application CRUD (~400 lines)
- `ats/reminders.rs` - Reminder logic (~300 lines)
- `ats/timeline.rs` - Timeline/audit trail (~300 lines)
- `ats/tests.rs` - Tests (~800 lines)

### Priority 4 - Low (1000-2000 lines)

| File                               | Lines | Action                                             |
| ---------------------------------- | ----- | -------------------------------------------------- |
| `resume/mod.rs`                    | 1727  | Extract parser, matcher, tests                     |
| `market_intelligence/analytics.rs` | 1645  | Consider merging into trends.rs                    |
| `notify/teams.rs`                  | 1552  | Extract tests (~1000 lines)                        |
| `notify/slack.rs`                  | 1542  | Extract tests (~1000 lines)                        |
| `commands/mod.rs`                  | 1278  | Split by domain: jobs, ats, resume, salary, market |
| `Settings.tsx`                     | 1142  | Extract section components                         |

### Refactoring Guidelines

1. **Test Extraction First** - Many files are large due to inline tests. Extract `#[cfg(test)]`
   modules to `tests/` subdirectories first.

2. **Preserve Public API** - Use `mod.rs` to re-export all public items so external callers
   don't need changes.

3. **One PR Per File** - Each file refactoring should be a separate PR to ease review.

4. **Run Full Test Suite** - After each refactor: `cargo test` and `npm run typecheck`

5. **Update Imports** - Use IDE refactoring tools to update import paths automatically.

---

## Contributing

See [CONTRIBUTING.md](developer/CONTRIBUTING.md) for how to contribute.

Priority areas for contribution:

1. **File modularization** - Help split oversized files (see Technical Debt section)
2. Integration and E2E tests
3. Additional job board scrapers
4. UI/UX improvements
5. Performance optimization
6. Documentation improvements
