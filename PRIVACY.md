# JobSentinel Privacy

Job-search data is sensitive. JobSentinel is designed local-first so users keep
control over job history, applications, salary floors, resumes, notes, and
search constraints.

## What stays local

By default, these stay on the user's computer:

- Search settings, saved searches, filters, excluded words, and preferences.
- Saved jobs, hidden jobs, bookmarks, notes, and application records.
- Interview reminders, follow-up notes, and weekly progress data.
- Resume versions, resume parsing results, match explanations, and application
  drafts.
- Salary floors, salary preferences, offer notes, and negotiation notes.
- Local problem history and sanitized debug reports before the user chooses to
  share them.

JobSentinel stores app data in local SQLite storage. Secrets are stored in the
operating system credential store where supported:

- Windows Credential Manager.
- macOS Keychain.
- Linux Secret Service, such as GNOME Keyring or KWallet.

## What may leave the device

JobSentinel sends data outside the device only when a feature needs a network
request or the user configures an external channel.

Possible network activity:

- Job-source checks to enabled sources and official public job feeds.
- User-requested location detection through FreeIPAPI.
- External alerts through configured Slack, Discord, Teams, Telegram, or email
  channels.
- Feedback or issue-report sharing through configured GitHub or Google Drive
  paths.
- Source-specific sign-in or session validation when the user enables a source
  that requires their own session.

These requests may reveal normal network metadata to the destination service,
such as IP address, request time, and destination host. External channels may
receive the job or alert details the user chooses to send.

## What JobSentinel does not collect

JobSentinel does not run a hosted tracking service for the app.

It does not collect:

- Product telemetry.
- Behavioral analytics.
- Centralized job-search history.
- Centralized resume copies.
- Centralized salary floors or offer history.
- Background contact uploads.

## User controls

Users control:

- Which job sources are enabled.
- Which external notification channels are configured.
- Whether location detection runs.
- Whether feedback or debug reports are shared.
- Which saved jobs, notes, resumes, and application records are kept.
- Whether optional credentials are added or removed.

## Debug reports

JobSentinel includes one-click sanitized debug reports so users can attach useful
context to a GitHub issue without exposing private data.

Debug reports should redact:

- Names, emails, phone numbers, and tokens.
- Webhook URLs and credentials.
- Local file paths.
- Raw resume text and application content.
- Raw job-search queries where they are not needed for diagnosis.

## Design rule

New features must describe their data flow before they ship: what stays local,
what may be sent out, why it is needed, and what the user can turn off.
