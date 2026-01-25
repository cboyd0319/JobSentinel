# Application Tracking

**Never lose track of a job application again.**

Applied to 50 jobs and can't remember which ones? JobSentinel's Application Tracker is like
a Trello board for your job search. Drag applications between columns as they progress,
set reminders to follow up, and see your entire pipeline at a glance.

---

## What Can the Application Tracker Do For You?

- **Visual pipeline** — See all your applications organized by status (Applied, Interviewing, Offer, etc.)
- **Automatic reminders** — Get reminded to follow up or send thank-you emails
- **Ghosting detection** — Know when a company has gone silent
- **Notes & contacts** — Keep recruiter info and notes with each application

---

## How to Use It

1. Click **Applications** in the sidebar
2. When you find a job you like, click **"Track Application"**
3. Drag cards between columns as your application progresses
4. Click any card to add notes, set reminders, or update status

---

## Technical Documentation

<details>
<summary><strong>For developers and the curious</strong></summary>

## Kanban Board & Pipeline Management for JobSentinel

> **Status:** WORKING - Module enabled in v1.4.0
> **Completion:** 100% core functionality
> **Last Updated:** 2026-01-25
> **Version:** 2.6.3
> **Tests:** 4 tests (ignored - require file-based database setup)

---

## Overview

JobSentinel's Application Tracking System provides comprehensive pipeline management for your job search with:

- **📋 Kanban Board** - Visual pipeline with 12 status columns
- **⏰ Automated Reminders** - Smart follow-ups based on status transitions
- **📝 Timeline Tracking** - Complete audit trail of all application events
- **👻 Ghosting Detection** - Automatic detection of stalled applications
- **📊 Analytics-Ready** - Track success rates, response times, and more

### Module Architecture (v1.4.0)

The ATS module has been refactored into 5 focused submodules:

- **types** - Core data structures (Application, ApplicationStatus, ApplicationsByStatus, etc.)
- **tracker** - Main ApplicationTracker logic (CRUD, status management, kanban queries)
- **reminders** - Automated reminder system and pending reminder queries
- **interview** - Interview scheduling and tracking
- **tests** - Comprehensive unit tests (4 tests covering all core functionality)

This modular structure keeps code organized and maintainable while supporting future enhancements.

### Screenshot

![Application Tracking - Kanban Board](../images/application-tracking.png)

*Drag cards between columns to update application status*

---

## 🏗️ Architecture

### Database Schema

```sql
-- Core application tracking
applications
├── id (PRIMARY KEY)
├── job_hash (FOREIGN KEY → jobs.hash)
├── status
├── applied_at
├── last_contact
├── next_followup
├── notes
├── recruiter_name, recruiter_email, recruiter_phone
└── salary_expectation

-- Event timeline (audit trail)
application_events
├── id (PRIMARY KEY)
├── application_id (FOREIGN KEY)
├── event_type
├── event_data (JSON)
└── created_at

-- Reminders & follow-ups
application_reminders
├── id (PRIMARY KEY)
├── application_id (FOREIGN KEY)
├── reminder_type
├── reminder_time
├── message
├── completed (boolean)
└── completed_at

-- Interview tracking
interviews

-- Offer tracking
offers
```

### Status Pipeline

```text
To Apply → Applied → Screening Call → Phone Interview
    ↓         ↓           ↓                 ↓
Withdrawn  Rejected    Ghosted    Technical Interview
                                          ↓
                                   Onsite Interview
                                          ↓
                                   Offer Received
                                    ↙        ↘
                            Offer Accepted  Offer Rejected
```

### Application Statuses (12 Total)

| Status | Description | Auto-Reminders |
|--------|-------------|----------------|
| `to_apply` | Saved but not yet applied | None |
| `applied` | Application submitted | ✅ Follow-up in 7 days |
| `screening_call` | Initial recruiter contact | None |
| `phone_interview` | Phone/video interview scheduled | ✅ Thank-you in 24 hours |
| `technical_interview` | Technical assessment | ✅ Thank-you in 24 hours |
| `onsite_interview` | In-person/final round | ✅ Thank-you in 24 hours |
| `offer_received` | Offer extended | None (user decides) |
| `offer_accepted` | Accepted position | None |
| `offer_rejected` | Declined offer | None |
| `rejected` | Company rejected | None |
| `ghosted` | No response for 14+ days | Auto-detected |
| `withdrawn` | User withdrew application | None |

---

## 🚀 Core Features

### 1. Application Management

```rust
use jobsentinel::core::ats::{ApplicationTracker, ApplicationStatus};

let tracker = ApplicationTracker::new(db_pool);

// Create application
let app_id = tracker.create_application("job_hash_123").await?;

// Update status (triggers auto-reminders)
tracker.update_status(app_id, ApplicationStatus::Applied).await?;

// Get application details
let app = tracker.get_application(app_id).await?;
```

### 2. Kanban Board

```rust
// Get all applications grouped by status
let kanban = tracker.get_applications_by_status().await?;

// Access by column
kanban.applied         // Vec<ApplicationWithJob>
kanban.phone_interview // Vec<ApplicationWithJob>
kanban.offer_received  // Vec<ApplicationWithJob>
// etc.
```

