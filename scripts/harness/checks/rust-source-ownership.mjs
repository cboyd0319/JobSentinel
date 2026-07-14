import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";

function normalizePath(path) {
  return path.split(/[\\/]/).join("/");
}

function collectRustFiles(root, directory) {
  const absoluteDirectory = join(root, directory);
  if (!existsSync(absoluteDirectory)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const child = join(absoluteDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(
        ...collectRustFiles(root, normalizePath(relative(root, child))),
      );
    } else if (entry.isFile() && entry.name.endsWith(".rs")) {
      files.push(normalizePath(relative(root, child)));
    }
  }
  return files.sort();
}

function moduleDirectory(path) {
  const name = basename(path);
  if (name === "lib.rs" || name === "main.rs" || name === "mod.rs") {
    return dirname(path);
  }
  return join(dirname(path), name.slice(0, -extname(name).length));
}

function declaredModules(text) {
  const declarations = [];
  let explicitPath;

  for (const line of text.split(/\r?\n/)) {
    const pathMatch = line.match(/#\[\s*path\s*=\s*"([^"]+)"\s*\]/);
    if (pathMatch) {
      explicitPath = pathMatch[1];
    }

    const code = line.replace(/^\s*(?:#\[[^\]]+\]\s*)+/, "").trim();
    const moduleMatch = code.match(
      /^(?:pub(?:\s*\([^)]*\))?\s+)?mod\s+([A-Za-z_][A-Za-z0-9_]*)\s*;/,
    );
    if (moduleMatch) {
      declarations.push({ name: moduleMatch[1], explicitPath });
      explicitPath = undefined;
    } else if (
      code.length > 0 &&
      !code.startsWith("#") &&
      !code.startsWith("//")
    ) {
      explicitPath = undefined;
    }
  }

  return declarations;
}

function resolveModule(root, owner, declaration) {
  const candidates = declaration.explicitPath
    ? [
        join(dirname(owner), declaration.explicitPath),
        join(moduleDirectory(owner), declaration.explicitPath),
      ]
    : [
        join(moduleDirectory(owner), `${declaration.name}.rs`),
        join(moduleDirectory(owner), declaration.name, "mod.rs"),
        join(dirname(owner), `${declaration.name}.rs`),
        join(dirname(owner), declaration.name, "mod.rs"),
      ];

  const directMatch = candidates
    .map(normalizePath)
    .find((candidate) => existsSync(join(root, candidate)));
  if (directMatch) {
    return directMatch;
  }

  const ownerDirectory = normalizePath(moduleDirectory(owner));
  const suffixes = declaration.explicitPath
    ? [normalizePath(declaration.explicitPath)]
    : [`${declaration.name}.rs`, `${declaration.name}/mod.rs`];
  const nestedMatches = collectRustFiles(root, ownerDirectory).filter((path) =>
    suffixes.some((suffix) => path.endsWith(`/${suffix}`)),
  );
  return nestedMatches.length === 1 ? nestedMatches[0] : undefined;
}

function crateRoots(root, member) {
  const roots = ["src/lib.rs", "src/main.rs"]
    .map((path) => `${member}/${path}`)
    .filter((path) => existsSync(join(root, path)));
  const binDirectory = join(root, member, "src/bin");
  if (existsSync(binDirectory)) {
    for (const entry of readdirSync(binDirectory, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".rs")) {
        roots.push(`${member}/src/bin/${entry.name}`);
      }
    }
  }
  return roots;
}

function reachableSources(root, member) {
  const reachable = new Set();
  const pending = crateRoots(root, member);

  while (pending.length > 0) {
    const path = normalizePath(pending.pop());
    if (reachable.has(path)) {
      continue;
    }
    reachable.add(path);

    const text = readFileSync(join(root, path), "utf8");
    for (const declaration of declaredModules(text)) {
      const modulePath = resolveModule(root, path, declaration);
      if (modulePath && !reachable.has(modulePath)) {
        pending.push(modulePath);
      }
    }
  }

  return reachable;
}

export function checkRustSourceOwnership(root, members) {
  const violations = [];
  for (const member of members) {
    const sourceDirectory = `${member}/src`;
    const reachable = reachableSources(root, member);
    for (const path of collectRustFiles(root, sourceDirectory)) {
      if (!reachable.has(path)) {
        violations.push(`${path} must be reachable from a Rust crate root`);
      }
    }
  }
  return violations;
}
