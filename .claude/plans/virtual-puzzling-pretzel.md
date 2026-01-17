# JobSentinel Implementation Plan

## Quick Summary

**v1.4.0 - Existing Feature Improvements** (4-6 weeks)
- Ghost Job Detection, Data Insights, Backend Persistence, UI Polish

**v2.0.0 - Production Release** (16-22 weeks)
- Keyring, CI/CD, Packaging, Resume Builder, One-Click Apply

**v2.1.0 - First Official Release** (TBD)
- Schema freeze, proper migration baseline, public release

---

## CRITICAL: No Backward Compatibility (Pre-v2.1.0)

**No users exist yet. v2.1.0 is the first official release.**

### Development Rules:
1. **NO incremental migrations** - Modify schema files directly
2. **NO backward compatibility** - No one has data to preserve
3. **DELETE old migrations** when consolidating schema
4. **CONSOLIDATE schemas** - Keep migration count minimal

### Why This Matters:
- Building migrations for non-existent users wastes development time
- Each migration adds complexity and test burden
- We can freely restructure tables without worrying about data loss

### When to Start Migrations:
- Only after v2.1.0 schema freeze
- That becomes the baseline for all future migrations
- Users upgrading from v2.1.0+ will have proper migration support

---

# Part 1: v1.4.0 - Existing Feature Improvements

## Priority Order (v1.4)

| Priority | Feature | Timeline |
|----------|---------|----------|
| E1 | Ghost Job Detection | 1 week |
| E2 | Data Insights & Metrics | 1 week |
| E3 | Backend Persistence | 1-2 weeks |
| E4 | UI Connections & Polish | 1 week |

**Total: 4-6 weeks**

---

## E1: Ghost Job Detection ⭐

**Goal:** Detect fake, stale, or misleading job listings before users waste time applying.

### Signals Detected
- **Stale Listings** - Posted 60+ days ago
- **Reposted Jobs** - Same job reposted multiple times
- **Generic Content** - "Fast-paced environment", "work hard play hard"
- **Missing Details** - Vague descriptions, no salary, unclear responsibilities
- **Unrealistic Requirements** - "Entry-level + 10 years experience"
- **Company Behavior** - 50+ perpetually open positions

### Files to Create
- `src-tauri/src/core/ghost/mod.rs` - GhostDetector engine
- `src-tauri/migrations/20260117000000_add_ghost_detection.sql`
- `src/components/GhostIndicator.tsx` - Visual indicator

### Files to Modify
- `src-tauri/src/core/db/mod.rs` - Add ghost_score, ghost_reasons, repost_count fields
- `src-tauri/src/core/scheduler/mod.rs` - Integrate ghost detection after scoring
- `src-tauri/src/commands/mod.rs` - Add ghost filtering commands
- `src/components/JobCard.tsx` - Display GhostIndicator
- `src/pages/Dashboard.tsx` - Add "Hide ghost jobs" filter toggle

### Database Schema
```sql
-- Add to jobs table
ALTER TABLE jobs ADD COLUMN ghost_score REAL;
ALTER TABLE jobs ADD COLUMN ghost_reasons TEXT;  -- JSON
ALTER TABLE jobs ADD COLUMN repost_count INTEGER DEFAULT 0;

-- Track reposts
CREATE TABLE job_repost_history (
    id INTEGER PRIMARY KEY,
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    repost_count INTEGER DEFAULT 1,
    UNIQUE(company, title, source)
);
```

### Ghost Score Algorithm
```rust
// Score 0.0 (real) to 1.0 (ghost)
pub fn analyze(&self, job: &Job, repost_count: i64) -> GhostAnalysis {
    let mut score = 0.0;

    // Age: 60+ days = +0.1, 90+ = +0.2, 120+ = +0.3
    if age_days >= 60 { score += 0.1..0.3; }

    // Repost: 3+ times = +0.15
    if repost_count >= 3 { score += 0.15; }

    // Generic phrases: 3+ matches = +0.1
    if generic_count >= 3 { score += 0.1; }

    // Vague title: "Various Positions" = +0.25
    if has_vague_title { score += 0.25; }

    // Unrealistic: "Entry-level + 10yrs" = +0.2
    if unrealistic_requirements { score += 0.2; }

    score.min(1.0)
}
```

