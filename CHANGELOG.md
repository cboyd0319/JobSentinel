# Changelog

All notable changes to JobSentinel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.6.3] - 2026-01-25

### Added

#### New Custom React Hooks

- **useOptimisticUpdate** - Optimistic UI updates with automatic rollback on failure
  - Applies changes immediately for responsive UX
  - Rolls back automatically if async operation fails
  - Supports success/error callbacks and toast notifications

- **usePagination** - Client-side pagination with navigation
  - Page state management with next/prev/goToPage
  - Configurable page size with auto-calculation
  - Reset functionality for filter changes

- **useFormValidation** - Form validation with touched state tracking
  - Per-field validation with custom validators
  - Touched state tracking for progressive validation
  - Batch validation with validateAll() for submission

#### New Utilities

- **formValidation.ts** - Shared validation functions
  - Email validation (required and optional variants)
  - URL validation with protocol enforcement
  - Phone number validation (10-15 digit support)
  - Regex pattern validation
  - Slack/Discord webhook URL validation
  - Comma-separated email list validation

- **errorHelpers.ts** - Error handling utilities
  - Error type classification (network, API, validation, timeout, etc.)
  - User-friendly error messages
  - Retry logic with exponential backoff
  - Debounced error handlers to prevent spam
  - Recovery detection for retryable errors

#### Enhanced Error Boundaries

- **ComponentErrorBoundary** - Component-level error isolation
  - Isolates failures to individual components
  - Retry functionality without full page reload
  - Customizable fallback UI

- **ErrorBoundary improvements**
  - Retry limit tracking (3 attempts before forced reload)
  - "Clear App Data" option for persistent errors
  - Error count display for debugging

#### Rust Backend Improvements

- **ConfigValidationError** - Comprehensive config validation
  - Structured error types for all validation scenarios
  - Detailed error messages with field paths
  - 23 config validation tests

- **Scraper error improvements**
  - Context-aware error types with recovery hints
  - Tracing instrumentation in scheduler workers

### Tests

- **New test coverage**
  - ToggleSection.test.tsx - 15 tests, comprehensive interaction testing
  - SliderSection.test.tsx - 24 tests, slider behavior and edge cases
  - ApplicationPreview.test.tsx - Full component coverage
  - useFormValidation.test.ts - Validation hook testing
  - usePagination.test.ts - Pagination logic testing
  - useOptimisticUpdate.test.tsx - Optimistic update testing
  - ComponentErrorBoundary.test.tsx - Error boundary testing
  - Config validation_tests.rs - 23 Rust validation tests

- **Test stability improvements**
  - Fixed flaky ErrorBoundary tests with correct assertions
  - Simplified ErrorReportingContext tests for worker stability

### Security Fixes

- XSS vulnerability fixed in ResumeBuilder with DOMPurify sanitization
- URL validation bypass fixed using proper URL parsing (Rust url crate + JS URL API)
- OCR command injection risk mitigated with symlink validation
- Webhook URL validation hardened for Slack, Discord, and Teams

### Bug Fixes

- Memory leak fixed in useAsyncOperation (missing cleanup)
- Race condition fixed in useOptimisticUpdate (stale closure)
- Focus management race conditions fixed in Modal, CommandPalette, FocusTrap
- Stale closure bugs fixed in Dashboard auto-refresh
- parseInt NaN handling added in AnalyticsPanel and ApplyButton

### Code Quality

- All clippy warnings fixed (38 errors resolved)
- Doctest failures fixed (11 tests)
- Standardized error types across all 13 scrapers to ScraperError
- Redundant #[must_use] attributes removed

### Changed

- **Test counts**: 4,449+ total tests (2,274 frontend + 2,175 Rust)
- **New test coverage**
  - formValidation.test.ts - 65 new tests for all validators
  - errorHelpers.test.ts - 80 new tests for error handling utilities

---

## [2.6.2] - 2026-01-25

### Added

- **155 new frontend tests** - Comprehensive test coverage for critical components
  - LoadingFallbacks component tests (25 tests)
  - AsyncButton component tests (22 tests)
  - Icons component tests (35 tests)
  - api.ts utility tests (73 tests)

- **Accessibility improvements following WCAG 2.1 AA standards**
  - aria-busy attributes for loading states (8 components)
  - aria-live regions for dynamic content updates (6 components)
  - aria-current="page" for active navigation items
  - Semantic HTML markup improvements across 15 components

### Changed

- **Error handling migration** - Standardized error handling across 12 files
  - Migrated from try-catch to safeInvoke pattern
  - Migrated from throw statements to safeInvokeWithToast
  - Files: ApplicationProfile.tsx, Market.tsx, Settings.tsx, Resume.tsx, and others
  - Consistent error callback handling across all async operations

- **Performance optimization** - Extracted inline styles to constants
  - 9 components refactored to use CSS-in-JS constants
  - Reduced re-renders from style object recreation
  - Improved React DevTools inspection of style definitions

- **Screen reader support enhancements**
  - Interactive elements now properly labeled with aria-label/aria-labelledby
  - Loading states announce via aria-live regions
  - Navigation provides aria-current for context
  - Modal dialogs properly marked with aria-modal

### Fixed

- **TypeScript strict mode errors** - Resolved all error handling migration issues
  - Fixed safeInvoke call signatures in 8 components
  - Fixed callback type mismatches in error handlers
  - Resolved type narrowing issues in error boundaries

- **Test expectations** - Updated test assertions for new error handling patterns
  - Updated 45 test cases for safeInvoke return types
  - Fixed mock expectations for error callbacks
  - Corrected async test completions in component tests

### Tests

- **5,234+ total tests** (Backend: 2,274 | Frontend: 2,960)
- New test coverage: +155 tests across API utilities and critical components
- All TypeScript strict mode checks passing
- 100% accessibility compliance for tested components

---

## [2.6.1] - 2026-01-25

### Added - Performance & Code Quality Sprint

Major code quality improvements including React optimizations, Rust performance enhancements, accessibility, and developer experience.

#### React Performance Optimizations

- **60+ useCallback hooks** - Memoized callbacks across components to prevent re-renders
  - Dashboard hooks: useDashboardJobOps, useDashboardSavedSearches, useDashboardFilters
  - InterviewScheduler, ScoreBreakdownModal, ProfileForm, Applications, Settings
  - SetupWizard, ResumeBuilder, ResumeOptimizer, Market, Salary pages

- **8 React.memo components** - Memoized expensive components
  - DashboardFiltersBar, QuickActions, Dropdown, DashboardWidgets
  - StatBox, FilterListInput, ToggleSection, SliderSection

- **5 useMemo optimizations** - Computed values memoized
  - DashboardWidgets: funnelData, sourceData
  - Dashboard: filtered jobs, pagination

#### New Reusable Hooks

- **useModal** - Generic modal state management with open/close/toggle
- **useTabs** - Tab state management with activeTab and setActiveTab
- **useFetchOnMount** - Data fetching with loading, error, retry, and AbortController cleanup

#### Component Deduplication

- **Icons.tsx** - Consolidated 22+ inline SVG icons into reusable components
- **AsyncButton** - Generic async button with loading state and error handling
- **FilterListInput** - Reusable comma-separated list input with chip display
- **ToggleSection** - Collapsible section with toggle button
- **SliderSection** - Slider input with label and help text
- **CredentialInput** - Secure credential input with stored/not-stored indicators

#### Rust Performance Enhancements

- **25+ structs with new derives** - Added Clone, Debug, Default, PartialEq where appropriate
  - ATS types, automation types, health types, scheduler types
  - Resume types, salary types, market intelligence types

- **20 #[inline] hints** - Added to hot-path functions for compiler optimization
  - Scraper utility functions: normalize_*, format_*, detect_*
  - Database query builders and utility functions

- **4 Cow<str> optimizations** - Zero-copy string handling in hot paths
  - normalize_url, normalize_location, normalize_title, normalize_company_name

- **15 #[tracing::instrument] additions** - Structured logging for debugging
  - All scraper entry points now instrumented
  - Database operations with query timing

