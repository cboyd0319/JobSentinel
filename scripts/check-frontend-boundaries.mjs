#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

const sourceExtensions = new Set([".ts", ".tsx"]);
const ignoredPathParts = new Set([
  "node_modules",
  "dist",
  "coverage",
  "src-tauri",
  "test",
  "tests",
  "mocks",
]);

const ignoredFilePatterns = [
  /\.test\.[tj]sx?$/,
  /\.stories\.[tj]sx?$/,
  /\.d\.ts$/,
];

const boundaryRules = [
  {
    from: "components",
    disallow: ["pages"],
    reason: "shared UI components must not depend on page modules",
  },
  {
    from: "contexts",
    disallow: ["pages", "components"],
    reason: "app state providers must not depend on page or UI component modules",
  },
  {
    from: "hooks",
    disallow: ["pages", "components"],
    reason: "shared hooks must not depend on page or UI component modules",
  },
  {
    from: "services",
    disallow: ["pages", "components", "hooks", "contexts"],
    reason: "services must stay framework-agnostic and outside UI/state layers",
  },
  {
    from: "utils",
    disallow: ["pages", "components", "hooks", "contexts"],
    reason: "utilities must stay reusable and outside UI/state layers",
  },
  {
    from: "types",
    disallow: ["pages", "components", "hooks", "contexts", "services", "utils"],
    reason: "shared types must not depend on implementation modules",
  },
  {
    from: "config",
    disallow: ["pages", "components", "hooks", "contexts", "services"],
    reason: "configuration must not depend on runtime UI or service modules",
  },
];

const dynamicTailwindClassPattern =
  /(?:^|[^A-Za-z0-9_-])(?:[a-z]+:)*(?:bg|text|border|ring|from|via|to|stroke|fill)-\$\{[^}]+}/;
