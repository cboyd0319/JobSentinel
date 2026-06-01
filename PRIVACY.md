# JobSentinel Privacy

JobSentinel is local-first. Default assumption: job-search data is sensitive and
should remain under user control.

Rule 0: user privacy and security are non-negotiable. No feature,
integration, shortcut, test fixture, external AI provider, support workflow, or
research workflow may bypass user privacy, local control, credential safety,
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
- Optional external AI requests only after the user enables a provider, reviews
  the exact payload, and approves sending it.

These requests may reveal normal network metadata to the destination service,
such as IP address, request time, and destination host. External channels may
receive the job or alert details the user chooses to send.

## External AI

External AI is optional and disabled by default. JobSentinel may support
providers such as OpenAI, but external AI is an assistive layer, not the
foundation of the product.

All external AI calls must use the AI gateway described in
[docs/architecture/privacy-first-ai-gateway.md](docs/architecture/privacy-first-ai-gateway.md).
That gateway must enforce:

- Explicit user opt-in before any external AI request.
- Payload minimization: send only fields needed for the selected feature.
- Payload preview before sending.
- Redaction, edit, and cancel paths where UI exists.
- Local metadata logging of feature, provider, timestamp, and high-level data
  categories sent.
- No full database uploads.
- No private notes or unrelated application history unless explicitly selected.
- No resume text or salary floor sharing unless explicitly selected.
- Local-only fallback or a clear external-AI-required label for features that
  cannot run locally.

The same minimization rule applies to local IPC boundaries. Non-settings
screens request narrow profile existence or preview commands instead of the
full application profile. Dashboard uses a small preferences DTO instead of
full settings. Job import removes embedded credentials, fragments, tracking
parameters, and sensitive query parameters before preview, hashing, storage,
or returning a result; the import command returns only the saved job id.

API keys and provider credentials must not be hardcoded. If a user configures a
provider key, it should live in the operating system credential store where
supported. Logs must record only metadata, never raw prompts, resumes, notes,
salary floors, credentials, or full responses.

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
what may be sent out, why it is needed, and what the user can turn off. Any
feature that cannot satisfy Rule 0 must be redesigned, disabled, or removed.

## Research And Evaluation

Research and grant evaluation use public postings and synthetic candidate data
by default.

Allowed by default:

- Public official job postings.
- Public ATS postings.
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
