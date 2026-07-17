import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
import ts from "typescript";

import {
  collectRegisteredCommandEntries,
  findFunctionBody,
  resolveCommandSourcePath,
} from "./backend.mjs";

const sourceExtensions = new Set([".ts", ".tsx"]);
const frontendInvokeFunctionNames = new Set([
  "invoke",
  "safeInvoke",
  "safeInvokeWithToast",
  "cachedInvoke",
]);
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
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    const parts = relative(root, fullPath).split(/[\\/]/);
    if (parts.some((part) => ignoredPathParts.has(part))) continue;

    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(root, fullPath));
    } else if (
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

function visitFrontendInvokes(root, onInvoke) {
  for (const file of collectSourceFiles(root)) {
    const text = readFileSync(file, "utf8");
    const scriptKind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      scriptKind,
    );
    const relFile = relative(root, file);

    function visit(node) {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        frontendInvokeFunctionNames.has(node.expression.text) &&
        node.arguments.length > 0
      ) {
        const [firstArg, secondArg] = node.arguments;
        if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
          onInvoke({ firstArg, secondArg, sourceFile, relFile });
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }
}

export function collectFrontendInvokes(root) {
  const invokes = new Map();
  visitFrontendInvokes(root, ({ firstArg, sourceFile, relFile }) => {
    const location = `${relFile}:${getLineNumber(sourceFile, firstArg.getStart(sourceFile))}`;
    if (!invokes.has(firstArg.text)) invokes.set(firstArg.text, []);
    invokes.get(firstArg.text).push(location);
  });
  return invokes;
}

function hasObjectProperty(node, propertyName) {
  return (
    ts.isObjectLiteralExpression(node) &&
    node.properties.some((property) => {
      if (ts.isShorthandPropertyAssignment(property)) {
        return property.name.text === propertyName;
      }
      if (!ts.isPropertyAssignment(property)) return false;

      const name = property.name;
      return (
        (ts.isIdentifier(name) && name.text === propertyName) ||
        (ts.isStringLiteral(name) && name.text === propertyName)
      );
    })
  );
}

function toCamelCase(name) {
  return name.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

function isObjectLikeArg(node) {
  return node && ts.isObjectLiteralExpression(node);
}

function isMissingArg(node) {
  return (
    !node ||
    (ts.isIdentifier(node) && node.text === "undefined") ||
    node.kind === ts.SyntaxKind.NullKeyword
  );
}

function splitTopLevelParams(text) {
  const params = [];
  let current = "";
  let parens = 0;
  let angles = 0;

  for (const char of text) {
    if (char === "," && parens === 0 && angles === 0) {
      if (current.trim()) params.push(current.trim());
      current = "";
      continue;
    }

    current += char;
    if (char === "(") parens += 1;
    else if (char === ")") parens -= 1;
    else if (char === "<") angles += 1;
    else if (char === ">") angles = Math.max(0, angles - 1);
  }

  if (current.trim()) params.push(current.trim());
  return params;
}

function extractSignatureParams(body, name) {
  const fnIndex = body.search(
    new RegExp(`\\bpub\\s+(?:async\\s+)?fn\\s+${name}\\b`),
  );
  if (fnIndex === -1) return [];

  const openIndex = body.indexOf("(", fnIndex);
  if (openIndex === -1) return [];

  let depth = 0;
  for (let index = openIndex; index < body.length; index += 1) {
    const char = body[index];
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return splitTopLevelParams(body.slice(openIndex + 1, index));
    }
  }
  return [];
}

function requiredFrontendArgsForCommand(body, name) {
  return extractSignatureParams(body, name).flatMap((param) => {
    const match = param.match(/(?:^|\s)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([\s\S]+)/);
    if (!match) return [];

    const [, paramName, type] = match;
    if (["state", "app", "window"].includes(paramName)) return [];
    if (/State\s*<|AppHandle|Window|WebviewWindow/.test(type)) return [];
    if (/Option\s*</.test(type)) return [];
    return [paramName];
  });
}

export function collectFrontendRequiredArgViolations(root) {
  const violations = [];
  const requiredByCommand = new Map();
  const entries = collectRegisteredCommandEntries(root);
  if (!entries) return violations;

  for (const entry of entries) {
    const commandPath = resolveCommandSourcePath(root, entry);
    if (!existsSync(commandPath)) continue;

    const body = findFunctionBody(readFileSync(commandPath, "utf8"), entry.name);
    if (body) {
      requiredByCommand.set(
        entry.name,
        requiredFrontendArgsForCommand(body, entry.name),
      );
    }
  }

  visitFrontendInvokes(
    root,
    ({ firstArg, secondArg, sourceFile, relFile }) => {
      const requiredArgs = requiredByCommand.get(firstArg.text) ?? [];
      if (
        requiredArgs.length > 0 &&
        (isMissingArg(secondArg) || isObjectLikeArg(secondArg))
      ) {
        for (const requiredArg of requiredArgs) {
          if (
            isMissingArg(secondArg) ||
            (!hasObjectProperty(secondArg, requiredArg) &&
              !hasObjectProperty(secondArg, toCamelCase(requiredArg)))
          ) {
            violations.push(
              `${relFile}:${getLineNumber(sourceFile, firstArg.getStart(sourceFile))} invokes ${firstArg.text} without required ${requiredArg} argument`,
            );
          }
        }
      }
    },
  );
  return violations;
}