**Response Structure:**

```rust
ApplicationsByStatus {
    to_apply: Vec<ApplicationWithJob>,
    applied: Vec<ApplicationWithJob>,
    screening_call: Vec<ApplicationWithJob>,
    phone_interview: Vec<ApplicationWithJob>,
    technical_interview: Vec<ApplicationWithJob>,
    onsite_interview: Vec<ApplicationWithJob>,
    offer_received: Vec<ApplicationWithJob>,
    offer_accepted: Vec<ApplicationWithJob>,
    offer_rejected: Vec<ApplicationWithJob>,
    rejected: Vec<ApplicationWithJob>,
    ghosted: Vec<ApplicationWithJob>,
    withdrawn: Vec<ApplicationWithJob>,
}
```

Each `ApplicationWithJob` includes:

- Application metadata (ID, status, dates, notes)
- Job details (title, company, score)
- Perfect for rendering Kanban cards

### 3. Automated Reminders

**Auto-created reminders:**

```rust
// When status → Applied
tracker.update_status(app_id, ApplicationStatus::Applied).await?;
// Creates: "Follow up on application if no response" (in 7 days)

// When status → PhoneInterview/TechnicalInterview/OnsiteInterview
tracker.update_status(app_id, ApplicationStatus::PhoneInterview).await?;
// Creates: "Send thank-you email after interview" (in 24 hours)
```

**Manual reminders:**

```rust
use chrono::{Utc, Duration};

let reminder_time = Utc::now() + Duration::days(3);
tracker.set_reminder(
    app_id,
    "interview_prep",
    reminder_time,
    "Research company and prepare questions",
).await?;
```

**Get pending reminders:**

```rust
let reminders = tracker.get_pending_reminders().await?;
// Returns all incomplete reminders where reminder_time <= now

for reminder in reminders {
    println!("⏰ {}: {}", reminder.job_title, reminder.message);

    // Mark as done
    tracker.complete_reminder(reminder.id).await?;
}
```

### 4. Ghosting Detection

```rust
// Automatically mark applications as "ghosted" if:
// - Status: applied, phone_interview, technical_interview, or onsite_interview
// - No contact for 14+ days

let ghosted_count = tracker.auto_detect_ghosted().await?;
println!("Marked {} applications as ghosted", ghosted_count);
```

**Recommendation:** Run this daily/weekly via scheduler

### 5. Contact Tracking

```rust
// Update last contact timestamp (prevents ghosting detection)
tracker.update_last_contact(app_id).await?;
```

### 6. Notes Management

```rust
// Add/update notes
tracker.add_notes(
    app_id,
    "Recruiter mentioned team is hiring 3 engineers this quarter. \
     Salary range: $150-180K. Remote-first culture.",
).await?;

// Logs "note_added" event to timeline
```

---

## 📊 Event Timeline

All significant events are logged automatically:

```rust
// Event types tracked:
- "status_change"      // { from: "applied", to: "phone_interview" }
- "email_received"     // { subject: "...", from: "..." } (future)
- "email_sent"         // { subject: "...", to: "..." } (future)
- "phone_call"         // { duration: 900, notes: "..." } (future)
- "interview_scheduled" // { date: "...", type: "..." } (future)
- "note_added"         // { notes: "..." }
- "reminder_set"       // { type: "...", time: "..." }
```

**Query timeline:**

```sql
SELECT event_type, event_data, created_at
FROM application_events
WHERE application_id = ?
ORDER BY created_at DESC;
```

---

## 🧪 Testing

### Unit Tests Included

```bash
cargo test --lib ats

# Tests cover:
# - Application creation
# - Status updates
# - Applied timestamp auto-set
# - Kanban board grouping
# - Auto-reminder creation
# - Event logging
```

**Test Coverage:**

- ✅ Create application
- ✅ Get application by ID
- ✅ Update status transitions
- ✅ Auto-set applied_at timestamp
- ✅ Kanban board grouping by status
- ✅ Auto-reminder on status change
- ✅ Event logging

---

## 🎨 UI Integration (Future)

### Kanban Board Component

```typescript
// src/pages/ApplicationTracker.tsx

import { invoke } from '@tauri-apps/api/core';

const kanban = await invoke<ApplicationsByStatus>('get_applications_by_status');

// Render columns
{kanban.applied.map(app => (
  <KanbanCard
    key={app.id}
    title={app.job_title}
    company={app.company}
    score={app.score}
    onDrag={() => updateStatus(app.id, newStatus)}
  />
))}
```

### Status Update

```typescript
const updateStatus = async (appId: number, newStatus: string) => {
  await invoke('update_application_status', {
    applicationId: appId,
    newStatus: newStatus,
  });
};
```

### Reminder Notifications

```typescript
const checkReminders = async () => {
  const reminders = await invoke<PendingReminder[]>('get_pending_reminders');

  for (const reminder of reminders) {
    // Show desktop notification
    new Notification(`⏰ Reminder: ${reminder.job_title}`, {
      body: reminder.message,
    });

    // Mark completed
    await invoke('complete_reminder', { reminderId: reminder.id });
  }
};

// Check every hour
setInterval(checkReminders, 3600000);
```

