import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasFeedbackSetupJargon,
  hasTechnicalFirstUserCopy,
} from "../../harness/checks/product-copy.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(
    join(tmpdir(), "jobsentinel-product-copy-support-docs-"),
  );

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("product copy rejects support troubleshooting jargon", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/settings/SettingsPage.tsx",
      "These logs can help diagnose it.\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/sources/browser-import/BrowserImportSection.tsx",
      "Advanced connection settings\nlocal safety code\nIf this feels hard\nblock page import\nAllow clipboard access and try again.\nwhen JobSentinel restarts\nSupport settings\nSupport number\nHelp-only settings\nunless a support reply asks\nImport Helper\nAdvanced browser button setting\nBrowser helper number\nTurn on the import helper above\nbrowser import settings\nbrowser import connection\nCould not update browser import\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/bookmarklet.rs",
      '"Could not copy browser button. Allow clipboard access and try again.".to_string()\nalert("Turn on the import helper in Settings.")',
    );
    writeFixtureFile(
      root,
      "docs/features/browser-import.md",
      "Turn on the import helper.\nPrefer import helper in user-facing copy.\nOpen Connection settings.\n",
    );
    writeFixtureFile(
      root,
      "src/features/search-links/SearchLinksPage.tsx",
      "JobSentinel does not monitor directly.\nLogin required\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/support/feedback/DebugInfoPreview.tsx",
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
      "src/features/settings/support/feedback/feedbackReportFormatting.ts",
      [
        'const DEBUG_DETAIL_LABELS = { event: "Event" };',
        "${errors.length - MAX_FRONTEND_ERRORS_IN_REPORT} older frontend errors omitted.",
        "Support-only details:",
        "SUPPORT DETAILS",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
      ">Page Check<\n>Access<\n>Source Type<\n>Can Read Jobs<\n>Not needed<\nRecent Success\n>Issue<\nChecks Worked\nCheck Time\nLast Worked\n{scraper.success_rate_24h.toFixed(0)}%\nCheck All Sources\nOfficial feed\nreturn \"Feed\"\n(retry ${retryAttempt})\nSource Controls\nJob Source Check Results\nSource Check Results\nNeeds update\n'Turn this source off'\n'Check this source now'\n",
    );

    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/features/settings/SettingsPage.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/settings/sources/browser-import/BrowserImportSection.tsx",
      ),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src-tauri/src/ipc/bookmarklet.rs"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/features/search-links/SearchLinksPage.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/settings/support/feedback/DebugInfoPreview.tsx",
      ),
      true,
    );
    assert.equal(
      hasFeedbackSetupJargon(
        root,
        "src/features/settings/support/feedback/feedbackReportFormatting.ts",
      ),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
      ),
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
      "src/features/onboarding/SetupWizard.tsx",
      "Nothing is sent anywhere unless you set up notifications.\nHacker News hiring posts",
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Everything stays on your computer. No cloud, no accounts, no tracking.",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/user/DEEP_LINKS.md"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/onboarding/SetupWizard.tsx",
      ),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/user/QUICK_START.md"),
      true,
    );
  });
});

test("product copy rejects technical provider setup shortcuts", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/settings/SettingsPage.tsx",
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
        "crates/jobsentinel-notifications/src/",
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

    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/features/settings/SettingsPage.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/notifications.md"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/saved-secrets.md"),
      true,
    );
  });
});

test("product copy rejects market-intel jargon in hiring trends surfaces", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/app/Navigation.tsx", "Market Intel\n");
    writeFixtureFile(
      root,
      "src/features/market/MarketHeader.tsx",
      "Market Intelligence\nRefresh Market Data\n",
    );
    writeFixtureFile(
      root,
      "src/features/market/MarketPanels.tsx",
      '"Market Alerts"\n',
    );
    writeFixtureFile(
      root,
      "src/features/market/MarketPage.tsx",
      "Failed to Load Market Data\n",
    );
    writeFixtureFile(
      root,
      "src/features/market/errorCopy.ts",
      "Market data unavailable\n",
    );
    writeFixtureFile(
      root,
      "src/features/market/MarketSnapshotCard.tsx",
      "No market snapshot yet. Refresh market data to create one.\n",
    );
    writeFixtureFile(
      root,
      "src/features/market/MarketAlertCard.tsx",
      "Loading market alerts\nNo market alerts at this time.\n",
    );
    writeFixtureFile(
      root,
      "src/features/market/LocationHeatmap.tsx",
      "Job Market by Location\nNo location data yet\n",
    );
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

    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/app/Navigation.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/features/market/MarketHeader.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/features/market/MarketPanels.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/features/market/MarketPage.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/features/market/errorCopy.ts"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/market/MarketSnapshotCard.tsx",
      ),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/market/MarketAlertCard.tsx",
      ),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/market/LocationHeatmap.tsx",
      ),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/hiring-trends.md"),
      true,
    );
  });
});
