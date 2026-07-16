#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { classifyVerificationPath, normalizeRepoPath, workflowFlags } from "./plan-paths.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "../..");

function parseArgs(argv) {
  const options = { root: defaultRoot };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--help") options.help = true;
    else if (["--since", "--paths-file", "--github-output"].includes(arg)) {
      if (!argv[index + 1]) throw new Error(`${arg} requires a value`);
      options[arg.slice(2).replace(/-([a-z])/g, (_, value) => value.toUpperCase())] = argv[++index];
    } else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    else options.root = resolve(arg);
  }
  return options;
}

function git(root, args, exec = execFileSync) {
  try {
    return exec("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    const detail = String(error?.stderr ?? error?.message ?? error).trim();
    throw new Error(`git ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`);
  }
}

function addPaths(target, output) {
  for (const value of output.split(/\r?\n/)) {
    const path = normalizeRepoPath(value);
    if (path) target.add(path);
  }
}

export function collectChangedFiles(root = defaultRoot, options = {}) {
  const files = new Set();
  const exec = options.execFileSync ?? execFileSync;
  if (options.since) addPaths(files, git(root, ["diff", "--name-only", "--diff-filter=ACDMRTUXB", `${options.since}...HEAD`], exec));
  addPaths(files, git(root, ["diff", "--cached", "--name-only", "--diff-filter=ACDMRTUXB"], exec));
  addPaths(files, git(root, ["diff", "--name-only", "--diff-filter=ACDMRTUXB"], exec));
  addPaths(files, git(root, ["ls-files", "--others", "--exclude-standard"], exec));
  return [...files].sort();
}

function command(command, reason, paths) {
  return { command, reasons: [reason], paths: [...paths].sort() };
}

export function summarizeHarnessPlan(root = defaultRoot, options = {}) {
  const changedFiles = (options.changedFiles ?? collectChangedFiles(root, options)).map(normalizeRepoPath).filter(Boolean).sort();
  const classifications = changedFiles.map(classifyVerificationPath);
  const flags = workflowFlags(classifications);
  const pathsWith = (flag) => classifications.filter((row) => row.flags.includes(flag)).map((row) => row.path);
  const commands = [];
  if (changedFiles.length === 0) {
    commands.push(command("npm run harness:session", "No changed files; validate restart state.", []));
  } else {
    commands.push(command("npm run harness:check", "Every diff must preserve the harness and state contract.", changedFiles));
    commands.push(command("npm run lint:file-size", "Every maintained text file is size-governed.", changedFiles));
  }
  if (pathsWith("docs").length) commands.push(command("npm run lint:docs", "Documentation changed.", pathsWith("docs")));
  if (pathsWith("contracts").length) commands.push(command("npm run test:scripts", "Repository scripts or harness contracts changed.", pathsWith("contracts")));
  if (pathsWith("dependencies").length) commands.push(command("npm run lint:deps", "Dependency or runtime ownership changed.", pathsWith("dependencies")));
  const npmDependencyPaths = pathsWith("dependencies").filter((path) => path === "package.json" || path === "package-lock.json");
  if (npmDependencyPaths.length) {
    commands.push(command("npm audit --audit-level=moderate", "npm dependency metadata changed.", npmDependencyPaths));
    commands.push(command("npm run build", "npm dependency metadata changed.", npmDependencyPaths));
  }
  if (pathsWith("frontend").length) {
    commands.push(command("npm run lint:architecture", "Frontend ownership or configuration changed.", pathsWith("frontend")));
    commands.push(command("npm run typecheck", "Frontend types or configuration changed.", pathsWith("frontend")));
    commands.push(command("npm run lint", "Frontend source or configuration changed.", pathsWith("frontend")));
    commands.push(command("npm run test:run", "Frontend behavior may have changed.", pathsWith("frontend")));
  }
  if (pathsWith("e2e").length) {
    commands.push(command("npm run doctor:e2e", "Runtime journey tooling changed.", pathsWith("e2e")));
    commands.push(command("npm run test:e2e:smoke", "Run a representative runtime journey.", pathsWith("e2e")));
  }
  if (pathsWith("rust").length) {
    commands.push(command("npm run lint:architecture", "Workspace ownership or Rust source changed.", pathsWith("rust")));
    if (pathsWith("rust").some((path) => path.startsWith(".sqlx/") || path.includes("/migrations/"))) {
      commands.push(command("npm run lint:sqlx", "SQLx metadata or migrations changed.", pathsWith("rust")));
    }
    commands.push(command("npm run verify:rust", "Rust workspace behavior may have changed.", pathsWith("rust")));
  }
  if (pathsWith("security").length) commands.push(command("npm run lint:security", "Security-sensitive ownership changed.", pathsWith("security")));
  if (pathsWith("skills").length) commands.push(command("npm run lint:skills", "Repository-local skill package changed.", pathsWith("skills")));
  if (flags.full) commands.push(command("npm run verify:full", "Unclassified path requires the fail-closed full lane.", pathsWith("full")));
  return {
    root,
    since: options.since ?? null,
    changedFiles,
    classifications,
    workflowFlags: flags,
    commands,
    notes: classifications.flatMap((row) => row.reasons).filter((value, index, all) => all.indexOf(value) === index),
  };
}

export function formatHarnessPlan(plan) {
  const lines = [
    "Harness Verification Plan",
    `Scope: ${plan.since ? `since ${plan.since} plus staged, unstaged, and untracked files` : "staged, unstaged, and untracked files"}`,
    `Changed files: ${plan.changedFiles.length}`,
  ];
  if (plan.changedFiles.length) lines.push("Files:", ...plan.changedFiles.map((path) => `- ${path}`));
  lines.push("Commands:");
  for (const [index, row] of plan.commands.entries()) lines.push(`${index + 1}. ${row.command}`, `   Reason: ${row.reasons.join("; ")}`, ...(row.paths.length ? [`   Paths: ${row.paths.join(", ")}`] : []));
  if (plan.notes.length) lines.push("Notes:", ...plan.notes.map((note) => `- ${note}`));
  return lines.join("\n");
}

function pathsFromFile(root, path) {
  const fullPath = resolve(root, path);
  if (!existsSync(fullPath)) throw new Error(`paths file does not exist: ${path}`);
  return readFileSync(fullPath, "utf8").split(/\r?\n/).map(normalizeRepoPath).filter(Boolean);
}

function writeGitHubOutputs(path, flags) {
  appendFileSync(path, Object.entries(flags).map(([name, value]) => `${name}=${value}\n`).join(""), "utf8");
}

if (process.argv[1] === scriptPath) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log("Usage: npm run harness:plan -- [ROOT] [--since REF] [--paths-file FILE] [--github-output FILE] [--json]");
    } else {
      const changedFiles = options.pathsFile ? pathsFromFile(options.root, options.pathsFile) : undefined;
      const plan = summarizeHarnessPlan(options.root, { since: options.since, changedFiles });
      if (options.githubOutput) writeGitHubOutputs(options.githubOutput, plan.workflowFlags);
      console.log(options.json ? JSON.stringify(plan, null, 2) : formatHarnessPlan(plan));
    }
  } catch (error) {
    console.error(`Harness plan failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
