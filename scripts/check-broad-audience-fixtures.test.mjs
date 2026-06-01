import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasEngineerFirstAudienceExamples,
  hasSalaryAudienceExampleDrift,
} from "./harness/checks/broad-audience-fixtures.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-broad-audience-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("broad audience fixtures reject engineer-first resume optimizer copy", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/pages/ResumeOptimizer.tsx", "ATS Resume Optimizer\n");

    assert.equal(
      hasEngineerFirstAudienceExamples(root, "src/pages/ResumeOptimizer.tsx"),
      true,
    );
    assert.equal(
      hasEngineerFirstAudienceExamples(root, "src/pages/Applications.tsx"),
      false,
    );
  });
});

test("broad audience fixtures reject generic technical scraper examples", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/glassdoor.rs",
      "Senior Rust Engineer at TechCorp",
    );

    assert.equal(
      hasEngineerFirstAudienceExamples(root, "src-tauri/src/core/scrapers/glassdoor.rs"),
      true,
    );
    assert.equal(
      hasEngineerFirstAudienceExamples(root, "src-tauri/src/core/scrapers/linkedin.rs"),
      false,
    );
  });
});

test("broad audience fixtures reject stale placeholder examples", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/JobImportModal.tsx",
      'placeholder="Software Engineer"',
    );

    assert.equal(
      hasEngineerFirstAudienceExamples(root, "src/components/JobImportModal.tsx"),
      true,
    );
  });
});

test("broad audience fixtures reject narrow mock defaults and profile examples", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/mocks/data.ts",
      'cities: ["Remote", "San Francisco", "New York"]',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/automation/profile.rs",
      '"John Doe".to_string()\n"https://github.com/johndoe".to_string()',
    );

    assert.equal(hasEngineerFirstAudienceExamples(root, "src/mocks/data.ts"), true);
    assert.equal(
      hasEngineerFirstAudienceExamples(root, "src-tauri/src/core/automation/profile.rs"),
      true,
    );
  });
});

test("broad audience fixtures reject narrow utility and live scraper defaults", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/SkillCategoryFilter.test.tsx",
      'categories: ["Frontend", "Backend", "DevOps"]',
    );
    writeFixtureFile(
      root,
      "src-tauri/tests/api_contract_test.rs",
      'manager.add_search_history("rust developer").await.unwrap();',
    );
    writeFixtureFile(
      root,
      "src-tauri/tests/cow_zero_copy_tests.rs",
      '"https://example.com/jobs/senior-engineer"\nlet title = "Software Engineer";',
    );
    writeFixtureFile(
      root,
      "src-tauri/tests/live_scraper_test.rs",
      'WeWorkRemotelyScraper::new(Some("remote-programming-jobs".to_string()), 50);',
    );

    assert.equal(
      hasEngineerFirstAudienceExamples(root, "src/components/SkillCategoryFilter.test.tsx"),
      true,
    );
    assert.equal(
      hasEngineerFirstAudienceExamples(root, "src-tauri/tests/api_contract_test.rs"),
      true,
    );
    assert.equal(
      hasEngineerFirstAudienceExamples(root, "src-tauri/tests/cow_zero_copy_tests.rs"),
      true,
    );
    assert.equal(
      hasEngineerFirstAudienceExamples(root, "src-tauri/tests/live_scraper_test.rs"),
      true,
    );
  });
});

test("salary audience fixtures reject engineer-centered salary examples", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/salary/predictor.rs",
      'predictor.normalize_title("DevOps Engineer")',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/salary/tests.rs",
      'SeniorityLevel::from_job_title("Software Architect")',
    );

    assert.equal(
      hasSalaryAudienceExampleDrift(root, "src-tauri/src/core/salary/predictor.rs"),
      true,
    );
    assert.equal(
      hasSalaryAudienceExampleDrift(root, "src-tauri/src/core/salary/tests.rs"),
      true,
    );
    assert.equal(hasSalaryAudienceExampleDrift(root, "src-tauri/src/core/salary/mod.rs"), false);
  });
});

test("broad audience fixtures reject tech-hub scoring location defaults", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/scoring/mod.rs",
      'job.location = Some("San Francisco, CA (Hybrid)".to_string());',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scoring/remote.rs",
      [
        'let job = create_test_job("Care Coordinator", Some("New York, NY"), None, None);',
        'let fallback = create_test_job("Engineer", Some("Remote - US"), None, None);',
        "",
      ].join("\n"),
    );

    assert.equal(
      hasEngineerFirstAudienceExamples(root, "src-tauri/src/core/scoring/mod.rs"),
      true,
    );
    assert.equal(
      hasEngineerFirstAudienceExamples(root, "src-tauri/src/core/scoring/remote.rs"),
      true,
    );
  });
});
