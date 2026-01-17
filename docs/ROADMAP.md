# JobSentinel Roadmap

**Last Updated:** January 16, 2026

## Current Version: 1.4.0

### Working Features (v1.4.0)
- **13 Job scrapers**: Greenhouse, Lever, LinkedIn, Indeed, RemoteOK, Wellfound, WeWorkRemotely, BuiltIn, HN Who's Hiring, JobsWithGPT, Dice, YC Startup Jobs, ZipRecruiter
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

### v1.5 - Code Quality & Refactoring (PLANNED)

Major refactoring effort to modularize oversized files. See **Technical Debt** section below.

| File | Lines | Target | Strategy |
|------|-------|--------|----------|
| `db/mod.rs` | 4442 | <500 each | Split: queries, migrations, types, tests |
| `scheduler/mod.rs` | 2955 | <600 each | Split: pipeline, workers, state, tests |
| `market_intelligence/mod.rs` | 2703 | <500 each | Split: trends, snapshots, alerts, analytics |
| `db/integrity.rs` | 2517 | <500 each | Split: validators, checks, repairs |
| `config/mod.rs` | 2343 | <500 each | Split: types, validation, defaults, io |
| `Dashboard.tsx` | 2315 | <400 each | Split: JobList, Filters, Stats, Search |
| `scrapers/lever.rs` | 2256 | <500 | Extract tests to separate file |
| `ats/mod.rs` | 2082 | <500 each | Split: applications, reminders, timeline |
| `commands/mod.rs` | 1278 | <300 each | Group by domain: jobs, ats, resume, salary |

### v2.0 Planned Features

| Feature | Status | Notes |
|---------|--------|-------|
| One-Click Apply Automation | 40% | Requires legal review |
| macOS support (.dmg) | Planned | Development done on macOS |
| Linux support (.deb, .rpm) | Planned | |
| Browser Extension | Designed | In-page job scoring |

### v3.0+ Future Ideas

- GCP Cloud Run / AWS Lambda deployment
- Multi-user support with web dashboard
- Mobile companion app (React Native)
- Company health monitoring (reviews, funding, red flags)
- GPT-powered cover letter generator

---

## Feature Details

### LinkedIn/Indeed Scrapers (Working)
Both scrapers fully integrated with scheduler and Settings UI.
- LinkedIn: Requires li_at session cookie, configurable query/location/remote-only
- Indeed: Query-based search with configurable radius and limit

### AI Resume-Job Matcher (Working)
Automatically parse resumes and match skills against job requirements.
- PDF parsing with skill extraction
- Semantic similarity matching
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

### One-Click Apply (v2.0+)
Automated application submission.
- Headless browser automation
- Form field detection and filling
- Requires explicit user consent
- Legal review needed for ToS compliance

---

## Technical Status

### Code Quality
- All Rust code compiles with 0 errors
- Clippy passes with 0 warnings (`-D warnings`)
- 2029+ tests passing, 20 ignored (require file-based database or are doc examples)
- All modules enabled and functional
- **70 Tauri commands** for backend modules (20 new for user data)
- 13 job board scrapers with parallel execution
- Ghost job detection with repost tracking
- Backend persistence for all user data (localStorage → SQLite)

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
- [ ] Add comprehensive integration tests
- [ ] E2E tests with Playwright
- [ ] **File modularization (v1.5)** - See Technical Debt below

---

## Technical Debt: File Modularization

### Priority 1 - Critical (4000+ lines)

#### `src-tauri/src/core/db/mod.rs` (4442 lines)
**Problem:** Monolithic database module with queries, types, migrations, and tests all in one file.

**Split Strategy:**
- `db/mod.rs` - Re-exports and Database struct (~100 lines)
- `db/types.rs` - Job, JobFilter, SearchResult structs (~200 lines)
- `db/queries.rs` - All SQL query functions (~800 lines)
- `db/migrations.rs` - Migration runner and schema (~300 lines)
- `db/search.rs` - Full-text search logic (~400 lines)
- `db/tests/` - Move all tests to separate module (~2500 lines)

### Priority 2 - High (2500+ lines)

#### `src-tauri/src/core/scheduler/mod.rs` (2955 lines)
**Split Strategy:**
- `scheduler/mod.rs` - Scheduler struct and public API (~200 lines)
- `scheduler/pipeline.rs` - Scraping pipeline logic (~500 lines)
- `scheduler/workers.rs` - Async worker management (~400 lines)
- `scheduler/state.rs` - State tracking and persistence (~300 lines)
- `scheduler/tests.rs` - Unit tests (~1500 lines)

#### `src-tauri/src/core/market_intelligence/mod.rs` (2703 lines)
**Split Strategy:**
- `market_intelligence/mod.rs` - Public API and types (~200 lines)
- `market_intelligence/trends.rs` - Skill trend analysis (~500 lines)
- `market_intelligence/snapshots.rs` - Daily snapshot logic (~400 lines)
- `market_intelligence/alerts.rs` - Alert detection (~300 lines)
- `market_intelligence/tests.rs` - Tests (~1300 lines)

#### `src-tauri/src/core/db/integrity.rs` (2517 lines)
**Split Strategy:**
- `db/integrity/mod.rs` - Public API (~100 lines)
- `db/integrity/validators.rs` - Field validation (~400 lines)
- `db/integrity/checks.rs` - Integrity checks (~500 lines)
- `db/integrity/repairs.rs` - Auto-repair logic (~400 lines)
- `db/integrity/tests.rs` - Tests (~1100 lines)

### Priority 3 - Medium (2000+ lines)

#### `src-tauri/src/core/config/mod.rs` (2343 lines)
**Split Strategy:**
- `config/mod.rs` - Config struct and load/save (~300 lines)
- `config/types.rs` - All config subtypes (~500 lines)
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
| `salary/mod.rs` | 1999 | Extract predictor, benchmarks, tests |
| `resume/mod.rs` | 1727 | Extract parser, matcher, tests |
| `market_intelligence/analytics.rs` | 1645 | Consider merging into trends.rs |
| `notify/teams.rs` | 1552 | Extract tests (~1000 lines) |
| `notify/slack.rs` | 1542 | Extract tests (~1000 lines) |
| `commands/mod.rs` | 1278 | Split by domain: jobs, ats, resume, salary, market |
| `Settings.tsx` | 1142 | Extract section components |

### Refactoring Guidelines

1. **Test Extraction First** - Many files are large due to inline tests. Extract `#[cfg(test)]` modules to `tests/` subdirectories first.

2. **Preserve Public API** - Use `mod.rs` to re-export all public items so external callers don't need changes.

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
