export function hasBroadAudienceProfileExampleDrift(path, text) {
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

  if (path === "src/shared/jobSourceRecommendationTaxonomy.ts") {
    const broadTitlePatterns = [
      /["'`]developer["'`]/i,
      /["'`]engineer["'`]/i,
      /["'`]technical product manager["'`]/i,
      /["'`](?:react|typescript|javascript|python|rust|java|kubernetes|aws|gcp|azure|docker|terraform|node\.js|sql|postgresql)["'`]/i,
    ];
    if (broadTitlePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (
    path === "src/shared/jobSourceRecommendations.ts" &&
    /term\.includes\(techTerm\)/.test(text)
  ) {
    return true;
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

  if (path === "src/dev-runtime/mocks/handlers.ts") {
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

  if (path === "crates/jobsentinel-application/tests/scraping_pipeline_integration.rs") {
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

  if (path === "crates/jobsentinel-application/tests/scheduler_integration_test.rs") {
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

  if (path === "crates/jobsentinel-storage/tests/database_integration_test.rs") {
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

  if (path === "crates/jobsentinel-application/tests/api_contract_test.rs") {
    if (/add_search_history\(["']rust developer["']\)/i.test(text)) {
      return true;
    }
  }

  if (path === "crates/jobsentinel-application/tests/cow_zero_copy_tests.rs") {
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

  if (path === "src-tauri/src/ipc/feedback/debug_log.rs") {
    const feedbackDebugLogPatterns = [/Senior Rust Developer/i, /AcmeCorp/i];

    if (feedbackDebugLogPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src-tauri/src/ipc/feedback/sanitizer.rs") {
    const feedbackSanitizerPatterns = [/Senior Software Engineer/i];

    if (feedbackSanitizerPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }


  return false;
}
