import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";

const ignoredPathParts = new Set([
  ".git",
  ".vale",
  ".venv",
  "node_modules",
  "dist",
  "target",
  ".claude",
  "coverage",
  "browser-extension",
  "playwright-report",
  "test-results",
]);
const externalUrlPattern = /https?:\/\/[^\s<>"'`]+/g;
const textFilePattern =
  /\.(?:cjs|css|env|example|html|js|json|jsx|md|mjs|rs|sh|sql|toml|ts|tsx|txt|ya?ml)$/;
const textFileNames = new Set([
  ".env.example",
  ".gitignore",
  "AGENTS.md",
  "CLAUDE.md",
  "LICENSE",
]);
const docLocalAbsolutePathPattern =
  /(?:\/Users\/[A-Za-z0-9._-]+(?:\/[^\s)`'"<>]*)?|\/home\/[A-Za-z0-9._-]+(?:\/[^\s)`'"<>]*)?|[A-Za-z]:\\Users\\[^\\\s)`'"<>]+(?:\\[^\s)`'"<>]*)?|Documents\/GitHub\/JobSentinel)/g;
const startupContextBudgets = new Map([
  ["AGENTS.md", { maxLines: 160, maxBytes: 8000 }],
  ["docs/harness/README.md", { maxLines: 160, maxBytes: 9000 }],
  ["docs/plans/active/status.md", { maxLines: 140, maxBytes: 9000 }],
  ["docs/plans/active/current-work.md", { maxLines: 220, maxBytes: 12000 }],
]);
const localLinkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;

function repoPath(root, path) {
  return join(root, path);
}

function read(root, path) {
  return readFileSync(repoPath(root, path), "utf8");
}

function normalizeExternalUrl(rawUrl) {
  return rawUrl
    .trim()
    .replace(/^<|>$/g, "")
    .replace(/[)\].,;:]+$/g, "")
    .split("#")[0];
}

function shouldIgnoreExternalReference(url) {
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes("example.com") ||
    lowerUrl.includes("example.org") ||
    lowerUrl.includes("localhost") ||
    lowerUrl.includes("127.0.0.1") ||
    lowerUrl.includes("0.0.0.0") ||
    lowerUrl.includes("webhook.site") ||
    lowerUrl.includes("token") ||
    lowerUrl.includes("secret") ||
    lowerUrl.includes("password") ||
    lowerUrl.includes("github_pat") ||
    /:\/\/[^/\s]+@/.test(url) ||
    /\$\{|<[^>]+>/.test(url)
  );
}

function extractExternalUrls(text) {
  return [...text.matchAll(externalUrlPattern)]
    .map((match) => normalizeExternalUrl(match[0]))
    .filter((url) => url && !shouldIgnoreExternalReference(url));
}

function collectFiles(root, predicate, dir = root) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    const rel = relative(root, fullPath);
    if (rel.split(/[\\/]/).some((part) => ignoredPathParts.has(part))) continue;

    if (entry.isDirectory()) {
      files.push(...collectFiles(root, predicate, fullPath));
    } else if (entry.isFile() && predicate(entry.name)) {
      files.push(rel);
    }
  }
  return files.sort();
}

function collectMarkdownFiles(root) {
  return collectFiles(root, (name) => name.endsWith(".md"));
}

function collectTextFiles(root) {
  return collectFiles(
    root,
    (name) => textFileNames.has(name) || textFilePattern.test(name),
  );
}

function normalizePathForLocalPathScan(path) {
  return normalize(path).replaceAll("\\", "/").replace(/\/+$/g, "");
}

function lineNumberAtIndex(text, index) {
  let line = 1;
  for (let position = 0; position < index; position += 1) {
    if (text.charCodeAt(position) === 10) line += 1;
  }
  return line;
}

function countTextLines(text) {
  if (!text) return 0;
  return text.split(/\r?\n/).length - (/\r?\n$/.test(text) ? 1 : 0);
}

