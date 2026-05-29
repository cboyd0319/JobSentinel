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

test("checkRepoBloat rejects engineer-first audience examples", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/Salary.tsx",
      '<Input placeholder="e.g., Senior Software Engineer" />\n',
    );
    writeFixtureFile(
      root,
      "docs/features/resume-matcher.md",
      [
        "JobSentinel extracts technical and soft skills.",
        "- **Skill Extraction** - Identify 200+ technical skills across 6 categories",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      ['Type in job titles that match what you want. Examples:', '- "Software Engineer"', ""].join(
        "\n",
      ),
    );
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      'Give it a name (for example: "SWE Remote 120k+", "Design NYC Entry-level")\n',
    );
    writeFixtureFile(
      root,
      "docs/features/scrapers.md",
      '{ "linkedin": { "query": "software engineer" } }\n',
    );
    writeFixtureFile(
      root,
      "docs/README.md",
      "- 5 ATS-optimized templates (Classic, Modern, Technical, Executive, Military)\n",
    );
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      "- 5 ATS-optimized templates (Classic, Modern, Technical, Executive, Military)\n",
    );
    writeFixtureFile(
      root,
      "docs/features/resume-builder.md",
      [
        "| **Modern** | Tech companies - clean and minimal |",
        "| **Technical** | Engineering roles - skills first |",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      "- **Tech Stack Focus** - Skills 50%, Salary 20%, Location 15%, Company 10%, Recency 5%\n",
    );
    writeFixtureFile(
      root,
      "src/pages/DashboardUI/DashboardFiltersBar.tsx",
      "<p>Comma or OR: react, vue</p><p>AND: senior AND engineer</p>\n",
    );
    writeFixtureFile(
      root,
      "src/pages/Dashboard.tsx",
      '<input placeholder="e.g., Remote Rust Jobs" />\n',
    );
    writeFixtureFile(
      root,
      "src/components/CompanyResearchPanel.tsx",
      "<p>Tech Stack</p>\n",
    );
    writeFixtureFile(
      root,
      "src/components/CoverLetterTemplates.tsx",
      '<Input placeholder="e.g., Tech Company Application" />\n',
    );
    writeFixtureFile(
      root,
      "src/components/JobImportModal.tsx",
      '<input placeholder="https://example.com/jobs/software-engineer" />\n',
    );
    writeFixtureFile(
      root,
      "src/mocks/data.ts",
      [
        'export const mockConfig = { linkedin: { query: "software engineer" } };',
        'export const mockJobs = [{ title: "Senior Software Engineer" }];',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        '"TypeScript demand is surging"',
        '{ skill_name: "Kubernetes" }',
        'top_skill: "TypeScript"',
        '"BigTech Inc"',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/resume/templates.rs",
      '"Technical Skills-First"; "Perfect for engineering roles";\n',
    );
    writeFixtureFile(
      root,
      "src/pages/ResumeBuilder.tsx",
      '"Technical & soft skills"\n',
    );
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizer.tsx",
      '<textarea placeholder="e.g., Worked on improving database performance" />\n',
    );
    writeFixtureFile(
      root,
      "src/components/resume-builder/steps/SummaryStep.tsx",
      '<textarea placeholder="Experienced software engineer with 5+ years building apps." />\n',
    );
    writeFixtureFile(
      root,
      "src/components/resume-builder/steps/SkillsStep.tsx",
      '<input placeholder="React" /><input placeholder="Frontend" />"Technical and professional skills"\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/pages/Dashboard.tsx",
        "src/pages/Salary.tsx",
        "src/pages/DashboardUI/DashboardFiltersBar.tsx",
        "src/components/CompanyResearchPanel.tsx",
        "src/components/CoverLetterTemplates.tsx",
        "src/components/JobImportModal.tsx",
        "src/mocks/data.ts",
        "src/mocks/handlers.ts",
        "src-tauri/src/core/resume/templates.rs",
        "src/pages/ResumeBuilder.tsx",
        "src/pages/ResumeOptimizer.tsx",
        "src/components/resume-builder/steps/SummaryStep.tsx",
        "src/components/resume-builder/steps/SkillsStep.tsx",
        "docs/README.md",
        "docs/ROADMAP.md",
        "docs/features/resume-builder.md",
        "docs/features/smart-scoring.md",
        "docs/features/scrapers.md",
        "docs/features/resume-matcher.md",
        "docs/features/user-data-management.md",
        "docs/user/QUICK_START.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src/pages/Salary.tsx",
      "src/pages/Dashboard.tsx",
      "src/pages/DashboardUI/DashboardFiltersBar.tsx",
      "src/components/CompanyResearchPanel.tsx",
      "src/components/CoverLetterTemplates.tsx",
      "src/components/JobImportModal.tsx",
      "src/mocks/data.ts",
      "src/mocks/handlers.ts",
      "src-tauri/src/core/resume/templates.rs",
      "src/pages/ResumeBuilder.tsx",
      "src/pages/ResumeOptimizer.tsx",
      "src/components/resume-builder/steps/SummaryStep.tsx",
      "src/components/resume-builder/steps/SkillsStep.tsx",
      "docs/features/resume-builder.md",
      "docs/features/smart-scoring.md",
      "docs/features/scrapers.md",
      "docs/features/resume-matcher.md",
      "docs/features/user-data-management.md",
      "docs/user/QUICK_START.md",
    ]) {
      assert.ok(
        violations.includes(`replace engineer-first audience example: ${path}`),
        violations.join("\n"),
      );
    }
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
        '"Bookmarklet Code"',
        '"Server Port"',
        '"Start Server"',
        '"Paste the code into the URL/Location field"',
        '"Any with Schema.org data"',
        '"Works best with sites that use structured Schema.org JobPosting data."',
        '"Falls back to smart DOM parsing for others."',
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
      '<Button>Import JSON Resume</Button><p>Your JSON Resume has been imported</p>\n',
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
        '<HelpIcon text="Patterns use regex matching." />',
        '<Input label="Question Pattern (regex) *" hint="Use regex patterns to match question text." />',
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
      '"Error Logs"; "Stack Trace"; "Component Stack"; "Technical details"; "Save Log";\n',
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
      "The patterns are flexible (regex), so they match variations.\n",
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
        "Any company site using Schema.org JobPosting markup.",
        "Smart DOM Parsing falls back to intelligent HTML parsing.",
        "Click \"Start Server\".",
        "Paste the copied code into the URL/Location field.",
        "**No Scraping** - Bookmarklet runs in user's browser.",
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
        "src/pages/Dashboard.tsx",
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
      "src/pages/Dashboard.tsx",
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
      "docs/user/QUICK_START.md",
      [
        "Pick from 5 ATS-friendly templates",
        'ATS stands for "Applicant Tracking System"',
        "Get instant feedback on what keywords you're missing",
        "",
      ].join("\n"),
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
        "src/pages/ResumeBuilder.tsx",
        "docs/user/QUICK_START.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src/components/Navigation.tsx",
      "src/contexts/KeyboardShortcutsContext.tsx",
      "src/App.tsx",
      "src/components/AtsLiveScorePanel.tsx",
      "src/pages/ResumeBuilder.tsx",
      "docs/user/QUICK_START.md",
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
      '"One-Click Apply Settings"; "Total Attempts"; "Success Rate";\n',
    );
    writeFixtureFile(
      root,
      "src/components/automation/ApplyButton.tsx",
      '"Quick Apply"; "Prepare to apply - fills form fields automatically";\n',
    );
    writeFixtureFile(
      root,
      "src/components/automation/ApplicationPreview.tsx",
      '"Fields that will be auto-filled";\n',
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

test("checkRepoBloat rejects developer testing doc stale markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/TESTING.md",
      [
        "// Good ✅",
        "// Bad ❌",
        "| Core business logic | 90%+ | ✅ Achieved |",
        "| Scrapers | 70%+ | ⚠️ In Progress |",
        "### DO ✅",
        "### DON'T ❌",
        "**Last Updated:** May 19, 2026",
        "**Version:** v2.6.4",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/FRONTEND_TESTING.md",
      [
        "### DO ✅",
        "### DON'T ❌",
        "**Last Updated**: May 19, 2026",
        "**Test Count**: Run `npm run test:run` for current frontend count",
        "**Stack**: Vitest 4.0.17",
        "**Maintained By**: JobSentinel Team",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/INTEGRATION_TESTING.md",
      [
        "### DO ✅",
        "### DON'T ❌",
        "**Last Updated**: March 18, 2026",
        "**Test Count**: Run `cargo test --test '*' -- --list`",
        "**Version**: v2.6.4",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/MUTATION_TESTING.md",
      [
        "x > 0  // ✅ Line covered",
        "is_positive(5);  // ❌ No assertion",
        "**⚠️ Warning:** Full mutation testing can take 30-60+ minutes!",
        "✅ CAUGHT by test_negative_salary_floor_fails",
        "❌ MISSED - no test caught this mutation",
        "| **Timeout** ⏱️ | Tests took too long |",
        "**Last Updated**: May 20, 2026",
        "**Maintained By**: JobSentinel maintainers",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/developer/TESTING.md",
        "docs/developer/FRONTEND_TESTING.md",
        "docs/developer/INTEGRATION_TESTING.md",
        "docs/developer/MUTATION_TESTING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace developer testing doc stale markers: docs/developer/TESTING.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer testing doc stale markers: docs/developer/FRONTEND_TESTING.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer testing doc stale markers: docs/developer/INTEGRATION_TESTING.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer testing doc stale markers: docs/developer/MUTATION_TESTING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects developer architecture doc stale markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      [
        "**JobSentinel v2.6.4 System Architecture**",
        "// Good ✅: Core depends on abstractions",
        "// Bad ❌: Core depends on concrete types",
        "- No cloud dependencies (v1.0)",
        "**Last Updated**: May 20, 2026",
        "**Version**: 2.6.4",
        "**Maintained By**: JobSentinel maintainers",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/ERROR_HANDLING.md",
      [
        "// Good ✅: Structured fields",
        "// Bad ❌: String interpolation only",
        "**DO ✅:**",
        "**DON'T ❌:**",
        "| Bad ❌ | Good ✅ |",
        "### DO ✅",
        "### DON'T ❌",
        "**Last Updated**: May 20, 2026",
        "**Maintained By**: JobSentinel maintainers",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/developer/ARCHITECTURE.md", "docs/developer/ERROR_HANDLING.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace developer architecture doc stale markers: docs/developer/ARCHITECTURE.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer architecture doc stale markers: docs/developer/ERROR_HANDLING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects developer architecture doc diagram glyphs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      ["```text", "┌──────────────┐", "│ Frontend     │", "Frontend → Backend", "```", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/ERROR_HANDLING.md",
      ["```text", "├─ Yes → Use a domain-specific error enum", "└─ No → Use anyhow::Result", "```", ""].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/developer/ARCHITECTURE.md", "docs/developer/ERROR_HANDLING.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace developer architecture doc stale markers: docs/developer/ARCHITECTURE.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer architecture doc stale markers: docs/developer/ERROR_HANDLING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects developer maintenance doc stale markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/CONTRIBUTING.md",
      [
        "# Contributing",
        "",
        "**Current version:** 2.6.4 (Production Ready)",
        "",
        "## 🚀 Getting Started",
        "",
        "- ✅ **Do:** Provide constructive feedback",
        "- ❌ **Don't:** Share private information",
        "",
        "**Last Updated:** March 18, 2026 (v2.6.4)",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      [
        "# Getting Started",
        "",
        "**Version 2.6.4**",
        "",
        "│   │   │   ├── db/          # Database layer (refactored v1.5)",
        "",
        "### Modular Architecture (v1.5+)",
        "",
        "1. Read ROADMAP.md for v1.5+ priorities",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/WHY_TAURI.md",
      [
        "# Why Tauri?",
        "",
        "**Last Updated:** March 18, 2026",
        "**Version:** v2.6.4",
        "├── Chrome runtime",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/RELEASING.md",
      ["# Releases", "", "## Version History", "", "- **v2.7.1 (unreleased)** - Notes", ""].join(
        "\n",
      ),
    );
    writeFixtureFile(
      root,
      "docs/developer/CI_CD.md",
      ["# CI/CD", "", "**Last updated:** March 2026", "**Version:** v2.6.4", ""].join(
        "\n",
      ),
    );
    writeFixtureFile(
      root,
      "docs/developer/ADDING_DEEP_LINK_SITES.md",
      ["# Add Deep Link Sites", "", "Right-click → \"View Page Source\"", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/MACOS_DEVELOPMENT.md",
      ["# macOS Development", "", "Happy hacking on macOS! 🍎", ""].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/developer/CONTRIBUTING.md",
        "docs/developer/GETTING_STARTED.md",
        "docs/developer/WHY_TAURI.md",
        "docs/developer/RELEASING.md",
        "docs/developer/CI_CD.md",
        "docs/developer/ADDING_DEEP_LINK_SITES.md",
        "docs/developer/MACOS_DEVELOPMENT.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/CONTRIBUTING.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/GETTING_STARTED.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/WHY_TAURI.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/RELEASING.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/CI_CD.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/ADDING_DEEP_LINK_SITES.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/MACOS_DEVELOPMENT.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects top-level active doc stale markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/BOOKMARKLET.md",
      ["# Browser Bookmarklet Integration", "", "**Version:** 2.6+", "**Status:** Ready", ""].join(
        "\n",
      ),
    );
    writeFixtureFile(
      root,
      "docs/ML_FEATURE.md",
      [
        "# Embedded ML Feature",
        "",
        "**Status:** Optional feature",
        "**Version:** 2.7+",
        "**Model:** all-MiniLM-L6-v2",
        "",
        "### With ML support (default build)",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/TESTING.md",
      "# Testing Guide\n\nComplete guide to testing in JobSentinel v2.6.4\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/FRONTEND_TESTING.md",
      "# Frontend Testing Guide\n\nComplete guide to testing React components in JobSentinel v2.6.4\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/BOOKMARKLET.md",
        "docs/ML_FEATURE.md",
        "docs/developer/TESTING.md",
        "docs/developer/FRONTEND_TESTING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace top-level active doc stale markers: docs/BOOKMARKLET.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace top-level active doc stale markers: docs/ML_FEATURE.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace top-level active doc stale markers: docs/developer/TESTING.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace top-level active doc stale markers: docs/developer/FRONTEND_TESTING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects top-level active doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/ML_FEATURE.md",
      ["src-tauri/src/core/ml/", "├── mod.rs", "└── tests.rs", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/ML_QUICKSTART.md",
      ["<span>✓ ML Ready</span>", "console.log('✓ match')", ""].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/ML_FEATURE.md", "docs/ML_QUICKSTART.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace top-level active doc glyph markers: docs/ML_FEATURE.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace top-level active doc glyph markers: docs/ML_QUICKSTART.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsupported Vitest grep docs", () => {
  withGitFixture((root) => {
    const unsupportedVitestFilterFlag = ["--", "grep"].join("");

    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/FRONTEND_TESTING.md",
      [
        "## Running Tests",
        "",
        "```bash",
        `npm test -- ${unsupportedVitestFilterFlag} "GhostIndicator"`,
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

test("checkRepoBloat rejects stale E2E wait guidance", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "tests/e2e/README.md",
      [
        "### Waiting Strategies",
        "",
        '- `waitForLoadState("networkidle")` - Wait for network requests',
        "- `waitForTimeout(ms)` - Wait for animations/transitions",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "tests/e2e/README.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace stale E2E wait guidance: tests/e2e/README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects fixed waits in E2E page objects", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "tests/e2e/playwright/page-objects/BasePage.ts",
      "export async function wait(page) { await page.waitForTimeout(500); }\n",
    );

    execFileSync(
      "git",
      ["add", "package.json", "tests/e2e/playwright/page-objects/BasePage.ts"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace fixed E2E page-object wait: tests/e2e/playwright/page-objects/BasePage.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unreferenced E2E test helpers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "tests/e2e/playwright/test-helpers.ts",
      "export async function waitForAnimation(page) { await page.waitForTimeout(300); }\n",
    );
    writeFixtureFile(root, "tests/e2e/playwright/app.spec.ts", "import { test } from '@playwright/test';\n");

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "tests/e2e/playwright/test-helpers.ts",
        "tests/e2e/playwright/app.spec.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove unreferenced E2E test helper: tests/e2e/playwright/test-helpers.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale getting started tooling docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      [
        "# Getting Started",
        "",
        "cargo install tauri-cli@2.1",
        "",
        "| **Tauri 2.1** | Desktop app framework |",
        "",
        "# Frontend tests",
        "npm test",
        "",
        "# Lint Rust code",
        "cargo clippy",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/developer/GETTING_STARTED.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync getting-started tooling docs: docs/developer/GETTING_STARTED.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale macOS developer docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/MACOS_DEVELOPMENT.md",
      [
        "# macOS Development",
        "",
        "**Output:** `src-tauri/target/release/bundle/dmg/JobSentinel_1.0.0_aarch64.dmg`",
        "",
        "### Currently Implemented ✅",
        "",
        "- ✅ Application Support directory",
        "- 🟡 Code signing for distribution",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/developer/MACOS_DEVELOPMENT.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync macOS developer docs: docs/developer/MACOS_DEVELOPMENT.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale SQLite configuration docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/sqlite-configuration.md",
      [
        "# SQLite Maximum Protection & Performance Configuration",
        "",
        "> **Status:** ✅ Fully Implemented",
        "> **Last Reviewed:** 2026-05-21",
        "",
        "- **Estimated Performance Gain:** 200-300% for read-heavy workloads",
        "",
        "| `cache_size` | **-64000** (64MB) | In-memory page cache |",
        "",
        "- [ ] **Cloud backup sync** (optional S3/GCS upload)",
        "",
        "- [ ] Cache size set (`PRAGMA cache_size` returns -64000)",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/developer/sqlite-configuration.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync SQLite configuration doc: docs/developer/sqlite-configuration.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects speculative cloud deployment docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "## Cloud Architecture (not implemented)\n\nCloud Backend (GCP/AWS)\n\nCore can run on any OS or in the cloud.\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      "src-tauri/src/cloud/ # GCP/AWS deployment\n",
    );
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      "- GCP Cloud Run / AWS Lambda deployment\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/developer/ARCHITECTURE.md",
        "docs/developer/GETTING_STARTED.md",
        "docs/ROADMAP.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove speculative cloud deployment doc: docs/developer/ARCHITECTURE.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove speculative cloud deployment doc: docs/developer/GETTING_STARTED.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("remove speculative cloud deployment doc: docs/ROADMAP.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects Storybook addons without package ownership", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "package.json",
      JSON.stringify(
        {
          devDependencies: {
            "@storybook/addon-docs": "^10.2.19",
            "@storybook/react-vite": "^10.2.19",
            storybook: "^10.2.19",
          },
        },
        null,
        2,
      ),
    );
    writeFixtureFile(
      root,
      ".storybook/main.ts",
      [
        "export default {",
        '  "addons": ["@storybook/addon-docs", "@chromatic-com/storybook"],',
        '  "framework": "@storybook/react-vite"',
        "};",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", ".storybook/main.ts"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove Storybook addon without package ownership: .storybook/main.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale shipped-feature roadmap statuses", () => {
  withGitFixture((root) => {
    const plannedStatusIcon = String.fromCodePoint(0x1f532);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      [
        "- **Implementation:** `src-tauri/src/core/import/` module (planned)",
        `3. ${plannedStatusIcon} Universal Job Importer with Schema.org parsing`,
        `4. ${plannedStatusIcon} Deep Link Generator for 15+ sites`,
        `5. ${plannedStatusIcon} Bookmarklet generator`,
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/ROADMAP.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove stale shipped-feature status doc: docs/ROADMAP.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects roadmap status emoji", () => {
  withGitFixture((root) => {
    const doneStatusIcon = String.fromCodePoint(0x2705);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "docs/ROADMAP.md", `| Feature | ${doneStatusIcon} Done |\n`);

    execFileSync("git", ["add", "package.json", "docs/ROADMAP.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace roadmap status emoji with text: docs/ROADMAP.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects roadmap version drift markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      [
        "**Last Updated:** May 20, 2026",
        "## Current Version: 2.6.4",
        "### v2.7+ Planned / Unreleased Features",
        "| Linux support | Done | - | v2.7.0 - Ubuntu 20.04+ compatibility |",
        "4. Done - Deep Link Generator for 19+ sites (v2.6+)",
        "### Frontend Architecture (v2.6+)",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/ROADMAP.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace roadmap version drift markers: docs/ROADMAP.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects front-door docs stale footer", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "docs/README.md", "**Last Updated:** 2026-05-20\n");

    execFileSync("git", ["add", "package.json", "docs/README.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace front-door doc stale footer: docs/README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale informal maintainer footers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/ERROR_HANDLING.md",
      "**Maintained By**: The Rust Mac Overlord 🦀\n",
    );

    execFileSync("git", ["add", "package.json", "docs/developer/ERROR_HANDLING.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace stale informal maintainer footer: docs/developer/ERROR_HANDLING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale docs tree claims", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      "│   ├── migrations/          # 4 SQLite migrations\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/INTEGRATION_TESTING.md",
      "└── fixtures/                          # Test HTML/JSON responses\n\nTest HTML responses stored in `fixtures/`:\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/developer/GETTING_STARTED.md",
        "docs/developer/INTEGRATION_TESTING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale hardcoded migration count: docs/developer/GETTING_STARTED.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove stale integration fixture directory claim: docs/developer/INTEGRATION_TESTING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale scheduler refactor docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "`workers/scraper.rs` - Scraper worker threads\n`workers/notifier.rs` - Notification worker\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      "**v1.5 Refactoring Priority**\n\n`db/mod.rs` | 4442 | CRITICAL - needs modularization\n",
    );
    writeFixtureFile(
      root,
      "docs/security/KEYRING.md",
      "Used by: notify/mod.rs, scheduler/scrapers.rs\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/developer/ARCHITECTURE.md",
        "docs/developer/GETTING_STARTED.md",
        "docs/security/KEYRING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale scheduler worker path docs: docs/developer/ARCHITECTURE.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove stale refactoring-priority table: docs/developer/GETTING_STARTED.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("remove stale scheduler scraper path docs: docs/security/KEYRING.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale scrape_all error-handling docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/ERROR_HANDLING.md",
      "let jobs = self.scrape_all().await?;\n",
    );

    execFileSync("git", ["add", "package.json", "docs/developer/ERROR_HANDLING.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale scrape_all error-handling doc: docs/developer/ERROR_HANDLING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale Linux platform stub markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/platforms/linux/mod.rs",
      [
        "//! Linux-Specific Implementation (v2.0 - Coming Soon)",
        "//! This module will contain Linux-specific code for JobSentinel v2.0.",
        "tracing::info!(\"Linux platform initialized (v2.0 - limited functionality)\");",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/platforms/linux/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace stale Linux platform stub markers: src-tauri/src/platforms/linux/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale user-data export roadmap claims", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      [
        "- **Export anytime** - You can export your data as JSON (feature coming in v1.5)",
        "Consider creating a backup first (feature coming in v1.5).",
        "**v1.5 (Q1 2026):**",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/user-data-management.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale user-data export roadmap claim: docs/features/user-data-management.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale user-data management doc shape", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      [
        "**Your job search, organized and persistent.**",
        "templates with smart variable substitution",
        '"Tech Startup", "Fortune 500"',
        "## Tauri Commands (API Reference)",
        "These commands power the user data features.",
        "### Database Schema",
        "CREATE TABLE saved_searches",
        "## Open Gaps",
        "The current user-data commands do not provide a full JSON export/import",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/user-data-management.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync user-data docs with local privacy guidance: docs/features/user-data-management.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale cargo-deny advisory ignores", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/deny.toml",
      [
        "[advisories]",
        "ignore = [",
        '  "RUSTSEC-2025-0057", # fxhash',
        "]",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/deny.toml"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove stale cargo-deny advisory ignore: src-tauri/deny.toml"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects overbroad localStorage migration claims", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      "- Backend persistence for all user data (localStorage → SQLite)\n",
    );

    execFileSync("git", ["add", "package.json", "docs/ROADMAP.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace overbroad localStorage migration claim: docs/ROADMAP.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects Deep Links doc emoji and version promises", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/user/DEEP_LINKS.md",
      [
        "These are clearly marked with a 🔐 icon.",
        "| **Legal** | ✅ Always | ⚠️ Site-dependent |",
        "- **Saved Searches** (coming in v2.7) - Save favorite deep link searches",
        "Not yet, but planned for v2.7.",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/user/DEEP_LINKS.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace Deep Links doc emoji/version promises: docs/user/DEEP_LINKS.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects Quick Start doc emoji markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      [
        "- ✅ **Remote** - Work from anywhere",
        "### Resume Builder 📄",
        "- 🚀 **Review applications** with Application Assist",
        "**Happy job hunting!** 🎯",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/user/QUICK_START.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace Quick Start doc emoji markers: docs/user/QUICK_START.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects active user doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/application-tracking.md",
      ["applications", "├── id (PRIMARY KEY)", "To Apply → Applied", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      "Only notify for jobs scoring ≥ threshold\n",
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Go to System Settings → Privacy & Security\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/application-tracking.md",
        "docs/features/user-data-management.md",
        "docs/user/QUICK_START.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace active user doc glyph markers: docs/features/application-tracking.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace active user doc glyph markers: docs/features/user-data-management.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace active user doc glyph markers: docs/user/QUICK_START.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects feature doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/ghost-detection.md",
      "Customize in Settings → Detection → Ghost Job Settings\n",
    );
    writeFixtureFile(
      root,
      "docs/features/json-resume-import.md",
      "\"beginner\" → Beginner\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/ghost-detection.md",
        "docs/features/json-resume-import.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace feature doc glyph markers: docs/features/ghost-detection.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace feature doc glyph markers: docs/features/json-resume-import.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects maintained doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "docs/README.md", ["docs/", "├── README.md", "└── images/", ""].join("\n"));
    writeFixtureFile(root, "docs/ROADMAP.md", "Resume → Builder Integration\n");
    writeFixtureFile(
      root,
      "docs/style-guide/GLOSSARY.md",
      "Go to System Settings → Privacy & Security\n",
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/README.md", "docs/ROADMAP.md", "docs/style-guide/GLOSSARY.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace maintained doc glyph markers: docs/README.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace maintained doc glyph markers: docs/ROADMAP.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace maintained doc glyph markers: docs/style-guide/GLOSSARY.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects developer layout doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      ["JobSentinel/", "├── src/", "└── vite.config.ts", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/FRONTEND_TESTING.md",
      ["src/", "├── components/", "└── test/", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/TESTING.md",
      ["src-tauri/", "├── src/", "└── tests/", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/INTEGRATION_TESTING.md",
      "Full pipelines - Scraper → Scorer → Database → Notifications\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/developer/FRONTEND_TESTING.md",
        "docs/developer/GETTING_STARTED.md",
        "docs/developer/TESTING.md",
        "docs/developer/INTEGRATION_TESTING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace developer layout doc glyph markers: docs/developer/FRONTEND_TESTING.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace developer layout doc glyph markers: docs/developer/GETTING_STARTED.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace developer layout doc glyph markers: docs/developer/TESTING.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace developer layout doc glyph markers: docs/developer/INTEGRATION_TESTING.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects front-door doc emoji markers", () => {
  withGitFixture((root) => {
    const chartIcon = String.fromCodePoint(0x1f4ca);
    const rocketIcon = String.fromCodePoint(0x1f680);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "README.md", `# JobSentinel ${rocketIcon}\n`);
    writeFixtureFile(root, "docs/README.md", `### What's New in v2.5 ${chartIcon}\n`);

    execFileSync("git", ["add", "package.json", "README.md", "docs/README.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace front-door doc emoji markers: README.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace front-door doc emoji markers: docs/README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects scraper doc emoji markers", () => {
  withGitFixture((root) => {
    const doneIcon = String.fromCodePoint(0x2705);
    const warningIcon = String.fromCodePoint(0x26a0, 0xfe0f);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/scrapers.md",
      [
        `| LinkedIn | ${doneIcon} Production |`,
        `- ${warningIcon} User responsibility: comply with site terms`,
        "Settings → Job Sources",
        "┌─────────┐",
        "One-Click Connect — No Technical Knowledge Required!",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/scrapers.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace scraper doc emoji markers: docs/features/scrapers.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale scraper reliability and rate-limit docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/scrapers.md",
      [
        "JobSentinel includes production-ready scrapers for 13 major job boards.",
        `- [x] ${["All 13 job board", "scrapers"].join(" ")} (production-ready)`,
        "- [ ] CAPTCHA solver integration",
        "- [ ] Proxy rotation for large-scale scraping",
        "4. **Session Management:** Rotate cookies if multiple accounts",
        "4. **Rate Limiting:** Conservative 5-second delays (Cloudflare protection)",
        "limiter.wait(\"usajobs\", limits::USAJOBS).await;       // 60/hour",
        "| **USAJobs**         | 60            | 0.017         | Official API, conservative     |",
        "| **RemoteOK**        | 1000          | 0.278         | Public API                     |",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/scrapers.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync scraper reliability and rate-limit docs: docs/features/scrapers.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects scraper health doc emoji markers", () => {
  withGitFixture((root) => {
    const greenIcon = String.fromCodePoint(0x1f7e2);
    const testIcon = String.fromCodePoint(0x1f9ea);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/scraper-health.md",
      [
        `LinkedIn ${greenIcon} Healthy`,
        `Click **${testIcon} Test** button`,
        "Settings → Scrapers → LinkedIn",
        "────────────────────────",
        "┌────────────────────────────────┐",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/scraper-health.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace scraper health doc emoji markers: docs/features/scraper-health.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale scraper health coverage", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/scraper-health.md",
      "The health monitoring system automatically tracks all 13 scrapers.\n",
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "interface MockSmokeTestResult {",
        "  scraper_name: string;",
        "  success: boolean;",
        "  response_time_ms: number;",
        "}",
        "const MOCK_SCRAPERS = [{ scraper_name: \"usa_jobs\" }];",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/Dashboard.tsx",
      "const emptyState = '13 job boards on your schedule';\n",
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "JobSentinel is now watching 13 job sources for you.\n",
    );
    writeFixtureFile(
      root,
      "docs/style-guide/WRITING-FOR-JOB-SEEKERS.md",
      "| vague | JobSentinel checks 13 job boards every hour |\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/WHY_TAURI.md",
      "| Scrape 13 job boards | 30-60s |\n",
    );
    writeFixtureFile(
      root,
      "docs/releases/v2.1.md",
      "All 13 scrapers wired\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/scraper-health.md",
        "src/mocks/handlers.ts",
        "src/pages/Dashboard.tsx",
        "docs/user/QUICK_START.md",
        "docs/style-guide/WRITING-FOR-JOB-SEEKERS.md",
        "docs/developer/WHY_TAURI.md",
        "docs/releases/v2.1.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync scraper health source coverage: docs/features/scraper-health.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("sync scraper health source coverage: src/mocks/handlers.ts"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("sync scraper health source coverage: src/pages/Dashboard.tsx"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("sync scraper health source coverage: docs/user/QUICK_START.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync scraper health source coverage: docs/style-guide/WRITING-FOR-JOB-SEEKERS.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("sync scraper health source coverage: docs/developer/WHY_TAURI.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("sync scraper health source coverage: docs/releases/v2.1.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects technical source-health user copy", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/ScraperHealthDashboard.tsx",
      [
        "const title = 'Scraper Health Dashboard';",
        "const loading = 'Loading scraper health...';",
        "const results = 'Smoke Test Results';",
        "const badge = 'PASS';",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      "const help = 'Monitor scraper status, run smoke tests, and view run history';\n",
    );
    writeFixtureFile(
      root,
      "docs/features/scraper-health.md",
      "# Scraper Health Monitoring\n\nRun smoke tests from the dashboard.\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/components/ScraperHealthDashboard.tsx",
        "src/pages/Settings.tsx",
        "docs/features/scraper-health.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "keep source-health copy plain-language: src/components/ScraperHealthDashboard.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("keep source-health copy plain-language: src/pages/Settings.tsx"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep source-health copy plain-language: docs/features/scraper-health.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects feature status color emoji markers", () => {
  withGitFixture((root) => {
    const yellowIcon = String.fromCodePoint(0x1f7e1);
    const redIcon = String.fromCodePoint(0x1f534);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/ghost-detection.md",
      [
        `- ${yellowIcon} **Yellow** - Minor concerns`,
        `- ${redIcon} **Red** - Probably fake`,
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/resume-builder.md",
      [
        `- ${yellowIcon} **60-79** - Good, but could be better`,
        `- ${redIcon} **0-39** - Major issues`,
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/features/ghost-detection.md", "docs/features/resume-builder.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace feature status color emoji markers: docs/features/ghost-detection.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace feature status color emoji markers: docs/features/resume-builder.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects feature doc stale metadata blocks", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/ghost-detection.md",
      "**Version:** 2.6.4 | **Last Updated:** March 18, 2026\n",
    );
    writeFixtureFile(
      root,
      "docs/features/notifications.md",
      "**Version:** 2.6.4 | **Last Updated:** March 18, 2026\n",
    );
    writeFixtureFile(
      root,
      "docs/features/one-click-apply.md",
      "**Version:** 2.6.4 | **Last Updated:** March 18, 2026\n",
    );
    writeFixtureFile(
      root,
      "docs/features/resume-builder.md",
      "**Version:** 2.6.4 | **Last Updated:** March 18, 2026\n",
    );
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      [
        "**Version:** 2.6.4 | **Status:** Stable | **Last Updated:** March 18, 2026",
        "**Version:** 2.6.4 | **Updated:** March 18, 2026",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/resume-matcher.md",
      "> **Status:** ENABLED - Module fully functional\n> **Version:** 2.6.4\n",
    );
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      "## Version History\n\n**Next Phase:** ML-based skills matching (v2.7)\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/ghost-detection.md",
        "docs/features/notifications.md",
        "docs/features/one-click-apply.md",
        "docs/features/resume-builder.md",
        "docs/features/user-data-management.md",
        "docs/features/resume-matcher.md",
        "docs/features/smart-scoring.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace feature doc stale metadata: docs/features/ghost-detection.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace feature doc stale metadata: docs/features/notifications.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace feature doc stale metadata: docs/features/one-click-apply.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace feature doc stale metadata: docs/features/resume-builder.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace feature doc stale metadata: docs/features/user-data-management.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace feature doc stale metadata: docs/features/resume-matcher.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace feature doc stale metadata: docs/features/smart-scoring.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects synonym and remote preference doc drift", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/synonym-matching.md",
      [
        '- ✅ "py" matches "py script"',
        '- "Kuberntes" → "Kubernetes"',
        'The system comes with synonym groups for common tech terms:',
        '- "Python developer needed"',
        '"title_allowlist": ["Senior Engineer"]',
        "### Custom Synonyms (v2.1+)",
        "**Version:** 2.6.4 | **Last Updated:** March 18, 2026",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/remote-preference-scoring.md",
      [
        "| Hybrid | 0.5 | ⚠ Prefer remote-only |",
        "- All preference × job type combinations",
        "**Module:** `src-tauri/src/core/scoring/remote.rs`",
        "### User Preference Modes",
        "### Graduated Scoring Matrix",
        "### Scoring Weight",
        "| Job Type | Score | Meaning |",
        "Potential improvements for v2.0+:",
        "**Version:** 2.6.4 | **Last Updated:** March 18, 2026",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/synonym-matching.md",
        "docs/features/remote-preference-scoring.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync synonym and remote preference docs: docs/features/synonym-matching.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync synonym and remote preference docs: docs/features/remote-preference-scoring.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects Market Intelligence doc glyph markers", () => {
  withGitFixture((root) => {
    const chartIcon = String.fromCodePoint(0x1f4c8);
    const moneyIcon = String.fromCodePoint(0x1f4b0);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/market-intelligence.md",
      [
        `## ${chartIcon} Overview`,
        `- **${moneyIcon} Salary Trends** - Monitor salary changes`,
        "┌──────────────┐",
        "│ Dashboard    │",
        "└──────────────┘",
        "Trend → Dashboard",
        "Company ▲",
        "pub fn severity_emoji(&self) -> &str;",
        "pub fn sentiment_emoji(&self) -> &str;",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/market-intelligence.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace Market Intelligence doc glyph/stale indicator markers: docs/features/market-intelligence.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale Market Intelligence doc shape", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/market-intelligence.md",
      [
        "## Technical Documentation",
        "## Real-Time Analytics & Trend Visualization",
        "data-driven career decisions with comprehensive market insights",
        "## Architecture",
        "### Database Schema",
        "## Usage Guide",
        "## API Reference",
        "## Implementation Status",
        "### Phase 2: Enhanced Analytics Planned",
        "### Phase 3: Advanced Visualization Complete",
        "- [ ] Machine learning trend prediction",
        "## Scheduled Jobs",
        "### Daily Analysis (Recommended: 2 AM)",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/market-intelligence.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync Market Intelligence docs with local evidence guidance: docs/features/market-intelligence.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects Resume Matcher and Salary AI feature doc emoji markers", () => {
  withGitFixture((root) => {
    const targetIcon = String.fromCodePoint(0x1f3af);
    const chartIcon = String.fromCodePoint(0x1f4ca);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/resume-matcher.md",
      [`## ${targetIcon} Overview`, `- **${chartIcon} Gap Analysis**`, "✓ Matching Skills", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/salary-ai.md",
      [
        `## ${targetIcon} Overview`,
        `- **${chartIcon} Salary Benchmarks**`,
        "job_hash (FK → jobs)",
        "├── placeholders",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/features/resume-matcher.md", "docs/features/salary-ai.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace resume and salary feature doc emoji markers: docs/features/resume-matcher.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace resume and salary feature doc emoji markers: docs/features/salary-ai.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale Resume Matcher doc UI shape", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/resume-matcher.md",
      [
        "# AI Resume-Job Matcher",
        "## Intelligent Resume Analysis & Job Compatibility Scoring",
        "Stop manually comparing job requirements and let JobSentinel do the matching work.",
        "## Architecture",
        "### Database Schema",
        "## Usage Guide",
        "## Matching Algorithm",
        "### Future Enhancements",
        "- [ ] A/B Testing",
        "- [ ] Resume Optimization - Suggest keywords to add",
        "## API Reference",
        "## Implementation Status",
        "keyword match against job description",
        "Keyword-based skill extraction",
        "// src/pages/ResumeManager.tsx",
        "const filteredSkills = match.matching_skills.filter(skill => skill.category === selectedCategory);",
        "return <ResumeMatchScoreBreakdown skillsScore={match.skills_score} />;",
        "return <span>{skill.name} {skill.confidence} {skill.years_experience}</span>;",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/resume-matcher.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync resume matcher docs with live Resume page shape: docs/features/resume-matcher.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects confusing Resume Matcher AI labels", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      [
        "- AI Resume-Job Matcher: PDF parsing, skill extraction, matching",
        "### AI Resume-Job Matcher (Working)",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      ["#### `core/resume/`", "", "**Purpose**: AI Resume-Job Matcher", ""].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/ROADMAP.md", "docs/developer/ARCHITECTURE.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace confusing Resume Matcher AI label: docs/ROADMAP.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace confusing Resume Matcher AI label: docs/developer/ARCHITECTURE.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects confusing Salary AI labels", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "docs/README.md", "- Salary AI with negotiation insights\n");
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      ["#### `core/salary/`", "", "**Purpose**: Salary AI", ""].join("\n"),
    );
    writeFixtureFile(root, "docs/features/salary-ai.md", "# Salary AI\n");

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/README.md",
        "docs/developer/ARCHITECTURE.md",
        "docs/features/salary-ai.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "docs/README.md",
      "docs/developer/ARCHITECTURE.md",
      "docs/features/salary-ai.md",
    ]) {
      assert.ok(
        violations.includes(`replace confusing Salary AI label: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects stale Salary AI future UI claim", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/salary-ai.md",
      ["### Phase 2-4: Future", "", "- [ ] UI components", ""].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/salary-ai.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove stale Salary AI future UI claim: docs/features/salary-ai.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale application tracking doc claims", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/application-tracking.md",
      [
        "## 🎨 UI Integration (Future)",
        "**Never lose track of a job application again.**",
        "a Trello board for your job search",
        "JobSentinel's Application Tracking System provides comprehensive pipeline management",
        "The ATS module has been refactored into 5 focused submodules",
        "- Technical Interview",
        "| `technical_interview` | Technical assessment |",
        "### Phase 2 (Future)",
        "### Phase 3 (Advanced)",
        "- [ ] Machine Learning",
        "- [ ] A/B Testing",
        "## API Reference",
        "## Implementation Status",
        "// src/pages/ApplicationTracker.tsx",
        "const kanban = await invoke<ApplicationsByStatus>('get_applications_by_status');",
        "- [ ] Tauri commands",
        "- [ ] UI components (Kanban board)",
        "**Next Feature:** UI Connections & Polish (v1.4 E4)",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/application-tracking.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale application tracking doc claims: docs/features/application-tracking.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects confusing application tracking ATS labels", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/README.md",
      [
        "- Application Tracking System (ATS) with Kanban board",
        "| Application Tracking | Working | [ATS](features/application-tracking.md) |",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/README.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace confusing application tracking ATS label: docs/README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale smart scoring salary marker claims", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      [
        "Predicted salaries are marked with a 🤖 icon.",
        "**Implementation Status:** ✅ Complete (All features implemented)",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/smart-scoring.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale smart-scoring salary marker claim: docs/features/smart-scoring.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects smart scoring doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      [
        'Title: "Senior Backend Engineer" → Matches "Backend Developer" → 100%',
        "├─ Skills (40%): 64%",
        "  ✓ React (boosted keyword found)",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/smart-scoring.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace smart scoring doc glyph markers: docs/features/smart-scoring.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects notifications doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/notifications.md",
      [
        '2. Click "Create New App" → "From Scratch"',
        "src-tauri/src/core/notify/",
        "├── mod.rs",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/notifications.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace notifications doc glyph markers: docs/features/notifications.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale Rust export and scraper stubs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/mod.rs",
      [
        "use crate::core::db::Job;",
        "/// Run all enabled scrapers (legacy function, use scrape_all_parallel for new code)",
        "#[deprecated(since = \"1.3.0\", note = \"Use scrape_all_parallel instead\")]",
        "pub async fn scrape_all() -> Vec<Job> {",
        "    vec![]",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/resume/export.rs",
      [
        "//! Resume export functionality - PDF, DOCX, and plain text formats",
        "//! printpdf = \"0.7\"",
        "impl ResumeExporter {",
        "    pub fn export_pdf() {",
        "        anyhow::bail!(\"PDF export not yet implemented\");",
        "    }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/scrapers/mod.rs",
        "src-tauri/src/core/resume/export.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale scrape_all scraper stub: src-tauri/src/core/scrapers/mod.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove stale resume PDF export stub: src-tauri/src/core/resume/export.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw private query logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/jobs.rs",
      'tracing::info!("Command: search_jobs_query (query: {}, limit: {})", query, limit);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/automation.rs",
      'tracing::info!("Command: find_answer_for_question (question: {})", question);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/queries.rs",
      'tracing::debug!("Performing full-text search with query: \'{}\'", query);\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/jobs.rs",
        "src-tauri/src/commands/automation.rs",
        "src-tauri/src/core/db/queries.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw private query logging: src-tauri/src/commands/jobs.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw private query logging: src-tauri/src/commands/automation.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw private query logging: src-tauri/src/core/db/queries.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw scraper URL and query logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/cache.rs",
      'tracing::debug!("Cache HIT for URL: {}", url);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/http_client.rs",
      [
        'tracing::debug!("Cache miss, fetching: {}", url);',
        'return Err(error).with_context(|| format!("Failed to send request: {url}"));',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/dice.rs",
      'tracing::info!("Fetching jobs from Dice for query: {}", self.query);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/linkedin.rs",
      "#[tracing::instrument(skip(self), fields(query = %self.query, location = %self.location))]\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/jobswithgpt.rs",
      [
        'tracing::debug!("MCP request: {}", request);',
        'message: format!("MCP error: {}", error),',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/usajobs.rs",
      'format!("USAJobs API error: {} - {}", status, body)\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/scrapers/cache.rs",
        "src-tauri/src/core/scrapers/http_client.rs",
        "src-tauri/src/core/scrapers/dice.rs",
        "src-tauri/src/core/scrapers/linkedin.rs",
        "src-tauri/src/core/scrapers/jobswithgpt.rs",
        "src-tauri/src/core/scrapers/usajobs.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw scraper URL/query logging: src-tauri/src/core/scrapers/cache.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw scraper URL/query logging: src-tauri/src/core/scrapers/http_client.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw scraper URL/query logging: src-tauri/src/core/scrapers/dice.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw scraper URL/query logging: src-tauri/src/core/scrapers/linkedin.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw scraper URL/query logging: src-tauri/src/core/scrapers/jobswithgpt.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw scraper URL/query logging: src-tauri/src/core/scrapers/usajobs.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw scraper loop error logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/greenhouse.rs",
      'tracing::error!("Failed to scrape {}: {}", company.name, e);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/lever/mod.rs",
      'tracing::warn!("Failed to scrape {}: {}", company.name, e);\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/scrapers/greenhouse.rs",
        "src-tauri/src/core/scrapers/lever/mod.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize scraper loop error logging: src-tauri/src/core/scrapers/greenhouse.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sanitize scraper loop error logging: src-tauri/src/core/scrapers/lever/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unbounded external response body reads", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/geo/mod.rs",
      "let body = response.text().await?;\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/remoteok.rs",
      "let json: serde_json::Value = response.json().await?;\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/notify/telegram.rs",
      "let bytes = response.bytes().await?;\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/http_client.rs",
      [
        "pub async fn production() {}",
        "#[cfg(test)]",
        "mod tests {",
        "    async fn reads_mock_response(response: reqwest::Response) {",
        "        let _ = response.text().await;",
        "    }",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/http_body.rs",
      "while let Some(chunk) = response.chunk().await? { body.extend_from_slice(&chunk); }\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/geo/mod.rs",
        "src-tauri/src/core/scrapers/remoteok.rs",
        "src-tauri/src/core/notify/telegram.rs",
        "src-tauri/src/core/scrapers/http_client.rs",
        "src-tauri/src/core/http_body.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace unbounded external response body read: src-tauri/src/core/geo/mod.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace unbounded external response body read: src-tauri/src/core/scrapers/remoteok.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace unbounded external response body read: src-tauri/src/core/notify/telegram.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      !violations.includes(
        "replace unbounded external response body read: src-tauri/src/core/scrapers/http_client.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      !violations.includes(
        "replace unbounded external response body read: src-tauri/src/core/http_body.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale cache usage documentation", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/CACHE_USAGE.md",
      [
        'tracing::info!("Cache hit for: {}", url);',
        "let response = reqwest::get(url).await?;",
        "let body = response.text().await?;",
        "Disable in Production",
        "- ✅ `get_with_cache(url)`",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/CACHE_USAGE.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync cache usage doc with scraper HTTP client: docs/CACHE_USAGE.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects frontend direct-open deep link fallbacks", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/JobCard.tsx",
      "try { await openDeepLink(url); } catch { window.open(url, '_blank'); }\n",
    );
    writeFixtureFile(
      root,
      "src/pages/Dashboard.tsx",
      "try { await openDeepLink(job.url); } catch { window.open(job.url, '_blank'); }\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/components/JobCard.tsx",
        "src/pages/Dashboard.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("route job URL opens through backend guard only: src/components/JobCard.tsx"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("route job URL opens through backend guard only: src/pages/Dashboard.tsx"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw local path logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/resume.rs",
      'tracing::info!("Command: upload_resume (name: {}, path: {})", name, file_path);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/automation/form_filler.rs",
      'tracing::debug!(resume_path = %resume_path.display(), "Uploading resume");\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/connection.rs",
      'tracing::info!("Pre-migration backup created: {}", backup_path.display());\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/resume.rs",
        "src-tauri/src/core/automation/form_filler.rs",
        "src-tauri/src/core/db/connection.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw local path logging: src-tauri/src/commands/resume.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw local path logging: src-tauri/src/core/automation/form_filler.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw local path logging: src-tauri/src/core/db/connection.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw backup path error display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/integrity/backups.rs",
      [
        'return Err(anyhow::anyhow!("Backup file not found: {}", backup_path.display()));',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/db/integrity/backups.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize backup path error display: src-tauri/src/core/db/integrity/backups.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects ML raw local path exposure", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/ml.rs",
      'Ok(format!("Model downloaded to {:?}", model_path))\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/ml/model.rs",
      [
        "use std::path::PathBuf;",
        "pub struct ModelStatus {",
        "  pub model_path: PathBuf,",
        "}",
        'tracing::info!("Model downloaded successfully to {:?}", model_dir);',
        'let model_data = std::fs::read(&model_path).with_context(|| format!("failed to read model weights from {:?}", model_path))?;',
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/ML_FEATURE.md",
      ["interface ModelStatus {", "  model_path: string;", "}"].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/ML_QUICKSTART.md",
      ["interface ModelStatus {", "  model_path: string;", "}"].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/ml.rs",
        "src-tauri/src/core/ml/model.rs",
        "docs/ML_FEATURE.md",
        "docs/ML_QUICKSTART.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove ML raw local path exposure: src-tauri/src/commands/ml.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("remove ML raw local path exposure: src-tauri/src/core/ml/model.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("remove ML raw local path doc claim: docs/ML_FEATURE.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("remove ML raw local path doc claim: docs/ML_QUICKSTART.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw ML error display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/ml/mod.rs",
      [
        "#[derive(Error, Debug)]",
        "pub enum MlError {",
        "  #[error(\"model loading failed: {0}\")]",
        "  ModelLoadFailed(String),",
        "  #[error(\"IO error: {0}\")]",
        "  Io(#[from] std::io::Error),",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/ml/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize ML error display: src-tauri/src/core/ml/mod.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw JobsWithGPT Debug derives", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/jobswithgpt.rs",
      [
        "#[derive(Debug, Clone)]",
        "pub struct JobsWithGptScraper {",
        "  pub endpoint: String,",
        "}",
        "",
        "#[derive(Debug, Clone, Default)]",
        "pub struct JobQuery {",
        "  pub titles: Vec<String>,",
        "  pub location: Option<String>,",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src-tauri/src/core/scrapers/jobswithgpt.rs"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize JobsWithGPT debug output: src-tauri/src/core/scrapers/jobswithgpt.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw legacy LinkedIn source Debug derive", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/linkedin.rs",
      [
        "#[derive(Debug, Clone, Serialize, Deserialize)]",
        "pub struct LinkedInScraper {",
        "  pub session_cookie: String,",
        "  pub query: String,",
        "  pub location: String,",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/scrapers/linkedin.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize legacy LinkedIn source debug output: src-tauri/src/core/scrapers/linkedin.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects LinkedIn login cookie return", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/linkedin_auth.rs",
      [
        "pub async fn linkedin_login() -> Result<String, String> {",
        "    let tx = get_sender();",
        "    // Send result back (just the cookie value, not expiry)",
        "    let _ = tx.send(cookie_result.map(|(cookie, _)| cookie));",
        "    Ok(String::new())",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/linkedin_auth.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "keep LinkedIn login cookie out of renderer response: src-tauri/src/commands/linkedin_auth.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects secret-bearing Debug derives", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/config.rs",
      [
        "#[derive(Debug, Clone, Serialize, Deserialize)]",
        "pub struct TestEmailConfig {",
        "  pub smtp_server: String,",
        "  pub smtp_password: String,",
        "}",
        "",
      ].join("\n"),
    );
    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/config.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize secret-bearing debug derive: src-tauri/src/commands/config.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw test email command errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/config.rs",
      [
        "pub async fn test_email_notification() -> Result<(), String> {",
        '  validate_email_config().await.map_err(|e| format!("Failed to send test email: {}", e))?;',
        "  Ok(())",
        "}",
        "",
      ].join("\n"),
    );
    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/config.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize test email command errors: src-tauri/src/commands/config.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw Slack webhook validation command errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/config.rs",
      [
        "pub async fn validate_slack_webhook(webhook_url: String) -> Result<bool, String> {",
        "  match validate_webhook(&webhook_url).await {",
        "    Ok(valid) => Ok(valid),",
        '    Err(e) => { tracing::error!("Webhook validation failed: {}", e); Err(format!("Validation failed: {}", e)) }',
        "  }",
        "}",
        "",
      ].join("\n"),
    );
    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/config.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize Slack webhook validation command errors: src-tauri/src/commands/config.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects credential key input echo", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/credentials.rs",
      [
        'let cred_key = key.parse::<CredentialKey>().map_err(|_| format!("Unknown credential key: {key}"))?;',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/credentials/mod.rs",
      [
        'impl FromStr for CredentialKey { type Err = String; fn from_str(s: &str) -> Result<Self, Self::Err> { Err(format!("Invalid credential key: {}", s)) } }',
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/credentials.rs",
        "src-tauri/src/core/credentials/mod.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("avoid echoing credential key input: src-tauri/src/commands/credentials.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("avoid echoing credential key input: src-tauri/src/core/credentials/mod.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw credential storage errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/credentials/mod.rs",
      [
        "fn ensure_keyring_store() -> Result<(), String> {",
        '  keyring::use_native_store(true).map_err(|e| format!("Failed to initialize native keyring store: {e}"))',
        "}",
        "impl CredentialStore {",
        "  pub fn store(key: CredentialKey, value: &str) -> Result<(), String> {",
        '    entry.set_password(value).map_err(|e| format!("Failed to store credential \'{}\': {e}", key.as_str()))',
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/credentials/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize credential storage errors: src-tauri/src/core/credentials/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects enabled LinkedIn credential storage", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/credentials.rs",
      [
        "pub async fn store_credential(key: String, value: String) -> Result<(), String> {",
        "  let cred_key = parse_credential_key(&key)?;",
        "  CredentialStore::store(cred_key, &value)",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/credentials/mod.rs",
      [
        "impl CredentialStore {",
        "  pub fn store(key: CredentialKey, value: &str) -> Result<(), String> {",
        "    entry.set_password(value)",
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
        "src-tauri/src/commands/credentials.rs",
        "src-tauri/src/core/credentials/mod.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "disable LinkedIn credential storage: src-tauri/src/commands/credentials.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "disable LinkedIn credential storage: src-tauri/src/core/credentials/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects renderer credential secret read IPC", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/credentials.rs",
      [
        "pub async fn retrieve_credential(key: String) -> Result<Option<String>, String> {",
        "  CredentialStore::retrieve(parse_credential_key(&key)?)",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      [
        "async function retrieveCredential(key: CredentialKey): Promise<string | null> {",
        "  return await invoke<string | null>('retrieve_credential', { key });",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/security/KEYRING.md",
      ["invoke(\"retrieve_credential\", { key })", ""].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/credentials.rs",
        "src/pages/Settings.tsx",
        "docs/security/KEYRING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "keep credential values out of renderer IPC: src-tauri/src/commands/credentials.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("keep credential values out of renderer IPC: src/pages/Settings.tsx"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("keep credential values out of renderer IPC: docs/security/KEYRING.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects resume renderer DTO path exposure", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/resume.rs",
      [
        "pub async fn get_active_resume() -> Result<Option<Resume>, String> { todo!() }",
        "pub async fn list_all_resumes() -> Result<Vec<Resume>, String> { todo!() }",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/Resume.tsx",
      ["interface ResumeData {", "  id: number;", "  file_path: string;", "}"].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/ResumeBuilder.tsx",
      ["interface Resume {", "  id: number;", "  parsed_text: string | null;", "}"].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        'case "get_active_resume":',
        "  return getActiveResume() as T;",
        'case "list_all_resumes":',
        "  return resumes as T;",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/resume-matcher.md",
      'const activeResume = await invoke<Resume>("get_active_resume");\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/resume.rs",
        "src/pages/Resume.tsx",
        "src/pages/ResumeBuilder.tsx",
        "src/mocks/handlers.ts",
        "docs/features/resume-matcher.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src-tauri/src/commands/resume.rs",
      "src/pages/Resume.tsx",
      "src/pages/ResumeBuilder.tsx",
      "src/mocks/handlers.ts",
      "docs/features/resume-matcher.md",
    ]) {
      assert.ok(
        violations.includes(`hide resume file paths from renderer DTOs: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects incomplete config export redaction", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/export.ts",
      [
        "function sanitizeConfigForExport(config) {",
        "  const sanitized = JSON.parse(JSON.stringify(config));",
        "  sanitized.alerts.email.smtp_password = '';",
        "  sanitized.linkedin.session_cookie = '';",
        "  return sanitized;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/utils/export.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("redact all credential fields from config export: src/utils/export.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw Telegram bot-token request errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/notify/telegram.rs",
      [
        'let api_url = format!("https://api.telegram.org/bot{}/sendMessage", config.bot_token);',
        "let response = client.post(&api_url).json(&payload).send().await?;",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/notify/telegram.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove Telegram bot-token URLs from request errors: src-tauri/src/core/notify/telegram.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw webhook token request errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    for (const path of [
      "src-tauri/src/core/notify/slack.rs",
      "src-tauri/src/core/notify/discord.rs",
      "src-tauri/src/core/notify/teams.rs",
    ]) {
      writeFixtureFile(
        root,
        path,
        [
          "async fn send(webhook_url: &str) -> anyhow::Result<()> {",
          "  let response = client.post(webhook_url).json(&payload).send().await?;",
          "  Ok(())",
          "}",
          "",
        ].join("\n"),
      );
    }

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/notify/slack.rs",
        "src-tauri/src/core/notify/discord.rs",
        "src-tauri/src/core/notify/teams.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src-tauri/src/core/notify/slack.rs",
      "src-tauri/src/core/notify/discord.rs",
      "src-tauri/src/core/notify/teams.rs",
    ]) {
      assert.ok(
        violations.includes(`remove webhook token URLs from request errors: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects notification provider error body exposure", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    for (const path of [
      "src-tauri/src/core/notify/discord.rs",
      "src-tauri/src/core/notify/teams.rs",
      "src-tauri/src/core/notify/telegram.rs",
    ]) {
      writeFixtureFile(
        root,
        path,
        [
          "async fn send() -> anyhow::Result<()> {",
          "  let error_text = read_text_with_limit(response, \"https://example.test\").await?;",
          "  return Err(anyhow!(\"Provider failed: {}\", error_text));",
          "}",
          "",
        ].join("\n"),
      );
    }

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/notify/discord.rs",
        "src-tauri/src/core/notify/teams.rs",
        "src-tauri/src/core/notify/telegram.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src-tauri/src/core/notify/discord.rs",
      "src-tauri/src/core/notify/teams.rs",
      "src-tauri/src/core/notify/telegram.rs",
    ]) {
      assert.ok(
        violations.includes(`omit notification provider error bodies from errors: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects raw notification service error details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/notify/mod.rs",
      [
        "pub async fn send_immediate_alert() -> anyhow::Result<()> {",
        "  if let Err(e) = send_slack().await {",
        "    tracing::error!(\"Failed to send Slack notification: {}\", e);",
        "    errors.push(format!(\"Slack: {}\", e));",
        "  }",
        "  if let Err(e) = CredentialStore::retrieve(CredentialKey::TelegramBotToken) {",
        "    tracing::error!(\"Failed to retrieve Telegram bot token from keyring: {}\", e);",
        "    errors.push(format!(\"Telegram: {}\", e));",
        "  }",
        "  Ok(())",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/notify/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize notification service error details: src-tauri/src/core/notify/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw JobsWithGPT smoke-test endpoint errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/health/smoke_tests.rs",
      [
        "match resp {",
        "  Err(e) if e.is_connect() => Ok(serde_json::json!({",
        "    \"status\": \"unreachable\",",
        "    \"error\": e.to_string()",
        "  })),",
        "  Err(e) => Err(e.into()),",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/health/smoke_tests.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize JobsWithGPT smoke-test endpoint errors: src-tauri/src/core/health/smoke_tests.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw source-check result errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/health/smoke_tests.rs",
      [
        "let smoke_result = match result {",
        "  Err(e) => SmokeTestResult {",
        "    passed: false,",
        "    error: Some(e.to_string()),",
        "    details: Some(serde_json::json!({",
        "      \"error\": format!(\"connect error: {}\", e.without_url())",
        "    })),",
        "  },",
        "};",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/health/smoke_tests.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize source-check result errors: src-tauri/src/core/health/smoke_tests.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale LinkedIn credential docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/linkedin.rs",
      [
        "//! The user must provide their LinkedIn session cookie",
        "//! via the config file.",
        "//! - Uses ONLY the user's own session cookie (no credential storage)",
        "//! 2. Open DevTools (F12) -> Application -> Cookies",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/scraper-health.md",
      [
        "Refresh Instructions:",
        "2. Open DevTools (F12)",
        "3. Find and copy **li_at** value",
        "4. Paste into Settings > Scrapers > LinkedIn",
        "Click **Update LinkedIn Cookie**",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/scrapers.md",
      [
        "- **Your Cookie Only:** No credentials stored, uses your own session",
        "- **Session Expiry:** Cookie expires after ~90 days, requires refresh",
        "- [ ] **Interactive Login:** No manual cookie extraction",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/scrapers/linkedin.rs",
        "docs/features/scrapers.md",
        "docs/features/scraper-health.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync LinkedIn credential docs with keyring login flow: src-tauri/src/core/scrapers/linkedin.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync LinkedIn credential docs with keyring login flow: docs/features/scraper-health.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync LinkedIn credential docs with keyring login flow: docs/features/scrapers.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects automated LinkedIn collection drift", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/linkedin.rs",
      'const URL: &str = "https://www.linkedin.com/voyager/api/example";\n',
    );
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      'await invoke("linkedin_login");\n',
    );
    writeFixtureFile(
      root,
      "src/utils/notificationPreferences.ts",
      "export const DEFAULT_PREFERENCES = { linkedin: { enabled: true } };\n",
    );
    writeFixtureFile(
      root,
      "src/components/NotificationPreferences.tsx",
      "const SOURCE_INFO = { linkedin: { name: 'LinkedIn' } };\n",
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      "function defaults() { return { linkedin: { enabled: true } }; }\n",
    );
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      "linkedin: { enabled: true, minScoreThreshold: 70, soundEnabled: true }\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/user_data/mod.rs",
      "let linkedin = SourceNotificationConfig { enabled: true, min_score_threshold: 70, sound_enabled: true };\n",
    );
    writeFixtureFile(
      root,
      "docs/features/scrapers.md",
      `Click **${["Connect", "LinkedIn"].join(" ")}** to run the ${["LinkedIn", "scraper"].join(" ")}.\n`,
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/scrapers/linkedin.rs",
        "src/pages/Settings.tsx",
        "src/utils/notificationPreferences.ts",
        "src/components/NotificationPreferences.tsx",
        "src/mocks/handlers.ts",
        "docs/features/user-data-management.md",
        "src-tauri/src/core/user_data/mod.rs",
        "docs/features/scrapers.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove automated LinkedIn collection boundary drift: src-tauri/src/core/scrapers/linkedin.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove automated LinkedIn collection boundary drift: src/pages/Settings.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove LinkedIn notification source drift: src/utils/notificationPreferences.ts",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove LinkedIn notification source drift: src/components/NotificationPreferences.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove LinkedIn notification source drift: src/mocks/handlers.ts",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove LinkedIn notification source drift: docs/features/user-data-management.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove LinkedIn notification source drift: src-tauri/src/core/user_data/mod.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove automated LinkedIn collection boundary drift: docs/features/scrapers.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects database log emoji markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/connection.rs",
      [
        'tracing::info!("🔧 Configuring SQLite with maximum protections and performance...");',
        'tracing::debug!("  ✓ WAL mode verified ✅");',
        'tracing::error!("  ❌ Foreign keys NOT enabled!");',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/integrity/diagnostics.rs",
      'tracing::warn!("⚠️ WAL checkpoint partially complete (database was busy)");\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/integrity/mod.rs",
      [
        'tracing::info!("🔍 Running database integrity check...");',
        'tracing::error!("❌ Quick check failed: {}", quick_result.message);',
        'tracing::info!("✅ Database integrity check passed ({:?})", start_time.elapsed());',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/integrity/backups.rs",
      'tracing::info!("✅ Database restored successfully");\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/db/connection.rs",
        "src-tauri/src/core/db/integrity/backups.rs",
        "src-tauri/src/core/db/integrity/diagnostics.rs",
        "src-tauri/src/core/db/integrity/mod.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace database log emoji markers: src-tauri/src/core/db/connection.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace database log emoji markers: src-tauri/src/core/db/integrity/diagnostics.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace database log emoji markers: src-tauri/src/core/db/integrity/mod.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace database log emoji markers: src-tauri/src/core/db/integrity/backups.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw URL logging outside approved sanitizers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/url_utils.rs",
      'tracing::warn!("Failed to parse URL for normalization: {}", url_str);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/automation/browser/manager.rs",
      "#[tracing::instrument(skip(self), fields(url = %url), level = \"info\")]\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/linkedin_auth.rs",
      'tracing::debug!("LinkedIn navigation: {}", url_str);\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/scrapers/url_utils.rs",
        "src-tauri/src/core/automation/browser/manager.rs",
        "src-tauri/src/commands/linkedin_auth.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw URL logging: src-tauri/src/core/scrapers/url_utils.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw URL logging: src-tauri/src/core/automation/browser/manager.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw URL logging: src-tauri/src/commands/linkedin_auth.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw job import logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/import.rs",
      [
        '#[tracing::instrument(skip(state), fields(url), level = "info")]',
        "pub async fn preview_job_import(url: String) {}",
        'tracing::info!(title = %preview.title, company = %preview.company, "Import preview created");',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/import.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw job import logging: src-tauri/src/commands/import.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw job import HTTP errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/import.rs",
      [
        'ImportError::HttpError(e) => format!("Failed to fetch the page: {}", e),',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/import.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize job import HTTP errors: src-tauri/src/commands/import.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects non-public IP validation error echo", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/url_security.rs",
      [
        "return Err(format!(\"Blocked non-public IP address '{}'\", host));",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/url_security.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize non-public IP validation errors: src-tauri/src/core/url_security.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw job import success metadata", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/import.rs",
      'tracing::info!(job_id = job_id, title = %title, company = %company, "Job imported successfully");\n',
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/import.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw job import logging: src-tauri/src/commands/import.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw automation screening question logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/automation/form_filler.rs",
      [
        'tracing::debug!("Filled screening question \'{}\' with answer", question_text);',
        'tracing::debug!("Selected screening answer for \'{}\'", question_text);',
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src-tauri/src/core/automation/form_filler.rs"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw automation screening question logging: src-tauri/src/core/automation/form_filler.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw automation form result data", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/automation/form_filler.rs",
      [
        "let field_name = Self::truncate_question(&question_text, 30);",
        'result.filled_fields.push(format!("screening:{}", field_name));',
        'page.inner().evaluate(script).await.map_err(|e| anyhow::anyhow!("Failed to execute question finder script: {}", e))?;',
        'value.into_value().map_err(|e| anyhow::anyhow!("Failed to parse question finder result: {}", e))?;',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "const screeningFields = screeningAnswers.slice(0, 2).map((answer) =>",
        "  `screening:${answer.questionPattern}`,",
        ");",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/automation/form_filler.rs",
        "src/mocks/handlers.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize automation form result data: src-tauri/src/core/automation/form_filler.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("sanitize automation form result data: src/mocks/handlers.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw automation browser errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/automation/browser/manager.rs",
      [
        'BrowserConfig::builder().build().map_err(|e| anyhow::anyhow!("Failed to build browser config: {}", e))?;',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/automation/browser/page.rs",
      [
        'return Err(anyhow::anyhow!("File does not exist: {:?}", file_path));',
        'let path_str = file_path.to_str().context("Invalid file path encoding")?;',
        'builder.build().map_err(|e| anyhow::anyhow!("Failed to build file upload params: {}", e))?;',
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/automation/browser/manager.rs",
        "src-tauri/src/core/automation/browser/page.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize automation browser errors: src-tauri/src/core/automation/browser/manager.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sanitize automation browser errors: src-tauri/src/core/automation/browser/page.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw notification job title logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/notify/mod.rs",
      [
        'tracing::info!("Sent Slack notification for: {}", notification.job.title);',
        'tracing::info!("Sent Teams notification for: {}", notification.job.title);',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/notify/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw notification job title logging: src-tauri/src/core/notify/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw URL error display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/automation/error.rs",
      [
        "#[derive(thiserror::Error, Debug)]",
        "pub enum AutomationError {",
        '    #[error("Failed to navigate to {url}: {reason}")]',
        "    Navigation { url: String, reason: String },",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/error.rs",
      [
        "impl std::fmt::Display for ScraperError {",
        "  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {",
        "    match self {",
        '      Self::HttpRequest { url, source } => write!(f, "HTTP request failed for {}: {}", Self::sanitize_url(url), source),',
        '      Self::Network { url, source } => write!(f, "Network error for {}: {}", Self::sanitize_url(url), source),',
        '      Self::ParseError { format, url, source } => write!(f, "Failed to parse {} from {}: {}", format, Self::sanitize_url(url), source),',
        "    }",
        "  }",
        "}",
        "impl ScraperError {",
        "  pub fn from_anyhow(scraper: impl Into<String>, error: anyhow::Error) -> Self {",
        "    Self::Generic { scraper: scraper.into(), message: error.to_string() }",
        "  }",
        "}",
        "impl From<HttpBodyReadError> for ScraperError {",
        "  fn from(error: HttpBodyReadError) -> Self {",
        "    match error {",
        '      HttpBodyReadError::ResponseTooLarge { url, max_bytes } => Self::Generic { scraper: "http".to_string(), message: format!("Response body from {} exceeded {} byte limit", url, max_bytes) },',
        "    }",
        "  }",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/http_body.rs",
      [
        "#[derive(Debug, Error)]",
        "pub enum HttpBodyReadError {",
        '    #[error("HTTP response body from {url} exceeded {max_bytes} byte limit")]',
        "    ResponseTooLarge { url: String, max_bytes: usize },",
        '    #[error("Failed to read HTTP response body from {url}: {source}")]',
        "    Read { url: String, source: reqwest::Error },",
        '    #[error("Failed to parse JSON response from {url}: {source}")]',
        "    Json { url: String, source: serde_json::Error },",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/automation/error.rs",
        "src-tauri/src/core/http_body.rs",
        "src-tauri/src/core/scrapers/error.rs",
      ],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw URL error display: src-tauri/src/core/automation/error.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw URL error display: src-tauri/src/core/scrapers/error.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw URL error display: src-tauri/src/core/http_body.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw path or query error display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/error.rs",
      [
        "#[derive(thiserror::Error, Debug)]",
        "pub enum DatabaseError {",
        '    #[error("Database query timed out after {timeout_secs}s: {query}")]',
        "    Timeout { timeout_secs: u64, query: String },",
        '    #[error("Backup failed at {path}: {source}")]',
        "    Backup { path: String, source: std::io::Error },",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/db/error.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw path/query error display: src-tauri/src/core/db/error.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw resume parser path error display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/resume/parser.rs",
      [
        'let canonical_path = file_path.canonicalize().context(format!("Invalid path: {}", file_path.display()))?;',
        'return Err(anyhow::anyhow!("File must be a PDF. Got: {}", canonical_path.display()));',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/resume/parser.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize resume parser path error display: src-tauri/src/core/resume/parser.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw resume import name logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/resume.rs",
      [
        'tracing::info!("Command: import_json_resume (name: {})", name);',
        'tracing::info!(name = %name, "Command: import_json_resume");',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/resume.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize resume import name logging: src-tauri/src/commands/resume.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw resume command error details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/resume.rs",
      [
        "pub async fn upload_resume() -> Result<i64, String> {",
        "    matcher.upload_resume().await.map_err(|e| format!(\"Failed to upload resume: {}\", e))",
        "}",
        "",
        "pub async fn add_user_skill(skill: NewSkill) -> Result<i64, String> {",
        "    tracing::info!(\"Command: add_user_skill (resume: {}, skill: {})\", resume_id, skill.skill_name);",
        "    Ok(1)",
        "}",
        "",
        "pub async fn match_resume_to_job(job_hash: String) -> Result<(), String> {",
        "    tracing::info!(\"Command: match_resume_to_job (resume: {}, job: {})\", resume_id, job_hash);",
        "    Ok(())",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/resume.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize resume command error details: src-tauri/src/commands/resume.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw application tracking command error details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/ats.rs",
      [
        "pub async fn create_application(job_hash: String) -> Result<i64, String> {",
        "    tracing::info!(\"Command: create_application (job_hash: {})\", job_hash);",
        "    tracker.create_application(&job_hash).await.map_err(|e| format!(\"Failed to create application: {}\", e))",
        "}",
        "",
        "pub async fn schedule_interview(interview_type: String, scheduled_at: String) -> Result<i64, String> {",
        "    tracing::info!(\"Command: schedule_interview (app: {}, type: {}, at: {})\", application_id, interview_type, scheduled_at);",
        "    Ok(1)",
        "}",
        "",
        "pub async fn complete_interview(outcome: String) -> Result<(), String> {",
        "    tracing::info!(\"Command: complete_interview (id: {}, outcome: {})\", interview_id, outcome);",
        "    status.parse().map_err(|e| format!(\"Invalid status: {}\", e))?;",
        "    Ok(())",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/ats.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize application tracking command error details: src-tauri/src/commands/ats.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw automation command error details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/automation.rs",
      [
        "pub async fn create_automation_attempt(job_hash: String) -> Result<i64, String> {",
        "    tracing::info!(\"Command: create_automation_attempt (job: {})\", job_hash);",
        "    manager.create_attempt(&job_hash).await.map_err(|e| format!(\"Failed to create automation attempt: {}\", e))",
        "}",
        "",
        "pub async fn get_application_profile() -> Result<(), String> {",
        "    match manager.get_profile().await {",
        "        Ok(_) => Ok(()),",
        "        Err(e) => Err(format!(\"Failed to get profile: {}\", e)),",
        "    }",
        "}",
        "",
        "pub async fn fill_application_form() -> Result<(), String> {",
        "    tracing::warn!(\"Failed to create automation attempt: {}\", e);",
        "    Ok(())",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/automation.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize automation command error details: src-tauri/src/commands/automation.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw sensitive command error details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/ml.rs",
      [
        "pub async fn match_resume_semantic(job_hash: String) -> Result<(), String> {",
        "    tracing::info!(\"Command: match_resume_semantic (job: {})\", job_hash);",
        "    matcher.match_skills().map_err(|e| format!(\"Failed to match skills: {}\", e))",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/salary.rs",
      [
        "pub async fn generate_negotiation_script(scenario: String) -> Result<(), String> {",
        "    tracing::info!(\"Command: generate_negotiation_script (scenario: {})\", scenario);",
        "    analyzer.generate().await.map_err(|e| format!(\"Failed to generate script: {}\", e))",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/market.rs",
      [
        "pub async fn run_market_analysis() -> Result<(), String> {",
        "    Err(e) => Err(format!(\"Failed to run market analysis: {}\", e)),",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/ml.rs",
        "src-tauri/src/commands/salary.rs",
        "src-tauri/src/commands/market.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src-tauri/src/commands/ml.rs",
      "src-tauri/src/commands/salary.rs",
      "src-tauri/src/commands/market.rs",
    ]) {
      assert.ok(
        violations.includes(`sanitize sensitive command error details: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects raw utility command error details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/jobs.rs",
      [
        "pub async fn search_jobs() -> Result<(), String> {",
        "    tracing::error!(error = %e, \"Manual search failed\");",
        "    Err(format!(\"Scraping failed: {}\", e))",
        "}",
        "",
        "pub async fn get_statistics() -> Result<(), String> {",
        "    serde_json::to_value(&stats).map_err(|e| format!(\"Failed to serialize stats: {}\", e))",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/ghost.rs",
      [
        "pub async fn get_ghost_jobs() -> Result<(), String> {",
        "    tracing::error!(\"Failed to get ghost jobs: {}\", e);",
        "    Err(format!(\"Database error: {}\", e))",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/deeplinks.rs",
      [
        "pub async fn open_deep_link(url: String) -> Result<(), String> {",
        "    app.emit(\"deep-link-opened\", DeepLinkOpenedEvent { url: url.clone() });",
        "    format!(\"Failed to generate deep link for {}: {}\", site_id, e);",
        "    Ok(())",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/jobs.rs",
        "src-tauri/src/commands/ghost.rs",
        "src-tauri/src/commands/deeplinks.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src-tauri/src/commands/jobs.rs",
      "src-tauri/src/commands/ghost.rs",
      "src-tauri/src/commands/deeplinks.rs",
    ]) {
      assert.ok(
        violations.includes(`sanitize utility command error details: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects raw import and bookmarklet command error details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/import.rs",
      [
        "fn format_import_error(error: ImportError) -> String {",
        "    format!(\"Failed to read the job page response: {}\", error)",
        "}",
        "fn serialize(e: Error) -> String {",
        "    format!(\"Failed to serialize job: {}\", e)",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/user_data.rs",
      'category.parse().map_err(|e: String| format!("Invalid category: {}", e))?;\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/scoring.rs",
      'tracing::error!("Failed to load scoring config: {}", e);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/bookmarklet.rs",
      'tracing::error!(error = %e, "Failed to start bookmarklet server");\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/bookmarklet/server.rs",
      [
        'tracing::error!("Failed to parse job data: {}", e);',
        'json_error_response(format!("Failed to import job: {e}"));',
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/import.rs",
        "src-tauri/src/commands/user_data.rs",
        "src-tauri/src/commands/scoring.rs",
        "src-tauri/src/commands/bookmarklet.rs",
        "src-tauri/src/core/bookmarklet/server.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src-tauri/src/commands/import.rs",
      "src-tauri/src/commands/user_data.rs",
      "src-tauri/src/commands/scoring.rs",
      "src-tauri/src/commands/bookmarklet.rs",
      "src-tauri/src/core/bookmarklet/server.rs",
    ]) {
      assert.ok(
        violations.includes(`sanitize import and bookmarklet command error details: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects raw command setup error display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/config.rs",
      [
        "pub async fn complete_setup() -> Result<(), String> {",
        "    Database::connect(&db_path)",
        "        .await",
        "        .map_err(|e| format!(\"Failed to connect to database: {}\", e))?;",
        "    Ok(())",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/main.rs",
      [
        "fn main() {",
        "    match Config::load(&config_path) {",
        "        Err(e) => {",
        "            tracing::error!(\"Failed to load config: {}\", e);",
        "            return Err(format!(\"Configuration error: {}\", e).into());",
        "        }",
        "        _ => {}",
        "    }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/config.rs",
        "src-tauri/src/main.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw command setup error display: src-tauri/src/commands/config.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw command setup error display: src-tauri/src/main.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw config validation URL display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/config/validation_error.rs",
      [
        "match self {",
        "  Self::InvalidUrl { field, url, reason } => {",
        "    if field.contains(\"greenhouse\") {",
        "      write!(f, \"Invalid Greenhouse URL format. Got: {}\", url)",
        "    } else {",
        "      write!(f, \"Invalid URL in {}: {}\", field, reason)",
        "    }",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src-tauri/src/core/config/validation_error.rs"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize config validation URL display: src-tauri/src/core/config/validation_error.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw import redirect display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/import/types.rs",
      [
        "#[derive(thiserror::Error, Debug)]",
        "pub enum ImportError {",
        '    #[error("Redirect blocked while fetching URL: {location}")]',
        "    RedirectBlocked { location: String },",
        '    #[error("URL validation failed: {0}")]',
        "    InvalidUrl(String),",
        '    #[error("Database error: {0}")]',
        "    DatabaseError(String),",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/import/types.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw import redirect display: src-tauri/src/core/import/types.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw bookmarklet import metadata logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/bookmarklet/server.rs",
      [
        "tracing::info!(",
        "    title = %title,",
        "    company = %company,",
        '    "Job imported from bookmarklet"',
        ");",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/bookmarklet/server.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw bookmarklet import metadata logging: src-tauri/src/core/bookmarklet/server.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw scoring cache job hash logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scoring/cache.rs",
      [
        'tracing::debug!("Score cache HIT for job_hash={}", key.job_hash);',
        'tracing::info!(job_hash = %job_hash, "Invalidated cached score");',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/scoring/cache.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw scoring cache job hash logging: src-tauri/src/core/scoring/cache.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw scheduler scoring privacy leaks", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scheduler/workers/scoring.rs",
      [
        'tracing::warn!(error = %e, job_hash = %job.hash, "Failed to serialize score reasons");',
        'tracing::debug!("Ghost indicator for \'{}\' at {}: score={:.2}", job.title, job.company, analysis.score);',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scoring/db.rs",
      'sqlx_call.map_err(|e| format!("Failed to load scoring config: {}", e));\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/scheduler/workers/scoring.rs",
        "src-tauri/src/core/scoring/db.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw scheduler scoring privacy leaks: src-tauri/src/core/scheduler/workers/scoring.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw scheduler scoring privacy leaks: src-tauri/src/core/scoring/db.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects residual core privacy leaks", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    const fixtures = new Map([
      [
        "src-tauri/src/core/automation/browser/manager.rs",
        'tracing::debug!(error = %e, "Browser handler event error");\n',
      ],
      [
        "src-tauri/src/core/config/io.rs",
        'std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create config directory: {}", e))?;\n',
      ],
      [
        "src-tauri/src/core/db/connection.rs",
        'tracing::warn!("Failed to create database directory: {}", e);\n',
      ],
      [
        "src-tauri/src/core/db/error.rs",
        'format!("Database operation failed: {}", context)\n',
      ],
      [
        "src-tauri/src/core/import/schema_org.rs",
        'tracing::debug!(error = %e, "Skipping invalid JSON-LD script tag");\n',
      ],
      [
        "src-tauri/src/core/ml/model.rs",
        'let api = Api::new().map_err(|e| MlError::DownloadFailed(e.to_string()))?;\n',
      ],
      [
        "src-tauri/src/core/resume/parser.rs",
        'tracing::warn!("OCR extraction failed: {}", e);\n',
      ],
      [
        "src-tauri/src/core/resume/templates.rs",
        'Err(format!("Invalid template ID: {}", s))\n',
      ],
      [
        "src-tauri/src/core/scheduler/mod.rs",
        'tracing::error!("Scraping cycle failed: {}", e);\n',
      ],
      [
        "src-tauri/src/core/scrapers/mod.rs",
        'tracing::error!(error = %e, "Scraper task panicked");\n',
      ],
      [
        "src-tauri/src/core/scrapers/usajobs.rs",
        'message: format!("Invalid API key: {}", e),\n',
      ],
      [
        "src-tauri/src/core/scrapers/yc_startup.rs",
        'tracing::warn!("YC scraper: failed to parse Inertia JSON: {}", e);\n',
      ],
    ]);

    for (const [path, content] of fixtures) {
      writeFixtureFile(root, path, content);
    }

    execFileSync("git", ["add", "package.json", ...fixtures.keys()], { cwd: root });

    const violations = checkRepoBloat(root);

    for (const path of fixtures.keys()) {
      assert.ok(
        violations.includes(`replace residual core privacy leaks: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects manual bookmarklet JSON error responses", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/bookmarklet/server.rs",
      [
        'format!(r#"{{"error":"{}"}}"#, e),',
        'format!(r#"{{"error":"Failed to import job: {}"}}"#, e),',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/bookmarklet/server.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace manual bookmarklet JSON error responses: src-tauri/src/core/bookmarklet/server.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects opaque command unit errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/cache.rs",
      [
        "#[tauri::command]",
        "pub async fn get_cache_health() -> Result<serde_json::Value, ()> {",
        "    Ok(serde_json::json!({\"status\":\"healthy\"}))",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/cache.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace opaque command unit errors: src-tauri/src/commands/cache.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unauthenticated bookmarklet imports", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/bookmarklet/server.rs",
      [
        'if request.starts_with("POST /api/bookmarklet/import") {',
        "    handle_import_request(&request, database).await",
        "} else if request.starts_with(\"OPTIONS\") {",
        '    ("OK".to_string(), "text/plain".to_string())',
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/bookmarklet/server.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "require bookmarklet import auth token: src-tauri/src/core/bookmarklet/server.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects bookmarklet code without auth header", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/BookmarkletGenerator.tsx",
      [
        "export function code() {",
        "  return `fetch('http://localhost:4321/api/bookmarklet/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(job)})`;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/components/BookmarkletGenerator.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "include bookmarklet auth token header: src/components/BookmarkletGenerator.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsanitized frontend error report storage", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/errorReporting.ts",
      [
        "class ErrorReporter {",
        "  private errors = [];",
        "  capture(report) {",
        "    this.errors.unshift(report);",
        "    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.errors));",
        "    logError(`[ErrorReporter][${type}]`, error.message, {",
        "      report,",
        "      originalError: error,",
        "    });",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/utils/errorReporting.ts"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize frontend error report storage: src/utils/errorReporting.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw ErrorReporter storage warning details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/errorReporting.ts",
      [
        "const TOKEN_PATTERN = /token(?:\\s+|=)/;",
        "const WEBHOOK_PATTERN = /https:\\/\\/(?:discord(?:app)?\\.com\\/api\\/webhooks|outlook\\.office(?:365)?\\.com\\/webhook)/;",
        "function sanitizeStoredReport(report) { return report; }",
        "function isErrorReport(report) { return Boolean(report); }",
        "function parseStoredErrorReports(stored) { return []; }",
        "class ErrorReporter {",
        "  load(e) {",
        "    console.warn('[ErrorReporter] Failed to load from storage:', e);",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/utils/errorReporting.ts"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize frontend error report storage: src/utils/errorReporting.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw frontend error helper debug logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/errorHelpers.ts",
      [
        "export function logErrorDetails(error, context) {",
        "  console.error('Error:', error);",
        "  console.log('Context:', context);",
        "  console.log('Stack:', error.stack);",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/utils/errorHelpers.ts"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize frontend error helper debug logging: src/utils/errorHelpers.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw frontend user error messages", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/errorHelpers.ts",
      [
        "export function getUserMessage(error) {",
        "  if (error instanceof Error) {",
        "    return error.message;",
        "  }",
        "  return 'An unexpected error occurred.';",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/utils/errorHelpers.ts"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize frontend user error messages: src/utils/errorHelpers.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw shared frontend error logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/errorUtils.ts",
      [
        "export function logError(message, error) {",
        "  console.error(message, error);",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/utils/errorUtils.ts"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize shared frontend error logging: src/utils/errorUtils.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw shared frontend error messages", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/errorUtils.ts",
      [
        "export function getErrorMessage(error) {",
        "  if (error instanceof Error) return error.message;",
        "  if (typeof error === 'string') return error;",
        "  return String(error);",
        "}",
        "export function logError(message, error) {",
        "  console.error(sanitizeTextForStorage(message), sanitizeLoggedError(error));",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/utils/errorUtils.ts"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize shared frontend error logging: src/utils/errorUtils.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects direct frontend console error logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/ErrorBoundary.tsx",
      [
        "export class ErrorBoundary {",
        "  componentDidCatch(error, errorInfo) {",
        "    console.error('Global Error Boundary caught error:', error, errorInfo);",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/components/ErrorBoundary.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "route frontend direct error logging through sanitized logger: src/components/ErrorBoundary.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale frontend webhook redaction patterns", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/errorReporting.ts",
      [
        "const WEBHOOK_PATTERN = /https:\\/\\/(?:hooks\\.slack\\.com\\/services|discord\\.com\\/api\\/webhooks|outlook\\.office\\.com\\/webhook)[^\\s]*/gi;",
        "function sanitizeStoredReport(report) { return report; }",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/utils/errorReporting.ts"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize frontend error report storage: src/utils/errorReporting.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsafe stored error report parsing", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/errorReporting.ts",
      [
        "function sanitizeStoredReport(report) { return report; }",
        "function loadFromStorage(stored) {",
        "  this.errors = JSON.parse(stored).map((report) => sanitizeStoredReport(report));",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/utils/errorReporting.ts"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("validate stored error reports before loading: src/utils/errorReporting.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsafe reason JSON parsing", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/ScoreDisplay.tsx",
      [
        "function parseScoreReasons(reasonsJson) {",
        "  const reasons: string[] = JSON.parse(reasonsJson);",
        "  return reasons.map((reason) => reason.toLowerCase());",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/GhostIndicator.tsx",
      [
        "function parseReasons(reasonsJson) {",
        "  try {",
        "    return JSON.parse(reasonsJson);",
        "  } catch {",
        "    return [];",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/components/ScoreDisplay.tsx", "src/components/GhostIndicator.tsx"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("validate reason JSON before rendering: src/components/ScoreDisplay.tsx"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("validate reason JSON before rendering: src/components/GhostIndicator.tsx"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsafe storage JSON parsing", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/AnalyticsPanel.tsx",
      [
        "function getWeeklyGoal() {",
        "  const stored = readStorageValue('local', WEEKLY_GOALS_KEY);",
        "  return stored ? JSON.parse(stored) : null;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/CompanyResearchPanel.tsx",
      [
        "function loadCache() {",
        "  const stored = readStorageValue('local', CACHE_KEY);",
        "  return stored ? JSON.parse(stored) : {};",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/AtsLiveScorePanel.tsx",
      [
        "function loadJobContext() {",
        "  const stored = readStorageValue('session', 'jobContext');",
        "  const parsed = JSON.parse(stored);",
        "  setJobDescription(parsed.description);",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/components/AnalyticsPanel.tsx",
        "src/components/AtsLiveScorePanel.tsx",
        "src/components/CompanyResearchPanel.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("validate storage JSON before rendering: src/components/AnalyticsPanel.tsx"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "validate storage JSON before rendering: src/components/CompanyResearchPanel.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("validate storage JSON before rendering: src/components/AtsLiveScorePanel.tsx"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat accepts current frontend webhook redaction patterns", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/errorReporting.ts",
      [
        "const WEBHOOK_PATTERN = /https:\\/\\/(?:hooks\\.slack\\.com|discord(?:app)?\\.com\\/api\\/webhooks|outlook\\.office(?:365)?\\.com\\/webhook)[^\\s]*/gi;",
        "const TOKEN_PATTERN = /token(?:\\s+|=)[^\\s&]+/gi;",
        "function isErrorReport(report) { return true; }",
        "function parseStoredErrorReports(stored) { return JSON.parse(stored).filter(isErrorReport); }",
        "function sanitizeStoredReport(report) { return report; }",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/utils/errorReporting.ts"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      !violations.includes("sanitize frontend error report storage: src/utils/errorReporting.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects hardcoded frontend error export version", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/errorReporting.ts",
      [
        "const WEBHOOK_PATTERN = /https:\\/\\/(?:hooks\\.slack\\.com|discord(?:app)?\\.com\\/api\\/webhooks|outlook\\.office(?:365)?\\.com\\/webhook)[^\\s]*/gi;",
        "function sanitizeStoredReport(report) { return report; }",
        "function exportErrors() {",
        "  return { app_version: '1.2.0' };",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/utils/errorReporting.ts"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "derive frontend error export version from package metadata: src/utils/errorReporting.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects notification webhook saves without validation", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      [
        "async function handleSave(credentials) {",
        "  await storeCredential(\"discord_webhook\", credentials.discord_webhook);",
        "  await storeCredential(\"teams_webhook\", credentials.teams_webhook);",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/pages/Settings.tsx"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "validate notification webhook settings before saving: src/pages/Settings.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects notification webhook keyring storage without validation", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/credentials/mod.rs",
      [
        "enum CredentialKey { LinkedInCookie, SlackWebhook, DiscordWebhook, TeamsWebhook }",
        "fn validate_credential_value(key: CredentialKey, value: &str) -> Result<(), String> {",
        "  if key != CredentialKey::LinkedInCookie { return Ok(()); }",
        "  if value.len() > MAX_LINKEDIN_COOKIE_LEN { return Err(\"LinkedIn cookie is too long\".to_string()); }",
        "  if value.chars().any(|ch| ch.is_ascii_control() || ch == ';') {",
        "    return Err(\"LinkedIn cookie contains unsupported characters\".to_string());",
        "  }",
        "  Ok(())",
        "}",
        "fn store(key: CredentialKey, value: &str) -> Result<(), String> {",
        "  validate_credential_value(key, value)?;",
        "  Ok(())",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/credentials/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "validate notification webhook credentials before keyring storage: src-tauri/src/core/credentials/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale settings partial-save messages", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      [
        "async function handleSave(results) {",
        '  toast.warning("Partially saved", `${failures.length} credential(s) failed to save. Config was saved. Try saving again.`);',
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/pages/Settings.tsx"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "separate config save failures from credential save failures: src/pages/Settings.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale feedback webhook sanitizer patterns", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/sanitizer.rs",
      [
        "static WEBHOOK_REGEX: Lazy<Regex> = Lazy::new(|| {",
        "    Regex::new(r\"https://hooks\\.(slack|discord|teams)\\.com/[^\\s]+\")",
        "        .expect(\"Webhook URL regex pattern is valid and should compile\")",
        "});",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/feedback/sanitizer.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "redact provider webhook URLs in feedback sanitizer: src-tauri/src/commands/feedback/sanitizer.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale notification webhook docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/notifications.md",
      [
        "### URL Validation",
        "- **Slack:** Must start with `https://hooks.slack.com/services/`",
        "- **Discord:** Must start with `https://discord.com/api/webhooks/`",
        "- **Teams:** Must start with `https://outlook.office.com/webhook/`",
        "### Slack says token is invalid?",
        "Sign-in tokens are stored safely.",
        "Click \"Send Test\" to verify the connection.",
        "Discord embed looks broken? Check high scores and chat ID.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Test it by clicking \"Send Test\" in Settings.\n",
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/features/notifications.md", "docs/user/QUICK_START.md"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "document all notification webhook provider hosts: docs/features/notifications.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "document all notification webhook provider hosts: docs/user/QUICK_START.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale webhook security doc markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/security/WEBHOOK_SECURITY.md",
      [
        "// ❌ BAD: Easy to bypass",
        "2. **Invalid domain**: Try `https://evil.com/hook` → Should error",
        "1. **v2.0.0+**: Webhooks stored in OS keyring",
        "**Last Updated**: 2026-03-18",
        "**Version**: 2.6.4",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/security/WEBHOOK_SECURITY.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace webhook security doc stale markers: docs/security/WEBHOOK_SECURITY.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale command execution security doc markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/security/COMMAND_EXECUTION.md",
      [
        "PDF File → pdftoppm → PNG Images → tesseract → Extracted Text",
        "// ❌ VULNERABLE: Shell injection risk",
        "- ✅ Path traversal: `../../etc/passwd` → Error",
        "**Last Updated**: 2026-03-18",
        "**Version**: 2.6.4",
        "**Security Level**: Production Ready",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/security/COMMAND_EXECUTION.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace command execution security doc stale markers: docs/security/COMMAND_EXECUTION.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale URL validation security doc markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/security/URL_VALIDATION.md",
      [
        "### Insecure Approach ❌",
        "// ✅ GOOD: Explicit allowlist",
        "**Last Updated**: 2026-05-19",
        "**Version**: 2.6.4",
        "**Security Level**: Production Ready",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/security/URL_VALIDATION.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync URL validation security doc markers: docs/security/URL_VALIDATION.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale XSS security docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/security/README.md",
      [
        "Input → Validation → Sanitization",
        "User Input ↑ Parse",
        "// ❌ Insecure: Allows on error",
        "// ✅ Secure: Denies on error",
        "**Last Updated**: 2026-05-19",
        "**JobSentinel Version**: 2.6.4",
        "**Security Level**: Production Ready",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/security/XSS_PREVENTION.md",
      [
        "> JobSentinel Security Documentation",
        "npm install dompurify  # JobSentinel uses v3.3.1+",
        '<script src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"></script>',
        "### Resume Builder Configuration",
        "While JobSentinel is a desktop app with no backend",
        "// ✅ SAFE - Always sanitize first",
        "**DOMPurify Version**: 3.x",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/security/dompurify-test-examples.js",
      [
        " * DOMPurify Integration Test Example",
        "// ✅ Output: Same as input",
        "// ❌ UNSAFE",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/security/README.md",
        "docs/security/XSS_PREVENTION.md",
        "docs/security/dompurify-test-examples.js",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync XSS security docs with live sanitizer path: docs/security/README.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync XSS security docs with live sanitizer path: docs/security/XSS_PREVENTION.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync XSS security docs with live sanitizer path: docs/security/dompurify-test-examples.js",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale keyring credential docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/security/KEYRING.md",
      [
        "JobSentinel v2.0.0 introduces OS-native keyring integration.",
        "Frontend uses `tauri-plugin-secure-storage` JS API.",
        "pub enum CredentialKey { SlackWebhookUrl, DiscordWebhookUrl, TeamsWebhookUrl }",
        "pub fn list_status() -> Result<HashMap<String, bool>, String>;",
        "Does NOT delete plaintext values",
        "- ✅ Stored",
        "**Last Updated**: 2026-05-19",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/credentials-security.md",
      [
        "JobSentinel:slack-webhook",
        "pub enum CredentialKey { EmailSmtpPassword, LinkedinCookies, TelegramToken }",
        "Self::TelegramToken => \"JobSentinel:telegram-token\"",
        "Setup complete ✓",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/security/KEYRING.md", "docs/features/credentials-security.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync keyring credential docs: docs/security/KEYRING.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("sync keyring credential docs: docs/features/credentials-security.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsafe keyring migration and stale credential comments", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/main.rs",
      [
        'tracing::info!("✓ Migrated {:?} to secure storage", key);',
        "// Mark migration as complete (even if partial, to avoid repeated attempts)",
        "migration::set_migrated();",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/credentials/mod.rs",
      [
        "//! - Frontend uses `tauri-plugin-secure-storage` JS API",
        "//!   set_item, get_item, remove_item",
        '///     println!("Got password: {}", password);',
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src-tauri/src/main.rs", "src-tauri/src/core/credentials/mod.rs"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("keep keyring migration retry-safe: src-tauri/src/main.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync credential architecture comments: src-tauri/src/core/credentials/mod.rs",
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
