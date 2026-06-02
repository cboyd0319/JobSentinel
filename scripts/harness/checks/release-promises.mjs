import { readFileSync } from "node:fs";
import { join } from "node:path";

function isRuntimeFrontendSource(path) {
  return (
    path.startsWith("src/") &&
    /\.(ts|tsx)$/.test(path) &&
    !path.endsWith(".d.ts") &&
    !/\.test\.(ts|tsx)$/.test(path) &&
    !/\.stories\.(ts|tsx)$/.test(path) &&
    path !== "src/mocks/handlers.ts"
  );
}

export function hasFrontDoorReleaseVersionPromise(root, path) {
  if (path !== "README.md") {
    return false;
  }

  return /(?:Planned for v\d+\.\d+|coming in v\d+\.\d+|tracked for v\d+\.\d+)/i.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasFrontDoorMacosInstallerOverpromise(root, path) {
  if (path !== "README.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /\bWindows,\s*macOS,\s*and\s*Linux installers\b/i.test(text) ||
    /\bmacOS installer\b/i.test(text) ||
    /\bMac installer\b/i.test(text)
  );
}

export function hasSourceReleaseVersionPromise(root, path) {
  if (!isRuntimeFrontendSource(path)) {
    return false;
  }

  return /(?:Coming in v\d+\.\d+|planned for v\d+\.\d+)/i.test(
    readFileSync(join(root, path), "utf8"),
  );
}
