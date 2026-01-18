# One-Click Apply Implementation Plan

**Feature:** Full One-Click Apply (without auto-submit)
**Scope:** Enable Phase 1 + Build Phase 2 (Browser) + Build Phase 3 (Form Fill)
**Excluded:** Auto-submit button click, CAPTCHA bypass

## Overview

Implement automated form filling that:
1. Opens job application in headless browser
2. Fills all form fields from user profile + screening answers
3. Uploads resume file
4. **STOPS before submit** - user reviews and clicks submit manually
5. Takes screenshot for confirmation

## Current State

### What Exists (Phase 1 - 100% complete, disabled)

```
src-tauri/src/core/automation/
├── mod.rs        (15KB) - AutomationManager, ApplicationAttempt tracking
├── ats_detector.rs (11KB) - 7 ATS platforms detected
└── profile.rs    (13KB) - ApplicationProfile, ScreeningAnswer
```

- **ProfileManager**: upsert_profile, get_profile, screening answers
- **AutomationManager**: create_attempt, approve, mark_submitted, get_stats
- **AtsDetector**: detect_from_url, detect_from_html, get_common_fields
- **Database**: 5 tables, 6 indexes, 10 default screening answers
- **Tests**: 16 passing

### What's Missing

1. Module disabled (`// pub mod automation` in core/mod.rs)
2. No Tauri commands for automation
3. No headless browser integration
4. No form filling logic
5. No frontend UI

## Implementation Plan

### Phase 1: Enable Existing Code (30 min)

**Files to modify:**

1. `src-tauri/src/core/mod.rs:45`
   - Uncomment: `pub mod automation;`

2. `src-tauri/src/commands/automation.rs` (NEW - ~200 lines)
   - Create 12 Tauri commands for automation

3. `src-tauri/src/commands/mod.rs`
   - Add `pub mod automation;`
   - Re-export automation commands

**Commands to add:**

```rust
// Profile management
upsert_application_profile(input: ApplicationProfileInput) -> i64
get_application_profile() -> Option<ApplicationProfile>
upsert_screening_answer(pattern, answer, answer_type, notes) -> ()
get_screening_answers() -> Vec<ScreeningAnswer>
find_answer_for_question(question: String) -> Option<String>

// Automation management
create_automation_attempt(job_hash: String, ats_platform: String) -> i64
get_automation_attempt(attempt_id: i64) -> ApplicationAttempt
approve_automation_attempt(attempt_id: i64) -> ()
cancel_automation_attempt(attempt_id: i64) -> ()
get_pending_attempts(limit: usize) -> Vec<ApplicationAttempt>
get_automation_stats() -> AutomationStats

// ATS detection
detect_ats_platform(url: String) -> String
```

### Phase 2: Headless Browser Integration (2-3 hours)

**New files:**

```
src-tauri/src/core/automation/
├── browser/
│   ├── mod.rs        (~100 lines) - Module exports
│   ├── manager.rs    (~300 lines) - BrowserManager struct
│   ├── page.rs       (~200 lines) - Page abstraction
│   └── screenshot.rs (~100 lines) - Screenshot capture
```

**Dependencies to add (Cargo.toml):**

```toml
chromiumoxide = { version = "0.7", features = ["tokio-runtime"] }
```

**BrowserManager API:**

```rust
pub struct BrowserManager {
    browser: Option<Browser>,
}

impl BrowserManager {
    pub async fn launch() -> Result<Self>;
    pub async fn new_page(&self, url: &str) -> Result<Page>;
    pub async fn close(&mut self) -> Result<()>;
}

pub struct Page {
    page: chromiumoxide::Page,
}

impl Page {
    pub async fn navigate(&self, url: &str) -> Result<()>;
    pub async fn wait_for_selector(&self, selector: &str, timeout_ms: u64) -> Result<()>;
    pub async fn fill(&self, selector: &str, value: &str) -> Result<()>;
    pub async fn click(&self, selector: &str) -> Result<()>;
    pub async fn upload_file(&self, selector: &str, path: &Path) -> Result<()>;
    pub async fn screenshot(&self, path: &Path) -> Result<()>;
    pub async fn get_html(&self) -> Result<String>;
    pub async fn has_captcha(&self) -> bool;
}
```

**Tauri commands to add:**

```rust
// Browser control
launch_browser() -> Result<(), String>
close_browser() -> Result<(), String>
navigate_to_job(job_hash: String) -> Result<String, String>  // Returns page HTML
take_screenshot(path: String) -> Result<(), String>
```

### Phase 3: Form Auto-Fill Logic (2-3 hours)

**New file:**

```
src-tauri/src/core/automation/
├── form_filler.rs  (~400 lines) - Form filling logic
```

**FormFiller API:**

