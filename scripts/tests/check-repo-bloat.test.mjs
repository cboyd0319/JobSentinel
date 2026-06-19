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

test("checkRepoBloat rejects formerly grandfathered oversized files at the standard limit", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "src/pages/ResumeBuilder.tsx", lineFixture(1201));

    execFileSync("git", ["add", "package.json", "src/pages/ResumeBuilder.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "split oversized tracked file: src/pages/ResumeBuilder.tsx has 1201 lines (limit 1200)",
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
      "src/pages/resumeOptimizerModel.ts",
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
        "src/pages/resumeOptimizerModel.ts",
        "src/components/AtsLiveScorePanel.tsx",
        "src/mocks/handlers.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync resume suggestion category labels: src/pages/resumeOptimizerModel.ts"),
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
      "src/pages/resumeOptimizerModel.ts",
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
        "src/pages/resumeOptimizerModel.ts",
        "src/components/AtsLiveScorePanel.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync ATS keyword match frontend shape: src/pages/resumeOptimizerModel.ts",
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
