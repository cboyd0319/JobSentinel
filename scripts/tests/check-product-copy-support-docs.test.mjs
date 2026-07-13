import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasFeedbackSetupJargon,
  hasTechnicalFirstUserCopy,
} from "../harness/checks/product-copy.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-product-copy-support-docs-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("product copy rejects support troubleshooting jargon", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/pages/Settings.tsx", "These logs can help diagnose it.\n");
    writeFixtureFile(
      root,
      "src/components/BookmarkletGenerator.tsx",
      "Advanced connection settings\nlocal safety code\nIf this feels hard\nblock page import\nAllow clipboard access and try again.\nwhen JobSentinel restarts\nSupport settings\nSupport number\nHelp-only settings\nunless a support reply asks\nImport Helper\nAdvanced browser button setting\nBrowser helper number\nTurn on the import helper above\nbrowser import settings\nbrowser import connection\nCould not update browser import\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/bookmarklet.rs",
      '"Could not copy browser button. Allow clipboard access and try again.".to_string()\nalert("Turn on the import helper in Settings.")',
    );
    writeFixtureFile(
      root,
      "docs/features/browser-import.md",
      "Turn on the import helper.\nPrefer import helper in user-facing copy.\nOpen Connection settings.\n",
    );
    writeFixtureFile(
      root,
      "src/components/DeepLinkGenerator.tsx",
      "JobSentinel does not monitor directly.\nLogin required\n",
    );
    writeFixtureFile(
      root,
      "src/components/feedback/DebugInfoPreview.tsx",
      [
        "Helps troubleshoot faster.",
        "JobSentinel removes private details before sharing.",
        "Private details are removed before the file is created.",
        "RECENT APP PROBLEMS (private details removed)",
        "Removed before sharing: local file paths.",
        "Saves a sanitized report on your computer.",
        "Job titles, company names, search words, and personal details are not included.",
        "... and {debugEvents.length - 10} more events",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/services/feedbackService.ts",
      [
        'const DEBUG_DETAIL_LABELS = { event: "Event" };',
        '${errors.length - MAX_FRONTEND_ERRORS_IN_REPORT} older frontend errors omitted.',
        "Support-only details:",
        "SUPPORT DETAILS",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/ScraperHealthDashboard.tsx",
      ">Page Check<\n>Access<\n>Source Type<\n>Can Read Jobs<\n>Not needed<\nRecent Success\n>Issue<\nChecks Worked\nCheck Time\nLast Worked\n{scraper.success_rate_24h.toFixed(0)}%\nCheck All Sources\nOfficial feed\nreturn \"Feed\"\n(retry ${retryAttempt})\nSource Controls\nJob Source Check Results\nSource Check Results\nNeeds update\n'Turn this source off'\n'Check this source now'\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Settings.tsx"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/BookmarkletGenerator.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src-tauri/src/commands/bookmarklet.rs"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/DeepLinkGenerator.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/feedback/DebugInfoPreview.tsx"),
      true,
    );
    assert.equal(hasFeedbackSetupJargon(root, "src/services/feedbackService.ts"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/ScraperHealthDashboard.tsx"),
      true,
    );
  });
});

test("product copy rejects troubleshooting headings in user docs", () => {
  withFixture((root) => {
    const docs = [
      "docs/user/QUICK_START.md",
      "docs/user/DEEP_LINKS.md",
      "docs/features/user-data-management.md",
      "docs/features/application-assist.md",
      "docs/features/notifications.md",
      "docs/features/job-sources.md",
    ];

    for (const docPath of docs) {
      writeFixtureFile(
        root,
        docPath,
        [
          "## Troubleshooting",
          "| Troubleshooting | Plain-language next steps |",
          "",
        ].join("\n"),
      );
      assert.equal(hasTechnicalFirstUserCopy(root, docPath), true);
    }
  });
});

test("product copy rejects GitHub-first support and overbroad privacy copy", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      [
        "[Report a problem](https://github.com/cboyd0319/JobSentinel/issues/new)",
        "- Found a bug? [Open an issue](https://github.com/cboyd0319/JobSentinel/issues/new).",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/user/DEEP_LINKS.md",
      [
        "If you notice a broken link, save a safe support report and share it only if you want help:",
        "<https://github.com/cboyd0319/JobSentinel/issues>",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/SetupWizard.tsx",
      "Nothing is sent anywhere unless you set up notifications.\nHacker News hiring posts",
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Everything stays on your computer. No cloud, no accounts, no tracking.",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/user/DEEP_LINKS.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/SetupWizard.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/user/QUICK_START.md"), true);
  });
});

