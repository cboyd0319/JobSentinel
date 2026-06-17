import { spawnSync } from "node:child_process";

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

export function collectNpmCompatibleUpdateViolations(root, { spawn = spawnSync } = {}) {
  const result = spawn(
    npmCommand(),
    ["update", "--package-lock-only", "--dry-run", "--ignore-scripts"],
    {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10,
    },
  );

  if (result.error) {
    return [`npm update dry-run failed: ${result.error.message}`];
  }

  if (result.status !== 0) {
    return [
      `npm update dry-run exited ${result.status}: ${String(result.stderr || result.stdout).trim()}`,
    ];
  }

  const output = `${result.stdout}\n${result.stderr}`.trim();
  if (!output || output.includes("up to date")) {
    return [];
  }

  if (/\b(?:added|changed|removed|updated)\b/i.test(output)) {
    const firstLine = output.split(/\r?\n/).find(Boolean) ?? output;
    return [`package-lock.json has compatible updates pending: ${firstLine}`];
  }

  return [];
}

export function collectNpmCompatibleOutdatedViolations(root, { spawn = spawnSync } = {}) {
  const result = spawn(
    npmCommand(),
    ["outdated", "--all", "--json"],
    {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10,
    },
  );

  if (result.error) {
    return [`npm outdated --all failed: ${result.error.message}`];
  }

  if (result.status !== 0 && result.status !== 1) {
    return [
      `npm outdated --all exited ${result.status}: ${String(result.stderr || result.stdout).trim()}`,
    ];
  }

  const raw = String(result.stdout ?? "").trim();
  if (!raw) return [];

  let outdated;
  try {
    outdated = JSON.parse(raw);
  } catch (error) {
    return [`npm outdated --all returned invalid JSON: ${error.message}`];
  }

  const violations = [];
  for (const [name, value] of Object.entries(outdated)) {
    const entries = Array.isArray(value) ? value : [value];
    for (const entry of entries) {
      const current = entry?.current;
      const wanted = entry?.wanted;
      if (!current || !wanted || current === wanted) {
        continue;
      }

      const dependent = entry.dependent ? ` for ${entry.dependent}` : "";
      violations.push(
        `package-lock.json has compatible npm transitive drift${dependent}: ${name} is ${current}; wanted ${wanted}`,
      );
    }
  }

  return violations;
}
