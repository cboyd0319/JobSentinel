import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { hasTechnicalFirstUserCopy } from "../harness/checks/product-copy.mjs";

import {
  technicalFirstSettingsPaths,
  writeResumeReviewSettingsFixtures,
} from "./product-copy-settings-fixtures.mjs";
function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(
    join(tmpdir(), "jobsentinel-product-copy-settings-"),
  );

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
      "src/features/resumes/matching/ResumeMatchPage.tsx",
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
      "src/features/onboarding/SetupWizard.tsx",
      [
        'placeholder="https://hooks.slack.com/services/..." label="Slack connection link"',
        "Start with in-app alerts now",
        "It only contacts job sources or alert services needed for features you turn on.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/settings/SettingsPage.tsx",
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
    writeFixtureFile(
      root,
      "src/features/settings/SettingsPage.test.tsx",
      "Config imported\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/support/settingsBackupFile.ts",
      "const finalFilename = filename || `jobsentinel-config-${date}.json`;\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/support/settingsBackupFile.test.ts",
      "/^jobsentinel-config-\\d{4}-\\d{2}-\\d{2}\\.json$/\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/sources/browser-import/BrowserImportSection.tsx",
      "Create a new bookmark in your browser (Cmd/Ctrl+D)\nbookmark address field\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/JobImportModal.tsx",
      "Missing details: {preview.missing_fields.join(', ')}\n",
    );
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      "Settings > Advanced Settings\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/notifications/NotificationPreferences.tsx",
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
      "src/app/commands/CommandPalette.tsx",
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
      "src/app/commands/KeyboardShortcutsHelp.tsx",
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
      "src/app/keyboard/KeyboardShortcutsProvider.tsx",
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
      "src/features/applications/AnalyticsPanel.tsx",
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
    writeFixtureFile(
      root,
      "src/features/dashboard/components/filterLabels.ts",
      "Weakest Match First\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/DashboardFiltersBar.tsx",
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
      "src/shared/errorReporting/messages.ts",
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
      "src/features/settings/SettingsPage.tsx",
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
      "src/features/dashboard/DashboardPage.tsx",
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
      "src/features/applications/CoverLetterTemplates.tsx",
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
    writeFixtureFile(
      root,
      "src/features/market/MarketPage.tsx",
      "Failed to Load Market Data\n",
    );
    writeFixtureFile(
      root,
      "src/features/company-research/CompanyResearchPanel.tsx",
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
        "aria-label={`Market sentiment: ${snapshot.market_sentiment}`}",
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
      "src/shared/jobSourceGuidance.ts",
      'hn_hiring: { label: "Who\'s Hiring thread" }\n',
    );
    writeFixtureFile(
      root,
      "src/shared/externalAi/internal/aiGateway.ts",
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
      "src/shared/errorReporting/safeToastCopy.ts",
      'const GENERIC_ERROR_TITLE = "Something Went Wrong";\n',
    );
    writeFixtureFile(
      root,
      "src/shared/validation/contactFieldValidation.ts",
      "URL must use http:// or https://\nURL must not include credentials\n",
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/applicationFormValidation.ts",
      "Question match has unsupported pattern symbols. Check brackets or special characters.\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/credentials/notificationConnectionValidation.ts",
      "Slack webhook must use HTTPS.\n",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/scrapers/error.rs",
      [
        "pub fn user_message(&self) -> String {",
        '  "CAPTCHA detected. Please complete the challenge in your browser.".to_string()',
        '  "Request timed out after 30 seconds. Please check your connection.".to_string()',
        "}",
        "/// Sanitize URL for display",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/automation/error.rs",
      [
        "pub fn user_message(&self) -> String {",
        '  "Failed to launch browser. Please ensure Chrome is installed.".to_string()',
        '  "An automation error occurred. Please try again.".to_string()',
        "}",
        "/// Sanitize URL for display",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/ScoreBreakdownModal.tsx",
      "Company preference (if configured)\nconfigured preferences\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/support/ErrorLogPanel.tsx",
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
      "src/features/settings/support/feedback/SubmitOptions.tsx",
      "Optional maintainer issue\nSend to maintainers (optional)\nOpen GitHub (Optional)\nOpen GitHub Help Page\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/support/feedback/SuccessScreen.tsx",
      "Your feedback report has been saved:\nThe issue page keeps replies and updates in one place.\nReview the issue, then submit it.\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/noJobsEmptyStateCopy.ts",
      "pay floor\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/JobCard.tsx",
      "Below your pay floor\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/jobCardGuidance.ts",
      "Below your pay floor\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/DashboardHeader.tsx",
      "Currently scanning job boards\nReady to scan\nScanning job boards\nScanning...\nAuto-refresh in 5m\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/DashboardPage.tsx",
      'Scanning job boards...\nScan complete!\ntoast.error("Failed to open link", "Unable to open the job link")\nFailed to load company research\n',
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/JobCard.tsx",
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
      "src/features/applications/InterviewScheduler.tsx",
      'fallbackTitle: "Failed to load interviews"\nMark as Complete\n>Failed<\nDid not go well\nfeedbackOutcome.charAt(0).toUpperCase()\nInterview Outcome:\n',
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/noJobsEmptyStateCopy.ts",
      "Scan allowed sources\nLocal checks run on your schedule\npay floor\n",
    );
    writeFixtureFile(
      root,
      "src/features/applications/ApplicationsPage.tsx",
      "{reminder.reminder_type} - Due: {formatEventDate(reminder.reminder_time)}\nYour applications list failed to load\nStatus update failed\nRestart JobSentinel\nMove cards between columns, or use Space and arrow keys to update status\n>Analytics<\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/dashboardErrorCopy.ts",
      "Job Search Failed\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/support/feedback/useFeedback.ts",
      "Failed to load system information\nPlease try again or copy the report instead\nCould not open GitHub. Please save a safe support report instead.\n",
    );
    writeFixtureFile(
      root,
      "src/shared/tauri/commandClient.ts",
      "Operation Failed\nAn error occurred\nSupport details:\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/hooks/useDashboardJobOps.ts",
      "Undo failed\nRedo failed\nBookmark Failed\nBulk Hide Failed\nBulk Bookmark Failed\nBulk Merge Failed\n3 failed\nCouldn't update bookmark. Try again.\nTry refreshing.\nrefresh and try again\nrestart the app\nNone of the duplicate groups could be merged. Try merging them individually.\n",
    );
    writeFixtureFile(
      root,
      "src/app/providers/UndoProvider.tsx",
      "Undo failed\nRedo failed\nTry refreshing if the change looks wrong.\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/hooks/useDashboardAutoRefresh.ts",
      "Auto-refreshing...\nScanning for new jobs\nJob scanning has failed 3 times in a row. Check your connection or try a manual search.\nJobSentinel couldn't check for new jobs automatically. Check your connection, then click Search Now.\n",
    );
    writeFixtureFile(
      root,
      "src/shared/errorReporting/messages.ts",
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
    writeResumeReviewSettingsFixtures(root, writeFixtureFile);
    assertTechnicalFirstCopy(root, technicalFirstSettingsPaths);
    assertNoTechnicalFirstCopy(root, [
      "src/features/settings/SettingsPage.test.tsx",
    ]);
  });
});