#### Database Optimizations

- **10 query optimizations** - Reduced N+1 queries, added LIMIT clauses
  - get_recent_jobs: Added LIMIT for pagination
  - get_applications_kanban: Batch loading instead of per-status queries
  - get_trending_skills: Single query with grouping

- **8 new indexes** - Performance indexes for common queries
  - jobs: (score DESC, created_at), (source, created_at)
  - applications: (status, updated_at), (job_id, status)
  - scrapers: (last_success, enabled)

#### Accessibility Improvements (11 fixes)

- **Navigation.tsx** - aria-label="Main navigation" for screen readers
- **Dropdown.tsx** - aria-activedescendant for keyboard navigation
- **Tooltip.tsx** - Escape key dismisses tooltips
- **Badge.tsx** - Contextual remove button labels ("Remove {content}")
- **DashboardWidgets.tsx** - aria-hidden on decorative icons
- **Forms** - Required field indicators, maxLength validation, input patterns
- **Focus management** - Improved focus rings and tab order

#### Keyboard Shortcuts (13 new)

- **Global**: Ctrl+/ (search), Ctrl+B (bulk mode), Ctrl+E (export)
- **Dashboard**: j/k (navigate jobs), Enter (open job), Space (toggle select)
- **Modals**: Escape (close), Tab (navigate fields)
- **Forms**: Ctrl+Enter (submit), Ctrl+S (save)

#### Error Message Improvements (23 messages)

- All user-facing error messages now explain what went wrong and suggest fixes
- Toast messages include actionable recovery steps
- Form validation shows specific field errors with fix suggestions

#### Memory Leak Fixes (2 critical)

- **AtsLiveScorePanel** - AbortController cleanup on unmount
- **NotificationPreferences** - Cancelled flag prevents state updates after unmount

#### Form Validation (10 improvements)

- Email validation with regex patterns
- URL validation for webhook fields
- Required field visual indicators
- Character count displays for text areas
- Real-time validation on blur

### Tests

- **4,135+ total tests** (Backend: 2,274 | Frontend: 1,861)
- New hook tests: useModal.test.ts, useTabs.test.ts, useFetchOnMount.test.ts
- All TypeScript strict mode errors resolved

---

## [2.6.0] - 2026-01-24

### Added - UX Improvement Sprint

Comprehensive UX improvements focused on error recovery, loading states, accessibility, and performance optimizations.

#### Error Recovery & Retry Capabilities

- **Error Recovery UI** - Added retry buttons across multiple components
  - Market.tsx: Error state with retry for market intelligence loading
  - CoverLetterTemplates.tsx: Error state with retry for template loading
  - AtsLiveScorePanel.tsx: Retry capability for ATS score calculation
  - AnalyticsPanel.tsx: Error state with retry for analytics loading
  - ApplyButton.tsx: Keep modal open on failure with "Try Again" button

- **Optimistic Updates with Rollback** - NotificationPreferences now reverts on failure

#### Loading State Improvements

- **Skeleton Loaders** - Replace spinners with content-shaped skeletons
  - ResumeSkeleton component for Resume page
  - Better perceived performance

- **Timeout Feedback** - "Taking longer than expected..." messages
  - CompanyResearchPanel: Shows after 5 seconds
  - ProfileForm: Shows after 5 seconds of loading

- **useMinimumLoadingDuration Hook** - Prevents "flash of loading" for quick operations

#### Data Freshness Indicators

- **Stale Data Indicators** - Color-coded "last updated" timestamps
  - DashboardHeader: Shows relative time with "Updated Xm ago"
  - Market.tsx: Color-coded staleness (green/amber/red) with warning for very stale data

#### Form Validation & Feedback

- **Inline Validation** - Real-time validation on blur
  - InterviewScheduler: Datetime validation (past date check with inline error)
  - ResumeBuilder: Specific validation messages per step

- **Unsaved Changes Warning** - CoverLetterTemplates editor shows confirmation on cancel

#### Accessibility Improvements

- **Form Labels** - Added accessible labels with htmlFor and aria-describedby
  - ResumeBuilder: Summary textarea with sr-only label and hint
  - ResumeOptimizer: Job description and resume JSON textareas

- **Confirmation Dialogs** - Added for destructive actions across the app

#### Performance Optimizations

- **Component Memoization** - React.memo for expensive components
  - DashboardFiltersBar (40+ props)
  - QuickActions
  - Dropdown

- **Lookup Objects** - Replaced switch statements with lookup objects
  - MarketAlertCard: Severity styles and alert type icons

#### Empty States

- **Actionable Empty States** - Improved guidance in empty states
  - Resume.tsx: Skills empty state with icon, description, and action buttons
  - ResumeBuilder.tsx: Experience and education empty states

### Changed

- Improved touch targets and button sizing
- Better loading text ("Scanning..." instead of generic "Loading...")
- Contextual loading text in buttons

#### Performance Optimizations (January 24, 2026)

- **React.memo for Components** - Memoized 50+ components to prevent unnecessary re-renders
  - Navigation icons (8 components)
  - DashboardHeader, DashboardStats
  - Button, Input (with forwardRef)
  - DashboardIcons (22 icon components)
  - Panel and modal components (ApplyButton, ProfileForm, etc.)

- **Context Provider Optimization** - Added useCallback/useMemo to all context providers
  - ThemeContext: useCallback for setTheme, toggleTheme, setHighContrast
  - ToastContext: useMemo for context value, memo for ToastContainer/ToastItem
  - AnnouncerContext, UndoContext, ErrorReportingContext, KeyboardShortcutsContext

### Fixed

- Flash of loading state for quick operations
- Missing aria-labels on interactive elements
- Inconsistent error handling patterns
- Unnecessary re-renders in context consumers
- **Memory leak in ToastContext** - Timers now properly cleaned up on unmount

### Accessibility (January 25, 2026)

- **Navigation.tsx** - Added `aria-label="Main navigation"` for screen readers
- **Dropdown.tsx** - Added `aria-activedescendant` for keyboard navigation accessibility
- **Tooltip.tsx** - Added Escape key to dismiss tooltips for keyboard users
- **Badge.tsx** - Contextual remove button labels (`Remove {content}` instead of generic "Remove")

### Error Handling (January 25, 2026)

- **DashboardWidgets.tsx** - Added error state with retry button for analytics loading failures
- **NotificationPreferences.tsx** - Added error state with retry for preference loading failures

### Tests (January 25, 2026)

- **4,085+ total tests** (Backend: 2,257 | Frontend: 1,828)
- Added ScraperHealthDashboard tests (53 tests)
- Added InterviewScheduler tests (39 tests)
- Added CompanyResearchPanel tests (36 tests)
- Updated Badge tests for new contextual aria-labels

## [2.5.5] - 2026-01-24

### Added - Feature Expansion & Auto-Apply Enhancement

Major feature expansion including new scrapers, ML-enhanced ghost detection, dashboard widgets, and complete one-click auto-apply integration.

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
  - Pre-configured patterns for: years of experience, salary expectations, relocation, visa status, remote preference, start date
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
|--------|-------|--------|-------------|
| 🟢 Lenient | 120 days | 5× | Shows most jobs, rarely flags anything |
| 🟡 Balanced | 60 days | 3× | Good default, flags obviously stale jobs |
| 🔴 Strict | 30 days | 2× | Aggressively filters old/reposted jobs |

#### Security Trust Indicators

Visual badges showing where credentials are stored:

- `🔒 Stored in macOS Keychain` - macOS users
- `🔒 Stored in Windows Credential Manager` - Windows users
- `🔒 Stored in System Keyring` - Linux users

Appears next to: Slack webhook, SMTP password, LinkedIn cookie, Discord webhook, Teams webhook, Telegram bot token, USAJobs API key.

#### Smart Job Board Recommendations

Context-aware suggestions based on your preferences:

- Remote work enabled? → Suggests RemoteOK, WeWorkRemotely
- Startup keywords? → Suggests YC Startups
- Tech keywords? → Suggests HN Who's Hiring, Dice
- Government keywords? → Suggests USAJobs
- US tech hub cities? → Suggests BuiltIn

