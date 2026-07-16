import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const workflowDirectory = ".github/workflows";
const floatingRunnerLabelPattern = /\b(?:ubuntu|windows|macos)-latest\b/;

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

function continuedShellCommand(lines, startIndex) {
  const parts = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    parts.push(line.replace(/\\\s*$/, "").trim());

    if (!/\\\s*$/.test(line)) {
      break;
    }
  }

  return parts.join(" ");
}

function aptInstallTokens(command) {
  const match = command.match(/\bapt-get\s+install\s+(.+)$/);
  if (!match) {
    return [];
  }

  const tokens = [];
  for (const rawToken of match[1].split(/\s+/)) {
    const token = rawToken.trim().replace(/^['"]|['"]$/g, "");
    if (!token || token === "\\" || token === "sudo") {
      continue;
    }

    if (["&&", ";", "|"].includes(token)) {
      break;
    }

    if (token.startsWith("-")) {
      continue;
    }

    tokens.push(token);
  }

  return tokens;
}

function isExactAptPackageSpec(token) {
  return /^[A-Za-z0-9][A-Za-z0-9+.-]*=[A-Za-z0-9][A-Za-z0-9:.+~_-]*$/.test(token);
}

export function collectWorkflowEnvironmentPinViolations(root) {
  const violations = [];

  for (const path of workflowFiles(root)) {
    const lines = readText(root, path).split(/\r?\n/);
    lines.forEach((line, index) => {
      const floatingRunner = line.match(floatingRunnerLabelPattern)?.[0];
      if (floatingRunner) {
        violations.push(
          `${path}:${index + 1} workflow runner labels must pin an explicit OS version, found ${floatingRunner}`,
        );
      }

      if (!/\bapt-get\s+install\b/.test(line)) {
        return;
      }

      for (const token of aptInstallTokens(continuedShellCommand(lines, index))) {
        if (!isExactAptPackageSpec(token)) {
          violations.push(
            `${path}:${index + 1} apt-get install package ${token} must include an exact distro version pin such as name=version`,
          );
        }
      }
    });
  }

  return violations;
}
