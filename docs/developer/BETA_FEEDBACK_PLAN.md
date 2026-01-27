# JobSentinel - Beta Tester Feedback System Plan

**Status:** Proposed
**Created:** 2026-01-26
**Last Updated:** 2026-01-26
**Priority:** High (Pre-Beta Release)
**Tags:** beta, feedback, privacy, anonymization, public-repo

---

## Executive Summary

JobSentinel needs a feedback mechanism for beta testers that:

1. Respects the app's 100% offline, zero-tracking philosophy
2. Works for users with **zero technical knowledge**
3. Captures useful bug reports and feature requests
4. **Prioritizes GitHub Issues** (public, searchable, community-driven)
5. **100% anonymizes all logs** - this is a PUBLIC repo

**CRITICAL: This is a PUBLIC repository. All feedback files, logs, and debug information MUST be completely anonymized. No PII. No identifiable job searches. No company names. Nothing.**

### Primary Feedback Channel: GitHub Issues

**URL:** https://github.com/cboyd0319/JobSentinel/issues

GitHub Issues is the PRIMARY feedback channel because:
- Public - helps other users find solutions
- Searchable - reduces duplicate reports
- Community - users can add "+1" or context
- Integrated - links to commits, PRs, milestones
- Trackable - clear issue lifecycle

### Secondary Feedback Channel: Google Drive

**URL:** https://drive.google.com/drive/folders/1cbhxt_8mVf4fbi-eD3XPd2UGUSBmhLfo

For users who:
- Don't have a GitHub account
- Aren't comfortable with public issue submission
- Want to attach large files (screen recordings, etc.)
- Prefer a more private channel

---

## Table of Contents

