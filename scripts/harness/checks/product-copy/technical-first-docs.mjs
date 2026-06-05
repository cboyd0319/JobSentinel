export function getTechnicalFirstDocsResult(path, text) {
  if (path.startsWith("docs/features/")) {
    const featureDocImplementationPatterns = [
      /^##\s*(?:Developer Notes|For Maintainers|Checks for Maintainers)\b/im,
      /Implementation references/i,
      /Important modules/i,
      /Tauri commands/i,
      /Backend core/i,
      /src-tauri\/src/i,
      /src\/pages\//i,
      /cargo test/i,
      /npm run test:run/i,
      /npm run lint:bloat/i,
      /Core tables/i,
      /Core commands/i,
      /HashMap-based/i,
      /O\(n\*?m\)/i,
      /SynonymMap::/i,
      /private saved-file reference/i,
      /saved resume state/i,
      /negative number for groups/i,
      /chat number/i,
    ];

    if (featureDocImplementationPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "README.md") {
    const readmePatterns = [
      /before scanning starts/i,
      /starts scanning/i,
      /source adapters/i,
      /common source HTTP client/i,
      /ATS platforms/i,
      /background monitoring/i,
      /job source adapter guide/i,
      /bounded requests/i,
      /bounded website reads/i,
      /health checks/i,
      /source-specific boundaries/i,
      /source-specific limits/i,
      /shared retry helpers/i,
      /Download the latest installer from\s*\[GitHub Releases\]/i,
      /Local SQLite storage/i,
      /Your OS credential store/i,
      /Support sharing links\s*\|[^\n]*(?:GitHub issue pages|Google Drive folders)/i,
    ];

    if (readmePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/resume-matcher.md") {
    const resumeMatcherPatterns = [
      /ATS internals/i,
      /ATS manipulation/i,
      /not ATS\s+manipulation/i,
      /show the exact payload/i,
      /request metadata locally/i,
    ];

    if (resumeMatcherPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/application-tracking.md") {
    const applicationTrackingPatterns = [
      /Slack,\s*Discord,\s*Teams,\s*SMTP/i,
      /user configures them/i,
      /configured quiet period/i,
    ];

    if (applicationTrackingPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/user-data-management.md") {
    const userDataManagementPatterns = [
      /external channels are used only if configured/i,
      /raw private values/i,
      /redacted configuration summaries/i,
      /raw notes/i,
      /credentials,\s*private paths,\s*cookies,\s*webhook/i,
      /Developer Notes/i,
      /Implementation references/i,
      /src\/components\/CoverLetterTemplates\.tsx/i,
      /src-tauri\/src\/core\/user_data/i,
      /Tauri commands/i,
      /notificationPrefsExample/i,
      /advancedFilters/i,
      /save_notification_preferences/i,
      /minScoreThreshold/i,
      /npm run test:run/i,
      /cargo test --lib user_data/i,
      /Implementation rule/i,
    ];

    if (userDataManagementPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/credentials-security.md") {
    const credentialsSecurityPatterns = [
      /Credential\s*\|\s*Storage key\s*\|\s*Used for/i,
      /Slack webhook URL/i,
      /Discord webhook URL/i,
      /Microsoft Teams webhook URL/i,
      /Email SMTP password/i,
      /Credential values stay local/i,
      /whether a credential exists/i,
      /Plaintext config credential fields/i,
      /webhook URLs/i,
      /API\s+keys/i,
      /Credential command logs/i,
      /`config\.json`,\s*localStorage/i,
      /accidental commits,\s*backup tools,\s*or diagnostic bundles/i,
      /local app config or SQLite/i,
      /command line in the developer reference/i,
      /Invalid key\s*\|\s*App sent an unsupported saved-detail name/i,
      /Developer Reference/i,
      /Storage Names/i,
      /Frontend Integration/i,
      /Advanced Linux Keyring Check/i,
      /Secret Service provider/i,
      /CredentialKey/i,
      /store_credential/i,
      /jobsentinel_slack_webhook/i,
      /compatibility and diagnostics/i,
    ];

    if (credentialsSecurityPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/notifications.md" || path === "docs/user/QUICK_START.md") {
    const notificationDocPatterns = [
      /Email provider details/i,
      /Create New App/i,
      /From Scratch/i,
      /secure credential manager/i,
      /Legacy plain-text fields/i,
      /provider guidance/i,
      /channel is \*\*enabled\*\*/i,
      /verify the connection/i,
      /bot an admin/i,
      /manual provider setup/i,
      /For developers and the curious/i,
      /Webhooks are validated before sending/i,
      /Manual Email Server Reference/i,
      /Server Settings\s*>\s*Integrations/i,
      /Advanced Sending Server Reference/i,
      /already know how to create a Telegram bot/i,
      /Create a Telegram bot/i,
      /Telegram alert bot/i,
      /Telegram chat details/i,
      /Telegram setup details/i,
      /Telegram says "chat not found"/i,
      /bot is added/i,
      /give the bot permission/i,
    ];

    if (notificationDocPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (
    path === "src/components/AnalyticsPanel.tsx" &&
    /Could not load application summary\.\s*Please try again|Application Analytics|Status Distribution|Responses by Job Source|Average Response Time|Company Response Times|Detailed Status Breakdown|No analytics data available|Download analytics data|Close analytics|Analytics error|Loading analytics|job-analytics|Failed to fetch analytics|apps\s*·\s*\{?source\.response_rate\.toFixed\(0\)\}?\s*%\s*response/i.test(text)
  ) {
    return true;
  }

  if (
    path === "src/components/DashboardWidgets.tsx" &&
    (
      /setError\(\s*["'`]Could not load application summary["'`]\s*\)/i.test(text) ||
      /Analytics Dashboard|Analytics charts|Weekly Activity|Jobs by Source|Salary Distribution|Quick Stats/i.test(text)
    )
  ) {
    return true;
  }

  if (path === "src/components/JobImportModal.tsx") {
    const importPatterns = [
      /Missing details:\s*\{?preview\.missing_fields\.join/i,
      /preview\.missing_fields\.join\(\s*["'`],\s*["'`]\s*\)/i,
    ];
    if (importPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/pages/Settings.tsx" || path === "src/pages/SettingsConnectedJobSource.tsx" || path === "src/pages/SettingsJobSourcesSection.tsx") {
    const settingsPatterns = [
      /Review before anything is sent/i,
      />Endpoint</i,
      />Remote filter</i,
      />Result limit</i,
      /Not remote-only/i,
      /Get optional USAJobs access code/i,
      /USAJobs email,\s*keywords,\s*location/i,
      /label=["']Keywords["']/i,
      /posted-within choice/i,
      /\bresult limit\b/i,
      />\s*Posted within:/i,
      />\s*Max results:/i,
      /Optional USAJobs auto-check/i,
      /Automatic USAJobs checks contact USAJobs/i,
      /Source host/i,
      /(?:>\s*|["'`])Settings backup saved(?:\s*<|["'`])/,
      /Saved passwords and connection codes are left out for safety/i,
      /Config imported/i,
      /(?:>\s*|["'`])Basic Settings(?:\s*<|["'`])/,
      /(?:>\s*|["'`])More Settings(?:\s*<|["'`])/,
      /(?:>\s*|["'`])Advanced Settings(?:\s*<|["'`])/,
      /Greenhouse, Lever, and other popular job boards/i,
      /native OS notifications/i,
      /app is focused/i,
      /SMTP server/i,
      /SMTP port/i,
      /Connection Number/i,
      /Email provider details/i,
      /Provider address/i,
      /Provider number/i,
      /Use this only if your provider gives you manual email details/i,
      /Manual email setup/i,
      /automatic monitoring/i,
      /Auto-enable Slack if valid connection link entered/i,
      /Paste Slack connection link["'`]/i,
      /Advanced federal monitoring/i,
      /Request USAJobs access code/i,
      /\bautomatic checks\b/i,
      /automatic\s+USAJobs\s+checks/i,
      /Advanced chat alert/i,
      /\(Tech hubs\)/i,
      /HN Who's Hiring/i,
      /Hacker News Who's Hiring/i,
      /Turn Hacker News hiring post checks on or off/i,
      /\(Tech careers\)/i,
      /blocks automatic checks/i,
      /Optional USAJobs auto-check/i,
      /Automatic USAJobs checks contact USAJobs/i,
      /New scans use this warning behavior/i,
      /These job boards can be monitored when enabled/i,
      /Loading ghost config/i,
      /Server Settings\s*→\s*Integrations\s*→\s*create a channel connection\s*→\s*Copy link/i,
      /Channel\s*→\s*Connectors\s*→\s*create a channel connection\s*→\s*Copy link/i,
      /Browser Integration/i,
      /low-trust job postings/i,
      /Stale-posting warning after \(days\)/i,
      /Repeated-posting warning count/i,
      /Very short description limit \(characters\)/i,
      /Hide risky postings/i,
      /Resume-Based Scoring/i,
      /70%\s*resume match\s*\+\s*30%\s*search words/i,
      /<dt[^>]*>\s*Job-source link\s*<\/dt>/i,
      /Paste a job-source link from a service you trust/i,
      /uploaded resume/i,
      /Upload your resume/i,
      /uploaded,\s*scoring uses/i,
      /added,\s*scoring uses/i,
      /These logs can help diagnose it/i,
      /Turn this on to never miss a new posting/i,
      /Auto-scan job boards/i,
      /Company preference \(if configured\)/i,
      /["'`]Save failed["'`]/,
      /["'`]Test failed["'`]/,
      /saved connection detail\(s\) failed to save/i,
      /Share\s*\$\{savedFile\.fileName\}\s*only if you want help/i,
      /Recommended for you/i,
      /onClick=\{rec\.enable\}[\s\S]{0,220}>\s*Enable\s*<\/button>/i,
      /Message @BotFather to create a private alert bot/i,
      /already use Telegram for automatic alerts/i,
      /Telegram chat number/i,
      /Telegram destination number/i,
      /destination number Telegram shows/i,
      /@BotFather/i,
      /@userinfobot/i,
      /\/newbot/i,
      /Quick Setup \(2 minutes\)/i,
      />\s*Get USAJobs Access Code\s*</i,
      /USAJobs uses a free access code/i,
      /Looks up your approximate city from your internet\s+address\. Not saved unless added\./i,
      /Restart JobSentinel/i,
    ];

    if (settingsPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }

    return false;
  }

  if (
    path === "src-tauri/src/core/automation/error.rs" ||
    path === "src-tauri/src/core/scrapers/error.rs"
  ) {
    const start = text.indexOf("pub fn user_message");
    const end = text.indexOf("/// Sanitize", start);
    const userMessageBody = start === -1 ? "" : text.slice(start, end === -1 ? undefined : end);

    return /Failed to|Request timed out|CAPTCHA detected|Authentication required|Please check your credentials|An automation error occurred|manual intervention|required before submission|Resume issue|Form element .*not found|Page took too long to load \(/i.test(
      userMessageBody,
    );
  }

  if (path === "src/pages/Resume.tsx") {
    const resumePagePatterns = [
      /Programming Languages/i,
      /Cloud & DevOps/i,
      /Skills Extracted/i,
      /No skills extracted yet/i,
      /extract skills automatically/i,
      /Recent Match Results/i,
      /Score Breakdown/i,
      /Matched Skills/i,
      /["'`]Missing Skills/i,
      /You have all required skills!/i,
      /Gap Analysis/i,
      /skill\.confidence_score\s*\*\s*100/i,
      /Proficiency Distribution/i,
      /Proficiency level/i,
      /PROFICIENCY_LEVELS\s*=\s*\[[^\]]*Beginner[^\]]*Expert/i,
      /Failed to load resume/i,
      /No Resume Uploaded/i,
      /Resume uploaded/i,
      /Upload Resume/i,
      /Upload New/i,
      /Uploading\.\.\./i,
      /Uploaded:/i,
    ];

    if (resumePagePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (
    path === "src/pages/ResumeBuilder.tsx" ||
    path === "src/pages/ResumeBuilderPreviewStep.tsx" ||
    path === "src/components/resume-builder/steps/SkillsStep.tsx"
  ) {
    const resumeBuilderPatterns = [
      />\s*Proficiency\s*</i,
      /["'`]Proficiency["'`]/,
      /Select level/i,
      /PROFICIENCY_LEVELS\s*=\s*\[[^\]]*beginner[^\]]*expert/i,
      /charAt\(0\)\.toUpperCase\(\)\s*\+\s*level\.slice\(1\)/,
      /Failed to import skills/i,
      /Failed to generate preview/i,
      /Export failed/i,
      /Try restarting JobSentinel/i,
      /restarting JobSentinel/i,
      /Try restarting the app/i,
      /restarting the app/i,
      /more issues/i,
    ];

    if (resumeBuilderPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/pages/Salary.tsx") {
    const salaryPagePatterns = [
      /Seniority Level/i,
      /Entry Level \(0-2 years\)/i,
      /Mid Level \(3-5 years\)/i,
      /Principal\/Executive/i,
      /25th\s*%/i,
      /75th\s*%/i,
      /75th percentile/i,
      /25th percentile/i,
      /Strong target from higher range/i,
      /under-anchoring/i,
    ];

    if (salaryPagePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (
    path === "src-tauri/src/core/resume/matcher.rs" ||
    path === "src-tauri/src/core/resume/ats_analyzer.rs" ||
    path === "src/mocks/handlers.ts" ||
    path === "src-tauri/src/core/salary/analyzer.rs" ||
    path === "src-tauri/migrations/00000000000000_initial_schema.sql"
  ) {
    const advisoryGuidancePatterns = [
      /Apply immediately/i,
      /Study the missing skills/i,
      /Consider upskilling/i,
      /Excellent offer!\s*Accept/i,
      /I was hoping/i,
      /top choice/i,
      /make this an easy decision/i,
      /skin in the game/i,
      /\(add specific metrics\)/i,
      /impact:\s*["'`](?:High|Medium)["'`]/i,
      /impact:\s*(?:"High"|"Medium")\.to_string\(\)/i,
      /Start bullet with action verb/i,
    ];

    if (advisoryGuidancePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (
    path === "src/pages/ResumeOptimizer.tsx" ||
    path === "src/pages/ResumeOptimizerJobWordsOverview.tsx" ||
    path === "src/pages/resumeOptimizerModel.ts"
  ) {
    const resumeMatchDetailPatterns = [
      /Improve Bullet Point/i,
      /Improved Version/i,
      /Could not improve bullet/i,
      /Tailor Resume for This Job/i,
      /Navigation not available/i,
      /Cannot navigate to Resume Builder/i,
      /Navigating to Resume Builder/i,
      /Job context has been saved/i,
      /Format Issues/i,
      />\s*\{issue\.severity\}\s*</i,
      /(^|[>\n])\s*Fix:\s*\{issue\.fix\}/i,
      /Impact:\s*\{suggestion\.impact\}/i,
      /Your resume data has been imported and analyzed/i,
      /ScoreItem\s+label=["'`]Completeness["'`]/,
      /choose or upload/i,
      /Choose or Upload Resume/i,
    ];

    if (resumeMatchDetailPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/components/AtsLiveScorePanel.tsx") {
    const resumeReadabilityPatterns = [
      /analyzing\.\.\./i,
      />\s*Job Context\s*</i,
      /View Full Analysis/i,
      /Format Issues/i,
      />\s*\{issue\.severity\}\s*</i,
      /(^|[>\n])\s*Fix:\s*\{issue\.fix\}/i,
      /Impact:\s*\{suggestion\.impact\}/i,
      /Include technical, workplace, and role-specific skills/i,
      /Add words from the job post/i,
      /ScoreBar\s+label=["'`]Complete["'`]/,
      /ScoreCard\s+label=["'`]Completeness["'`]/,
      />\s*View Details\s*</i,
      /Full Resume Readability Review/i,
      /\{analysis\.missing_keywords\.length\}\s+missing/i,
      /\{analysis\.format_issues\.length\}\s+issues/i,
    ];

    if (resumeReadabilityPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

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

  if (path === "docs/features/salary-ai.md") {
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

  if (path === "docs/features/scraper-health.md" || path === "docs/features/scrapers.md") {
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
