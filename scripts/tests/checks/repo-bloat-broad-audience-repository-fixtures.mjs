export function writeBroadAudienceRepositoryFixtures(root, writeFixtureFile) {
  writeFixtureFile(root, "src/ui/StatCard.test.tsx", '"John Doe";\n');
  writeFixtureFile(
    root,
    "src/shared/validation/contactFieldValidation.test.ts",
    '"linkedin.com/in/johndoe";\n',
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-application/src/health/smoke_checks/mod.rs",
    '"https://www.indeed.com/jobs?q=software+engineer&l=remote";\n',
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-assistance/src/deeplinks/generator.rs",
    'query: "Software Engineer"; location: "San Francisco, CA";\n',
  );
  writeFixtureFile(
    root,
    "src-tauri/src/ipc/deeplinks.rs",
    'query: "Software Engineer"; location: Some("San Francisco, CA".to_string());\n',
  );
  writeFixtureFile(
    root,
    "src-tauri/src/ipc/feedback/debug_log.rs",
    'let message = "Job title: Senior Rust Developer at AcmeCorp";\n',
  );
  writeFixtureFile(
    root,
    "src-tauri/src/ipc/feedback/sanitizer.rs",
    'let input = "Failed to find job titled \\"Senior Software Engineer\\"";\n',
  );
  writeFixtureFile(
    root,
    "src-tauri/src/ipc/import.rs",
    'calculate_job_hash("Google", "Software Engineer", "https://example.com/job/1");\n',
  );
  writeFixtureFile(
    root,
    "src-tauri/src/ipc/tests.rs",
    'create_test_job(2, "Backend Engineer", 0.85);\n',
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-application/tests/api_contract_test.rs",
    'create_test_job("salary_test", "Software Engineer", "TestCorp");\n',
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-storage/tests/database_integration_test.rs",
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
    "crates/jobsentinel-application/tests/scraping_pipeline_integration.rs",
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
    "crates/jobsentinel-application/tests/scheduler_integration_test.rs",
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
    "crates/jobsentinel-application/src/service.rs",
    'title: "Software Engineer"; "San Francisco, CA";\n',
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-sources/src/job_page/mod.rs",
    'title: "Software Engineer"; "San Francisco, CA";\n',
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-application/src/service.rs",
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
    "crates/jobsentinel-documents/src/ats_analyzer.rs",
    '"John Doe"; "Senior Software Engineer"; "Tech Corp";\n',
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-storage/src/resume/builder.rs",
    '"John Doe"; "TechCorp"; "Senior Software Engineer";\n',
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-documents/src/export.rs",
    '"John Doe"; "Tech Corp"; "Senior Software Engineer";\n',
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-storage/src/resume/json_resume.rs",
    '"John Doe"; "Tech Corp"; "Software Engineer";\n',
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-storage/src/resume/matcher.rs",
    'title: "Software Engineer", company: "TechCorp";\n',
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-documents/src/parser.rs",
    '"John Doe"; "Software Engineer"; "TechCorp";\n',
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-storage/src/resume/tests.rs",
    'title: "Software Engineer", company: "TechCorp";\n',
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-assistance/src/bookmarklet/mod.rs",
    'title: "Software Engineer", company: "Google";\n',
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-assistance/src/bookmarklet/server.rs",
    'calculate_job_hash("Google", "Software Engineer", "https://example.com/job/1");\n',
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-application/src/scoring/mod.rs",
    'job.location = Some("San Francisco, CA (Hybrid)".to_string());\n',
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-application/src/scoring/remote.rs",
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
    "src/dev-runtime/mocks/handlers.test.ts",
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
    "crates/jobsentinel-assistance/src/deeplinks/types.rs",
    '/// Job title or keywords (e.g., "Software Engineer")\n',
  );
  writeFixtureFile(
    root,
    "src-tauri/src/bootstrap/mod.rs",
    "// Resume Matcher commands\n",
  );
  writeFixtureFile(
    root,
    "crates/jobsentinel-storage/migrations/00000000000000_initial_schema.sql",
    'job_title_normalized TEXT NOT NULL, -- Normalized title (e.g., "Software Engineer")\n',
  );

}
