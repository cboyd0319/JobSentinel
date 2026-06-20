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
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-source-quality-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

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

test("checkRepoBloat rejects production explicit-any lint suppressions", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/TrendChart.tsx",
      [
        "// eslint-disable-next-line @typescript-eslint/no-explicit-any",
        "type ChartData = Record<string, any>;",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/components/TrendChart.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove production explicit-any suppression: src/components/TrendChart.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects production TypeScript error suppressions", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/utils/vitals.ts",
      [
        "export function getPerformanceSummary() {",
        "  // @ts-expect-error - memory is non-standard",
        "  return performance.memory?.usedJSHeapSize || 0;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/utils/vitals.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove production TypeScript error suppression: src/utils/vitals.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects production hook dependency suppressions", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/CompanyResearchPanel.tsx",
      [
        "useEffect(() => {",
        "  setLoading(false);",
        "  // eslint-disable-next-line react-hooks/exhaustive-deps",
        "}, [companyName]);",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/components/CompanyResearchPanel.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove production hook dependency suppression: src/components/CompanyResearchPanel.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects production react-refresh suppressions", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/contexts/UndoContext.tsx",
      [
        "export function UndoProvider() { return null; }",
        "// eslint-disable-next-line react-refresh/only-export-components",
        "export function useUndo() { return null; }",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/contexts/UndoContext.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove production react-refresh suppression: src/contexts/UndoContext.tsx",
      ),
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
      "docs/features/browser-import.md",
      "alert('✓ Job imported to JobSentinel!');\nalert('✗ Failed to import job.');\n",
    );

    execFileSync("git", ["add", "docs/features/browser-import.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace bookmarklet doc status emoji markers: docs/features/browser-import.md"),
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

test("checkRepoBloat rejects direct Playwright E2E scripts", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "package.json",
      JSON.stringify(
        {
          scripts: {
            "test:e2e": "playwright test --project=chromium",
            "test:e2e:smoke": "node scripts/run-playwright.mjs test --grep @smoke",
          },
        },
        null,
        2,
      ),
    );

    execFileSync("git", ["add", "package.json"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("route E2E scripts through Playwright wrapper: package.json"),
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

test("checkRepoBloat rejects Tailwind PostCSS plugin in Vite app", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "package.json",
      JSON.stringify(
        {
          devDependencies: {
            "@tailwindcss/postcss": "^4.3.0",
            tailwindcss: "^4.3.0",
            vite: "^8.0.14",
          },
        },
        null,
        2,
      ),
    );
    writeFixtureFile(
      root,
      "postcss.config.js",
      [
        "export default {",
        "  plugins: {",
        "    '@tailwindcss/postcss': {},",
        "    autoprefixer: {},",
        "  },",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "postcss.config.js"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("use Tailwind Vite plugin instead of PostCSS plugin: package.json"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "use Tailwind Vite plugin instead of PostCSS plugin: postcss.config.js",
      ),
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
