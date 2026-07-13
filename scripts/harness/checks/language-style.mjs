import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const prohibitedTerms = [
  {
    label: "prohibited exclusion term",
    pattern: new RegExp(["black", "list"].join(""), "i"),
  },
  {
    label: "prohibited inclusion term",
    pattern: new RegExp(["white", "list"].join(""), "i"),
  },
  {
    label: "prohibited hierarchy term",
    pattern: new RegExp(["sl", "ave"].join(""), "i"),
  },
];

const ignoredPathPrefixes = [
  ".git/",
  ".vale/",
  "coverage/",
  "dist/",
  "node_modules/",
  "playwright-report/",
  "src-tauri/target/",
  "target/",
  "test-results/",
  "tmp/",
];

function listRepositoryFiles(root) {
  return execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean);
}

function isIgnoredPath(path) {
  return ignoredPathPrefixes.some((prefix) => path.startsWith(prefix));
}

export function collectLanguageStyleViolations(
  root,
  paths = listRepositoryFiles(root),
) {
  const violations = [];

  for (const path of paths) {
    if (isIgnoredPath(path)) continue;

    const fullPath = join(root, path);
    if (!existsSync(fullPath)) continue;

    const content = readFileSync(fullPath);
    if (content.includes(0)) continue;

    const lines = content.toString("utf8").split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      for (const term of prohibitedTerms) {
        if (term.pattern.test(line)) {
          violations.push(`${path}:${index + 1} ${term.label}`);
        }
      }
    }
  }

  return violations;
}
