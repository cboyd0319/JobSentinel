# JobSentinel Roadmap

**Last Updated:** January 17, 2026

## Current Version: 2.3.0

### Working Features (v1.4.0)

- **13 Job scrapers**: Greenhouse, Lever, LinkedIn, Indeed, RemoteOK, Wellfound, WeWorkRemotely,
  BuiltIn, HN Who's Hiring, JobsWithGPT, Dice, YC Startup Jobs, ZipRecruiter
- Application Tracking System (ATS): Kanban board, reminders, timeline, ghosting detection
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

| Feature | Status | Notes |
|---------|--------|-------|
| Email notifications (SMTP) | **Done** | Full UI in Settings |
| Frontend pages for ATS/Resume/Salary/Market | **Done** | 4 new pages with navigation |
| GitHub Actions CI/CD | **Done** | Multi-platform build/test |

### v1.2 Features (COMPLETED)

| Feature | Status | Notes |
|---------|--------|-------|
| Virtual job list | **Done** | Performance for large lists |
| Error boundaries | **Done** | Graceful error handling |
| Command palette | **Done** | Cmd/Ctrl+K quick actions |
| Onboarding tour | **Done** | First-run guided tour |
| Export utilities | **Done** | CSV/JSON export |
| RemoteOK scraper | **Done** | JSON API for remote jobs |
| Wellfound scraper | **Done** | HTML scraping for startups |

### v1.3 Features (COMPLETED)

| Feature | Status | Notes |
|---------|--------|-------|
| Advanced notification filtering | **Done** | Keywords, salary, company lists |
| Keyboard shortcuts | **Done** | Power user navigation |
| Cover letter categories | **Done** | Template filtering and placeholders |
| Company research panel | **Done** | 40+ companies with tech stacks |
| Interview prep checklist | **Done** | 5-item checklist with reminders |
| Follow-up reminders | **Done** | Post-interview thank you tracking |
| Analytics weekly goals | **Done** | Application targets with progress |
| Company response rates | **Done** | Fastest/slowest responders |
| WeWorkRemotely scraper | **Done** | RSS feed for remote jobs |
| BuiltIn scraper | **Done** | City-specific tech jobs |
| HN Who's Hiring scraper | **Done** | Monthly thread parsing |
| Advanced search | **Done** | AND/OR/NOT, search history |

### v1.4 Features (COMPLETED)

| Feature | Status | Notes |
|---------|--------|-------|
| Ghost Job Detection | **Done** | Detect stale, reposted, and fake job postings |
| Ghost Filter UI | **Done** | Dashboard dropdown to filter by ghost status |
| Ghost Indicators | **Done** | Visual badges with severity coloring |
| Score Breakdown Tooltip | **Done** | Hover to see scoring factor breakdown |
| Application Conversion Stats | **Done** | Quick stats bar on Applications page |
| Resume Match Visualization | **Done** | Green/red skill match display |
| **Backend Persistence (E3)** | **Done** | localStorage → SQLite migration |
| Cover Letter Templates | **Done** | Persisted with categories in SQLite |
| Interview Prep Checklists | **Done** | Per-interview completion tracking |
| Saved Searches | **Done** | Filter presets stored in database |
| Search History | **Done** | Unlimited history (no 10-item cap) |
| Notification Preferences | **Done** | Advanced filtering stored in SQLite |
| **UI Polish (E4)** | **Done** | Cover letter auto-fill, shortcut badges, tour link |
| Cover Letter Auto-Fill | **Done** | "Use for Job" button fills placeholders |
| Keyboard Shortcut Badges | **Done** | ShortcutKey component for visual hints |
| Tour Integration | **Done** | "Take a guided tour" link in keyboard help |

### v1.5 - Code Quality & Refactoring (COMPLETED)

Major refactoring effort to modularize oversized files. All high-priority files have been split.

