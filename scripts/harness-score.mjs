#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

function readText(root, path) {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) {
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function readJson(root, path) {
  const text = readText(root, path);
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function exists(root, path) {
  return existsSync(join(root, path));
}

function countMatchingFiles(root, dirPath, pattern) {
  const fullPath = join(root, dirPath);
  if (!existsSync(fullPath)) {
    return 0;
  }

  return readdirSync(fullPath).filter((entry) => pattern.test(entry)).length;
}

function countTextLines(text) {
  if (text.length === 0) {
    return 0;
  }

  const trailingNewlineAdjustment = /\r?\n$/.test(text) ? 1 : 0;
  return text.split(/\r?\n/).length - trailingNewlineAdjustment;
}

function fileWithinBudget(root, path, maxLines, maxBytes) {
  const text = readText(root, path);
  if (!text) {
    return false;
  }

  return countTextLines(text) <= maxLines && Buffer.byteLength(text, "utf8") <= maxBytes;
}

function startupContextStaysBounded(root) {
  return (
    fileWithinBudget(root, "AGENTS.md", 160, 8000) &&
    fileWithinBudget(root, "docs/harness/README.md", 160, 9000) &&
    fileWithinBudget(root, "docs/plans/active/status.md", 140, 9000) &&
    fileWithinBudget(root, "docs/plans/active/current-work.md", 220, 12000)
  );
}

function fileHasAll(root, path, fragments) {
  const text = readText(root, path).toLowerCase();
  return fragments.every((fragment) => text.includes(fragment.toLowerCase()));
}

function fileHasAny(root, path, fragments) {
  const text = readText(root, path).toLowerCase();
  return fragments.some((fragment) => text.includes(fragment.toLowerCase()));
}

function packageScripts(root) {
  return readJson(root, "package.json")?.scripts ?? {};
}

function hasScript(root, scriptName) {
  return Object.hasOwn(packageScripts(root), scriptName);
}

function hasScripts(root, scriptNames) {
  const scripts = packageScripts(root);
  return scriptNames.every((scriptName) => Object.hasOwn(scripts, scriptName));
}

function activePlanIndexWorkstreamCount(root) {
  const index = readJson(root, "docs/plans/index.json");
  if (!index || !Array.isArray(index.activeWorkstreams)) {
    return 0;
  }

  return index.activeWorkstreams.filter(
    (workstream) =>
      typeof workstream.id === "string" &&
      typeof workstream.path === "string" &&
      typeof workstream.state === "string" &&
      typeof workstream.nextStep === "string",
  ).length;
}

function check(label, pass, evidence) {
  return {
    label,
    pass: Boolean(pass),
    evidence,
  };
}

function scoreSubsystem(subsystem) {
  const passed = subsystem.checks.filter((item) => item.pass).length;
  return {
    ...subsystem,
    passed,
    total: subsystem.checks.length,
    score: Math.max(1, Math.round((passed / subsystem.checks.length) * 5)),
  };
}

function scoreFramework(framework) {
  const subsystems = framework.subsystems.map(scoreSubsystem);
  const passed = subsystems.reduce((sum, subsystem) => sum + subsystem.passed, 0);
  const total = subsystems.reduce((sum, subsystem) => sum + subsystem.total, 0);
  const overall = Math.round((passed / total) * 100);
  const bottleneck = subsystems
    .toSorted((left, right) => left.score - right.score || left.name.localeCompare(right.name))
    .at(0);

  return {
    ...framework,
    subsystems,
    passed,
    total,
    overall,
    bottleneck: bottleneck?.name ?? "unknown",
    allPerfect: overall === 100 && subsystems.every((subsystem) => subsystem.score === 5),
  };
}

function buildFrameworks(root) {
  return [
    {
      id: "walkinglabs-lecture",
      name: "WalkingLabs Lecture Tuple",
      source:
        "https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-02-what-a-harness-actually-is/",
      tuple: ["instructions", "tools", "environment", "state", "feedback"],
      subsystems: [
        {
          name: "Instructions",
          checks: [
            check("Root agent guide exists", exists(root, "AGENTS.md"), "AGENTS.md"),
            check(
              "Root guide routes to harness docs",
              fileHasAll(root, "AGENTS.md", [
                "docs/harness/README.md",
                "docs/harness/verification-matrix.md",
              ]),
              "AGENTS.md",
            ),
            check(
              "Root guide routes to design contract",
              fileHasAll(root, "AGENTS.md", [
                "DESIGN.md",
                "docs/design/README.md",
                "docs/design/design-spec.md",
              ]),
              "AGENTS.md",
            ),
            check(
              "Rule 0 is visible in harness guide",
              fileHasAll(root, "docs/harness/README.md", [
                "## Rule 0",
                "User privacy and security are non-negotiable.",
              ]),
              "docs/harness/README.md",
            ),
            check(
              "Change contract captures acceptance criteria and Rule 0 evidence",
              fileHasAll(root, "docs/harness/change-contract.md", [
                "Acceptance criteria:",
                "Rule 0 evidence:",
              ]),
              "docs/harness/change-contract.md",
            ),
            check(
              "Agent operating model routes verification decisions",
              fileHasAll(root, "docs/harness/agent-operating-model.md", [
                "docs/harness/README.md",
                "docs/harness/verification-matrix.md",
              ]),
              "docs/harness/agent-operating-model.md",
            ),
          ],
        },
        {
          name: "Tools",
          checks: [
            check("Harness check command exists", hasScript(root, "harness:check"), "package.json"),
            check(
              "Session snapshot command exists",
              hasScript(root, "harness:session") && exists(root, "scripts/harness-session.mjs"),
              "package.json, scripts/harness-session.mjs",
            ),
            check(
              "Five-tuple score command exists",
              hasScript(root, "harness:score") && exists(root, "scripts/harness-score.mjs"),
              "package.json, scripts/harness-score.mjs",
            ),
            check(
              "Harness benchmark command exists",
              hasScript(root, "harness:benchmark") && exists(root, "scripts/harness-benchmark.mjs"),
              "package.json, scripts/harness-benchmark.mjs",
            ),
            check(
              "Diff-aware harness plan command exists",
              hasScript(root, "harness:plan") && exists(root, "scripts/harness-plan.mjs"),
              "package.json, scripts/harness-plan.mjs",
            ),
            check(
              "Focused harness sensor commands exist",
              hasScripts(root, [
                "lint:security",
                "lint:external-ai",
                "lint:bloat",
                "lint:tests",
              ]),
              "package.json",
            ),
            check(
              "Product verification commands exist",
              hasScripts(root, ["test:run", "test:e2e", "build"]),
              "package.json",
            ),
          ],
        },
        {
          name: "Environment",
          checks: [
            check(
              "Node runtime target is pinned",
              fileHasAny(root, ".nvmrc", ["24.18.0"]),
              ".nvmrc",
            ),
            check(
              "Rust toolchain target is pinned",
              fileHasAll(root, "rust-toolchain.toml", [
                "channel = \"1.96.0\"",
                "clippy",
                "rustfmt",
              ]),
              "rust-toolchain.toml",
            ),
            check("npm lockfile exists", exists(root, "package-lock.json"), "package-lock.json"),
            check("Cargo lockfile exists", exists(root, "Cargo.lock"), "Cargo.lock"),
            check(
              "Environment doctor commands exist",
              hasScripts(root, ["doctor", "doctor:e2e"]) &&
                fileHasAll(root, ".cargo/config.toml", ['SQLX_OFFLINE = "true"']) &&
                fileHasAll(root, "scripts/doctor.mjs", [".nvmrc", "rust-toolchain.toml"]),
              "package.json, .cargo/config.toml, scripts/doctor.mjs",
            ),
          ],
        },
        {
          name: "State",
          checks: [
            check(
              "Compact active status exists",
              exists(root, "docs/plans/active/status.md"),
              "docs/plans/active/status.md",
            ),
            check(
              "Active plans are machine-indexed",
              activePlanIndexWorkstreamCount(root) >= 2,
              "docs/plans/index.json",
            ),
            check(
              "Active goal locks redesign contract",
              fileHasAll(root, "docs/plans/index.json", [
                "Quiet Shield redesign",
                "DESIGN.md",
                "docs/design/README.md",
                "docs/design/design-spec.md",
              ]) &&
                fileHasAll(root, "docs/plans/active/status.md", [
                  "Quiet Shield redesign",
                  "DESIGN.md",
                  "docs/design/README.md",
                  "docs/design/design-spec.md",
                ]) &&
                fileHasAll(root, "docs/plans/active/current-work.md", [
                  "Locked redesign",
                  "DESIGN.md",
                  "docs/design/README.md",
                  "docs/design/design-spec.md",
                ]),
              "docs/plans/index.json, docs/plans/active/status.md, docs/plans/active/current-work.md",
            ),
            check(
              "Active plan directory stays compact",
              countMatchingFiles(root, "docs/plans/active", /\.md$/) >= 2 &&
                countMatchingFiles(root, "docs/plans/active", /\.md$/) <= 3,
              "docs/plans/active",
            ),
            check(
              "Startup context stays bounded",
              startupContextStaysBounded(root),
              "AGENTS.md, docs/harness/README.md, docs/plans/active/status.md, docs/plans/active/current-work.md",
            ),
            check(
              "Tech-debt tracker preserves harness drift",
              exists(root, "docs/plans/tech-debt-tracker.md"),
              "docs/plans/tech-debt-tracker.md",
            ),
            check(
              "Session snapshot exposes restart state",
              hasScript(root, "harness:session") &&
                fileHasAll(root, "scripts/harness-session.mjs", ["nextBestWork", "activePlanCount"]),
              "scripts/harness-session.mjs",
            ),
          ],
        },
        {
          name: "Feedback",
          checks: [
            check(
              "Verification matrix maps change type to checks",
              fileHasAll(root, "docs/harness/verification-matrix.md", [
                "| Change |",
                "Required sensor",
              ]),
              "docs/harness/verification-matrix.md",
            ),
            check(
              "Harness check runs focused sensors",
              fileHasAll(root, "scripts/checks/harness.mjs", [
                "checkExternalAiGateway",
                "checkRepoBloat",
                "checkTestQuality",
              ]),
              "scripts/checks/harness.mjs",
            ),
            check(
              "Harness score is enforced by harness check",
              fileHasAll(root, "scripts/checks/harness.mjs", [
                "summarizeHarnessScore",
                "five-tuple",
              ]),
              "scripts/checks/harness.mjs",
            ),
            check(
              "Harness script tests exist",
              exists(root, "scripts/tests/harness-score.test.mjs") &&
                countMatchingFiles(root, "scripts/tests", /\.test\.mjs$/) >= 20,
              "scripts/tests/harness-score.test.mjs, scripts/tests/*.test.mjs",
            ),
            check(
              "Scorecard documents observed before and after",
              fileHasAll(root, "docs/harness/archive/five-tuple-scorecard-2026-06-01.md", [
                "Before Current Slice",
                "After Current Slice",
                "100/100",
              ]),
              "docs/harness/archive/five-tuple-scorecard-2026-06-01.md",
            ),
          ],
        },
      ],
    },
    {
      id: "walkinglabs-harness-creator",
      name: "WalkingLabs Harness Creator Tuple",
      source:
        "https://github.com/walkinglabs/learn-harness-engineering/tree/main/skills/harness-creator/scripts",
      tuple: ["instructions", "state", "verification", "scope", "lifecycle"],
      subsystems: [
        {
          name: "Instructions",
          checks: [
            check("Agent guide exists", exists(root, "AGENTS.md"), "AGENTS.md"),
            check(
              "Harness guide exists and names source-of-truth docs",
              fileHasAll(root, "docs/harness/README.md", [
                "## Current Standard",
                "Design contract",
                "DESIGN.md",
              ]),
              "docs/harness/README.md",
            ),
            check(
              "Design contract docs carry Quiet Shield rules",
              exists(root, "DESIGN.md") &&
                exists(root, "docs/design/README.md") &&
                exists(root, "docs/design/design-spec.md") &&
                exists(root, "docs/developer/DESIGN_SPEC.md") &&
                fileHasAll(root, "DESIGN.md", [
                  "JobSentinel Quiet Shield",
                  "Protective Navy",
                  "horizontal page scroll",
                  "theme tokens, contrast checks, screenshots, and native Computer Use validation",
                ]) &&
                fileHasAll(root, "docs/design/README.md", [
                  "JobSentinel Design Docs",
                  "product contracts",
                  "Protective Navy",
                  "Do not claim the full Protective Navy migration is complete until visual",
                ]) &&
                fileHasAll(root, "docs/design/design-spec.md", [
                  "JobSentinel Design Spec",
                  "Protective Navy is the target dark theme.",
                  "Toasts and modals stay in viewport.",
                  "full migration until all major routes are verified",
                ]) &&
                fileHasAll(root, "docs/developer/DESIGN_SPEC.md", [
                  "Design Spec Compatibility Pointer",
                  "Harness checks require this file to stay a pointer",
                ]),
              "DESIGN.md, docs/design/README.md, docs/design/design-spec.md, docs/developer/DESIGN_SPEC.md",
            ),
            check(
              "Developer architecture guide exists",
              exists(root, "docs/developer/ARCHITECTURE.md"),
              "docs/developer/ARCHITECTURE.md",
            ),
            check(
              "Verification commands are discoverable",
              fileHasAny(root, "AGENTS.md", ["npm run harness:check"]) &&
                fileHasAny(root, "docs/harness/verification-matrix.md", ["npm run harness:check"]),
              "AGENTS.md, docs/harness/verification-matrix.md",
            ),
            check(
              "Privacy and responsible AI constraints are linked",
              fileHasAll(root, "docs/harness/README.md", ["PRIVACY.md", "RESPONSIBLE_AI.md"]),
              "docs/harness/README.md",
            ),
          ],
        },
        {
          name: "State",
          checks: [
            check("Active status exists", exists(root, "docs/plans/active/status.md"), "docs/plans/active/status.md"),
            check(
              "Active state has next best work",
              fileHasAll(root, "docs/plans/active/status.md", ["## Next Best Work", "## Completion Bar"]),
              "docs/plans/active/status.md",
            ),
            check(
              "Plan index lists active workstreams",
              activePlanIndexWorkstreamCount(root) >= 2,
              "docs/plans/index.json",
            ),
            check(
              "Active state carries redesign contract",
                fileHasAll(root, "docs/plans/index.json", [
                  "Quiet Shield redesign",
                  "DESIGN.md",
                  "docs/design/README.md",
                  "docs/design/design-spec.md",
                  "Computer Use or Playwright screenshot proof",
                ]) &&
                fileHasAll(root, "docs/plans/active/current-work.md", [
                  "Locked redesign",
                  "DESIGN.md",
                  "docs/design/README.md",
                  "docs/design/design-spec.md",
                ]),
              "docs/plans/index.json, docs/plans/active/current-work.md",
            ),
            check(
              "Current active plan captures restart evidence",
              exists(root, "docs/plans/active/current-work.md") &&
                fileHasAll(root, "docs/plans/active/current-work.md", ["## Handoff", "## Sensors"]),
              "docs/plans/active/current-work.md",
            ),
            check(
              "Active state stays within context budget",
              startupContextStaysBounded(root),
              "docs/harness/README.md, docs/plans/active/status.md, docs/plans/active/current-work.md",
            ),
            check("Tech-debt tracker exists", exists(root, "docs/plans/tech-debt-tracker.md"), "docs/plans/tech-debt-tracker.md"),
          ],
        },
        {
          name: "Verification",
          checks: [
            check("Harness check command exists", hasScript(root, "harness:check"), "package.json"),
            check("Harness score command exists", hasScript(root, "harness:score"), "package.json"),
            check("Harness benchmark command exists", hasScript(root, "harness:benchmark"), "package.json"),
            check("Harness plan command exists", hasScript(root, "harness:plan"), "package.json"),
            check("Script test command exists", hasScript(root, "test:scripts"), "package.json"),
            check(
              "Verification matrix lists exact commands",
              fileHasAll(root, "docs/harness/verification-matrix.md", ["npm run harness:check", "npm run test:run"]),
              "docs/harness/verification-matrix.md",
            ),
            check(
              "Harness check is backed by focused tests",
              exists(root, "scripts/tests/check-harness-policy.test.mjs") &&
                exists(root, "scripts/tests/harness-score.test.mjs"),
              "scripts/tests/check-harness-policy.test.mjs, scripts/tests/harness-score.test.mjs",
            ),
          ],
        },
        {
          name: "Scope",
          checks: [
            check(
              "Change contract requires scope",
              fileHasAll(root, "docs/harness/change-contract.md", ["Scope:", "Out of scope:"]),
              "docs/harness/change-contract.md",
            ),
            check(
              "Plan template separates in-scope and out-of-scope work",
              fileHasAll(root, "docs/plans/templates/exec-plan-template.md", ["In scope:", "Out of scope:"]),
              "docs/plans/templates/exec-plan-template.md",
            ),
            check(
              "Acceptance criteria include user ease and verification",
              fileHasAll(root, "docs/plans/templates/exec-plan-template.md", [
                "User-ease result:",
                "Verification result:",
              ]),
              "docs/plans/templates/exec-plan-template.md",
            ),
            check(
              "Rule 0 blocks privacy/security scope creep",
              fileHasAll(root, "docs/harness/README.md", ["Rule 0 wins"]),
              "docs/harness/README.md",
            ),
            check(
              "Product boundaries are enforced by sensors",
              hasScripts(root, ["lint:external-ai", "lint:bloat"]) &&
                fileHasAll(root, "scripts/checks/harness.mjs", ["checkExternalAiGateway", "checkRepoBloat"]),
              "package.json, scripts/checks/harness.mjs",
            ),
          ],
        },
        {
          name: "Lifecycle",
          checks: [
            check("Session command exists", hasScript(root, "harness:session"), "package.json"),
            check(
              "Session command is tested",
              exists(root, "scripts/tests/harness-session.test.mjs"),
              "scripts/tests/harness-session.test.mjs",
            ),
            check(
              "Score command is tested",
              exists(root, "scripts/tests/harness-score.test.mjs"),
              "scripts/tests/harness-score.test.mjs",
            ),
            check(
              "Benchmark command is tested",
              exists(root, "scripts/tests/harness-benchmark.test.mjs"),
              "scripts/tests/harness-benchmark.test.mjs",
            ),
            check(
              "Harness guide gives operating loop",
              fileHasAll(root, "docs/harness/README.md", ["## Operating Loop", "Update docs and plan state"]),
              "docs/harness/README.md",
            ),
            check(
              "Scorecard records observed performance change",
              fileHasAll(root, "docs/harness/archive/five-tuple-scorecard-2026-06-01.md", [
                "Observed performance change",
                "npm run harness:score",
              ]),
              "docs/harness/archive/five-tuple-scorecard-2026-06-01.md",
            ),
          ],
        },
      ],
    },
  ];
}

export function summarizeHarnessScore(root = defaultRoot) {
  const frameworks = buildFrameworks(root).map(scoreFramework);
  const overall = Math.round(
    frameworks.reduce((sum, framework) => sum + framework.overall, 0) / frameworks.length,
  );

  return {
    overall,
    frameworks,
    allPerfect: frameworks.every((framework) => framework.allPerfect),
  };
}

export function formatHarnessScoreReport(summary) {
  const lines = [
    "JobSentinel five-tuple harness score",
    `Overall: ${summary.overall}/100`,
    `Status: ${summary.allPerfect ? "all subsystems 5/5" : "incomplete"}`,
    "",
  ];

  for (const framework of summary.frameworks) {
    lines.push(`${framework.name}: ${framework.overall}/100`);
    lines.push(`Source: ${framework.source}`);
    lines.push(`Tuple: ${framework.tuple.join(", ")}`);
    lines.push(`Bottleneck: ${framework.allPerfect ? "none" : framework.bottleneck}`);

    for (const subsystem of framework.subsystems) {
      lines.push(`- ${subsystem.name}: ${subsystem.score}/5 (${subsystem.passed}/${subsystem.total})`);
      for (const item of subsystem.checks) {
        lines.push(`  ${item.pass ? "PASS" : "FAIL"} ${item.label} [${item.evidence}]`);
      }
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

if (process.argv[1] === scriptPath) {
  const rootArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const root = rootArg ? resolve(rootArg) : defaultRoot;
  const summary = summarizeHarnessScore(root);

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(formatHarnessScoreReport(summary));
  }

  if (!summary.allPerfect && !process.argv.includes("--allow-incomplete")) {
    process.exitCode = 1;
  }
}