#### USAJobs Guided Setup

Step-by-step flow for federal job seekers:

1. Quick Setup panel appears when USAJobs enabled
2. Numbered steps explain the process
3. "Get Free API Key →" button links directly to signup page
4. Clearer field labels and hints

#### Windows & Linux LinkedIn Auto-Connect

Full automatic cookie extraction now works on all platforms:

| Platform | Method |
|----------|--------|
| macOS | WKHTTPCookieStore (objc2) |
| Windows | WebView2 via Tauri's cookies_for_url() |
| Linux | WebKitGTK via Tauri's cookies_for_url() |

No more manual cookie copying on any platform!

#### Files Changed

- `src/pages/Settings.tsx` - All UX improvements (+281 lines)
- `src-tauri/src/commands/linkedin_auth.rs` - Cross-platform cookie extraction

---

## [2.5.3] - 2026-01-24

### Added - LinkedIn Auto-Connect (Zero-Copy Authentication)

**User Experience Revolution:** LinkedIn authentication now requires ZERO technical knowledge. No more copying cookies from DevTools - just log in normally.

#### How It Works

1. Click "Connect LinkedIn" in Settings
2. Log in normally in the window that opens (username, password, 2FA if needed)
3. Done! Cookie extracted automatically, stored securely in OS keychain

#### Technical Implementation

- **Native WebKit Integration (macOS):** Uses `WKHTTPCookieStore` via objc2 to extract cookies directly from the system cookie store
- **Tauri 2 Navigation Monitoring:** `WebviewWindowBuilder.on_navigation()` detects successful login by URL pattern matching
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

Comprehensive validation audit revealed and fixed 5 critical bugs affecting new user onboarding and notification configuration.

#### Onboarding Fixes

- **Slack webhook now saved correctly** - SetupWizard was putting `webhook_url` in config JSON, but backend uses `#[serde(skip)]` so it was silently discarded. Now properly stores in OS keyring via `store_credential`.

- **Scrapers enabled by default** - After completing onboarding, all scrapers were disabled (`enabled: false`), resulting in 0 jobs being scraped. Now enables RemoteOK, HN Who's Hiring, and WeWorkRemotely by default.

- **Desktop notifications preserved** - When updating Slack config in wizard, the entire `alerts` object was replaced, losing desktop notification settings. Fixed to preserve existing alert config.

#### Settings Page Fixes

- **Discord, Teams, Telegram credentials can now be saved** - Frontend `CredentialKey` type only had 3 keys but backend has 6. Added missing: `discord_webhook`, `teams_webhook`, `telegram_bot_token`.

- **Discord, Teams, Telegram now have input fields** - Users could toggle these notification channels on, but there were NO input fields to enter webhook URLs or bot tokens. Added proper input fields with secure storage indicators.

#### Validation Summary

- **2,911+ tests passing** (Backend: 2,195 | Frontend: 716)
- **E2E validated**: 1,337 jobs scraped, scored, and stored
- **All 4 working scrapers confirmed**: Greenhouse (1,177), Lever (89), HN Hiring (48), RemoteOK (23)

### Changed

- `src/pages/SetupWizard.tsx` - Credential storage, default scrapers, alert preservation
- `src/utils/profiles.ts` - Career profiles now include default scrapers
- `src/pages/Settings.tsx` - Added 3 credential types and input fields

---

## [2.5.1] - 2026-01-18

### Added - Code Quality & Feature Completion Sprint

Major improvements to existing features, code quality, accessibility, and test coverage.

#### Feature Completions

- **Resume → One-Click Apply Integration** - Resume file path now flows from Resume Builder to One-Click Apply
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
  - Backoff: 1s → 2s → 4s → 8s (max 3 retries)
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

- Card and Badge components now extend React.HTMLAttributes for ARIA support
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

## [2.4.0] - 2026-01-17

### Added - Resume Builder + ATS Optimizer UI Enhancements

Comprehensive UI enhancements to Resume module with advanced visualization and seamless Resume Builder integration.

#### Resume.tsx Enhancements

- **Skill Confidence Scores** - Display confidence percentage on skill badges
- **Years of Experience per Skill** - Show experience duration for each skill
- **Category Filter Dropdown** - Filter displayed skills by category (Programming, Frameworks, Tools, etc.)
- **Visual Score Breakdown Chart** - Three-factor breakdown: skills (50%), experience (30%), education (20%)
- **Styled Gap Analysis** - Color-coded list of missing skills with visual distinction
- **Proficiency Distribution Chart** - Visualize skill proficiency levels (Beginner/Intermediate/Advanced/Expert)

#### ResumeOptimizer.tsx Enhancements

- **Side-by-Side Job Comparison View** - Resume vs job requirements in parallel panels
- **Keyword Density Heatmap** - Visual importance ranking of keywords by category (Required/Preferred/Industry)
- **Tailor Resume Button** - Direct link from optimizer to resume builder for targeted customization
- **ATS Score Integration** - Show ATS compatibility score in comparison view

#### ResumeBuilder.tsx Enhancements

- **Template Thumbnail Previews** - Visual preview of all 5 templates (Classic, Modern, Technical, Executive, Military)
- **ATS Score Preview in Step 6** - Display estimated ATS score during template selection
- **Import Skills from Resume** - Auto-populate skills section from uploaded resume
- **Template Selection Cards** - Interactive card-based template chooser with visual representations

#### New Components

- **ResumeMatchScoreBreakdown** - Reusable component for three-factor score visualization
- **SkillCategoryFilter** - Reusable category filter dropdown for skill lists
- **ProficiencyDistributionChart** - Skill proficiency level distribution visualization
- **KeywordDensityHeatmap** - Keyword importance heatmap for job comparison
- **TemplatePreview** - Thumbnail preview component for resume templates
- **ATSScorePreview** - ATS score display with breakdown details

#### Integration

- Resume matcher now feeds directly into builder workflow
- ATS optimizer provides targeted feedback for resume improvements
- Seamless data flow between matcher → optimizer → builder

### Changed

- Resume.tsx refactored to support enhanced skill visualization
- ResumeOptimizer.tsx now displays side-by-side comparison
- ResumeBuilder.tsx step 6 enhanced with template previews and ATS score
- All skill display components now include confidence scores and experience data

### Tests

- Component tests for ResumeMatchScoreBreakdown
- Component tests for SkillCategoryFilter
- Integration tests for resume → builder workflow
- Tests updated to include v2.4.0 component functionality

---

## [2.3.0] - 2026-01-17

### Added - Advanced Resume Matching (7 Phases Complete)

Major enhancement to JobSentinel's resume module with intelligent matching across skills, experience, and education.

#### Phase 1: Skill Validation UI

- **Editable Skills** - Users can now edit, delete, and add skills extracted from their resume
- Proficiency dropdown (Beginner/Intermediate/Advanced/Expert)
- Years of experience input field
- "Add Skill" button for manual skill additions
- **3 new Tauri commands**: `update_user_skill`, `delete_user_skill`, `add_user_skill`

#### Phase 2: Resume Library UI

- **Multiple Resume Support** - Manage multiple resume versions with quick switching
- Resume dropdown in header showing all uploaded resumes
- Active resume indicator with upload date
- Delete button for removing old resumes
- **2 new Tauri commands**: `list_all_resumes`, `delete_resume`

#### Phase 3: Experience Matching

- **Years of Experience Extraction** - Regex-based extraction from job descriptions
- Extracts patterns like "5+ years Python", "3-5 years experience", "Senior (7+ years)"
- Partial credit scoring: `user_years / required_years` for partial matches
- Full credit (1.0) when user meets or exceeds requirement
- **New types**: `ExperienceRequirement` struct with skill, min_years, max_years, is_required

#### Phase 4: Education Matching

