import { readFileSync } from "node:fs";
import { join } from "node:path";

const broadAudienceExamplePaths = new Set([
  "examples/config/config.example.json",
  "examples/resumes/sample-json-resume.json",
  "examples/profiles/content-copywriting.json",
  "examples/profiles/finance-accounting.json",
  "examples/profiles/hr-recruiting.json",
  "examples/profiles/product-management.json",
  "examples/profiles/project-operations.json",
  "examples/profiles/seo-digital-marketing.json",
  "examples/profiles/README.md",
  "examples/profiles/sales-business-dev.json",
  "examples/profiles/ux-design.json",
  "src/features/applications/CoverLetterTemplates.tsx",
  "src/components/CompanyResearchPanel.tsx",
  "src/components/CompanyResearchPanel.test.tsx",
  "src/features/search-links/SearchLinksForm.tsx",
  "src/features/search-links/SearchLinksPage.tsx",
  "src/features/search-links/SearchLinksResults.tsx",
  "src/features/applications/InterviewScheduler.test.tsx",
  "src/features/dashboard/components/JobImportModal.tsx",
  "src/features/dashboard/components/JobCard.test.tsx",
  "src/features/market/LocationHeatmap.test.tsx",
  "src/features/settings/notifications/NotificationPreferences.test.tsx",
  "src/features/dashboard/components/ScoreBreakdownModal.test.tsx",
  "src/ui/StatCard.test.tsx",
  "src/components/SkillCategoryFilter.test.tsx",
  "src/features/resumes/builder/steps/ContactStep.tsx",
  "src/features/resumes/builder/steps/EducationStep.tsx",
  "src/features/resumes/builder/steps/ExperienceStep.tsx",
  "src/features/resumes/builder/steps/SkillsStep.tsx",
  "src/features/resumes/builder/steps/SummaryStep.tsx",
  "src/features/application-assist/ApplicationPreview.tsx",
  "src/features/application-assist/ApplicationPreview.test.tsx",
  "src/features/application-assist/ApplyButton.test.tsx",
  "src/features/application-assist/ProfileForm.tsx",
  "src-tauri/src/core/automation/form_filler.rs",
  "src-tauri/src/core/automation/profile.rs",
  "src/features/resumes/builder/AtsLiveScorePanel.test.tsx",
  "src/features/applications/CoverLetterTemplates.test.tsx",
  "src/features/market/MarketAlertCard.test.tsx",
  "src/features/market/MarketSnapshotCard.test.tsx",
  "src/mocks/handlers/atsPlatform.ts",
  "src/features/market/mockHandlers.ts",
  "src/features/resumes/mocks/resumeAnalysisRunner.ts",
  "src/features/resumes/mocks/resumeBulletPrompts.ts",
  "src/features/resumes/mocks/resumeBuilder.ts",
  "src/features/resumes/mocks/resumeKeywordMatching.ts",
  "src/features/resumes/mocks/resumeRequirementReview.ts",
  "src/mocks/data.ts",
  "src/mocks/handlers.ts",
  "src/mocks/handlers.test.ts",
  "src/features/dashboard/hooks/useDashboardFilters.test.ts",
  "src/features/dashboard/hooks/useDashboardJobOps.test.ts",
  "src/features/dashboard/hooks/useDashboardSavedSearches.test.ts",
  "src/features/dashboard/hooks/useDashboardSearch.test.ts",
  "src/utils/export.test.ts",
  "src/features/dashboard/DashboardPage.tsx",
  "src/features/dashboard/components/DashboardFiltersBar.tsx",
  "src/features/resumes/builder/ResumeBuilderPage.tsx",
  "src/features/resumes/builder/ResumeBuilderPreviewStep.tsx",
  "src/features/resumes/builder/ResumeBuilderVisuals.tsx",
  "src/features/resumes/matching/ResumeMatchPage.tsx",
  "src/features/resumes/matching/ResumeMatchJobWordsOverview.tsx",
  "src/features/resumes/matching/ResumeMatchResultsPanel.tsx",
  "src/features/resumes/matching/resumeMatchModel.ts",
  "src/features/resumes/matching/ResumeMatchPage.test.tsx",
  "src/features/resumes/library/ResumeLibraryPage.tsx",
  "src/features/resumes/library/ResumeLibraryDropdown.tsx",
  "src/features/resumes/library/ResumeTextPreviewModal.tsx",
  "src/features/resumes/library/resumePageModel.ts",
  "src/features/salary/mockHandlers.ts",
  "src/features/salary/SalaryPage.tsx",
  "src/features/salary/SalarySearchCard.tsx",
  "src/features/settings/sources/SettingsConnectedJobSource.tsx",
  "src/features/settings/sources/SettingsJobSourcesSection.tsx",
  "src/features/settings/matching/SettingsResumeMatchingSection.tsx",
  "src/features/settings/search/SettingsPostingRiskSection.tsx",
  "src/features/settings/shared/SettingsSecurityBadge.tsx",
  "src/features/settings/support/SettingsSupportSections.tsx",
  "src/features/settings/SettingsPage.tsx",
  "src/features/onboarding/SetupWizard.tsx",
  "src/features/onboarding/SetupWizardSearchSummary.tsx",
  "src/features/onboarding/setupWizardPreferences.ts",
  "src/contexts/UndoIntegration.test.tsx",
  "src/utils/profiles.ts",
  "src/features/resumes/shared/resumeContactValidation.test.ts",
  "src/utils/formValidation.test.ts",
  "src/shared/search-links/model.ts",
  "src-tauri/src/core/health/smoke_tests.rs",
  "src-tauri/src/core/deeplinks/generator.rs",
  "src-tauri/src/core/import/README.md",
  "src-tauri/src/core/import/schema_org.rs",
  "src-tauri/src/core/import/tests.rs",
  "src-tauri/src/core/resume/ats_analyzer/bullet_prompts.rs",
  "src-tauri/src/core/resume/ats_analyzer.rs",
  "src-tauri/src/core/resume/builder.rs",
  "src-tauri/src/core/resume/export.rs",
  "src-tauri/src/core/resume/json_resume.rs",
  "src-tauri/src/core/resume/matcher.rs",
  "src-tauri/src/core/resume/parser.rs",
  "src-tauri/src/core/resume/templates.rs",
  "src-tauri/src/core/resume/tests.rs",
  "src-tauri/src/core/bookmarklet/mod.rs",
  "src-tauri/src/core/bookmarklet/server.rs",
  "src-tauri/src/core/scoring/mod.rs",
  "src-tauri/src/core/scoring/remote.rs",
  "src-tauri/src/core/scoring/synonyms.rs",
  "src-tauri/src/commands/deeplinks.rs",
  "src-tauri/src/commands/feedback/debug_log.rs",
  "src-tauri/src/commands/feedback/sanitizer.rs",
  "src-tauri/src/commands/import.rs",
  "src-tauri/src/commands/tests.rs",
  "src-tauri/src/core/deeplinks/types.rs",
  "src-tauri/src/core/market_intelligence/tests.rs",
  "src-tauri/src/core/scrapers/glassdoor.rs",
  "src-tauri/src/core/scrapers/greenhouse.rs",
  "src-tauri/src/core/scrapers/http_client.rs",
  "src-tauri/src/core/scrapers/jobswithgpt.rs",
  "src-tauri/src/core/scrapers/lever/tests.rs",
  "src-tauri/src/core/scrapers/simplyhired.rs",
  "src-tauri/src/core/scrapers/usajobs.rs",
  "src-tauri/src/core/scrapers/weworkremotely.rs",
  "src-tauri/tests/api_contract_test.rs",
  "src-tauri/tests/cow_zero_copy_tests.rs",
  "src-tauri/tests/database_integration_test.rs",
  "src-tauri/tests/live_scraper_test.rs",
  "src-tauri/tests/scraper_integration_test.rs",
  "src-tauri/tests/scraping_pipeline_integration.rs",
  "src-tauri/tests/scheduler_integration_test.rs",
  "src-tauri/src/main.rs",
  "src-tauri/migrations/00000000000000_initial_schema.sql",
  "tests/e2e/playwright/resume-upload-matching.spec.ts",
  "tests/e2e/playwright/hiring-trends.spec.ts",
  "tests/e2e/playwright/application-assist.spec.ts",
  "tests/e2e/playwright/page-objects/OneClickApplyPage.ts",
  "docs/user/DEEP_LINKS.md",
  "docs/user/QUICK_START.md",
  "docs/style-guide/README.md",
  "docs/style-guide/WRITING-FOR-JOB-SEEKERS.md",
  "docs/developer/FRONTEND_TESTING.md",
  "docs/developer/INTEGRATION_TESTING.md",
  "docs/developer/MACOS_DEVELOPMENT.md",
  "docs/developer/TESTING.md",
  "docs/README.md",
  "docs/ROADMAP.md",
  "docs/features/resume-builder.md",
  "docs/features/smart-scoring.md",
  "docs/features/job-sources.md",
  "docs/features/resume-matcher.md",
  "docs/features/user-data-management.md",
  "docs/security/dompurify-test-examples.js",
  "docs/security/XSS_PREVENTION.md",
]);

