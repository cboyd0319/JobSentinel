# JobSentinel Glossary

This glossary defines terms used in JobSentinel. When writing documentation, always use the
plain-language version for user-facing content.

## How to use this glossary

1. **In user documentation:** Use the "Write this" version
2. **In developer documentation:** Technical terms are acceptable
3. **When introducing a term:** Define it on first use, then use consistently

---

## Job search terms

### ATS (Application Tracking System)

**What it is:** Software that companies use to collect and manage job applications.

**Write this:** "the system companies use to manage applications"

**Example:** "Many companies use systems to manage applications. JobSentinel helps your resume work well with these systems."

### Ghost job

**What it is:** A job posting that isn't real. The company might have already filled the position,
isn't actually hiring, or posted it just to collect resumes.

**Write this:** "fake or outdated job posting"

**Example:** "JobSentinel flags fake or outdated job postings so you don't waste time applying."

### Ghosted / Ghosting

**What it is:** When a company stops responding to you after an interview or application, with no explanation.

**Write this:** "stopped responding" or "went silent"

**Example:** "Track which companies have gone silent so you can follow up or move on."

---

## JobSentinel features

### Scraper

**What it is:** The part of JobSentinel that automatically visits job boards and finds new postings.

**Write this:** "job finder" or "automatic job search"

**Example:** "JobSentinel's job finder checks multiple job boards for you."

### Webhook

**What it is:** A way for JobSentinel to send alerts to other apps (like Slack or Discord).

**Write this:** "notification connection" or "alert link"

**Example:** "Connect JobSentinel to Slack to get alerts in your team chat."

### Job score

**What it is:** A number (0-100) that shows how well a job matches your preferences.

**Write this:** "match score" or just "score"

**Example:** "Jobs with a higher score match your preferences better."

---

## Technical terms (avoid in user docs)

### API

**What it is:** A way for software programs to talk to each other.

**Write this:** "connection" or just describe what it does

**Don't write:** "JobSentinel uses the LinkedIn API"

**Write instead:** "JobSentinel connects to LinkedIn to find jobs"

### Database

**What it is:** Where JobSentinel stores your saved jobs and settings.

**Write this:** "your saved information" or "your data"

**Example:** "All your data stays on your computer."

### JSON

**What it is:** A format for storing data that computers can read easily.

**Write this:** Just describe what the user sees or does

**Don't write:** "Export your data as JSON"

**Write instead:** "Export your data to use in other apps"

### SQLite

**What it is:** The database software JobSentinel uses to store your data locally.

**Write this:** "local storage" or don't mention it at all

**Example:** "Your data is stored securely on your own computer."

---

## UI terms

### Modal

**What it is:** A popup window that appears over the main screen.

**Write this:** "popup" or "dialog"

**Example:** "A popup will ask you to confirm."

### Sidebar

**What it is:** The panel on the left side of the screen with navigation options.

**Write this:** "menu" or "left panel"

**Example:** "Click **Jobs** in the menu on the left."

### Dropdown

**What it is:** A menu that appears when you click a button or field.

**Write this:** "menu" or describe the action

**Example:** "Click the menu and select your preferred option."

---

## Status terms

### Pending

**Write this:** "waiting"

### Failed

**Write this:** "didn't work" or describe what happened

### Queued

**Write this:** "waiting in line" or "coming up next"

### Syncing

**Write this:** "updating" or "saving"

---

## Adding new terms

When you encounter a technical term that needs a plain-language alternative:

1. Add it to this glossary
2. Update `.vale/styles/JobSentinel/Glossary.yml` with the Vale rule
3. Use the plain-language version in your documentation

## Questions?

If you're unsure whether a term needs to be simplified, ask yourself: "Would my non-technical
friend understand this?" If not, find a simpler way to say it.
