// Checks repository language while retaining exact reviewed retired wire-key literals.
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
  "target/",
  "target/",
  "test-results/",
  "tmp/",
];

const retiredConfigKeyLiteral = /"company_(?:white|black)list"/g;
const retiredKeyLiteralsByPath = new Map([
  ["crates/jobsentinel-application/src/config/io.rs", retiredConfigKeyLiteral],
  ["crates/jobsentinel-application/src/config/tests/persistence_tests.rs", retiredConfigKeyLiteral],
  ["src-tauri/src/ipc/config/tests.rs", retiredConfigKeyLiteral],
  ["crates/jobsentinel-storage/src/user_data/tests.rs", /"company(?:White|Black)list"/g],
]);

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
    const retiredKeyLiterals = retiredKeyLiteralsByPath.get(path);
    for (const [index, line] of lines.entries()) {
      const checkedLine = retiredKeyLiterals ? line.replace(retiredKeyLiterals, "") : line;
      for (const term of prohibitedTerms) {
        if (term.pattern.test(checkedLine)) {
          violations.push(`${path}:${index + 1} ${term.label}`);
        }
      }
    }
  }

  return violations;
}
