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
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-privacy-core-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects stale Rust export and scraper stubs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-sources/src/scrapers/mod.rs",
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
      "crates/jobsentinel-documents/src/export.rs",
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
        "crates/jobsentinel-sources/src/scrapers/mod.rs",
        "crates/jobsentinel-documents/src/export.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale scrape_all scraper stub: crates/jobsentinel-sources/src/scrapers/mod.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove stale resume PDF export stub: crates/jobsentinel-documents/src/export.rs",
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
      "src-tauri/src/ipc/jobs.rs",
      'tracing::info!("Command: search_jobs_query (query: {}, limit: {})", query, limit);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/automation.rs",
      'tracing::info!("Command: find_answer_for_question (question: {})", question);\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-storage/src/queries.rs",
      'tracing::debug!("Performing full-text search with query: \'{}\'", query);\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/ipc/jobs.rs",
        "src-tauri/src/ipc/automation.rs",
        "crates/jobsentinel-storage/src/queries.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw private query logging: src-tauri/src/ipc/jobs.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw private query logging: src-tauri/src/ipc/automation.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw private query logging: crates/jobsentinel-storage/src/queries.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw scraper URL and query logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-sources/src/scrapers/greenhouse.rs",
      'tracing::debug!("Cache HIT for URL: {}", url);\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-network/src/external_request.rs",
      [
        'tracing::debug!("Cache miss, fetching: {}", url);',
        'return Err(error).with_context(|| format!("Failed to send request: {url}"));',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-sources/src/scrapers/dice.rs",
      'tracing::info!("Fetching jobs from Dice for query: {}", self.query);\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-sources/src/scrapers/linkedin.rs",
      "#[tracing::instrument(skip(self), fields(query = %self.query, location = %self.location))]\n",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-sources/src/scrapers/jobswithgpt.rs",
      [
        'tracing::debug!("MCP request: {}", request);',
        'message: format!("MCP error: {}", error),',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-sources/src/scrapers/usajobs.rs",
      'format!("USAJobs API error: {} - {}", status, body)\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-sources/src/scrapers/greenhouse.rs",
        "crates/jobsentinel-network/src/external_request.rs",
        "crates/jobsentinel-sources/src/scrapers/dice.rs",
        "crates/jobsentinel-sources/src/scrapers/linkedin.rs",
        "crates/jobsentinel-sources/src/scrapers/jobswithgpt.rs",
        "crates/jobsentinel-sources/src/scrapers/usajobs.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw scraper URL/query logging: crates/jobsentinel-sources/src/scrapers/greenhouse.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw scraper URL/query logging: crates/jobsentinel-network/src/external_request.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw scraper URL/query logging: crates/jobsentinel-sources/src/scrapers/dice.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw scraper URL/query logging: crates/jobsentinel-sources/src/scrapers/linkedin.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw scraper URL/query logging: crates/jobsentinel-sources/src/scrapers/jobswithgpt.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw scraper URL/query logging: crates/jobsentinel-sources/src/scrapers/usajobs.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw scraper loop error logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-sources/src/scrapers/greenhouse.rs",
      'tracing::error!("Failed to scrape {}: {}", company.name, e);\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-sources/src/scrapers/lever/mod.rs",
      'tracing::warn!("Failed to scrape {}: {}", company.name, e);\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-sources/src/scrapers/greenhouse.rs",
        "crates/jobsentinel-sources/src/scrapers/lever/mod.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize scraper loop error logging: crates/jobsentinel-sources/src/scrapers/greenhouse.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sanitize scraper loop error logging: crates/jobsentinel-sources/src/scrapers/lever/mod.rs",
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
      "crates/jobsentinel-sources/src/lib.rs",
      "let body = response.text().await?;\n",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-sources/src/scrapers/remoteok.rs",
      "let json: serde_json::Value = response.json().await?;\n",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-notifications/src/telegram.rs",
      "let bytes = response.bytes().await?;\n",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-network/src/external_request.rs",
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
      "crates/jobsentinel-network/src/body.rs",
      "while let Some(chunk) = response.chunk().await? { body.extend_from_slice(&chunk); }\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-sources/src/lib.rs",
        "crates/jobsentinel-sources/src/scrapers/remoteok.rs",
        "crates/jobsentinel-notifications/src/telegram.rs",
        "crates/jobsentinel-network/src/external_request.rs",
        "crates/jobsentinel-network/src/body.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace unbounded external response body read: crates/jobsentinel-sources/src/lib.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace unbounded external response body read: crates/jobsentinel-sources/src/scrapers/remoteok.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace unbounded external response body read: crates/jobsentinel-notifications/src/telegram.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      !violations.includes(
        "replace unbounded external response body read: crates/jobsentinel-network/src/external_request.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      !violations.includes(
        "replace unbounded external response body read: crates/jobsentinel-network/src/body.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects frontend direct-open deep link fallbacks", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/dashboard/components/JobCard.tsx",
      "try { await openDeepLink(url); } catch { window.open(url, '_blank'); }\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/DashboardPage.tsx",
      "try { await openDeepLink(job.url); } catch { window.open(job.url, '_blank'); }\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/features/dashboard/components/JobCard.tsx",
        "src/features/dashboard/DashboardPage.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("route job URL opens through backend guard only: src/features/dashboard/components/JobCard.tsx"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("route job URL opens through backend guard only: src/features/dashboard/DashboardPage.tsx"),
      violations.join("\n"),
    );
  });
});
