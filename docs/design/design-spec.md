# JobSentinel Design Spec

This spec captures the maintained product design direction for JobSentinel. It
normalizes the full draft design brief into repo-maintained guidance that can be
reviewed, tested, and kept current.

Root [DESIGN.md](../../DESIGN.md) is the canonical design-system entrypoint.
This spec gives screen-level and interaction-level rules.

## Product Purpose

JobSentinel is a private desktop assistant for finding real, relevant, fairly
compensated work. It helps job seekers decide whether a job is worth attention,
what evidence supports that decision, and what to do next.

The app must support people in stressful searches. It should feel steady,
protective, and useful, not gamified or judgmental.

Core questions:

- Is this role real and fresh?
- Does it match my goals and skills?
- Does it meet my pay floor?
- What evidence supports the fit?
- What should I verify before applying?
- What has already happened with this application?

## Product Principles

- **Local-first by default:** private job-search data stays on the user's
  device unless the user explicitly configures and approves an external channel.
- **Evidence over hype:** show reasons, source context, pay evidence, freshness,
  and missing information instead of opaque confidence theater.
- **Review before action:** JobSentinel can prepare, summarize, and organize,
  but the user submits applications and controls external sends.
- **Protect attention:** reduce dead-end applications, stale postings, duplicate
  work, and noisy alerts.
- **Protect leverage:** make pay floor, range evidence, negotiation notes, and
  compensation gaps visible.
- **No deception:** no volume-first application UX, system-submitted forms,
  human-check evasion, hiring-system manipulation, or restricted-source
  scraping.
- **Optional AI:** external AI is disabled by default, preview-gated, and routed
  through the privacy-first AI gateway.

## Target Users

JobSentinel must work for technical and non-technical job seekers. User-facing
flows must not assume terminal knowledge, GitHub familiarity, software
debugging skill, or hiring-system expertise.

The design should account for users who are:

- Comparing many similar roles.
- Tracking applications over weeks or months.
- Protecting pay floors and avoiding low-quality postings.
- Reviewing resumes and screening answers under stress.
- Cautious about privacy, AI, and job-board data collection.

## Visual Direction

The design stance is **quiet shield**: calm, protective, local, credible, and
work-focused. It should feel like a private command surface for decisions, not a
social feed, sales dashboard, or resume-score game.

Target tone:

- Serious without being cold.
- Warm without cheerleading.
- Dense enough for repeated work.
- Calm enough for stressful search sessions.
- Explicit about privacy and user control.

Avoid:

- Purple-blue gradient AI defaults.
- Marketing-style hero layouts inside the app.
- Nested card stacks.
- Decorative bokeh, blobs, or glow.
- One-note green terminal palettes.
- Alert-heavy notification walls.
- Score-only match claims.

## Color System

Root [DESIGN.md](../../DESIGN.md) defines the current token names and values.
Protective Navy is the target dark theme.

Color intent:

- **Navy background:** privacy, protection, calm focus.
- **Slate surfaces:** hierarchy, review areas, and quiet density.
- **Teal:** primary action, trusted source, privacy-positive state, high fit.
- **Amber:** caution, stale posting, ambiguity, missing evidence, verify first.
- **Red:** destructive action, scam risk, dangerous posting, hard failure.
- **Blue:** neutral information, source metadata, explanatory state.
- **Purple:** sparse secondary category or application-progress accent.

Important rule: **amber must never mean high match**. Amber means caution or
verification.

Current implementation note: the app is migrating from green-heavy surfaces to
Protective Navy. New work should move toward the design target without claiming
full migration until all major routes are verified.

## Typography

Use platform-local system fonts first. Do not load remote font stylesheets or
font files in the renderer. Typography should be readable, stable, and
work-focused.

Rules:

- Use sentence case for headings, labels, tabs, buttons, and alerts.
- Keep letter spacing at `0`.
- Do not scale font size with viewport width.
- Reserve large headings for page headers.
- Use compact headings inside cards, settings groups, sidebars, and dialogs.
- Long titles, company names, resume names, URLs, and saved answers must wrap
  without clipping.

Copy should explain evidence:

```text
Strong match because your resume overlaps with SEO, Google Analytics, and
Shopify. Missing evidence: team leadership and paid search.
```

