#!/usr/bin/env node

// DRY enforcement sensor. Detects duplicated runs of identical significant code
// lines and gates against a tool-generated baseline so new development cannot
// add duplication. Existing duplication is recorded debt, not approval.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "../..");
const contractPath = "scripts/harness/contracts/duplication.json";

const walkSkip = new Set([".git", ".claude", "node_modules", "target", "gen", "dist"]);

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
      else if (entry.isFile()) out.push(relative(root, full).replaceAll("\\", "/"));
    }
  };
  walk(root);
  return out;
}

export function listSourceFiles(root, contract) {
  const { dirs, extensions } = contract.include;
  const excludes = contract.excludePatterns.map((pattern) => new RegExp(pattern));

  return listCandidatePaths(root)
    .filter((path) => dirs.some((dir) => path.startsWith(`${dir}/`)))
    .filter((path) => extensions.some((extension) => path.endsWith(extension)))
    .filter((path) => !excludes.some((pattern) => pattern.test(path)))
    .filter((path) => existsSync(join(root, path)) && statSync(join(root, path)).isFile())
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
  const perFile = files.map((file) => ({ path: file.path, sig: significantLines(file.text) }));
  const locations = new Map();

  for (let f = 0; f < perFile.length; f += 1) {
    const { sig } = perFile[f];
    for (let i = 0; i + windowLines <= sig.length; i += 1) {
      const key = sig.slice(i, i + windowLines).map((line) => line.norm).join("\n");
      if (!locations.has(key)) locations.set(key, []);
      locations.get(key).push({ f, i });
    }
  }

  const duplicated = new Set();
  for (const occurrences of locations.values()) {
    const distinct = [];
    for (const occurrence of occurrences) {
      const overlaps = distinct.some(
        (kept) => kept.f === occurrence.f && Math.abs(kept.i - occurrence.i) < windowLines,
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
        regions.push({ path, start: sig[j - run].lineNo, end: sig[j - 1].lineNo, lines: run });
        run = 0;
      }
    }
  }

  return { duplicatedLines, cloneRegions: regions.length, regions };
}

function measureRepo(root, contract) {
  const files = listSourceFiles(root, contract).map((path) => ({
    path,
    text: readFileSync(join(root, path), "utf8"),
  }));
  return measureDuplication(files, contract.windowLines);
}

export function checkDuplication(root = defaultRoot) {
  if (!existsSync(join(root, contractPath))) {
    return [`missing duplication contract: ${contractPath}`];
  }

  const contract = loadContract(root);
  const measured = measureRepo(root, contract);
  const baseline = contract.baseline ?? { duplicatedLines: 0 };

  if (measured.duplicatedLines > baseline.duplicatedLines) {
    return [
      `duplication increased: ${measured.duplicatedLines} duplicated lines across ` +
        `${measured.cloneRegions} regions exceeds the baseline of ${baseline.duplicatedLines}. ` +
        "Remove the duplication (extract a shared helper) or run " +
        "`npm run lint:dup -- --list` to locate it.",
    ];
  }

  return [];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const positional = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const root = positional ? resolve(positional) : defaultRoot;
  const contract = loadContract(root);
  const measured = measureRepo(root, contract);

  if (process.argv.includes("--list")) {
    for (const region of measured.regions.sort((a, b) => b.lines - a.lines)) {
      console.log(`${region.path}:${region.start}-${region.end} (${region.lines} lines)`);
    }
    console.log(`\nTotal: ${measured.duplicatedLines} duplicated lines, ${measured.cloneRegions} regions.`);
    process.exit(0);
  }

  if (process.argv.includes("--update-baseline")) {
    contract.baseline = {
      duplicatedLines: measured.duplicatedLines,
      cloneRegions: measured.cloneRegions,
    };
    contract.measuredOn = process.argv
      .find((arg) => arg.startsWith("--date="))
      ?.slice("--date=".length) ?? contract.measuredOn;
    writeFileSync(join(root, contractPath), `${JSON.stringify(contract, null, 2)}\n`, "utf8");
    console.log(
      `Baseline set: ${measured.duplicatedLines} duplicated lines, ${measured.cloneRegions} regions.`,
    );
    process.exit(0);
  }

  const violations = checkDuplication(root);
  if (violations.length > 0) {
    console.error("Duplication check failed:");
    for (const violation of violations) console.error(`- ${violation}`);
    if (measured.duplicatedLines < (loadContract(root).baseline?.duplicatedLines ?? 0)) {
      console.error("Note: duplication is below baseline; lower it with --update-baseline.");
    }
    process.exit(1);
  }

  const base = contract.baseline?.duplicatedLines ?? 0;
  if (measured.duplicatedLines < base) {
    console.log(
      `Duplication check passed. ${measured.duplicatedLines} duplicated lines is below the ` +
        `baseline of ${base}; ratchet it down with \`npm run lint:dup -- --update-baseline\`.`,
    );
  } else {
    console.log(`Duplication check passed. ${measured.duplicatedLines} duplicated lines at baseline.`);
  }
}