### UI
- Ghost score < 0.3: No indicator
- Ghost score 0.3-0.5: Yellow warning badge
- Ghost score > 0.5: Red "Likely Ghost" badge
- Tooltip shows specific reasons
- Dashboard filter: "Hide potential ghost jobs" checkbox

---

## E2: Data Insights & Metrics

**Goal:** Make data actionable with score breakdowns, conversion stats, and match visualizations.

### 1. Score Breakdown Tooltip

**Current:** ScoreDisplay shows number only (e.g., "82%")
**New:** Tooltip shows factor breakdown

| Factor | Weight | Your Score |
|--------|--------|------------|
| Skills | 40% | 85% |
| Salary | 25% | 70% |
| Location | 20% | 90% |
| Company | 10% | 100% |
| Recency | 5% | 60% |

**Files:**
- `src/components/ScoreDisplay.tsx` - Add breakdown prop and tooltip
- `src/components/JobCard.tsx` - Parse score_reasons JSON, pass to ScoreDisplay

### 2. Application Conversion Stats (Quick Stats Header)

**Current:** Stats only in Analytics modal
**New:** Inline stats on Applications page header

```
Applied: 50 | Interviews: 5 (10%) | Offers: 1 (2%)
```

**File:** `src/pages/Applications.tsx` - Add QuickStats component to header

### 3. Resume Match Visualization

**Current:** `recentMatches` state never populated
**New:** Show skill match breakdown

**Files:**
- `src/pages/Resume.tsx` - Populate recentMatches from backend
- Add visual: matching skills (green), missing skills (red), gap analysis

### 4. Ghosting Detection Enhancement

**Current:** Manual "Detect Ghosted" button, 14-day threshold
**New:**
- Auto-computed `is_ghosted_candidate` field
- "At Risk" badge for apps with no contact >30 days
- Configurable threshold in settings

---

## E3: Backend Persistence (localStorage → SQLite) - COMPLETE

**Goal:** Move user data from localStorage to database for persistence across reinstalls.

**Status:** COMPLETE - All tables added to schema, Rust module created, frontend updated.

### Data Moved to SQLite

| Data | New Storage |
|------|-------------|
| Cover Letter Templates | `cover_letter_templates` table |
| Interview Prep Checklists | `interview_prep_checklists` table |
| Saved Searches | `saved_searches` table (no 10-item cap) |
| Search History | `search_history` table (unlimited) |
| Notification Preferences | `notification_preferences` table |

### Files Created
- `src-tauri/src/core/user_data/mod.rs` - UserDataManager with 20 commands
- `src/utils/localStorageMigration.ts` - One-time migration utility

**Note:** Schema changes added directly to migration files. No incremental migrations needed (see "No Backward Compatibility" section above).

### Files to Modify
- `src-tauri/src/commands/mod.rs` - Add 14 new commands
- `src/components/CoverLetterTemplates.tsx` - Replace localStorage with invoke()
- `src/components/InterviewScheduler.tsx` - Replace localStorage with invoke()
- `src/pages/Dashboard.tsx` - Replace savedSearches localStorage with invoke()
- `src/components/NotificationPreferences.tsx` - Replace localStorage with invoke()

### New Tauri Commands (14 total)
```rust
// Cover Letter Templates (5)
list_cover_letter_templates, get_cover_letter_template,
create_cover_letter_template, update_cover_letter_template, delete_cover_letter_template

// Interview Prep (4)
get_interview_prep_checklist, save_interview_prep_checklist,
get_interview_followup, save_interview_followup

// Saved Searches (4)
list_saved_searches, create_saved_search, use_saved_search, delete_saved_search

// Notification Preferences (2)
get_notification_preferences, save_notification_preferences
```

### Migration Strategy
1. On app launch, check for `jobsentinel_localstorage_migrated_v1` flag
2. If not migrated, read localStorage data and write to SQLite
3. Set flag after successful migration
4. Keep localStorage as fallback for 1 release cycle

---

## E4: UI Connections & Polish

**Goal:** Wire up existing but disconnected features, add discoverability.

### 1. Cover Letter Auto-Fill

**Current:** Templates have `{company}`, `{position}` placeholders but no job context
**New:** "Use for Job" button pre-fills from selected application

