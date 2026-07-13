#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

function parseArgs(argv) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

    if (inlineValue !== undefined) {
      args[key] = inlineValue;
    } else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
      args[key] = argv[index + 1];
      index += 1;
    } else {
      args[key] = true;
    }
  }

  return args;
}

function normalizeRepoPath(path) {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function safeGit(root, args, exec = execFileSync) {
  try {
    return exec("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

function addGitPaths(files, output) {
  for (const line of output.split(/\r?\n/)) {
    const path = normalizeRepoPath(line);
    if (path !== "") {
      files.add(path);
    }
  }
}

export function collectChangedFiles(root = defaultRoot, options = {}) {
  const exec = options.execFileSync ?? execFileSync;
  const files = new Set();

  if (options.since) {
    addGitPaths(
      files,
      safeGit(root, ["diff", "--name-only", "--diff-filter=ACMRTUXB", `${options.since}...HEAD`], exec),
    );
  }

  addGitPaths(files, safeGit(root, ["diff", "--cached", "--name-only", "--diff-filter=ACMRTUXB"], exec));
  addGitPaths(files, safeGit(root, ["diff", "--name-only", "--diff-filter=ACMRTUXB"], exec));
  addGitPaths(files, safeGit(root, ["ls-files", "--others", "--exclude-standard"], exec));

  return [...files].sort();
}

function isMarkdown(path) {
  return path.endsWith(".md");
}

function isSourceFile(path) {
  return /\.(ts|tsx)$/.test(path);
}

function isFrontendTest(path) {
  return /\.(test|spec)\.(ts|tsx)$/.test(path);
}

function isRustSource(path) {
  return (
    (path.startsWith("src-tauri/src/") || /^crates\/[^/]+\/src\//.test(path)) &&
    path.endsWith(".rs")
  );
}

function rustPackageForPath(path) {
  const crateMatch = path.match(/^crates\/([^/]+)\//);
  return crateMatch?.[1] ?? "jobsentinel";
}

function isE2ePath(path) {
  return (
    path.startsWith("tests/e2e/") ||
    path.startsWith("e2e/") ||
    path === "playwright.config.ts" ||
    path === "scripts/run-playwright.mjs" ||
    path === "scripts/tests/run-playwright.test.mjs"
  );
}

function isHarnessPath(path) {
  return (
    path === "AGENTS.md" ||
    path === "CLAUDE.md" ||
    path === ".github/copilot-instructions.md" ||
    path === "README.md" ||
    path === "DESIGN.md" ||
    path === "package.json" ||
    path === "package-lock.json" ||
    path.startsWith("docs/design/") ||
    path.startsWith("docs/harness/") ||
    path.startsWith("docs/plans/") ||
    path === "docs/plans/index.json" ||
    path.startsWith(".github/workflows/") ||
    path.startsWith(".github/ISSUE_TEMPLATE/") ||
    path.startsWith("scripts/")
  );
}

function isUserFacingPath(path) {
  return (
    path === "README.md" ||
    path === "DESIGN.md" ||
    path.startsWith("docs/design/") ||
    path.startsWith("docs/user/") ||
    path.startsWith("docs/features/") ||
    path.startsWith(".github/ISSUE_TEMPLATE/") ||
    path.startsWith("examples/profiles/") ||
    path.startsWith("src/features/") ||
    path.startsWith("src/pages/") ||
    path.startsWith("src/components/")
  );
}

function isDesignOrVisualPath(path) {
  return (
    path === "DESIGN.md" ||
    path.startsWith("docs/design/") ||
    path.startsWith("src/features/") ||
    path.startsWith("src/pages/") ||
    path.startsWith("src/components/")
  );
}

function isPrivacyOrSecurityPath(path) {
  const lowerPath = path.toLowerCase();

  return (
    path === "PRIVACY.md" ||
    path === "RESPONSIBLE_AI.md" ||
    path === "SECURITY.md" ||
    path === "src/services/aiGateway.ts" ||
    path === "scripts/check-external-ai-gateway.mjs" ||
    path === "scripts/check-security-sensors.mjs" ||
    path.startsWith("docs/security/") ||
    path.startsWith("docs/architecture/privacy-first-ai-gateway.md") ||
    lowerPath.includes("credential") ||
    lowerPath.includes("privacy") ||
    lowerPath.includes("security") ||
    lowerPath.includes("auth") ||
    lowerPath.includes("token")
  );
}

function isTauriInvokePath(path) {
  return (
    path === "src-tauri/src/main.rs" ||
    path === "src-tauri/src/command_handlers.rs" ||
    path.startsWith("src-tauri/src/commands/") ||
    path === "scripts/check-tauri-invokes.mjs" ||
    path === "scripts/tests/check-tauri-invokes.test.mjs" ||
    path.startsWith("src/mocks/") ||
    path.startsWith("src/utils/api") ||
    path.startsWith("src/services/feedbackService") ||
    path.startsWith("src/services/deeplinks")
  );
}

function addCommand(commands, command, reason, path) {
  if (!commands.has(command)) {
    commands.set(command, {
      command,
      reasons: new Set(),
      paths: new Set(),
    });
  }

  const entry = commands.get(command);
  entry.reasons.add(reason);

  if (path) {
    entry.paths.add(path);
  }
}

function commandRank(command) {
  if (command === "npm run harness:session") return 5;
  if (command === "npm run harness:check") return 10;
  if (command === "npm run lint:md") return 20;
  if (command === "npm run test:scripts") return 30;
  if (command.startsWith("node --test ")) return 31;
  if (command === "npm run lint") return 40;
  if (command.startsWith("npm run test:run -- ")) return 50;
  if (command === "npm run test:run") return 51;
  if (command === "npm run lint:bloat") return 60;
  if (command === "npm run doctor:e2e") return 70;
  if (command.startsWith("npm run test:e2e -- ")) return 80;
  if (command === "npm run test:e2e:smoke") return 81;
  if (command === "cd src-tauri && cargo fmt --all -- --check") return 90;
  if (command === "cd src-tauri && cargo clippy -- -D warnings") return 91;
  if (command === "cd src-tauri && cargo test --lib") return 92;
  if (command === "cargo fmt --all -- --check") return 90;
  if (command === "cargo clippy --workspace -- -D warnings") return 91;
  if (command.startsWith("cargo test -p ")) return 92;
  if (command === "npm run lint:tauri-invokes") return 93;
  if (command.includes("cargo sqlx prepare")) return 94;
  if (command === "npm run lint:external-ai") return 100;
  if (command === "npm run lint:security") return 101;
  if (command === "npm audit") return 110;
  if (command === "npm run build") return 111;
  return 1000;
}

function maybeExistingPath(root, path) {
  return existsSync(join(root, path));
}

function frontendTestCandidates(path) {
  const extension = extname(path);
  const stem = path.slice(0, -extension.length);
  const candidates = [];

  if (extension === ".tsx") {
    candidates.push(`${stem}.test.tsx`, `${stem}.test.ts`);
  } else if (extension === ".ts") {
    candidates.push(`${stem}.test.ts`, `${stem}.test.tsx`);
  }

  return candidates;
}

function addFrontendTestCommands(root, commands, path) {
  if (isFrontendTest(path)) {
    addCommand(commands, `npm run test:run -- ${path}`, "Run changed frontend test file.", path);
    return;
  }

  const candidates = frontendTestCandidates(path).filter((candidate) => maybeExistingPath(root, candidate));

  if (candidates.length > 0) {
    for (const candidate of candidates) {
      addCommand(commands, `npm run test:run -- ${candidate}`, "Run adjacent frontend test.", path);
    }
  } else {
    addCommand(commands, "npm run test:run", "No adjacent frontend test found; run unit suite.", path);
  }
}

function scriptTestPath(root, path) {
  if (/\.test\.mjs$/.test(path)) {
    return path;
  }

  if (!path.endsWith(".mjs")) {
    return null;
  }

  const directPath = path.startsWith("scripts/security/")
    ? path.replace(/^scripts\/security\/(.+)\.mjs$/u, "scripts/security/tests/$1.test.mjs")
    : path.replace(/^scripts\/(.+)\.mjs$/u, "scripts/tests/$1.test.mjs");
  if (maybeExistingPath(root, directPath)) {
    return directPath;
  }

  if (path.startsWith("scripts/harness/checks/")) {
    const moduleName = basename(path, ".mjs");
    const checkPath = `scripts/tests/check-${moduleName}.test.mjs`;
    if (maybeExistingPath(root, checkPath)) {
      return checkPath;
    }
  }

  return null;
}

function addScriptCommands(root, commands, path) {
  addCommand(commands, "npm run test:scripts", "Run harness and utility script tests.", path);

  const focusedScriptTestPath = scriptTestPath(root, path);
  if (focusedScriptTestPath) {
    addCommand(commands, `node --test ${focusedScriptTestPath}`, "Run focused script test.", path);
  }
}

export function summarizeHarnessPlan(root = defaultRoot, options = {}) {
  const changedFiles =
    options.changedFiles?.map(normalizeRepoPath).filter((path) => path !== "").sort() ??
    collectChangedFiles(root, options);
  const commands = new Map();
  const notes = [];

  for (const path of changedFiles) {
    if (isHarnessPath(path)) {
      addCommand(commands, "npm run harness:check", "Harness, plan, workflow, or script surface changed.", path);
    }

    if (isMarkdown(path)) {
      addCommand(commands, "npm run lint:md", "Markdown changed.", path);
    }

    if (path.startsWith("scripts/")) {
      addScriptCommands(root, commands, path);
    }

    if (path === "package.json") {
      addCommand(commands, "npm run harness:check", "Package scripts or dependency metadata changed.", path);
      notes.push("If dependencies changed, run the affected package-manager command before product checks.");
    }

    if (path === "package-lock.json") {
      addCommand(commands, "npm audit", "Dependency lockfile changed.", path);
      addCommand(commands, "npm run build", "Dependency lockfile changed.", path);
    }

    if (path.startsWith("src/") && isSourceFile(path)) {
      addCommand(commands, "npm run lint", "Frontend source changed.", path);
      addFrontendTestCommands(root, commands, path);
    }

    if (isUserFacingPath(path)) {
      addCommand(commands, "npm run lint:bloat", "User-facing copy or fixture surface changed.", path);
    }

    if (isDesignOrVisualPath(path)) {
      notes.push(
        "Manual visual proof required: use Computer Use or Playwright screenshots for touched routes, modals, toasts, settings, keyboard flow, and narrow-width states.",
      );
    }

    if (isE2ePath(path)) {
      addCommand(commands, "npm run doctor:e2e", "Playwright or E2E readiness changed.", path);
      if (/\.(spec|test)\.(ts|tsx)$/.test(path) && !path.startsWith("scripts/")) {
        addCommand(commands, `npm run test:e2e -- ${path}`, "Run changed Playwright spec.", path);
      } else {
        addCommand(commands, "npm run test:e2e:smoke", "E2E harness or config changed.", path);
      }
    }

    if (isRustSource(path)) {
      if (existsSync(join(root, "Cargo.toml"))) {
        addCommand(commands, "cargo fmt --all -- --check", "Workspace Rust source changed.", path);
        addCommand(
          commands,
          "cargo clippy --workspace -- -D warnings",
          "Workspace Rust source changed.",
          path,
        );
        addCommand(
          commands,
          `cargo test -p ${rustPackageForPath(path)}`,
          "Run the owning workspace crate tests.",
          path,
        );
      } else {
        addCommand(commands, "cd src-tauri && cargo fmt --all -- --check", "Rust source changed.", path);
        addCommand(commands, "cd src-tauri && cargo clippy -- -D warnings", "Rust source changed.", path);
        addCommand(commands, "cd src-tauri && cargo test --lib", "Rust source changed.", path);
      }
    }

    if (
      path.startsWith("src-tauri/migrations/") ||
      /^crates\/[^/]+\/migrations\//.test(path)
    ) {
      if (existsSync(join(root, "Cargo.toml"))) {
        addCommand(
          commands,
          'DATABASE_URL="sqlite:jobs.db" cargo sqlx prepare --workspace',
          "Workspace SQLite migration changed.",
          path,
        );
        addCommand(
          commands,
          `cargo test -p ${rustPackageForPath(path)}`,
          "Run the migration owner tests.",
          path,
        );
      } else {
        addCommand(commands, 'cd src-tauri && DATABASE_URL="sqlite:jobs.db" cargo sqlx prepare', "SQLite migration changed.", path);
        addCommand(commands, "cd src-tauri && cargo test --lib", "SQLite migration changed.", path);
      }
    }

    if (isTauriInvokePath(path)) {
      addCommand(commands, "npm run lint:tauri-invokes", "Tauri command or invoke surface changed.", path);
    }

    if (path === "src/services/aiGateway.ts" || path === "scripts/check-external-ai-gateway.mjs") {
      addCommand(commands, "npm run lint:external-ai", "External AI gateway or sensor changed.", path);
    }

    if (isPrivacyOrSecurityPath(path)) {
      addCommand(commands, "npm run lint:security", "Privacy or security surface changed.", path);
    }
  }

  if (changedFiles.length === 0) {
    addCommand(commands, "npm run harness:session", "No changed files detected; capture restart state.", "");
  }

  return {
    root,
    since: options.since ?? null,
    changedFiles,
    commands: [...commands.values()]
      .sort(
        (left, right) =>
          commandRank(left.command) - commandRank(right.command) ||
          left.command.localeCompare(right.command),
      )
      .map((entry) => ({
        command: entry.command,
        reasons: [...entry.reasons].sort(),
        paths: [...entry.paths].sort(),
      })),
    notes: [...new Set(notes)].sort(),
  };
}

export function formatHarnessPlan(plan) {
  const lines = [
    "Harness Verification Plan",
    `Scope: ${plan.since ? `changed files since ${plan.since} plus dirty working tree` : "dirty working tree"}`,
    `Changed files: ${plan.changedFiles.length}`,
  ];

  if (plan.changedFiles.length > 0) {
    lines.push("Files:");
    lines.push(...plan.changedFiles.map((path) => `- ${path}`));
  }

  lines.push("Commands:");
  for (const [index, entry] of plan.commands.entries()) {
    lines.push(`${index + 1}. ${entry.command}`);
    lines.push(`   Reason: ${entry.reasons.join("; ")}`);
    if (entry.paths.length > 0) {
      lines.push(`   Paths: ${entry.paths.join(", ")}`);
    }
  }

  if (plan.notes.length > 0) {
    lines.push("Notes:");
    lines.push(...plan.notes.map((note) => `- ${note}`));
  }

  return lines.join("\n");
}

if (process.argv[1] === scriptPath) {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(
      [
        "Usage: node scripts/harness-plan.mjs [ROOT] [--since REF] [--json]",
        "",
        "Prints a diff-aware verification command plan from changed repo paths.",
        "Example: npm run harness:plan -- --since origin/main",
      ].join("\n"),
    );
    process.exit(0);
  }

  const rootArg = args._[0];
  const root = rootArg ? resolve(rootArg) : defaultRoot;
  const plan = summarizeHarnessPlan(root, { since: args.since ? String(args.since) : undefined });

  if (args.json) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log(formatHarnessPlan(plan));
  }
}
