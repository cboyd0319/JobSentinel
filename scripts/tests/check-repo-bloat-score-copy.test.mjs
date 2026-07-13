import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../checks/repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(
    join(tmpdir(), "jobsentinel-repo-bloat-score-copy-"),
  );

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects non-protective score copy", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/ui/score-display/ScoreDisplay.tsx",
      [
        'const label = "Great Match!";',
        'const detail = "This job is Highly recommended!";',
        'const aria = "Match score: 80%. Good Match";',
        "return <div>{reason}</div>;",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/ScoreBreakdownModal.tsx",
      'const detail = "You might want to skip it"; const help = "You can adjust scoring weights in Settings";\n',
    );
    writeFixtureFile(
      root,
      "src/components/ResumeMatchScoreBreakdown.tsx",
      '"Overall score is calculated using weighted averages based on component importance"; "(50% weight)";\n',
    );
    writeFixtureFile(
      root,
      "src/features/settings/SettingsPage.tsx",
      [
        '"Job Scoring Weights"; "These weights determine how jobs are scored.";',
        '"Jobs are scored based on how close they are to your target.";',
        '"Your ideal salary - jobs at or above this get top scores";',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/DashboardFiltersBar.tsx",
      '"Score (High → Low)"; "Score (Low → High)"; label="Score"; "All Scores";\n',
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/DashboardPage.tsx",
      'return <><li>Sort: {filters.sortBy}</li><li>Score: {filters.scoreFilter}</li><CompareRow label="Match Score" /></>;\n',
    );
    writeFixtureFile(
      root,
      "src/app/onboarding/tourSteps.ts",
      '"Too many jobs? Use these filters to narrow by match score, source, or bookmarked jobs.";\n',
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Each job is scored against your saved search.\nEvery job found, sorted by match score.\n",
    );
    writeFixtureFile(
      root,
      "docs/features/notifications.md",
      "Jobs scoring above your threshold can notify you. Settings > Notifications > Alert Threshold.\n",
    );
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      "- Old posting: adjust recency weight if you're desperate\n## Weight Presets\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/notifications.md",
        "docs/features/smart-scoring.md",
        "docs/user/QUICK_START.md",
        "src/app/onboarding/tourSteps.ts",
        "src/components/ResumeMatchScoreBreakdown.tsx",
        "src/ui/score-display/ScoreDisplay.tsx",
        "src/features/dashboard/components/ScoreBreakdownModal.tsx",
        "src/features/dashboard/DashboardPage.tsx",
        "src/features/dashboard/components/DashboardFiltersBar.tsx",
        "src/features/settings/SettingsPage.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "keep score copy protective: src/ui/score-display/ScoreDisplay.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep score copy protective: src/features/dashboard/components/ScoreBreakdownModal.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep score copy protective: src/components/ResumeMatchScoreBreakdown.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep score copy protective: src/features/settings/SettingsPage.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep score copy protective: src/features/dashboard/components/DashboardFiltersBar.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep score copy protective: src/features/dashboard/DashboardPage.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep score copy protective: src/app/onboarding/tourSteps.ts",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep score copy protective: docs/user/QUICK_START.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep score copy protective: docs/features/notifications.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep score copy protective: docs/features/smart-scoring.md",
      ),
      violations.join("\n"),
    );
  });
});
