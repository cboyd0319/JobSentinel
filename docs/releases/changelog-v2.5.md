# Changelog Archive: v2.5

This archive contains historical entries moved out of the root
[CHANGELOG.md](../../CHANGELOG.md) during the v2.9.1 maintenance cleanup so
current release history stays small and reviewable.

## [2.5.5] - 2026-01-24

### Added - Feature Expansion & Auto-Apply Enhancement

Major feature expansion including new scrapers, ML-enhanced ghost detection,
dashboard widgets, and complete one-click auto-apply integration.

#### New Job Board Scrapers

- **SimplyHired Scraper** - Query-based job search with location filtering
  - HTML scraping with CSS selectors for job cards
  - Graceful Cloudflare handling (returns empty instead of error)
  - Configurable result limit

- **Glassdoor Scraper** - Software engineer job search by location
  - HTML scraping with job listing extraction
  - Graceful Cloudflare handling (returns empty instead of error)
  - San Francisco and other major city support

#### ML-Enhanced Ghost Detection

- **Gradient Boosting Model** - Machine learning model for ghost job prediction
  - 12 engineered features: age, repost count, description vagueness, requirements extremity
  - Training pipeline with cross-validation
  - Model persistence via bincode serialization
  - Soft fallback to rule-based detection when model unavailable
  - Feature importance tracking for explainability

- **Model Features**:
  - `age_days` - Days since job was posted
  - `repost_count` - Number of times job has been reposted
  - `description_length` - Word count of job description
  - `has_salary` - Whether salary information is included
  - `requirements_count` - Number of listed requirements
  - `vague_language_ratio` - Ratio of vague words to total words
  - `company_open_positions` - Total open positions at company
  - `title_seniority_mismatch` - Mismatch between title and experience requirements

#### Dashboard Widgets

- **Salary Trends Widget** - Visualize salary trends over time
  - Line chart with average, min, max salary bands
  - Filterable by job title, location, and time range

- **Application Stats Widget** - Track application metrics
  - Applications by status (Applied, Interviewed, Offered, Rejected)
  - Weekly/monthly trend comparison
  - Response rate calculation

- **Scraper Health Widget** - Real-time scraper status
  - Health indicators for all 15 scrapers
  - Last successful run timestamp
  - Jobs found in last run

#### ATS Live Score Panel (Resume Builder)

- **Real-time ATS Scoring** - Live score updates as you edit resume
  - Keyword match percentage with specific matches highlighted
  - Format compliance checklist (section headers, bullet points, fonts)
  - Overall ATS compatibility score (0-100)

- **Job-Specific Optimization** - Target score for specific job postings
  - Side-by-side comparison with job requirements
  - Missing keyword suggestions
  - Improvement tips per section

#### One-Click Auto-Apply Integration (Complete)

- **Screening Question Auto-Fill** - Automatic answers for common questions
  - Regex pattern matching for question detection
  - Pre-configured patterns for years of experience, salary expectations,
    relocation, visa status, remote preference, and start date
  - Custom pattern support via Settings
  - JavaScript DOM traversal for form field detection

- **Attempt Tracking** - Track application attempts in database
  - `automation_attempts` table with status, timestamps, filled fields
  - Per-job attempt history
  - Success rate tracking

- **Submit Confirmation Modal** - Post-fill workflow
  - "Did you submit?" confirmation after browser close
  - Marks attempt as submitted in database
  - Helps track actual submission status

- **New Tauri Commands**:
  - `mark_attempt_submitted` - Mark an automation attempt as submitted
  - `get_attempts_for_job` - Get all attempts for a specific job

#### Job Application Templates (Expanded)

- **Template Categories** - Organized templates by use case
  - Cover Letters: General, Technical, Startup, Executive
  - Thank You Notes: Post-Interview, Post-Offer
  - Follow-Up: Application Status, Interview Request

- **Smart Placeholder System** - Dynamic content insertion
  - `{company}`, `{position}`, `{hiring_manager}`, `{date}`
  - `{years_experience}`, `{key_skill}`, `{company_project}`
  - Preview mode with placeholder highlighting

### Changed

