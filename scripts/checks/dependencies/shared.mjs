import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const cratesIoHeaders = {
  "User-Agent":
    "JobSentinel dependency pin check (https://github.com/cboyd0319/JobSentinel)",
};

export function repoPath(root, path) {
  return join(root, path);
}

export function readJson(root, path) {
  return JSON.parse(readFileSync(repoPath(root, path), "utf8"));
}

export function readText(root, path) {
  return readFileSync(repoPath(root, path), "utf8");
}

export function listFiles(root, path, predicate) {
  const fullPath = repoPath(root, path);
  if (!existsSync(fullPath)) return [];
  if (!statSync(fullPath).isDirectory()) return predicate(path) ? [path] : [];

  const files = [];
  for (const entry of readdirSync(fullPath, { withFileTypes: true })) {
    const childPath = `${path}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...listFiles(root, childPath, predicate));
    } else if (predicate(childPath)) {
      files.push(childPath);
    }
  }
  return files.sort();
}

export function parseStableSemver(version) {
  const match = String(version).match(
    /^v?(\d+)\.(\d+)\.(\d+)(?:\+[0-9A-Za-z.-]+)?$/,
  );
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    raw: String(version).replace(/^v/, "").split("+")[0],
  };
}

export function compareStableSemver(left, right) {
  const parsedLeft = typeof left === "string" ? parseStableSemver(left) : left;
  const parsedRight = typeof right === "string" ? parseStableSemver(right) : right;
  if (!parsedLeft || !parsedRight) {
    throw new Error(`Cannot compare non-stable semver values: ${left}, ${right}`);
  }
  for (const key of ["major", "minor", "patch"]) {
    if (parsedLeft[key] !== parsedRight[key]) {
      return parsedLeft[key] - parsedRight[key];
    }
  }
  return 0;
}

export function highestStableVersion(versions) {
  return versions
    .map((version) => parseStableSemver(version))
    .filter(Boolean)
    .sort(compareStableSemver)
    .at(-1)?.raw;
}

export function exactStableVersion(value) {
  const version = String(value).trim().replace(/^v/, "");
  return parseStableSemver(version)?.raw ?? null;
}

export async function mapWithLimit(items, limit, callback) {
  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

export async function fetchJson(fetchImpl, url, headers = {}) {
  const response = await fetchImpl(url, { headers });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

export async function fetchText(fetchImpl, url, headers = {}) {
  const response = await fetchImpl(url, { headers });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}
