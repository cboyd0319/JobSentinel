import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../check-repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-audience-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects engineer-first audience examples", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "examples/resumes/sample-json-resume.json",
      [
        '"name": "John Doe",',
        '"label": "Senior Software Engineer",',
        '"network": "GitHub",',
        '"position": "Software Engineer",',
        '"name": "Tech Corp",',
        '"keywords": ["Rust"]',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/salary/SalaryPage.tsx",
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
      [
        "Type in job titles that match what you want. Examples:",
        '- "Software Engineer"',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      'Give it a name (for example: "SWE Remote 120k+", "Design NYC Entry-level")\n',
    );
    writeFixtureFile(
      root,
      "docs/features/job-sources.md",
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
        "Build a professional resume in 7 easy steps",
        "- LinkedIn URL (highly recommended)",
        "- GitHub, portfolio, or personal website (optional)",
        "> Security engineer with 8 years of experience",
        "- **0-39** - Poor fit for your current resume",
        '> "Responsible for managing the security team"',
        '> "Led 12-person security team, reducing incident response time by 35%"',
        'If they say "Python" and you have Python experience',
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
      "src/features/dashboard/components/DashboardFiltersBar.tsx",
      "<p>Comma or OR: react, vue</p><p>AND: senior AND engineer</p>\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/DashboardPage.tsx",
      '<input placeholder="e.g., Remote Rust Jobs" />\n',
    );
    writeFixtureFile(
      root,
      "src/features/onboarding/SetupWizard.tsx",
      '<Input placeholder="e.g., San Francisco, New York" />\n',
    );
    writeFixtureFile(
      root,
      "src/features/company-research/CompanyResearchPanel.tsx",
      '<p>Tech Stack</p><p>Try searching for "{companyName}" on LinkedIn or Glassdoor.</p>\n',
    );
    writeFixtureFile(
      root,
      "src/features/company-research/CompanyResearchPanel.test.tsx",
      '<CompanyResearchPanel companyName="TestCorp" />\n',
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/ScoreBreakdownModal.test.tsx",
      'jobTitle="Senior Engineer"; "Title matches: Senior Engineer";\n',
    );
    writeFixtureFile(
      root,
      "src/features/applications/CoverLetterTemplates.tsx",
      '<Input placeholder="e.g., Tech Company Application" />\n',
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/JobImportModal.tsx",
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
      "crates/jobsentinel-core/src/core/market_intelligence/tests.rs",
      [
        'let title = "Software Engineer";',
        'let company = "TechCorp";',
        'let skill = "Rust";',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/scrapers/simplyhired.rs",
      [
        '/// Search query (e.g., "rust developer")',
        'let company = scraper.extract_company("Software Engineer - Acme Corp", None);',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/scrapers/jobswithgpt.rs",
      [
        'titles: vec!["Rust Developer".to_string()],',
        '"company": "TechCorp",',
        "",
      ].join("\n"),
    );
    for (const path of [
      "crates/jobsentinel-core/src/core/scrapers/glassdoor.rs",
      "crates/jobsentinel-core/src/core/scrapers/greenhouse.rs",
      "crates/jobsentinel-core/src/core/scrapers/http_client.rs",
      "crates/jobsentinel-core/src/core/scrapers/lever/tests.rs",
      "crates/jobsentinel-core/src/core/scrapers/usajobs.rs",
      "crates/jobsentinel-core/src/core/scrapers/weworkremotely.rs",
    ]) {
      writeFixtureFile(
        root,
        path,
        [
          '"title": "Software Engineer",',
          '"company": "TechCorp",',
          'let query = "rust developer";',
          "",
        ].join("\n"),
      );
    }
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
      "crates/jobsentinel-core/src/core/resume/templates.rs",
      '"Technical Skills-First"; "Perfect for engineering roles";\n',
    );
    writeFixtureFile(
      root,
      "src/features/resumes/builder/ResumeBuilderPage.tsx",
      [
        '"$ whoami"',
        '"JOHN DOE - Data Analyst"',
        '"B.S. CS"',
        "<p>GitHub</p>",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/resumes/matching/ResumeMatchPage.tsx",
      '<textarea placeholder="e.g., Worked on improving database performance" />\n',
    );
    writeFixtureFile(
      root,
      "src/features/resumes/matching/ResumeMatchPage.test.tsx",
      'name: "Jane Doe";\n',
    );
    writeFixtureFile(
      root,
      "src/features/resumes/shared/resumeContactValidation.test.ts",
      'name: "Jane Doe";\n',
    );
    writeFixtureFile(
      root,
      "src/features/resumes/builder/steps/SummaryStep.tsx",
      '<textarea placeholder="Experienced software engineer with 5+ years building apps." />\n',
    );
    writeFixtureFile(
      root,
      "src/features/resumes/builder/steps/SkillsStep.tsx",
      '<input placeholder="React" /><input placeholder="Frontend" />"Technical and professional skills"\n',
    );
    writeFixtureFile(
      root,
      "src/features/resumes/builder/steps/ContactStep.tsx",
      '<Input label="GitHub" placeholder="John Doe" /><Input placeholder="San Francisco, CA" />\n',
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ProfileForm.tsx",
      '<Input label="GitHub" placeholder="https://github.com/johndoe" />\n',
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ApplicationPreview.tsx",
      '{ label: "GitHub", value: profile.githubUrl };\n',
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ApplicationPreview.test.tsx",
      'githubUrl: "https://code.example.com/jordanlee";\n',
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ApplyButton.test.tsx",
      [
        'title: "Senior Software Engineer",',
        'company: "Tech Corp",',
        'location: "San Francisco, CA",',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/resumes/builder/AtsLiveScorePanel.test.tsx",
      [
        'name: "John Doe",',
        'linkedin: "linkedin.com/in/johndoe",',
        'location: "San Francisco, CA",',
        'company: "Tech Corp",',
        'description: "Senior TypeScript role",',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/JobCard.test.tsx",
      [
        'title: "Senior Software Engineer",',
        'company: "Tech Corp",',
        'location: "San Francisco, CA",',
        '"We are looking for a talented software engineer to join our team.",',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/market/LocationHeatmap.test.tsx",
      ['location: "San Francisco, CA",', 'location: "New York, NY",', ""].join(
        "\n",
      ),
    );
    writeFixtureFile(
      root,
      "src/app/providers/UndoProvider.integration.test.tsx",
      "`Moved Software Engineer to Phone Screen`;\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/notifications/NotificationPreferences.test.tsx",
      [
        'const job = { title: "Remote Software Engineer", company: "TechCorp" };',
        "",
      ].join("\n"),
    );
    writeFixtureFile(root, "src/ui/StatCard.test.tsx", '"John Doe";\n');
    writeFixtureFile(
      root,
      "src/shared/validation/contactFieldValidation.test.ts",
      '"linkedin.com/in/johndoe";\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/health/smoke_tests.rs",
      '"https://www.indeed.com/jobs?q=software+engineer&l=remote";\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/deeplinks/generator.rs",
      'query: "Software Engineer"; location: "San Francisco, CA";\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/deeplinks.rs",
      'query: "Software Engineer"; location: Some("San Francisco, CA".to_string());\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/debug_log.rs",
      'let message = "Job title: Senior Rust Developer at AcmeCorp";\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/sanitizer.rs",
      'let input = "Failed to find job titled \\"Senior Software Engineer\\"";\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/import.rs",
      'calculate_job_hash("Google", "Software Engineer", "https://example.com/job/1");\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/tests.rs",
      'create_test_job(2, "Backend Engineer", 0.85);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/tests/api_contract_test.rs",
      'create_test_job("salary_test", "Software Engineer", "TestCorp");\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/tests/database_integration_test.rs",
      [
        'let job = create_test_job("idempotent_001", "Test Job", "TestCorp");',
        'title: "Senior Rust Engineer".to_string(),',
        'location: Some("San Francisco, CA".to_string()),',
        'let results = db.search_jobs("Rust", 10).await.unwrap();',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/tests/scraper_integration_test.rs",
      [
        '"company": "TechCorp",',
        '"position": "Remote Rust Developer",',
        "<title><![CDATA[Company ABC: Senior Software Engineer]]></title>",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/tests/scraping_pipeline_integration.rs",
      [
        'title: "Senior Rust Security Engineer".to_string(),',
        'company: "TechCorp".to_string(),',
        'cities: vec!["San Francisco".to_string()],',
        'keywords_boost: vec!["Rust".to_string()],',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/tests/scheduler_integration_test.rs",
      [
        'title_allowlist: vec!["Security Engineer".to_string()],',
        'keywords_boost: vec!["Rust".to_string()],',
        'keywords_exclude: vec!["PHP".to_string()],',
        'cities: vec!["San Francisco".to_string()],',
        'let results = db.search_jobs("Rust", 10).await.unwrap();',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/import/README.md",
      'title: "Software Engineer"; "San Francisco, CA";\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/import/schema_org.rs",
      'title: "Software Engineer"; "San Francisco, CA";\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/import/tests.rs",
      'title: "Software Engineer"; "San Francisco, CA";\n',
    );
    writeFixtureFile(
      root,
      "docs/security/dompurify-test-examples.js",
      '"John Doe"; "Experienced software engineer";\n',
    );
    writeFixtureFile(
      root,
      "docs/security/XSS_PREVENTION.md",
      '"John Doe"; "Software Engineer";\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/resume/ats_analyzer.rs",
      '"John Doe"; "Senior Software Engineer"; "Tech Corp";\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/resume/builder.rs",
      '"John Doe"; "TechCorp"; "Senior Software Engineer";\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/resume/export.rs",
      '"John Doe"; "Tech Corp"; "Senior Software Engineer";\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/resume/json_resume.rs",
      '"John Doe"; "Tech Corp"; "Software Engineer";\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/resume/matcher.rs",
      'title: "Software Engineer", company: "TechCorp";\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/resume/parser.rs",
      '"John Doe"; "Software Engineer"; "TechCorp";\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/resume/tests.rs",
      'title: "Software Engineer", company: "TechCorp";\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/bookmarklet/mod.rs",
      'title: "Software Engineer", company: "Google";\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/bookmarklet/server.rs",
      'calculate_job_hash("Google", "Software Engineer", "https://example.com/job/1");\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/scoring/mod.rs",
      'job.location = Some("San Francisco, CA (Hybrid)".to_string());\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/scoring/remote.rs",
      'create_test_job("Engineer", Some("Remote - US"), None, None);\n',
    );
    writeFixtureFile(
      root,
      "docs/developer/FRONTEND_TESTING.md",
      [
        'await user.type(input, "John Doe");',
        '{ id: 2, title: "Designer", company: "TechCorp" },',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/INTEGRATION_TESTING.md",
      'create_test_job("hash1", "Security Engineer", "TechCorp");\n',
    );
    writeFixtureFile(
      root,
      "src/features/applications/CoverLetterTemplates.test.tsx",
      [
        'title: "Software Engineer",',
        'company: "TechCorp",',
        'location: "San Francisco, CA",',
        '"TechCorp is great. I want to work at TechCorp."',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/applications/InterviewScheduler.test.tsx",
      [
        'job_title: "Software Engineer",',
        'company: "TechCorp",',
        'job_title: "Frontend Developer",',
        'company: "WebStart",',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/jobCsvExport.test.ts",
      [
        'title: "Software Engineer",',
        'location: "San Francisco, CA",',
        'location: "New York, NY",',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/hooks/useDashboardFilters.test.ts",
      'title: "Software Engineer",\n',
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/hooks/useDashboardJobOps.test.ts",
      'description: "Unbookmarked: Software Engineer",\n',
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/hooks/useDashboardSavedSearches.test.ts",
      [
        'name: "Remote Rust",',
        'result.current.setNewSearchName("Remote Rust");',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/hooks/useDashboardSearch.test.ts",
      'mockInvoke.mockResolvedValueOnce(["rust remote"]);\n',
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.test.ts",
      [
        'name: "Remote Rust",',
        'jobTitle: "Senior Software Engineer",',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "tests/e2e/playwright/application-assist.spec.ts",
      '"https://github.com/caseysentinel"; "GitHub profile link if relevant to your role";\n',
    );
    writeFixtureFile(
      root,
      "tests/e2e/playwright/page-objects/OneClickApplyPage.ts",
      'getByRole("textbox", { name: "GitHub" });\n',
    );
    writeFixtureFile(
      root,
      "tests/e2e/playwright/hiring-trends.spec.ts",
      '"Top Skill: TypeScript"; "Top Company: BigTech Inc"; "TechCorp";\n',
    );
    writeFixtureFile(
      root,
      "src/features/market/MarketSnapshotCard.test.tsx",
      'top_skill: "React"; top_company: "TechCorp";\n',
    );
    writeFixtureFile(
      root,
      "src/features/market/MarketAlertCard.test.tsx",
      '"React Demand Spike"; "TechCorp Hiring Pause";\n',
    );
    writeFixtureFile(
      root,
      "docs/user/DEEP_LINKS.md",
      '3. Optionally enter a location (e.g., "San Francisco, CA" or "Remote")\n',
    );
    writeFixtureFile(
      root,
      "docs/style-guide/README.md",
      '"JobSentinel\'s revolutionary AI-powered engine transforms your job search forever!"\n',
    );
    writeFixtureFile(
      root,
      "docs/style-guide/WRITING-FOR-JOB-SEEKERS.md",
      '"JobSentinel\'s revolutionary AI-powered ghost detection algorithm will transform your job search forever!"\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/deeplinks/types.rs",
      '/// Job title or keywords (e.g., "Software Engineer")\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/main.rs",
      "// Resume Matcher commands\n",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/migrations/00000000000000_initial_schema.sql",
      'job_title_normalized TEXT NOT NULL, -- Normalized title (e.g., "Software Engineer")\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "examples/resumes/sample-json-resume.json",
        "src/features/dashboard/DashboardPage.tsx",
        "src/features/onboarding/SetupWizard.tsx",
        "src/features/salary/SalaryPage.tsx",
        "src/features/dashboard/components/DashboardFiltersBar.tsx",
        "src/features/company-research/CompanyResearchPanel.tsx",
        "src/features/applications/CoverLetterTemplates.tsx",
        "src/features/dashboard/components/JobImportModal.tsx",
        "src/mocks/data.ts",
        "src/mocks/handlers.ts",
        "src/mocks/handlers.test.ts",
        "crates/jobsentinel-core/src/core/resume/templates.rs",
        "src/features/resumes/builder/ResumeBuilderPage.tsx",
        "src/features/resumes/matching/ResumeMatchPage.tsx",
        "src/features/resumes/matching/ResumeMatchPage.test.tsx",
        "src/features/resumes/shared/resumeContactValidation.test.ts",
        "src/features/resumes/builder/steps/SummaryStep.tsx",
        "src/features/resumes/builder/steps/ContactStep.tsx",
        "src/features/resumes/builder/steps/SkillsStep.tsx",
        "src/features/application-assist/ProfileForm.tsx",
        "src/features/application-assist/ApplicationPreview.tsx",
        "src/features/application-assist/ApplicationPreview.test.tsx",
        "src/features/application-assist/ApplyButton.test.tsx",
        "src/features/resumes/builder/AtsLiveScorePanel.test.tsx",
        "src/features/company-research/CompanyResearchPanel.test.tsx",
        "src/features/dashboard/components/ScoreBreakdownModal.test.tsx",
        "src/features/dashboard/components/JobCard.test.tsx",
        "src/features/market/LocationHeatmap.test.tsx",
        "src/app/providers/UndoProvider.integration.test.tsx",
        "src/features/settings/notifications/NotificationPreferences.test.tsx",
        "src/ui/StatCard.test.tsx",
        "src/features/applications/CoverLetterTemplates.test.tsx",
        "src/features/applications/InterviewScheduler.test.tsx",
        "src/shared/validation/contactFieldValidation.test.ts",
        "src/features/dashboard/jobCsvExport.test.ts",
        "crates/jobsentinel-core/src/core/health/smoke_tests.rs",
        "crates/jobsentinel-core/src/core/deeplinks/generator.rs",
        "src-tauri/src/commands/deeplinks.rs",
        "src-tauri/src/commands/feedback/debug_log.rs",
        "src-tauri/src/commands/feedback/sanitizer.rs",
        "src-tauri/src/commands/import.rs",
        "src-tauri/src/commands/tests.rs",
        "crates/jobsentinel-core/src/core/market_intelligence/tests.rs",
        "crates/jobsentinel-core/src/core/scrapers/glassdoor.rs",
        "crates/jobsentinel-core/src/core/scrapers/greenhouse.rs",
        "crates/jobsentinel-core/src/core/scrapers/http_client.rs",
        "crates/jobsentinel-core/src/core/scrapers/jobswithgpt.rs",
        "crates/jobsentinel-core/src/core/scrapers/lever/tests.rs",
        "crates/jobsentinel-core/src/core/scrapers/simplyhired.rs",
        "crates/jobsentinel-core/src/core/scrapers/usajobs.rs",
        "crates/jobsentinel-core/src/core/scrapers/weworkremotely.rs",
        "src-tauri/tests/api_contract_test.rs",
        "src-tauri/tests/database_integration_test.rs",
        "src-tauri/tests/scraper_integration_test.rs",
        "src-tauri/tests/scraping_pipeline_integration.rs",
        "src-tauri/tests/scheduler_integration_test.rs",
        "crates/jobsentinel-core/src/core/import/README.md",
        "crates/jobsentinel-core/src/core/import/schema_org.rs",
        "crates/jobsentinel-core/src/core/import/tests.rs",
        "docs/security/dompurify-test-examples.js",
        "docs/security/XSS_PREVENTION.md",
        "crates/jobsentinel-core/src/core/resume/ats_analyzer.rs",
        "crates/jobsentinel-core/src/core/resume/builder.rs",
        "crates/jobsentinel-core/src/core/resume/export.rs",
        "crates/jobsentinel-core/src/core/resume/json_resume.rs",
        "crates/jobsentinel-core/src/core/resume/matcher.rs",
        "crates/jobsentinel-core/src/core/resume/parser.rs",
        "crates/jobsentinel-core/src/core/resume/tests.rs",
        "crates/jobsentinel-core/src/core/bookmarklet/mod.rs",
        "crates/jobsentinel-core/src/core/bookmarklet/server.rs",
        "crates/jobsentinel-core/src/core/scoring/mod.rs",
        "crates/jobsentinel-core/src/core/scoring/remote.rs",
        "src/features/dashboard/hooks/useDashboardFilters.test.ts",
        "src/features/dashboard/hooks/useDashboardJobOps.test.ts",
        "src/features/dashboard/hooks/useDashboardSavedSearches.test.ts",
        "src/features/dashboard/hooks/useDashboardSearch.test.ts",
        "tests/e2e/playwright/hiring-trends.spec.ts",
        "tests/e2e/playwright/application-assist.spec.ts",
        "tests/e2e/playwright/page-objects/OneClickApplyPage.ts",
        "src/features/market/MarketSnapshotCard.test.tsx",
        "src/features/market/MarketAlertCard.test.tsx",
        "docs/README.md",
        "docs/ROADMAP.md",
        "docs/features/resume-builder.md",
        "docs/features/smart-scoring.md",
        "docs/features/job-sources.md",
        "docs/features/resume-matcher.md",
        "docs/features/user-data-management.md",
        "docs/user/DEEP_LINKS.md",
        "docs/user/QUICK_START.md",
        "docs/style-guide/README.md",
        "docs/style-guide/WRITING-FOR-JOB-SEEKERS.md",
        "docs/developer/FRONTEND_TESTING.md",
        "docs/developer/INTEGRATION_TESTING.md",
        "crates/jobsentinel-core/src/core/deeplinks/types.rs",
        "src-tauri/src/main.rs",
        "crates/jobsentinel-core/migrations/00000000000000_initial_schema.sql",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "examples/resumes/sample-json-resume.json",
      "src/features/salary/SalaryPage.tsx",
      "src/features/dashboard/DashboardPage.tsx",
      "src/features/onboarding/SetupWizard.tsx",
      "src/features/dashboard/components/DashboardFiltersBar.tsx",
      "src/features/company-research/CompanyResearchPanel.tsx",
      "src/features/applications/CoverLetterTemplates.tsx",
      "src/features/dashboard/components/JobImportModal.tsx",
      "src/mocks/data.ts",
      "src/mocks/handlers.ts",
      "src/mocks/handlers.test.ts",
      "crates/jobsentinel-core/src/core/resume/templates.rs",
      "src/features/resumes/builder/ResumeBuilderPage.tsx",
      "src/features/resumes/matching/ResumeMatchPage.tsx",
      "src/features/resumes/matching/ResumeMatchPage.test.tsx",
      "src/features/resumes/shared/resumeContactValidation.test.ts",
      "src/features/resumes/builder/steps/SummaryStep.tsx",
      "src/features/resumes/builder/steps/ContactStep.tsx",
      "src/features/resumes/builder/steps/SkillsStep.tsx",
      "src/features/application-assist/ProfileForm.tsx",
      "src/features/application-assist/ApplicationPreview.tsx",
      "src/features/application-assist/ApplicationPreview.test.tsx",
      "src/features/application-assist/ApplyButton.test.tsx",
      "src/features/resumes/builder/AtsLiveScorePanel.test.tsx",
      "src/features/company-research/CompanyResearchPanel.test.tsx",
      "src/features/dashboard/components/ScoreBreakdownModal.test.tsx",
      "src/features/dashboard/components/JobCard.test.tsx",
      "src/features/market/LocationHeatmap.test.tsx",
      "src/app/providers/UndoProvider.integration.test.tsx",
      "src/features/settings/notifications/NotificationPreferences.test.tsx",
      "src/ui/StatCard.test.tsx",
      "src/features/applications/CoverLetterTemplates.test.tsx",
      "src/features/applications/InterviewScheduler.test.tsx",
      "src/shared/validation/contactFieldValidation.test.ts",
      "src/features/dashboard/jobCsvExport.test.ts",
      "crates/jobsentinel-core/src/core/health/smoke_tests.rs",
      "crates/jobsentinel-core/src/core/deeplinks/generator.rs",
      "src-tauri/src/commands/deeplinks.rs",
      "src-tauri/src/commands/feedback/debug_log.rs",
      "src-tauri/src/commands/feedback/sanitizer.rs",
      "src-tauri/src/commands/import.rs",
      "src-tauri/src/commands/tests.rs",
      "crates/jobsentinel-core/src/core/market_intelligence/tests.rs",
      "crates/jobsentinel-core/src/core/scrapers/glassdoor.rs",
      "crates/jobsentinel-core/src/core/scrapers/greenhouse.rs",
      "crates/jobsentinel-core/src/core/scrapers/http_client.rs",
      "crates/jobsentinel-core/src/core/scrapers/jobswithgpt.rs",
      "crates/jobsentinel-core/src/core/scrapers/lever/tests.rs",
      "crates/jobsentinel-core/src/core/scrapers/simplyhired.rs",
      "crates/jobsentinel-core/src/core/scrapers/usajobs.rs",
      "crates/jobsentinel-core/src/core/scrapers/weworkremotely.rs",
      "src-tauri/tests/api_contract_test.rs",
      "src-tauri/tests/database_integration_test.rs",
      "src-tauri/tests/scraper_integration_test.rs",
      "src-tauri/tests/scraping_pipeline_integration.rs",
      "src-tauri/tests/scheduler_integration_test.rs",
      "crates/jobsentinel-core/src/core/import/README.md",
      "crates/jobsentinel-core/src/core/import/schema_org.rs",
      "crates/jobsentinel-core/src/core/import/tests.rs",
      "docs/security/dompurify-test-examples.js",
      "docs/security/XSS_PREVENTION.md",
      "crates/jobsentinel-core/src/core/resume/ats_analyzer.rs",
      "crates/jobsentinel-core/src/core/resume/builder.rs",
      "crates/jobsentinel-core/src/core/resume/export.rs",
      "crates/jobsentinel-core/src/core/resume/json_resume.rs",
      "crates/jobsentinel-core/src/core/resume/matcher.rs",
      "crates/jobsentinel-core/src/core/resume/parser.rs",
      "crates/jobsentinel-core/src/core/resume/tests.rs",
      "crates/jobsentinel-core/src/core/bookmarklet/mod.rs",
      "crates/jobsentinel-core/src/core/bookmarklet/server.rs",
      "crates/jobsentinel-core/src/core/scoring/mod.rs",
      "crates/jobsentinel-core/src/core/scoring/remote.rs",
      "src/features/dashboard/hooks/useDashboardFilters.test.ts",
      "src/features/dashboard/hooks/useDashboardJobOps.test.ts",
      "src/features/dashboard/hooks/useDashboardSavedSearches.test.ts",
      "src/features/dashboard/hooks/useDashboardSearch.test.ts",
      "tests/e2e/playwright/hiring-trends.spec.ts",
      "tests/e2e/playwright/application-assist.spec.ts",
      "tests/e2e/playwright/page-objects/OneClickApplyPage.ts",
      "src/features/market/MarketSnapshotCard.test.tsx",
      "src/features/market/MarketAlertCard.test.tsx",
      "docs/features/resume-builder.md",
      "docs/features/smart-scoring.md",
      "docs/features/job-sources.md",
      "docs/features/resume-matcher.md",
      "docs/features/user-data-management.md",
      "docs/user/DEEP_LINKS.md",
      "docs/user/QUICK_START.md",
      "docs/style-guide/README.md",
      "docs/style-guide/WRITING-FOR-JOB-SEEKERS.md",
      "docs/developer/FRONTEND_TESTING.md",
      "docs/developer/INTEGRATION_TESTING.md",
      "crates/jobsentinel-core/src/core/deeplinks/types.rs",
      "src-tauri/src/main.rs",
      "crates/jobsentinel-core/migrations/00000000000000_initial_schema.sql",
    ]) {
      const expected = `replace engineer-first audience example: ${path}`;
      assert.ok(
        violations.includes(expected),
        `${expected}\n\n${violations.join("\n")}`,
      );
    }
  });
});

test("checkRepoBloat rejects salary audience example drift", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/salary/tests.rs",
      [
        'SeniorityLevel::from_job_title("Junior Software Engineer");',
        'SeniorityLevel::from_job_title("Software Architect");',
        'analyzer.normalize_job_title("Software  Engineer");',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/salary/predictor.rs",
      [
        'insert_test_job(&pool, "job_entry", "Junior Developer", "Remote").await;',
        'predictor.normalize_title("DevOps Engineer");',
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-core/src/core/salary/tests.rs",
        "crates/jobsentinel-core/src/core/salary/predictor.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "crates/jobsentinel-core/src/core/salary/tests.rs",
      "crates/jobsentinel-core/src/core/salary/predictor.rs",
    ]) {
      assert.ok(
        violations.includes(`replace salary audience example: ${path}`),
        violations.join("\n"),
      );
    }
  });
});