const tailwindTextClassToInlineColorPattern =
  /style=\{\{\s*color:\s*[^}]*\.replace\(["']text-["'],\s*["']["']\)/s;
const httpPrefixUrlValidationPattern =
  /new\s+URL\(\s*([A-Za-z_$][\w$]*)\.startsWith\(["']http["']\)\s*\?\s*\1\s*:\s*`https:\/\/\$\{\1\}`\s*\)/;

function collectSourceFiles(root, dir = join(root, "src")) {
  const files = [];

  if (!existsSync(dir)) {
    return files;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    const rel = relative(root, fullPath);
    const parts = rel.split(/[\\/]/);

    if (parts.some((part) => ignoredPathParts.has(part))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(root, fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!sourceExtensions.has(fullPath.slice(fullPath.lastIndexOf(".")))) {
      continue;
    }

    if (ignoredFilePatterns.some((pattern) => pattern.test(entry.name))) {
      continue;
    }

    files.push(fullPath);
  }

  return files.sort();
}

function getLayer(root, fullPath) {
  const rel = relative(join(root, "src"), fullPath);
  const [layer] = rel.split(/[\\/]/);
  return layer ?? "";
}

function getImportSpecifiers(text) {
  const specifiers = [];
  const importExportPattern =
    /(?:^|\n)\s*(?:import|export)\s+(?!["'])(?:type\s+)?[\s\S]*?\s+from\s*["']([^"']+)["']/g;
  const sideEffectImportPattern = /(?:^|\n)\s*import\s*["']([^"']+)["']/g;
  const dynamicImportPattern = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  let match;

  while ((match = importExportPattern.exec(text)) !== null) {
    specifiers.push(match[1]);
  }

  while ((match = sideEffectImportPattern.exec(text)) !== null) {
    specifiers.push(match[1]);
  }

  while ((match = dynamicImportPattern.exec(text)) !== null) {
    specifiers.push(match[1]);
  }

  return specifiers;
}

function resolveLocalImport(root, fromFile, specifier) {
  if (!specifier.startsWith(".")) {
    return null;
  }

  return normalize(resolve(dirname(fromFile), specifier));
}

function readAliasMappings(root) {
  const tsconfigPath = join(root, "tsconfig.json");

  if (!existsSync(tsconfigPath)) {
    return [];
  }

  const tsconfig = JSON.parse(stripJsonComments(readFileSync(tsconfigPath, "utf8")));
  const paths = tsconfig?.compilerOptions?.paths;

  if (!paths || typeof paths !== "object") {
    return [];
  }

  return Object.entries(paths).flatMap(([pattern, targets]) => {
    if (!Array.isArray(targets)) {
      return [];
    }

    const starIndex = pattern.indexOf("*");
    const patternPrefix = starIndex === -1 ? pattern : pattern.slice(0, starIndex);
    const patternSuffix = starIndex === -1 ? "" : pattern.slice(starIndex + 1);

    return targets
      .filter((target) => typeof target === "string")
      .map((target) => {
        const targetStarIndex = target.indexOf("*");
        return {
          pattern,
          patternPrefix,
          patternSuffix,
          targetPrefix:
            targetStarIndex === -1 ? target : target.slice(0, targetStarIndex),
          targetSuffix:
            targetStarIndex === -1 ? "" : target.slice(targetStarIndex + 1),
        };
      });
  });
}

function stripJsonComments(text) {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < text.length && text[index] !== "\n") {
        index += 1;
      }
      output += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      index += 2;
      while (index < text.length && !(text[index] === "*" && text[index + 1] === "/")) {
        index += 1;
      }
      index += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function resolveAliasedImport(root, specifier, aliasMappings) {
  for (const mapping of aliasMappings) {
    if (
      !specifier.startsWith(mapping.patternPrefix) ||
      !specifier.endsWith(mapping.patternSuffix)
    ) {
      continue;
    }

    if (!mapping.pattern.includes("*") && specifier !== mapping.pattern) {
      continue;
    }

    const wildcard = mapping.pattern.includes("*")
      ? specifier.slice(
          mapping.patternPrefix.length,
          specifier.length - mapping.patternSuffix.length,
        )
      : "";

    return normalize(resolve(root, `${mapping.targetPrefix}${wildcard}${mapping.targetSuffix}`));
  }

  return null;
}

function resolveImport(root, fromFile, specifier, aliasMappings) {
  if (specifier.startsWith(".")) {
    return resolveLocalImport(root, fromFile, specifier);
  }

  return resolveAliasedImport(root, specifier, aliasMappings);
}

function isPathUnder(path, maybeParent) {
  const rel = relative(maybeParent, path);
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith("/"));
}

function pathExistsWithKnownExtension(path) {
  if (existsSync(path)) {
    return true;
  }

  return [".ts", ".tsx", ".js", ".jsx"].some(
    (ext) => existsSync(`${path}${ext}`) || existsSync(join(path, `index${ext}`)),
  );
}

function hasDynamicTailwindClassConstruction(text) {
  return dynamicTailwindClassPattern.test(text);
}

function hasTailwindTextClassToInlineColor(text) {
  return tailwindTextClassToInlineColorPattern.test(text);
}

function hasHttpPrefixUrlValidation(text) {
  return httpPrefixUrlValidationPattern.test(text);
}

export function checkFrontendBoundaries(root = defaultRoot) {
  const srcRoot = join(root, "src");
  const aliasMappings = readAliasMappings(root);
  const violations = [];

  for (const file of collectSourceFiles(root)) {
    const text = readFileSync(file, "utf8");
    const relFile = relative(root, file);

    if (hasDynamicTailwindClassConstruction(text)) {
      violations.push(
        `${relFile} constructs Tailwind class names with interpolation; use a static class map so Tailwind emits the CSS`,
      );
    }

    if (hasTailwindTextClassToInlineColor(text)) {
      violations.push(
        `${relFile} converts Tailwind text classes into inline CSS color values; apply the Tailwind class directly or map to a real CSS color`,
      );
    }

    if (hasHttpPrefixUrlValidation(text)) {
      violations.push(
        `${relFile} validates URLs with startsWith("http"); parse the URL and require an actual http/https protocol`,
      );
    }

    const fromLayer = getLayer(root, file);
    const applicableRules = boundaryRules.filter((rule) => rule.from === fromLayer);

    if (applicableRules.length === 0) {
      continue;
    }

    for (const specifier of getImportSpecifiers(text)) {
      const resolved = resolveImport(root, file, specifier, aliasMappings);

      if (
        !resolved ||
        !isPathUnder(resolved, srcRoot) ||
        !pathExistsWithKnownExtension(resolved)
      ) {
        continue;
      }

      const toLayer = getLayer(root, resolved);

      for (const rule of applicableRules) {
        if (!rule.disallow.includes(toLayer)) {
          continue;
        }

        violations.push(
          `${relFile} imports ${specifier} across forbidden boundary (${fromLayer} -> ${toLayer}): ${rule.reason}`,
        );
      }
    }
  }

  return violations;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const violations = checkFrontendBoundaries(root);

  if (violations.length > 0) {
    console.error("Frontend boundary check failed:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log("Frontend boundary check passed.");
}
