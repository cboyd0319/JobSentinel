#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

const ignoredPathParts = new Set([
  ".git",
  ".vale",
  "node_modules",
  "dist",
  "target",
  ".claude",
  "browser-extension",
  "playwright-report",
  "test-results",
]);

const scannedExtensions = new Set([
  ".cjs",
  ".js",
  ".json",
  ".jsonc",
  ".jsx",
  ".mjs",
  ".rs",
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
  "Cargo.toml",
  "package-lock.json",
  "package.json",
]);

const allowedGatewayPaths = new Set([
  "crates/jobsentinel-ai/src/provider.rs",
  "scripts/check-external-ai-gateway.mjs",
  "scripts/tests/check-external-ai-gateway.test.mjs",
]);

const providerPatterns = [
  {
    label: "OpenAI API endpoint",
    pattern: /api\.openai\.com/i,
  },
  {
    label: "Anthropic API endpoint",
    pattern: /api\.anthropic\.com/i,
  },
  {
    label: "Google Gemini or Vertex AI endpoint",
    pattern: /(?:generativelanguage|aiplatform)\.googleapis\.com/i,
  },
  {
    label: "Azure OpenAI endpoint",
    pattern: /(?:openai\.azure\.com|\.cognitiveservices\.azure\.com\/openai)/i,
  },
  {
    label: "AWS Bedrock runtime endpoint or SDK",
    pattern: /(?:bedrock-runtime\.[a-z0-9-]+\.amazonaws\.com|@aws-sdk\/client-bedrock-runtime|aws-sdk-bedrockruntime)/i,
  },
  {
    label: "hosted inference endpoint",
    pattern: /(?:api-inference\.huggingface\.co|router\.huggingface\.co|api\.together\.xyz|api\.mistral\.ai|api\.cohere\.ai)/i,
  },
  {
    label: "external AI chat or response endpoint",
    pattern: /\/v1\/(?:chat\/completions|responses|messages|completions)\b/i,
  },
  {
    label: "Google Gemini model endpoint",
    pattern: /\/v1beta\/models\/[^/\s]+:(?:generateContent|streamGenerateContent)\b/i,
  },
  {
    label: "OpenAI SDK usage",
    pattern: /(?:from|import)\s+["']openai["']|require\(["']openai["']\)|new\s+OpenAI\s*\(/i,
  },
  {
    label: "Anthropic SDK usage",
    pattern: /(?:from|import)\s+["']@anthropic-ai\/sdk["']|require\(["']@anthropic-ai\/sdk["']\)|new\s+Anthropic\s*\(/i,
  },
  {
    label: "Google generative AI SDK usage",
    pattern: /(?:from|import)\s+["'](?:@google\/generative-ai|@google\/genai)["']|require\(["'](?:@google\/generative-ai|@google\/genai)["']\)/i,
  },
  {
    label: "Azure OpenAI SDK usage",
    pattern: /(?:from|import)\s+["']@azure\/openai["']|require\(["']@azure\/openai["']\)/i,
  },
  {
    label: "hosted inference SDK dependency",
    pattern: /["'](?:@huggingface\/inference|@mistralai\/mistralai|cohere-ai|mistralai|together-ai)["']\s*:/i,
    pathPattern: /^(?:package|package-lock)\.json$/,
  },
  {
    label: "external AI SDK dependency",
    pattern: /["'](?:openai|@anthropic-ai\/sdk|@google\/generative-ai|@google\/genai|@azure\/openai|@aws-sdk\/client-bedrock-runtime)["']\s*:/i,
    pathPattern: /^(?:package|package-lock)\.json$/,
  },
  {
    label: "Rust external AI crate dependency",
    pattern: /^\s*(?:async-openai|openai-api-rs|anthropic|aws-sdk-bedrockruntime)\s*=/im,
    pathPattern: /(?:^|\/)Cargo\.toml$/,
  },
  {
    label: "external AI API key variable",
    pattern: /\b(?:OPENAI|ANTHROPIC|GEMINI|GOOGLE_AI|AZURE_OPENAI|MISTRAL|COHERE|HUGGINGFACE|TOGETHER)_API_KEY\b|\bAWS_BEDROCK_/i,
  },
];

function normalizePath(path) {
  return path.split(/[\\/]/).join("/");
}

function shouldScanFile(path) {
  return scannedExtensions.has(extname(path)) || scannedFileNames.has(basename(path));
}

function collectScanFiles(root, dir = root) {
  if (!existsSync(dir)) {
    return [];
  }

  const files = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    const rel = normalizePath(relative(root, fullPath));
    const parts = rel.split("/");

    if (parts.some((part) => ignoredPathParts.has(part))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...collectScanFiles(root, fullPath));
      continue;
    }

    if (entry.isFile() && shouldScanFile(entry.name)) {
      files.push(rel);
    }
  }

  return files.sort();
}

function getLineNumber(text, offset) {
  let line = 1;

  for (let index = 0; index < offset; index += 1) {
    if (text.charCodeAt(index) === 10) {
      line += 1;
    }
  }

  return line;
}

export function checkExternalAiGateway(root = defaultRoot) {
  const violations = [];

  for (const path of collectScanFiles(root)) {
    if (allowedGatewayPaths.has(path)) {
      continue;
    }

    const text = readFileSync(join(root, path), "utf8");

    for (const { label, pattern, pathPattern } of providerPatterns) {
      if (pathPattern && !pathPattern.test(path)) {
        continue;
      }

      pattern.lastIndex = 0;
      const match = pattern.exec(text);

      if (!match) {
        continue;
      }

      violations.push(
        `external AI provider path must go through the reviewed gateway boundary: ${path}:${getLineNumber(text, match.index)} (${label})`,
      );
      break;
    }
  }

  return violations;
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const violations = checkExternalAiGateway();

  if (violations.length > 0) {
    console.error("External AI gateway check failed:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exitCode = 1;
  } else {
    console.log("External AI gateway check passed.");
  }
}