**File:** `src/components/CoverLetterTemplates.tsx`
- Add `selectedJob` prop
- Add `autoFillTemplate()` function
- Add "Use for Job" button in TemplatePreview

### 2. Keyboard Shortcut Badges

**Current:** Shortcuts work but not discoverable
**New:** Visual hints on buttons

**Files:**
- `src/components/KeyBadge.tsx` - NEW: Renders kbd element
- `src/components/Tooltip.tsx` - Add optional `shortcut` prop
- `src/pages/Dashboard.tsx` - Add shortcut hints to button tooltips

### 3. Tour Integration

**Current:** OnboardingTour component exists but not accessible
**New:** "Take a guided tour" link in keyboard help modal

**File:** `src/components/KeyboardShortcutsHelp.tsx` - Add onStartTour prop and link

### 4. Already Implemented (No Changes Needed)
- ✅ LinkedIn/Indeed search query config UI (Settings.tsx lines 808-1033)
- ✅ CommandPalette global wiring (App.tsx, Cmd+K works)
- ✅ OnboardingTour spotlight overlay (OnboardingTour.tsx)

---

## Verification (v1.4)

1. Ghost detection: Create test job 90+ days old → verify ghost_score > 0.2
2. Score breakdown: Hover score → see factor percentages
3. Application stats: See inline "Applied: X | Interviews: Y" on Applications page
4. Backend persistence: Delete localStorage → restart app → data still exists
5. Cover letter auto-fill: Select application → "Use for Job" → placeholders filled
6. All existing tests pass

---

# Part 2: v2.0.0 - Production Release

## Priority Order

| Priority | Feature | Complexity | Timeline |
|----------|---------|------------|----------|
| P0 | Keyring Integration | Medium | 1-2 weeks |
| P1 | CI/CD Pipeline | Medium | 1-2 weeks |
| P2 | macOS/Windows Packaging | Medium | 1 week |
| P3 | Integration Tests | Medium | 2-3 weeks |
| P4 | Resume Builder + ATS Optimizer | High | 3-4 weeks |
| P5 | One-Click Apply Automation | High | 4-6 weeks |
| P6 | E2E Tests Expansion | Low-Medium | 1-2 weeks |
| P7 | Local AI/ML Lite (Optional) | Medium | 2 weeks |

**Total: 16-22 weeks** (P7 can run parallel with P5/P6)

---

## P0: Keyring Integration

**Goal:** Replace plaintext credential storage with OS-native secure storage.

### Files to Modify
- `src-tauri/Cargo.toml` - Add `keyring = "3"`
- `src-tauri/src/core/credentials/mod.rs` - NEW: CredentialStore wrapper
- `src-tauri/src/core/config/mod.rs` - Remove credentials from JSON serialization
- `src-tauri/src/commands/mod.rs` - Add 4 credential commands
- `src/pages/Settings.tsx` - Update to use keyring commands

### Implementation
1. Add `keyring = { version = "3", features = ["apple-native", "windows-native", "linux-native"] }`
2. Create `CredentialStore` struct with `store()`, `retrieve()`, `delete()`, `exists()`
3. Define credential keys: `SmtpPassword`, `TelegramBotToken`, `LinkedInSessionCookie`
4. Add migration flow: detect v1.x plaintext -> prompt to migrate -> store in keyring -> clear JSON
5. Add Tauri commands: `store_credential`, `retrieve_credential`, `delete_credential`, `has_credential`

### Testing
- Unit tests with mock credential store
- Platform tests on macOS/Windows/Linux
- Migration tests with sample v1.x configs

---

## P1: CI/CD Pipeline + Supply Chain Security

**Goal:** Automated builds, tests, and verifiable releases with supply chain security.

### Files to Create
- `.github/workflows/ci.yml` - PR/push workflow
- `.github/workflows/release.yml` - Tagged release workflow with SBOM + signatures
- `src-tauri/entitlements.plist` - macOS sandbox entitlements

### CI Workflow (`ci.yml`)
```yaml
Triggers: push to main, PRs
Jobs:
  - lint (clippy, eslint)
  - test-rust (cargo test)
  - test-frontend (vitest)
  - build (matrix: ubuntu, macos, windows)
  - security-scan (cargo audit, npm audit)
```