```rust
pub struct FormFiller {
    profile: ApplicationProfile,
    answers: Vec<ScreeningAnswer>,
    resume_path: Option<PathBuf>,
}

impl FormFiller {
    pub fn new(profile: ApplicationProfile, answers: Vec<ScreeningAnswer>) -> Self;

    pub async fn fill_page(&self, page: &Page, platform: &AtsPlatform) -> Result<FillResult>;

    // Returns what was filled and what needs manual attention
    pub struct FillResult {
        filled_fields: Vec<String>,
        unfilled_fields: Vec<String>,
        captcha_detected: bool,
        ready_for_review: bool,
    }
}

// Field mapping by platform
fn get_field_selectors(platform: &AtsPlatform) -> HashMap<FieldType, Vec<&str>>;

enum FieldType {
    FirstName, LastName, Email, Phone,
    LinkedIn, GitHub, Portfolio, Website,
    Resume, CoverLetter,
    WorkAuthorized, RequiresSponsorship,
    // Screening questions handled via regex matching
}
```

**Tauri commands to add:**

```rust
// Form filling
fill_application_form(job_hash: String) -> Result<FillResult, String>
get_form_preview(job_hash: String) -> Result<FormPreview, String>  // What will be filled
```

### Phase 4: Frontend UI (3-4 hours)

**New files:**

```
src/pages/
├── ApplicationProfile.tsx    (~400 lines) - Profile settings form
├── AutomationQueue.tsx       (~300 lines) - Pending applications list

src/components/automation/
├── ProfileForm.tsx           (~250 lines) - Contact info form
├── ScreeningAnswersForm.tsx  (~200 lines) - Q&A configuration
├── AutomationSettings.tsx    (~150 lines) - Max daily, manual approval toggle
├── AtsBadge.tsx              (~50 lines)  - Show detected ATS on job cards
├── ApplyButton.tsx           (~100 lines) - "Prepare Application" button
├── ApplicationPreview.tsx    (~200 lines) - Preview what will be filled
```

**UI Flow:**

1. **Job Card** shows ATS badge (Greenhouse, Lever, etc.)
2. **"Prepare Application" button** on job detail
3. **Preview Modal** shows what will be filled
4. **"Fill Form" action** opens browser, fills fields, pauses
5. **User reviews** filled form in browser window
6. **User clicks submit** manually
7. **Confirmation screenshot** captured

### Phase 5: Integration & Testing (1-2 hours)

**Integration tests:**

```
src-tauri/tests/
├── automation_integration_test.rs  (update existing - add browser tests)
```

**Test scenarios:**

1. Profile CRUD operations
2. Screening answer matching
3. ATS detection from URLs
4. Browser launch/close
5. Form field detection
6. Screenshot capture

## File Changes Summary

| File | Action | Lines |
|------|--------|-------|
| `core/mod.rs` | Edit | +1 (uncomment) |
| `commands/automation.rs` | New | ~300 |
| `commands/mod.rs` | Edit | +15 |
| `core/automation/browser/mod.rs` | New | ~100 |
| `core/automation/browser/manager.rs` | New | ~300 |
| `core/automation/browser/page.rs` | New | ~200 |
| `core/automation/browser/screenshot.rs` | New | ~100 |
| `core/automation/form_filler.rs` | New | ~400 |
| `Cargo.toml` | Edit | +2 |
| `src/pages/ApplicationProfile.tsx` | New | ~400 |
| `src/pages/AutomationQueue.tsx` | New | ~300 |
| `src/components/automation/*` | New | ~750 |

**Total new code:** ~2,850 lines

## Critical Design Decisions

### 1. No Auto-Submit

The form filler will:
- Fill all detected fields
- Upload resume
- **STOP and leave browser open**
- User reviews and clicks submit

### 2. No CAPTCHA Handling

If CAPTCHA detected:
- Set `FillResult.captcha_detected = true`
- Show user message: "CAPTCHA detected - please solve manually"
- Leave browser open for user

### 3. Browser Visibility (User Choice: Visible)

- **Always visible browser** - user watches form being filled in real-time
- User can intervene at any point if something looks wrong
- After filling completes, browser stays open for user to review and submit
- Screenshot captured after user submits for confirmation

### 4. Platform-Specific Selectors

Hardcoded selectors per ATS platform (already in ats_detector.rs):
- Greenhouse: `first_name`, `last_name`, `email`, etc.
- Lever: `name`, `email`, `cards[Apply].fields[*]`
- Workday: `input-1`, `input-2` (generic, needs careful handling)

### 5. Resume Selection

- Use resume from Resume Builder (default_resume_id in profile)
- Export to temp file for upload
- Clean up temp file after upload

## Verification Plan

1. **Unit tests**: Run `cargo test automation`
2. **Manual test**:
   - Set up profile with test data
   - Navigate to a Greenhouse job
   - Click "Prepare Application"
   - Verify fields filled correctly
   - Verify browser stays open
   - Manually click submit
3. **Screenshot verification**: Check confirmation screenshot captured

## Dependencies

- `chromiumoxide` crate for headless Chrome
- Chrome/Chromium installed on user's system
- Existing Resume Builder for resume export

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Chrome not installed | Check on launch, show install instructions |
| ATS changes selectors | Fallback to generic field detection |
| CAPTCHA blocks automation | Detect and pause for user |
| Large dependency (chromiumoxide) | Lazy load only when needed |
| Rate limiting by ATS | Respect existing max_applications_per_day |

## Rollout Strategy

1. Enable Phase 1 first (profile + commands) - no browser dependency
2. Add browser integration behind feature flag
3. Test with Greenhouse (most common, easiest)
4. Expand to Lever, then others