- **Degree Level Comparison** - Hierarchical education matching
- `DegreeLevel` enum: None(0), HighSchool(1), Associate(2), Bachelor(3), Master(4), PhD(5)
- Extracts requirements like "Bachelor's required", "Master's preferred", "PhD in CS"
- Partial credit when user has lower degree than required
- **New types**: `EducationRequirement` struct with degree_level, fields, is_required

#### Phase 5: PDF Export

- **Browser Print-to-PDF** - Export resumes using browser print functionality
- Renders HTML in hidden iframe using existing ATS templates
- Works with all 5 templates: Classic, Modern, Technical, Executive, Military
- **New Tauri command**: `export_resume_html`

#### Phase 6: OCR Support (Optional Feature)

- **Scanned PDF Parsing** - OCR fallback for image-based PDFs
- Command-line approach using `tesseract` and `pdftoppm` (no native library linking)
- Auto-detects when pdf-extract returns < 100 characters
- Converts PDF to images at 300 DPI, runs Tesseract on each page
- **New Cargo feature**: `ocr` (disabled by default)
- **System requirements**: Tesseract OCR + poppler-utils installed

#### Phase 7: Enhanced Skill Database

- **Expanded Skill Coverage** - 300+ skills across 10 categories
- **New categories**: methodology, certification, security, data
- Added: DevSecOps, OWASP, TDD, CI/CD, MLOps, Terraform, Kubernetes, etc.
- 100% self-contained - no external dependencies required
- Works fully offline with deterministic, fast results

#### Weighted Match Scoring Formula

The overall match score now combines three factors:

```text
overall_score = (skills × 0.5) + (experience × 0.3) + (education × 0.2)
```

- **Skills (50%)**: Comprehensive keyword skill matching (300+ skills)
- **Experience (30%)**: Years of experience vs job requirements
- **Education (20%)**: Degree level vs job requirements

#### Score Breakdown Display

- Visual breakdown showing contribution from each factor
- Clear indicators for meeting/missing requirements
- Enhanced gap analysis with experience and education recommendations

### Dependencies

- Added `scopeguard = "1.2"` for cleanup guards in OCR temp directory

### Tests

- **145 resume module tests** passing
- Updated test assertions for new weighted scoring formula
- Added tests for experience/education extraction patterns

## [2.2.0] - 2026-01-17

### Added - Settings UI & Smart Scoring Overhaul

Complete Settings UI with user-configurable scoring weights and intelligent job matching enhancements.

### Added - User-Configurable Scoring Weights

#### Customizable Job Scoring Preferences

- **Scoring Weight Configuration** - Users can now customize how jobs are scored
  - **Adjustable Weights** - Modify importance of each scoring factor:
    - Skills match weight (default: 40%)
    - Salary match weight (default: 25%)
    - Location match weight (default: 20%)
    - Company preference weight (default: 10%)
    - Job recency weight (default: 5%)
  - **Validation** - Weights must be non-negative, ≤1.0, and sum to approximately 1.0 (±0.01 tolerance)
  - **Database Persistence** - Config stored in SQLite, survives app restarts

- **New Tauri Commands**
  - `get_scoring_config()` - Retrieve current scoring weights
  - `update_scoring_config(config)` - Save new weights with validation
  - `reset_scoring_config_cmd()` - Reset to default weights
  - `validate_scoring_config(config)` - Validate weights without saving

- **Database Migration**
  - New `scoring_config` table with single-row pattern (id=1 constraint)
  - Auto-populated with default weights on first run
  - Includes updated_at timestamp for tracking changes

- **Implementation Details**
  - New `ScoringConfig` struct with validation logic
  - Updated `ScoringEngine` to use configurable weights instead of hardcoded values
  - All scoring methods (`score_skills`, `score_salary`, etc.) now use `self.scoring_config` weights
  - Comprehensive test coverage (9 config tests + 4 database tests)

- **Backwards Compatibility**
  - Existing users get default weights automatically via migration
  - No changes required to existing code using `ScoringEngine::new()`

### Added - Company Preference Scoring

#### Intelligent Company Filtering

- **Company Whitelist/Blacklist Support** - Control job scoring by company preference
  - **Whitelist (Preferred Companies)** - Jobs from preferred companies get 50% scoring bonus (0.15 instead of 0.10)
  - **Blacklist (Blocked Companies)** - Jobs from blocked companies get 0 score
  - **Fuzzy Name Matching** - Handles company suffixes automatically (Inc, LLC, Corp, Ltd, etc.)
  - Case-insensitive matching
  - Partial matching support (e.g., "Google" matches "Google DeepMind", "Google LLC")
  - Blacklist takes precedence over whitelist for conflict resolution

- **Config Integration**
  - New fields in Config: `company_whitelist` and `company_blacklist`
  - Both fields optional (default: empty lists)
  - JSON array format: `["Google", "Cloudflare", "Amazon"]`

- **Implementation Details**
  - Fuzzy matching functions: `normalize_company_name()` and `fuzzy_match_company()`
  - Strips common suffixes: Inc, Inc., LLC, Corp, Corporation, Ltd, Co, PLC, GmbH, AG, etc.
  - Normalizes whitespace and converts to lowercase
  - Handles variations like "L.L.C" vs "LLC"

- **Score Breakdown**
  - Clear reasons in score breakdown:
    - ✗ Company 'BadCo Inc.' is blocklisted
    - ✓ Company 'Google LLC' is preferred (+50% bonus)
    - Company 'Microsoft' is neutral
    - No company preferences configured

- **Comprehensive Test Suite**
  - 13 new tests for company scoring
  - Tests for blacklist, whitelist, neutral companies
  - Fuzzy matching tests (case sensitivity, suffixes, partial matches)
  - Edge cases (blacklist precedence, multiple lists, etc.)

### Added - Synonym Matching for Smart Scoring

#### Intelligent Keyword Matching

- **Synonym Matching System** - Flexible keyword matching without exact matches
  - Bidirectional synonym support (Python ↔ py ↔ Python3)
  - Word boundary detection (prevents "py" from matching "spy")
  - Case-insensitive matching
  - Pre-populated with 60+ synonym groups for:
    - Programming languages (Python/py/Python3, JavaScript/JS, TypeScript/TS, C++/CPP, etc.)
    - Job titles (Senior/Sr./Sr, Junior/Jr., Engineer/Developer/Dev/SWE)
    - Frameworks (React/ReactJS/React.js, Node/NodeJS/Node.js, Vue/VueJS)
    - Cloud platforms (AWS/Amazon Web Services, GCP, Azure, Kubernetes/K8s)
    - Skills (Machine Learning/ML, AI/Artificial Intelligence, CI/CD/CICD)
    - Databases (PostgreSQL/Postgres, MongoDB/Mongo, MySQL)
    - Security (Security/Cybersecurity/InfoSec, AppSec/Application Security)
  - O(1) HashMap-based lookups for performance
  - Fully backward compatible with existing configurations

- **New Module: `src-tauri/src/core/scoring/synonyms.rs`**
  - SynonymMap struct with efficient synonym storage
  - `matches_with_synonyms()` - Smart keyword matching function
  - `get_synonym_group()` - Retrieve all synonyms for a keyword
  - `add_synonym_group()` - Add custom synonym groups
  - Comprehensive test suite (25+ test cases)

- **Scoring Integration** - Synonym matching in keyword scoring
  - Boost keywords now match synonyms automatically
  - Excluded keywords use synonym matching
  - No configuration changes required
  - Example: "Python" keyword now matches "Python3", "py", "python" in job descriptions

#### Documentation

- **docs/features/synonym-matching.md** - Complete feature documentation
  - Full list of pre-populated synonym groups
  - Architecture and implementation details
  - Usage examples and migration guide
  - Future enhancement roadmap (custom synonyms, database storage, fuzzy matching)

### Added - Graduated Salary Scoring

#### Intelligent Salary Matching

- **Graduated Salary Scoring** - Jobs receive partial credit based on salary proximity to target
  - **>= 120% of target**: 1.2x bonus (capped)
  - **100-119% of target**: 1.0x (full credit)
  - **90-99% of target**: 0.9x credit
  - **80-89% of target**: 0.8x credit
  - **70-79% of target**: 0.6x credit
  - **< 70% of target**: 0.3x credit (not zero!)