1. [Core Philosophy](#1-core-philosophy)
2. [Privacy & Anonymization (CRITICAL)](#2-privacy--anonymization-critical)
3. [User Experience Design](#3-user-experience-design)
4. [GitHub Issues Integration](#4-github-issues-integration)
5. [Technical Architecture](#5-technical-architecture)
6. [Implementation Phases](#6-implementation-phases)
7. [Data Included in Reports](#7-data-included-in-reports)
8. [Edge Cases & Error Handling](#8-edge-cases--error-handling)
9. [Testing Strategy](#9-testing-strategy)
10. [Future Enhancements](#10-future-enhancements)

---

## 1. Core Philosophy

### The Golden Rule

> **GitHub Issues first, but never leave a user stranded.**

If a user can't or won't use GitHub, they should still have a clear path to submit feedback.

### Design Principles

| Principle | What It Means |
|-----------|---------------|
| **GitHub First** | Primary channel - public, searchable, community-driven |
| **Privacy by Default** | All debug info is anonymized BEFORE the user sees it |
| **One-Click Simplicity** | Pre-fill issue templates with anonymized system info |
| **Multiple Channels** | GitHub Issues OR Google Drive - user's choice |
| **Offline First** | Everything works without internet; sending happens outside JobSentinel |

### What We're NOT Building

- ❌ Telemetry or analytics
- ❌ Automatic crash reporting
- ❌ Network-based feedback submission (the app never sends anything)
- ❌ User tracking or session replay
- ❌ Anything that "phones home"
- ❌ Logs that could identify users or their job search

---

## 2. Privacy & Anonymization (CRITICAL)

### 2.1 Why This Matters

**JobSentinel is a PUBLIC repository.** Every issue, every log snippet, every debug report is visible to the entire internet. Job seekers' privacy is paramount.

> **A user's job search is deeply personal. We must NEVER leak:**
> - What jobs they're looking for
> - Which companies they're targeting
> - Their resume content
> - Their location preferences
> - Their salary expectations
> - Their notification settings

### 2.2 Anonymization Rules

#### ALWAYS Stripped (Automatic)

| Data Type | Before Anonymization | After Anonymization |
|-----------|---------------------|---------------------|
| File paths | `/Users/johnsmith/Documents/resume.pdf` | `/Users/[USER]/Documents/resume.pdf` |
| Job titles | `Senior Software Engineer at Google` | `[JOB_TITLE] at [COMPANY]` |
| Company names | `Matched: Microsoft, Apple, Meta` | `Matched: [N] companies` |
| Webhook URLs | `https://hooks.slack.com/T123/B456/xyz` | `Slack webhook: [CONFIGURED]` |
| Email addresses | `john@example.com` | `[EMAIL]` |
| Scraper keywords | `"rust developer" OR "systems engineer"` | `[N] search keywords configured` |
| Location prefs | `San Francisco, Remote OK` | `Location preferences: [CONFIGURED]` |
| Salary prefs | `$150k - $200k` | `Salary preferences: [CONFIGURED]` |
| Resume content | `Experience: 10 years at...` | `[RESUME_CONTENT_REDACTED]` |
| LinkedIn cookie | `li_at=AQEDA...` | `LinkedIn session: [CONFIGURED]` |
| Database paths | `/Users/john/Library/.../jobs.db` | `[APP_DATA]/jobs.db` |

#### NEVER Logged (By Design)

| Data | Reason |
|------|--------|
| Resume text or parsed content | Private career history |
| Job descriptions | May contain identifiable search patterns |
| Company blocklist/allowlist | Reveals user's preferences |
| Application tracking data | Private job search activity |
| Ghost job feedback | Reveals which jobs user is viewing |
| Notification webhook payloads | Contains job match details |
| Scraper results | Contains actual job listings |
| Error messages with job data | May contain titles/companies |

### 2.3 Implementation: The Sanitizer

```rust
// src-tauri/src/commands/feedback/sanitizer.rs

use regex::Regex;
use lazy_static::lazy_static;

lazy_static! {
    // Common patterns to anonymize
    static ref PATH_REGEX: Regex = Regex::new(r"/(Users|home)/[^/\s]+").unwrap();
    static ref EMAIL_REGEX: Regex = Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").unwrap();
    static ref WEBHOOK_REGEX: Regex = Regex::new(r"https://hooks\.(slack|discord)\.com/[^\s]+").unwrap();
    static ref LINKEDIN_COOKIE_REGEX: Regex = Regex::new(r"li_at=[^\s;]+").unwrap();
}

pub struct Sanitizer;

impl Sanitizer {
    /// Sanitize all user-identifiable information from text
    pub fn sanitize(text: &str) -> String {
        let mut result = text.to_string();

        // Paths: /Users/johnsmith → /Users/[USER]
        result = PATH_REGEX.replace_all(&result, "/[USER_PATH]").to_string();

        // Emails: john@example.com → [EMAIL]
        result = EMAIL_REGEX.replace_all(&result, "[EMAIL]").to_string();

        // Webhooks: full URL → [WEBHOOK_CONFIGURED]
        result = WEBHOOK_REGEX.replace_all(&result, "[WEBHOOK_CONFIGURED]").to_string();

        // LinkedIn cookies
        result = LINKEDIN_COOKIE_REGEX.replace_all(&result, "li_at=[REDACTED]").to_string();

        result
    }

    /// Sanitize a path specifically
    pub fn sanitize_path(path: &str) -> String {
        PATH_REGEX.replace_all(path, "/[USER_PATH]").to_string()
    }

    /// Sanitize error messages that might contain user data
    pub fn sanitize_error(error: &str) -> String {
        let mut result = Self::sanitize(error);

        // Remove quoted strings that might be job titles or company names
        let quoted_regex = Regex::new(r#""[^"]+""#).unwrap();
        result = quoted_regex.replace_all(&result, "\"[REDACTED]\"").to_string();

        // Remove single-quoted strings too
        let single_quoted_regex = Regex::new(r"'[^']+'").unwrap();
        result = single_quoted_regex.replace_all(&result, "'[REDACTED]'").to_string();

        result
    }

    /// Summarize configuration without revealing details
    pub fn summarize_config(config: &Config) -> ConfigSummary {
        ConfigSummary {
            scrapers_enabled: config.enabled_scrapers.len(),
            keywords_count: config.keywords.len(),
            has_location_prefs: !config.location_preferences.is_empty(),
            has_salary_prefs: config.salary_floor.is_some(),
            has_company_blocklist: !config.company_blocklist.is_empty(),
            has_company_allowlist: !config.company_allowlist.is_empty(),
            notifications_configured: count_configured_notifications(&config.notifications),
            has_resume: config.resume_path.is_some(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ConfigSummary {
    pub scrapers_enabled: usize,
    pub keywords_count: usize,
    pub has_location_prefs: bool,
    pub has_salary_prefs: bool,
    pub has_company_blocklist: bool,
    pub has_company_allowlist: bool,
    pub notifications_configured: usize,
    pub has_resume: bool,
}
```

### 2.4 Privacy Checklist (Pre-Release)

Before every release, verify:

- [ ] All file paths anonymized
- [ ] No job titles in logs
- [ ] No company names in logs
- [ ] No email addresses in logs
- [ ] No webhook URLs in logs
- [ ] No LinkedIn session data in logs
- [ ] No resume content accessible
- [ ] No location preferences exposed
- [ ] No salary information exposed
- [ ] Error messages sanitized
- [ ] Debug log preview shows only safe data

---

## 3. User Experience Design

### 3.1 Entry Points

| Location | Trigger | Context |
|----------|---------|---------|
| **Help Menu** | Settings → Help → "Send Feedback" | Intentional feedback |
| **Error Toast** | "Something went wrong" → "Report This" | Bug reporting |
| **Keyboard Shortcut** | `Cmd/Ctrl + Shift + F` | Power users |
| **About Screen** | "Report an Issue" button | Visible reminder |

### 3.2 The Two-Path Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FEEDBACK FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. USER CLICKS "SEND FEEDBACK"                                     │
│     ↓                                                               │
│  2. CATEGORY SELECTION (3 big buttons)                              │
│     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│     │  Bug         │ │  Idea        │ │  Other       │              │
│     │  Something   │ │  Feature or  │ │  Question or │              │
│     │  isn't       │ │  improvement │ │  comment     │              │
│     │  working     │ │  request     │ │              │              │
│     └──────────────┘ └──────────────┘ └──────────────┘              │
│     ↓                                                               │
│  3. DESCRIPTION (simple text area)                                  │
│     ↓                                                               │
│  4. INCLUDE DEBUG INFO (checkbox, ON by default for bugs)           │
│     → Shows ANONYMIZED preview                                      │
│     ↓                                                               │
│  5. CHOOSE SUBMISSION METHOD                                        │
│     ┌─────────────────────────────────────────────────────────────┐ │
│     │                                                             │ │
│     │  ╔═══════════════════════════════════════════════════════╗  │ │
│     │  ║  RECOMMENDED: Submit via GitHub Issues               ║  │ │
│     │  ║  (Public, searchable, community-driven)               ║  │ │
│     │  ║                                                       ║  │ │
│     │  ║  [Open GitHub Issue] ← Pre-fills issue template       ║  │ │
│     │  ╚═══════════════════════════════════════════════════════╝  │ │
│     │                                                             │ │
│     │  ─────────── OR ───────────                                 │ │
│     │                                                             │ │
│     │  Prefer to submit privately?                                │ │
│     │  [Save & Upload to Google Drive]                            │ │
│     │                                                             │ │
│     └─────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 GitHub Issues Path (Primary)

```
User clicks "Open GitHub Issue"
        ↓
Browser opens: github.com/cboyd0319/JobSentinel/issues/new
        ↓
Issue template pre-selected based on category (bug/feature/question)
        ↓
Clipboard contains ANONYMIZED debug info (user can paste)
        ↓
User edits title/description, submits
        ↓
Issue created, user can track progress
```

### 3.4 Google Drive Path (Secondary)

```
User clicks "Save & Upload to Google Drive"
        ↓
Save dialog opens (suggest Desktop)
        ↓
File saved: jobsentinel-bug-2026-01-26-1545.txt
        ↓
Success screen with instructions:
  1. Click "Open Google Drive Feedback Folder"
  2. Drag your file into the folder
  3. That's it!
```

### 3.5 Key UX Decisions

| Decision | Rationale |
|----------|-----------|
| GitHub Issues highlighted as "RECOMMENDED" | We want issues in the public tracker |
| Pre-fill clipboard, not issue body | User reviews before pasting - extra privacy check |
| Anonymized preview shown BEFORE any action | Transparency - user sees exactly what's shared |
| Google Drive as clear alternative | Don't force GitHub on everyone |
| No email option | Too unreliable across platforms |

---

## 4. GitHub Issues Integration

### 4.1 Issue Templates

Create these templates in `.github/ISSUE_TEMPLATE/`:

#### Bug Report Template

```yaml
# .github/ISSUE_TEMPLATE/bug_report.yml
name: Bug Report
description: Something isn't working right
title: "[Bug]: "
labels: ["bug", "triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to report a bug!

        **Important:** Please don't include any personal information like:
        - Specific job titles you're searching for
        - Company names from your search
        - Your location or salary preferences

  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: A clear description of what went wrong
      placeholder: "When I clicked X, I expected Y but got Z instead"
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
      description: How can we make this happen?
      placeholder: |
        1. Go to '...'
        2. Click on '...'
        3. See error

  - type: textarea
    id: debug-info
    attributes:
      label: Debug Information
      description: Paste the ANONYMIZED debug info from JobSentinel (Help → Send Feedback → Copy Debug Info)
      render: shell

  - type: textarea
    id: screenshots
    attributes:
      label: Screenshots
      description: If applicable, add screenshots (make sure they don't show personal info!)

  - type: dropdown
    id: os
    attributes:
      label: Operating System
      options:
        - Windows 11
        - Windows 10
        - macOS 15 (Sequoia)
        - macOS 14 (Sonoma)
        - macOS 13 (Ventura)
        - Linux
    validations:
      required: true
```

#### Feature Request Template

```yaml
# .github/ISSUE_TEMPLATE/feature_request.yml
name: Feature Request
description: Suggest an improvement or new feature
title: "[Feature]: "
labels: ["enhancement", "triage"]
body:
  - type: markdown
    attributes:
      value: |
        We'd love to hear your ideas for making JobSentinel better!

  - type: textarea
    id: problem
    attributes:
      label: What problem does this solve?
      description: Describe the use case or pain point
      placeholder: "I often find myself needing to..."
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Describe your proposed solution
      description: What would you like to see?

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives you've considered
      description: Any other approaches you've thought about?
```

#### Question Template

```yaml
# .github/ISSUE_TEMPLATE/question.yml
name: Question
description: Ask a question about using JobSentinel
title: "[Question]: "
labels: ["question"]
body:
  - type: textarea
    id: question
    attributes:
      label: Your question
      description: What would you like to know?
    validations:
      required: true

  - type: textarea
    id: context
    attributes:
      label: Additional context
      description: Any relevant background
```

### 4.2 Pre-Filling Issue Data

When user clicks "Open GitHub Issue":

```typescript
// src/services/feedback.ts

export async function openGitHubIssue(
  category: 'bug' | 'feature' | 'question',
  description: string,
  debugInfo: string | null
): Promise<void> {
  // 1. Copy debug info to clipboard (if included)
  if (debugInfo) {
    await navigator.clipboard.writeText(debugInfo);
  }

  // 2. Build GitHub issue URL
  const template = category === 'bug' ? 'bug_report.yml'
                 : category === 'feature' ? 'feature_request.yml'
                 : 'question.yml';

  const params = new URLSearchParams({
    template,
    // Don't pre-fill title - let user write something specific
  });

  const url = `https://github.com/cboyd0319/JobSentinel/issues/new?${params}`;

  // 3. Open browser
  await invoke('open_url', { url });

  // 4. Show toast with next steps
  toast.info(
    debugInfo
      ? 'Debug info copied! Paste it into the GitHub issue form.'
      : 'Opening GitHub... Fill out the issue form to submit.'
  );
}
```

### 4.3 Making GitHub Easy

Display this guidance in the feedback modal:

```
╔═══════════════════════════════════════════════════════════════════╗
║  Why GitHub Issues?                                               ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ✓ Public - Others with the same issue can find the solution     ║
║  ✓ Trackable - See when your issue is addressed                  ║
║  ✓ Searchable - Check if it's already been reported              ║
║  ✓ Community - Other users can add context                       ║
║                                                                   ║
║  Don't have a GitHub account?                                     ║
║  → It's free! github.com/signup                                  ║
║  → Or use the Google Drive option below                          ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## 5. Technical Architecture

### 5.1 Components Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐    ┌─────────────────────┐                 │
│  │  FeedbackModal.tsx  │    │   useFeedback.ts    │                 │
│  │  (UI Component)     │◄───│   (Hook)            │                 │
│  └─────────────────────┘    └─────────────────────┘                 │
│           │                          │                              │
│           ▼                          ▼                              │
│  ┌─────────────────────┐    ┌─────────────────────┐                 │
│  │ DebugInfoPreview    │    │  feedbackService.ts │                 │
│  │ (Shows anonymized)  │    │  (Business logic)   │                 │
│  └─────────────────────┘    └─────────────────────┘                 │
│                                      │                              │
└──────────────────────────────────────│──────────────────────────────┘
                                       │ IPC (invoke)
                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Rust/Tauri)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐    ┌─────────────────────┐                 │
│  │ feedback.rs         │    │ system_info.rs      │                 │
│  │ - generate_report() │    │ - get_system_info() │                 │
│  │ - save_to_file()    │    │ - get_app_version() │                 │
│  │ - open_github()     │    │ - get_debug_log()   │                 │
│  └─────────────────────┘    └─────────────────────┘                 │
│           │                          │                              │
│           ▼                          ▼                              │
│  ┌─────────────────────┐    ┌─────────────────────┐                 │
│  │ DebugLogBuffer      │    │ Sanitizer           │                 │
│  │ (Ring buffer of     │    │ - ALL OUTPUT GOES   │                 │
│  │  last 100 events)   │    │   THROUGH HERE      │                 │
│  └─────────────────────┘    └─────────────────────┘                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 File Structure

```
src/
├── components/
│   └── feedback/
│       ├── FeedbackModal.tsx        # Main modal component
│       ├── CategorySelector.tsx     # Bug/Idea/Other buttons
│       ├── DescriptionInput.tsx     # Text area with prompts
│       ├── DebugInfoPreview.tsx     # Shows ANONYMIZED preview
│       ├── SubmitOptions.tsx        # GitHub (primary) / Drive (secondary)
│       └── SuccessScreen.tsx        # Post-save instructions
│
├── hooks/
│   └── useFeedback.ts               # Feedback state management
│
└── services/
    └── feedbackService.ts           # Business logic

src-tauri/
└── src/
    └── commands/
        └── feedback/
            ├── mod.rs               # Module exports
            ├── report.rs            # Report generation
            ├── system_info.rs       # System info collection
            ├── debug_log.rs         # Debug log management
            └── sanitizer.rs         # ALL OUTPUT ANONYMIZATION
```

### 5.3 Debug Log System

A lightweight event log that helps diagnose issues WITHOUT tracking users:

```rust
// What gets logged (action types only, NEVER content)
pub enum DebugEvent {
    AppStarted { version: String },
    ViewNavigated { from: String, to: String },
    CommandInvoked { command: String, success: bool },
    ErrorOccurred { code: String, message: String }, // message is SANITIZED
    ScraperRun { scraper: String, jobs_found: usize }, // count only
    FeatureUsed { feature: String },
}

// Ring buffer implementation
pub struct DebugLogBuffer {
    events: VecDeque<TimestampedEvent>,
    max_size: usize, // Default: 100 events
}
```

**What IS logged (safe):**
- View transitions (`Dashboard → Jobs`)
- Command outcomes (`scrape_jobs → success, 42 jobs`)
- Errors with SANITIZED messages
- Feature usage (`opened Settings`, `triggered scrape`)
- Scraper names and job counts (no content)

**What is NEVER logged:**
- Job titles, descriptions, or company names
- User's search keywords or filters
- Resume content or file paths
- Salary or location preferences
- Notification webhook URLs or payloads
- LinkedIn session cookies
- Company blocklist/allowlist contents
- Any user-entered text

### 5.4 Report Format

The generated report is:
1. **Human-readable** - Plain text with clear sections
2. **AI-parseable** - JSON block at the end for automated processing
3. **FULLY ANONYMIZED** - No PII, no identifiable data
4. **Safe** - Plain `.txt` file, no executable content

```
═══════════════════════════════════════════════════════════════════════
                    JOBSENTINEL BETA FEEDBACK REPORT
═══════════════════════════════════════════════════════════════════════

CATEGORY: Bug Report
DATE: January 26, 2026 at 3:45 PM

───────────────────────────────────────────────────────────────────────
YOUR FEEDBACK
───────────────────────────────────────────────────────────────────────

When I try to run the Indeed scraper, it fails with a timeout error
after about 30 seconds.

───────────────────────────────────────────────────────────────────────
SYSTEM INFORMATION (anonymized)
───────────────────────────────────────────────────────────────────────

App Version: 2.6.3
Platform: Windows 11 (10.0.22631)
Architecture: x86_64

───────────────────────────────────────────────────────────────────────
CONFIGURATION SUMMARY (anonymized - no actual values)
───────────────────────────────────────────────────────────────────────

Scrapers enabled: 5
Search keywords configured: 3
Location preferences: configured
Salary preferences: configured
Company blocklist: 2 entries
Notifications: Slack, Desktop

───────────────────────────────────────────────────────────────────────
RECENT ACTIVITY LOG (anonymized)
───────────────────────────────────────────────────────────────────────

[3:44:12] Navigated to: Dashboard
[3:44:18] Started scraper: Indeed
[3:44:48] Scraper error: timeout (30s)
[3:44:49] Error displayed to user
[3:44:55] Opened: FeedbackModal

───────────────────────────────────────────────────────────────────────
STRUCTURED DATA (for automated processing)
───────────────────────────────────────────────────────────────────────

```json
{
  "schema_version": "1.0",
  "app_version": "2.6.3",
  "category": "bug",
  "timestamp": "2026-01-26T15:45:00Z",
  "platform": {
    "os": "windows",
    "os_version": "11",
    "arch": "x86_64"
  },
  "config_summary": {
    "scrapers_enabled": 5,
    "keywords_count": 3,
    "has_location_prefs": true,
    "has_salary_prefs": true,
    "has_company_blocklist": true,
    "notifications_configured": 2
  },
  "debug_events": [
    {"time": "15:44:12", "event": "navigated", "view": "Dashboard"},
    {"time": "15:44:18", "event": "scraper_started", "scraper": "indeed"},
    {"time": "15:44:48", "event": "scraper_error", "error": "timeout"}
  ]
}
```

═══════════════════════════════════════════════════════════════════════
                    END OF REPORT
═══════════════════════════════════════════════════════════════════════
```

---

## 6. Implementation Phases

### Phase 1: Core Feedback System (MVP)

**Goal:** Basic feedback flow with GitHub Issues as primary, Google Drive as secondary.

#### Backend Tasks (Rust)

| # | Task | File | Details |
|---|------|------|---------|
| 1.1 | Create feedback module | `commands/feedback/mod.rs` | Module structure |
| 1.2 | Create Sanitizer | `commands/feedback/sanitizer.rs` | ALL OUTPUT GOES THROUGH HERE |
| 1.3 | Create report generator | `commands/feedback/report.rs` | Anonymized report formatting |
| 1.4 | Get system info command | `commands/feedback/system_info.rs` | App version, OS, arch |
| 1.5 | Get config summary command | Same | Counts only, no values |
| 1.6 | Save file command | `commands/feedback/report.rs` | File save dialog |
| 1.7 | Open GitHub Issues | `commands/feedback/mod.rs` | Browser to new issue |
| 1.8 | Open Google Drive folder | Same | Browser to Drive folder |
| 1.9 | Reveal saved file | Same | Finder/Explorer |

#### Frontend Tasks (React)

| # | Task | File | Details |
|---|------|------|---------|
| 1.10 | Create FeedbackModal | `components/feedback/FeedbackModal.tsx` | Main modal |
| 1.11 | Category selector | `components/feedback/CategorySelector.tsx` | 3 big buttons |
| 1.12 | Description input | `components/feedback/DescriptionInput.tsx` | Textarea |
| 1.13 | Debug info preview | `components/feedback/DebugInfoPreview.tsx` | SHOWS ANONYMIZED DATA |
| 1.14 | Submit options | `components/feedback/SubmitOptions.tsx` | GitHub vs Drive |
| 1.15 | Success screen | `components/feedback/SuccessScreen.tsx` | Next steps |
| 1.16 | useFeedback hook | `hooks/useFeedback.ts` | State management |
| 1.17 | Add to Help menu | `components/Settings/*.tsx` | Entry point |

#### GitHub Integration

| # | Task | File | Details |
|---|------|------|---------|
| 1.18 | Bug report template | `.github/ISSUE_TEMPLATE/bug_report.yml` | Issue form |
| 1.19 | Feature request template | `.github/ISSUE_TEMPLATE/feature_request.yml` | Issue form |
| 1.20 | Question template | `.github/ISSUE_TEMPLATE/question.yml` | Issue form |
| 1.21 | Config.yml | `.github/ISSUE_TEMPLATE/config.yml` | Template config |

### Phase 2: Debug Log System

**Goal:** Add opt-in diagnostic information (fully anonymized).

| # | Task | File | Details |
|---|------|------|---------|
| 2.1 | Create DebugLogBuffer | `commands/feedback/debug_log.rs` | Ring buffer |
| 2.2 | Instrument commands | Various command files | Add logging |
| 2.3 | Get debug log command | `commands/feedback/debug_log.rs` | Retrieve + sanitize |
| 2.4 | Integrate into modal | `FeedbackModal.tsx` | Toggle + preview |
| 2.5 | Test sanitization | `tests/` | Verify no leaks |

### Phase 3: Screenshots & Polish

**Goal:** Screenshot attachment and UX polish.

| # | Task | File | Details |
|---|------|------|---------|
| 3.1 | Screenshot picker | `components/feedback/ScreenshotAttach.tsx` | File picker |
| 3.2 | Image preview | Same | Thumbnail, remove |
| 3.3 | Save alongside report | `report.rs` | Copy to same folder |
| 3.4 | "Report This" on errors | Error handling | Quick bug report |
| 3.5 | Keyboard shortcut | `App.tsx` | Cmd+Shift+F |
| 3.6 | E2E tests | `tests/e2e/feedback.spec.ts` | Full flow |

### Phase 4: Documentation

| # | Task | File | Details |
|---|------|------|---------|
| 4.1 | Beta tester guide | `docs/user/BETA_TESTING.md` | How to use feedback |
| 4.2 | Privacy documentation | `docs/user/PRIVACY.md` | What we collect |
| 4.3 | Update README | `README.md` | Add feedback section |

---

## 7. Data Included in Reports

### 7.1 Always Included (Safe)

| Data | Example | Purpose |
|------|---------|---------|
| App version | `2.6.3` | Know which version has the bug |
| Report timestamp | `2026-01-26T15:45:00Z` | Timeline |
| Category | `bug` | Triage |
| User description | (their text) | Context |

### 7.2 Opt-In Debug Information (Anonymized)

| Data | Example | Purpose | Sensitive? |
|------|---------|---------|------------|
| OS version | `Windows 11` | Platform bugs | No |
| Architecture | `x86_64` | Platform bugs | No |
| Scrapers enabled count | `5` | Feature usage | No |
| Keywords count | `3` | Config complexity | No |
| Debug event log | See section 5.3 | Reproduce issues | No* |

*Debug log is sanitized to remove ALL user-entered content and identifiable data.

### 7.3 NEVER Included

| Data | Reason |
|------|--------|
| Job titles or descriptions | Reveals job search |
| Company names | Reveals targets |
| Search keywords | Reveals job search |
| Location preferences | Reveals location |
| Salary preferences | Reveals expectations |
| Resume content | Private career history |
| LinkedIn session | Security |
| Webhook URLs | Security |
| File paths with username | Privacy |
| Database contents | Private data |
| Application tracking | Private job search |

### 7.4 Configuration Summary (Anonymized)

Instead of revealing configuration values, we provide counts:

| What User Configured | What We Report |
|---------------------|----------------|
| `keywords: ["rust developer", "systems engineer"]` | `keywords_count: 2` |
| `location: "San Francisco"` | `has_location_prefs: true` |
| `salary_floor: 150000` | `has_salary_prefs: true` |
| `company_blocklist: ["BadCorp", "EvilInc"]` | `company_blocklist: 2 entries` |
| Slack webhook URL | `notifications: ["slack"]` |

---

## 8. Edge Cases & Error Handling

### 8.1 What If...

| Scenario | Handling |
|----------|----------|
| User doesn't have GitHub account | Show Google Drive alternative prominently |
| User cancels file save dialog | "No worries - click 'Save' when you're ready" |
| User can't find saved file | "Show in Finder/Explorer" button |
| Browser doesn't open | Show URL with "Copy link" button |
| Clipboard write fails | Show text in selectable field |
| Disk full | "Couldn't save - your disk might be full" |

### 8.2 Error Messages (Plain Language)

| Technical Issue | User-Friendly Message |
|-----------------|----------------------|
| File save cancelled | "No problem! Click 'Save Feedback Report' when you're ready." |
| Permission denied | "Couldn't save there - try your Desktop instead." |
| Clipboard failed | "Couldn't copy to clipboard - you can select and copy the text below." |
| Browser won't open | "Couldn't open your browser. Here's the link to copy: [url]" |

---

## 9. Testing Strategy

### 9.1 Unit Tests

| Component | Test Cases |
|-----------|------------|
| `Sanitizer` | Paths, emails, webhooks, quoted strings, edge cases |
| `DebugLogBuffer` | Ring buffer behavior, max size, event formatting |
| `FeedbackReport` | Formatting, all fields included, JSON valid |
| `ConfigSummary` | Counts correct, no values leaked |

### 9.2 Integration Tests

| Flow | Test Cases |
|------|------------|
| Bug report → GitHub | Opens correct template URL |
| Bug report → Drive | File saved, opens Drive folder |
| Debug info toggle | Preview updates, data included/excluded correctly |
| Error context | Pre-fills from error, category = bug |

### 9.3 Privacy Tests (CRITICAL)

| Test | Verification |
|------|--------------|
| Path sanitization | No `/Users/actualname` in any output |
| Job data exclusion | No job titles, companies, descriptions |
| Config sanitization | Only counts, never values |
| Error message sanitization | No quoted strings with user data |
| Full report review | Manual review of sample report |

### 9.4 E2E Tests

```typescript
// tests/e2e/feedback.spec.ts

test('bug report flow - github', async () => {
  // Open feedback modal
  await page.click('[data-testid="help-menu"]');
  await page.click('[data-testid="send-feedback"]');

  // Select bug category
  await page.click('[data-testid="category-bug"]');

  // Enter description
  await page.fill('[data-testid="description"]', 'Test bug description');

  // Verify debug info preview is anonymized
  const preview = await page.textContent('[data-testid="debug-preview"]');
  expect(preview).not.toContain('/Users/');
  expect(preview).not.toContain('@');

  // Click GitHub submit (mock browser open)
  await page.click('[data-testid="submit-github"]');

  // Verify correct URL
  expect(mockOpenUrl).toHaveBeenCalledWith(
    expect.stringContaining('github.com/cboyd0319/JobSentinel/issues/new')
  );
});
```

---

## 10. Future Enhancements

### 10.1 Potential Additions

| Enhancement | Description | Priority |
|-------------|-------------|----------|
| Screen recording | Record issue reproduction | Low |
| Automatic error capture | Pre-fill on unhandled errors | Medium |
| Issue search | Check for duplicates before submitting | Medium |
| Response tracking | Show when your issue gets a response | Low |

### 10.2 NOT Planned

| Feature | Why Not |
|---------|---------|
| Telemetry | Violates privacy-first philosophy |
| Automatic submission | App never makes network requests |
| User accounts | We don't track users |
| Analytics | We don't collect usage data |

---

## Appendix A: Quick Reference

### Google Drive Folder

**URL:** https://drive.google.com/drive/folders/1cbhxt_8mVf4fbi-eD3XPd2UGUSBmhLfo

**Access:** Share with specific beta testers (Editor permission)

### GitHub Issues

**URL:** https://github.com/cboyd0319/JobSentinel/issues

**Templates:**
- Bug Report: `bug_report.yml`
- Feature Request: `feature_request.yml`
- Question: `question.yml`

### Report Filename Format

```
jobsentinel-{category}-{YYYY-MM-DD}-{HHMM}.txt

Examples:
- jobsentinel-bug-2026-01-26-1545.txt
- jobsentinel-feature-2026-01-26-1600.txt
- jobsentinel-other-2026-01-26-1615.txt
```

---

## Appendix B: Privacy Review Checklist

Before releasing any version with feedback functionality:

- [ ] All file paths in debug output use `[USER_PATH]`
- [ ] No email addresses appear in any output
- [ ] No webhook URLs appear in any output
- [ ] No LinkedIn session data appears in any output
- [ ] No job titles or company names in debug log
- [ ] No search keywords in debug log
- [ ] Configuration shows counts only, not values
- [ ] Error messages are sanitized
- [ ] Preview accurately shows what will be submitted
- [ ] Manual review of 5 sample reports confirms anonymization
- [ ] E2E privacy tests pass
- [ ] Code review specifically checking Sanitizer usage

---

## Appendix C: Complete React Components

> **IMPORTANT FOR IMPLEMENTING MODEL:** These are complete, copy-paste ready components.
> Do NOT abbreviate or simplify. JobSentinel uses React 19 + TypeScript + Tailwind CSS.

### C.1 FeedbackModal.tsx (Main Component)

This is the orchestrating component that manages the multi-step flow.

```tsx
// src/components/feedback/FeedbackModal.tsx
import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { CategorySelector } from './CategorySelector';
import { DescriptionInput } from './DescriptionInput';
import { DebugInfoPreview } from './DebugInfoPreview';
import { SubmitOptions } from './SubmitOptions';
import { SuccessScreen } from './SuccessScreen';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-fill category (e.g., from error toast "Report This" button) */
  initialCategory?: 'bug' | 'idea' | 'other';
  /** Pre-fill description (e.g., from error message) */
  initialDescription?: string;
}

type Step = 'category' | 'description' | 'submit' | 'saving' | 'success';
type Category = 'bug' | 'idea' | 'other';
type SubmitMethod = 'github' | 'drive';

interface SavedFeedback {
  report_path: string;
  folder_path: string;
  filename: string;
}

interface DebugInfo {
  app_version: string;
  platform: string;
  os_version: string;
  architecture: string;
  config_summary: {
    scrapers_enabled: number;
    keywords_count: number;
    has_location_prefs: boolean;
    has_salary_prefs: boolean;
    has_company_blocklist: boolean;
    notifications_configured: number;
  };
  debug_log: string;
}

export function FeedbackModal({
  isOpen,
  onClose,
  initialCategory,
  initialDescription = '',
}: FeedbackModalProps) {
  // State
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<Category | null>(initialCategory ?? null);
  const [description, setDescription] = useState(initialDescription);
  const [includeDebugInfo, setIncludeDebugInfo] = useState(true);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [savedResult, setSavedResult] = useState<SavedFeedback | null>(null);
  const [submitMethod, setSubmitMethod] = useState<SubmitMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset modal state
  const resetState = useCallback(() => {
    setStep('category');
    setCategory(initialCategory ?? null);
    setDescription(initialDescription);
    setIncludeDebugInfo(true);
    setDebugInfo(null);
    setSavedResult(null);
    setSubmitMethod(null);
    setError(null);
    setIsLoading(false);
  }, [initialCategory, initialDescription]);

  // Handle close
  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  // Fetch debug info when needed
  const fetchDebugInfo = useCallback(async () => {
    try {
      const info = await invoke<DebugInfo>('get_feedback_debug_info');
      setDebugInfo(info);
    } catch (e) {
      console.error('Failed to fetch debug info:', e);
      // Non-fatal - continue without debug info
    }
  }, []);

  // Handle category selection
  const handleCategorySelect = useCallback(async (cat: Category) => {
    setCategory(cat);
    // Default: include debug info for bugs, not for ideas
    setIncludeDebugInfo(cat === 'bug');
    // Fetch debug info in background
    fetchDebugInfo();
    setStep('description');
  }, [fetchDebugInfo]);

  // Handle GitHub submission
  const handleGitHubSubmit = useCallback(async () => {
    if (!category) return;

    setIsLoading(true);
    setError(null);
    setSubmitMethod('github');

    try {
      // Generate anonymized debug info for clipboard
      const clipboardContent = includeDebugInfo && debugInfo
        ? formatDebugInfoForClipboard(debugInfo)
        : null;

      // Copy to clipboard if we have debug info
      if (clipboardContent) {
        await navigator.clipboard.writeText(clipboardContent);
      }

      // Open GitHub issue URL
      await invoke('open_github_issue', {
        category,
        hasDebugInfo: includeDebugInfo && !!debugInfo,
      });

      setStep('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [category, includeDebugInfo, debugInfo]);

  // Handle Google Drive submission
  const handleDriveSubmit = useCallback(async () => {
    if (!category) return;

    setIsLoading(true);
    setError(null);
    setSubmitMethod('drive');
    setStep('saving');

    try {
      const result = await invoke<SavedFeedback>('save_feedback_file', {
        category: getCategoryLabel(category),
        description,
        includeDebugInfo,
      });

      setSavedResult(result);
      setStep('success');
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (errMsg.includes('cancelled') || errMsg.includes('Save cancelled')) {
        // User cancelled - go back to submit options
        setStep('submit');
      } else {
        setError(errMsg);
        setStep('submit');
      }
    } finally {
      setIsLoading(false);
    }
  }, [category, description, includeDebugInfo]);

  // Handle revealing saved file
  const handleRevealFile = useCallback(async () => {
    if (!savedResult) return;
    try {
      await invoke('reveal_feedback_file', { path: savedResult.report_path });
    } catch (e) {
      console.error('Failed to reveal file:', e);
      // Show path to user as fallback
      alert(`Your file is saved at:\n${savedResult.report_path}`);
    }
  }, [savedResult]);

  // Handle opening Google Drive folder
  const handleOpenDrive = useCallback(async () => {
    try {
      await invoke('open_feedback_drive_folder');
    } catch (e) {
      console.error('Failed to open Drive:', e);
      // Show URL as fallback
      const url = 'https://drive.google.com/drive/folders/1cbhxt_8mVf4fbi-eD3XPd2UGUSBmhLfo';
      alert(`Could not open browser. Please go to:\n${url}`);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step !== 'saving' ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Send Feedback
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Help us make JobSentinel better!
              </p>
            </div>
            {step !== 'saving' && (
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Step 1: Category Selection */}
          {step === 'category' && (
            <CategorySelector
              selected={category}
              onSelect={handleCategorySelect}
            />
          )}

          {/* Step 2: Description */}
          {step === 'description' && category && (
            <div className="space-y-4">
              <DescriptionInput
                value={description}
                onChange={setDescription}
                category={category}
              />

              <DebugInfoPreview
                enabled={includeDebugInfo}
                onToggle={setIncludeDebugInfo}
                debugInfo={debugInfo}
                category={category}
              />

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep('category')}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep('submit')}
                  disabled={description.trim().length === 0}
                  className="px-6 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Submit Options */}
          {step === 'submit' && category && (
            <div className="space-y-4">
              <SubmitOptions
                onGitHub={handleGitHubSubmit}
                onDrive={handleDriveSubmit}
                isLoading={isLoading}
              />

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="flex justify-start pt-2">
                <button
                  onClick={() => {
                    setError(null);
                    setStep('description');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Saving (loading state) */}
          {step === 'saving' && (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto" />
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Saving your feedback...
              </p>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 'success' && (
            <SuccessScreen
              method={submitMethod!}
              savedResult={savedResult}
              hasDebugInfo={includeDebugInfo && !!debugInfo}
              onRevealFile={handleRevealFile}
              onOpenDrive={handleOpenDrive}
              onDone={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getCategoryLabel(category: Category): string {
  switch (category) {
    case 'bug': return 'Bug Report';
    case 'idea': return 'Feature Idea';
    default: return 'General Feedback';
  }
}

function formatDebugInfoForClipboard(info: DebugInfo): string {
  return `## System Information (Anonymized)

**App Version:** ${info.app_version}
**Platform:** ${info.platform} ${info.os_version}
**Architecture:** ${info.architecture}

### Configuration Summary
- Scrapers enabled: ${info.config_summary.scrapers_enabled}
- Search keywords: ${info.config_summary.keywords_count}
- Location preferences: ${info.config_summary.has_location_prefs ? 'configured' : 'not set'}
- Salary preferences: ${info.config_summary.has_salary_prefs ? 'configured' : 'not set'}
- Company blocklist: ${info.config_summary.has_company_blocklist ? 'configured' : 'not set'}
- Notifications: ${info.config_summary.notifications_configured} channel(s)

### Recent Activity Log
\`\`\`
${info.debug_log}
\`\`\`
`;
}
```

### C.2 CategorySelector.tsx

```tsx
// src/components/feedback/CategorySelector.tsx
import { useCallback } from 'react';

type Category = 'bug' | 'idea' | 'other';

interface CategorySelectorProps {
  selected: Category | null;
  onSelect: (category: Category) => void;
}

const categories: Array<{
  id: Category;
  icon: string;
  title: string;
  description: string;
}> = [
  {
    id: 'bug',
    icon: '🐛',
    title: 'Bug',
    description: "Something isn't working right",
  },
  {
    id: 'idea',
    icon: '💡',
    title: 'Idea',
    description: 'Feature or improvement request',
  },
  {
    id: 'other',
    icon: '💬',
    title: 'Other',
    description: 'Question, comment, or just saying hi',
  },
];

export function CategorySelector({ selected, onSelect }: CategorySelectorProps) {
  const handleSelect = useCallback((id: Category) => {
    onSelect(id);
  }, [onSelect]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        What kind of feedback do you have?
      </p>

      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => handleSelect(cat.id)}
          className={`
            w-full p-4 text-left rounded-lg border-2 transition-all
            hover:scale-[1.02] hover:shadow-md
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
            dark:focus:ring-offset-gray-900
            ${selected === cat.id
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }
          `}
          aria-pressed={selected === cat.id}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-label={cat.title}>
              {cat.icon}
            </span>
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {cat.title}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {cat.description}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
```

### C.3 DescriptionInput.tsx

```tsx
// src/components/feedback/DescriptionInput.tsx
import { useMemo } from 'react';

type Category = 'bug' | 'idea' | 'other';

interface DescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  category: Category;
}

export function DescriptionInput({ value, onChange, category }: DescriptionInputProps) {
  const { title, placeholder } = useMemo(() => {
    switch (category) {
      case 'bug':
        return {
          title: 'Describe the issue',
          placeholder: `What happened? What were you trying to do?

Example:
- When I clicked "Scrape Jobs", the Indeed scraper failed
- I expected it to find jobs, but got a timeout error

(Even a few words helps us fix it!)`,
        };
      case 'idea':
        return {
          title: 'Tell us your idea',
          placeholder: `What would you like to see? What problem would it solve?

Example:
- Add support for filtering by salary range
- This would help me focus on jobs within my target

(We love hearing your ideas!)`,
        };
      default:
        return {
          title: "What's on your mind?",
          placeholder: `Questions, comments, or just want to say hi - we'd love to hear from you!`,
        };
    }
  }, [category]);

  return (
    <div className="space-y-2">
      <label
        htmlFor="feedback-description"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {title}
      </label>

      <textarea
        id="feedback-description"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={6}
        className="
          w-full px-3 py-2 border rounded-lg resize-none
          border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-800
          text-gray-900 dark:text-white
          placeholder-gray-400 dark:placeholder-gray-500
          focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          transition-colors
        "
        aria-describedby="description-hint"
      />

      <p id="description-hint" className="text-xs text-gray-500 dark:text-gray-400">
        Tip: The more detail you provide, the better we can help!
        <br />
        <strong>Privacy note:</strong> Don't include specific job titles, company names, or personal info.
      </p>
    </div>
  );
}
```

### C.4 DebugInfoPreview.tsx

```tsx
// src/components/feedback/DebugInfoPreview.tsx
import { useState } from 'react';

type Category = 'bug' | 'idea' | 'other';

interface ConfigSummary {
  scrapers_enabled: number;
  keywords_count: number;
  has_location_prefs: boolean;
  has_salary_prefs: boolean;
  has_company_blocklist: boolean;
  notifications_configured: number;
}

interface DebugInfo {
  app_version: string;
  platform: string;
  os_version: string;
  architecture: string;
  config_summary: ConfigSummary;
  debug_log: string;
}

interface DebugInfoPreviewProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  debugInfo: DebugInfo | null;
  category: Category;
}

export function DebugInfoPreview({
  enabled,
  onToggle,
  debugInfo,
  category,
}: DebugInfoPreviewProps) {
  const [showPreview, setShowPreview] = useState(false);

  const helpText = category === 'bug'
    ? 'This helps us understand what happened and fix the issue faster.'
    : 'Not usually needed for feature requests, but can help with context.';

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      {/* Toggle */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <div>
          <span className="font-medium text-gray-900 dark:text-white">
            Include system info (anonymized)
          </span>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {helpText}
          </p>
        </div>
      </label>

      {/* Preview Toggle */}
      {enabled && (
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {showPreview ? 'Hide preview' : 'What gets included?'}
        </button>
      )}

      {/* Preview Content */}
      {enabled && showPreview && (
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded text-sm space-y-3">
          {/* What's Included */}
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">
              What's included:
            </p>
            <ul className="space-y-1 text-amber-700 dark:text-amber-300">
              <li>✓ App version ({debugInfo?.app_version ?? 'loading...'})</li>
              <li>✓ Platform ({debugInfo?.platform ?? 'loading...'} {debugInfo?.os_version ?? ''})</li>
              <li>✓ Configuration summary (counts only, no actual values)</li>
              <li>✓ Recent activity log (what you clicked, no content)</li>
            </ul>
          </div>

          {/* What's NOT Included */}
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              NOT included (100% anonymized):
            </p>
            <ul className="space-y-1 text-amber-700 dark:text-amber-300">
              <li>✗ Job titles or company names</li>
              <li>✗ Your search keywords</li>
              <li>✗ Location or salary preferences</li>
              <li>✗ Resume content</li>
              <li>✗ Notification webhook URLs</li>
              <li>✗ Any personal information</li>
            </ul>
          </div>

          {/* Actual Preview */}
          {debugInfo && (
            <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
              <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                Actual data that will be sent:
              </p>
              <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded overflow-x-auto text-gray-800 dark:text-gray-200">
{`App Version: ${debugInfo.app_version}
Platform: ${debugInfo.platform} ${debugInfo.os_version}
Architecture: ${debugInfo.architecture}

Config Summary:
- Scrapers enabled: ${debugInfo.config_summary.scrapers_enabled}
- Keywords count: ${debugInfo.config_summary.keywords_count}
- Location prefs: ${debugInfo.config_summary.has_location_prefs ? 'configured' : 'not set'}
- Salary prefs: ${debugInfo.config_summary.has_salary_prefs ? 'configured' : 'not set'}
- Notifications: ${debugInfo.config_summary.notifications_configured} channel(s)

Recent Activity:
${debugInfo.debug_log || '(no recent activity)'}`}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### C.5 SubmitOptions.tsx

```tsx
// src/components/feedback/SubmitOptions.tsx

interface SubmitOptionsProps {
  onGitHub: () => void;
  onDrive: () => void;
  isLoading: boolean;
}

export function SubmitOptions({ onGitHub, onDrive, isLoading }: SubmitOptionsProps) {
  return (
    <div className="space-y-4">
      {/* GitHub Option (Primary) */}
      <div className="border-2 border-indigo-500 rounded-xl p-4 bg-indigo-50 dark:bg-indigo-900/20">
        <div className="flex items-start gap-3">
          <div className="text-2xl">📋</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Submit via GitHub Issues
              </h3>
              <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-full">
                Recommended
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Public, searchable, community-driven. Debug info copied to clipboard.
            </p>
            <button
              onClick={onGitHub}
              disabled={isLoading}
              className="
                w-full px-4 py-2.5 text-sm font-medium rounded-lg
                bg-indigo-600 text-white
                hover:bg-indigo-700
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
                flex items-center justify-center gap-2
              "
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Opening...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  Open GitHub Issue
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Why GitHub */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 px-2">
        <p className="font-medium">Why GitHub Issues?</p>
        <ul className="space-y-0.5">
          <li>✓ Public - Others with the same issue can find the solution</li>
          <li>✓ Trackable - See when your issue is addressed</li>
          <li>✓ Searchable - Check if it's already been reported</li>
        </ul>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">or</span>
        </div>
      </div>

      {/* Google Drive Option (Secondary) */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">📁</div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Save & Upload to Google Drive
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              For users without GitHub or who prefer private submission.
            </p>
            <button
              onClick={onDrive}
              disabled={isLoading}
              className="
                w-full px-4 py-2.5 text-sm font-medium rounded-lg
                border border-gray-300 dark:border-gray-600
                text-gray-700 dark:text-gray-300
                hover:bg-gray-50 dark:hover:bg-gray-800
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
                flex items-center justify-center gap-2
              "
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                  Saving...
                </>
              ) : (
                <>
                  💾 Save Feedback File
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* No GitHub Account? */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Don't have a GitHub account?{' '}
        <a
          href="https://github.com/signup"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Sign up free
        </a>
        {' '}or use Google Drive above.
      </p>
    </div>
  );
}
```

### C.6 SuccessScreen.tsx

```tsx
// src/components/feedback/SuccessScreen.tsx

interface SavedFeedback {
  report_path: string;
  folder_path: string;
  filename: string;
}

interface SuccessScreenProps {
  method: 'github' | 'drive';
  savedResult: SavedFeedback | null;
  hasDebugInfo: boolean;
  onRevealFile: () => void;
  onOpenDrive: () => void;
  onDone: () => void;
}

export function SuccessScreen({
  method,
  savedResult,
  hasDebugInfo,
  onRevealFile,
  onOpenDrive,
  onDone,
}: SuccessScreenProps) {
  if (method === 'github') {
    return (
      <div className="text-center space-y-6">
        {/* Success Icon */}
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            GitHub opened!
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Complete your issue in the browser tab.
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-left">
          <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex gap-2">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">1.</span>
              <span>Fill out the issue title and description</span>
            </li>
            {hasDebugInfo && (
              <li className="flex gap-2">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">2.</span>
                <span>Paste the debug info from your clipboard (Ctrl+V / Cmd+V)</span>
              </li>
            )}
            <li className="flex gap-2">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{hasDebugInfo ? '3' : '2'}.</span>
              <span>Click "Submit new issue"</span>
            </li>
          </ol>
        </div>

        {/* Info about clipboard */}
        {hasDebugInfo && (
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-indigo-50 dark:bg-indigo-900/20 rounded p-2">
            <strong>Debug info copied to clipboard!</strong> Paste it in the "Debug Information" section.
          </div>
        )}

        {/* Done Button */}
        <button
          onClick={onDone}
          className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  // Google Drive flow
  return (
    <div className="text-center space-y-6">
      {/* Success Icon */}
      <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Title */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Feedback saved!
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          One more step to send it to us
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-left">
        <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex gap-2">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">1.</span>
            <span>Click "Open Google Drive" below</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">2.</span>
            <span>Drag your file into the folder (or use "New → File upload")</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">3.</span>
            <span>That's it! We'll see it and get back to you.</span>
          </li>
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onRevealFile}
          className="
            flex-1 px-4 py-2.5 text-sm font-medium rounded-lg
            border border-gray-300 dark:border-gray-600
            text-gray-700 dark:text-gray-300
            hover:bg-gray-50 dark:hover:bg-gray-800
            transition-colors
            flex items-center justify-center gap-2
          "
        >
          📁 Show File
        </button>

        <button
          onClick={onOpenDrive}
          className="
            flex-1 px-4 py-2.5 text-sm font-medium rounded-lg
            bg-indigo-600 text-white
            hover:bg-indigo-700
            transition-colors
            flex items-center justify-center gap-2
          "
        >
          🌐 Open Google Drive
        </button>
      </div>

      {/* Saved File Info */}
      {savedResult && (
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded p-2">
          <span className="font-medium">Saved:</span> {savedResult.filename}
        </div>
      )}

      {/* Done Button */}
      <button
        onClick={onDone}
        className="
          w-full px-4 py-2 text-sm font-medium rounded-lg
          border border-gray-300 dark:border-gray-600
          text-gray-700 dark:text-gray-300
          hover:bg-gray-50 dark:hover:bg-gray-800
          transition-colors
        "
      >
        Done
      </button>
    </div>
  );
}
```

### C.7 useFeedback.ts (Hook)

```tsx
// src/hooks/useFeedback.ts
import { useState, useCallback } from 'react';

interface UseFeedbackReturn {
  isOpen: boolean;
  openFeedback: (options?: { category?: 'bug' | 'idea' | 'other'; description?: string }) => void;
  closeFeedback: () => void;
  initialCategory?: 'bug' | 'idea' | 'other';
  initialDescription?: string;
}

export function useFeedback(): UseFeedbackReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [initialCategory, setInitialCategory] = useState<'bug' | 'idea' | 'other' | undefined>();
  const [initialDescription, setInitialDescription] = useState<string | undefined>();

  const openFeedback = useCallback((options?: { category?: 'bug' | 'idea' | 'other'; description?: string }) => {
    setInitialCategory(options?.category);
    setInitialDescription(options?.description);
    setIsOpen(true);
  }, []);

  const closeFeedback = useCallback(() => {
    setIsOpen(false);
    // Reset after animation
    setTimeout(() => {
      setInitialCategory(undefined);
      setInitialDescription(undefined);
    }, 300);
  }, []);

  return {
    isOpen,
    openFeedback,
    closeFeedback,
    initialCategory,
    initialDescription,
  };
}
```

---

## Appendix D: Complete Rust Implementations

> **CRITICAL: Cross-Platform Requirements**
> - All code MUST work on macOS 26+ AND Windows 11
> - Use conditional compilation (`#[cfg(target_os = "...")]`) for platform-specific code
> - Test on BOTH platforms before considering complete

### D.1 Module Structure

```
src-tauri/src/commands/feedback/
├── mod.rs              # Module exports + Tauri commands
├── report.rs           # Report generation
├── system_info.rs      # System info collection (cross-platform)
├── debug_log.rs        # Debug log buffer
└── sanitizer.rs        # ALL anonymization goes here
```

### D.2 mod.rs (Module Exports + Tauri Commands)

```rust
// src-tauri/src/commands/feedback/mod.rs

mod debug_log;
mod report;
mod sanitizer;
mod system_info;

pub use debug_log::DebugLogBuffer;
pub use sanitizer::Sanitizer;

use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

/// Google Drive folder URL for beta feedback
const FEEDBACK_DRIVE_URL: &str =
    "https://drive.google.com/drive/folders/1cbhxt_8mVf4fbi-eD3XPd2UGUSBmhLfo";

/// GitHub issues URL
const GITHUB_ISSUES_URL: &str = "https://github.com/cboyd0319/JobSentinel/issues/new";

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedFeedback {
    pub report_path: String,
    pub folder_path: String,
    pub filename: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigSummary {
    pub scrapers_enabled: usize,
    pub keywords_count: usize,
    pub has_location_prefs: bool,
    pub has_salary_prefs: bool,
    pub has_company_blocklist: bool,
    pub notifications_configured: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DebugInfo {
    pub app_version: String,
    pub platform: String,
    pub os_version: String,
    pub architecture: String,
    pub config_summary: ConfigSummary,
    pub debug_log: String,
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Get anonymized debug info for feedback
#[tauri::command]
pub async fn get_feedback_debug_info(
    state: State<'_, AppState>,
) -> Result<DebugInfo, String> {
    let system = system_info::get_system_info();
    let config_summary = get_config_summary(&state).await;
    let debug_log = get_sanitized_debug_log(&state).await;

    Ok(DebugInfo {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        platform: system.platform,
        os_version: system.os_version,
        architecture: system.architecture,
        config_summary,
        debug_log,
    })
}

/// Save feedback report to file (opens save dialog)
#[tauri::command]
pub async fn save_feedback_file(
    category: String,
    description: String,
    include_debug_info: bool,
    state: State<'_, AppState>,
) -> Result<SavedFeedback, String> {
    // Build the report
    let debug_info = if include_debug_info {
        Some(get_feedback_debug_info(state.clone()).await?)
    } else {
        None
    };

    let report_text = report::generate_report(&category, &description, debug_info.as_ref());

    // Generate filename
    let timestamp = chrono::Local::now().format("%Y-%m-%d-%H%M");
    let category_slug = match category.to_lowercase().as_str() {
        s if s.contains("bug") => "bug",
        s if s.contains("idea") || s.contains("feature") => "feature",
        _ => "feedback",
    };
    let filename = format!("jobsentinel-{}-{}.txt", category_slug, timestamp);

    // Get default save location (Desktop preferred, then Downloads, then Home)
    let default_dir = dirs::desktop_dir()
        .or_else(dirs::download_dir)
        .or_else(dirs::home_dir)
        .ok_or("Could not find a default save location")?;

    // Show save dialog
    // Note: This uses rfd (Rust File Dialog) which works on both macOS and Windows
    let save_path = rfd::FileDialog::new()
        .set_title("Save Feedback Report")
        .set_file_name(&filename)
        .set_directory(&default_dir)
        .add_filter("Text files", &["txt"])
        .save_file();

    // Handle user cancellation
    let path = match save_path {
        Some(p) => p,
        None => return Err("Save cancelled".to_string()),
    };

    // Write the file
    std::fs::write(&path, &report_text)
        .map_err(|e| format!("Failed to save file: {}", e))?;

    // Return info about saved file
    let folder = path
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| default_dir.to_string_lossy().to_string());

    let saved_filename = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or(filename);

    Ok(SavedFeedback {
        report_path: path.to_string_lossy().to_string(),
        folder_path: folder,
        filename: saved_filename,
    })
}

/// Reveal feedback file in system file manager
/// Works on macOS (Finder) and Windows (Explorer)
#[tauri::command]
pub async fn reveal_feedback_file(path: String) -> Result<(), String> {
    let path = std::path::Path::new(&path);

    if !path.exists() {
        return Err("File no longer exists".to_string());
    }

    // macOS: Use `open -R` to reveal in Finder
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R") // -R = reveal in Finder (select the file)
            .arg(path)
            .spawn()
            .map_err(|e| format!("Could not open Finder: {}", e))?;
    }

    // Windows: Use `explorer /select,` to reveal in Explorer
    #[cfg(target_os = "windows")]
    {
        // Windows requires the path to use backslashes and be quoted properly
        let path_str = path.to_string_lossy().replace('/', "\\");
        std::process::Command::new("explorer")
            .args(["/select,", &path_str])
            .spawn()
            .map_err(|e| format!("Could not open Explorer: {}", e))?;
    }

    // Linux fallback: Open containing folder
    #[cfg(target_os = "linux")]
    {
        let folder = path.parent().unwrap_or(std::path::Path::new("/"));
        std::process::Command::new("xdg-open")
            .arg(folder)
            .spawn()
            .map_err(|e| format!("Could not open file manager: {}", e))?;
    }

    Ok(())
}

/// Open Google Drive feedback folder in default browser
#[tauri::command]
pub async fn open_feedback_drive_folder() -> Result<(), String> {
    open::that(FEEDBACK_DRIVE_URL)
        .map_err(|e| format!("Could not open browser: {}", e))
}

/// Open GitHub issue page with template pre-selected
#[tauri::command]
pub async fn open_github_issue(
    category: String,
    has_debug_info: bool,
) -> Result<(), String> {
    // Select template based on category
    let template = match category.as_str() {
        "bug" => "bug_report.yml",
        "idea" | "feature" => "feature_request.yml",
        _ => "question.yml",
    };

    // Build URL with query parameters
    let url = format!("{}?template={}", GITHUB_ISSUES_URL, template);

    open::that(&url)
        .map_err(|e| format!("Could not open browser: {}", e))
}

// ============================================================================
// Helper Functions
// ============================================================================

async fn get_config_summary(state: &State<'_, AppState>) -> ConfigSummary {
    // This should read from your actual config
    // Using placeholder logic - replace with actual config access
    let config = state.config.lock().await;

    ConfigSummary {
        scrapers_enabled: config.enabled_scrapers.len(),
        keywords_count: config.keywords.as_ref().map(|k| k.len()).unwrap_or(0),
        has_location_prefs: config.location_preferences.is_some(),
        has_salary_prefs: config.salary_floor.is_some(),
        has_company_blocklist: config.company_blocklist.as_ref().map(|b| !b.is_empty()).unwrap_or(false),
        notifications_configured: count_notifications(&config),
    }
}

fn count_notifications(config: &crate::core::config::Config) -> usize {
    let mut count = 0;
    if config.notifications.desktop.enabled { count += 1; }
    if config.notifications.slack.as_ref().map(|s| s.enabled).unwrap_or(false) { count += 1; }
    if config.notifications.discord.as_ref().map(|d| d.enabled).unwrap_or(false) { count += 1; }
    if config.notifications.teams.as_ref().map(|t| t.enabled).unwrap_or(false) { count += 1; }
    if config.notifications.telegram.as_ref().map(|t| t.enabled).unwrap_or(false) { count += 1; }
    if config.notifications.email.as_ref().map(|e| e.enabled).unwrap_or(false) { count += 1; }
    count
}

async fn get_sanitized_debug_log(state: &State<'_, AppState>) -> String {
    let log = state.debug_log.lock().await;
    log.get_formatted_log()
}
```

### D.3 system_info.rs (Cross-Platform System Info)

```rust
// src-tauri/src/commands/feedback/system_info.rs

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub platform: String,
    pub os_version: String,
    pub architecture: String,
}

/// Get system information (works on macOS and Windows)
pub fn get_system_info() -> SystemInfo {
    SystemInfo {
        platform: get_platform_name(),
        os_version: get_os_version(),
        architecture: std::env::consts::ARCH.to_string(),
    }
}

fn get_platform_name() -> String {
    match std::env::consts::OS {
        "macos" => "macOS".to_string(),
        "windows" => "Windows".to_string(),
        "linux" => "Linux".to_string(),
        other => other.to_string(),
    }
}

/// Get OS version - platform specific
fn get_os_version() -> String {
    #[cfg(target_os = "macos")]
    {
        get_macos_version()
    }

    #[cfg(target_os = "windows")]
    {
        get_windows_version()
    }

    #[cfg(target_os = "linux")]
    {
        get_linux_version()
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        "unknown".to_string()
    }
}

/// Get macOS version using sw_vers command
#[cfg(target_os = "macos")]
fn get_macos_version() -> String {
    // Try sw_vers first (most reliable)
    if let Ok(output) = std::process::Command::new("sw_vers")
        .arg("-productVersion")
        .output()
    {
        if output.status.success() {
            if let Ok(version) = String::from_utf8(output.stdout) {
                let version = version.trim();
                // Map version to name (macOS 26 = Tahoe, presumably)
                let name = match version.split('.').next().and_then(|v| v.parse::<u32>().ok()) {
                    Some(26) => "Tahoe",
                    Some(15) => "Sequoia",
                    Some(14) => "Sonoma",
                    Some(13) => "Ventura",
                    Some(12) => "Monterey",
                    _ => "",
                };
                if name.is_empty() {
                    return version.to_string();
                }
                return format!("{} ({})", version, name);
            }
        }
    }
    "unknown".to_string()
}

/// Get Windows version using WMI or registry
#[cfg(target_os = "windows")]
fn get_windows_version() -> String {
    // Try using the winver-style approach
    use std::process::Command;

    // Method 1: Use wmic (available on Windows 10/11)
    if let Ok(output) = Command::new("wmic")
        .args(["os", "get", "Caption,Version", "/value"])
        .output()
    {
        if output.status.success() {
            if let Ok(text) = String::from_utf8(output.stdout) {
                let mut caption = String::new();
                let mut version = String::new();

                for line in text.lines() {
                    if line.starts_with("Caption=") {
                        caption = line.trim_start_matches("Caption=").trim().to_string();
                    } else if line.starts_with("Version=") {
                        version = line.trim_start_matches("Version=").trim().to_string();
                    }
                }

                if !caption.is_empty() {
                    // Clean up caption (remove "Microsoft" prefix if present)
                    let caption = caption.trim_start_matches("Microsoft ").to_string();
                    if !version.is_empty() {
                        return format!("{} ({})", caption, version);
                    }
                    return caption;
                }
            }
        }
    }

    // Method 2: Fallback to checking build number for Windows 11 detection
    // Windows 11 has build >= 22000
    if let Ok(output) = Command::new("cmd")
        .args(["/c", "ver"])
        .output()
    {
        if output.status.success() {
            if let Ok(text) = String::from_utf8(output.stdout) {
                // Extract build number from "Microsoft Windows [Version 10.0.22631.4037]"
                if let Some(start) = text.find('[') {
                    if let Some(end) = text.find(']') {
                        let version_str = &text[start + 1..end];
                        // Parse build number
                        if let Some(build_str) = version_str.split('.').nth(2) {
                            if let Ok(build) = build_str.parse::<u32>() {
                                if build >= 22000 {
                                    return format!("11 (build {})", build);
                                } else {
                                    return format!("10 (build {})", build);
                                }
                            }
                        }
                        return version_str.trim_start_matches("Version ").to_string();
                    }
                }
            }
        }
    }

    "Windows".to_string()
}

/// Get Linux version from /etc/os-release
#[cfg(target_os = "linux")]
fn get_linux_version() -> String {
    if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
        let mut name = String::new();
        let mut version = String::new();

        for line in content.lines() {
            if line.starts_with("NAME=") {
                name = line
                    .trim_start_matches("NAME=")
                    .trim_matches('"')
                    .to_string();
            } else if line.starts_with("VERSION_ID=") {
                version = line
                    .trim_start_matches("VERSION_ID=")
                    .trim_matches('"')
                    .to_string();
            }
        }

        if !name.is_empty() && !version.is_empty() {
            return format!("{} {}", name, version);
        } else if !name.is_empty() {
            return name;
        }
    }

    "Linux".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_system_info() {
        let info = get_system_info();
        assert!(!info.platform.is_empty());
        assert!(!info.architecture.is_empty());
        // os_version might be "unknown" in some CI environments
    }

    #[test]
    fn test_platform_name() {
        let name = get_platform_name();
        #[cfg(target_os = "macos")]
        assert_eq!(name, "macOS");
        #[cfg(target_os = "windows")]
        assert_eq!(name, "Windows");
        #[cfg(target_os = "linux")]
        assert_eq!(name, "Linux");
    }
}
```

### D.4 sanitizer.rs (ALL Anonymization)

```rust
// src-tauri/src/commands/feedback/sanitizer.rs
//
// CRITICAL: ALL output that leaves the app MUST go through this module.
// This is the ONLY place where anonymization happens.

use lazy_static::lazy_static;
use regex::Regex;

lazy_static! {
    // User paths: /Users/johnsmith or C:\Users\johnsmith
    static ref UNIX_PATH_REGEX: Regex = Regex::new(r"/(Users|home)/[^/\s]+").unwrap();
    static ref WINDOWS_PATH_REGEX: Regex = Regex::new(r"[Cc]:\\Users\\[^\\s]+").unwrap();

    // Email addresses
    static ref EMAIL_REGEX: Regex = Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").unwrap();

    // Webhook URLs
    static ref SLACK_WEBHOOK_REGEX: Regex = Regex::new(r"https://hooks\.slack\.com/services/[^\s]+").unwrap();
    static ref DISCORD_WEBHOOK_REGEX: Regex = Regex::new(r"https://discord\.com/api/webhooks/[^\s]+").unwrap();
    static ref TEAMS_WEBHOOK_REGEX: Regex = Regex::new(r"https://[^/]*\.webhook\.office\.com/[^\s]+").unwrap();

    // LinkedIn session cookie
    static ref LINKEDIN_COOKIE_REGEX: Regex = Regex::new(r"li_at=[^\s;]+").unwrap();

    // Quoted strings (potential job titles, company names)
    static ref DOUBLE_QUOTED_REGEX: Regex = Regex::new(r#""[^"]+""#).unwrap();
    static ref SINGLE_QUOTED_REGEX: Regex = Regex::new(r"'[^']+'").unwrap();

    // API keys and tokens (common patterns)
    static ref API_KEY_REGEX: Regex = Regex::new(r"(?i)(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s]+").unwrap();
}

pub struct Sanitizer;

impl Sanitizer {
    /// Sanitize all user-identifiable information from text.
    /// This is the main entry point - use this for all output.
    pub fn sanitize(text: &str) -> String {
        let mut result = text.to_string();

        // Paths
        result = UNIX_PATH_REGEX.replace_all(&result, "/[USER_PATH]").to_string();
        result = WINDOWS_PATH_REGEX.replace_all(&result, "[USER_PATH]").to_string();

        // Emails
        result = EMAIL_REGEX.replace_all(&result, "[EMAIL]").to_string();

        // Webhooks
        result = SLACK_WEBHOOK_REGEX.replace_all(&result, "[SLACK_WEBHOOK]").to_string();
        result = DISCORD_WEBHOOK_REGEX.replace_all(&result, "[DISCORD_WEBHOOK]").to_string();
        result = TEAMS_WEBHOOK_REGEX.replace_all(&result, "[TEAMS_WEBHOOK]").to_string();

        // LinkedIn
        result = LINKEDIN_COOKIE_REGEX.replace_all(&result, "li_at=[REDACTED]").to_string();

        // API keys
        result = API_KEY_REGEX.replace_all(&result, "[CREDENTIAL_REDACTED]").to_string();

        result
    }

    /// Sanitize a file path specifically.
    pub fn sanitize_path(path: &str) -> String {
        let mut result = path.to_string();
        result = UNIX_PATH_REGEX.replace_all(&result, "/[USER_PATH]").to_string();
        result = WINDOWS_PATH_REGEX.replace_all(&result, "[USER_PATH]").to_string();
        result
    }

    /// Sanitize error messages that might contain user data.
    /// More aggressive - also removes quoted strings.
    pub fn sanitize_error(error: &str) -> String {
        let mut result = Self::sanitize(error);

        // Remove quoted strings (might be job titles, company names)
        result = DOUBLE_QUOTED_REGEX.replace_all(&result, "\"[REDACTED]\"").to_string();
        result = SINGLE_QUOTED_REGEX.replace_all(&result, "'[REDACTED]'").to_string();

        result
    }

    /// Sanitize command arguments for debug log.
    /// Keeps command name, removes all arguments.
    pub fn sanitize_command(command: &str) -> String {
        // If it looks like "command_name { args... }", keep only command name
        if let Some(space_pos) = command.find(|c: char| c.is_whitespace() || c == '{') {
            format!("{} [args redacted]", &command[..space_pos])
        } else {
            command.to_string()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_unix_paths() {
        let input = "Error at /Users/johnsmith/Documents/file.txt";
        let output = Sanitizer::sanitize(input);
        assert!(!output.contains("johnsmith"));
        assert!(output.contains("[USER_PATH]"));
    }

    #[test]
    fn test_sanitize_windows_paths() {
        let input = "Error at C:\\Users\\johnsmith\\Documents\\file.txt";
        let output = Sanitizer::sanitize(input);
        assert!(!output.contains("johnsmith"));
        assert!(output.contains("[USER_PATH]"));
    }

    #[test]
    fn test_sanitize_email() {
        let input = "Contact: john.doe@example.com";
        let output = Sanitizer::sanitize(input);
        assert!(!output.contains("john.doe"));
        assert!(output.contains("[EMAIL]"));
    }

    #[test]
    fn test_sanitize_slack_webhook() {
        let input = "Webhook: https://hooks.slack.com/services/T123/B456/xyz789";
        let output = Sanitizer::sanitize(input);
        assert!(!output.contains("T123"));
        assert!(output.contains("[SLACK_WEBHOOK]"));
    }

    #[test]
    fn test_sanitize_linkedin_cookie() {
        let input = "Cookie: li_at=AQEDATqF_8YC4Dhh";
        let output = Sanitizer::sanitize(input);
        assert!(!output.contains("AQEDATqF"));
        assert!(output.contains("[REDACTED]"));
    }

    #[test]
    fn test_sanitize_error_quoted_strings() {
        let input = "Failed to find job \"Senior Engineer at Google\"";
        let output = Sanitizer::sanitize_error(input);
        assert!(!output.contains("Google"));
        assert!(output.contains("[REDACTED]"));
    }

    #[test]
    fn test_sanitize_command() {
        let input = "update_config { keywords: [\"rust\", \"engineer\"] }";
        let output = Sanitizer::sanitize_command(input);
        assert_eq!(output, "update_config [args redacted]");
    }
}
```

### D.5 debug_log.rs (Ring Buffer)

```rust
// src-tauri/src/commands/feedback/debug_log.rs

use chrono::{DateTime, Local};
use std::collections::VecDeque;

use super::sanitizer::Sanitizer;

const MAX_EVENTS: usize = 100;

#[derive(Debug, Clone)]
pub enum DebugEvent {
    AppStarted,
    Navigated { from: String, to: String },
    CommandSuccess { command: String },
    CommandFailed { command: String, error: String },
    ScraperStarted { scraper: String },
    ScraperCompleted { scraper: String, jobs_found: usize },
    ScraperFailed { scraper: String, error: String },
    FeatureUsed { feature: String },
    ModalOpened { modal: String },
    ModalClosed { modal: String },
}

#[derive(Debug, Clone)]
struct TimestampedEvent {
    time: DateTime<Local>,
    event: DebugEvent,
}

pub struct DebugLogBuffer {
    events: VecDeque<TimestampedEvent>,
}

impl DebugLogBuffer {
    pub fn new() -> Self {
        Self {
            events: VecDeque::with_capacity(MAX_EVENTS),
        }
    }

    /// Log an event (automatically timestamped)
    pub fn log(&mut self, event: DebugEvent) {
        // Remove oldest if at capacity
        if self.events.len() >= MAX_EVENTS {
            self.events.pop_front();
        }

        self.events.push_back(TimestampedEvent {
            time: Local::now(),
            event,
        });
    }

    /// Get formatted log (last 20 events, sanitized)
    pub fn get_formatted_log(&self) -> String {
        let recent: Vec<_> = self.events.iter().rev().take(20).collect();

        if recent.is_empty() {
            return "(no recent activity)".to_string();
        }

        recent
            .into_iter()
            .rev()
            .map(|e| format_event(e))
            .collect::<Vec<_>>()
            .join("\n")
    }

    /// Clear all events
    pub fn clear(&mut self) {
        self.events.clear();
    }
}

impl Default for DebugLogBuffer {
    fn default() -> Self {
        Self::new()
    }
}

fn format_event(event: &TimestampedEvent) -> String {
    let time = event.time.format("%H:%M:%S");

    match &event.event {
        DebugEvent::AppStarted => format!("[{}] App started", time),

        DebugEvent::Navigated { from, to } => {
            format!("[{}] Navigated: {} → {}", time, from, to)
        }

        DebugEvent::CommandSuccess { command } => {
            format!("[{}] Command: {} → SUCCESS", time, Sanitizer::sanitize_command(command))
        }

        DebugEvent::CommandFailed { command, error } => {
            format!(
                "[{}] Command: {} → FAILED ({})",
                time,
                Sanitizer::sanitize_command(command),
                Sanitizer::sanitize_error(error)
            )
        }

        DebugEvent::ScraperStarted { scraper } => {
            format!("[{}] Scraper started: {}", time, scraper)
        }

        DebugEvent::ScraperCompleted { scraper, jobs_found } => {
            format!("[{}] Scraper completed: {} ({} jobs)", time, scraper, jobs_found)
        }

        DebugEvent::ScraperFailed { scraper, error } => {
            format!(
                "[{}] Scraper failed: {} ({})",
                time,
                scraper,
                Sanitizer::sanitize_error(error)
            )
        }

        DebugEvent::FeatureUsed { feature } => {
            format!("[{}] Feature used: {}", time, feature)
        }

        DebugEvent::ModalOpened { modal } => {
            format!("[{}] Opened: {}", time, modal)
        }

        DebugEvent::ModalClosed { modal } => {
            format!("[{}] Closed: {}", time, modal)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_log_and_format() {
        let mut buffer = DebugLogBuffer::new();
        buffer.log(DebugEvent::AppStarted);
        buffer.log(DebugEvent::Navigated {
            from: "Dashboard".to_string(),
            to: "Jobs".to_string(),
        });

        let log = buffer.get_formatted_log();
        assert!(log.contains("App started"));
        assert!(log.contains("Dashboard → Jobs"));
    }

    #[test]
    fn test_max_events() {
        let mut buffer = DebugLogBuffer::new();

        // Add more than MAX_EVENTS
        for i in 0..150 {
            buffer.log(DebugEvent::FeatureUsed {
                feature: format!("feature_{}", i),
            });
        }

        // Should only have MAX_EVENTS
        assert!(buffer.events.len() <= MAX_EVENTS);
    }

    #[test]
    fn test_error_sanitization() {
        let mut buffer = DebugLogBuffer::new();
        buffer.log(DebugEvent::CommandFailed {
            command: "search_jobs".to_string(),
            error: "Failed for user john@example.com".to_string(),
        });

        let log = buffer.get_formatted_log();
        assert!(!log.contains("john@example.com"));
        assert!(log.contains("[EMAIL]"));
    }
}
```

### D.6 report.rs (Report Generation)

```rust
// src-tauri/src/commands/feedback/report.rs

use chrono::{Local, Utc};
use serde::Serialize;

use super::{ConfigSummary, DebugInfo};

/// Generate the complete feedback report (human-readable + JSON)
pub fn generate_report(
    category: &str,
    description: &str,
    debug_info: Option<&DebugInfo>,
) -> String {
    let mut output = String::new();
    let timestamp = Local::now();

    // Header
    output.push_str("═══════════════════════════════════════════════════════════════════════\n");
    output.push_str("                    JOBSENTINEL BETA FEEDBACK REPORT                   \n");
    output.push_str("═══════════════════════════════════════════════════════════════════════\n\n");

    output.push_str(&format!("CATEGORY: {}\n", category));
    output.push_str(&format!("DATE: {}\n\n", timestamp.format("%B %d, %Y at %I:%M %p")));

    // User feedback
    output.push_str("───────────────────────────────────────────────────────────────────────\n");
    output.push_str("YOUR FEEDBACK\n");
    output.push_str("───────────────────────────────────────────────────────────────────────\n\n");
    output.push_str(description);
    output.push_str("\n\n");

    // System info (if included)
    if let Some(info) = debug_info {
        output.push_str("───────────────────────────────────────────────────────────────────────\n");
        output.push_str("SYSTEM INFORMATION (anonymized)\n");
        output.push_str("───────────────────────────────────────────────────────────────────────\n\n");
        output.push_str(&format!("App Version: {}\n", info.app_version));
        output.push_str(&format!("Platform: {} {}\n", info.platform, info.os_version));
        output.push_str(&format!("Architecture: {}\n", info.architecture));
        output.push_str("\n");

        // Config summary
        output.push_str("───────────────────────────────────────────────────────────────────────\n");
        output.push_str("CONFIGURATION SUMMARY (anonymized - no actual values)\n");
        output.push_str("───────────────────────────────────────────────────────────────────────\n\n");
        output.push_str(&format!("Scrapers enabled: {}\n", info.config_summary.scrapers_enabled));
        output.push_str(&format!("Search keywords configured: {}\n", info.config_summary.keywords_count));
        output.push_str(&format!("Location preferences: {}\n",
            if info.config_summary.has_location_prefs { "configured" } else { "not set" }));
        output.push_str(&format!("Salary preferences: {}\n",
            if info.config_summary.has_salary_prefs { "configured" } else { "not set" }));
        output.push_str(&format!("Company blocklist: {}\n",
            if info.config_summary.has_company_blocklist { "configured" } else { "not set" }));
        output.push_str(&format!("Notifications: {} channel(s)\n", info.config_summary.notifications_configured));
        output.push_str("\n");

        // Debug log
        if !info.debug_log.is_empty() {
            output.push_str("───────────────────────────────────────────────────────────────────────\n");
            output.push_str("RECENT ACTIVITY LOG (anonymized)\n");
            output.push_str("───────────────────────────────────────────────────────────────────────\n\n");
            output.push_str(&info.debug_log);
            output.push_str("\n\n");
        }

        // JSON section
        output.push_str("───────────────────────────────────────────────────────────────────────\n");
        output.push_str("STRUCTURED DATA (for automated processing)\n");
        output.push_str("───────────────────────────────────────────────────────────────────────\n\n");
        output.push_str("```json\n");
        output.push_str(&generate_json(category, description, info));
        output.push_str("\n```\n\n");
    }

    // Footer
    output.push_str("═══════════════════════════════════════════════════════════════════════\n");
    output.push_str("                         END OF REPORT                                 \n");
    output.push_str("═══════════════════════════════════════════════════════════════════════\n");

    output
}

#[derive(Serialize)]
struct ReportJson<'a> {
    schema_version: &'static str,
    app_version: &'a str,
    category: &'a str,
    timestamp: String,
    platform: PlatformJson<'a>,
    description: &'a str,
    config_summary: &'a ConfigSummary,
}

#[derive(Serialize)]
struct PlatformJson<'a> {
    os: &'a str,
    os_version: &'a str,
    arch: &'a str,
}

fn generate_json(category: &str, description: &str, info: &DebugInfo) -> String {
    let json = ReportJson {
        schema_version: "1.0",
        app_version: &info.app_version,
        category: get_category_slug(category),
        timestamp: Utc::now().to_rfc3339(),
        platform: PlatformJson {
            os: &info.platform,
            os_version: &info.os_version,
            arch: &info.architecture,
        },
        description,
        config_summary: &info.config_summary,
    };

    serde_json::to_string_pretty(&json).unwrap_or_else(|_| "{}".to_string())
}

fn get_category_slug(category: &str) -> &'static str {
    match category.to_lowercase().as_str() {
        s if s.contains("bug") => "bug",
        s if s.contains("idea") || s.contains("feature") => "feature",
        _ => "other",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_report_without_debug() {
        let report = generate_report("Bug Report", "Something is broken", None);
        assert!(report.contains("JOBSENTINEL BETA FEEDBACK REPORT"));
        assert!(report.contains("Bug Report"));
        assert!(report.contains("Something is broken"));
    }

    #[test]
    fn test_generate_report_with_debug() {
        let info = DebugInfo {
            app_version: "2.6.3".to_string(),
            platform: "macOS".to_string(),
            os_version: "26.0".to_string(),
            architecture: "aarch64".to_string(),
            config_summary: ConfigSummary {
                scrapers_enabled: 5,
                keywords_count: 3,
                has_location_prefs: true,
                has_salary_prefs: false,
                has_company_blocklist: true,
                notifications_configured: 2,
            },
            debug_log: "[10:00:00] App started".to_string(),
        };

        let report = generate_report("Bug Report", "Test description", Some(&info));
        assert!(report.contains("2.6.3"));
        assert!(report.contains("macOS 26.0"));
        assert!(report.contains("Scrapers enabled: 5"));
        assert!(report.contains("```json"));
    }
}
```

---

## Appendix E: Exact File Formats and Safety Rules

### E.1 Report File Format (EXACT Template)

**Filename Pattern:** `jobsentinel-{category}-{timestamp}.txt`
- `{category}`: One of `bug`, `feature`, or `feedback`
- `{timestamp}`: Format `YYYY-MM-DD-HHMM` (local time)
- Example: `jobsentinel-bug-2026-01-26-1545.txt`

**DO NOT DEVIATE FROM THIS FORMAT.**

### E.2 File Safety Rules (CRITICAL)

Since this is a PUBLIC repo and files may be uploaded to shared folders:

**Generated Files MUST Be:**

| Rule | Enforcement |
|------|-------------|
| Plain text only (`.txt`) | Hardcoded extension in `save_feedback_file` |
| UTF-8 encoded | Rust's `std::fs::write` handles this |
| No embedded code | Report format is plain text with fixed structure |
| Max size 1MB | Reject if description > 10,000 chars |

**NEVER Generate:**

| Type | Extension | Reason |
|------|-----------|--------|
| Executables | `.exe`, `.app`, `.sh`, `.bat`, `.cmd` | Could run malicious code |
| Scripts | `.js`, `.py`, `.rb`, `.ps1` | Could run malicious code |
| Office macros | `.docm`, `.xlsm` | Could contain macros |
| Archives | `.zip`, `.tar`, `.gz` | Could hide any of the above |
| HTML | `.html`, `.htm` | Could contain XSS |

**Rust Enforcement:**

```rust
const ALLOWED_EXTENSIONS: &[&str] = &["txt"];

fn validate_extension(path: &std::path::Path) -> Result<(), String> {
    let ext = path.extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .ok_or("No file extension")?;

    if !ALLOWED_EXTENSIONS.contains(&ext.as_str()) {
        return Err(format!(
            "Invalid extension: .{}. Only .txt allowed.",
            ext
        ));
    }
    Ok(())
}
```

### E.3 Description Length Limits

| Field | Max Length | Enforcement |
|-------|------------|-------------|
| Description | 10,000 chars | Frontend validation + Rust check |
| Debug log | 5,000 chars | Truncate oldest events |
| Total report | ~50KB | Should never exceed with limits above |

---

## Appendix F: Cross-Platform Testing Checklist

> **CRITICAL:** Test on BOTH platforms before considering any task complete.

### F.1 macOS 26+ Testing

| Test | Expected Result | Verified |
|------|-----------------|----------|
| **File Save Dialog** | Native macOS save dialog opens | [ ] |
| **Default Location** | Desktop or Downloads | [ ] |
| **Reveal in Finder** | Finder opens, file selected | [ ] |
| **Open URL** | Default browser opens GitHub/Drive | [ ] |
| **OS Version Detection** | Shows "26.x (Tahoe)" or similar | [ ] |
| **Path Anonymization** | `/Users/name/` → `/[USER_PATH]/` | [ ] |
| **Keyboard Shortcut** | Cmd+Shift+F opens modal | [ ] |
| **Dark Mode** | All components render correctly | [ ] |
| **Clipboard** | Debug info copies successfully | [ ] |

### F.2 Windows 11 Testing

| Test | Expected Result | Verified |
|------|-----------------|----------|
| **File Save Dialog** | Native Windows save dialog opens | [ ] |
| **Default Location** | Desktop or Downloads | [ ] |
| **Reveal in Explorer** | Explorer opens, file selected | [ ] |
| **Open URL** | Default browser opens GitHub/Drive | [ ] |
| **OS Version Detection** | Shows "Windows 11 (build XXXXX)" | [ ] |
| **Path Anonymization** | `C:\Users\name\` → `[USER_PATH]\` | [ ] |
| **Keyboard Shortcut** | Ctrl+Shift+F opens modal | [ ] |
| **Dark Mode** | All components render correctly | [ ] |
| **Clipboard** | Debug info copies successfully | [ ] |

### F.3 Platform-Specific Code Locations

| Functionality | File | Platform Code |
|---------------|------|---------------|
| Reveal file | `mod.rs` | `#[cfg(target_os = "...")]` blocks |
| OS version | `system_info.rs` | Separate functions per OS |
| Path sanitization | `sanitizer.rs` | Both `/Users/` and `C:\Users\` patterns |
| Keyboard shortcut | React | Check `navigator.platform` for key labels |

### F.4 Known Platform Differences

| Behavior | macOS | Windows |
|----------|-------|---------|
| File dialog appearance | Native macOS sheet | Native Windows dialog |
| Default browser | Uses `open` command | Uses `start` command |
| Path separator | `/` | `\` |
| Keyboard modifier | `Cmd` | `Ctrl` |
| File manager | Finder | Explorer |

---

## Appendix G: GitHub Issue Templates (YAML Files)

> **Create these files exactly as shown in `.github/ISSUE_TEMPLATE/`**

### G.1 config.yml (Template Configuration)

```yaml
# .github/ISSUE_TEMPLATE/config.yml
blank_issues_enabled: false
contact_links:
  - name: Documentation
    url: https://github.com/cboyd0319/JobSentinel#readme
    about: Check the README for setup and usage instructions
  - name: Discussions
    url: https://github.com/cboyd0319/JobSentinel/discussions
    about: Ask questions and share ideas
```

### G.2 bug_report.yml

```yaml
# .github/ISSUE_TEMPLATE/bug_report.yml
name: "🐛 Bug Report"
description: "Something isn't working right"
title: "[Bug]: "
labels: ["bug", "triage"]
body:
  - type: markdown
    attributes:
      value: |
        ## Thanks for reporting a bug!

        **Privacy reminder:** Please don't include:
        - Specific job titles or company names
        - Your location or salary preferences
        - Personal information

        The debug info from JobSentinel is already anonymized.

  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: A clear description of what went wrong
      placeholder: |
        Example: When I clicked "Run Scraper" for Indeed, the app showed a
        timeout error after 30 seconds. I expected it to find jobs.
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
      description: How can we make this happen?
      placeholder: |
        1. Go to Dashboard
        2. Click 'Run Scraper' dropdown
        3. Select 'Indeed'
        4. Wait 30 seconds
        5. See timeout error
    validations:
      required: false

  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
      description: What should have happened?
      placeholder: The scraper should have found jobs within a few seconds.
    validations:
      required: false

  - type: textarea
    id: debug-info
    attributes:
      label: Debug Information
      description: |
        Paste the ANONYMIZED debug info from JobSentinel.
        (Help → Send Feedback → Copy Debug Info)
      render: shell
    validations:
      required: false

  - type: dropdown
    id: os
    attributes:
      label: Operating System
      options:
        - Windows 11
        - Windows 10
        - macOS 15 (Sequoia)
        - macOS 14 (Sonoma)
        - macOS 13 (Ventura)
        - macOS 26+ (Tahoe)
        - Linux
    validations:
      required: true

  - type: input
    id: version
    attributes:
      label: JobSentinel Version
      description: Found in Help → About
      placeholder: "2.6.3"
    validations:
      required: true

  - type: textarea
    id: screenshots
    attributes:
      label: Screenshots
      description: |
        If applicable, add screenshots.
        **Make sure they don't show personal info like job searches!**
    validations:
      required: false

  - type: checkboxes
    id: terms
    attributes:
      label: Checklist
      options:
        - label: I have searched existing issues to make sure this isn't a duplicate
          required: true
        - label: I have removed any personal information from this report
          required: true
```

### G.3 feature_request.yml

```yaml
# .github/ISSUE_TEMPLATE/feature_request.yml
name: "💡 Feature Request"
description: "Suggest an improvement or new feature"
title: "[Feature]: "
labels: ["enhancement", "triage"]
body:
  - type: markdown
    attributes:
      value: |
        ## We'd love to hear your ideas!

        Help us make JobSentinel better for everyone.

  - type: textarea
    id: problem
    attributes:
      label: What problem does this solve?
      description: Describe the use case or pain point
      placeholder: |
        Example: I often find myself manually checking if jobs are still
        posted before applying. It would save time if JobSentinel could
        detect "ghost" jobs automatically.
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Describe your proposed solution
      description: What would you like to see? How should it work?
      placeholder: |
        Example: Add a "freshness" indicator on each job that shows how
        recently it was verified to still be active.
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives you've considered
      description: Any other approaches you've thought about?
    validations:
      required: false

  - type: dropdown
    id: priority
    attributes:
      label: How important is this to you?
      options:
        - Nice to have
        - Would use regularly
        - Critical for my workflow
    validations:
      required: true

  - type: checkboxes
    id: terms
    attributes:
      label: Checklist
      options:
        - label: I have searched existing issues to make sure this isn't a duplicate
          required: true
```

### G.4 question.yml

```yaml
# .github/ISSUE_TEMPLATE/question.yml
name: "❓ Question"
description: "Ask a question about using JobSentinel"
title: "[Question]: "
labels: ["question"]
body:
  - type: markdown
    attributes:
      value: |
        ## Got a question?

        We're happy to help! Check the README first, but if you're stuck,
        ask away.

  - type: textarea
    id: question
    attributes:
      label: Your question
      description: What would you like to know?
      placeholder: |
        Example: How do I set up notifications for Slack? I can't find
        where to enter my webhook URL.
    validations:
      required: true

  - type: textarea
    id: tried
    attributes:
      label: What have you tried?
      description: Any steps you've already taken to find the answer?
    validations:
      required: false

  - type: dropdown
    id: os
    attributes:
      label: Operating System (if relevant)
      options:
        - Windows 11
        - Windows 10
        - macOS 15+
        - macOS 26+
        - Linux
        - Not applicable
    validations:
      required: false
```

---

## Appendix H: Integration Points

### H.1 Adding Feedback Button to Help Menu

```tsx
// In your Settings or Help component
import { useFeedback } from '@/hooks/useFeedback';

export function HelpMenu() {
  const { openFeedback } = useFeedback();

  return (
    <div className="space-y-2">
      {/* ... other menu items ... */}

      <button
        onClick={() => openFeedback()}
        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
      >
        <span className="mr-2">📣</span>
        Send Feedback
      </button>
    </div>
  );
}
```

### H.2 Adding "Report This" to Error Toasts

```tsx
// In your toast/notification system
import { useFeedback } from '@/hooks/useFeedback';

export function ErrorToast({ message, error }: { message: string; error: Error }) {
  const { openFeedback } = useFeedback();

  const handleReport = () => {
    openFeedback({
      category: 'bug',
      description: `Error: ${message}\n\nDetails: ${error.message}`,
    });
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <span>{message}</span>
      <button
        onClick={handleReport}
        className="text-sm text-indigo-600 hover:underline"
      >
        Report This
      </button>
    </div>
  );
}
```

### H.3 Keyboard Shortcut Registration

```tsx
// In App.tsx or a keyboard context
import { useEffect } from 'react';
import { useFeedback } from '@/hooks/useFeedback';

export function KeyboardShortcuts() {
  const { openFeedback } = useFeedback();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+F (macOS) or Ctrl+Shift+F (Windows)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        openFeedback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openFeedback]);

  return null;
}
```

### H.4 Registering Tauri Commands

```rust
// In src-tauri/src/lib.rs or main.rs

// Add to your tauri::generate_handler! macro:
tauri::generate_handler![
    // ... existing commands ...

    // Feedback commands
    commands::feedback::get_feedback_debug_info,
    commands::feedback::save_feedback_file,
    commands::feedback::reveal_feedback_file,
    commands::feedback::open_feedback_drive_folder,
    commands::feedback::open_github_issue,
]
```

### H.5 Adding Debug Log to AppState

```rust
// In src-tauri/src/lib.rs or state.rs

use commands::feedback::DebugLogBuffer;
use tokio::sync::Mutex;

pub struct AppState {
    // ... existing fields ...
    pub debug_log: Mutex<DebugLogBuffer>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            // ... existing fields ...
            debug_log: Mutex::new(DebugLogBuffer::new()),
        }
    }
}
```

### H.6 Logging Events in Commands

```rust
// Example: In a scraper command
use commands::feedback::{DebugLogBuffer, debug_log::DebugEvent};

#[tauri::command]
pub async fn run_scraper(
    scraper_name: String,
    state: State<'_, AppState>,
) -> Result<Vec<Job>, String> {
    // Log start
    {
        let mut log = state.debug_log.lock().await;
        log.log(DebugEvent::ScraperStarted {
            scraper: scraper_name.clone(),
        });
    }

    // Run scraper...
    match scrape_jobs(&scraper_name).await {
        Ok(jobs) => {
            // Log success
            let mut log = state.debug_log.lock().await;
            log.log(DebugEvent::ScraperCompleted {
                scraper: scraper_name,
                jobs_found: jobs.len(),
            });
            Ok(jobs)
        }
        Err(e) => {
            // Log failure
            let mut log = state.debug_log.lock().await;
            log.log(DebugEvent::ScraperFailed {
                scraper: scraper_name,
                error: e.to_string(),
            });
            Err(e.to_string())
        }
    }
}
```

---

## Appendix I: Dependencies

### I.1 Rust Dependencies (Cargo.toml)

```toml
# Add to [dependencies] in src-tauri/Cargo.toml

# For file dialogs (cross-platform)
rfd = "0.14"

# For opening URLs in browser
open = "5"

# For date/time handling
chrono = { version = "0.4", features = ["serde"] }

# For regex patterns (sanitization)
regex = "1"
lazy_static = "1.4"

# For directory paths
dirs = "5"
```

### I.2 Frontend Dependencies (package.json)

No additional dependencies needed - uses native clipboard API and existing Tauri bindings.

---

## Appendix J: Manual Testing Checklist

> **Complete this checklist on BOTH macOS 26+ AND Windows 11**

### J.1 Modal Opening

- [ ] Opens from Help menu
- [ ] Opens from keyboard shortcut (Cmd/Ctrl + Shift + F)
- [ ] Opens from "Report This" on error toast
- [ ] Modal appears centered with backdrop
- [ ] Escape key closes modal (when not saving)
- [ ] Click outside modal closes it (when not saving)

### J.2 Category Selection

- [ ] All 3 categories render correctly
- [ ] Clicking category advances to description step
- [ ] Category selection is visually highlighted
- [ ] Keyboard navigation works (Tab, Enter)

### J.3 Description Input

- [ ] Placeholder text matches category
- [ ] Can type multi-line text
- [ ] Character limit enforced (10,000)
- [ ] Privacy warning is visible
- [ ] Back button returns to category selection
- [ ] Continue button disabled when empty
- [ ] Continue button enabled when text entered

### J.4 Debug Info Preview

- [ ] Checkbox visible and functional
- [ ] "What gets included?" expands preview
- [ ] Preview shows actual anonymized data
- [ ] "NOT included" section is accurate
- [ ] Checkbox state persists across steps

### J.5 Submit Options

- [ ] GitHub option highlighted as "Recommended"
- [ ] Both buttons render correctly
- [ ] Loading states show spinner
- [ ] "Don't have GitHub?" link works
- [ ] Back button returns to description

### J.6 GitHub Flow

- [ ] Browser opens to correct issue template
- [ ] Debug info copied to clipboard (verify with paste)
- [ ] Success screen shows correct instructions
- [ ] Done button closes modal and resets state

### J.7 Google Drive Flow

- [ ] Save dialog opens with correct defaults
- [ ] Filename follows pattern `jobsentinel-{category}-{timestamp}.txt`
- [ ] File saves successfully
- [ ] "Show File" reveals in file manager
- [ ] "Open Google Drive" opens browser
- [ ] Success screen shows filename
- [ ] Done button closes modal and resets state

### J.8 Privacy Verification (CRITICAL)

- [ ] Saved file contains NO file paths with username
- [ ] Saved file contains NO email addresses
- [ ] Saved file contains NO webhook URLs
- [ ] Saved file contains NO job titles or company names
- [ ] Saved file contains NO LinkedIn cookie data
- [ ] Config summary shows counts, not values
- [ ] Debug log shows actions, not content
- [ ] JSON section is valid and parseable

### J.9 Error Handling

- [ ] Cancel save dialog shows appropriate message
- [ ] Disk full error shows user-friendly message
- [ ] Network error (browser open) shows URL to copy
- [ ] Invalid characters in description are handled

### J.10 Cross-Platform Specific

**macOS:**
- [ ] Save dialog is native macOS sheet
- [ ] Finder opens and selects file correctly
- [ ] Cmd+Shift+F works
- [ ] Dark mode renders correctly

**Windows:**
- [ ] Save dialog is native Windows dialog
- [ ] Explorer opens and selects file correctly
- [ ] Ctrl+Shift+F works
- [ ] Dark mode renders correctly

---

## Appendix K: Implementation Order (Critical Path)

> **Follow this exact order for implementation.**

### Phase 1: Backend Foundation

```
1.  [Rust] Create feedback module structure
    - src-tauri/src/commands/feedback/mod.rs
    - Add module to src-tauri/src/commands/mod.rs

2.  [Rust] Implement Sanitizer (CRITICAL - do this first)
    - src-tauri/src/commands/feedback/sanitizer.rs
    - Test with all pattern types

3.  [Rust] Implement system_info (cross-platform)
    - src-tauri/src/commands/feedback/system_info.rs
    - Test on macOS AND Windows

4.  [Rust] Implement DebugLogBuffer
    - src-tauri/src/commands/feedback/debug_log.rs
    - Add to AppState

5.  [Rust] Implement report generator
    - src-tauri/src/commands/feedback/report.rs
    - Verify anonymization in output

6.  [Rust] Implement Tauri commands
    - get_feedback_debug_info
    - save_feedback_file
    - reveal_feedback_file
    - open_feedback_drive_folder
    - open_github_issue

7.  [Rust] Register commands in lib.rs
    - Add to tauri::generate_handler!

8.  [Rust] Add dependencies to Cargo.toml
    - rfd, open, chrono, regex, lazy_static, dirs
```

### Phase 2: Frontend Components

```
9.  [React] Create useFeedback hook
    - src/hooks/useFeedback.ts

10. [React] Create CategorySelector
    - src/components/feedback/CategorySelector.tsx

11. [React] Create DescriptionInput
    - src/components/feedback/DescriptionInput.tsx

12. [React] Create DebugInfoPreview
    - src/components/feedback/DebugInfoPreview.tsx

13. [React] Create SubmitOptions
    - src/components/feedback/SubmitOptions.tsx

14. [React] Create SuccessScreen
    - src/components/feedback/SuccessScreen.tsx

15. [React] Create FeedbackModal (orchestrator)
    - src/components/feedback/FeedbackModal.tsx

16. [React] Add to component index
    - src/components/feedback/index.ts
```

### Phase 3: Integration

```
17. [React] Add FeedbackModal to App.tsx
    - Render conditionally based on useFeedback state

18. [React] Add keyboard shortcut
    - Cmd/Ctrl + Shift + F

19. [React] Add to Help menu
    - "Send Feedback" button

20. [React] Add to error toast
    - "Report This" button
```

### Phase 4: GitHub Templates

```
21. [GitHub] Create config.yml
    - .github/ISSUE_TEMPLATE/config.yml

22. [GitHub] Create bug_report.yml
    - .github/ISSUE_TEMPLATE/bug_report.yml

23. [GitHub] Create feature_request.yml
    - .github/ISSUE_TEMPLATE/feature_request.yml

24. [GitHub] Create question.yml
    - .github/ISSUE_TEMPLATE/question.yml
```

### Phase 5: Testing

```
25. [Test] Unit tests for Sanitizer
    - All regex patterns
    - Edge cases

26. [Test] Unit tests for DebugLogBuffer
    - Ring buffer behavior
    - Event formatting

27. [Test] Unit tests for report generation
    - With and without debug info
    - JSON validity

28. [Test] Integration test on macOS
    - Complete flow

29. [Test] Integration test on Windows
    - Complete flow

30. [Test] Privacy verification
    - Manual review of 5 sample reports
```

### Phase 6: Documentation

```
31. [Docs] Update CHANGELOG.md
    - Add feedback system to version notes

32. [Docs] Add to README.md
    - Section on reporting issues

33. [Docs] Create user guide
    - docs/user/REPORTING_ISSUES.md
```

---

## Appendix L: Troubleshooting Guide

### L.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Save dialog doesn't open | rfd not properly linked | Verify rfd in Cargo.toml, rebuild |
| Browser doesn't open | open crate issue | Check system default browser settings |
| Reveal file doesn't work | Path has special characters | Use proper escaping in platform code |
| Clipboard copy fails | Permission issue | Check Tauri permissions in tauri.conf.json |
| Debug info empty | DebugLogBuffer not initialized | Verify AppState initialization |

### L.2 Platform-Specific Debugging

**macOS:**
```bash
# Check if open command works
open -R ~/Desktop/test.txt

# Check browser opening
open https://github.com
```

**Windows:**
```powershell
# Check if explorer works
explorer /select,"C:\Users\Public\test.txt"

# Check browser opening
start https://github.com
```

### L.3 Debug Logging

Add temporary logging to diagnose issues:

```rust
// In commands
tracing::debug!("save_feedback_file called with category: {}", category);
tracing::debug!("Generated report length: {}", report_text.len());
tracing::debug!("Save path: {:?}", path);
```

---

## Summary

This document provides a complete implementation plan for JobSentinel's beta feedback system.

**Key Points:**
1. **GitHub Issues is PRIMARY** - make it easy, pre-fill templates
2. **Google Drive is SECONDARY** - for non-GitHub users
3. **100% ANONYMIZATION** - this is a PUBLIC repo
4. **Cross-platform** - must work on macOS 26+ AND Windows 11
5. **Complete code** - copy-paste ready for less capable models

**File Count:**
- 5 Rust modules (~600 lines total)
- 6 React components (~800 lines total)
- 4 GitHub YAML templates (~200 lines total)
- 1 React hook (~50 lines)

**Total Implementation Effort:** ~32 tasks across 6 phases

---

**Document Version:** 1.4
**Last Updated:** 2026-01-26
