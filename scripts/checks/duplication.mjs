#!/usr/bin/env node

// DRY enforcement sensor. Detects duplicated runs of identical significant code
// lines and gates against a tool-generated baseline so new development cannot
// add duplication. Existing duplication is recorded debt, not approval.

import { execFileSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { classifyRustSource } from "./duplication-rust.mjs";

export { classifyRustSource } from "./duplication-rust.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "../..");
const contractPath = "scripts/harness/contracts/duplication.json";

const walkSkip = new Set([
  ".git",
  ".claude",
  "node_modules",
  "target",
  "gen",
  "dist",
]);

function loadContract(root) {
  return JSON.parse(readFileSync(join(root, contractPath), "utf8"));
}

function listCandidatePaths(root) {
  try {
    // Tracked plus untracked-not-ignored, so new working-tree files are gated
    // before they are committed; ignored paths stay excluded.
    const listed = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard"],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    )
      .split(/\r?\n/)
      .filter(Boolean);
    if (listed.length > 0) {
      return [...new Set(listed)];
    }
  } catch {
    // Not a git repo (e.g. test fixture); fall back to a directory walk.
  }

  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (walkSkip.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile())
        out.push(relative(root, full).replaceAll("\\", "/"));
    }
  };
  walk(root);
  return out;
}

export function listSourceFiles(root, scope) {
  const { dirs, extensions } = scope.include;
  const excludes = (scope.excludePatterns ?? []).map(
    (pattern) => new RegExp(pattern),
  );

  return listCandidatePaths(root)
    .filter((path) => dirs.some((dir) => path.startsWith(`${dir}/`)))
    .filter((path) => extensions.some((extension) => path.endsWith(extension)))
    .filter((path) => !excludes.some((pattern) => pattern.test(path)))
    .filter(
      (path) =>
        existsSync(join(root, path)) && statSync(join(root, path)).isFile(),
    )
    .sort();
}