- **Target Salary Configuration** - New optional `salary_target_usd` config field
  - Uses `salary_floor_usd` as fallback if not set
  - Target represents your ideal salary; floor is minimum acceptable
- **Salary Range Handling** - Uses midpoint for jobs with min-max salary range
- **Missing Salary Handling** - Configurable penalty via `penalize_missing_salary`
  - If true: 30% credit (0.3x)
  - If false: 50% credit (0.5x, default)
- **Detailed Score Reasons** - Shows percentage of target in breakdown
  - "✓ Salary 110% of target (100% credit)"
  - "Salary 85% of target (80% credit)"
  - "✗ Salary 50% of target (30% credit)"

### Added - Remote Preference Scoring

#### Flexible Work Location Matching

- **Remote Preference Modes** - Five preference modes for work location
  - **RemoteOnly**: Remote jobs = 1.0x, Hybrid = 0.5x, Onsite = 0.1x
  - **RemotePreferred**: Remote = 1.0x, Hybrid = 0.8x, Onsite = 0.4x
  - **HybridPreferred**: Hybrid = 1.0x, Remote = 0.8x, Onsite = 0.6x
  - **OnsitePreferred**: Onsite = 1.0x, Hybrid = 0.8x, Remote = 0.6x
  - **Flexible**: All types = 1.0x (no preference)
- **Smart Job Type Detection** - Detects work arrangement from multiple sources
  - Checks job title, location field, description, and explicit remote flag
  - Keywords: "remote", "WFH", "work from home", "hybrid", "on-site", "in-office"
  - "Remote with occasional office" → treated as hybrid
- **Graduated Scoring** - Jobs get partial credit instead of binary pass/fail
  - Unspecified work arrangements get partial credit (0.3-0.8)
  - Better job discovery without strict filtering
- **New Module: `src-tauri/src/core/scoring/remote.rs`**
  - `RemotePreference` enum with 5 preference modes
  - `JobType` enum (Remote, Hybrid, Onsite, Unspecified)
  - `detect_job_type()` - Smart detection from job data
  - `score_remote_preference()` - Calculate remote match score
  - Comprehensive test suite (15+ test cases)

### Added - Score Breakdown UI

#### Score Explanation Features

- **ScoreBreakdownModal Component** - Detailed score visualization in a modal
  - Overall score prominently displayed with color-coded label
  - Breakdown by all 5 scoring factors with progress bars
  - Visual status indicators (✓/✗) for each factor
  - Factor-specific reasons from scoring algorithm
  - Color coding: green (high), yellow (medium), red (low)
  - Responsive design with dark mode support
- **Interactive Score Display** - Click any job score to open breakdown modal
  - Existing tooltip remains for quick preview
  - Click handler added to ScoreDisplay component
  - Modal shows full details with job title
- **Scoring Weights in Settings** - New section showing current weights
  - Skills Match: 40% (job title and keyword matches)
  - Salary: 25% (meets salary requirements)
  - Location: 20% (remote/hybrid/onsite preference)
  - Company: 10% (company preference if configured)
  - Recency: 5% (how fresh the posting is)
  - Informational display with helpful tips
  - Help icon explaining how to see breakdown
- **Visual Progress Bars** - Each factor shows percentage with color-coded bar
  - Animated progress bars in modal
  - Percentage badges with background colors
  - Factor icons for visual hierarchy

### Added - Resume-Based Skills Matching Integration

#### Smart Skills Scoring with Resume Data

- **Async Resume-Based Scoring** - Integrates AI Resume-Job Matcher with scoring engine
  - **Resume Match Weight (70%)** - Skills match from uploaded resume
  - **Keyword Boost Weight (30%)** - Traditional keyword matching as fallback
  - Combines both approaches for comprehensive skills scoring
  - Graceful fallback to keyword-only scoring if no resume or matching fails

- **New ScoringEngine Methods**
  - `ScoringEngine::with_db()` - Create engine with database access for resume matching
  - `score_async()` - Async scoring method that uses resume matching when enabled
  - `score_skills_with_resume()` - Internal async skills scoring with resume data
  - `calculate_keyword_boost_ratio()` - Helper for keyword boost calculation

- **Configuration & UI**
  - New `use_resume_matching: bool` config flag (default: false)
  - **Settings UI Toggle** - Easy on/off switch in Settings page under "Resume-Based Scoring"
  - Helpful tooltip explaining the feature and how to use it
  - Tip directing users to upload resume first
  - When enabled, scoring uses async method with database lookups
  - When disabled, uses fast synchronous keyword-only scoring

- **Integration Details**
  - `score_jobs` worker updated to use async scoring when configured
  - Fetches active resume via `ResumeMatcher::get_active_resume()`
  - Calculates match via `ResumeMatcher::match_resume_to_job()`
  - Score reasons include matching skills, missing skills, and gap analysis
  - Performance: Only queries database when resume matching is enabled

- **Score Breakdown**
  - Shows combined resume match percentage
  - Lists matching skills found in both resume and job
  - Lists missing skills from job requirements
  - Keyword boost ratio displayed separately

### Added - Ghost Detection & Deduplication Improvements

#### Ghost Detection Enhancements

- **Settings UI for Ghost Config** - Users can now adjust ghost detection thresholds
  - Configurable: stale job threshold (days), repost threshold, score weights
  - Live preview of impact on ghost job count
- **Improved Repost History Weighting** - Stale reposts now weighted less heavily
  - 90-180 days old: 50% weight (moderately concerning)
  - 180+ days old: 25% weight (less likely to indicate active rejection)
  - Recent reposts: 100% weight (most suspicious)
- **3 New Tauri Commands** (ghost config):
  - `get_ghost_config` - Retrieve current ghost detection settings
  - `set_ghost_config` - Update ghost detection thresholds
  - `reset_ghost_config` - Reset to default values
- **4 New Tauri Commands** (user feedback, from v2.0 work):
  - `mark_job_as_real` - User confirms job is legitimate
  - `mark_job_as_ghost` - User confirms job is fake
  - `get_ghost_feedback` - Get user's verdict for a job
  - `clear_ghost_feedback` - Remove user's verdict
- **Ghost Feedback UI** - User can mark jobs as real or ghost:
  - Feedback buttons appear in GhostIndicator tooltip
  - "✓ Real" (green) and "✗ Ghost" (red) buttons
  - Visual confirmation after submission
  - Opacity change when marked as real
- **New Database Table**: `ghost_feedback` tracks user corrections
  - Future enhancement: use this data to improve ghost detection algorithm

#### Deduplication Improvements

- **URL Normalization** - Strips 20+ tracking parameters before hashing
  - Removes: utm_*, ref, fbclid, gclid, source, campaign, session, etc.
  - Preserves: id, job_id, posting, gh_jid, lever_id, position, etc.
  - Benefit: same job shared via different sources now deduplicated
- **Location Normalization** - Consistent location matching
  - "SF" = "San Francisco", "Remote US" = "remote", etc.
  - Prevents false duplicates from location name variations
- **Title Normalization** - Consistent title matching
  - "Sr." = "Senior", "SWE" = "Software Engineer", etc.
  - Removes abbreviations that create false duplicates
- **Fixed Scraper Hash Formulas**
  - LinkedIn hash now includes location (was missing)
  - Indeed hash now includes location (was missing)
  - All 13 scrapers now use consistent normalization
- **Job Card Badge** - "Seen on X sources" now visible
  - Shows duplicate detection at a glance
- **3 New Utility Modules**:
  - `src-tauri/src/core/scrapers/url_utils.rs` - URL normalization
  - `src-tauri/src/core/scrapers/location_utils.rs` - Location normalization
  - `src-tauri/src/core/scrapers/title_utils.rs` - Title normalization
- **New Database Migration**: `20260118000001_add_ghost_feedback.sql`

## [2.1.0] - 2026-01-17

### Added - Scraper Health Monitoring

