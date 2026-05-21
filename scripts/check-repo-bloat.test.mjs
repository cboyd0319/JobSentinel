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

test("checkRepoBloat rejects unreferenced docs images", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "README.md", "![Dashboard](docs/images/dashboard.png)\n");
    writeFixtureFile(root, "docs/images/dashboard.png", "used image fixture\n");
    writeFixtureFile(root, "docs/images/keyboard-shortcuts.png", "unused image fixture\n");

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
      violations.includes("remove unreferenced docs image: docs/images/keyboard-shortcuts.png"),
      violations.join("\n"),
    );
    assert.ok(
      !violations.includes("remove unreferenced docs image: docs/images/dashboard.png"),
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

    execFileSync("git", ["add", "package.json", "tests/e2e/playwright/screenshots.spec.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove duplicate docs screenshot capture: tests/e2e/playwright/screenshots.spec.ts",
      ),
      violations.join("\n"),
    );
  });
});

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

test("checkRepoBloat rejects frontend status emoji markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/InterviewScheduler.tsx",
      '<Button>⏳ Pending</Button><Button>✓ Passed</Button><Button>✗ Failed</Button>\n',
    );

    execFileSync("git", ["add", "package.json", "src/components/InterviewScheduler.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace frontend status emoji markers: src/components/InterviewScheduler.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects production source emoji markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/Market.tsx",
      'export const tabs = [{ id: "overview", label: "Overview", icon: "📊" }];\n',
    );

    execFileSync("git", ["add", "package.json", "src/pages/Market.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace production source emoji markers: src/pages/Market.tsx"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects backend scoring reason glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scoring/mod.rs",
      'reasons.push(format!("✓ Title matches: {}", job.title));\n',
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/scoring/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace backend scoring reason glyph markers: src-tauri/src/core/scoring/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects notification scoring reason glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/notify/slack.rs",
      'reasons: vec!["✓ Title matches".to_string()],\n',
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/notify/slack.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace notification scoring reason glyph markers: src-tauri/src/core/notify/slack.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects bookmarklet doc status emoji markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "docs/BOOKMARKLET.md",
      "alert('✓ Job imported to JobSentinel!');\nalert('✗ Failed to import job.');\n",
    );

    execFileSync("git", ["add", "docs/BOOKMARKLET.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace bookmarklet doc status emoji markers: docs/BOOKMARKLET.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects contradictory plans index release statuses", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "docs/plans/README.md",
      [
        "## Current Release Plans",
        "| Version | Status | Document |",
        "| ------- | ------ | -------- |",
        "| v2.7.0 | Unreleased | [Beta feedback system](completed/beta-feedback-system.md) |",
        "",
        "## Archived Plans",
        "| Version | Status | Document |",
        "| ------- | ------ | -------- |",
        "| v2.7.0 | Complete on main | [Beta feedback system](completed/beta-feedback-system.md) |",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "docs/plans/README.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync plans index release status: docs/plans/README.md"),
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

test("checkRepoBloat rejects stale notification preference sync wrappers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/notificationPreferences.ts",
      [
        "export interface NotificationPreferences { enabled: boolean; }",
        "export const DEFAULT_PREFERENCES: NotificationPreferences = { enabled: true };",
        "export async function saveNotificationPreferencesAsync() { return true; }",
        "export function loadNotificationPreferences(): NotificationPreferences {",
        "  return DEFAULT_PREFERENCES;",
        "}",
        "/** @deprecated Use saveNotificationPreferencesAsync instead */",
        "export function saveNotificationPreferences(_prefs: NotificationPreferences): boolean {",
        "  return false;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/utils/notificationPreferences.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale notification preference sync wrapper: src/utils/notificationPreferences.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unreferenced components barrel", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/index.ts",
      "export { Button } from './Button';\n",
    );
    writeFixtureFile(root, "src/components/Button.tsx", "export function Button() { return null; }\n");
    writeFixtureFile(root, "src/pages/Dashboard.tsx", "import { Button } from '../components/Button';\n");

    execFileSync(
      "git",
      ["add", "package.json", "src/components/index.ts", "src/components/Button.tsx", "src/pages/Dashboard.tsx"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove unreferenced components barrel: src/components/index.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unreferenced local barrel modules", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/automation/index.ts",
      "export { ProfileForm } from './ProfileForm';\n",
    );
    writeFixtureFile(
      root,
      "src/components/automation/ProfileForm.tsx",
      "export function ProfileForm() { return null; }\n",
    );
    writeFixtureFile(
      root,
      "src/pages/ApplicationProfile.tsx",
      "import { ProfileForm } from '../components/automation/ProfileForm';\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/components/automation/index.ts",
        "src/components/automation/ProfileForm.tsx",
        "src/pages/ApplicationProfile.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove unreferenced barrel module: src/components/automation/index.ts"),
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

test("checkRepoBloat rejects developer testing doc stale markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/TESTING.md",
      [
        "// Good ✅",
        "// Bad ❌",
        "| Core business logic | 90%+ | ✅ Achieved |",
        "| Scrapers | 70%+ | ⚠️ In Progress |",
        "### DO ✅",
        "### DON'T ❌",
        "**Last Updated:** May 19, 2026",
        "**Version:** v2.6.4",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/FRONTEND_TESTING.md",
      [
        "### DO ✅",
        "### DON'T ❌",
        "**Last Updated**: May 19, 2026",
        "**Test Count**: Run `npm run test:run` for current frontend count",
        "**Stack**: Vitest 4.0.17",
        "**Maintained By**: JobSentinel Team",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/INTEGRATION_TESTING.md",
      [
        "### DO ✅",
        "### DON'T ❌",
        "**Last Updated**: March 18, 2026",
        "**Test Count**: Run `cargo test --test '*' -- --list`",
        "**Version**: v2.6.4",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/MUTATION_TESTING.md",
      [
        "x > 0  // ✅ Line covered",
        "is_positive(5);  // ❌ No assertion",
        "**⚠️ Warning:** Full mutation testing can take 30-60+ minutes!",
        "✅ CAUGHT by test_negative_salary_floor_fails",
        "❌ MISSED - no test caught this mutation",
        "| **Timeout** ⏱️ | Tests took too long |",
        "**Last Updated**: May 20, 2026",
        "**Maintained By**: JobSentinel maintainers",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/developer/TESTING.md",
        "docs/developer/FRONTEND_TESTING.md",
        "docs/developer/INTEGRATION_TESTING.md",
        "docs/developer/MUTATION_TESTING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace developer testing doc stale markers: docs/developer/TESTING.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer testing doc stale markers: docs/developer/FRONTEND_TESTING.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer testing doc stale markers: docs/developer/INTEGRATION_TESTING.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer testing doc stale markers: docs/developer/MUTATION_TESTING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects developer architecture doc stale markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      [
        "**JobSentinel v2.6.4 System Architecture**",
        "// Good ✅: Core depends on abstractions",
        "// Bad ❌: Core depends on concrete types",
        "- No cloud dependencies (v1.0)",
        "**Last Updated**: May 20, 2026",
        "**Version**: 2.6.4",
        "**Maintained By**: JobSentinel maintainers",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/ERROR_HANDLING.md",
      [
        "// Good ✅: Structured fields",
        "// Bad ❌: String interpolation only",
        "**DO ✅:**",
        "**DON'T ❌:**",
        "| Bad ❌ | Good ✅ |",
        "### DO ✅",
        "### DON'T ❌",
        "**Last Updated**: May 20, 2026",
        "**Maintained By**: JobSentinel maintainers",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/developer/ARCHITECTURE.md", "docs/developer/ERROR_HANDLING.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace developer architecture doc stale markers: docs/developer/ARCHITECTURE.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer architecture doc stale markers: docs/developer/ERROR_HANDLING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects developer maintenance doc stale markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/CONTRIBUTING.md",
      [
        "# Contributing",
        "",
        "**Current version:** 2.6.4 (Production Ready)",
        "",
        "## 🚀 Getting Started",
        "",
        "- ✅ **Do:** Provide constructive feedback",
        "- ❌ **Don't:** Share private information",
        "",
        "**Last Updated:** March 18, 2026 (v2.6.4)",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      [
        "# Getting Started",
        "",
        "**Version 2.6.4**",
        "",
        "│   │   │   ├── db/          # Database layer (refactored v1.5)",
        "",
        "### Modular Architecture (v1.5+)",
        "",
        "1. Read ROADMAP.md for v1.5+ priorities",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/WHY_TAURI.md",
      ["# Why Tauri?", "", "**Last Updated:** March 18, 2026", "**Version:** v2.6.4", ""].join(
        "\n",
      ),
    );
    writeFixtureFile(
      root,
      "docs/developer/RELEASING.md",
      ["# Releases", "", "## Version History", "", "- **v2.7.1 (unreleased)** - Notes", ""].join(
        "\n",
      ),
    );
    writeFixtureFile(
      root,
      "docs/developer/CI_CD.md",
      ["# CI/CD", "", "**Last updated:** March 2026", "**Version:** v2.6.4", ""].join(
        "\n",
      ),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/developer/CONTRIBUTING.md",
        "docs/developer/GETTING_STARTED.md",
        "docs/developer/WHY_TAURI.md",
        "docs/developer/RELEASING.md",
        "docs/developer/CI_CD.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/CONTRIBUTING.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/GETTING_STARTED.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/WHY_TAURI.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/RELEASING.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace developer maintenance doc stale markers: docs/developer/CI_CD.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects top-level active doc stale markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/BOOKMARKLET.md",
      ["# Browser Bookmarklet Integration", "", "**Version:** 2.6+", "**Status:** Ready", ""].join(
        "\n",
      ),
    );
    writeFixtureFile(
      root,
      "docs/ML_FEATURE.md",
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
        "docs/BOOKMARKLET.md",
        "docs/ML_FEATURE.md",
        "docs/developer/TESTING.md",
        "docs/developer/FRONTEND_TESTING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace top-level active doc stale markers: docs/BOOKMARKLET.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace top-level active doc stale markers: docs/ML_FEATURE.md"),
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

test("checkRepoBloat rejects fixed waits in E2E page objects", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "tests/e2e/playwright/page-objects/BasePage.ts",
      "export async function wait(page) { await page.waitForTimeout(500); }\n",
    );

    execFileSync(
      "git",
      ["add", "package.json", "tests/e2e/playwright/page-objects/BasePage.ts"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace fixed E2E page-object wait: tests/e2e/playwright/page-objects/BasePage.ts",
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
        "docs/developer/GETTING_STARTED.md",
        "docs/developer/TESTING.md",
        "docs/developer/INTEGRATION_TESTING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

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
        "Settings → Job Sources",
        "┌─────────┐",
        "One-Click Connect — No Technical Knowledge Required!",
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

test("checkRepoBloat rejects stale scraper reliability and rate-limit docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/scrapers.md",
      [
        "JobSentinel includes production-ready scrapers for 13 major job boards.",
        "- [x] All 13 job board scrapers (production-ready)",
        "- [ ] CAPTCHA solver integration",
        "- [ ] Proxy rotation for large-scale scraping",
        "4. **Session Management:** Rotate cookies if multiple accounts",
        "4. **Rate Limiting:** Conservative 5-second delays (Cloudflare protection)",
        "limiter.wait(\"usajobs\", limits::USAJOBS).await;       // 60/hour",
        "| **USAJobs**         | 60            | 0.017         | Official API, conservative     |",
        "| **RemoteOK**        | 1000          | 0.278         | Public API                     |",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/scrapers.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync scraper reliability and rate-limit docs: docs/features/scrapers.md",
      ),
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
        "Settings → Scrapers → LinkedIn",
        "────────────────────────",
        "┌────────────────────────────────┐",
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
      "docs/features/one-click-apply.md",
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
        "docs/features/one-click-apply.md",
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
      violations.includes("replace feature doc stale metadata: docs/features/one-click-apply.md"),
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

test("checkRepoBloat rejects synonym and remote preference doc drift", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/synonym-matching.md",
      [
        '- ✅ "py" matches "py script"',
        '- "Kuberntes" → "Kubernetes"',
        "### Custom Synonyms (v2.1+)",
        "**Version:** 2.6.4 | **Last Updated:** March 18, 2026",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/remote-preference-scoring.md",
      [
        "| Hybrid | 0.5 | ⚠ Prefer remote-only |",
        "- All preference × job type combinations",
        "Potential improvements for v2.0+:",
        "**Version:** 2.6.4 | **Last Updated:** March 18, 2026",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/synonym-matching.md",
        "docs/features/remote-preference-scoring.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync synonym and remote preference docs: docs/features/synonym-matching.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync synonym and remote preference docs: docs/features/remote-preference-scoring.md",
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
      [`## ${targetIcon} Overview`, `- **${chartIcon} Gap Analysis**`, "✓ Matching Skills", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/salary-ai.md",
      [
        `## ${targetIcon} Overview`,
        `- **${chartIcon} Salary Benchmarks**`,
        "job_hash (FK → jobs)",
        "├── placeholders",
        "",
      ].join("\n"),
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

test("checkRepoBloat rejects smart scoring doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      [
        'Title: "Senior Backend Engineer" → Matches "Backend Developer" → 100%',
        "├─ Skills (40%): 64%",
        "  ✓ React (boosted keyword found)",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/smart-scoring.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace smart scoring doc glyph markers: docs/features/smart-scoring.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects notifications doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/notifications.md",
      [
        '2. Click "Create New App" → "From Scratch"',
        "src-tauri/src/core/notify/",
        "├── mod.rs",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/notifications.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace notifications doc glyph markers: docs/features/notifications.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale Rust export and scraper stubs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/mod.rs",
      [
        "use crate::core::db::Job;",
        "/// Run all enabled scrapers (legacy function, use scrape_all_parallel for new code)",
        "#[deprecated(since = \"1.3.0\", note = \"Use scrape_all_parallel instead\")]",
        "pub async fn scrape_all() -> Vec<Job> {",
        "    vec![]",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/resume/export.rs",
      [
        "//! Resume export functionality - PDF, DOCX, and plain text formats",
        "//! printpdf = \"0.7\"",
        "impl ResumeExporter {",
        "    pub fn export_pdf() {",
        "        anyhow::bail!(\"PDF export not yet implemented\");",
        "    }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/scrapers/mod.rs",
        "src-tauri/src/core/resume/export.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale scrape_all scraper stub: src-tauri/src/core/scrapers/mod.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove stale resume PDF export stub: src-tauri/src/core/resume/export.rs",
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
      [
        'tracing::debug!("Cache miss, fetching: {}", url);',
        'return Err(error).with_context(|| format!("Failed to send request: {url}"));',
        "",
      ].join("\n"),
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

test("checkRepoBloat rejects stale cache usage documentation", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/CACHE_USAGE.md",
      [
        'tracing::info!("Cache hit for: {}", url);',
        "let response = reqwest::get(url).await?;",
        "Disable in Production",
        "- ✅ `get_with_cache(url)`",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/CACHE_USAGE.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync cache usage doc with scraper HTTP client: docs/CACHE_USAGE.md"),
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

test("checkRepoBloat rejects database log emoji markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/connection.rs",
      [
        'tracing::info!("🔧 Configuring SQLite with maximum protections and performance...");',
        'tracing::debug!("  ✓ WAL mode verified ✅");',
        'tracing::error!("  ❌ Foreign keys NOT enabled!");',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/integrity/diagnostics.rs",
      'tracing::warn!("⚠️ WAL checkpoint partially complete (database was busy)");\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/integrity/mod.rs",
      [
        'tracing::info!("🔍 Running database integrity check...");',
        'tracing::error!("❌ Quick check failed: {}", quick_result.message);',
        'tracing::info!("✅ Database integrity check passed ({:?})", start_time.elapsed());',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/integrity/backups.rs",
      'tracing::info!("✅ Database restored successfully");\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/db/connection.rs",
        "src-tauri/src/core/db/integrity/backups.rs",
        "src-tauri/src/core/db/integrity/diagnostics.rs",
        "src-tauri/src/core/db/integrity/mod.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace database log emoji markers: src-tauri/src/core/db/connection.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace database log emoji markers: src-tauri/src/core/db/integrity/diagnostics.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace database log emoji markers: src-tauri/src/core/db/integrity/mod.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace database log emoji markers: src-tauri/src/core/db/integrity/backups.rs",
      ),
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

test("checkRepoBloat rejects stale webhook security doc markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/security/WEBHOOK_SECURITY.md",
      [
        "// ❌ BAD: Easy to bypass",
        "2. **Invalid domain**: Try `https://evil.com/hook` → Should error",
        "1. **v2.0.0+**: Webhooks stored in OS keyring",
        "**Last Updated**: 2026-03-18",
        "**Version**: 2.6.4",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/security/WEBHOOK_SECURITY.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace webhook security doc stale markers: docs/security/WEBHOOK_SECURITY.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale command execution security doc markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/security/COMMAND_EXECUTION.md",
      [
        "PDF File → pdftoppm → PNG Images → tesseract → Extracted Text",
        "// ❌ VULNERABLE: Shell injection risk",
        "- ✅ Path traversal: `../../etc/passwd` → Error",
        "**Last Updated**: 2026-03-18",
        "**Version**: 2.6.4",
        "**Security Level**: Production Ready",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/security/COMMAND_EXECUTION.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace command execution security doc stale markers: docs/security/COMMAND_EXECUTION.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale URL validation security doc markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/security/URL_VALIDATION.md",
      [
        "### Insecure Approach ❌",
        "// ✅ GOOD: Explicit allowlist",
        "**Last Updated**: 2026-05-19",
        "**Version**: 2.6.4",
        "**Security Level**: Production Ready",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/security/URL_VALIDATION.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync URL validation security doc markers: docs/security/URL_VALIDATION.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale XSS security docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/security/README.md",
      [
        "Input → Validation → Sanitization",
        "User Input ↑ Parse",
        "// ❌ Insecure: Allows on error",
        "// ✅ Secure: Denies on error",
        "**Last Updated**: 2026-05-19",
        "**JobSentinel Version**: 2.6.4",
        "**Security Level**: Production Ready",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/security/XSS_PREVENTION.md",
      [
        "> JobSentinel Security Documentation",
        "npm install dompurify  # JobSentinel uses v3.3.1+",
        '<script src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"></script>',
        "### Resume Builder Configuration",
        "While JobSentinel is a desktop app with no backend",
        "// ✅ SAFE - Always sanitize first",
        "**DOMPurify Version**: 3.x",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/security/dompurify-test-examples.js",
      [
        " * DOMPurify Integration Test Example",
        "// ✅ Output: Same as input",
        "// ❌ UNSAFE",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/security/README.md",
        "docs/security/XSS_PREVENTION.md",
        "docs/security/dompurify-test-examples.js",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync XSS security docs with live sanitizer path: docs/security/README.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync XSS security docs with live sanitizer path: docs/security/XSS_PREVENTION.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync XSS security docs with live sanitizer path: docs/security/dompurify-test-examples.js",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale keyring credential docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/security/KEYRING.md",
      [
        "JobSentinel v2.0.0 introduces OS-native keyring integration.",
        "Frontend uses `tauri-plugin-secure-storage` JS API.",
        "pub enum CredentialKey { SlackWebhookUrl, DiscordWebhookUrl, TeamsWebhookUrl }",
        "Does NOT delete plaintext values",
        "- ✅ Stored",
        "**Last Updated**: 2026-05-19",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/credentials-security.md",
      [
        "JobSentinel:slack-webhook",
        "pub enum CredentialKey { EmailSmtpPassword, LinkedinCookies, TelegramToken }",
        "Self::TelegramToken => \"JobSentinel:telegram-token\"",
        "Setup complete ✓",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/security/KEYRING.md", "docs/features/credentials-security.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync keyring credential docs: docs/security/KEYRING.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("sync keyring credential docs: docs/features/credentials-security.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsafe keyring migration and stale credential comments", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/main.rs",
      [
        'tracing::info!("✓ Migrated {:?} to secure storage", key);',
        "// Mark migration as complete (even if partial, to avoid repeated attempts)",
        "migration::set_migrated();",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/credentials/mod.rs",
      [
        "//! - Frontend uses `tauri-plugin-secure-storage` JS API",
        "//!   set_item, get_item, remove_item",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src-tauri/src/main.rs", "src-tauri/src/core/credentials/mod.rs"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("keep keyring migration retry-safe: src-tauri/src/main.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync credential architecture comments: src-tauri/src/core/credentials/mod.rs",
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
