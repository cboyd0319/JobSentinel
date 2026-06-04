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

function lineFixture(count) {
  return Array.from({ length: count }, (_, index) => `const fixtureLine${index} = ${index};`)
    .join("\n");
}

test("checkRepoBloat rejects new oversized maintainable source files", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "src/pages/Oversized.tsx", lineFixture(1201));

    execFileSync("git", ["add", "package.json", "src/pages/Oversized.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "split oversized tracked file: src/pages/Oversized.tsx has 1201 lines (limit 1200)",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat grandfathers known oversized files without allowing growth", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "scripts/check-repo-bloat.test.mjs", lineFixture(1554));

    execFileSync("git", ["add", "package.json", "scripts/check-repo-bloat.test.mjs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.equal(
      violations.some((violation) => violation.includes("scripts/check-repo-bloat.test.mjs has")),
      false,
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects growth in grandfathered oversized files", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "scripts/check-repo-bloat.test.mjs", lineFixture(1555));

    execFileSync("git", ["add", "package.json", "scripts/check-repo-bloat.test.mjs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "split legacy oversized tracked file before growing it: scripts/check-repo-bloat.test.mjs has 1555 lines (budget 1554, target 1200)",
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

test("checkRepoBloat rejects front-door macOS installer overpromises", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      "The current release includes Windows, macOS, and Linux installers.\n",
    );

    execFileSync("git", ["add", "README.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace front-door macOS installer overpromise: README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects front-door macOS distribution overpromises", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "README.md", "The macOS package is notarized and Gatekeeper-ready.\n");

    execFileSync("git", ["add", "README.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace front-door macOS distribution overpromise: README.md"),
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

test("checkRepoBloat requires README product definition", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "README.md", "# JobSentinel\n\nLocal job search app.\n");

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
      violations.includes("add free-forever MIT wording: docs/harness/README.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("add free-forever MIT wording: docs/user/QUICK_START.md"),
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
      violations.includes("add required grant-facing doc: docs/research/pay-equity.md"),
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

test("checkRepoBloat rejects legacy preference-list docs copy", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      [
        "### Company Whitelist",
        "- Jobs from whitelisted companies: +50% to company score",
        "- Title matches allowlist: +100%",
        "2. **Job-word boosters**",
        '- Boosted job words: ["Onboarding"]',
        "Job-Word Match:",
        "  Onboarding (found, boosted) +10%",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/application-tracking.md",
      "- [ ] **Company Blacklist** - Never apply to bad companies again\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/smart-scoring.md",
        "docs/features/application-tracking.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("keep job-search docs plain-language: docs/features/smart-scoring.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("keep job-search docs plain-language: docs/features/application-tracking.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects discontinued Stack Overflow Jobs deep links", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/user/DEEP_LINKS.md",
      "- **Stack Overflow Jobs** - Developer-focused jobs\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/deeplinks/generator.rs",
      '"stackoverflow" => "https://stackoverflow.com/jobs?q=test";\n',
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      'const id = "stackoverflow";\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/user/DEEP_LINKS.md",
        "src-tauri/src/core/deeplinks/generator.rs",
        "src/mocks/handlers.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove discontinued Stack Overflow Jobs deep link: docs/user/DEEP_LINKS.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove discontinued Stack Overflow Jobs deep link: src-tauri/src/core/deeplinks/generator.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove discontinued Stack Overflow Jobs deep link: src/mocks/handlers.ts",
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

test("checkRepoBloat rejects stale resume suggestion category labels", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/resume/ats_analyzer.rs",
      `
pub enum SuggestionCategory {
    AddKeyword,
    RewordBullet,
    AddSection,
    ReorderContent,
    FormatFix,
}
`,
    );
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizer.tsx",
      'type SuggestionCategory = "AddKeyword" | "RewordBullet" | "AddSection" | "RemoveItem";\n',
    );
    writeFixtureFile(
      root,
      "src/components/AtsLiveScorePanel.tsx",
      'type SuggestionCategory = "AddKeyword" | "RewordBullet" | "AddSection" | "ReorderContent" | "FormatFix";\n',
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      'type MockSuggestionCategory = "AddKeyword" | "RewordBullet" | "AddSection";\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "src-tauri/src/core/resume/ats_analyzer.rs",
        "src/pages/ResumeOptimizer.tsx",
        "src/components/AtsLiveScorePanel.tsx",
        "src/mocks/handlers.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync resume suggestion category labels: src/pages/ResumeOptimizer.tsx"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("sync resume suggestion category labels: src/mocks/handlers.ts"),
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

test("checkRepoBloat rejects unsafe Resume Optimizer JSON parsing", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizer.tsx",
      [
        "async function handleAnalyze() {",
        "  const resume: AtsResumeData = JSON.parse(resumeJson);",
        "  await invoke('analyze_resume_format', { resume });",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/pages/ResumeOptimizer.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("validate Resume Optimizer JSON before invoke: src/pages/ResumeOptimizer.tsx"),
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

test("checkRepoBloat rejects stale resume match sub-score display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/pages/Resume.tsx",
      [
        "export function Resume({ match }) {",
        "  return <div style={{ width: `${match.skills_match_score}%` }}>{Math.round(match.experience_match_score)}%</div>;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/pages/Resume.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("render resume match sub-scores from backend fractions: src/pages/Resume.tsx"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale resume E2E match seeds", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "tests/e2e/playwright/resume-upload-matching.spec.ts",
      [
        "const seededMatches = [{",
        "  overall_match_score: 86,",
        "  skills_match_score: 88,",
        '  gap_analysis: "✓ React experience matches",',
        "}];",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "tests/e2e/playwright/resume-upload-matching.spec.ts"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync resume E2E match seeds with backend fraction shape: tests/e2e/playwright/resume-upload-matching.spec.ts",
      ),
      violations.join("\n"),
    );
  });
});
