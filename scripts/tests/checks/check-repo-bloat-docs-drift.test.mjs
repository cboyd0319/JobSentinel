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
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-docs-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects top-level active doc stale markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/browser-import.md",
      ["# Browser Bookmarklet Integration", "", "**Version:** 2.6+", "**Status:** Ready", ""].join(
        "\n",
      ),
    );
    writeFixtureFile(
      root,
      "docs/developer/LOCAL_SEMANTIC_MATCHING.md",
      [
        "# Embedded ML Feature",
        "",
        "**Status:** Optional feature",
        "**Version:** 2.7+",
        "**Model:** all-MiniLM-L6-v2",
        "",
        "### With ML support (default build)",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/TESTING.md",
      "# Testing Guide\n\nComplete guide to testing in JobSentinel v2.6.4\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/FRONTEND_TESTING.md",
      "# Frontend Testing Guide\n\nComplete guide to testing React components in JobSentinel v2.6.4\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/browser-import.md",
        "docs/developer/LOCAL_SEMANTIC_MATCHING.md",
        "docs/developer/TESTING.md",
        "docs/developer/FRONTEND_TESTING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace top-level active doc stale markers: docs/features/browser-import.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace top-level active doc stale markers: docs/developer/LOCAL_SEMANTIC_MATCHING.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace top-level active doc stale markers: docs/developer/TESTING.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace top-level active doc stale markers: docs/developer/FRONTEND_TESTING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects top-level active doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/LOCAL_SEMANTIC_MATCHING.md",
      ["crates/jobsentinel-local-ai/src/", "├── mod.rs", "└── tests.rs", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/LOCAL_SEMANTIC_MATCHING_QUICKSTART.md",
      ["<span>✓ ML Ready</span>", "console.log('✓ match')", ""].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/developer/LOCAL_SEMANTIC_MATCHING.md", "docs/developer/LOCAL_SEMANTIC_MATCHING_QUICKSTART.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace top-level active doc glyph markers: docs/developer/LOCAL_SEMANTIC_MATCHING.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace top-level active doc glyph markers: docs/developer/LOCAL_SEMANTIC_MATCHING_QUICKSTART.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsupported Vitest grep docs", () => {
  withGitFixture((root) => {
    const unsupportedVitestFilterFlag = ["--", "grep"].join("");

    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/FRONTEND_TESTING.md",
      [
        "## Running Tests",
        "",
        "```bash",
        `npm test -- ${unsupportedVitestFilterFlag} "GhostIndicator"`,
        "```",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/developer/FRONTEND_TESTING.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace stale test-quality doc guidance: docs/developer/FRONTEND_TESTING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale E2E wait guidance", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "tests/e2e/README.md",
      [
        "### Waiting Strategies",
        "",
        '- `waitForLoadState("networkidle")` - Wait for network requests',
        "- `waitForTimeout(ms)` - Wait for animations/transitions",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "tests/e2e/README.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace stale E2E wait guidance: tests/e2e/README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects fixed waits in active E2E runtime files", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "tests/e2e/playwright/page-objects/BasePage.ts",
      "export async function wait(page) { await page.waitForTimeout(500); }\n",
    );
    writeFixtureFile(
      root,
      "tests/e2e/playwright/app.spec.ts",
      'await page.waitForLoadState("networkidle");\n',
    );
    writeFixtureFile(
      root,
      "tests/e2e/playwright/screenshots.spec.ts",
      "await page.waitForTimeout(1000);\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "tests/e2e/playwright/page-objects/BasePage.ts",
        "tests/e2e/playwright/app.spec.ts",
        "tests/e2e/playwright/screenshots.spec.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace fixed E2E runtime wait: tests/e2e/playwright/page-objects/BasePage.ts",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace fixed E2E runtime wait: tests/e2e/playwright/app.spec.ts"),
      violations.join("\n"),
    );
    assert.ok(
      !violations.includes(
        "replace fixed E2E runtime wait: tests/e2e/playwright/screenshots.spec.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unreferenced E2E test helpers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "tests/e2e/playwright/test-helpers.ts",
      "export async function waitForAnimation(page) { await page.waitForTimeout(300); }\n",
    );
    writeFixtureFile(root, "tests/e2e/playwright/app.spec.ts", "import { test } from '@playwright/test';\n");

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "tests/e2e/playwright/test-helpers.ts",
        "tests/e2e/playwright/app.spec.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove unreferenced E2E test helper: tests/e2e/playwright/test-helpers.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale getting started tooling docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      [
        "# Getting Started",
        "",
        "cargo install tauri-cli@2.1",
        "",
        "| **Tauri 2.1** | Desktop app framework |",
        "",
        "# Frontend tests",
        "npm test",
        "",
        "# Lint Rust code",
        "cargo clippy",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/developer/GETTING_STARTED.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync getting-started tooling docs: docs/developer/GETTING_STARTED.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale macOS developer docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/MACOS_DEVELOPMENT.md",
      [
        "# macOS Development",
        "",
        "**Output:** `target/release/bundle/dmg/JobSentinel_1.0.0_aarch64.dmg`",
        "",
        "### Currently Implemented ✅",
        "",
        "- ✅ Application Support directory",
        "- 🟡 Code signing for distribution",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/developer/MACOS_DEVELOPMENT.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync macOS developer docs: docs/developer/MACOS_DEVELOPMENT.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale SQLite configuration docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/sqlite-configuration.md",
      [
        "# SQLite Maximum Protection & Performance Configuration",
        "",
        "> **Status:** ✅ Fully Implemented",
        "> **Last Reviewed:** 2026-05-21",
        "",
        "- **Estimated Performance Gain:** 200-300% for read-heavy workloads",
        "",
        "| `cache_size` | **-64000** (64MB) | In-memory page cache |",
        "",
        "- [ ] **Cloud backup sync** (optional S3/GCS upload)",
        "",
        "- [ ] Cache size set (`PRAGMA cache_size` returns -64000)",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/developer/sqlite-configuration.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync SQLite configuration doc: docs/developer/sqlite-configuration.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects speculative cloud deployment docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "## Cloud Architecture (not implemented)\n\nCloud Backend (GCP/AWS)\n\nCore can run on any OS or in the cloud.\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      "src-tauri/src/cloud/ # GCP/AWS deployment\n",
    );
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      "- GCP Cloud Run / AWS Lambda deployment\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/developer/ARCHITECTURE.md",
        "docs/developer/GETTING_STARTED.md",
        "docs/ROADMAP.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove speculative cloud deployment doc: docs/developer/ARCHITECTURE.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove speculative cloud deployment doc: docs/developer/GETTING_STARTED.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("remove speculative cloud deployment doc: docs/ROADMAP.md"),
      violations.join("\n"),
    );
  });
});
