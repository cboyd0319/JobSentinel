import assert from "node:assert/strict";
import test from "node:test";

import { collectChangedFiles, formatHarnessPlan, summarizeHarnessPlan } from "../../harness/plan.mjs";
import { classifyVerificationPath } from "../../harness/plan-paths.mjs";

function commandsFor(plan) {
  return plan.commands.map((entry) => entry.command);
}

test("routes every previously bypassed harness and configuration path", () => {
  const plan = summarizeHarnessPlan("/repo", {
    changedFiles: [
      ".nvmrc",
      ".github/CODEOWNERS",
      ".husky/pre-commit",
      ".sqlx/query.json",
      ".storybook/main.ts",
      "Cargo.toml",
      "crates/jobsentinel-domain/Cargo.toml",
      "playwright.config.ts",
      "scripts/harness/contracts/repository-structure.json",
    ],
  });
  const commands = commandsFor(plan);
  for (const required of [
    "npm run harness:check",
    "npm run lint:file-size",
    "npm run test:scripts",
    "npm run lint:deps",
    "npm run lint:architecture",
    "npm run typecheck",
    "npm run doctor:e2e",
    "npm run test:e2e:smoke",
    "npm run lint:sqlx",
    "npm run verify:rust",
    "npm run lint:security",
  ]) assert.ok(commands.includes(required), `missing ${required}`);
  assert.equal(plan.workflowFlags.harness, true);
  assert.equal(plan.workflowFlags.frontend, true);
  assert.equal(plan.workflowFlags.rust, true);
  assert.equal(plan.workflowFlags.security, true);
  assert.equal(plan.workflowFlags.e2e, true);
});

test("unknown paths fail closed to the full lane", () => {
  const plan = summarizeHarnessPlan("/repo", { changedFiles: ["unexpected-owner/new.file"] });
  assert.ok(commandsFor(plan).includes("npm run verify:full"));
  assert.equal(plan.workflowFlags.full, true);
  assert.match(formatHarnessPlan(plan), /Path has no verified owner/);
});

test("release workflow changes always select security verification", () => {
  const plan = summarizeHarnessPlan("/repo", { changedFiles: [".github/workflows/release.yml"] });
  assert.ok(commandsFor(plan).includes("npm run lint:security"));
  assert.equal(plan.workflowFlags.security, true);
});

test("skill-only changes select the skill package validator", () => {
  const plan = summarizeHarnessPlan("/repo", { changedFiles: ["skills/resume-tailoring/SKILL.md"] });
  assert.ok(commandsFor(plan).includes("npm run lint:skills"));
  assert.equal(plan.workflowFlags.skills, true);
});

test("Playwright configuration changes select the composite TypeScript build", () => {
  const plan = summarizeHarnessPlan("/repo", { changedFiles: ["playwright.config.ts"] });
  assert.ok(commandsFor(plan).includes("npm run typecheck"));
});

test("normalizes Windows path separators before routing", () => {
  const row = classifyVerificationPath("src\\app\\App.tsx");
  assert.equal(row.path, "src/app/App.tsx");
  assert.ok(row.flags.includes("frontend"));
});

test("invalid comparison bases fail closed", () => {
  assert.throws(
    () => collectChangedFiles("/repo", {
      since: "not-a-ref",
      execFileSync: (_command, args) => {
        if (args[0] === "diff" && args.at(-1) === "not-a-ref...HEAD") {
          const error = new Error("bad revision");
          error.stderr = "fatal: bad revision";
          throw error;
        }
        return "";
      },
    }),
    /git diff .* failed: fatal: bad revision/,
  );
});

test("changed-file collection includes base, staged, unstaged, deleted, and untracked paths", () => {
  const seen = [];
  const files = collectChangedFiles("/repo", {
    since: "base",
    execFileSync: (_command, args) => {
      seen.push(args.join(" "));
      if (args.at(-1) === "base...HEAD") return "committed.ts\ndeleted.ts\n";
      if (args.includes("--cached")) return "staged.ts\n";
      if (args[0] === "diff") return "unstaged.ts\n";
      return "untracked.ts\n";
    },
  });
  assert.deepEqual(files, ["committed.ts", "deleted.ts", "staged.ts", "unstaged.ts", "untracked.ts"]);
  assert.ok(seen.some((args) => args.includes("--diff-filter=ACDMRTUXB")));
});

test("no diff selects only restart-state validation", () => {
  const plan = summarizeHarnessPlan("/repo", { changedFiles: [] });
  assert.deepEqual(commandsFor(plan), ["npm run harness:session"]);
});
