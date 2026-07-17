import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { contradictoryPlansIndexSource } from "../lib/source-fixtures.mjs";
import { checkRepoBloat } from "../../checks/repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(
    join(tmpdir(), "jobsentinel-repo-bloat-source-quality-"),
  );

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
      "src/features/applications/InterviewScheduler.tsx",
      "<Button>⏳ Pending</Button><Button>✓ Passed</Button><Button>✗ Failed</Button>\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/features/applications/InterviewScheduler.tsx",
      ],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace frontend status emoji markers: src/features/applications/InterviewScheduler.tsx",
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
      "src/features/market/MarketPage.tsx",
      'export const tabs = [{ id: "overview", label: "Overview", icon: "📊" }];\n',
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/features/market/MarketPage.tsx"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace production source emoji markers: src/features/market/MarketPage.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects production explicit-any lint suppressions", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/market/TrendChart.tsx",
      [
        "// eslint-disable-next-line @typescript-eslint/no-explicit-any",
        "type ChartData = Record<string, any>;",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/features/market/TrendChart.tsx"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove production explicit-any suppression: src/features/market/TrendChart.tsx",
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
      "src/dev-runtime/vitals.ts",
      [
        "export function getPerformanceSummary() {",
        "  // @ts-expect-error - memory is non-standard",
        "  return performance.memory?.usedJSHeapSize || 0;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/dev-runtime/vitals.ts"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove production TypeScript error suppression: src/dev-runtime/vitals.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects production hook dependency suppressions", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/company-research/CompanyResearchPanel.tsx",
      [
        "useEffect(() => {",
        "  setLoading(false);",
        "  // eslint-disable-next-line react-hooks/exhaustive-deps",
        "}, [companyName]);",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/features/company-research/CompanyResearchPanel.tsx",
      ],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove production hook dependency suppression: src/features/company-research/CompanyResearchPanel.tsx",
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
      "src/app/providers/UndoProvider.tsx",
      [
        "export function UndoProvider() { return null; }",
        "// eslint-disable-next-line react-refresh/only-export-components",
        "export function useUndo() { return null; }",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/app/providers/UndoProvider.tsx"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove production react-refresh suppression: src/app/providers/UndoProvider.tsx",
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
      "crates/jobsentinel-application/src/scoring/mod.rs",
      'reasons.push(format!("✓ Title matches: {}", job.title));\n',
    );

    execFileSync(
      "git",
      ["add", "package.json", "crates/jobsentinel-application/src/scoring/mod.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace backend scoring reason glyph markers: crates/jobsentinel-application/src/scoring/mod.rs",
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
      "crates/jobsentinel-notifications/src/slack.rs",
      'reasons: vec!["✓ Title matches".to_string()],\n',
    );

    execFileSync(
      "git",
      ["add", "package.json", "crates/jobsentinel-notifications/src/slack.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace notification scoring reason glyph markers: crates/jobsentinel-notifications/src/slack.rs",
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

    execFileSync("git", ["add", "docs/features/browser-import.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace bookmarklet doc status emoji markers: docs/features/browser-import.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects contradictory plans index release statuses", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "docs/plans/README.md",
      contradictoryPlansIndexSource,
    );

    execFileSync("git", ["add", "docs/plans/README.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync plans index release status: docs/plans/README.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale notification preference sync wrappers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/settings/notifications/notificationPreferencesStore.ts",
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

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/features/settings/notifications/notificationPreferencesStore.ts",
      ],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale notification preference sync wrapper: src/features/settings/notifications/notificationPreferencesStore.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unreferenced local barrel modules", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/application-assist/index.ts",
      "export { ProfileForm } from './ProfileForm';\n",
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ProfileForm.tsx",
      "export function ProfileForm() { return null; }\n",
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ApplicationProfilePage.tsx",
      "import { ProfileForm } from './ProfileForm';\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/features/application-assist/index.ts",
        "src/features/application-assist/ProfileForm.tsx",
        "src/features/application-assist/ApplicationProfilePage.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove unreferenced barrel module: src/features/application-assist/index.ts",
      ),
      violations.join("\n"),
    );
  });
});