- Live scraper tests now include SimplyHired and Glassdoor
- Ghost detection defaults to ML model when trained
- FormFiller accepts screening answers via `with_screening_answers()` builder
- ApplyButton tracks attempts via localStorage and confirms submission

### Tests

- **2,913 total tests** (Backend: 2,197 | Frontend: 716)
- New screening answer matching tests (6 tests)
- Live scraper tests for SimplyHired and Glassdoor
- All E2E pipeline tests passing

---

## [2.5.4] - 2026-01-24

### Added - UX Improvements for Non-Technical Users

Making JobSentinel accessible to everyone, not just developers.

#### Email Provider Templates

One-click SMTP configuration for popular email providers:

- **Gmail** - Auto-fills `smtp.gmail.com:587` with TLS, links to App Password creation
- **Outlook** - Auto-fills `smtp-mail.outlook.com:587` with TLS
- **Yahoo** - Auto-fills `smtp.mail.yahoo.com:587`, links to Yahoo Security Settings
- **Custom** - Manual entry for other providers

#### Ghost Detection Presets

No more tweaking 6 different sliders - just pick a mode:

| Preset | Stale | Repost | Description |
| --- | --- | --- | --- |
| Lenient | 120 days | 5x | Shows most jobs, rarely flags anything |
| Balanced | 60 days | 3x | Good default, flags obviously stale jobs |
| Strict | 30 days | 2x | Aggressively filters old/reposted jobs |

#### Security Trust Indicators

Visual badges showing where credentials are stored:

- `Stored in macOS Keychain` - macOS users
- `Stored in Windows Credential Manager` - Windows users
- `Stored in System Keyring` - Linux users

Appears next to Slack webhook, SMTP password, LinkedIn cookie, Discord webhook,
Teams webhook, Telegram bot token, and USAJobs API key.

#### Smart Job Board Recommendations

Context-aware suggestions based on your preferences:

- Remote work enabled? Suggests RemoteOK, WeWorkRemotely
- Startup keywords? Suggests YC Startups
- Tech keywords? Suggests HN Who's Hiring, Dice
- Government keywords? Suggests USAJobs
- US tech hub cities? Suggests BuiltIn

#### USAJobs Guided Setup

Step-by-step flow for federal job seekers:

1. Quick Setup panel appears when USAJobs enabled
2. Numbered steps explain the process
3. "Get Free API Key" button links directly to signup page
4. Clearer field labels and hints

#### Windows & Linux LinkedIn Auto-Connect

Full automatic cookie extraction now works on all platforms:

| Platform | Method                                  |
| -------- | --------------------------------------- |
| macOS    | WKHTTPCookieStore (objc2)               |
| Windows  | WebView2 via Tauri's cookies_for_url()  |
| Linux    | WebKitGTK via Tauri's cookies_for_url() |

No more manual cookie copying on any platform!

#### Files Changed

- `src/pages/Settings.tsx` - All UX improvements (+281 lines)
- `src-tauri/src/commands/linkedin_auth.rs` - Cross-platform cookie extraction

---

## [2.5.3] - 2026-01-24

### Added - LinkedIn Auto-Connect (Zero-Copy Authentication)

**User Experience Revolution:** LinkedIn authentication now requires zero
technical knowledge. No more copying cookies from DevTools, just log in
normally.

#### How It Works

1. Click "Connect LinkedIn" in Settings
2. Log in normally in the window that opens (username, password, 2FA if needed)
3. Done! Cookie extracted automatically, stored securely in OS keychain

#### Technical Implementation

- **Native WebKit Integration (macOS):** Uses `WKHTTPCookieStore` via objc2 to
  extract cookies directly from the system cookie store
- **Tauri 2 Navigation Monitoring:** `WebviewWindowBuilder.on_navigation()`
  detects successful login by URL pattern matching
- **Secure Storage:** Cookie stored in OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- **Platform Support:** Full automatic extraction on macOS; Windows/Linux fall back to manual entry

#### New Dependencies (macOS only)

