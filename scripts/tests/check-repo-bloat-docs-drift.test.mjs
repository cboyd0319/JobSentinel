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
      ["src-tauri/src/core/ml/", "├── mod.rs", "└── tests.rs", ""].join("\n"),
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
        "**Output:** `src-tauri/target/release/bundle/dmg/JobSentinel_1.0.0_aarch64.dmg`",
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

test("checkRepoBloat rejects Storybook addons without package ownership", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "package.json",
      JSON.stringify(
        {
          devDependencies: {
            "@storybook/addon-docs": "^10.2.19",
            "@storybook/react-vite": "^10.2.19",
            storybook: "^10.2.19",
          },
        },
        null,
        2,
      ),
    );
    writeFixtureFile(
      root,
      ".storybook/main.ts",
      [
        "export default {",
        '  "addons": ["@storybook/addon-docs", "@chromatic-com/storybook"],',
        '  "framework": "@storybook/react-vite"',
        "};",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", ".storybook/main.ts"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove Storybook addon without package ownership: .storybook/main.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale shipped-feature roadmap statuses", () => {
  withGitFixture((root) => {
    const plannedStatusIcon = String.fromCodePoint(0x1f532);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      [
        "- **Implementation:** `src-tauri/src/core/import/` module (planned)",
        `3. ${plannedStatusIcon} Universal Job Importer with Schema.org parsing`,
        `4. ${plannedStatusIcon} Deep Link Generator for 15+ sites`,
        `5. ${plannedStatusIcon} Bookmarklet generator`,
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/ROADMAP.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove stale shipped-feature status doc: docs/ROADMAP.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects roadmap status emoji", () => {
  withGitFixture((root) => {
    const doneStatusIcon = String.fromCodePoint(0x2705);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "docs/ROADMAP.md", `| Feature | ${doneStatusIcon} Done |\n`);

    execFileSync("git", ["add", "package.json", "docs/ROADMAP.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace roadmap status emoji with text: docs/ROADMAP.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects roadmap version drift markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      [
        "**Last Updated:** May 20, 2026",
        "## Current Version: 2.6.4",
        "### v2.7+ Planned / Unreleased Features",
        "| Linux support | Done | - | v2.7.0 - Ubuntu 20.04+ compatibility |",
        "4. Done - Deep Link Generator for 19+ sites (v2.6+)",
        "### Frontend Architecture (v2.6+)",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/ROADMAP.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace roadmap version drift markers: docs/ROADMAP.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects front-door docs stale footer", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "docs/README.md", "**Last Updated:** 2026-05-20\n");

    execFileSync("git", ["add", "package.json", "docs/README.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace front-door doc stale footer: docs/README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects docs README release-log shape", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/README.md",
      [
        "## Current Status",
        "**Release version:** 2.6.4",
        "**Unreleased work implemented on main:** Beta feedback",
        "### What's New in v2.6.4",
        "### Backend Modules (190 registered Tauri commands)",
        "### Planned / Unreleased Features",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/README.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace docs README release-log shape: docs/README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale informal maintainer footers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/ERROR_HANDLING.md",
      "**Maintained By**: The Rust Mac Overlord 🦀\n",
    );

    execFileSync("git", ["add", "package.json", "docs/developer/ERROR_HANDLING.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace stale informal maintainer footer: docs/developer/ERROR_HANDLING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale docs tree claims", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      "│   ├── migrations/          # 4 SQLite migrations\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/INTEGRATION_TESTING.md",
      "└── fixtures/                          # Test HTML/JSON responses\n\nTest HTML responses stored in `fixtures/`:\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/developer/GETTING_STARTED.md",
        "docs/developer/INTEGRATION_TESTING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale hardcoded migration count: docs/developer/GETTING_STARTED.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove stale integration fixture directory claim: docs/developer/INTEGRATION_TESTING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale scheduler refactor docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "`workers/scraper.rs` - Scraper worker threads\n`workers/notifier.rs` - Notification worker\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      "**v1.5 Refactoring Priority**\n\n`db/mod.rs` | 4442 | CRITICAL - needs modularization\n",
    );
    writeFixtureFile(
      root,
      "docs/security/KEYRING.md",
      "Used by: notify/mod.rs, scheduler/scrapers.rs\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/developer/ARCHITECTURE.md",
        "docs/developer/GETTING_STARTED.md",
        "docs/security/KEYRING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale scheduler worker path docs: docs/developer/ARCHITECTURE.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove stale refactoring-priority table: docs/developer/GETTING_STARTED.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("remove stale scheduler scraper path docs: docs/security/KEYRING.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale scrape_all error-handling docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/ERROR_HANDLING.md",
      "let jobs = self.scrape_all().await?;\n",
    );

    execFileSync("git", ["add", "package.json", "docs/developer/ERROR_HANDLING.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale scrape_all error-handling doc: docs/developer/ERROR_HANDLING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale Linux platform stub markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/platforms/linux/mod.rs",
      [
        "//! Linux-Specific Implementation (v2.0 - Coming Soon)",
        "//! This module will contain Linux-specific code for JobSentinel v2.0.",
        "tracing::info!(\"Linux platform initialized (v2.0 - limited functionality)\");",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/platforms/linux/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace stale Linux platform stub markers: src-tauri/src/platforms/linux/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale user-data export roadmap claims", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      [
        "- **Export anytime** - You can export your data as JSON (feature coming in v1.5)",
        "Consider creating a backup first (feature coming in v1.5).",
        "**v1.5 (Q1 2026):**",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/user-data-management.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale user-data export roadmap claim: docs/features/user-data-management.md",
      ),
      violations.join("\n"),
    );
  });
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
      "src-tauri/deny.toml",
      [
        "[advisories]",
        "ignore = [",
        '  "RUSTSEC-2025-0057", # fxhash',
        "]",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/deny.toml"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove stale cargo-deny advisory ignore: src-tauri/deny.toml"),
      violations.join("\n"),
    );
  });
});
