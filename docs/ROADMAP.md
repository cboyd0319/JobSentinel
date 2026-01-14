# JobSentinel Roadmap

**Last Updated:** January 2026

## Current Version: 1.0.0-alpha

### Working Features
- Job scrapers: Greenhouse, Lever, JobsWithGPT
- Application Tracking System (ATS): Kanban board, reminders
- Multi-factor scoring algorithm
- Multi-channel notifications: Slack, Discord, Teams
- SQLite database with full-text search
- Scheduler for periodic scraping
- React 19 frontend with setup wizard

### v1.1 Planned Features

| Feature | Status | Blocker |
|---------|--------|---------|
| AI Resume-Job Matcher | 65% | Type mismatches |
| Salary Negotiation AI | 50% | SQLite MEDIAN() |
| Job Market Intelligence | 60% | SQLite MEDIAN() |
| Email notifications (SMTP) | Code exists | Integration |
| LinkedIn scraper | 30% | API incomplete |
| Indeed scraper | 30% | API incomplete |

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

### AI Resume-Job Matcher (v1.1)
Automatically parse resumes and match skills against job requirements.
- PDF/DOCX parsing with skill extraction
- Semantic similarity matching
- "Skills gap" visualization
- Recommendations for skill development

### Salary Negotiation AI (v1.1)
Data-driven compensation insights.
- Salary benchmarks by role/location/company
- Market rate predictions
- Negotiation talking points

### Job Market Intelligence (v1.1)
Analytics and trend visualization.
- Skill demand trends over time
- Salary trends by region
- Company hiring patterns

### One-Click Apply (v2.0+)
Automated application submission.
- Headless browser automation
- Form field detection and filling
- Requires explicit user consent
- Legal review needed for ToS compliance

---

## Technical Debt

### Priority Fixes
1. Replace SQLite MEDIAN() with compatible alternative
2. Complete LinkedIn/Indeed API integration
3. Add comprehensive integration tests
4. Set up CI/CD pipeline

### Code Quality
- All Rust code compiles with 0 errors
- Clippy passes (minor warnings for unused LinkedIn structs)
- 256 tests passing, 13 ignored

---

## Contributing

See [CONTRIBUTING.md](developer/CONTRIBUTING.md) for how to contribute.

Priority areas for contribution:
1. LinkedIn/Indeed scraper completion
2. SQLite MEDIAN() workaround implementation
3. Additional notification channels
4. UI/UX improvements
