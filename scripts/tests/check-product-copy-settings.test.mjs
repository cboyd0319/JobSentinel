import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { hasTechnicalFirstUserCopy } from "../harness/checks/product-copy.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-product-copy-settings-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function assertTechnicalFirstCopy(root, paths) {
  for (const path of paths) {
    assert.equal(hasTechnicalFirstUserCopy(root, path), true, path);
  }
}

function assertNoTechnicalFirstCopy(root, paths) {
  for (const path of paths) {
    assert.equal(hasTechnicalFirstUserCopy(root, path), false, path);
  }
}

test("product copy rejects technical-first settings copy", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizer.tsx",
      [
        "Exported resume details",
        "Paste exported resume details here",
        "Please paste your resume details first",
        "Resume details not recognized",
        "For a PDF resume, upload it on Resume Match first.",
        "Paste a job post and resume details, then choose Review Match",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/SetupWizard.tsx",
      [
        'placeholder="https://hooks.slack.com/services/..." label="Slack connection link"',
        "Start with in-app alerts now",
        "It only contacts job sources or alert services needed for features you turn on.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      [
        "Config imported",
        "Advanced Settings",
        "Greenhouse, Lever, and other popular job boards",
        "Get native OS notifications",
        "Show even when app is focused",
        "SMTP server",
        "SMTP port",
        "Email sending details",
        "Sending address",
        "Sending number",
        ">Secure<",
        "Connection Number",
        "access code, USAJobs email, keywords, location",
        'label="Keywords"',
        "posted-within choice",
        "result limit",
        ">Posted within:",
        ">Max results:",
        "For automatic monitoring",
        "Advanced federal monitoring",
        "Advanced chat alert",
        "(Tech hubs)",
        "HN Who's Hiring",
        "(Tech careers)",
        "This site sometimes blocks automatic checks",
        "New scans use this warning behavior",
        "These job boards can be monitored when enabled",
        "Loading ghost config",
        "Server Settings → Integrations → create a channel connection → Copy link",
        "Channel → Connectors → create a channel connection → Copy link",
        "Browser Integration",
        "low-trust job postings",
        "Stale-posting warning after (days)",
        "Repeated-posting warning count",
        "Very short description limit (characters)",
        "Hide risky postings",
        "Resume-Based Scoring",
        "70% resume match + 30% search words",
        "Match Priority Guide",
        "These percentages explain the default priority order.",
        "JobSentinel can monitor more official job sources.",
        "Add the Telegram alert code and destination number.",
        "Telegram destination number",
        "Source address",
        "Optional source address",
        "Jobs to ask for",
        "Jobs requested",
        "https://example.com/jobswithgpt",
        "Save local troubleshooting report",
        "For support only",
        "connection settings (support only)",
        'return "Failed"',
        'return "Timed out"',
        "",
      ].join("\n"),
    );
    writeFixtureFile(root, "src/pages/Settings.test.tsx", "Config imported\n");
    writeFixtureFile(
      root,
      "src/utils/export.ts",
      "const finalFilename = filename || `jobsentinel-config-${date}.json`;\n",
    );
    writeFixtureFile(
      root,
      "src/utils/export.test.ts",
      "/^jobsentinel-config-\\d{4}-\\d{2}-\\d{2}\\.json$/\n",
    );
    writeFixtureFile(
      root,
      "src/components/BookmarkletGenerator.tsx",
      "Create a new bookmark in your browser (Cmd/Ctrl+D)\nbookmark address field\n",
    );
    writeFixtureFile(
      root,
      "src/components/JobImportModal.tsx",
      "Missing details: {preview.missing_fields.join(', ')}\n",
    );
    writeFixtureFile(root, "docs/features/smart-scoring.md", "Settings > Advanced Settings\n");
    writeFixtureFile(
      root,
      "src/components/NotificationPreferences.tsx",
      [
        "setLoadError('Failed to load notification preferences')",
        "Loading notification settings",
        "toast.error('Failed to save', 'Your changes have been reverted')",
        "Your last change was undone. Try again.",
        "All Notifications",
        "Master switch for all job alerts",
        "Other enabled job boards use the main alert switch",
        "Source Alert Rules",
        "Which Jobs Alert You",
        "Choose which sources and filters can interrupt you",
        "Detailed rules currently apply to Indeed, Greenhouse, Lever, and JobsWithGPT",
        "Match strength",
        "Alert selectivity",
        "{config.minScoreThreshold}%",
        "Extra Filters",
        "Only notify if title contains",
        "Never notify if title contains",
        "Minimum Salary",
        "K/year",
        "Remote Only",
        "Favorite Companies",
        "Companies to Skip",
        "e.g., Senior, Lead, Staff",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/CommandPalette.tsx",
      [
        'navigation: "Navigation"',
        'ui: "Interface"',
        ">to navigate<",
        ">to select<",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/KeyboardShortcutsHelp.tsx",
      [
        "title: 'Navigation'",
        "title: 'Job Actions'",
        "title: 'Global'",
        "title: 'Filters & Search'",
        "description: 'Toggle bookmark'",
        "description: 'Toggle selection'",
        'title="Keyboard Shortcuts"',
        "Keyboard shortcuts reference",
        "Use <ShortcutKey>?</ShortcutKey> anytime",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/contexts/KeyboardShortcutsContext.tsx",
      [
        'description: "Go to Market"',
        'description: "Show keyboard shortcuts help"',
        'description: "Focus search / filter"',
        'description: "Submit current form"',
        'description: "Create new item"',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/AnalyticsPanel.tsx",
      [
        "Application Funnel",
        "No funnel data yet",
        "Performance by Job Source",
        "Application Analytics",
        "Status Distribution",
        "Responses by Job Source",
        "Average Response Time",
        "Company Response Times",
        "Detailed Status Breakdown",
        "No analytics data available",
        "Download analytics data",
        "Close analytics",
        "Analytics error",
        "Loading analytics",
        "job-analytics",
        "Failed to fetch analytics",
        "{source.count} apps · {source.response_rate.toFixed(0)}% response",
        "Weekly Application Goal",
        "Goal achieved this week!",
        "Failed to load analytics data. Please try again.",
        "Could not load application summary. Please try again.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(root, "src/pages/DashboardUI/filterLabels.ts", "Weakest Match First\n");
    writeFixtureFile(
      root,
      "src/pages/DashboardUI/DashboardFiltersBar.tsx",
      [
        "Use AND for words that must both appear",
        "Start with a minus sign to leave out a word: -intern",
        'placeholder="Min $K"',
        'aria-label="Minimum salary in thousands"',
        'label: source === "all" ? "All Sources" : source',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ScreeningAnswersForm.tsx",
      [
        "<code>{a.questionPattern}</code>",
        "{Math.round(a.confidenceScore * 100)}% confident",
        "Modified {a.timesModified}× ({Math.round((a.timesModified / a.timesUsed) * 100)}%)",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ScreeningAnswerSuggestions.tsx",
      [
        "Smart Suggestions",
        "Based on your history",
        "{confidencePercent}% confident",
        "(modified {Math.round(suggestion.modificationRate * 100)}%)",
        "Failed to load suggestions",
        'setError("Could not load saved answers");',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ApplyButton.tsx",
      "CAPTCHA detected\nForm preparation error\nForm preparation failed\n",
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ApplicationPreview.tsx",
      "CAPTCHA verification (if present)\n",
    );
    writeFixtureFile(
      root,
      "docs/features/application-assist.md",
      [
        "### CAPTCHA Keeps Appearing",
        "Require manual approval",
        "Complete CAPTCHA verification yourself.",
        "- It does not solve CAPTCHAs.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/user/DEEP_LINKS.md",
      [
        "## Privacy And Source Boundaries",
        "JobSentinel does not collect session cookies.",
        "JobSentinel does not monitor directly.",
        "Some sites limit background collection.",
        "- Rate limiting",
        "JobSentinel does not bypass CAPTCHA, login, or anti-bot controls",
        "- CAPTCHA challenges",
        "| Login and CAPTCHA | Handled by you on the site | Not bypassed |",
        "| Best for | Sites with login, anti-bot, or policy limits |",
        "[developer guide](../developer/ADDING_DEEP_LINK_SITES.md)",
        "Contributors can also add sites in code",
        "Browser extension integration",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      [
        "Yes. JobSentinel is free and MIT licensed.",
        "Look for the Assets section.",
        "<summary><strong>For developers: build from source</strong></summary>",
        "<summary><strong>For contributors</strong></summary>",
        "<summary><strong>Need developer setup?</strong></summary>",
        "[Developer Setup](../developer/GETTING_STARTED.md)",
        "Developers can build locally after installing Node, Rust, and the Tauri requirements.",
        "npm run tauri:build",
        "Stale, reposted, or low-trust postings",
        "scan allowed sources immediately",
        "### Ghost Job Detection",
        "force a refresh",
        "Look for the download list on the newest release.",
        "<summary><strong>Optional: build it yourself</strong></summary>",
        "developer tools and commands",
        "https://api.slack.com/messaging/webhooks",
        "<summary><strong>Advanced: where JobSentinel saves local files</strong></summary>",
        "<summary><strong>Support file locations</strong></summary>",
        "%LOCALAPPDATA%\\JobSentinel\\jobs.db",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/job-source-status.md",
      [
        "Source health must follow the same source boundaries as adapters.",
        "Use rate limits and bounded response reads.",
        "## Implementation Notes",
        "## Verification",
        "Prefer official APIs, public feeds, and official company or ATS postings.",
        "Do not add hidden endpoint checks.",
        "Do not attempt CAPTCHA bypass or platform-control evasion.",
        "HN Who's Hiring",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/job-sources.md",
      [
        "# Job Source Adapters",
        "public, bounded source adapters",
        "hidden LinkedIn endpoints",
        "HTML, RSS, JSON",
        "## Adapter Flow",
        "SHA256(",
        "public ATS APIs such as Greenhouse",
        "understand HTTP, selectors, credentials, or logs",
        "Public JSON endpoint",
        "Public job endpoint",
        "Best-effort public source; anti-bot prone",
        "This reduces duplicate postings across ATS feeds",
        "Scheduled adapters",
        "Source-check adapters",
        "Representative adapter limits",
        "bounded HTTP request",
        "parse into normalized jobs",
        "deduplicate",
        "Configured source",
        "source-policy check",
        "record health metadata",
        "Health And Diagnostics",
        "User-Configured External Sources",
        "local metadata only",
        "HN Who's Hiring",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/utils/errorMessages.ts",
      [
        "Something Went Wrong",
        "An unexpected error occurred.",
        "Bot Detection Triggered",
        "The website thinks you're a bot and blocked the request.",
        "This is a safety measure. Reduce search frequency or try again later.",
        "Notification Setup Failed",
        "Slack Notification Failed",
        "Discord Notification Failed",
        "Teams Notification Failed",
        "Email Notification Failed",
        "Reminder Setup Failed",
        "Resume Analysis Problem",
        "The resume analysis service had a problem.",
        "No resume has been uploaded yet.",
        "Upload your resume in the Resume section.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      'Basic Settings\nMore Settings\nTurn this on to never miss a new posting.\nAuto-scan job boards\nCompany preference (if configured)\nEmail provider details\nProvider address\nProvider number\nUse this only if your provider gives you manual email details\nOptional USAJobs auto-check\nAutomatic USAJobs checks contact USAJobs\nautomatic\nUSAJobs checks\nTurn Remote OK automatic checks on or off\nSave failed\nTest failed\nsaved connection detail(s) failed to save\nShare ${savedFile.fileName} only if you want help\nRecommended for you\nonClick={rec.enable}>Enable</button>\nRestart JobSentinel\nTroubleshooting\n<HelpIcon text="If something is not working, these details can help explain what happened." />\nHacker News Who\'s Hiring\nTurn Hacker News hiring post checks on or off\n',
    );
    writeFixtureFile(
      root,
      "docs/features/notifications.md",
      [
        "Email provider details",
        "Create New App",
        "From Scratch",
        "secure credential manager",
        "Legacy plain-text fields",
        "channel is **enabled**",
        "verify the connection",
        "bot an admin",
        "manual provider setup",
        "private connection link",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ApplicationProfilePage.tsx",
      "Failed to load application history\nRestart JobSentinel\nMarked Sent\nReady to Send\nSubmission Rate\n",
    );
    writeFixtureFile(
      root,
      "src/pages/Dashboard.tsx",
      [
        "<li>Source: {filters.sourceFilter}</li>",
        "<span>{job.source}</span>",
        "Min salary: ${filters.salaryMinFilter}K",
        "Max salary: ${filters.salaryMaxFilter}K",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/CoverLetterTemplates.tsx",
      [
        "Available placeholders (click to insert):",
        "<button>{placeholder}</button>",
        "Remember to replace the placeholders",
        "Check for [bracketed] placeholders that need manual editing",
        "Failed to Load Templates",
        "Failed to copy",
        "Please try again",
        "Copied to clipboard",
        "Template filled and copied!",
        "Check any bracketed blanks before sending",
        "",
      ].join("\n"),
    );
    writeFixtureFile(root, "src/features/market/MarketPage.tsx", "Failed to Load Market Data\n");
    writeFixtureFile(
      root,
      "src/components/CompanyResearchPanel.tsx",
      [
        "Information about TestCo is being gathered. Check back later for more details.",
        "Request timed out. The company lookup is taking too long.",
        "Failed to load company information",
        "Taking longer than expected...",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/market/MarketSnapshotCard.tsx",
      [
        'aria-label={`Market sentiment: ${snapshot.market_sentiment}`}',
        "<span>{snapshot.market_sentiment}</span>",
        "<p>Market Sentiment</p>",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/market/MarketSnapshotCard.test.tsx",
      "expect(screen.getByRole('status', { name: /market sentiment: bullish/i })).toBeInTheDocument();\n",
    );
    writeFixtureFile(
      root,
      "src/components/AsyncButton.tsx",
      'toast.success("Success", successMessage);\ntoast.error("Error", errorMessage || safeMessage);\ntoast.error("Something went wrong", errorMessage || safeMessage);\nerrorMessage="Failed to delete job"\n',
    );
    writeFixtureFile(
      root,
      "src/utils/sourceLabels.ts",
      'hn_hiring: { label: "Who\'s Hiring thread" }\n',
    );
    writeFixtureFile(
      root,
      "src/services/aiGateway.ts",
      [
        "External AI transport is not configured.",
        "External AI is disabled by default. Enable it before sending data.",
        "External AI provider must be selected before sending data.",
        "External AI sending is not set up.",
        "Payload preview is required before any external AI request.",
        "User approval is required before any external AI request.",
        "Full database payloads must never be sent to external AI providers.",
        "Sensitive data requires explicit user selection and sensitive-payload opt-in.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/utils/safeErrorCopy.ts",
      'const GENERIC_ERROR_TITLE = "Something Went Wrong";\n',
    );
    writeFixtureFile(
      root,
      "src/utils/errorHelpers.ts",
      [
        "Network connection issue.",
        "Service temporarily unavailable.",
        "Invalid input.",
        "Data format error.",
        "The requested resource was not found.",
        "You do not have permission to access this.",
        "Request timed out.",
        "Please try again later.",
        "This took too long. Please try again.",
        "JobSentinel ran into a problem. Please try again.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/utils/formValidation.ts",
      "URL must use http:// or https://\nURL must not include credentials\nQuestion match has unsupported pattern symbols. Check brackets or special characters.\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/error.rs",
      [
        "pub fn user_message(&self) -> String {",
        "  \"CAPTCHA detected. Please complete the challenge in your browser.\".to_string()",
        "  \"Request timed out after 30 seconds. Please check your connection.\".to_string()",
        "}",
        "/// Sanitize URL for display",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/automation/error.rs",
      [
        "pub fn user_message(&self) -> String {",
        "  \"Failed to launch browser. Please ensure Chrome is installed.\".to_string()",
        "  \"An automation error occurred. Please try again.\".to_string()",
        "}",
        "/// Sanitize URL for display",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/ScoreBreakdownModal.tsx",
      "Company preference (if configured)\nconfigured preferences\n",
    );
    writeFixtureFile(
      root,
      "src/components/ErrorLogPanel.tsx",
      "Save Extra Support Details\nSave extra app details (support only)\nUse this only if a maintainer asks.\n",
    );
    writeFixtureFile(
      root,
      "docs/features/saved-secrets.md",
      "save a safe support report so maintainers can fix it\n",
    );
    writeFixtureFile(
      root,
      "docs/user/DEEP_LINKS.md",
      "GitHub is optional for maintainers and contributors:\n",
    );
    writeFixtureFile(
      root,
      "README.md",
      "GitHub is optional. Maintainers and contributors can\nDownload the latest installer from [GitHub Releases]\nLocal SQLite storage\nYour OS credential store\n| Support sharing links | GitHub issue pages and Google Drive folders |\nHN Who's Hiring\n",
    );
    writeFixtureFile(
      root,
      "src/components/feedback/SubmitOptions.tsx",
      "Optional maintainer issue\nSend to maintainers (optional)\nOpen GitHub (Optional)\nOpen GitHub Help Page\n",
    );
    writeFixtureFile(
      root,
      "src/components/feedback/SuccessScreen.tsx",
      "Your feedback report has been saved:\nThe issue page keeps replies and updates in one place.\nReview the issue, then submit it.\n",
    );
    writeFixtureFile(
      root,
      "src/pages/DashboardUI/noJobsEmptyStateCopy.ts",
      "pay floor\n",
    );
    writeFixtureFile(root, "src/components/JobCard.tsx", "Below your pay floor\n");
    writeFixtureFile(
      root,
      "src/components/jobCardGuidance.ts",
      "Below your pay floor\n",
    );
    writeFixtureFile(
      root,
      "src/pages/DashboardUI/DashboardHeader.tsx",
      "Currently scanning job boards\nReady to scan\nScanning job boards\nScanning...\nAuto-refresh in 5m\n",
    );
    writeFixtureFile(
      root,
      "src/pages/Dashboard.tsx",
      'Scanning job boards...\nScan complete!\ntoast.error("Failed to open link", "Unable to open the job link")\nFailed to load company research\n',
    );
    writeFixtureFile(
      root,
      "src/components/JobCard.tsx",
      'toast.error("Failed to open link", "Unable to open the job link")\n',
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ApplicationPreview.tsx",
      "No profile configured. Please set up your application profile first.\nResume upload (select your file)\n",
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ProfileForm.tsx",
      [
        "Require manual approval",
        "Daily application review limit",
        "Daily review limit:",
        '<option value="50">50</option>',
        "Failed to load profile",
        "Failed to select file",
        "Please fix the errors",
        "Failed to save",
        "Taking longer than expected...",
        "Select your resume file (PDF or DOCX) for application review",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ScreeningAnswersForm.tsx",
      "Dropdown selection\nPlease fix the errors\nFailed to load answers\nPlease try again\n",
    );
    writeFixtureFile(
      root,
      "src/components/InterviewScheduler.tsx",
      'fallbackTitle: "Failed to load interviews"\nMark as Complete\n>Failed<\nDid not go well\nfeedbackOutcome.charAt(0).toUpperCase()\nInterview Outcome:\n',
    );
    writeFixtureFile(
      root,
      "src/pages/DashboardUI/noJobsEmptyStateCopy.ts",
      "Scan allowed sources\nLocal checks run on your schedule\npay floor\n",
    );
    writeFixtureFile(
      root,
      "src/pages/Applications.tsx",
      "{reminder.reminder_type} - Due: {formatEventDate(reminder.reminder_time)}\nYour applications list failed to load\nStatus update failed\nRestart JobSentinel\nMove cards between columns, or use Space and arrow keys to update status\n>Analytics<\n",
    );
    writeFixtureFile(
      root,
      "src/pages/dashboardErrorCopy.ts",
      "Job Search Failed\n",
    );
    writeFixtureFile(
      root,
      "src/hooks/useFeedback.ts",
      "Failed to load system information\nPlease try again or copy the report instead\nCould not open GitHub. Please save a safe support report instead.\n",
    );
    writeFixtureFile(
      root,
      "src/utils/api.ts",
      "Operation Failed\nAn error occurred\nSupport details:\n",
    );
    writeFixtureFile(
      root,
      "src/pages/hooks/useDashboardJobOps.ts",
      "Undo failed\nRedo failed\nBookmark Failed\nBulk Hide Failed\nBulk Bookmark Failed\nBulk Merge Failed\n3 failed\nCouldn't update bookmark. Try again.\nTry refreshing.\nrefresh and try again\nrestart the app\nNone of the duplicate groups could be merged. Try merging them individually.\n",
    );
    writeFixtureFile(
      root,
      "src/contexts/UndoContext.tsx",
      "Undo failed\nRedo failed\nTry refreshing if the change looks wrong.\n",
    );
    writeFixtureFile(
      root,
      "src/pages/hooks/useDashboardAutoRefresh.ts",
      "Auto-refreshing...\nScanning for new jobs\nJob scanning has failed 3 times in a row. Check your connection or try a manual search.\nJobSentinel couldn't check for new jobs automatically. Check your connection, then click Search Now.\n",
    );
    writeFixtureFile(
      root,
      "src/utils/errorMessages.ts",
      [
        "Something Went Wrong",
        "An unexpected error occurred.",
        "Too Many Requests",
        "You've made too many requests to this job board.",
        "Consider increasing the delay between searches.",
        "configured channel",
        "Data Relationship Error",
        "title: 'Invalid Email'",
        "Permission Denied",
        "Resume Parsing Failed",
        "Notification Setup Failed",
        "Slack Notification Failed",
        "Discord Notification Failed",
        "Teams Notification Failed",
        "Email Notification Failed",
        "Reminder Setup Failed",
        "Document Too Large",
        "too long for processing",
        "Try refreshing your job list.",
        "restart the app",
        "contact support",
        "action: 'Check your internet connection and try again.'",
        "system date/time",
        "system date and time",
        "Try again in 10-15 minutes",
        "action: 'Check your notification settings and try again.'",
        "Website Format Changed",
        "Job Source Disabled",
        "This job board is currently disabled in your settings.",
        "Open Settings, choose More Settings, then View Job Sources.",
        "This job board has stopped accepting more requests today.",
        "Security Certificate Issue",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Open Settings, choose **More Settings**.\nFollow the provider guidance shown in JobSentinel.\nJobSentinel is now watching the allowed sources you enabled.\nHere's what happens automatically:\n",
    );
    writeFixtureFile(
      root,
      "src/components/AtsLiveScorePanel.tsx",
      [
        "analyzing...",
        ">Job Context<",
        "View Full Analysis",
        "Format Issues",
        "<Badge>{issue.severity}</Badge>",
        "Fix: {issue.fix}",
        "Impact: {suggestion.impact}",
        "Include technical, workplace, and role-specific skills",
        "Add words from the job post",
        'ScoreBar label="Complete"',
        'ScoreCard label="Completeness"',
        ">View Details<",
        "Full Resume Readability Review",
        "{analysis.missing_keywords.length} missing",
        "{analysis.format_issues.length} issues",
        "Checks Worked",
        "Check Time",
        "Last Worked",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/resume/ats_analyzer.rs",
      [
        'impact: "High".to_string(),',
        'suggestion: format!("Start bullet with action verb: {}", bullet),',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/NotificationPreferences.tsx",
      'placeholder="e.g., 90"\nthousand per year\n',
    );
    writeFixtureFile(
      root,
      "src/components/ErrorLogPanel.tsx",
      "Advanced: Save Support Details\nSave Extra Support Details\nSave Detailed Local Report\n",
    );
    writeFixtureFile(
      root,
      "docs/features/browser-import.md",
      "choose another port in advanced settings\nadvanced connection settings\nafter restarting JobSentinel\nIf support asks, open **Connection settings**\nlocal safety code\nDebug reports must redact\n",
    );

    assertTechnicalFirstCopy(root, [
      "README.md",
      "docs/features/browser-import.md",
      "docs/features/saved-secrets.md",
      "docs/features/notifications.md",
      "docs/features/application-assist.md",
      "docs/features/job-source-status.md",
      "docs/features/job-sources.md",
      "docs/features/smart-scoring.md",
      "docs/user/DEEP_LINKS.md",
      "docs/user/QUICK_START.md",
      "src-tauri/src/core/automation/error.rs",
      "src-tauri/src/core/resume/ats_analyzer.rs",
      "src-tauri/src/core/scrapers/error.rs",
      "src/components/AnalyticsPanel.tsx",
      "src/components/AsyncButton.tsx",
      "src/components/AtsLiveScorePanel.tsx",
      "src/components/BookmarkletGenerator.tsx",
      "src/components/CommandPalette.tsx",
      "src/components/CompanyResearchPanel.tsx",
      "src/components/CoverLetterTemplates.tsx",
      "src/components/ErrorLogPanel.tsx",
      "src/components/JobCard.tsx",
      "src/components/JobImportModal.tsx",
      "src/components/KeyboardShortcutsHelp.tsx",
      "src/features/market/MarketSnapshotCard.test.tsx",
      "src/features/market/MarketSnapshotCard.tsx",
      "src/components/NotificationPreferences.tsx",
      "src/components/ScoreBreakdownModal.tsx",
      "src/features/application-assist/ApplicationPreview.tsx",
      "src/features/application-assist/ApplyButton.tsx",
      "src/features/application-assist/ProfileForm.tsx",
      "src/features/application-assist/ScreeningAnswerSuggestions.tsx",
      "src/features/application-assist/ScreeningAnswersForm.tsx",
      "src/components/feedback/SubmitOptions.tsx",
      "src/components/jobCardGuidance.ts",
      "src/contexts/KeyboardShortcutsContext.tsx",
      "src/contexts/UndoContext.tsx",
      "src/hooks/useFeedback.ts",
      "src/features/application-assist/ApplicationProfilePage.tsx",
      "src/pages/Applications.tsx",
      "src/pages/Dashboard.tsx",
      "src/pages/DashboardUI/DashboardFiltersBar.tsx",
      "src/pages/DashboardUI/DashboardHeader.tsx",
      "src/pages/DashboardUI/filterLabels.ts",
      "src/pages/DashboardUI/noJobsEmptyStateCopy.ts",
      "src/components/InterviewScheduler.tsx",
      "src/features/market/MarketPage.tsx",
      "src/pages/ResumeOptimizer.tsx",
      "src/pages/Settings.tsx",
      "src/pages/SetupWizard.tsx",
      "src/pages/dashboardErrorCopy.ts",
      "src/pages/hooks/useDashboardAutoRefresh.ts",
      "src/pages/hooks/useDashboardJobOps.ts",
      "src/services/aiGateway.ts",
      "src/utils/api.ts",
      "src/utils/errorHelpers.ts",
      "src/utils/errorMessages.ts",
      "src/utils/export.test.ts",
      "src/utils/export.ts",
      "src/utils/formValidation.ts",
      "src/utils/safeErrorCopy.ts",
      "src/utils/sourceLabels.ts",
    ]);
    assertNoTechnicalFirstCopy(root, ["src/pages/Settings.test.tsx"]);
  });
});