test("product copy rejects technical provider setup shortcuts", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      [
        "Message @BotFather to create a private alert bot.",
        "Use desktop or email alerts unless you already use Telegram for automatic alerts.",
        "Telegram chat number",
        "Telegram destination number",
        "Paste the destination number Telegram shows for the chat that should receive alerts.",
        "In Telegram, message @BotFather, send /newbot.",
        "In Telegram, message @userinfobot and copy the ID it shows.",
        "Quick Setup (2 minutes)",
        "Get USAJobs Access Code",
        "USAJobs uses a free access code.",
        "Looks up your approximate city from your internet address. Not saved unless added.",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/notifications.md",
      [
        'They may call it an "incoming webhook" in their settings.',
        "Advanced setup for Telegram bot users",
        "By default, alert match strength is source-specific.",
        "Optional alerts may include match score.",
        "Each job source has its own alert selectivity.",
        "Use desktop or email alerts unless you already know how to create a Telegram bot.",
        "Create a Telegram bot",
        "Add your Telegram alert bot to a group or channel",
        "Add the Telegram chat details shown by your Telegram setup",
        'Telegram says "chat not found"?',
        "Make sure the bot is added to your group/channel",
        "Give the bot permission to post there",
        "Slack Advanced Chat Setup",
        'Click "Add New Webhook to Workspace"',
        "Advanced Sending Server Reference",
        "Native OS notifications",
        "System notification daemon alerts",
        "https://api.slack.com/messaging/webhooks",
        "Message [@BotFather]",
        "Find the Telegram chat number",
        "email provider",
        "| Provider | Server | Port |",
        "All connections use TLS/STARTTLS encryption",
        "Maintainer Notes",
        "Alert delivery details",
        "Parallel Sending",
        "Connection Link Checks",
        "Module Structure",
        "src-tauri/src/core/notify/",
        "https://hooks.slack.com/services/...",
        "https://discord.com/api/webhooks/...",
        "https://discordapp.com/api/webhooks/...",
        "https://outlook.office.com/webhook/...",
        "https://outlook.office365.com/webhook/...",
        "Telegram Bot API",
        "For developers and the curious",
        "Webhooks are validated before sending:",
        "Manual Email Server Reference",
        "Server Settings > Integrations",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/saved-secrets.md",
      [
        "| Credential | Storage key | Used for |",
        "| Slack webhook URL | jobsentinel_slack_webhook | Slack notifications |",
        "| Discord webhook URL | jobsentinel_discord_webhook | Discord notifications |",
        "| Microsoft Teams webhook URL | jobsentinel_teams_webhook | Teams notifications |",
        "| Email SMTP password | jobsentinel_smtp_password | Email alerts |",
        "Credential values stay local",
        "whether a credential exists",
        "Plaintext config credential fields",
        "webhook URLs",
        "API keys",
        "Credential command logs",
        "`config.json`, localStorage",
        "accidental commits, backup tools, or diagnostic bundles",
        "local app config or SQLite",
        "command line in the developer reference",
        "Invalid key | App sent an unsupported saved-detail name",
        "Developer Reference",
        "Storage Names",
        "Frontend Integration",
        "Advanced Linux Keyring Check",
        "Secret Service provider",
        "CredentialKey",
        "store_credential",
        "jobsentinel_slack_webhook",
        "compatibility and diagnostics",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Settings.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/notifications.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/saved-secrets.md"), true);
  });
});

test("product copy rejects market-intel jargon in hiring trends surfaces", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/app/Navigation.tsx", "Market Intel\n");
    writeFixtureFile(root, "src/features/market/MarketHeader.tsx", "Market Intelligence\nRefresh Market Data\n");
    writeFixtureFile(root, "src/features/market/MarketPanels.tsx", '"Market Alerts"\n');
    writeFixtureFile(root, "src/features/market/MarketPage.tsx", "Failed to Load Market Data\n");
    writeFixtureFile(root, "src/features/market/errorCopy.ts", "Market data unavailable\n");
    writeFixtureFile(root, "src/features/market/MarketSnapshotCard.tsx", "No market snapshot yet. Refresh market data to create one.\n");
    writeFixtureFile(root, "src/features/market/MarketAlertCard.tsx", "Loading market alerts\nNo market alerts at this time.\n");
    writeFixtureFile(root, "src/features/market/LocationHeatmap.tsx", "Job Market by Location\nNo location data yet\n");
    writeFixtureFile(
      root,
      "docs/features/hiring-trends.md",
      [
        "# Market Intelligence",
        "Market snapshots",
        "Market alerts",
        "Market data is only as good as the sources.",
        "Skill demand",
        "A term appears more often in monitored postings.",
        "Decide whether it reflects real skill demand or source bias.",
        "Hiring trends are only as good as the sources currently monitored.",
        "job-board bias",
        "Optional notification channels are used only if configured.",
        "Notification delivery is optional and user-configured.",
        "",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src/app/Navigation.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/features/market/MarketHeader.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/features/market/MarketPanels.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/features/market/MarketPage.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/features/market/errorCopy.ts"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/features/market/MarketSnapshotCard.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/features/market/MarketAlertCard.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/features/market/LocationHeatmap.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/hiring-trends.md"), true);
  });
});

