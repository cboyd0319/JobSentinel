import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "./check-repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function lineFixture(count) {
  return Array.from({ length: count }, (_, index) => `const fixtureLine${index} = ${index};`)
    .join("\n");
}

test("checkRepoBloat rejects new oversized maintainable source files", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "src/pages/Oversized.tsx", lineFixture(1201));

    execFileSync("git", ["add", "package.json", "src/pages/Oversized.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "split oversized tracked file: src/pages/Oversized.tsx has 1201 lines (limit 1200)",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat grandfathers known oversized files without allowing growth", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "scripts/check-repo-bloat.test.mjs", lineFixture(3660));

    execFileSync("git", ["add", "package.json", "scripts/check-repo-bloat.test.mjs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.equal(
      violations.some((violation) => violation.includes("scripts/check-repo-bloat.test.mjs has")),
      false,
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects growth in grandfathered oversized files", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "scripts/check-repo-bloat.test.mjs", lineFixture(3661));

    execFileSync("git", ["add", "package.json", "scripts/check-repo-bloat.test.mjs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "split legacy oversized tracked file before growing it: scripts/check-repo-bloat.test.mjs has 3661 lines (budget 3660, target 1200)",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects reserved E2E fixture placeholders", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "tests/e2e/fixtures/.gitkeep");
    writeFixtureFile(
      root,
      "tests/e2e/fixtures/README.md",
      "This directory is reserved for future tests.\n",
    );

    execFileSync(
      "git",
      ["add", "package.json", "tests/e2e/fixtures/.gitkeep", "tests/e2e/fixtures/README.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove tracked generated or disposable file: tests/e2e/fixtures/.gitkeep",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove tracked generated or disposable file: tests/e2e/fixtures/README.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects tracked gitkeep placeholders", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "docs/plans/active/.gitkeep");
    writeFixtureFile(root, "docs/plans/active/current-plan.md", "# Current Plan\n");
    writeFixtureFile(root, "docs/plans/completed/.gitkeep");
    writeFixtureFile(root, "docs/plans/completed/done-plan.md", "# Done Plan\n");

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/plans/active/.gitkeep",
        "docs/plans/active/current-plan.md",
        "docs/plans/completed/.gitkeep",
        "docs/plans/completed/done-plan.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove tracked generated or disposable file: docs/plans/active/.gitkeep",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove tracked generated or disposable file: docs/plans/completed/.gitkeep",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects one-off implementation report docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/intel-mac-support.md",
      "# Intel Mac Support - Universal Binary\n\nOne-off implementation report.\n",
    );

    execFileSync("git", ["add", "package.json", "docs/intel-mac-support.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove tracked generated or disposable file: docs/intel-mac-support.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects tracked source-tree markdown notes", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "src/components/settings/README.md", "# Component Notes\n");
    writeFixtureFile(root, "src/hooks/USAGE.md", "# Hook Usage\n");

    execFileSync(
      "git",
      ["add", "package.json", "src/components/settings/README.md", "src/hooks/USAGE.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove tracked generated or disposable file: src/components/settings/README.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("remove tracked generated or disposable file: src/hooks/USAGE.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects empty source directories", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    mkdirSync(join(root, "src/components/settings"), { recursive: true });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove local artifact: src/components/settings/ is an empty local directory",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unreferenced docs images", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "README.md", "![Dashboard](docs/images/dashboard.png)\n");
    writeFixtureFile(root, "docs/images/dashboard.png", "used image fixture\n");
    writeFixtureFile(root, "docs/images/keyboard-shortcuts.png", "unused image fixture\n");

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "README.md",
        "docs/images/dashboard.png",
        "docs/images/keyboard-shortcuts.png",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove unreferenced docs image: docs/images/keyboard-shortcuts.png"),
      violations.join("\n"),
    );
    assert.ok(
      !violations.includes("remove unreferenced docs image: docs/images/dashboard.png"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects duplicate docs screenshot targets", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "tests/e2e/playwright/screenshots.spec.ts",
      `
await page.screenshot({ path: screenshotPath(testInfo, "dashboard.png") });
await page.screenshot({ path: screenshotPath(testInfo, "dashboard.png") });
`,
    );

    execFileSync("git", ["add", "package.json", "tests/e2e/playwright/screenshots.spec.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove duplicate docs screenshot capture: tests/e2e/playwright/screenshots.spec.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects front-door release version promises", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      "### Planned for v2.7\n\nRelease packages are tracked for v2.7.\n",
    );

    execFileSync("git", ["add", "README.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace front-door release version promises: README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects front-door macOS installer overpromises", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      "The current release includes Windows, macOS, and Linux installers.\n",
    );

    execFileSync("git", ["add", "README.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace front-door macOS installer overpromise: README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects front-door macOS distribution overpromises", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "README.md", "The macOS package is notarized and Gatekeeper-ready.\n");

    execFileSync("git", ["add", "README.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace front-door macOS distribution overpromise: README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects source release version promises", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/ResumeBuilder.tsx",
      'export const tooltip = "Coming in v2.7 - Full ATS compatibility check";\n',
    );

    execFileSync("git", ["add", "package.json", "src/pages/ResumeBuilder.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace source release version promises: src/pages/ResumeBuilder.tsx"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat requires README product definition", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "README.md", "# JobSentinel\n\nLocal job search app.\n");

    execFileSync("git", ["add", "README.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("add required README product definition: README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat requires free-forever MIT wording", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      [
        "# JobSentinel",
        "",
        "JobSentinel is an open-source, local-first job-search assistant for finding real, relevant, fairly compensated work while keeping sensitive job-search data under user control.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/harness/README.md",
      "# Harness\n\nJobSentinel is for any job seeker.\n",
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "# Getting Started\n\nDownload the installer.\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "README.md",
        "docs/harness/README.md",
        "docs/user/QUICK_START.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("add free-forever MIT wording: README.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("add free-forever MIT wording: docs/harness/README.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("add free-forever MIT wording: docs/user/QUICK_START.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat requires grant-facing docs in the main repo", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", '{ "name": "jobsentinel" }\n');
    execFileSync("git", ["add", "package.json"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("add required grant-facing doc: PRIVACY.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("add required grant-facing doc: RESPONSIBLE_AI.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("add required grant-facing doc: docs/research/pay-equity.md"),
      violations.join("\n"),
    );
  });
});

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

    execFileSync("git", ["add", "package.json", "docs/features/application-positioning.md"], {
      cwd: root,
    });

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
      "src/components/AsyncButton.tsx",
      'toast.error("Error", errorMessage || errMsg);\n',
    );
    writeFixtureFile(
      root,
      "src/components/JobCard.tsx",
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
      "src/components/CoverLetterTemplates.tsx",
      [
        "setError(errorMsg);",
        "toast.error('Failed to save template', String(error));",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/DeepLinkGenerator.tsx",
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
      "src/components/BookmarkletGenerator.tsx",
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
      "src/components/AtsLiveScorePanel.tsx",
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
      "src/components/ScraperHealthDashboard.tsx",
      "setError(err instanceof Error ? err.message : String(err));\n",
    );
    writeFixtureFile(
      root,
      "src/components/AnalyticsPanel.tsx",
      'technical_interview: "Technical",\n',
    );
    writeFixtureFile(
      root,
      "src/components/DashboardWidgets.tsx",
      '{ name: "Technical", value: appStats.by_status.technical_interview }\n',
    );
    writeFixtureFile(
      root,
      "src/components/InterviewScheduler.tsx",
      '"Technical Interview"\n',
    );
    writeFixtureFile(
      root,
      "src/components/CareerProfileSelector.tsx",
      [
        '"Custom Setup"',
        '"I\'ll enter my own job titles and skills"',
        '"Pre-configured with 10 relevant skills"',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/Resume.tsx",
      [
        '<Button>Import JSON Resume</Button><p>Your JSON Resume has been imported</p>',
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
      "src/pages/ResumeOptimizer.tsx",
      [
        '<CardHeader title="Resume Data (JSON)" />',
        '<label>Resume Data in JSON format</label>',
        'toast.error("Invalid resume JSON", "Paste resume JSON that matches the AtsResumeData schema");',
        '<h1>ATS Resume Optimizer</h1>',
        '<p>Optimize your resume for Applicant Tracking Systems</p>',
        '<Button>View Power Words</Button>',
        '<Modal title="ATS Power Words" />',
        '<CardHeader title="Keyword Density Heatmap" />',
        '"= Matched keywords"',
        '"= Missing keywords"',
        '"({required.length} keywords)"',
        '"Opacity indicates keyword frequency."',
        "const message = err instanceof Error ? err.message : String(err);",
        'toast.error("Analysis failed", message);',
        '<ScoreItem label="Keywords" />',
        '<CardHeader title={`Keyword Matches (${analysisResult.keyword_matches.length})`} />',
        '<CardHeader title={`Missing Keywords (${analysisResult.missing_keywords.length})`} />',
        '"Consider adding these keywords to improve your match score"',
        '"These action verbs and keywords are commonly recognized by ATS systems."',
        '"These action verbs are commonly recognized by resume screening tools."',
        '<CardHeader title="Job Description" />',
        '<CardHeader title="Resume Data" />',
        '"Structured resume data"',
        '"Please enter your resume data"',
        '"Resume data not recognized"',
        '"Paste structured resume data exported from JobSentinel or another supported tool."',
        '<Button>Analyze with Job</Button>',
        '"No analysis yet"',
        '"Enter your job description and resume data, then click Analyze"',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/automation/ApplyButton.tsx",
      [
        "setFillError(result.errorMessage);",
        'toast.error("Form preparation error", result.errorMessage);',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/automation/ScreeningAnswersForm.tsx",
      [
        '<Select label="Dropdown selection" />',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/ErrorBoundary.tsx",
      '"Copy Debug Report"; "Debug report copied"; "saved jobs and applications stay in the local database";\n',
    );
    writeFixtureFile(
      root,
      "src/components/ErrorLogPanel.tsx",
      '"Advanced: Save Support Details";\n',
    );
    writeFixtureFile(
      root,
      "src/components/JobImportModal.tsx",
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
      "src/components/ScoreBreakdownModal.tsx",
      '"Job title and keyword matches"\n',
    );
    writeFixtureFile(
      root,
      "src/components/ScoreDisplay.tsx",
      "<th>Weight</th>\n",
    );
    writeFixtureFile(
      root,
      "src/components/feedback/DebugInfoPreview.tsx",
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
      "src/components/feedback/FeedbackModal.tsx",
      '"Include Debug Information?"; "Loading system information...";\n',
    );
    writeFixtureFile(
      root,
      "src/components/feedback/SuccessScreen.tsx",
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
      "src/pages/Settings.tsx",
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
      "src/pages/Applications.tsx",
      '"Try again, or check if the database is accessible."; "Technical Interview";\n',
    );
    writeFixtureFile(
      root,
      "src/pages/Dashboard.tsx",
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
      "src/pages/hooks/useDashboardJobOps.ts",
      "toast.error(enhancedError.userFriendly?.title || \"Bulk Bookmark Failed\", enhancedError.userFriendly?.message || \"Try again\");\n",
    );
    writeFixtureFile(
      root,
      "src/pages/hooks/useDashboardSavedSearches.ts",
      "toast.error(enhanced.userFriendly?.title || \"Search wasn't saved\", enhanced.userFriendly?.message || \"Try again\");\n",
    );
    writeFixtureFile(
      root,
      "src/pages/Market.tsx",
      "setError(enhanced.message || \"Failed to load market data\");\n",
    );
    writeFixtureFile(
      root,
      "src/pages/DashboardUI/QuickActions.tsx",
      '"Import a job from any website URL"\n',
    );
    writeFixtureFile(
      root,
      "src/pages/ResumeBuilder.tsx",
      '"Try restarting the app or check if the database is accessible."\n',
    );
    writeFixtureFile(root, "src/components/CommandPalette.tsx", '"Type a command or search..."\n');
    writeFixtureFile(root, "src/components/KeyboardShortcutsHelp.tsx", '"Open command palette"\n');
    writeFixtureFile(root, "src/components/Navigation.tsx", '"for command palette"\n');
    writeFixtureFile(
      root,
      "src/contexts/KeyboardShortcutsContext.tsx",
      '"Close dialog / command palette"\n',
    );
    writeFixtureFile(
      root,
      "src/pages/Salary.tsx",
      [
        'toast.error("Benchmark failed", getErrorMessage(err));',
        'toast.error("Note drafting failed", getErrorMessage(err));',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/SetupWizard.tsx",
      '<Input label="Slack Webhook URL (optional)" />"Skills & Keywords"\n',
    );
    writeFixtureFile(
      root,
      "src/utils/formValidation.ts",
      [
        'return "Invalid regex pattern. Check for unmatched brackets or special characters."; if (!value) return "Pattern is required";',
        'return "Slack webhook must use HTTPS";',
        'return "Invalid Discord webhook path";',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/utils/errorMessages.ts",
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
      "docs/features/one-click-apply.md",
      "The patterns are flexible (regex), so they match variations.\nRequire manual approval\n",
    );
    writeFixtureFile(
      root,
      "src/pages/ApplicationProfile.tsx",
      '"Failed to load application history";\n',
    );
    writeFixtureFile(
      root,
      "src/pages/DashboardUI/DashboardHeader.tsx",
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
      "docs/BOOKMARKLET.md",
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
      "docs/features/scrapers.md",
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
        "src/pages/Resume.tsx",
        "src/pages/ResumeOptimizer.tsx",
        "src/pages/Applications.tsx",
        "src/pages/ApplicationProfile.tsx",
        "src/pages/Dashboard.tsx",
        "src/pages/DashboardUI/DashboardHeader.tsx",
        "src/pages/hooks/useDashboardJobOps.ts",
        "src/pages/hooks/useDashboardSavedSearches.ts",
        "src/pages/DashboardUI/QuickActions.tsx",
        "src/pages/Market.tsx",
        "src/pages/ResumeBuilder.tsx",
        "src/pages/Salary.tsx",
        "src/pages/Settings.tsx",
        "src/pages/SetupWizard.tsx",
        "src/components/AsyncButton.tsx",
        "src/components/BookmarkletGenerator.tsx",
        "src/components/CoverLetterTemplates.tsx",
        "src/components/DeepLinkGenerator.tsx",
        "src/components/ErrorBoundary.tsx",
        "src/components/ErrorLogPanel.tsx",
        "src/components/ScoreBreakdownModal.tsx",
        "src/components/ScoreDisplay.tsx",
        "src/components/ScraperHealthDashboard.tsx",
        "src/components/JobImportModal.tsx",
        "src/components/JobCard.tsx",
        "src/components/AtsLiveScorePanel.tsx",
        "src/components/AnalyticsPanel.tsx",
        "src/components/DashboardWidgets.tsx",
        "src/components/InterviewScheduler.tsx",
        "src/components/CareerProfileSelector.tsx",
        "src/components/CommandPalette.tsx",
        "src/components/KeyboardShortcutsHelp.tsx",
        "src/components/Navigation.tsx",
        "src/components/automation/ApplyButton.tsx",
        "src/components/automation/ScreeningAnswersForm.tsx",
        "src/components/feedback/DebugInfoPreview.tsx",
        "src/components/feedback/FeedbackModal.tsx",
        "src/components/feedback/SuccessScreen.tsx",
        "src/contexts/KeyboardShortcutsContext.tsx",
        "src/mocks/handlers.ts",
        "src/utils/formValidation.ts",
        "src/utils/errorMessages.ts",
        "docs/features/notifications.md",
        "docs/features/one-click-apply.md",
        "docs/features/scrapers.md",
        "docs/features/user-data-management.md",
        "docs/BOOKMARKLET.md",
        "docs/user/DEEP_LINKS.md",
        "docs/user/QUICK_START.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src/pages/Resume.tsx",
      "src/pages/ResumeOptimizer.tsx",
      "src/pages/Applications.tsx",
      "src/pages/ApplicationProfile.tsx",
      "src/pages/Dashboard.tsx",
      "src/pages/DashboardUI/DashboardHeader.tsx",
      "src/pages/hooks/useDashboardJobOps.ts",
      "src/pages/hooks/useDashboardSavedSearches.ts",
      "src/pages/DashboardUI/QuickActions.tsx",
      "src/pages/Market.tsx",
      "src/pages/ResumeBuilder.tsx",
      "src/pages/Salary.tsx",
      "src/pages/Settings.tsx",
      "src/pages/SetupWizard.tsx",
      "src/components/AsyncButton.tsx",
      "src/components/BookmarkletGenerator.tsx",
      "src/components/CoverLetterTemplates.tsx",
      "src/components/DeepLinkGenerator.tsx",
      "src/components/ErrorBoundary.tsx",
      "src/components/ErrorLogPanel.tsx",
      "src/components/ScoreBreakdownModal.tsx",
      "src/components/ScoreDisplay.tsx",
      "src/components/ScraperHealthDashboard.tsx",
      "src/components/JobImportModal.tsx",
      "src/components/JobCard.tsx",
      "src/components/AtsLiveScorePanel.tsx",
      "src/components/AnalyticsPanel.tsx",
      "src/components/DashboardWidgets.tsx",
      "src/components/InterviewScheduler.tsx",
      "src/components/CareerProfileSelector.tsx",
      "src/components/CommandPalette.tsx",
      "src/components/KeyboardShortcutsHelp.tsx",
      "src/components/Navigation.tsx",
      "src/components/automation/ApplyButton.tsx",
      "src/components/automation/ScreeningAnswersForm.tsx",
      "src/components/feedback/DebugInfoPreview.tsx",
      "src/components/feedback/FeedbackModal.tsx",
      "src/components/feedback/SuccessScreen.tsx",
      "src/contexts/KeyboardShortcutsContext.tsx",
      "src/mocks/handlers.ts",
      "src/utils/formValidation.ts",
      "src/utils/errorMessages.ts",
      "README.md",
      "docs/features/notifications.md",
      "docs/features/one-click-apply.md",
      "docs/features/scrapers.md",
      "docs/features/user-data-management.md",
      "docs/BOOKMARKLET.md",
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

test("checkRepoBloat rejects stale Resume Optimizer framing", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/Navigation.tsx",
      '{ id: "ats-optimizer", label: "Resume Optimizer", shortcut: "⌘8" }\n',
    );
    writeFixtureFile(
      root,
      "src/contexts/KeyboardShortcutsContext.tsx",
      'description: "Go to Resume Optimizer",\n',
    );
    writeFixtureFile(
      root,
      "src/App.tsx",
      '<PageErrorBoundary pageName="Resume Optimizer">\n',
    );
    writeFixtureFile(
      root,
      "src/components/AtsLiveScorePanel.tsx",
      [
        '"ATS Score"',
        '"Fix format issues to improve ATS parsing"',
        '<Modal title="Full ATS Analysis" />',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/ResumeBuilder.tsx",
      [
        '"ATS Format Score"',
        '"For detailed analysis and optimization recommendations, visit ATS"',
        '"Optimizer."',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/Resume.tsx",
      '"AI-powered resume analysis and job matching"\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/resume/templates.rs",
      [
        "//! ATS-optimized resume templates for HTML rendering",
        "//! to ATS-parseable HTML. All templates follow ATS-safe design rules:",
        'description: "Clean, contemporary design with subtle styling. ATS-compatible."',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      [
        "Pick from 5 ATS-friendly templates",
        'ATS stands for "Applicant Tracking System"',
        "Get instant feedback on what keywords you're missing",
        "",
      ].join("\n"),
    );
    writeFixtureFile(root, "docs/releases/v2.0.md", "Resume Optimizer\n");
    writeFixtureFile(root, "docs/releases/v2.4.md", "Resume Optimizer\n");
    writeFixtureFile(root, "docs/releases/v2.6.0.md", "ATS score calculation\n");
    writeFixtureFile(
      root,
      "docs/plans/active/current-work.md",
      "Rename visible app and user-doc surfaces from ATS Optimizer to Resume Optimizer\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/components/Navigation.tsx",
        "src/contexts/KeyboardShortcutsContext.tsx",
        "src/App.tsx",
        "src/components/AtsLiveScorePanel.tsx",
        "src/pages/Resume.tsx",
        "src/pages/ResumeBuilder.tsx",
        "src-tauri/src/core/resume/templates.rs",
        "docs/user/QUICK_START.md",
        "docs/releases/v2.0.md",
        "docs/releases/v2.4.md",
        "docs/releases/v2.6.0.md",
        "docs/plans/active/current-work.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src/components/Navigation.tsx",
      "src/contexts/KeyboardShortcutsContext.tsx",
      "src/App.tsx",
      "src/components/AtsLiveScorePanel.tsx",
      "src/pages/Resume.tsx",
      "src/pages/ResumeBuilder.tsx",
      "src-tauri/src/core/resume/templates.rs",
      "docs/user/QUICK_START.md",
      "docs/releases/v2.0.md",
      "docs/releases/v2.4.md",
      "docs/releases/v2.6.0.md",
      "docs/plans/active/current-work.md",
    ]) {
      assert.ok(
        violations.includes(`replace stale Resume Optimizer framing: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects application-assist automation framing", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/ApplicationProfile.tsx",
      '"One-Click Apply Settings"; "Total Attempts"; "Success Rate"; "Submission Rate";\n',
    );
    writeFixtureFile(
      root,
      "src/components/automation/ApplyButton.tsx",
      '"Quick Apply"; "Prepare to apply - fills form fields automatically"; "Settings > Application Assist";\n',
    );
    writeFixtureFile(
      root,
      "src/components/automation/ApplicationPreview.tsx",
      '"Fields that will be auto-filled"; "Code profile";\n',
    );
    writeFixtureFile(
      root,
      "src/components/automation/ProfileForm.tsx",
      '"This information will be auto-filled when you apply to jobs"; "Automation Settings";\n',
    );
    writeFixtureFile(
      root,
      "src/components/automation/ScreeningAnswersForm.tsx",
      '"Add common answers to auto-fill screening questions during Quick Apply";\n',
    );
    writeFixtureFile(
      root,
      "src/pages/DashboardUI/DashboardHeader.tsx",
      '"Privacy-first job search automation";\n',
    );
    writeFixtureFile(
      root,
      "docs/features/one-click-apply.md",
      "# One-Click Apply\n\nFill out job applications in seconds, not minutes.\n",
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Speed up applications with One-Click Apply.\n",
    );
    writeFixtureFile(root, "README.md", "One-click apply can fill supported forms.\n");
    writeFixtureFile(
      root,
      "index.html",
      '<meta name="description" content="Privacy-first job search automation" />\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/Cargo.toml",
      'description = "Privacy-first job search automation for Windows 11+"\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "README.md",
        "index.html",
        "src-tauri/Cargo.toml",
        "src/pages/ApplicationProfile.tsx",
        "src/components/automation/ApplyButton.tsx",
        "src/components/automation/ApplicationPreview.tsx",
        "src/components/automation/ProfileForm.tsx",
        "src/components/automation/ScreeningAnswersForm.tsx",
        "src/pages/DashboardUI/DashboardHeader.tsx",
        "docs/features/one-click-apply.md",
        "docs/user/QUICK_START.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src/pages/ApplicationProfile.tsx",
      "src/components/automation/ApplyButton.tsx",
      "src/components/automation/ApplicationPreview.tsx",
      "src/components/automation/ProfileForm.tsx",
      "src/components/automation/ScreeningAnswersForm.tsx",
      "src/pages/DashboardUI/DashboardHeader.tsx",
      "docs/features/one-click-apply.md",
      "docs/user/QUICK_START.md",
      "README.md",
      "index.html",
      "src-tauri/Cargo.toml",
    ]) {
      assert.ok(
        violations.includes(`replace application-assist automation framing: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects overconfident ghost-risk copy", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/ghost-detection.md",
      [
        "Stop wasting time on fake job postings.",
        "Real Jobs Only hides anything with ghost score.",
        "Red means Probably fake.",
        "Lower Risk hides jobs above the warning threshold.",
        "Stale Job Threshold",
        "Weight Adjustments",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Ghost jobs (fake or stale postings) are flagged with warnings.\n",
    );
    writeFixtureFile(
      root,
      "docs/README.md",
      "Ghost Detection: ghost jobs, statistics, filtered search, feedback, and configuration.\n",
    );
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      "Detect stale, reposted, and fake job postings.\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "Identifies fake/stale/already-filled job postings.\n",
    );
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      "Ghost Job Detection - Identifying fake postings.\n",
    );
    writeFixtureFile(
      root,
      "docs/releases/v1.4.md",
      "Each job receives a ghost score from 0.0 (definitely real) to 1.0.\n",
    );
    writeFixtureFile(
      root,
      "docs/style-guide/GLOSSARY.md",
      "Write this: fake or outdated job posting.\n",
    );
    writeFixtureFile(
      root,
      "docs/style-guide/WRITING-FOR-JOB-SEEKERS.md",
      "Some job postings are fake job postings.\n",
    );
    writeFixtureFile(
      root,
      "src/components/GhostIndicator.tsx",
      '"Potential Ghost Job"; "Likely Ghost"; "Confirm ghost job";\n',
    );
    writeFixtureFile(
      root,
      "src/pages/DashboardUI/DashboardFiltersBar.tsx",
      '"Legitimacy"; "Likely Real"; "Possible Ghost";\n',
    );
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      '"Adjust how aggressively JobSentinel flags fake or stale job postings."\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/ghost-detection.md",
        "docs/user/QUICK_START.md",
        "docs/README.md",
        "docs/ROADMAP.md",
        "docs/developer/ARCHITECTURE.md",
        "docs/features/smart-scoring.md",
        "docs/releases/v1.4.md",
        "docs/style-guide/GLOSSARY.md",
        "docs/style-guide/WRITING-FOR-JOB-SEEKERS.md",
        "src/components/GhostIndicator.tsx",
        "src/pages/DashboardUI/DashboardFiltersBar.tsx",
        "src/pages/Settings.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "docs/features/ghost-detection.md",
      "docs/user/QUICK_START.md",
      "docs/README.md",
      "docs/ROADMAP.md",
      "docs/developer/ARCHITECTURE.md",
      "docs/features/smart-scoring.md",
      "docs/releases/v1.4.md",
      "docs/style-guide/GLOSSARY.md",
      "docs/style-guide/WRITING-FOR-JOB-SEEKERS.md",
      "src/components/GhostIndicator.tsx",
      "src/pages/DashboardUI/DashboardFiltersBar.tsx",
      "src/pages/Settings.tsx",
    ]) {
      assert.ok(
        violations.includes(`replace overconfident ghost-risk copy: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects feedback support paths drifting away from local-first reports", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/feedback/SubmitOptions.tsx",
      '"Works without a GitHub or Google account"; icon={<DriveIcon />}; onSubmitDrive();\n',
    );
    writeFixtureFile(
      root,
      "src/components/feedback/SuccessScreen.tsx",
      'submittedVia: "github" | "drive"; "Open Shared Folder";\n',
    );
    writeFixtureFile(
      root,
      "src/hooks/useFeedback.ts",
      'submittedVia: "drive"; submitViaDrive();\n',
    );
    writeFixtureFile(
      root,
      "docs/features/scrapers.md",
      "Optional debug report uses GitHub or Google Drive flow.\n",
    );
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      '"Safe debug report copied"; "Paste it into a GitHub issue."; "Attach report.txt to a GitHub issue";\n',
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Click Save Safe Debug Report, then open an issue on GitHub.\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/components/feedback/SubmitOptions.tsx",
        "src/components/feedback/SuccessScreen.tsx",
        "src/hooks/useFeedback.ts",
        "docs/features/scrapers.md",
        "src/pages/Settings.tsx",
        "docs/user/QUICK_START.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src/components/feedback/SubmitOptions.tsx",
      "src/components/feedback/SuccessScreen.tsx",
      "src/hooks/useFeedback.ts",
      "docs/features/scrapers.md",
      "src/pages/Settings.tsx",
      "docs/user/QUICK_START.md",
    ]) {
      assert.ok(
        violations.includes(`keep feedback support path local-first: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects overconfident pay guidance", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/salary-ai.md",
      [
        "Know your worth. Negotiate with confidence.",
        "Get scripts so you know exactly what to say.",
        "Always negotiate for a guaranteed raise.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/Salary.tsx",
      '"Copy-paste templates for asking for more money"; "maximize your compensation";\n',
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/features/salary-ai.md", "src/pages/Salary.tsx"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace overconfident pay guidance: docs/features/salary-ai.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace overconfident pay guidance: src/pages/Salary.tsx"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects non-protective salary-floor troubleshooting", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Lower your minimum salary to $0 temporarily\n",
    );
    writeFixtureFile(
      root,
      "src/pages/DashboardUI/noJobsEmptyStateCopy.ts",
      "If a search comes back empty, broaden the role title, location, or lowest pay you want.\n",
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/user/QUICK_START.md", "src/pages/DashboardUI/noJobsEmptyStateCopy.ts"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("keep salary-floor troubleshooting protective: docs/user/QUICK_START.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep salary-floor troubleshooting protective: src/pages/DashboardUI/noJobsEmptyStateCopy.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw salary command logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/salary.rs",
      [
        'tracing::info!("Command: predict_salary (job: {}, years: {:?})", job_hash, years);',
        'tracing::info!("Command: get_salary_benchmark (title: {}, location: {})", job_title, location);',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/salary.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove raw salary command logging: src-tauri/src/commands/salary.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects frontend status emoji markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/InterviewScheduler.tsx",
      '<Button>⏳ Pending</Button><Button>✓ Passed</Button><Button>✗ Failed</Button>\n',
    );

    execFileSync("git", ["add", "package.json", "src/components/InterviewScheduler.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace frontend status emoji markers: src/components/InterviewScheduler.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects production source emoji markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/Market.tsx",
      'export const tabs = [{ id: "overview", label: "Overview", icon: "📊" }];\n',
    );

    execFileSync("git", ["add", "package.json", "src/pages/Market.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace production source emoji markers: src/pages/Market.tsx"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects production explicit-any lint suppressions", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/TrendChart.tsx",
      [
        "// eslint-disable-next-line @typescript-eslint/no-explicit-any",
        "type ChartData = Record<string, any>;",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/components/TrendChart.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove production explicit-any suppression: src/components/TrendChart.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects production TypeScript error suppressions", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/vitals.ts",
      [
        "export function getPerformanceSummary() {",
        "  // @ts-expect-error - memory is non-standard",
        "  return performance.memory?.usedJSHeapSize || 0;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/utils/vitals.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove production TypeScript error suppression: src/utils/vitals.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects production hook dependency suppressions", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/CompanyResearchPanel.tsx",
      [
        "useEffect(() => {",
        "  setLoading(false);",
        "  // eslint-disable-next-line react-hooks/exhaustive-deps",
        "}, [companyName]);",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/components/CompanyResearchPanel.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove production hook dependency suppression: src/components/CompanyResearchPanel.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects production react-refresh suppressions", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/contexts/UndoContext.tsx",
      [
        "export function UndoProvider() { return null; }",
        "// eslint-disable-next-line react-refresh/only-export-components",
        "export function useUndo() { return null; }",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/contexts/UndoContext.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove production react-refresh suppression: src/contexts/UndoContext.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects backend scoring reason glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scoring/mod.rs",
      'reasons.push(format!("✓ Title matches: {}", job.title));\n',
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/scoring/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace backend scoring reason glyph markers: src-tauri/src/core/scoring/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects notification scoring reason glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/notify/slack.rs",
      'reasons: vec!["✓ Title matches".to_string()],\n',
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/notify/slack.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace notification scoring reason glyph markers: src-tauri/src/core/notify/slack.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects bookmarklet doc status emoji markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "docs/BOOKMARKLET.md",
      "alert('✓ Job imported to JobSentinel!');\nalert('✗ Failed to import job.');\n",
    );

    execFileSync("git", ["add", "docs/BOOKMARKLET.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace bookmarklet doc status emoji markers: docs/BOOKMARKLET.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects contradictory plans index release statuses", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "docs/plans/README.md",
      [
        "## Current Release Plans",
        "| Version | Status | Document |",
        "| ------- | ------ | -------- |",
        "| v2.7.0 | Unreleased | [Beta feedback system](completed/beta-feedback-system.md) |",
        "",
        "## Archived Plans",
        "| Version | Status | Document |",
        "| ------- | ------ | -------- |",
        "| v2.7.0 | Complete on main | [Beta feedback system](completed/beta-feedback-system.md) |",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "docs/plans/README.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync plans index release status: docs/plans/README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unreferenced settings helper components", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/settings/FilterListInput.tsx",
      "export function FilterListInput() { return null; }\n",
    );
    writeFixtureFile(
      root,
      "src/components/settings/FilterListInput.test.tsx",
      "import { FilterListInput } from './FilterListInput';\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/components/settings/FilterListInput.tsx",
        "src/components/settings/FilterListInput.test.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove unreferenced settings helper component: src/components/settings/FilterListInput.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unreferenced hook modules", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/hooks/useModal.ts",
      "export function useModal() { return { isOpen: false }; }\n",
    );
    writeFixtureFile(root, "src/hooks/useModal.test.ts", "import { useModal } from './useModal';\n");
    writeFixtureFile(root, "src/hooks/index.ts", "export { useModal } from './useModal';\n");

    execFileSync(
      "git",
      ["add", "package.json", "src/hooks/useModal.ts", "src/hooks/useModal.test.ts", "src/hooks/index.ts"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove unreferenced hook module: src/hooks/useModal.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unreferenced cache strategy helpers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/cacheStrategies.ts",
      "export function staleWhileRevalidate() { return undefined; }\n",
    );

    execFileSync("git", ["add", "package.json", "src/utils/cacheStrategies.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove unreferenced source helper: src/utils/cacheStrategies.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale notification preference sync wrappers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/notificationPreferences.ts",
      [
        "export interface NotificationPreferences { enabled: boolean; }",
        "export const DEFAULT_PREFERENCES: NotificationPreferences = { enabled: true };",
        "export async function saveNotificationPreferencesAsync() { return true; }",
        "export function loadNotificationPreferences(): NotificationPreferences {",
        "  return DEFAULT_PREFERENCES;",
        "}",
        "/** @deprecated Use saveNotificationPreferencesAsync instead */",
        "export function saveNotificationPreferences(_prefs: NotificationPreferences): boolean {",
        "  return false;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/utils/notificationPreferences.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale notification preference sync wrapper: src/utils/notificationPreferences.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unreferenced components barrel", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/index.ts",
      "export { Button } from './Button';\n",
    );
    writeFixtureFile(root, "src/components/Button.tsx", "export function Button() { return null; }\n");
    writeFixtureFile(root, "src/pages/Dashboard.tsx", "import { Button } from '../components/Button';\n");

    execFileSync(
      "git",
      ["add", "package.json", "src/components/index.ts", "src/components/Button.tsx", "src/pages/Dashboard.tsx"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove unreferenced components barrel: src/components/index.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unreferenced local barrel modules", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/automation/index.ts",
      "export { ProfileForm } from './ProfileForm';\n",
    );
    writeFixtureFile(
      root,
      "src/components/automation/ProfileForm.tsx",
      "export function ProfileForm() { return null; }\n",
    );
    writeFixtureFile(
      root,
      "src/pages/ApplicationProfile.tsx",
      "import { ProfileForm } from '../components/automation/ProfileForm';\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/components/automation/index.ts",
        "src/components/automation/ProfileForm.tsx",
        "src/pages/ApplicationProfile.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove unreferenced barrel module: src/components/automation/index.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects redundant direct Playwright dependency", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "package.json",
      JSON.stringify(
        {
          devDependencies: {
            "@playwright/test": "^1.58.2",
            playwright: "^1.57.0",
          },
        },
        null,
        2,
      ),
    );

    execFileSync("git", ["add", "package.json"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove redundant direct Playwright dependency: package.json"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects direct Playwright E2E scripts", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "package.json",
      JSON.stringify(
        {
          scripts: {
            "test:e2e": "playwright test --project=chromium",
            "test:e2e:smoke": "node scripts/run-playwright.mjs test --grep @smoke",
          },
        },
        null,
        2,
      ),
    );

    execFileSync("git", ["add", "package.json"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("route E2E scripts through Playwright wrapper: package.json"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects redundant DOMPurify stub types", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "package.json",
      JSON.stringify(
        {
          dependencies: {
            "@types/dompurify": "^3.2.0",
            dompurify: "^3.3.3",
          },
        },
        null,
        2,
      ),
    );

    execFileSync("git", ["add", "package.json"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove redundant DOMPurify stub types dependency: package.json"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects Tailwind PostCSS plugin in Vite app", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "package.json",
      JSON.stringify(
        {
          devDependencies: {
            "@tailwindcss/postcss": "^4.3.0",
            tailwindcss: "^4.3.0",
            vite: "^8.0.14",
          },
        },
        null,
        2,
      ),
    );
    writeFixtureFile(
      root,
      "postcss.config.js",
      [
        "export default {",
        "  plugins: {",
        "    '@tailwindcss/postcss': {},",
        "    autoprefixer: {},",
        "  },",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "postcss.config.js"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("use Tailwind Vite plugin instead of PostCSS plugin: package.json"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "use Tailwind Vite plugin instead of PostCSS plugin: postcss.config.js",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale E2E runtime skip guidance", () => {
  withGitFixture((root) => {
    const runtimeSkipCall = ["test", "skip"].join(".");

    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "tests/e2e/README.md",
      [
        "## Test Patterns",
        "",
        "```typescript",
        `${runtimeSkipCall}(browserName === "webkit", "Documented platform gap");`,
        "```",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "tests/e2e/README.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace stale test-quality doc guidance: tests/e2e/README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects focused-test commit guidance", () => {
  withGitFixture((root) => {
    const focusedTestCall = ["it", "only"].join(".");

    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/FRONTEND_TESTING.md",
      [
        "## Debugging Failed Tests",
        "",
        "```typescript",
        `${focusedTestCall}("should test this one thing", () => {});`,
        "```",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/developer/FRONTEND_TESTING.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace stale test-quality doc guidance: docs/developer/FRONTEND_TESTING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale notification preference docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      [
        'invoke("save_notification_preferences", {',
        "  per_source_settings: {",
        "    linkedin: { enabled: true, min_score: 0.9, include_ghosts: false },",
        "  },",
        "  keyword_rules: { include: ['Rust'] },",
        "  thresholds: { slack: 0.9 },",
        "Minimum score - Only notify for jobs scoring at or above the threshold",
        "});",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/user-data-management.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync notification preference docs with backend shape: docs/features/user-data-management.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsanitized structured feedback debug events", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/debug_log.rs",
      [
        "pub fn get_debug_log() -> Vec<TimestampedEvent> {",
        "    DEBUG_LOG",
        "        .read()",
        "        .map(|buffer| buffer.get_all())",
        "        .unwrap_or_default()",
        "}",
        "",
        "pub fn get_recent_events(n: usize) -> Vec<TimestampedEvent> {",
        "    DEBUG_LOG",
        "        .read()",
        "        .map(|buffer| buffer.get_recent(n))",
        "        .unwrap_or_default()",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/feedback/debug_log.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize structured feedback debug events: src-tauri/src/commands/feedback/debug_log.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsanitized feedback file saves", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/mod.rs",
      [
        "pub async fn save_feedback_file(content: String) -> Result<(), String> {",
        "    std::fs::write(&path, content).map_err(|e| format!(\"{e}\"))?;",
        "    Ok(Some(path.to_string_lossy().into_owned()))",
        "    Ok(())",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/feedback/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize feedback file content before saving: src-tauri/src/commands/feedback/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw feedback support-open errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/mod.rs",
      [
        "pub async fn open_github_issues() -> Result<(), String> {",
        "    app.shell().open(url, None).map_err(|e| format!(\"Failed to open browser: {e}\"))?;",
        "    Command::new(\"open\").arg(\"-R\").arg(path).spawn().map_err(|e| format!(\"Failed to reveal file: {e}\"))?;",
        "    app.shell().open(parent, None).map_err(|e| format!(\"Failed to open directory: {e}\"))?;",
        "    Ok(())",
        "}",
        "fn feedback_file_content(content: &str) -> String { Sanitizer::sanitize(content) }",
        "struct SavedFeedbackFile { reveal_token: String }",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/feedback/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize feedback support-open errors: src-tauri/src/commands/feedback/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw user-data privacy logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/user_data.rs",
      [
        "pub async fn create_cover_letter_template(name: String) -> Result<(), String> {",
        "    tracing::info!(\"Command: create_cover_letter_template (name: {})\", name);",
        "    Ok(())",
        "}",
        "",
        "pub async fn create_saved_search(search: SavedSearch) -> Result<(), String> {",
        "    tracing::info!(\"Command: create_saved_search (name: {})\", search.name);",
        "    Ok(())",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/user_data/mod.rs",
      [
        "#[instrument(skip(self, content))]",
        "pub async fn create_template(&self, name: &str, content: &str) -> Result<(), Error> {",
        "    debug!(\"Creating template: {}\", name);",
        "    Ok(())",
        "}",
        "",
        "#[instrument(skip(self))]",
        "pub async fn create_saved_search(&self, search: SavedSearch) -> Result<(), Error> {",
        "    debug!(\"Creating saved search: {} ({})\", search.name, search.id);",
        "    Ok(())",
        "}",
        "",
        "#[instrument(skip(self))]",
        "pub async fn add_search_history(&self, query: &str) -> Result<(), Error> {",
        "    debug!(\"Adding search history: {}\", query);",
        "    Ok(())",
        "}",
        "",
        'serde_json::to_string(&prefs).map_err(|e| sqlx::Error::Protocol(format!("JSON serialization error: {}", e)))?;',
        "",
      ].join("\n"),
    );

    execFileSync("git", [
      "add",
      "package.json",
      "src-tauri/src/commands/user_data.rs",
      "src-tauri/src/core/user_data/mod.rs",
    ], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw user-data privacy logging: src-tauri/src/commands/user_data.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw user-data privacy logging: src-tauri/src/core/user_data/mod.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw scheduler job content logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/crud.rs",
      [
        "#[tracing::instrument(skip(self, job), fields(",
        "    job_hash = %job.hash,",
        "    job_title = %job.title,",
        "    job_company = %job.company,",
        "))]",
        "pub async fn upsert_job(&self, job: &Job) -> Result<i64, Error> {",
        "    Ok(1)",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scheduler/workers/persistence.rs",
      [
        "pub async fn persist_and_notify(job: Job) {",
        "    tracing::error!(job_title = %job.title, job_company = %job.company, \"Failed\");",
        "    errors.push(format!(\"Notification error for {}: {}\", job.title, error));",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", [
      "add",
      "package.json",
      "src-tauri/src/core/db/crud.rs",
      "src-tauri/src/core/scheduler/workers/persistence.rs",
    ], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize scheduler job content logging: src-tauri/src/core/db/crud.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sanitize scheduler job content logging: src-tauri/src/core/scheduler/workers/persistence.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw scheduler scraper error details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scheduler/workers/scrapers.rs",
      [
        "async fn run_scrapers() {",
        "  let _ = crate::core::health::fail_run(db, _tid, _dur, &e.to_string(), None).await;",
        "  let error_msg = format!(\"Dice scraper failed: {}\", e);",
        "  tracing::error!(\"{}\", error_msg);",
        "  errors.push(error_msg);",
        "  let error_msg = format!(\"Failed to retrieve USAJobs API key from keyring: {}\", e);",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", [
      "add",
      "package.json",
      "src-tauri/src/core/scheduler/workers/scrapers.rs",
    ], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize scheduler scraper error details: src-tauri/src/core/scheduler/workers/scrapers.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale user-data mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'get_search_history':",
        "      return [];",
        "    case 'list_saved_searches':",
        "      return [];",
        "    case 'save_search':",
        "      return {};",
        "    case 'delete_saved_search':",
        "      return undefined;",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync user-data mock command handlers: src/mocks/handlers.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale deep-link mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'get_supported_sites':",
        "      return [];",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync deep-link mock command handlers: src/mocks/handlers.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale job-import mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'preview_job_import':",
        "      return {};",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync job-import mock command handlers: src/mocks/handlers.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects job-import mocks returning full jobs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "function importMockJobFromUrl() {",
        "  const job = { id: 1, title: 'Care Coordinator' };",
        "  return { ...job };",
        "}",
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'preview_job_import':",
        "      return {};",
        "    case 'import_job_from_url':",
        "      return importMockJobFromUrl();",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync job-import mock command handlers: src/mocks/handlers.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat accepts job-import mocks returning only job id", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "function importMockJobFromUrl() {",
        "  const job = { id: 1, title: 'Care Coordinator' };",
        "  return { jobId: job.id };",
        "}",
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'preview_job_import':",
        "      return {};",
        "    case 'import_job_from_url':",
        "      return importMockJobFromUrl();",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      !violations.includes("sync job-import mock command handlers: src/mocks/handlers.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale feedback mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'generate_feedback_report':",
        "      return '';",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync feedback mock command handlers: src/mocks/handlers.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale feedback system-info architecture field", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/services/feedbackService.ts",
      [
        "export interface SystemInfo {",
        "  arch: string;",
        "}",
        "export function formatDebugInfo(systemInfo: SystemInfo): string {",
        "  return `Architecture: ${systemInfo.arch}`;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/feedback/DebugInfoPreview.tsx",
      "export function DebugInfoPreview({ systemInfo }) { return systemInfo.arch; }\n",
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'get_system_info':",
        "      return { arch: 'wasm' };",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/services/feedbackService.ts",
        "src/components/feedback/DebugInfoPreview.tsx",
        "src/mocks/handlers.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync feedback system-info architecture field: src/services/feedbackService.ts",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync feedback system-info architecture field: src/components/feedback/DebugInfoPreview.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync feedback system-info architecture field: src/mocks/handlers.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw feedback debug-event JSON", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/services/feedbackService.ts",
      [
        "export function formatDebugInfo(debugEvents) {",
        "  return debugEvents.map(event => JSON.stringify(event.details));",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/feedback/DebugInfoPreview.tsx",
      "export function DebugInfoPreview({ event }) { return JSON.stringify(event.details); }\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/services/feedbackService.ts",
        "src/components/feedback/DebugInfoPreview.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "keep feedback debug event details readable: src/services/feedbackService.ts",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep feedback debug event details readable: src/components/feedback/DebugInfoPreview.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects technical company labels in feedback reports", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/services/feedbackService.ts",
      [
        "export function formatDebugInfo(configSummary) {",
        '  return `Company blocklist: ${configSummary.has_company_blocklist}\\nCompany allowlist: ${configSummary.has_company_allowlist}`;',
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/services/feedbackService.ts"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("keep feedback reports plain-language: src/services/feedbackService.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw problem-history context JSON", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/ErrorLogPanel.tsx",
      [
        "export function ErrorLogPanel({ error }) {",
        "  return <p>{error.message}</p>;",
        "  return <pre>{JSON.stringify(error.context)}</pre>;",
        "  return <pre>{error.stack}</pre>;",
        "  return <pre>{error.componentStack}</pre>;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/components/ErrorLogPanel.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "keep problem-history context details readable: src/components/ErrorLogPanel.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw visible error-boundary details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/ComponentErrorBoundary.tsx",
      [
        "export function ComponentErrorBoundary({ error }) {",
        "  return <p>{this.state.error.message}</p>;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/ErrorBoundary.tsx",
      [
        "export function ErrorBoundary({ error }) {",
        "  return <p>{this.state.error.message}</p>;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/ModalErrorBoundary.tsx",
      [
        "export function ModalErrorBoundary({ error }) {",
        "  return <pre>{this.state.error.stack}</pre>;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/PageErrorBoundary.tsx",
      [
        "export function PageErrorBoundary({ error }) {",
        "  const message = error.message;",
        "  return <p>{sanitizeTextForStorage(message)}</p>;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/components/ComponentErrorBoundary.tsx",
        "src/components/ErrorBoundary.tsx",
        "src/components/ModalErrorBoundary.tsx",
        "src/components/PageErrorBoundary.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize visible error-boundary details: src/components/ComponentErrorBoundary.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sanitize visible error-boundary details: src/components/ErrorBoundary.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sanitize visible error-boundary details: src/components/ModalErrorBoundary.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sanitize visible error-boundary details: src/components/PageErrorBoundary.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects technical recovery copy", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/ComponentErrorBoundary.tsx",
      [
        "export function ComponentErrorBoundary() {",
        "  return <p>{this.props.componentName} Error</p>;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/ErrorBoundary.tsx",
      [
        "export function ErrorBoundary({ count }) {",
        "  return <p>Error occurred {count} times</p>;",
        "  return <button>Reset Window State & Reload</button>;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/ModalErrorBoundary.tsx",
      [
        "export function ModalErrorBoundary() {",
        "  return <button aria-label=\"Close error dialog\">Close</button>;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/PageErrorBoundary.tsx",
      [
        "export function PageErrorBoundary({ pageName }) {",
        "  return <EmptyState title={`${pageName || \"Page\"} Error`} />;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/ScraperHealthDashboard.tsx",
      [
        "export function ScraperHealthDashboard() {",
        "  return <CardHeader title=\"Error\" />;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/components/ComponentErrorBoundary.tsx",
        "src/components/ErrorBoundary.tsx",
        "src/components/ModalErrorBoundary.tsx",
        "src/components/PageErrorBoundary.tsx",
        "src/components/ScraperHealthDashboard.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src/components/ComponentErrorBoundary.tsx",
      "src/components/ErrorBoundary.tsx",
      "src/components/ModalErrorBoundary.tsx",
      "src/components/PageErrorBoundary.tsx",
      "src/components/ScraperHealthDashboard.tsx",
    ]) {
      assert.ok(
        violations.includes(`keep recovery copy plain-language: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects non-protective score copy", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/ScoreDisplay.tsx",
      [
        'const label = "Great Match!";',
        'const detail = "This job is Highly recommended!";',
        'const aria = "Match score: 80%. Good Match";',
        "return <div>{reason}</div>;",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/ScoreBreakdownModal.tsx",
      'const detail = "You might want to skip it"; const help = "You can adjust scoring weights in Settings";\n',
    );
    writeFixtureFile(
      root,
      "src/components/ResumeMatchScoreBreakdown.tsx",
      '"Overall score is calculated using weighted averages based on component importance"; "(50% weight)";\n',
    );
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      [
        '"Job Scoring Weights"; "These weights determine how jobs are scored.";',
        '"Jobs are scored based on how close they are to your target.";',
        '"Your ideal salary - jobs at or above this get top scores";',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/DashboardUI/DashboardFiltersBar.tsx",
      '"Score (High → Low)"; "Score (Low → High)"; label="Score"; "All Scores";\n',
    );
    writeFixtureFile(
      root,
      "src/pages/Dashboard.tsx",
      'return <><li>Sort: {filters.sortBy}</li><li>Score: {filters.scoreFilter}</li><CompareRow label="Match Score" /></>;\n',
    );
    writeFixtureFile(
      root,
      "src/config/tourSteps.ts",
      '"Too many jobs? Use these filters to narrow by match score, source, or bookmarked jobs.";\n',
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Each job is scored against your saved search.\nEvery job found, sorted by match score.\n",
    );
    writeFixtureFile(
      root,
      "docs/features/notifications.md",
      "Jobs scoring above your threshold can notify you. Settings > Notifications > Alert Threshold.\n",
    );
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      "- Old posting: adjust recency weight if you're desperate\n## Weight Presets\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/notifications.md",
        "docs/features/smart-scoring.md",
        "docs/user/QUICK_START.md",
        "src/config/tourSteps.ts",
        "src/components/ResumeMatchScoreBreakdown.tsx",
        "src/components/ScoreDisplay.tsx",
        "src/components/ScoreBreakdownModal.tsx",
        "src/pages/Dashboard.tsx",
        "src/pages/DashboardUI/DashboardFiltersBar.tsx",
        "src/pages/Settings.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("keep score copy protective: src/components/ScoreDisplay.tsx"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("keep score copy protective: src/components/ScoreBreakdownModal.tsx"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("keep score copy protective: src/components/ResumeMatchScoreBreakdown.tsx"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("keep score copy protective: src/pages/Settings.tsx"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("keep score copy protective: src/pages/DashboardUI/DashboardFiltersBar.tsx"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("keep score copy protective: src/pages/Dashboard.tsx"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("keep score copy protective: src/config/tourSteps.ts"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("keep score copy protective: docs/user/QUICK_START.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("keep score copy protective: docs/features/notifications.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("keep score copy protective: docs/features/smart-scoring.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects legacy preference-list docs copy", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      [
        "### Company Whitelist",
        "- Jobs from whitelisted companies: +50% to company score",
        "- Title matches allowlist: +100%",
        "2. **Job-word boosters**",
        '- Boosted job words: ["Onboarding"]',
        "Job-Word Match:",
        "  Onboarding (found, boosted) +10%",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/application-tracking.md",
      "- [ ] **Company Blacklist** - Never apply to bad companies again\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/smart-scoring.md",
        "docs/features/application-tracking.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("keep job-search docs plain-language: docs/features/smart-scoring.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("keep job-search docs plain-language: docs/features/application-tracking.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects discontinued Stack Overflow Jobs deep links", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/user/DEEP_LINKS.md",
      "- **Stack Overflow Jobs** - Developer-focused jobs\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/deeplinks/generator.rs",
      '"stackoverflow" => "https://stackoverflow.com/jobs?q=test";\n',
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      'const id = "stackoverflow";\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/user/DEEP_LINKS.md",
        "src-tauri/src/core/deeplinks/generator.rs",
        "src/mocks/handlers.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove discontinued Stack Overflow Jobs deep link: docs/user/DEEP_LINKS.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove discontinued Stack Overflow Jobs deep link: src-tauri/src/core/deeplinks/generator.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove discontinued Stack Overflow Jobs deep link: src/mocks/handlers.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale resume optimizer mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'analyze_resume_format':",
        "      return { issues: [], recommendations: [] };",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync resume optimizer mock command handlers: src/mocks/handlers.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale resume suggestion category labels", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/resume/ats_analyzer.rs",
      `
pub enum SuggestionCategory {
    AddKeyword,
    RewordBullet,
    AddSection,
    ReorderContent,
    FormatFix,
}
`,
    );
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizer.tsx",
      'type SuggestionCategory = "AddKeyword" | "RewordBullet" | "AddSection" | "RemoveItem";\n',
    );
    writeFixtureFile(
      root,
      "src/components/AtsLiveScorePanel.tsx",
      'type SuggestionCategory = "AddKeyword" | "RewordBullet" | "AddSection" | "ReorderContent" | "FormatFix";\n',
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      'type MockSuggestionCategory = "AddKeyword" | "RewordBullet" | "AddSection";\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "src-tauri/src/core/resume/ats_analyzer.rs",
        "src/pages/ResumeOptimizer.tsx",
        "src/components/AtsLiveScorePanel.tsx",
        "src/mocks/handlers.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync resume suggestion category labels: src/pages/ResumeOptimizer.tsx"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("sync resume suggestion category labels: src/mocks/handlers.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale ATS keyword match frontend shape", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizer.tsx",
      [
        "interface KeywordMatch {",
        "  keyword: string;",
        "  found_in: string;",
        "  context: string;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/AtsLiveScorePanel.tsx",
      [
        "interface KeywordMatch {",
        "  keyword: string;",
        "  found_in: string;",
        "  context: string;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/pages/ResumeOptimizer.tsx",
        "src/components/AtsLiveScorePanel.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync ATS keyword match frontend shape: src/pages/ResumeOptimizer.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync ATS keyword match frontend shape: src/components/AtsLiveScorePanel.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsafe Resume Optimizer JSON parsing", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizer.tsx",
      [
        "async function handleAnalyze() {",
        "  const resume: AtsResumeData = JSON.parse(resumeJson);",
        "  await invoke('analyze_resume_format', { resume });",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/pages/ResumeOptimizer.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("validate Resume Optimizer JSON before invoke: src/pages/ResumeOptimizer.tsx"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects runtime frontend invokes missing dev mock cases", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/RuntimeInvoke.tsx",
      [
        "import { invoke } from '@tauri-apps/api/core';",
        "export async function load() {",
        "  return await invoke('missing_runtime_command');",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'known_command':",
        "      return undefined;",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/components/RuntimeInvoke.tsx", "src/mocks/handlers.ts"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync dev mock handlers for runtime invokes: src/mocks/handlers.ts missing missing_runtime_command",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale salary benchmark frontend shape", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/Salary.tsx",
      [
        "interface SalaryBenchmark {",
        "  role: string;",
        "  p50: number;",
        "  p90: number;",
        "}",
        "export function Salary({ benchmark }) {",
        "  return benchmark.role + benchmark.p90;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/pages/Salary.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync salary benchmark frontend shape: src/pages/Salary.tsx"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsupported salary seniority option values", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/Salary.tsx",
      [
        "const SENIORITY_LEVELS = [",
        '  { value: "executive", label: "Executive/Director" },',
        "];",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/pages/Salary.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync salary benchmark frontend shape: src/pages/Salary.tsx"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale interview follow-up frontend shape", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/InterviewScheduler.tsx",
      [
        "export function mapFollowup(result) {",
        "  return { thankYouSent: result.thank_you_sent, sentAt: result.sent_at };",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/components/InterviewScheduler.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync interview follow-up frontend shape: src/components/InterviewScheduler.tsx"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale resume match sub-score display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/Resume.tsx",
      [
        "export function Resume({ match }) {",
        "  return <div style={{ width: `${match.skills_match_score}%` }}>{Math.round(match.experience_match_score)}%</div>;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/pages/Resume.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("render resume match sub-scores from backend fractions: src/pages/Resume.tsx"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale resume E2E match seeds", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "tests/e2e/playwright/resume-upload-matching.spec.ts",
      [
        "const seededMatches = [{",
        "  overall_match_score: 86,",
        "  skills_match_score: 88,",
        '  gap_analysis: "✓ React experience matches",',
        "}];",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "tests/e2e/playwright/resume-upload-matching.spec.ts"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync resume E2E match seeds with backend fraction shape: tests/e2e/playwright/resume-upload-matching.spec.ts",
      ),
      violations.join("\n"),
    );
  });
});
