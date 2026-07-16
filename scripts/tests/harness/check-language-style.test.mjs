import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { collectLanguageStyleViolations } from "../../harness/checks/language-style.mjs";

function writeFixtureFile(root, path, content) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-language-style-"));
  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("language style rejects prohibited terms in prose and identifiers", () => {
  withFixture((root) => {
    const exclusionTerm = ["black", "list"].join("");
    const inclusionTerm = ["white", "list"].join("");
    const hierarchyTerm = ["sl", "ave"].join("");
    writeFixtureFile(root, "docs/example.md", `Avoid a ${exclusionTerm}.\n`);
    writeFixtureFile(
      root,
      "src/config.ts",
      `const company_${inclusionTerm} = [];\n`,
    );
    writeFixtureFile(root, "src/worker.ts", `const ${hierarchyTerm} = {};\n`);

    assert.deepEqual(
      collectLanguageStyleViolations(root, [
        "docs/example.md",
        "src/config.ts",
        "src/worker.ts",
      ]),
      [
        "docs/example.md:1 prohibited exclusion term",
        "src/config.ts:1 prohibited inclusion term",
        "src/worker.ts:1 prohibited hierarchy term",
      ],
    );
  });
});

test("language style accepts precise domain terminology", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/config.ts",
      "const preferredCompanies = [];\nconst blockedCompanies = [];\nconst masterKey = null;\n",
    );

    assert.deepEqual(
      collectLanguageStyleViolations(root, ["src/config.ts"]),
      [],
    );
  });
});

test("language style ignores tracked paths removed by a refactor", () => {
  withFixture((root) => {
    assert.deepEqual(
      collectLanguageStyleViolations(root, ["src/removed.ts"]),
      [],
    );
  });
});
