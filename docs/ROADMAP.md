# JobSentinel Roadmap

**Last Updated:** January 16, 2026

## Current Version: 1.3.1

### Working Features (v1.3.1)
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
- 2008 tests passing, 20 ignored (require file-based database or are doc examples)
- All modules enabled and functional
- 47 Tauri commands for backend modules
- 13 job board scrapers with parallel execution

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

---

## Contributing

See [CONTRIBUTING.md](developer/CONTRIBUTING.md) for how to contribute.

Priority areas for contribution:
1. Integration and E2E tests
2. Additional job board scrapers
3. UI/UX improvements
4. Performance optimization
5. Documentation improvements
