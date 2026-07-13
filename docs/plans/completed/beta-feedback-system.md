# Beta Feedback System

## Status

Completed on `main`; tracked for the `2.7.6` release.

## Problem

Beta users need a low-friction way to report bugs, request features, and ask
questions without JobSentinel sending telemetry or uploading private job-search
data.

## Scope

- GitHub Issues is the primary channel.
- Google Drive file upload is the secondary channel for users without GitHub.
- JobSentinel generates local, sanitized report text only.
- Users choose whether to include debug information.
- Report output strips or summarizes private data before the user sees it.

## Implemented Surfaces

- Frontend feedback service and modal flow:
  - `src/services/feedbackService.ts`
  - `src/hooks/useFeedback.ts`
  - `src/features/settings/support/feedback/`
- Backend feedback commands:
  - `open_github_issues`
  - `open_google_drive`
  - `reveal_saved_feedback_file`
  - `get_system_info`
  - `get_config_summary`
  - `generate_feedback_report`
  - `get_debug_log_formatted`
  - `get_debug_log_events`
  - `clear_debug_log_cmd`
  - `get_feedback_filename`
  - `save_feedback_file`
- GitHub issue templates:
  - `.github/ISSUE_TEMPLATE/bug_report.yml`
  - `.github/ISSUE_TEMPLATE/feature_request.yml`
  - `.github/ISSUE_TEMPLATE/question.yml`
  - `.github/ISSUE_TEMPLATE/scraper_issue.yml`

## Decisions

- No automatic crash reporting.
- No analytics, tracking, or network submission from the app.
- No raw resume content, configured search terms, credentials, webhook URLs,
  email addresses, tokens, or full file paths in generated feedback reports.
- Browser and file-manager actions go through registered Tauri commands instead
  of ad hoc frontend URL open calls.

## Verification

Targeted checks for this plan:

```bash
npm run test:run -- src/services/feedbackService.test.ts
cd src-tauri && cargo test --lib commands::feedback
npm run harness:check
npm run lint:docs
```

Broader release checks still follow
[Verification Matrix](../../harness/verification-matrix.md).

## Outcome

Feedback workflow is implemented and documented. The old long-form proposed
plan was removed from developer docs to keep the repo lightweight and current.