Avoid score-only claims:

```text
This job is a 78% match.
```

## Layout

JobSentinel is an operational desktop app. Layouts should favor scanning,
comparison, and repeated action.

Rules:

- No horizontal page scroll on supported desktop or mobile widths.
- Fixed-format controls need stable dimensions or wrapping.
- Cards are for repeated items, modals, and genuinely framed tools.
- Do not place cards inside cards.
- Use progressive disclosure for advanced settings and dense metadata.
- Keep primary actions visible without turning pages into command walls.
- Preserve keyboard access for all navigable routes and modal workflows.

Responsive requirements:

- Dashboard cards collapse without clipping.
- Settings sections wrap controls and labels.
- Long job and resume names wrap.
- Toasts stay inside viewport.
- Empty states remain readable at narrow widths.

## Navigation

Navigation should be quiet, predictable, and accessible.

- Sidebar icons need accessible labels and visible active state.
- Keyboard shortcuts help power users but must not be required.
- Secondary pages need obvious back navigation.
- Tabs need `tablist`, `tab`, and `tabpanel` semantics when applicable.
- Route changes should preserve user work where feasible or warn before loss.

## Component Rules

### Buttons

- Use teal for primary action.
- Use slate for secondary action.
- Use red for destructive action.
- Use amber only for caution or verification.
- Buttons need visible focus states and accessible names.
- Icon buttons need labels or tooltips.

### Forms

- Every input needs an accessible label.
- Helper text should explain user impact, not implementation detail.
- Validation errors should be near the field and actionable.
- Saved secret fields must distinguish saved, will save, and unavailable
  states without exposing values.

### Modals

- Modals must trap focus, provide Escape/backdrop close when safe, and restore
  focus to the triggering control.
- Destructive modals need clear consequences.
- Application Assist modals must remind users that JobSentinel prepares data
  for review and never submits forms for them.

### Toasts

- Toasts must stay inside the viewport.
- Success toasts should be brief and specific.
- Empty-data toasts should explain the next useful action.
- Warning toasts should use amber and avoid blame.
- Do not stack noisy alerts in ways that hide the underlying workflow.

### Empty States

Empty states should explain what is missing and offer one clear next action.
They should not shame users, imply failure, or hide the privacy model.

## Screen Contracts

### Dashboard

Dashboard answers: what is new, what is worth attention, and what needs review.

Required behavior:

- Show source setup state when no sources are enabled.
- Offer import job posting as a local fallback.
- Keep summary cards readable at narrow widths.
- Keep filters clearable through one visible control when filters are active.
- Do not imply job data exists when sources are off or no imported jobs exist.

### Job List And Job Detail

Job rows and details should support comparison.

Required behavior:

- Show source, age/freshness, pay evidence, location, remote status, and fit
  evidence where available.
- Make stale, reposted, or weak-evidence states visible.
- Avoid overconfident match wording when evidence is incomplete.
- Keep external apply actions clearly user-controlled.

### Application Tracker

Application tracking should reduce memory burden.

Required behavior:

- Track user-owned statuses and follow-up needs.
- Keep unsaved modal notes scoped to the open application.
- Avoid carrying draft notes between unrelated records.
- Show reply rate and counts as factual summaries, not performance judgments.

### Resume Builder

Resume Builder should help users maintain truthful, reusable resume content.

Required behavior:

- Preserve user-entered draft work when navigating within a same-session flow.
- Label all modal fields.
- Avoid ATS fear language and deceptive tailoring suggestions.
- Keep resume names and section content readable when long.

### Resume Match

Resume Match should show local fit evidence, not a magic score.

Required behavior:

- Show what text JobSentinel read.
- Distinguish found skills from user-reviewed skills.
- Let users edit, delete, and categorize skills.
- Keep skill lists scrollable without clipping or horizontal overflow.
- Explain missing match evidence plainly.

### Pay Protection

Pay Protection should protect floors and negotiation clarity.

Required behavior:

- Treat salary floor as a user-defined walk-away number, not a judgment.
- Sync role stage and years of experience.
- Show no-data states as useful guidance, not failure.
- Use amber for caution when pay is unclear or below floor.
- Use evidence labels for benchmarks and ranges.
- Separate verbal numbers from written offer amounts before drafting notes.
- Keep offer deadline, total compensation, commute, relocation, and pressure
  checks visible before counter or decline starters.