```toml
[target.'cfg(target_os = "macos")'.dependencies]
objc2 = "0.5"
objc2-foundation = { version = "0.2", features = ["NSString", "NSArray", "NSDictionary", "NSDate", "NSURL", "block2"] }
objc2-web-kit = { version = "0.2", features = ["WKWebsiteDataStore", "WKHTTPCookieStore", "block2"] }
block2 = "0.5"
```

#### Files Changed

- `src-tauri/src/commands/linkedin_auth.rs` - Complete rewrite with native cookie extraction
- `src-tauri/Cargo.toml` - Added objc2 ecosystem for macOS cookie access
- `src/pages/Settings.tsx` - Simplified LinkedIn UI (removed manual cookie input)

#### Tests

- 44 LinkedIn-related tests passing
- Frontend TypeScript: 0 errors
- Frontend ESLint: 0 errors

---

## [2.5.2] - 2026-01-24

### Fixed - Critical Onboarding and Settings Bugs

Comprehensive validation audit revealed and fixed 5 critical bugs affecting new
user onboarding and notification configuration.

#### Onboarding Fixes

- **Slack webhook now saved correctly** - SetupWizard was putting `webhook_url`
  in config JSON, but backend uses `#[serde(skip)]` so it was silently
  discarded. Now properly stores in OS keyring via `store_credential`.

- **Scrapers enabled by default** - After completing onboarding, all scrapers
  were disabled (`enabled: false`), resulting in 0 jobs being scraped. Now
  enables RemoteOK, HN Who's Hiring, and WeWorkRemotely by default.

- **Desktop notifications preserved** - When updating Slack config in wizard,
  the entire `alerts` object was replaced, losing desktop notification
  settings. Fixed to preserve existing alert config.

#### Settings Page Fixes

- **Discord, Teams, Telegram credentials can now be saved** - Frontend
  `CredentialKey` type only had 3 keys but backend has 6. Added missing:
  `discord_webhook`, `teams_webhook`, `telegram_bot_token`.

- **Discord, Teams, Telegram now have input fields** - Users could toggle these
  notification channels on, but there were no input fields to enter webhook
  URLs or bot tokens. Added proper input fields with secure storage indicators.

#### Validation Summary

- **2,911+ tests passing** (Backend: 2,195 | Frontend: 716)
- **E2E validated**: 1,337 jobs scraped, scored, and stored
- **All 4 working scrapers confirmed**: Greenhouse (1,177), Lever (89), HN Hiring (48), RemoteOK (23)

### Changed

- `src/pages/SetupWizard.tsx` - Credential storage, default scrapers, alert preservation
- `src/features/onboarding/careerProfileSetup.ts` - Career profiles now include default scrapers
- `src/pages/Settings.tsx` - Added 3 credential types and input fields

---

## [2.5.1] - 2026-01-18

### Added - Code Quality & Feature Completion Sprint

Major improvements to existing features, code quality, accessibility, and test coverage.

#### Feature Completions

- **Resume to Application Assist Integration** - Resume file path now flows from
  Resume Builder to Application Assist
  - Added `resume_file_path` field to ApplicationProfile
  - File picker in ProfileForm.tsx for resume selection
  - FormFiller receives resume path for ATS form uploads

- **PDF Export Implementation** - Browser-based PDF export for resumes
  - New `export_resume_html` Tauri command returns print-ready HTML
  - ResumeBuilder uses browser print dialog for PDF generation
  - Works cross-platform without external dependencies

#### Scraper Reliability

- **HTTP Retry Logic** - Exponential backoff for transient failures
  - `get_with_retry()` and `post_with_retry()` in http_client.rs
  - Retries on 429 (rate limit) and 5xx errors
  - Backoff: 1s to 2s to 4s to 8s (max 3 retries)
  - Respects Retry-After header when present
  - Updated Indeed, Greenhouse, LinkedIn scrapers

- **Response Caching** - In-memory cache to reduce API load
  - 5-minute cache duration (configurable)
  - `get_with_cache()` function in http_client.rs
  - Hit/miss statistics with `cache_stats()`
  - Thread-safe with tokio RwLock

#### Accessibility (WCAG 2.1 AA)

