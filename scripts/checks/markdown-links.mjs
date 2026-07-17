#!/usr/bin/env node

import {
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "../..");

function collectMarkdownFiles(root) {
  const files = [];
  const readDirectory = (directory) => {
    if (!existsSync(directory)) return;

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "archive") continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        readDirectory(path);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(path);
      }
    }
  };

  const readme = join(root, "README.md");
  if (existsSync(readme)) files.push(readme);
  readDirectory(join(root, "docs"));
  return files.sort();
}

function stripCode(line) {
  return line.replace(/`[^`]*`/g, "");
}

function localTarget(destination) {
  const unwrapped =
    destination.startsWith("<") && destination.endsWith(">")
      ? destination.slice(1, -1)
      : destination;

  if (
    unwrapped.startsWith("#") ||
    unwrapped.startsWith("?") ||
    unwrapped.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(unwrapped)
  ) {
    return null;
  }

  const path = unwrapped.split(/[?#]/, 1)[0];
  if (!path) return null;

  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function targetViolation(root, source, lineNumber, destination) {
  const target = localTarget(destination);
  if (target === null) return null;

  const resolvedTarget = target.startsWith("/")
    ? resolve(root, target.slice(1))
    : resolve(dirname(source), target);
  const rootPrefix = `${resolve(root)}${sep}`;
  const sourcePath = relative(root, source).replaceAll(sep, "/");

  if (resolvedTarget !== resolve(root) && !resolvedTarget.startsWith(rootPrefix)) {
    return `${sourcePath}:${lineNumber} links outside the repository: ${destination}`;
  }
  if (!existsSync(resolvedTarget)) {
    return `${sourcePath}:${lineNumber} links to missing local target ${destination}`;
  }
  return null;
}

export function collectMarkdownLinkViolations(root = defaultRoot) {
  const violations = [];
  const inlineLinkPattern =
    /!?\[[^\]]*]\(\s*(<[^>]+>|[^)\s]+)(?:\s+[^)]*)?\)/g;
  const referenceDefinitionPattern =
    /^\s*\[[^\]]+]:\s*(<[^>]+>|[^\s]+)(?:\s+.*)?$/;

  for (const source of collectMarkdownFiles(root)) {
    const lines = readFileSync(source, "utf8").split(/\r?\n/);
    let fenceMarker = null;

    for (const [index, rawLine] of lines.entries()) {
      const fenceMatch = rawLine.match(/^\s*(```|~~~)/);
      if (fenceMatch) {
        fenceMarker = fenceMarker === null ? fenceMatch[1] : null;
        continue;
      }
      if (fenceMarker !== null) continue;

      const line = stripCode(rawLine);
      const destinations = [];
      for (const match of line.matchAll(inlineLinkPattern)) {
        destinations.push(match[1]);
      }
      const referenceMatch = line.match(referenceDefinitionPattern);
      if (referenceMatch) destinations.push(referenceMatch[1]);

      for (const destination of destinations) {
        const violation = targetViolation(
          root,
          source,
          index + 1,
          destination,
        );
        if (violation) violations.push(violation);
      }
    }
  }

  return violations;
}

function main() {
  const violations = collectMarkdownLinkViolations();
  if (violations.length === 0) {
    console.log("Maintained local Markdown links resolve.");
    return;
  }

  console.error("Maintained Markdown link check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main();
}
