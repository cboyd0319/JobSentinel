import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasStaleNotificationPreferenceSyncWrapper,
  hasUnreferencedBarrelModule,
} from "../harness/checks/source-structure.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-source-structure-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function track(root, paths) {
  execFileSync("git", ["add", ...paths], { cwd: root });
}

test("source-structure checks detect unreferenced local barrels", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/application-assist/index.ts",
      "export const Assist = null;\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/DashboardPage.tsx",
      "export function Dashboard() { return null; }\n",
    );
    track(root, [
      "src/features/application-assist/index.ts",
      "src/features/dashboard/DashboardPage.tsx",
    ]);

    assert.equal(
      hasUnreferencedBarrelModule(
        root,
        "src/features/application-assist/index.ts",
      ),
      true,
    );
  });
});

test("source-structure checks detect stale notification sync wrappers", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/settings/notifications/notificationPreferencesStore.ts",
      [
        "export function loadNotificationPreferences(): NotificationPreferences {",
        "  throw new Error('deprecated');",
        "}",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasStaleNotificationPreferenceSyncWrapper(
        root,
        "src/features/settings/notifications/notificationPreferencesStore.ts",
      ),
      true,
    );
  });
});