- **ARIA Attributes** - Added to 12 components missing accessibility
  - LocationHeatmap, MarketSnapshotCard, VirtualJobList
  - CompanyAutocomplete, StatCard, CareerProfileSelector
  - MarketAlertCard, TrendChart, KeyboardShortcutsHelp
  - ScraperHealthDashboard, ProfileForm, ApplicationPreview
  - Extended Card and Badge components to accept ARIA props

#### Code Quality

- **Console Cleanup** - Removed 9 debug console.log statements
  - Kept legitimate error logging in catch blocks
  - Cleaned vitals.ts and localStorageMigration.ts

- **useEffect Cleanup** - Added AbortController to 4 components
  - ScraperHealthDashboard, ApplicationPreview
  - ApplicationProfile, Market
  - Prevents memory leaks on unmount

- **Recharts Fix** - Fixed circular dependency warnings
  - Changed to direct ES6 module imports
  - Added TypeScript declarations for direct imports

#### Performance

- **Lazy Loading** - Charts now loaded on-demand
  - TrendChart and AnalyticsPanel use React.lazy()
  - Reduces initial bundle load time
  - Charts chunk separated (387KB, loaded when needed)

#### Test Coverage

- **248 new component tests** across 16 test files
  - StatCard, LoadingSpinner, Dropdown, Input, HelpIcon (batch 1)
  - GhostIndicator, CompanyAutocomplete, VirtualJobList (batch 2)
  - MarketAlertCard, MarketSnapshotCard, LocationHeatmap (batch 2)
  - ProfileForm, ApplicationPreview, ScreeningAnswersForm, ApplyButton (batch 3)
  - ErrorBoundary, ModalErrorBoundary, PageErrorBoundary (batch 4)
  - FocusTrap, SkipToContent, Tooltip (batch 4)

### Changed

- Card and Badge components now extend React HTML attributes for ARIA support
- http_client.rs exports new retry and cache functions
- TrendChart.tsx and AnalyticsPanel.tsx use direct recharts imports

### Fixed

- Recharts circular dependency build warnings
- useEffect memory leaks in async data fetching
- Missing ARIA labels causing screen reader issues

---

## [2.5.0] - 2026-01-18

### Added - Market Intelligence UI

Complete visualization layer for Market Intelligence module with interactive charts and tabbed layout.

#### New Components

- **MarketSnapshotCard** - Daily market summary with total jobs, new jobs, remote %, sentiment
- **TrendChart** - Recharts-powered line/bar charts for skill and company trends
- **MarketAlertCard** - Alert display with severity coloring and mark-as-read
- **MarketAlertList** - Alert list with bulk mark-all-read
- **LocationHeatmap** - Interactive grid showing job density by location

#### Market.tsx Overhaul

- **Tabbed Layout** - Overview, Skills, Companies, Locations, Alerts tabs
- **Market Snapshot Display** - Top-level daily stats with sentiment indicator
- **Skill Demand Charts** - Bar chart of trending skills with growth indicators
- **Company Hiring Charts** - Bar chart of most active companies with table view
- **Location Heatmap** - Interactive grid with click-to-detail
- **Alert Management** - Mark individual or all alerts as read

#### Backend Enhancements

- **Enhanced SkillTrend** - Added `change_percent` and `trend_direction` fields
- **Enhanced CompanyActivity** - Added `avg_salary` and `growth_rate` fields
- **Enhanced LocationHeat** - Added `remote_percent` field
- **New Tauri Commands**:
  - `get_market_snapshot` - Get latest market snapshot
  - `get_historical_snapshots` - Get snapshots for last N days
  - `mark_alert_read` - Mark single alert as read
  - `mark_all_alerts_read` - Mark all alerts as read

#### TypeScript Alignment

- All Market interfaces now match Rust backend exactly
- Fixed type mismatches in Market.tsx
- Added className support to Badge component

### Changed

- Market.tsx completely rewritten with new tabbed layout
- Badge component now accepts className prop
- TrendChart uses simplified string-based keys

### Tests

- Rust backend compiles with 4 warnings (dead code)
- Frontend builds successfully
- All 2085 tests continue to pass

---