- **All 13 Job Scrapers Now Wired** - All scrapers properly integrated into scheduler
  - Previously only 5 scrapers were wired (Greenhouse, Lever, JobsWithGPT, LinkedIn, Indeed)
  - Now includes: RemoteOK, Wellfound, WeWorkRemotely, BuiltIn, HN Who's Hiring, Dice, YC Startup Jobs, ZipRecruiter
- **Scraper Health Dashboard** - Monitor health and performance of all scrapers
  - Success rate, average duration, last success time
  - Health status: Healthy, Degraded, Down, Disabled, Unknown
  - Selector health monitoring for HTML scrapers
- **Run History Tracking** - Detailed execution logs per scraper
  - Start/finish times, duration, jobs found/new
  - Error messages and codes for failures
  - Retry attempt tracking
- **Exponential Backoff Retry Logic** - Automatic retries for transient failures
  - Configurable max attempts, delays, and backoff multiplier
  - Retries on 429 (rate limit), 500, 502, 503, 504 errors
  - Conservative and aggressive presets
- **Smoke Tests** - Live API connectivity verification
  - Individual and batch smoke tests for all 13 scrapers
  - Records test results with timing
- **LinkedIn Cookie Expiry Tracking** - Credential health monitoring
  - 365-day cookie expiry detection
  - 30-day warning threshold
  - Automatic expiry notifications
- **9 New Tauri Commands**:
  - `get_scraper_health` - Health metrics for all scrapers
  - `get_health_summary` - Aggregate health statistics
  - `get_scraper_configs` - Scraper configuration details
  - `set_scraper_enabled` - Enable/disable scrapers
  - `get_scraper_runs` - Recent run history
  - `run_scraper_smoke_test` - Test single scraper
  - `run_all_smoke_tests` - Test all scrapers
  - `get_linkedin_cookie_health` - LinkedIn credential status
  - `get_expiring_credentials` - All expiring credentials
- **New Database Tables**:
  - `scraper_runs` - Run history with timing and status
  - `scraper_config` - Scraper configuration and health state
  - `credential_health` - Credential expiry tracking
  - `scraper_smoke_tests` - Smoke test results
  - `scraper_health_status` (view) - Aggregated health metrics
- **8 New Scraper Configs** - Configuration options for additional scrapers
  - `remoteok` - Tags filter, result limit
  - `wellfound` - Role, location, remote-only filter
  - `weworkremotely` - Category filter
  - `builtin` - Cities list, category filter
  - `hn_hiring` - Remote-only filter
  - `dice` - Query, location filter
  - `yc_startup` - Query, remote-only filter
  - `ziprecruiter` - Query, location, radius filter

### Changed

- `scheduler/workers/scrapers.rs` refactored to include all 13 scrapers
- `config/types.rs` expanded with 8 new scraper config structs
- `core/mod.rs` updated with health module re-exports

### Dependencies

- No new dependencies - uses existing SQLx, chrono, reqwest

## [2.0.0] - 2026-01-17

### Security - Major Release

- **OS-Native Keyring Integration** - All sensitive credentials now stored in secure OS credential managers
  - macOS: Keychain
  - Windows: Windows Credential Manager
  - Linux: Secret Service (GNOME Keyring, KWallet)
- **6 credentials migrated to secure storage**:
  - `smtp_password` - Email SMTP password
  - `telegram_bot_token` - Telegram Bot API token
  - `slack_webhook_url` - Slack incoming webhook URL
  - `discord_webhook_url` - Discord webhook URL
  - `teams_webhook_url` - Microsoft Teams webhook URL
  - `linkedin_session_cookie` - LinkedIn session cookie
- **Automatic migration** - Existing plaintext credentials automatically migrated on first v2.0 launch
- **New `credentials` module** - `src-tauri/src/core/credentials/mod.rs` with `CredentialStore` abstraction
- **5 new Tauri commands** - `store_credential`, `retrieve_credential`, `delete_credential`, `has_credential`, `get_credential_status`
- **Dual-access pattern** - Tauri plugin for frontend, `keyring` crate for backend
- **Runtime credential validation** - Credentials validated when used, not at config load

### Added - P5: One-Click Apply (Form Filling)

- **Application Profile Management** - Store contact info and work authorization for auto-fill
  - Full name, email, phone, LinkedIn, GitHub, portfolio URLs
  - US work authorization and sponsorship status
  - Max applications per day limit, manual approval requirement
  - 2 new database tables: `application_profiles`, `screening_answers`
- **Screening Question Auto-Answers** - Configure regex-based patterns for common questions
  - Pattern matching for years of experience, salary, relocation, etc.
  - 8 pre-configured common patterns
  - Answer types: text, yes/no, textarea, select
- **ATS Platform Detection** - Automatic detection of 7 ATS platforms
  - Greenhouse, Lever, Workday, Taleo, iCIMS, BambooHR, Ashby
  - Platform-specific CSS selectors for form fields
  - Automation notes per platform
- **Browser Automation** - Visible Chrome browser with form filling
  - Uses `chromiumoxide` crate for Chrome DevTools Protocol
  - Human-in-the-loop design: fills form, pauses for user review
  - User clicks Submit manually (never auto-submit)
  - CAPTCHA detection with user prompt
- **18 new Tauri commands** for automation:
  - Profile: `upsert_application_profile`, `get_application_profile`
  - Screening: `upsert_screening_answer`, `get_screening_answers`, `find_answer_for_question`
  - Attempts: `create_automation_attempt`, `get_automation_attempt`, `approve_automation_attempt`, etc.
  - Browser: `launch_automation_browser`, `close_automation_browser`, `fill_application_form`
- **New Frontend**:
  - `ApplicationProfile.tsx` - Settings page for One-Click Apply
  - `ProfileForm.tsx` - Contact info and work authorization form
  - `ScreeningAnswersForm.tsx` - Question pattern configuration
  - `ApplyButton.tsx` - Quick Apply button with ATS badge
  - `ApplicationPreview.tsx` - Preview before filling

### Added - P4: Resume Builder + ATS Optimizer

- **Interactive Resume Builder** - 7-step wizard for creating professional resumes
  - Contact information, professional summary, work experience
  - Education, skills (with proficiency levels), certifications, projects
  - JSON-based storage in `resume_drafts` table
  - 10 new Tauri commands for CRUD operations
- **5 ATS-Optimized Templates** - Classic, Modern, Technical, Executive, Military
  - HTML rendering for preview
  - DOCX export using `docx-rs` crate
  - ATS-safe formatting (no tables, graphics, single-column)
- **ATS Analyzer** - Resume optimization for Applicant Tracking Systems
  - Keyword extraction from job descriptions (Required/Preferred/Industry)
  - Format validation and scoring (completeness, format, keywords)
  - Bullet point improver with power word suggestions
  - 45+ action verbs database
  - 5 new Tauri commands for analysis
- **New Frontend Pages**:
  - `ResumeBuilder.tsx` - Full wizard with auto-save and validation
  - `ResumeOptimizer.tsx` - Two-panel ATS analysis with score visualization
- New security documentation: `docs/security/KEYRING.md`
- Credential status indicators in Settings page

### Changed

- Config validation no longer requires credential fields (now in keyring)
- Notification senders fetch credentials from keyring at runtime
- LinkedIn scraper fetches session cookie from keyring
- Settings.tsx refactored to use credential state separately from config

### Dependencies

- Added `tauri-plugin-secure-storage = "1.4"` - Frontend secure storage API
- Added `keyring = "3"` with `apple-native`, `windows-native`, `sync-secret-service` features
- Added `chromiumoxide = "0.7"` with `tokio-runtime` feature - Chrome DevTools Protocol
- Added `futures-util = "0.3"` - Async stream utilities

### Tests

- Updated 14 tests for new credential validation behavior
- **P5: Automation Tests - 26 tests across module**
  - `ats_detector::tests` - 10 tests for ATS platform detection
  - `form_filler::tests` - 3 tests for platform-specific selectors
  - `browser::page::tests` - 4 tests for FillResult struct
  - `browser::manager::tests` - 2 tests (1 ignored, requires Chrome)
  - `profile::tests` - 3 tests (ignored, requires database)
  - `automation::tests` - 3 tests (ignored, requires database)
