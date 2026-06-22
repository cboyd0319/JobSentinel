# Changelog Archive: v2.6

This archive contains historical entries moved out of the root
[CHANGELOG.md](../../CHANGELOG.md) during the v2.9.1 maintenance cleanup so
current release history stays small and reviewable.

## [2.6.4] - 2026-03-18

### Fixed

- **Settings page infinite loading (#197)** - `loadConfig` used `Promise.all` for credential
  checks; a single OS keyring failure (locked vault, domain policy) caused the entire Settings
  page to hang on a spinner. Now uses `Promise.allSettled`; credential failures are reported
  via a warning toast, but the page loads normally
- **Settings save partial failures** - `handleSave` also used `Promise.all`; now uses
  `Promise.allSettled` with per-item failure tracking and partial success feedback
- **Job search returning 0 results (#197)** - Fixed NaN score handling: `Option<f64>` fields
  serialized without a value were coerced to `NaN` in TypeScript, silently filtering out all
  unscored jobs from search results and sort comparators
- **NaN scores in CSV export** - `Number.isFinite()` guard added to export formatting; NaN and
  Infinity scores now export as "N/A" instead of "NaN%"
- **NaN scores in JobCard** - Score display now falls back to 0 for non-finite values instead
  of rendering broken progress bars
- **Bulk hide/merge partial failures** - `handleBulkHide` and `handleMergeAllDuplicates` now
  use `Promise.allSettled`; partial failures show which jobs succeeded vs failed instead of
  losing all progress on first error
- **Undo/redo silent failures** - All 6 undo/redo handlers (hide, bookmark, notes) now have
  try/catch with error toasts instead of silently failing
- **Ghost config load failure** - Shows warning toast with defaults instead of silently using
  defaults when `get_ghost_config` fails
- **Pre-existing ScreeningAnswersForm test failures** - Fixed 3 tests that used `user.type()`
  on controlled inputs where React re-renders dropped characters mid-typing
- **HTML whitespace normalization in schema.org import** - `strip_html_tags` was joining text
  nodes with a space separator while nodes already contained trailing whitespace, producing double
  spaces in parsed job descriptions

### Added

- **No-scrapers pre-flight check** - Dashboard warns users if no job boards are enabled before
  attempting a search, preventing the confusing "0 results" experience
- **Auto-refresh failure tracking** - Warns users after 3 consecutive auto-refresh failures
  instead of silently retrying forever
- **Test coverage for critical flows** - 45 new tests covering Settings loadConfig/save,
  Dashboard pre-flight check, bulk operations partial failures, NaN score edge cases, CSV
  export edge cases, and credential input components

### Security

- Updated `dompurify` 3.3.1 to 3.3.2 (XSS vulnerability patch)
- Updated `storybook` and all `@storybook/*` packages 10.1.x to 10.2.10
- Updated `quinn-proto` 0.11.13 to 0.11.14 (QUIC protocol security fix)
- Updated `time` crate 0.3.45 to 0.3.47
- Updated `bytes`, `flatted`, `minimatch`, `rollup` (transitive dependency fixes)
- Total: 9 Dependabot vulnerabilities resolved (6 high, 3 moderate)

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

Major code quality improvements including React optimizations, Rust performance
enhancements, accessibility, and developer experience.

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
  - Scraper utility functions: normalize*\*, format*\_, detect\_\_
  - Database query builders and utility functions

- **4 `Cow<str>` optimizations** - Zero-copy string handling in hot paths
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
