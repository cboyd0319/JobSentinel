export function writeBroadAudienceFrontendFixtures(root, writeFixtureFile) {
  writeFixtureFile(root, "package.json", "{}\n");
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
    "src/dev-runtime/mocks/data.ts",
    [
      'export const mockConfig = { linkedin: { query: "software engineer" } };',
      'export const mockJobs = [{ title: "Senior Software Engineer" }];',
      "",
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-storage/src/market_intelligence/tests.rs",
    [
      'let title = "Software Engineer";',
      'let company = "TechCorp";',
      'let skill = "Rust";',
      "",
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-sources/src/scrapers/simplyhired.rs",
    [
      '/// Search query (e.g., "rust developer")',
      'let company = scraper.extract_company("Software Engineer - Acme Corp", None);',
      "",
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-sources/src/scrapers/jobswithgpt.rs",
    [
      'titles: vec!["Rust Developer".to_string()],',
      '"company": "TechCorp",',
      "",
    ].join("\n"),
  );
  for (const path of [
    "crates/jobsentinel-sources/src/scrapers/glassdoor.rs",
    "crates/jobsentinel-sources/src/scrapers/greenhouse.rs",
    "crates/jobsentinel-network/src/external_request.rs",
    "crates/jobsentinel-sources/src/scrapers/lever/tests.rs",
    "crates/jobsentinel-sources/src/scrapers/usajobs.rs",
    "crates/jobsentinel-sources/src/scrapers/weworkremotely.rs",
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
    "src/dev-runtime/mocks/handlers.ts",
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
    "crates/jobsentinel-documents/src/templates.rs",
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
}
