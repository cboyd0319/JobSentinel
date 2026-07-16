import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../../checks/repo-bloat.mjs";

test("checkRepoBloat rejects stale notification preference docs", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-notification-preferences-"));
  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    const path = "docs/features/user-data-management.md";
    const fullPath = join(root, path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(join(root, "package.json"), "{}\n");
    writeFileSync(
      fullPath,
      [
        'invoke("save_notification_preferences", {',
        "  per_source_settings: {",
        "    linkedin: { enabled: true, min_score: 0.9, include_ghosts: false },",
        "  },",
        "  keyword_rules: { include: ['Rust'] },",
        "  thresholds: { slack: 0.9 },",
        "Minimum score - Only notify for jobs scoring at or above the threshold",
        "});",
      ].join("\n"),
    );
    execFileSync("git", ["add", "package.json", path], { cwd: root });

    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(`sync notification preference docs with backend shape: ${path}`),
      violations.join("\n"),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
