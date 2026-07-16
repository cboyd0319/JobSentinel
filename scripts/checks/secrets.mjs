#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "../..");
const maxScannedBytes = 2 * 1024 * 1024;

const ignoredPathParts = new Set([
  ".git",
  ".vale",
  "browser-extension",
  "dist",
  "node_modules",
  "playwright-report",
  "target",
  "target",
  "test-results",
]);

const scannedExtensions = new Set([
  ".cjs",
  ".css",
  ".env",
  ".html",
  ".js",
  ".json",
  ".jsonc",
  ".jsx",
  ".md",
  ".mjs",
  ".rs",
  ".sh",
  ".toml",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);

const scannedFileNames = new Set([
  ".env",
  ".env.example",
  ".env.local",
  ".lintstagedrc.json",
  "Cargo.lock",
  "Cargo.toml",
  "package-lock.json",
  "package.json",
]);

const secretPatterns = [
  {
    label: "private key block",
    pattern:
      /-----BEGIN (?:RSA |DSA |EC |OPENSSH |ENCRYPTED |)PRIVATE KEY-----/g,
  },
  {
    label: "GitHub token",
    pattern:
      /\b(?:(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{80,})\b/g,
  },
  {
    label: "OpenAI API key",
    pattern: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    label: "Anthropic API key",
    pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    label: "AWS access key id",
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    label: "Google API key",
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    label: "Slack token",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g,
  },
  {
    label: "Slack webhook URL",
    pattern:
      /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]{8,}\/B[A-Z0-9]{8,}\/[A-Za-z0-9]{20,}/g,
  },
  {
    label: "Discord webhook URL",
    pattern:
      /https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/[0-9]{17,20}\/[A-Za-z0-9_-]{60,}/g,
  },
  {
    label: "Telegram bot token",
    pattern: /\b[0-9]{8,10}:[A-Za-z0-9_-]{35}\b/g,
  },
  {
    label: "SendGrid API key",
    pattern: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/g,
  },
  {
    label: "Stripe live key",
    pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]{24,}\b/g,
  },
  {
    label: "LinkedIn session cookie",
    pattern: /\bli_at=[A-Za-z0-9_-]{40,}\b/g,
  },
];

function normalizePath(path) {
  return path.split(/[\\/]/).join("/");
}

function shouldIgnorePath(path) {
  const normalized = normalizePath(path);
  const parts = normalized.split("/");
  return parts.some((part, index) => {
    const joined = parts.slice(0, index + 1).join("/");
    return ignoredPathParts.has(part) || ignoredPathParts.has(joined);
  });
}

function shouldScanFile(path) {
  return scannedExtensions.has(extname(path)) || scannedFileNames.has(basename(path));
}

function collectScanFiles(root = defaultRoot, dir = root) {
  if (!existsSync(dir)) {
    return [];
  }

  const files = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    const rel = normalizePath(relative(root, fullPath));

    if (shouldIgnorePath(rel)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...collectScanFiles(root, fullPath));
      continue;
    }

    if (!entry.isFile() || !shouldScanFile(entry.name)) {
      continue;
    }

    if (statSync(fullPath).size > maxScannedBytes) {
      continue;
    }

    files.push(rel);
  }

  return files.sort();
}

function getLineNumber(text, offset) {
  return text.slice(0, offset).split(/\r?\n/).length;
}

function redactedMatch(value) {
  if (value.length <= 12) {
    return "<redacted>";
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function isAllowedPlaceholder(label, value) {
  if (label === "Slack webhook URL") {
    return /\/T0+\/B0+\/X+(?:verylong)?(?:$|\?)/.test(value);
  }

  return false;
}

export function collectSecretScanViolations(root = defaultRoot) {
  const violations = [];

  for (const path of collectScanFiles(root)) {
    const text = readFileSync(join(root, path), "utf8");

    for (const { label, pattern } of secretPatterns) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        if (isAllowedPlaceholder(label, match[0])) {
          continue;
        }

        violations.push(
          `${path}:${getLineNumber(text, match.index ?? 0)} (${label}) ${redactedMatch(match[0])}`,
        );
      }
    }
  }

  return violations;
}

export function checkSecrets(root = defaultRoot) {
  return collectSecretScanViolations(root);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const violations = checkSecrets(root);

  if (violations.length > 0) {
    console.error("Secret scan failed:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log("Secret scan passed.");
}
