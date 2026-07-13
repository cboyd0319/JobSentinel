import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { listTrackedFiles, normalizeRepoPath } from "./repo-artifacts.mjs";

const settingsHelperComponents = new Map([
  ["src/components/settings/CredentialInput.tsx", "CredentialInput"],
  ["src/components/settings/FilterListInput.tsx", "FilterListInput"],
  [
    "src/components/settings/SecureCredentialInput.tsx",
    "SecureCredentialInput",
  ],
  ["src/components/settings/SliderSection.tsx", "SliderSection"],
  ["src/components/settings/ToggleSection.tsx", "ToggleSection"],
]);

const unreferencedHookModules = new Map([
  ["src/hooks/useAsyncOperation.ts", "useAsyncOperation"],
  ["src/hooks/useCachedDashboardData.ts", "useCachedDashboardData"],
  ["src/hooks/useFetchOnMount.ts", "useFetchOnMount"],
  ["src/hooks/useFormValidation.ts", "useFormValidation"],
  ["src/hooks/useMinimumLoadingDuration.ts", "useMinimumLoadingDuration"],
  ["src/hooks/useModal.ts", "useModal"],
  ["src/hooks/useOptimisticUpdate.ts", "useOptimisticUpdate"],
  ["src/hooks/usePagination.ts", "usePagination"],
  ["src/hooks/useTabs.ts", "useTabs"],
  ["src/hooks/useVirtualListScroll.ts", "useVirtualListScroll"],
]);

const unreferencedSourceHelpers = new Map([
  ["src/utils/cacheStrategies.ts", "cacheStrategies"],
]);

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

function hasExternalProductionReference(root, symbolName, options = {}) {
  const symbolPattern = new RegExp(`\\b${symbolName}\\b`);
  const ignoredPaths = options.ignoredPaths ?? new Set();
  const ignoredPrefixes = options.ignoredPrefixes ?? [];

  return listTrackedFiles(root).some((path) => {
    if (
      !isProductionTypeScriptSource(path) ||
      ignoredPaths.has(path) ||
      ignoredPrefixes.some((prefix) => path.startsWith(prefix))
    ) {
      return false;
    }

    return symbolPattern.test(readFileSync(join(root, path), "utf8"));
  });
}

export function hasUnreferencedSettingsHelperComponent(root, path) {
  const componentName = settingsHelperComponents.get(path);

  if (!componentName) {
    return false;
  }

  return !hasExternalProductionReference(root, componentName, {
    ignoredPrefixes: ["src/components/settings/"],
  });
}

export function hasUnreferencedHookModule(root, path) {
  const hookName = unreferencedHookModules.get(path);

  if (!hookName) {
    return false;
  }

  return !hasExternalProductionReference(root, hookName, {
    ignoredPaths: new Set([path, "src/hooks/index.ts"]),
  });
}

export function hasUnreferencedSourceHelper(root, path) {
  const helperName = unreferencedSourceHelpers.get(path);

  if (!helperName) {
    return false;
  }

  return !hasExternalProductionReference(root, helperName, {
    ignoredPaths: new Set([path]),
  });
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

export function hasUnreferencedComponentsBarrel(root, path) {
  if (path !== "src/components/index.ts") {
    return false;
  }

  return !listTrackedFiles(root).some((trackedPath) =>
    importsBarrelPath(root, trackedPath, path),
  );
}

export function hasUnreferencedBarrelModule(root, path) {
  if (!unreferencedBarrelModules.has(path)) {
    return false;
  }

  return !listTrackedFiles(root).some((trackedPath) =>
    importsBarrelPath(root, trackedPath, path),
  );
}
