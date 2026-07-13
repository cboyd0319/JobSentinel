import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const requiredCommandClaimFiles = ["README.md", "docs/ROADMAP.md"];

const staleCommandCountClaimPatterns = [
  {
    path: "docs/README.md",
    pattern: /^-\s+\*\*[^*\n]+\*\*:\s+\d+\s+commands\b/gim,
  },
  {
    path: "docs/developer/ARCHITECTURE.md",
    pattern: /\b\d+\s+total commands\b/gi,
  },
  {
    path: "docs/developer/ARCHITECTURE.md",
    pattern: /\*\*[^*\n]*Commands \(\d+\):\*\*/g,
  },
  {
    path: "docs/developer/GETTING_STARTED.md",
    pattern: /^-\s+\*\*[^*\n]+\*\*:.*\(\d+\s+commands\)/gim,
  },
  {
    path: "docs/features/user-data-management.md",
    pattern: /\bThese\s+\d+\s+commands\s+power\b/gi,
  },
  {
    path: "docs/features/user-data-management.md",
    pattern: /^###\s+.+\(\d+\s+commands\)$/gim,
  },
];

function getTextLineNumber(text, position) {
  let line = 1;
  for (let index = 0; index < position; index += 1) {
    if (text.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function collectRegisteredCommands(root) {
  const entries = collectRegisteredCommandEntries(root);
  return entries ? new Set(entries.map((entry) => entry.name)) : null;
}

export function collectRegisteredCommandEntries(root) {
  const commandRegistryPath = join(root, "src-tauri/src/command_handlers.rs");
  const mainPath = join(root, "src-tauri/src/main.rs");
  const registryPath = existsSync(commandRegistryPath) ? commandRegistryPath : mainPath;

  if (!existsSync(registryPath)) return null;

  const registryRs = readFileSync(registryPath, "utf8");
  const generateHandlerMatch = registryRs.match(
    /(?:::)?tauri::generate_handler!\[\s*([\s\S]*?)\s*\]/,
  );

  if (!generateHandlerMatch) return null;

  return [
    ...generateHandlerMatch[1].matchAll(
      /commands::((?:[a-zA-Z0-9_]+::)+)([a-zA-Z0-9_]+)/g,
    ),
  ].map((match) => {
    const modulePath = match[1].split("::").filter(Boolean);
    return { module: modulePath[0], modulePath, name: match[2] };
  });
}

function commandDisplayName(entry) {
  return `${entry.modulePath.join("::")}::${entry.name}`;
}

function defaultNestedModulePath(parentPath, childModule) {
  if (basename(parentPath) === "mod.rs") {
    return join(dirname(parentPath), `${childModule}.rs`);
  }
  return join(dirname(parentPath), basename(parentPath, ".rs"), `${childModule}.rs`);
}

function resolveChildModulePath(parentPath, childModule) {
  if (!existsSync(parentPath)) return defaultNestedModulePath(parentPath, childModule);

  const parentText = readFileSync(parentPath, "utf8");
  const escapedChild = escapeRegExp(childModule);
  const pathAttributeMatch = parentText.match(
    new RegExp(
      `#\\[path\\s*=\\s*"([^"]+)"\\]\\s*(?:pub\\s+)?mod\\s+${escapedChild}\\s*;`,
    ),
  );

  return pathAttributeMatch
    ? resolve(dirname(parentPath), pathAttributeMatch[1])
    : defaultNestedModulePath(parentPath, childModule);
}

export function resolveCommandSourcePath(root, entry) {
  const [rootModule, ...childModules] = entry.modulePath;
  const commandRoot = join(root, "src-tauri/src/commands");
  const flatRootPath = join(commandRoot, `${rootModule}.rs`);
  const modRootPath = join(commandRoot, rootModule, "mod.rs");
  let currentPath = existsSync(flatRootPath) ? flatRootPath : modRootPath;

  for (const childModule of childModules) {
    currentPath = resolveChildModulePath(currentPath, childModule);
  }
  return currentPath;
}

export function findFunctionBody(text, name) {
  const functionStart = text.search(
    new RegExp(`\\bpub\\s+(?:async\\s+)?fn\\s+${escapeRegExp(name)}\\b`),
  );
  if (functionStart === -1) return null;

  const nextCommand = text.slice(functionStart + 1).search(/\n#\[tauri::command\]/);
  const end = nextCommand === -1 ? text.length : functionStart + 1 + nextCommand;
  return text.slice(functionStart, end);
}

export function collectRegisteredStubCommandViolations(root) {
  const violations = [];
  const entries = collectRegisteredCommandEntries(root);
  if (!entries) return violations;

  for (const entry of entries) {
    const commandPath = resolveCommandSourcePath(root, entry);
    if (!existsSync(commandPath)) continue;

    const body = findFunctionBody(readFileSync(commandPath, "utf8"), entry.name);
    if (!body) continue;

    const returnsFixedError = /\bErr\s*\(/.test(body);
    const hasStubMarker =
      /\bplaceholder\b/i.test(body) ||
      /\bnot implemented\b/i.test(body) ||
      /requires active page context/i.test(body);

    if (returnsFixedError && hasStubMarker) {
      violations.push(
        `${commandDisplayName(entry)} is registered but appears to be a stub; implement it or remove it from src-tauri/src/main.rs`,
      );
    }
  }
  return violations;
}

export function collectCommandBoundaryCastViolations(root) {
  const violations = [];
  const entries = collectRegisteredCommandEntries(root);
  if (!entries) return violations;

  for (const entry of entries) {
    const commandPath = resolveCommandSourcePath(root, entry);
    if (!existsSync(commandPath)) continue;

    const body = findFunctionBody(readFileSync(commandPath, "utf8"), entry.name);
    if (body && /\b[a-zA-Z_][a-zA-Z0-9_]*\s+as\s+usize\b/.test(body)) {
      violations.push(
        `${commandDisplayName(entry)} casts a command value to usize; validate range before conversion`,
      );
    }
  }
  return violations;
}

export function collectCommandLimitValidationViolations(root) {
  const violations = [];
  const entries = collectRegisteredCommandEntries(root);
  if (!entries) return violations;

  for (const entry of entries) {
    const commandPath = resolveCommandSourcePath(root, entry);
    if (!existsSync(commandPath)) continue;

    const body = findFunctionBody(readFileSync(commandPath, "utf8"), entry.name);
    if (!body) continue;

    const signatureEnd = body.indexOf("{");
    const signature = signatureEnd === -1 ? body : body.slice(0, signatureEnd);
    const hasLimitParameter =
      /\blimit\s*:\s*(?:Option\s*<\s*)?(?:usize|i64|i32)\s*>?/m.test(signature);
    const validatesLimit =
      /\bvalidate_(?:optional_)?command_limit_(?:usize_as_i64|usize|i64|i32)\s*\(/.test(
        body,
      );

    if (hasLimitParameter && !validatesLimit) {
      violations.push(
        `${commandDisplayName(entry)} accepts a command limit without validation; validate range before querying`,
      );
    }
  }
  return violations;
}

export function collectDocumentedCommandCountViolations(root, commandCount) {
  const violations = [];
  const expectedClaim = `${commandCount} registered Tauri commands`;

  for (const path of requiredCommandClaimFiles) {
    const fullPath = join(root, path);
    if (!existsSync(fullPath)) continue;

    if (!readFileSync(fullPath, "utf8").includes(expectedClaim)) {
      violations.push(`${path} must include current command claim: ${expectedClaim}`);
    }
  }

  for (const { path, pattern } of staleCommandCountClaimPatterns) {
    const fullPath = join(root, path);
    if (!existsSync(fullPath)) continue;

    const text = readFileSync(fullPath, "utf8");
    for (const match of text.matchAll(pattern)) {
      const claim = match[0].replace(/\s+/g, " ").trim();
      const line = getTextLineNumber(text, match.index ?? 0);
      violations.push(
        `${path}:${line} has hardcoded command-count claim "${claim}"; remove exact sub-counts or use live registration data`,
      );
    }
  }
  return violations;
}
