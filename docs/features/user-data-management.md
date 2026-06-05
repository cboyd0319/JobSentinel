# Local Job-Search Data

**Keep job-search history, saved searches, templates, reminders, and safe
support reports under user control.**

JobSentinel treats job-search data as sensitive. Notes, templates, searches,
interview prep, notification choices, salary context, and problem reports can
reveal employment status, urgency, career goals, location constraints, and
private circumstances. Core data workflows stay local by default.

## Privacy Labels

| Workflow | Label | Default behavior |
| --- | --- | --- |
| Cover letter templates | Local only, Sensitive | Saved locally and never submitted automatically. |
| Interview prep and follow-ups | Local only, Sensitive | Checklist state and reminders stay local. |
| Saved searches | Local only, Sensitive | Search names, words, filters, and history stay local. |
| Notification preferences | Local only, Sensitive | Preferences stay local; external channels are used only if the user turns them on. |
| Safe support reports | Local only, Sensitive | Reports are sanitized before copy or save. |
| Location detection | Sensitive | Public-IP lookup happens only after explicit user action. |

External AI is not required for user-data management. If an outside-AI send is
blocked because the details are not on JobSentinel's reviewed sharing list, the
user-facing error should describe reviewed details, not payloads, fields, or
classification internals.

## What Stays Local

- Cover letter templates and generated drafts.
- Interview prep checklists and follow-up reminders.
- Saved searches, search history, and notification preferences.
- Problem history and sanitized safe support reports.
- Local-only UI state such as theme, onboarding completion, temporary recovery
  hints, and sanitized app-error records.

External notifications such as Slack, Discord, Teams, email, or other channels
are optional. They are used only after the user configures them.

## Everyday Workflows

### Cover Letter Templates

Templates help users avoid starting from a blank page. JobSentinel can fill
known placeholders such as company name, job title, hiring contact, department,
location, and listed pay range.

The user always reviews the result. JobSentinel does not submit the letter.

### Interview Prep

Interview prep keeps logistics, company notes, role-specific questions,
follow-up reminders, and thank-you status near the application. Checklists are
for preparation, not performance scoring.

### Saved Searches

Saved searches store repeatable searches such as:

- "Office manager remote"
- "Clinic scheduler part-time"
- "Warehouse supervisor Denver"
- "Design assistant entry-level"

Saved searches should make return visits easier for non-technical users. The UI
should not require users to understand query syntax, filters, or scoring math.
First-run starting paths include office and administration, retail and
hospitality, trades and field service, healthcare, education, customer support,
sales, finance, operations, creative, legal, data, security, and software work.
When a starting path is selected, setup previews sample job titles and search
words as editable suggestions before the search is saved.
Software, security, and data paths can suggest tech-heavy job sources, but
first-run setup keeps them off until the user checks those sources in review.
Non-technical searches can suggest SimplyHired as a broad public source. It
also stays off until the user checks it, and setup fills only the reviewed
search words into the source config after that opt-in.

### Notification Preferences

Notification settings control which saved searches and job sources can create
alerts. Plain labels should describe alert destinations and fit level
instead of service internals.
First-run desktop alerts start off and are saved only after the user turns them
on. External alert channels stay optional and are configured later in Settings.
First-run profile suggestions do not set a salary floor or narrow work-location
modes without user choice. Location starts broad across remote, hybrid, and
on-site, and pay stays unset unless the user enters a floor. First-run pay can
be entered as yearly or hourly; hourly pay is converted to an annual floor for
local pay comparisons while the review keeps the hourly meaning visible.

### Safe Support Reports

When something breaks, users can choose **Copy Safe Support Report** or **Save
Safe Support Report** from Settings, App Problem History, crash recovery, or
page error recovery. Reports are local by default and should avoid full private
details.

Safe support reports can include high-level app state, feature names, timestamps,
sanitized error categories, and redacted settings summaries. They should not
include full notes, resumes, full search text, salary floors, secrets, private
paths, cookies, connection links, tokens, raw field names such as `url`, or
full application history.

App Problem History hides crash details from the visible list. If JobSentinel
help asks for more detail, users can copy or save a safe support report and
review it before sharing.

## Older Local Data

Users who had older browser-saved templates or searches may see a migration
prompt. The migration moves supported local data into the current local store.
If no prompt appears, make a safe support report first, then close and reopen
JobSentinel and check Settings.

## Backups And Deletion

- Delete templates and saved searches carefully; deleted items may not be
  recoverable inside the app yet.
- Use safe support reports before changing more data if something looks wrong.
- A fuller backup and restore workflow remains a planned product need.

## When Something Does Not Work

| Problem | Plain next step |
| --- | --- |
| Older templates did not appear | Make a safe support report first, then close and reopen JobSentinel and check Settings for a migration prompt. |
| A saved search is missing | Open Saved Searches, then check recent search history. |
| Alerts feel too noisy | Raise alert selectivity or narrow the saved search. |
| Alerts miss expected jobs | Lower alert selectivity or check whether the source is enabled. |
| A template was deleted | Stop editing, make a safe support report, and check whether another copy exists. |
