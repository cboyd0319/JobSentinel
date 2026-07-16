import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../../checks/repo-bloat.mjs";
import { oversizedLine, writeCanonicalFileSizePolicy } from "./repo-bloat-file-size-fixtures.mjs";
function writeFixtureFile(root,path,content="") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}
function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "js-bloat-"));
  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
function lineFixture(count) {
  return Array.from(
    { length: count },
    (_, index) => `const fixtureLine${index} = ${index};`,
  ).join("\n");
}
test("checkRepoBloat rejects new oversized maintainable source files", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeCanonicalFileSizePolicy(root);
    writeFixtureFile(root, "src/pages/Oversized.tsx", lineFixture(501));
    execFileSync("git", ["add", "package.json", "src/pages/Oversized.tsx"], {
      cwd: root,
    });
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(
        oversizedLine("src/pages/Oversized.tsx"),
      ),
      violations.join("\n"),
    );
  });
});
test("checkRepoBloat requires the canonical file-size owners in the JobSentinel repo", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", '{ "name": "jobsentinel" }\n');
    execFileSync("git", ["add", "package.json"], {
      cwd: root,
    });
    const violations = checkRepoBloat(root);
    assert.ok(violations.includes("add canonical structure policy: repository-structure-policy.json"));
    assert.ok(violations.includes("add file-coverage projection: validation/file_size_contract.json"));
  });
});
test("checkRepoBloat rejects formerly grandfathered oversized files at the hard cap", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeCanonicalFileSizePolicy(root);
    writeFixtureFile(
      root,
      "src/features/resumes/builder/ResumeBuilderPage.tsx",
      lineFixture(501),
    );
    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/features/resumes/builder/ResumeBuilderPage.tsx",
      ],
      {
        cwd: root,
      },
    );
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(
        oversizedLine("src/features/resumes/builder/ResumeBuilderPage.tsx"),
      ),
      violations.join("\n"),
    );
  });
});
test("checkRepoBloat applies the production cap to shared taxonomy source", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeCanonicalFileSizePolicy(root);
    writeFixtureFile(
      root,
      "src/shared/careerProfileTaxonomy.ts",
      lineFixture(501),
    );
    execFileSync(
      "git",
      ["add", "package.json", "src/shared/careerProfileTaxonomy.ts"],
      {
        cwd: root,
      },
    );
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(
        oversizedLine("src/shared/careerProfileTaxonomy.ts"),
      ),
      violations.join("\n"),
    );
  });
});
test("applies the Rust source cap under workspace crates", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeCanonicalFileSizePolicy(root);
    writeFixtureFile(
      root,
      "crates/jobsentinel-domain/src/lib.rs",
      lineFixture(501),
    );
    execFileSync(
      "git",
      ["add", "package.json", "crates/jobsentinel-domain/src/lib.rs"],
      { cwd: root },
    );
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(
        oversizedLine("crates/jobsentinel-domain/src/lib.rs"),
      ),
      violations.join("\n"),
    );
  });
});
test("checkRepoBloat rejects reserved E2E fixture placeholders", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "tests/e2e/fixtures/.gitkeep");
    writeFixtureFile(
      root,
      "tests/e2e/fixtures/README.md",
      "This directory is reserved for future tests.\n",
    );
    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "tests/e2e/fixtures/.gitkeep",
        "tests/e2e/fixtures/README.md",
      ],
      { cwd: root },
    );
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(
        "remove tracked generated or disposable file: tests/e2e/fixtures/.gitkeep",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove tracked generated or disposable file: tests/e2e/fixtures/README.md",
      ),
      violations.join("\n"),
    );
  });
});
test("checkRepoBloat rejects tracked gitkeep placeholders", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "docs/plans/active/.gitkeep");
    writeFixtureFile(
      root,
      "docs/plans/active/current-plan.md",
      "# Current Plan\n",
    );
    writeFixtureFile(root, "docs/plans/completed/.gitkeep");
    writeFixtureFile(
      root,
      "docs/plans/completed/done-plan.md",
      "# Done Plan\n",
    );
    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/plans/active/.gitkeep",
        "docs/plans/active/current-plan.md",
        "docs/plans/completed/.gitkeep",
        "docs/plans/completed/done-plan.md",
      ],
      { cwd: root },
    );
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(
        "remove tracked generated or disposable file: docs/plans/active/.gitkeep",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove tracked generated or disposable file: docs/plans/completed/.gitkeep",
      ),
      violations.join("\n"),
    );
  });
});
test("checkRepoBloat rejects one-off implementation report docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/intel-mac-support.md",
      "# Intel Mac Support - Universal Binary\n\nOne-off implementation report.\n",
    );
    execFileSync("git", ["add", "package.json", "docs/intel-mac-support.md"], {
      cwd: root,
    });
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(
        "remove tracked generated or disposable file: docs/intel-mac-support.md",
      ),
      violations.join("\n"),
    );
  });
});
test("checkRepoBloat rejects tracked source-tree markdown notes", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/settings/README.md",
      "# Component Notes\n",
    );
    writeFixtureFile(root, "src/hooks/USAGE.md", "# Hook Usage\n");
    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/components/settings/README.md",
        "src/hooks/USAGE.md",
      ],
      { cwd: root },
    );
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(
        "remove tracked generated or disposable file: src/components/settings/README.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove tracked generated or disposable file: src/hooks/USAGE.md",
      ),
      violations.join("\n"),
    );
  });
});
test("checkRepoBloat rejects empty source directories", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    mkdirSync(join(root, "src/components/settings"), { recursive: true });
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(
        "remove local artifact: src/components/settings/ is an empty local directory",
      ),
      violations.join("\n"),
    );
  });
});
test("checkRepoBloat rejects unreferenced docs images", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "README.md",
      "![Dashboard](docs/images/dashboard.png)\n",
    );
    writeFixtureFile(root, "docs/images/dashboard.png", "used image fixture\n");
    writeFixtureFile(
      root,
      "docs/images/keyboard-shortcuts.png",
      "unused image fixture\n",
    );
    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "README.md",
        "docs/images/dashboard.png",
        "docs/images/keyboard-shortcuts.png",
      ],
      { cwd: root },
    );
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(
        "remove unreferenced docs image: docs/images/keyboard-shortcuts.png",
      ),
      violations.join("\n"),
    );
    assert.ok(
      !violations.includes(
        "remove unreferenced docs image: docs/images/dashboard.png",
      ),
      violations.join("\n"),
    );
  });
});
test("checkRepoBloat rejects duplicate docs screenshot targets", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "tests/e2e/playwright/screenshots.spec.ts",
      `
await page.screenshot({ path: screenshotPath(testInfo, "dashboard.png") });
await page.screenshot({ path: screenshotPath(testInfo, "dashboard.png") });
`,
    );
    execFileSync(
      "git",
      ["add", "package.json", "tests/e2e/playwright/screenshots.spec.ts"],
      {
        cwd: root,
      },
    );
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(
        "remove duplicate docs screenshot capture: tests/e2e/playwright/screenshots.spec.ts",
      ),
      violations.join("\n"),
    );
  });
});
test("checkRepoBloat requires README product definition", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      "# JobSentinel\n\nLocal job search app.\n",
    );
    execFileSync("git", ["add", "README.md"], { cwd: root });
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes("add required README product definition: README.md"),
      violations.join("\n"),
    );
  });
});
test("checkRepoBloat requires free-forever MIT wording", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      [
        "# JobSentinel",
        "",
        "JobSentinel is an open-source, local-first job-search assistant for finding real, relevant, fairly compensated work while keeping sensitive job-search data under user control.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/harness/README.md",
      "# Harness\n\nJobSentinel is for any job seeker.\n",
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "# Getting Started\n\nDownload the installer.\n",
    );
    execFileSync(
      "git",
      [
        "add",
        "README.md",
        "docs/harness/README.md",
        "docs/user/QUICK_START.md",
      ],
      { cwd: root },
    );
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes("add free-forever MIT wording: README.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "add free-forever MIT wording: docs/user/QUICK_START.md",
      ),
      violations.join("\n"),
    );
  });
});
test("checkRepoBloat requires grant-facing docs in the main repo", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", '{ "name": "jobsentinel" }\n');
    execFileSync("git", ["add", "package.json"], { cwd: root });
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes("add required grant-facing doc: PRIVACY.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("add required grant-facing doc: RESPONSIBLE_AI.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "add required grant-facing doc: docs/research/pay-equity.md",
      ),
      violations.join("\n"),
    );
  });
});
