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
  const mainPath = join(root, "src-tauri/src/main.rs");

  if (!existsSync(mainPath)) {
    return null;
  }

  const mainRs = readFileSync(mainPath, "utf8");
  const generateHandlerMatch = mainRs.match(/tauri::generate_handler!\[\s*([\s\S]*?)\s*\]\)/);

  if (!generateHandlerMatch) {
    return null;
  }

  return new Set(
    [...generateHandlerMatch[1].matchAll(/commands::[a-z_]+::([a-zA-Z0-9_]+)/g)].map(
      (match) => match[1],
    ),
  );
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