### Release Workflow (`release.yml`)
```yaml
Triggers: tags v*
Jobs:
  - build-all-platforms (unsigned DMG, MSI, AppImage)
  - generate-sbom (CycloneDX format via cargo-sbom)
  - compute-checksums (SHA256 for all artifacts)
  - sign-with-cosign (keyless signing via Sigstore)
  - create-release (upload artifacts + attestations)
```

### Supply Chain Security Stack
1. **SBOM Generation**: `cargo-sbom` for Rust deps, `cyclonedx-npm` for JS deps
2. **Cosign Signing**: Keyless signatures via Sigstore (no certificates needed)
3. **SHA256 Checksums**: `sha256sum` for all release artifacts
4. **SLSA Provenance**: GitHub Actions attestation for build provenance
5. **Dependency Scanning**: `cargo audit` + `npm audit` in CI

### GitHub Secrets Required
- `COSIGN_PRIVATE_KEY` (optional - can use keyless)

### Verification Commands (for users)
```bash
# Verify checksum
sha256sum -c JobSentinel_2.0.0_checksums.txt

# Verify Cosign signature
cosign verify-blob --signature JobSentinel.dmg.sig JobSentinel.dmg

# View SBOM
cat JobSentinel_2.0.0_sbom.json | jq '.components | length'
```

---

## P2: macOS/Windows/Linux Packaging

**Goal:** Distributable installers with supply chain verification (unsigned but verifiable).

### Files to Modify
- `src-tauri/tauri.conf.json` - Bundle targets, metadata
- `src-tauri/icons/*` - Regenerate (some are 0 bytes)

### Build Targets
```json
"targets": ["dmg", "app", "msi", "nsis", "deb", "rpm", "appimage"]
```

### macOS (.dmg, .app)
1. Regenerate icons: `npx tauri icon`
2. Create DMG background image (`assets/dmg-background.png`)
3. **Note**: Unsigned - users bypass Gatekeeper with right-click → Open
4. Document installation instructions for unsigned apps

### Windows (.msi, .nsis)
1. Create installer assets (header/side BMPs)
2. **Note**: Unsigned - SmartScreen warning on first run
3. Document "More info → Run anyway" instructions
4. Consider NSIS installer (smaller, single exe)

### Linux (.deb, .rpm, .AppImage)
1. Configure desktop file and categories
2. AppImage for universal distribution
3. Add to AUR (Arch User Repository) if demand exists

---

## P3: Integration Tests Expansion

**Goal:** Increase coverage from 79% to 85%+, validate automation before enabling.

### Files to Create
- `src-tauri/tests/automation_integration_test.rs`
- `src-tauri/tests/scheduler_integration_test.rs`
- `src-tauri/tests/database_integration_test.rs`
- `src-tauri/tests/api_contract_test.rs`
- `src-tauri/tests/fixtures/*.json`

### Test Coverage
1. **Automation**: Profile lifecycle, ATS detection, rate limiting
2. **Scheduler**: Parallel scraping, error aggregation, notifications
3. **Database**: Migrations, constraints, concurrent writes
4. **API**: All 38+ Tauri command signatures

---

## P4: Resume Builder + ATS Optimizer

**Goal:** Let users create ATS-optimized resumes from scratch AND optimize existing resumes.

### Current State
- Resume parsing exists (`src-tauri/src/core/resume/parser.rs`)
- 70+ skills extraction with confidence scores
- Basic job-resume matching with gap analysis
- Database schema for skills, matches ready
- **No resume creation** - upload-only currently

### Files to Create

**Resume Builder:**
- `src-tauri/src/core/resume/builder.rs` - Resume data model and generation
- `src-tauri/src/core/resume/templates.rs` - ATS-optimized templates
- `src-tauri/src/core/resume/export.rs` - PDF/DOCX export
- `src/pages/ResumeBuilder.tsx` - Multi-step wizard UI
- `src/components/resume/` - Builder components (forms, preview, templates)

**ATS Optimizer:**
- `src-tauri/src/core/resume/ats_analyzer.rs` - ATS keyword analysis
- `src-tauri/src/core/resume/ats_validator.rs` - Format compatibility checks
- `src-tauri/src/core/resume/optimizer.rs` - Optimization suggestions
- `src/pages/ResumeOptimizer.tsx` - Optimizer UI page

