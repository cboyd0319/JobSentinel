# JobSentinel Roadmap

**Last Updated:** January 2026

## Current Version: 1.0.0-alpha

### Working Features
- Job scrapers: Greenhouse, Lever, JobsWithGPT, LinkedIn, Indeed
- Application Tracking System (ATS): Kanban board, reminders, timeline, ghosting detection
- AI Resume-Job Matcher: PDF parsing, skill extraction, matching
- Salary AI: Benchmarks, predictions, offer comparison, negotiation scripts
- Market Intelligence: Trends, snapshots, alerts, hiring velocity
- Multi-factor scoring algorithm
- Multi-channel notifications: Slack, Discord, Teams, Desktop
- SQLite database with full-text search
- Scheduler for periodic scraping
- React 19 frontend with setup wizard

### v1.1 Features (COMPLETED)

| Feature | Status | Notes |
|---------|--------|-------|
| Email notifications (SMTP) | **Done** | Full UI in Settings |
| Frontend pages for ATS/Resume/Salary/Market | **Done** | 4 new pages with navigation |
| GitHub Actions CI/CD | **Done** | Multi-platform build/test |

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
- 290 tests passing, 20 ignored (require file-based database or are doc examples)
- All modules enabled and functional
- 25 new Tauri commands for backend modules

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

### Remaining Work
- [x] Email notifications frontend UI
- [x] Frontend pages for ATS, Resume, Salary, Market features
- [ ] Add comprehensive integration tests

---

## Contributing

See [CONTRIBUTING.md](developer/CONTRIBUTING.md) for how to contribute.

Priority areas for contribution:
1. Frontend UI pages for new features
2. Email notification frontend integration
3. UI/UX improvements
4. Additional test coverage
