import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { hasTechnicalFirstUserCopy } from "../harness/checks/product-copy.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-product-copy-resume-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("product copy rejects technical-first resume copy", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/pages/Resume.tsx",
      [
        "Programming Languages",
        "Gap Analysis",
        "Math.round(skill.confidence_score * 100)",
        "Your resume data has been imported and analyzed",
        'const PROFICIENCY_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];',
        "Proficiency Distribution",
        "Proficiency level",
        "Failed to load resume",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/ResumeBuilder.tsx",
      'const PROFICIENCY_LEVELS = ["beginner", "intermediate", "advanced", "expert"]; Proficiency Select level Failed to import skills Failed to generate preview Export failed Try restarting JobSentinel Try restarting the app more issues',
    );
    writeFixtureFile(
      root,
      "src/components/resume-builder/steps/SkillsStep.tsx",
      "Proficiency\nSelect level\nlevel.charAt(0).toUpperCase() + level.slice(1)\n",
    );
    writeFixtureFile(
      root,
      "src/features/salary/SalaryPage.tsx",
      "Seniority Level\nEntry Level (0-2 years)\nPrincipal/Executive\n25th %\nStrong target from higher range\nunder-anchoring\n",
    );
    writeFixtureFile(
      root,
      "docs/features/resume-builder.md",
      [
        "Include proficiency levels if you want (expert, intermediate, etc.)",
        "**Readability Score**",
        "**Completeness**",
        "## Developer Details",
        "For developers and the curious",
        "Local Storage Model",
        "Tauri Commands",
        "resume_drafts",
        "Single column for consistent upload previews",
        "ready to upload to any job application",
        "Some upload previews and review tools cannot read images",
        "create_resume_draft",
        "export_resume_docx",
        "analyze_resume_for_job",
        "Backend Files",
        "DOCX generation",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/resume-matcher.md",
      "understand parsing, scoring, or ATS internals\nnot ATS manipulation\nshow the exact payload\nrequest metadata locally\n",
    );
    writeFixtureFile(
      root,
      "docs/features/json-resume-import.md",
      [
        "| JSON Resume content | JobSentinel draft field |",
        "`basics.name`",
        "`work[]`",
        "## Developer contract",
        "select_and_import_json_resume",
        "Returned renderer DTOs must not expose local file paths",
        "Run the focused Rust tests",
        "cargo test core::resume::json_resume",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      [
        "external channels are used only if configured",
        "raw private values",
        "redacted configuration summaries",
        "raw notes",
        "credentials, private paths, cookies, webhook",
        "## Developer Notes",
        "Implementation references",
        "src/components/CoverLetterTemplates.tsx",
        "src-tauri/src/core/user_data/",
        "Tauri commands",
        "notificationPrefsExample",
        "advancedFilters",
        "save_notification_preferences",
        "minScoreThreshold",
        "npm run test:run",
        "cargo test --lib user_data",
        "Implementation rule",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      [
        "advanced scoring configuration",
        "## Developer Notes",
        "Current Tauri commands:",
        "get_scoring_config",
        "update_scoring_config",
        "reset_scoring_config_cmd",
        "validate_scoring_config",
        "ScoringConfig",
        "recency proportions",
        "complete scoring model",
        "Internal field names",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/ghost-detection.md",
      [
        "low-trust listing",
        "Settings > Detection > Ghost Detection Settings",
        "For developers and the curious",
        "Signal Weights",
        "Database Schema",
        "ghost_reasons TEXT",
        "### API Commands",
        "invoke(\"get_ghost_config\");",
        "invoke(\"set_ghost_config\", {});",
        "",
      ].join("\n"),
    );
    writeFixtureFile(root, "docs/features/pay-protection.md", "Enter seniority level.\n");
    writeFixtureFile(
      root,
      "docs/features/hiring-trends.md",
      [
        "## Developer Notes",
        "Implementation references",
        "Backend core: `src-tauri/src/core/market_intelligence/`",
        "Tauri commands: `src-tauri/src/commands/market.rs`",
        "npm run test:run -- src/pages/Market.test.tsx",
        "cd src-tauri && cargo test --lib market_intelligence",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/application-tracking.md",
      [
        "## Developer Notes",
        "Implementation references",
        "Backend core: `src-tauri/src/core/ats/`",
        "Tauri commands: `src-tauri/src/commands/ats.rs`",
        "Database migrations: `src-tauri/migrations/`",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/job-source-status.md",
      [
        "## For Maintainers",
        "Important modules:",
        "`src-tauri/src/core/health/smoke_tests.rs`",
        "cd src-tauri && cargo test --lib core::health",
        "npm run lint:bloat",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/remote-preference-scoring.md",
      [
        "## Developer Notes",
        "The backend work-mode logic lives in `src-tauri/src/core/scoring/remote.rs`",
        "cd src-tauri && cargo test --lib scoring::remote",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/job-sources.md",
      [
        "<summary><strong>For maintainers</strong></summary>",
        "cd src-tauri && cargo test --lib core::scrapers",
        "npm run lint:bloat",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/synonym-matching.md",
      [
        "> **Module:** `src-tauri/src/core/scoring/synonyms.rs`",
        "HashMap-based",
        "O(n*m)",
        "SynonymMap::add_synonym_group",
        "cd src-tauri && cargo test --lib scoring::synonyms",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/application-assist.md",
      "private saved-file reference\nsaved resume state\n",
    );
    writeFixtureFile(
      root,
      "docs/features/notifications.md",
      "chat number is correct (negative number for groups)\n",
    );
    writeFixtureFile(root, "docs/features/saved-secrets.md", "## Guarantees\n");
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      [
        "Large platforms with restricted automation policies should be opened by the user through generated search links.",
        "Source adapters must respect rate limits, source-specific boundaries, and source health checks.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizer.tsx",
      [
        "{suggestion.category}",
        "Navigating to Resume Builder",
        "Job context has been saved",
        "Navigation not available",
        "Cannot navigate to Resume Builder",
        "Format Issues",
        "<Badge>{issue.severity}</Badge>",
        "Fix: {issue.fix}",
        "Impact: {suggestion.impact}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizerResultsPanel.tsx",
      [
        "Format Issues",
        "<Badge>{issue.severity}</Badge>",
        "Fix: {issue.fix}",
        "Impact: {suggestion.impact}",
        "",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Resume.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/ResumeBuilder.tsx"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/resume-builder/steps/SkillsStep.tsx"),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "src/features/salary/SalaryPage.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/resume-builder.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/resume-matcher.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/json-resume-import.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/user-data-management.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/smart-scoring.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/ghost-detection.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/pay-protection.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/hiring-trends.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/application-tracking.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/job-source-status.md"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/remote-preference-scoring.md"),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/job-sources.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/synonym-matching.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/application-assist.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/notifications.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/saved-secrets.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/ROADMAP.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/ResumeOptimizer.tsx"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/pages/ResumeOptimizerResultsPanel.tsx"),
      true,
    );
  });
});