test("product copy rejects first-run and Rule 0 privacy drift", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/pages/SetupWizard.tsx", "Career Path\nReview & Edit\nComplete setup wizard\n");
    writeFixtureFile(root, "src/components/CareerProfileSelector.tsx", "My Own Search\nStarts with {profile.keywordsBoost.length} helpful skills\n");
    writeFixtureFile(
      root,
      "README.md",
      "Click Open Anyway.\nNo data is ever sent.\nuser-configured alerts\nmetadata logging\npayload minimization\npayload preview\n",
    );
    writeFixtureFile(
      root,
      "PRIVACY.md",
      [
        "Optional user-configured job-source addresses",
        "These addresses are off unless configured",
        "metadata only",
        "raw titles",
        "raw location",
        "raw local match reasons",
        "raw prompts",
        "Public ATS postings.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "RESPONSIBLE_AI.md",
      "payload minimization\npayload preview\nlocal metadata logging\n",
    );
    writeFixtureFile(root, "docs/user/QUICK_START.md", "Click Run anyway.\nYour data stays yours. Always.\n");
    writeFixtureFile(
      root,
      "SECURITY.md",
      "Works completely offline\nSensitive data never written to disk unencrypted\nemail the maintainer directly or use GitHub's private vulnerability\n",
    );
    writeFixtureFile(
      root,
      "CODE_OF_CONDUCT.md",
      "Instances of unacceptable behavior may be reported by opening an issue or contacting\nthe maintainer directly.\n",
    );
    writeFixtureFile(root, "src/components/ErrorBoundary.tsx", "Your data is safe.\n");

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/SetupWizard.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/CareerProfileSelector.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "PRIVACY.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "RESPONSIBLE_AI.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/user/QUICK_START.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "SECURITY.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "CODE_OF_CONDUCT.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/ErrorBoundary.tsx"), true);
  });
});

test("product copy rejects conflated alert and support channels", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      [
        "| Optional external channels | Slack, Discord, email, GitHub feedback, and Google Drive are user-configured only. |",
        "| External alerts | Slack, Discord, email, GitHub, and Google Drive are user-configured. |",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "PRIVACY.md",
      "Feedback or issue-report sharing through configured GitHub or Google Drive paths.\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "PRIVACY.md"), true);
  });
});

test("product copy rejects technical source labels and unsafe public issue templates", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      [
        "Review before anything is sent",
        "<dt>Endpoint</dt>",
        "<dt>Remote filter</dt>",
        "<dt>Result limit</dt>",
        "Not remote-only",
        "Get optional USAJobs access code",
        "Settings backup saved",
        "Saved passwords and connection codes are left out for safety.",
      ].join("\n"),
    );
    writeFixtureFile(root, ".github/ISSUE_TEMPLATE/bug_report.yml", "Report the bug.\n");
    writeFixtureFile(
      root,
      ".github/ISSUE_TEMPLATE/feature_request.yml",
      [
        "Please don't include personal information.",
        "JobSentinel can create a safe support report that redacts sensitive",
        "details before you share it.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      ".github/ISSUE_TEMPLATE/question.yml",
      [
        "Please don't include personal information.",
        "JobSentinel can create a safe support report that redacts known",
        "sensitive details before you share it.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(root, ".github/ISSUE_TEMPLATE/scraper_issue.yml", "Report a source issue.\n");

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Settings.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, ".github/ISSUE_TEMPLATE/bug_report.yml"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, ".github/ISSUE_TEMPLATE/feature_request.yml"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, ".github/ISSUE_TEMPLATE/question.yml"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, ".github/ISSUE_TEMPLATE/scraper_issue.yml"), true);
  });
});

