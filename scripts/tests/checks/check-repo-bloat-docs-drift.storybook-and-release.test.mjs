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
        "- **Implementation:** `crates/jobsentinel-core/src/core/import/` module (planned)",
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
      "crates/jobsentinel-platform/src/linux/mod.rs",
      [
        "//! Linux-Specific Implementation (v2.0 - Coming Soon)",
        "//! This module will contain Linux-specific code for JobSentinel v2.0.",
        "tracing::info!(\"Linux platform initialized (v2.0 - limited functionality)\");",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "crates/jobsentinel-platform/src/linux/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace stale Linux platform stub markers: crates/jobsentinel-platform/src/linux/mod.rs",
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
