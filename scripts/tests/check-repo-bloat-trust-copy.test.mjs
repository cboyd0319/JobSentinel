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
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-trust-copy-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects overconfident ghost-risk copy", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/ghost-detection.md",
      [
        "Stop wasting time on fake job postings.",
        "Real Jobs Only hides anything with ghost score.",
        "Red means Probably fake.",
        "Lower Risk hides jobs above the warning threshold.",
        "Stale Job Threshold",
        "Weight Adjustments",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Ghost jobs (fake or stale postings) are flagged with warnings.\n",
    );
    writeFixtureFile(
      root,
      "docs/README.md",
      "Ghost Detection: ghost jobs, statistics, filtered search, feedback, and configuration.\n",
    );
    writeFixtureFile(root, "docs/ROADMAP.md", "Detect stale, reposted, and fake job postings.\n");
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "Identifies fake/stale/already-filled job postings.\n",
    );
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      "Ghost Job Detection - Identifying fake postings.\n",
    );
    writeFixtureFile(
      root,
      "docs/releases/v1.4.md",
      "Each job receives a ghost score from 0.0 (definitely real) to 1.0.\n",
    );
    writeFixtureFile(
      root,
      "docs/style-guide/GLOSSARY.md",
      "Write this: fake or outdated job posting.\n",
    );
    writeFixtureFile(
      root,
      "docs/style-guide/WRITING-FOR-JOB-SEEKERS.md",
      "Some job postings are fake job postings.\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/GhostIndicator.tsx",
      '"Potential Ghost Job"; "Likely Ghost"; "Confirm ghost job";\n',
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/DashboardFiltersBar.tsx",
      '"Legitimacy"; "Likely Real"; "Possible Ghost";\n',
    );
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      '"Adjust how aggressively JobSentinel flags fake or stale job postings."\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/ghost-detection.md",
        "docs/user/QUICK_START.md",
        "docs/README.md",
        "docs/ROADMAP.md",
        "docs/developer/ARCHITECTURE.md",
        "docs/features/smart-scoring.md",
        "docs/releases/v1.4.md",
        "docs/style-guide/GLOSSARY.md",
        "docs/style-guide/WRITING-FOR-JOB-SEEKERS.md",
        "src/features/dashboard/components/GhostIndicator.tsx",
        "src/features/dashboard/components/DashboardFiltersBar.tsx",
        "src/pages/Settings.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "docs/features/ghost-detection.md",
      "docs/user/QUICK_START.md",
      "docs/README.md",
      "docs/ROADMAP.md",
      "docs/developer/ARCHITECTURE.md",
      "docs/features/smart-scoring.md",
      "docs/releases/v1.4.md",
      "docs/style-guide/GLOSSARY.md",
      "docs/style-guide/WRITING-FOR-JOB-SEEKERS.md",
      "src/features/dashboard/components/GhostIndicator.tsx",
      "src/features/dashboard/components/DashboardFiltersBar.tsx",
      "src/pages/Settings.tsx",
    ]) {
      assert.ok(
        violations.includes(`replace overconfident ghost-risk copy: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects feedback support paths drifting away from local-first reports", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/feedback/SubmitOptions.tsx",
      '"Works without a GitHub or Google account"; icon={<DriveIcon />}; onSubmitDrive();\n',
    );
    writeFixtureFile(
      root,
      "src/components/feedback/SuccessScreen.tsx",
      'submittedVia: "github" | "drive"; "Open Shared Folder";\n',
    );
    writeFixtureFile(root, "src/hooks/useFeedback.ts", 'submittedVia: "drive"; submitViaDrive();\n');
    writeFixtureFile(
      root,
      "docs/features/job-sources.md",
      "Optional debug report uses GitHub or Google Drive flow.\n",
    );
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      '"Safe debug report copied"; "Paste it into a GitHub issue."; "Attach report.txt to a GitHub issue";\n',
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Click Save Safe Debug Report, then open an issue on GitHub.\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/components/feedback/SubmitOptions.tsx",
        "src/components/feedback/SuccessScreen.tsx",
        "src/hooks/useFeedback.ts",
        "docs/features/job-sources.md",
        "src/pages/Settings.tsx",
        "docs/user/QUICK_START.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src/components/feedback/SubmitOptions.tsx",
      "src/components/feedback/SuccessScreen.tsx",
      "src/hooks/useFeedback.ts",
      "docs/features/job-sources.md",
      "src/pages/Settings.tsx",
      "docs/user/QUICK_START.md",
    ]) {
      assert.ok(
        violations.includes(`keep feedback support path local-first: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects overconfident pay guidance", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/pay-protection.md",
      [
        "Know your worth. Negotiate with confidence.",
        "Get scripts so you know exactly what to say.",
        "Always negotiate for a guaranteed raise.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/salary/SalaryEvidenceCard.tsx",
      '"Copy-paste templates for asking for more money"; "maximize your compensation";\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/pay-protection.md",
        "src/features/salary/SalaryEvidenceCard.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace overconfident pay guidance: docs/features/pay-protection.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace overconfident pay guidance: src/features/salary/SalaryEvidenceCard.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects non-protective salary-floor troubleshooting", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "docs/user/QUICK_START.md", "Lower your minimum salary to $0 temporarily\n");
    writeFixtureFile(
      root,
      "src/features/dashboard/components/noJobsEmptyStateCopy.ts",
      "If a search comes back empty, broaden the role title, location, or lowest pay you want.\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/user/QUICK_START.md",
        "src/features/dashboard/components/noJobsEmptyStateCopy.ts",
      ],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("keep salary-floor troubleshooting protective: docs/user/QUICK_START.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep salary-floor troubleshooting protective: src/features/dashboard/components/noJobsEmptyStateCopy.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw salary command logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/salary.rs",
      [
        'tracing::info!("Command: predict_salary (job: {}, years: {:?})", job_hash, years);',
        'tracing::info!("Command: get_salary_benchmark (title: {}, location: {})", job_title, location);',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/salary.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove raw salary command logging: src-tauri/src/commands/salary.rs"),
      violations.join("\n"),
    );
  });
});
