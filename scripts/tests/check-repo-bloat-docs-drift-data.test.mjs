import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../checks/repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-docs-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}


test("checkRepoBloat rejects stale user-data management doc shape", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      [
        "**Your job search, organized and persistent.**",
        "templates with smart variable substitution",
        '"Tech Startup", "Fortune 500"',
        "## Tauri Commands (API Reference)",
        "These commands power the user data features.",
        "### Database Schema",
        "CREATE TABLE saved_searches",
        "## Open Gaps",
        "The current user-data commands do not provide a full JSON export/import",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/user-data-management.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync user-data docs with local privacy guidance: docs/features/user-data-management.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale cargo-deny advisory ignores", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "deny.toml",
      [
        "[advisories]",
        "ignore = [",
        '  "RUSTSEC-2025-0057", # fxhash',
        "]",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "deny.toml"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove stale cargo-deny advisory ignore: deny.toml"),
      violations.join("\n"),
    );
  });
});
