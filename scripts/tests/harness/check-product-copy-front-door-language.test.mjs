import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { hasTechnicalFirstUserCopy } from "../../harness/checks/product-copy.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-product-copy-front-door-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("product copy rejects front-door pay jargon", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      "What does it optimize for?\nunder-leveling cues\ndoes not optimize for application volume\n",
    );
    writeFixtureFile(root, "ROADMAP.md", "under-anchoring guidance\n");
    writeFixtureFile(
      root,
      "src/features/salary/SalarySearchCard.tsx",
      "role is under-leveled\n",
    );
    writeFixtureFile(
      root,
      "docs/features/pay-protection.md",
      "offer may be under-leveled\n",
    );
    writeFixtureFile(root, "docs/research/pay-equity.md", "under-leveling\n");
    writeFixtureFile(root, "docs/features/hiring-trends.md", "spot under-leveling\n");
    writeFixtureFile(
      root,
      "docs/features/resume-matcher.md",
      "Notice under-leveled roles\n",
    );
    writeFixtureFile(
      root,
      "docs/harness/readme-information-design.md",
      "optimization target\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "ROADMAP.md"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/features/salary/SalarySearchCard.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/pay-protection.md"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/research/pay-equity.md"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/hiring-trends.md"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/resume-matcher.md"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/harness/readme-information-design.md"),
      true,
    );
  });
});

test("product copy rejects front-door ATS jargon", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      "ATS transparency\nofficial ATS postings\npublic ATS postings\n",
    );
    writeFixtureFile(
      root,
      "ROADMAP.md",
      "Company-site and ATS verification\nATS pages\n",
    );
    writeFixtureFile(
      root,
      "RESPONSIBLE_AI.md",
      "ATS-readable application clarity\nManipulate ATS systems\n",
    );
    writeFixtureFile(
      root,
      "docs/harness/readme-information-design.md",
      "ATS transparency\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "ROADMAP.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "RESPONSIBLE_AI.md"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/harness/readme-information-design.md"),
      true,
    );
  });
});
