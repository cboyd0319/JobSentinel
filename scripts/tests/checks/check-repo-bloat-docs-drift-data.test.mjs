import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { checkRepoBloat } from "../../checks/repo-bloat.mjs";
import {
  createFixtureRunner,
  writeFixtureFile,
} from "../lib/filesystem-fixture.mjs";

const withGitFixture = createFixtureRunner("jobsentinel-repo-bloat-docs-", {
  git: true,
});

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
