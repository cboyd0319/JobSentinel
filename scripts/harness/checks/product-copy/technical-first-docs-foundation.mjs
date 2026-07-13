export function getTechnicalFirstDocsFoundationResult(path, text) {
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

    if (
      featureDocImplementationPatterns.some((pattern) => pattern.test(text))
    ) {
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

  if (path === "docs/features/saved-secrets.md") {
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

  if (
    path === "docs/features/notifications.md" ||
    path === "docs/user/QUICK_START.md"
  ) {
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
    path === "src/features/applications/AnalyticsPanel.tsx" &&
    /Could not load application summary\.\s*Please try again|Application Analytics|Status Distribution|Responses by Job Source|Average Response Time|Company Response Times|Detailed Status Breakdown|No analytics data available|Download analytics data|Close analytics|Analytics error|Loading analytics|job-analytics|Failed to fetch analytics|apps\s*·\s*\{?source\.response_rate\.toFixed\(0\)\}?\s*%\s*response/i.test(
      text,
    )
  ) {
    return true;
  }

  if (
    path === "src/features/dashboard/components/DashboardWidgets.tsx" &&
    (/setError\(\s*["'`]Could not load application summary["'`]\s*\)/i.test(
      text,
    ) ||
      /Analytics Dashboard|Analytics charts|Weekly Activity|Jobs by Source|Salary Distribution|Quick Stats/i.test(
        text,
      ))
  ) {
    return true;
  }


  return undefined;
}
