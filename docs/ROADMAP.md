# JobSentinel Roadmap

**Last Updated:** January 2026

## Current Version: 1.0.0-alpha

### Working Features
- Job scrapers: Greenhouse, Lever, JobsWithGPT
- Application Tracking System (ATS): Kanban board, reminders, timeline
- AI Resume-Job Matcher: PDF parsing, skill extraction, matching
- Salary AI: Benchmarks, predictions, offer comparison
- Market Intelligence: Trends, snapshots, alerts
- Multi-factor scoring algorithm
- Multi-channel notifications: Slack, Discord, Teams
- SQLite database with full-text search
- Scheduler for periodic scraping
- React 19 frontend with setup wizard

### v1.1 Planned Features

| Feature | Status | Notes |
|---------|--------|-------|
| Email notifications (SMTP) | Code exists | Integration needed |
| LinkedIn scraper | 30% | API incomplete |
| Indeed scraper | 30% | API incomplete |
| Desktop notifications | Planned | Tauri plugin |

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

### AI Resume-Job Matcher (Enabled)
Automatically parse resumes and match skills against job requirements.
- PDF parsing with skill extraction
- Semantic similarity matching
- Confidence scoring per job match
- Skills database with proficiency levels

### Salary AI (Enabled)
Data-driven compensation insights.
- H1B data-based salary predictions
- Salary benchmarks by role/location/company
- Seniority-level aware predictions
- Offer comparison and negotiation insights

### Market Intelligence (Enabled)
Analytics and trend visualization.
- Daily market snapshots
- Skill demand trends over time
- Salary trends by region
- Company hiring velocity
- Location job density
- Market alerts for anomalies

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
- 288 tests passing, 18 ignored (require file-based database or are doc examples)
- All modules enabled and functional

### Resolved Technical Debt
- [x] SQLite MEDIAN() - computed in Rust instead
- [x] SQLx query! macros - converted to runtime queries
- [x] All compilation errors fixed
- [x] All clippy warnings fixed

### Remaining Work
- [ ] Complete LinkedIn/Indeed API integration
- [ ] Add comprehensive integration tests
- [ ] Set up CI/CD pipeline
- [ ] Email notifications integration

---

## Contributing

See [CONTRIBUTING.md](developer/CONTRIBUTING.md) for how to contribute.

Priority areas for contribution:
1. LinkedIn/Indeed scraper completion
2. Email notification integration
3. UI/UX improvements
4. Additional test coverage