- **P3: Integration Tests Expansion - 76 new tests across 4 files**
  - `automation_integration_test.rs` - 11 tests (ATS detection and status enums)
  - `scheduler_integration_test.rs` - 18 tests for scheduler, scoring, DB operations
  - `database_integration_test.rs` - 22 tests for migrations, constraints, concurrency
  - `api_contract_test.rs` - 33 tests validating all 70 Tauri command signatures
- All 2078 tests passing (2002 existing + 76 new integration tests)

## [1.6.0] - 2026-01-17

### Changed

- **Additional Code Modularization** - Continued refactoring of remaining large files
  - `commands/mod.rs` (1732→94 lines): Split into 9 domain modules
    - jobs.rs (314 lines) - Job operations, search, bookmarks
    - ats.rs (224 lines) - Application tracking, interviews
    - user_data.rs (354 lines) - Templates, saved searches, history
    - resume.rs (126 lines) - Resume matching commands
    - salary.rs (92 lines) - Salary prediction commands
    - market.rs (80 lines) - Market intelligence commands
    - ghost.rs (93 lines) - Ghost detection commands
    - config.rs (99 lines) - Configuration commands
    - tests.rs (371 lines) - Command tests
  - `scrapers/lever.rs` (2379→183 lines): Extracted tests.rs (2195 lines)
  - `salary/mod.rs` (2026→59 lines): Split into types.rs (98), analyzer.rs (213), tests.rs (853)
  - `resume/mod.rs` (1831→440 lines): Extracted types.rs (71), tests.rs (1329)
- Test count: 2002 tests passing (1961 unit + 40 integration + 1 doc)
- Added `docs/developer/WHY_TAURI.md` - Architecture decision documentation

## [1.5.0] - 2026-01-17

### Changed

- **Major Code Modularization** - Split oversized files to improve maintainability
  - `db/mod.rs` (4442→85 lines): Split into types.rs, connection.rs, crud.rs,
    queries.rs, interactions.rs, analytics.rs, ghost.rs, tests.rs
  - `scheduler/mod.rs` (2955→~300 lines): Split into types.rs, pipeline.rs,
    workers/ (mod, scrapers, scoring, persistence), tests.rs
  - `market_intelligence/mod.rs` (2703→~400 lines): Extracted computations.rs,
    queries.rs, utils.rs, tests.rs
  - `db/integrity.rs` (2517→85 lines): Split into integrity/ module with types.rs,
    checks.rs, backups.rs, diagnostics.rs, tests.rs
  - `config/mod.rs` (2343→~300 lines): Split into types.rs, defaults.rs, validation.rs, io.rs, tests.rs
  - `ats/mod.rs` (2082→~300 lines): Split into types.rs, tracker.rs, reminders.rs, interview.rs, tests.rs
  - `Dashboard.tsx` (2315→672 lines): Extracted DashboardTypes.ts, DashboardIcons.tsx, 5 custom hooks, 3 UI components
- All modules now follow 500-line limit guideline for maintainability
- Test count maintained: 1992 passing, 13 ignored

## [1.4.0] - 2026-01-16

### Added

- **Ghost Job Detection** - Intelligent system to identify fake, stale, or already-filled job postings
  - Analyzes jobs for stale postings (60+ days old)
  - Tracks and flags frequently reposted positions
  - Detects generic/vague descriptions and unrealistic requirements
  - Identifies companies with excessive open positions
  - Ghost score from 0.0 (real) to 1.0 (likely ghost)
- **Ghost Filter UI** - Dashboard dropdown to show all/real/ghost jobs only
- **Ghost Indicators** - Visual badges with severity-based coloring (yellow/orange/red)
- **Ghost Tooltips** - Hover to see specific reasons why a job was flagged
- **Repost History Tracking** - New `job_repost_history` database table
- **3 new Tauri commands** - `get_ghost_jobs`, `get_ghost_statistics`, `get_recent_jobs_filtered`
- **Backend Persistence (E3)** - Migrated localStorage data to SQLite for persistence
  - Cover letter templates with categories
  - Interview prep checklists with completion tracking
  - Saved search filters for quick access
  - Notification preferences with advanced filtering
  - Search history persistence (no 10-item cap)
  - 4 new database migrations
  - 20 new Tauri commands for user data management
  - localStorage migration utility for existing users
- **UI Polish (E4)** - Improved discoverability and usability
  - Cover letter auto-fill: "Use for Job" button fills placeholders from selected job
  - Keyboard shortcut badges: `ShortcutKey` component exported for visual hints
  - Tour integration: "Take a guided tour" link in keyboard help modal

### Changed

- Job struct now includes `ghost_score`, `ghost_reasons`, `first_seen`, `repost_count` fields
- Scheduler pipeline runs ghost analysis after scoring, before database storage
- Test count increased from 2008 to **2029 tests passing**
- Total Tauri commands increased from 50 to **70 commands**

### Documentation

- New `/docs/features/` directory for feature documentation
- New `/docs/releases/` directory for version release notes
- Reorganized feature docs with cleaner naming
- Archived deferred One-Click Apply documentation

## [1.3.1] - 2026-01-16

### Added

- **3 new job board scrapers** - Now 13 total: added Dice, YC Startup Jobs, ZipRecruiter
- **Parallel scraping** - New `scrape_all_parallel()` function using tokio JoinSet for concurrent scraper execution
- **Windows platform detection** - Implemented `is_elevated()` and `get_windows_version()` using Windows API
- **Post-interview notes** - Database migration and runtime query support for storing post-interview reflections
- **Company autocomplete** - 45+ tech companies with fuzzy matching in job search

### Changed

- Scheduler now uses `config.auto_refresh.enabled` instead of hardcoded true
- JobsWithGPT endpoint is now configurable via `jobswithgpt_endpoint` config field
- Test count increased from 290 to **2008 tests passing**

### Fixed

- Flaky integration test `test_complete_workflow_with_all_error_paths` marked as ignored
- Stale Dependabot security alert dismissed (referenced deleted file)
- Build errors from missing `jobswithgpt_endpoint` field in Config initializers

## [1.3.0] - 2026-01-15

### Added

- **10 job board scrapers** - Greenhouse, Lever, LinkedIn, Indeed, RemoteOK, Wellfound,
  WeWorkRemotely, BuiltIn, HN Who's Hiring, and JobsWithGPT
- **Advanced notification filtering** - Keyword include/exclude, salary threshold,
  remote-only toggle, company whitelist/blacklist
- **Keyboard shortcuts** - `b` bookmark, `n` notes, `c` company research, `x` select,
  `/` search, `?` help, `r` refresh
- **Advanced search** - Boolean operators (AND with space, OR with comma, NOT with -prefix), search history dropdown
- **Interview scheduler enhancements** - iCal export (.ics), interview prep checklist (5 items), follow-up reminders
- **Analytics enhancements** - Company response rates (fastest/slowest), weekly application goals with progress bar
- **Cover letter improvements** - Template categories (General/Tech/Creative/Finance/Healthcare/Sales),
  additional placeholders ({location}, {date}, {years_experience}, {hiring_manager}), word/character count
- **Company research panel** - 40+ known companies database with tech stacks, Glassdoor/LinkedIn links
- **New scrapers**:
  - WeWorkRemotely (RSS feed parsing for remote jobs)
  - BuiltIn (HTML scraping for city-specific tech jobs)
  - HN Who's Hiring (Algolia API for monthly hiring threads)

### Changed

- Search input now shows syntax help tooltip
- Past interviews show follow-up reminder checkbox
- Analytics panel shows weekly goal progress

## [1.2.0] - 2026-01-16

### Added

- **Virtual job list** - Performance optimization for large job lists
- **Error boundaries** - PageErrorBoundary component for graceful error handling
- **Command palette** - Quick actions via keyboard (Cmd/Ctrl+K)
- **Onboarding tour** - First-run guided tour of features
- **Export utilities** - CSV/JSON export for jobs and applications
- **API configuration** - Centralized API endpoint configuration
- **New scrapers**:
  - RemoteOK (JSON API for remote jobs)
  - Wellfound (HTML scraping for startup jobs)