### Files to Modify
- `src-tauri/src/core/resume/mod.rs` - Export new modules
- `src-tauri/src/core/resume/matcher.rs` - Extend scoring
- `src-tauri/src/commands/mod.rs` - Add 12 new commands (6 builder + 6 optimizer)

### Implementation

**PART A: Resume Builder**

**1. Resume Data Model** (`builder.rs`)
```rust
struct ResumeData {
    contact: ContactInfo,      // Name, email, phone, LinkedIn, location
    summary: String,           // Professional summary
    experience: Vec<Experience>,
    education: Vec<Education>,
    skills: Vec<SkillEntry>,
    certifications: Vec<Certification>,
    projects: Vec<Project>,    // Optional
}
```

**2. ATS-Optimized Templates** (`templates.rs`)
- **Classic** - Traditional chronological, ATS-safe formatting
- **Modern** - Clean design, still ATS-parseable
- **Technical** - Skills-first for engineering roles
- **Executive** - Summary-focused for senior roles
- **Military Transition** - Veteran→civilian with clearance highlighting, skill translation
- All templates: single-column, standard fonts, no graphics

**3. Reuse from VetSec/AI-ML repo** (your existing work!)
- `resume/ChatGPT/ATS_Optimization.md` → Keyword analysis algorithm, format rules
- `resume/ChatGPT/Prompt_Checklist.md` → Verification prompts (accuracy, alignment, red flags)
- `resume/ChatGPT/Military_Transition.md` → Military skill translation tables
- `resume/ChatGPT/Real_World_Tips.md` → Industry-specific tips (Big Tech, startups, gov)
- `resume/ChatGPT/Cover_Letters.md` → Cover letter module (bonus)

**4. PDF/DOCX Export** (`export.rs`)
- Use `printpdf` crate for PDF generation
- Use `docx-rs` crate for DOCX
- ATS-safe formatting enforced (no tables, simple fonts)
- Automatic page breaks handling

**5. Builder Wizard UI** (`ResumeBuilder.tsx`)
- Step 1: Contact Info
- Step 2: Professional Summary (with AI suggestions)
- Step 3: Work Experience (with action verb suggestions)
- Step 4: Education
- Step 5: Skills (categorized, with ATS keyword hints)
- Step 6: Template Selection + Preview
- Step 7: Export (PDF/DOCX/Plain Text)

**6. Builder Tauri Commands**
```rust
create_resume() -> i64
update_resume_section(resume_id, section, data)
get_resume_draft(resume_id) -> ResumeData
list_templates() -> Vec<Template>
preview_resume(resume_id, template_id) -> String  // HTML preview
export_resume(resume_id, template_id, format) -> Vec<u8>  // PDF/DOCX bytes
```

**PART B: ATS Optimizer**

**1. ATS Keyword Analyzer** (`ats_analyzer.rs`)
- Extract job-category keywords (Data Engineer vs Frontend vs PM)
- Power word detection (action verbs ATS systems favor)
- Keyword density metrics (% of resume with matched keywords)
- Required vs preferred skill weighting
- Industry-specific keyword sets

**2. ATS Format Validator** (`ats_validator.rs`)
- Detect ATS-breaking issues:
  - Complex tables/graphics
  - Multi-column layouts
  - Headers/footers in problematic positions
  - Unusual fonts/characters
- Generate compatibility score (0-100%)
- List specific formatting fixes needed

**3. Resume Optimization Engine** (`optimizer.rs`)
- Keyword injection suggestions ("Add these 5 keywords")
- Strategic placement tips ("Put keywords in summary")
- Action verb suggestions for experience bullets
- Section ordering recommendations
- Missing skill priority (required first, nice-to-have second)
- Time-to-learn estimates for missing skills

**4. Extended Scoring** (extend `MatchResult`)
```rust
struct AtsMatchResult {
    // Existing
    skills_match_score: f64,
    missing_skills: Vec<String>,
    matching_skills: Vec<String>,

    // New ATS fields
    ats_compatibility_score: f64,      // Format issues
    keyword_density_score: f64,        // Keyword saturation
    required_skills_coverage: f64,     // Required vs optional
    optimization_suggestions: Vec<AtsSuggestion>,
    format_issues: Vec<FormatIssue>,
}
```

