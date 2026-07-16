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
  const root = mkdtempSync(join(tmpdir(), "js-bloat-retired-product-contracts-"));
  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects legacy preference-list docs copy", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      [
        "### Preferred companies",
        "- Jobs from preferred companies: +50% to company score",
        "- Title matches allowlist: +100%",
        "2. **Job-word boosters**",
        '- Boosted job words: ["Onboarding"]',
        "Job-Word Match:",
        "  Onboarding (found, boosted) +10%",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/application-tracking.md",
      "- [ ] **Job-word boost** - Increase a title score\n",
    );
    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/smart-scoring.md",
        "docs/features/application-tracking.md",
      ],
      { cwd: root },
    );
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(
        "keep job-search docs plain-language: docs/features/smart-scoring.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep job-search docs plain-language: docs/features/application-tracking.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects discontinued Stack Overflow Jobs deep links", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/user/DEEP_LINKS.md",
      "- **Stack Overflow Jobs** - Developer-focused jobs\n",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-assistance/src/deeplinks/generator.rs",
      '"stackoverflow" => "https://stackoverflow.com/jobs?q=test";\n',
    );
    writeFixtureFile(
      root,
      "src/dev-runtime/mocks/handlers.ts",
      'const id = "stackoverflow";\n',
    );
    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/user/DEEP_LINKS.md",
        "crates/jobsentinel-assistance/src/deeplinks/generator.rs",
        "src/dev-runtime/mocks/handlers.ts",
      ],
      { cwd: root },
    );
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(
        "remove discontinued Stack Overflow Jobs deep link: docs/user/DEEP_LINKS.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove discontinued Stack Overflow Jobs deep link: crates/jobsentinel-assistance/src/deeplinks/generator.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove discontinued Stack Overflow Jobs deep link: src/dev-runtime/mocks/handlers.ts",
      ),
      violations.join("\n"),
    );
  });
});
