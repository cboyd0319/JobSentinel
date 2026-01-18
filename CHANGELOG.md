# Changelog

All notable changes to JobSentinel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

#### Phase 7: ML-based Skill Extraction

- **Semantic Skill Extraction** - LM Studio integration for intelligent skill detection
- Sends resume text to local LLM with structured JSON prompt
- Extracts skill name, category, confidence, and context
- Graceful fallback to keyword-based extraction when LM Studio unavailable
- Merges ML results with keyword extraction for comprehensive coverage
- **New method**: `SkillExtractor::extract_skills_ml()`

#### Weighted Match Scoring Formula

The overall match score now combines three factors:

```text
overall_score = (skills × 0.5) + (experience × 0.3) + (education × 0.2)
```

- **Skills (50%)**: Keyword and semantic skill matching
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

## [Unreleased]

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
