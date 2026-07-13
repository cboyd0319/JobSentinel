import { readFileSync } from "node:fs";
import { extname, join } from "node:path";

const productFramingTextExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".rs",
  ".toml",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);

const requiredReadmeProductDefinition =
  "JobSentinel is an open-source, local-first job-search assistant for finding real, relevant, fairly compensated work while keeping sensitive job-search data under user control.";

const requiredFreeForeverText = new Map([
  [
    "README.md",
    [
      "JobSentinel is free, will always stay free, and will always remain MIT licensed",
    ],
  ],
  [
    "docs/harness/README.md",
    [
      "JobSentinel is free, will always stay free, and will always remain MIT licensed",
      "fork this code, adapt it, and help more job seekers",
    ],
  ],
  [
    "docs/user/QUICK_START.md",
    [
      "JobSentinel is free, will always stay free, and will always remain MIT licensed",
    ],
  ],
]);

const forbiddenJobSearchFramingPatterns = [
  new RegExp(["bypass", "\\s+", "ATS"].join(""), "i"),
  new RegExp(["ATS", "[-\\s]+", "bypass"].join(""), "i"),
  new RegExp(["scrape", "\\s+", "LinkedIn"].join(""), "i"),
  new RegExp(["beat", "\\s+", "the", "\\s+", "(?:algorithm|ATS)"].join(""), "i"),
  new RegExp(["mass", "[-\\s]+", "(?:apply|applying)"].join(""), "i"),
  new RegExp(["automate", "\\s+", "applications"].join(""), "i"),
  new RegExp(["automated", "\\s+", "(?:job", "\\s+)?", "applications"].join(""), "i"),
  new RegExp(["automating", "\\s+", "applications"].join(""), "i"),
  new RegExp(["auto", "[-\\s]+", "submit", "\\s+", "applications"].join(""), "i"),
];

export function hasMissingReadmeProductDefinition(root, path) {
  if (path !== "README.md") {
    return false;
  }

  const normalizedText = readFileSync(join(root, path), "utf8").replace(/\s+/g, " ");
  return !normalizedText.includes(requiredReadmeProductDefinition);
}

export function hasMissingFreeForeverEthos(root, path) {
  const requiredPhrases = requiredFreeForeverText.get(path);
  if (!requiredPhrases) {
    return false;
  }

  const normalizedText = readFileSync(join(root, path), "utf8").replace(/\s+/g, " ");
  return requiredPhrases.some((phrase) => !normalizedText.includes(phrase));
}

function isJobSearchProductTextPath(path) {
  if (path === "package-lock.json" || path === "Cargo.lock") {
    return false;
  }

  return productFramingTextExtensions.has(extname(path));
}

export function hasForbiddenJobSearchFraming(root, path) {
  if (!isJobSearchProductTextPath(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return forbiddenJobSearchFramingPatterns.some((pattern) => pattern.test(text));
}