**5. Tauri Commands**
```rust
analyze_ats_compatibility(resume_id: i64, job_hash: String)
get_keyword_gaps(resume_id: i64, job_hash: String)
get_optimization_suggestions(resume_id: i64, job_hash: String)
validate_resume_format(resume_id: i64)
get_power_words_for_role(role_category: String)
generate_optimized_resume_text(resume_id: i64, job_hash: String)
```

**6. Frontend**
- Resume Optimizer page with:
  - Upload/select resume
  - Select target job
  - ATS compatibility score gauge
  - Keyword gap visualization
  - Actionable suggestions list
  - Before/after comparison view

### Testing
- Unit tests for keyword extraction
- Format validation tests with problematic PDFs
- Integration tests for optimization flow

---

## P5: One-Click Apply Automation

**Goal:** Complete the remaining 60% of automation module.

### Prerequisites
- P0 (Keyring) - Credential storage
- P3 (Tests) - Validation before enabling
- P4 (ATS Optimizer) - Optimized resumes before auto-apply
- Legal review - User consent framework

### Current State (40% complete)
- `src-tauri/src/core/automation/mod.rs` - AutomationManager, status tracking
- `src-tauri/src/core/automation/profile.rs` - ProfileManager, screening answers
- `src-tauri/src/core/automation/ats_detector.rs` - 7 ATS platforms detected
- Database schema ready in migrations
- 16 unit tests passing

### Files to Modify
- `src-tauri/Cargo.toml` - Add `chromiumoxide = "0.9"`
- `src-tauri/src/core/mod.rs` - Uncomment `pub mod automation;`
- `src-tauri/src/core/automation/browser/` - NEW: Browser automation
- `src-tauri/src/commands/automation.rs` - NEW: 8 Tauri commands

### Implementation Phases

**Phase 1: Legal/Consent Framework**
- User opt-in flow with legal disclaimer
- Store consent timestamp in database
- Add Terms of Service acceptance

**Phase 2: Browser Integration**
- Add chromiumoxide (Headless Chrome via CDP)
- Create BrowserManager, Page, FormFiller abstractions
- Implement screenshot capture for debugging

**Phase 3: Form Filling**
- Map profile fields to ATS selectors (using `AtsDetector::get_common_fields()`)
- Handle text, dropdown, file upload fields
- Pause on CAPTCHA detection (never bypass - prompt user)

**Phase 4: Tauri Commands**
```rust
create_automation_attempt(job_hash: String)
approve_automation_attempt(attempt_id: i64)
cancel_automation_attempt(attempt_id: i64)
run_automation_attempt(attempt_id: i64)
get_automation_stats()
get_pending_attempts(limit: usize)
get_screening_answers()
update_screening_answer(pattern: String, answer: String)
```

**Phase 5: Frontend**
- "One-Click Apply" button on JobCard
- Automation queue page with approval flow
- Profile/screening answers settings panel

---

## P6: E2E Tests Expansion

**Goal:** Full Playwright coverage for all pages.

### Files to Create
- `e2e/applications.spec.ts` - Kanban, drag-drop, status updates
- `e2e/resume.spec.ts` - PDF upload, skill extraction, matching
- `e2e/salary.spec.ts` - Predictions, benchmarks, negotiation
- `e2e/market.spec.ts` - Trends, companies, alerts
- `e2e/automation.spec.ts` - Profile setup, approval queue
- `e2e/visual.spec.ts` - Screenshot regression tests
- `e2e/fixtures/` - Test data files

### Current State
- Playwright configured in `playwright.config.ts`
- 20+ test suites in `e2e/app.spec.ts` (414 lines)
- Mock API infrastructure in `src/mocks/`

---

## P7: Local AI/ML - Lite Edition (Optional)

**Goal:** Smarter matching without killing older machines.

**Constraints:** Works on 4GB RAM, older CPUs, no GPU required.

### Lightweight Features

**1. Semantic Job Matching** (MiniLM-L6 embeddings)
- Model size: ~25MB (downloads once)
- Memory when loaded: ~100MB
- Lazy loading: Only loads when user opens Resume Matcher
- Batch processing: Runs during idle time, not blocking UI
- Fallback: Graceful degradation to keyword matching if ML unavailable

