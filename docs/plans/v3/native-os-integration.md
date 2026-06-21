# Native OS Integration

V3 should use native operating-system capabilities where they reduce friction,
improve privacy, improve accessibility, or make JobSentinel feel like a real
desktop product. Native integration must stay behind Rust-owned validation and
Tauri v2 capability boundaries.

## Principles

- Rust remains the base runtime and trust boundary.
- Use native OS features only when they remove real user burden.
- Prefer typed Rust commands, narrow Tauri plugins, and explicit capabilities.
- Keep platform-specific behavior behind platform adapters.
- Never expose broad shell, filesystem, network, clipboard, or process access to
  the renderer.
- Every native feature needs a plain fallback on unsupported platforms.
- Every permission prompt needs user-facing explanation before it appears.

## Cross-Platform Native Features

Explore:

- Deep links to open saved searches, case files, reminders, and import flows.
- File associations for resume, backup, source pack, model pack, and export
  files.
- Native notifications with action buttons for reminders, follow-ups, source
  failures, interview prep, and offer deadlines.
- Tray or menu bar status for source checks, pending reminders, model downloads,
  and privacy mode.
- Global shortcut for quick capture or quick note, disabled by default.
- Clipboard import helper with token scrubbing and explicit user action.
- Drag-and-drop resume, job posting, source pack, and backup import.
- Native share/open-with targets where supported.
- Native print and PDF export flows for resumes, packets, and reports.
- Local file indexing for JobSentinel exports without indexing sensitive raw
  database files.
- Local health diagnostics for vault, database, source checks, browser
  companion, model cache, and permissions.
- Local OCR import for user-selected screenshots, PDFs, and rendered job text
  when normal text extraction fails.
- OS-native micro-assist for short summaries, field extraction, reminder titles,
  and accessibility-friendly explanations where local platform models are
  available.

## macOS Ideas

Explore:

- Keychain and LocalAuthentication for vault unlock, sensitive exports, backup
  restore, and MCP/browser companion pairing.
- App Intents and Shortcuts for user-approved actions such as add job, open
  dashboard, log follow-up, start interview prep, or create reminder.
- Core Spotlight for indexing safe case-file metadata while excluding private
  notes and raw resumes by default.
- Quick Look previews for resumes, application packets, safe reports, backups,
  and export bundles.
- Finder tags or Services integration for adding a resume or job posting to
  JobSentinel.
- Calendar and Reminders integration for interviews and follow-ups only after
  explicit user approval.
- Focus mode awareness for notification quieting where feasible.
- Menu bar helper for quick capture, source status, reminders, and privacy
  lock.
- Apple Foundation Models exploration for local summarization or extraction on
  supported macOS versions, with deterministic fallback.
- Vision and Natural Language framework exploration for local OCR and document
  understanding where it improves resume/job import.
- App Intents and Shortcuts surfaced as a "JobSentinel quick actions" layer for
  add note, log applied, open today's mission list, start interview prep, and
  create follow-up.

Risk controls:

- Do not put private resume text into Spotlight by default.
- Do not read Contacts, Calendar, Mail, or Reminders without explicit setup.
- Keep App Intent actions scoped and reviewable.
- Treat Apple Foundation Models output as draft assistance, not durable truth.
- Only OCR content the user explicitly selected or imported.

## Windows Ideas

Explore:

- Windows Hello for sensitive unlock, exports, backup restore, and paired-client
  approval where supported.
- Windows Credential Locker or DPAPI-backed storage through Rust-owned vault
  adapters.
- URI protocol activation for saved searches, case files, browser companion
  pairing, and import review.
- Toast notifications with action buttons for follow-ups, interviews, offers,
  and source failures.
- Jump Lists for recent local case files, dashboard, import, and resume builder
  actions, with privacy controls.
- File Explorer context menu or "Open with JobSentinel" for resumes, job
  postings, backups, and packs.
- Windows Search integration only for safe metadata, not raw private data.
- Startup task or scheduled checks only after explicit user setup.
- WebView2 capability diagnostics and repair guidance.
- Windows App SDK packaging review for easier install and update paths.
- Windows AI APIs and ONNX Runtime DirectML exploration for local small-model
  helpers, extraction, and acceleration.
- Windows OCR exploration for user-selected screenshots and documents.

Risk controls:

- Do not expose raw database paths in Jump Lists or search metadata.
- Keep scheduled tasks visible, local, and user-configurable.
- Keep Credential Locker access behind Rust commands.
- Treat Windows local model and OCR outputs as reviewable suggestions.

## Linux Ideas

Explore:

- Secret Service integration for vault storage where available.
- xdg-desktop-portal for files, notifications, opening URLs, and sandbox-aware
  permissions.
- Desktop entry actions for dashboard, import, reminders, and safe report.
- AppImage, deb, rpm, and Flatpak readiness strategy.
- System tray support where desktop environment allows it.
- File manager "open with" and MIME associations for resumes, backups, packs,
  and export bundles.
- Freedesktop notifications for reminders and source status.
- Keyring/passphrase fallback when no desktop secret service exists.

Risk controls:

- Linux desktop environments vary; every feature needs fallback copy and
  diagnostics.
- Do not assume a keyring exists.
- Keep Flatpak or sandbox permissions explicit.

## Browser Companion Integration

Native OS support should strengthen the browser companion:

- Deep-link pairing from extension to desktop app.
- Native prompt before pairing a browser or local MCP client.
- Revocation UI in Settings.
- Notification when a browser companion imports a job or encounters a blocked
  action.
- OS-level protocol handler to open case files from browser companion actions.
- Platform-specific install guidance for Chrome, Edge, Firefox, and Safari.

Security boundary:

- Browser extensions never read the local database directly.
- Browser companion messages go through Rust validation.
- Origin, permission, and action scope are recorded in the local audit log.

## Local Automation Without Hidden Behavior

Native automation can improve ease without becoming invisible:

- user-approved reminders
- user-approved calendar events
- visible scheduled public source checks
- local model download queue
- backup reminders
- update notifications
- browser companion quick capture

Avoid:

- hidden restricted-source refresh
- reading Mail, Contacts, Calendar, Reminders, or files without explicit setup
- broad shell automation
- OS accessibility automation for job applications without a reviewed product
  contract
- background final submission or form completion

## Packaging And Install

Native OS integration should make v3 easier to install and maintain:

- platform-specific packages with clear edition labels
- no-admin or portable path exploration where feasible
- signed and notarized macOS public package when credentials exist
- Windows installer choices that minimize warnings and avoid unnecessary admin
  rights
- Linux package formats matched to user expectations
- updater and rollback experience aligned with v3 compatibility rules
- repair tool for permissions, vault, browser companion, model cache, and source
  packs

## Verification

Every native feature needs:

- platform support matrix
- Tauri capability or Rust adapter review
- permission prompt copy
- fallback path
- manual UI verification
- security review for local data exposure
- install and uninstall check
- rollback behavior when relevant

## References

- [Tauri v2 documentation](https://v2.tauri.app/)
- [Tauri plugins](https://v2.tauri.app/plugin/)
- [Apple App Intents](https://developer.apple.com/documentation/appintents)
- [Apple Core Spotlight](https://developer.apple.com/documentation/corespotlight)
- [Apple LocalAuthentication](https://developer.apple.com/documentation/localauthentication)
- [Apple Foundation Models](https://developer.apple.com/documentation/foundationmodels)
- [Apple Vision](https://developer.apple.com/documentation/vision)
- [Microsoft Windows App SDK](https://learn.microsoft.com/en-us/windows/apps/windows-app-sdk/)
- [Microsoft Windows AI APIs](https://learn.microsoft.com/en-us/windows/ai/apis/)
- [ONNX Runtime DirectML execution provider](https://onnxruntime.ai/docs/execution-providers/DirectML-ExecutionProvider.html)
- [Microsoft app notifications](https://learn.microsoft.com/en-us/windows/apps/design/shell/tiles-and-notifications/notifications-overview)
- [Windows PasswordVault API](https://learn.microsoft.com/en-us/uwp/api/windows.security.credentials.passwordvault)
- [Windows OCR API](https://learn.microsoft.com/en-us/uwp/api/windows.media.ocr)
- [Freedesktop Secret Service](https://specifications.freedesktop.org/secret-service/latest/)
- [Freedesktop desktop notifications](https://specifications.freedesktop.org/notification-spec/latest/)
- [xdg-desktop-portal documentation](https://flatpak.github.io/xdg-desktop-portal/docs/)
