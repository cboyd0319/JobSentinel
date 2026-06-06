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

export function hasFrontDoorMacosDistributionOverpromise(root, path) {
  if (path !== "README.md") {
    return false;
  }

  return readFileSync(join(root, path), "utf8")
    .split(/\r?\n/)
    .some((line) => {
      const mentionsMacos = /\b(?:macOS|Mac)\b/i.test(line);
      const makesDistributionClaim =
        /\b(?:zero-friction|Gatekeeper[-\s]?ready|Developer ID signed|notarized)\b/i.test(
          line,
        );
      const namesDistributionLimit =
        /\b(?:not|cannot|blocked|requires|until|without|does not|not yet)\b/i.test(
          line,
        );

      return mentionsMacos && makesDistributionClaim && !namesDistributionLimit;
    });
}

export function hasFrontDoorWindowsLinuxReleaseOverpromise(root, path) {
  if (path !== "README.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const sourceVersion = text.match(/Source version\s*\|\s*`?v?(\d+\.\d+\.\d+)`?/i)?.[1];
  const fullReleaseVersion = text.match(/Latest full cross-platform release\s*\|\s*`?v?(\d+\.\d+\.\d+)`?/i)?.[1];
  if (!sourceVersion || !fullReleaseVersion || sourceVersion === fullReleaseVersion) {
    return false;
  }

  return text.split(/\r?\n/).some((line) => {
    const mentionsPlatform = /\b(?:Windows|Linux)\b/i.test(line);
    const mentionsSourceVersion = line.includes(sourceVersion);
    const makesReadyClaim = /\b(?:ready|current|latest|available|released|complete|production)\b/i.test(line);
    const namesLimit = /\b(?:pending|not|blocked|until|still need|still needs|latest full cross-platform|should use)\b/i.test(line);

    return mentionsPlatform && mentionsSourceVersion && makesReadyClaim && !namesLimit;
  });
}

export function hasSourceReleaseVersionPromise(root, path) {
  if (!isRuntimeFrontendSource(path)) {
    return false;
  }

  return /(?:Coming in v\d+\.\d+|planned for v\d+\.\d+)/i.test(
    readFileSync(join(root, path), "utf8"),
  );
}
