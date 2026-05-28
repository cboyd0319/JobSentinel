# User Data Management

**Your job search, organized and persistent.**

JobSentinel keeps your job search data organized and always available. Save cover letter
templates, prep for interviews, bookmark searches, and customize notifications—all stored
securely in your local database.

---

## Overview

User data management provides four core features for organizing your job search:

1. **Cover Letter Templates** - Reusable letter templates with smart variable substitution
2. **Interview Prep Checklists** - Pre-interview preparation and follow-up reminders
3. **Saved Searches** - Bookmark frequently-used search queries
4. **Notification Preferences** - Fine-tuned alert rules for each job source

All data is stored locally in SQLite. No data leaves your computer unless you explicitly
configure external notifications (Slack, Discord, etc.).

SQLite is the source of truth for job-search records and durable preferences.
Frontend localStorage is reserved for non-authoritative UI preferences, short-lived
caches, sanitized error logs, and transient recovery hints.

---

## Cover Letter Templates

Save and reuse cover letters across applications. Templates support variable substitution
for company names, positions, and other details.

### Creating a Template

1. Go to **Templates** in the sidebar
2. Click **+ New Template**
3. Enter a name (for example: "Tech Startup", "Fortune 500", "Contract Role")
4. Select a category:
   - **Default** - General purpose
   - **Formal** - Corporate roles
   - **Startup** - Early-stage companies
   - **Contract** - Freelance/temporary roles
5. Write your cover letter with variables where needed
6. Click **Save**

### Using Variables

Insert placeholders for values that change per application:

| Variable           | Replaced With          |
| ------------------ | ---------------------- |
| `{company}`        | Company name           |
| `{position}`       | Job title              |
| `{hiring_manager}` | Recruiter/manager name |
| `{department}`     | Team or department     |
| `{location}`       | Office location        |
| `{salary_range}`   | Expected salary band   |

**Example template:**

```text
Dear {hiring_manager},

I'm excited to apply for the {position} role at {company}. Your work in {department}
aligns perfectly with my experience...

Best regards,
Your Name
```

### Apply with Template (Use for Job Button)

When viewing a job posting:

1. Click **Use for Job** in the top right
2. Select a template from the dropdown
3. JobSentinel auto-fills known variables (company name from the posting)
4. Review and edit the letter
5. Copy to clipboard or send directly

The generated letter is NOT automatically submitted—you always review before sending.

### Managing Templates

**View all templates:** Templates page shows creation date, last modified, and category

**Edit template:** Click the template name to open the editor

**Duplicate template:** Use the **Duplicate** button to create a variant

