import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasStaleNotificationPreferenceSyncWrapper,
  hasUnreferencedBarrelModule,
  hasUnreferencedComponentsBarrel,
  hasUnreferencedHookModule,
  hasUnreferencedSettingsHelperComponent,
  hasUnreferencedSourceHelper,
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

test("source-structure checks detect unreferenced settings helpers", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/settings/FilterListInput.tsx",
      "export function FilterListInput() { return null; }\n",
    );
    writeFixtureFile(root, "src/pages/Settings.tsx", "export function Settings() { return null; }\n");
    track(root, ["src/components/settings/FilterListInput.tsx", "src/pages/Settings.tsx"]);

    assert.equal(
      hasUnreferencedSettingsHelperComponent(
        root,
        "src/components/settings/FilterListInput.tsx",
      ),
      true,
    );
  });
});

test("source-structure checks detect unreferenced hook and helper modules", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "src/hooks/useModal.ts", "export function useModal() {}\n");
    writeFixtureFile(root, "src/hooks/index.ts", "export { useModal } from './useModal';\n");
    writeFixtureFile(root, "src/utils/cacheStrategies.ts", "export const cacheStrategies = {};\n");
    writeFixtureFile(root, "src/pages/Dashboard.tsx", "export function Dashboard() { return null; }\n");
    track(root, [
      "src/hooks/useModal.ts",
      "src/hooks/index.ts",
      "src/utils/cacheStrategies.ts",
      "src/pages/Dashboard.tsx",
    ]);

    assert.equal(hasUnreferencedHookModule(root, "src/hooks/useModal.ts"), true);
    assert.equal(hasUnreferencedSourceHelper(root, "src/utils/cacheStrategies.ts"), true);
  });
});

test("source-structure checks honor active barrel imports", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "src/components/index.ts", "export const Button = null;\n");
    writeFixtureFile(root, "src/pages/Dashboard.tsx", "import { Button } from '@/components';\n");
    track(root, ["src/components/index.ts", "src/pages/Dashboard.tsx"]);

    assert.equal(hasUnreferencedComponentsBarrel(root, "src/components/index.ts"), false);
  });
});

test("source-structure checks detect unreferenced local barrels", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "src/features/application-assist/index.ts", "export const Assist = null;\n");
    writeFixtureFile(root, "src/pages/Dashboard.tsx", "export function Dashboard() { return null; }\n");
    track(root, ["src/features/application-assist/index.ts", "src/pages/Dashboard.tsx"]);

    assert.equal(
      hasUnreferencedBarrelModule(root, "src/features/application-assist/index.ts"),
      true,
    );
  });
});

test("source-structure checks detect stale notification sync wrappers", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "src/utils/notificationPreferences.ts",
      [
        "export function loadNotificationPreferences(): NotificationPreferences {",
        "  throw new Error('deprecated');",
        "}",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasStaleNotificationPreferenceSyncWrapper(root, "src/utils/notificationPreferences.ts"),
      true,
    );
  });
});
