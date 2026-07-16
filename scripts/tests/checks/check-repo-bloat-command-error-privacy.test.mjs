import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../../checks/repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(
    join(tmpdir(), "jobsentinel-repo-bloat-command-error-privacy-"),
  );

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects raw resume command error details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/resume.rs",
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

    execFileSync("git", ["add", "package.json", "src-tauri/src/ipc/resume.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize resume command error details: src-tauri/src/ipc/resume.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw application tracking command error details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/ats.rs",
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

    execFileSync("git", ["add", "package.json", "src-tauri/src/ipc/ats.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize application tracking command error details: src-tauri/src/ipc/ats.rs",
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
      "src-tauri/src/ipc/automation.rs",
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

    execFileSync("git", ["add", "package.json", "src-tauri/src/ipc/automation.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize automation command error details: src-tauri/src/ipc/automation.rs",
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
      "src-tauri/src/ipc/ml.rs",
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
      "src-tauri/src/ipc/salary.rs",
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
      "src-tauri/src/ipc/market.rs",
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
        "src-tauri/src/ipc/ml.rs",
        "src-tauri/src/ipc/salary.rs",
        "src-tauri/src/ipc/market.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src-tauri/src/ipc/ml.rs",
      "src-tauri/src/ipc/salary.rs",
      "src-tauri/src/ipc/market.rs",
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
      "src-tauri/src/ipc/jobs.rs",
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
      "src-tauri/src/ipc/ghost.rs",
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
      "src-tauri/src/ipc/deeplinks.rs",
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
        "src-tauri/src/ipc/jobs.rs",
        "src-tauri/src/ipc/ghost.rs",
        "src-tauri/src/ipc/deeplinks.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src-tauri/src/ipc/jobs.rs",
      "src-tauri/src/ipc/ghost.rs",
      "src-tauri/src/ipc/deeplinks.rs",
    ]) {
      assert.ok(
        violations.includes(`sanitize utility command error details: ${path}`),
        violations.join("\n"),
      );
    }
  });
});
