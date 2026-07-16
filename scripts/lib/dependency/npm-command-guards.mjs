import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const scanRoots = [
  ".husky",
  ".github/workflows",
  "scripts",
  "docs/developer",
  "docs/security",
  "tests/e2e/README.md",
  "README.md",
];
const pinnedNpmCommand = "node scripts/harness/npm-pin.mjs";

function repoPath(root, path) {
  return join(root, path);
}

function listFiles(root, path, predicate) {
  const fullPath = repoPath(root, path);

  if (!existsSync(fullPath)) {
    return [];
  }

  if (!statSync(fullPath).isDirectory()) {
    return predicate(path) ? [path] : [];
  }

  const files = [];
  for (const entry of readdirSync(fullPath, { withFileTypes: true })) {
    const childPath = `${path}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...listFiles(root, childPath, predicate));
      continue;
    }

    if (predicate(childPath)) {
      files.push(childPath);
    }
  }

  return files.sort();
}

function readText(root, path) {
  return readFileSync(repoPath(root, path), "utf8");
}

function isPolicyFile(candidate) {
  if (candidate === "scripts/lib/dependency/npm-command-guards.mjs") {
    return false;
  }

  return (
    candidate.startsWith(".husky/") ||
    (!candidate.endsWith(".test.mjs") && /\.(?:md|mjs|sh|ya?ml)$/.test(candidate))
  );
}

function nearbyPinnedNpmCommand(lines, index) {
  return lines
    .slice(Math.max(0, index - 4), index + 1)
    .some((line) => line.includes(pinnedNpmCommand));
}

export function collectNpmCommandGuardViolations(root) {
  const violations = [];
  const npxInstallPattern = /(^|[\s`"'>|;&(])npx\s+(?!--no-install(?:\s|$))/;
  const npmInstallPattern = /(^|[\s`"'>|;&(])npm\s+(?:ci|install|i)\b/;

  for (const path of scanRoots.flatMap((rootPath) => listFiles(root, rootPath, isPolicyFile))) {
    const lines = readText(root, path).split(/\r?\n/);

    lines.forEach((line, index) => {
      if (npxInstallPattern.test(line)) {
        violations.push(
          `${path}:${index + 1} npx-based commands must include --no-install so repo-local pinned tools cannot fall back to registry installs`,
        );
      }

      if (
        !path.startsWith(".github/workflows/") &&
        !/^\s*#/.test(line) &&
        npmInstallPattern.test(line) &&
        !nearbyPinnedNpmCommand(lines, index)
      ) {
        violations.push(
          `${path}:${index + 1} npm install commands must run after \`${pinnedNpmCommand}\` so local setup uses the packageManager pin`,
        );
      }
    });
  }

  return violations;
}