**Delete template:** Click **Delete** (this can't be undone)

---

## Interview Prep Checklists

Prepare for interviews with structured checklists and company research integration.

### Pre-Interview Preparation

When you schedule an interview in JobSentinel:

1. Go to **Applications** and find the job
2. Click **Schedule Interview**
3. A prep checklist automatically generates with:
   - **Research Items** - Company background, recent news, product overview
   - **Technical Items** - Data structures, system design, coding problems
   - **Behavioral Items** - STAR method stories, culture fit, questions to ask
   - **Logistics Items** - Dial-in link, timezone check, equipment test

### Using the Checklist

1. Open the **Applications** page
2. Find your scheduled interview
3. Click **Prep Checklist**
4. Check off items as you complete them
5. Incomplete items are flagged as reminders

You can mark items complete or incomplete at any time—progress is automatically saved.

### Company Research Integration

JobSentinel links your prep checklist to the company research panel:

- When you open an interview checklist, the company research panel appears on the right
- Read recent news, Glassdoor reviews, tech stack, and company social media
- Add your own notes in the research panel
- All research is saved for future reference

---

## Follow-up Reminders

Never miss a follow-up. JobSentinel reminds you to send thank-you notes and check in on applications.

### Setting Reminders

When you schedule an interview:

1. JobSentinel automatically sets a **3-day follow-up reminder**
2. After the interview ends, check **Send Thank You** in your reminder
3. Copy the auto-generated thank you email or write your own
4. The reminder marks as complete

### Reminder Notifications

You receive notifications at:

- **1 day before interview** - Preparation reminder
- **3 days after interview** - Thank you email reminder
- **7 days after interview** - Status check-in reminder

You can disable specific reminders in **Settings > Interview Prep**.

---

## Saved Searches

Bookmark your favorite job searches and access them with one click.

### Creating a Saved Search

1. On the **Dashboard**, build a search query:
   - Use keywords, filters, AND/OR/NOT operators
   - Set minimum score threshold
   - Filter by job type, location, salary range
2. Click the **Save Search** button (bookmark icon)
3. Give it a name (for example: "SWE Remote 120k+", "Design NYC Entry-level")
4. Click **Save**

### Using Saved Searches

Go to **Saved Searches** in the sidebar and click any search to:

- Load the filters immediately
- See when the search was last used
- View result count and average score

### Search History

JobSentinel automatically tracks the last 50 searches you've performed (without needing to save them):

1. Click the **History** icon above the search bar
2. Your recent searches appear in order
3. Click a search to reload it
4. Clear history anytime in **Settings > Privacy**

### Managing Searches

**View usage stats:** Each saved search shows last used date and frequency

**Update search:** Edit filters and click **Save Search** with the same name to overwrite

**Delete search:** Click the trash icon next to a saved search

---

## Notification Preferences

Fine-tune which jobs trigger alerts and how you receive them.

### Per-Source Filtering

Control notifications for each job board independently:

1. Go to **Settings > Notifications > Advanced Filtering**
2. For each source (LinkedIn, Indeed, Greenhouse, etc.):
   - **Enable/disable** - Turn alerts on or off
   - **Minimum score** - Only notify for jobs scoring at or above the threshold
   - **Include ghost jobs** - Show or hide flagged postings

### Keyword-Based Filtering

Create inclusion and exclusion rules:

1. **Include keywords** - Only notify if the posting contains ANY of these words
   - Example: "Python OR TypeScript OR Go"
2. **Exclude keywords** - Skip if the posting contains ANY of these words
   - Example: "PHP NOT required"
3. **Company list** - Only notify from specific companies
   - Add company names, one per line
   - Helpful for tracking target employers

### Notification Thresholds

Set score thresholds per notification channel:

| Channel      | Default Threshold | Recommendation              |
| ------------ | ----------------- | --------------------------- |
| **Desktop**  | 80%               | Adjust down for more alerts |
| **Email**    | 85%               | Keeps inbox clean           |
| **Slack**    | 90%               | Best for quality jobs       |
| **Discord**  | 90%               | Best for quality jobs       |
| **Telegram** | 85%               | Mobile-friendly             |
| **Teams**    | 85%               | Corporate-friendly          |

### Saving Preferences

All notification settings are saved automatically when you change them. No need to click "Save."

---

## Data Storage

### Local Storage (SQLite)

All user data is stored in a local SQLite database:

**Location:**

- **Windows:** `%APPDATA%\JobSentinel\data.db`
- **macOS:** `~/Library/Application Support/JobSentinel/data.db`
- **Linux:** `~/.local/share/jobsentinel/data.db`

**What's stored:**

- Cover letter templates
- Interview prep checklists and completion status
- Follow-up reminders
- Saved searches
- Notification preferences
- Search history (50 most recent)

The frontend may also keep local-only UI state in browser localStorage. Current
uses include theme preferences, onboarding completion, cached company research,
sanitized error logs, and temporary one-click-apply recovery hints. Those entries
are not cloud-synced, and error reports are sanitized before local persistence or
export. The Settings screen and crash screen both expose **Copy Safe Debug Report**
so non-technical users can paste a sanitized report directly into a GitHub issue.

### Migration from localStorage

If you used JobSentinel before version 1.4:

1. Your existing data (templates, searches) was stored in browser localStorage
2. On first launch of v1.4+, JobSentinel automatically detects localStorage data
3. Click **Migrate Data** to import everything into SQLite
4. After migration, localStorage is cleared

**Note:** This one-time import happens automatically. You don't need to do anything.

### Data Privacy

- **Zero telemetry** - JobSentinel does not collect analytics or telemetry
- **Local-first** - Your data stays on your computer
- **Explicit location lookup** - **Detect location** contacts FreeIPAPI over HTTPS only after you request it
- **Manual backup** - Close JobSentinel and copy the SQLite database file if
  you need a full user-data backup
- **Delete anytime** - Delete individual templates and saved searches, and
  clear search history without affecting the app

---

## Tauri Commands (API Reference)

These commands power the user data features. Frontend developers can use these to build additional UI.

<details>
<summary><strong>For developers</strong></summary>

### Cover Letter Templates

#### `list_cover_letter_templates()`

Get all cover letter templates.

```typescript
invoke("list_cover_letter_templates");
// Returns: CoverLetterTemplate[]
// {
//   id: string,
//   name: string,
//   content: string,
//   category: 'Default' | 'Formal' | 'Startup' | 'Contract',
//   created_at: string,
//   updated_at: string
// }
```

#### `get_cover_letter_template(id: string)`

Get a single template by ID.

```typescript
invoke("get_cover_letter_template", { id: "template-123" });
// Returns: CoverLetterTemplate | null
```

#### `create_cover_letter_template(name: string, content: string, category: string)`

Create a new template.

```typescript
invoke("create_cover_letter_template", {
  name: "Tech Startup",
  content: "Dear {hiring_manager}...",
  category: "Startup",
});
// Returns: CoverLetterTemplate (with generated id, timestamps)
```

#### `update_cover_letter_template(id, name, content, category)`

Update an existing template.

```typescript
invoke("update_cover_letter_template", {
  id: "template-123",
  name: "Updated Name",
  content: "Updated content...",
  category: "Formal",
});
// Returns: CoverLetterTemplate | null
```

#### `delete_cover_letter_template(id: string)`

Delete a template permanently.

```typescript
invoke("delete_cover_letter_template", { id: "template-123" });
// Returns: boolean (true = deleted, false = not found)
```

#### `seed_default_templates()`

Create starter templates when no templates exist.

```typescript
invoke("seed_default_templates");
// Returns: number (count created)
```

#### `import_cover_letter_templates(templates: CoverLetterTemplate[])`

Bulk import templates (used during migration).

```typescript
invoke("import_cover_letter_templates", {
  templates: [
    { name: "Template 1", content: "...", category: "Default" },
    { name: "Template 2", content: "...", category: "Formal" },
  ],
});
// Returns: number (count imported)
```

---

### Interview Prep Checklists

#### `get_interview_prep_checklist(interviewId: number)`

Get the prep checklist for an interview.

```typescript
invoke("get_interview_prep_checklist", { interviewId: 42 });
// Returns: PrepChecklistItem[]
// {
//   itemId: string,
//   completed: boolean
//   completedAt: string | null
// }
```

#### `save_interview_prep_item(interviewId: number, itemId: string, completed: boolean)`

Mark a checklist item as complete or incomplete.

```typescript
invoke("save_interview_prep_item", {
  interviewId: 42,
  itemId: "item-research-company",
  completed: true,
});
// Returns: void
```

---

### Follow-up Reminders

#### `get_interview_followup(interviewId: number)`

Get the follow-up reminder for an interview.

```typescript
invoke("get_interview_followup", { interviewId: 42 });
// Returns: FollowUpReminder | null
// {
//   interviewId: number,
//   thankYouSent: boolean,
//   sentAt: string | null
// }
```

#### `save_interview_followup(interviewId: number, thankYouSent: boolean)`

Update the follow-up reminder status.

```typescript
invoke("save_interview_followup", {
  interviewId: 42,
  thankYouSent: true,
});
// Returns: FollowUpReminder
```

---

### Saved Searches

#### `list_saved_searches()`

Get all saved searches.

```typescript
invoke("list_saved_searches");
// Returns: SavedSearch[]
// {
//   id: string,
//   name: string,
//   sortBy: string,
//   scoreFilter: string,
//   sourceFilter: string,
//   remoteFilter: string,
//   bookmarkFilter: string,
//   notesFilter: string,
//   postedDateFilter: string | null,
//   salaryMinFilter: number | null,
//   salaryMaxFilter: number | null,
//   ghostFilter: string | null,
//   textSearch: string | null,
//   createdAt: string,
//   lastUsedAt: string | null
// }
```

#### `create_saved_search(search: SavedSearch)`

Create a new saved search.

```typescript
invoke("create_saved_search", {
  search: {
    id: "",
    name: "SWE Remote 120k+",
    sortBy: "score-desc",
    scoreFilter: "all",
    sourceFilter: "all",
    remoteFilter: "remote",
    bookmarkFilter: "all",
    notesFilter: "all",
    postedDateFilter: "week",
    salaryMinFilter: 120000,
    salaryMaxFilter: null,
    ghostFilter: null,
    textSearch: "senior software engineer",
    createdAt: "",
    lastUsedAt: null,
  },
});
// Returns: SavedSearch (with generated id, timestamps)
```

#### `use_saved_search(id: string)`

Load a saved search (updates last_used_at).

```typescript
invoke("use_saved_search", { id: "search-123" });
// Returns: boolean (true = found, false = not found)
```

#### `delete_saved_search(id: string)`

Delete a saved search.

```typescript
invoke("delete_saved_search", { id: "search-123" });
// Returns: boolean (true = deleted, false = not found)
```

#### `import_saved_searches(searches: SavedSearch[])`

Bulk import searches (used during migration).

```typescript
invoke("import_saved_searches", {
  searches: [
    { name: "Search 1", query: "...", filters: {} },
    { name: "Search 2", query: "...", filters: {} },
  ],
});
// Returns: number (count imported)
```

---

### Notification Preferences

#### `get_notification_preferences()`

Get the user's notification settings.

```typescript
invoke("get_notification_preferences");
// Returns: NotificationPreferences
// {
//   linkedin: { enabled: true, minScoreThreshold: 70, soundEnabled: true },
//   indeed: { enabled: true, minScoreThreshold: 70, soundEnabled: true },
//   greenhouse: { enabled: true, minScoreThreshold: 80, soundEnabled: true },
//   lever: { enabled: true, minScoreThreshold: 80, soundEnabled: true },
//   jobswithgpt: { enabled: true, minScoreThreshold: 75, soundEnabled: true },
//   global: {
//     enabled: true,
//     quietHoursStart: "22:00",
//     quietHoursEnd: "08:00",
//     quietHoursEnabled: false
//   },
//   advancedFilters: {
//     includeKeywords: [],
//     excludeKeywords: [],
//     minSalary: null,
//     remoteOnly: false,
//     companyWhitelist: [],
//     companyBlacklist: []
//   }
// }
```

#### `save_notification_preferences(prefs: NotificationPreferences)`

Update notification preferences.

```typescript
invoke("save_notification_preferences", {
  prefs: {
    linkedin: { enabled: true, minScoreThreshold: 70, soundEnabled: true },
    indeed: { enabled: true, minScoreThreshold: 70, soundEnabled: true },
    greenhouse: { enabled: true, minScoreThreshold: 80, soundEnabled: true },
    lever: { enabled: true, minScoreThreshold: 80, soundEnabled: true },
    jobswithgpt: { enabled: true, minScoreThreshold: 75, soundEnabled: true },
    global: {
      enabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      quietHoursEnabled: false
    },
    advancedFilters: {
      includeKeywords: ["Python", "TypeScript"],
      excludeKeywords: ["PHP"],
      minSalary: 120,
      remoteOnly: true,
      companyWhitelist: ["Google", "Meta"],
      companyBlacklist: []
    }
  }
});
// Returns: void
```

---

### Search History

#### `add_search_history(query: string)`

Add a search to history.

```typescript
invoke("add_search_history", { query: "senior rust engineer remote" });
// Returns: void
```

#### `get_search_history(limit: i64)`

Get recent search history (default: 50).

```typescript
invoke("get_search_history", { limit: 20 });
// Returns: string[]
// ["latest search", "previous search", "older search"]
```

#### `clear_search_history()`

Clear all search history permanently.

```typescript
invoke("clear_search_history");
// Returns: void
```

---

### Database Schema

```sql
-- Cover Letter Templates
CREATE TABLE cover_letter_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Interview Prep Checklists
CREATE TABLE interview_prep_items (
  interview_id INTEGER PRIMARY KEY,
  item_id TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Follow-up Reminders
CREATE TABLE interview_followups (
  interview_id INTEGER PRIMARY KEY,
  thank_you_sent BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Saved Searches
CREATE TABLE saved_searches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  filters TEXT NOT NULL,  -- JSON
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Search History
CREATE TABLE search_history (
  query TEXT NOT NULL,
  searched_at TEXT NOT NULL,
  PRIMARY KEY (query, searched_at)
);

-- Notification Preferences
CREATE TABLE notification_preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL  -- JSON
);
```

</details>

---

## Troubleshooting

### My templates didn't migrate from localStorage

1. Check that you're using v1.4 or later (go to **Settings > About**)
2. Reload the app completely (not just refresh)
3. Look for a "Migrate Data" prompt on first launch
4. If no prompt appears, go to **Settings > Data > Migrate from Browser** manually

### I can't find a saved search

1. Check **Saved Searches** page to see all bookmarks
2. Use search history (**History** button) to find recent searches
3. Saved searches are sorted by last used date
4. Note: Search history is separate from saved searches and only stores the last 50

### Notifications aren't firing for certain keywords

1. Check your notification preferences in **Settings > Notifications > Advanced Filtering**
2. Verify the keyword rule is active (not disabled)
3. Check the minimum score threshold isn't too high
4. Ensure the job source is enabled
5. Try a test search to see if any jobs match

### I accidentally deleted a template

Templates deleted in v1.4+ cannot be recovered (they're removed from SQLite immediately).
Close JobSentinel and copy the SQLite database file before deleting important
templates if you need a manual backup.

---

## Open Gaps

The current user-data commands do not provide a full JSON export/import or
automatic backup flow. Current import commands are migration helpers for cover
letter templates and saved searches.

- Bulk template management
- Smarter variable substitution
