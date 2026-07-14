import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { listTrackedFiles, normalizeRepoPath } from "./repo-artifacts.mjs";

const unreferencedBarrelModules = new Set([
  "src/features/application-assist/index.ts",
  "src/features/dashboard/components/index.ts",
]);

function isProductionTypeScriptSource(path) {
  return (
    path.startsWith("src/") &&
    /\.(?:ts|tsx)$/.test(path) &&
    !/(?:^|\/)[^/]+\.test\.(?:ts|tsx)$/.test(path)
  );
}

export function hasStaleNotificationPreferenceSyncWrapper(root, path) {
  if (
    path !==
    "src/features/settings/notifications/notificationPreferencesStore.ts"
  ) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /export function loadNotificationPreferences\(\): NotificationPreferences/.test(
      text,
    ) ||
    /export function saveNotificationPreferences\(_?prefs: NotificationPreferences\): boolean/.test(
      text,
    ) ||
    /@deprecated Use saveNotificationPreferencesAsync instead/.test(text)
  );
}

export function importSpecifiers(root, path) {
  const text = readFileSync(join(root, path), "utf8");
  const specifiers = [];
  const importPattern =
    /(?:import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s*)?|export\s+(?:type\s+)?[\s\S]*?\s+from\s*|import\s*\()\s*["']([^"']+)["']/g;

  for (const match of text.matchAll(importPattern)) {
    specifiers.push(match[1]);
  }

  return specifiers;
}

function resolveImportSpecifier(importerPath, specifier) {
  if (specifier.startsWith("@/")) {
    return normalizeRepoPath(join("src", specifier.slice(2)));
  }

  if (specifier.startsWith(".")) {
    return normalizeRepoPath(join(dirname(importerPath), specifier));
  }

  return null;
}

function importsBarrelPath(root, path, barrelPath) {
  if (!isProductionTypeScriptSource(path) || path === barrelPath) {
    return false;
  }

  const barrelImportPath = barrelPath.replace(/\/index\.ts$/, "");

  return importSpecifiers(root, path).some((specifier) => {
    const resolvedPath = resolveImportSpecifier(path, specifier);
    return (
      resolvedPath === barrelImportPath ||
      resolvedPath === barrelPath.replace(/\.ts$/, "")
    );
  });
}

export function hasUnreferencedBarrelModule(root, path) {
  if (!unreferencedBarrelModules.has(path)) {
    return false;
  }

  return !listTrackedFiles(root).some((trackedPath) =>
    importsBarrelPath(root, trackedPath, path),
  );
}