| File | Before | After | Status |
|------|--------|-------|--------|
| `db/mod.rs` | 4442 | 85 (+8 modules) | **Done** |
| `scheduler/mod.rs` | 2955 | ~300 (+7 modules) | **Done** |
| `market_intelligence/mod.rs` | 2703 | ~400 (+4 modules) | **Done** |
| `db/integrity.rs` | 2517 | 85 (+5 modules) | **Done** |
| `config/mod.rs` | 2343 | ~300 (+5 modules) | **Done** |
| `Dashboard.tsx` | 2315 | 672 (+11 files) | **Done** |
| `ats/mod.rs` | 2082 | ~300 (+5 modules) | **Done** |
| `scrapers/lever.rs` | 2256 | - | Deferred (mostly tests) |

### v1.6 - Additional Refactoring (COMPLETED)

Continued refactoring of remaining large files.

| File | Before | After | Status |
|------|--------|-------|--------|
| `commands/mod.rs` | 1732 | 94 (+9 domain modules) | **Done** |
| `scrapers/lever.rs` | 2379 | 183 (+tests.rs) | **Done** |
| `salary/mod.rs` | 2026 | 59 (+types, analyzer, tests) | **Done** |
| `resume/mod.rs` | 1831 | 440 (+types.rs, tests.rs) | **Done** |

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

Major security release with OS-native keyring integration, Resume Builder, and One-Click Apply automation.

| Feature | Status | Notes |
|---------|--------|-------|
| **OS-Native Keyring Integration** | **Done** | Secure credential storage |
| macOS Keychain support | **Done** | `keyring` crate with `apple-native` |
| Windows Credential Manager | **Done** | `keyring` crate with `windows-native` |
| Linux Secret Service | **Done** | `keyring` crate with `sync-secret-service` |
| Automatic migration | **Done** | Plaintext → keyring on first v2.0 launch |
| 5 credential commands | **Done** | store, retrieve, delete, has, get_status |
| Updated Settings UI | **Done** | Credential status indicators |
| **P3 Integration Tests** | **Done** | 76 tests across 4 files |
| **P4 Resume Builder + ATS Optimizer** | **Done** | Full resume creation and optimization |
| **P5 One-Click Apply** | **Done** | Form filling automation with human-in-the-loop |

**Credentials secured:**

- `smtp_password` - Email SMTP password
- `telegram_bot_token` - Telegram Bot API token
- `slack_webhook_url` - Slack incoming webhook URL
- `discord_webhook_url` - Discord webhook URL
- `teams_webhook_url` - Microsoft Teams webhook URL
- `linkedin_session_cookie` - LinkedIn session cookie

See [docs/security/KEYRING.md](security/KEYRING.md) for full documentation.

**P4 Resume Builder Features:**

- 7-step resume wizard (contact, summary, experience, education, skills, preview, export)
- 5 ATS-optimized templates (Classic, Modern, Technical, Executive, Military)
- DOCX export with professional formatting
- ATS Analyzer with keyword extraction and scoring
- Bullet point improver with 45+ power words
- 22 new Tauri commands

See [docs/features/resume-builder.md](features/resume-builder.md) for full documentation.

**P5 One-Click Apply Features:**

- Human-in-the-loop design (user clicks Submit manually)
- Application profile management (contact info, URLs, work authorization)
- Screening question auto-answers with regex patterns
- ATS platform detection (Greenhouse, Lever, Workday, Taleo, iCIMS, BambooHR, Ashby)
- Visible browser automation via Chrome DevTools Protocol
- CAPTCHA detection with user prompts
- Rate limiting (configurable max applications per day)
- 18 new Tauri commands

See [docs/features/one-click-apply.md](features/one-click-apply.md) for full documentation.

### v2.1 - Scraper Health Monitoring (COMPLETED)

Comprehensive health monitoring system for all 13 job board scrapers.

| Feature | Status | Notes |
|---------|--------|-------|
| **All 13 Scrapers Wired** | **Done** | Previously only 5/13 connected |
| **Health Dashboard** | **Done** | Settings → Troubleshooting |
| **Run History Tracking** | **Done** | Per-scraper execution logs |
| **Exponential Backoff Retry** | **Done** | Auto-retry on 429, 5xx errors |
| **Smoke Tests** | **Done** | Test individual or all scrapers |
| **LinkedIn Cookie Expiry** | **Done** | 30-day warning threshold |
| **9 New Tauri Commands** | **Done** | Health monitoring API |
| **4 New Database Tables** | **Done** | + 1 aggregation view |

