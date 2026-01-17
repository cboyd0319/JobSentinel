# JobSentinel Browser Extension

## In-Page Job Scoring & One-Click Save

> **Status:** ✅ Core Implementation Complete
> **Version:** 1.0.0
> **Last Updated:** 2025-11-15
> **Estimated Effort:** 5-6 weeks (Phase 1 Complete: 3 weeks)

---

## 🎯 Overview

The JobSentinel Browser Extension brings AI-powered job scoring directly to your browser.
Get instant feedback on job postings while browsing career sites, save jobs to your desktop
app with one click, and never miss great opportunities.

### Key Features

- **🎯 In-Page Job Scoring** - See job scores instantly on 8+ ATS platforms
- **💾 One-Click Save** - Send jobs directly to desktop app
- **🔍 Already-Seen Detection** - Know if you've already saved a job
- **📊 Match Factor Breakdown** - See why jobs match (or don't match)
- **🔄 Real-Time Sync** - WebSocket connection to desktop app
- **🌐 Universal Support** - Works on Greenhouse, Lever, Workday, Indeed, LinkedIn, and more

---

## 🏗️ Architecture

### System Components

```text
┌────────────────────────────────────────────────────┐
│         Browser Extension Architecture             │
│                                                     │
│  ┌──────────────┐         ┌──────────────────────┐│
│  │  Content     │────────▶│  Background          ││
│  │  Script      │         │  Service Worker      ││
│  └──────────────┘         └──────────────────────┘│
│        │                           │               │
│        │                           │               │
│        ▼                           ▼               │
│  ┌──────────────┐         ┌──────────────────────┐│
│  │  Scoring     │         │  WebSocket Client    ││
│  │  Overlay     │         │  (ws://localhost)    ││
│  └──────────────┘         └──────────────────────┘│
└────────────────────────────────────────────────────┘
                                    │
                                    ▼
                          ┌──────────────────────┐
                          │  Desktop App         │
                          │  (Tauri + Rust)      │
                          └──────────────────────┘
```

### File Structure

```text
browser-extension/
├── manifest.json                 # Chrome Manifest V3
├── popup.html                    # Extension popup UI
├── popup.js                      # Popup logic
├── scripts/
│   ├── job-detector.js          # ATS platform detection & data extraction
│   ├── scoring-overlay.js       # Job score overlay UI
│   └── content-script.js        # Main content script
├── background/
│   └── service-worker.js        # Background tasks & WebSocket client
├── styles/
│   └── overlay.css              # Overlay styles
└── icons/
    ├── icon16.png               # 16x16 icon
    ├── icon48.png               # 48x48 icon
    └── icon128.png              # 128x128 icon
```

---

## 🚀 Installation

### Chrome/Edge (Developer Mode)

1. **Clone Repository**

   ```bash
   git clone https://github.com/jobsentinel/JobSentinel.git
   cd JobSentinel/browser-extension
   ```

2. **Load Extension**
   - Open Chrome/Edge
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select `JobSentinel/browser-extension` directory

3. **Verify Installation**
   - Extension icon should appear in toolbar
   - Click icon to see popup

### Firefox (Temporary Installation)

1. **Navigate to Debug Page**
   - Open Firefox
   - Navigate to `about:debugging#/runtime/this-firefox`

2. **Load Temporary Add-on**
   - Click "Load Temporary Add-on..."
   - Select `manifest.json` from `browser-extension/` directory

3. **Note:** Firefox requires re-loading after every browser restart

---

## 📖 Usage Guide

### 1. Start Desktop App

**IMPORTANT:** The browser extension requires the JobSentinel desktop app to be running for full functionality.

```bash
# Start desktop app
cd src-tauri
cargo run
```

The desktop app will start a WebSocket server on `ws://localhost:8765`.

### 2. Browse Job Postings

Navigate to any supported career site:

- **Greenhouse:** `boards.greenhouse.io/*`
- **Lever:** `*.lever.co/jobs/*`
- **Workday:** `*.myworkdayjobs.com/*`
- **Indeed:** `www.indeed.com/viewjob/*`
- **LinkedIn:** `linkedin.com/jobs/view/*`
- **iCIMS:** `*.icims.com/jobs/*`
- **BambooHR:** `*.bamboohr.com/jobs/*`
- **Ashby:** `jobs.ashbyhq.com/*`

### 3. View Job Score

When you land on a job posting page, the extension will automatically:

1. **Detect** the ATS platform
2. **Extract** job data (title, company, location, description)
3. **Score** the job (0-100) based on your preferences
4. **Display** a floating overlay with the score

**Example Overlay:**

```text
┌──────────────────────────────────┐
│ JobSentinel               ×      │
├──────────────────────────────────┤
│                                  │
│          ┌────────┐              │
│          │   85   │ A            │
│          │  Score │              │
│          └────────┘              │
│                                  │
│  [Save to JobSentinel]           │
│  [View Details]                  │
│                                  │
│  Open Desktop App →              │
└──────────────────────────────────┘
```

### 4. Save Job

Click **"Save to JobSentinel"** to send the job to your desktop app.

- Job is immediately saved to database
- Overlay updates to show "✓ Already Saved"
- Desktop app shows notification

### 5. View Match Factors

Click **"View Details"** to see why the job scored the way it did:

```text
Match Factors
─────────────
Skills Match:    85%
Salary:          90%
Location:        100% (Remote)
Seniority:       75%
```

---

## 🎨 Score Grading

| Score | Grade | Color | Meaning |
|-------|-------|-------|---------|
| 90-100 | A+ | 🟢 Green | Excellent match - Apply ASAP! |
| 80-89 | A | 🟢 Green | Great match - Highly recommended |
| 70-79 | B+ | 🔵 Blue | Good match - Worth applying |
| 60-69 | B | 🔵 Blue | Decent match - Consider it |
| 50-59 | C+ | 🟠 Orange | Fair match - Weigh pros/cons |
| 40-49 | C | 🟠 Orange | Below average - Not ideal |
| 0-39 | D | 🔴 Red | Poor match - Skip it |

---

## 🔌 WebSocket Communication

### Desktop App WebSocket Server

The desktop app must expose a WebSocket server on port 8765:

```rust
// src-tauri/src/websocket_server.rs (to be implemented)

use tokio_tungstenite::accept_async;
use futures_util::{StreamExt, SinkExt};

pub async fn start_websocket_server(db: SqlitePool) -> Result<()> {
    let addr = "127.0.0.1:8765";
    let listener = TcpListener::bind(addr).await?;
    println!("WebSocket server listening on ws://{}", addr);

    while let Ok((stream, _)) = listener.accept().await {
        tokio::spawn(handle_connection(stream, db.clone()));
    }

    Ok(())
}

async fn handle_connection(stream: TcpStream, db: SqlitePool) {
    let ws_stream = accept_async(stream).await.unwrap();
    let (mut write, mut read) = ws_stream.split();

    while let Some(msg) = read.next().await {
        if let Ok(msg) = msg {
            // Handle message from browser extension
            let response = handle_message(msg.to_string(), &db).await;
            write.send(response.into()).await.unwrap();
        }
    }
}
```

### Message Protocol

#### Request: Check Job

Browser → Desktop App:

```json
{
  "action": "checkJob",
  "requestId": "req_1234567890_abc123",
  "jobHash": "a1b2c3d4e5f6g7h8",
  "jobData": {
    "title": "Senior Software Engineer",
    "company": "Google",
    "location": "Remote",
    "description": "...",
    "url": "https://...",
    "source": "greenhouse"
  }
}
```

Desktop App → Browser:

```json
{
  "action": "checkJobResponse",
  "requestId": "req_1234567890_abc123",
  "isAlreadySaved": false,
  "score": 0.85
}
```

#### Request: Save Job

Browser → Desktop App:

```json
{
  "action": "saveJob",
  "requestId": "req_1234567890_def456",
  "jobData": { ... },
  "score": 0.85
}
```

Desktop App → Browser:

```json
{
  "action": "saveJobResponse",
  "requestId": "req_1234567890_def456",
  "success": true,
  "error": null
}
```

#### Request: Get Match Factors

Browser → Desktop App:

```json
{
  "action": "getMatchFactors",
  "requestId": "req_1234567890_ghi789",
  "jobData": { ... }
}
```

Desktop App → Browser:

```json
{
  "action": "matchFactorsResponse",
  "requestId": "req_1234567890_ghi789",
  "factors": {
    "skills": 0.85,
    "salary": 0.90,
    "location": 1.00,
    "seniority": 0.75
  }
}
```

---

## 🛠️ Supported ATS Platforms

### 1. Greenhouse (`boards.greenhouse.io`)

**Selectors:**

- Title: `.app-title` or `h1`
- Company: `.company-name` or hostname
- Location: `.location`
- Description: `#content` or `.job-description`

### 2. Lever (`*.lever.co`)

**Selectors:**

- Title: `.posting-headline h2`
- Company: `.main-header-text a`
- Location: `.posting-categories .location`
- Description: `.section-wrapper`

### 3. Workday (`*.myworkdayjobs.com`)

**Selectors:**

- Title: `[data-automation-id="jobPostingHeader"]`
- Company: `[data-automation-id="company"]`
- Location: `[data-automation-id="locations"]`
- Description: `[data-automation-id="jobPostingDescription"]`

### 4. Indeed (`www.indeed.com`)

**Selectors:**

- Title: `[class*="jobsearch-JobInfoHeader-title"]`
- Company: `[data-company-name="true"]`
- Location: `[class*="jobsearch-JobInfoHeader-subtitle"] > div`
- Description: `#jobDescriptionText`

### 5. LinkedIn (`linkedin.com/jobs`)

**Selectors:**

- Title: `.top-card-layout__title`
- Company: `.topcard__org-name-link`
- Location: `.topcard__flavor--bullet`
- Description: `.show-more-less-html__markup`

---

## 🔧 Configuration

### Extension Settings (Future Implementation)

```javascript
// Stored in chrome.storage.sync
{
  "autoDetect": true,              // Automatically detect job pages
  "showOverlay": true,              // Show scoring overlay
  "desktopAppUrl": "ws://localhost:8765",
  "minimumScoreToNotify": 0.7,     // Only notify for scores ≥70%
  "preferredLocations": ["Remote", "San Francisco, CA"],
  "blacklistCompanies": ["Company X"]
}
```

---

## 📊 Privacy & Data

### What Data is Collected?

- **Job Metadata:** Title, company, location, description, URL
- **User Actions:** Jobs viewed, jobs saved (stored locally)
- **Score Data:** Calculated job scores

### What Data is NOT Collected?

- ❌ Browsing history outside job posting pages
- ❌ Personal information (name, email, resume)
- ❌ Login credentials
- ❌ Analytics or tracking data

### Where is Data Stored?

- **Local Storage:** Session statistics (jobs viewed/saved)
- **Desktop App:** All job data is stored in local SQLite database
- **No Cloud:** Extension does not send data to external servers

---

## 🧪 Testing

### Manual Testing Checklist

**Greenhouse:**

- [ ] Navigate to `boards.greenhouse.io/*/jobs/*`
- [ ] Verify overlay appears
- [ ] Click "Save to JobSentinel"
- [ ] Verify job appears in desktop app
- [ ] Refresh page → Verify "✓ Already Saved" shown

**Lever:**

- [ ] Navigate to `*.lever.co/jobs/*`
- [ ] Verify overlay appears
- [ ] Check score accuracy

**Workday:**

- [ ] Navigate to `*.myworkdayjobs.com/*`
- [ ] Verify overlay appears

**Indeed:**

- [ ] Navigate to `indeed.com/viewjob/*`
- [ ] Verify overlay appears

**LinkedIn:**

- [ ] Navigate to `linkedin.com/jobs/view/*`
- [ ] Verify overlay appears

---

## 🐛 Troubleshooting

### Issue: Overlay Not Appearing

**Possible Causes:**

1. Extension not loaded
2. Not on a supported ATS platform
3. Page not fully loaded

**Solutions:**

1. Check `chrome://extensions/` → Ensure extension is enabled
2. Verify URL matches supported platforms
3. Refresh page and wait 2-3 seconds

### Issue: "Desktop App Not Connected"

**Possible Causes:**

1. Desktop app not running
2. WebSocket server not started
3. Port 8765 blocked by firewall

**Solutions:**

1. Start desktop app: `cd src-tauri && cargo run`
2. Check console for WebSocket errors
3. Verify firewall allows localhost:8765

### Issue: Job Data Not Extracting

**Possible Causes:**

1. ATS platform updated their HTML structure
2. Dynamic content not yet loaded

**Solutions:**

1. Check browser console for errors
2. Update selectors in `job-detector.js`
3. Wait longer before extracting (increase timeout)

---

## 🚀 Future Enhancements

### Phase 2: Advanced Features

- [ ] **Custom Scoring Rules** - User-defined scoring weights
- [ ] **Batch Save** - Save multiple jobs from search results
- [ ] **Quick Notes** - Add notes to jobs directly from overlay
- [ ] **Application Status Sync** - Track applications in extension
- [ ] **Keyboard Shortcuts** - `Ctrl+Shift+S` to save job

### Phase 3: AI-Powered Features

- [ ] **Auto-Apply** - One-click application submission (with user approval)
- [ ] **Cover Letter Generation** - AI-generated cover letters
- [ ] **Salary Negotiation Tips** - Show negotiation scripts in overlay
- [ ] **Company Research** - Display company health score

### Phase 4: Platform Expansion

- [ ] **Safari Extension** - macOS/iOS support
- [ ] **Firefox Add-on** - Full Firefox compatibility
- [ ] **Additional ATS Platforms** - SmartRecruiters, Jobvite, etc.

---

## 📚 API Reference

### `JobDetector` (job-detector.js)

```javascript
class JobDetector {
  // Detect ATS platform from URL/page structure
  static detectPlatform(): string | null

  // Extract job data from current page
  static extractJobData(platform: string): JobData | null

  // Generate unique hash for job (deduplication)
  static async generateJobHash(jobData: JobData): Promise<string>

  // Check if current page is a job posting
  static isJobPage(): boolean
}

interface JobData {
  title: string
  company: string
  location: string
  description: string
  url: string
  source: string
  hash?: string
}
```

### `ScoringOverlay` (scoring-overlay.js)

```javascript
class ScoringOverlay {
  // Show overlay with job score
  static show(jobData: JobData, score: number, isAlreadySaved: boolean): void

  // Remove overlay from page
  static remove(): void

  // Handle save button click
  static async handleSave(): Promise<void>

  // Toggle match factors visibility
  static async toggleDetails(): Promise<void>

  // Show notification toast
  static showNotification(message: string, type: 'success' | 'error' | 'info'): void
}
```

---

## ✅ Implementation Status

### Phase 1: Foundation ✅ COMPLETE

- [x] Chrome Manifest V3 configuration
- [x] Content script injection (8 ATS platforms)
- [x] Job data extraction (Greenhouse, Lever, Workday, Indeed, LinkedIn, iCIMS, BambooHR, Ashby)
- [x] Scoring overlay UI with draggable functionality
- [x] Background service worker
- [x] WebSocket client for desktop sync
- [x] Save job functionality
- [x] Already-seen detection
- [x] Match factor display
- [x] Extension popup UI
- [x] Session statistics tracking
- [x] Full documentation

### Phase 2-4: Future 🔜

- [ ] Firefox WebExtension port
- [ ] Safari extension port
- [ ] Custom scoring rules
- [ ] Batch save functionality
- [ ] Auto-apply feature
- [ ] Additional ATS platform support

---

**Last Updated:** 2025-11-15
**Maintained By:** JobSentinel Core Team
**Implementation Status:** ✅ Phase 1 Complete (Core Extension)
**Next Feature:** Company Health Monitoring (P0)

💡 **Pro Tip:** Keep the desktop app running in the background for seamless job saving and real-time score updates!
