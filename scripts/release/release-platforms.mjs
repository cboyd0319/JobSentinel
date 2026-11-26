#!/usr/bin/env node
// Owns the release platform declaration asset that binds a release's platform set to its tag and revision.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getArgValue, isMainModule } from "./args.mjs";

const supportedReleasePlatforms = ["windows", "macos", "linux"];

/**
 * Maps each release selection to the published platforms and where each is built. `local` is the all-local route,
 * built and staged on operator machines; every other selection is a hosted `release.yml` `platform` input.
 */
export const releasePlatformSelections = {
  local: { windows: "local", macos: "local", linux: "local" },
  all: { windows: "hosted", macos: "hosted", linux: "hosted" },
  "windows-linux": { windows: "hosted", macos: "local", linux: "hosted" },
  windows: { windows: "hosted" },
  macos: { macos: "hosted" },
  linux: { linux: "hosted" },
};

const declarationFields = ["schemaVersion", "name", "version", "tag", "sourceRevision", "selection", "platforms"];
const declarationName = "JobSentinel release platforms";
const fullRevisionPattern = /^[0-9a-f]{40}$/;

export function releasePlatformsAssetName(version) {
  return `JobSentinel-${version}-release-platforms.json`;
}

function selectionPlatforms(selection) {
  const platforms = Object.hasOwn(releasePlatformSelections, selection) ? releasePlatformSelections[selection] : undefined;
  if (!platforms) throw new Error(`Release platform declaration has unsupported selection ${selection}.`);
  return platforms;
}

export function buildReleasePlatformDeclaration({ selection, version, tag, sourceRevision }) {
  const platforms = selectionPlatforms(selection);
  if (!fullRevisionPattern.test(String(sourceRevision))) {
    throw new Error(`Release platform declaration sourceRevision must be a full commit SHA, found ${sourceRevision}.`);
  }
  return { schemaVersion: 1, name: declarationName, version, tag, sourceRevision, selection, platforms: { ...platforms } };
}

function samePlatformSet(left, right) {
  return [...left].sort().join(",") === [...right].sort().join(",");
}

/**
 * Validates a downloaded declaration against the expected version, tag and revision.
 * `selection` (draft mode) and `requestedPlatforms` (operator input) must match exactly when given.
 */
export function validateReleasePlatformDeclaration(
  declaration,
  { version, tag, sourceRevision, selection, requestedPlatforms },
) {
  if (!declaration || typeof declaration !== "object" || Array.isArray(declaration)) {
    throw new Error("Release platform declaration must be a JSON object.");
  }
  const unexpected = Object.keys(declaration).filter((key) => !declarationFields.includes(key));
  if (unexpected.length > 0) throw new Error(`Release platform declaration has unexpected fields: ${unexpected.join(", ")}.`);
  if (declaration.schemaVersion !== 1 || declaration.name !== declarationName) {
    throw new Error("Release platform declaration must use schemaVersion 1 and the JobSentinel release platforms name.");
  }
  for (const [field, expected] of [["version", version], ["tag", tag], ["sourceRevision", sourceRevision]]) {
    if (declaration[field] !== expected) {
      throw new Error(`Release platform declaration ${field} expected ${expected}, found ${declaration[field]}.`);
    }
  }
  const declared = selectionPlatforms(declaration.selection);
  if (selection !== undefined && declaration.selection !== selection) {
    throw new Error(`Release platform declaration selection expected ${selection}, found ${declaration.selection}.`);
  }
  const actual = declaration.platforms ?? {};
  if (
    typeof actual !== "object" ||
    !samePlatformSet(Object.keys(actual), Object.keys(declared)) ||
    Object.entries(declared).some(([platform, source]) => actual[platform] !== source)
  ) {
    throw new Error(`Release platform declaration platforms do not match selection ${declaration.selection}.`);
  }
  const platforms = supportedReleasePlatforms.filter((platform) => Object.hasOwn(declared, platform));
  if (requestedPlatforms !== undefined && !samePlatformSet(requestedPlatforms, platforms)) {
    throw new Error(
      `Requested platforms ${requestedPlatforms.join(",")} does not match declared platforms ${platforms.join(",")}.`,
    );
  }
  return { platforms, sources: Object.fromEntries(platforms.map((platform) => [platform, declared[platform]])) };
}

/** Writes the declaration and its SHA-256 sidecar into the staged release asset directory. */
export function writeReleasePlatformDeclaration({ selection, version, tag, sourceRevision, outDir }) {
  const declaration = buildReleasePlatformDeclaration({ selection, version, tag, sourceRevision });
  const name = releasePlatformsAssetName(version);
  const bytes = Buffer.from(`${JSON.stringify(declaration, null, 2)}\n`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, name), bytes, { flag: "wx" });
  writeFileSync(join(outDir, `${name}.sha256`), `${createHash("sha256").update(bytes).digest("hex")}  ${name}\n`, { flag: "wx" });
  return join(outDir, name);
}

if (isMainModule(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const options = Object.fromEntries(
      ["selection", "version", "tag", "revision", "out-dir"].map((name) => [name, getArgValue(args, `--${name}`)]),
    );
    if (Object.values(options).some((value) => !value)) {
      throw new Error("Usage: release-platforms.mjs --selection <s> --version X.Y.Z --tag vX.Y.Z --revision <sha> --out-dir <dir>");
    }
    if (options.tag !== `v${options.version}`) throw new Error(`Tag ${options.tag} does not match version ${options.version}.`);
    const path = writeReleasePlatformDeclaration({
      selection: options.selection,
      version: options.version,
      tag: options.tag,
      sourceRevision: options.revision,
      outDir: options["out-dir"],
    });
    console.log(`Release platform declaration written: ${path}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