**Scrapers now fully wired (previously missing 8):**

- RemoteOK, Wellfound, WeWorkRemotely, BuiltIn
- HN Who's Hiring, Dice, YC Startup Jobs, ZipRecruiter

**Health Dashboard features:**

- Summary stats (healthy/degraded/down/disabled scrapers)
- Scraper table with success rate, avg duration, jobs found
- Run history panel with error details
- Smoke test results modal
- Credential expiry warnings

See [docs/features/scrapers.md](features/scrapers.md) for full documentation.

### v2.3 - Advanced Resume Matching (COMPLETED)

Comprehensive resume enhancement with 7 major features for intelligent job matching.

| Feature | Status | Notes |
|---------|--------|-------|
| **Phase 1: Skill Validation UI** | **Done** | Edit/delete/add extracted skills |
| **Phase 2: Resume Library UI** | **Done** | Multiple resume management |
| **Phase 3: Experience Matching** | **Done** | Years of experience vs requirements |
| **Phase 4: Education Matching** | **Done** | Degree level comparison |
| **Phase 5: PDF Export** | **Done** | Browser print-to-PDF |
| **Phase 6: OCR Support** | **Done** | Scanned PDF parsing (optional) |
| **Phase 7: Enhanced Skill Database** | **Done** | 300+ skills, 10 categories |

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

- 300+ skills across 10 categories
- 100% offline - no external dependencies
- Deterministic, fast keyword matching

See [docs/features/resume-matcher.md](features/resume-matcher.md) for full documentation.

### v2.4+ Planned Features

| Feature | Status | Notes |
|---------|--------|-------|
| macOS support (.dmg) | Planned | Development done on macOS |
| Linux support (.deb, .rpm) | Planned | |
| Browser Extension | Designed | In-page job scoring |
| CI/CD Pipeline | Planned | Automated builds and releases |

### v3.0+ Future Ideas

- GCP Cloud Run / AWS Lambda deployment
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

| Framework | Pros | Cons |
|-----------|------|------|
| **candle** (HuggingFace) | Pure Rust, no C deps, growing ecosystem | Newer, less mature |
| **ort** (ONNX Runtime) | Mature, wide model support, optimized | C++ deps, larger binary |
| **burn** | Pure Rust, GPU support, modern API | Very new, smaller ecosystem |
| **tract** | Pure Rust, ONNX support, lightweight | Less active development |

**Recommendation:** Start with `candle` for pure Rust simplicity, fall back to `ort` if model
support is needed.

### Potential ML Features

| Feature | Model Type | Use Case |
|---------|------------|----------|
| Semantic skill matching | Sentence embeddings | Match skills beyond exact keywords |
| Job classification | Text classifier | Auto-categorize jobs (remote, contract, etc.) |
| Resume section parsing | NER model | Extract experience, education, skills |
| Job quality scoring | Regression model | Predict job posting quality/legitimacy |
| Cover letter generation | Small LLM (Phi-2, TinyLlama) | Generate personalized cover letters |

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

| Model | Size (Quantized) | Purpose |
|-------|------------------|---------|
| all-MiniLM-L6-v2 | ~20MB | Sentence embeddings |
| DistilBERT | ~65MB | Text classification |
| Phi-2 | ~1.5GB | Text generation |
| TinyLlama | ~600MB | Text generation |

Base app should stay under 100MB. Larger models (LLMs) should be optional downloads.

---

## Feature Details

### LinkedIn/Indeed Scrapers (Working)

Both scrapers fully integrated with scheduler and Settings UI.

- LinkedIn: Requires li_at session cookie, configurable query/location/remote-only
- Indeed: Query-based search with configurable radius and limit

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

### One-Click Apply (v2.0 - COMPLETE)

Human-in-the-loop form filling automation.