function checkNoMachineSpecificLocalPaths(root) {
  const errors = [];
  const normalizedRoot = normalizePathForLocalPathScan(root);
  const normalizedHome = process.env.HOME
    ? normalizePathForLocalPathScan(process.env.HOME)
    : "";
  const machineSpecificLocalPathNeedles = [
    normalizedRoot,
    normalizedRoot.replaceAll("/", "\\"),
    normalizedHome,
    normalizedHome.replaceAll("/", "\\"),
  ]
    .filter((needle) => needle.length > 4)
    .filter((needle, index, needles) => needles.indexOf(needle) === index);

  for (const path of collectTextFiles(root)) {
    const text = read(root, path);
    for (const needle of machineSpecificLocalPathNeedles) {
      let index = text.indexOf(needle);
      while (index !== -1) {
        const next = text[index + needle.length] ?? "";
        if (!next || /[\s"'`)>\],;:\\/]/.test(next)) {
          errors.push(
            `${path}:${lineNumberAtIndex(text, index)} contains a machine-specific local path; use repo-relative paths or <repo-root>/<home> placeholders`,
          );
        }
        index = text.indexOf(needle, index + 1);
      }
    }
  }

  for (const path of collectMarkdownFiles(root)) {
    const text = read(root, path);
    docLocalAbsolutePathPattern.lastIndex = 0;
    for (const match of text.matchAll(docLocalAbsolutePathPattern)) {
      errors.push(
        `${path}:${lineNumberAtIndex(text, match.index ?? 0)} contains an absolute local path; docs must use repo-relative paths or <repo-root>/<home> placeholders`,
      );
    }
  }
  return errors;
}

function checkManifestFiles(root, manifest) {
  const errors = [];
  const requiredFiles = Array.isArray(manifest.requiredFiles) ? manifest.requiredFiles : [];
  for (const path of requiredFiles) {
    if (!existsSync(repoPath(root, path))) {
      errors.push(`missing required harness file: ${path}`);
    }
  }

  const snippets = manifest.requiredHarnessSnippets;
  const requiredSnippets =
    snippets && typeof snippets === "object" && !Array.isArray(snippets) ? snippets : {};
  for (const [path, pathSnippets] of Object.entries(requiredSnippets)) {
    if (!existsSync(repoPath(root, path))) continue;
    const normalizedText = read(root, path).replace(/\s+/g, " ");
    for (const snippet of pathSnippets) {
      if (!normalizedText.includes(snippet.replace(/\s+/g, " "))) {
        errors.push(`${path} must include harness snippet: ${snippet}`);
      }
    }
  }
  return errors;
}

function checkReadmeReferences(root, manifest) {
  const errors = [];
  const references = manifest.readmeReferences ?? {};
  const heading = references.heading ?? "";
  const path = references.path ?? "";

  if (existsSync(repoPath(root, "README.md"))) {
    const readme = read(root, "README.md");
    if (!readme.includes(heading)) errors.push(`README.md must include ${heading}`);
    if (path && !readme.includes(`](${path})`)) {
      errors.push(`README.md reference section must link to ${path}`);
    }
  }

  if (path && existsSync(repoPath(root, path))) {
    const text = read(root, path);
    if (!text.includes(references.indexHeading ?? "")) {
      errors.push(`${path} must include ${references.indexHeading ?? ""}`);
    }
    if (
      references.excludedTestUrlExplanation &&
      !text.includes(references.excludedTestUrlExplanation)
    ) {
      errors.push(`${path} must explain excluded test and placeholder URLs`);
    }
    const foundUrls = new Set(extractExternalUrls(text));
    for (const url of references.requiredUrls ?? []) {
      if (!foundUrls.has(normalizeExternalUrl(url))) {
        errors.push(`${path} missing required research source: ${url}`);
      }
    }
  } else if (path) {
    errors.push(`${path} must exist for README source references`);
  }
  return errors;
}

function checkStartupBudgets(root) {
  const errors = [];
  for (const [path, budget] of startupContextBudgets) {
    if (!existsSync(repoPath(root, path))) continue;
    const text = read(root, path);
    const lines = countTextLines(text);
    const bytes = Buffer.byteLength(text, "utf8");
    if (lines > budget.maxLines) {
      errors.push(
        `${path} has ${lines} lines; keep it at or below ${budget.maxLines} lines for the startup context budget`,
      );
    }
    if (bytes > budget.maxBytes) {
      errors.push(
        `${path} has ${bytes} bytes; keep it at or below ${budget.maxBytes} bytes for the startup context budget`,
      );
    }
  }
  return errors;
}

function checkMarkdownLinks(root) {
  const errors = [];
  for (const path of collectMarkdownFiles(root)) {
    const text = read(root, path);
    localLinkPattern.lastIndex = 0;
    for (const match of text.matchAll(localLinkPattern)) {
      const rawTarget = match[1].trim();
      const target = rawTarget.replace(/^<|>$/g, "").split("#")[0];
      if (
        !target ||
        target.startsWith("http://") ||
        target.startsWith("https://") ||
        target.startsWith("mailto:") ||
        target.startsWith("#")
      ) {
        continue;
      }

      const resolved = normalize(resolve(root, dirname(path), target));
      if (!resolved.startsWith(root)) {
        errors.push(`${path} links outside repo: ${rawTarget}`);
      } else if (!existsSync(resolved)) {
        errors.push(
          `${path} has broken local link: ${rawTarget} -> ${relative(root, resolved)}`,
        );
      } else if (
        statSync(resolved).isDirectory() &&
        !existsSync(join(resolved, "README.md"))
      ) {
        errors.push(`${path} links to directory without README.md: ${rawTarget}`);
      }
    }
  }
  return errors;
}

export function checkHarnessRepositoryFiles(root, manifest) {
  return [
    ...checkManifestFiles(root, manifest),
    ...checkReadmeReferences(root, manifest),
    ...checkStartupBudgets(root),
    ...checkMarkdownLinks(root),
    ...checkNoMachineSpecificLocalPaths(root),
  ];
}