function isCommentLine(text) {
  return /^(\/\/|\*|\/\*|\*\/|#|<!--)/.test(text);
}

// Significant lines drop blanks, comments, and structural-only punctuation so
// that matching reflects real logic, not shared braces or import noise.
export function significantLines(text) {
  const lines = [];
  const raw = text.split(/\r?\n/);
  for (let index = 0; index < raw.length; index += 1) {
    const trimmed = raw[index].trim();
    if (trimmed === "" || isCommentLine(trimmed)) continue;
    if (/^[\s{}()\[\];,.]*$/.test(trimmed)) continue;
    lines.push({ lineNo: index + 1, norm: trimmed.replace(/\s+/g, " ") });
  }
  return lines;
}

// files: [{ path, text }]. Returns duplicated-line volume and the maximal
// duplicated regions. A window is duplicated when its exact significant-line
// content appears in two or more distinct locations.
export function measureDuplication(files, windowLines) {
  const perFile = files.map((file) => ({
    path: file.path,
    sig: significantLines(file.text),
  }));
  const locations = new Map();

  for (let f = 0; f < perFile.length; f += 1) {
    const { sig } = perFile[f];
    for (let i = 0; i + windowLines <= sig.length; i += 1) {
      const key = sig
        .slice(i, i + windowLines)
        .map((line) => line.norm)
        .join("\n");
      if (!locations.has(key)) locations.set(key, []);
      locations.get(key).push({ f, i });
    }
  }

  const duplicated = new Set();
  for (const occurrences of locations.values()) {
    const distinct = [];
    for (const occurrence of occurrences) {
      const overlaps = distinct.some(
        (kept) =>
          kept.f === occurrence.f &&
          Math.abs(kept.i - occurrence.i) < windowLines,
      );
      if (!overlaps) distinct.push(occurrence);
    }
    if (distinct.length >= 2) {
      for (const occurrence of occurrences) {
        for (let j = occurrence.i; j < occurrence.i + windowLines; j += 1) {
          duplicated.add(`${occurrence.f}:${j}`);
        }
      }
    }
  }

  let duplicatedLines = 0;
  const regions = [];
  for (let f = 0; f < perFile.length; f += 1) {
    const { path, sig } = perFile[f];
    let run = 0;
    for (let j = 0; j <= sig.length; j += 1) {
      if (j < sig.length && duplicated.has(`${f}:${j}`)) {
        run += 1;
        duplicatedLines += 1;
      } else if (run > 0) {
        regions.push({
          path,
          start: sig[j - run].lineNo,
          end: sig[j - 1].lineNo,
          lines: run,
        });
        run = 0;
      }
    }
  }

  return { duplicatedLines, cloneRegions: regions.length, regions };
}

function measureRepoScope(root, contract, scope) {
  const files = listSourceFiles(root, scope).map((path) => ({
    path,
    text: classifyRustSource(
      path,
      readFileSync(join(root, path), "utf8"),
      scope.classification ?? "all",
    ),
  }));
  return measureDuplication(files, contract.windowLines);
}

export function measureRepoScopes(root, contract) {
  return Object.fromEntries(
    Object.entries(contract.scopes ?? {}).map(([name, scope]) => [
      name,
      measureRepoScope(root, contract, scope),
    ]),
  );
}

function scopeViolation(name, measured, baseline) {
  const lineIncrease =
    measured.duplicatedLines > (baseline?.duplicatedLines ?? 0);
  const regionIncrease = measured.cloneRegions > (baseline?.cloneRegions ?? 0);
  if (!lineIncrease && !regionIncrease) return null;
  return (
    `${name}: duplication increased to ${measured.duplicatedLines} duplicated lines across ` +
    `${measured.cloneRegions} regions, above the baseline of ` +
    `${baseline?.duplicatedLines ?? 0} lines across ${baseline?.cloneRegions ?? 0} regions. ` +
    "Remove the duplication or run `npm run lint:dup -- --list` to locate it."
  );
}

export function ratchetBaselines(
  contract,
  measurements,
  measuredOn = contract.measuredOn,
) {
  const updated = structuredClone(contract);
  for (const [name, scope] of Object.entries(updated.scopes ?? {})) {
    const measured = measurements[name];
    if (!measured)
      throw new Error(`missing duplication measurement for scope: ${name}`);
    const baseline = scope.baseline;
    if (
      baseline &&
      (measured.duplicatedLines > baseline.duplicatedLines ||
        measured.cloneRegions > baseline.cloneRegions)
    ) {
      throw new Error(
        `cannot increase ${name} baseline from ${baseline.duplicatedLines} lines across ` +
          `${baseline.cloneRegions} regions to ${measured.duplicatedLines} lines across ` +
          `${measured.cloneRegions} regions`,
      );
    }
    scope.baseline = {
      duplicatedLines: measured.duplicatedLines,
      cloneRegions: measured.cloneRegions,
    };
  }
  updated.measuredOn = measuredOn;
  return updated;
}

export function checkDuplication(root = defaultRoot) {
  if (!existsSync(join(root, contractPath))) {
    return [`missing duplication contract: ${contractPath}`];
  }

  const contract = loadContract(root);
  const measurements = measureRepoScopes(root, contract);
  return Object.entries(contract.scopes ?? {})
    .map(([name, scope]) =>
      scopeViolation(name, measurements[name], scope.baseline),
    )
    .filter(Boolean);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const positional = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const root = positional ? resolve(positional) : defaultRoot;
  const contract = loadContract(root);
  const measurements = measureRepoScopes(root, contract);

  if (process.argv.includes("--list")) {
    for (const [name, measured] of Object.entries(measurements)) {
      console.log(`${name}:`);
      for (const region of measured.regions.sort((a, b) => b.lines - a.lines)) {
        console.log(
          `${region.path}:${region.start}-${region.end} (${region.lines} lines)`,
        );
      }
      console.log(
        `Total: ${measured.duplicatedLines} duplicated lines, ${measured.cloneRegions} regions.`,
      );
    }
    process.exit(0);
  }

  if (process.argv.includes("--update-baseline")) {
    const measuredOn =
      process.argv
        .find((arg) => arg.startsWith("--date="))
        ?.slice("--date=".length) ?? contract.measuredOn;
    let updated;
    try {
      updated = ratchetBaselines(contract, measurements, measuredOn);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    writeFileSync(
      join(root, contractPath),
      `${JSON.stringify(updated, null, 2)}\n`,
      "utf8",
    );
    for (const [name, measured] of Object.entries(measurements)) {
      console.log(
        `${name} baseline set: ${measured.duplicatedLines} duplicated lines, ` +
          `${measured.cloneRegions} regions.`,
      );
    }
    process.exit(0);
  }

  const violations = checkDuplication(root);
  if (violations.length > 0) {
    console.error("Duplication check failed:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exit(1);
  }

  for (const [name, scope] of Object.entries(contract.scopes ?? {})) {
    const measured = measurements[name];
    const baseline = scope.baseline;
    const below =
      measured.duplicatedLines < baseline.duplicatedLines ||
      measured.cloneRegions < baseline.cloneRegions;
    console.log(
      below
        ? `${name} duplication passed below baseline; ratchet it down with ` +
            "`npm run lint:dup -- --update-baseline`."
        : `${name} duplication passed at baseline: ${measured.duplicatedLines} lines across ` +
            `${measured.cloneRegions} regions.`,
    );
  }
}