- Visible browser automation via Chrome DevTools Protocol
- 7 ATS platforms: Greenhouse, Lever, Workday, Taleo, iCIMS, BambooHR, Ashby
- Application profile for contact info, URLs, work authorization
- Screening question auto-answers with regex patterns
- CAPTCHA detection with user prompts
- User always clicks Submit manually (never auto-submit)
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
- 2104+ tests passing, 28 ignored (require file-based database or are doc examples)
- P3 Integration tests: 76 tests across 4 files (api_contract, scheduler, database, automation)
- P5 Automation tests: 19 tests (12 unit + 7 integration)
- All modules enabled and functional
- **117 Tauri commands** for backend modules (22 Resume Builder + 18 One-Click Apply)
- 13 job board scrapers with parallel execution
- Ghost job detection with repost tracking
- Backend persistence for all user data (localStorage → SQLite)
- One-Click Apply automation with 7 ATS platforms

### Resolved Technical Debt

- [x] SQLite MEDIAN() - computed in Rust instead
- [x] SQLx query! macros - converted to runtime queries
- [x] All compilation errors fixed
- [x] All clippy warnings fixed (with comprehensive lint configuration)
- [x] LinkedIn/Indeed scrapers integrated
- [x] Desktop notifications implemented
- [x] All backend modules exposed via Tauri commands
- [x] Accessibility improvements (ARIA labels, keyboard nav, focus styles)
- [x] Form validation (email format validation in Settings)
- [x] Virtual list for large job lists
- [x] Error boundaries for graceful failures
- [x] Advanced search with boolean operators
- [x] Interview scheduler with iCal export
- [x] Company research panel with known companies database

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

| Module | Before | After | Files Created |
|--------|--------|-------|---------------|
| `db/mod.rs` | 4442 | 85 | types.rs, connection.rs, crud.rs, queries.rs, interactions.rs, analytics.rs, ghost.rs, tests.rs |
| `db/integrity.rs` | 2517 | → `db/integrity/` | mod.rs (85), types.rs, checks.rs, backups.rs, diagnostics.rs, tests.rs |
| `scheduler/mod.rs` | 2955 | ~300 | types.rs, pipeline.rs, workers/{mod,scrapers,scoring,persistence}.rs, tests.rs |
| `market_intelligence/mod.rs` | 2703 | ~400 | computations.rs, queries.rs, utils.rs, tests.rs |
| `config/mod.rs` | 2343 | ~300 | types.rs, defaults.rs, validation.rs, io.rs, tests.rs |
| `ats/mod.rs` | 2082 | ~300 | types.rs, tracker.rs, reminders.rs, interview.rs, tests.rs |
| `salary/mod.rs` | 2026 | 59 | types.rs (98), analyzer.rs (213), tests.rs (853) |

#### React Frontend

| File | Before | After | Files Created |
|------|--------|-------|---------------|
| `Dashboard.tsx` | 2315 | 672 | DashboardTypes.ts, DashboardIcons.tsx, 5 hooks (useDashboardFilters, useDashboardSearch, useDashboardJobOps, useDashboardSavedSearches, useDashboardAutoRefresh), 3 UI components (DashboardHeader, DashboardStats, DashboardFiltersBar) |

### Remaining (Lower Priority - v1.6+)

| File | Lines | Notes |
|------|-------|-------|
| `scrapers/lever.rs` | 2256 | Mostly tests - extract when needed |
| `resume/mod.rs` | 1727 | Split parser, matcher, tests |
| `commands/mod.rs` | 1278 | Could split by domain (jobs, ats, resume, salary) |

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

| File | Lines | Action |
|------|-------|--------|
| `resume/mod.rs` | 1727 | Extract parser, matcher, tests |
| `market_intelligence/analytics.rs` | 1645 | Consider merging into trends.rs |
| `notify/teams.rs` | 1552 | Extract tests (~1000 lines) |
| `notify/slack.rs` | 1542 | Extract tests (~1000 lines) |
| `commands/mod.rs` | 1278 | Split by domain: jobs, ats, resume, salary, market |
| `Settings.tsx` | 1142 | Extract section components |

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
