# Getting Started with JobSentinel

**A private, local-first job-search assistant.**

This guide helps you install JobSentinel, create a first saved search, and know
where to get help if something does not work.

---

## Before We Start

You'll need to install JobSentinel on your computer. Here's the quick version:

**Is JobSentinel free?**

Yes. JobSentinel is free, will always stay free, and will always remain MIT
licensed. You do not need a paid account to use the core app.

**Download the installer** (recommended)

1. Go to [GitHub Releases](https://github.com/cboyd0319/JobSentinel/releases)
2. Download the installer for your platform:
   - **Windows:** the `.msi` file
   - **macOS:** the `.dmg` file
   - **Linux:** the `.AppImage` or `.deb` file when present on the release
3. Double-click and follow the prompts
4. Open JobSentinel.

<details>
<summary><strong>First time on Mac? (Gatekeeper warning)</strong></summary>
<br>

macOS may show "JobSentinel can't be opened because Apple cannot check it for
malicious software."

**To fix this:**

1. Go to **System Settings > Privacy & Security**
2. Scroll down and click **"Open Anyway"** next to the JobSentinel message
3. Click **Open** in the confirmation dialog

This can happen because JobSentinel is a new open-source app. You only need to
approve it once.

</details>

<details>
<summary><strong>Windows showing a blue warning?</strong></summary>
<br>

Windows SmartScreen may show "Windows protected your PC" because JobSentinel is new.

**To continue:**

1. Click **"More info"**
2. Click **"Run anyway"**

This can happen because JobSentinel is a new open-source app.

</details>

<details>
<summary><strong>For developers: build from source</strong></summary>
<br>

Most users should download the installer. Developers can build locally:

```bash
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel
npm install
npm run tauri:build
```

Need more detail? See [Developer Setup](../developer/GETTING_STARTED.md).

</details>

---

## Step 1: Open JobSentinel

After installation:

- **Windows:** JobSentinel appears in your system tray (bottom-right corner)
- **macOS:** JobSentinel appears in your menu bar (top of screen)

Left-click the icon to open the dashboard.

---

## Step 2: Complete the setup wizard

The first time you open JobSentinel, setup asks a few plain questions.

### Question 1: What kind of work are you looking for?

Pick a career path or choose **My Own Search**.

### Question 2: What job titles do you want?

Type in job titles that match what you want. Examples:

- "Marketing Manager"
- "Registered Nurse"
- "Customer Success Manager"
- "Project Manager"
- "Bookkeeper"

**Tip:** You can add multiple titles. Specific titles help JobSentinel find
more relevant roles.

### Question 3: What work do you want more of?

Add skills, tools, duties, or strengths you want JobSentinel to notice.
Examples:

- "Customer support"
- "Scheduling"
- "Budgeting"
- "Patient care"
- "Project management"

### Question 4: What work should JobSentinel avoid? (Optional)

Add words or phrases that should rank jobs lower. Examples:

- "Night shift"
- "Heavy travel"
- "Commission only"
- "Seasonal"

Skip this if nothing comes to mind.

### Question 5: What pay would make a job worth considering? (Optional)

Add a minimum yearly pay amount if you know it. Leave it blank if you are not
sure yet. Jobs without listed pay stay visible and marked, and jobs below your
floor are warned about instead of silently hidden.

### Question 6: Where do you want to work?

Pick any combination:

- **Remote** - Work from anywhere
- **Hybrid** - Mix of office and home
- **On-site** - Full-time in the office

### Question 7: Should fresh and verified jobs show first?

Pick how JobSentinel should handle older or hard-to-verify postings:

- **Fresh and verified first** - Warn earlier when a posting looks old,
  reposted, or hard to verify
- **Balanced** - Use normal posting-risk warnings while keeping the list broad
- **Widest search** - Show more older postings and warn only when risk looks
  clearer

### Question 8: Want instant alerts? (Optional)

Connect Slack, Discord, or Teams to get notified when strong matches are found.

Some apps ask you to create a connection link so JobSentinel can send messages
there. Skip this for now and add it later in Settings if you want.

### Review your search

Before scanning starts, JobSentinel shows the answers it will use to rank jobs:

- Jobs to look for
- Work to show more often
- Work to rank lower
- Location
- Freshness
- Pay

Change anything that looks wrong, then start finding jobs.

---

## Step 3: Review matches

JobSentinel is now watching the allowed sources you enabled.

Here's what happens automatically:

- Every 2 hours, JobSentinel checks for new jobs.
- Each job is compared with your saved search.
- Strong matches can trigger notifications if you set them up.
- Stale, reposted, or low-trust postings are flagged with warnings.

### Your Dashboard

![Dashboard](../images/dashboard.png)

The dashboard shows:

- **Job List** - Every job found, sorted by match strength
- **Posting Risk Filter** - Hide postings that need review first
- **Search Bar** - Find jobs by keyword, company, or location
- **Statistics** - See how many jobs match your criteria

---

## Quick actions

### Manual Search

Don't want to wait 2 hours? Right-click the tray/menu bar icon and select
**"Search Now"** to scan allowed sources immediately.

### Bookmark Jobs

Found something interesting? Click the bookmark icon (or press `b`) to save it.

### Add Notes

Click the notes icon (or press `n`) on any job to add your own comments.

### Company Research

Click on any company name (or press `c`) to see info like tools, systems,
company size, and Glassdoor ratings.

---

## Optional keyboard shortcuts

You can use JobSentinel with the mouse. Keyboard shortcuts are optional.

Use `Cmd` on macOS and `Ctrl` on Windows or Linux.

| Key | What It Does                  |
| --- | ----------------------------- |
| `Cmd/Ctrl + K` | Open the command palette |
| `Cmd/Ctrl + 1-8` | Switch pages |
| `Cmd/Ctrl + ,` | Open settings |
| `Cmd/Ctrl + Z` | Undo the last action |
| `Cmd/Ctrl + Shift + Z` | Redo the last action |
| `/` | Jump to the search bar |
| `r` | Refresh the current view |
| `b` | Bookmark the selected job |
| `n` | Add notes to the selected job |
| `c` | View company details |
| `?` | Show all keyboard shortcuts |

Press `?` anytime to see the full list.

---

## Useful features

### Ghost Job Detection

JobSentinel flags stale, reposted, or low-trust postings so you can protect
tailoring time:

- **Yellow** - Minor concerns (might be old)
- **Orange** - Multiple warning signs
- **Red** - Verify before tailoring

Use the posting-risk dropdown to hide these from your list or review them
separately.

### Resume Builder

Create professional resumes right inside JobSentinel:

1. Click **Resume Builder** in the sidebar
2. Follow the 7-step wizard
3. Pick from 5 clean templates designed for readable applications
4. Export to Word (.docx)

### Resume Optimizer

Resume Optimizer compares your resume with a job post and shows which evidence is
clear, missing, or worth rewriting. It does not promise hiring outcomes or trick
screening software:

1. Click **Resume Optimizer** in the sidebar
2. Paste the job description
3. Enter your resume info
4. Get feedback on job-post evidence, readability, and truthful edits

### Application Assist

Prepare repeated application details while keeping each submission under your control:

1. Click **Prepare Form** on a job worth reviewing
2. JobSentinel opens the browser and prepares matching details
3. You review everything and click Submit yourself only if the role still fits

**Important:** JobSentinel never submits applications without you.
See [Application Assist Guide](../features/one-click-apply.md) for setup.

---

## Changing Your Preferences

Want to adjust your job titles, salary, or location preferences?

1. Click the **Settings** icon in the sidebar
2. Update any field
3. Click **Save**

Your changes take effect immediately.

---

## Getting Notifications

### Slack

1. Go to [Slack's connection-link page](https://api.slack.com/messaging/webhooks).
2. Create a new connection link for your workspace.
3. Copy the connection link.
4. Paste it in JobSentinel Settings > Notifications > Slack.

### Discord

1. Right-click your Discord channel > Edit Channel > Integrations
2. Create a channel connection.
3. Copy the connection link.
4. Paste it in JobSentinel Settings > Notifications > Discord.

### Microsoft Teams

1. In your Teams channel, click More options > Connectors
2. Add a channel connection.
3. Copy the connection link.
4. Paste it in JobSentinel Settings > Notifications > Teams.

---

## Where's My Data?

Everything stays on your computer. No cloud, no accounts, no tracking.

**Saved jobs and settings:** your local JobSentinel file. You do not need to
open this file unless support asks for it.

- Windows: `%LOCALAPPDATA%\JobSentinel\jobs.db`
- macOS: `~/Library/Application Support/JobSentinel/jobs.db`

**Saved passwords and notification details:** stored in your operating system's
secure vault.

- Windows: Credential Manager
- macOS: Keychain
- Linux: Secret Service

---

## Troubleshooting

### No jobs showing up?

1. Make sure your job titles aren't too specific
2. Try enabling more location options (Remote + Hybrid + Onsite)
3. Lower your minimum salary to $0 temporarily
4. Right-click the tray icon > "Search Now" to force a refresh

### Notifications not working?

1. Double-check your notification connection link in Settings
2. Make sure the notification channel is enabled
3. Test it by clicking "Send Test" in Settings

### Something else wrong?

1. Open Settings in JobSentinel.
2. Click **Save Safe Debug Report** to create an attachment, or click
   **Copy Safe Debug Report** if you prefer to paste it.
3. Open **Send Feedback** or
   [open an issue on GitHub](https://github.com/cboyd0319/JobSentinel/issues).
4. Attach or paste the safe report. It is already sanitized before sharing.

Also include:

- What you were trying to do
- What happened instead
- Your OS version (Windows 11, macOS, etc.)

---

## Next Steps

Next useful steps:

- **Learn more** about [Ghost Detection](../features/ghost-detection.md)
- **Build your resume** with the [Resume Builder](../features/resume-builder.md)
- **Review applications faster** with [Application Assist](../features/one-click-apply.md)

---

**JobSentinel keeps practical job-search support local and under your control.**

*JobSentinel - Your data stays yours. Always.*
