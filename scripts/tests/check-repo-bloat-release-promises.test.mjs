import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../check-repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-release-promises-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects front-door release version promises", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      "### Planned for v2.7\n\nRelease packages are tracked for v2.7.\n",
    );

    execFileSync("git", ["add", "README.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace front-door release version promises: README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects front-door macOS installer overpromises", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      "The current release includes Windows, macOS, and Linux installers.\n",
    );

    execFileSync("git", ["add", "README.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace front-door macOS installer overpromise: README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects front-door macOS distribution overpromises", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "README.md", "The macOS package is notarized and Gatekeeper-ready.\n");

    execFileSync("git", ["add", "README.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace front-door macOS distribution overpromise: README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects source release version promises", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/ResumeBuilder.tsx",
      'export const tooltip = "Coming in v2.7 - Full ATS compatibility check";\n',
    );

    execFileSync("git", ["add", "package.json", "src/pages/ResumeBuilder.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace source release version promises: src/pages/ResumeBuilder.tsx"),
      violations.join("\n"),
    );
  });
});
