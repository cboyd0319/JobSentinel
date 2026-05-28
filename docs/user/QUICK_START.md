# Getting Started with JobSentinel

**Your job search, supercharged.**

Welcome! This guide will get you up and running in about 5 minutes.

---

## Before We Start

You'll need to install JobSentinel on your computer. Here's the quick version:

**Option A: Download the Installer** (Recommended)

1. Go to [GitHub Releases](https://github.com/cboyd0319/JobSentinel/releases)
2. Download the installer for your platform:
   - **Windows:** the `.msi` file
   - **macOS:** the `.dmg` file
   - **Linux:** the `.AppImage` or `.deb` file when present on the release
3. Double-click and follow the prompts
4. Done!

<details>
<summary><strong>First time on Mac? (Gatekeeper warning)</strong></summary>
<br>

macOS may show "JobSentinel can't be opened because Apple cannot check it for malicious software."

**To fix this:**

1. Go to **System Settings > Privacy & Security**
2. Scroll down and click **"Open Anyway"** next to the JobSentinel message
3. Click **Open** in the confirmation dialog

This only happens once. JobSentinel is safe — it's open source and you can verify the code yourself.

</details>

<details>
<summary><strong>Windows showing a blue warning?</strong></summary>
<br>

Windows SmartScreen may show "Windows protected your PC" because JobSentinel is new.

**To continue:**

1. Click **"More info"**
2. Click **"Run anyway"**

This is normal for new apps. JobSentinel is safe — it's open source and you can verify the code yourself.

</details>

**Option B: Build from Source**

If you're comfortable with command-line basics:

```bash
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel
npm install
npm run tauri:build
```

Need more detail? See [Developer Setup](../developer/GETTING_STARTED.md).

---

## Step 1: Open JobSentinel

After installation:

- **Windows:** JobSentinel appears in your system tray (bottom-right corner)
- **macOS:** JobSentinel appears in your menu bar (top of screen)

Left-click the icon to open the dashboard. That's your command center.

---

## Step 2: Complete the setup wizard

The first time you open JobSentinel, a friendly wizard walks you through a few simple questions.

### Question 1: What kind of work are you looking for?

Pick a career path or choose **My Own Search**.

### Question 2: What job titles do you want?

Type in job titles that match what you want. Examples:

- "Marketing Manager"
- "Registered Nurse"
- "Customer Success Manager"
- "Project Manager"
- "Bookkeeper"

**Tip:** You can add multiple titles. The more specific you are, the better your matches.

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

### Question 5: Where do you want to work?

Pick any combination:

- **Remote** - Work from anywhere
- **Hybrid** - Mix of office and home
- **On-site** - Full-time in the office

### Question 6: What's your minimum salary?

Enter a number (in USD). JobSentinel will filter out jobs that pay less.

Not sure? Start with $0 to see everything, then raise it later.

### Question 7: Want instant alerts? (Optional)

Connect Slack, Discord, or Teams to get notified when great jobs appear.

Some apps ask you to create a connection link so JobSentinel can send messages
there. Skip this for now and add it later in Settings if you want.

### Review your search

Before scanning starts, JobSentinel shows the answers it will use to rank jobs:

- Jobs to look for
- Work to show more often
- Work to rank lower
- Location
- Pay

Change anything that looks wrong, then start finding jobs.

---

## Step 3: Let It Work

**That's it!** JobSentinel is now watching 13 job boards for you.

Here's what happens automatically:

- Every 2 hours, JobSentinel checks for new jobs
- Each job gets scored based on YOUR preferences
- High-scoring jobs (90%+) trigger instant notifications (if you set them up)
- Stale, reposted, or low-trust postings are flagged with warnings

### Your Dashboard

![Dashboard](../images/dashboard.png)

The dashboard shows:

- **Job List** - Every job found, sorted by match score
- **Posting Risk Filter** - Hide postings that need review first
- **Search Bar** - Find jobs by keyword, company, or location
- **Statistics** - See how many jobs match your criteria

---

## Quick Actions

### Manual Search

Don't want to wait 2 hours? Right-click the tray/menu bar icon and select
**"Search Now"** to scan all job boards immediately.

### Bookmark Jobs

Found something interesting? Click the bookmark icon (or press `b`) to save it.

### Add Notes

Click the notes icon (or press `n`) on any job to add your own comments.

### Company Research

Click on any company name (or press `c`) to see info like tech stack, company size,
and Glassdoor ratings.

---

## Keyboard Shortcuts

For power users who hate using the mouse:

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

## Features You'll Love

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
3. Pick from 5 ATS-friendly templates (designed to pass company resume-filtering software)
4. Export to Word (.docx)

### ATS Optimizer

ATS stands for "Applicant Tracking System" — it's software that companies use to filter
resumes before a human ever sees them. The optimizer helps you see how your resume scores
against a specific job so you can improve it:

1. Click **Resume Optimizer** in the sidebar
2. Paste the job description
3. Enter your resume info
4. Get instant feedback on what keywords you're missing

### One-Click Apply

Fill out application forms in seconds:

1. Click **Quick Apply** on any job
2. JobSentinel opens the browser and fills in your info
3. You review everything and click Submit yourself

**Important:** JobSentinel never submits applications without you.
See [One-Click Apply Guide](../features/one-click-apply.md) for setup.

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

1. Go to [Slack's Incoming Webhooks page](https://api.slack.com/messaging/webhooks)
2. Create a new connection link for your workspace
3. Copy the connection link
4. Paste it in JobSentinel Settings > Notifications > Slack

### Discord

1. Right-click your Discord channel > Edit Channel > Integrations
2. Create a Webhook
3. Copy the connection link
4. Paste it in JobSentinel Settings > Notifications > Discord

### Microsoft Teams

1. In your Teams channel, click More options > Connectors
2. Add "Incoming Webhook"
3. Copy the connection link
4. Paste it in JobSentinel Settings > Notifications > Teams

---

## Where's My Data?

Everything stays on your computer. No cloud, no accounts, no tracking.

**Saved jobs and settings:** Your local JobSentinel file

- Windows: `%LOCALAPPDATA%\JobSentinel\jobs.db`
- macOS: `~/Library/Application Support/JobSentinel/jobs.db`

**Saved passwords and notification details:** Stored in your operating system's secure vault

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
2. Click **Copy Safe Debug Report**.
3. [Open an issue on GitHub](https://github.com/cboyd0319/JobSentinel/issues).
4. Paste the copied report into the safe app details box.

Also include:

- What you were trying to do
- What happened instead
- Your OS version (Windows 11, macOS, etc.)

---

## Next Steps

Now that you're set up:

- **Star the repo** on [GitHub](https://github.com/cboyd0319/JobSentinel)
- **Learn more** about [Ghost Detection](../features/ghost-detection.md)
- **Build your resume** with the [Resume Builder](../features/resume-builder.md)
- **Speed up applications** with [One-Click Apply](../features/one-click-apply.md)

---

**Good luck with your search.**

*JobSentinel - Your data stays yours. Always.*