test("product copy rejects stale zero-technical resume and shortcut copy", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/pages/Resume.tsx",
      "Import Resume Data\nNo Resume Uploaded\nResume uploaded\nUpload Resume\nUpload New\nUploading...\nUploaded:\n",
    );
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      "When enabled, job scores use skills from your uploaded resume.\nUpload your resume in the Resume tab first. If no resume is added, scoring uses your job titles.\n",
    );
    writeFixtureFile(root, "docs/features/smart-scoring.md", "Uploaded resume skills\n");
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizer.tsx",
      [
        "Improve Bullet Point",
        "Improved Version",
        "Could not improve bullet",
        "Tailor Resume for This Job",
        'ScoreItem label="Completeness"',
        "Paste resume details exported from JobSentinel or another supported tool.",
        "Paste resume app export here",
        "Resume app export not recognized",
        "Browser session storage is unavailable. Resume Builder cannot tailor against this job.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/DashboardUI/DashboardFiltersBar.tsx",
      "Navigate: j/k, Open: o/Enter, Hide: h\nj/k/o/h\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Resume.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Settings.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/smart-scoring.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/ResumeOptimizer.tsx"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/pages/DashboardUI/DashboardFiltersBar.tsx"),
      true,
    );
  });
});

test("product copy rejects technical backend error labels", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/errors.rs",
      [
        'Self::Database => "Database Error",',
        'Self::Configuration => "Configuration Error",',
        'Self::Validation => "Invalid Input",',
        'return Some("Database is busy. Close other apps using JobSentinel and try again.");',
        'return Some("SSL certificate error. Check your system clock and network settings.");',
        'return Some("Restart JobSentinel and contact support.");',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/error.rs",
      [
        '"Could not open local job data. Restart JobSentinel and try again."',
        '"contact support"',
        "",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src-tauri/src/commands/errors.rs"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src-tauri/src/core/db/error.rs"), true);
  });
});

test("product copy rejects non-protective no-response labels", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/features/applications/ApplicationsPage.tsx", "Detect Ghosted\n");
    writeFixtureFile(root, "src/components/DashboardWidgets.tsx", 'label="Ghosted"\n');
    writeFixtureFile(root, "src/features/applications/AnalyticsPanel.tsx", 'ghosted: "Ghosted"\n');
    writeFixtureFile(root, "tests/e2e/playwright/application-tracking.spec.ts", '["ghosted", "Ghosted"]\n');
    writeFixtureFile(
      root,
      "docs/features/application-tracking.md",
      "| Ghosted | No response |\nNo response after the configured quiet period.\nSlack, Discord, Teams, SMTP, or other channels are used only if the user configures them.\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src/features/applications/ApplicationsPage.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/DashboardWidgets.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/features/applications/AnalyticsPanel.tsx"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "tests/e2e/playwright/application-tracking.spec.ts"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/application-tracking.md"),
      true,
    );
  });
});

test("product copy rejects technical issue-template support wording", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      ".github/ISSUE_TEMPLATE/bug_report.yml",
      [
        "In JobSentinel, click Settings, then Copy Debug Report.",
        "label: Debug Information",
        "description: Paste the ANONYMIZED debug report from JobSentinel.",
        "label: Steps to reproduce",
        "When I clicked X, I expected Y but got Z instead",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      ".github/ISSUE_TEMPLATE/scraper_issue.yml",
      [
        "name: Scraper Issue",
        "label: Affected Scraper",
        "description: Which job board scraper is affected?",
        "label: Scraper Health Dashboard Output",
        "label: Job source health details",
        "",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, ".github/ISSUE_TEMPLATE/bug_report.yml"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, ".github/ISSUE_TEMPLATE/scraper_issue.yml"),
      true,
    );
  });
});

test("product copy rejects non-advisory resume and pay guidance", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/resume/matcher.rs",
      "Recommendation: Strong match. Apply immediately.\nStudy the missing skills.\nConsider upskilling.\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/resume/ats_analyzer.rs",
      "improved.push_str(\" (add specific metrics)\");\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/salary/analyzer.rs",
      "Excellent offer! Accept or negotiate equity.\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/migrations/00000000000000_initial_schema.sql",
      "I was hoping for a compensation package. Make this an easy decision. I would love to have more skin in the game.\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src-tauri/src/core/resume/matcher.rs"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src-tauri/src/core/resume/ats_analyzer.rs"),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "src-tauri/src/core/salary/analyzer.rs"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src-tauri/migrations/00000000000000_initial_schema.sql"),
      true,
    );
  });
});

test("product copy rejects command-first profile docs", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "examples/profiles/README.md",
      [
        "Pre-configured job search profiles for different career paths. Copy one to use as your starting point.",
        "Start with `examples/config/config.example.json` and fill in your own:",
        "`title_allowlist`: Job titles you're targeting",
        "",
        "### Option 1: Use a Profile Directly",
        "Direct scraping from Greenhouse company pages",
        "**Company (10%)**: (Future: company allowlist)",
        "",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "examples/profiles/README.md"), true);
  });
});
