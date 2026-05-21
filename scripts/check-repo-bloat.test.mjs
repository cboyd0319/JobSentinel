import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "./check-repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

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
      ["add", "package.json", "tests/e2e/fixtures/.gitkeep", "tests/e2e/fixtures/README.md"],
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
    writeFixtureFile(root, "docs/plans/active/current-plan.md", "# Current Plan\n");
    writeFixtureFile(root, "docs/plans/completed/.gitkeep");
    writeFixtureFile(root, "docs/plans/completed/done-plan.md", "# Done Plan\n");

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

test("checkRepoBloat rejects tracked source-tree markdown notes", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "src/components/settings/README.md", "# Component Notes\n");
    writeFixtureFile(root, "src/hooks/USAGE.md", "# Hook Usage\n");

    execFileSync(
      "git",
      ["add", "package.json", "src/components/settings/README.md", "src/hooks/USAGE.md"],
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
      violations.includes("remove tracked generated or disposable file: src/hooks/USAGE.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unreferenced settings helper components", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/settings/FilterListInput.tsx",
      "export function FilterListInput() { return null; }\n",
    );
    writeFixtureFile(
      root,
      "src/components/settings/FilterListInput.test.tsx",
      "import { FilterListInput } from './FilterListInput';\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/components/settings/FilterListInput.tsx",
        "src/components/settings/FilterListInput.test.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove unreferenced settings helper component: src/components/settings/FilterListInput.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unreferenced hook modules", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/hooks/useModal.ts",
      "export function useModal() { return { isOpen: false }; }\n",
    );
    writeFixtureFile(root, "src/hooks/useModal.test.ts", "import { useModal } from './useModal';\n");
    writeFixtureFile(root, "src/hooks/index.ts", "export { useModal } from './useModal';\n");

    execFileSync(
      "git",
      ["add", "package.json", "src/hooks/useModal.ts", "src/hooks/useModal.test.ts", "src/hooks/index.ts"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove unreferenced hook module: src/hooks/useModal.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unreferenced cache strategy helpers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/cacheStrategies.ts",
      "export function staleWhileRevalidate() { return undefined; }\n",
    );

    execFileSync("git", ["add", "package.json", "src/utils/cacheStrategies.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove unreferenced source helper: src/utils/cacheStrategies.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects redundant direct Playwright dependency", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "package.json",
      JSON.stringify(
        {
          devDependencies: {
            "@playwright/test": "^1.58.2",
            playwright: "^1.57.0",
          },
        },
        null,
        2,
      ),
    );

    execFileSync("git", ["add", "package.json"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove redundant direct Playwright dependency: package.json"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects redundant DOMPurify stub types", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "package.json",
      JSON.stringify(
        {
          dependencies: {
            "@types/dompurify": "^3.2.0",
            dompurify: "^3.3.3",
          },
        },
        null,
        2,
      ),
    );

    execFileSync("git", ["add", "package.json"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove redundant DOMPurify stub types dependency: package.json"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale E2E runtime skip guidance", () => {
  withGitFixture((root) => {
    const runtimeSkipCall = ["test", "skip"].join(".");

    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "tests/e2e/README.md",
      [
        "## Test Patterns",
        "",
        "```typescript",
        `${runtimeSkipCall}(browserName === "webkit", "Documented platform gap");`,
        "```",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "tests/e2e/README.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace stale test-quality doc guidance: tests/e2e/README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects focused-test commit guidance", () => {
  withGitFixture((root) => {
    const focusedTestCall = ["it", "only"].join(".");

    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/FRONTEND_TESTING.md",
      [
        "## Debugging Failed Tests",
        "",
        "```typescript",
        `${focusedTestCall}("should test this one thing", () => {});`,
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

test("checkRepoBloat rejects overbroad localStorage migration claims", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      "- Backend persistence for all user data (localStorage → SQLite)\n",
    );

    execFileSync("git", ["add", "package.json", "docs/ROADMAP.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace overbroad localStorage migration claim: docs/ROADMAP.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects Deep Links doc emoji and version promises", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/user/DEEP_LINKS.md",
      [
        "These are clearly marked with a 🔐 icon.",
        "| **Legal** | ✅ Always | ⚠️ Site-dependent |",
        "- **Saved Searches** (coming in v2.7) - Save favorite deep link searches",
        "Not yet, but planned for v2.7.",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/user/DEEP_LINKS.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace Deep Links doc emoji/version promises: docs/user/DEEP_LINKS.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects Quick Start doc emoji markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      [
        "- ✅ **Remote** - Work from anywhere",
        "### Resume Builder 📄",
        "- 🚀 **Speed up applications** with One-Click Apply",
        "**Happy job hunting!** 🎯",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/user/QUICK_START.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace Quick Start doc emoji markers: docs/user/QUICK_START.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects front-door doc emoji markers", () => {
  withGitFixture((root) => {
    const chartIcon = String.fromCodePoint(0x1f4ca);
    const rocketIcon = String.fromCodePoint(0x1f680);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "README.md", `# JobSentinel ${rocketIcon}\n`);
    writeFixtureFile(root, "docs/README.md", `### What's New in v2.5 ${chartIcon}\n`);

    execFileSync("git", ["add", "package.json", "README.md", "docs/README.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace front-door doc emoji markers: README.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace front-door doc emoji markers: docs/README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects scraper doc emoji markers", () => {
  withGitFixture((root) => {
    const doneIcon = String.fromCodePoint(0x2705);
    const warningIcon = String.fromCodePoint(0x26a0, 0xfe0f);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/scrapers.md",
      [
        `| LinkedIn | ${doneIcon} Production |`,
        `- ${warningIcon} User responsibility: comply with site terms`,
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/scrapers.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace scraper doc emoji markers: docs/features/scrapers.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects scraper health doc emoji markers", () => {
  withGitFixture((root) => {
    const greenIcon = String.fromCodePoint(0x1f7e2);
    const testIcon = String.fromCodePoint(0x1f9ea);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/scraper-health.md",
      [
        `LinkedIn ${greenIcon} Healthy`,
        `Click **${testIcon} Test** button`,
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/scraper-health.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace scraper health doc emoji markers: docs/features/scraper-health.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects feature status color emoji markers", () => {
  withGitFixture((root) => {
    const yellowIcon = String.fromCodePoint(0x1f7e1);
    const redIcon = String.fromCodePoint(0x1f534);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/ghost-detection.md",
      [
        `- ${yellowIcon} **Yellow** - Minor concerns`,
        `- ${redIcon} **Red** - Probably fake`,
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/resume-builder.md",
      [
        `- ${yellowIcon} **60-79** - Good, but could be better`,
        `- ${redIcon} **0-39** - Major issues`,
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/features/ghost-detection.md", "docs/features/resume-builder.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace feature status color emoji markers: docs/features/ghost-detection.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace feature status color emoji markers: docs/features/resume-builder.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects Market Intelligence doc emoji markers", () => {
  withGitFixture((root) => {
    const chartIcon = String.fromCodePoint(0x1f4c8);
    const moneyIcon = String.fromCodePoint(0x1f4b0);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/market-intelligence.md",
      [
        `## ${chartIcon} Overview`,
        `- **${moneyIcon} Salary Trends** - Monitor salary changes`,
        "pub fn severity_emoji(&self) -> &str;",
        "pub fn sentiment_emoji(&self) -> &str;",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/market-intelligence.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace Market Intelligence doc emoji/stale indicator markers: docs/features/market-intelligence.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects Resume Matcher and Salary AI feature doc emoji markers", () => {
  withGitFixture((root) => {
    const targetIcon = String.fromCodePoint(0x1f3af);
    const chartIcon = String.fromCodePoint(0x1f4ca);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/resume-matcher.md",
      [`## ${targetIcon} Overview`, `- **${chartIcon} Gap Analysis**`, ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/salary-ai.md",
      [`## ${targetIcon} Overview`, `- **${chartIcon} Salary Benchmarks**`, ""].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/features/resume-matcher.md", "docs/features/salary-ai.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace resume and salary feature doc emoji markers: docs/features/resume-matcher.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace resume and salary feature doc emoji markers: docs/features/salary-ai.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale Salary AI future UI claim", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/salary-ai.md",
      ["### Phase 2-4: Future", "", "- [ ] UI components", ""].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/salary-ai.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove stale Salary AI future UI claim: docs/features/salary-ai.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale application tracking doc claims", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/application-tracking.md",
      [
        "## 🎨 UI Integration (Future)",
        "// src/pages/ApplicationTracker.tsx",
        "const kanban = await invoke<ApplicationsByStatus>('get_applications_by_status');",
        "- [ ] Tauri commands",
        "- [ ] UI components (Kanban board)",
        "**Next Feature:** UI Connections & Polish (v1.4 E4)",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/application-tracking.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale application tracking doc claims: docs/features/application-tracking.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale smart scoring salary marker claims", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      [
        "Predicted salaries are marked with a 🤖 icon.",
        "**Implementation Status:** ✅ Complete (All features implemented)",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/smart-scoring.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale smart-scoring salary marker claim: docs/features/smart-scoring.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw private query logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/jobs.rs",
      'tracing::info!("Command: search_jobs_query (query: {}, limit: {})", query, limit);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/automation.rs",
      'tracing::info!("Command: find_answer_for_question (question: {})", question);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/queries.rs",
      'tracing::debug!("Performing full-text search with query: \'{}\'", query);\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/jobs.rs",
        "src-tauri/src/commands/automation.rs",
        "src-tauri/src/core/db/queries.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw private query logging: src-tauri/src/commands/jobs.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw private query logging: src-tauri/src/commands/automation.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw private query logging: src-tauri/src/core/db/queries.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw scraper URL and query logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/cache.rs",
      'tracing::debug!("Cache HIT for URL: {}", url);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/http_client.rs",
      'tracing::debug!("Cache miss, fetching: {}", url);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/dice.rs",
      'tracing::info!("Fetching jobs from Dice for query: {}", self.query);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/linkedin.rs",
      "#[tracing::instrument(skip(self), fields(query = %self.query, location = %self.location))]\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/jobswithgpt.rs",
      'tracing::debug!("MCP request: {}", request);\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/scrapers/cache.rs",
        "src-tauri/src/core/scrapers/http_client.rs",
        "src-tauri/src/core/scrapers/dice.rs",
        "src-tauri/src/core/scrapers/linkedin.rs",
        "src-tauri/src/core/scrapers/jobswithgpt.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw scraper URL/query logging: src-tauri/src/core/scrapers/cache.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw scraper URL/query logging: src-tauri/src/core/scrapers/http_client.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw scraper URL/query logging: src-tauri/src/core/scrapers/dice.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw scraper URL/query logging: src-tauri/src/core/scrapers/linkedin.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw scraper URL/query logging: src-tauri/src/core/scrapers/jobswithgpt.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw local path logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/resume.rs",
      'tracing::info!("Command: upload_resume (name: {}, path: {})", name, file_path);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/automation/form_filler.rs",
      'tracing::debug!(resume_path = %resume_path.display(), "Uploading resume");\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/connection.rs",
      'tracing::info!("Pre-migration backup created: {}", backup_path.display());\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/resume.rs",
        "src-tauri/src/core/automation/form_filler.rs",
        "src-tauri/src/core/db/connection.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw local path logging: src-tauri/src/commands/resume.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw local path logging: src-tauri/src/core/automation/form_filler.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw local path logging: src-tauri/src/core/db/connection.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw URL logging outside approved sanitizers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/url_utils.rs",
      'tracing::warn!("Failed to parse URL for normalization: {}", url_str);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/automation/browser/manager.rs",
      "#[tracing::instrument(skip(self), fields(url = %url), level = \"info\")]\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/linkedin_auth.rs",
      'tracing::debug!("LinkedIn navigation: {}", url_str);\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/scrapers/url_utils.rs",
        "src-tauri/src/core/automation/browser/manager.rs",
        "src-tauri/src/commands/linkedin_auth.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw URL logging: src-tauri/src/core/scrapers/url_utils.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw URL logging: src-tauri/src/core/automation/browser/manager.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw URL logging: src-tauri/src/commands/linkedin_auth.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw job import logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/import.rs",
      [
        '#[tracing::instrument(skip(state), fields(url), level = "info")]',
        "pub async fn preview_job_import(url: String) {}",
        'tracing::info!(title = %preview.title, company = %preview.company, "Import preview created");',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/import.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw job import logging: src-tauri/src/commands/import.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw job import success metadata", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/import.rs",
      'tracing::info!(job_id = job_id, title = %title, company = %company, "Job imported successfully");\n',
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/import.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw job import logging: src-tauri/src/commands/import.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw automation screening question logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/automation/form_filler.rs",
      [
        'tracing::debug!("Filled screening question \'{}\' with answer", question_text);',
        'tracing::debug!("Selected screening answer for \'{}\'", question_text);',
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src-tauri/src/core/automation/form_filler.rs"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw automation screening question logging: src-tauri/src/core/automation/form_filler.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw notification job title logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/notify/mod.rs",
      [
        'tracing::info!("Sent Slack notification for: {}", notification.job.title);',
        'tracing::info!("Sent Teams notification for: {}", notification.job.title);',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/notify/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw notification job title logging: src-tauri/src/core/notify/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw URL error display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/automation/error.rs",
      [
        "#[derive(thiserror::Error, Debug)]",
        "pub enum AutomationError {",
        '    #[error("Failed to navigate to {url}: {reason}")]',
        "    Navigation { url: String, reason: String },",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/automation/error.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw URL error display: src-tauri/src/core/automation/error.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw path or query error display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/error.rs",
      [
        "#[derive(thiserror::Error, Debug)]",
        "pub enum DatabaseError {",
        '    #[error("Database query timed out after {timeout_secs}s: {query}")]',
        "    Timeout { timeout_secs: u64, query: String },",
        '    #[error("Backup failed at {path}: {source}")]',
        "    Backup { path: String, source: std::io::Error },",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/db/error.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw path/query error display: src-tauri/src/core/db/error.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw import redirect display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/import/types.rs",
      [
        "#[derive(thiserror::Error, Debug)]",
        "pub enum ImportError {",
        '    #[error("Redirect blocked while fetching URL: {location}")]',
        "    RedirectBlocked { location: String },",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/import/types.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw import redirect display: src-tauri/src/core/import/types.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw bookmarklet import metadata logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/bookmarklet/server.rs",
      [
        "tracing::info!(",
        "    title = %title,",
        "    company = %company,",
        '    "Job imported from bookmarklet"',
        ");",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/bookmarklet/server.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw bookmarklet import metadata logging: src-tauri/src/core/bookmarklet/server.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects manual bookmarklet JSON error responses", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/bookmarklet/server.rs",
      [
        'format!(r#"{{"error":"{}"}}"#, e),',
        'format!(r#"{{"error":"Failed to import job: {}"}}"#, e),',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/bookmarklet/server.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace manual bookmarklet JSON error responses: src-tauri/src/core/bookmarklet/server.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unauthenticated bookmarklet imports", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/bookmarklet/server.rs",
      [
        'if request.starts_with("POST /api/bookmarklet/import") {',
        "    handle_import_request(&request, database).await",
        "} else if request.starts_with(\"OPTIONS\") {",
        '    ("OK".to_string(), "text/plain".to_string())',
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/bookmarklet/server.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "require bookmarklet import auth token: src-tauri/src/core/bookmarklet/server.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects bookmarklet code without auth header", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/BookmarkletGenerator.tsx",
      [
        "export function code() {",
        "  return `fetch('http://localhost:4321/api/bookmarklet/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(job)})`;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/components/BookmarkletGenerator.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "include bookmarklet auth token header: src/components/BookmarkletGenerator.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsanitized frontend error report storage", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/errorReporting.ts",
      [
        "class ErrorReporter {",
        "  private errors = [];",
        "  capture(report) {",
        "    this.errors.unshift(report);",
        "    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.errors));",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/utils/errorReporting.ts"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize frontend error report storage: src/utils/errorReporting.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale frontend webhook redaction patterns", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/errorReporting.ts",
      [
        "const WEBHOOK_PATTERN = /https:\\/\\/(?:hooks\\.slack\\.com\\/services|discord\\.com\\/api\\/webhooks|outlook\\.office\\.com\\/webhook)[^\\s]*/gi;",
        "function sanitizeStoredReport(report) { return report; }",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/utils/errorReporting.ts"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize frontend error report storage: src/utils/errorReporting.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat accepts current frontend webhook redaction patterns", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/errorReporting.ts",
      [
        "const WEBHOOK_PATTERN = /https:\\/\\/(?:hooks\\.slack\\.com|discord(?:app)?\\.com\\/api\\/webhooks|outlook\\.office(?:365)?\\.com\\/webhook)[^\\s]*/gi;",
        "function sanitizeStoredReport(report) { return report; }",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/utils/errorReporting.ts"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      !violations.includes("sanitize frontend error report storage: src/utils/errorReporting.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects notification webhook saves without validation", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      [
        "async function handleSave(credentials) {",
        "  await storeCredential(\"discord_webhook\", credentials.discord_webhook);",
        "  await storeCredential(\"teams_webhook\", credentials.teams_webhook);",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/pages/Settings.tsx"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "validate notification webhook settings before saving: src/pages/Settings.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale feedback webhook sanitizer patterns", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/sanitizer.rs",
      [
        "static WEBHOOK_REGEX: Lazy<Regex> = Lazy::new(|| {",
        "    Regex::new(r\"https://hooks\\.(slack|discord|teams)\\.com/[^\\s]+\")",
        "        .expect(\"Webhook URL regex pattern is valid and should compile\")",
        "});",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/feedback/sanitizer.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "redact provider webhook URLs in feedback sanitizer: src-tauri/src/commands/feedback/sanitizer.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale notification webhook docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/notifications.md",
      [
        "### URL Validation",
        "- **Slack:** Must start with `https://hooks.slack.com/services/`",
        "- **Discord:** Must start with `https://discord.com/api/webhooks/`",
        "- **Teams:** Must start with `https://outlook.office.com/webhook/`",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/notifications.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "document all notification webhook provider hosts: docs/features/notifications.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale notification preference docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      [
        'invoke("save_notification_preferences", {',
        "  per_source_settings: {",
        "    linkedin: { enabled: true, min_score: 0.9, include_ghosts: false },",
        "  },",
        "  keyword_rules: { include: ['Rust'] },",
        "  thresholds: { slack: 0.9 },",
        "});",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/user-data-management.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync notification preference docs with backend shape: docs/features/user-data-management.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsanitized structured feedback debug events", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/debug_log.rs",
      [
        "pub fn get_debug_log() -> Vec<TimestampedEvent> {",
        "    DEBUG_LOG",
        "        .read()",
        "        .map(|buffer| buffer.get_all())",
        "        .unwrap_or_default()",
        "}",
        "",
        "pub fn get_recent_events(n: usize) -> Vec<TimestampedEvent> {",
        "    DEBUG_LOG",
        "        .read()",
        "        .map(|buffer| buffer.get_recent(n))",
        "        .unwrap_or_default()",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/feedback/debug_log.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize structured feedback debug events: src-tauri/src/commands/feedback/debug_log.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsanitized feedback file saves", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/mod.rs",
      [
        "pub async fn save_feedback_file(content: String) -> Result<(), String> {",
        "    std::fs::write(&path, content).map_err(|e| format!(\"{e}\"))?;",
        "    Ok(())",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/feedback/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize feedback file content before saving: src-tauri/src/commands/feedback/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw user-data privacy logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/user_data.rs",
      [
        "pub async fn create_cover_letter_template(name: String) -> Result<(), String> {",
        "    tracing::info!(\"Command: create_cover_letter_template (name: {})\", name);",
        "    Ok(())",
        "}",
        "",
        "pub async fn create_saved_search(search: SavedSearch) -> Result<(), String> {",
        "    tracing::info!(\"Command: create_saved_search (name: {})\", search.name);",
        "    Ok(())",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/user_data/mod.rs",
      [
        "#[instrument(skip(self, content))]",
        "pub async fn create_template(&self, name: &str, content: &str) -> Result<(), Error> {",
        "    debug!(\"Creating template: {}\", name);",
        "    Ok(())",
        "}",
        "",
        "#[instrument(skip(self))]",
        "pub async fn create_saved_search(&self, search: SavedSearch) -> Result<(), Error> {",
        "    debug!(\"Creating saved search: {} ({})\", search.name, search.id);",
        "    Ok(())",
        "}",
        "",
        "#[instrument(skip(self))]",
        "pub async fn add_search_history(&self, query: &str) -> Result<(), Error> {",
        "    debug!(\"Adding search history: {}\", query);",
        "    Ok(())",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", [
      "add",
      "package.json",
      "src-tauri/src/commands/user_data.rs",
      "src-tauri/src/core/user_data/mod.rs",
    ], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw user-data privacy logging: src-tauri/src/commands/user_data.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw user-data privacy logging: src-tauri/src/core/user_data/mod.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale user-data mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'get_search_history':",
        "      return [];",
        "    case 'list_saved_searches':",
        "      return [];",
        "    case 'save_search':",
        "      return {};",
        "    case 'delete_saved_search':",
        "      return undefined;",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync user-data mock command handlers: src/mocks/handlers.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale deep-link mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'get_supported_sites':",
        "      return [];",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync deep-link mock command handlers: src/mocks/handlers.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale job-import mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'preview_job_import':",
        "      return {};",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync job-import mock command handlers: src/mocks/handlers.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale feedback mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'generate_feedback_report':",
        "      return '';",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync feedback mock command handlers: src/mocks/handlers.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale feedback system-info architecture field", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/services/feedbackService.ts",
      [
        "export interface SystemInfo {",
        "  arch: string;",
        "}",
        "export function formatDebugInfo(systemInfo: SystemInfo): string {",
        "  return `Architecture: ${systemInfo.arch}`;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/feedback/DebugInfoPreview.tsx",
      "export function DebugInfoPreview({ systemInfo }) { return systemInfo.arch; }\n",
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'get_system_info':",
        "      return { arch: 'wasm' };",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/services/feedbackService.ts",
        "src/components/feedback/DebugInfoPreview.tsx",
        "src/mocks/handlers.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync feedback system-info architecture field: src/services/feedbackService.ts",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync feedback system-info architecture field: src/components/feedback/DebugInfoPreview.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync feedback system-info architecture field: src/mocks/handlers.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale resume optimizer mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'analyze_resume_format':",
        "      return { issues: [], recommendations: [] };",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync resume optimizer mock command handlers: src/mocks/handlers.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale ATS keyword match frontend shape", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizer.tsx",
      [
        "interface KeywordMatch {",
        "  keyword: string;",
        "  found_in: string;",
        "  context: string;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/AtsLiveScorePanel.tsx",
      [
        "interface KeywordMatch {",
        "  keyword: string;",
        "  found_in: string;",
        "  context: string;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/pages/ResumeOptimizer.tsx",
        "src/components/AtsLiveScorePanel.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync ATS keyword match frontend shape: src/pages/ResumeOptimizer.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync ATS keyword match frontend shape: src/components/AtsLiveScorePanel.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects runtime frontend invokes missing dev mock cases", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/RuntimeInvoke.tsx",
      [
        "import { invoke } from '@tauri-apps/api/core';",
        "export async function load() {",
        "  return await invoke('missing_runtime_command');",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'known_command':",
        "      return undefined;",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/components/RuntimeInvoke.tsx", "src/mocks/handlers.ts"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync dev mock handlers for runtime invokes: src/mocks/handlers.ts missing missing_runtime_command",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale salary benchmark frontend shape", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/Salary.tsx",
      [
        "interface SalaryBenchmark {",
        "  role: string;",
        "  p50: number;",
        "  p90: number;",
        "}",
        "export function Salary({ benchmark }) {",
        "  return benchmark.role + benchmark.p90;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/pages/Salary.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync salary benchmark frontend shape: src/pages/Salary.tsx"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsupported salary seniority option values", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/Salary.tsx",
      [
        "const SENIORITY_LEVELS = [",
        '  { value: "executive", label: "Executive/Director" },',
        "];",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/pages/Salary.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync salary benchmark frontend shape: src/pages/Salary.tsx"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale interview follow-up frontend shape", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/InterviewScheduler.tsx",
      [
        "export function mapFollowup(result) {",
        "  return { thankYouSent: result.thank_you_sent, sentAt: result.sent_at };",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/components/InterviewScheduler.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync interview follow-up frontend shape: src/components/InterviewScheduler.tsx"),
      violations.join("\n"),
    );
  });
});