**2. Enhanced Red Flag Detection** (No ML - Pattern-based)
- Keyword patterns for warning signals
- "Fast-paced environment" → potential overwork
- "Wear many hats" → understaffed
- "Competitive salary" → probably low
- Zero memory/CPU overhead

**3. LM Studio Integration** (Optional, disabled by default)
- Only enabled if user configures endpoint
- Uses existing local LLM for text suggestions
- Cover letter drafts, bullet point improvements
- Zero overhead if disabled

### Files to Create
- `src-tauri/src/core/ml/mod.rs` - ML module with lazy loading
- `src-tauri/src/core/ml/embeddings.rs` - MiniLM wrapper
- `src-tauri/src/core/ml/red_flags.rs` - Pattern-based detection
- `src-tauri/src/core/ml/lm_studio.rs` - Optional LLM client

### Dependencies
```toml
# Lightweight - only ~25MB model download
candle-core = "0.8"
candle-nn = "0.8"
candle-transformers = "0.8"
hf-hub = "0.3"  # Download models from HuggingFace
```

### Resource Guardrails
- Model loaded lazily on first use
- Unloaded after 5 minutes of inactivity
- Config option to disable entirely
- Memory check before loading (skip if <4GB available)

**Complexity:** Medium | **Timeline:** 2 weeks (can be parallel with other work)

---

## Bonus: Outstanding Differentiators

### Auto-Update (1 week)
- Add `tauri-plugin-updater = "2"` to Cargo.toml
- Configure update endpoint in `tauri.conf.json`
- Generate signing keys for updates
- Host manifests on GitHub Releases

### Global Hotkeys (3-5 days)
- Add `tauri-plugin-global-shortcut = "2"`
- `Cmd/Ctrl+Shift+J` - Open/focus JobSentinel
- `Cmd/Ctrl+Shift+S` - Quick search popup

### Browser Extension (2-3 weeks)
- WebSocket server in Rust for extension communication
- Chrome extension for in-page job scoring
- Firefox extension port
- Shows match score overlay on job postings

---

## Dependencies Summary

```toml
# Cargo.toml additions for v2.0
keyring = { version = "3", features = ["apple-native", "windows-native", "linux-native"] }
chromiumoxide = "0.9"
tauri-plugin-updater = "2"
tauri-plugin-global-shortcut = "2"

# Resume Builder - PDF/DOCX generation
printpdf = "0.7"        # PDF generation
docx-rs = "0.4"         # DOCX generation
```

---

## Verification

### After Each Phase
1. All existing tests pass (`cargo test`, `npm test`)
2. Build succeeds on all platforms (`cargo build --release`)
3. Manual smoke test of affected features

### Final v2.0 Verification
1. Fresh install on clean macOS, Windows, and Linux VMs
2. Full user journey: setup -> scrape -> bookmark -> apply
3. Credential migration from v1.x config works
4. Auto-update from v1.3.1 to v2.0.0 works
5. Code coverage >= 85%
6. SBOM accurate and Cosign signatures verify
7. SHA256 checksums match published values

---

## Critical Files Reference

| File | Purpose |
|------|---------|
| `src-tauri/src/core/config/mod.rs` | Credential fields to migrate to keyring |
| `src-tauri/src/core/resume/mod.rs` | Resume parsing, skills, matching (extend for builder + ATS) |
| `src-tauri/src/core/resume/matcher.rs` | Job-resume matching (extend scoring) |
| `src-tauri/src/core/resume/skills.rs` | 70+ skill extraction (extend for ATS keywords) |
| `src/pages/Resume.tsx` | Current resume page (extend or replace with builder) |
| `src-tauri/src/core/automation/mod.rs` | 40% complete automation foundation |
| `src-tauri/src/core/automation/ats_detector.rs` | ATS platform detection (7 platforms) |
| `src-tauri/src/commands/mod.rs` | 38 existing commands, add ~24 more |
| `src-tauri/tauri.conf.json` | Build targets, bundle config |
| `docs/ONE_CLICK_APPLY_AUTOMATION.md` | Detailed automation design doc |
