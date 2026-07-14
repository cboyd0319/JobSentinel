import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../checks/repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(
    join(tmpdir(), "jobsentinel-repo-bloat-product-copy-"),
  );

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects banned job-search framing", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/application-positioning.md",
      [
        ["bypass", "ATS"].join(" "),
        ["scrape", "LinkedIn"].join(" "),
        ["beat", "the", "algorithm"].join(" "),
        ["mass", "apply"].join(" "),
        ["automate", "applications"].join(" "),
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/features/application-positioning.md"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace banned job-search framing: docs/features/application-positioning.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects technical-first user copy", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "README.md",
      [
        "USAJobs uses a free API key.",
        "<summary><strong>Where is my database?</strong></summary>",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/JobCard.tsx",
      [
        '"Invalid URL"',
        "<SourceIcon />{job.source}",
        '"This job posting URL is not valid or safe to open"',
        '"Unable to open the job posting URL"',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/jobCardGuidance.ts",
      '"Below your pay floor"\n',
    );
    writeFixtureFile(
      root,
      "src/features/applications/CoverLetterTemplates.tsx",
      [
        "setError(errorMsg);",
        "toast.error('Failed to save template', String(error));",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/search-links/SearchLinksPage.tsx",
      [
        "<h2>Deep Link Generator</h2>",
        '"Generate pre-filled search URLs"',
        '"Job Title or Keywords"',
        '"Generate Deep Links"',
        '"Enter a job title and click \\"Generate Deep Links\\""',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/settings/sources/browser-import/BrowserImportSection.tsx",
      [
        '"Browser Bookmarklet"',
        '"Import jobs from any website"',
        '"Paste a job link from any website"',
        '"We\'ll automatically extract the job details."',
        '"Bookmarklet Code"',
        '"Server Port"',
        '"Start Server"',
        '"Paste the code into the URL/Location field"',
        '"Any with Schema.org data"',
        '"Works best with sites that use structured Schema.org JobPosting data."',
        '"Falls back to smart DOM parsing for others."',
        '"Setup code is hidden because it is long and includes a local safety token."',
        '"The job will be imported automatically"',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/resumes/builder/AtsLiveScorePanel.tsx",
      [
        '"Add LinkedIn profile for tech roles"',
        '"Add missing keywords: TypeScript, scheduling, support"',
        'setError(err instanceof Error ? err.message : "Analysis failed");',
        '<ScoreBar label="Keywords" />',
        '"2 keywords matched"',
        '"Keyword Matches (2)"',
        '"Missing Keywords (2)"',
        '"Consider adding these keywords to improve your match score"',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
      "setError(err instanceof Error ? err.message : String(err));\n",
    );
    writeFixtureFile(
      root,
      "src/features/applications/AnalyticsPanel.tsx",
      'technical_interview: "Technical",\n',
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/DashboardWidgets.tsx",
      '{ name: "Technical", value: appStats.by_status.technical_interview }\n',
    );
    writeFixtureFile(
      root,
      "src/features/applications/InterviewScheduler.tsx",
      '"Technical Interview"\n',
    );
    writeFixtureFile(
      root,
      "src/features/onboarding/CareerProfileSelector.tsx",
      [
        '"Custom Setup"',
        '"I\'ll enter my own job titles and skills"',
        '"Pre-configured with 10 relevant skills"',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/resumes/library/ResumeLibraryPage.tsx",
      [
        "<Button>Import JSON Resume</Button><p>Your JSON Resume has been imported</p>",
        '"Programming Languages"',
        '"Cloud & DevOps"',
        '"Skills Extracted"',
        '"No skills extracted yet"',
        '"Upload a resume to extract skills automatically, or add them manually"',
        '"Recent Match Results"',
        '"Score Breakdown"',
        '"Matched Skills"',
        '"Missing Skills"',
        '"You have all required skills!"',
        '"Gap Analysis"',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/resumes/matching/ResumeMatchPage.tsx",
      [
        '<CardHeader title="Resume Data (JSON)" />',
        "<label>Resume Data in JSON format</label>",
        'toast.error("Invalid resume JSON", "Paste resume JSON that matches the AtsResumeData schema");',
        "<h1>ATS Resume Optimizer</h1>",
        "<p>Optimize your resume for Applicant Tracking Systems</p>",
        "<Button>View Power Words</Button>",
        '<Modal title="ATS Power Words" />',
        '<CardHeader title="Keyword Density Heatmap" />',
        '"= Matched keywords"',
        '"= Missing keywords"',
        '"({required.length} keywords)"',
        '"Opacity indicates keyword frequency."',
        "const message = err instanceof Error ? err.message : String(err);",
        'toast.error("Analysis failed", message);',
        '<ScoreItem label="Keywords" />',
        "<CardHeader title={`Keyword Matches (${analysisResult.keyword_matches.length})`} />",
        "<CardHeader title={`Missing Keywords (${analysisResult.missing_keywords.length})`} />",
        '"Consider adding these keywords to improve your match score"',
        '"These action verbs and keywords are commonly recognized by ATS systems."',
        '"These action verbs are commonly recognized by resume screening tools."',
        '<CardHeader title="Job Description" />',
        '<CardHeader title="Resume Data" />',
        '"Structured resume data"',
        '"Please enter your resume data"',
        '"Resume data not recognized"',
        '"Paste structured resume data exported from JobSentinel or another supported tool."',
        "<Button>Analyze with Job</Button>",
        '"No analysis yet"',
        '"Enter your job description and resume data, then click Analyze"',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ApplyButton.tsx",
      [
        "setFillError(result.errorMessage);",
        'toast.error("Form preparation error", result.errorMessage);',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ScreeningAnswersForm.tsx",
      ['<Select label="Dropdown selection" />', ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/app/errors/ErrorBoundary.tsx",
      '"Copy Debug Report"; "Debug report copied"; "saved jobs and applications stay in the local database";\n',
    );
    writeFixtureFile(
      root,
      "src/features/settings/support/ErrorLogPanel.tsx",
      '"Advanced: Save Support Details";\n',
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/JobImportModal.tsx",
      [
        '"Import Job from URL"',
        '"Job URL"',
        '"This job already exists in your database"',
        '"Failed to preview import"',
        '"Successfully imported"',
        '"Preview Import"',
        "setError(errorMessage);",
        '"Change URL"',
        '"Import Job"',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/ScoreBreakdownModal.tsx",
      '"Job title and keyword matches"\n',
    );
    writeFixtureFile(
      root,
      "src/ui/score-display/ScoreDisplay.tsx",
      "<th>Weight</th>\n",
    );
    writeFixtureFile(
      root,
      "src/ui/score-display/internal/scoreReasons.ts",
      '"Invalid JSON"\n',
    );
    writeFixtureFile(
      root,
      "src/features/settings/support/feedback/DebugInfoPreview.tsx",
      [
        '"Loading debug information..."',
        '"Anonymized Debug Information"',
        '"Privacy guaranteed:"',
        '"Search keywords"',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/settings/support/feedback/FeedbackModal.tsx",
      '"Include Debug Information?"; "Loading system information...";\n',
    );
    writeFixtureFile(
      root,
      "src/features/settings/support/feedback/SuccessScreen.tsx",
      '"Paste the debug report from your clipboard";\n',
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        '"Blocked unsafe deep link URL"',
        '"Blocked unsafe job import URL"',
        '"Blocked unsafe application URL"',
        '"This job already exists in your database"',
        '"Search keywords configured"',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/mocks/atsPlatform.ts",
      '"Unknown ATS. Review fields carefully before submitting."\n',
    );
    writeFixtureFile(
      root,
      "src/features/settings/SettingsPage.tsx",
      [
        '"Invalid Discord webhook"',
        '"Config imported"',
        '"Failed to import config"',
        '"Some credentials unavailable"',
        '"Credentials stored securely"',
        '"Partially saved"',
        '"1 credential(s) failed to save"',
        '"Paste your Discord webhook URL"',
        '"This doesn\'t look like a valid Teams webhook URL"',
        '"Get job alerts via Telegram bot"',
        '"Bot Token"',
        '"Telegram Connection Token"',
        '"Telegram Chat ID"',
        '"connection token"',
        '"Paste your bot token from @BotFather"',
        '"Chat ID (e.g., 123456789)"',
        '"Sensitive data (passwords, tokens) excluded"',
        '"Incoming Webhooks"',
        '"incoming webhook connector"',
        '"Create a Webhook"',
        '"Webhooks → New Webhook"',
        '"Incoming Webhook → Configure"',
        '"Popular with tech companies"',
        '"Get Free API Key"',
        '"Paste your API key here"',
        '"Required by USAJobs API"',
        '"Keywords to Avoid"',
        '"Add a keyword to avoid"',
        '"No excluded keywords"',
        '"keyword-only scoring"',
        '"resume match + 30% keywords"',
        '"scoring falls back to keyword matching"',
        '"Job title and keyword matches"',
        '"Auto-scan job boards"',
        '"Company preference (if configured)"',
        '"Early warning point:"',
        '"Hide-by-default point:"',
        "ghostConfig.warning_threshold.toFixed(2)",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/applications/ApplicationsPage.tsx",
      '"Try again, or check if the database is accessible."; "Technical Interview";\n',
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/DashboardPage.tsx",
      [
        '"This job posting URL is not valid or safe to open"; "Unable to open the job posting URL";',
        '"Scanning job boards..."; "Scan complete!";',
        "setError(getErrorMessage(err));",
        "setError(enhancedError.userFriendly?.message || getErrorMessage(err));",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/hooks/useDashboardJobOps.ts",
      'toast.error(enhancedError.userFriendly?.title || "Bulk Bookmark Failed", enhancedError.userFriendly?.message || "Try again");\n',
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/hooks/useDashboardSavedSearches.ts",
      'toast.error(enhanced.userFriendly?.title || "Search wasn\'t saved", enhanced.userFriendly?.message || "Try again");\n',
    );
    writeFixtureFile(
      root,
      "src/features/market/MarketPage.tsx",
      'setError(enhanced.message || "Failed to load market data");\n',
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/QuickActions.tsx",
      '"Import a job from any website URL"\n',
    );
    writeFixtureFile(
      root,
      "src/features/resumes/builder/ResumeBuilderPage.tsx",
      '"Try restarting the app or check if the database is accessible."\n',
    );
    writeFixtureFile(
      root,
      "src/app/commands/CommandPalette.tsx",
      '"Type a command or search..."\n',
    );
    writeFixtureFile(
      root,
      "src/app/commands/KeyboardShortcutsHelp.tsx",
      '"Open command palette"\n',
    );
    writeFixtureFile(root, "src/app/Navigation.tsx", '"for command palette"\n');
    writeFixtureFile(
      root,
      "src/app/keyboard/KeyboardShortcutsProvider.tsx",
      '"Close dialog / command palette"\n',
    );
    writeFixtureFile(
      root,
      "src/features/salary/SalaryPage.tsx",
      [
        'toast.error("Benchmark failed", getErrorMessage(err));',
        'toast.error("Note drafting failed", getErrorMessage(err));',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/onboarding/SetupWizard.tsx",
      '<Input label="Slack Webhook URL (optional)" />"Skills & Keywords"\n',
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/applicationFormValidation.ts",
      'return "Invalid regex pattern. Check for unmatched brackets or special characters."; if (!value) return "Pattern is required";\n',
    );
    writeFixtureFile(
      root,
      "src/features/settings/credentials/notificationConnectionValidation.ts",
      'return "Slack webhook must use HTTPS"; return "Invalid Discord webhook path";\n',
    );
    writeFixtureFile(
      root,
      "src/shared/validation/contactFieldValidation.ts",
      'return "URL must use http:// or https://";\n',
    );
    writeFixtureFile(
      root,
      "src/shared/errorReporting/messages.ts",
      [
        '"Your credentials or API key aren\'t working."',
        '"API Limit Reached"',
        '"The database is currently in use by another operation."',
        '"Configuration Missing"',
        '"The app configuration file is missing or couldn\'t be found."',
        '"Check your webhook URL in Settings"',
        '"make sure your SMTP credentials are correct"',
        '"contact support with the error details below"',
        "technical: technicalMessage",
        "JSON.stringify(error)",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/application-assist.md",
      "The patterns are flexible (regex), so they match variations.\nRequire manual approval\n",
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ApplicationProfilePage.tsx",
      '"Failed to load application history";\n',
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/DashboardHeader.tsx",
      '"Currently scanning job boards"; "Ready to scan";\n',
    );
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      "The Settings screen exposes **Copy Debug Report**.\n",
    );
    writeFixtureFile(
      root,
      "docs/user/DEEP_LINKS.md",
      [
        "# Deep Link Generator",
        "Generate pre-filled job search URLs for sites we can't scrape.",
        "The Deep Link Generator creates URLs for 19+ job sites.",
        "Go to the Deep Links page.",
        "### URL Parameters",
        "- **Query** - Your job title/keywords (all sites)",
        "URLs are generated locally in your app.",
        "Some sites have limited URL parameter support.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/browser-import.md",
      [
        "# Browser Bookmarklet Integration",
        "Open advanced connection settings if you need another port.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/notifications.md",
      [
        "That's it! No webhook setup needed.",
        "Regular passwords don't work with SMTP.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/job-sources.md",
      [
        "**Free API key required** from https://developer.usajobs.gov/",
        'Click "Get Free API Key"',
        "Copy API key from confirmation email",
        "| **USAJobs** | ~50K | API key (free) | Production |",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      [
        "Don't know what a webhook is? No problem -- it's just a special URL that lets JobSentinel",
        "**Database:** Your job matches and settings",
        "**Credentials:** Passwords and API tokens are stored in your OS's secure vault",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "README.md",
        "src/features/resumes/library/ResumeLibraryPage.tsx",
        "src/features/resumes/matching/ResumeMatchPage.tsx",
        "src/features/applications/ApplicationsPage.tsx",
        "src/features/application-assist/ApplicationProfilePage.tsx",
        "src/features/dashboard/DashboardPage.tsx",
        "src/features/dashboard/components/DashboardHeader.tsx",
        "src/features/dashboard/hooks/useDashboardJobOps.ts",
        "src/features/dashboard/hooks/useDashboardSavedSearches.ts",
        "src/features/dashboard/components/QuickActions.tsx",
        "src/features/market/MarketPage.tsx",
        "src/features/resumes/builder/ResumeBuilderPage.tsx",
        "src/features/salary/SalaryPage.tsx",
        "src/features/settings/SettingsPage.tsx",
        "src/features/onboarding/SetupWizard.tsx",
        "src/features/settings/sources/browser-import/BrowserImportSection.tsx",
        "src/features/applications/CoverLetterTemplates.tsx",
        "src/features/search-links/SearchLinksPage.tsx",
        "src/app/errors/ErrorBoundary.tsx",
        "src/features/settings/support/ErrorLogPanel.tsx",
        "src/features/dashboard/components/ScoreBreakdownModal.tsx",
        "src/ui/score-display/ScoreDisplay.tsx",
        "src/ui/score-display/internal/scoreReasons.ts",
        "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
        "src/features/dashboard/components/JobImportModal.tsx",
        "src/features/dashboard/components/JobCard.tsx",
        "src/features/dashboard/components/jobCardGuidance.ts",
        "src/features/resumes/builder/AtsLiveScorePanel.tsx",
        "src/features/applications/AnalyticsPanel.tsx",
        "src/features/dashboard/components/DashboardWidgets.tsx",
        "src/features/applications/InterviewScheduler.tsx",
        "src/features/onboarding/CareerProfileSelector.tsx",
        "src/app/commands/CommandPalette.tsx",
        "src/app/commands/KeyboardShortcutsHelp.tsx",
        "src/app/Navigation.tsx",
        "src/features/application-assist/ApplyButton.tsx",
        "src/features/application-assist/ScreeningAnswersForm.tsx",
        "src/features/settings/support/feedback/DebugInfoPreview.tsx",
        "src/features/settings/support/feedback/FeedbackModal.tsx",
        "src/features/settings/support/feedback/SuccessScreen.tsx",
        "src/app/keyboard/KeyboardShortcutsProvider.tsx",
        "src/mocks/handlers.ts",
        "src/features/application-assist/mocks/atsPlatform.ts",
        "src/features/application-assist/applicationFormValidation.ts",
        "src/features/settings/credentials/notificationConnectionValidation.ts",
        "src/shared/validation/contactFieldValidation.ts",
        "src/shared/errorReporting/messages.ts",
        "docs/features/notifications.md",
        "docs/features/application-assist.md",
        "docs/features/job-sources.md",
        "docs/features/user-data-management.md",
        "docs/features/browser-import.md",
        "docs/user/DEEP_LINKS.md",
        "docs/user/QUICK_START.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src/features/resumes/library/ResumeLibraryPage.tsx",
      "src/features/resumes/matching/ResumeMatchPage.tsx",
      "src/features/applications/ApplicationsPage.tsx",
      "src/features/application-assist/ApplicationProfilePage.tsx",
      "src/features/dashboard/DashboardPage.tsx",
      "src/features/dashboard/components/DashboardHeader.tsx",
      "src/features/dashboard/hooks/useDashboardJobOps.ts",
      "src/features/dashboard/hooks/useDashboardSavedSearches.ts",
      "src/features/dashboard/components/QuickActions.tsx",
      "src/features/market/MarketPage.tsx",
      "src/features/resumes/builder/ResumeBuilderPage.tsx",
      "src/features/salary/SalaryPage.tsx",
      "src/features/settings/SettingsPage.tsx",
      "src/features/onboarding/SetupWizard.tsx",
      "src/features/settings/sources/browser-import/BrowserImportSection.tsx",
      "src/features/applications/CoverLetterTemplates.tsx",
      "src/features/search-links/SearchLinksPage.tsx",
      "src/app/errors/ErrorBoundary.tsx",
      "src/features/settings/support/ErrorLogPanel.tsx",
      "src/features/dashboard/components/ScoreBreakdownModal.tsx",
      "src/ui/score-display/ScoreDisplay.tsx",
      "src/ui/score-display/internal/scoreReasons.ts",
      "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
      "src/features/dashboard/components/JobImportModal.tsx",
      "src/features/dashboard/components/JobCard.tsx",
      "src/features/resumes/builder/AtsLiveScorePanel.tsx",
      "src/features/applications/AnalyticsPanel.tsx",
      "src/features/dashboard/components/DashboardWidgets.tsx",
      "src/features/applications/InterviewScheduler.tsx",
      "src/features/onboarding/CareerProfileSelector.tsx",
      "src/app/commands/CommandPalette.tsx",
      "src/app/commands/KeyboardShortcutsHelp.tsx",
      "src/app/Navigation.tsx",
      "src/features/application-assist/ApplyButton.tsx",
      "src/features/application-assist/ScreeningAnswersForm.tsx",
      "src/features/settings/support/feedback/DebugInfoPreview.tsx",
      "src/features/settings/support/feedback/FeedbackModal.tsx",
      "src/features/settings/support/feedback/SuccessScreen.tsx",
      "src/app/keyboard/KeyboardShortcutsProvider.tsx",
      "src/mocks/handlers.ts",
      "src/features/application-assist/mocks/atsPlatform.ts",
      "src/features/application-assist/applicationFormValidation.ts",
      "src/features/settings/credentials/notificationConnectionValidation.ts",
      "src/shared/validation/contactFieldValidation.ts",
      "src/shared/errorReporting/messages.ts",
      "README.md",
      "docs/features/notifications.md",
      "docs/features/application-assist.md",
      "docs/features/job-sources.md",
      "docs/features/user-data-management.md",
      "docs/features/browser-import.md",
      "docs/user/DEEP_LINKS.md",
      "docs/user/QUICK_START.md",
    ]) {
      assert.ok(
        violations.includes(`replace technical-first user copy: ${path}`),
        violations.join("\n"),
      );
    }
  });
});