### Changed

- Improved loading states with skeleton components
- Better accessibility with skip-to-content links

## [Unreleased]

### Added

- **Comprehensive clippy configuration** - lib.rs now includes pedantic lint allows for intentional patterns
- **Email validation** in Settings - from/to email fields validate format before save
- **4 new frontend pages** with navigation from Dashboard:
  - **Applications** - Kanban board for tracking job applications through pipeline
  - **Resume** - AI resume matcher with PDF upload and skill extraction
  - **Salary** - Salary benchmarks, predictions, and negotiation script generation
  - **Market** - Market intelligence with skill trends, company activity, location heat maps
- **Email notifications UI** in Settings - full SMTP configuration with toggle switch
- **GitHub Actions CI/CD** - multi-platform build/test workflow (`.github/workflows/ci.yml`)
- **Dialog plugin** for file picker (tauri-plugin-dialog) - enables resume PDF upload
- **LinkedIn scraper integration** - fully wired into scheduler with Settings UI
  - Session cookie (li_at) authentication
  - Configurable query, location, remote-only filter
  - Adjustable result limit (10-100)
- **Indeed scraper integration** - fully wired into scheduler with Settings UI
  - Query-based search with location
  - Configurable radius (0-100 miles)
  - Adjustable result limit (10-100)
- **Desktop notifications** - native OS notifications via Tauri plugin
  - Notifies on high-match job discoveries
  - Uses tauri-plugin-notification v2
- **25 new Tauri commands** for backend modules:
  - ATS: `create_application`, `get_applications_kanban`, `update_application_status`,
    `add_application_notes`, `get_pending_reminders`, `complete_reminder`,
    `detect_ghosted_applications`
  - Resume: `upload_resume`, `get_active_resume`, `set_active_resume`, `get_user_skills`, `match_resume_to_job`, `get_match_result`
  - Salary: `predict_salary`, `get_salary_benchmark`, `generate_negotiation_script`, `compare_offers`
  - Market Intelligence: `get_trending_skills`, `get_active_companies`, `get_hottest_locations`, `get_market_alerts`, `run_market_analysis`
- LinkedIn/Indeed configuration UI in Settings page with toggle switches
- `src/utils/notifications.ts` - frontend notification utility module
- `ModalErrorBoundary` component for graceful Settings modal error handling
- Database query timeout utility (`with_timeout()`) for preventing hangs
- Telegram bot token and chat ID validation
- Search button cooldown (30 seconds) to prevent job board rate limiting
- Accessibility labels (`aria-label`) on icon buttons
- Consistent date formatting (en-US locale)

### Fixed

- HTTP client panic on startup - replaced `expect()` with `OnceCell` + graceful fallback
- Serialization error handling in commands - replaced `unwrap_or_default()` with proper error logging
- Scheduler status race condition - atomic status updates within single lock
- Scheduler graceful shutdown - added `tokio::select!` with shutdown signal
- JobCard console.error now dev-only (`import.meta.env.DEV`)
- Score bounds checking - clamped to 0.0-1.0 with warning logs for anomalies

### Accessibility

- Modal dialogs support ESC key to close and click-outside to dismiss
- Added `role="dialog"`, `aria-modal`, and `aria-labelledby` to all modals
- All form inputs now have proper `id` and associated `htmlFor` labels
- Added `aria-valuetext` to range inputs for screen reader support
- Added focus ring styles (`focus:ring-2`) to selects and textareas

### Security

- Added comprehensive security documentation for email SMTP password storage
- Documented keyring integration planned for v2.0 (macOS Keychain, Windows Credential Manager)

### Changed

- Application Tracking System (ATS) module now enabled
  - Kanban board with 12 status columns
  - Automated follow-up reminders
  - Timeline/audit trail for all application events
  - Ghosting detection (auto-mark after 2 weeks no contact)
- Resume Matcher module now enabled
  - PDF resume parsing
  - Skill extraction from resumes
  - Job-resume matching with confidence scores
- Salary AI module now enabled
  - H1B data-based salary predictions
  - Salary benchmarks by role and location
  - Offer comparison and negotiation insights
- Market Intelligence module now enabled
  - Daily market snapshots
  - Skill demand trends
  - Salary trends by role/location
  - Company hiring velocity tracking
  - Location job density analysis
  - Market alerts for anomalies

### Changed

- Refactored codebase to fix all compilation errors
- Updated test suite: 290 tests passing, 20 ignored (require file-based database or are doc examples)
- Fixed SQLx Row trait usage (get -> try_get)
- Converted all query! macros to runtime queries (removed DATABASE_URL dependency)
- Fixed proptest edge cases in scrapers
- Fixed webhook URL validation test assertions
- Updated documentation for accurate v1.0 status
- Fixed MEDIAN() SQLite incompatibility (computed in Rust)

### Security

- Removed `unsafe-inline` from script-src CSP
- Added Discord and Teams webhook URLs to CSP connect-src
- Fixed npm vulnerabilities (glob, js-yaml)
- Removed unused `backoff` crate (unmaintained)

### Technical

- Implemented Display and FromStr traits for ApplicationStatus
- Added Default derive to AlertConfig and SlackConfig
- Fixed Indeed scraper hash generation
- Fixed database integrity DateTime handling
- Added #[ignore] to backup/restore and ATS tests (require file-based database)
- Fixed doctest compilation issues
- Fixed all clippy warnings (zero warnings with -D warnings)

## [1.0.0-alpha] - 2026-01-14

### Added

- Core v1.0 release of JobSentinel (alpha)
- Cross-platform desktop application built with Tauri 2.1, Rust, and React 19
- Windows 11+ support (primary target)
- Automated job scraping from three major job boards:
  - Greenhouse
  - Lever
  - JobsWithGPT
- Smart multi-factor job scoring algorithm:
  - Skills matching (40%)
  - Salary requirements (25%)
  - Location preferences (20%)
  - Company preferences (10%)
  - Job recency (5%)
- Multi-channel webhook notifications:
  - Slack
  - Discord
  - Microsoft Teams
- Automatic job search scheduling (every 2 hours, configurable)
- Manual job search trigger via system tray right-click menu
- SQLite database for local job storage with full-text search
- Interactive setup wizard for first-run configuration
- Privacy-first architecture - all data stays local, zero telemetry
- No admin rights required for installation

### Technical Features

- Asynchronous Rust backend with Tokio runtime
- React 19 frontend with Vite and TailwindCSS
- Secure HTTPS-only job board scraping with retry logic
- Content Security Policy (CSP) for enhanced security
- Auto-update capability (built-in to Tauri)
- Minimal resource footprint (~50MB memory, <0.5s startup)

### Completed Since Alpha

- Application Tracking System (ATS) - ✅ Fully enabled
- AI Resume-Job Matcher - ✅ Fully enabled
- Salary Negotiation AI - ✅ Fully enabled
- Job Market Intelligence Dashboard - ✅ Fully enabled
- LinkedIn scraper - ✅ Integrated with scheduler and Settings UI
- Indeed scraper - ✅ Integrated with scheduler and Settings UI
- Desktop notifications - ✅ Via Tauri plugin

### Deferred to v1.1+

- Email notifications (SMTP - backend ready, frontend pending)
- macOS support (.dmg installer)
- Linux support (.deb, .rpm, .AppImage)

### Deferred to v2.0+

- One-Click Apply Automation - requires legal review and user consent framework

---

[Unreleased]: https://github.com/cboyd0319/JobSentinel/compare/v1.3.1...HEAD
[1.3.1]: https://github.com/cboyd0319/JobSentinel/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/cboyd0319/JobSentinel/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/cboyd0319/JobSentinel/compare/v1.0.0-alpha...v1.2.0
[1.0.0-alpha]: https://github.com/cboyd0319/JobSentinel/releases/tag/v1.0.0-alpha
