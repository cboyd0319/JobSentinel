#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

const sourceExtensions = new Set([".ts", ".tsx"]);
const ignoredPathParts = new Set([
  "node_modules",
  "dist",
  "coverage",
  "test",
  "tests",
  "__mocks__",
]);

const ignoredFilePatterns = [
  /\.test\.[tj]sx?$/,
  /\.spec\.[tj]sx?$/,
  /\.stories\.[tj]sx?$/,
  /\.d\.ts$/,
];

const requiredCommandClaimFiles = [
  "README.md",
  "docs/README.md",
  "docs/ROADMAP.md",
];

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

    if (
      entry.isFile() &&
      sourceExtensions.has(extname(entry.name)) &&
      !ignoredFilePatterns.some((pattern) => pattern.test(entry.name))
    ) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function getLineNumber(sourceFile, position) {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

function getTextLineNumber(text, position) {
  let line = 1;

  for (let index = 0; index < position; index += 1) {
    if (text.charCodeAt(index) === 10) {
      line += 1;
    }
  }

  return line;
}

function collectFrontendInvokes(root) {
  const invokes = new Map();

  for (const file of collectSourceFiles(root)) {
    const text = readFileSync(file, "utf8");
    const scriptKind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind);
    const relFile = relative(root, file);

    function visit(node) {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "invoke" &&
        node.arguments.length > 0
      ) {
        const [firstArg] = node.arguments;

        if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
          const command = firstArg.text;
          const location = `${relFile}:${getLineNumber(sourceFile, firstArg.getStart(sourceFile))}`;

          if (!invokes.has(command)) {
            invokes.set(command, []);
          }

          invokes.get(command).push(location);
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  return invokes;
}

function collectRegisteredCommands(root) {
  const entries = collectRegisteredCommandEntries(root);

  if (!entries) {
    return null;
  }

  return new Set(entries.map((entry) => entry.name));
}

function collectRegisteredCommandEntries(root) {
  const mainPath = join(root, "src-tauri/src/main.rs");

  if (!existsSync(mainPath)) {
    return null;
  }

  const mainRs = readFileSync(mainPath, "utf8");
  const generateHandlerMatch = mainRs.match(/tauri::generate_handler!\[\s*([\s\S]*?)\s*\]\)/);

  if (!generateHandlerMatch) {
    return null;
  }

  return [
    ...generateHandlerMatch[1].matchAll(/commands::([a-z_]+)::([a-zA-Z0-9_]+)/g),
  ].map((match) => ({
    module: match[1],
    name: match[2],
  }));
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findFunctionBody(text, name) {
  const functionStart = text.search(
    new RegExp(`\\bpub\\s+(?:async\\s+)?fn\\s+${escapeRegExp(name)}\\b`),
  );

  if (functionStart === -1) {
    return null;
  }

  const nextCommand = text.slice(functionStart + 1).search(/\n#\[tauri::command\]/);
  const end =
    nextCommand === -1 ? text.length : functionStart + 1 + nextCommand;

  return text.slice(functionStart, end);
}

function collectRegisteredStubCommandViolations(root) {
  const violations = [];
  const entries = collectRegisteredCommandEntries(root);

  if (!entries) {
    return violations;
  }

  for (const { module, name } of entries) {
    const commandPath = join(root, "src-tauri/src/commands", `${module}.rs`);

    if (!existsSync(commandPath)) {
      continue;
    }

    const text = readFileSync(commandPath, "utf8");
    const body = findFunctionBody(text, name);

    if (!body) {
      continue;
    }

    const returnsFixedError = /\bErr\s*\(/.test(body);
    const hasStubMarker =
      /\bplaceholder\b/i.test(body) ||
      /\bnot implemented\b/i.test(body) ||
      /requires active page context/i.test(body);

    if (returnsFixedError && hasStubMarker) {
      violations.push(
        `${module}::${name} is registered but appears to be a stub; implement it or remove it from src-tauri/src/main.rs`,
      );
    }
  }

  return violations;
}

function collectCommandBoundaryCastViolations(root) {
  const violations = [];
  const entries = collectRegisteredCommandEntries(root);

  if (!entries) {
    return violations;
  }

  for (const { module, name } of entries) {
    const commandPath = join(root, "src-tauri/src/commands", `${module}.rs`);

    if (!existsSync(commandPath)) {
      continue;
    }

    const text = readFileSync(commandPath, "utf8");
    const body = findFunctionBody(text, name);

    if (!body) {
      continue;
    }

    if (/\b[a-zA-Z_][a-zA-Z0-9_]*\s+as\s+usize\b/.test(body)) {
      violations.push(
        `${module}::${name} casts a command value to usize; validate range before conversion`,
      );
    }
  }

  return violations;
}

function collectCommandLimitValidationViolations(root) {
  const violations = [];
  const entries = collectRegisteredCommandEntries(root);

  if (!entries) {
    return violations;
  }

  for (const { module, name } of entries) {
    const commandPath = join(root, "src-tauri/src/commands", `${module}.rs`);

    if (!existsSync(commandPath)) {
      continue;
    }

    const text = readFileSync(commandPath, "utf8");
    const body = findFunctionBody(text, name);

    if (!body) {
      continue;
    }

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
        `${module}::${name} accepts a command limit without validation; validate range before querying`,
      );
    }
  }

  return violations;
}

function collectDocumentedCommandCountViolations(root, commandCount) {
  const violations = [];
  const expectedClaim = `${commandCount} registered Tauri commands`;

  for (const path of requiredCommandClaimFiles) {
    const fullPath = join(root, path);

    if (!existsSync(fullPath)) {
      continue;
    }

    const text = readFileSync(fullPath, "utf8");

    if (!text.includes(expectedClaim)) {
      violations.push(`${path} must include current command claim: ${expectedClaim}`);
    }
  }

  for (const { path, pattern } of staleCommandCountClaimPatterns) {
    const fullPath = join(root, path);

    if (!existsSync(fullPath)) {
      continue;
    }

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

export function checkTauriInvokes(root = defaultRoot) {
  const violations = [];
  const registered = collectRegisteredCommands(root);

  if (!registered) {
    return ["could not find tauri::generate_handler! command registrations"];
  }

  const invokes = collectFrontendInvokes(root);

  for (const [command, locations] of [...invokes.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (registered.has(command)) {
      continue;
    }

    violations.push(
      `${locations.join(", ")} invokes unregistered Tauri command: ${command}`,
    );
  }

  violations.push(...collectDocumentedCommandCountViolations(root, registered.size));
  violations.push(...collectRegisteredStubCommandViolations(root));
  violations.push(...collectCommandBoundaryCastViolations(root));
  violations.push(...collectCommandLimitValidationViolations(root));

  return violations;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const violations = checkTauriInvokes(root);

  if (violations.length > 0) {
    console.error("Tauri invoke check failed:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log("Tauri invoke check passed.");
}