const salaryAudienceExamplePaths = new Set([
  "src-tauri/src/core/salary/benchmarks.rs",
  "src-tauri/src/core/salary/negotiation.rs",
  "src-tauri/src/core/salary/predictor.rs",
  "src-tauri/src/core/salary/tests.rs",
]);

const genericScraperFixturePaths = new Set([
  "src-tauri/src/core/scrapers/glassdoor.rs",
  "src-tauri/src/core/scrapers/greenhouse.rs",
  "src-tauri/src/core/scrapers/http_client.rs",
  "src-tauri/src/core/scrapers/jobswithgpt.rs",
  "src-tauri/src/core/scrapers/lever/tests.rs",
  "src-tauri/src/core/scrapers/simplyhired.rs",
  "src-tauri/src/core/scrapers/usajobs.rs",
  "src-tauri/src/core/scrapers/weworkremotely.rs",
]);

export function hasEngineerFirstAudienceExamples(root, path) {
  if (!broadAudienceExamplePaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");

  if (path === "examples/config/config.example.json") {
    const configExamplePatterns = [
      /"preferred_companies":\s*\[[^\]]*"Google"[^\]]*"Cloudflare"[^\]]*"GitHub"/is,
      /"_profiles_available":\s*"[^"]*software-engineering,\s*seo-digital-marketing/is,
    ];

    if (configExamplePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "examples/profiles/README.md") {
    const firstProfileRow = text.match(/\|\s*\*\*[^*]+\*\*\s*\|[^\n]+/);
    if (
      firstProfileRow &&
      /Software Engineering|Cybersecurity|Data Science/i.test(
        firstProfileRow[0],
      )
    ) {
      return true;
    }
  }

  if (
    path === "examples/profiles/content-copywriting.json" ||
    path === "examples/profiles/finance-accounting.json" ||
    path === "examples/profiles/hr-recruiting.json" ||
    path === "examples/profiles/product-management.json" ||
    path === "examples/profiles/project-operations.json" ||
    path === "examples/profiles/seo-digital-marketing.json" ||
    path === "examples/profiles/sales-business-dev.json" ||
    path === "examples/profiles/ux-design.json"
  ) {
    const profileSeedPatterns = [
      /"(?:greenhouse_urls|lever_urls)"\s*:\s*\[[^\]]*"https?:\/\//is,
    ];

    if (profileSeedPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/utils/profiles.ts") {
    const techSourceTerms = text.match(
      /const TECH_SOURCE_TERMS = \[([\s\S]*?)\];/,
    );
    const techSourceTermBody = techSourceTerms?.[1] ?? "";
    const broadTitlePatterns = [
      /["'`]developer["'`]/i,
      /["'`]engineer["'`]/i,
      /["'`]technical product manager["'`]/i,
      /["'`](?:react|typescript|javascript|python|rust|java|kubernetes|aws|gcp|azure|docker|terraform|node\.js|sql|postgresql)["'`]/i,
    ];
    const broadSubstringMatcherPatterns = [/term\.includes\(techTerm\)/];

    if (
      broadTitlePatterns.some((pattern) => pattern.test(techSourceTermBody)) ||
      broadSubstringMatcherPatterns.some((pattern) => pattern.test(text))
    ) {
      return true;
    }
  }

  if (
    path === "docs/developer/FRONTEND_TESTING.md" ||
    path === "docs/developer/MACOS_DEVELOPMENT.md" ||
    path === "docs/developer/TESTING.md"
  ) {
    const developerDocsPatterns = [
      /Senior Engineer - Acme Corp/i,
      /React Engineer/i,
      /Security Engineer/i,
      /Product Security/i,
      /salary_floor_usd:\s*150000/i,
      /salary floor:\s*\$150,000/i,
    ];

    if (developerDocsPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/features/resumes/builder/AtsLiveScorePanel.tsx") {
    const atsLiveScorePatterns = [
      /Add missing keywords/i,
      /["'`]Keywords["'`]/i,
      /keywords matched/i,
      /Keyword Matches/i,
      /Missing Keywords/i,
      /Consider adding these keywords/i,
    ];

    if (atsLiveScorePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (
    path === "src/features/resumes/matching/ResumeMatchPage.tsx" ||
    path === "src/features/resumes/matching/ResumeMatchJobWordsOverview.tsx" ||
    path === "src/features/resumes/matching/ResumeMatchResultsPanel.tsx" ||
    path === "src/features/resumes/matching/resumeMatchModel.ts"
  ) {
    const resumeOptimizerPatterns = [
      /ATS Resume Optimizer/i,
      /Applicant Tracking Systems/i,
      /View Power Words/i,
      /ATS Power Words/i,
      /Keyword Density Heatmap/i,
      /Matched keywords/i,
      /Missing keywords/i,
      /\(\{(?:required|preferred|industry)\.length\} keywords\)/i,
      /Opacity indicates keyword frequency/i,
      /ScoreItem label=["']Keywords["']/i,
      /Keyword Matches/i,
      /Missing Keywords/i,
      /Consider adding these keywords/i,
      /These action verbs and keywords are commonly recognized by ATS systems/i,
      /resume screening tools/i,
      /CardHeader title=["']Job Description["']/i,
      /CardHeader title=["']Resume Data["']/i,
      /Structured resume data/i,
      /Please enter your resume data/i,
      /Resume data not recognized/i,
      /Paste structured resume data/i,
      /Analyze with Job/i,
      /No analysis yet/i,
      /Enter your job description and resume data/i,
    ];

    if (resumeOptimizerPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/mocks/handlers.ts") {
    const marketMockPatterns = [
      /TypeScript demand is surging/i,
      /skill_name:\s*["']Kubernetes["']/i,
      /top_skill:\s*["']React["']/i,
      /top_company:\s*["']TechCorp["']/i,
      /top_skill:\s*["']TypeScript["']/i,
      /TechCorp|StartupXYZ|BigTech Inc/,
      /Top Skill:\s*TypeScript/i,
      /Top Company:\s*BigTech Inc/i,
      /React Demand Spike/i,
    ];

    if (marketMockPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src-tauri/tests/scraper_integration_test.rs") {
    const scraperIntegrationPatterns = [
      /Senior Rust Engineer/i,
      /Full Stack Engineer/i,
      /Remote Rust Developer/i,
      /Backend Engineer/i,
      /Senior Software Engineer/i,
      /software engineer/i,
      /rust developer/i,
      /DiceScraper::new\(["']python["']/i,
      /San Francisco/i,
      /TechCorp|StartupXYZ/i,
      /"team":\s*"Engineering"/i,
      /"tags":\s*\["rust",\s*"remote"\]/i,
    ];

    if (scraperIntegrationPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src-tauri/tests/scraping_pipeline_integration.rs") {
    const pipelineIntegrationPatterns = [
      /Security Engineer/i,
      /Rust Developer/i,
      /Senior Rust/i,
      /Build secure systems in Rust/i,
      /Build amazing Rust applications/i,
      /TechCorp|RustCorp|SecureCo|TestCo/i,
      /San Francisco/i,
      /keywords_boost:\s*vec!\[[^\]]*"Rust"/i,
      /keywords_exclude:\s*vec!\[[^\]]*"PHP"/i,
      /Search for "Rust"/i,
      /Search for "Security"/i,
    ];

    if (pipelineIntegrationPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src-tauri/tests/scheduler_integration_test.rs") {
    const schedulerIntegrationPatterns = [
      /Security Engineer/i,
      /Rust Developer/i,
      /Backend Engineer/i,
      /Senior Rust/i,
      /Rust Security Engineer/i,
      /Rust Backend Developer/i,
      /Python Developer/i,
      /Kubernetes/i,
      /PHP WordPress Developer/i,
      /PHP Developer/i,
      /TechCorp|TestCorp|AgencyCorp/i,
      /San Francisco|Seattle/i,
      /keywords_boost:\s*vec!\[[^\]]*"Rust"/i,
      /keywords_exclude:\s*vec!\[[^\]]*"PHP"/i,
      /Search for Rust/i,
      /search_jobs\("Rust"/i,
    ];

    if (schedulerIntegrationPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src-tauri/tests/database_integration_test.rs") {
    const databaseIntegrationPatterns = [
      /TestCorp/i,
      /Senior Rust Engineer/i,
      /Rust Developer/i,
      /Rust Security Engineer/i,
      /Python Developer/i,
      /Java Developer/i,
      /RustCorp|SecureCorp|PyCorp|JavaCorp/i,
      /San Francisco/i,
      /Search for Rust/i,
      /search_jobs\("Rust"/i,
    ];

    if (databaseIntegrationPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src-tauri/tests/api_contract_test.rs") {
    if (/add_search_history\(["']rust developer["']\)/i.test(text)) {
      return true;
    }
  }

  if (path === "src-tauri/tests/cow_zero_copy_tests.rs") {
    const cowFixturePatterns = [
      /jobs\/senior-engineer/i,
      /department=engineering/i,
      /software engineer/i,
      /backend-dev/i,
      /frontend developer/i,
      /San Francisco, CA/i,
      /New York, NY/i,
    ];

    if (cowFixturePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src-tauri/tests/live_scraper_test.rs") {
    const liveScraperFixturePatterns = [
      /"developer"\.to_string\(\)/i,
      /remote-programming-jobs/i,
      /rust developer/i,
      /YcStartupScraper::new\(Some\(["']engineer["']/i,
      /software engineer/i,
      /Some\(["']San Francisco["']\.to_string\(\)\)/i,
    ];

    if (liveScraperFixturePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src-tauri/src/commands/feedback/debug_log.rs") {
    const feedbackDebugLogPatterns = [/Senior Rust Developer/i, /AcmeCorp/i];

    if (feedbackDebugLogPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src-tauri/src/commands/feedback/sanitizer.rs") {
    const feedbackSanitizerPatterns = [/Senior Software Engineer/i];

    if (feedbackSanitizerPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "examples/resumes/sample-json-resume.json") {
    const sampleJsonResumePatterns = [
      /"name":\s*"John Doe"/i,
      /"label":\s*"Senior Software Engineer"/i,
      /"position":\s*"(?:(?:Senior|Junior)\s+)?(?:Software Engineer|Developer)"/i,
      /"network":\s*"GitHub"/i,
      /"name":\s*"Tech Corp"/i,
      /"name":\s*"Startup Inc"/i,
      /"keywords":\s*\[[^\]]*"Rust"/i,
    ];

    return sampleJsonResumePatterns.some((pattern) => pattern.test(text));
  }

  if (path === "src-tauri/src/core/market_intelligence/tests.rs") {
    const marketIntelligenceTestPatterns = [
      /Software Engineer/i,
      /Data Scientist/i,
      /Product Manager/i,
      /TechCorp|BigTech|StartupInc/i,
      /\bRust\b|\bPython\b|\bTypeScript\b/,
      /Figma|Airbnb|B2B SaaS|ML algorithms/i,
    ];

    return marketIntelligenceTestPatterns.some((pattern) => pattern.test(text));
  }

  if (
    path === "src-tauri/src/core/scoring/mod.rs" ||
    path === "src-tauri/src/core/scoring/remote.rs"
  ) {
    const scoringLocationFixturePatterns = [
      /create_test_job\(["']Engineer["']/i,
      /Some\(["']San Francisco(?:,\s*CA)?(?:\s*\(Hybrid\))?["']\)/i,
      /Some\(["']New York(?:,\s*NY)?(?:\s*\(Hybrid\))?["']\)/i,
      /job\.location\s*=\s*Some\(["']San Francisco,\s*CA(?:\s*\(Hybrid\))?["']\.to_string\(\)\)/i,
      /job\.location\s*=\s*Some\(["']New York,\s*NY["']\.to_string\(\)\)/i,
    ];

    return scoringLocationFixturePatterns.some((pattern) => pattern.test(text));
  }

  if (path === "src-tauri/src/core/scoring/synonyms.rs") {
    if (text.includes("job-scoring-synonyms.json")) {
      const taxonomy = JSON.parse(
        readFileSync(
          join(root, "resources/taxonomies/job-scoring-synonyms.json"),
          "utf8",
        ),
      );
      const synonymGroups = Array.isArray(taxonomy.synonymGroups)
        ? taxonomy.synonymGroups
        : [];
      const groupText = synonymGroups.map((group) =>
        Array.isArray(group) ? group.join(" ") : "",
      );
      const broadStartIndex = groupText.findIndex((group) =>
        /Customer Support|Administrative Assistant|Project Coordinator/i.test(
          group,
        ),
      );
      const technicalIndex = groupText.findIndex((group) =>
        /\bPython\b|JavaScript|TypeScript|Kubernetes|AWS/i.test(group),
      );

      return (
        broadStartIndex === -1 ||
        technicalIndex === -1 ||
        technicalIndex < broadStartIndex
      );
    }

    const broadStartIndex = text.indexOf(
      "// Customer, office, and coordination roles",
    );
    const technicalIndex = text.indexOf("// Programming Languages");

    if (
      broadStartIndex === -1 ||
      technicalIndex === -1 ||
      technicalIndex < broadStartIndex
    ) {
      return true;
    }
  }

  if (genericScraperFixturePaths.has(path)) {
    const genericScraperFixturePatterns = [
      /\bEngineer\b/,
      /\bDeveloper\b/,
      /Software Engineer/i,
      /Backend Engineer/i,
      /Frontend Developer/i,
      /Full Stack/i,
      /Senior Rust/i,
      /Rust Developer/i,
      /Rust Engineer/i,
      /Python Developer/i,
      /\bTypeScript\b/i,
      /\bKubernetes\b/i,
      /TechCorp|StartupXYZ|BigTech/i,
      /Developer at TechStartup/i,
      /rust developer/i,
    ];

    return genericScraperFixturePatterns.some((pattern) => pattern.test(text));
  }

  const stalePatterns = [
    /placeholder=["'][^"']*(?:Senior\s+)?Software Engineer/i,
    /placeholder=["'][^"']*John Doe/i,
    /placeholder=["'][^"']*San Francisco, CA/i,
    /placeholder=["'][^"']*San Francisco,\s*New York/i,
    /placeholder=["'][^"']*github\.com\/johndoe/i,
    /label=["']GitHub["']/i,
    /label:\s*["']GitHub["']/i,
    /name:\s*["']GitHub["']/i,
    /name:\s*["']John Doe["']/i,
    /name:\s*["']Jane Doe["']/i,
    /categories:\s*\[\s*["']Frontend["'],\s*["']Backend["'],\s*["']DevOps["']\s*\]/i,
    /["']John Doe["']/i,
    /["']Jane Doe["']/i,
    />\s*GitHub\s*</i,
    /linkedin:\s*["']linkedin\.com\/in\/johndoe["']/i,
    /linkedin\.com\/in\/johndoe/i,
    /location:\s*["']San Francisco, CA["']/i,
    /cities:\s*\[\s*["']Remote["'],\s*["']San Francisco["'],\s*["']New York["']\s*\]/i,
    /company:\s*["']TechCorp["']/i,
    /company:\s*["']Tech Corp["']/i,
    /companyName=["']TestCorp["']/i,
    /create_test_job\([^)]*["']TestCorp["']/i,
    /create_test_job\([^)]*["'](?:Rust Developer|Python Developer|Software Engineer)["']/i,
    /create_test_job\([^)]*["']TechCorp["']/i,
    /create_test_job\([^)]*["']Engineer["']/i,
    /calculate_job_hash\([^)]*["']Software Engineer["']/i,
    /create_test_job\([^)]*["'](?:Rust Engineer|Backend Engineer)["']/i,
    /["']Senior Engineer["']/i,
    /Title matches:\s*Senior Engineer/i,
    /https:\/\/github\.com\/(?:johndoe|caseysentinel)/i,
    /code\.example\.com/i,
    /GitHub profile link if relevant to your role/i,
    /placeholder=["'][^"']*React/i,
    /placeholder=["'][^"']*Frontend/i,
    /placeholder=["'][^"']*Remote Rust/i,
    /name:\s*["']Remote Rust["']/i,
    /rust remote/i,
    /setNewSearchName\(["']Remote Rust["']\)/i,
    /Unbookmarked:\s*Software Engineer/i,
    /Moved\s+Software Engineer\s+to Phone Screen/i,
    /Tech Cover Letter/i,
    /placeholder=["'][^"']*Tech Company Application/i,
    /Skill name \(e\.g\., Python, React\)/i,
    /Experienced software engineer/i,
    /AI-powered (?:ghost detection algorithm|engine)/i,
    /Resume Matcher commands/i,
    /e\.g\., ["']Software Engineer["']/i,
    /e\.g\., ["']San Francisco, CA["']/i,
    /JOHN DOE - Software Engineer/i,
    /Comma or OR:\s*react,\s*vue/i,
    /senior AND engineer/i,
    /["']?query["']?\s*:\s*["']software engineer["']/i,
    /software\+engineer/i,
    /title:\s*["'](?:Senior\s+)?Software Engineer["']/i,
    /title:\s*["']Remote Software Engineer["']/i,
    /\?\?\s*["']Software Engineer["']/i,
    /Worked on improving database performance/i,
    /The skill extractor recognizes \*\*\d+\+ skills\*\* across 6 categories/i,
    /Identify \d+\+ technical skills across 6 categories/i,
    /extracts technical and\s+soft skills/i,
    /Technical Skills-First/i,
    /Perfect for engineering roles/i,
    /Engineering roles - skills first/i,
    /Tech companies - clean and minimal/i,
    /Tech Stack\b/i,
    /Tech Stack Focus/i,
    /Try searching for "\{companyName\}" on LinkedIn or Glassdoor/i,
    /Technical & soft skills/i,
    /Technical and professional skills/i,
    /Enter your job title or keywords \(e\.g\., "Software Engineer"\)/i,
    /Optionally enter a location \(e\.g\., "San Francisco, CA" or "Remote"\)/i,
    /jobs\/software-engineer/i,
    /^- "Software Engineer"$/m,
    /Examples:\s*\n\s*- "Software Engineer"/i,
    /^\*\*Software Engineer in San Francisco\*\*$/m,
    /SWE Remote/i,
    /Build a professional resume in 7 easy steps/i,
    /LinkedIn URL \(highly recommended\)/i,
    /GitHub, portfolio, or personal website \(optional\)/i,
    /Security engineer with 8 years/i,
    /Poor fit for your current resume/i,
    /Responsible for managing the security team/i,
    /Led 12-person security team/i,
    /If they say "Python"/i,
    /top_skill:\s*["']React["']/i,
    /top_company:\s*["']TechCorp["']/i,
    /Top Skill:\s*TypeScript/i,
    /Top Company:\s*BigTech Inc/i,
    /React Demand Spike/i,
    /TechCorp Hiring Pause/i,
    /TechCorp is great/i,
    /\$ whoami/i,
    /JOHN DOE - Data Analyst/i,
    /\.\/experience/i,
    /B\.S\. CS/i,
    /Senior TypeScript role/i,
    /B2B SaaS/i,
    /ML algorithms/i,
  ];

  return stalePatterns.some((pattern) => pattern.test(text));
}

export function hasSalaryAudienceExampleDrift(root, path) {
  if (!salaryAudienceExamplePaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");

  if (
    path === "src-tauri/src/core/salary/benchmarks.rs" ||
    path === "src-tauri/src/core/salary/negotiation.rs"
  ) {
    const salaryLocationPatterns = [
      /location:\s*["']San Francisco,\s*CA["']/i,
      /location:\s*["']Seattle,\s*WA["']/i,
      /location:\s*["']Austin,\s*TX["']/i,
      /"San Francisco,\s*CA"\.to_string\(\)/i,
      /"Seattle,\s*WA"\.to_string\(\)/i,
      /"Austin,\s*TX"\.to_string\(\)/i,
      /assert_eq!\([^,]+,\s*["']San Francisco,\s*CA["']\)/i,
      /assert_eq!\([^,]+,\s*["']Seattle,\s*WA["']\)/i,
      /assert_eq!\([^,]+,\s*["']Austin,\s*TX["']\)/i,
    ];

    if (salaryLocationPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src-tauri/src/core/salary/predictor.rs") {
    const predictorPatterns = [
      /insert_test_job\([^)]*["'](?:Junior Developer|Staff Engineer|Principal Engineer|Backend Engineer|DevOps Engineer|ML Engineer)["']/i,
      /predictor\.normalize_title\(["'](?:DevOps Engineer|Machine Learning Engineer|Frontend Developer|C\+\+ Developer|ML\/AI Engineer)["']\)/i,
    ];

    return predictorPatterns.some((pattern) => pattern.test(text));
  }

  const salaryModuleTestPatterns = [
    /SeniorityLevel::from_job_title\(["']Software Architect["']\)/,
    /SeniorityLevel::from_job_title\(["'](?:Junior Software Engineer|Senior Software Engineer|Staff Engineer|Principal Engineer|Principal Software Engineer|Distinguished Engineer|Senior Engineer|Sr\. Developer|Lead Engineer|Junior Developer|Jr\. Software Engineer|Associate Engineer|Backend Developer|SENIOR SOFTWARE ENGINEER|principal engineer|StAfF EnGiNeEr|Principal Engineér|Júnior Developer|Principal Staff Engineer|Staff Senior Engineer)["']\)/,
    /analyzer\.normalize_job_title\(["'](?:DevOps Engineer|Jr\. Developer)["']\)/,
    /analyzer\.normalize_job_title\(["']Software\s{2,}Engineer["']\)/,
  ];

  return salaryModuleTestPatterns.some((pattern) => pattern.test(text));
}
