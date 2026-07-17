import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../../checks/repo-bloat.mjs";
import { writeBroadAudienceFrontendFixtures } from "./repo-bloat-broad-audience-frontend-fixtures.mjs";
import { writeBroadAudienceRepositoryFixtures } from "./repo-bloat-broad-audience-repository-fixtures.mjs";
import { engineerFirstAudienceFixturePaths } from "./repo-bloat-broad-audience-paths.mjs";

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
    writeBroadAudienceFrontendFixtures(root, writeFixtureFile);
    writeBroadAudienceRepositoryFixtures(root, writeFixtureFile);
    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/features/dashboard/DashboardPage.tsx",
        "src/features/onboarding/SetupWizard.tsx",
        "src/features/salary/SalaryPage.tsx",
        "src/features/dashboard/components/DashboardFiltersBar.tsx",
        "src/features/company-research/CompanyResearchPanel.tsx",
        "src/features/applications/CoverLetterTemplates.tsx",
        "src/features/dashboard/components/JobImportModal.tsx",
        "src/dev-runtime/mocks/data.ts",
        "src/dev-runtime/mocks/handlers.ts",
        "src/dev-runtime/mocks/handlers.test.ts",
        "crates/jobsentinel-documents/src/templates.rs",
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
        "crates/jobsentinel-application/src/health/smoke_checks/mod.rs",
        "crates/jobsentinel-assistance/src/deeplinks/generator.rs",
        "src-tauri/src/ipc/deeplinks.rs",
        "src-tauri/src/ipc/feedback/debug_log.rs",
        "src-tauri/src/ipc/feedback/sanitizer.rs",
        "src-tauri/src/ipc/import.rs",
        "src-tauri/src/ipc/tests.rs",
        "crates/jobsentinel-storage/src/market_intelligence/tests.rs",
        "crates/jobsentinel-sources/src/scrapers/glassdoor.rs",
        "crates/jobsentinel-sources/src/scrapers/greenhouse.rs",
        "crates/jobsentinel-network/src/external_request.rs",
        "crates/jobsentinel-sources/src/scrapers/jobswithgpt.rs",
        "crates/jobsentinel-sources/src/scrapers/lever/tests.rs",
        "crates/jobsentinel-sources/src/scrapers/simplyhired.rs",
        "crates/jobsentinel-sources/src/scrapers/usajobs.rs",
        "crates/jobsentinel-sources/src/scrapers/weworkremotely.rs",
        "crates/jobsentinel-application/tests/api_contract_test.rs",
        "crates/jobsentinel-storage/tests/database_integration_test.rs",
        "crates/jobsentinel-application/tests/scraping_pipeline_integration.rs",
        "crates/jobsentinel-application/tests/scheduler_integration_test.rs",
        "crates/jobsentinel-application/src/service.rs",
        "crates/jobsentinel-sources/src/job_page/mod.rs",
        "crates/jobsentinel-application/src/service.rs",
        "docs/security/dompurify-test-examples.js",
        "docs/security/XSS_PREVENTION.md",
        "crates/jobsentinel-documents/src/ats_analyzer.rs",
        "crates/jobsentinel-storage/src/resume/builder.rs",
        "crates/jobsentinel-documents/src/export.rs",
        "crates/jobsentinel-storage/src/resume/json_resume.rs",
        "crates/jobsentinel-storage/src/resume/matcher.rs",
        "crates/jobsentinel-documents/src/parser.rs",
        "crates/jobsentinel-storage/src/resume/tests.rs",
        "crates/jobsentinel-assistance/src/bookmarklet/mod.rs",
        "crates/jobsentinel-assistance/src/bookmarklet/server.rs",
        "crates/jobsentinel-application/src/scoring/mod.rs",
        "crates/jobsentinel-application/src/scoring/remote.rs",
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
        "crates/jobsentinel-assistance/src/deeplinks/types.rs",
        "src-tauri/src/bootstrap/mod.rs",
        "crates/jobsentinel-storage/migrations/00000000000000_initial_schema.sql",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of engineerFirstAudienceFixturePaths) {
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
      "crates/jobsentinel-storage/src/salary/tests.rs",
      [
        'SeniorityLevel::from_job_title("Junior Software Engineer");',
        'SeniorityLevel::from_job_title("Software Architect");',
        'analyzer.normalize_job_title("Software  Engineer");',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-storage/src/salary/predictor.rs",
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
        "crates/jobsentinel-storage/src/salary/tests.rs",
        "crates/jobsentinel-storage/src/salary/predictor.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "crates/jobsentinel-storage/src/salary/tests.rs",
      "crates/jobsentinel-storage/src/salary/predictor.rs",
    ]) {
      assert.ok(
        violations.includes(`replace salary audience example: ${path}`),
        violations.join("\n"),
      );
    }
  });
});