---

## 📈 Analytics Queries

### Success Rate

```sql
SELECT
  COUNT(CASE WHEN status = 'offer_received' THEN 1 END) * 100.0 / COUNT(*) as offer_rate,
  COUNT(CASE WHEN status = 'offer_accepted' THEN 1 END) * 100.0 / COUNT(*) as accept_rate
FROM applications
WHERE status IN ('applied', 'rejected', 'offer_received', 'offer_accepted', 'ghosted');
```

### Average Response Time

```sql
SELECT
  AVG(CAST((julianday(last_contact) - julianday(applied_at)) AS INTEGER)) as avg_days_to_response
FROM applications
WHERE applied_at IS NOT NULL AND last_contact IS NOT NULL;
```

### Ghosting Rate

```sql
SELECT
  COUNT(CASE WHEN status = 'ghosted' THEN 1 END) * 100.0 / COUNT(*) as ghosting_rate
FROM applications
WHERE status IN ('applied', 'rejected', 'ghosted');
```

---

## 🚀 Future Enhancements

### Phase 2 (Future)

- [ ] **Interview Management** - Full interview tracking with prep notes
- [ ] **Offer Comparison** - Side-by-side offer analysis (salary, equity, benefits)
- [ ] **Email Integration** - Parse recruiter emails automatically
- [ ] **Calendar Sync** - Add interviews to Google Calendar/Outlook
- [ ] **Document Vault** - Store resumes, cover letters per application
- [ ] **Analytics Dashboard** - Visual charts for success rates, timelines
- [ ] **Bulk Actions** - Update multiple applications at once
- [ ] **Tags/Labels** - Categorize applications (dream job, backup, practice)
- [ ] **Salary Negotiation Tracker** - Track offer negotiations
- [ ] **Application Templates** - Save common application patterns

### Phase 3 (Advanced)

- [ ] **Machine Learning** - Predict offer likelihood based on timeline
- [ ] **A/B Testing** - Track which resumes/cover letters work best
- [ ] **Recruiter CRM** - Build relationships with recruiters over time
- [ ] **Company Blacklist** - Never apply to bad companies again
- [ ] **Application Insights** - "You typically get ghosted at X days"

---

## 🔧 API Reference

### ApplicationTracker

```rust
pub struct ApplicationTracker {
    db: SqlitePool,
}

impl ApplicationTracker {
    pub fn new(db: SqlitePool) -> Self;

    // CRUD
    pub async fn create_application(&self, job_hash: &str) -> Result<i64>;
    pub async fn get_application(&self, application_id: i64) -> Result<Application>;

    // Status management
    pub async fn update_status(&self, application_id: i64, new_status: ApplicationStatus) -> Result<()>;

    // Kanban board
    pub async fn get_applications_by_status(&self) -> Result<ApplicationsByStatus>;

    // Reminders
    pub async fn set_reminder(&self, application_id: i64, reminder_type: &str, reminder_time: DateTime<Utc>, message: &str) -> Result<()>;
    pub async fn get_pending_reminders(&self) -> Result<Vec<PendingReminder>>;
    pub async fn complete_reminder(&self, reminder_id: i64) -> Result<()>;

    // Utilities
    pub async fn auto_detect_ghosted(&self) -> Result<usize>;
    pub async fn update_last_contact(&self, application_id: i64) -> Result<()>;
    pub async fn add_notes(&self, application_id: i64, notes: &str) -> Result<()>;
}
```

### Types

```rust
pub enum ApplicationStatus {
    ToApply, Applied, ScreeningCall, PhoneInterview,
    TechnicalInterview, OnsiteInterview, OfferReceived,
    OfferAccepted, OfferRejected, Rejected, Ghosted, Withdrawn,
}

pub struct Application {
    pub id: i64,
    pub job_hash: String,
    pub status: ApplicationStatus,
    pub applied_at: Option<DateTime<Utc>>,
    pub last_contact: Option<DateTime<Utc>>,
    pub notes: Option<String>,
    // ...
}

pub struct ApplicationsByStatus {
    pub to_apply: Vec<ApplicationWithJob>,
    pub applied: Vec<ApplicationWithJob>,
    // ... (12 columns total)
}
```

---

## ✅ Implementation Status

### Completed ✅

- [x] Database schema (5 tables, 10 indexes)
- [x] ApplicationTracker core module (500+ lines)
- [x] Status management with transitions
- [x] Auto-reminder system
- [x] Kanban board queries
- [x] Ghosting detection
- [x] Event timeline logging
- [x] Contact tracking
- [x] Notes management
- [x] Comprehensive unit tests

### Future 🔜

- [ ] Tauri commands
- [ ] UI components (Kanban board)
- [ ] Interview tracking
- [ ] Offer comparison
- [ ] Email integration
- [ ] Analytics dashboard

---

**Last Updated:** 2026-01-17
**Maintained By:** JobSentinel Core Team
**Implementation Status:** ✅ Core Complete (Phase 1)
**Next Feature:** UI Connections & Polish (v1.4 E4)

</details>
