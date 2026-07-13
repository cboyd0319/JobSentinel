export function getTechnicalFirstGuidesResult(path, text) {
  if (path === "docs/features/resume-builder.md") {
    const resumeBuilderDocPatterns = [
      /proficiency levels/i,
      /expert, intermediate/i,
      /Readability Score/i,
      /\*\*Completeness\*\*/i,
      /Developer Details/i,
      /For developers and the curious/i,
      /Local Storage Model/i,
      /Tauri Commands/i,
      /resume_drafts/i,
      /consistent upload previews/i,
      /ready to upload to any job application/i,
      /Some upload previews and review tools/i,
      /ats-optimizer\.png/i,
      /\*\*80-100\*\*/i,
      /\*\*60-79\*\*/i,
      /\*\*40-59\*\*/i,
      /\*\*0-39\*\*/i,
      /create_resume_draft/i,
      /export_resume_docx/i,
      /analyze_resume_for_job/i,
      /Backend Files/i,
      /DOCX generation/i,
    ];

    return resumeBuilderDocPatterns.some((pattern) => pattern.test(text));
  }

  if (path === "docs/features/smart-scoring.md") {
    const smartScoringDocPatterns = [
      /advanced scoring configuration/i,
      /Developer Notes/i,
      /Current Tauri commands/i,
      /get_scoring_config/i,
      /update_scoring_config/i,
      /reset_scoring_config_cmd/i,
      /validate_scoring_config/i,
      /ScoringConfig/i,
      /recency proportions/i,
      /complete scoring model/i,
      /Internal field names/i,
      /Uploaded resume skills/i,
    ];

    if (smartScoringDocPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/json-resume-import.md") {
    const resumeImportDocPatterns = [
      /JSON Resume content\s*\|\s*JobSentinel draft field/i,
      /`basics\./i,
      /`(?:work|volunteer|education|skills|certificates|awards|projects)\[\]`/i,
      /Developer contract/i,
      /Implementation paths/i,
      /select_and_import_json_resume/i,
      /import_json_resume/i,
      /Returned renderer DTOs/i,
      /Run the focused Rust tests/i,
      /cd src-tauri/i,
      /cargo test core::resume::json_resume/i,
      /\bJSON Resume\b/i,
      /raw JSON strings/i,
      /JSON character length/i,
      /partial JSON Resume files/i,
      /malformed JSON errors/i,
      /JSON Resume schema/i,
      /JSON Resume registry/i,
    ];

    if (resumeImportDocPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/ghost-detection.md") {
    const ghostDetectionDocPatterns = [
      /low-trust listing/i,
      /Settings\s*>\s*Detection\s*>\s*Ghost Detection Settings/i,
      /Ghost Detection Settings/i,
      /For developers and the curious/i,
      /Signal Weights/i,
      /Database Schema/i,
      /API Commands/i,
      /Ghost configuration commands/i,
      /ghost_reasons TEXT/i,
      /\bghost_score\b/i,
      /\brepost_count\b/i,
      /invoke\("get_ghost_/i,
      /invoke\("set_ghost_config/i,
      /invoke\("reset_ghost_config/i,
    ];

    if (ghostDetectionDocPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/pay-protection.md") {
    return /seniority level|by title, location, and\s+seniority/i.test(text);
  }

  if (path === "docs/features/notifications.md") {
    const notificationDocPatterns = [
      /incoming webhook/i,
      /Advanced setup for Telegram bot users/i,
      /match strength/i,
      /match score/i,
      /fit label or percentage/i,
      /alert selectivity/i,
      /Slack Advanced Chat Setup/i,
      /Add New Webhook to Workspace/i,
      /Advanced Sending Server Reference/i,
      /Native OS notifications/i,
      /System notification daemon alerts/i,
      /https:\/\/api\.slack\.com\/messaging\/webhooks/i,
      /Message \[@BotFather\]/i,
      /Find the Telegram chat number/i,
      /email provider/i,
      /\|\s*Provider\s*\|\s*Server\s*\|\s*Port\s*\|/i,
      /All connections use TLS\/STARTTLS encryption/i,
      /Maintainer Notes/i,
      /Alert delivery details/i,
      /Parallel Sending/i,
      /Connection Link Checks/i,
      /Module Structure/i,
      /src-tauri\/src\/core\/notify/i,
      /hooks\.slack\.com\/services/i,
      /discord(?:app)?\.com\/api\/webhooks/i,
      /outlook\.office(?:365)?\.com\/webhook/i,
      /Telegram Bot API/i,
    ];

    if (notificationDocPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/user/QUICK_START.md") {
    const quickStartPatterns = [
      /Assets section/i,
      /For developers:\s*build from source/i,
      /For contributors/i,
      /Need developer setup/i,
      /Developer Setup/i,
      /Developers can build locally/i,
      /Node, Rust, and the Tauri/i,
      /npm run tauri:build/i,
      /bounded requests/i,
      /bounded website reads/i,
      /health checks/i,
      /source-specific boundaries/i,
      /source-specific limits/i,
      /shared retry helpers/i,
      /low-trust postings/i,
      /scan allowed sources immediately/i,
      /Ghost Job Detection/i,
      /force a refresh/i,
      /choose \*\*More Settings\*\*/i,
      /choose More Settings/i,
      /download list on the newest release/i,
      /Optional:\s*build it yourself/i,
      /build JobSentinel from the source code/i,
      /source-code setup guide/i,
      /developer tools and commands/i,
      /https:\/\/api\.slack\.com\/messaging\/webhooks/i,
      /Advanced:\s*where JobSentinel saves local files/i,
      /Support file locations/i,
      /%LOCALAPPDATA%\\JobSentinel\\jobs\.db/i,
      /watching the allowed sources/i,
      /Here's what happens automatically/i,
      /app password or sending details/i,
    ];

    if (quickStartPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/user/DEEP_LINKS.md") {
    const deepLinkPatterns = [
      /Privacy And Source Boundaries/i,
      /session cookies/i,
      /background collection/i,
      /Rate limiting/i,
      /\[developer guide\]/i,
      /^## Supported Sites/im,
      /Monitored sources?/i,
      /does not monitor directly/i,
      /local monitoring/i,
      /Advanced filters/i,
      /Contributors can also add sites in code/i,
      /Browser extension integration/i,
      /This is expected\s+-\s+log in to view results/i,
      /Bulk open \(open multiple sites at once\)/i,
    ];

    if (deepLinkPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (
    path === "docs/features/job-source-status.md" ||
    path === "docs/features/job-sources.md"
  ) {
    const sourceDocPatterns = [
      /Job Source Adapters/i,
      /public, bounded source adapters/i,
      /feeds or APIs/i,
      /Requests\/hour/i,
      /Official\/public board API/i,
      /Official\/public postings API/i,
      /Official API with user-provided access code/i,
      /hidden LinkedIn endpoints/i,
      /HTML, RSS, JSON/i,
      /Adapter Flow/i,
      /SHA256\(/i,
      /source boundaries as adapters/i,
      /rate limits and bounded response reads/i,
      /^## Implementation Notes/im,
      /^## Verification/im,
      /official company or ATS postings/i,
      /public ATS APIs/i,
      /public ATS sources/i,
      /hidden endpoint/i,
      /CAPTCHA bypass/i,
      /anti-bot prone/i,
      /understand HTTP, selectors, credentials, or logs/i,
      /source-boundary check/i,
      /bounded public request/i,
      /source-specific limits/i,
      /shared retry helpers/i,
      /decoded bodies/i,
      /Public JSON endpoint/i,
      /Public job endpoint/i,
      /ATS feeds/i,
      /source host/i,
      /title count/i,
      /work location mode/i,
      /requested-job limit/i,
      /Scheduled adapters/i,
      /Source-check adapters/i,
      /Representative adapter limits/i,
      /bounded HTTP request/i,
      /parse into normalized jobs/i,
      /deduplicate/i,
      /Configured source/i,
      /source-policy check/i,
      /record health metadata/i,
      /Health And Diagnostics/i,
      /User-Configured External Sources/i,
      /local metadata only/i,
      /HN Who's Hiring/i,
      /Hacker News/i,
    ];

    if (sourceDocPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }


  return undefined;
}
