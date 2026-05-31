import { readFileSync } from "node:fs";
import { join } from "node:path";

export function readPackageManifest(root) {
  return JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
}

function directDependencies(packageJson) {
  return {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
    ...(packageJson.optionalDependencies ?? {}),
  };
}

function ownedPackages(packageJson) {
  return new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
  ]);
}

export function hasUnownedStorybookAddon(root, path) {
  if (path !== ".storybook/main.ts") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const addons = text.match(/["']addons["']\s*:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
  const owned = ownedPackages(readPackageManifest(root));

  return [...addons.matchAll(/["']([^"']+)["']/g)].some(([, addon]) => {
    return !addon.startsWith(".") && !owned.has(addon);
  });
}

export function hasRedundantDirectPlaywrightDependency(root, path) {
  if (path !== "package.json") {
    return false;
  }

  const directDeps = directDependencies(readPackageManifest(root));
  return Boolean(directDeps["@playwright/test"] && directDeps.playwright);
}

export function hasDirectPlaywrightE2eScript(root, path) {
  if (path !== "package.json") {
    return false;
  }

  const packageJson = readPackageManifest(root);
  return Object.entries(packageJson.scripts ?? {}).some(([name, command]) => {
    return name.startsWith("test:e2e") && /^playwright\b/.test(String(command).trim());
  });
}

export function hasRedundantDomPurifyTypesDependency(root, path) {
  if (path !== "package.json") {
    return false;
  }

  const directDeps = directDependencies(readPackageManifest(root));
  return Boolean(directDeps.dompurify && directDeps["@types/dompurify"]);
}

export function hasTailwindPostcssPlugin(root, path) {
  if (path === "package.json") {
    const directDeps = directDependencies(readPackageManifest(root));
    return Boolean(directDeps["@tailwindcss/postcss"]);
  }

  if (path !== "postcss.config.js") {
    return false;
  }

  return readFileSync(join(root, path), "utf8").includes("@tailwindcss/postcss");
}
