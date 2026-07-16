import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const workflowDirectory = ".github/workflows";
const installerPath = "scripts/install-pinned-npm.mjs";

function repoPath(root, path) {
  return join(root, path);
}

function workflowFiles(root) {
  const dir = repoPath(root, workflowDirectory);
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((file) => /\.(?:ya?ml)$/.test(file))
    .map((file) => `${workflowDirectory}/${file}`)
    .sort();
}

function readText(root, path) {
  return readFileSync(repoPath(root, path), "utf8");
}

export function collectWorkflowPinnedNpmViolations(root, npmVersion) {
  const violations = [];

  if (!npmVersion) {
    return violations;
  }

  if (!existsSync(repoPath(root, installerPath))) {
    violations.push(`${installerPath} is required so hosted automation can activate package.json npm@${npmVersion}`);
    return violations;
  }

  for (const path of workflowFiles(root)) {
    const lines = readText(root, path).split(/\r?\n/);
    let setupNodeLine = 0;
    let sawPinnedNpmInstall = false;

    lines.forEach((line, index) => {
      if (/\buses:\s*actions\/setup-node@/.test(line)) {
        setupNodeLine = index + 1;
        sawPinnedNpmInstall = false;
        return;
      }

      if (!setupNodeLine) {
        return;
      }

      if (line.includes(`node ${installerPath}`)) {
        sawPinnedNpmInstall = true;
        return;
      }

      if (/^\s*(?:-\s*)?name:/.test(line)) {
        return;
      }

      if (/(^|\s)npm\s+(?:audit|ci|run|test)\b/.test(line) && !sawPinnedNpmInstall) {
        violations.push(
          `${path}:${index + 1} npm commands after setup-node must first run \`node ${installerPath}\` so hosted automation uses package.json npm@${npmVersion}`,
        );
      }
    });
  }

  return violations;
}
