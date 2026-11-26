// Owns command-line flag parsing (`--name value`, `--name=value`, lists) and entrypoint detection for release scripts.
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function getArgValue(args, name) {
  const exactIndex = args.indexOf(name);
  if (exactIndex >= 0) return args[exactIndex + 1];

  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : undefined;
}

/** Reads `--repo` as `owner/name` without dot parts, so it cannot retarget a credentialed GitHub request path. */
export function getRepoArg(args, fallback) {
  const repo = getArgValue(args, "--repo") ?? fallback;
  if (repo === undefined) return undefined;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) || repo.split("/").some((part) => part === "." || part === "..")) {
    throw new Error(`Invalid GitHub repository: ${JSON.stringify(repo)}.`);
  }
  return repo;
}

export function hasArg(args, name) {
  return args.some((arg) => arg === name || arg.startsWith(`${name}=`));
}

export function splitList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** True when `entry` (default: the launched script) is this module, resolving symlinks on both sides. */
export function isMainModule(moduleUrl, entry = process.argv[1]) {
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(moduleUrl));
  } catch {
    return false;
  }
}
