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
    execFileSync("git", ["add", "."], { cwd: root });

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
