# JobSentinel Privacy

JobSentinel is local-first. Default assumption: job-search data is sensitive and
should remain under user control.

Rule 0: user privacy and security are non-negotiable. No feature,
integration, shortcut, test fixture, external AI provider, support workflow, or
research workflow may set aside user privacy, local control, credential safety,
source boundaries, or explicit review gates. If privacy or security conflicts
with convenience, automation, velocity, analytics, or research value, privacy
and security win.

Job-search data can reveal employment status, salary expectations, salary
floors, resume history, location preferences, application activity, career
goals, job-search urgency, personal circumstances, private notes, and sensitive
identity or contextual information. Core JobSentinel workflows work locally
without a cloud account or external AI provider.

## What stays local

By default, these stay on the user's computer:

- Search settings, saved searches, filters, excluded words, and preferences.
- Saved jobs, hidden jobs, bookmarks, notes, and application records.
- Interview reminders, follow-up notes, and weekly progress data.
- Resume versions, resume parsing results, match explanations, and application
  drafts.
- Resume file copies selected through native file pickers for Resume Match and
  Application Assist. The app shows only a saved-file reference, command
  result, or display name where needed, not original file paths.
- Salary floors, salary preferences, offer notes, and negotiation notes.
- Local problem history and safe support reports before the user chooses to
  share them.

JobSentinel stores app data on the user's computer. On macOS and Linux,
app-owned data and settings directories are kept private to the current account,
and local database files are kept owner-only. Saved secrets are stored in the
operating system credential store where supported:

- Windows Credential Manager.
- macOS Keychain.
- Linux Secret Service, such as GNOME Keyring or KWallet.

## What may leave the device

JobSentinel sends data outside the device only when a feature needs a network
request or the user turns on an external channel.

Possible network activity:

- Job-source checks to enabled sources and official public job feeds.
- Optional user-approved job-source feeds, such as the JobsWithGPT job-source
  feed, may receive the saved job titles, location, remote preference, and
  result limit needed for that source check. These feeds are not external AI
  requests. They are off unless turned on and the exact details have been
  reviewed and approved locally.
  JobSentinel records the latest approved contact locally as safe status details:
  contact time, website contacted, count-only request categories, and outcome.
  It does not store full titles, full location text, resumes, salary floors,
  private notes, application history, or full source links in that contact
  history.
- User-requested location detection through FreeIPAPI.
- External alerts through Slack, Discord, Teams, Telegram, or email channels the
  user turns on.
  Alert details may include public job details and fit level, but local fit
  reasons, salary-floor details, private notes, and application history stay in
  JobSentinel.
- Feedback or issue-report sharing through GitHub or Google Drive only when the
  user chooses to open those support links.
- Source-specific sign-in or session validation when the user enables a source
  that requires their own session.
- Optional external AI requests only after the user enables a provider, reviews
  the exact details, and approves sending them.

These requests may reveal normal network metadata to the destination service,
such as IP address, request time, and destination host. External channels may
receive the job or alert details the user chooses to send.

Application Assist does not upload saved resume files automatically. If an
application site requires a resume, the user attaches it through that site's own
file picker after reviewing the page.

## External AI

External AI is optional and disabled by default. JobSentinel may support
providers such as OpenAI, but external AI is an assistive layer, not the
foundation of the product.

All external AI calls must use the AI gateway described in
[docs/architecture/privacy-first-ai-gateway.md](docs/architecture/privacy-first-ai-gateway.md).
That gateway must enforce:

- Explicit user opt-in before any external AI request.
- Send only fields needed for the selected feature.
- Show the exact request details before sending.
- Redaction, edit, and cancel paths where UI exists.
- Local request logging of feature, provider, timestamp, and high-level data
  categories sent.
- No full database uploads.
- No private notes or unrelated application history unless explicitly selected.
- No resume text or salary floor sharing unless explicitly selected.
- Local-only fallback or a clear external-AI-required label for features that
  cannot run locally.

The same minimization rule applies inside the app. Non-settings screens request
only narrow profile existence or preview details instead of the full application
profile. Dashboard uses a small settings summary instead of full settings. Job
import removes embedded credentials, fragments, tracking parameters, and
sensitive query parameters before preview, hashing, storage, or returning a
result; the import command returns only the saved job id.

Provider access details and saved secrets must not be hardcoded. If a user adds
a provider access key, it should live in the operating system credential store
where supported.
Logs must record only safe request details, never full prompts, resumes, notes,
salary floors, secrets, or full responses.

## What JobSentinel does not collect

JobSentinel does not run a hosted tracking service for the app.

It does not collect:

- Product telemetry.
- Behavioral analytics.
- Centralized job-search history.
- Centralized resume copies.
- Centralized salary floors or offer history.
- Background contact uploads.
- Model training on user data by JobSentinel.

JobSentinel does not train models on user data. External providers may have
their own terms, retention settings, and privacy controls; users should review
provider terms before enabling optional external AI.

## User controls

Users control:

- Which job sources are enabled.
- Which external notification channels are turned on.
- Whether location detection runs.
- Whether feedback or safe support reports are shared.
- Which saved jobs, notes, resumes, and application records are kept.
- Whether optional secrets or access details are added or removed.

## Safe support reports

JobSentinel includes safe support reports with limited app details. They redact
known sensitive values before users review and share them.

Safe support reports should redact known sensitive values:

- Names in known person-name fields or common name statements, emails, phone
  numbers, and tokens.
- Connection links and secrets.
- Local file paths.
- Full resume text and application content.
- Full job-search queries where they are not needed for diagnosis.

## Design rule

New features must describe their data flow before they ship: what stays local,
what may be sent out, why it is needed, and what the user can turn off. Any
feature that cannot satisfy Rule 0 must be redesigned, disabled, or removed.

## Research And Evaluation

Research and grant evaluation use public postings and synthetic candidate data
by default.

Allowed by default:

- Public official job postings.
- Public hiring-platform postings.
- Synthetic resumes.
- Synthetic salary floors.
- Synthetic candidate profiles.
- Synthetic suspicious, scam, or adversarial postings.
- Aggregate evaluation metrics.

Disallowed unless explicit informed consent exists:

- Real user resumes.
- Real application history.
- Private notes.
- Salary floors tied to a real person.
- Demographic-linked outcomes.
- Contact lists.
- Recruiter communications.
- Any PII-heavy dataset.
