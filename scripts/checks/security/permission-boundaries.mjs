import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const browserExtensionManifestPattern = /^manifest(?:\.[A-Za-z0-9_-]+)?\.json$/;

const highRiskBrowserExtensionPermissions = new Set([
  "bookmarks",
  "browsingData",
  "clipboardRead",
  "cookies",
  "debugger",
  "downloads",
  "history",
  "management",
  "nativeMessaging",
  "privacy",
  "proxy",
  "tabs",
  "webRequest",
  "webRequestBlocking",
]);

const broadBrowserExtensionHostPatterns = [
  /^<all_urls>$/i,
  /^\*:\/\/\*\/\*$/,
  /^https?:\/\/\*\/\*$/i,
  /^file:\/\/\*\/\*$/i,
];

const allowedTauriNotificationPermissions = new Set([
  "notification:allow-is-permission-granted",
  "notification:allow-request-permission",
  "notification:allow-notify",
]);

function repoPath(root, path) {
  return join(root, path);
}

function collectFiles(dir, prefix, filePredicate) {
  const files = [];

  if (!existsSync(dir)) {
    return files;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = `${prefix}/${entry.name}`;
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, rel, filePredicate));
      continue;
    }

    if (entry.isFile() && filePredicate(entry.name)) {
      files.push(rel);
    }
  }

  return files.sort();
}

function readJson(root, path, violations, purpose) {
  try {
    return JSON.parse(readFileSync(repoPath(root, path), "utf8"));
  } catch {
    violations.push(`${path} must be valid JSON for ${purpose}`);
    return undefined;
  }
}

function manifestArray(manifest, key) {
  return Array.isArray(manifest?.[key]) ? manifest[key] : [];
}

function collectBrowserExtensionManifests(root) {
  return collectFiles(
    repoPath(root, "browser-extension"),
    "browser-extension",
    (file) => browserExtensionManifestPattern.test(file),
  );
}

function capabilityPaths(root) {
  return collectFiles(
    repoPath(root, "src-tauri/capabilities"),
    "src-tauri/capabilities",
    (file) => file.endsWith(".json"),
  );
}

export function checkBrowserExtensionManifestBoundary(root, violations) {
  for (const path of collectBrowserExtensionManifests(root)) {
    const manifest = readJson(root, path, violations, "browser-extension security checks");
    if (!manifest) {
      continue;
    }

    for (const key of ["permissions", "optional_permissions"]) {
      for (const permission of manifestArray(manifest, key)) {
        if (
          typeof permission === "string" &&
          highRiskBrowserExtensionPermissions.has(permission)
        ) {
          violations.push(
            `${path} must not request high-risk browser-extension permission: ${permission}`,
          );
        }
      }
    }

    for (const key of ["host_permissions", "optional_host_permissions"]) {
      for (const permission of manifestArray(manifest, key)) {
        if (
          typeof permission === "string" &&
          broadBrowserExtensionHostPatterns.some((pattern) => pattern.test(permission))
        ) {
          violations.push(
            `${path} must not request broad browser-extension host permission: ${permission}`,
          );
        }
      }
    }
  }
}

export function checkTauriCapabilityBoundary(root, violations) {
  for (const path of capabilityPaths(root)) {
    const capability = readJson(root, path, violations, "Tauri capability security checks");
    if (!capability) {
      continue;
    }

    for (const permission of manifestArray(capability, "permissions")) {
      const identifier =
        typeof permission === "string" ? permission : permission?.identifier;
      if (typeof identifier === "string" && identifier.startsWith("shell:")) {
        violations.push(
          `${path} must not grant frontend shell permissions; route browser opens through validated Rust IPC`,
        );
      }

      if (typeof identifier === "string" && identifier.startsWith("dialog:")) {
        violations.push(
          `${path} must not grant frontend dialog permissions; open native file dialogs through validated Rust IPC commands`,
        );
      }

      if (identifier === "notification:default") {
        violations.push(
          `${path} must not grant notification:default; allow only the notification commands the renderer uses`,
        );
      } else if (
        typeof identifier === "string" &&
        identifier.startsWith("notification:") &&
        !allowedTauriNotificationPermissions.has(identifier)
      ) {
        violations.push(
          `${path} must not grant unused frontend notification permission: ${identifier}`,
        );
      }
    }
  }
}

export function checkWorkflowInstallBoundary(path, text, violations) {
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (/\bnpm\s+ci\b/.test(line) && !/(?:^|\s)--ignore-scripts(?:\s|$)/.test(line)) {
      violations.push(
        `${path}:${index + 1} workflow npm-ci commands must include --ignore-scripts`,
      );
    }
  }
}
