import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export function readText(root, path) {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) {
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

export function readJson(root, path) {
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

export function exists(root, path) {
  return existsSync(join(root, path));
}

export function countMatchingFiles(root, dirPath, pattern) {
  const fullPath = join(root, dirPath);
  if (!existsSync(fullPath)) {
    return 0;
  }

  return readdirSync(fullPath).filter((entry) => pattern.test(entry)).length;
}

export function countTextLines(text) {
  if (text.length === 0) {
    return 0;
  }

  const trailingNewlineAdjustment = /\r?\n$/.test(text) ? 1 : 0;
  return text.split(/\r?\n/).length - trailingNewlineAdjustment;
}

export function fileWithinBudget(root, path, maxLines, maxBytes) {
  const text = readText(root, path);
  if (!text) {
    return false;
  }

  return countTextLines(text) <= maxLines && Buffer.byteLength(text, "utf8") <= maxBytes;
}

export function startupContextStaysBounded(root) {
  return (
    fileWithinBudget(root, "AGENTS.md", 160, 8000) &&
    fileWithinBudget(root, "docs/harness/README.md", 160, 9000) &&
    fileWithinBudget(root, "docs/plans/active/status.md", 140, 9000) &&
    fileWithinBudget(root, "docs/plans/active/current-work.md", 220, 12000)
  );
}

export function fileHasAll(root, path, fragments) {
  const text = readText(root, path).toLowerCase();
  return fragments.every((fragment) => text.includes(fragment.toLowerCase()));
}

export function fileHasAny(root, path, fragments) {
  const text = readText(root, path).toLowerCase();
  return fragments.some((fragment) => text.includes(fragment.toLowerCase()));
}

export function packageScripts(root) {
  return readJson(root, "package.json")?.scripts ?? {};
}

export function hasScript(root, scriptName) {
  return Object.hasOwn(packageScripts(root), scriptName);
}

export function hasScripts(root, scriptNames) {
  const scripts = packageScripts(root);
  return scriptNames.every((scriptName) => Object.hasOwn(scripts, scriptName));
}

export function activePlanIndexWorkstreamCount(root) {
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

export function check(label, pass, evidence) {
  return {
    label,
    pass: Boolean(pass),
    evidence,
  };
}

export function scoreSubsystem(subsystem) {
  const passed = subsystem.checks.filter((item) => item.pass).length;
  return {
    ...subsystem,
    passed,
    total: subsystem.checks.length,
    score: Math.max(1, Math.round((passed / subsystem.checks.length) * 5)),
  };
}

export function scoreFramework(framework) {
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
