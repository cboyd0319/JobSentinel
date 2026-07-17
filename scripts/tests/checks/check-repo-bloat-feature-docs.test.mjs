import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { checkRepoBloat } from "../../checks/repo-bloat.mjs";
import {
  createFixtureRunner,
  writeFixtureFile,
} from "../lib/filesystem-fixture.mjs";
const withGitFixture = createFixtureRunner(
  "jobsentinel-repo-bloat-feature-docs-",
  { git: true },
);
test("checkRepoBloat rejects localStorage migration claims", () => {
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
        "- 🚀 **Review applications** with Application Assist",
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

test("checkRepoBloat rejects active user doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/application-tracking.md",
      ["applications", "├── id (PRIMARY KEY)", "To Apply → Applied", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      "Only notify for jobs scoring ≥ threshold\n",
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Go to System Settings → Privacy & Security\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/application-tracking.md",
        "docs/features/user-data-management.md",
        "docs/user/QUICK_START.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace active user doc glyph markers: docs/features/application-tracking.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace active user doc glyph markers: docs/features/user-data-management.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace active user doc glyph markers: docs/user/QUICK_START.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects feature doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/ghost-detection.md",
      "Customize in Settings → Detection → Ghost Job Settings\n",
    );
    writeFixtureFile(
      root,
      "docs/features/json-resume-import.md",
      "\"beginner\" → Beginner\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/ghost-detection.md",
        "docs/features/json-resume-import.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace feature doc glyph markers: docs/features/ghost-detection.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace feature doc glyph markers: docs/features/json-resume-import.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects maintained doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "docs/README.md", ["docs/", "├── README.md", "└── images/", ""].join("\n"));
    writeFixtureFile(root, "docs/ROADMAP.md", "Resume → Builder Integration\n");
    writeFixtureFile(
      root,
      "docs/style-guide/GLOSSARY.md",
      "Go to System Settings → Privacy & Security\n",
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/README.md", "docs/ROADMAP.md", "docs/style-guide/GLOSSARY.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace maintained doc glyph markers: docs/README.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace maintained doc glyph markers: docs/ROADMAP.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace maintained doc glyph markers: docs/style-guide/GLOSSARY.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects developer layout doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      ["JobSentinel/", "├── src/", "└── vite.config.ts", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/FRONTEND_TESTING.md",
      ["src/", "├── components/", "└── test/", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/TESTING.md",
      ["src-tauri/", "├── src/", "└── tests/", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/INTEGRATION_TESTING.md",
      "Full pipelines - Scraper → Scorer → Database → Notifications\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/developer/FRONTEND_TESTING.md",
        "docs/developer/GETTING_STARTED.md",
        "docs/developer/TESTING.md",
        "docs/developer/INTEGRATION_TESTING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace developer layout doc glyph markers: docs/developer/FRONTEND_TESTING.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace developer layout doc glyph markers: docs/developer/GETTING_STARTED.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace developer layout doc glyph markers: docs/developer/TESTING.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace developer layout doc glyph markers: docs/developer/INTEGRATION_TESTING.md"),
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

test("checkRepoBloat rejects feature doc stale metadata blocks", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/ghost-detection.md",
      "**Version:** 2.6.4 | **Last Updated:** March 18, 2026\n",
    );
    writeFixtureFile(
      root,
      "docs/features/notifications.md",
      "**Version:** 2.6.4 | **Last Updated:** March 18, 2026\n",
    );
    writeFixtureFile(
      root,
      "docs/features/application-assist.md",
      "**Version:** 2.6.4 | **Last Updated:** March 18, 2026\n",
    );
    writeFixtureFile(
      root,
      "docs/features/resume-builder.md",
      "**Version:** 2.6.4 | **Last Updated:** March 18, 2026\n",
    );
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      [
        "**Version:** 2.6.4 | **Status:** Stable | **Last Updated:** March 18, 2026",
        "**Version:** 2.6.4 | **Updated:** March 18, 2026",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/resume-matcher.md",
      "> **Status:** ENABLED - Module fully functional\n> **Version:** 2.6.4\n",
    );
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      "## Version History\n\n**Next Phase:** ML-based skills matching (v2.7)\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/ghost-detection.md",
        "docs/features/notifications.md",
        "docs/features/application-assist.md",
        "docs/features/resume-builder.md",
        "docs/features/user-data-management.md",
        "docs/features/resume-matcher.md",
        "docs/features/smart-scoring.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace feature doc stale metadata: docs/features/ghost-detection.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace feature doc stale metadata: docs/features/notifications.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace feature doc stale metadata: docs/features/application-assist.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace feature doc stale metadata: docs/features/resume-builder.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace feature doc stale metadata: docs/features/user-data-management.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace feature doc stale metadata: docs/features/resume-matcher.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace feature doc stale metadata: docs/features/smart-scoring.md"),
      violations.join("\n"),
    );
  });
});