- Show counter and decline starters as local drafts, not submitted actions.

### Hiring Trends

Hiring Trends should summarize current local job data.

Required behavior:

- Show empty/no-data state when there are no jobs.
- Do not show success wording that implies trends exist when data is empty.
- Keep tabs keyboard-accessible.
- Separate skills, companies, locations, and alerts with clear tab panels.

### Application Assist

Application Assist prepares reusable details for user review.

Required behavior:

- Never click Submit.
- Never claim to apply on behalf of the user.
- Show saved screening answers as readable labels, not raw regex patterns.
- Let users review and edit matching rules safely.
- Make answer type and saved answer clear.

### Settings

Settings must be understandable to non-technical users.

Required behavior:

- Organize advanced alert rules through progressive disclosure.
- Keep secure connection fields labeled and status-aware.
- Explain external services before users enable them.
- Preserve local-first defaults.
- Keep source controls visible and responsive without horizontal scroll.

## Privacy And AI Interaction

Privacy UX is part of the design system.

Required behavior:

- External AI remains disabled by default.
- Users preview and approve any external AI send.
- SQLite app data is encrypted at rest.
- Saved alert credentials, access codes, and private connection links are
  encrypted per row in a local secret vault. They are never stored as plaintext
  SQLite, config, localStorage, logs, screenshots, or support-report content.
- Default secret unlock uses a local vault master key protected by the OS
  credential store. macOS uses native Keychain plus LocalAuthentication so
  Touch ID can satisfy user-presence prompts when available.
- Advanced passphrase mode can wrap the vault key for users who want more
  custody. The app must explain recovery responsibility before enabling it.
- Passive views, including Settings load and saved-status badges, do not
  verify secrets in ways that trigger repeated unlock prompts. Secret checks
  happen when the user saves a changed secret, tests a channel, runs a source
  that needs a secret, exports sensitive backup data, or explicitly asks to
  verify secure storage.
- Resume text, private notes, application history, and local match reasons stay
  local unless explicitly approved.
- Support reports hide common private details and require user review before
  sharing.
- Alerts can include job metadata only for channels the user configured.
- Credential values are never displayed after saving.

AI copy must be humble and evidence-based. Prefer "prepare", "draft",
"summarize", and "review" over "decide", "guarantee", or "apply".

## Accessibility

Every route must support keyboard, screen reader, and narrow-width review.

Required checks:

- Labels for every form field.
- Visible focus rings.
- Semantic buttons for clickable cards.
- No nested interactive controls.
- Tab order follows visual order.
- Status does not rely on color alone.
- Toasts and modal states are announced where feasible.
- Reduced-motion preference is respected for animation-heavy states.
- Text contrast meets WCAG AA for normal and large text.

## Tone And Copy

JobSentinel copy should be plain, calm, and direct.

Use:

- "Review before applying."
- "No pay range found for this combination."
- "Turn on a job source or import a job posting."
- "Saved securely on this computer."
- "Missing evidence: management experience."

Avoid:

- "Land your dream job instantly."
- "Outsmart hiring systems."
- "Auto-apply everywhere."
- "Guaranteed match."
- "Your resume is weak."

## Anti-Patterns

Do not add:

- High-volume application flows.
- Auto-submit behavior.
- Hidden external sends.
- Cloud sync by default.
- Restricted-source scraping workarounds.
- Raw regex in normal user-facing cards.
- Score-only fit decisions.
- Unlabeled icon-only controls.
- Horizontal page scroll.
- Nested cards or nested buttons.
- Green-heavy status palettes where every state feels positive.

## Implementation Checklist

Use this checklist for UI work:

- Behavior matches [DESIGN.md](../../DESIGN.md).
- User data stays local unless explicitly configured and approved.
- External AI path is optional, preview-gated, and cancellable.
- Labels, focus, keyboard flow, and screen-reader names are present.
- Empty, loading, success, warning, error, and no-data states are covered.
- Long user-controlled text wraps without clipping.
- Narrow-width viewport has no horizontal overflow.
- Toasts and modals stay in viewport.
- Amber means caution, not high match.
- Tests or live validation cover the changed path.
